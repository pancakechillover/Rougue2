import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Coffee, Play, Pause, RotateCcw, SkipForward, Trophy, Zap, Coins, Brain, Wind } from 'lucide-react';
import { cn } from '../lib/utils';
import { Dungeon } from '../types';
import { useTimerStore } from '../hooks/useTimerStore';
import { playSound } from '../lib/sound';

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
}

const PIP_STYLE = `
  .pip-container { padding: 1.25rem; }
  .pip-dungeon-mb { margin-bottom: 1rem; }
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
  .pip-controls-standard { display: flex; }
  .pip-distractions-standard { display: flex; }
  .pip-distractions-minimal { display: none; }
  .pip-overlay-icon svg { width: 32px; height: 32px; }
  .pip-overlay-title { font-size: 0.875rem; margin-bottom: 0.75rem; }
  .pip-overlay-box { padding-left: 0.75rem; padding-right: 0.75rem; padding-top: 0.375rem; padding-bottom: 0.375rem; gap: 0.5rem; }
  .pip-overlay-text { font-size: 0.75rem; }
  .pip-overlay-gap { gap: 0.5rem; }
  .pip-overlay-footer { font-size: 10px; margin-top: 1rem; }

  /* Mode 2: Condensed Horizontal Split (166px <= height <= 240px) */
  @media (max-height: 240px) and (min-height: 166px), (max-width: 180px) and (min-height: 166px) {
    .pip-container { padding: 0.75rem; }
    .pip-dungeon-mb { margin-bottom: 0.5rem; }
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
    .pip-distractions-standard { display: none; }
    .pip-distractions-minimal { display: none; }
    .pip-overlay-icon svg { width: 16px; height: 16px; margin-bottom: 0.25rem; }
    .pip-overlay-title { font-size: 10px; margin-bottom: 0.25rem; }
    .pip-overlay-box { padding-left: 0.5rem; padding-right: 0.5rem; padding-top: 0.25rem; padding-bottom: 0.25rem; gap: 0.25rem; }
    .pip-overlay-text { font-size: 10px; }
    .pip-overlay-gap { gap: 0.25rem; }
    .pip-overlay-footer { display: none; }
  }

  /* Mode 3: Ultra-Minimalist Strip Mode (height <= 165px) - Task Name, Countdown & 3 Distraction Buttons */
  @media (max-height: 165px) {
    .pip-container { padding: 0.5rem 0.625rem; justify-content: space-between; }
    .pip-dungeon-mb { margin-bottom: 0.25rem; }
    .pip-icon svg { width: 10px; height: 10px; }
    .pip-title { font-size: 10px; }
    .pip-stats { font-size: 8px; }
    .pip-bar { height: 2px; }
    .pip-countdown-container { flex-direction: row; justify-content: space-between; align-items: center; padding: 0; margin-top: auto; margin-bottom: auto; }
    .pip-time { font-size: 2.5rem; line-height: 1; }
    .pip-status { display: none; }
    .pip-controls-condensed { display: none; }
    .pip-controls-standard { display: none; }
    .pip-distractions-standard { display: none; }
    .pip-distractions-minimal { display: flex; }
    .pip-overlay-icon svg { width: 14px; height: 14px; margin-bottom: 0.125rem; }
    .pip-overlay-title { font-size: 9px; margin-bottom: 0.125rem; }
    .pip-overlay-box { padding: 0.25rem; gap: 0.25rem; }
    .pip-overlay-text { font-size: 9px; }
    .pip-overlay-gap { gap: 0.125rem; }
    .pip-overlay-footer { display: none; }
  }
`;

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
  standardSessionMinutes
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { timeLeft, distractions, setDistractions } = useTimerStore();
  const [displayTime, setDisplayTime] = React.useState(timeLeft);
  const [showRewardSummary, setShowRewardSummary] = React.useState(false);
  const [showFocusPrompt, setShowFocusPrompt] = React.useState(false);

  React.useEffect(() => {
    setDisplayTime(timeLeft);
  }, [timeLeft]); // Sync when main thread ticks or prop changes

  // Handle Reward Summary Transient State
  React.useEffect(() => {
    // We only trigger this transient overlay if:
    // 1. It's a Major or Quest completion (lastCompletionRewards) OR it's a standard focus completion (pipVictorySummary)
    // 2. AND 'Skip Victory Screen' mode allows us to interrupt or requires UI ('none' -> wait, NO, user wants it when NOT 'none')
    const hasData = !!(lastCompletionRewards || (pipVictorySummary && pipVictorySummary.ts > Date.now() - 5000));
    
    // We do NOT block it if showFocusPrompt is false. If showFocusPrompt is true, they overlay.
    if (hasData && timerSkipVictoryMode && timerSkipVictoryMode !== 'none' && !showFocusPrompt) {
      setShowRewardSummary(true);
      const timer = setTimeout(() => setShowRewardSummary(false), 5000); // Show for 5 seconds
      return () => clearTimeout(timer);
    } else {
      setShowRewardSummary(false);
    }
  }, [lastCompletionRewards, pipVictorySummary, timerSkipVictoryMode, showFocusPrompt]);

  // Handle Focus Prompt State
  React.useEffect(() => {
    // Determine if we the most recently finished thing was a rest session
    // In our state logic, isResting flips to false when rest is done.
    // If requireFocusConfirmation is true, isActive will be false.
    if (requireFocusConfirmation && !isActive && !isResting && displayTime === duration * 60 && displayTime > 0) {
      setShowFocusPrompt(true);
    } else {
      setShowFocusPrompt(false);
    }
  }, [requireFocusConfirmation, isActive, isResting, displayTime, duration]);

  React.useEffect(() => {
    if (!isActive || !endTime) return;
    
    // We want to tick locally inside the PIP window to avoid main-window background throttling
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

  const xpReward = lastCompletionRewards?.rewards?.find((r: any) => r.type === 'xp')?.amount || pipVictorySummary?.xp;
  const coinReward = lastCompletionRewards?.rewards?.find((r: any) => r.type === 'coins')?.amount || pipVictorySummary?.coins;

  return (
    <div ref={containerRef} className="pip-container flex flex-col items-center justify-start h-[100dvh] w-[100dvw] bg-slate-950 text-white font-sans overflow-hidden select-none relative">
      <style>{PIP_STYLE}</style>
      <AnimatePresence>
        {showRewardSummary && !showFocusPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, y: 10 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-center"
          >
            <div className="pip-overlay-icon text-amber-400 mb-2">
              <Trophy />
            </div>
            <h4 className="pip-overlay-title font-black uppercase tracking-widest text-white">Victory!</h4>
            <div className="flex flex-col pip-overlay-gap w-full max-w-[160px]">
              <div className="flex items-center pip-overlay-box bg-emerald-500/10 rounded-lg border border-emerald-500/20 justify-center">
                <Zap className="text-emerald-400 w-[14px] h-[14px]" />
                <span className="pip-overlay-text font-black text-white">+{xpReward || 0} XP</span>
              </div>
              <div className="flex items-center pip-overlay-box bg-amber-500/10 rounded-lg border border-amber-500/20 justify-center">
                <Coins className="text-amber-400 w-[14px] h-[14px]" />
                <span className="pip-overlay-text font-black text-white">+{coinReward || 0} Gold</span>
              </div>
            </div>
            <p className="pip-overlay-footer text-slate-500 italic">Rewards saved</p>
          </motion.div>
        )}

        {showFocusPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-4 text-center space-y-4"
          >
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
               <RotateCcw size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Rest Over!</h4>
              <p className="text-[10px] text-slate-500">Ready to start Focus?</p>
            </div>
            <button
              onClick={toggleTimer}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Play size={12} fill="currentColor" />
              Start Focus
            </button>
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
              className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            />
          </div>
        </div>
      )}

      {/* Countdown Module */}
      <div className="pip-countdown-container relative flex items-center w-full">
        <div className="flex flex-col items-center">
          <div 
            onClick={toggleTimer}
            className="pip-time font-black font-mono tracking-tighter tabular-nums text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
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

        {/* Controls (Condensed Mode - Right Side) */}
        <div className="pip-controls-condensed flex-col gap-2 w-16">
          <div className="flex gap-2">
            <button
              onClick={resetTimer}
              className="p-1.5 w-full flex justify-center bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={skipSession}
              className="p-1.5 w-full flex justify-center bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all"
              title="Skip"
            >
              <SkipForward size={14} />
            </button>
          </div>
          <button
            onClick={toggleTimer}
            className={cn(
              "h-8 w-full rounded-lg flex items-center justify-center transition-all bg-indigo-600 text-white",
              isActive 
                ? (isResting ? "bg-emerald-600/20 border border-emerald-500/50 text-emerald-400" : "bg-indigo-600/20 border border-indigo-500/50 text-indigo-400") 
                : (isResting ? "bg-emerald-600" : "bg-indigo-600")
            )}
          >
            {isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>

        {/* Ultra-Minimalist Mode Distractions (Right Side in Shortest Height) */}
        {!isResting && (
          <div className="pip-distractions-minimal items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 shrink-0">
            <button 
              onClick={() => {
                playSound('click', 0.5, true);
                setDistractions(d => ({ ...d, internal: d.internal + 1 }));
              }}
              className="px-1.5 py-1 bg-slate-800 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 rounded text-[9px] font-bold flex items-center gap-1 relative overflow-hidden active:scale-95 transition-all"
              title="Internal Distraction"
            >
              <Brain size={11} className="text-indigo-400" />
              <span>INT</span>
              {distractions.internal > 0 && (
                <span className="px-1 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[8px] font-black">{distractions.internal}</span>
              )}
            </button>
            <button 
              onClick={() => {
                playSound('pop', 0.5, true);
                setDistractions(d => ({ ...d, external: d.external + 1 }));
              }}
              className="px-1.5 py-1 bg-slate-800 hover:bg-orange-600/20 text-slate-300 hover:text-orange-400 rounded text-[9px] font-bold flex items-center gap-1 relative overflow-hidden active:scale-95 transition-all"
              title="External Distraction"
            >
              <Wind size={11} className="text-orange-400" />
              <span>EXT</span>
              {distractions.external > 0 && (
                <span className="px-1 py-0.2 bg-orange-500/30 text-orange-300 rounded text-[8px] font-black">{distractions.external}</span>
              )}
            </button>
            <button 
              onClick={() => {
                playSound('error', 0.5, true);
                setDistractions(d => ({ ...d, unavoidable: d.unavoidable + 1 }));
              }}
              className="px-1.5 py-1 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 rounded text-[9px] font-bold flex items-center gap-1 relative overflow-hidden active:scale-95 transition-all"
              title="Unavoidable Distraction"
            >
              <Zap size={11} className="text-red-400" />
              <span>UNA</span>
              {distractions.unavoidable > 0 && (
                <span className="px-1 py-0.2 bg-red-500/30 text-red-300 rounded text-[8px] font-black">{distractions.unavoidable}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Controls (Standard Mode - Middle) */}
      <div className="pip-controls-standard items-center space-x-6 mt-6 mb-1">
        <button
          onClick={resetTimer}
          className="p-3 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-800 transition-all"
          title="Reset Timer"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={toggleTimer}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl shrink-0 outline-none",
            isActive 
              ? (isResting ? "bg-slate-900 text-emerald-500 border-2 border-emerald-500" : "bg-slate-900 text-indigo-500 border-2 border-indigo-500") 
              : (isResting ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-indigo-600 text-white hover:bg-indigo-500")
          )}
        >
          {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
        <button
          onClick={skipSession}
          className="p-3 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-800 transition-all"
          title="Skip Session"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Distractions Module (Below Controls) */}
      {!isResting && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pip-distractions-standard flex flex-col items-center mt-3 gap-1.5 z-10 w-full"
        >
          <div className="flex items-center justify-between w-full space-x-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => {
                playSound('click', 0.5, true);
                setDistractions(d => ({ ...d, internal: d.internal + 1 }));
              }}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 rounded-md text-[9px] transition-colors flex flex-col items-center justify-center gap-0.5 relative overflow-hidden"
              title="Internal"
            >
              <div className="flex items-center gap-1">
                 <Brain size={12} />
                 <span className="font-bold">INT</span>
              </div>
              {distractions.internal > 0 && <span className="absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-tl text-[7px] font-black">{distractions.internal}</span>}
            </button>
            <button 
              onClick={() => {
                playSound('pop', 0.5, true);
                setDistractions(d => ({ ...d, external: d.external + 1 }));
              }}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-orange-600/20 text-slate-300 hover:text-orange-400 rounded-md text-[9px] transition-colors flex flex-col items-center justify-center gap-0.5 relative overflow-hidden"
              title="External"
            >
              <div className="flex items-center gap-1">
                 <Wind size={12} />
                 <span className="font-bold">EXT</span>
              </div>
              {distractions.external > 0 && <span className="absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center bg-orange-500/20 text-orange-400 rounded-tl text-[7px] font-black">{distractions.external}</span>}
            </button>
            <button 
              onClick={() => {
                playSound('error', 0.5, true);
                setDistractions(d => ({ ...d, unavoidable: d.unavoidable + 1 }));
              }}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 rounded-md text-[9px] transition-colors flex flex-col items-center justify-center gap-0.5 relative overflow-hidden"
              title="Unavoidable"
            >
              <div className="flex items-center gap-1">
                 <Zap size={12} />
                 <span className="font-bold">UNA</span>
              </div>
              {distractions.unavoidable > 0 && <span className="absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center bg-red-500/20 text-red-400 rounded-tl text-[7px] font-black">{distractions.unavoidable}</span>}
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
