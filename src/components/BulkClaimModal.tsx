import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Target, Coins, Zap, Star, Scroll, Gift, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { QuestReward } from '../types';

interface BulkClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    items: { title: string; rewards: QuestReward[]; isAchievement: boolean }[];
    timestamp: string;
  } | null | undefined;
}

export const BulkClaimModal: React.FC<BulkClaimModalProps> = ({ isOpen, onClose, result }) => {
  if (!result) return null;

  // Calculate totals
  const totals = result.items.reduce((acc, item) => {
    item.rewards.forEach(r => {
      if (r.type === 'coins') acc.coins += r.amount;
      if (r.type === 'xp') acc.xp += r.amount;
      if (r.type === 'talentPoint') acc.talentPoints += r.amount;
      if (r.type === 'item') {
        if (r.itemName === 'Talent Shard') acc.shards += r.amount;
        if (r.itemName === 'Death Defying Gold Medal') acc.medals += r.amount;
      }
    });
    return acc;
  }, { coins: 0, xp: 0, talentPoints: 0, shards: 0, medals: 0 });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-600/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Gift size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white italic tracking-tight pr-1">Magnificent Harvest!</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Multiple Rewards Claimed</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {totals.coins > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center gap-1 text-center">
                    <Coins className="text-amber-400" size={20} />
                    <span className="text-lg font-black text-white tabular-nums">+{totals.coins}</span>
                    <span className="text-[8px] font-bold text-amber-500/60 uppercase tracking-tighter">Gold Earned</span>
                  </div>
                )}
                {totals.xp > 0 && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center gap-1 text-center">
                    <Zap className="text-indigo-400" size={20} />
                    <span className="text-lg font-black text-white tabular-nums">+{totals.xp}</span>
                    <span className="text-[8px] font-bold text-indigo-500/60 uppercase tracking-tighter">Experience gained</span>
                  </div>
                )}
                {totals.talentPoints > 0 && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center gap-1 text-center">
                    <Scroll className="text-emerald-400" size={20} />
                    <span className="text-lg font-black text-white tabular-nums">+{totals.talentPoints}</span>
                    <span className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-tighter">Talent Scrolls</span>
                  </div>
                )}
                {totals.shards > 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col items-center justify-center gap-1 text-center">
                    <div className="w-5 h-5 bg-blue-400 rounded-sm rotate-45 flex items-center justify-center">
                      <Zap size={12} className="text-slate-900 -rotate-45" />
                    </div>
                    <span className="text-lg font-black text-white tabular-nums">+{totals.shards}</span>
                    <span className="text-[8px] font-bold text-blue-500/60 uppercase tracking-tighter">Talent Shards</span>
                  </div>
                )}
                {totals.medals > 0 && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col items-center justify-center gap-1 text-center">
                    <Trophy className="text-rose-400" size={20} />
                    <span className="text-lg font-black text-white tabular-nums">+{totals.medals}</span>
                    <span className="text-[8px] font-bold text-rose-500/60 uppercase tracking-tighter">Gold Medals</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Claimed Items ({result.items.length})</h3>
                <div className="space-y-2">
                  {result.items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                          item.isAchievement ? "bg-amber-600 text-white" : "bg-indigo-600 text-white"
                        )}>
                          {item.isAchievement ? <Trophy size={18} /> : <Target size={18} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-100 italic leading-tight group-hover:text-white transition-colors">{item.title}</h4>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                            {item.isAchievement ? 'Achievement' : 'Quest'} Complete
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.rewards.map((r, ridx) => (
                          <div key={ridx} className="flex items-center gap-1 px-2 py-1 bg-black/40 rounded-full border border-white/5 text-[10px] font-black text-white">
                            {r.type === 'coins' ? <Coins size={12} className="text-amber-400" /> : 
                             r.type === 'xp' ? <Zap size={12} className="text-indigo-400" /> : 
                             r.type === 'talentPoint' ? <Scroll size={12} className="text-emerald-400" /> :
                             <Gift size={12} className="text-emerald-400" />}
                            {r.type !== 'text' && <span className="tabular-nums">+{r.amount}</span>}
                            {r.type === 'text' && <span className="tabular-nums opacity-80">(Message)</span>}
                          </div>
                        ))}
                        <CheckCircle2 size={16} className="text-emerald-500 ml-1" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-950/50 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                Close Chronicle
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
