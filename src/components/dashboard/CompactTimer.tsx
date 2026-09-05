import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Coffee, Play, Pause, RotateCcw, SkipForward, Trophy, Zap, Coins, Brain, Wind, Package, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Dungeon, RewardCard, StudySession } from '../../types';
import { useTimerStore } from '../../hooks/useTimerStore';
import { useDistractionButton } from '../../hooks/useLongPress';
import { playSound } from '../../lib/sound';

interface CompactTimerProps {
  endTime: number | null;
  isActive: boolean;
  isResting: boolean;
  currentDungeon: Dungeon | null;
  duration: number;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  timerSkipVictoryMode?: 'none' | 'auto_pick_highest' | 'skip_rewards' | 'defer_to_chest';
  requireFocusConfirmation?: boolean;
  lastCompletionRewards?: any | null;
  pipVictorySummary?: { xp: number, coins: number, ts: number } | null;
  standardSessionMinutes?: number;
  onRewardSelect?: (reward: RewardCard, sessionId: string) => void;
  onInventoryAdd?: (id: string) => void;
  onDeferReward?: (session: StudySession, choices: RewardCard[]) => void;
  onStartFocus?: () => void;
}

const PIP_STYLE = `
  .pip-container { padding: 1rem 1.25rem 0.5rem 1.25rem; justify-content: space-between; }
  .pip-dungeon-mb { margin-bottom: 0.75rem; }
  .pip-icon svg { width: 14px; height: 14px; }
  .pip-title { font-size: 0.75rem; }
  .pip-stats { font-size: 10px; }
  .pip-bar { height: 0.375rem; }
  .pip-countdown-container { flex-direction: column; padding: 0; }
  .pip-time { font-size: 4.25rem; line-height: 1; }
  .pip-status { font-size: 0.75rem; margin-top: 0.5rem; }
  .pip-status svg { width: 14px; height: 14px; }
  .pip-status-short { display: none; }
  .pip-status-long { display: block; }
  .pip-controls-condensed { display: none; }
  .pip-controls-minimal { display: none; }
  .pip-controls-standard { display: flex; }
  .pip-distractions-standard { display: flex; margin-bottom: 0; }
  .pip-distractions-minimal { display: none; }
  .pip-overlay-standard { display: flex; }
  .pip-overlay-condensed { display: none; }
  .pip-overlay-minimal { display: none; }

  /* Mode 2: Condensed Horizontal Split (166px <= height <= 240px) */
  @media (max-height: 240px) and (min-height: 166px), (max-width: 180px) and (min-height: 166px) {
    .pip-container { padding: 0.5rem 0.625rem 0.25rem 0.625rem; justify-content: space-between; }
    .pip-dungeon-mb { margin-bottom: 0.25rem; }
    .pip-icon svg { width: 10px; height: 10px; }
    .pip-title { font-size: 10px; }
    .pip-stats { font-size: 8px; }
    .pip-bar { height: 0.25rem; }
    .pip-countdown-container { flex-direction: row; justify-content: space-between; padding-left: 0.25rem; padding-right: 0.25rem; }
    .pip-time { font-size: 2.75rem; line-height: 1; }
    .pip-status { font-size: 8px; margin-top: 0.125rem; }
    .pip-status svg { width: 10px; height: 10px; }
    .pip-status-short { display: block; }
    .pip-status-long { display: none; }
    .pip-controls-condensed { display: flex; }
    .pip-controls-standard { display: none; }
    .pip-distractions-standard { display: flex; margin-top: 0.125rem; margin-bottom: 0; }
    .pip-distractions-minimal { display: none; }
    .pip-overlay-standard { display: none; }
    .pip-overlay-condensed { display: flex; }
    .pip-overlay-minimal { display: none; }
  }

  /* Mode 3: Ultra-Minimalist Strip Mode (height <= 165px) - Task Name, Countdown & 3 Distraction Buttons */
  @media (max-height: 165px) {
    .pip-container { padding: 0.25rem 0.5rem 0.2rem 0.5rem; justify-content: space-between; }
    .pip-dungeon-mb { margin-bottom: 0.15rem; }
    .pip-icon svg { width: 11px; height: 11px; }
    .pip-title { font-size: 11px; font-weight: 600; }
    .pip-stats { font-size: 9.5px; }
    .pip-bar { height: 2.5px; }
    .pip-countdown-container { flex-direction: row; justify-content: space-between; align-items: center; padding: 0; margin-top: auto; margin-bottom: auto; gap: 0.5rem; }
    .pip-time { font-size: 2.85rem; line-height: 1; letter-spacing: -0.04em; }
    .pip-status { display: none; }
    .pip-controls-condensed { display: none; }
    .pip-controls-minimal { display: flex; align-items: center; justify-content: center; }
    .pip-play-btn-minimal { width: 2.125rem !important; height: 2.125rem !important; }
    .pip-play-btn-minimal svg { width: 14px !important; height: 14px !important; }
    .pip-controls-standard { display: none; }
    .pip-distractions-standard { display: none; }
    .pip-distractions-minimal { display: flex; padding: 0.3125rem; gap: 0.375rem; border-radius: 0.875rem; }
    .pip-distract-btn { width: 2.125rem !important; height: 2.125rem !important; border-radius: 0.625rem !important; }
    .pip-distract-btn svg { width: 17px !important; height: 17px !important; }
    .pip-overlay-standard { display: none; }
    .pip-overlay-condensed { display: none; }
    .pip-overlay-minimal { display: flex; }
  }

  @media (max-height: 120px) {
    .pip-container { padding: 0.15rem 0.375rem 0.15rem 0.375rem; }
    .pip-dungeon-mb { margin-bottom: 0.1rem; }
    .pip-time { font-size: 2.35rem; line-height: 1; }
    .pip-play-btn-minimal { width: 1.75rem !important; height: 1.75rem !important; }
    .pip-play-btn-minimal svg { width: 12px !important; height: 12px !important; }
    .pip-distractions-minimal { padding: 0.2rem; gap: 0.2rem; border-radius: 0.5rem; }
    .pip-distract-btn { width: 1.625rem !important; height: 1.625rem !important; border-radius: 0.375rem !important; }
    .pip-distract-btn svg { width: 12px !important; height: 12px !important; }
  }
`;

