import express from "express";
import path from "path";
import { createClient } from "redis";
import dotenv from "dotenv";
import webpush from "web-push";
import crypto from "crypto";
import { isValidOrigin } from "./api/oauthUtils";

dotenv.config();

// Configure Web Push
const cleanKey = (key?: string) => key ? key.replace(/[^a-zA-Z0-9_-]/g, '').trim() : '';

const vapidPublicKey = cleanKey(process.env.VAPID_PUBLIC_KEY);
const vapidPrivateKey = cleanKey(process.env.VAPID_PRIVATE_KEY);
const vapidEmailInput = process.env.VAPID_EMAIL || "iz.karakarakarakan@gmail.com";
const vapidSubject = vapidEmailInput.startsWith('http') || vapidEmailInput.startsWith('mailto:')
  ? vapidEmailInput
  : `mailto:${cleanKey(vapidEmailInput)}`;

const isVapidConfigured = Boolean(vapidPublicKey && vapidPrivateKey);

if (!isVapidConfigured) {
  console.error("CRITICAL ERROR: VAPID_PUBLIC_KEY and/or VAPID_PRIVATE_KEY are missing. Web Push will not work. Please set them in your environment variables.");
} else {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err: any) {
    console.error("Failed to set VAPID details with primary keys:", err.message);
  }
}

const app = express();
const PORT = 3000;

// Initialize Redis client lazily
let redisClient: any = null;
const getRedisClient = async () => {
  if (redisClient) return redisClient;
  if (process.env.REDIS_URL) {
    try {
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err: any) => console.error('Redis Client Error', err));
      await redisClient.connect();
      console.log("Redis client connected");
      return redisClient;
    } catch (err) {
      console.error("Redis initialization error:", err);
      return null;
    }
  }
  return null;
};

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Stats API Route
app.get("/api/stats", async (req, res) => {
  try {
    const client = await getRedisClient();
    if (!client) return res.json({ users: 0, maxUsers: 300, teams: 0, maxTeams: 50 });

    const fifteenDaysAgoMs = Date.now() - 15 * 24 * 3600 * 1000;
    
    // Prune Expired Users
    const expiredUsers = await client.zRangeByScore('scholar_active_users', 0, fifteenDaysAgoMs);
    if (expiredUsers.length > 0) {
      for (const user of expiredUsers) {
        await client.del(`scholar_sync_${user}`);
        await client.del(`scholar_push_subs_${user}`);
        await client.del(`scholar_push_sub_${user}`); // legacy
      }
      await client.zRemRangeByScore('scholar_active_users', 0, fifteenDaysAgoMs);
      if (process.env.NODE_ENV !== "production") console.log(`Cleaned up ${expiredUsers.length} inactive users.`);
    }

    // Prune Expired Teams
    const expiredTeams = await client.zRangeByScore('scholar_active_teams', 0, fifteenDaysAgoMs);
    if (expiredTeams.length > 0) {
      for (const team of expiredTeams) {
        await client.del(`scholar_team:${team}`);
        await client.del(`scholar_team:${team}:members`);
        await client.del(`scholar_team:${team}:messages`);
        await client.del(`scholar_team:${team}:events`);
        await client.del(`scholar_team:${team}:proposal`);
        await client.del(`scholar_team:${team}:applicants`);
      }
      await client.zRemRangeByScore('scholar_active_teams', 0, fifteenDaysAgoMs);
      if (process.env.NODE_ENV !== "production") console.log(`Cleaned up ${expiredTeams.length} inactive guilds.`);
    }

    const userCount = await client.zCard('scholar_active_users') || 0;
    const teamCount = await client.zCard('scholar_active_teams') || 0;

    res.json({ users: userCount, maxUsers: 300, teams: teamCount, maxTeams: 50 });
  } catch (error: any) {
    console.error("Stats API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sync API Handler
const syncHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { secretCode, localData } = req.body;
    if (!secretCode) return res.status(400).json({ error: "Secret code is required" });
    
    const client = await getRedisClient();
    if (!client) return res.status(500).json({ error: "Cloud sync is not configured." });

    const key = `scholar_sync_${secretCode}`;
    
    // Prune expired BEFORE check
    const fifteenDaysAgoMs = Date.now() - 15 * 24 * 3600 * 1000;
    await client.zRemRangeByScore('scholar_active_users', 0, fifteenDaysAgoMs);

    // Track user active
    await client.zAdd('scholar_active_users', { score: Date.now(), value: secretCode });

    // Enforce 300 users limit
    const userCount = await client.zCard('scholar_active_users');
    if (userCount > 300) {
      const rank = await client.zRank('scholar_active_users', secretCode);
      if (rank >= 300) {
        await client.zRem('scholar_active_users', secretCode);
        return res.status(403).json({ error: "Capacity Full: Multi-device sync is capped at 300 registered users in the free tier quota. Try again later when inactive slots clear up." });
      }
    }

    const cloudDataRaw = await client.get(key);
    const cloudData = cloudDataRaw ? JSON.parse(cloudDataRaw.toString()) : null;

    if (!localData) return res.json({ cloudData });

    if (cloudData && cloudData.lastUpdated) {
      const cloudTime = new Date(cloudData.lastUpdated).getTime();
      const localTime = new Date(localData.lastUpdated || 0).getTime();
      
      const cloudDevice = cloudData.savedByDeviceCode;
      const localDevice = localData.savedByDeviceCode;
      const deviceMismatch = cloudDevice && localDevice && cloudDevice !== localDevice;

      // Ensure that if device codes don't match, it is treated as a conflict regardless of timestamp!
      if ((deviceMismatch || cloudTime > localTime) && !req.body.forceOverwrite) {
        return res.status(409).json({ conflict: true, cloudData });
      }
    }

    if (!localData.lastUpdated) localData.lastUpdated = new Date().toISOString();
    
    // Save backup history (up to 3 recent copies)
    if (cloudData && cloudData.lastUpdated && cloudData.lastUpdated !== localData.lastUpdated) {
        const historyKey = `${key}_history`;
        const historyRaw = await client.get(historyKey);
        let historyList = historyRaw ? JSON.parse(historyRaw.toString()) : [];
        // Insert at beginning
        historyList.unshift(cloudData);
        // Keep only last 3
        historyList = historyList.slice(0, 3);
        await client.set(historyKey, JSON.stringify(historyList));
    }

    await client.set(key, JSON.stringify(localData));
    res.json({ success: true, cloudData: localData });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Sync failed" });
  }
};

const deleteHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { secretCode } = req.body;
    if (!secretCode) return res.status(400).json({ error: "Secret code is required" });
    
    const client = await getRedisClient();
    if (!client) return res.status(500).json({ error: "Cloud sync is not configured." });
    
    const key = `scholar_sync_${secretCode}`;
    await client.del(key);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Delete failed" });
  }
};

const historyHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { secretCode } = req.body;
    if (!secretCode) return res.status(400).json({ error: "Secret code is required" });
    
    const client = await getRedisClient();
    if (!client) return res.status(500).json({ error: "Cloud sync is not configured." });

    const historyKey = `scholar_sync_${secretCode}_history`;
    const historyRaw = await client.get(historyKey);
    const historyList = historyRaw ? JSON.parse(historyRaw.toString()) : [];
    
    res.json({ success: true, history: historyList });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "History fetch failed" });
  }
};

const verifyPasswordHandler = (req: express.Request, res: express.Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  // The requested hardcoded password
  if (password === "8424") {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: "Invalid password" });
  }
};

app.post("/api/verify-password", verifyPasswordHandler);

app.post("/api/sync", syncHandler);
app.post("/api/sync/", syncHandler);
app.post("/api/sync/history", historyHandler);
app.delete("/api/sync", deleteHandler);
app.delete("/api/sync/", deleteHandler);

// Push Notification Routes
app.use("/api/push", (req, res, next) => {
  const path = req.path;
  const guardedEndpoints = ['/vapid-public-key', '/subscribe', '/schedule', '/check'];
  if (guardedEndpoints.some(ep => path.endsWith(ep))) {
    if (!isVapidConfigured) {
      return res.status(503).json({ error: "Web Push is not configured on this server." });
    }
  }
  next();
});

