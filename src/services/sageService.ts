import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { AppState } from "../types";

export interface SageAdviceRequest {
  state: AppState;
  prompt?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  signal?: AbortSignal;
}

export interface SageAdviceResponse {
  content: string;
  reasoningContent?: string;
}

export async function getSageAdvice({ state, prompt, history = [], signal }: SageAdviceRequest): Promise<SageAdviceResponse> {
  let provider: string = state.sageApiProvider || 'google';
  let apiKey = state.sageApiKey || "";
  let baseUrl = state.sageApiUrl;
  let model = state.sageModelName || (provider === 'google' ? 'gemini-3-flash-preview' : 'gpt-4o-mini');

  if (state.activeSageModelId && state.sageModels) {
    const activeModel = state.sageModels.find(m => m.id === state.activeSageModelId);
    if (activeModel) {
      provider = activeModel.provider;
      apiKey = activeModel.apiKey || "";
      baseUrl = activeModel.apiUrl;
      model = activeModel.modelName;
    }
  }

  if (!apiKey && provider !== 'google') {
    throw new Error("Missing Sage API Key. Please configure it in Advice Settings.");
  }

  // Gather user context for the prompt
  const sortedLogs = Object.entries(state.dailyLogs || {})
    .sort((a, b) => b[0].localeCompare(a[0]));

  const recentLogs = sortedLogs
    .slice(0, 30) // Up to 30 days for monthly analysis
    .map(([date, log]) => ({
      date,
      mood: log.mood,
      efficiency: log.rating,
      reflection: log.reflection
    }));

  const questsData = (state.quests || []).map(q => ({
    title: q.title,
    progress: `${q.progress}/${q.target}`,
    reward: q.reward?.amount,
    rarity: q.completed ? 'COMPLETED' : 'ACTIVE'
  }));

  const timerConfig = {
    xpYield: state.devBaseXP || 50,
    goldYield: state.devBaseCoins || 10,
    xpMode: state.devXpMode,
    coinMode: state.devCoinMode
  };

  const personalityType = state.sagePersonality || 'sage';
  const customPrompts = state.sagePersonalityPrompts || {};
  
  const defaultSagePrompt = `You are "The Sage", an ancient and wise mentor who lives within "The Scholar's Sanctum". 
Analyze the user's progress and provide deeply personal, mystical, yet strictly structured advice. 
Use metaphors related to "Sanctums", "Dungeons", and "Ancient Artifacts".`;

  const defaultFriendPrompt = `You are a supportive, down-to-earth study buddy and friend. 
Analyze the user's progress and provide practical, encouraging advice without complex game-like metaphors or mystical language. 
Speak naturally and focus on their real-life well-being and study habits.`;

  const defaultMasterPrompt = `You are "The Master", a strict, highly analytical, and strategic game master and productivity coach. 
You strictly plan tasks, rigorously manage time and efficiency, and wisely adjust the balance of the game (rewards, xp) to challenge the user appropriately. 
You expect nothing but the best, giving precise, actionable, and data-driven commands.`;

  let personalityPrompt = defaultSagePrompt;
  if (personalityType === 'friend') {
    personalityPrompt = defaultFriendPrompt;
  } else if (personalityType === 'master') {
    personalityPrompt = defaultMasterPrompt;
  }
  
  if (personalityType === 'custom' && customPrompts['custom']) {
    personalityPrompt = customPrompts['custom'];
  } else if (customPrompts[personalityType]) {
    personalityPrompt = customPrompts[personalityType];
  }

  const systemPrompt = `${personalityPrompt}

Current User Status:
- Level: ${state.level}
- Gold: ${state.coins}
- XP: ${state.xp}
- Total Sessions: ${(state.history || []).length}
- Current Streak: ${state.streak}
- Balance Settings (Rewards): ${JSON.stringify(timerConfig)}
- Active Quests: ${JSON.stringify(questsData)}
- Recent Logs (Last 30 Days): ${JSON.stringify(recentLogs)}

### AUTOMATION & TASK CREATION:
If the user explicitly asks you to create a plan, expedition, or set of tasks (e.g., "design an IELTS review expedition with tiers"):
Instead of just responding with text, you MUST output a structured JSON block representing the proposed Expedition and Tiers. 
IMPORTANT: The user calls the requirement unit "Total Rooms" or "Sessions". You MUST specify the exact number of required sessions in the \`sessions\` property for each tier!
Format it EXACTLY as a markdown JSON block with the tag "json expedition_plan". 
Example:
\`\`\`json expedition_plan
{
  "title": "IELTS 1 Month Challenge",
  "description": "Intensive IELTS listening, reading, writing, and speaking review",
  "reward": { "amount": 500, "xp": 2000, "shards": 0 },
  "tiers": [
    { "name": "Week 1: Vocabulary & Foundations", "requirement": "Complete 14 sessions", "sessions": 14, "reward": {"amount": 100, "xp": 400, "shards": 0} },
    { "name": "Week 2: Reading & Listening Practice", "requirement": "Complete 14 sessions", "sessions": 14, "reward": {"amount": 100, "xp": 400, "shards": 0} }
  ]
}
\`\`\`

If the user explicitly asks you to adjust balance settings (exp, coins, drops):
Format it EXACTLY as a markdown JSON block with the tag "json balance_settings".
Example:
\`\`\`json balance_settings
{
  "devBaseXP": 50,
  "devBaseCoins": 15
}
\`\`\`

### RESPONSE STRUCTURE GUIDELINES (if not generating an expedition):
1. **The Revelation**: A poetic opening sentence (or warm greeting) summarizing their current state.
2. **Observations**: A bulleted list of 2-3 specific insights based on their data (efficiency, mood, or trends).
3. **The Path Forward**: 2 actionable steps for their next study session.
4. **Encouragement**: A short closing blessing or friendly sign-off.

Keep your tone consistent with the chosen personality. Use Bold text for emphasis.`;

  try {
    if (provider === 'google') {
      // Convert history to Gemini format
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "I acknowledge my role as the Sage. I am ready to guide the scholar." }] },
        ...history.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      ];

      // Add current prompt
      contents.push({ role: 'user', parts: [{ text: prompt || "Sage, I seek your guidance. What path should I take tomorrow?" }] });

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const response = await ai.models.generateContent({
          model,
          contents,
          config: signal ? {
            // SDK wrap for AbortSignal would be here
          } : undefined
        });
        return { content: response.text || "The Sage remains silent..." };
      } else {
        const response = await fetch('/api/sage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, contents }),
          signal
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${response.status}`);
        }
        const data = await response.json();
        return { content: data.text || "The Sage remains silent..." };
      }
    } else {
      const openai = new OpenAI({
        apiKey: apiKey!,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true 
      });

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content }))
      ];

      messages.push({ role: "user", content: prompt || "Sage, I seek your guidance. What path should I take tomorrow?" });

      const response = await openai.chat.completions.create({
        model,
        messages,
      }, { signal });
      
      const choice = response.choices[0].message;
      let content = choice.content || "The Sage remains silent...";
      const anyChoice = choice as any;
      
      let reasoningContent: string | undefined = undefined;
      // Support for DeepSeek and other models that return reasoning_content
      if (anyChoice.reasoning_content) {
        const pondered = anyChoice.reasoning_content.trim();
        if (pondered) {
          reasoningContent = pondered;
        }
      }

      return { content, reasoningContent };
    }
  } catch (error: any) {
    console.error("Sage AI Error:", error);
    throw new Error(`The Sage's voice was clouded: ${error.message}`);
  }
}
