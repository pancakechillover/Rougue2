import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, RefreshCw, Settings as SettingsIcon, Plus, Edit2, Trash2, Library, Check, Copy, Quote, MessageSquare, PanelLeftClose, PanelLeftOpen, Download, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AppState, SageModelConfig, SagePromptConfig } from '../../types';
import { cn } from '../../lib/utils';
import { DEFAULT_SAGE_PROMPTS } from '../../constants';
import { getSageAdvice } from '../../services/sageService';
import { ConfirmModal } from '../ConfirmModal';

interface SageSettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const SageSettingsSection: React.FC<SageSettingsProps> = ({ state, setState }) => {
  return (
    <div id="setting-sage" className="space-y-8">
      <div>
        <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">Emerald Sage</h3>
        <p className="text-sm text-slate-400">An AI mentor fueled by your reflections and journey data.</p>
      </div>

      <SageInterface state={state} setState={setState} />
    </div>
  );
};

const SageConfigManager: React.FC<{ state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');
  const [activeTab, setActiveTab] = useState<'models' | 'prompts' | 'personality'>('models');
  
  const models = state.sageModels || [];
  const prompts = state.sagePrompts || [];
  const personalityType = state.sagePersonality || 'sage';
  const personalityPrompts = state.sagePersonalityPrompts || {};

  const [editingModel, setEditingModel] = useState<SageModelConfig | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<SagePromptConfig | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; type?: 'danger'|'warning'|'info'; isAlert?: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const customConfirm = (message: string, onConfirm: () => void, title = 'Confirm', type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: false, type, onConfirm });
  };

  const defaultSagePrompt = `You are "The Sage", an ancient and wise mentor who lives within "The Scholar's Sanctum". \nAnalyze the user's progress and provide deeply personal, mystical, yet strictly structured advice. \nUse metaphors related to "Sanctums", "Dungeons", and "Ancient Artifacts".`;

  const defaultFriendPrompt = `You are a supportive, down-to-earth study buddy and friend. \nAnalyze the user's progress and provide practical, encouraging advice without complex game-like metaphors or mystical language. \nSpeak naturally and focus on their real-life well-being and study habits.`;

  const defaultMasterPrompt = `You are "The Master", a strict, highly analytical, and strategic game master and productivity coach. \nYou strictly plan tasks, rigorously manage time and efficiency, and wisely adjust the balance of the game (rewards, xp) to challenge the user appropriately. \nYou expect nothing but the best, giving precise, actionable, and data-driven commands.`;

  const saveModel = () => {
    if (!editingModel) return;
    let newModels = [...models];
    if (editingModel.id === 'new') {
      newModels.push({ ...editingModel, id: Date.now().toString() });
    } else {
      newModels = newModels.map(m => m.id === editingModel.id ? editingModel : m);
    }
    setState(prev => ({ ...prev, sageModels: newModels, activeSageModelId: prev.activeSageModelId || newModels[0]?.id }));
    setEditingModel(null);
  };

  const savePrompt = () => {
    if (!editingPrompt) return;
    let newPrompts = [...prompts];
    if (editingPrompt.id === 'new') {
      newPrompts.push({ ...editingPrompt, id: Date.now().toString() });
    } else {
      newPrompts = newPrompts.map(p => p.id === editingPrompt.id ? editingPrompt : p);
    }
    setState(prev => ({ ...prev, sagePrompts: newPrompts }));
    setEditingPrompt(null);
  };

  const updatePersonalityPrompt = (type: string, value: string) => {
    setState(prev => ({
      ...prev,
      sagePersonalityPrompts: {
        ...(prev.sagePersonalityPrompts || {}),
        [type]: value
      }
    }));
  };

  return (
    <div className={cn("border rounded-3xl overflow-hidden", "bg-slate-900/40 border-slate-800")}>
      <div className={cn("flex border-b", "border-slate-800")}>
        <button onClick={() => setActiveTab('models')} className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors", 
          activeTab === 'models' ? ("bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500") : ("text-slate-500 hover:text-slate-300"))}>Models</button>
        <button onClick={() => setActiveTab('personality')} className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors", 
          activeTab === 'personality' ? ("bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500") : ("text-slate-500 hover:text-slate-300"))}>Identity</button>
        <button onClick={() => setActiveTab('prompts')} className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors", 
          activeTab === 'prompts' ? ("bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500") : ("text-slate-500 hover:text-slate-300"))}>Prompts</button>
      </div>

      <div className="p-6">
        {activeTab === 'personality' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI Personality</label>
              <div className="grid grid-cols-4 gap-2">
                {(['sage', 'friend', 'master', 'custom'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setState(prev => ({ ...prev, sagePersonality: type }))}
                    className={cn(
                      "py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      personalityType === type 
                        ? ("bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]")
                        : ("bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700")
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    {personalityType === 'custom' ? 'Custom Character Prompt' : `${personalityType.toUpperCase()} Prompt (Customizable)`}
                  </label>
                  {personalityPrompts[personalityType] && (
                    <button 
                      onClick={() => updatePersonalityPrompt(personalityType, '')}
                      className="text-[9px] font-bold text-rose-400 uppercase hover:text-rose-300 transition-colors"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
                <textarea
                  value={personalityPrompts[personalityType] || (personalityType === 'friend' ? defaultFriendPrompt : (personalityType === 'master' ? defaultMasterPrompt : (personalityType === 'sage' ? defaultSagePrompt : '')))}
                  onChange={(e) => updatePersonalityPrompt(personalityType, e.target.value)}
                  placeholder={personalityType === 'custom' ? "Enter your custom AI personality instructions..." : ""}
                  className={cn("w-full h-40 border rounded-2xl px-4 py-3 text-xs font-medium focus:border-indigo-500 outline-none transition-all resize-none custom-scrollbar leading-relaxed",
                    "bg-slate-950 border-slate-800 text-slate-300"
                  )}
                />
                <p className="text-[9px] text-slate-500 italic px-1 pr-1">
                  This prompt defines how the AI behaves. You can modify the defaults or create a completely new one under "Custom".
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-4">
            {editingModel ? (
              <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <input type="text" placeholder="Profile Name (e.g. GPT-4o)" value={editingModel.name} onChange={(e) => setEditingModel({...editingModel, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm" />
                <select value={editingModel.provider} onChange={(e) => {
                  const newProvider = e.target.value as any;
                  let newApiUrl = editingModel.apiUrl;
                  let newModelName = editingModel.modelName;
                  
                  if (newProvider === 'deepseek' && !newApiUrl?.includes('deepseek')) {
                    newApiUrl = 'https://api.deepseek.com/v1';
                    if (!newModelName) newModelName = 'deepseek-chat';
                  } else if (newProvider === 'doubao' && !newApiUrl?.includes('volces')) {
                    newApiUrl = 'https://ark.cn-beijing.volces.com/api/v3';
                    if (!newModelName) newModelName = 'doubao-pro-32k';
                  } else if (newProvider === 'siliconflow' && !newApiUrl?.includes('siliconflow')) {
                    newApiUrl = 'https://api.siliconflow.cn/v1';
                    if (!newModelName) newModelName = 'Pro/deepseek-ai/DeepSeek-V3';
                  } else if (newProvider === 'openai' && !newApiUrl) {
                    newApiUrl = 'https://api.openai.com/v1';
                  } else if (newProvider === 'google') {
                    newApiUrl = '';
                  }
                  
                  setEditingModel({...editingModel, provider: newProvider, apiUrl: newApiUrl, modelName: newModelName});
                }} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm">
                  <option value="google">Gemini</option>
                  <option value="openai">ChatGPT / OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="doubao">Doubao</option>
                  <option value="claude">Claude / Anthropic</option>
                  <option value="siliconflow">SiliconFlow</option>
                  <option value="custom">Other Compatible</option>
                </select>
                <input type="text" list="popular-models" placeholder="Model Name (e.g. gemini-1.5-flash)" value={editingModel.modelName} onChange={(e) => setEditingModel({...editingModel, modelName: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm" />
                <datalist id="popular-models">
                  <option value="gpt-4o">ChatGPT (gpt-4o)</option>
                  <option value="gemini-2.5-pro">Gemini (gemini-2.5-pro)</option>
                  <option value="deepseek-chat">DeepSeek (V3)</option>
                  <option value="deepseek-reasoner">DeepSeek (R1)</option>
                  <option value="claude-3-7-sonnet-20250219">Claude (3.7 Sonnet)</option>
                  <option value="doubao-pro-32k">Doubao (doubao-pro)</option>
                  <option value="Pro/deepseek-ai/DeepSeek-R1">SiliconFlow (DeepSeek-R1)</option>
                </datalist>
                <input type="password" placeholder="API Key" value={editingModel.apiKey || ''} onChange={(e) => setEditingModel({...editingModel, apiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm" />
                {editingModel.provider !== 'google' && (
                  <input type="text" placeholder="Custom Base URL (optional)" value={editingModel.apiUrl || ''} onChange={(e) => setEditingModel({...editingModel, apiUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm" />
                )}
                <div className="flex gap-2">
                  <button onClick={saveModel} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">Save Profile</button>
                  <button onClick={() => setEditingModel(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Model</label>
                  <select 
                    value={state.activeSageModelId || ''} 
                    onChange={(e) => setState(prev => ({ ...prev, activeSageModelId: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all text-sm font-bold"
                  >
                    {!models.length && <option value="">Default Legacy Config</option>}
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.modelName})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  {models.map(m => (
                     <div key={m.id} className={cn("flex items-center justify-between p-3 border rounded-xl transition-colors", "bg-slate-800/30 border-slate-800")}>
                       <span className={cn("text-sm font-medium", "text-slate-300")}>{m.name}</span>
                       <div className="flex gap-2">
                         <button onClick={() => setEditingModel(m)} className={cn("p-1.5 rounded-lg transition-colors", "text-slate-400 hover:text-white hover:bg-slate-800")}><Edit2 size={14} /></button>
                         <button onClick={() => setState(prev => ({ ...prev, sageModels: prev.sageModels?.filter(x => x.id !== m.id) }))} className={cn("p-1.5 rounded-lg transition-colors", "text-slate-400 hover:text-red-400 hover:bg-red-500/20")}><Trash2 size={14} /></button>
                       </div>
                     </div>
                  ))}
                </div>
                <button onClick={() => setEditingModel({ id: 'new', name: '', provider: 'google', modelName: '' })} className={cn("w-full py-3 border border-dashed rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  "bg-slate-800 border-slate-700 hover:border-indigo-500 hover:text-indigo-400 text-slate-400"
                )}>
                  <Plus size={14} /> Add Model Profile
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-4">
            {editingPrompt ? (
              <div className={cn("space-y-4 p-4 rounded-2xl border", "bg-slate-950 border-slate-800")}>
                <input type="text" placeholder="Prompt Title (e.g. Scold Me)" value={editingPrompt.title} onChange={(e) => setEditingPrompt({...editingPrompt, title: e.target.value})} className={cn("w-full border rounded-xl px-4 py-2 text-sm", "bg-slate-900 border-slate-800 text-white")} />
                <textarea placeholder="Enter custom prompt content..." value={editingPrompt.prompt} onChange={(e) => setEditingPrompt({...editingPrompt, prompt: e.target.value})} className={cn("w-full h-32 border rounded-xl px-4 py-2 text-sm resize-none custom-scrollbar", "bg-slate-900 border-slate-800 text-white")} />
                <div className="flex gap-2">
                  <button onClick={savePrompt} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">Save Prompt</button>
                  <button onClick={() => setEditingPrompt(null)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all", "bg-slate-800 hover:bg-slate-700 text-white")}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Library</label>
                  <button 
                    onClick={() => {
                      customConfirm("Restore all default prompts? This will not delete your custom ones but will re-add defaults if they are missing.", () => {
                        setState(prev => {
                          const existingIds = (prev.sagePrompts || []).map(p => p.id);
                          const toAdd = DEFAULT_SAGE_PROMPTS.filter((p) => !existingIds.includes(p.id));
                          return { ...prev, sagePrompts: [...(prev.sagePrompts || []), ...toAdd] };
                        });
                      }, "Restore Defaults", "info");
                    }}
                    className="text-[9px] font-bold text-indigo-400 uppercase hover:text-indigo-300 transition-colors"
                  >
                    Restore Defaults
                  </button>
                </div>
                <div className="space-y-2">
                  {prompts.map(p => (
                     <div key={p.id} className="group p-3 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-colors">
                       <div className="flex items-center justify-between mb-1">
                         <span className="text-sm font-bold text-slate-200">{p.title}</span>
                         <div className="flex gap-1 transition-opacity transition-opacity">
                           <button onClick={() => setEditingPrompt(p)} className="p-1 px-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1"><Edit2 size={10} /> Edit</button>
                           <button 
                             onClick={() => {
                               customConfirm("Delete this prompt?", () => {
                                 setState(prev => ({ ...prev, sagePrompts: prev.sagePrompts?.filter(x => x.id !== p.id) }));
                               }, "Delete Prompt", "danger");
                             }} 
                             className="p-1 px-2 text-[10px] font-bold text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                           >
                             <Trash2 size={10} /> Delete
                           </button>
                         </div>
                       </div>
                       <p className="text-[10px] text-slate-500 line-clamp-1 italic pr-1">{p.prompt}</p>
                     </div>
                  ))}
                  {prompts.length === 0 && <p className="text-center text-xs text-slate-500 py-4 italic pr-1">No prompts in your library yet.</p>}
                </div>
                <button onClick={() => setEditingPrompt({ id: 'new', title: '', prompt: '' })} className="w-full py-3 bg-slate-800 border border-slate-700 border-dashed hover:border-indigo-500 hover:text-indigo-400 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <Plus size={14} /> Create New Prompt
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        isAlert={confirmDialog.isAlert}
      />
    </div>
  );
};

const SageLoadingTimer = ({ startTime, isDarkTheme, onCancel }: { startTime: number, isDarkTheme: boolean, onCancel?: () => void }) => {
  const [elapsed, setElapsed] = React.useState(0);
  
  React.useEffect(() => {
    const updateElapsed = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className={cn("p-4 rounded-2xl rounded-tl-none flex items-center gap-3 border",
      "bg-slate-900/80 border-indigo-500/20"
    )}>
       <RefreshCw className={cn("animate-spin", "text-indigo-400")} size={16} />
       <span className={cn("text-xs font-serif italic pr-1 flex-1", "text-indigo-400/70")}>
         The Sage is consulting the scrolls... ({elapsed}s)
       </span>
       {onCancel && (
         <button onClick={onCancel} className="p-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors shrink-0" title="Cancel Request">
           <X size={14} />
         </button>
       )}
    </div>
  );
};

interface SageInterfaceProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const SageInterface: React.FC<SageInterfaceProps> = ({ state, setState }) => {
  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');
  const [showConfig, setShowConfig] = useState(false);
  const loading = !!state.sageIsLoading;
  const loadingStartTime = state.sageLoadingStartTime || Date.now();
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(() => window.innerWidth >= 768);
  const [editingConvoId, setEditingConvoId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; type?: 'danger'|'warning'|'info'; isAlert?: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const customConfirm = (message: string, onConfirm: () => void, title = 'Confirm', type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: false, type, onConfirm });
  };

  // Initialize conversations if empty, using legacy history if it exists
  React.useEffect(() => {
    if (!state.sageConversations || state.sageConversations.length === 0) {
      const initialHistory = state.sageChatHistory || [];
      const defaultConvo = {
        id: Date.now().toString(),
        title: initialHistory.length > 0 ? 'Previous Counsel' : 'New Consultation',
        updatedAt: Date.now(),
        messages: initialHistory
      };
      setState(prev => ({
        ...prev,
        sageConversations: [defaultConvo],
        activeSageConversationId: defaultConvo.id
      }));
    } else if (!state.activeSageConversationId) {
       setState(prev => ({
        ...prev,
        activeSageConversationId: prev.sageConversations?.[0]?.id
      }));
    }
  }, []);

  const conversations = state.sageConversations || [];
  const activeConversationId = state.activeSageConversationId || conversations[0]?.id;
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const history = activeConversation?.messages || [];

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelConsult = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const prompt = customPrompt || userInput;
    if (!prompt.trim() && !customPrompt) return;

    setError(null);
    setUserInput('');

    // Add user message to state
    const userMsg = { role: 'user' as const, content: prompt, timestamp: Date.now() };
    
    // Auto-generate title if it's the first message
    let newTitle = activeConversation?.title;
    if (history.length === 0) {
      newTitle = prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '');
    }

    setState(prev => {
      const convos = prev.sageConversations || [];
      return {
        ...prev,
        sageConversations: convos.map(c => 
          c.id === activeConversationId 
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now(), title: newTitle || c.title } 
            : c
        ),
        sageIsLoading: true,
        sageLoadingStartTime: Date.now()
      };
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const getAdvicePromise = getSageAdvice({ 
        state, 
        prompt, 
        history: history.map(h => ({ role: h.role, content: h.content })),
        signal: abortController.signal
      });

      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 180 * 1000);
      });

      const res = await Promise.race([getAdvicePromise, timeoutPromise]);
      
      const assistantMsg = { 
        role: 'assistant' as const, 
        content: res.content, 
        reasoningContent: res.reasoningContent,
        timestamp: Date.now() 
      };
      
      setState(prev => {
        const convos = prev.sageConversations || [];
        return {
          ...prev,
          sageConversations: convos.map(c => 
            c.id === activeConversationId 
              ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() } 
              : c
          ),
          sageIsLoading: false,
          sageLoadingStartTime: null
        };
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          sageIsLoading: false,
          sageLoadingStartTime: null
        }));
        return;
      }
      if (e.message === 'TIMEOUT_ERROR') {
        const assistantMsg = { role: 'assistant' as const, content: "*(The Sage pondered deeply for too long and lost the connection. Please try again.)*", timestamp: Date.now() };
        setState(prev => {
          const convos = prev.sageConversations || [];
          return {
            ...prev,
            sageConversations: convos.map(c => 
              c.id === activeConversationId 
                ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() } 
                : c
            ),
            sageIsLoading: false,
            sageLoadingStartTime: null
          };
        });
      } else {
        setError(e.message);
        setState(prev => ({
          ...prev,
          sageIsLoading: false,
          sageLoadingStartTime: null
        }));
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuote = (text: string) => {
    // Basic quoting: prepend as markdown quote
    const lines = text.split('\n').map(l => `> ${l}`).join('\n');
    setUserInput(lines + '\n\n' + userInput);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleExport = () => {
    if (!activeConversation) return;
    const blob = new Blob([JSON.stringify(activeConversation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sage_export_${activeConversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewConversation = () => {
    const newConvo = {
      id: Date.now().toString(),
      title: 'New Consultation',
      updatedAt: Date.now(),
      messages: []
    };
    setState(prev => ({
      ...prev,
      sageConversations: [newConvo, ...(prev.sageConversations || [])],
      activeSageConversationId: newConvo.id
    }));
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleRenameConversation = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvoId(id);
    setEditingTitle(currentTitle);
  };

  const saveConversationTitle = (id: string) => {
    if (editingTitle.trim()) {
      setState(prev => {
        const convos = prev.sageConversations || [];
        return {
          ...prev,
          sageConversations: convos.map(c => 
            c.id === id ? { ...c, title: editingTitle.trim() } : c
          )
        };
      });
    }
    setEditingConvoId(null);
    setEditingTitle('');
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setState(prev => {
      const remaining = (prev.sageConversations || []).filter(c => c.id !== id);
      if (remaining.length === 0) {
        const defaultConvo = {
          id: Date.now().toString(),
          title: 'New Consultation',
          updatedAt: Date.now(),
          messages: []
        };
        return {
          ...prev,
          sageConversations: [defaultConvo],
          activeSageConversationId: defaultConvo.id
        };
      }
      return {
        ...prev,
        sageConversations: remaining,
        activeSageConversationId: id === prev.activeSageConversationId ? remaining[0].id : prev.activeSageConversationId
      };
    });
  };

  const clearHistory = () => {
    customConfirm("Are you sure you want to clear this entire conversation?", () => {
      setState(prev => {
        const convos = prev.sageConversations || [];
        return {
          ...prev,
          sageConversations: convos.map(c => 
            c.id === activeConversationId ? { ...c, messages: [] } : c
          )
        };
      });
    }, "Clear Conversation", "danger");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
             <Bot className="text-indigo-400" size={24} />
          </div>
          <div>
            <h4 className="text-lg font-black text-white uppercase tracking-widest leading-none mb-2">The Emerald Sage</h4>
            <p className="text-xs text-indigo-400/70 font-medium">An AI mentor fueled by your reflections.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearHistory}
            className="p-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl hover:text-red-400 transition-colors"
            title="Clear History"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={cn(
              "p-2 rounded-xl border transition-all",
              showConfig ? ("bg-white text-black border-white") : "bg-slate-800 text-slate-400 border-slate-700 hover:border-indigo-500/50"
            )}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <SageConfigManager state={state} setState={setState} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("relative flex flex-row rounded-3xl border overflow-hidden min-h-[500px] h-[600px]", "bg-slate-950/50 border-slate-800")}>
        
        {/* Sidebar Mobile Backdrop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-20 bg-slate-950/40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={cn(
                "absolute md:relative h-full border-r flex flex-col flex-shrink-0 z-30 shadow-2xl md:shadow-none bg-inherit",
                "border-slate-800 bg-slate-900"
              )}
            >
              <div className={cn("p-4 border-b flex items-center justify-between", "border-slate-800")}>
                <span className={cn("text-xs font-black uppercase tracking-widest pl-2", "text-slate-400")}>Consultations</span>
                <button
                  onClick={handleNewConversation}
                  className={cn("p-1.5 rounded-lg transition-colors", "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20")}
                  title="New Consultation"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {conversations.map(convo => (
                  <div
                    key={convo.id}
                    onClick={() => {
                      if (editingConvoId !== convo.id) {
                        setState(prev => ({ ...prev, activeSageConversationId: convo.id }));
                      }
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-2xl transition-all group flex items-start gap-3",
                      editingConvoId !== convo.id ? "cursor-pointer" : "",
                      activeConversationId === convo.id
                        ? "bg-indigo-500/15 border border-indigo-500/30"
                        : ("bg-slate-900 border border-transparent hover:border-slate-800")
                    )}
                  >
                    <MessageSquare size={16} className={cn("mt-0.5 flex-shrink-0", activeConversationId === convo.id ? "text-indigo-500" : ("text-slate-500 group-hover:text-slate-400"))} />
                    <div className="flex-1 overflow-hidden">
                      {editingConvoId === convo.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => saveConversationTitle(convo.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveConversationTitle(convo.id);
                            if (e.key === 'Escape') setEditingConvoId(null);
                          }}
                          className={cn("text-xs font-bold w-full bg-transparent outline-none border-b border-dashed", "text-slate-200 border-indigo-500/50")}
                        />
                      ) : (
                        <div className={cn("text-xs font-bold line-clamp-1 break-all", activeConversationId === convo.id ? ("text-slate-200") : ("text-slate-300 group-hover:text-slate-200"))}>
                          {convo.title}
                        </div>
                      )}
                      <div className={cn("text-[10px] mt-1", "text-slate-600")}>
                        {new Date(convo.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {editingConvoId !== convo.id && (
                      <div className="flex flex-col gap-2 flex-shrink-0 transition-opacity transition-opacity lg:opacity-100">
                        <button
                          onClick={(e) => handleRenameConversation(convo.id, convo.title, e)}
                          className={cn("p-1", "text-slate-500 hover:text-indigo-400")}
                          title="Rename"
                        >
                          <Edit2 size={12} />
                        </button>
                        {conversations.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteConversation(convo.id, e)}
                            className={cn("p-1 hover:text-red-400", "text-slate-500")}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat */}
        <div className={cn("flex-1 flex flex-col min-w-0 transition-colors", "bg-slate-950/30")}>
          <div className={cn("p-3 border-b flex items-center justify-between", "border-slate-800 bg-slate-900/50")}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn("p-2 ml-2 transition-colors rounded-xl", "text-slate-400 hover:text-white bg-slate-800/80")}
              title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <div className={cn("text-xs font-black uppercase tracking-widest line-clamp-1 flex-1 text-center px-4", "text-slate-400")}>
              {activeConversation?.title || 'Illuminating the Path'}
            </div>
            <button 
              onClick={handleExport}
              title="Export Conversation"
              className={cn("p-2 mr-2 transition-colors", "text-slate-400 hover:text-indigo-400")}
              disabled={!activeConversation || activeConversation.messages.length === 0}
            >
              <Download size={18} />
            </button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {history.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-10">
               <div className="relative">
                 <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 animate-pulse" />
                 <Bot className="absolute inset-0 m-auto text-indigo-500/40" size={40} />
               </div>
               <div>
                 <h4 className={cn("font-black uppercase tracking-widest mb-3", "text-white")}>Begin the Consultation</h4>
                 <p className={cn("text-sm max-w-xs leading-relaxed", "text-slate-400")}>The Oracle is ready to evaluate your scrolls. Speak, and the path shall be revealed.</p>
               </div>
               <div className="flex flex-wrap gap-2 justify-center max-w-lg px-4">
                 {state.sagePrompts?.map(p => (
                   <button key={p.id} onClick={() => handleSend(p.prompt)} className={cn(
                     "py-2 px-3.5 border rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                     "bg-slate-900 border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-500/10 text-indigo-300 hover:text-white"
                   )}>{p.title}</button>
                 ))}
               </div>
            </div>
          )}

          {history.map((msg, idx) => (
            <div key={idx} className={cn("flex flex-col group", msg.role === 'user' ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-lg relative",
                msg.role === 'user' 
                  ? "bg-indigo-600 border border-indigo-500 text-white rounded-tr-none" 
                  : cn(
                      "rounded-tl-none font-serif shadow-sm",
                      "bg-slate-900/80 border border-slate-800 text-slate-300"
                    )
              )}>
                {msg.role === 'assistant' ? (
                  <div className={cn("prose prose-sm max-w-none", "prose-sage")}>
                    {msg.reasoningContent && (
                      <details className={cn("mb-4 rounded-xl border group overflow-hidden bg-transparent", "border-indigo-500/20 hover:bg-indigo-500/5")}>
                        <summary className={cn("px-3 py-2 text-xs font-bold cursor-pointer select-none transition-colors outline-none", "text-indigo-400")}>
                          Thought Process
                        </summary>
                        <div className={cn("px-3 pb-3 pt-1 text-[11px] opacity-80 border-t", "border-indigo-500/20")}>
                          <ReactMarkdown>{msg.reasoningContent}</ReactMarkdown>
                        </div>
                      </details>
                    )}
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              
              <div className={cn(
                "flex items-center gap-3 mt-1.5 px-2",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest shrink-0">
                  {msg.role === 'user' ? 'Scholar' : 'Emerald Sage'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopy(msg.content, `${idx}`)}
                    className="p-1 hover:text-indigo-400 text-slate-500 transition-colors flex items-center justify-center"
                    title="Copy"
                  >
                    {copiedId === `${idx}` ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  <button 
                    onClick={() => handleQuote(msg.content)}
                    className="p-1 hover:text-indigo-400 text-slate-500 transition-colors flex items-center justify-center"
                    title="Quote"
                  >
                    <Quote size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start pr-1">
              <SageLoadingTimer startTime={loadingStartTime} isDarkTheme={isDarkTheme} onCancel={handleCancelConsult} />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold font-mono">
              {error}
            </div>
          )}
        </div>

        <div className={cn("p-6 border-t relative",
          "bg-slate-900 border-slate-800"
        )}>
           <AnimatePresence>
            {showPromptSelector && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn("absolute bottom-full left-4 mb-2 w-64 rounded-2xl shadow-2xl p-2 z-20 overflow-hidden",
                  "bg-slate-900 border border-slate-800"
                )}
              >
                <div className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-2 border-b mb-1 flex justify-between items-center",
                  "text-indigo-500/50 border-slate-800/50"
                )}>
                  <span>Prompt Library</span>
                  {(!state.sagePrompts || state.sagePrompts.length === 0) && (
                    <button 
                      onClick={() => {
                        import('../../constants').then(({ DEFAULT_SAGE_PROMPTS }) => {
                          setState(prev => ({ ...prev, sagePrompts: DEFAULT_SAGE_PROMPTS }));
                        });
                      }}
                      className={cn("text-[9px] font-bold transition-colors",
                        "text-indigo-400 hover:text-indigo-300"
                      )}
                    >
                      Load Defaults
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {state.sagePrompts && state.sagePrompts.length > 0 ? (
                    state.sagePrompts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setUserInput(p.prompt + (userInput ? '\n\n' + userInput : ''));
                          setShowPromptSelector(false);
                          inputRef.current?.focus();
                        }}
                        className={cn("w-full text-left p-3 rounded-xl transition-colors group",
                          "hover:bg-indigo-500/10"
                        )}
                      >
                        <div className={cn("text-xs font-bold",
                          "text-slate-200 group-hover:text-indigo-400"
                        )}>{p.title}</div>
                        <div className={cn("text-[10px] line-clamp-1 mt-0.5",
                          "text-slate-500"
                        )}>{p.prompt}</div>
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                       <p className={cn("text-[10px] font-bold uppercase tracking-widest",
                         "text-slate-600"
                       )}>Library is empty</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
           </AnimatePresence>

           <div className="flex gap-2">
              <button 
                onClick={() => setShowPromptSelector(!showPromptSelector)}
                className={cn(
                  "flex-shrink-0 w-12 h-14 rounded-2xl border transition-all flex items-center justify-center",
                  showPromptSelector 
                    ? "bg-indigo-600 border-indigo-500 text-white" 
                    : ("bg-slate-950 border-slate-800 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400")
                )}
                title="Select Prompt"
              >
                <Library size={20} />
              </button>
              <div className="relative flex-1 group">
                <input 
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Message the Sage..."
                  className={cn("w-full h-14 border rounded-2xl px-5 outline-none transition-all",
                    "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500 placeholder:text-slate-600"
                  )}
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={loading || !userInput.trim()}
                  className={cn("absolute right-2 top-2 bottom-2 w-12 text-white rounded-xl transition-all flex items-center justify-center",
                    "bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600"
                  )}
                >
                  <Send size={18} />
                </button>
              </div>
           </div>
        </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        isAlert={confirmDialog.isAlert}
      />
    </motion.div>
  );
};