app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { secretCode, subscription } = req.body;
    const client = await getRedisClient();
    if (!secretCode || !client) return res.status(400).json({ error: "Invalid request" });
    
    // Key for sets of subscriptions for this user
    const key = `scholar_push_subs_${secretCode}`;
    
    if (subscription === null) {
      await client.del(key);
      // Also clear legacy format
      await client.del(`scholar_push_sub_${secretCode}`);
      return res.json({ success: true, message: "All subscriptions cleared" });
    }
    
    // Deduplicate by endpoint to prevent multi-push bugs (browser rotating keys/expiration)
    const existingSubsStr = await client.sMembers(key);
    let currentCount = 0;
    if (existingSubsStr && existingSubsStr.length > 0) {
      for (const subStr of existingSubsStr) {
        try {
          const parsed = JSON.parse(subStr);
          if (parsed.endpoint === subscription.endpoint) {
            await client.sRem(key, subStr);
          } else {
            currentCount++;
          }
        } catch (e) {
          await client.sRem(key, subStr);
        }
      }
    }
    
    // Safety net: Max 5 devices to prevent ghost push buildup from uninstalled PWAs
    if (currentCount >= 5) {
       await client.del(key);
    }
    
    // Use multi-device set storage (sync with api/push.ts)
    await client.sAdd(key, JSON.stringify(subscription));
    res.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Subscribe failed" });
  }
});

app.post("/api/push/schedule", async (req, res) => {
  try {
    const { secretCode, delayMinutes, title, body, type } = req.body;
    const client = await getRedisClient();
    if (!secretCode || delayMinutes === undefined || !client) return res.status(400).json({ error: "Invalid request" });
    const targetTime = Date.now() + (delayMinutes * 60 * 1000);
    const task = { secretCode, title, body, type, targetTime };
    const taskStr = JSON.stringify(task);
    
    // Store quick ref for cancellation and clean up previous
    const oldTaskStr = await client.get(`scholar_push_task_ref_${secretCode}`);
    if (oldTaskStr) {
      await client.zRem('scholar_push_tasks', oldTaskStr);
    }
    
    await client.set(`scholar_push_task_ref_${secretCode}`, taskStr, { EX: 3600 });
    await client.zAdd('scholar_push_tasks', { score: targetTime, value: taskStr });
    
    res.json({ success: true, targetTime });
  } catch (error) {
    console.error("Schedule error:", error);
    res.status(500).json({ error: "Schedule failed" });
  }
});

app.post("/api/push/cancel", async (req, res) => {
  try {
    const { secretCode } = req.body;
    const client = await getRedisClient();
    if (!secretCode || !client) return res.status(400).json({ error: "Invalid request" });
    
    // 1. Try quick reference cancel
    const taskStr = await client.get(`scholar_push_task_ref_${secretCode}`);
    if (taskStr) {
      await client.zRem('scholar_push_tasks', taskStr);
      await client.del(`scholar_push_task_ref_${secretCode}`);
    } else {
      // 2. Fallback scan (Legacy/Emergency)
      const tasks = await client.zRange('scholar_push_tasks', 0, -1);
      for (const tStr of tasks) {
        const task = JSON.parse(tStr.toString());
        if (task.secretCode === secretCode) {
          await client.zRem('scholar_push_tasks', tStr.toString());
        }
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Cancel error:", error);
    res.status(500).json({ error: "Cancel failed" });
  }
});

// Common logic for processing push queue
const processPushQueue = async (client: any) => {
  if (!isVapidConfigured) return 0;
  
  const now = Date.now();
  const tasks = await client.zRangeByScore('scholar_push_tasks', 0, now);
  let processed = 0;

  for (const taskStr of tasks) {
    const task = JSON.parse(taskStr.toString());
    
    // Try modern multi-device Key
    const subs = await client.sMembers(`scholar_push_subs_${task.secretCode}`);
    
    if (subs && subs.length > 0) {
      for (const subStr of subs) {
        const subscription = JSON.parse(subStr.toString());
        const subTTL = task.type === 'streak_reminder' ? 86400 : 300;
        try {
          await webpush.sendNotification(subscription, JSON.stringify({
            title: task.title,
            body: task.body,
            data: { type: task.type }
          }), { urgency: 'high', TTL: subTTL });
        } catch (err: any) {
          const bodyMsg = err.body ? (typeof err.body === 'string' ? err.body : JSON.stringify(err.body)) : '';
          
          if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 403 || bodyMsg.includes('VapidPkHashMismatch')) {
            // Expected cleanup error, silently remove invalid subscription
            await client.sRem(`scholar_push_subs_${task.secretCode}`, subStr);
          } else {
            console.error(`Push failed for user:`, err.message);
          }
        }
      }
    } else {
      // Fallback for legacy single-sub key
      const subStr = await client.get(`scholar_push_sub_${task.secretCode}`);
      if (subStr) {
        const subscription = JSON.parse(subStr.toString());
        const subTTL = task.type === 'streak_reminder' ? 86400 : 300;
        try {
          await webpush.sendNotification(subscription, JSON.stringify({
            title: task.title,
            body: task.body,
            data: { type: task.type }
          }), { urgency: 'high', TTL: subTTL });
        } catch (err: any) {
          const bodyMsg = err.body ? (typeof err.body === 'string' ? err.body : JSON.stringify(err.body)) : '';
          
          if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 403 || bodyMsg.includes('VapidPkHashMismatch')) {
            // Expected cleanup error, silently remove invalid subscription
            await client.del(`scholar_push_sub_${task.secretCode}`);
          } else {
            console.error(`Legacy push failed for user:`, err.message);
          }
        }
      }
    }
    await client.zRem('scholar_push_tasks', taskStr.toString());
    processed++;
  }
  return processed;
};

