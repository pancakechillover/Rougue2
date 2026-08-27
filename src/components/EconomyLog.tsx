import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { Coins, Zap, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const EconomyLog: React.FC<{ history: Transaction[] }> = ({ history }) => {
  const [filter, setFilter] = useState<'all' | 'coins' | 'xp'>('all');

  const filteredHistory = useMemo(() => {
    return history.filter(tx => filter === 'all' || tx.type === filter);
  }, [history, filter]);

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-900 rounded-2xl border border-slate-800 w-fit p-1">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
            filter === 'all' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter('coins')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all gap-2 flex items-center",
            filter === 'coins' ? "bg-amber-500 text-white shadow-lg" : "text-slate-500 hover:text-amber-400/70"
          )}
        >
          <Coins size={14} /> Gold
        </button>
        <button
          onClick={() => setFilter('xp')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all gap-2 flex items-center",
            filter === 'xp' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-indigo-400/70"
          )}
        >
          <Zap size={14} /> XP
        </button>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-slate-800 bg-slate-950/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reason / Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32 text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20">
                    <Coins size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 font-medium">No transactions recorded yet.</p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border shrink-0",
                        tx.type === 'coins' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                      )}>
                        {tx.type === 'coins' ? <Coins size={18} /> : <Zap size={18} />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-200 text-sm">{tx.reason || 'Unknown Source'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm",
                        tx.amount > 0 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-500">
                        <Calendar size={14} />
                        <span className="text-xs font-mono">
                          {format(new Date(tx.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
