import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Package, Scroll, Trophy, Zap, Shield, ArrowLeft, History as HistoryIcon } from 'lucide-react';
import { AppState, RewardHistoryItem } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface InventoryTabProps {
  appState: AppState;
  history: RewardHistoryItem[];
  useInventoryItem: (id: string) => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ appState, history, useInventoryItem }) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const inventoryItems = [
    {
      id: 'talentPoints',
      name: 'Talent Scrolls',
      description: 'Used to unlock powerful new talents in the Skill Tree.',
      icon: Scroll,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      count: appState.talentPoints || 0,
      historyFilter: (item: RewardHistoryItem) => (item.type as any) === 'talentPoint' || item.name.includes('Talent Scroll')
    },
    {
      id: 'talentShards',
      name: 'Talent Shards',
      description: 'Collect 3 shards to automatically forge 1 Talent Scroll.',
      icon: Trophy,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      count: appState.talentShards || 0,
      historyFilter: (item: RewardHistoryItem) => item.itemType === 'talent_shard' || item.name.includes('Talent Shard') || (item.type as any) === 'talentShard'
    },
    {
      id: 'deathDefyingMedals',
      name: 'Death Defying Medals',
      description: 'Automatically saves your streak if you miss a day.',
      icon: Shield,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      count: appState.deathDefyingMedals || 0,
      historyFilter: (item: RewardHistoryItem) => item.itemType === 'death_defying_medal' || item.name.includes('Death Defying')
    },
    {
      id: 'doubleXpCards',
      name: 'Double XP Cards',
      description: 'Consumed from the reward chest to double XP on the next session.',
      icon: Zap,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      count: appState.doubleXpCards || 0,
      historyFilter: (item: RewardHistoryItem) => item.itemType === 'double_xp' || item.name.includes('Double XP')
    },
    {
      id: 'doubleGoldCards',
      name: 'Double Gold Cards',
      description: 'Consumed from the reward chest to double Gold on the next session.',
      icon: Package,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      count: appState.doubleGoldCards || 0,
      historyFilter: (item: RewardHistoryItem) => item.itemType === 'double_coin' || item.name.includes('Double Gold') || item.name.includes('Double Coin')
    }
  ];

  if (selectedItem) {
    const itemData = inventoryItems.find(i => i.id === selectedItem);
    const itemHistory = history.filter(itemData?.historyFilter || (() => false));

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <button
          onClick={() => setSelectedItem(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back to Inventory
        </button>

        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", itemData?.bg, itemData?.color, itemData?.border)}>
              {itemData && React.createElement(itemData.icon, { size: 24 })}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{itemData?.name} History</h3>
              <p className="text-slate-400 text-sm">Showing all acquisition records.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Record</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">Source</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {itemHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-slate-500 font-medium">
                      No records found for this item.
                    </td>
                  </tr>
                ) : (
                  itemHistory.map(record => (
                    <tr key={record.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-200 text-sm">{record.name}</span>
                          {record.note && (
                            <span className="text-[10px] text-slate-500">{record.note}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          {record.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <div className={cn(
                            "inline-flex items-center px-2 py-1 rounded inline-block font-mono font-bold text-xs",
                            (record.amount || 1) > 0 
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          )}>
                            {(record.amount || 1) > 0 ? '+' : ''}{record.amount || 1}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 w-28 text-right">
                            {format(new Date(record.timestamp), 'MMM dd HH:mm')}
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
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {inventoryItems.map(item => (
        <motion.div
          key={item.id}
          whileHover={{ y: -4 }}
          onClick={() => setSelectedItem(item.id)}
          className="bg-slate-900 rounded-3xl p-6 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all group overflow-hidden relative"
        >
          <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40", item.bg)} />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", item.bg, item.color, item.border)}>
                {React.createElement(item.icon, { size: 24 })}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Owned</p>
                <div className="text-3xl font-black text-white leading-none">
                  {item.count}
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-200 mb-2">{item.name}</h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-grow">
              {item.description}
            </p>
            
            <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/70 group-hover:text-indigo-400 transition-colors">
                <HistoryIcon size={14} />
                <span>View Records</span>
              </div>
              
              {(item.id === 'doubleXpCards' || item.id === 'doubleGoldCards') && item.count > 0 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const isActive = item.id === 'doubleXpCards' ? appState.doubleXpActive : appState.doubleGoldActive;
                    if (!isActive) {
                      useInventoryItem(item.id);
                    }
                  }}
                  disabled={item.id === 'doubleXpCards' ? appState.doubleXpActive : appState.doubleGoldActive}
                  className="px-4 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300 font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed z-20"
                >
                  {(item.id === 'doubleXpCards' ? appState.doubleXpActive : appState.doubleGoldActive) ? 'Buff Active' : 'Use Buff'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
