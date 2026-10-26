import { createClient } from 'redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// ── Redis Connection ─────────────────────────────────────────────────────

let redisClient: any = null;
const getRedisClient = async () => {
  if (redisClient && redisClient.isOpen) return redisClient;
  if (process.env.REDIS_URL) {
    try {
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err: any) => console.error('Redis Client Error:', err));
      await redisClient.connect();
      return redisClient;
    } catch (err) {
      console.error('Redis initialization error in /api/auth:', err);
      return null;
    }
  }
  return null;
};

// ── Constants & Validation Patterns ──────────────────────────────────────

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const SECRET_CODE_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const TOKEN_ID_PATTERN = /^[a-f0-9]{64}$/;

const SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days sliding TTL
const AUTH_RATE_WINDOW_S = 300; // 5 minutes
const AUTH_RATE_MAX_ATTEMPTS = 10;
const MIGRATE_RATE_WINDOW_S = 300; // 5 minutes
const MIGRATE_RATE_MAX_ATTEMPTS = 5;

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 32 * 1024 * 1024;
const KDF_SPEC = `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${SCRYPT_KEYLEN}`;

export function isValidUsername(value: unknown): value is string {
  return typeof value === 'string' && USERNAME_PATTERN.test(value.trim());
}

export function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 6 && value.length <= 128;
}

