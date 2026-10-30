import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  resolveAndValidateHostname,
  validateWebDavBodySize,
  validateWebDavMethod,
  validateWebDavUrl,
} from '../_shared/webdavSecurity.js';

/**
 * WebDAV proxy used by the browser client to reach third-party WebDAV servers
 * without hitting CORS. The SSRF guard lives in `../_shared/webdavSecurity` so
 * the Express development mirror in `server.ts` applies the exact same rules.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const rawBody = req.body;
    let payload: Record<string, unknown>;
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : (rawBody || {});
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { url, username, password, method, body } = payload as {
      url?: unknown;
      username?: unknown;
      password?: unknown;
      method?: unknown;
      body?: unknown;
    };

    if (!url || !username || !password || !method) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (typeof url !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid parameter types' });
    }

    if (typeof method !== 'string') {
      return res.status(400).json({ error: 'Method must be a string' });
    }

    const validatedMethod = validateWebDavMethod(method);
    if (typeof validatedMethod === 'object') {
      return res.status(405).json({ error: validatedMethod.error });
    }

    const validatedUrl = validateWebDavUrl(url);
    if ('error' in validatedUrl) {
      const isForbidden = validatedUrl.error.includes('forbidden');
      return res.status(isForbidden ? 403 : 400).json({ error: validatedUrl.error });
    }
    const parsedUrl = validatedUrl;

    // Second line of defence: the hostname cleared the static blocklist, but it
    // may still resolve to an internal address (DNS rebinding).
    const dnsRejection = await resolveAndValidateHostname(parsedUrl.hostname);
    if (dnsRejection) {
      return res.status(403).json({ error: dnsRejection.error });
    }

    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'User-Agent': 'Scholar-Dungeon/WebDAV-Proxy',
      Accept: '*/*, application/json, text/plain',
    };

    if (validatedMethod === 'PROPFIND') {
      headers.Depth = '0';
    }

    const fetchOptions: RequestInit = {
      method: validatedMethod,
      headers,
      signal: AbortSignal.timeout(10000),
    };

    if (body && (validatedMethod === 'PUT' || validatedMethod === 'PROPFIND')) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const sizeValidation = validateWebDavBodySize(validatedMethod, bodyString);
      if (sizeValidation?.error) {
        return res.status(413).json({ error: sizeValidation.error });
      }
      fetchOptions.body = bodyString;
      headers['Content-Type'] =
        validatedMethod === 'PUT' ? 'application/octet-stream' : 'application/xml';
    }

    const response = await fetch(parsedUrl.toString(), fetchOptions);

    if (validatedMethod === 'PROPFIND') {
      return res.status(200).json({
        success: true,
        status: response.status,
        ok: response.ok || response.status === 207,
      });
    }

    if (!response.ok) {
      if (response.status === 404 && validatedMethod === 'GET') {
        return res.status(200).json({ data: null, is404: true });
      }
      return res.status(response.status < 500 ? response.status : 502).json({
        error: `WebDAV server returned status ${response.status}`,
        status: response.status,
      });
    }

    if (validatedMethod === 'GET') {
      const text = await response.text();
      if (!text.trim()) return res.status(200).json({ data: null });
      try {
        return res.status(200).json({ data: JSON.parse(text) });
      } catch {
        return res.status(502).json({ error: 'WebDAV save file is not valid JSON' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return res.status(504).json({ error: 'WebDAV proxy request timed out' });
    }
    return res.status(500).json({
      error: 'WebDAV proxy failed',
      detail:
        process.env.NODE_ENV === 'development'
          ? String(error instanceof Error ? error.message : error)
          : undefined,
    });
  }
}
