import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import { createClient } from 'redis';
import { verifyBearerToken } from './_shared/auth.js';

const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview"
];

// This route spends a server-side Gemini key, so it may only answer a signed-in
// caller. Lazy client, same shape as api/push.ts: a top-level connect would
// slow every cold start and throw on a bad REDIS_URL.
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
      console.error('Redis initialization error:', err);
      return null;
    }
  }
  return null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY environment variable. AI integration is currently offline." });
    }

    const client = await getRedisClient();
    if (!client) {
      return res.status(500).json({ error: "Sage is unavailable right now. Please try again later." });
    }

    const verifiedSession = await verifyBearerToken(client, req.headers.authorization);
    if (!verifiedSession) {
      return res.status(401).json({ error: 'Sign in to your Scholar Passport to consult the Sage.' });
    }

    const { model, contents } = req.body;
    
    if (!model || !contents) {
      return res.status(400).json({ error: "Missing model or contents payload" });
    }

    // Limit array size and total string length to prevent abuse
    if (!Array.isArray(contents) || contents.length > 50) {
      return res.status(400).json({ error: "Payload contents exceed maximum length" });
    }
    const totalChars = JSON.stringify(contents).length;
    if (totalChars > 32000) {
      return res.status(400).json({ error: "Prompt payload exceeds maximum character length" });
    }

    const safeModel = typeof model === 'string' && ALLOWED_MODELS.includes(model) 
      ? model 
      : "gemini-2.5-flash";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: safeModel,
      contents
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    // Keep stack trace and internal error hidden from the endpoint response
    console.error("Sage Proxy error:", error.status, error.message);
    
    // Check if error is related to quota or auth
    if (error.status === 429) {
       return res.status(429).json({ error: "The AI service is currently overwhelmed. Please try again later." });
    }

    return res.status(500).json({ error: "Failed to process AI request due to an internal server error." });
  }
}
