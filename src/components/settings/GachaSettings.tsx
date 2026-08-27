import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, ShopItem, GachaPool, Rarity } from '../../types';
import { INITIAL_GACHA } from '../../constants';
import { Plus, Trash2, Save, Edit2, X, ChevronRight, Coins, Zap, Sparkles, Trophy, Timer as TimerIcon, Package, Flame, AlertTriangle, Scroll, Volume2, VolumeX, Sun, Moon, Settings as SettingsIcon, ShoppingBag, Trees, Waves, Database, Download, Upload, Target, Gift, User, Sword, Eye, Palette, Check, Bell, BellOff, RefreshCw, Key, Layers, Sunrise, Cloud, CloudSun, Lollipop, Wrench, History, Ticket, Share2, ClipboardCopy } from 'lucide-react';
import { SlotMachine } from '../icons/SlotMachine';
import * as LucideIcons from 'lucide-react';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../../version';
import { cn, getXPForLevel, getDefaultRewardForLevel } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { SpinnerInput } from '../SpinnerInput';
import { RARITY_COLORS, getColorClass } from '../../lib/colors';
import { ConfirmModal } from '../ConfirmModal';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


export const GachaSettings = ({ pools, onUpdate }: { pools: GachaPool[], onUpdate: (p: GachaPool[]) => void }) => {
  const [editing, setEditing] = useState<GachaPool | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm?: () => void; 
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
  }>({ isOpen: false, title: '', message: '' });

  const handleExport = (pool: GachaPool) => {
    const data = JSON.stringify(pool, null, 2);
    navigator.clipboard.writeText(data);
    setModalConfig({
      isOpen: true,
      title: "Export Successful",
      message: "Pool configuration copied to clipboard!",
      confirmText: "Got it",
      type: "info",
      isAlert: true
    });
  };

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const pool = JSON.parse(text);
      
      if (!pool.name || (!pool.rarities && !pool.items)) {
        throw new Error("Invalid pool format");
      }

      // Generate new ID
      const newPool = {
        ...pool,
        id: `imported_${Date.now()}`
      };

      onUpdate([...pools, newPool]);
      setModalConfig({
        isOpen: true,
        title: "Import Successful",
        message: "Pool imported successfully!",
        confirmText: "Great",
        type: "info",
        isAlert: true
      });
    } catch (e) {
      setModalConfig({
        isOpen: true,
        title: "Import Failed",
        message: "Failed to import pool. Make sure valid JSON is in your clipboard.",
        confirmText: "Close",
        type: "danger",
        isAlert: true
      });
    }
  };

  const addNewPool = (type: 'gacha' | 'ichiban') => {
    const id = `${type}_${Date.now()}`;
    const newPool: GachaPool = type === 'gacha' ? {
      id,
      name: `New Gacha Pool`,
      type: 'gacha',
      cost: 100,
      rarities: [
        { id: 'SSR', name: 'SSR', color: 'amber', weight: 5, rarityValue: 5 },
        { id: 'SR', name: 'SR', color: 'purple', weight: 15, rarityValue: 4 },
        { id: 'R', name: 'R', color: 'blue', weight: 80, rarityValue: 3 },
      ],
      items: [
        { rarity: 'SSR', name: 'Legendary Item', rarityValue: 5 },
        { rarity: 'SR', name: 'Epic Item', rarityValue: 4 },
        { rarity: 'R', name: 'Rare Item', rarityValue: 3 }
      ]
    } : {
      id,
      name: `New Ichiban Pool`,
      type: 'ichiban',
      cost: 50,
      items: [
        { rarity: 'A Prize', name: 'A Prize Item', count: 1, initialCount: 1, color: 'amber', rarityValue: 5 },
        { rarity: 'B Prize', name: 'B Prize Item', count: 2, initialCount: 2, color: 'purple', rarityValue: 4 },
        { rarity: 'LastOne', name: 'Last One Item', count: 1, initialCount: 1, color: 'rose', rarityValue: 6 }
      ]
    };

    onUpdate([...pools, newPool]);
  };

  const deletePool = (id: string) => {
    if (pools.length <= 1) return;
    setModalConfig({
      isOpen: true,
      title: "Delete Pool?",
      message: "Are you sure you want to delete this pool? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
      onConfirm: () => onUpdate(pools.filter(p => p.id !== id))
    });
  };

  const renamePool = (id: string) => {
    if (!renameValue.trim()) return;
    onUpdate(pools.map(p => p.id === id ? { ...p, name: renameValue } : p));
    setIsRenaming(null);
  };

  return (
    <div id="setting-gacha" className="space-y-6">
      <div className="space-y-12">
        {/* Gacha Pools Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-2.5 text-purple-400 mb-6 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <SlotMachine size={20} />
              <h3 className="text-lg font-bold uppercase tracking-widest pr-1">Gacha</h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleImport}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 text-slate-400 border border-slate-800 rounded-lg text-xs font-bold hover:bg-slate-800 hover:text-slate-200 transition-all font-mono"
              >
                <Upload size={14} /> Import Pool
              </button>
              <button 
                onClick={() => addNewPool('gacha')}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-500/20 transition-all"
              >
                <Plus size={16} /> Add Pool
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {pools.filter(p => p.type === 'gacha').map(pool => (
              <div key={pool.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <SlotMachine size={20} />
                    </div>
                    {isRenaming === pool.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          type="text" 
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && renamePool(pool.id)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:border-indigo-500 transition-colors"
                        />
                        <button onClick={() => renamePool(pool.id)} className="p-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/40"><Check size={16} /></button>
                        <button onClick={() => setIsRenaming(null)} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="group flex items-center gap-2">
                        <div>
                          <h4 className="font-bold text-white">{pool.name}</h4>
                          <p className="text-xs text-slate-500 uppercase tracking-widest">Draw cost • {pool.cost.toLocaleString()} Gold</p>
                        </div>
                        <button 
                          onClick={() => {
                            setIsRenaming(pool.id);
                            setRenameValue(pool.name);
                          }}
                          className="p-1.5 text-slate-600 transition-opacity hover:text-indigo-400 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleExport(pool)} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-indigo-400 transition-colors" title="Export to Clipboard"><Share2 size={16} /></button>
                    <button onClick={() => setEditing(pool)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700">Edit Settings</button>
                    <button 
                      onClick={() => deletePool(pool.id)} 
                      disabled={pools.filter(p => p.type === 'gacha').length <= 1}
                      className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                  <div className="mt-4">
                    {(() => {
                      const rarities = pool.rarities || [
                        { id: 'SSR', name: 'SSR', color: 'amber', weight: pool.weights?.SSR || 5 },
                        { id: 'SR', name: 'SR', color: 'purple', weight: pool.weights?.SR || 15 },
                        { id: 'R', name: 'R', color: 'blue', weight: pool.weights?.R || 80 },
                      ];
                      const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
                      return (
                        <div className="flex flex-col gap-2">
                          {rarities.map(rarity => {
                            const prob = totalWeight > 0 ? ((rarity.weight / totalWeight) * 100).toFixed(1) : '0';
                            const items = pool.items.filter(i => i.rarity === rarity.id).map(i => i.name).join(', ') || 'None';
                            
                            const colorClass = `text-${rarity.color}-400 border-${rarity.color}-400/20 bg-${rarity.color}-400/10`;
                              
                            return (
                              <div key={rarity.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-4 w-full sm:w-48 shrink-0">
                                  <div className={cn("px-3 py-1 rounded-lg text-xs font-black border", colorClass)}>
                                    {rarity.name}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Drop Rate</span>
                                    <span className="text-sm font-bold text-slate-300">{prob}%</span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 flex items-center">
                                  <p className="text-xs text-slate-400 leading-relaxed" title={items}>
                                    {items}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        {/* Ichiban Pools Section */}
        <div className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2.5 text-emerald-400 mb-6 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Ticket size={20} />
              <h3 className="text-lg font-bold uppercase tracking-widest pr-1">Ichiban Kuji</h3>
            </div>
            <button 
              onClick={() => addNewPool('ichiban')}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all"
            >
              <Plus size={16} /> Add Pool
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {pools.filter(p => p.type === 'ichiban').map(pool => (
              <div key={pool.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Ticket size={20} />
                    </div>
                    {isRenaming === pool.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          type="text" 
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && renamePool(pool.id)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:border-indigo-500 transition-colors"
                        />
                        <button onClick={() => renamePool(pool.id)} className="p-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/40"><Check size={16} /></button>
                        <button onClick={() => setIsRenaming(null)} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="group flex items-center gap-2">
                        <div>
                          <h4 className="font-bold text-white">{pool.name}</h4>
                          <p className="text-xs text-slate-500 uppercase tracking-widest">Ticket cost • {pool.cost.toLocaleString()} Gold</p>
                        </div>
                        <button 
                          onClick={() => {
                            setIsRenaming(pool.id);
                            setRenameValue(pool.name);
                          }}
                          className="p-1.5 text-slate-600 transition-opacity hover:text-indigo-400 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleExport(pool)} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-indigo-400 transition-colors" title="Export to Clipboard"><Share2 size={16} /></button>
                    <button onClick={() => {
                      const sortedPool = {
                        ...pool,
                        items: [...pool.items].sort((a, b) => {
                          if (a.rarity === 'LastOne') return -1;
                          if (b.rarity === 'LastOne') return 1;
                          return 0;
                        })
                      };
                      setEditing(sortedPool);
                    }} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700">Manage Tiers</button>
                    <button 
                      onClick={() => deletePool(pool.id)} 
                      disabled={pools.filter(p => p.type === 'ichiban').length <= 1}
                      className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                  <div className="mt-4">
                    {(() => {
                      const totalCount = pool.items.reduce((acc, item) => item.rarity !== 'LastOne' ? acc + (item.count || 0) : acc, 0);
                      
                      return (
                        <div className="flex flex-col gap-2">
                          {pool.items.map((item, idx) => {
                            const isLastOne = item.rarity === 'LastOne';
                            const prob = (!isLastOne && totalCount > 0 && item.count !== undefined) 
                              ? ((item.count / totalCount) * 100).toFixed(1) 
                              : '0.0';
                              
                            const itemColor = getColorClass(item.color || 'slate');
                            return (
                              <div key={idx} className={cn(
                                "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border",
                                isLastOne 
                                  ? "bg-slate-900/50 border-rose-500/30" 
                                  : "bg-slate-950/50 border-slate-800/50"
                              )}>
                                <div className="flex items-center gap-4 w-full sm:w-48 shrink-0">
                                  <div className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-black border uppercase tracking-wider",
                                    isLastOne ? "text-rose-500 border-rose-500/30 bg-rose-500/10" : `${itemColor.textClass} ${itemColor.borderClass} ${itemColor.bgClass}`
                                  )}>
                                    {isLastOne ? 'Last One' : item.rarity}
                                  </div>
                                  {!isLastOne && (
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Drop Rate</span>
                                      <span className="text-sm font-bold text-slate-300">{prob}%</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex items-center pr-4">
                                  <p className={cn(
                                    "text-sm font-bold truncate",
                                    isLastOne ? "text-rose-300" : "text-slate-300"
                                  )} title={item.name}>
                                    {item.name}
                                  </p>
                                </div>
                                {!isLastOne && (
                                  <div className="flex items-center gap-3 shrink-0 sm:pl-4 sm:border-l sm:border-slate-800/50 pt-2 sm:pt-0 border-t border-slate-800/50 sm:border-t-0 mt-2 sm:mt-0">
                                    <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remaining</span>
                                      <span className={cn(
                                        "font-mono text-sm font-black",
                                        item.count === 0 ? "text-red-400" : "text-slate-300"
                                      )}>
                                        {item.count} <span className="text-slate-600 font-medium text-xs">/ {item.initialCount || item.count}</span>
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      {createPortal(
        <AnimatePresence>
          {editing && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-700 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h4 className="text-xl font-bold text-white">Edit Pool: <span className="text-indigo-400">{editing.name}</span></h4>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: "Restore Defaults?",
                          message: "Restore this pool to its default settings? This will overwrite your current configuration.",
                          confirmText: "Restore Defaults",
                          type: "warning",
                          onConfirm: () => {
                            const defaultPool = INITIAL_GACHA.find(p => p.id === editing.id);
                            if (defaultPool) {
                              const sortedDefault = {
                                ...defaultPool,
                                items: [...defaultPool.items].sort((a, b) => {
                                  if (a.rarity === 'LastOne') return -1;
                                  if (b.rarity === 'LastOne') return 1;
                                  return 0;
                                })
                              };
                              setEditing(JSON.parse(JSON.stringify(sortedDefault)));
                            }
                          }
                        });
                      }}
                      className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold hover:text-white transition-colors"
                    >
                      Reset
                    </button>
                    <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pool Name</label>
                      <input 
                        type="text"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all"
                        placeholder="Pool Name"
                      />
                    </div>
                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Cost per Draw (Gold)</label>
                      <SpinnerInput 
                        value={editing.cost === undefined || editing.cost === null ? '' : editing.cost}
                        onChange={(val) => setEditing({ ...editing, cost: typeof val === 'number' ? val : ('' as any) })}
                      />
                    </div>
                  </div>

                  {editing.type === 'gacha' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Rarity Tiers & Drop Weights</label>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">Configure rarity levels, their appearance, and probability weights.</p>
                        </div>
                        <button 
                          onClick={() => {
                            const newRarities = [...(editing.rarities || [])];
                            const newId = `rarity_${Date.now()}`;
                            newRarities.push({ id: newId, name: 'NEW', color: 'slate', weight: 10, rarityValue: 1 });
                            const newItems = [...editing.items, { rarity: newId, name: '', rarityValue: 1 }];
                            setEditing({ ...editing, rarities: newRarities, items: newItems });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold hover:bg-indigo-600/40 transition-colors whitespace-nowrap"
                        >
                          <Plus size={14} /> Add Tier
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {(() => {
                          const rarities = editing.rarities || [
                            { id: 'SSR', name: 'SSR', color: 'amber', weight: editing.weights?.SSR || 5 },
                            { id: 'SR', name: 'SR', color: 'purple', weight: editing.weights?.SR || 15 },
                            { id: 'R', name: 'R', color: 'blue', weight: editing.weights?.R || 80 },
                          ];
                          const totalWeight = rarities.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
                          
                          return rarities.map((rarity, rIdx) => {
                            const itemIdx = editing.items.findIndex(i => i.rarity === rarity.id);
                            const activeColor = RARITY_COLORS.find(c => c.id === rarity.color) || RARITY_COLORS[0];
                            const dropRate = totalWeight > 0 ? (((Number(rarity.weight) || 0) / totalWeight) * 100).toFixed(1) : '0.0';
                            
                            return (
                              <div key={rarity.id} className="relative group flex flex-col gap-4 p-5 bg-slate-900 border border-slate-700/60 rounded-2xl transition-all hover:border-slate-600">
                                {/* Remove button (absolute) */}
                                <button 
                                  onClick={() => {
                                    if (rarities.length <= 1) return;
                                    const newRarities = rarities.filter((_, i) => i !== rIdx);
                                    const newItems = editing.items.filter(i => i.rarity !== rarity.id);
                                    setEditing({ ...editing, rarities: newRarities, items: newItems });
                                  }}
                                  disabled={rarities.length <= 1}
                                  className={cn(
                                    "absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center border shadow-lg z-10 transition-all",
                                    rarities.length <= 1 
                                      ? "opacity-0 pointer-events-none" 
                                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-red-500 hover:text-white hover:border-red-400 transition-opacity scale-90 group-hover:scale-100"
                                  )}
                                >
                                  <X size={14} />
                                </button>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                  {/* Rarity Name */}
                                  <div className="sm:col-span-5">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Tier Name</label>
                                    <input 
                                      type="text" 
                                      value={rarity.name}
                                      onChange={(e) => {
                                        const newRarities = [...rarities];
                                        newRarities[rIdx] = { ...rarity, name: e.target.value };
                                        setEditing({ ...editing, rarities: newRarities });
                                      }}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-indigo-500 transition-colors"
                                      placeholder="e.g. Legendary"
                                    />
                                  </div>

                                  {/* Color Theme */}
                                  <div className="sm:col-span-4">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Color Theme</label>
                                    <div className={cn("relative rounded-xl border flex items-center bg-slate-950 transition-colors", activeColor.borderClass)}>
                                      <select 
                                        value={rarity.color}
                                        onChange={(e) => {
                                          const newRarities = [...rarities];
                                          const selColor = e.target.value;
                                          const val = RARITY_COLORS.find(c => c.id === selColor)?.value;
                                          newRarities[rIdx] = { ...rarity, color: selColor, rarityValue: val };
                                          // Update items with this rarity as well to keep them in sync
                                          const newItems = (editing.items || []).map(item => {
                                            if (item.rarity === rarity.id) {
                                              return { ...item, rarityValue: val };
                                            }
                                            return item;
                                          });
                                          setEditing({ ...editing, rarities: newRarities, items: newItems });
                                        }}
                                        className={cn(
                                          "w-full appearance-none bg-transparent px-4 py-2.5 text-sm font-bold focus:outline-none z-10",
                                          activeColor.textClass
                                        )}
                                      >
                                        {RARITY_COLORS.map(c => (
                                          <option key={c.id} value={c.id} className="text-slate-300 bg-slate-900">{c.name}</option>
                                        ))}
                                      </select>
                                      {/* Custom dropdown arrow */}
                                      <div className={cn("absolute right-3 pointer-events-none", activeColor.textClass)}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Weight */}
                                  <div className="sm:col-span-3">
                                    <div className="flex justify-between items-end mb-1.5">
                                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Drop Weight</label>
                                      <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{dropRate}%</span>
                                    </div>
                                    <SpinnerInput 
                                      value={rarity.weight === undefined || rarity.weight === null ? '' : rarity.weight} 
                                      onChange={(val) => {
                                        const newRarities = [...rarities];
                                        newRarities[rIdx] = { ...rarity, weight: typeof val === 'number' ? val : 0 };
                                        setEditing({ ...editing, rarities: newRarities });
                                      }}
                                      className="py-2.5 px-3 text-sm w-full bg-slate-950 border-slate-800"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>

                                {/* Items Textarea */}
                                <div>
                                  <label className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                    <Gift size={12} className="text-slate-400" />
                                    Included Prizes
                                    <span className="text-slate-600 normal-case font-medium tracking-normal ml-auto">(Separate multiple items with " / ")</span>
                                  </label>
                                  <textarea 
                                    value={itemIdx >= 0 ? editing.items[itemIdx].name : ''}
                                    onChange={(e) => {
                                      const newItems = [...editing.items];
                                      if (itemIdx >= 0) {
                                        newItems[itemIdx] = { ...newItems[itemIdx], name: e.target.value };
                                      } else {
                                        newItems.push({ rarity: rarity.id, name: e.target.value, rarityValue: rarity.rarityValue || 1 });
                                      }
                                      setEditing({ ...editing, items: newItems });
                                    }}
                                    placeholder="e.g. Magic Sword / Health Potion / 100 Gold"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 resize-y min-h-[80px] focus:border-indigo-500 transition-colors leading-relaxed"
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {editing.type === 'ichiban' && (
                    <div className="pt-4 border-t border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Ichiban Kuji Tiers</label>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">Configure prize tiers, colors, initial quantities, and items.</p>
                        </div>
                        <button 
                          onClick={() => {
                            const newItems = [...editing.items];
                            const currentPrizes = newItems.filter(i => i.rarity.includes(' Prize')).map(i => i.rarity.split(' ')[0]);
                            const nextLetter = String.fromCharCode(65 + currentPrizes.length); // A, B, C...
                            newItems.push({ rarity: `${nextLetter} Prize`, name: 'New Item', count: 1, initialCount: 1, color: 'slate', rarityValue: 1 });
                            setEditing({ ...editing, items: newItems });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold hover:bg-indigo-600/40 transition-colors whitespace-nowrap"
                        >
                          <Plus size={14} /> Add Tier
                        </button>
                      </div>

                      <div className="space-y-4">
                        {[...editing.items].sort((a, b) => {
                          if (a.rarity === 'LastOne') return -1;
                          if (b.rarity === 'LastOne') return 1;
                          return 0;
                        }).map((item, displayIdx) => {
                          const originalIdx = editing.items.findIndex(i => i === item);
                          const isLastOne = item.rarity === 'LastOne';
                          const activeColor = RARITY_COLORS.find(c => c.id === (item.color || (isLastOne ? 'rose' : 'slate'))) || RARITY_COLORS[0];
                          
                          return (
                            <div key={displayIdx} className={cn(
                              "relative group flex flex-col gap-4 p-5 rounded-2xl border transition-all hover:border-slate-600",
                              isLastOne ? "bg-slate-900 border-rose-500/30" : "bg-slate-900 border-slate-700/60"
                            )}>
                              {/* Remove button (absolute) */}
                              <button 
                                onClick={() => {
                                  if (isLastOne) return;
                                  const newItems = editing.items.filter((_, i) => i !== originalIdx);
                                  setEditing({ ...editing, items: newItems });
                                }}
                                disabled={isLastOne}
                                className={cn(
                                  "absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center border shadow-lg z-10 transition-all",
                                  isLastOne
                                    ? "opacity-0 pointer-events-none" 
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-red-500 hover:text-white hover:border-red-400 transition-opacity scale-90 group-hover:scale-100"
                                )}
                              >
                                <X size={14} />
                              </button>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                {/* Tier Name */}
                                <div className="sm:col-span-5">
                                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                                    {isLastOne ? "Special Tier" : "Tier Name"}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.rarity} 
                                    disabled={isLastOne}
                                    onChange={e => {
                                      const newItems = [...editing.items];
                                      newItems[originalIdx] = { ...item, rarity: e.target.value };
                                      setEditing({ ...editing, items: newItems });
                                    }}
                                    className={cn(
                                      "w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-indigo-500 transition-colors",
                                      isLastOne ? "border-rose-500/30 text-rose-500 cursor-not-allowed" : "border-slate-800"
                                    )}
                                    placeholder="e.g. A Prize"
                                  />
                                </div>

                                {/* Color Theme */}
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Color Theme</label>
                                  <div className={cn("relative rounded-xl border flex items-center bg-slate-950 transition-colors", activeColor.borderClass)}>
                                    <select 
                                      value={item.color || (isLastOne ? 'rose' : 'slate')}
                                      onChange={(e) => {
                                        const newItems = [...editing.items];
                                        const selColor = e.target.value;
                                        const val = RARITY_COLORS.find(c => c.id === selColor)?.value;
                                        newItems[originalIdx] = { ...item, color: selColor, rarityValue: val };
                                        setEditing({ ...editing, items: newItems });
                                      }}
                                      className={cn(
                                        "w-full appearance-none bg-transparent px-4 py-2.5 text-sm font-bold focus:outline-none z-10",
                                        activeColor.textClass
                                      )}
                                    >
                                      {RARITY_COLORS.map(c => (
                                        <option key={c.id} value={c.id} className="text-slate-300 bg-slate-900">{c.name}</option>
                                      ))}
                                    </select>
                                    <div className={cn("absolute right-3 pointer-events-none", activeColor.textClass)}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                  </div>
                                </div>

                                {/* Initially available quantity */}
                                <div className="sm:col-span-3">
                                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Initial Qty</label>
                                  {isLastOne ? (
                                    <div className="w-full bg-slate-950 border border-rose-500/30 rounded-xl px-4 py-2.5 text-sm font-bold text-rose-500 opacity-80 flex items-center justify-center cursor-not-allowed">
                                      1 (Fixed)
                                    </div>
                                  ) : (
                                    <SpinnerInput 
                                      value={item.count === undefined || item.count === null ? '' : item.count} 
                                      onChange={(val) => {
                                        const newItems = [...editing.items];
                                        if (typeof val !== 'number') {
                                          newItems[originalIdx] = { ...item, count: '' as any, initialCount: '' as any };
                                        } else {
                                          newItems[originalIdx] = { ...item, count: val, initialCount: val };
                                        }
                                        setEditing({ ...editing, items: newItems });
                                      }}
                                      className="py-2.5 px-3 text-sm w-full bg-slate-950 border-slate-800"
                                      placeholder="Qty"
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Items Input */}
                              <div>
                                <label className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                  <Gift size={12} className="text-slate-400" />
                                  Prizes Description
                                  <span className="text-slate-600 normal-case font-medium tracking-normal ml-auto">(Displayed item name)</span>
                                </label>
                                <input 
                                  type="text" 
                                  value={item.name} 
                                  onChange={e => {
                                    const newItems = [...editing.items];
                                    newItems[originalIdx] = { ...item, name: e.target.value };
                                    setEditing({ ...editing, items: newItems });
                                  }}
                                  placeholder="e.g. Master Sword Replica"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-indigo-500 transition-colors"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                  <button onClick={() => setEditing(null)} className="px-6 py-2 text-slate-400 font-bold">Cancel</button>
                  <button 
                    onClick={() => { 
                      if (!editing.name.trim()) {
                        setModalConfig({
                          isOpen: true,
                          title: "Incomplete Data",
                          message: "Please enter a pool name.",
                          confirmText: "Understood",
                          type: "warning",
                          isAlert: true
                        });
                        return;
                      }
                      if (editing.cost === '' as any || isNaN(editing.cost as number) || (editing.cost as number) < 0) {
                        setModalConfig({
                          isOpen: true,
                          title: "Invalid Input",
                          message: "Please enter a valid cost per draw.",
                          confirmText: "Understood",
                          type: "warning",
                          isAlert: true
                        });
                        return;
                      }
                      if (editing.type === 'gacha') {
                        const rarities = editing.rarities || [];
                        for (const rarity of rarities) {
                          if (rarity.weight === '' as any || isNaN(rarity.weight as number) || (rarity.weight as number) <= 0) {
                            setModalConfig({
                              isOpen: true,
                              title: "Invalid Input",
                              message: "Please enter a valid weight (greater than 0) for all rarity tiers.",
                              confirmText: "Understood",
                              type: "warning",
                              isAlert: true
                            });
                            return;
                          }
                          if (!rarity.name.trim()) {
                            setModalConfig({
                              isOpen: true,
                              title: "Incomplete Data",
                              message: "Please enter a name for all rarity tiers.",
                              confirmText: "Understood",
                              type: "warning",
                              isAlert: true
                            });
                            return;
                          }
                        }
                      }
                      if (editing.type === 'ichiban') {
                        for (const item of editing.items) {
                          if (item.rarity !== 'LastOne' && (item.count === '' as any || isNaN(item.count as number) || (item.count as number) < 0)) {
                            setModalConfig({
                              isOpen: true,
                              title: "Invalid Input",
                              message: "Please enter a valid quantity for all items.",
                              confirmText: "Understood",
                              type: "warning",
                              isAlert: true
                            });
                            return;
                          }
                        }
                      }

                      let processedPool = { ...editing };
                      if (processedPool.type === 'ichiban') {
                        processedPool.items = processedPool.items.map(item => ({
                          ...item,
                          initialCount: item.count
                        }));
                      }
                      onUpdate(pools.map(p => p.id === editing.id ? processedPool : p)); 
                      setEditing(null); 
                    }} 
                    className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
        isAlert={modalConfig.isAlert}
      />
    </div>
  );
};
