import { createClient } from 'redis';
import webpush from 'web-push';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configure Web Push
// SECURITY NOTE: Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your Secrets for production.
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

// Initialize Redis client lazily
let redisClient: any = null;
const getRedisClient = async () => {
  if (redisClient) return redisClient;
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
  const path = req.url?.split('?')[0];

  const guardedEndpoints = ['/vapid-public-key', '/subscribe', '/schedule', '/check'];
  if (path && guardedEndpoints.some(ep => path.endsWith(ep))) {
    if (!isVapidConfigured) {
      return res.status(503).json({ error: "Web Push is not configured on this server." });
    }
  }

  if (path?.endsWith('/vapid-public-key')) {
    return res.json({ publicKey: vapidPublicKey });
  }

  const client = await getRedisClient();
  if (!client) return res.status(500).json({ error: "Redis connection failed" });

  if (path?.endsWith('/subscribe')) {
    try {
      const { secretCode, subscription } = req.body;
      if (!secretCode) return res.status(400).json({ error: "Invalid request" });
      const key = `scholar_push_subs_${secretCode}`;
      
      if (subscription === null) {
        await client.del(key);
        // Also clear legacy format
        await client.del(`scholar_push_sub_${secretCode}`);
        return res.json({ success: true, message: "All subscriptions cleared" });
      }
      
      // Deduplicate by endpoint to prevent multi-push bugs
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
      
      // Safety net: Max 5 devices
      if (currentCount >= 5) {
         await client.del(key);
      }
      
      await client.sAdd(key, JSON.stringify(subscription));
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Subscribe failed" });
    }
  }

  if (path?.endsWith('/schedule')) {
    try {
      const { secretCode, delayMinutes, title, body, type } = req.body;
      if (!secretCode || delayMinutes === undefined) return res.status(400).json({ error: "Invalid request" });
      const targetTime = Date.now() + (delayMinutes * 60 * 1000);
      const task = { secretCode, title, body, type, targetTime };
      const taskStr = JSON.stringify(task);
      
      // Store the specific task string to allow quick removal later
      await client.set(`scholar_push_task_ref_${secretCode}`, taskStr, { EX: 3600 }); // Expire in 1h
      await client.zAdd('scholar_push_tasks', { score: targetTime, value: taskStr });
      
      return res.json({ success: true, targetTime });
    } catch (error) {
      return res.status(500).json({ error: "Schedule failed" });
    }
  }

  if (path?.endsWith('/cancel')) {
    try {
      const { secretCode } = req.body;
      if (!secretCode) return res.status(400).json({ error: "Invalid request" });
      
      // Get the last scheduled task for this user
      const taskStr = await client.get(`scholar_push_task_ref_${secretCode}`);
      if (taskStr) {
        await client.zRem('scholar_push_tasks', taskStr);
        await client.del(`scholar_push_task_ref_${secretCode}`);
      } else {
        // Fallback: If ref is missing, clear all tasks for this user (Legacy/Fallback)
        // This is O(N) but only happens if the ref was lost
        const tasks = await client.zRange('scholar_push_tasks', 0, -1);
        for (const tStr of tasks) {
          const t = JSON.parse(tStr.toString());
          if (t.secretCode === secretCode) {
            await client.zRem('scholar_push_tasks', tStr.toString());
          }
        }
      }
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Cancel failed" });
    }
  }

  if (path?.endsWith('/check')) {
    if (process.env.NODE_ENV !== "production") console.log(`[Push Check] Using VAPID Public Key: ${vapidPublicKey ? vapidPublicKey.substring(0, 10) : 'MISSING'}...`);
    try {
      const now = Date.now();
      // Get all tasks that are due
      const tasks = await client.zRangeByScore('scholar_push_tasks', 0, now);
      
      // Get total count for debug
      const totalCount = await client.zCard('scholar_push_tasks');
      // Get the very next task time
      const nextTasks = await client.zRangeWithScores('scholar_push_tasks', 0, 0);
      const nextTaskTime = nextTasks.length > 0 ? nextTasks[0].score : null;

      let processedCount = tasks.length;
      const results: any[] = [];

      const processTasks = async (tasksToProcess: any[]) => {
        for (const taskStr of tasksToProcess) {
          const task = JSON.parse(taskStr.toString());
          const subs = await client.sMembers(`scholar_push_subs_${task.secretCode}`);
          
          if (subs && subs.length > 0) {
            for (const subStr of subs) {
              const subscription = JSON.parse(subStr.toString());
              const subTTL = task.type === 'streak_reminder' ? 86400 : 300;
              try {
                await webpush.sendNotification(subscription, JSON.stringify({
                  title: task.title,
                  body: task.body,
                  data: task.data || { type: task.type }
                }), { urgency: 'high', TTL: subTTL });
                results.push({ secretCode: task.secretCode, status: 'sent', endpoint: subscription.endpoint.substring(0, 20) });
              } catch (err: any) {
                const bodyMsg = err.body ? (typeof err.body === 'string' ? err.body : JSON.stringify(err.body)) : '';
                console.error(`Push failed for sub:`, err.message);
                if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 403 || bodyMsg.includes('VapidPkHashMismatch')) {
                  await client.sRem(`scholar_push_subs_${task.secretCode}`, subStr);
                }
                results.push({ secretCode: task.secretCode, status: 'failed_sub', error: err.message });
              }
            }
          } else {
            // Legacy sub handling
            const oldSubStr = await client.get(`scholar_push_sub_${task.secretCode}`);
            if (oldSubStr) {
              const subscription = JSON.parse(oldSubStr.toString());
              const subTTL = task.type === 'streak_reminder' ? 86400 : 300;
              try {
                await webpush.sendNotification(subscription, JSON.stringify({
                  title: task.title,
                  body: task.body,
                  data: task.data || { type: task.type }
                }), { urgency: 'high', TTL: subTTL });
                results.push({ secretCode: task.secretCode, status: 'sent_legacy' });
              } catch (err: any) {
                const bodyMsg = err.body ? (typeof err.body === 'string' ? err.body : JSON.stringify(err.body)) : '';
                console.error(`Legacy push failed for sub:`, err.message);
                if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 403 || bodyMsg.includes('VapidPkHashMismatch')) {
                  await client.del(`scholar_push_sub_${task.secretCode}`);
                }
              }
            } else {
              results.push({ secretCode: task.secretCode, status: 'no_subscriptions' });
            }
          }
          await client.zRem('scholar_push_tasks', taskStr.toString());
        }
      };

      // Process immediately due tasks
      if (tasks.length > 0) {
        await processTasks(tasks);
      }

      // Vercel Wake-Lock Engine: If there's a task due within the next 55 seconds, sleep and execute it before answering the ping
      if (nextTaskTime && (nextTaskTime - now > 0) && (nextTaskTime - now <= 55000)) {
        const delayMs = nextTaskTime - Date.now();
        if (delayMs > 0) {
           if (process.env.NODE_ENV !== "production") console.log(`[Wake-Lock] Task due in ${Math.round(delayMs/1000)}s. Suspending ping to deliver precisely on time.`);
           await new Promise(resolve => setTimeout(resolve, delayMs));
           const delayedNow = Date.now();
           const delayedTasks = await client.zRangeByScore('scholar_push_tasks', 0, delayedNow);
           if (delayedTasks.length > 0) {
             processedCount += delayedTasks.length;
             await processTasks(delayedTasks);
           }
        }
      }

      return res.json({ 
        success: true, 
        processed: processedCount, 
        debug: {
          serverTime: now,
          totalPendingInQueue: totalCount,
          nextTaskDueAt: nextTaskTime,
          timeUntilNextMs: nextTaskTime ? nextTaskTime - now : null
        },
        results 
      });
    } catch (error) {
      console.error("Check error:", error);
      return res.status(500).json({ error: "Check failed" });
    }
  }

  return res.status(404).json({ error: "Not found" });
}
