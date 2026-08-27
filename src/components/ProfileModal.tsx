import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings as SettingsIcon, 
  X, 
  Coins, 
  Zap, 
  Trophy, 
  Star,
  Scroll, 
  RefreshCw,
  Cloud,
  CheckCircle2,
  WifiOff,
  Flame,
  PencilLine,
  Cat,
  Dog,
  Ghost,
  Bot,
  Skull
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { AppState } from '../types';
import { cn, getXPForLevel, getDefaultRewardForLevel, getTitleForLevel } from '../lib/utils';
import { format, subDays, parseISO } from 'date-fns';
import { ConfirmModal } from './ConfirmModal';
import { StreakRecordModal } from './StreakRecordModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  editName: string;
  setEditName: (val: string) => void;
  editBio: string;
  setEditBio: (val: string) => void;
  editAvatar: string;
  setEditAvatar: (val: string) => void;
  handleSaveProfile: () => void;
  setShowCloudSync: (val: boolean) => void;
  setActiveTab: (tab: any) => void;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
  triggerSyncCheck?: (forceModal?: boolean) => void;
  isTalentLevel: (lvl: number) => boolean;
  getNextTalentLevel: (lvl: number, rewards?: any[]) => number;
  repairStreak: (dateStr: string) => void;
  openGuideBook?: (chapter: number) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  state,
  isEditingProfile,
  setIsEditingProfile,
  editName,
  setEditName,
  editBio,
  setEditBio,
  editAvatar,
  setEditAvatar,
  handleSaveProfile,
  setShowCloudSync,
  setActiveTab,
  isSyncing,
  hasUnsyncedChanges,
  triggerSyncCheck,
  isTalentLevel,
  getNextTalentLevel,
  repairStreak,
  openGuideBook
}) => {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [patchCandidate, setPatchCandidate] = useState<string | null>(null);
  
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset nameError if they change editing state
  useEffect(() => {
    setNameError(null);
  }, [editName, isEditingProfile]);

  const handleValidateAndPreSave = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setNameError("Nickname cannot be empty");
      return;
    }

    const hasChinese = /[\u4e00-\u9fa5]/.test(editName);
    if (hasChinese && editName.length > 10) {
      setNameError("Chinese nickname must not exceed 10 characters");
      return;
    }
    if (!hasChinese && editName.length > 15) {
      setNameError("Nickname must not exceed 15 characters");
      return;
    }

    setNameError(null);
    setShowConfirmSave(true);
  };

  const handleConfirmSave = () => {
    handleSaveProfile();
    setShowConfirmSave(false);
  };

  const AvatarIcon = {
    User, Cat, Dog, Ghost, Bot, Skull
  }[state.userAvatar || 'User'] || User;

  const ActiveEditAvatarIcon = {
    User, Cat, Dog, Ghost, Bot, Skull
  }[editAvatar || 'User'] || User;

  const availableAvatars = ['User', 'Cat', 'Dog', 'Ghost', 'Bot', 'Skull'];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hasStudiedToday = (() => {
    const dates = new Set<string>();
    state.history.forEach(session => {
      dates.add(format(parseISO(session.timestamp), 'yyyy-MM-dd'));
    });
    (state.patchedDays || []).forEach(d => dates.add(d));
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return dates.has(todayStr);
  })();

  const streakData = showStreakModal ? (() => {
    const dates = new Set<string>();
    state.history.forEach(session => {
      dates.add(format(parseISO(session.timestamp), 'yyyy-MM-dd'));
    });
    (state.patchedDays || []).forEach(d => dates.add(d));

    const result = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const str = format(d, 'yyyy-MM-dd');
      const isCompleted = dates.has(str);
      const isPatched = (state.patchedDays || []).includes(str);
      result.push({
        dateStr: str,
        shortDate: format(d, 'MM/dd'),
        displayLabel: format(d, 'eee'), // Mon, Tue, etc.
        isCompleted,
        isPatched,
        isToday: i === 0,
        canPatch: !isCompleted && i !== 0 // Can patch if not completed and not today
      });
    }
    return result;
  })() : [];

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div key="main-profile" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-950 w-full max-w-xl rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col relative"
        >
          <div className="relative p-4 sm:p-8 pr-12 sm:pr-24 flex justify-between items-start shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-slate-900 flex items-center justify-center text-indigo-400 relative overflow-hidden">
                  {isEditingProfile ? (
                    <ActiveEditAvatarIcon className="w-10 h-10 sm:w-14 sm:h-14" />
                  ) : (
                    <AvatarIcon className="w-10 h-10 sm:w-14 sm:h-14" />
                  )}
                  <div className="absolute inset-0 bg-indigo-500/5 transition-opacity transition-opacity" />
                </div>
                <div className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 w-8 h-8 sm:w-12 sm:h-12 bg-slate-950 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-slate-950 flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-sm sm:text-lg">
                    {state.level}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1 flex-grow w-full">
                {isEditingProfile ? (
                  <div className="space-y-3 w-full">
                    <div className="space-y-1">
                      <input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-transparent border-b-2 border-indigo-500 text-2xl sm:text-3xl font-black text-white tracking-tight italic pr-1 uppercase focus:outline-none w-full"
                        placeholder="Your Name"
                        autoFocus
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold tracking-wider pt-0.5">
                        <span>
                          {/[\u4e00-\u9fa5]/.test(editName) ? "Chinese Character Mode" : "Latin Character Mode"}
                        </span>
                        <span className={cn(
                          ((/[\u4e00-\u9fa5]/.test(editName) && editName.length > 10) || (!/[\u4e00-\u9fa5]/.test(editName) && editName.length > 15)) 
                            ? "text-rose-400 font-black animate-pulse" 
                            : "text-slate-400"
                        )}>
                          {editName.length} / {/[\u4e00-\u9fa5]/.test(editName) ? 10 : 15} max
                        </span>
                      </div>
                      {nameError && (
                        <p className="text-[11px] text-rose-400 font-bold mt-1 tracking-wide">{nameError}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <input 
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="bg-transparent border-b border-slate-700 text-sm sm:text-base text-slate-400 font-medium focus:outline-none w-full"
                        placeholder="Your Signature"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 py-1">
                      {availableAvatars.map(av => {
                        const IconComponent = { User, Cat, Dog, Ghost, Bot, Skull }[av as keyof typeof availableAvatars] || User;
                        return (
                          <button
                            key={av}
                            onClick={() => setEditAvatar(av)}
                            className={cn(
                              "p-2 rounded-xl border transition-all",
                              editAvatar === av 
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" 
                                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                            )}
                          >
                            <IconComponent size={20} />
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-1 w-full max-w-xs">
                      <button onClick={handleValidateAndPreSave} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">Save</button>
                      <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <div className="flex items-center justify-between gap-3 w-full">
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight italic pr-1 uppercase truncate flex-grow">
                        {state.userName || 'Scholar'}
                      </h2>
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-800 rounded-lg sm:rounded-xl text-slate-500 hover:text-indigo-400 transition-all border border-slate-800 shrink-0"
                      >
                        <PencilLine size={16} />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium line-clamp-2">{state.userBio || 'Master of the Study Dungeon'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 font-mono">
                      {state.userUniqueId && (
                        <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 text-[9px] sm:text-[10px] font-bold rounded-md border border-slate-500/20 pr-1">
                          #{state.userUniqueId.startsWith('SD-') ? state.userUniqueId.replace('SD-', 'ID-') : state.userUniqueId}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-500/20 pr-1">
                        {getTitleForLevel(state.level)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white rounded-xl sm:rounded-2xl transition-all border border-slate-800 shrink-0 z-10"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="px-4 sm:px-8 pb-4 sm:pb-8 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-8 relative z-10">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="p-3 sm:p-5 bg-slate-900/50 rounded-2xl sm:rounded-[2rem] border border-slate-800 hover:border-amber-500/30 transition-colors group">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-1 sm:mb-3 gap-1 sm:gap-0">
                  <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg sm:rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                    <Coins size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Gold</span>
                </div>
                <div className="text-lg sm:text-2xl font-black text-white tracking-tight text-center sm:text-left">
                  {state.coins.toLocaleString()}
                </div>
              </div>
              
              <div className="p-3 sm:p-5 bg-slate-900/50 rounded-2xl sm:rounded-[2rem] border border-slate-800 hover:border-indigo-500/30 transition-colors group">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-1 sm:mb-3 gap-1 sm:gap-0">
                  <div className="p-1.5 sm:p-2 bg-indigo-500/10 rounded-lg sm:rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                    <Scroll size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Scroll</span>
                </div>
                <div className="text-lg sm:text-2xl font-black text-white tracking-tight text-center sm:text-left">
                  {state.talentPoints}
                </div>
              </div>

              <div 
                onClick={() => setShowStreakModal(true)}
                className="p-3 sm:p-5 bg-slate-900/50 rounded-2xl sm:rounded-[2rem] border border-slate-800 hover:border-orange-500/30 transition-colors group cursor-pointer relative"
              >
                <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-1 sm:mb-3 gap-1 sm:gap-0">
                  <div className="relative p-1.5 sm:p-2 bg-orange-500/10 rounded-lg sm:rounded-xl text-orange-400 group-hover:scale-110 transition-transform">
                    <Flame size={16} className="sm:w-5 sm:h-5" />
                    {!hasStudiedToday && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-slate-900 shadow-sm rounded-full flex items-center justify-center text-[9px] font-black text-white">
                        !
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Streak</span>
                </div>
                <div className="text-lg sm:text-2xl font-black text-white tracking-tight text-center sm:text-left">
                  {state.streak}
                </div>
              </div>
            </div>

            {/* XP & Leveling Card */}
            <div className="p-4 sm:p-8 bg-slate-900 rounded-2xl sm:rounded-[2.5rem] border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-20 h-20 sm:w-[120px] sm:h-[120px] text-indigo-500" />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-end mb-4 sm:mb-6">
                  <div>
                    <h4 className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Experience Progress</h4>
                    <div className="text-2xl sm:text-3xl font-black text-white italic pr-1 uppercase tracking-tighter">Level {state.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Next Level</div>
                    <div className="text-base sm:text-xl font-black text-white">{state.xp} <span className="text-slate-600 text-xs sm:text-base">/ {getXPForLevel(state.level)} XP</span></div>
                  </div>
                </div>
                
                <div className="relative h-3 sm:h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-4 sm:mb-6">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(state.xp / getXPForLevel(state.level)) * 100}%` }}
                    className="h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </motion.div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-indigo-500/5 rounded-xl sm:rounded-2xl border border-indigo-500/10">
                  <div className="p-1.5 sm:p-2 bg-indigo-500/20 rounded-lg">
                    <Scroll size={16} className="sm:w-5 sm:h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[8px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-widest">Next Reward</p>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      {(() => {
                        const nextLevel = state.level + 1;
                        const customReward = state.levelRewards?.find(r => r.level === nextLevel);
                        const defaultReward = getDefaultRewardForLevel(nextLevel);
                        const rewardToUse = customReward || defaultReward;
                        if (!rewardToUse) return 'No specific reward';
                        if (rewardToUse.type === 'text') return (rewardToUse as any).rewardText;
                        if (rewardToUse.type === 'talentPoint') return `+${rewardToUse.amount} Talent Scroll${rewardToUse.amount > 1 ? 's' : ''}`;
                        if (rewardToUse.type === 'coins') return `+${rewardToUse.amount} Gold`;
                        return 'Unknown Reward';
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Info */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-6">
              {/* Sync Status Module */}
              <div className="p-4 sm:p-5 bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className={state.secretCode || state.syncProvider ? "text-indigo-400" : "text-slate-500"} />
                    <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest">Cloud Sync Status</h4>
                  </div>
                  <div>
                    {!isOnline ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-700 w-max">
                        <WifiOff size={10} /> Offline
                      </span>
                    ) : isSyncing ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-amber-500/20 w-max">
                        <RefreshCw size={10} className="animate-spin" /> Syncing
                      </span>
                    ) : (state.secretCode || state.syncProvider) ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-emerald-500/20">
                          <CheckCircle2 size={10} /> Active
                        </span>
                        {hasUnsyncedChanges && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-rose-500/20 animate-pulse">
                            Unsynced
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-700">
                        <X size={10} /> Inactive
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Provider</span>
                    <span className="text-slate-300 font-bold">{state.syncProvider || (state.secretCode ? 'Redis' : 'None')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Save State</span>
                    <span className={cn("font-bold", hasUnsyncedChanges ? "text-rose-500" : "text-emerald-400")}>
                      {hasUnsyncedChanges ? 'Unsynced' : 'Up to Date'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Last Updated</span>
                    <span className="text-slate-300 font-medium">
                        {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  {(state.secretCode || state.syncProvider) && triggerSyncCheck && (
                    <button 
                      onClick={() => triggerSyncCheck(true)}
                      disabled={isSyncing}
                      className="mt-2 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50 text-indigo-400 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2 border border-indigo-500/20 active:scale-[0.98]"
                    >
                      <RefreshCw size={12} className={cn(isSyncing && "animate-spin")} /> 
                      Verify & Compare Archives
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-2">
                <button 
                  onClick={() => { setActiveTab('settings'); onClose(); }}
                  className="flex-1 py-3 sm:py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 border border-slate-800"
                >
                  <SettingsIcon size={16} />
                  System Settings
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-xl shadow-indigo-500/20"
                >
                  Return to Dungeon
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {showStreakModal && (
        <StreakRecordModal
          state={state}
          onClose={() => setShowStreakModal(false)}
          repairStreak={repairStreak}
          openGuideBook={openGuideBook}
        />
      )}

      {showConfirmSave && (
        <ConfirmModal
          isOpen={showConfirmSave}
          onClose={() => setShowConfirmSave(false)}
          onConfirm={handleConfirmSave}
          title="Confirm Profile Changes"
          message="Please note that this nickname will be displayed publicly to others and will be used to address you in notifications."
          confirmText="Confirm & Save"
          cancelText="Cancel"
          type="info"
        />
      )}
      
    </AnimatePresence>,
    document.body
  );
};