export function isValidSecretCode(value: unknown): value is string {
  return typeof value === 'string' && SECRET_CODE_PATTERN.test(value);
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ── Fail-Closed Server Secret Validation ─────────────────────────────────

export function getAuthTokenSecret(): string | null {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  return secret;
}

export function getRegistrationSecret(): string | null {
  const secret = process.env.REGISTRATION_SECRET?.trim();
  if (!secret || secret.length === 0) return null;
  return secret;
}

/**
 * Constant-time string comparison via SHA-256 digests so length differences
 * never leak timing or throw RangeError in crypto.timingSafeEqual.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

// ── Asynchronous Password Hashing (crypto.scrypt) ────────────────────────

function scryptAsync(
  password: string,
  saltBuffer: Buffer,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, saltBuffer, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPasswordAsync(password: string): Promise<{
  passwordHash: string;
  salt: string;
  kdf: string;
}> {
  const saltBuf = crypto.randomBytes(16);
  const derivedBuf = await scryptAsync(password, saltBuf, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return {
    passwordHash: derivedBuf.toString('hex'),
    salt: saltBuf.toString('hex'),
    kdf: KDF_SPEC,
  };
}

export async function verifyPasswordAsync(
  password: string,
  storedHashHex: string,
  storedSaltHex: string,
  storedKdf = KDF_SPEC
): Promise<boolean> {
  if (!storedHashHex || !storedSaltHex) return false;
  try {
    let n = SCRYPT_N;
    let r = SCRYPT_R;
    let p = SCRYPT_P;
    let keylen = SCRYPT_KEYLEN;

    if (storedKdf && storedKdf.startsWith('scrypt:')) {
      const parts = storedKdf.split(':');
      if (parts.length === 5) {
        n = parseInt(parts[1], 10) || SCRYPT_N;
        r = parseInt(parts[2], 10) || SCRYPT_R;
        p = parseInt(parts[3], 10) || SCRYPT_P;
        keylen = parseInt(parts[4], 10) || SCRYPT_KEYLEN;
      }
    }

    const saltBuf = Buffer.from(storedSaltHex, 'hex');
    const storedHashBuf = Buffer.from(storedHashHex, 'hex');
    if (saltBuf.length === 0 || storedHashBuf.length !== keylen) return false;

    const derivedBuf = await scryptAsync(password, saltBuf, keylen, {
      N: n,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });

    if (derivedBuf.length !== storedHashBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, storedHashBuf);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

// ── Signed Session Token Utilities ───────────────────────────────────────

export function signSessionToken(tokenId: string, authTokenSecret: string): string {
  const signature = crypto
    .createHmac('sha256', authTokenSecret)
    .update(tokenId, 'utf8')
    .digest('hex');
  return `${tokenId}.${signature}`;
}

export function verifySignedToken(rawToken: string, authTokenSecret: string): string | null {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const parts = rawToken.trim().split('.');
  if (parts.length !== 2) return null;
  const [tokenId, signature] = parts;
  if (!TOKEN_ID_PATTERN.test(tokenId) || !TOKEN_ID_PATTERN.test(signature)) return null;

  const expectedSig = crypto
    .createHmac('sha256', authTokenSecret)
    .update(tokenId, 'utf8')
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  return tokenId;
}

export function extractBearerToken(authHeader?: string | string[]): string | null {
  if (!authHeader) return null;
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export interface VerifiedSession {
  userId: string;
  username: string;
  tokenId: string;
  token: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Verifies the Bearer token HMAC signature and Redis session record,
 * and extends the sliding 30-day session TTL.
 */
export async function verifyBearerToken(
  client: any,
  authHeader?: string | string[]
): Promise<VerifiedSession | null> {
  const authTokenSecret = getAuthTokenSecret();
  if (!authTokenSecret || !client) return null;

  const token = extractBearerToken(authHeader);
  if (!token) return null;

  const tokenId = verifySignedToken(token, authTokenSecret);
  if (!tokenId) return null;

  const sessionKey = `scholar_session:${tokenId}`;
  const sessionRaw = await client.get(sessionKey);
  if (!sessionRaw) return null;

  const parsed = safeJsonParse<{
    userId: string;
    username: string;
    issuedAt: number;
    expiresAt: number;
  } | null>(sessionRaw, null);

  if (!parsed || !parsed.userId || !parsed.username) return null;

  const now = Date.now();
  const updatedSession = {
    ...parsed,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
  };

  await client.set(sessionKey, JSON.stringify(updatedSession), { EX: SESSION_TTL_SECONDS });

  return {
    userId: parsed.userId,
    username: parsed.username,
    tokenId,
    token,
    issuedAt: parsed.issuedAt,
    expiresAt: updatedSession.expiresAt,
  };
}

// ── Dedicated Auth Rate Limiters ─────────────────────────────────────────

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

async function checkRateLimitBucket(
  client: any,
  bucketPrefix: string,
  ip: string,
  windowSeconds: number,
  maxAttempts: number
): Promise<boolean> {
  try {
    const key = `${bucketPrefix}:${ip}`;
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    return count > maxAttempts;
  } catch (err) {
    console.error(`Rate limit check failed for ${bucketPrefix}:`, err);
    return false;
  }
}

// ── Legacy Guild List In-Place Rewriter (LSET without DEL) ───────────────

async function rewriteGuildListOwnerInPlace(
  client: any,
  listKey: string,
  oldKeys: Set<string>,
  newUserId: string
): Promise<number> {
  let rewrittenCount = 0;
  const items: string[] = await client.lRange(listKey, 0, -1);
  if (!items || items.length === 0) return 0;

  for (let idx = 0; idx < items.length; idx++) {
    const rawItem = items[idx];
    const parsed = safeJsonParse<Record<string, any> | null>(rawItem, null);
    if (!parsed || typeof parsed.userId !== 'string' || !oldKeys.has(parsed.userId)) {
      continue;
    }

    const updatedItemStr = JSON.stringify({
      ...parsed,
      userId: newUserId,
    });

    // Verify index alignment in case a concurrent LPUSH shifted the list
    const currentAtIdx = await client.lIndex(listKey, idx);
    if (currentAtIdx === rawItem) {
      await client.lSet(listKey, idx, updatedItemStr);
      rewrittenCount++;
    } else {
      // Concurrent LPUSH shifted items toward the tail; scan current list to find exact match
      const freshItems: string[] = await client.lRange(listKey, 0, -1);
      const shiftedIdx = freshItems.indexOf(rawItem);
      if (shiftedIdx !== -1) {
        await client.lSet(listKey, shiftedIdx, updatedItemStr);
        rewrittenCount++;
      }
    }
  }

  return rewrittenCount;
}

// ── Helper to Build Client Account Payload ───────────────────────────────

async function buildAccountSummary(
  client: any,
  userId: string,
  token: string,
  userHash?: Record<string, string>
) {
  const hash = userHash && Object.keys(userHash).length > 0
    ? userHash
    : await client.hGetAll(`scholar_user:${userId}`);

  let lastSyncedAt: string | null = null;
  const saveRaw = await client.get(`scholar_user:${userId}:save`);
  if (saveRaw) {
    const saveParsed = safeJsonParse<{ lastUpdated?: string } | null>(saveRaw, null);
    if (saveParsed?.lastUpdated) {
      lastSyncedAt = saveParsed.lastUpdated;
    }
  }

  return {
    userId,
    username: hash?.username || '',
    displayName: hash?.displayName || hash?.username || '',
    token,
    createdAt: hash?.createdAt || '',
    lastLoginAt: hash?.lastLoginAt || '',
    lastSyncedAt,
    teamId: hash?.teamId || '',
    boundOldCode: hash?.boundOldCode || '',
  };
}

// ── Server-Side Pure SVG Captcha (Zero-FS Serverless Safe + HMAC Signature) ──

const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CAPTCHA_FALLBACK_SECRET = 'scholar-dungeon-captcha-hmac-secret-v1';
const CAPTCHA_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function getCaptchaSecret(): string {
  return getAuthTokenSecret() || CAPTCHA_FALLBACK_SECRET;
}

/**
 * 5x7 dot-matrix glyphs for the challenge characters.
 *
 * The characters used to be emitted as <text> nodes, which meant the answer sat
 * in the response as literal text: a twelve-character regex pulled it out and
 * automated registration needed no image understanding at all. Drawing them as
 * dots removes the text, so recovering the code now requires clustering points
 * back onto a grid and matching them against a glyph set.
 */
const CAPTCHA_GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#...#', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '#...#', '.###.'],
};

