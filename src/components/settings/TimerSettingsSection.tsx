import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, ShopItem, GachaPool, Rarity } from '../../types';
import { INITIAL_GACHA, INITIAL_REWARD_POOL } from '../../constants';
import { Plus, Trash2, Save, Edit2, X, ChevronRight, Coins, Zap, Sparkles, Trophy, Timer as TimerIcon, Package, Flame, AlertTriangle, Scroll, Volume2, VolumeX, Sun, Moon, Settings as SettingsIcon, ShoppingBag, Trees, Waves, Database, Download, Upload, Target, Gift, User, Sword, Eye, Palette, Check, Bell, BellOff, RefreshCw, Key, Layers, Sunrise, Cloud, CloudSun, Lollipop, Wrench, History, Ticket } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../../version';
import { cn, getXPForLevel, getDefaultRewardForLevel } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { SpinnerInput } from '../SpinnerInput';

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


import { RewardSettings } from './RewardSettings';

export const TimerSettingsSection = ({ 
  state, 
  setState,
  rewardPool,
  onUpdateRewards,
  onResetRewards,
  onTabChange
}: { 
  state: any, 
  setState: (fn: (prev: any) => any) => void,
  rewardPool: RewardCard[],
  onUpdateRewards: (p: RewardCard[]) => void,
  onResetRewards?: () => void,
  onTabChange?: (tab: any) => void
}) => {
  const isCritTalentActive = state.activeTalents?.includes('c3');

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
          <LucideIcons.Clock size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Time-Based Calculation</h4>
        </div>

        <div id="setting-time-based" className="space-y-4">
             <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 space-y-4">
               <div>
                 <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Standard Focus Duration (Minutes)</label>
                 <p className="text-[11px] text-slate-400 italic mb-2 mt-1">Used as a unit converter between Session counts and Time. e.g. 3 Sessions = 75 minutes.</p>
                 <input
                   type="number"
                   min="1"
                   max="1440"
                   value={state.standardSessionMinutes || 25}
                   onChange={(e) => setState(prev => ({ ...prev, standardSessionMinutes: Math.max(1, parseInt(e.target.value) || 25) }))}
                   className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                 />
               </div>

               <div className="pt-2 border-t border-indigo-500/10 flex items-center justify-between">
                 <div>
                   <div className="text-sm font-bold text-slate-200">Include Rest Time in Tasks</div>
                   <div className="text-[11px] text-slate-500 mt-1">If enabled, rest periods will also count towards your task progress and total recorded time.</div>
                 </div>
                 <button
                   onClick={() => setState(prev => ({ ...prev, includeRestTimeInTasks: !prev.includeRestTimeInTasks }))}
                   className={cn(
                     "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                     state.includeRestTimeInTasks ? "bg-indigo-500" : "bg-slate-700"
                   )}
                 >
                   <span
                     className={cn(
                       "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                       state.includeRestTimeInTasks ? "translate-x-6" : "translate-x-1"
                     )}
                   />
                 </button>
               </div>

               {state.includeRestTimeInTasks && (
                 <div className="pt-2">
                   <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Standard Rest Duration (Minutes)</label>
                   <p className="text-[11px] text-slate-400 italic mb-2 mt-1">Default rest duration to add per session.</p>
                   <input
                     type="number"
                     min="1"
                     max="1440"
                     value={state.standardRestMinutes || 5}
                     onChange={(e) => setState(prev => ({ ...prev, standardRestMinutes: Math.max(1, parseInt(e.target.value) || 5) }))}
                     className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                   />
                 </div>
               )}
             </div>
        </div>
      </div>

      {/* Target Timer Settings */}
      <div className="space-y-6 border-slate-800">
        <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
          <Eye size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">UI Features</h4>
        </div>

        <div className="flex flex-col gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
          <div id="setting-banner" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", state.timerBannerCompactMode ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                <TimerIcon size={20} />
              </div>
              <div>
                <div className="font-bold text-white">Compact Timer Banner</div>
                <div className="text-xs text-slate-500">Only show Fullscreen/PiP (hide quick navigation shortcuts)</div>
              </div>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, timerBannerCompactMode: !prev.timerBannerCompactMode }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                state.timerBannerCompactMode ? "bg-indigo-500" : "bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  state.timerBannerCompactMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          
          {!state.timerBannerCompactMode && (
            <div className="pt-4 border-t border-slate-800/50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 mb-3 block">Visible Shortcuts</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dungeons', name: 'Dungeons', icon: Sword },
                  { id: 'quests', name: 'Quests', icon: Target },
                  { id: 'achievements', name: 'Achievements', icon: Trophy },
                  { id: 'recent', name: 'Recent Sessions', icon: History },
                  { id: 'vault', name: 'Vault', icon: Package }
                ].map(shortcut => {
                  const isVisible = !(state.timerBannerShortcuts) || state.timerBannerShortcuts.includes(shortcut.id);
                  return (
                    <button
                      key={shortcut.id}
                      onClick={() => {
                        setState(prev => {
                          const current = prev.timerBannerShortcuts || ['dungeons', 'quests', 'achievements', 'recent', 'vault'];
                          if (current.includes(shortcut.id)) {
                            return { ...prev, timerBannerShortcuts: current.filter(id => id !== shortcut.id) };
                          } else {
                            return { ...prev, timerBannerShortcuts: [...current, shortcut.id] };
                          }
                        });
                      }}
                      className={cn(
                        "flex items-center gap-2 p-2 px-3 rounded-lg border transition-all text-sm font-medium",
                        isVisible
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                          : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                      )}
                    >
                      <shortcut.icon size={14} className={isVisible ? "text-indigo-400" : "text-slate-600"} />
                      {shortcut.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div id="setting-manual-start" className="flex items-center justify-between pt-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", state.requireFocusConfirmation ? "bg-amber-500/10 text-amber-500" : "bg-slate-800 text-slate-500")}>
                <Target size={20} />
              </div>
              <div>
                <div className="font-bold text-white">Manual Focus Start</div>
                <div className="text-xs text-slate-500 italic px-0.5 whitespace-normal leading-relaxed">
                  Show "Start Focus" prompt after rest ends in Loop mode
                </div>
              </div>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, requireFocusConfirmation: !prev.requireFocusConfirmation }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                state.requireFocusConfirmation ? "bg-amber-500" : "bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  state.requireFocusConfirmation ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        <div id="setting-skip-victory" className="flex flex-col gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", state.timerSkipVictoryMode && state.timerSkipVictoryMode !== 'none' ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500")}>
                <Sparkles size={20} />
              </div>
              <div>
                <div className="font-bold text-white">Skip Victory Screen</div>
                <div className="text-xs text-slate-500">Automatically handle rewards when a session finishes</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 border-t border-slate-800/50 pt-4">
            <button
              onClick={() => setState(prev => ({ ...prev, timerSkipVictoryMode: 'none' }))}
              className={cn("px-2 py-2 rounded-xl border text-sm font-medium transition-all text-center flex flex-col items-center justify-center gap-1", (!state.timerSkipVictoryMode || state.timerSkipVictoryMode === 'none') ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400" : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800")}
            >
              <span>Show Screen</span>
              <span className="text-[10px] font-normal opacity-80">Default behavior</span>
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, timerSkipVictoryMode: 'defer_to_chest' }))}
              className={cn("px-2 py-2 rounded-xl border text-sm font-medium transition-all text-center flex flex-col items-center justify-center gap-1", state.timerSkipVictoryMode === 'defer_to_chest' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800")}
            >
              <span>Defer to Chest</span>
              <span className="text-[10px] font-normal opacity-80">Store for later</span>
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, timerSkipVictoryMode: 'auto_pick_highest' }))}
              className={cn("px-2 py-2 rounded-xl border text-sm font-medium transition-all text-center flex flex-col items-center justify-center gap-1", state.timerSkipVictoryMode === 'auto_pick_highest' ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800")}
            >
              <span>Auto-Pick</span>
              <span className="text-[10px] font-normal opacity-80">Takes highest rarity</span>
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, timerSkipVictoryMode: 'skip_rewards' }))}
              className={cn("px-2 py-2 rounded-xl border text-sm font-medium transition-all text-center flex flex-col items-center justify-center gap-1", state.timerSkipVictoryMode === 'skip_rewards' ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800")}
            >
              <span>Skip Rewards</span>
              <span className="text-[10px] font-normal opacity-80">Discard drawn</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-amber-400 mb-6 pb-2">
          <Gift size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Session Reward Settings</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
          {/* XP SETTINGS */}
          <div className="space-y-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">XP Drop Mode</label>
              <div className="flex p-1 bg-slate-800 rounded-xl">
                <button 
                  onClick={() => setState(prev => ({ ...prev, devXpMode: 'fixed' }))}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", state.devXpMode !== 'random' ? "bg-indigo-600 text-white" : "text-slate-500")}
                >
                  Fixed
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, devXpMode: 'random' }))}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", state.devXpMode === 'random' ? "bg-indigo-600 text-white" : "text-slate-500")}
                >
                  Random
                </button>
              </div>
            </div>
            {state.devXpMode !== 'random' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Base XP</label>
                <SpinnerInput 
                  value={state.devBaseXP ?? 100} 
                  onChange={(val) => setState(prev => ({ ...prev, devBaseXP: typeof val === 'number' ? val : 100 }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">XP Range (Min - Max)</label>
                <div className="flex gap-2">
                  <SpinnerInput 
                    value={state.devMinXP ?? 50} 
                    onChange={(val) => setState(prev => ({ ...prev, devMinXP: typeof val === 'number' ? val : 50 }))}
                    placeholder="Min"
                  />
                  <span className="text-slate-500 flex items-center">-</span>
                  <SpinnerInput 
                    value={state.devMaxXP ?? 150} 
                    onChange={(val) => setState(prev => ({ ...prev, devMaxXP: typeof val === 'number' ? val : 150 }))}
                    placeholder="Max"
                  />
                </div>
              </div>
            )}
          </div>

          {/* GOLD SETTINGS */}
          <div className="space-y-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Gold Drop Mode</label>
              <div className="flex p-1 bg-slate-800 rounded-xl">
                <button 
                  onClick={() => setState(prev => ({ ...prev, devCoinMode: 'fixed' }))}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", state.devCoinMode !== 'random' ? "bg-amber-600 text-white" : "text-slate-500")}
                >
                  Fixed
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, devCoinMode: 'random' }))}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all", state.devCoinMode === 'random' ? "bg-amber-600 text-white" : "text-slate-500")}
                >
                  Random
                </button>
              </div>
            </div>
            {state.devCoinMode !== 'random' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Base Gold</label>
                <SpinnerInput 
                  value={state.devBaseCoins ?? 10} 
                  onChange={(val) => setState(prev => ({ ...prev, devBaseCoins: typeof val === 'number' ? val : 10 }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Gold Range (Min - Max)</label>
                <div className="flex gap-2">
                  <SpinnerInput 
                    value={state.devMinCoins ?? 5} 
                    onChange={(val) => setState(prev => ({ ...prev, devMinCoins: typeof val === 'number' ? val : 5 }))}
                    placeholder="Min"
                  />
                  <span className="text-slate-500 flex items-center">-</span>
                  <SpinnerInput 
                    value={state.devMaxCoins ?? 15} 
                    onChange={(val) => setState(prev => ({ ...prev, devMaxCoins: typeof val === 'number' ? val : 15 }))}
                    placeholder="Max"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-5 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Crit Chance (0.0 to 1.0)</label>
                <button 
                  onClick={() => onTabChange?.('talents')}
                  className={cn(
                    "flex items-center gap-1.2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    isCritTalentActive 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                  )}
                >
                  {isCritTalentActive ? <Check size={10} /> : <AlertTriangle size={10} />}
                  {isCritTalentActive ? 'Active' : 'Missing Talent'}
                </button>
              </div>
              <SpinnerInput 
                step={0.01}
                min={0}
                max={1}
                value={state.devCritChance} 
                onChange={(val) => setState(prev => ({ ...prev, devCritChance: typeof val === 'number' ? val : 0 }))}
                className="font-mono text-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Crit Multiplier</label>
              <SpinnerInput 
                min={1}
                value={state.devCritMultiplier} 
                onChange={(val) => setState(prev => ({ ...prev, devCritMultiplier: typeof val === 'number' ? val : 1 }))}
                className="font-mono"
              />
            </div>
          </div>

          <div 
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group",
              isCritTalentActive 
                ? "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50" 
                : "bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10"
            )}
            onClick={() => onTabChange?.('talents')}
          >
            <p 
              className={cn(
                "text-xs leading-relaxed text-center",
                isCritTalentActive ? "text-slate-400" : "text-amber-500/90"
              )}
            >
              <Sparkles size={12} className="inline mr-1.5 mb-0.5" />
              Effect requires <strong className="text-indigo-400 underline decoration-indigo-400/30 underline-offset-2">Critical Intuition</strong> talent (Fate Dice tier 3) to be enabled. 
              <span className="block sm:inline sm:ml-1 opacity-70 italic font-medium">
                {isCritTalentActive ? " (Currently active - Configuration is effective)" : " (Currently disabled - Click here to unlock)"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Rewards Management Section */}
      <div className="space-y-6 pt-10 border-t border-slate-800">
        <RewardSettings 
          pool={state.rewardPool} 
          appState={state} 
          onUpdate={(newPool) => setState((prev: any) => ({ 
            ...prev, 
            rewardPool: newPool, // Keep backward compatibility
            customRewardPool: prev.rewardPoolMode === 'free' ? newPool : prev.customRewardPool 
          }))} 
          onReset={onResetRewards} 
          onModeChange={(mode) => setState((prev: any) => {
            if (mode === 'fixed') {
              const mergedFixedPool = INITIAL_REWARD_POOL.map(initialItem => {
                if (initialItem.type === 'text') {
                  const existing = prev.rewardPool.find((c: any) => c.id === initialItem.id);
                  if (existing) {
                    return { ...existing, type: 'text', weight: initialItem.weight, rarity: initialItem.rarity };
                  }
                }
                return initialItem;
              });
              return { ...prev, rewardPoolMode: 'fixed', customRewardPool: prev.rewardPoolMode === 'free' ? prev.rewardPool : prev.customRewardPool, rewardPool: mergedFixedPool };
            } else {
              return { ...prev, rewardPoolMode: 'free', rewardPool: prev.customRewardPool || prev.rewardPool };
            }
          })}
        />
      </div>
    </div>
  );
};

