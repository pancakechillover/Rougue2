import { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidOrigin } from '../oauthUtils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
    return res.status(500).send('<html><body><p>Server configuration error.</p></body></html>');
  }

  const code = req.query.code as string;
  const stateParam = req.query.state as string;

  // Clear nonce cookie unconditionally to prevent replay or multi-use
  res.setHeader('Set-Cookie', `oauth_nonce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);

  let origin = '';
  let nonce = '';
  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf-8'));
      origin = decoded.origin;
      nonce = decoded.nonce;
    }
  } catch (e) {
    console.error("Failed to decode state:", e);
  }

  // Validate nonce
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/oauth_nonce=([^;]+)/);
  const cookieNonce = match ? match[1] : null;

  if (!nonce || !cookieNonce || nonce !== cookieNonce) {
    return res.status(400).send('<html><body><p>Authentication failed: Invalid or expired session.</p></body></html>');
  }

  const reqHost = typeof req.headers['x-forwarded-host'] === 'string' ? req.headers['x-forwarded-host'] : req.headers.host || '';

  if (!origin) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    origin = `${protocol}://${reqHost}`;
  } else if (!isValidOrigin(origin, reqHost)) {
    return res.status(400).send('<html><body><p>Authentication failed: Invalid origin.</p></body></html>');
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!code) {
    return res.status(400).send('<html><body><p>Authentication failed: No user authorization code provided.</p></body></html>');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.OAUTH_CLIENT_ID || '',
        client_secret: process.env.OAUTH_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString()
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange token with Google');
    }

    res.status(200).send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', tokens: JSON.parse('${JSON.stringify(tokens)}') }, '${origin}');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OAuth error:", error);
    res.status(500).send(`<html><body><p>Authentication failed due to an internal server error.</p></body></html>`);
  }
}