const getRarityConfig = (rarity?: string) => {
  switch (rarity?.toLowerCase()) {
    case 'mythic':
      return {
        badge: 'bg-rose-600 text-white font-bold',
        border: 'border-rose-500/50 hover:border-rose-400',
        bg: 'bg-slate-900 hover:bg-slate-800/90',
        text: 'text-rose-400',
        dot: 'bg-rose-400'
      };
    case 'legendary':
      return {
        badge: 'bg-amber-500 text-slate-950 font-black',
        border: 'border-amber-500/50 hover:border-amber-400',
        bg: 'bg-slate-900 hover:bg-slate-800/90',
        text: 'text-amber-400',
        dot: 'bg-amber-400'
      };
    case 'epic':
      return {
        badge: 'bg-purple-600 text-white font-bold',
        border: 'border-purple-500/50 hover:border-purple-400',
        bg: 'bg-slate-900 hover:bg-slate-800/90',
        text: 'text-purple-400',
        dot: 'bg-purple-400'
      };
    case 'rare':
      return {
        badge: 'bg-blue-600 text-white font-bold',
        border: 'border-blue-500/50 hover:border-blue-400',
        bg: 'bg-slate-900 hover:bg-slate-800/90',
        text: 'text-blue-400',
        dot: 'bg-blue-400'
      };
    case 'uncommon':
      return {
        badge: 'bg-emerald-600 text-white font-bold',
        border: 'border-emerald-500/50 hover:border-emerald-400',
        bg: 'bg-slate-900 hover:bg-slate-800/90',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400'
      };
    default:
      return {
        badge: 'bg-slate-800 text-slate-400 font-bold',
        border: 'border-slate-800 hover:border-slate-600',
        bg: 'bg-slate-900 hover:bg-slate-800/90',
        text: 'text-slate-400',
        dot: 'bg-slate-400'
      };
  }
};

