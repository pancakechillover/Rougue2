import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, Key, X, AlertTriangle, Check, Loader2, Database, Sparkles, HelpCircle, Unlink, Info, Eye, EyeOff, Copy, RefreshCw, Trash2, History, UploadCloud, DownloadCloud, Search, CheckCircle2, XCircle, AlertCircle, WifiOff, ShieldAlert, ZapOff } from 'lucide-react';
import { getDeviceType, getDeviceCode } from '../lib/utils';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretCode?: string;
  isSyncing: boolean;
  syncError: string | null;
  syncCheckResult: {
    status: 'no_save' | 'cloud_newer' | 'local_newer';
    cloudData?: any;
    code: string;
  } | null;
  onConnect: (code: string) => void;
  onResolveConflict: (useCloud: boolean) => void;
  onCancelConnect: (code: string) => void;
  onManualSync: () => void;
  onUnbind: () => void;
  onDeleteCloudData: () => void;
  onVerify?: () => void;
  onCancelSync?: () => void;
  syncHistory?: {
    type: 'login' | 'force_sync' | 'local_to_cloud' | 'cloud_to_local' | 'cancel_login' | 'unbind_local' | 'delete_cloud';
    code: string;
    timestamp: string;
    status: 'success' | 'failed' | 'cancelled' | 'pending';
    error?: string;
    deviceType?: string;
    deviceNickname?: string;
    syncMethod?: 'Manual' | 'Immediate' | 'Interval polling' | 'Visibility API Active';
    syncProvider?: 'Redis' | 'Google Drive' | 'WebDAV';
  }[];
  localState?: any;
  isVerifying?: boolean;
  syncProvider?: 'Redis' | 'Google Drive' | 'WebDAV';
}

// Phrase cycling for sync overlay
const SYNC_PHRASES = [
  "The maiden is praying...",
  "Tip: Complete daily quests to earn valuable talent shards.",
  "Tip: Join a guild to embark on shared focus journeys.",
  "Tip: Review your timeline to discover your optimal focus hours.",
  "Tip: Adjust your level-up notifications in the settings menu.",
  "Tip: Long-press your avatar to quickly view your profile.",
  "Aligning the chronological artifacts...",
  "Communing with the ancient server spirits..."
];

