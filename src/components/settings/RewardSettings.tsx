import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, ShopItem, GachaPool, Rarity } from '../../types';
import { INITIAL_GACHA } from '../../constants';
import { Plus, Trash2, Save, Edit2, X, ChevronRight, Coins, Zap, Sparkles, Trophy, Timer as TimerIcon, Package, Flame, AlertTriangle, Scroll, Volume2, VolumeX, Sun, Moon, Settings as SettingsIcon, ShoppingBag, Trees, Waves, Database, Download, Upload, Target, Gift, User, Sword, Eye, Palette, Check, Bell, RefreshCw, Key, Layers, Sunrise, Cloud, CloudSun, Lollipop, Wrench, History, Ticket, Apple, Citrus, Cookie, IceCream, Cake, Beer, Wine, GlassWater, Flower, Flower2, Sprout, Leaf, Car, Bike, Plane, Rocket, Ship, Gamepad2, Headphones, Monitor, Smartphone, Tv, Library, Dumbbell, Award, Medal, Compass, Map, Camera, Music, Book, BookOpen, Info, Calculator } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../../version';
import { cn, getXPForLevel, getDefaultRewardForLevel } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { SpinnerInput } from '../SpinnerInput';
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


import { HelpCircle, Lock, Unlock } from 'lucide-react';
import { RealtimeProbabilityModal } from './RealtimeProbabilityModal';
import { RewardStatsModal } from './RewardStatsModal';

