import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer as TimerIcon, 
  Sword, 
  Target, 
  Trophy, 
  History, 
  Package, 
  PictureInPicture, 
  Maximize,
  Minimize,
  Sparkles,
  Layers,
  HelpCircle,
  Zap,
  Coins,
  BarChart3,
  X,
  Settings as SettingsIcon,
  Archive,
  Calendar,
  Sun
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../../hooks/useScrollLock';
import { generateRewardChoicesForSession } from '../../lib/rewardLogic';
import { PageHeader } from '../common/PageHeader';
import { Timer } from '../dashboard/Timer';
import { TimerSettings } from '../dashboard/TimerSettings';
import { useTimerStore } from '../../hooks/useTimerStore';
import { RecentSessions } from '../dashboard/RecentSessions';
import { TalentIcon } from '../talents/TalentIcon';
import { RewardChestModal } from '../modals/RewardChestModal';
import { TreasureChestIcon } from '../icons/TreasureChestIcon';
import { PopoverPortal } from '../common/PopoverPortal';
import { TALENTS } from '../../constants';
import { cn, getSessionEffectiveMinutes, getSessionSettlementDate, getSettlementDay } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { AppState, Dungeon, MajorDungeon, RewardCard } from '../../types';

interface ExploreViewProps {
  state: AppState;
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  currentDungeon: Dungeon | null;
  nextSessionStats: any;
  isTimerActive: boolean;
  setIsTimerActive: (active: boolean) => void;
  isResting: boolean;
  setIsResting: (resting: boolean) => void;
  duration: number;
  setDuration: (dur: number) => void;
  endTime: number | null;
  setEndTime: (time: number | null) => void;
  focusDuration: number;
  setFocusDuration: (dur: number) => void;
  restDuration: number;
  setRestDuration: (dur: number) => void;
  enableRest: boolean;
  setEnableRest: (enable: boolean) => void;
  isLooping: boolean;
  setIsLooping: (loop: boolean) => void;
  loopTarget: number;
  setLoopTarget: (val: number) => void;
  loopCount: number;
  setLoopCount: (val: number) => void;
  timerPresets: {focus: number, rest: number}[];
  addTimerPreset: (focus: number, rest: number) => void;
  removeTimerPreset: (focus: number, rest: number) => void;
  applyTimerPreset: (focus: number, rest: number) => void;
  handleTimerCustomChange: (focus: number, rest: number) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  setDungeonSubTab: (tab: any) => void;
  isFullscreenExplore: boolean;
  setIsFullscreenExplore: (full: boolean) => void;
  showCoinRain: boolean;
  setShowCoinRain: (show: boolean) => void;
  showBuildDetails: boolean;
  setShowBuildDetails: (show: boolean) => void;
  completeSession: (dungeonId: string | null, duration: number, fDur?: number, rDur?: number, customTimestamp?: number, distractions?: { internal: number; external: number; unavoidable: number }) => any;
  selectReward: (reward: any, sessionId: string) => void;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: 'Manual' | 'Immediate' | 'Interval polling' | 'Visibility API Active') => void;
  updateSession: (id: string, updates: any) => void;
  deleteSession: (id: string) => void;
  claimDailyTalentReward: (talentId: string) => void;
  bulkCreateSessions: (data: { count: number, objectiveId: string, startTime: string, endTime: string, focusDuration?: number, restDuration?: number }) => void;
  bulkDeleteSessions: (data: { startTime: string, endTime: string }) => void;
  setPipVictorySummary: (val: { xp: number, coins: number, ts: number } | null) => void;
  togglePip: () => void;
  pipWindow?: Window | null;
  canPip: boolean;
  isPWA: boolean;
  isDesktop: boolean;
  unclaimedQuestsCount: number;
  unclaimedAchievementsCount: number;
  openTimerSettings: () => void;
  setShowDailySummary: (show: boolean) => void;
  setShowStartOfDayModal: (val: string | boolean) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  state,
  dungeons,
  majorDungeons,
  currentDungeon,
  nextSessionStats,
  isTimerActive,
  setIsTimerActive,
  isResting,
  setIsResting,
  duration,
  setDuration,
  endTime,
  setEndTime,
  focusDuration,
  setFocusDuration,
  restDuration,
  setRestDuration,
  enableRest,
  setEnableRest,
  isLooping,
  setIsLooping,
  loopTarget,
  setLoopTarget,
  loopCount,
  setLoopCount,
  timerPresets,
  addTimerPreset,
  removeTimerPreset,
  applyTimerPreset,
  handleTimerCustomChange,
  activeTab,
  setActiveTab,
  setDungeonSubTab,
  isFullscreenExplore,
  setIsFullscreenExplore,
  showCoinRain,
  setShowCoinRain,
  showBuildDetails,
  setShowBuildDetails,
  completeSession,
  selectReward,
  setState,
  syncToCloud,
  updateSession,
  deleteSession,
  claimDailyTalentReward,
  bulkCreateSessions,
  bulkDeleteSessions,
  setPipVictorySummary,
  togglePip,
  pipWindow,
  canPip,
  isPWA,
  isDesktop,
  unclaimedQuestsCount,
  unclaimedAchievementsCount,
  openTimerSettings,
  setShowDailySummary,
  setShowStartOfDayModal
}) => {
  const [showChestModal, setShowChestModal] = React.useState(false);
  const [activeTalentPopover, setActiveTalentPopover] = React.useState<{ id: string; element: HTMLElement } | null>(null);

  const todayEffectiveMinutes = React.useMemo(() => {
    if (!state.history) return 0;
    const now = new Date();
    const todayStr = getSettlementDay(now, state.timeSettings);
    let sum = 0;
    state.history.forEach(s => {
      if (s.timestamp && getSessionSettlementDate(s, state.timeSettings) === todayStr) {
        sum += getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks);
      }
    });
    return Math.floor(sum);
  }, [state.history, state.timeSettings, state.includeRestTimeInTasks]);

  useScrollLock(showBuildDetails || showChestModal || isFullscreenExplore);


  // Close tooltip when clicking outside
  React.useEffect(() => {
    if (!activeTalentPopover) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.talent-icon-container') && !target.closest('.talent-popover-content')) {
        setActiveTalentPopover(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [activeTalentPopover]);

  // Handle WakeLock and orientation in fullscreen mode
  React.useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn(`WakeLock error: ${err.message}`);
      }
    };

    if (isFullscreenExplore) {
      // 1. Keep screen on
      requestWakeLock();
      
      // 2. Allow orientation change in fullscreen (unlock)
      try {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch(e) {}
    }

    return () => {
      if (wakeLockSentinel !== null) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [isFullscreenExplore]);

  // Handle jump to recent sessions from Stats
  const handleSaveNote = React.useCallback((sessionId: string, timestamp: number, duration: number, dungeonName: string, noteText: string) => {
    if (!noteText.trim()) return;

    // 1. Update the session with the note
    updateSession(sessionId, { note: noteText });

    // 2. Append to daily reflection
    const studyDate = new Date(timestamp);
    const dateStr = getSettlementDay(studyDate, state.timeSettings);
    
    setState(prev => {
      const existingLog = prev.dailyLogs?.[dateStr];
      const existingReflection = existingLog?.reflection || '';
      
      const timeStr = studyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const appendText = `- ${timeStr} - ${duration}m - ${dungeonName} - ${noteText}`;
      
      const newReflection = existingReflection ? `${existingReflection}\n${appendText}` : appendText;
      
      return {
        ...prev,
        dailyLogs: {
          ...(prev.dailyLogs || {}),
          [dateStr]: {
            ...(existingLog || {}),
            rating: existingLog?.rating || 3,
            reflection: newReflection
          }
        }
      };
    });
  }, [state.timeSettings, updateSession, setState]);

  React.useEffect(() => {
    const handleJump = (e: any) => {
      const timestamp = e.detail;
      // 1. If we are not in explore tab, go to explore first
      if (activeTab !== 'explore') {
        setActiveTab('explore');
      }
      
      // 2. Clear fullscreen if active
      if (isFullscreenExplore) {
        setIsFullscreenExplore(false);
      }

      // 3. Defer scroll and date jump logic to allow tab/view switches to settle
      setTimeout(() => {
        const anchor = document.getElementById('recent-sessions-anchor');
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.dispatchEvent(new CustomEvent('recentSessionsJumpToDate', { detail: timestamp }));
      }, 200);
    };

    window.addEventListener('statsJumpToRecentSessions', handleJump);
    return () => window.removeEventListener('statsJumpToRecentSessions', handleJump);
  }, [activeTab, isFullscreenExplore, setActiveTab, setIsFullscreenExplore]);
  
  const isMentalLimitReached = React.useMemo(() => {
    if (!state.limitedMentalEffort) return false;
    const timezone = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    let now = new Date();
    if (timezone) {
      try {
        const str = now.toLocaleString('en-US', { timeZone: timezone });
        now = new Date(str);
      } catch (e) {}
    }
    const ts = state.timeSettings || { morning: { start: 8, end: 12 }, afternoon: { start: 14, end: 18 }, night: { start: 20, end: 24 } };
    if (now.getHours() < ts.morning.start) {
      now.setDate(now.getDate() - 1);
    }
    const day = now.getDay();
    const dailyGoal = state.useSameDailyProgressGoalEveryDay ?? true 
      ? (state.dailyProgressGoal ?? 8) 
      : (state.dailyProgressGoalConfig?.[day] ?? 8);
    
    return state.dailySessions >= dailyGoal;
  }, [state]);

  const renderTimerContent = () => {
    if (isMentalLimitReached && !isTimerActive) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-3xl border border-slate-800/50 backdrop-blur-sm text-center max-w-sm mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <Calendar size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-50 mb-2">Goal Reached</h3>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            You've completed your daily progress goal. Limited Mental Effort mode is enabled, so it's time to rest and recharge.
          </p>
          <div className="w-full flex gap-2">
            <button
              onClick={() => {
                setShowStartOfDayModal(true);
              }}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Sun size={14} fill="currentColor" />
              Start Day
            </button>
            <button
              onClick={() => {
                setShowDailySummary(true);
                playSound('success', state.soundVolume, state.soundEnabled);
              }}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Calendar size={14} fill="currentColor" />
              End Day
            </button>
          </div>
        </div>
      );
    }

    const handleTimerStart = () => {
      const isTouchOrMobile = ('ontouchstart' in window) || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      
      if (isTouchOrMobile) {
        const autoFullscreen = state.timerMobileAutoFullscreen !== false; // Default is true
        if (autoFullscreen && !isFullscreenExplore) {
          setIsFullscreenExplore(true);
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }
      } else {
        const desktopAction = state.timerDesktopAutoAction || 'pip'; // Default is 'pip'
        if (desktopAction === 'pip') {
          if (!pipWindow && canPip) {
            togglePip();
          }
        } else if (desktopAction === 'fullscreen') {
          if (!isFullscreenExplore) {
            setIsFullscreenExplore(true);
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }
        }
      }
    };

    return (
      <Timer 
        currentDungeon={currentDungeon || null}
        rewardPool={state.rewardPool || []}
        activeTalents={state.activeTalents}
        timerSkipVictoryMode={state.timerSkipVictoryMode}
        dailyRerollUsed={state.dailyRerollUsed}
        history={state.history}
        standardSessionMinutes={state.standardSessionMinutes}
        pendingRewardChest={state.pendingRewardChest}
        critChance={state.devModeEnabled ? (state.devCritChance ?? 0.05) : 0.05}
        critMultiplier={state.devModeEnabled ? (state.devCritMultiplier ?? 5) : 5}
        onTimerStart={handleTimerStart}
        onComplete={(duration, fDur, rDur, distractions) => {
          const result = completeSession(state.currentDungeonId || null, duration, fDur, rDur, undefined, distractions);
          playSound('success', state.soundVolume, state.soundEnabled);
          if (result && state.secretCode) {
            syncToCloud(false, undefined, 'Manual');
          }
          
          if (result) {
            setPipVictorySummary({
              xp: result.xpEarned,
              coins: result.coinsEarned,
              ts: Date.now()
            });
          }
          
          return result;
        }}
        onRestComplete={() => {
          playSound('success', state.soundVolume, state.soundEnabled);
        }}
        onInventoryAdd={(id) => setState(prev => ({ ...prev, inventory: [...prev.inventory, id] }))}
        onReroll={() => setState(prev => ({ ...prev, dailyRerollUsed: true }))}
        onRewardSelect={(reward, sessionId) => {
          useTimerStore.getState().setActiveRewardSession(null);
          selectReward(reward, sessionId);
          playSound('reward', state.soundVolume, state.soundEnabled);
          if (state.secretCode) {
            syncToCloud(false, undefined, 'Manual');
          }
          setState(prev => ({
            ...prev,
            pendingRewardChest: prev.pendingRewardChest?.filter(item => item.session.id !== sessionId) || []
          }));
        }}
        onDeferReward={(session, choices) => {
          useTimerStore.getState().setActiveRewardSession(null);
          setState(prev => ({
            ...prev,
            pendingRewardChest: [...(prev.pendingRewardChest || []), { session, choices }]
          }));
        }}
        onUpdateChestItem={(sessionId, newChoices) => {
          setState(prev => ({
            ...prev,
            pendingRewardChest: prev.pendingRewardChest?.map(item => 
              item.session.id === sessionId ? { ...item, choices: newChoices } : item
            ) || []
          }));
        }}
        onSaveNote={handleSaveNote}
        setShowCoinRain={setShowCoinRain}
        isFullscreen={isFullscreenExplore}
        pipWindow={pipWindow}
        secretCode={state.secretCode}
        userName={state.userName}
        pushEnabled={state.pushEnabled}
        onTogglePip={togglePip}
        requireFocusConfirmation={state.requireFocusConfirmation}
        focusDuration={focusDuration}
        restDuration={restDuration}
        enableRest={enableRest}
        isLooping={isLooping}
        loopTarget={loopTarget}
        loopCount={loopCount}
        setLoopCount={setLoopCount}
        setIsResting={setIsResting}
        isResting={isResting}
        setDuration={setDuration}
        duration={duration}
        setIsActive={setIsTimerActive}
        isActive={isTimerActive}
        setEndTime={setEndTime}
        endTime={endTime}
      />
    );
  };

  return (
    <>
      {/* Fullscreen Focus Portal */}
      {isFullscreenExplore && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] w-full h-[100dvh] flex flex-col items-center justify-between py-6 sm:py-8 md:py-10 px-4 sm:px-6 overflow-hidden bg-slate-950 select-none">
          {/* Exit Fullscreen Button */}
          <button
            onClick={() => {
              setIsFullscreenExplore(false);
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="fixed top-5 sm:top-7 md:top-9 right-5 sm:right-7 md:right-9 z-50 p-2.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-all shadow-lg cursor-pointer"
            title="Exit Fullscreen"
          >
            <Minimize size={18} className="sm:w-5 sm:h-5" />
          </button>

          {/* Top Section: Dungeon Info & Progress Bar */}
          <div className="w-full max-w-sm sm:max-w-md shrink-0 flex items-center justify-center z-30">
            {currentDungeon && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-2 px-2"
              >
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs sm:text-sm font-black text-indigo-400 uppercase tracking-[0.15em] truncate max-w-[220px]">
                    {currentDungeon.name}
                  </span>
                  {currentDungeon.isOpenEnded ? (
                    <span className="text-xs sm:text-sm font-bold text-slate-400 tabular-nums">
                      {currentDungeon.totalFocusTime || 0}<span className="text-[10px] opacity-70 ml-[1px]">m</span> Focused
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-slate-400 tabular-nums">
                      {Math.floor(currentDungeon.completedSessions * (state.standardSessionMinutes || 25))}<span className="text-[10px] opacity-70 ml-[1px]">m</span> <span className="opacity-50 text-[10px] mx-[1px]">/</span> {currentDungeon.totalSessions * (state.standardSessionMinutes || 25)}<span className="text-[10px] opacity-70 ml-[1px]">m</span>
                    </span>
                  )}
                </div>
                {!currentDungeon.isOpenEnded && (
                  <div className="h-2 flex w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (currentDungeon.completedSessions / currentDungeon.totalSessions) * 100)}%` }}
                      className={cn("h-full", currentDungeon.status === 'completed' ? "bg-emerald-500" : "bg-indigo-500")}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Centered Timer Content - Responsive flex layout */}
          <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden my-auto">
            {renderTimerContent()}
          </div>
        </div>,
        document.body
      )}

      {/* Standard Explore View */}
      <motion.div
        key="explore"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8"
      >
        <PageHeader 
          title="Explore"
          description="Venture into the unknown and sharpen your mind"
          icon={TimerIcon}
        />

        <div className="w-full flex-1 min-h-0 flex flex-col">
          <div className="w-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_440px] 2xl:grid-cols-[1fr_500px] gap-6 xl:gap-8 2xl:gap-12 pb-4 lg:pb-0 h-full lg:h-[calc(100dvh-12rem)] lg:min-h-[600px]">
            {/* Left Column: Timer & Timer Settings area */}
            <div className="w-full h-full flex flex-col min-h-0 gap-6">
              <div className="flex flex-col flex-1 min-h-0 bg-slate-900/20 rounded-[2.5rem] border border-slate-800/50 overflow-hidden">
                {/* Top Banner: Navigation & Controls */}
                <div className="flex items-center bg-slate-900/40 border-b border-slate-800/50 p-3 px-5 backdrop-blur-sm shrink-0 justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={openTimerSettings}
                      className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group"
                      title="Timer Settings"
                    >
                      <SettingsIcon size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                    {!state.timerBannerCompactMode && (
                      <>
                        <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>
                        {(!state.timerBannerShortcuts || state.timerBannerShortcuts.includes('dungeons')) && (
                        <button
                          onClick={() => { setActiveTab('dungeons'); setDungeonSubTab('list'); }}
                          className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group"
                          title="Dungeons"
                        >
                          <Sword size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                      {(!state.timerBannerShortcuts || state.timerBannerShortcuts.includes('quests')) && (
                        <button
                          onClick={() => { setActiveTab('dungeons'); setDungeonSubTab('quests'); }}
                          className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group relative"
                          title="Quests"
                        >
                          <Target size={16} className="group-hover:scale-110 transition-transform" />
                          {unclaimedQuestsCount > 0 && state.questNotificationStyle === 'red_dot' && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full border border-slate-900" />
                          )}
                        </button>
                      )}
                      {(!state.timerBannerShortcuts || state.timerBannerShortcuts.includes('achievements')) && (
                        <button
                          onClick={() => { setActiveTab('dungeons'); setDungeonSubTab('achievements'); }}
                          className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group relative"
                          title="Achievements"
                        >
                          <Trophy size={16} className="group-hover:scale-110 transition-transform" />
                          {unclaimedAchievementsCount > 0 && state.questNotificationStyle === 'red_dot' && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full border border-slate-900" />
                          )}
                        </button>
                      )}
                      {(!state.timerBannerShortcuts || (state.timerBannerShortcuts.includes('dungeons') || state.timerBannerShortcuts.includes('quests') || state.timerBannerShortcuts.includes('achievements')) && (state.timerBannerShortcuts.includes('recent') || state.timerBannerShortcuts.includes('vault'))) && (
                        <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>
                      )}
                      {(!state.timerBannerShortcuts || state.timerBannerShortcuts.includes('recent')) && (
                        <button
                          onClick={() => {
                            // If we are not in explore tab, go to explore first
                            if (activeTab !== 'explore') {
                              setActiveTab('explore');
                              setTimeout(() => document.getElementById('recent-sessions-anchor')?.scrollIntoView({ behavior: 'smooth' }), 100);
                            } else {
                              document.getElementById('recent-sessions-anchor')?.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group"
                          title="Recent Sessions"
                        >
                          <History size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                      {(!state.timerBannerShortcuts || state.timerBannerShortcuts.includes('vault')) && (
                        <button
                          onClick={() => setActiveTab('vault')}
                          className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group"
                          title="Vault"
                        >
                          <Package size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {state.pendingRewardChest && state.pendingRewardChest.length > 0 && (
                      <button 
                        onClick={() => setShowChestModal(true)}
                        className="relative p-2 bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 hover:text-amber-300 rounded-xl transition-all border border-slate-700/50 hover:border-amber-500/30 group"
                        title="Reward Chest"
                      >
                        <TreasureChestIcon size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
                      </button>
                    )}
                    {canPip && typeof window !== 'undefined' && /Win|Mac/i.test(navigator.userAgent || navigator.platform) && (
                      <button 
                        onClick={togglePip}
                        className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group"
                        title="Floating Mini Timer (Always on Top)"
                      >
                        <PictureInPicture size={16} className="group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setIsFullscreenExplore(true);
                        if (document.documentElement.requestFullscreen) {
                          document.documentElement.requestFullscreen().catch(() => {});
                        }
                      }}
                      className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 rounded-xl transition-all border border-slate-700/50 hover:border-indigo-500/30 group"
                      title="Fullscreen Mode"
                    >
                      <Maximize size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative py-2 sm:py-6 flex flex-col items-center justify-center min-h-0 w-full h-full">
                  {renderTimerContent()}
                </div>
              </div>
            </div>

            {/* Right Column: Active Talents & Current Build */}
            <div className="w-full h-full flex flex-col gap-6 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              {/* Timer Settings (Moved Here for Wide Screens) */}
              <TimerSettings 
                focusDuration={focusDuration}
                setFocusDuration={setFocusDuration}
                restDuration={restDuration}
                setRestDuration={setRestDuration}
                enableRest={enableRest}
                setEnableRest={setEnableRest}
                isLooping={isLooping}
                setIsLooping={setIsLooping}
                loopTarget={loopTarget}
                setLoopTarget={setLoopTarget}
                loopCount={loopCount}
                setLoopCount={setLoopCount}
                isActive={isTimerActive}
                isResting={isResting}
                applyPreset={applyTimerPreset}
                handleCustomChange={handleTimerCustomChange}
                presets={timerPresets}
                addPreset={addTimerPreset}
                removePreset={removeTimerPreset}
              />

              {/* Active Talents */}
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm shrink-0">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Sparkles size={14} className="text-indigo-400" />
                  Active Talents
                </h3>
                
                <div className="flex flex-wrap gap-4 justify-start">
                  {state.activeTalents.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No talents active...</p>
                  ) : (
                    state.activeTalents
                      .map(id => TALENTS.find(t => t.id === id))
                      .filter((t): t is typeof TALENTS[0] => !!t)
                      .sort((a, b) => {
                        if (a.branch !== b.branch) {
                          return a.branch.localeCompare(b.branch);
                        }
                        return a.tier - b.tier;
                      })
                      .map(talent => {
                        const branchColors: Record<string, string> = {
                          'A': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                          'B': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                          'C': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        };
                        const colorClass = branchColors[talent.branch] || 'text-slate-400 bg-slate-800 border-slate-700';
                        const isSelected = activeTalentPopover?.id === talent.id;
                        
                        return (
                          <div 
                            key={talent.id} 
                            className="group relative hover:z-[100] talent-icon-container"
                            onMouseEnter={(e) => {
                              setActiveTalentPopover({ id: talent.id, element: e.currentTarget });
                            }}
                            onMouseLeave={() => {
                              setActiveTalentPopover((prev) => (prev?.id === talent.id ? null : prev));
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeTalentPopover?.id === talent.id) {
                                setActiveTalentPopover(null);
                              } else {
                                setActiveTalentPopover({ id: talent.id, element: e.currentTarget });
                              }
                            }}
                          >
                            <div className={cn(
                              "w-12 h-12 flex items-center justify-center rounded-xl border transition-all hover:scale-110 cursor-pointer",
                              colorClass,
                              isSelected && "ring-2 ring-indigo-500 scale-110 bg-indigo-500/20 border-indigo-500/40"
                            )}>
                              <TalentIcon iconName={talent.icon || 'Scroll'} size={24} />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                <PopoverPortal anchorElement={activeTalentPopover?.element || null} offsetY={12}>
                  {activeTalentPopover && (() => {
                    const talent = TALENTS.find(t => t.id === activeTalentPopover.id);
                    if (!talent) return null;

                    const branchColors: Record<string, string> = {
                      'A': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                      'B': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      'C': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    };

                    return (
                      <div 
                        className="talent-popover-content bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl w-[260px] sm:w-[280px] animate-popover-enter"
                        onMouseEnter={() => {
                          // Keep open when hovering the popover
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={cn("text-sm font-black mb-1", branchColors[talent.branch]?.split(' ')[0] || 'text-indigo-400')}>
                          {talent.name}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {talent.description}
                        </p>
                        
                        {['a2', 'a3', 'b2', 'b3'].includes(talent.id) && (() => {
                          let requiredMinutes = 480;
                          if (talent.id === 'a3' || talent.id === 'b3') requiredMinutes = 240;
                          const currentMinutes = todayEffectiveMinutes;
                          const canClaim = currentMinutes >= requiredMinutes;
                          const hasClaimed = state.claimedDailyTalents?.includes(talent.id);

                          return (
                            <div className="mt-3 bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex flex-col items-center gap-2">
                              <div className="w-full flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                                <span>Daily Time Required</span>
                                <span>{Math.floor(currentMinutes)} / {requiredMinutes}m</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-300", 
                                    canClaim && !hasClaimed ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-indigo-500/50"
                                  )}
                                  style={{ width: `${Math.min(100, (currentMinutes / requiredMinutes) * 100)}%` }}
                                />
                              </div>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canClaim && !hasClaimed) {
                                    claimDailyTalentReward(talent.id);
                                  }
                                }}
                                disabled={!canClaim || hasClaimed}
                                className={cn(
                                  "w-full mt-2 py-1.5 rounded-lg text-xs font-bold uppercase transition-all",
                                  hasClaimed 
                                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                                    : canClaim 
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-emerald-950 cursor-pointer shadow-[0_0_10px_rgba(52,211,153,0.2)] hover:shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                                      : "bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                                )}
                              >
                                {hasClaimed ? 'Claimed Today' : canClaim ? 'Claim Reward' : 'Not Reached'}
                              </button>

                              {(talent.id === 'a3' || talent.id === 'b3') && (
                                <div className="w-full mt-1 pt-2 border-t border-slate-800 flex flex-col gap-1 text-[10px] text-slate-400">
                                  <div className="flex justify-between">
                                    <span>Current Streak:</span>
                                    <span className="font-bold text-orange-400">{state.streak > 10 ? 'Max (≥10)' : `${Math.max(0, state.streak)} Days`}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Yield:</span>
                                    <span className="font-bold">{talent.id === 'a3' ? `${20 * Math.min(10, Math.max(state.streak, 0))} XP` : `${10 * Math.min(10, Math.max(state.streak, 0))} Coins`}</span>
                                  </div>
                                  {state.streak >= 10 && (
                                    <div className="flex justify-between text-rose-400 font-bold">
                                      <span>Day 10 Bonus:</span>
                                      <span>+{talent.id === 'a3' ? '1000 XP' : '100 Coins'}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", branchColors[talent.branch]?.split(' ')[1] || 'bg-indigo-400')} />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Branch {talent.branch} • Tier {talent.tier}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </PopoverPortal>
              </div>

              {/* Current Build */}
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm shrink-0 lg:shrink lg:flex-1 min-h-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} className="text-indigo-400" />
                      Current Build
                    </h3>
                    <button 
                      onClick={() => setShowBuildDetails(true)}
                      className="p-1 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-slate-800"
                      title="View Reward Breakdown"
                    >
                      <HelpCircle size={16} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Next XP Gain</span>
                      <span className="text-sm font-bold text-emerald-400">+{nextSessionStats.xp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Next Gold Gain</span>
                      <span className="text-sm font-bold text-amber-400">
                        +{nextSessionStats.minCoins === nextSessionStats.maxCoins 
                          ? nextSessionStats.minCoins 
                          : `${nextSessionStats.minCoins}-${nextSessionStats.maxCoins}`}
                      </span>
                    </div>
                    <div className="h-px bg-slate-800" />
                  </div>
                </div>
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Daily Sessions</span>
                    <span className="text-sm font-bold text-white">
                      {Math.floor(todayEffectiveMinutes)}m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">No-Damage Streak</span>
                    <span className="text-sm font-bold text-indigo-400">{state.streak}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="recent-sessions-anchor" className="mt-8 shrink-0 w-full px-4 sm:px-6 lg:px-8">
          <RecentSessions 
            history={state.history}
            dungeons={dungeons}
            majorDungeons={majorDungeons}
            updateSession={updateSession}
            deleteSession={deleteSession}
            bulkCreateSessions={bulkCreateSessions}
            bulkDeleteSessions={bulkDeleteSessions}
            rewardPool={state.rewardPool}
            timeSettings={state.timeSettings}
            includeRestTimeInTasks={!!state.includeRestTimeInTasks}
          />
        </div>

      {createPortal(
        <AnimatePresence>
          {showBuildDetails && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm border-0 m-0">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative z-10"
              >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="text-indigo-400" />
                    Reward Breakdown
                  </h3>
                  <button 
                    onClick={() => setShowBuildDetails(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    {nextSessionStats.breakdown.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <span className="text-sm font-medium text-slate-300">{item.source}</span>
                        <div className="flex items-center gap-3">
                          {item.xpEffect && (
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <Zap size={12} /> {item.xpEffect}
                            </span>
                          )}
                          {item.coinEffect && (
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                              <Coins size={12} /> {item.coinEffect}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-400">Total Expected XP</span>
                      <span className="text-lg font-black text-emerald-400">+{nextSessionStats.xp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-400">Total Expected Gold</span>
                      <span className="text-lg font-black text-amber-400">
                        +{nextSessionStats.minCoins === nextSessionStats.maxCoins 
                          ? nextSessionStats.minCoins 
                          : `${nextSessionStats.minCoins}-${nextSessionStats.maxCoins}`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      {showChestModal && state.pendingRewardChest && (
        <RewardChestModal
          chest={state.pendingRewardChest}
          activeTalents={state.activeTalents}
          onRerollItem={(index) => {
            if (state.pendingRewardChest) {
              const newChest = [...state.pendingRewardChest];
              const session = newChest[index].session;
              const generated = generateRewardChoicesForSession(session, {
                rewardPool: state.rewardPool || [],
                activeTalents: state.activeTalents,
                pendingRewardChest: newChest,
                standardSessionMinutes: state.standardSessionMinutes
              });
              if (generated.length > 0) {
                newChest[index] = { ...newChest[index], choices: generated[0].choices };
                setState(prev => ({ ...prev, pendingRewardChest: newChest }));
                playSound('gacha', state.soundVolume, state.soundEnabled);
              }
            }
          }}
          getDungeonName={(dlId) => {
             return dungeons.find(d => d.id === dlId)?.name || 'Free Study';
          }}
          onSelect={(reward, sessionId, isAutoPick) => {
            if (reward) {
              selectReward(reward, sessionId);
              if (reward.type === 'item' && reward.itemType !== 'talent_shard' && reward.itemType !== 'death_defying_medal') {
                setState(prev => ({ ...prev, inventory: [...(prev.inventory || []), reward.id] }));
              }
            }
            // remove this session from pending chest
            setState(prev => ({
              ...prev,
              pendingRewardChest: prev.pendingRewardChest?.filter(item => item.session.id !== sessionId) || []
            }));
            
            // if empty, close it ONLY IF NOT AUTOPICK
            const wasEmptyAfterSelect = state.pendingRewardChest?.filter(item => item.session.id !== sessionId).length === 0;
            if (wasEmptyAfterSelect && !isAutoPick) {
              setShowChestModal(false);
            }
          }}
          onClose={() => setShowChestModal(false)}
          onNavigateToVault={() => {
            setShowChestModal(false);
            setActiveTab('vault');
          }}
        />
      )}
    </motion.div>
  </>
  );
};
