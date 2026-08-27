import { createClient } from 'redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = req.url?.split('?')[0];

    const client = await getRedisClient();
    if (!client) {
      return res.status(500).json({ error: "Cloud sync is not configured (Redis connection failed)." });
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

    // Check if history is requested
    if (path?.endsWith('/history')) {
      const { secretCode } = body || {};
      if (!secretCode) return res.status(400).json({ error: "Secret code is required" });
      
      const historyKey = `scholar_sync_${secretCode}_history`;
      const historyRaw = await client.get(historyKey);
      const historyList = historyRaw ? JSON.parse(historyRaw.toString()) : [];
      
      return res.status(200).json({ success: true, history: historyList });
    }

    if (req.method === 'POST') {
      const { secretCode, localData, forceOverwrite } = body || {};
      if (!secretCode) return res.status(400).json({ error: "Secret code is required" });

      const key = `scholar_sync_${secretCode}`;

      // Capacity limits / Prune expired BEFORE check
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
      return res.status(200).json({ success: true, cloudData: localData });
    } 
    
    if (req.method === 'DELETE') {
      const { secretCode } = body || {};
      if (!secretCode) return res.status(400).json({ error: "Secret code is required" });
      
      const key = `scholar_sync_${secretCode}`;
      await client.del(key);
      await client.del(`${key}_history`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