export const RewardSettings = ({ pool, onUpdate, onReset, appState, onModeChange }: { pool: RewardCard[], onUpdate: (p: RewardCard[]) => void, onReset?: () => void, appState?: any, onModeChange?: (mode: 'fixed' | 'free') => void }) => {
  const [editing, setEditing] = useState<RewardCard | null>(null);
  const [showExpectedStats, setShowExpectedStats] = useState(false);
  const [showRealtimeProb, setShowRealtimeProb] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm?: () => void; 
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
  }>({ isOpen: false, title: '', message: '' });

  const isFixedMode = appState?.rewardPoolMode === 'fixed';

  const handleSave = (card: RewardCard) => {
    if (
      card.weight === '' as any || isNaN(card.weight) || (card.weight as number) < 0 ||
      (card.amount !== undefined && (card.amount === '' as any || isNaN(card.amount) || (card.amount as number) < 0)) ||
      (card.limitCount !== undefined && (card.limitCount === '' as any || isNaN(card.limitCount) || (card.limitCount as number) < 0)) ||
      (card.limitPeriodDays !== undefined && (card.limitPeriodDays === '' as any || isNaN(card.limitPeriodDays) || (card.limitPeriodDays as number) < 0))
    ) {
      setModalConfig({
        isOpen: true,
        title: "Invalid Input",
        message: "Please ensure all number inputs (Amount, Weight, Limits) are valid non-negative numbers.",
        confirmText: "Got it",
        type: "warning",
        isAlert: true
      });
      return;
    }

    const newPool = pool.some(c => c.id === card.id)
      ? pool.map(c => c.id === card.id ? card : c)
      : [...pool, card];
    onUpdate(newPool);
    setEditing(null);
  };

  return (
    <div id="setting-rewards" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 text-indigo-400 min-w-0">
          <Package size={20} className="shrink-0" />
          <h4 className="text-base sm:text-lg font-extrabold uppercase tracking-widest pr-1 italic">Reward Pool Management</h4>
          {appState && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowRealtimeProb(true)} 
                className="p-1.5 text-slate-500 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
                title="Real-Time Probability"
              >
                <HelpCircle size={14} />
              </button>
              <button 
                onClick={() => setShowExpectedStats(true)} 
                className="p-1.5 text-slate-500 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
                title="Economy Mathematics"
              >
                <Info size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {onModeChange && (
            <button
              onClick={() => {
                if (isFixedMode) {
                  setModalConfig({
                    isOpen: true,
                    title: "Unlock Loot Pool",
                    message: "Switching to Free Mode allows you to add custom rewards, modify weights, and change rarities. Do you want to proceed?",
                    confirmText: "Enter Free Mode",
                    onConfirm: () => onModeChange('free')
                  });
                } else {
                  setModalConfig({
                    isOpen: true,
                    title: "Lock Loot Pool",
                    message: "Switching to Fixed Mode will enforce the default standard reward pool. Your current custom configurations will be preserved safely but disabled. Proceed?",
                    confirmText: "Lock Pool",
                    onConfirm: () => onModeChange('fixed')
                  });
                }
              }}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors shrink-0 border",
                isFixedMode 
                  ? "bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 border-emerald-500/30" 
                  : "bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border-amber-500/30"
              )}
              title={isFixedMode ? "Currently Fixed" : "Currently Free - Editable"}
            >
              {isFixedMode ? <Lock size={14} className="shrink-0" /> : <Unlock size={14} className="shrink-0" />}
              <span className="truncate">{isFixedMode ? "Fixed Mode" : "Free Mode"}</span>
            </button>
          )}

          {!isFixedMode && onReset && (
            <button 
              onClick={() => setModalConfig({
                isOpen: true,
                title: "Reset Loot Pool?",
                message: "Are you sure you want to reset the entire Loot Pool to its default state? Your custom reward modifications will be lost.",
                confirmText: "Reset Pool",
                type: "warning",
                onConfirm: onReset
              })}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs sm:text-sm font-bold transition-colors shrink-0 border border-transparent"
              title="Reset to Defaults"
            >
              <RefreshCw size={14} className="shrink-0" /> <span className="truncate">Reset</span>
            </button>
          )}
          {!isFixedMode && (
            <button 
              onClick={() => setEditing({ id: Math.random().toString(36).substr(2, 9), name: '', description: '', rarity: 'common', type: 'text', weight: 10 })}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 shrink-0 border border-transparent"
            >
              <Plus size={14} className="shrink-0" /> <span className="truncate">Add Reward</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-center text-xs md:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              <th className="px-4 py-3">Rarity</th>
              <th className="px-4 py-3">Reward</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Weight</th>
              <th className="px-4 py-3">Prob.</th>
              <th className="px-4 py-3 whitespace-nowrap">Daily Limit</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {(() => {
              const totalWeight = pool.reduce((sum, item) => sum + (item.weight || 0), 0);
              return pool.map(card => {
                const prob = totalWeight > 0 ? ((card.weight / totalWeight) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={card.id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter uppercase border", 
                        card.rarity === 'common' ? "bg-slate-800 text-slate-400 border-slate-700" :
                        card.rarity === 'uncommon' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        card.rarity === 'rare' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        card.rarity === 'epic' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : 
                        card.rarity === 'legendary' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {card.rarity}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 justify-center">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                          {(() => {
                            const IconComp = (card.icon && (LucideIcons as any)[card.icon]) ? (LucideIcons as any)[card.icon] : LucideIcons.Gift;
                            return <IconComp size={14} />;
                          })()}
                        </div>
                        <div className="font-bold text-slate-200">{card.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[10px] text-slate-500 italic mx-auto" title={card.description}>{card.description}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-slate-400 capitalize bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50 text-[10px]">
                        {card.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-indigo-400 font-bold">{card.weight}</td>
                    <td className="px-4 py-4 font-mono text-emerald-400 font-bold">{prob}%</td>
                    <td className="px-4 py-4">
                      {card.limitCount ? (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 whitespace-nowrap mx-auto inline-block">
                          {card.limitCount}x / {card.limitPeriodDays}d
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                    {!isFixedMode && (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setEditing(card)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500/50"><Edit2 size={14} /></button>
                        <button 
                          onClick={() => {
                            setModalConfig({
                              isOpen: true,
                              title: "Delete Reward?",
                              message: `Are you sure you want to delete reward "${card.name}"?`,
                              confirmText: "Delete",
                              type: "danger",
                              onConfirm: () => onUpdate(pool.filter(c => c.id !== card.id))
                            });
                          }} 
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors focus:ring-2 focus:ring-rose-500/50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {isFixedMode && card.type !== 'text' && (
                      <div className="flex justify-center gap-1">
                        <span className="p-1.5 text-slate-600">
                          <Lock size={12} />
                        </span>
                      </div>
                    )}
                    {isFixedMode && card.type === 'text' && (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setEditing(card)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500/50"><Edit2 size={14} /></button>
                      </div>
                    )}
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
        {pool.length === 0 && (
          <div className="py-12 text-center text-slate-500 italic text-sm">No rewards currently in the pool.</div>
        )}
      </div>

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

      {appState && createPortal(
        <AnimatePresence>
          {showExpectedStats && (
             <RewardStatsModal 
                key="expected-stats"
                pool={pool} 
                appState={appState} 
                onClose={() => setShowExpectedStats(false)} 
             />
          )}
          {showRealtimeProb && (
             <RealtimeProbabilityModal 
                key="realtime-prob"
                pool={pool} 
                appState={appState} 
                onClose={() => setShowRealtimeProb(false)} 
             />
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {editing && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 p-8 rounded-[2rem] border border-slate-700 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                      <Edit2 size={20} />
                    </div>
                    <h4 className="text-xl font-bold text-white tracking-tight">
                      {pool.some(r => r.id === editing.id) ? 'Edit Reward' : 'Add New Reward'}
                    </h4>
                  </div>
                  <div className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-700">Config</div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2 pb-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    {/* Left Column: Basic Info */}
                    <div className="flex flex-col gap-6 h-full">
                      <div className="space-y-4 flex flex-col flex-1">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Reward Name</label>
                          <input type="text" placeholder="Reward Name" value={editing.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 transition-colors" />
                        </div>

                        <div className="space-y-1.5 flex-1 flex flex-col">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                          <textarea placeholder="Describe the reward..." value={editing.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm flex-1 min-h-[160px] resize-none focus:border-indigo-500 transition-colors" />
                        </div>
                      </div>

                      <div className="space-y-3 p-4 bg-slate-800/30 rounded-2xl border border-slate-800/50 shrink-0">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Rarity Grade</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'common', label: 'Common', color: 'bg-slate-700 border-slate-600 text-slate-300' },
                            { id: 'uncommon', label: 'Uncommon', color: 'bg-emerald-600 border-emerald-400 text-white' },
                            { id: 'rare', label: 'Rare', color: 'bg-blue-600 border-blue-400 text-white' },
                            { id: 'epic', label: 'Epic', color: 'bg-purple-600 border-purple-400 text-white' },
                            { id: 'legendary', label: 'Legendary', color: 'bg-amber-500 border-amber-300 text-slate-900' },
                            { id: 'mythic', label: 'Mythic', color: 'bg-rose-600 border-rose-400 text-white' }
                          ].map(r => (
                            <button
                              key={r.id}
                              disabled={isFixedMode}
                              onClick={() => setEditing({...editing, rarity: r.id as Rarity})}
                              className={cn(
                                "py-2 px-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-tighter transition-all",
                                editing.rarity === r.id ? r.color : "bg-slate-900/50 border-slate-800 text-slate-600 hover:border-slate-700",
                                isFixedMode && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Values & Limits */}
                    <div className="flex flex-col gap-6 h-full">
                      <div className="space-y-4 flex flex-col flex-1">
                          <div className="space-y-1.5 shrink-0">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Type</label>
                            <select disabled={isFixedMode} value={editing.type} onChange={e => setEditing({...editing, type: e.target.value as any})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <option value="coins">Coins</option>
                              <option value="xp">XP</option>
                              <option value="item">Advanced Item</option>
                              <option value="text">Bonus/Action</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 flex flex-col flex-1 min-h-[100px]">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center justify-between shrink-0">
                              <span>Reward Icon</span>
                              <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full border border-indigo-400/20">{editing.icon || 'Gift'}</span>
                            </label>
                            <div className="flex-1 grid grid-cols-6 gap-2 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                              {[
                                'Gift', 'Package', 'Coins', 'Zap', 'Trophy', 'Medal', 'Award', 'Star', 'Heart', 'Apple', 'Citrus', 'Pizza', 'Cookie', 'IceCream', 'Cake', 'Coffee', 'Beer', 'Wine', 'Flower', 'Flower2', 'Sprout', 'Leaf', 'Trees', 'Car', 'Bike', 'Plane', 'Rocket', 'Gamepad2', 'Headphones', 'Camera', 'Music', 'Book', 'CheckCircle2'
                              ].map(iconName => {
                                const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Gift;
                                const isSelected = (editing.icon || 'Gift') === iconName;
                                return (
                                  <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => setEditing({...editing, icon: iconName})}
                                    className={cn(
                                      "aspect-square flex items-center justify-center rounded-lg transition-all border",
                                      isSelected 
                                        ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-105 z-10" 
                                        : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                                    )}
                                  >
                                    <IconComponent size={14} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                        {editing.type === 'coins' && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Coin Amount</label>
                            <SpinnerInput placeholder="e.g. 10" value={editing.amount === undefined || editing.amount === null ? '' : editing.amount} onChange={(val) => setEditing({...editing, amount: typeof val === 'number' ? val : ('' as any)})} />
                          </div>
                        )}
                        {editing.type === 'xp' && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">XP Amount</label>
                            <SpinnerInput placeholder="e.g. 50" value={editing.amount === undefined || editing.amount === null ? '' : editing.amount} onChange={(val) => setEditing({...editing, amount: typeof val === 'number' ? val : ('' as any)})} className="focus:border-emerald-500" />
                          </div>
                        )}
                        {editing.type === 'item' && (
                          <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-wider ml-1">Item Function</label>
                              <select value={editing.itemType || 'double_xp'} onChange={e => setEditing({...editing, itemType: e.target.value as any})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs">
                                <option value="double_xp">Double XP Card (x2)</option>
                                <option value="double_coin">Double Coins Card (x2)</option>
                                <option value="talent_shard">Talent Shard</option>
                                <option value="death_defying_medal">Death Defying Medal</option>
                                <option value="xp_bonus_percent">Next XP Bonus %</option>
                                <option value="coin_bonus_percent">Next Coins Bonus %</option>
                              </select>
                            </div>
                            {(editing.itemType === 'xp_bonus_percent' || editing.itemType === 'coin_bonus_percent' || editing.itemType === 'talent_shard' || editing.itemType === 'death_defying_medal') && (
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-wider ml-1">
                                  {(editing.itemType === 'xp_bonus_percent' || editing.itemType === 'coin_bonus_percent') ? 'Bonus %' : 'Quantity'}
                                </label>
                                <SpinnerInput placeholder="Value" value={editing.amount === undefined || editing.amount === null ? '' : editing.amount} onChange={(val) => setEditing({...editing, amount: typeof val === 'number' ? val : ('' as any)})} />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider ml-1">Drop Weight</label>
                            <SpinnerInput disabled={isFixedMode} placeholder="Weight" value={editing.weight === undefined || editing.weight === null ? '' : editing.weight} onChange={(val) => setEditing({...editing, weight: typeof val === 'number' ? val : ('' as any)})} className={cn("font-mono", isFixedMode && "opacity-50 cursor-not-allowed")} />
                          </div>
                          <div className="space-y-1.5 text-right flex flex-col justify-end">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Current Probability</p>
                            <p className="text-xl font-mono text-emerald-400 font-black">
                              {(() => {
                                const poolWithoutThis = pool.filter(c => c.id !== editing.id);
                                const newTotalWeight = poolWithoutThis.reduce((s, i) => s + (i.weight || 0), 0) + (editing.weight || 0);
                                return newTotalWeight > 0 ? ((editing.weight / newTotalWeight) * 100).toFixed(1) : '0.0';
                              })()}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-800/50 space-y-3">
                        <div className="flex items-center justify-between mb-1 border-b border-white/5 pb-1">
                          <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Frequency Control</h5>
                          <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">(Optional)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Max Occurrences</label>
                            <SpinnerInput placeholder="e.g. 1" value={editing.limitCount === undefined || editing.limitCount === null ? '' : editing.limitCount} onChange={(val) => setEditing({...editing, limitCount: typeof val === 'number' ? val : ('' as any)})} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Period (Days)</label>
                            <SpinnerInput placeholder="e.g. 1" value={editing.limitPeriodDays === undefined || editing.limitPeriodDays === null ? '' : editing.limitPeriodDays} onChange={(val) => setEditing({...editing, limitPeriodDays: typeof val === 'number' ? val : ('' as any)})} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 shrink-0">
                  <button onClick={() => setEditing(null)} className="px-5 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
                  <button onClick={() => handleSave(editing)} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95">Save Reward</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

