export function isValidOrigin(origin: string, reqHost: string): boolean {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const originUrl = new URL(origin);
    const host = originUrl.host;
    if (host === reqHost) return true;
    if (host.startsWith('localhost:') || host === 'localhost') return true;
    if (process.env.ALLOWED_OAUTH_ORIGINS) {
      const allowedOrigins = process.env.ALLOWED_OAUTH_ORIGINS.split(',').map(o => o.trim());
      if (allowedOrigins.includes(origin)) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}
