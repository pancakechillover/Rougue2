import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Play, Pause, RotateCcw, SkipForward, Trophy, Coins, Zap, Scroll, Flame, Settings2, RefreshCw, Coffee, Maximize, Sparkles, Clock, Brain, Wind } from 'lucide-react';
import { TreasureChestIcon } from './icons/TreasureChestIcon';
import { RewardCard, StudySession, Dungeon } from '../types';
import { cn } from '../lib/utils';
import { triggerSimpleConfetti } from '../lib/effects';
import { createWorkerTimer } from '../lib/workerTimer';
import { useBackgroundKeepAlive } from '../lib/keepAlive';
import { generateRewardChoicesForSession } from '../lib/rewardLogic';
import { playSound } from '../lib/sound';
import { useTimerStore } from '../hooks/useTimerStore';

interface TimerProps {
  currentDungeon: Dungeon | null;
  rewardPool: RewardCard[];
  activeTalents: string[];
  timerSkipVictoryMode?: 'none' | 'auto_pick_highest' | 'skip_rewards' | 'defer_to_chest';
  dailyRerollUsed: boolean;
  history: StudySession[];
  standardSessionMinutes?: number;
  pendingRewardChest?: { session: StudySession; choices: RewardCard[]; }[];
  onComplete: (duration: number, focusDuration?: number, restDuration?: number, distractions?: { internal: number; external: number; unavoidable: number }) => StudySession | null;
  onRestComplete?: () => void;
  onInventoryAdd: (id: string) => void;
  onReroll: () => void;
  onRewardSelect: (reward: RewardCard, sessionId: string) => void;
  onDeferReward: (session: StudySession, choices: RewardCard[]) => void;
  onUpdateChestItem?: (sessionId: string, newChoices: RewardCard[]) => void;
  onSaveNote?: (sessionId: string, timestamp: number, duration: number, dungeonName: string, text: string) => void;
  setShowCoinRain: (show: boolean) => void;
  isFullscreen?: boolean;
  secretCode?: string;
  userName?: string;
  pushEnabled?: boolean;
  onTogglePip?: () => void;
  requireFocusConfirmation?: boolean;
  pipWindow?: Window | null;
  // External Config
  focusDuration: number;
  restDuration: number;
  enableRest: boolean;
  isLooping: boolean;
  loopTarget: number;
  loopCount: number;
  setLoopCount: (val: number) => void;
  setIsResting: (val: boolean) => void;
  isResting: boolean;
  setDuration: (val: number) => void;
  duration: number;
  setIsActive: (val: boolean) => void;
  isActive: boolean;
  setEndTime: (val: number | null) => void;
  endTime: number | null;
  critChance: number;
  critMultiplier: number;
}

export interface TimerRef {
  reset: () => void;
  applyPreset: (focus: number, rest: number) => void;
  handleCustomChange: (focus: number, rest: number) => void;
  isResting: boolean;
  isActive: boolean;
}

