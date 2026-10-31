import { createClient } from 'redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyBearerToken } from './_shared/auth.js';
import { resolveSyncIdentity } from './_shared/identity.js';
import {
  ACCOUNT_CAPACITY,
  ACTIVE_USERS_KEY,
  countActiveAccounts,
  reconcileActiveAccounts,
  touchActiveAccount,
} from './_shared/capacity.js';

// Initialize Redis client lazily to reuse connection in serverless environment
let redisClient: any = null;
const getRedisClient = async () => {
  if (redisClient && redisClient.isOpen) return redisClient;
  if (process.env.REDIS_URL) {
    try {
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err: any) => console.error('Redis Client Error', err));
      await redisClient.connect();
      return redisClient;
    } catch (err) {
      console.error("Redis initialization error:", err);
      return null;
    }
  }
  return null;
};


// ── Validation & rate limiting ────────────────────────────────────────────

function getStorageKeys(identity: string, isUnifiedUser: boolean): { saveKey: string; historyKey: string } {
  if (isUnifiedUser) {
    return {
      saveKey: `scholar_user:${identity}:save`,
      historyKey: `scholar_user:${identity}:save_history`,
    };
  }
  return {
    saveKey: `scholar_sync_${identity}`,
    historyKey: `scholar_sync_${identity}_history`,
  };
}

const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX = 20;

function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** Fixed-window counter per IP. INCR is atomic, so concurrent requests are safe. */
async function isRateLimited(client: any, req: VercelRequest): Promise<boolean> {
  try {
    const key = `scholar_rate_${clientIp(req)}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, RATE_LIMIT_WINDOW_S);
    return count > RATE_LIMIT_MAX;
  } catch (err) {
    // Fail open: never block syncs because the counter broke.
    console.error('Rate limit check failed:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = req.url?.split('?')[0];

    const client = await getRedisClient();
    if (!client) {
      return res.status(500).json({ error: "Cloud sync is not configured (Redis connection failed)." });
    }

    if (await isRateLimited(client, req)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    // Parse body if it's a string (fallback for missing Content-Type)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("Failed to parse string body:", e);
      }
    }

    // 1. A verified session acts as its own account. Without one, only a legacy
    //    sync code is accepted: an account id names a save, it never
    //    authenticated a caller, so quoting one no longer reaches that save.
    const verifiedSession = await verifyBearerToken(client, req.headers.authorization);
    const identity = resolveSyncIdentity(verifiedSession?.userId, body?.secretCode);
    if (identity.kind === 'denied') {
      return res.status(identity.status).json({ error: identity.error });
    }

    const activeIdentity = identity.identity;
    const isUnified = identity.unified;

    // Check if history is requested
    if (path?.endsWith('/history')) {
      const { historyKey } = getStorageKeys(activeIdentity, isUnified);
      const historyRaw = await client.get(historyKey);
      const historyList = historyRaw ? JSON.parse(historyRaw.toString()) : [];
      
      return res.status(200).json({ success: true, history: historyList });
    }

    if (req.method === 'POST') {
      const { localData, forceOverwrite } = body || {};

      const { saveKey, historyKey } = getStorageKeys(activeIdentity, isUnified);

      // Seats belong to accounts only. A legacy sync code has no account behind
      // it, so it never enters the quota: this route is reachable without a
      // session, and every unseen code used to claim a seat, which let anyone
      // exhaust the pool and lock real users out of registration.
      if (isUnified) {
        await reconcileActiveAccounts(client);
        await touchActiveAccount(client, activeIdentity);

        const activeAccounts = await countActiveAccounts(client);
        if (activeAccounts > ACCOUNT_CAPACITY) {
          const rank = await client.zRank(ACTIVE_USERS_KEY, activeIdentity);
          if (rank !== null && rank >= ACCOUNT_CAPACITY) {
            await client.zRem(ACTIVE_USERS_KEY, activeIdentity);
            return res.status(403).json({ error: `Capacity Full: Multi-device sync is capped at ${ACCOUNT_CAPACITY} registered users in the free tier quota. Try again later when inactive slots clear up.` });
          }
        }
      }

      const cloudDataRaw = await client.get(saveKey);
      const cloudData = cloudDataRaw ? JSON.parse(cloudDataRaw.toString()) : null;

      // If no localData is provided, this is a FETCH request
      if (!localData) {
        return res.status(200).json({ cloudData });
      }

      // Conflict resolution
      if (cloudData && cloudData.lastUpdated) {
        const cloudTime = new Date(cloudData.lastUpdated).getTime();
        const localTime = new Date(localData.lastUpdated || 0).getTime();
        
        const cloudDevice = cloudData.savedByDeviceCode;
        const localDevice = localData.savedByDeviceCode;
        const deviceMismatch = cloudDevice && localDevice && cloudDevice !== localDevice;

        if ((deviceMismatch || cloudTime > localTime) && !forceOverwrite) {
          return res.status(409).json({ conflict: true, cloudData });
        }
      }

      if (!localData.lastUpdated) localData.lastUpdated = new Date().toISOString();
      
      // Save backup history (up to 3 recent copies)
      if (cloudData && cloudData.lastUpdated && cloudData.lastUpdated !== localData.lastUpdated) {
          const historyRaw = await client.get(historyKey);
          let historyList = historyRaw ? JSON.parse(historyRaw.toString()) : [];
          // Insert at beginning
          historyList.unshift(cloudData);
          // Keep only last 3
          historyList = historyList.slice(0, 3);
          await client.set(historyKey, JSON.stringify(historyList));
      }

      await client.set(saveKey, JSON.stringify(localData));
      return res.status(200).json({ success: true, cloudData: localData });
    } 
    
    if (req.method === 'DELETE') {
      const { saveKey, historyKey } = getStorageKeys(activeIdentity, isUnified);
      await client.del(saveKey);
      await client.del(historyKey);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
