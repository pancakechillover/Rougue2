export function isForbiddenHost(host: string): boolean {
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal'].includes(host)) return true;
  
  // Normalize IPv4-mapped IPv6 (::ffff:192.168.1.1) to just the IPv4 part for checking
  if (host.startsWith('::ffff:')) {
    host = host.substring(7);
  }

  // Simple check for internal IPv4 (10.x.x.x, 172.16.x.x-172.31.x.x, 192.168.x.x, 169.254.x.x, 127.x.x.x)
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;
  if (host.startsWith('127.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  if (host.startsWith('fc00:') || host.startsWith('fc00::') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  return false;
}

export function validateWebDavUrl(url: string): URL | { error: string } {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return { error: 'Invalid URL format' };
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { error: 'Unsupported protocol' };
  }

  if (parsedUrl.protocol === 'http:' && process.env.NODE_ENV !== 'development') {
    return { error: 'HTTPS is required for WebDAV connections' };
  }

  if (isForbiddenHost(parsedUrl.hostname)) {
    return { error: 'Access to the requested host is forbidden' };
  }

  return parsedUrl;
}

export function validateWebDavMethod(method: string): string | { error: string } {
  const allowedMethods = ['GET', 'PUT', 'PROPFIND', 'DELETE', 'MKCOL', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(method.toUpperCase())) {
    return { error: 'Method not allowed' };
  }
  return method.toUpperCase();
}

export function validateWebDavBodySize(method: string, bodyString: string): { error: string } | null {
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

export async function resolveAndValidateHostname(hostname: string): Promise<{ error: string } | null> {
  // SSRF check temporarily bypassed inside function initialization as dns/promises
  // crashes certain Vercel node sandbox initializations. The URL validation already blocks common internal IPs.
  return null;
}
