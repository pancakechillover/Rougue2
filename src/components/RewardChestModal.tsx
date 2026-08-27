import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, StudySession, Rarity } from '../types';
import { cn } from '../lib/utils';
import { triggerSimpleConfetti } from '../lib/effects';
import { X, Sparkles, Trophy, Zap, Coins, Clock, Target, Calendar, RotateCcw } from 'lucide-react';
import { TreasureChestIcon } from './icons/TreasureChestIcon';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';
import { format } from 'date-fns';

interface RewardChestModalProps {
  chest: { session: StudySession; choices: RewardCard[] }[];
  onSelect: (reward: RewardCard | null, sessionId: string, isAutoPick?: boolean) => void;
  onClose: () => void;
  getDungeonName: (id: string) => string;
  onNavigateToVault?: () => void;
  activeTalents?: string[];
  onRerollItem?: (index: number) => void;
}

export const RewardChestModal: React.FC<RewardChestModalProps> = ({ chest, onSelect, onClose, getDungeonName, onNavigateToVault, activeTalents = [], onRerollItem }) => {
  useScrollLock(true);
  const [autoPickSummary, setAutoPickSummary] = useState<{reward: RewardCard | null, session: StudySession}[] | null>(null);
  const [rerolledSessions, setRerolledSessions] = useState<Set<string>>(new Set());
  
  const getRarityValue = (r: Rarity) => {
    switch(r) {
      case 'mythic': return 6;
      case 'legendary': return 5;
      case 'epic': return 4;
      case 'rare': return 3;
      case 'uncommon': return 2;
      default: return 1;
    }
  };

  const handleAutoPickBest = () => {
    const picked: { reward: RewardCard | null, session: StudySession }[] = [];
    chest.forEach(item => {
      if (item.choices.length > 0) {
        const sorted = [...item.choices].sort((a, b) => getRarityValue(b.rarity) - getRarityValue(a.rarity));
        picked.push({ reward: sorted[0], session: item.session });
        onSelect(sorted[0], item.session.id, true);
      } else {
        picked.push({ reward: null, session: item.session });
        onSelect(null, item.session.id, true);
      }
    });
    setAutoPickSummary(picked);
    triggerSimpleConfetti();
  };

  if (autoPickSummary) {
    const pickedRewards = autoPickSummary.filter(p => p.reward) as { reward: RewardCard, session: StudySession }[];
    
    return createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4 overflow-y-auto overflow-x-hidden border-0 m-0 p-0">
          <motion.div
             initial={{ scale: 0.95, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0.95, opacity: 0 }}
             className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-xl shadow-2xl relative my-8"
          >
             <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Sparkles className="text-amber-400" /> Auto-Pick Summary
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors">
                  <X size={20} />
                </button>
             </div>
             <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col gap-3">
               {pickedRewards.length === 0 ? (
                 <div className="text-center text-slate-500 py-8">
                   No rewards obtained.
                 </div>
               ) : (
                 pickedRewards.map((item, idx) => (
                   <div key={idx} className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                      <div className={cn("px-2 py-1 text-[10px] uppercase font-black rounded-sm tracking-widest flex-shrink-0",
                           item.reward.rarity === 'mythic' ? "bg-rose-500/20 text-rose-400" :
                           item.reward.rarity === 'legendary' ? "bg-amber-400/20 text-amber-400" :
                           item.reward.rarity === 'epic' ? "bg-purple-500/20 text-purple-400" :
                           item.reward.rarity === 'rare' ? "bg-blue-400/20 text-blue-400" :
                           item.reward.rarity === 'uncommon' ? "bg-emerald-500/20 text-emerald-400" :
                           "bg-slate-700 text-slate-300"
                      )}>
                        {item.reward.rarity}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold truncate text-sm">{item.reward.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{getDungeonName(item.session.dungeonId)}</p>
                      </div>
                   </div>
                 ))
               )}
             </div>
             <div className="p-6 border-t border-slate-800 flex sm:flex-row flex-col gap-3">
               <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold transition-all text-sm">
                 Confirm
               </button>
               {onNavigateToVault && (
                 <button onClick={onNavigateToVault} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-sm">
                   Go to Vault
                 </button>
               )}
             </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    );
  }

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4 overflow-y-auto overflow-x-hidden border-0 m-0 p-0">
        <motion.div
           initial={{ scale: 0.95, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           exit={{ scale: 0.95, opacity: 0 }}
           className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-4xl shadow-2xl relative my-8"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-800 tracking-tight">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                <TreasureChestIcon size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Reward Chest</h3>
                <p className="text-sm text-slate-400">{chest.length} pending session{chest.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAutoPickBest}
                disabled={chest.length === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                <span>Auto-Pick Best for All</span>
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6">
            {chest.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <TreasureChestIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>The chest is empty.</p>
              </div>
            ) : (
              chest.map((item, idx) => (
                <div key={item.session.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 md:p-6 pb-2">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className={cn("p-2 rounded-full border", item.session.isCrit ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400")}>
                       <Trophy size={20} />
                    </div>
                    <div>
                      <h4 className={cn("font-bold flex items-center gap-2", item.session.isCrit ? "text-amber-400" : "text-white")}>
                        {getDungeonName(item.session.dungeonId)}
                        {item.session.isCrit && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 font-bold tracking-widest uppercase">Critical</span>}
                      </h4>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> {format(new Date(item.session.timestamp), 'MM/dd HH:mm')}</span>
                        <span className="flex items-center gap-1"><Zap size={12} className="text-emerald-400" /> +{item.session.xpEarned} XP</span>
                        <span className="flex items-center gap-1"><Coins size={12} className="text-amber-400" /> +{item.session.coinsEarned} Gold</span>
                        <span className="flex items-center gap-1"><Clock size={12} className="text-indigo-400" /> {item.session.duration}m</span>
                        <span className="flex items-center gap-1"><Target size={12} className="text-rose-400" /> {item.session.focusDuration || '??'}m Goal</span>
                      </div>
                    </div>
                    {activeTalents.includes('c2') && onRerollItem && !rerolledSessions.has(item.session.id) && (
                      <button
                        onClick={() => {
                           setRerolledSessions(prev => new Set(prev).add(item.session.id));
                           onRerollItem(idx);
                        }}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] sm:text-xs hover:bg-indigo-500 transition-all"
                      >
                        <RotateCcw size={14} />
                        Reroll
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                    {item.choices.map((card, cIdx) => {
                      const now = Date.now();
                      const periodMs = (card.limitPeriodDays || 1) * 24 * 60 * 60 * 1000;
                      const claimsInPeriod = (card.claimHistory || []).filter(ts => (now - new Date(ts).getTime()) < periodMs).length;
                      
                      return (
                      <motion.button
                        key={card.id + cIdx + (rerolledSessions.has(item.session.id) ? "_rerolled" : "")}
                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: cIdx * 0.1 }}
                        onClick={() => { triggerSimpleConfetti(); onSelect(card, item.session.id); }}
                        className={cn(
                          "relative p-4 rounded-2xl border bg-slate-900/50 text-left transition-all hover:-translate-y-1 hover:shadow-lg overflow-hidden group cursor-pointer h-full flex flex-col justify-between min-h-[160px]",
                          card.rarity === 'mythic' && "border-rose-500/50 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
                          card.rarity === 'legendary' && "border-amber-400/50 hover:border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.15)]",
                          card.rarity === 'epic' && "border-purple-500/50 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]",
                          card.rarity === 'rare' && "border-blue-400/40 hover:border-blue-400/70",
                          card.rarity === 'uncommon' && "border-emerald-500/40 hover:border-emerald-400/70",
                          card.rarity === 'common' && "border-slate-700 hover:border-slate-500"
                        )}
                      >
                         <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("text-[10px] font-black uppercase tracking-widest inline-block px-2 py-0.5 rounded-sm",
                                 card.rarity === 'mythic' ? "bg-rose-500/20 text-rose-400" :
                                 card.rarity === 'legendary' ? "bg-amber-400/20 text-amber-400" :
                                 card.rarity === 'epic' ? "bg-purple-500/20 text-purple-400" :
                                 card.rarity === 'rare' ? "bg-blue-400/20 text-blue-400" :
                                 card.rarity === 'uncommon' ? "bg-emerald-500/20 text-emerald-400" :
                                 "bg-slate-800 text-slate-400"
                            )}>
                              {card.rarity}
                            </div>
                            
                            {card.limitCount && card.limitCount > 0 ? (
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                {claimsInPeriod}/{card.limitCount} Lmt
                              </span>
                            ) : null}
                          </div>
                          <h4 className="text-white font-bold mb-2 leading-tight">{card.name}</h4>
                          <p className="text-xs text-slate-400 line-clamp-3">{card.description}</p>
                         </div>
                      </motion.button>
                    )})}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
