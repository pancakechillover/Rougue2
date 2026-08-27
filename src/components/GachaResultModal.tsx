import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles, Star, Gift, Crown, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { ScratchCard } from './ScratchCard';
import { playSound } from '../lib/sound';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';

interface GachaResult {
  item: string;
  rarity: string;
  poolType: 'gacha' | 'ichiban';
  color?: string;
}

interface GachaResultModalProps {
  results: GachaResult[];
  onClose: () => void;
  gachaAnimation?: 'card' | 'scratch';
  ichibanAnimation?: 'card' | 'scratch';
  allowOverlap?: boolean;
  soundEnabled?: boolean;
  soundVolume?: number;
}

export const GachaResultModal: React.FC<GachaResultModalProps> = ({ 
  results, 
  onClose, 
  gachaAnimation = 'card',
  ichibanAnimation = 'scratch',
  allowOverlap = false,
  soundEnabled = true,
  soundVolume = 0.5
}) => {
  useScrollLock(true);
  const isMulti = results.length > 1;
  const isTenPull = results.length >= 10;
  // Separate LastOne prizes
  const normalResults = results.filter(r => r.rarity.toUpperCase() !== 'LASTONE');
  const lastOneResults = results.filter(r => r.rarity.toUpperCase() === 'LASTONE');
  
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [viewedIndices, setViewedIndices] = useState<number[]>([0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lastOneClaimed, setLastOneClaimed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Determine which effect to use based on the source of the rewards
  const gachaEffect = results[0]?.poolType === 'ichiban' ? ichibanAnimation : gachaAnimation;

  const scratchedCount = revealedIndices.length;
  // Must scratch all normalResults
  const allScratched = gachaEffect !== 'scratch' || scratchedCount >= normalResults.length;
  // If there are LastOne prizes, they must be "claimed" individually or shown last
  const canClose = allScratched && (lastOneResults.length === 0 || lastOneClaimed);

  // Handle skip/claim all
  const handleSkipAnimation = () => {
    // Reveal all normal results
    setRevealedIndices(normalResults.map((_, i) => i));
    setViewedIndices(normalResults.map((_, i) => i));
    // If no LastOne, show summary or allow closing
    if (lastOneResults.length === 0) {
      setShowSummary(true);
    } else if (lastOneClaimed) {
      setShowSummary(true);
    }
  };

  const handleClaim = () => {
    if (results.length > 1 && !showSummary) {
      setShowSummary(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  // Track viewed cards for color indicators
  useEffect(() => {
    if (!viewedIndices.includes(currentIndex)) {
      setViewedIndices(prev => [...prev, currentIndex]);
    }
  }, [currentIndex, viewedIndices]);

  useEffect(() => {
    if (showSummary) {
      setViewedIndices(normalResults.map((_, i) => i));
    }
  }, [showSummary, normalResults]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : normalResults.length - 1));
  }, [normalResults.length]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex(prev => (prev < normalResults.length - 1 ? prev + 1 : 0));
  }, [normalResults.length]);

  const handleScratchComplete = (idx: number) => {
    if (revealedIndices.includes(idx)) return;
    setRevealedIndices(prev => [...prev, idx]);
    playSound('reward', soundVolume, soundEnabled);
  };

  const getRarityStyles = (result: GachaResult, isTenPull: boolean) => {
    const r = result.rarity.toUpperCase();
    const iconSize = isTenPull ? 20 : 32;
    const lastOneIconSize = isTenPull ? 24 : 40;

    if (r === 'LASTONE') {
      return {
        bg: 'bg-slate-950',
        border: 'border-rose-500',
        text: 'text-rose-400',
        accent: 'bg-rose-500',
        glow: 'shadow-[0_0_60px_rgba(244,63,94,0.6)]',
        icon: <Crown className="text-rose-400" size={lastOneIconSize} />,
        gradient: 'from-rose-500/30 via-transparent to-rose-950/30',
        label: 'LAST ONE PRIZE'
      };
    }
    
    if (result.color) {
      switch(result.color) {
        case 'blue': return { bg: 'bg-slate-950', border: 'border-blue-500', text: 'text-blue-400', accent: 'bg-blue-500', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]', icon: <Star className="text-blue-400" size={iconSize} />, gradient: 'from-blue-500/20 via-transparent to-blue-900/20' };
        case 'purple': return { bg: 'bg-slate-950', border: 'border-purple-500', text: 'text-purple-400', accent: 'bg-purple-500', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', icon: <Sparkles className="text-purple-400" size={iconSize} />, gradient: 'from-purple-500/20 via-transparent to-purple-900/20' };
        case 'amber': return { bg: 'bg-slate-950', border: 'border-amber-500', text: 'text-amber-400', accent: 'bg-amber-500', glow: 'shadow-[0_0_40px_rgba(245,158,11,0.4)]', icon: <Trophy className="text-amber-400" size={iconSize} />, gradient: 'from-amber-500/30 via-transparent to-amber-900/30' };
        case 'red': return { bg: 'bg-slate-950', border: 'border-red-500', text: 'text-red-400', accent: 'bg-red-500', glow: 'shadow-[0_0_40px_rgba(239,68,68,0.4)]', icon: <Gift className="text-red-400" size={iconSize} />, gradient: 'from-red-500/30 via-transparent to-red-900/30' };
        case 'rose': return { bg: 'bg-slate-950', border: 'border-rose-500', text: 'text-rose-400', accent: 'bg-rose-500', glow: 'shadow-[0_0_40px_rgba(244,63,94,0.4)]', icon: <Trophy className="text-rose-400" size={iconSize} />, gradient: 'from-rose-500/30 via-transparent to-rose-900/30' };
        case 'slate': 
        default:
          return { bg: 'bg-slate-950', border: 'border-slate-700', text: 'text-slate-400', accent: 'bg-slate-700', glow: 'shadow-none', icon: <CheckCircle2 className="text-slate-400" size={iconSize} />, gradient: 'from-slate-800/20 via-transparent to-slate-950/20' };
      }
    }
    
    if (r.includes('EPIC') || r.includes('SR') || r.includes('B')) {
      return {
        bg: 'bg-slate-950',
        border: 'border-purple-500',
        text: 'text-purple-400',
        accent: 'bg-purple-500',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
        icon: <Sparkles className="text-purple-400" size={iconSize} />,
        gradient: 'from-purple-500/20 via-transparent to-purple-900/20'
      };
    }
    
    if (r.includes('RARE') || r.includes('C') || r === 'R') {
      return {
        bg: 'bg-slate-950',
        border: 'border-blue-500',
        text: 'text-blue-400',
        accent: 'bg-blue-500',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        icon: <Star className="text-blue-400" size={iconSize} />,
        gradient: 'from-blue-500/20 via-transparent to-blue-900/20'
      };
    }

    if (r.includes('UNCOMMON') || r.includes('D')) {
      return {
        bg: 'bg-slate-950',
        border: 'border-emerald-500',
        text: 'text-emerald-400',
        accent: 'bg-emerald-500',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
        icon: <Gift className="text-emerald-400" size={iconSize} />,
        gradient: 'from-emerald-500/20 via-transparent to-emerald-900/20'
      };
    }

    if (r.includes('COMMON')) {
      return {
        bg: 'bg-slate-950',
        border: 'border-slate-700',
        text: 'text-slate-400',
        accent: 'bg-slate-700',
        glow: '',
        icon: <Gift className="text-slate-500" size={iconSize} />,
        gradient: 'from-slate-700/10 via-transparent to-slate-900/10'
      };
    }

    // Default to A / SSR / LASTONE
    return {
      bg: 'bg-slate-950',
      border: 'border-amber-400',
      text: 'text-amber-400',
      accent: 'bg-amber-400',
      glow: 'shadow-[0_0_40px_rgba(251,191,36,0.4)]',
      icon: <Crown className="text-amber-400" size={iconSize} />,
      gradient: 'from-amber-400/20 via-transparent to-amber-900/20'
    };
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-hidden border-0 m-0"
      onClick={() => canClose && onClose()}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-7xl h-full flex flex-col py-4 sm:py-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-2 sm:mb-6 relative shrink-0">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-block"
          >
            <h2 className="text-2xl sm:text-5xl font-black text-slate-50 tracking-tighter italic pr-1 uppercase mb-1 drop-shadow-2xl">
              {showSummary ? 'Summoning Summary' : (isMulti ? 'Summoning Results' : 'New Treasure!')}
            </h2>
            <div className="h-1 w-12 sm:w-20 bg-indigo-500 mx-auto rounded-full mb-2" />
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs">
              {showSummary 
                ? "Items stored in your vault" 
                : (gachaEffect === 'scratch' && !allScratched 
                  ? `Scratch to reveal results (${scratchedCount}/${normalResults.length})` 
                  : "The vault has opened")}
            </p>
          </motion.div>
          
          {!showSummary && !canClose && isMulti && (
            <div className="mt-2 sm:mt-0 sm:absolute sm:top-0 sm:right-0 flex justify-center">
              <button
                onClick={handleSkipAnimation}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 hover:border-white/20"
              >
                Skip Animation
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 relative flex items-center justify-center w-full min-h-0 overflow-hidden px-2">
          {showSummary ? (
            <div className="w-full max-w-2xl bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden flex flex-col max-h-full">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">Inventory Log</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total: {results.length} Items</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {results.map((res, i) => {
                  const styles = getRarityStyles(res, true);
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", styles.accent, "bg-opacity-20")}>
                        {React.cloneElement(styles.icon as any, { size: 20 })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", styles.text)}>{res.rarity}</span>
                          {res.rarity.toUpperCase() === 'LASTONE' && <span className="text-[8px] bg-rose-500 text-slate-50 px-1.5 rounded uppercase font-black">Bonus</span>}
                        </div>
                        <p className="text-slate-100 font-bold truncate text-sm">{res.item}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-6 bg-indigo-500/5 border-t border-white/5">
                <p className="text-indigo-300 text-[10px] font-bold text-center leading-relaxed">
                  TIP: Visit your <span className="text-white underline decoration-indigo-500/50 underline-offset-4 font-black italic pr-1">Vault & Records</span> to view your full collection and claim physical rewards.
                </p>
              </div>
            </div>
          ) : allowOverlap && normalResults.length > 1 ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Navigation Arrows */}
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-0 sm:left-4 z-50 p-3 sm:p-4 bg-white/5 hover:bg-white/10 text-slate-100 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-0 sm:right-4 z-50 p-3 sm:p-4 bg-white/5 hover:bg-white/10 text-slate-100 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>

              <div className="w-full h-full flex items-center justify-center relative overflow-hidden px-4">
                <AnimatePresence initial={false} custom={direction}>
                  {(() => {
                    const res = normalResults[currentIndex];
                    const idx = currentIndex;
                    const styles = getRarityStyles(res, false);
                    const isRevealed = revealedIndices.includes(idx);
                    const cardContent = (
                      <div className={cn(
                        "h-full w-full flex flex-col items-center relative overflow-hidden transition-all",
                        gachaEffect === 'card' ? "rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10" : "rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8",
                        styles.bg
                      )}>
                        <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br", styles.gradient)} />
                        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                        <div className={cn(
                          "px-2 sm:px-4 py-1 rounded-full text-[10px] sm:text-sm font-black tracking-widest uppercase border relative z-10 mb-2 sm:mb-4",
                          styles.text,
                          styles.border
                        )}>
                          {res.rarity}
                        </div>
                        <div className="flex-1 flex flex-col items-center w-full relative z-10 pt-4 sm:pt-8 min-h-0">
                          <div className="relative mb-4 sm:mb-8 shrink-0">
                            <motion.div
                              animate={{ y: [0, -8, 0], filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                              className="scale-[1.5] sm:scale-[2.5]"
                            >
                              {styles.icon}
                            </motion.div>
                            <div className={cn("absolute inset-0 blur-3xl opacity-30 rounded-full -z-10", styles.accent)} />
                          </div>
                          <div className="w-full text-center px-4 overflow-hidden">
                            <h3 className={cn(
                              "font-black leading-tight uppercase italic pr-1 mb-2 sm:mb-4 line-clamp-3 overflow-hidden text-ellipsis",
                              "text-sm sm:text-2xl md:text-3xl",
                              styles.text
                            )}>
                              {res.item}
                            </h3>
                            <div className={cn("h-1 w-8 sm:w-16 mx-auto rounded-full", styles.accent)} />
                          </div>
                        </div>
                        <div className={cn("absolute top-6 left-6 w-4 h-4 border-t-4 border-l-4 opacity-30", styles.border)} />
                        <div className={cn("absolute top-6 right-6 w-4 h-4 border-t-4 border-r-4 opacity-30", styles.border)} />
                        <div className={cn("absolute bottom-6 left-6 w-4 h-4 border-b-4 border-l-4 opacity-30", styles.border)} />
                        <div className={cn("absolute bottom-6 right-6 w-4 h-4 border-b-4 border-r-4 opacity-30", styles.border)} />
                      </div>
                    );

                    const cardVariants = {
                      enter: (d: number) => ({ opacity: 0, x: d > 0 ? 300 : -300, scale: 0.9, rotateY: d > 0 ? 10 : -10 }),
                      center: { opacity: 1, x: 0, scale: 1, rotateY: 0 },
                      exit: (d: number) => ({ opacity: 0, x: d > 0 ? -300 : 300, scale: 0.9, rotateY: d > 0 ? -10 : 10 })
                    };

                    return (
                      <motion.div
                        key={idx}
                        custom={direction}
                        variants={cardVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ 
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 }
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(e, { offset, velocity }) => {
                          if (offset.x > 70 || velocity.x > 400) handlePrev();
                          else if (offset.x < -70 || velocity.x < -400) handleNext();
                        }}
                        className={cn(
                          "absolute transition-none group shrink-0",
                          gachaEffect === 'card' 
                            ? "h-[45vh] sm:h-[50vh] max-h-[500px] aspect-[2/3]" 
                            : "h-[30vh] sm:h-[35vh] max-h-[350px] aspect-[16/9]",
                          (gachaEffect !== 'scratch' || isRevealed) ? styles.accent : "bg-slate-400",
                          (gachaEffect !== 'scratch' || isRevealed) ? styles.glow : "shadow-none",
                        )}
                        style={{ perspective: 1000 }}
                      >
                        {gachaEffect === 'scratch' && !isRevealed ? (
                          <ScratchCard 
                            onComplete={() => handleScratchComplete(idx)}
                            containerClassName="h-full w-full rounded-[1.25rem] sm:rounded-[2rem]"
                            scratchRadius={80}
                          >
                            {cardContent}
                          </ScratchCard>
                        ) : (
                          cardContent
                        )}
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
                
                {/* Multi-pull Indicator */}
                <div className="absolute bottom-4 flex flex-col items-center gap-2 z-50">
                  <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black tracking-widest text-slate-300">
                    {currentIndex + 1} / {normalResults.length}
                  </div>
                  <div className="flex gap-2">
                    {normalResults.map((res, i) => {
                      const isRevealed = revealedIndices.includes(i) || (viewedIndices.includes(i) && gachaEffect !== 'scratch');
                      const styles = isRevealed ? getRarityStyles(res, false) : null;
                      
                      return (
                        <div 
                          key={i} 
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all duration-500",
                            i === currentIndex ? "w-4" : "w-1.5",
                            isRevealed && styles ? styles.accent : "bg-white/20",
                            i === currentIndex && !isRevealed && "bg-white"
                          )} 
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "px-2 sm:px-6 max-w-7xl mx-auto pb-12 w-full overflow-y-auto custom-scrollbar max-h-full",
              normalResults.length >= 10 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 mt-4" 
                : "flex flex-wrap gap-4 sm:gap-8 justify-center items-center mt-4",
            )}>
              {normalResults.map((res, idx) => {
                const styles = getRarityStyles(res, normalResults.length >= 10);
                const cardContent = (
                  <div className={cn(
                    "h-full w-full flex flex-col items-center relative overflow-hidden transition-all",
                    isTenPull 
                      ? "rounded-[1rem] sm:rounded-[1.5rem] p-3 sm:p-5" 
                      : gachaEffect === 'card' 
                        ? (normalResults.length === 1 ? "rounded-[1.75rem] p-6 sm:p-8" : "rounded-[1.5rem] p-6") 
                        : "rounded-[1.5rem] p-4",
                    styles.bg
                  )}>
                    <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-br", styles.gradient)} />
                    <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className={cn(
                      "px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase border relative z-10 mb-2 sm:mb-4",
                      styles.text, styles.border
                    )}>
                      {res.rarity}
                    </div>
                    <div className={cn(
                      "flex-1 flex flex-col items-center justify-center w-full relative z-10 space-y-4"
                    )}>
                      <div className="relative">
                        <motion.div
                          animate={{ y: [0, -4, 0], filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className={isTenPull ? "scale-125" : (normalResults.length === 1 ? "scale-[1.75] sm:scale-[2.25]" : "scale-150")}
                        >
                          {styles.icon}
                        </motion.div>
                        <div className={cn("absolute inset-0 blur-2xl opacity-30 rounded-full -z-10", styles.accent)} />
                      </div>
                      <div className="w-full text-center px-1">
                        <h3 className={cn(
                          "font-black leading-snug uppercase italic pr-1 mb-2 max-h-[3.5rem] overflow-hidden line-clamp-2",
                          isTenPull 
                            ? "text-xs sm:text-sm md:text-base" 
                            : (normalResults.length === 1 ? "text-base sm:text-xl md:text-2xl" : "text-sm sm:text-lg"),
                          styles.text
                        )}>
                          {res.item}
                        </h3>
                        <div className={cn("h-0.5 w-6 mx-auto rounded-full", styles.accent)} />
                      </div>
                    </div>
                  </div>
                );

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.5, y: 50, rotateY: -180 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05, type: 'spring', stiffness: 100, damping: 15 }}
                    className={cn(
                      "relative group transition-none",
                      isTenPull 
                        ? "w-full aspect-[4/5] sm:aspect-square rounded-2xl sm:rounded-[1.5rem] p-[2px]" 
                        : gachaEffect === 'card' 
                          ? (normalResults.length === 1 
                              ? "w-[min(280px,75vw)] sm:w-[min(320px,45vw)] aspect-[2/3] rounded-[1.75rem] p-[2px]" 
                              : "w-[min(200px,45vw)] sm:w-[min(260px,45vw)] aspect-[2/3] rounded-[1.5rem] p-[2px]")
                          : (normalResults.length === 1
                              ? "w-[min(300px,85vw)] sm:w-[min(380px,80vw)] aspect-[16/9] rounded-[1.75rem] p-[2px]"
                              : "w-[min(260px,80vw)] sm:w-[min(320px,80vw)] aspect-[16/9] rounded-[1.5rem] p-[2px]"),
                      (gachaEffect !== 'scratch' || revealedIndices.includes(idx)) ? styles.accent : "bg-slate-400",
                      (gachaEffect !== 'scratch' || revealedIndices.includes(idx)) ? styles.glow : "shadow-none",
                    )}
                  >
                    {gachaEffect === 'scratch' ? (
                      <ScratchCard 
                        onComplete={() => handleScratchComplete(idx)}
                        containerClassName="h-full w-full rounded-[calc(1rem-2px)] sm:rounded-[calc(1.5rem-2px)]"
                        scratchRadius={isTenPull ? 40 : 60}
                      >
                        {cardContent}
                      </ScratchCard>
                    ) : cardContent}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 py-6 shrink-0">
          <AnimatePresence>
            {!allScratched && gachaEffect === 'scratch' && (
              <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse italic pr-1">
                Scratch cards to reveal prize
              </p>
            )}
            {allScratched && lastOneResults.length > 0 && !lastOneClaimed && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => {
                  setLastOneClaimed(true);
                  playSound('levelUp', soundVolume, soundEnabled);
                }}
                className="group relative flex flex-col items-center gap-2 p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 text-slate-50 rounded-3xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(99,102,241,0.4)] border-2 border-indigo-400"
              >
                <Crown size={32} className="text-slate-50 drop-shadow-lg mb-1" />
                <span className="text-xs sm:text-sm">Claim Last One Prize!</span>
                {lastOneResults.map((lor, idx) => (
                  <span key={idx} className="text-[10px] opacity-80 font-bold max-w-[200px] truncate">{lor.item}</span>
                ))}
              </motion.button>
            )}
            {canClose && (
              <motion.button
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                onClick={handleClaim}
                className="group relative flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-white text-slate-950 rounded-full font-black uppercase tracking-[0.2em] italic pr-1 text-xs sm:text-base transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/40 border border-slate-200/10 dark:border-white/10 w-[80%] max-w-[280px] sm:w-auto"
              >
                <CheckCircle2 size={18} className="group-hover:rotate-12 transition-transform shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                <span className="truncate">{showSummary ? 'Finish Summon' : 'Claim Rewards'}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