app.get("/api/push/check", async (req, res) => {
  try {
    const client = await getRedisClient();
    if (!client) return res.status(500).json({ error: "Redis not configured" });

    // 1. Process anything currently due immediately
    let processed = await processPushQueue(client);

    // 2. Look ahead 58 seconds
    const now = Date.now();
    const lookAhead = now + 58000;
    const futureTasks = await client.zRangeByScore('scholar_push_tasks', now + 1, lookAhead);

    if (futureTasks && futureTasks.length > 0) {
      let maxTargetTime = 0;
      
      // Schedule each future task to trigger exactly when needed
      for (const tStr of futureTasks) {
        const t = JSON.parse(tStr.toString());
        if (t.targetTime > maxTargetTime) maxTargetTime = t.targetTime;
        
        const timeUntilStart = t.targetTime - Date.now();
        if (timeUntilStart > 0) {
           setTimeout(() => {
             processPushQueue(client).catch(e => console.error("Future task error:", e));
           }, timeUntilStart);
        }
      }
      
      const holdTimeMs = maxTargetTime - Date.now();
      if (holdTimeMs > 0) {
        if (process.env.NODE_ENV !== "production") console.log(`[Push Check] Found future tasks. Holding CPU awake for ${holdTimeMs}ms...`);
        // Hold the HTTP response open so the Serverless CPU stays active for the timers
        await new Promise(resolve => setTimeout(resolve, holdTimeMs + 500)); 
      }
    }

    res.json({ success: true, processed, cpu_awake_applied: futureTasks?.length > 0 });
  } catch (error) {
    console.error("Manual check error:", error);
    res.status(500).json({ error: "Check failed" });
  }
});

// Polling loop for scheduled tasks (Only in non-Vercel environments)
const startScheduler = async () => {
  const client = await getRedisClient();
  if (client && !process.env.VERCEL) {
    setInterval(async () => {
      try {
        await processPushQueue(client);
      } catch (error) {
        console.error("Scheduler error:", error);
      }
    }, 10000);
  }
};

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Google OAuth Routes
app.get('/api/auth/google/url', (req, res) => {
  if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth configuration is missing on the server.' });
  }

  let origin = req.query.origin as string;
  const reqHost = typeof req.headers['x-forwarded-host'] === 'string' ? req.headers['x-forwarded-host'] : req.headers.host || '';

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
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
  
  res.setHeader('Set-Cookie', `oauth_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

// WebDAV Proxy for local development
import teamsHandler from './api/teams';
import sageHandler from './api/sage';

app.all('/api/teams', async (req, res) => {
  // Mock Vercel Request for Express
  await teamsHandler(req as any, res as any);
});

app.all('/api/sage', async (req, res) => {
  // Mock Vercel Request for Express
  await sageHandler(req as any, res as any);
});

import webdavHandler from './api/webdav/proxy';

app.post('/api/webdav/proxy', async (req, res) => {
  // Mock Vercel Request for Express
  await webdavHandler(req as any, res as any);
});

app.get(['/api/auth/google/callback', '/api/auth/google/callback/'], async (req, res) => {
  if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
    return res.status(500).send('<html><body><p>Server configuration error.</p></body></html>');
  }

  const { code, state: stateParam } = req.query;
  
  res.setHeader('Set-Cookie', `oauth_nonce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);

  let origin = '';
  let nonce = '';
  try {
    if (stateParam && typeof stateParam === 'string') {
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
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
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
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString()
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange token with Google');
    }

    res.send(`
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
});

async function startServer() {
  // Vite middleware
  try {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }
  } catch (err) {
    console.error("Vite/Static middleware error:", err);
  }

  // Start scheduler for non-Vercel environments
  startScheduler();

  // Only listen if not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch(err => console.error("Fatal startup error:", err));
}

export default app;
