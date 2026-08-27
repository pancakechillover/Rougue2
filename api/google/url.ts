import { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidOrigin } from '../oauthUtils';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth configuration is missing on the server.' });
  }

  let origin = req.query.origin as string;
  const reqHost = typeof req.headers['x-forwarded-host'] === 'string' ? req.headers['x-forwarded-host'] : req.headers.host || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  
  if (!origin) {
    origin = `${protocol}://${reqHost}`;
  } else if (!isValidOrigin(origin, reqHost)) {
    return res.status(400).json({ error: 'Invalid origin parameter provided' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ origin, nonce })).toString('base64');

  const params = new URLSearchParams({
    client_id: process.env.OAUTH_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.appdata', // Google Drive appdata only
    access_type: 'offline', // For refresh token
    prompt: 'consent',
    state: state
  });
  
  // Set short-lived secure cookie
  res.setHeader('Set-Cookie', `oauth_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
  res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}
