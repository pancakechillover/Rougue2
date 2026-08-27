import type { VercelRequest, VercelResponse } from '@vercel/node';

// Inline helpers to make it fully self-contained on Vercel
function isForbiddenHost(host: string): boolean {
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal'].includes(host)) return true;
  
  if (host.startsWith('::ffff:')) {
    host = host.substring(7);
  }

  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;
  if (host.startsWith('127.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  if (host.startsWith('fc00:') || host.startsWith('fc00::') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  return false;
}

function validateWebDavUrl(url: string, isDev: boolean): URL | { error: string } {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return { error: 'Invalid URL format' };
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { error: 'Unsupported protocol' };
  }

  if (parsedUrl.protocol === 'http:' && !isDev) {
    return { error: 'HTTPS is required for WebDAV connections' };
  }

  if (isForbiddenHost(parsedUrl.hostname)) {
    return { error: 'Access to the requested host is forbidden' };
  }

  return parsedUrl;
}

function validateWebDavMethod(method: string): string | { error: string } {
  const allowedMethods = ['GET', 'PUT', 'PROPFIND', 'DELETE', 'MKCOL', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(method.toUpperCase())) {
    return { error: 'Method not allowed' };
  }
  return method.toUpperCase();
}

function validateWebDavBodySize(method: string, bodyString: string): { error: string } | null {
  if (['PUT'].includes(method)) {
    if (bodyString.length > 10 * 1024 * 1024) {
      return { error: 'Request body exceeds size limit' };
    }
  } else if (['PROPFIND'].includes(method)) {
    if (bodyString.length > 256 * 1024) {
      return { error: 'PROPFIND request body exceeds size limit' };
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const rawBody = req.body;
    let payload;
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : (rawBody || {});
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { url, username, password, method, body } = payload;

    if (!url || !username || !password || !method) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (typeof method !== 'string') {
      return res.status(400).json({ error: 'Method must be a string' });
    }

    const validatedMethod = validateWebDavMethod(method);
    if (typeof validatedMethod === 'object' && validatedMethod.error) {
      return res.status(405).json({ error: validatedMethod.error });
    }

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    
    // Check if the URL is valid and secure
    const isDev = process.env.NODE_ENV === 'development';
    const validatedUrl = validateWebDavUrl(url, isDev);
    if ('error' in validatedUrl) {
      const isForbidden = validatedUrl.error.includes('forbidden');
      return res.status(isForbidden ? 403 : 400).json({ error: validatedUrl.error });
    }
    
    const parsedUrl = validatedUrl as URL;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const fetchOptions: RequestInit = {
      method: validatedMethod as string,
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Scholar-Dungeon/WebDAV-Proxy',
        'Accept': '*/*, application/json, text/plain',
      },
      signal: controller.signal,
    };

    if (validatedMethod === 'PROPFIND') {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Depth': '0',
      };
    }

    if (body && ['PUT'].includes(validatedMethod as string)) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const sizeValidation = validateWebDavBodySize(validatedMethod as string, bodyString);
      if (sizeValidation?.error) {
        clearTimeout(timeoutId);
        return res.status(413).json({ error: sizeValidation.error });
      }
      fetchOptions.body = bodyString;
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/octet-stream',
      };
    } else if (body && ['PROPFIND'].includes(validatedMethod as string)) {
       const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
       const sizeValidation = validateWebDavBodySize(validatedMethod as string, bodyString);
       if (sizeValidation?.error) {
         clearTimeout(timeoutId);
         return res.status(413).json({ error: sizeValidation.error });
       }
       fetchOptions.body = bodyString;
       fetchOptions.headers = {
         ...fetchOptions.headers,
         'Content-Type': 'application/xml',
       };
    }

    const response = await fetch(parsedUrl.toString(), fetchOptions);
    clearTimeout(timeoutId);
    
    if (validatedMethod === 'PROPFIND') {
      return res.status(200).json({
        success: true,
        status: response.status,
        ok: response.ok || response.status === 207
      });
    }

    if (!response.ok) {
      if (response.status === 404 && method.toUpperCase() === 'GET') {
          return res.status(200).json({ data: null, is404: true });
      }
      return res.status(response.status < 500 ? response.status : 502).json({
        error: `WebDAV server returned status ${response.status}`,
        status: response.status
      });
    }

    if (method.toUpperCase() === 'GET') {
      const text = await response.text();
      if (!text.trim()) return res.status(200).json({ data: null });
      try {
        return res.status(200).json({ data: JSON.parse(text) });
      } catch {
        return res.status(502).json({ error: 'WebDAV save file is not valid JSON' });
      }
    }

    return res.status(200).json({ success: true });
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'WebDAV proxy request timed out' });
    }
    return res.status(500).json({
      error: 'WebDAV proxy failed',
      detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined
    });
  }
}