export const CompactTimer: React.FC<CompactTimerProps> = ({
  endTime,
  isActive,
  isResting,
  currentDungeon,
  duration,
  toggleTimer,
  resetTimer,
  skipSession,
  timerSkipVictoryMode,
  requireFocusConfirmation,
  lastCompletionRewards,
  pipVictorySummary,
  standardSessionMinutes,
  onRewardSelect,
  onInventoryAdd,
  onDeferReward,
  onStartFocus
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { timeLeft, distractions, setDistractions, activeRewardSession, setActiveRewardSession, showFocusPrompt, setShowFocusPrompt } = useTimerStore();
  const [displayTime, setDisplayTime] = React.useState(timeLeft);
  const [showTransientSummary, setShowTransientSummary] = React.useState(false);

  const internalDistraction = useDistractionButton('internal', 'click');
  const externalDistraction = useDistractionButton('external', 'pop');
  const unavoidableDistraction = useDistractionButton('unavoidable', 'error');

  React.useEffect(() => {
    setDisplayTime(timeLeft);
  }, [timeLeft]); // Sync when main thread ticks or prop changes

  // Handle Reward Summary Transient State for auto-pick/skip modes
  React.useEffect(() => {
    const hasData = !!(lastCompletionRewards || (pipVictorySummary && pipVictorySummary.ts > Date.now() - 5000));
    if (hasData && timerSkipVictoryMode && timerSkipVictoryMode !== 'none' && !showFocusPrompt && !activeRewardSession) {
      setShowTransientSummary(true);
      const timer = setTimeout(() => setShowTransientSummary(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowTransientSummary(false);
    }
  }, [lastCompletionRewards, pipVictorySummary, timerSkipVictoryMode, showFocusPrompt, activeRewardSession]);

  React.useEffect(() => {
    if (!isActive || !endTime) return;
    
    // Tick locally inside the PIP window
    const win = containerRef.current?.ownerDocument.defaultView || window;
    
    let reqId: number;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setDisplayTime(remaining);
      reqId = win.requestAnimationFrame(tick);
    };
    
    reqId = win.requestAnimationFrame(tick);
    
    return () => {
      win.cancelAnimationFrame(reqId);
    };
  }, [isActive, endTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectRewardCard = (card: RewardCard) => {
    if (!activeRewardSession) return;
    if (onRewardSelect) {
      onRewardSelect(card, activeRewardSession.session.id);
    }
    if (card.type === 'item' && card.itemType !== 'talent_shard' && card.itemType !== 'death_defying_medal' && onInventoryAdd) {
      onInventoryAdd(card.id);
    }
    playSound('reward', 0.5, true);
    setActiveRewardSession(null);
  };

  const handleDeferRewardToChest = () => {
    if (!activeRewardSession) return;
    if (onDeferReward) {
      onDeferReward(activeRewardSession.session, activeRewardSession.choices);
    }
    playSound('click', 0.5, true);
    setActiveRewardSession(null);
  };

  const handleStartFocus = () => {
    setShowFocusPrompt(false);
    if (onStartFocus) {
      onStartFocus();
    } else {
      toggleTimer();
    }
  };

  const handleDismissFocusPrompt = () => {
    setShowFocusPrompt(false);
  };

  const xpReward = activeRewardSession?.session?.xpEarned || lastCompletionRewards?.rewards?.find((r: any) => r.type === 'xp')?.amount || pipVictorySummary?.xp || 0;
  const coinReward = activeRewardSession?.session?.coinsEarned || lastCompletionRewards?.rewards?.find((r: any) => r.type === 'coins')?.amount || pipVictorySummary?.coins || 0;
  const isCrit = activeRewardSession?.session?.isCrit;

  return (
    <div ref={containerRef} className="pip-container flex flex-col items-center justify-start h-[100dvh] w-[100dvw] bg-slate-950 text-white font-sans overflow-hidden select-none relative">
      <style>{PIP_STYLE}</style>
      <AnimatePresence>
        {/* Victory Screen & Reward Selection Overlay */}
        {activeRewardSession && !showFocusPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-center overflow-hidden"
          >
            {/* Mode 1: Standard Mode (height > 240px) */}
            <div className="pip-overlay-standard flex-col h-full w-full p-3 justify-between">
              {/* Header */}
              <div className="flex flex-col items-center space-y-1 shrink-0">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Trophy size={18} />
                  <span className="font-black text-xs uppercase tracking-widest text-white">
                    {isCrit ? '🔥 Critical Victory!' : 'Victory!'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-[11px] font-black">
                  <span className="text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Zap size={11} /> +{xpReward} XP
                  </span>
                  <span className="text-amber-400 flex items-center gap-0.5 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Coins size={11} /> +{coinReward} Gold
                  </span>
                </div>
              </div>

              {/* 3 Selectable Reward Cards */}
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[145px] my-1 scrollbar-hide">
                {activeRewardSession.choices.map((card) => {
                  const rarity = getRarityConfig(card.rarity);
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleSelectRewardCard(card)}
                      className={cn(
                        "w-full text-left p-2 rounded-xl border transition-all flex flex-col gap-0.5 active:scale-95",
                        rarity.bg,
                        rarity.border
                      )}
                    >
                      <div className="flex items-start justify-between w-full gap-1">
                        <span className="text-xs font-bold text-white break-words text-left flex-1 min-w-0">{card.name}</span>
                        <span className={cn("text-[8px] font-black uppercase px-1 py-0.5 rounded shrink-0 whitespace-nowrap", rarity.badge)}>
                          {card.rarity}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight whitespace-normal break-words text-left">{card.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <button
                onClick={handleDeferRewardToChest}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold border border-slate-800 flex items-center justify-center gap-1 transition-all shrink-0"
              >
                <Package size={12} />
                Save to Chest
              </button>
            </div>

            {/* Mode 2: Condensed Horizontal Mode (166px <= height <= 240px) */}
            <div className="pip-overlay-condensed flex-col h-full w-full p-2 justify-between">
              <div className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-1">
                  <Trophy size={14} className="text-amber-400" />
                  <span className="font-black text-[10px] text-white">Victory!</span>
                  <span className="text-emerald-400 text-[9px] font-bold">+{xpReward}XP</span>
                  <span className="text-amber-400 text-[9px] font-bold">+{coinReward}G</span>
                </div>
                <button
                  onClick={handleDeferRewardToChest}
                  className="px-2 py-0.5 bg-slate-900 text-slate-400 hover:text-white rounded text-[9px] font-bold border border-slate-800 flex items-center gap-1"
                  title="Save to Chest"
                >
                  <Package size={10} />
                  Chest
                </button>
              </div>

              <div className="flex items-stretch gap-1.5 h-full my-1 overflow-x-auto scrollbar-hide">
                {activeRewardSession.choices.map((card) => {
                  const rarity = getRarityConfig(card.rarity);
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleSelectRewardCard(card)}
                      className={cn(
                        "flex-1 h-full min-w-[70px] p-1.5 rounded-lg border text-center flex flex-col justify-between items-center transition-all active:scale-95 overflow-y-auto scrollbar-hide",
                        rarity.bg,
                        rarity.border
                      )}
                    >
                      <span className={cn("text-[7px] font-black uppercase px-1 py-0.2 rounded shrink-0 whitespace-nowrap", rarity.badge)}>
                        {card.rarity}
                      </span>
                      <span className="text-[9px] font-bold text-white whitespace-normal break-words w-full my-0.5 leading-tight">{card.name}</span>
                      <p className="text-[8px] text-slate-300 whitespace-normal break-words w-full leading-tight">{card.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode 3: Ultra-Minimalist Strip Mode (height <= 165px) */}
            <div className="pip-overlay-minimal flex-col h-full w-full p-1 justify-between">
              <div className="flex items-center justify-between px-1 h-4 shrink-0">
                <div className="flex items-center gap-1 text-[9px] font-black">
                  <Trophy size={10} className="text-amber-400" />
                  <span className="text-white">Victory!</span>
                  <span className="text-emerald-400">+{xpReward}XP</span>
                  <span className="text-amber-400">+{coinReward}G</span>
                </div>
                <button
                  onClick={handleDeferRewardToChest}
                  className="px-1.5 py-0.2 bg-slate-900 text-slate-400 hover:text-white rounded text-[8px] font-bold border border-slate-800 flex items-center gap-0.5"
                >
                  <Package size={8} /> Chest
                </button>
              </div>

              <div className="flex items-center gap-1 flex-1 mt-0.5">
                {activeRewardSession.choices.map((card) => {
                  const rarity = getRarityConfig(card.rarity);
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleSelectRewardCard(card)}
                      className={cn(
                        "flex-1 h-full rounded border flex items-center justify-center gap-1 px-1 transition-all active:scale-95 overflow-hidden",
                        rarity.bg,
                        rarity.border
                      )}
                      title={`${card.name}: ${card.description}`}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", rarity.dot)} />
                      <span className="text-[9px] font-bold text-white whitespace-normal break-words line-clamp-1 leading-tight">{card.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Transient Summary Overlay (when auto-skip/deferred without choices) */}
        {showTransientSummary && !activeRewardSession && !showFocusPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, y: 10 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 text-center"
          >
            <div className="text-amber-400 mb-1">
              <Trophy size={20} />
            </div>
            <h4 className="font-black uppercase tracking-widest text-white text-xs mb-1.5">Victory!</h4>
            <div className="flex flex-col gap-1 w-full max-w-[140px]">
              <div className="flex items-center px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 justify-center gap-1">
                <Zap className="text-emerald-400 w-3 h-3" />
                <span className="text-xs font-black text-white">+{xpReward} XP</span>
              </div>
              <div className="flex items-center px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 justify-center gap-1">
                <Coins className="text-amber-400 w-3 h-3" />
                <span className="text-xs font-black text-white">+{coinReward} Gold</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 italic mt-2">Rewards saved</p>
          </motion.div>
        )}

        {/* Rest Over Prompt Overlay */}
        {showFocusPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-center overflow-hidden"
          >
            {/* Mode 1: Standard Mode (height > 240px) */}
            <div className="pip-overlay-standard flex-col h-full w-full p-4 items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-emerald-400 shrink-0">
                <Coffee size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Rest Over!</h4>
                <p className="text-[10px] text-slate-400">Ready to start Focus?</p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[180px]">
                <button
                  onClick={handleStartFocus}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Play size={12} fill="currentColor" />
                  Start Focus
                </button>
                <button
                  onClick={handleDismissFocusPrompt}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[9px] font-bold transition-all border border-slate-800"
                >
                  Maybe Later
                </button>
              </div>
            </div>

            {/* Mode 2: Condensed Horizontal Mode (166px <= height <= 240px) */}
            <div className="pip-overlay-condensed flex-row h-full w-full p-3 items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                  <Coffee size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Rest Over!</h4>
                  <p className="text-[9px] text-slate-400">Ready to delve?</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleStartFocus}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  <Play size={11} fill="currentColor" />
                  Start
                </button>
                <button
                  onClick={handleDismissFocusPrompt}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] border border-slate-800"
                  title="Later"
                >
                  Later
                </button>
              </div>
            </div>

            {/* Mode 3: Ultra-Minimalist Strip Mode (height <= 165px) */}
            <div className="pip-overlay-minimal flex-row h-full w-full px-2 py-0.5 items-center justify-between">
              <div className="flex items-center gap-1 overflow-hidden">
                <Coffee size={12} className="text-emerald-500 shrink-0" />
                <span className="text-[10px] font-black text-white truncate">Rest Over!</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleStartFocus}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold flex items-center gap-1"
                >
                  <Play size={9} fill="currentColor" /> Start
                </button>
                <button
                  onClick={handleDismissFocusPrompt}
                  className="p-0.5 text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dungeon Progress */}
      {currentDungeon && (
        <div className="w-full space-y-1 pip-dungeon-mb">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="pip-icon text-indigo-400 shrink-0">
                <Sword />
              </div>
              <span className="pip-title font-black truncate tracking-tight">{currentDungeon.name}</span>
            </div>
            <span className="pip-stats font-black text-slate-500 tabular-nums shrink-0">
                {Math.floor(currentDungeon.completedSessions * (standardSessionMinutes || 25))}m / {currentDungeon.totalSessions * (standardSessionMinutes || 25)}m
            </span>
          </div>
          <div className="pip-bar w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <motion.div 
              initial={false}
              animate={{ width: `${(currentDungeon.completedSessions / currentDungeon.totalSessions) * 100}%` }}
              className="h-full bg-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Countdown Module */}
      <div className="pip-countdown-container relative flex items-center w-full">
        <div className="flex flex-col items-center">
          <div 
            onClick={toggleTimer}
            className="pip-time font-black font-mono tracking-tighter tabular-nums text-white cursor-pointer transition-colors"
            title={isActive ? "Click to Pause" : "Click to Start"}
          >
            {formatTime(displayTime)}
          </div>
          
          <div className={cn(
              "pip-status font-bold uppercase tracking-widest flex items-center gap-1",
              isResting ? "text-emerald-500" : "text-indigo-400"
            )}>
            {(() => {
              const statusText = (isResting ? (isActive ? 'Resting...' : 'Ready to Rest') : (isActive ? 'Exploring...' : 'Ready to Delve'));
              const charArray = statusText.split('');
              const totalItems = charArray.length + 1; // +1 for the icon
              const animationDuration = 0.6;
              const repeatDelay = (totalItems - 1) * animationDuration;

              return (
                <>
                  <motion.span
                    animate={isActive ? { y: [0, -8, 0] } : { y: 0 }}
                    transition={{
                      duration: animationDuration,
                      repeat: isActive ? Infinity : 0,
                      ease: "easeInOut",
                      delay: 0,
                      repeatDelay: repeatDelay
                    }}
                    className="inline-block mr-1 pip-status-icon"
                  >
                    {isResting ? <Coffee size={14} /> : <Sword size={14} />}
                  </motion.span>
                  <span className="pip-status-long flex">
                    {charArray.map((char, i) => (
                      <motion.span
                        key={i}
                        animate={isActive ? { y: [0, -8, 0] } : { y: 0 }}
                        transition={{
                          duration: animationDuration,
                          repeat: isActive ? Infinity : 0,
                          ease: "easeInOut",
                          delay: (i + 1) * animationDuration,
                          repeatDelay: repeatDelay
                        }}
                        className="inline-block flex-shrink-0 whitespace-pre"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </span>
                  <span className="pip-status-short">{statusText.replace('...', '')}</span>
                </>
              );
            })()}
          </div>
        </div>

        {/* Controls (Ultra-Minimalist Strip Mode - Center / Middle) */}
        <div className="pip-controls-minimal items-center justify-center shrink-0">
          <button
            onClick={toggleTimer}
            className={cn(
              "pip-play-btn-minimal w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border active:scale-95 select-none",
              isActive 
                ? (isResting 
                    ? "bg-slate-800 text-emerald-400 border-emerald-500/40 hover:bg-slate-700" 
                    : "bg-slate-800 text-indigo-400 border-indigo-500/40 hover:bg-slate-700") 
                : (isResting 
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500")
            )}
            title={isActive ? "Pause" : "Start"}
          >
            {isActive ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>

        {/* Controls (Condensed Mode - Right Side) */}
        <div className="pip-controls-condensed flex-col gap-2 w-16">
          <div className="flex gap-2">
            <button
              onClick={resetTimer}
              className="p-1.5 w-full flex justify-center bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={skipSession}
              className="p-1.5 w-full flex justify-center bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
              title="Skip"
            >
              <SkipForward size={14} />
            </button>
          </div>
          <button
            onClick={toggleTimer}
            className={cn(
              "h-8 w-full rounded-lg flex items-center justify-center transition-all cursor-pointer",
              isActive 
                ? (isResting ? "bg-slate-900 text-emerald-500 border border-emerald-500/50" : "bg-slate-900 text-indigo-400 border border-indigo-500/50") 
                : (isResting ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white")
            )}
          >
            {isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>

        {/* Ultra-Minimalist Mode Distractions (Right Side in Shortest Height) */}
        <div className={cn(
          "pip-distractions-minimal items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shrink-0 select-none transition-opacity",
          isResting && "opacity-50"
        )}>
          <button 
            {...(isResting ? {} : internalDistraction)}
            disabled={isResting}
            className={cn(
              "pip-distract-btn w-8.5 h-8.5 bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden transition-all select-none",
              isResting ? "text-slate-500 cursor-not-allowed opacity-75" : "text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-400 active:scale-95 cursor-pointer touch-manipulation"
            )}
            title={isResting ? "Distractions disabled during rest" : "Internal Distraction (Hold 0.8s to decrease)"}
          >
            <Brain size={17} className={isResting ? "text-slate-500" : "text-indigo-400"} />
            {distractions.internal > 0 && (
              <span className={cn(
                "absolute bottom-0 right-0 px-1 min-w-[13px] h-[13px] flex items-center justify-center rounded-tl-md text-[8.5px] font-black leading-none",
                isResting ? "bg-slate-700/80 text-slate-400" : "bg-indigo-600 text-white"
              )}>{distractions.internal}</span>
            )}
          </button>
          <button 
            {...(isResting ? {} : externalDistraction)}
            disabled={isResting}
            className={cn(
              "pip-distract-btn w-8.5 h-8.5 bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden transition-all select-none",
              isResting ? "text-slate-500 cursor-not-allowed opacity-75" : "text-slate-300 hover:bg-orange-600/20 hover:text-orange-400 active:scale-95 cursor-pointer touch-manipulation"
            )}
            title={isResting ? "Distractions disabled during rest" : "External Distraction (Hold 0.8s to decrease)"}
          >
            <Wind size={17} className={isResting ? "text-slate-500" : "text-orange-400"} />
            {distractions.external > 0 && (
              <span className={cn(
                "absolute bottom-0 right-0 px-1 min-w-[13px] h-[13px] flex items-center justify-center rounded-tl-md text-[8.5px] font-black leading-none",
                isResting ? "bg-slate-700/80 text-slate-400" : "bg-orange-600 text-white"
              )}>{distractions.external}</span>
            )}
          </button>
          <button 
            {...(isResting ? {} : unavoidableDistraction)}
            disabled={isResting}
            className={cn(
              "pip-distract-btn w-8.5 h-8.5 bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden transition-all select-none",
              isResting ? "text-slate-500 cursor-not-allowed opacity-75" : "text-slate-300 hover:bg-red-600/20 hover:text-red-400 active:scale-95 cursor-pointer touch-manipulation"
            )}
            title={isResting ? "Distractions disabled during rest" : "Unavoidable Distraction (Hold 0.8s to decrease)"}
          >
            <Zap size={17} className={isResting ? "text-slate-500" : "text-red-400"} />
            {distractions.unavoidable > 0 && (
              <span className={cn(
                "absolute bottom-0 right-0 px-1 min-w-[13px] h-[13px] flex items-center justify-center rounded-tl-md text-[8.5px] font-black leading-none",
                isResting ? "bg-slate-700/80 text-slate-400" : "bg-red-600 text-white"
              )}>{distractions.unavoidable}</span>
            )}
          </button>
        </div>
      </div>

      {/* Controls (Standard Mode - Middle) */}
      <div className="pip-controls-standard items-center space-x-6 mt-6 mb-1">
        <button
          onClick={resetTimer}
          className="p-3 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-800 transition-all cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={toggleTimer}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl shrink-0 outline-none cursor-pointer",
            isActive 
              ? (isResting ? "bg-slate-900 text-emerald-500 border-2 border-emerald-500" : "bg-slate-900 text-indigo-500 border-2 border-indigo-500") 
              : (isResting ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-indigo-600 text-white hover:bg-indigo-500")
          )}
        >
          {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
        <button
          onClick={skipSession}
          className="p-3 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-800 transition-all cursor-pointer"
          title="Skip Session"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Distractions Module (Below Controls) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pip-distractions-standard flex flex-col items-center mt-3 gap-1.5 z-10 w-full select-none"
      >
        <div className={cn(
          "flex items-center justify-between w-full space-x-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 transition-opacity",
          isResting && "opacity-50"
        )}>
          <button 
            {...(isResting ? {} : internalDistraction)}
            disabled={isResting}
            className={cn(
              "flex-1 py-1.5 bg-slate-800 rounded-md text-[9px] transition-colors flex flex-col items-center justify-center gap-0.5 relative overflow-hidden select-none",
              isResting ? "text-slate-500 cursor-not-allowed opacity-75" : "text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-400 cursor-pointer touch-manipulation"
            )}
            title={isResting ? "Distractions disabled during rest" : "Internal (Hold 0.8s to decrease)"}
          >
            <div className="flex items-center gap-1">
               <Brain size={12} />
               <span className="font-bold">INT</span>
            </div>
            {distractions.internal > 0 && <span className={cn("absolute bottom-0 right-0 px-1 min-w-[12px] h-[12px] flex items-center justify-center rounded-tl-md text-[8px] font-black leading-none", isResting ? "bg-slate-700/80 text-slate-400" : "bg-indigo-600 text-white")}>{distractions.internal}</span>}
          </button>
          <button 
            {...(isResting ? {} : externalDistraction)}
            disabled={isResting}
            className={cn(
              "flex-1 py-1.5 bg-slate-800 rounded-md text-[9px] transition-colors flex flex-col items-center justify-center gap-0.5 relative overflow-hidden select-none",
              isResting ? "text-slate-500 cursor-not-allowed opacity-75" : "text-slate-300 hover:bg-orange-600/20 hover:text-orange-400 cursor-pointer touch-manipulation"
            )}
            title={isResting ? "Distractions disabled during rest" : "External (Hold 0.8s to decrease)"}
          >
            <div className="flex items-center gap-1">
               <Wind size={12} />
               <span className="font-bold">EXT</span>
            </div>
            {distractions.external > 0 && <span className={cn("absolute bottom-0 right-0 px-1 min-w-[12px] h-[12px] flex items-center justify-center rounded-tl-md text-[8px] font-black leading-none", isResting ? "bg-slate-700/80 text-slate-400" : "bg-orange-600 text-white")}>{distractions.external}</span>}
          </button>
          <button 
            {...(isResting ? {} : unavoidableDistraction)}
            disabled={isResting}
            className={cn(
              "flex-1 py-1.5 bg-slate-800 rounded-md text-[9px] transition-colors flex flex-col items-center justify-center gap-0.5 relative overflow-hidden select-none",
              isResting ? "text-slate-500 cursor-not-allowed opacity-75" : "text-slate-300 hover:bg-red-600/20 hover:text-red-400 cursor-pointer touch-manipulation"
            )}
            title={isResting ? "Distractions disabled during rest" : "Unavoidable (Hold 0.8s to decrease)"}
          >
            <div className="flex items-center gap-1">
               <Zap size={12} />
               <span className="font-bold">UNA</span>
            </div>
            {distractions.unavoidable > 0 && <span className={cn("absolute bottom-0 right-0 px-1 min-w-[12px] h-[12px] flex items-center justify-center rounded-tl-md text-[8px] font-black leading-none", isResting ? "bg-slate-700/80 text-slate-400" : "bg-red-600 text-white")}>{distractions.unavoidable}</span>}
          </button>
        </div>
      </motion.div>

    </div>
  );
};

