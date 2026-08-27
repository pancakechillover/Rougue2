import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview"
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY environment variable. AI integration is currently offline." });
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