const SyncPhraseTyper = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  
  useEffect(() => {
    let currentPhraseIndex = 0;
    const interval = setInterval(() => {
      setPhraseIndex(prev => {
        const next = (prev + 1) % SYNC_PHRASES.length;
        currentPhraseIndex = next;
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const phrase = SYNC_PHRASES[phraseIndex];
    const words = phrase.split(' ');
    setDisplayedWords([]);
    
    let wordIndex = 0;
    const typer = setInterval(() => {
      if (wordIndex < words.length) {
        setDisplayedWords(prev => {
          // If the phrase has changed during this fast interval, stop updating
          if (SYNC_PHRASES[phraseIndex] !== phrase) return prev;
          return [...prev, words[wordIndex]];
        });
        wordIndex++;
      } else {
        clearInterval(typer);
      }
    }, 200);
    
    return () => clearInterval(typer);
  }, [phraseIndex]);
  
  return (
    <div 
      className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed min-h-[60px] cursor-pointer select-none flex items-center justify-center transition-all bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-slate-700" 
      onClick={() => setPhraseIndex(prev => (prev + 1) % SYNC_PHRASES.length)}
      title="Click to skip to next phrase"
    >
      <p>
        <span className="text-slate-300 font-medium">{displayedWords.join(' ')}</span>
        <span className="animate-pulse text-indigo-400 font-bold ml-1">_</span>
      </p>
    </div>
  );
};

export function CloudSyncModal({
  isOpen,
  onClose,
  secretCode,
  isSyncing,
  isVerifying,
  syncError,
  syncCheckResult,
  onConnect,
  onResolveConflict,
  onCancelConnect,
  onManualSync,
  onUnbind,
  onDeleteCloudData,
  onVerify,
  onCancelSync,
  syncHistory,
  localState,
  syncProvider = 'Redis'
}: CloudSyncModalProps) {
  const [inputCode, setInputCode] = useState(secretCode || '');
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
    requiresTextConfirm?: boolean;
    showComparison?: boolean;
  } | null>(null);

  const [timeoutElapsed, setTimeoutElapsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const prevSyncingRef = useRef(isSyncing);

  useEffect(() => {
    if (secretCode !== undefined) {
      setInputCode(secretCode || '');
    }
  }, [secretCode]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    if (isVerifying || isSyncing) {
      setTimeoutElapsed(false);
      setTimeLeft(60);
      
      intervalId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            setTimeoutElapsed(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutId = setTimeout(() => {
        setTimeoutElapsed(true);
      }, 60000);
    } else {
      setTimeoutElapsed(false);
      setTimeLeft(60);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isVerifying, isSyncing]);

  // Auto-close modal after successful sync
  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing && !syncError && !syncCheckResult) {
      // If we were syncing and now we are not, and there is no error, and no pending comparison result, close it.
      const timer = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing, syncError, syncCheckResult, onClose]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*￥$%^&';
    let pass = '';
    const length = Math.floor(Math.random() * 7) + 6; // 6 to 12
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInputCode(pass);
    navigator.clipboard.writeText(pass);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only allow English, numbers, and @*￥$%^&, max 12 chars
    const filtered = val.replace(/[^a-zA-Z0-9@*￥$%^&]/g, '').slice(0, 12);
    setInputCode(filtered);
  };

  const isInputValid = inputCode.length >= 6 && inputCode.length <= 12;

  const handleExportDataLocal = () => {
    if (!localState) return;
    const data = {
      state: localState,
      dungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]'),
      majorDungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]'),
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholars_dungeon_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Error Enhancement Helper
  const getEnhancedError = (err: string | null): { 
    title: string; 
    reason: string; 
    solution: string; 
    icon: React.ReactNode; 
    color: string;
    bg: string;
    border: string;
  } | null => {
    if (!err) return null;

    const lowerErr = err.toLowerCase();
    
    // 1. Network / Offline
    if (lowerErr.includes('network unavailable') || lowerErr.includes('failed to fetch') || lowerErr.includes('load failed')) {
      return {
        title: 'Network Severed',
        reason: 'The connection to the Astral Archives has been lost. Your device cannot reach the void.',
        solution: 'Check your internet connection or verify if your local firewall is blocking the archives.',
        icon: <WifiOff size={20} />,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
      };
    }

    // 2. Rate Limiting (429)
    if (lowerErr.includes('429') || lowerErr.includes('overtaxed') || lowerErr.includes('cooling down')) {
      return {
        title: 'Archives Overtaxed',
        reason: 'The archives are receiving too many inscriptions at once and need to stabilize.',
        solution: 'Wait for the cooldown timer on the screen to reach zero before attempting again.',
        icon: <Loader2 className="animate-spin" size={20} />,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20'
      };
    }

    // 3. Not Found (404)
    if (lowerErr.includes('not found') || lowerErr.includes('404')) {
      return {
        title: 'Scroll Not Found',
        reason: 'The secret code or file you provided does not exist in the cloud ledger.',
        solution: 'Verify your Secret Code. If this is a new setup, try "Initialize Archive" instead.',
        icon: <Search size={20} />,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20'
      };
    }

    // 4. Server Config / Redis Down
    if (lowerErr.includes('not configured') || lowerErr.includes('redis')) {
      return {
        title: 'Void Unstable',
        reason: 'The Astral server is currently undergoing maintenance or is incorrectly configured.',
        solution: 'Retry in a few moments. If persistent, contact the dungeon master (developer).',
        icon: <ZapOff size={20} />,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20'
      };
    }

    // 5. Google Drive specific
    if (lowerErr.includes('google') || lowerErr.includes('drive')) {
      return {
        title: 'Celestial Guard Error',
        reason: 'Google Drive rejected the archive request. This usually means tokens expired.',
        solution: 'Try logging out and back in with Google to refresh your celestial permissions.',
        icon: <ShieldAlert size={20} />,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20'
      };
    }

    // 6. Generic Proxy / WebDAV error
    if (lowerErr.includes('webdav') || lowerErr.includes('proxy')) {
      return {
        title: 'Bridge Expansion Error',
        reason: 'The bridge to your private WebDAV storage failed to respond correctly.',
        solution: 'Verify your WebDAV URL. Ensure it starts with https:// and the credentials are valid.',
        icon: <Database size={20} />,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20'
      };
    }

    // Default
    return {
      title: 'Unknown Phenomenon',
      reason: err || 'An unexpected anomaly occurred during the synchronization process.',
      solution: 'Try reloading the application or checking the sync history for technical logs.',
      icon: <AlertTriangle size={20} />,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20'
    };
  };

  const enhancedErr = getEnhancedError(syncError);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-indigo-500/30 p-6 rounded-3xl shadow-2xl w-full max-w-md backdrop-blur-xl relative overflow-hidden"
      >
        {/* Mystical Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[60px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[60px] rounded-full mix-blend-screen" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                <Cloud className="text-indigo-400" size={24} />
              </div>
              {syncProvider === 'Google Drive' ? 'Google Drive Sync' : syncProvider === 'WebDAV' ? 'WebDAV Sync' : 'The Astral Archives'}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    setShowHistory(!showHistory);
                    setShowHelp(false);
                  }}
                  className={`p-1.5 rounded-full transition-colors ${showHistory ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400'}`}
                  title="Sync History"
                >
                  <History size={18} />
                </button>
                <button 
                  onClick={() => {
                    setShowHelp(!showHelp);
                    setShowHistory(false);
                  }}
                  className={`p-1.5 rounded-full transition-colors ${showHelp ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400'}`}
                  title="What is this?"
                >
                  <HelpCircle size={18} />
                </button>
              </div>
            </h3>
            <button 
              onClick={() => {
                if (showHistory) setShowHistory(false);
                else if (showHelp) setShowHelp(false);
                else onClose();
              }} 
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {confirmDialog ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className={`p-4 border rounded-2xl space-y-4 ${confirmDialog.isDestructive ? 'bg-rose-500/10 border-rose-500/30' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                  <div className="space-y-1">
                    <h4 className={`font-bold flex items-center gap-2 ${confirmDialog.isDestructive ? 'text-rose-500' : 'text-indigo-500'}`}>
                      <AlertTriangle size={18} />
                      {confirmDialog.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {confirmDialog.message}
                    </p>
                  </div>
                  
                  {confirmDialog.showComparison && (
                    <div className="space-y-2">
                       <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest px-1">Comparison Preview</p>
                       <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-inner">
                        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1.5 items-center">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Stat</div>
                          <div className="text-center font-black text-slate-300 bg-slate-800/50 py-1 rounded-md text-[9px]">Local</div>
                          <div className="text-center font-black text-indigo-400 bg-indigo-500/10 py-1 rounded-md text-[9px]">Cloud</div>
                          
                          <div className="text-[10px] text-slate-500 font-medium">Level</div>
                          <div className={`text-center font-mono text-xs ${localState?.level > (syncCheckResult?.cloudData?.state?.level ?? 0) ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {localState?.level || 1}
                          </div>
                          <div className={`text-center font-mono text-xs ${(syncCheckResult?.cloudData?.state?.level ?? 0) > (localState?.level ?? 0) ? 'text-emerald-400 font-bold' : 'text-indigo-300'}`}>
                            {syncCheckResult?.cloudData?.state?.level ?? '?'}
                          </div>

                          <div className="text-[10px] text-slate-500 font-medium">Gold</div>
                          <div className={`text-center font-mono text-xs ${localState?.coins > (syncCheckResult?.cloudData?.state?.coins ?? 0) ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {localState?.coins || 0}
                          </div>
                          <div className={`text-center font-mono text-xs ${(syncCheckResult?.cloudData?.state?.coins ?? 0) > (localState?.coins ?? 0) ? 'text-emerald-400 font-bold' : 'text-indigo-300'}`}>
                            {syncCheckResult?.cloudData?.state?.coins ?? '?'}
                          </div>
                          
                          <div className="text-[10px] text-slate-500 font-medium">History</div>
                          <div className={`text-center font-mono text-xs ${localState?.history?.length > (syncCheckResult?.cloudData?.state?.history?.length ?? 0) ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {localState?.history?.length || 0}
                          </div>
                          <div className={`text-center font-mono text-xs ${(syncCheckResult?.cloudData?.state?.history?.length ?? 0) > (localState?.history?.length ?? 0) ? 'text-emerald-400 font-bold' : 'text-indigo-300'}`}>
                            {syncCheckResult?.cloudData?.state?.history?.length ?? '?'}
                          </div>

                          <div className="text-[10px] text-slate-500 font-medium">Device</div>
                          <div className="text-center text-[10px] text-slate-400 font-bold truncate bg-slate-800 py-0.5 rounded">
                            {localState?.deviceNickname || getDeviceType()}
                          </div>
                          <div className="text-center text-[10px] text-indigo-400/70 font-bold truncate bg-indigo-500/5 py-0.5 rounded">
                            {syncCheckResult?.cloudData?.savedBy || syncCheckResult?.cloudData?.state?.deviceNickname || syncCheckResult?.cloudData?.state?.deviceType || '?'}
                          </div>

                          <div className="text-[10px] text-slate-500 font-medium">Device Code</div>
                          <div className="text-center text-[9px] text-slate-500 font-mono truncate bg-slate-800/30 py-0.5 rounded border border-slate-700/30">
                            {localState?.deviceCode?.substring(0, 8) || '?'}
                          </div>
                          <div className="text-center text-[9px] text-indigo-500/50 font-mono truncate bg-indigo-500/5 py-0.5 rounded border border-indigo-500/10">
                            {(syncCheckResult?.cloudData?.savedByDeviceCode || syncCheckResult?.cloudData?.state?.deviceCode)?.substring(0, 8) || '?'}
                          </div>

                          <div className="text-[10px] text-slate-500 font-medium">Updated</div>
                          <div className="text-center text-[8px] text-slate-500 font-mono leading-tight whitespace-nowrap">
                            {localState?.lastUpdated ? new Date(localState.lastUpdated).toLocaleDateString() : '-'}
                          </div>
                          <div className="text-center text-[8px] text-indigo-500/70 font-mono leading-tight whitespace-nowrap">
                            {(syncCheckResult?.cloudData?.lastUpdated || syncCheckResult?.cloudData?.state?.lastUpdated) ? new Date(syncCheckResult.cloudData.lastUpdated || syncCheckResult.cloudData.state.lastUpdated).toLocaleDateString() : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {confirmDialog.isDestructive && (
                    <div className="pt-2 space-y-4">
                      <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Safety Suggestion</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          We recommend exporting your current local progress before performing this irreversible action.
                        </p>
                        <button
                          onClick={handleExportDataLocal}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <Database size={14} />
                          Export Local Data
                        </button>
                      </div>

                      {confirmDialog.requiresTextConfirm && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest">Type "Delete" to confirm</label>
                          <input 
                            type="text"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder="Type Delete here"
                            className="w-full bg-slate-950 border border-rose-500/20 rounded-xl py-2.5 px-4 text-white focus:border-rose-500 outline-none transition-all font-bold text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => {
                      setConfirmDialog(null);
                      setDeleteInput('');
                    }}
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      confirmDialog.action();
                      setConfirmDialog(null);
                      setDeleteInput('');
                    }}
                    disabled={confirmDialog.requiresTextConfirm && deleteInput.toLowerCase() !== 'delete'}
                    className={`py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmDialog.isDestructive ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            ) : showHelp ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2"
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <h4 className="flex items-center gap-2 text-indigo-500 m-0 mb-2"><Sparkles size={18} /> Echoes of the Void</h4>
                  <p className="text-slate-400 mt-0">The Astral Archives are a persistent ledger of your deeds across the multiverse. When you complete a session, your progress is automatically inscribed to the cloud in real-time.</p>
                  
                  <h4 className="flex items-center gap-2 text-indigo-500 m-0 mb-2 mt-4"><Key size={18} /> The Brave's Code</h4>
                  <p className="text-slate-400 mt-0">Your 6-12 character code is the <strong>sole key</strong> to your archives. We store no personal info, so your code is both your identifier and your shield. Guard it well.</p>

                  <h4 className="flex items-center gap-2 text-indigo-500 m-0 mb-2 mt-4"><RefreshCw size={18} /> Cross-Device Weaving</h4>
                  <p className="text-slate-400 mt-0">Log in with the same code on any device to resume your journey. If the Archives detect diverging paths (Conflicts), you will be asked to choose which reality to preserve.</p>

                  <h4 className="flex items-center gap-2 text-indigo-500 m-0 mb-2 mt-4"><Database size={18} /> Data Portability</h4>
                  <p className="text-slate-400 mt-0">While the Archives are robust, the void is vast. We recommend physical backups via <strong>Settings &rarr; Expedition Export</strong> or <strong>General Settings &rarr; JSON Export</strong> regularly.</p>
                </div>

                <button 
                  onClick={() => setShowHelp(false)}
                  className="w-full py-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-indigo-500/30 mt-4 sticky bottom-0 backdrop-blur-md"
                >
                  Return to Archives
                </button>
              </motion.div>
            ) : showHistory ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h4 className="font-bold text-indigo-400 flex items-center gap-2 mb-4">
                  <History size={18} />
                  Archive Chronology
                </h4>
                <div className="max-h-[50vh] overflow-x-auto custom-scrollbar-h">
                  {syncHistory && syncHistory.length > 0 ? (
                    <div className="min-w-[450px] pr-2">
                      <div className="grid grid-cols-[1.5fr_auto_1.2fr_minmax(120px,1.5fr)] gap-4 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-800/50">
                        <div>Action</div>
                        <div className="text-center px-2">Status</div>
                        <div>Identity</div>
                        <div className="text-right">Timestamp</div>
                      </div>
                      <div className="divide-y divide-slate-800/30">
                        {syncHistory.map((record, idx) => (
                          <div key={idx} className="py-3 px-1 hover:bg-slate-900/40 transition-colors flex flex-col gap-2">
                            <div className="grid grid-cols-[1.5fr_auto_1.2fr_minmax(120px,1.5fr)] gap-4 items-center">
                              <span className="text-[11px] font-bold text-indigo-300 truncate">
                                {record.type === 'login' ? 'Login' :
                                 record.type === 'force_sync' ? 'Force Sync' :
                                 record.type === 'local_to_cloud' ? 'Local ➔ Cloud' : 
                                 record.type === 'cancel_login' ? 'Canceled Login' : 
                                 record.type === 'unbind_local' ? 'Unbind Local' :
                                 record.type === 'delete_cloud' ? 'Delete Cloud' : 'Cloud ➔ Local'}
                              </span>
                              
                              <div className="flex justify-center min-w-[60px]">
                                {(!record.status || record.status === 'success') ? (
                                  <div className="flex flex-col items-center gap-0.5 text-emerald-400/90" title="Success">
                                    <CheckCircle2 size={14} strokeWidth={3} />
                                    <span className="text-[7px] font-black uppercase tracking-tighter">OK</span>
                                  </div>
                                ) : record.status === 'failed' ? (
                                  <div className="flex flex-col items-center gap-0.5 text-rose-500" title={record.error}>
                                    <XCircle size={14} strokeWidth={3} />
                                    <span className="text-[7px] font-black uppercase tracking-tighter">Fail</span>
                                  </div>
                                ) : record.status === 'cancelled' ? (
                                  <div className="flex flex-col items-center gap-0.5 text-slate-500" title="Cancelled">
                                    <AlertCircle size={14} strokeWidth={3} />
                                    <span className="text-[7px] font-black uppercase tracking-tighter">Void</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-0.5 text-indigo-400 animate-pulse">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="text-[7px] font-black uppercase tracking-tighter">...</span>
                                  </div>
                                )}
                              </div>

                              <div className="truncate">
                                <span className="text-[10px] text-slate-400 font-medium truncate block">
                                  {record.deviceNickname || record.deviceType || 'Unknown'}
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-500 text-right whitespace-nowrap font-mono opacity-80">
                                {new Date(record.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1">
                              <span className="text-[9px] text-slate-600 font-mono">ID: {record.code.substring(0, 8)}...</span>
                              {record.syncMethod && <span className="text-[8px] text-slate-600 bg-slate-900 border border-slate-800/50 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">{record.syncMethod}</span>}
                              {record.syncProvider && <span className="text-[8px] text-slate-600 bg-slate-900 border border-slate-800/50 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">{record.syncProvider}</span>}
                              {record.error && (
                                <span className="text-[9px] text-rose-500/80 italic font-medium line-clamp-1 flex-1 min-w-[150px]" title={record.error}>
                                  Err: {record.error}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No history recorded yet.</p>
                  )}
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-slate-700 mt-2"
                >
                  Return to Archives
                </button>
              </motion.div>
            ) : (isVerifying || isSyncing) ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-6"
              >
                {timeoutElapsed ? (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                      <AlertTriangle className="text-red-400 relative z-10" size={48} />
                    </div>
                    <div className="space-y-2 px-6">
                      <h3 className="text-xl font-black text-rose-300 uppercase tracking-widest">
                        Sync Interrupted
                      </h3>
                      {enhancedErr ? (
                        <div className={`p-4 ${enhancedErr.bg} border ${enhancedErr.border} rounded-2xl text-left space-y-2 mt-4`}>
                          <div className={`flex items-center gap-2 font-bold text-xs ${enhancedErr.color}`}>
                            {enhancedErr.icon}
                            {enhancedErr.title}
                          </div>
                          <p className="text-[11px] text-slate-400">{enhancedErr.reason}</p>
                          <p className="text-[11px] text-indigo-400 font-medium italic">Hint: {enhancedErr.solution}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm leading-relaxed">
                          The connection to the Astral Archives timed out. 
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col w-full gap-3 px-4">
                      <button
                        onClick={() => {
                          setTimeoutElapsed(false);
                          if (onCancelSync) onCancelSync();
                        }}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3"
                      >
                        <RefreshCw size={20} />
                        Reset & Retry Sync
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-xs"
                      >
                        Reload Application
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative mb-6 flex flex-col items-center justify-center min-h-[120px]">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full translate-y-4" />
                      <Loader2 className="animate-spin text-indigo-400 relative z-10" size={56} strokeWidth={1.5} />
                      <div className="mt-4 relative z-10">
                        <span className="text-xs font-black text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{timeLeft}s</span>
                      </div>
                    </div>
                    <div className="space-y-4 w-full">
                      <h3 className="text-xl font-black text-indigo-300 uppercase tracking-widest mb-2">
                        {isSyncing ? (
                          syncCheckResult ? 'Applying Changes' : 'Communing Archives'
                        ) : 'Verifying Archives'}
                      </h3>
                      <SyncPhraseTyper />
                    </div>
                    
                    <button
                      onClick={onCancelSync}
                      className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <X size={14} />
                      Cancel Attempt
                    </button>

                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            ) : syncCheckResult ? (
              <div className="space-y-4">
                {syncCheckResult.status === 'no_save' ? (
                  <>
                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-center space-y-4">
                      <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-indigo-500/10 mb-2">
                        <Sparkles className="text-indigo-400" size={32} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white uppercase tracking-wider">Are you a new Seeker?</h4>
                        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                          The Archives contain no records of this code. Shall you initialize a new Save Document to begin your legend?
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => onCancelConnect(inputCode)}
                        className="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-center transition-all group active:scale-95 shadow-lg"
                      >
                        <span className="font-bold text-slate-300 text-sm block mb-1 uppercase tracking-widest">Retreat</span>
                        <span className="text-[10px] text-slate-500 font-medium italic">"Not my code"</span>
                      </button>
                      <button 
                        onClick={() => onResolveConflict(false)}
                        className="p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-center transition-all group active:scale-95 shadow-lg shadow-indigo-500/5"
                      >
                        <span className="font-black text-indigo-300 text-sm block mb-1 uppercase tracking-widest">Inscribe</span>
                        <span className="text-[10px] text-indigo-400/70 font-medium uppercase tracking-tighter">Initialize Archive</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="text-indigo-500" size={20} />
                        <h4 className="font-bold text-indigo-500">Echoes of the Past Found</h4>
                      </div>
                      <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 mb-4 shadow-inner">
                        <div className="grid grid-cols-[auto_1fr_1fr] gap-y-3 gap-x-3 text-xs items-center">
                          <div className="text-slate-500 font-bold uppercase tracking-tighter text-[10px]">Stat</div>
                          <div className="text-center font-black text-slate-400 bg-slate-800/80 py-1.5 rounded-lg border border-slate-700/50 uppercase tracking-widest text-[9px]">Local</div>
                          <div className="text-center font-black text-indigo-400 bg-indigo-500/10 py-1.5 rounded-lg border border-indigo-500/20 uppercase tracking-widest text-[9px]">Cloud</div>

                          <div className="text-slate-500 font-medium">Hero Level</div>
                          <div className={`text-center font-mono text-sm ${localState?.level > (syncCheckResult.cloudData?.state?.level || 1) ? 'text-emerald-400 font-black' : 'text-slate-300 font-bold'}`}>{localState?.level || 1}</div>
                          <div className={`text-center font-mono text-sm ${(syncCheckResult.cloudData?.state?.level || 1) > (localState?.level || 1) ? 'text-emerald-400 font-black' : 'text-indigo-300 font-bold'}`}>{syncCheckResult.cloudData?.state?.level || 1}</div>

                          <div className="text-slate-500 font-medium">Treasure (Gold)</div>
                          <div className={`text-center font-mono text-sm ${localState?.coins > (syncCheckResult.cloudData?.state?.coins || 0) ? 'text-emerald-400 font-black' : 'text-slate-300 font-bold'}`}>{localState?.coins || 0}</div>
                          <div className={`text-center font-mono text-sm ${(syncCheckResult.cloudData?.state?.coins || 0) > (localState?.coins || 0) ? 'text-emerald-400 font-black' : 'text-indigo-300 font-bold'}`}>{syncCheckResult.cloudData?.state?.coins || 0}</div>

                          <div className="text-slate-500 font-medium">Total Sessions</div>
                          <div className={`text-center font-mono text-sm ${(localState?.history?.length || 0) > (syncCheckResult.cloudData?.state?.history?.length || 0) ? 'text-emerald-400 font-black' : 'text-slate-300 font-bold'}`}>{localState?.history?.length || 0}</div>
                          <div className={`text-center font-mono text-sm ${(syncCheckResult.cloudData?.state?.history?.length || 0) > (localState?.history?.length || 0) ? 'text-emerald-400 font-black' : 'text-indigo-300 font-bold'}`}>{syncCheckResult.cloudData?.state?.history?.length || 0}</div>

                          <div className="text-slate-500 font-medium">Device Name</div>
                          <div className="text-center text-[10px] text-slate-400 font-bold truncate bg-slate-900/50 py-1 rounded-md">
                            {localState?.deviceNickname || getDeviceType()}
                          </div>
                          <div className="text-center text-[10px] text-indigo-400/70 font-bold truncate bg-indigo-500/5 py-1 rounded-md">
                            {syncCheckResult.cloudData?.savedBy || syncCheckResult.cloudData?.state?.deviceNickname || syncCheckResult.cloudData?.state?.deviceType || 'Unknown'}
                          </div>

                          <div className="text-slate-500 font-medium">Device Code</div>
                          <div className="text-center text-[9px] text-slate-500 font-mono truncate bg-slate-800/30 py-1 rounded-md border border-slate-700/30">
                            {localState?.deviceCode?.substring(0, 8) || '?'}
                          </div>
                          <div className="text-center text-[9px] text-indigo-500/50 font-mono truncate bg-indigo-500/5 py-1 rounded-md border border-indigo-500/10">
                            {(syncCheckResult.cloudData?.savedByDeviceCode || syncCheckResult.cloudData?.state?.deviceCode)?.substring(0, 8) || '?'}
                          </div>

                          <div className="text-slate-500 font-medium">Timestamp</div>
                          <div className="text-center text-[9px] text-slate-500 leading-tight font-mono">
                            {localState?.lastUpdated ? new Date(localState.lastUpdated).toLocaleDateString() : 'Unknown'}
                            <br />
                            {localState?.lastUpdated ? new Date(localState.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                          <div className="text-center text-[9px] text-indigo-500/60 leading-tight font-mono">
                            {(syncCheckResult.cloudData?.lastUpdated || syncCheckResult.cloudData?.state?.lastUpdated) ? new Date(syncCheckResult.cloudData.lastUpdated || syncCheckResult.cloudData.state.lastUpdated).toLocaleDateString() : 'Unknown'}
                            <br />
                            {(syncCheckResult.cloudData?.lastUpdated || syncCheckResult.cloudData?.state?.lastUpdated) ? new Date(syncCheckResult.cloudData.lastUpdated || syncCheckResult.cloudData.state.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                      
                      {syncCheckResult.status === 'cloud_newer' ? (
                        <div className="text-sm text-slate-300 text-center font-medium leading-relaxed bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                          The <span className="text-indigo-400 font-bold">Cloud Save is newer</span>.<br/>
                          <span className="text-[12px] text-slate-400">Using the cloud save will overwrite your local device.<br/>If you upload your local save, it will permanently overwrite the cloud data.</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-300 text-center font-medium leading-relaxed bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          Your <span className="text-emerald-400 font-bold">Local Save is newer</span>.<br/>
                          <span className="text-[12px] text-slate-400">Uploading your local save will overwrite the cloud data.<br/>If you download the cloud save, it will permanently overwrite your local device.</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                        onClick={() => {
                          const cloudDeviceCode = syncCheckResult?.cloudData?.savedByDeviceCode || syncCheckResult?.cloudData?.state?.deviceCode || syncCheckResult?.cloudData?.deviceCode;
                          const localDeviceCode = localState?.deviceCode || getDeviceCode();
                          const identitiesMatch = cloudDeviceCode ? cloudDeviceCode === localDeviceCode : false;

                          if (!identitiesMatch) {
                            setConfirmDialog({
                              title: 'Upload Blocked',
                              message: 'Device code mismatch! The cloud save belongs to another device. You must Download Cloud Save first to inherit its identity before you can upload.',
                              action: () => setConfirmDialog(null),
                              isDestructive: true,
                              showComparison: false
                            });
                            return;
                          }

                          setConfirmDialog({
                            title: 'Upload Local Save?',
                            message: 'Your current local progress will overwrite the cloud save. This is permanent.',
                            action: () => onResolveConflict(false),
                            isDestructive: false,
                            showComparison: true
                          });
                        }}
                        className="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-center transition-all group active:scale-95 shadow-lg"
                      >
                        <span className="font-black text-slate-200 text-xs sm:text-sm block mb-1 uppercase tracking-widest">Upload Local Save</span>
                        <span className="text-[10px] text-slate-500 font-medium tracking-tight">
                          {(() => {
                            const cloudDeviceCode = syncCheckResult?.cloudData?.savedByDeviceCode || syncCheckResult?.cloudData?.state?.deviceCode || syncCheckResult?.cloudData?.deviceCode;
                            const localDeviceCode = localState?.deviceCode || getDeviceCode();
                            const identitiesMatch = cloudDeviceCode ? cloudDeviceCode === localDeviceCode : (!syncCheckResult?.cloudData?.savedBy || syncCheckResult?.cloudData?.savedBy === (localState?.deviceNickname || getDeviceType()));
                            return identitiesMatch ? "Overwrite Cloud with Local" : "BLOCKED (Device Mismatch)";
                          })()}
                        </span>
                      </button>
                      <button 
                        onClick={() => setConfirmDialog({
                          title: 'Use Cloud Save?',
                          message: 'The cloud save will completely overwrite your current progress. This action is irreversible.',
                          action: () => onResolveConflict(true),
                          isDestructive: true,
                          requiresTextConfirm: false,
                          showComparison: true
                        })}
                        className="p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-center transition-all group active:scale-95 shadow-lg shadow-indigo-500/5"
                      >
                        <span className="font-black text-indigo-400 text-xs sm:text-sm block mb-1 uppercase tracking-widest">Use Cloud Save</span>
                        <span className="text-[10px] text-indigo-400/60 font-medium tracking-tight">Overwrite Local with Cloud</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {syncProvider === 'Redis' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={inputCode}
                        onChange={handleInputChange}
                        placeholder="Enter 6-12 char code"
                        className="w-full bg-slate-950/50 border-b-2 border-slate-800 py-4 px-4 pr-12 text-center text-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-medium tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    
                    {!secretCode && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Generate
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (inputCode) {
                              navigator.clipboard.writeText(inputCode);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }
                          }}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {enhancedErr && (
                  <div className={`p-4 ${enhancedErr.bg} border ${enhancedErr.border} rounded-2xl space-y-3 shadow-inner`}>
                    <div className={`flex items-center gap-2 font-black uppercase tracking-widest text-[11px] ${enhancedErr.color}`}>
                      {enhancedErr.icon}
                      {enhancedErr.title}
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-xs text-slate-300 leading-relaxed">
                        <span className="text-slate-500 font-bold mr-1">Reason:</span>
                        {enhancedErr.reason}
                       </p>
                       <div className="h-px bg-slate-800/50 w-full" />
                       <p className="text-xs text-indigo-300/80 leading-relaxed italic">
                        <span className="text-slate-500 font-bold not-italic mr-1">Solution:</span>
                        {enhancedErr.solution}
                       </p>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                  {(syncProvider === 'Redis' && (!secretCode || secretCode !== inputCode)) ? (
                    <button 
                      onClick={() => onConnect(inputCode)}
                      disabled={!isInputValid || isSyncing}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Communing with Archives...
                        </>
                      ) : (
                        'Commune'
                      )}
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">
                        <Check size={18} />
                        <span className="text-sm font-bold">Bound to {syncProvider === 'Google Drive' ? 'Google Drive' : syncProvider === 'WebDAV' ? 'WebDAV' : 'Astral Archives'}</span>
                      </div>
                      
                      {onVerify && (
                        <button 
                          onClick={onVerify}
                          disabled={isSyncing}
                          className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50 text-indigo-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 border border-indigo-500/30"
                        >
                          <Search size={20} />
                          Verify & Compare Archives
                        </button>
                      )}

                      <button 
                        onClick={() => setConfirmDialog({
                          title: 'Force Sync',
                          message: 'This will overwrite the cloud save with your current local data. Are you sure you want to proceed?',
                          action: onManualSync,
                          showComparison: true
                        })}
                        disabled={isSyncing}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-2xl font-bold transition-colors flex items-center justify-center gap-3"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Inscribing...
                          </>
                        ) : (
                          <>
                            <Cloud size={20} />
                            Force Sync (Upload)
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => setConfirmDialog({
                          title: 'Download from Cloud',
                          message: 'This will overwrite your current local data with the data from the cloud. Are you sure you want to proceed?',
                          action: () => onConnect(secretCode || ''),
                          isDestructive: true,
                          requiresTextConfirm: false, // User requested no "Delete" typing for this
                          showComparison: true
                        })}
                        disabled={isSyncing}
                        className="w-full py-4 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-50 text-indigo-400 rounded-2xl font-bold border border-indigo-500/30 transition-colors flex items-center justify-center gap-3"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Communing...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={20} />
                            Download from Cloud
                          </>
                        )}
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setConfirmDialog({
                            title: 'Unbind Local',
                            message: 'This will disconnect your local app from the cloud. Your local data will remain, but it will no longer sync until you log in again.',
                            action: () => {
                              setInputCode('');
                              onUnbind();
                            }
                          })}
                          disabled={isSyncing}
                          className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Unlink size={16} />
                          Unbind Local
                        </button>
                        <button 
                          onClick={() => setConfirmDialog({
                            title: 'Delete Cloud Data',
                            message: 'This will permanently delete your save data from the cloud and unbind your local app. Your local data will NOT be affected. This action CANNOT be undone. Are you absolutely sure?',
                            isDestructive: true,
                            requiresTextConfirm: true,
                            action: () => {
                              setInputCode('');
                              onDeleteCloudData();
                            }
                          })}
                          disabled={isSyncing}
                          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Trash2 size={16} />
                          Delete Cloud
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
