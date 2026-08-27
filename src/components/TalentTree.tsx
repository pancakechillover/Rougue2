import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Talent } from '../types';
import { TALENTS } from '../constants';
import { cn } from '../lib/utils';
import { TalentIcon } from './TalentIcon';
import { PageHeader } from './PageHeader';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  Zap,
  Star,
  Scroll,
  Puzzle,
  X,
  Network
} from 'lucide-react';

interface TalentTreeProps {
  points: number;
  shards: number;
  unlockedIds: string[];
  activeIds: string[];
  onUnlock: (id: string, cost: number) => void;
  onToggle: (id: string) => void;
  talents?: Talent[];
  openGuideBook?: (chapter: number) => void;
}

export const TalentTree = React.memo<TalentTreeProps>(({
  points,
  shards,
  unlockedIds,
  activeIds,
  onUnlock,
  onToggle,
  talents = TALENTS,
  openGuideBook
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('scholar_dungeon_talents_collapsed') === 'true';
  });
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [prereqErrorId, setPrereqErrorId] = useState<string | null>(null);

  // Close prerequisite error on click anywhere else
  React.useEffect(() => {
    if (!prereqErrorId) return;
    const handleGlobalClick = () => setPrereqErrorId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [prereqErrorId]);

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextValue = !isCollapsed;
    setIsCollapsed(nextValue);
    localStorage.setItem('scholar_dungeon_talents_collapsed', String(nextValue));
  };

  const branches = [
    { id: 'A', name: 'Truth Crown', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', accent: 'bg-indigo-500' },
    { id: 'B', name: 'Golden Law', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', accent: 'bg-amber-500' },
    { id: 'C', name: 'Fate Dice', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', accent: 'bg-emerald-500' },
  ];

  const getPrereq = (talent: Talent) => {
    if (talent.tier > 1) {
      return talents.find(t => t.branch === talent.branch && t.tier === talent.tier - 1);
    }
    return null;
  };

  const canUnlock = (talent: Talent) => {
    if (unlockedIds.includes(talent.id)) return false;
    
    // Check previous tier in same branch
    const prevTier = getPrereq(talent);
    if (prevTier && !unlockedIds.includes(prevTier.id)) return false;
    
    return true;
  };

  const handleUnlockAttempt = (e: React.MouseEvent, talent: Talent) => {
    e.stopPropagation(); // Prevent immediate closing of prereq bubble if we just triggered it

    if (unlockedIds.includes(talent.id)) {
      onToggle(talent.id);
      return;
    }

    if (!canUnlock(talent)) {
      setPrereqErrorId(talent.id);
      return;
    }

    if (points < talent.cost) {
      setShakingId(talent.id);
      setTimeout(() => setShakingId(null), 500);
      return;
    }

    onUnlock(talent.id, talent.cost);

    // Celebration Confetti
    const colors = talent.branch === 'A' ? ['#818cf8', '#6366f1'] : 
                   talent.branch === 'B' ? ['#fbbf24', '#f59e0b'] : 
                   ['#34d399', '#10b981'];

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
      zIndex: 10000
    });
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8 relative">
      <PageHeader 
        title="Talent Tree"
        description="Customize your learning build"
        icon={Network}
      >
        <div className="flex items-center gap-4 mt-4">
          <button 
            onClick={toggleCollapse}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors bg-slate-900/50 border border-slate-800"
            title={isCollapsed ? "Expand Tree" : "Collapse Tree"}
          >
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openGuideBook?.(7);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-bold uppercase tracking-widest border",
              "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-indigo-400"
            )}
          >
            <HelpCircle size={18} />
            How to get points
          </button>
        </div>
      </PageHeader>



      <div className={cn(
        "grid gap-8 transition-all duration-500",
        isCollapsed ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
      )}>
        {branches.map(branch => (
          <div key={branch.id} className={cn(
            "flex flex-col rounded-3xl border transition-all duration-500", 
            branch.bg, 
            branch.border,
            isCollapsed ? "p-4" : "p-6 space-y-6"
          )}>
            {!isCollapsed && (
              <div className="text-center">
                <h3 className={cn("text-xl font-bold uppercase tracking-widest", branch.color)}>
                  {branch.name}
                </h3>
              </div>
            )}

            <div className={cn(
              "flex relative",
              isCollapsed ? "flex-row items-center gap-4" : "flex-col space-y-8"
            )}>
              {/* Connection Lines - Hidden when collapsed */}
              {!isCollapsed && (
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 -translate-x-1/2 z-0" />
              )}
              
              {isCollapsed && (
                <div className={cn("text-xs font-bold uppercase tracking-widest shrink-0", branch.color)}>
                  {branch.name.split(' ')[0]}
                </div>
              )}

              <div className={cn(
                "flex",
                isCollapsed ? "flex-row gap-3" : "flex-col space-y-8 w-full"
              )}>
                {talents.filter(t => t.branch === branch.id).sort((a, b) => a.tier - b.tier).map(talent => {
                  const isUnlocked = unlockedIds.includes(talent.id);
                  const isActive = activeIds.includes(talent.id);
                  const unlockable = canUnlock(talent);
                  const isShaking = shakingId === talent.id;

                  return (
                    <div key={talent.id} className="group relative">
                      <motion.div
                        whileHover={(unlockable && points >= talent.cost) || isUnlocked ? { scale: 1.05 } : {}}
                        animate={isShaking ? {
                          x: [0, -10, 10, -10, 10, 0],
                          transition: { duration: 0.4 }
                        } : {}}
                        className={cn(
                          "relative z-10 transition-all cursor-pointer",
                          isCollapsed 
                            ? "w-12 h-12 rounded-xl flex items-center justify-center border-2" 
                            : "p-4 rounded-2xl border-2",
                          isUnlocked 
                            ? isActive ? cn("bg-slate-800", branch.border.replace('border-', 'border-').replace('/30', '')) : "bg-slate-900 border-slate-600"
                            : (unlockable && points >= talent.cost) ? "bg-slate-900 border-slate-700 hover:border-slate-400" : "bg-slate-950 border-slate-800 opacity-60"
                        )}
                        onClick={(e) => handleUnlockAttempt(e, talent)}
                      >
                        {/* Prerequisite Error Bubble */}
                        <AnimatePresence>
                          {prereqErrorId === talent.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="absolute -top-12 left-1/2 -translate-x-1/2 z-[100] whitespace-nowrap"
                            >
                              <div className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl border flex items-center gap-2 pointer-events-auto",
                                branch.bg,
                                branch.border.replace('/30', '/60'),
                                branch.color
                              )}>
                                <Lock size={12} />
                                Unlock {getPrereq(talent)?.name || 'Previous'} First
                                <div className={cn(
                                  "absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b",
                                  branch.bg,
                                  branch.border.replace('/30', '/60')
                                )} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {isCollapsed ? (
                          <div className={cn(
                            "transition-colors relative",
                            isUnlocked ? branch.color : "text-slate-600"
                          )}>
                            <TalentIcon iconName={talent.icon} size={24} />
                            {isActive && (
                              <div className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900", branch.accent)} />
                            )}
                            {!isUnlocked && (
                              <div className="absolute -bottom-1.5 -right-1.5 bg-slate-950 rounded-full p-0.5 border border-slate-800">
                                <Lock size={10} className="text-slate-500" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-2">
                              <div className={cn("p-2 rounded-lg", isUnlocked ? branch.bg.replace('/10', '/20') + " " + branch.color : "bg-slate-800 text-slate-500")}>
                                <TalentIcon iconName={talent.icon} size={18} />
                              </div>
                              <div className="flex items-center gap-2">
                                {isActive && <CheckCircle2 size={18} className={branch.color} />}
                                {!isUnlocked && <div className="text-xs font-bold text-slate-500">{talent.cost} PT</div>}
                              </div>
                            </div>
                            
                            <h4 className={cn("font-bold mb-1", isUnlocked ? "text-white" : "text-slate-500")}>
                              {talent.name}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {talent.description}
                            </p>

                            {isUnlocked && (
                              <div className="mt-3 flex items-center justify-between">
                                <span className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded", isActive ? branch.accent + " text-white" : "bg-slate-700 text-slate-400")}>
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>

                      {/* Tooltip for collapsed mode or hover info */}
                      <div className={cn(
                        "absolute z-[110] invisible group-hover:visible transition-opacity transition-all duration-200 pointer-events-none",
                        isCollapsed 
                          ? "bottom-full left-1/2 -translate-x-1/2 mb-3 w-48" 
                          : "bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 lg:bottom-auto lg:mb-0 lg:translate-x-0 lg:w-56",
                        !isCollapsed && branch.id === 'C' 
                          ? "lg:top-0 lg:right-full lg:mr-4" 
                          : !isCollapsed && "lg:top-0 lg:left-full lg:ml-4"
                      )}>
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl ring-1 ring-white/10">
                          <div className={cn("text-xs font-bold mb-1", branch.color)}>{talent.name}</div>
                          <p className="text-xs text-slate-300 leading-relaxed">{talent.description}</p>
                          {!isUnlocked && (
                            <div className="mt-2 text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                              <Lock size={10} />
                              Requires {talent.cost} PT
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
