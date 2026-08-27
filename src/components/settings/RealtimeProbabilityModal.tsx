import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, AlertCircle, Clock } from 'lucide-react';
import { RewardCard, AppState } from '../../types';

export const RealtimeProbabilityModal = ({ pool, appState, onClose }: { pool: RewardCard[], appState: AppState, onClose: () => void }) => {
  const now = Date.now();
  
  // Calculate real-time weight and availability
  const realTimePool = pool.map(card => {
    let available = true;
    let claimsInPeriod = 0;
    let pendingOccurrences = 0;
    let refreshTime: Date | null = null;
    
    if (card.limitCount && card.limitPeriodDays) {
      const periodMs = card.limitPeriodDays * 24 * 60 * 60 * 1000;
      
      // Calculate claims in period
      const activeClaims = (card.claimHistory || [])
        .map(ts => new Date(ts).getTime())
        .filter(t => (now - t) < periodMs)
        .sort((a, b) => a - b); // Oldest first
        
      claimsInPeriod = activeClaims.length;
      
      // Calculate pending occurrences in chest
      if (appState.pendingRewardChest) {
        for (const chest of appState.pendingRewardChest) {
          if (chest.choices.some(c => c.name === card.name)) pendingOccurrences++;
        }
      }
      
      if ((claimsInPeriod + pendingOccurrences) >= card.limitCount) {
        available = false;
        // The time when the oldest claim expires
        if (activeClaims.length > 0) {
          // If pending occurrences are taking up the quota, refreshing won't happen until they claim it or time passes?
          // Since pending items don't have a timestamp yet, we just look at activeClaims. 
          // If activeClaims alone is enough to exhaust the limit, it refreshes when the oldest claim expires.
          // If pendingOccurrences is what exhausts it, then it refreshes once the pending chest is cleared (or if they pick it, it becomes a claim).
          if (claimsInPeriod > 0 && (claimsInPeriod === card.limitCount || activeClaims.length > 0)) {
            refreshTime = new Date(activeClaims[0] + periodMs);
          }
        }
      }
    }
    
    return {
      ...card,
      available,
      claimsInPeriod,
      pendingOccurrences,
      refreshTime,
      currentWeight: available ? (card.weight || 0) : 0
    };
  });
  
  const totalWeight = realTimePool.reduce((acc, card) => acc + card.currentWeight, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 p-6 rounded-[2rem] border border-slate-700 w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <HelpCircle size={20} />
            </div>
            <h4 className="text-xl font-bold text-white tracking-tight">Real-Time Loot Pool Probability</h4>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
           <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-sm text-slate-300">
             <p>This table strictly displays your <strong>Real-Time Drop Probabilities</strong> depending on active limits. A reward drops to <strong className="text-rose-400">0%</strong> when it reaches its frequency limit (including items currently waiting untouched in your chest).</p>
           </div>
           
           <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
             <table className="w-full text-left text-xs border-collapse">
               <thead>
                 <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                   <th className="px-4 py-3">Reward</th>
                   <th className="px-4 py-3 text-center">Base Weight</th>
                   <th className="px-4 py-3 text-center">Real-Time Weight</th>
                   <th className="px-4 py-3 text-center">Real-Time Prob.</th>
                   <th className="px-4 py-3">Limit Status</th>
                   <th className="px-4 py-3">Refresh Time</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                 {realTimePool.map((card, i) => {
                   const prob = totalWeight > 0 ? ((card.currentWeight / totalWeight) * 100).toFixed(1) : '0.0';
                   return (
                     <tr key={card.id || i} className={`group hover:bg-slate-800/30 transition-colors ${!card.available ? 'opacity-60' : ''}`}>
                       <td className="px-4 py-3 font-bold text-slate-200">{card.name}</td>
                       <td className="px-4 py-3 text-center text-slate-500 font-mono">{card.weight}</td>
                       <td className={`px-4 py-3 text-center font-mono font-bold ${card.available ? 'text-indigo-400' : 'text-slate-600'}`}>{card.currentWeight}</td>
                       <td className={`px-4 py-3 text-center font-mono font-bold ${card.available ? 'text-emerald-400' : 'text-slate-600'}`}>{prob}%</td>
                       <td className="px-4 py-3 text-[10px]">
                         {card.limitCount ? (
                           <span className={`px-2 py-0.5 rounded border ${card.available ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                             {card.claimsInPeriod + card.pendingOccurrences} / {card.limitCount} (in {card.limitPeriodDays}d) 
                             {card.pendingOccurrences > 0 && ` (+${card.pendingOccurrences} pending)`}
                           </span>
                         ) : <span className="text-slate-600">—</span>}
                       </td>
                       <td className="px-4 py-3">
                         {!card.available ? (
                           card.refreshTime ? (
                             <div className="flex items-center gap-1 text-amber-500 font-mono text-[10px]">
                               <Clock size={12} /> {card.refreshTime.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                             </div>
                           ) : (
                             <div className="flex items-center gap-1 text-amber-500 font-mono text-[10px]">
                               <AlertCircle size={12} /> Pending Select
                             </div>
                           )
                         ) : <span className="text-slate-600">—</span>}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
