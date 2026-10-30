import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

type FakeResponse = {
  statusCode: number;
  body: unknown;
  status(code: number): FakeResponse;
  json(payload: unknown): FakeResponse;
};

function createResponse(): FakeResponse {
  const res: FakeResponse = {
    statusCode: 0,
    body: undefined,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

/**
 * Loads the real handler from `api/webdav/proxy.ts`.
 *
 * The repo (correctly) uses extensionless relative imports, which the Vercel
 * bundler resolves but Node's ESM loader does not. Rather than duplicating the
 * handler into the test, the source is loaded verbatim with the specifier
 * pinned to an absolute file URL — so there is still only one source of truth.
 */
async function loadProxyHandler() {
  const entry = path.join(repoRoot, 'api', 'webdav', 'proxy.ts');
  const shared = pathToFileURL(path.join(repoRoot, 'api', '_shared', 'webdavSecurity.ts')).href;

  const source = await readFile(entry, 'utf8');
  // Accept either directory name and an optional .js extension: Vercel skips
  // `_`-prefixed folders when generating functions (so helpers live in
  // api/_shared/), and its Node ESM runtime needs the extension spelled out.
  const importRe = /from '(\.\.\/_?shared\/webdavSecurity)(?:\.js)?'/;
  assert.ok(
    importRe.test(source),
    'proxy.ts must import the shared security module',
  );

  const rewritten = source.replace(importRe, `from '${shared}'`);
  const dir = await mkdtemp(path.join(tmpdir(), 'sd-proxy-'));
  const file = path.join(dir, 'proxy.ts');
  await writeFile(file, rewritten, 'utf8');

  const mod = await import(pathToFileURL(file).href);
  return { handler: mod.default as (req: unknown, res: unknown) => Promise<unknown>, dir };
}

const ctx = await loadProxyHandler();
test.after(async () => {
  await rm(ctx.dir, { recursive: true, force: true });
});

const call = (req: Record<string, unknown>) => {
  const res = createResponse();
  return ctx.handler(req, res).then(() => res);
};

const publicPayload = {
  url: 'https://dav.example.com/save.json',
  username: 'user',
  password: 'pass',
  method: 'GET',
};

test('the handler rejects anything that is not a POST', async () => {
  const res = await call({ method: 'GET', body: publicPayload });
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});

test('the handler requires url, username, password and method', async () => {
  const res = await call({ method: 'POST', body: { url: publicPayload.url } });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Missing required parameters' });
});

test('the handler rejects a malformed JSON body', async () => {
  const res = await call({ method: 'POST', body: '{not json' });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid JSON body' });
});

test('the handler rejects a non-string method', async () => {
  const res = await call({ method: 'POST', body: { ...publicPayload, method: 42 } });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Method must be a string' });
});

test('the handler rejects WebDAV verbs outside the allowlist', async () => {
  const res = await call({ method: 'POST', body: { ...publicPayload, method: 'TRACE' } });
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});

test('the handler refuses internal targets before any network call', async () => {
  const forbidden = [
    'https://127.0.0.1/dav/save.json',
    'https://[::1]/dav/save.json',
    'https://[::ffff:127.0.0.1]/dav/save.json',
    'https://169.254.169.254/latest/meta-data/',
    'https://10.0.0.5/dav/save.json',
    'https://100.64.0.1/dav/save.json',
    'https://[fd00::1]/dav/save.json',
    'https://metadata.google.internal/computeMetadata/v1/',
  ];

  for (const url of forbidden) {
    const res = await call({ method: 'POST', body: { ...publicPayload, url } });
    assert.equal(res.statusCode, 403, `${url} should be refused`);
    assert.deepEqual(res.body, { error: 'Access to the requested host is forbidden' });
  }
});

test('the handler rejects unsupported protocols as a bad request', async () => {
  const res = await call({ method: 'POST', body: { ...publicPayload, url: 'ftp://example.com/x' } });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Unsupported protocol' });
});

test('the handler rejects an oversized PUT body with 413', async () => {
  const res = await call({
    method: 'POST',
    body: { ...publicPayload, method: 'PUT', body: 'x'.repeat(10 * 1024 * 1024 + 1) },
  });
  assert.equal(res.statusCode, 413);
  assert.deepEqual(res.body, { error: 'Request body exceeds size limit' });
});

test('the handler accepts a PUT body sitting exactly on the size limit', async () => {
  const res = await call({
    method: 'POST',
    body: { ...publicPayload, method: 'PUT', body: 'x'.repeat(10 * 1024 * 1024) },
  });
  // Passed the size guard, so it moved on to the network call.
  assert.notEqual(res.statusCode, 413);
});