function buildCaptchaSvg(code: string): string {
  const charColors = [
    'var(--color-indigo-400, #818cf8)',
    'var(--color-slate-100, #f1f5f9)',
    'var(--color-indigo-500, #6366f1)',
    'var(--color-slate-200, #e2e8f0)',
  ];

  let noisePaths = '';
  for (let i = 0; i < 3; i++) {
    const x1 = crypto.randomInt(4, 24);
    const y1 = crypto.randomInt(6, 38);
    const cx1 = crypto.randomInt(30, 62);
    const cy1 = crypto.randomInt(4, 40);
    const cx2 = crypto.randomInt(62, 96);
    const cy2 = crypto.randomInt(4, 40);
    const x2 = crypto.randomInt(100, 120);
    const y2 = crypto.randomInt(6, 38);
    const strokeColor = i % 2 === 0
      ? 'var(--color-indigo-400, #818cf8)'
      : 'var(--color-slate-400, #94a3b8)';
    noisePaths += `<path d="M${x1} ${y1} C${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" stroke="${strokeColor}" stroke-width="1.35" stroke-opacity="0.4" stroke-linecap="round" fill="none"/>`;
  }

  for (let i = 0; i < 6; i++) {
    const cx = crypto.randomInt(8, 116);
    const cy = crypto.randomInt(6, 38);
    const r = (crypto.randomInt(8, 16) / 10).toFixed(1);
    const dotColor = charColors[i % charColors.length];
    noisePaths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotColor}" fill-opacity="0.35"/>`;
  }

  const CELL = 3.5;
  const DOT = 2.5;
  let charElements = '';

  for (let i = 0; i < code.length; i++) {
    const glyph = CAPTCHA_GLYPHS[code[i]];
    if (!glyph) continue;

    const originX = 14 + i * 28;
    const originY = 10;
    const centerX = originX + (5 * CELL) / 2;
    const centerY = originY + (7 * CELL) / 2;
    const rotate = crypto.randomInt(-9, 10);
    const skewX = crypto.randomInt(-5, 6);
    const color = charColors[i % charColors.length];

    const cells: Array<[number, number]> = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '#') cells.push([col, row]);
      }
    }
    // Shuffled so the order of the nodes says nothing about the character.
    for (let k = cells.length - 1; k > 0; k--) {
      const j = crypto.randomInt(0, k + 1);
      [cells[k], cells[j]] = [cells[j], cells[k]];
    }

    let dots = '';
    for (const [col, row] of cells) {
      const x = originX + col * CELL + crypto.randomInt(-2, 3) / 10;
      const y = originY + row * CELL + crypto.randomInt(-2, 3) / 10;
      dots += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${DOT}" height="${DOT}" rx="0.9" fill="${color}"/>`;
    }
    // A few lighter decoy dots inside the cell to break naive grid reconstruction.
    for (let d = 0; d < 1; d++) {
      const x = originX + crypto.randomInt(0, 16) + crypto.randomInt(-2, 3) / 10;
      const y = originY + crypto.randomInt(0, 22) + crypto.randomInt(-2, 3) / 10;
      dots += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="2.2" height="2.2" rx="0.7" fill="${color}" fill-opacity="0.4"/>`;
    }

    charElements += `<g transform="rotate(${rotate} ${centerX.toFixed(1)} ${centerY.toFixed(1)}) skewX(${skewX})">${dots}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="124" height="44" viewBox="0 0 124 44" class="w-full h-full select-none">${noisePaths}${charElements}</svg>`;
}

export function createSignedCaptchaChallenge(): {
  svg: string;
  captchaToken: string;
} {
  let answer = '';
  for (let i = 0; i < 4; i++) {
    answer += CAPTCHA_CHARSET[crypto.randomInt(0, CAPTCHA_CHARSET.length)];
  }

  const themedSvg = buildCaptchaSvg(answer);
  const nonce = crypto.randomBytes(8).toString('hex');
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  const sig = crypto
    .createHmac('sha256', getCaptchaSecret())
    .update(`${nonce}:${expiresAt}:${answer}`, 'utf8')
    .digest('hex');

  return {
    svg: themedSvg,
    captchaToken: `${nonce}.${expiresAt}.${sig}`,
  };
}

export function verifySignedCaptchaChallenge(
  captchaToken: unknown,
  captchaCode: unknown,
  contextPrefix = 'Verification failed'
): { valid: boolean; nonce?: string; error?: string } {
  if (typeof captchaToken !== 'string' || !captchaToken.trim()) {
    return {
      valid: false,
      error: `${contextPrefix}: Verification challenge expired or missing. Please enter the newly generated 4-character code.`,
    };
  }
  if (typeof captchaCode !== 'string' || !captchaCode.trim()) {
    return {
      valid: false,
      error: `${contextPrefix}: Please enter the 4-character verification code.`,
    };
  }
  const parts = captchaToken.trim().split('.');
  if (parts.length !== 3) {
    return {
      valid: false,
      error: `${contextPrefix}: Invalid verification challenge. Please enter the newly generated code.`,
    };
  }
  const [nonce, expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return {
      valid: false,
      error: `${contextPrefix}: Verification code has expired (valid for 5 minutes). A new code has been generated.`,
    };
  }
  const normalizedCode = captchaCode.trim().toUpperCase();

  // A client-generated fallback challenge used to be accepted here whenever the
  // nonce started with "local_", by comparing the signature against the hex of
  // the submitted answer. That is a self-signed token: anyone could mint one and
  // skip the challenge entirely, so it is gone. Only tokens signed with the
  // server secret below are accepted.

  const expectedSig = crypto
    .createHmac('sha256', getCaptchaSecret())
    .update(`${nonce}:${expiresAt}:${normalizedCode}`, 'utf8')
    .digest('hex');

  if (!constantTimeCompare(signature, expectedSig)) {
    return {
      valid: false,
      error: `${contextPrefix}: Incorrect 4-character verification code ("${normalizedCode}"). A new code has been generated.`,
    };
  }
  return { valid: true, nonce };
}

// ── Main Handler ─────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = (req.query?.action as string) || req.body?.action || '';
    const method = req.method || 'GET';

    // ── 0. GET /api/auth?action=captcha (Stateless SVG Captcha) ──────────
    if (method === 'GET' && action === 'captcha') {
      const challenge = createSignedCaptchaChallenge();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res.status(200).json({
        success: true,
        svg: challenge.svg,
        captchaToken: challenge.captchaToken,
      });
    }

    // ── 0b. GET /api/auth?action=check_username (Real-time duplicate detection) ──
    if (method === 'GET' && action === 'check_username') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const rawUsername = typeof req.query?.username === 'string' ? req.query.username : '';
      const cleanUsername = rawUsername.trim();
      if (!isValidUsername(cleanUsername)) {
        return res.status(200).json({
          success: true,
          valid: false,
          available: false,
          message: 'Username must be 3–20 characters using only letters, numbers, or underscores.',
        });
      }

      const client = await getRedisClient();
      if (!client) {
        return res.status(200).json({
          success: true,
          valid: true,
          available: true,
          unchecked: true,
          username: cleanUsername,
          message: `Username "@${cleanUsername}" is available.`,
        });
      }

      const ip = getClientIp(req);
      if (await checkRateLimitBucket(client, 'scholar_username_check_rate', ip, 60, 45)) {
        return res.status(429).json({
          success: false,
          error: 'Too many username checks. Please wait a moment.',
        });
      }

      const normalizedUsername = cleanUsername.toLowerCase();
      const lookupKey = `scholar_user_lookup:${normalizedUsername}`;
      const existingUserId = await client.get(lookupKey);

      if (existingUserId) {
        const userHashExists = await client.exists(`scholar_user:${existingUserId}`);
        if (userHashExists) {
          return res.status(200).json({
            success: true,
            valid: true,
            available: false,
            username: cleanUsername,
            message: `Username "@${cleanUsername}" is already taken.`,
          });
        }
      }

      return res.status(200).json({
        success: true,
        valid: true,
        available: true,
        username: cleanUsername,
        message: `Username "@${cleanUsername}" is available.`,
      });
    }

    // Parse body if string
    let body = req.body;
    if (typeof body === 'string') {
      body = safeJsonParse<Record<string, any>>(body, {});
    } else if (!body || typeof body !== 'object') {
      body = {};
    }

    // Fail-closed check for AUTH_TOKEN_SECRET across all auth operations
    const authTokenSecret = getAuthTokenSecret();
    if (!authTokenSecret) {
      return res.status(503).json({
        error: 'Server authentication secret (AUTH_TOKEN_SECRET) is not configured.',
      });
    }

    const client = await getRedisClient();
    if (!client) {
      return res.status(503).json({
        error: 'Authentication service is unavailable (Redis connection failed).',
      });
    }

    const ip = getClientIp(req);

    // ── 1. POST /api/auth?action=register ────────────────────────────────
    if (method === 'POST' && action === 'register') {
      const registrationSecret = getRegistrationSecret();
      if (!registrationSecret) {
        return res.status(503).json({
          error: 'Registration failed: Server registration secret (REGISTRATION_SECRET) is not configured.',
        });
      }

      if (
        await checkRateLimitBucket(
          client,
          'scholar_auth_rate',
          ip,
          AUTH_RATE_WINDOW_S,
          AUTH_RATE_MAX_ATTEMPTS
        )
      ) {
        return res.status(429).json({
          error: 'Registration failed: Too many attempts from your IP. Please wait 5 minutes and try again.',
        });
      }

      const { username, password, registrationKey, captchaCode, captchaToken } = body;

      const captchaCheck = verifySignedCaptchaChallenge(
        captchaToken,
        captchaCode,
        'Registration failed'
      );
      if (!captchaCheck.valid) {
        return res.status(400).json({ error: captchaCheck.error || 'Registration failed: Invalid verification code.' });
      }
      if (captchaCheck.nonce) {
        const usedNonce = await client.set(`scholar_captcha_used:${captchaCheck.nonce}`, '1', {
          NX: true,
          EX: 300,
        });
        if (!usedNonce) {
          return res.status(400).json({
            error: 'Registration failed: Verification code has already been used. Please enter the newly generated code.',
          });
        }
      }

      if (!registrationKey || typeof registrationKey !== 'string' || !registrationKey.trim()) {
        return res.status(403).json({
          error: 'Registration failed: Registration Invite Key is required.',
        });
      }

      if (!constantTimeCompare(registrationKey.trim(), registrationSecret)) {
        return res.status(403).json({
          error: 'Registration failed: Invalid Registration Invite Key. Please verify the invite key with the administrator.',
        });
      }

      if (!isValidUsername(username)) {
        return res.status(400).json({
          error: 'Registration failed: Username must be 3–20 characters using only letters, numbers, or underscores.',
        });
      }

      if (!isValidPassword(password)) {
        return res.status(400).json({
          error: 'Registration failed: Password must be between 6 and 64 characters.',
        });
      }

      const cleanUsername = username.trim();
      const normalizedUsername = cleanUsername.toLowerCase();
      const lookupKey = `scholar_user_lookup:${normalizedUsername}`;
      const newUserId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;

      // Enforce 300 active users capacity before creating a new user
      const fifteenDaysAgoMs = Date.now() - 15 * 24 * 3600 * 1000;
      await client.zRemRangeByScore('scholar_active_users', 0, fifteenDaysAgoMs);
      const activeCount = await client.zCard('scholar_active_users');
      if (activeCount >= 300) {
        return res.status(403).json({
          error: 'Registration failed: Server capacity is full (300/300 active scholars). Please try again later.',
        });
      }

      // Claim username atomically with orphan-lookup healing
      const claimed = await client.set(lookupKey, newUserId, { NX: true });
      if (!claimed) {
        const existingUserId = await client.get(lookupKey);
        if (existingUserId) {
          const userHashExists = await client.exists(`scholar_user:${existingUserId}`);
          if (!userHashExists) {
            // Heal orphan lookup left by a prior interrupted write
            await client.set(lookupKey, newUserId);
          } else {
            return res.status(409).json({
              error: `Sign-up failed: Username "@${cleanUsername}" is already taken. Please choose another username or switch to Log In.`,
            });
          }
        } else {
          return res.status(409).json({
            error: `Sign-up failed: Username "@${cleanUsername}" is already taken. Please choose another username or switch to Log In.`,
          });
        }
      }

      // Write user hash and issue session with strict rollback on failure
      try {
        const { passwordHash, salt, kdf } = await hashPasswordAsync(password);
        const nowIso = new Date().toISOString();
        const nowMs = Date.now();

        const userRecord: Record<string, string> = {
          userId: newUserId,
          username: cleanUsername,
          displayName: cleanUsername,
          passwordHash,
          salt,
          kdf,
          createdAt: nowIso,
          lastLoginAt: nowIso,
          teamId: '',
          boundOldCode: '',
        };

        await client.hSet(`scholar_user:${newUserId}`, userRecord);
        await client.zAdd('scholar_active_users', { score: nowMs, value: newUserId });

        const tokenId = crypto.randomBytes(32).toString('hex');
        const token = signSessionToken(tokenId, authTokenSecret);
        const sessionPayload = {
          userId: newUserId,
          username: cleanUsername,
          issuedAt: nowMs,
          expiresAt: nowMs + SESSION_TTL_SECONDS * 1000,
        };

        await client.set(`scholar_session:${tokenId}`, JSON.stringify(sessionPayload), {
          EX: SESSION_TTL_SECONDS,
        });

        const account = await buildAccountSummary(client, newUserId, token, userRecord);
        return res.status(201).json({
          success: true,
          token,
          account,
        });
      } catch (writeErr) {
        // Rollback username lookup and partial user hash so username is never locked
        try {
          await client.del(lookupKey);
          await client.del(`scholar_user:${newUserId}`);
          await client.zRem('scholar_active_users', newUserId);
        } catch (rollbackErr) {
          console.error('Rollback failed during registration:', rollbackErr);
        }
        throw writeErr;
      }
    }

    // ── 2. POST /api/auth?action=login ───────────────────────────────────
    if (method === 'POST' && action === 'login') {
      if (
        await checkRateLimitBucket(
          client,
          'scholar_auth_rate',
          ip,
          AUTH_RATE_WINDOW_S,
          AUTH_RATE_MAX_ATTEMPTS
        )
      ) {
        return res.status(429).json({
          error: 'Log-in failed: Too many failed log-in attempts. Please wait 5 minutes and try again.',
        });
      }

      const { username, password, captchaCode, captchaToken } = body;

      const captchaCheck = verifySignedCaptchaChallenge(
        captchaToken,
        captchaCode,
        'Log-in failed'
      );
      if (!captchaCheck.valid) {
        return res.status(400).json({ error: captchaCheck.error || 'Log-in failed: Invalid verification code.' });
      }
      if (captchaCheck.nonce) {
        const usedNonce = await client.set(`scholar_captcha_used:${captchaCheck.nonce}`, '1', {
          NX: true,
          EX: 300,
        });
        if (!usedNonce) {
          return res.status(400).json({
            error: 'Log-in failed: Verification code has already been used. Please enter the newly generated code.',
          });
        }
      }

      if (!isValidUsername(username)) {
        return res.status(400).json({
          error: 'Log-in failed: Username must be 3–20 characters (letters, numbers, or underscores).',
        });
      }

      if (typeof password !== 'string' || !password) {
        return res.status(400).json({
          error: 'Log-in failed: Please enter your password.',
        });
      }

      const trimmedUsername = username.trim();
      const normalizedUsername = trimmedUsername.toLowerCase();
      const userId = await client.get(`scholar_user_lookup:${normalizedUsername}`);
      if (!userId) {
        return res.status(404).json({
          error: `Log-in failed: Account "@${trimmedUsername}" does not exist. Please check your username or switch to Sign Up.`,
        });
      }

      const userHash = await client.hGetAll(`scholar_user:${userId}`);
      if (!userHash || !userHash.userId || !userHash.passwordHash || !userHash.salt) {
        return res.status(404).json({
          error: `Log-in failed: Account "@${trimmedUsername}" was not found. Please switch to Sign Up.`,
        });
      }

      const isValid = await verifyPasswordAsync(
        password,
        userHash.passwordHash,
        userHash.salt,
        userHash.kdf
      );
      if (!isValid) {
        return res.status(401).json({
          error: `Log-in failed: Incorrect password for "@${userHash.username}". Please check your password and try again.`,
        });
      }

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      await client.hSet(`scholar_user:${userId}`, 'lastLoginAt', nowIso);
      userHash.lastLoginAt = nowIso;

      await client.zAdd('scholar_active_users', { score: nowMs, value: userId });

      const tokenId = crypto.randomBytes(32).toString('hex');
      const token = signSessionToken(tokenId, authTokenSecret);
      const sessionPayload = {
        userId,
        username: userHash.username,
        issuedAt: nowMs,
        expiresAt: nowMs + SESSION_TTL_SECONDS * 1000,
      };

      await client.set(`scholar_session:${tokenId}`, JSON.stringify(sessionPayload), {
        EX: SESSION_TTL_SECONDS,
      });

      const account = await buildAccountSummary(client, userId, token, userHash);
      return res.status(200).json({
        success: true,
        token,
        account,
      });
    }

    // ── 3. GET /api/auth?action=me ───────────────────────────────────────
    if (method === 'GET' && action === 'me') {
      const verified = await verifyBearerToken(client, req.headers.authorization);
      if (!verified) {
        return res.status(401).json({ error: 'Invalid or expired session token.' });
      }

      const userHash = await client.hGetAll(`scholar_user:${verified.userId}`);
      if (!userHash || !userHash.userId) {
        await client.del(`scholar_session:${verified.tokenId}`);
        return res.status(401).json({ error: 'Account no longer exists.' });
      }

      await client.zAdd('scholar_active_users', { score: Date.now(), value: verified.userId });
      const account = await buildAccountSummary(client, verified.userId, verified.token, userHash);

      return res.status(200).json({
        success: true,
        account,
      });
    }

    // ── 4. POST /api/auth?action=logout ──────────────────────────────────
    if (method === 'POST' && action === 'logout') {
      const rawToken = extractBearerToken(req.headers.authorization) || body?.token;
      if (rawToken && typeof rawToken === 'string') {
        const tokenId = verifySignedToken(rawToken, authTokenSecret);
        if (tokenId) {
          await client.del(`scholar_session:${tokenId}`);
        }
      }
      return res.status(200).json({ success: true });
    }

    // ── 5. POST /api/auth?action=migrate_legacy ──────────────────────────
    if (method === 'POST' && action === 'migrate_legacy') {
      const verified = await verifyBearerToken(client, req.headers.authorization);
      if (!verified) {
        return res.status(401).json({ error: 'Authentication required to migrate legacy data.' });
      }

      if (
        await checkRateLimitBucket(
          client,
          'scholar_auth_migrate_rate',
          ip,
          MIGRATE_RATE_WINDOW_S,
          MIGRATE_RATE_MAX_ATTEMPTS
        )
      ) {
        return res.status(429).json({
          error: 'Too many migration attempts. Please wait 5 minutes and try again.',
        });
      }

      const {
        secretCode,
        teamId: clientTeamId,
        userUniqueId: clientUniqueId,
        forceOverwrite,
      } = body;

      if (!isValidSecretCode(secretCode)) {
        return res.status(400).json({ error: 'Invalid legacy secret code format.' });
      }

      const newUserId = verified.userId;
      const userHash = await client.hGetAll(`scholar_user:${newUserId}`);
      if (!userHash || !userHash.userId) {
        return res.status(404).json({ error: 'Authenticated user record not found.' });
      }

      const migrationSummary = {
        saveMigrated: false,
        historyMigrated: false,
        activeUserDeduplicated: false,
        migratedTeamIds: [] as string[],
        pushSubscriptionsMigrated: 0,
        pushTasksRewritten: 0,
        pushTaskRefMigrated: false,
      };

      // ── Domain A: Cloud Save & History Migration ───────────────────────
      const legacySaveKey = `scholar_sync_${secretCode}`;
      const legacyHistoryKey = `scholar_sync_${secretCode}_history`;
      const targetSaveKey = `scholar_user:${newUserId}:save`;
      const targetHistoryKey = `scholar_user:${newUserId}:save_history`;

      const legacySaveRaw = await client.get(legacySaveKey);
      const existingTargetSaveRaw = await client.get(targetSaveKey);
      const legacyCloudData = safeJsonParse<Record<string, any> | null>(legacySaveRaw, null);

      if (legacySaveRaw && (!existingTargetSaveRaw || forceOverwrite)) {
        await client.set(targetSaveKey, legacySaveRaw);
        migrationSummary.saveMigrated = true;
      }

      const legacyHistoryRaw = await client.get(legacyHistoryKey);
      const existingTargetHistoryRaw = await client.get(targetHistoryKey);
      if (legacyHistoryRaw && (!existingTargetHistoryRaw || forceOverwrite)) {
        await client.set(targetHistoryKey, legacyHistoryRaw);
        migrationSummary.historyMigrated = true;
      }

      // ── Domain B: Active User Quota ZSET Deduplication ─────────────────
      const removedActive = await client.zRem('scholar_active_users', secretCode);
      await client.zAdd('scholar_active_users', { score: Date.now(), value: newUserId });
      migrationSummary.activeUserDeduplicated = Number(removedActive) > 0;

      // ── Domain C: Fellowship Guild Identity Migration (No KEYS, LSET) ──
      const oldGuildKey = crypto
        .createHash('sha256')
        .update(secretCode)
        .digest('hex')
        .substring(0, 16);

      const oldGuildKeys = new Set<string>([oldGuildKey, secretCode]);
      const effectiveUniqueId =
        (typeof clientUniqueId === 'string' && clientUniqueId.trim()) ||
        (typeof legacyCloudData?.userUniqueId === 'string' && legacyCloudData.userUniqueId.trim()) ||
        '';
      if (effectiveUniqueId) {
        const hashedUniqueId = crypto
          .createHash('sha256')
          .update(effectiveUniqueId)
          .digest('hex')
          .substring(0, 16);
        oldGuildKeys.add(hashedUniqueId);
      }

      const candidateTeamIds = new Set<string>();
      if (typeof clientTeamId === 'string' && clientTeamId.trim()) {
        candidateTeamIds.add(clientTeamId.trim());
      }
      if (typeof legacyCloudData?.teamId === 'string' && legacyCloudData.teamId.trim()) {
        candidateTeamIds.add(legacyCloudData.teamId.trim());
      }
      if (typeof userHash.teamId === 'string' && userHash.teamId.trim()) {
        candidateTeamIds.add(userHash.teamId.trim());
      }

      const activeTeamIds: string[] = await client.zRange('scholar_active_teams', 0, -1);
      if (Array.isArray(activeTeamIds)) {
        for (const tid of activeTeamIds) {
          if (tid && typeof tid === 'string') candidateTeamIds.add(tid);
        }
      }

      let primaryMigratedTeamId = userHash.teamId || '';

      for (const teamId of candidateTeamIds) {
        const teamExists = await client.exists(`scholar_team:${teamId}`);
        if (!teamExists) continue;

        let touchedTeam = false;
        const membersKey = `scholar_team:${teamId}:members`;
        const applicantsKey = `scholar_team:${teamId}:applicants`;
        const proposalKey = `scholar_team:${teamId}:proposal`;
        const messagesKey = `scholar_team:${teamId}:messages`;
        const eventsKey = `scholar_team:${teamId}:events`;

        // 1. Migrate members hash (Write-first to newUserId, then delete old key)
        for (const legacyMemberKey of oldGuildKeys) {
          if (legacyMemberKey === newUserId) continue;
          const legacyMemberRaw = await client.hGet(membersKey, legacyMemberKey);
          if (!legacyMemberRaw) continue;

          const legacyMember = safeJsonParse<Record<string, any> | null>(legacyMemberRaw, null);
          if (!legacyMember) continue;

          const existingNewRaw = await client.hGet(membersKey, newUserId);
          const existingNew = safeJsonParse<Record<string, any> | null>(existingNewRaw, null);

          const mergedMember = {
            ...legacyMember,
            ...(existingNew || {}),
            userId: newUserId,
            isCaptain: Boolean(legacyMember.isCaptain || existingNew?.isCaptain),
            joinedAt: Math.min(
              legacyMember.joinedAt || Date.now(),
              existingNew?.joinedAt || Date.now()
            ),
            totalFocusTime: Math.max(
              Number(legacyMember.totalFocusTime) || 0,
              Number(existingNew?.totalFocusTime) || 0
            ),
            cycleFocusTime: Math.max(
              Number(legacyMember.cycleFocusTime) || 0,
              Number(existingNew?.cycleFocusTime) || 0
            ),
          };

          // Write new key first before deleting legacy key
          await client.hSet(membersKey, newUserId, JSON.stringify(mergedMember));
          await client.hDel(membersKey, legacyMemberKey);
          // If both existed previously, decrement memberCount by 1 to keep count accurate
          if (existingNew) {
            const currentCountStr = await client.hGet(`scholar_team:${teamId}`, 'memberCount');
            const currentCount = parseInt(currentCountStr || '1', 10);
            if (currentCount > 1) {
              await client.hIncrBy(`scholar_team:${teamId}`, 'memberCount', -1);
            }
          }
          touchedTeam = true;
          primaryMigratedTeamId = teamId;
        }

        // 2. Migrate applicants hash (Write-first to newUserId, then delete old key)
        for (const legacyApplicantKey of oldGuildKeys) {
          if (legacyApplicantKey === newUserId) continue;
          const legacyAppRaw = await client.hGet(applicantsKey, legacyApplicantKey);
          if (!legacyAppRaw) continue;

          const legacyApp = safeJsonParse<Record<string, any> | null>(legacyAppRaw, null);
          if (legacyApp) {
            const updatedApp = { ...legacyApp, userId: newUserId };
            await client.hSet(applicantsKey, newUserId, JSON.stringify(updatedApp));
          }
          await client.hDel(applicantsKey, legacyApplicantKey);
          touchedTeam = true;
        }

        // 3. Migrate active proposal proposerId & votes
        const propRaw = await client.get(proposalKey);
        if (propRaw) {
          const prop = safeJsonParse<Record<string, any> | null>(propRaw, null);
          if (prop) {
            let propModified = false;
            if (typeof prop.proposerId === 'string' && oldGuildKeys.has(prop.proposerId)) {
              prop.proposerId = newUserId;
              propModified = true;
            }
            if (prop.votes && typeof prop.votes === 'object') {
              for (const oldKey of oldGuildKeys) {
                if (oldKey !== newUserId && prop.votes[oldKey] !== undefined) {
                  if (prop.votes[newUserId] === undefined) {
                    prop.votes[newUserId] = prop.votes[oldKey];
                  }
                  delete prop.votes[oldKey];
                  propModified = true;
                }
              }
            }
            if (propModified) {
              await client.set(proposalKey, JSON.stringify(prop));
              touchedTeam = true;
            }
          }
        }

        // 4. Rewrite messages and events in-place via LSET
        const rewrittenMsgs = await rewriteGuildListOwnerInPlace(
          client,
          messagesKey,
          oldGuildKeys,
          newUserId
        );
        const rewrittenEvts = await rewriteGuildListOwnerInPlace(
          client,
          eventsKey,
          oldGuildKeys,
          newUserId
        );

        if (rewrittenMsgs > 0 || rewrittenEvts > 0) {
          touchedTeam = true;
        }

        if (touchedTeam) {
          migrationSummary.migratedTeamIds.push(teamId);
        }
      }

      // ── Domain D: Web Push Subscriptions & Pending Task Queue Migration ─
      const legacySubsKey = `scholar_push_subs_${secretCode}`;
      const legacySingleSubKey = `scholar_push_sub_${secretCode}`;
      const targetSubsKey = `scholar_push_subs_${newUserId}`;

      const legacySubs: string[] = await client.sMembers(legacySubsKey);
      const legacySingleSub: string | null = await client.get(legacySingleSubKey);

      const allSubsToMigrate: string[] = [];
      if (Array.isArray(legacySubs) && legacySubs.length > 0) {
        allSubsToMigrate.push(...legacySubs);
      }
      if (legacySingleSub) {
        allSubsToMigrate.push(legacySingleSub);
      }

      if (allSubsToMigrate.length > 0) {
        for (const subStr of allSubsToMigrate) {
          await client.sAdd(targetSubsKey, subStr);
        }
        // Keep legacy subscription keys with a 24-hour grace TTL to prevent cron race loss
        await client.expire(legacySubsKey, 86400);
        if (legacySingleSub) {
          await client.expire(legacySingleSubKey, 86400);
        }
        migrationSummary.pushSubscriptionsMigrated = allSubsToMigrate.length;
      }

      // Rewrite queued tasks in scholar_push_tasks ZSET
      const queuedTasks: Array<{ value: string; score: number }> =
        await client.zRangeWithScores('scholar_push_tasks', 0, -1);

      if (Array.isArray(queuedTasks) && queuedTasks.length > 0) {
        for (const entry of queuedTasks) {
          const parsedTask = safeJsonParse<Record<string, any> | null>(entry.value, null);
          if (parsedTask && parsedTask.secretCode === secretCode) {
            const removed = await client.zRem('scholar_push_tasks', entry.value);
            if (Number(removed) === 1) {
              const updatedTaskStr = JSON.stringify({
                ...parsedTask,
                secretCode: newUserId,
              });
              await client.zAdd('scholar_push_tasks', {
                score: entry.score,
                value: updatedTaskStr,
              });
              migrationSummary.pushTasksRewritten++;
            }
          }
        }
      }

      // Migrate quick-cancel task reference preserving remaining PTTL
      const legacyRefKey = `scholar_push_task_ref_${secretCode}`;
      const targetRefKey = `scholar_push_task_ref_${newUserId}`;
      const legacyRefRaw = await client.get(legacyRefKey);
      if (legacyRefRaw) {
        const remainingPttl = await client.pTTL(legacyRefKey);
        const parsedRef = safeJsonParse<Record<string, any> | null>(legacyRefRaw, null);
        const updatedRefStr = parsedRef
          ? JSON.stringify({ ...parsedRef, secretCode: newUserId })
          : legacyRefRaw;

        const effectivePx = typeof remainingPttl === 'number' && remainingPttl > 0 ? remainingPttl : 3600000;
        await client.set(targetRefKey, updatedRefStr, { PX: effectivePx });
        await client.del(legacyRefKey);
        migrationSummary.pushTaskRefMigrated = true;
      }

      // Update user hash with boundOldCode and discovered teamId
      const userUpdates: Record<string, string> = {
        boundOldCode: secretCode,
      };
      if (primaryMigratedTeamId) {
        userUpdates.teamId = primaryMigratedTeamId;
        userHash.teamId = primaryMigratedTeamId;
      }
      userHash.boundOldCode = secretCode;
      await client.hSet(`scholar_user:${newUserId}`, userUpdates);

      const finalSaveRaw = await client.get(targetSaveKey);
      const finalCloudData = safeJsonParse<Record<string, any> | null>(finalSaveRaw, null);
      const account = await buildAccountSummary(client, newUserId, verified.token, userHash);

      return res.status(200).json({
        success: true,
        account,
        cloudData: finalCloudData,
        migrationSummary,
      });
    }

    return res.status(400).json({
      error: `Unsupported auth action or method (${method} ${action || 'none'}).`,
    });
  } catch (error: any) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      error: 'Internal authentication server error.',
    });
  }
}