export const Timer = React.memo<TimerProps>(({ 
  currentDungeon, 
  rewardPool, 
  activeTalents,
  timerSkipVictoryMode,
  dailyRerollUsed,
  history,
  standardSessionMinutes,
  pendingRewardChest,
  onComplete, 
  onRestComplete,
  onInventoryAdd,
  onReroll,
  onRewardSelect,
  onDeferReward,
  onUpdateChestItem,
  onSaveNote,
  setShowCoinRain,
  isFullscreen = false,
  secretCode,
  userName,
  pushEnabled,
  onTogglePip,
  requireFocusConfirmation = false,
  pipWindow,
  focusDuration,
  restDuration,
  enableRest,
  isLooping,
  loopTarget,
  loopCount,
  setLoopCount,
  setIsResting,
  isResting,
  setDuration,
  duration,
  setIsActive,
  isActive,
  setEndTime,
  endTime,
  critChance,
  critMultiplier
}) => {
  const { timeLeft, setTimeLeft, distractions, setDistractions } = useTimerStore();
  const [showRewards, setShowRewards] = useState<{ session: StudySession; choices: RewardCard[] } | null>(null);
  const [studyNote, setStudyNote] = useState('');
  const [showTalentPopup, setShowTalentPopup] = useState<StudySession['triggeredTalents'] | null>(null);
  const [showFocusPrompt, setShowFocusPrompt] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);

  // Long press to skip
  const [skipProgress, setSkipProgress] = useState(0);
  const skipTimerRef = useRef<number | null>(null);
  const skipStartTimeRef = useRef<number>(0);
  const durationRef = useRef(duration);
  const timeLeftRef = useRef(timeLeft);
  const isLoopingRef = useRef(isLooping);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

  useBackgroundKeepAlive(isActive, isResting, duration, timeLeft);

  // Sync to localStorage moved to App.tsx or handled via state setters passed down

  useEffect(() => {
    if (isActive) {
      setShowFocusPrompt(false);
    }
  }, [isActive]);

  // Maximize PIP window when showing rewards in PIP, and restore when closed
  const [pipBounds, setPipBounds] = useState<{w: number, h: number} | null>(null);
  useEffect(() => {
    if (showRewards && pipWindow && pipWindow.resizeTo) {
      if (!pipBounds) setPipBounds({ w: pipWindow.outerWidth, h: pipWindow.outerHeight });
      try {
        pipWindow.moveTo(0, 0);
        pipWindow.resizeTo(window.screen.availWidth, window.screen.availHeight);
      } catch (e) {
        console.warn('Could not resize PIP window', e);
      }
    } else if (!showRewards && pipWindow && pipBounds && pipWindow.resizeTo) {
      try {
        pipWindow.resizeTo(pipBounds.w, pipBounds.h);
        setPipBounds(null);
      } catch (e) {
        console.warn('Could not restore PIP window size', e);
      }
    }
  }, [showRewards, pipWindow]);

  // Push Notification Scheduling
  useEffect(() => {
    if (!pushEnabled || !secretCode) return;

    if (isActive && endTime) {
      const delayMinutes = (endTime - Date.now()) / (60 * 1000);
      if (delayMinutes > 0.1) { // Only schedule if more than 6 seconds left
        fetch('/api/push/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secretCode,
            delayMinutes,
            title: isResting ? `Rest Over, ${userName || 'Seeker'}!` : `Focus Over, ${userName || 'Seeker'}!`,
            body: isResting ? "Time to return to the dungeon." : "You have cleared the room. Take a rest?",
            type: isResting ? 'rest_end' : 'timer_end'
          })
        }).catch(err => console.debug('Push schedule skipped or failed:', err));
      }
    } else {
      fetch('/api/push/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode })
      }).catch(err => console.debug('Push cancel skipped or failed:', err));
    }
  }, [isActive, endTime, pushEnabled, secretCode, isResting]);

  const handleRewardSelection = useCallback((card: RewardCard | null, session: StudySession) => {
    if (card) {
      onRewardSelect(card, session.id);
      if (card.type === 'item' && card.itemType !== 'talent_shard' && card.itemType !== 'death_defying_medal') {
        onInventoryAdd(card.id);
      }
    }
    
    if (session.triggeredTalents) {
      setShowTalentPopup(session.triggeredTalents);
    }
    
    setShowRewards(null);
  }, [onRewardSelect, onInventoryAdd, setShowTalentPopup]);

  const completingRef = useRef(false);

  const cancelSkipCharge = useCallback(() => {
    if (skipTimerRef.current) {
      cancelAnimationFrame(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    setSkipProgress(0);
  }, []);

  const submitStudyNote = useCallback((session: StudySession) => {
    if (studyNote.trim() && onSaveNote) {
      onSaveNote(
        session.id,
        new Date(session.timestamp).getTime(),
        session.duration,
        currentDungeon?.name || 'Free Study',
        studyNote.trim()
      );
    }
  }, [studyNote, onSaveNote, currentDungeon?.name]);

  const handleComplete = useCallback((silent: boolean = false, overrideDuration?: number) => {
    if (completingRef.current) return;
    completingRef.current = true;
    setTimeout(() => { completingRef.current = false; }, 1000);
    
    setIsActive(false);
    setEndTime(null);

    // Show local notification if possible
    if (!silent && pushEnabled && 'serviceWorker' in navigator && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(isResting ? `Rest Over, ${userName || 'Seeker'}!` : `Focus Over, ${userName || 'Seeker'}!`, {
          body: isResting ? "Time to return to the dungeon." : "You have cleared the room. Take a rest?",
          icon: '/pwa-icon.svg',
          tag: 'timer_complete',
          renotify: true,
          vibrate: [200, 100, 200],
          actions: [
            { action: 'open', title: 'Back to Dungeon' }
          ]
        } as any);
      }).catch(err => console.error('Local notification failed:', err));
    }
    
    cancelSkipCharge(); // Ensure skip is cleared on complete

    if (isResting) {
      // Finished rest
      setIsResting(false);
      setDuration(focusDuration);
      setTimeLeft(focusDuration * 60);
      
      if (onRestComplete) {
        onRestComplete();
      }
      
      let safeLoopCount = loopCount;
      if (isLooping && loopTarget > 0 && safeLoopCount >= loopTarget) safeLoopCount = 0;

      const nextLoopCount = safeLoopCount + 1;
      setLoopCount(nextLoopCount);
      const shouldContinueLoop = isLooping && (loopTarget === 0 || nextLoopCount < loopTarget);
      
      if (shouldContinueLoop) {
        if (requireFocusConfirmation) {
          // Pause and show prompt
          setShowFocusPrompt(true);
          setIsActive(false);
          setEndTime(null);
        } else {
          // Automatically start the next loop
          setIsActive(true);
          setEndTime(Date.now() + focusDuration * 60 * 1000);
        }
      } else {
        // done, keep loopCount as is to show n/n loops
        setIsActive(false);
        setEndTime(null);
      }
    } else {
      // Finished focus
      const actualFocusDuration = overrideDuration !== undefined ? overrideDuration : focusDuration;
      const actualDuration = overrideDuration !== undefined ? overrideDuration : duration;
      const session = onComplete(actualDuration, actualFocusDuration, restDuration, distractions);
      setDistractions({ internal: 0, external: 0, unavoidable: 0 });
      if (session) {
        const generated = generateRewardChoicesForSession(session, {
          rewardPool,
          activeTalents,
          pendingRewardChest,
          standardSessionMinutes
        });
        const choicesList = generated;

        if (timerSkipVictoryMode && timerSkipVictoryMode !== 'none') {
          if (timerSkipVictoryMode === 'auto_pick_highest') {
            const getRarityValue = (r: any) => {
              switch(r) {
                case 'mythic': return 6;
                case 'legendary': return 5;
                case 'epic': return 4;
                case 'rare': return 3;
                case 'uncommon': return 2;
                default: return 1;
              }
            };
            for (const item of choicesList) {
               if (item.choices.length > 0) {
                 const sortedChoices = [...item.choices].sort((a, b) => getRarityValue(b.rarity) - getRarityValue(a.rarity));
                 handleRewardSelection(sortedChoices[0], item.session);
               } else {
                 handleRewardSelection(null, item.session);
               }
            }
          } else if (timerSkipVictoryMode === 'defer_to_chest') {
            for (const item of choicesList) {
               if (item.choices.length > 0) {
                 onDeferReward(item.session, item.choices);
               }
               handleRewardSelection(null, item.session);
            }
          } else {
            for (const item of choicesList) {
               handleRewardSelection(null, item.session);
            }
          }
        } else {
          // Unconditionally defer ALL to chest first so they are not lost if user refreshes
          for (const item of choicesList) {
            onDeferReward(item.session, item.choices);
          }
          if (choicesList.length > 0) {
            // Only popup the first one directly. The others can be opened from the chest sequentially.
            setShowRewards(choicesList[0]);
            setHasRerolled(false);
            triggerSimpleConfetti();
            if (session.isCrit) {
              setShowCoinRain(true);
            }
          }
        }
      }

      if (enableRest && restDuration > 0) {
        setIsResting(true);
        setDuration(restDuration);
        setTimeLeft(restDuration * 60);
        setIsActive(true);
        setEndTime(Date.now() + restDuration * 60 * 1000);
      } else {
        // No rest period. Handle loop increment immediately.
        let safeLoopCount = loopCount;
        if (isLooping && loopTarget > 0 && safeLoopCount >= loopTarget) safeLoopCount = 0;

        const nextLoopCount = safeLoopCount + 1;
        setLoopCount(nextLoopCount);
        const shouldContinueLoop = isLooping && (loopTarget === 0 || nextLoopCount < loopTarget);
        
        if (shouldContinueLoop) {
          setDuration(focusDuration);
          setTimeLeft(focusDuration * 60);
          if (requireFocusConfirmation) {
            setShowFocusPrompt(true);
            setIsActive(false);
            setEndTime(null);
          } else {
            setIsActive(true);
            setEndTime(Date.now() + focusDuration * 60 * 1000);
          }
        } else {
          setIsActive(false);
          setEndTime(null);
          setDuration(focusDuration);
          setTimeLeft(focusDuration * 60);
        }
      }
    }
  }, [duration, isResting, focusDuration, restDuration, enableRest, isLooping, loopCount, loopTarget, onComplete, onRestComplete, rewardPool, activeTalents, setShowCoinRain, setIsActive, setEndTime, setIsResting, setDuration, setTimeLeft, pushEnabled, timerSkipVictoryMode, handleRewardSelection, onDeferReward, requireFocusConfirmation, setLoopCount, setShowFocusPrompt]);

  useEffect(() => {
    let worker: Worker | null = null;
    let isDone = false;
    
    const checkTime = () => {
      if (!isActive || !endTime || isDone) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        isDone = true;
        if (worker) {
          worker.postMessage({ command: 'stop' });
          worker.terminate();
          worker = null;
        }
        setIsActive(false);
        setEndTime(null);
        
        handleComplete(false, undefined);
      }
    };

    if (isActive && endTime) {
      checkTime(); // Check immediately
      if (!isDone) {
        worker = createWorkerTimer();
        worker.onmessage = checkTime;
        worker.postMessage({ command: 'start', interval: 1000 });
      }
    }
    
    return () => {
      isDone = true;
      if (worker) {
        worker.postMessage({ command: 'stop' });
        worker.terminate();
      }
    };
  }, [isActive, endTime, handleComplete, setIsActive, setEndTime, setTimeLeft]);

  const skipDidTriggerRef = useRef(false);

  const startSkipCharge = useCallback((e: React.PointerEvent) => {
    // Only capture primary click/touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.isDefaultPrevented()) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    skipStartTimeRef.current = Date.now();
    skipDidTriggerRef.current = false;
    cancelSkipCharge(); // clear any existing

    const updateProgress = () => {
      const elapsed = Date.now() - skipStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 3000) * 100);
      setSkipProgress(progress);

      if (progress >= 100) {
        skipDidTriggerRef.current = true;
        cancelSkipCharge();
        if (!isActive && !isResting && isLoopingRef.current && loopTarget > 0 && loopCount >= loopTarget) {
           setLoopCount(0);
        }
        
        let overrideDuration;
        if (isResting) {
            overrideDuration = undefined; 
        } else {
            const elapsedMins = Math.max(0, durationRef.current - (timeLeftRef.current / 60));
            overrideDuration = Math.max(1, Math.round(elapsedMins));
        }
        
        handleComplete(false, overrideDuration);
      } else {
        skipTimerRef.current = requestAnimationFrame(updateProgress);
      }
    };
    
    skipTimerRef.current = requestAnimationFrame(updateProgress);
  }, [cancelSkipCharge, setLoopCount, isActive, isResting, loopTarget, loopCount, handleComplete]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const elapsed = Date.now() - skipStartTimeRef.current;
    
    // Process short click before cancelling entirely
    if (!skipDidTriggerRef.current && skipStartTimeRef.current !== 0 && elapsed > 0 && elapsed < 500) {
      if (!isActive && !isResting && isLoopingRef.current && loopTarget > 0 && loopCount >= loopTarget) {
         setLoopCount(0);
      }
      
      handleComplete(false, undefined);
    }
    
    skipDidTriggerRef.current = false;
    skipStartTimeRef.current = 0;
    cancelSkipCharge();
  }, [cancelSkipCharge, setLoopCount, isActive, isResting, loopTarget, loopCount, handleComplete]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (skipTimerRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      // Add a small 10px buffer margin just in case
      const isInside = (
        e.clientX >= rect.left - 10 &&
        e.clientX <= rect.right + 10 &&
        e.clientY >= rect.top - 10 &&
        e.clientY <= rect.bottom + 10
      );
      if (!isInside) {
        cancelSkipCharge();
        skipStartTimeRef.current = 0;
      }
    }
  }, [cancelSkipCharge]);

  const canPip = 'documentPictureInPicture' in window && window.self === window.top;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  const isDesktop = !('ontouchstart' in window);

  const toggleTimer = () => {
    if (isActive) {
      setIsActive(false);
      setEndTime(null);
    } else {
      if (!isResting && isLooping && loopTarget > 0 && loopCount >= loopTarget) {
        setLoopCount(0);
      }
      setIsActive(true);
      setEndTime(Date.now() + timeLeft * 1000);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setEndTime(null);
    setIsResting(false);
    setShowFocusPrompt(false);
    setDuration(focusDuration);
    setTimeLeft(focusDuration * 60);
    setLoopCount(0);
    setDistractions({ internal: 0, external: 0, unavoidable: 0 });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showDistractionControls = !isResting;

  return (
    <div className="relative flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 w-full h-full min-h-0 flex-1 select-none">
      {/* Timer Display */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center max-w-[280px] sm:max-w-[360px] lg:max-w-[420px] xl:max-w-[480px] max-h-[280px] sm:max-h-[360px] lg:max-h-[420px] xl:max-h-[480px]">
        <div className="relative w-full h-full aspect-square max-w-full max-h-full">
          <svg viewBox="0 0 320 320" className="w-full h-full transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="150"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-800"
            />
            <motion.circle
              cx="160"
              cy="160"
              r="150"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 150}
              initial={{ strokeDashoffset: -(2 * Math.PI * 150) * (1 - timeLeft / ((duration || 25) * 60)) }}
              animate={{ strokeDashoffset: -(2 * Math.PI * 150) * (1 - timeLeft / ((duration || 25) * 60)) }}
              className={isResting ? "text-emerald-500" : "text-indigo-500"}
            />
          </svg>
          <div className="absolute inset-x-0 top-[20%] flex flex-col items-center justify-end z-10 pointer-events-none pb-2">
            {isLooping && (
               <span className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-3 py-1 rounded-full text-xs font-bold text-slate-300">
                 {loopCount}/{loopTarget > 0 ? loopTarget : '∞'} loops
               </span>
            )}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div 
              className={cn(
                "font-black font-mono text-white tracking-tighter flex items-center justify-center",
                isFullscreen ? "text-6xl sm:text-7xl md:text-[5rem]" : "text-6xl sm:text-7xl lg:text-7xl"
              )}
            >
              {formatTime(timeLeft).split('').map((char, i) => (
                <span
                  key={i}
                  className="inline-block"
                >
                  {char}
                </span>
              ))}
            </div>
            <div className={cn(
                "font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-1",
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
                      className="inline-block mr-1"
                    >
                      {isResting ? <Coffee size={14} /> : <Sword size={14} />}
                    </motion.span>
                    {charArray.map((char, i) => (
                      <motion.span
                        key={i}
                        animate={isActive ? { y: [0, -8, 0] } : { y: 0 }}
                        transition={{
                          duration: animationDuration,
                          repeat: isActive ? Infinity : 0,
                          ease: "easeInOut",
                          delay: (i + 1) * animationDuration, // Delay based on its position in sequence
                          repeatDelay: repeatDelay
                        }}
                        className="inline-block"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-6">
        <button
          onClick={resetTimer}
          className="p-4 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-800 transition-all"
          title="Reset Timer"
        >
          <RotateCcw size={24} />
        </button>
        <button
          onClick={toggleTimer}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl",
            isActive 
              ? (isResting ? "bg-slate-900 text-emerald-500 border-2 border-emerald-500" : "bg-slate-900 text-indigo-500 border-2 border-indigo-500") 
              : (isResting ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-indigo-600 text-white hover:bg-indigo-500")
          )}
        >
          {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
        </button>
        <button
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={startSkipCharge}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerMove={handlePointerMove}
          className="p-4 bg-slate-900 text-slate-400 hover:text-white rounded-full border border-slate-800 transition-all select-none relative overflow-hidden group skip-btn-area"
          title="Click to Skip, Hold 3s for Partial Skip"
          style={{ touchAction: 'none' }}
        >
          {skipProgress > 0 && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                <circle cx="28" cy="28" r="26" fill="none" strokeWidth="4" className="text-indigo-500/20 stroke-current" />
                <circle 
                  cx="28" cy="28" r="26" 
                  fill="none" 
                  strokeWidth="4" 
                  className="text-indigo-500 stroke-current drop-shadow-md" 
                  strokeDasharray="163.3" 
                  strokeDashoffset={163.3 - (163.3 * skipProgress) / 100} 
                  strokeLinecap="round" 
                />
              </svg>
            </div>
          )}
          <SkipForward size={24} className={cn("relative z-10 transition-transform", skipProgress > 0 && "scale-110 text-indigo-400")} />
        </button>
      </div>

      {/* Distraction Controls */}
      {showDistractionControls && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1 shrink-0 z-20"
        >
          <span className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest font-bold">Distractions</span>
          <div className="flex items-center space-x-1.5 md:space-x-2 bg-slate-900/80 backdrop-blur-md p-1 md:p-1.5 rounded-full border border-slate-800 shadow-xl">
            <button 
              onClick={() => {
                playSound('click', 0.5, true);
                setDistractions(d => ({ ...d, internal: d.internal + 1 }));
              }}
              className="w-[86px] sm:w-[96px] md:w-[106px] py-1.5 md:py-2 bg-slate-800 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 rounded-full text-[10px] md:text-xs transition-colors flex items-center justify-center gap-1 md:gap-1.5 shrink-0 whitespace-nowrap"
              title="Internal: Distracted by your own thoughts"
            >
              <Brain size={13} className="shrink-0" />
              <span>Internal</span>
              {distractions.internal > 0 && (
                <span className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-full text-[8px] md:text-[9px] font-bold shrink-0">
                  {distractions.internal}
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                playSound('pop', 0.5, true);
                setDistractions(d => ({ ...d, external: d.external + 1 }));
              }}
              className="w-[86px] sm:w-[96px] md:w-[106px] py-1.5 md:py-2 bg-slate-800 hover:bg-orange-600/20 text-slate-300 hover:text-orange-400 rounded-full text-[10px] md:text-xs transition-colors flex items-center justify-center gap-1 md:gap-1.5 shrink-0 whitespace-nowrap"
              title="External: Interrupted by environment"
            >
              <Wind size={13} className="shrink-0" />
              <span>External</span>
              {distractions.external > 0 && (
                <span className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 flex items-center justify-center bg-orange-500/20 text-orange-400 rounded-full text-[8px] md:text-[9px] font-bold shrink-0">
                  {distractions.external}
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                playSound('error', 0.5, true);
                setDistractions(d => ({ ...d, unavoidable: d.unavoidable + 1 }));
              }}
              className="w-[114px] sm:w-[126px] md:w-[138px] py-1.5 md:py-2 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 rounded-full text-[10px] md:text-xs transition-colors flex items-center justify-center gap-1 md:gap-1.5 shrink-0 whitespace-nowrap"
              title="Unavoidable: Forced to interrupt"
            >
              <Zap size={13} className="shrink-0" />
              <span>Unavoidable</span>
              {distractions.unavoidable > 0 && (
                <span className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 flex items-center justify-center bg-red-500/20 text-red-400 rounded-full text-[8px] md:text-[9px] font-bold shrink-0">
                  {distractions.unavoidable}
                </span>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Timer Settings UI removed from here - moved to TimerSettings.tsx */}


      {/* Reward Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showRewards && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center bg-slate-950 px-4 py-8 sm:py-12 overflow-y-auto no-scrollbar overflow-x-hidden">
              {/* Background Atmosphere */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] aspect-square bg-indigo-500/10 rounded-full blur-[120px]" 
                />
                <div className="absolute top-0 left-0 w-full h-full bg-slate-950/80 [mask-image:radial-gradient(circle_at_50%_50%,transparent_0%,black_100%)]" />
              </div>

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.05, opacity: 0 }}
                className="w-full max-w-6xl space-y-4 md:space-y-6 lg:space-y-8 text-center relative z-10 py-2 md:py-4"
              >
              <div className="space-y-2 md:space-y-4">
                <motion.div
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                  className={cn(
                    "inline-block p-3 md:p-4 rounded-full border mb-1",
                    showRewards.session.isCrit 
                      ? "bg-amber-500/20 border-amber-500/30 text-amber-400" 
                      : "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
                  )}
                >
                  <Trophy className="w-5 h-5 md:w-8 md:h-8" />
                </motion.div>
                <div className="space-y-1 md:space-y-2">
                  <motion.h2 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter italic uppercase",
                      showRewards.session.isCrit ? "text-amber-400" : "text-white"
                    )}
                  >
                    {showRewards.session.isCrit ? 'Critical Victory!' : 'Victory!'}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs md:text-sm text-slate-400 px-4 font-medium"
                  >
                    {showRewards.session.isCrit 
                      ? `Fortune favors the bold. ${critMultiplier}x Gold bonus triggered! (${Math.round(critChance * 100)}%)` 
                      : "Dungeon room cleared. Claim your rewards."}
                  </motion.p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-6 lg:gap-8 px-4">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-md px-6 py-2 rounded-xl border border-indigo-500/20"
                >
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Session Intel</p>
                  <div className="flex items-center gap-3 text-white">
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-indigo-400" />
                      <span className="text-sm font-black">{showRewards.session.duration}m</span>
                    </div>
                    <div className="w-[1px] h-3 bg-slate-700" />
                    <div className="flex items-center gap-1">
                      <Trophy size={14} className="text-amber-400" />
                      <span className="text-sm font-black">{showRewards.session.focusDuration || '??'}m Goal</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-6 lg:gap-8 px-4 mb-4">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-2 md:gap-3 bg-slate-900/50 backdrop-blur-md px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-emerald-500/30"
                >
                  <Zap className="text-emerald-400 w-4 h-4 md:w-6 md:h-6" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">XP Gained</p>
                    <p className="text-lg md:text-xl lg:text-2xl font-black text-white">+{showRewards.session.xpEarned}</p>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className={cn(
                    "flex items-center gap-2 md:gap-3 bg-slate-900/50 backdrop-blur-md px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border transition-all",
                    showRewards.session.isCrit ? "border-amber-400" : "border-amber-500/30"
                  )}
                >
                  <Coins className="text-amber-400 w-4 h-4 md:w-6 md:h-6" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Gold Found</p>
                    <p className="text-lg md:text-xl lg:text-2xl font-black text-white">+{showRewards.session.coinsEarned}</p>
                  </div>
                </motion.div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="px-4 max-w-xl mx-auto w-full mb-6"
              >
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-left">Study Note (Optional)</p>
                <input
                  type="text"
                  value={studyNote}
                  onChange={(e) => setStudyNote(e.target.value)}
                  placeholder="e.g. Cleared chapter 1, grasped core concepts..."
                  className="w-full bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 shadow-inner"
                />
              </motion.div>

              <div className="space-y-4 px-4 max-w-6xl mx-auto w-full">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4"
                >
                  <h3 className="text-xs md:text-sm lg:text-base font-bold text-slate-500 uppercase tracking-widest">Rewards Selection</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        submitStudyNote(showRewards.session);
                        setShowRewards(null);
                        setStudyNote('');
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold uppercase text-[10px] md:text-xs hover:bg-emerald-600/30 transition-all"
                    >
                      <TreasureChestIcon size={14} />
                      Defer to Chest
                    </button>
                    {activeTalents.includes('c2') && !hasRerolled && (
                      <button
                        onClick={() => {
                          if (showRewards) {
                            let vol = 0.5;
                            let soundOn = true;
                            try {
                              const stored = localStorage.getItem('scholars_dungeon_state');
                              if (stored) {
                                const parsed = JSON.parse(stored);
                                if (parsed.state && parsed.state.soundVolume !== undefined) vol = parsed.state.soundVolume;
                                if (parsed.state && parsed.state.soundEnabled !== undefined) soundOn = parsed.state.soundEnabled;
                              }
                            } catch (e) {}

                            const newChoices = generateRewardChoicesForSession(showRewards.session, {
                              rewardPool,
                              activeTalents,
                              pendingRewardChest,
                              standardSessionMinutes
                            });
                            if (newChoices && newChoices.length > 0) {
                              setShowRewards({
                                session: showRewards.session,
                                choices: newChoices[0].choices
                              });
                              playSound('gacha', vol, soundOn);
                              if (onUpdateChestItem) {
                                onUpdateChestItem(showRewards.session.id, newChoices[0].choices);
                              }
                            }
                            setHasRerolled(true);
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full font-bold uppercase text-[10px] md:text-xs hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                      >
                        <RotateCcw size={14} />
                        Reroll
                      </button>
                    )}
                  </div>
                </motion.div>
                <div className={cn(
                  "grid gap-4 justify-center pb-4",
                  showRewards.choices.length === 3 ? "grid-cols-1 sm:grid-cols-3 max-w-5xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                )}>
                  {showRewards.choices.map((card, idx) => {
                    const now = Date.now();
                    const periodMs = (card.limitPeriodDays || 1) * 24 * 60 * 60 * 1000;
                    const claimsInPeriod = (card.claimHistory || []).filter(ts => (now - new Date(ts).getTime()) < periodMs).length;
                    
                    return (
                      <motion.button
                        key={card.id + idx + (hasRerolled ? "_rerolled" : "")}
                        initial={hasRerolled ? { opacity: 0, scale: 0.8, rotateY: -90 } : { y: 20, opacity: 0 }}
                        animate={hasRerolled ? { opacity: 1, scale: 1, rotateY: 0 } : { y: 0, opacity: 1 }}
                        transition={hasRerolled ? { type: "spring", stiffness: 200, damping: 15, delay: idx * 0.1 } : { delay: 0.9 }}
                        whileHover={{ y: -5, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          triggerSimpleConfetti();
                          
                          submitStudyNote(showRewards.session);
                          onRewardSelect(card, showRewards.session.id);
                          if (card.type === 'item' && card.itemType !== 'talent_shard' && card.itemType !== 'death_defying_medal') {
                            onInventoryAdd(card.id);
                          }
                          if (showRewards.session.triggeredTalents) {
                            setShowTalentPopup(showRewards.session.triggeredTalents);
                          }
                          
                          // Short delay to let the confetti pop before closing
                          setTimeout(() => {
                            setShowRewards(null);
                            setStudyNote('');
                          }, 400);
                        }}
                        className={cn(
                          "group relative p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl border-2 text-left transition-all h-full flex flex-col min-h-[140px] md:min-h-[160px] overflow-hidden",
                          card.rarity === 'common' ? "bg-slate-900 border-slate-800 hover:border-slate-600" :
                          card.rarity === 'uncommon' ? "bg-slate-900 border-emerald-500/50 hover:border-emerald-400" :
                          card.rarity === 'rare' ? "bg-slate-900 border-blue-500/50 hover:border-blue-400" :
                          card.rarity === 'epic' ? "bg-slate-900 border-purple-500/50 hover:border-purple-400" :
                          card.rarity === 'legendary' ? "bg-slate-900 border-amber-500/50 hover:border-amber-400" :
                          "bg-slate-900 border-rose-500/50 hover:border-rose-400"
                        )}
                      >
                        {/* Gorgeous Subdued Effects */}
                        {card.rarity !== 'common' && (
                          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-2xl md:rounded-3xl">
                            {card.rarity === 'rare' && (
                              <motion.div
                                animate={{ x: ['-200%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 2 }}
                                className="absolute inset-0 w-3/4 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent skew-x-[25deg]"
                              />
                            )}
                            {card.rarity === 'epic' && (
                              <>
                                <motion.div
                                  animate={{ x: ['-200%', '200%'] }}
                                  transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1.5 }}
                                  className="absolute inset-0 w-3/4 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent skew-x-[25deg]"
                                />
                                <motion.div
                                  animate={{ scale: [0.8, 1.2, 0.8], rotate: [0, 90, 180] }}
                                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                                  className="absolute -top-6 -right-6 text-purple-400/20"
                                >
                                  <Sparkles size={80} strokeWidth={1} />
                                </motion.div>
                              </>
                            )}
                            {card.rarity === 'legendary' && (
                              <>
                                <motion.div
                                  animate={{ x: ['-200%', '200%'] }}
                                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
                                  className="absolute inset-0 w-3/4 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent skew-x-[25deg]"
                                />
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                                  className="absolute -top-10 -right-10 text-amber-500/20"
                                >
                                  <Sparkles size={120} strokeWidth={1} />
                                </motion.div>
                                <motion.div
                                  animate={{ rotate: -360 }}
                                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                                  className="absolute -bottom-8 -left-8 text-amber-500/20"
                                >
                                  <Sparkles size={100} strokeWidth={1} />
                                </motion.div>
                                <motion.div
                                  animate={{ opacity: [0, 1, 0] }}
                                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                  className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent blur-sm"
                                />
                              </>
                            )}
                          </div>
                        )}
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="mb-3 md:mb-4 flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] md:text-xs font-bold uppercase px-2 py-0.5 rounded",
                              card.rarity === 'common' ? "bg-slate-800 text-slate-400" :
                              card.rarity === 'uncommon' ? "bg-emerald-600 text-white" :
                              card.rarity === 'rare' ? "bg-blue-600 text-white" :
                              card.rarity === 'epic' ? "bg-purple-600 text-white" : 
                              card.rarity === 'legendary' ? "bg-amber-500 text-slate-900" :
                              "bg-rose-600 text-white"
                            )}>
                              {card.rarity}
                            </span>
                            
                            {card.limitCount && card.limitCount > 0 ? (
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                {claimsInPeriod}/{card.limitCount} Lmt
                              </span>
                            ) : null}
                          </div>
                          <h4 className="text-base md:text-lg font-bold text-white mb-1 md:mb-2 leading-tight">{card.name}</h4>
                          <p className="text-xs md:text-sm text-slate-400 flex-grow leading-relaxed">{card.description}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        pipWindow ? pipWindow.document.body : document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTalentPopup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 w-full max-w-md rounded-3xl border border-indigo-500/30 overflow-hidden shadow-2xl"
              >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-indigo-900/20">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame className="text-indigo-400" />
                  Talent Triggered!
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {showTalentPopup.flowExperience && (
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Flow Experience (16th Session)</h4>
                    <div className="flex gap-4">
                      {showTalentPopup.flowExperience.xp > 0 && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Zap size={14} /> +{showTalentPopup.flowExperience.xp} XP
                        </span>
                      )}
                      {showTalentPopup.flowExperience.coins > 0 && (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Coins size={14} /> +{showTalentPopup.flowExperience.coins} Gold
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {showTalentPopup.perfectTheory && (
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Streak Bonus (Perfect Theory / Bounty Decree)</h4>
                    <div className="flex gap-4">
                      {showTalentPopup.perfectTheory.xp > 0 && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Zap size={14} /> +{showTalentPopup.perfectTheory.xp} XP
                        </span>
                      )}
                      {showTalentPopup.perfectTheory.coins > 0 && (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Coins size={14} /> +{showTalentPopup.perfectTheory.coins} Gold
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowTalentPopup(null)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors mt-4"
                >
                  Awesome!
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showFocusPrompt && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 w-full max-w-sm rounded-3xl border border-indigo-500/30 overflow-hidden shadow-2xl p-8 text-center space-y-6"
              >
                <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-400">
                  <Play size={40} fill="currentColor" className="ml-1" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white tracking-tight">Rest Over!</h3>
                  <p className="text-slate-400 text-sm">Ready to start the next focus session?</p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowFocusPrompt(false);
                      setIsActive(true);
                      setEndTime(Date.now() + focusDuration * 60 * 1000);
                    }}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    <Play size={18} fill="currentColor" />
                    Start Focus
                  </button>
                  <button
                    onClick={() => setShowFocusPrompt(false)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});
