import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, ShopItem, GachaPool, Rarity } from '../../types';
import { INITIAL_GACHA } from '../../constants';
import { Plus, Trash2, Save, Edit2, X, ChevronRight, Coins, Zap, Sparkles, Trophy, Timer as TimerIcon, Package, Flame, AlertTriangle, Scroll, Volume2, VolumeX, Sun, Moon, Settings as SettingsIcon, ShoppingBag, Trees, Waves, Database, Download, Upload, Target, Gift, User, Sword, Eye, Palette, Check, Bell, BellOff, RefreshCw, Key, Layers, Sunrise, Cloud, CloudSun, Lollipop, Wrench, History, Ticket } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../../version';
import { cn, getXPForLevel, getDefaultRewardForLevel, getTitleForLevel } from '../../lib/utils';
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


export const LevelRewardsSettings = ({ state, setState }: { state: any, setState: (fn: (prev: any) => any) => void }) => {
  const [showPassedLevels, setShowPassedLevels] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLevel, setNewLevel] = useState(51);
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const currentLevel = state.level;

  const openEditModal = (lvl: number, existingReward: any) => {
    let rewardsList: any[] = [];
    if (existingReward) {
      if (existingReward.rewards && existingReward.rewards.length > 0) {
        rewardsList = existingReward.rewards.map((r: any) => ({ ...r }));
      } else {
        rewardsList = [{
          type: existingReward.type || 'talentPoint',
          amount: existingReward.amount || 1,
          rewardText: existingReward.rewardText || ''
        }];
      }
    } else {
      rewardsList = [{ type: 'talentPoint', amount: 1, rewardText: '' }];
    }

    setEditing({
      level: lvl,
      rewards: rewardsList
    });
  };

  // Get all levels that have custom rewards
  const customRewardLevels = (state.levelRewards || []).map((r: any) => r.level);
  
  // Create a set of levels to display
  // We show up to 50 by default, plus any custom levels, plus current level + 5
  const displayLevels = React.useMemo(() => {
    const baseLevels = Array.from({ length: 50 }, (_, i) => i + 2); // 1->2 to 49->50
    const customLevels = customRewardLevels;
    const nearCurrent = Array.from({ length: 10 }, (_, i) => currentLevel + i - 2).filter(l => l > 1);
    
    const allLevels = Array.from(new Set([...baseLevels, ...customLevels, ...nearCurrent])).sort((a, b) => a - b);
    return allLevels;
  }, [customRewardLevels, currentLevel]);

  const visibleLevels = showPassedLevels 
    ? displayLevels 
    : displayLevels.filter(lvl => lvl > currentLevel);

  const formatIndividualReward = (reward: any, index?: number) => {
    if (!reward) return <span className="text-slate-600 italic">None</span>;
    const { type, amount, rewardText } = reward;
    
    if (type === 'text') {
      return (
        <div key={index} className="flex items-center gap-2">
          <Scroll size={14} className="text-emerald-400" />
          <span className="font-bold text-white">{rewardText}</span>
        </div>
      );
    }

    let icon = null;
    let unit = "";
    if (type === 'talentPoint') {
      icon = <Scroll size={14} className="text-emerald-400" />;
      unit = amount === 1 ? "Talent Scroll" : "Talent Scrolls";
    } else if (type === 'coins') {
      icon = <Coins size={14} className="text-amber-400" />;
      unit = amount === 1 ? "Coin" : "Coins";
    }

    return (
      <div key={index} className="flex items-center gap-2">
        {icon}
        <span className="font-bold text-white">{amount} {unit}</span>
      </div>
    );
  };

  const formatReward = (reward: any) => {
    if (!reward) return <span className="text-slate-600 italic">None</span>;
    if (reward.rewards && reward.rewards.length > 0) {
      return (
        <div className="flex flex-col gap-1.5 py-0.5">
          {reward.rewards.map((sub: any, idx: number) => formatIndividualReward(sub, idx))}
        </div>
      );
    }
    return formatIndividualReward(reward);
  };

  return (
    <div id="setting-milestones" className="space-y-8">
      <div className="flex items-center justify-between gap-2.5 text-emerald-400 mb-6 pb-2">
        <div className="flex items-center gap-2.5">
          <Trophy size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Level Rewards & XP Table</h4>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowPassedLevels(!showPassedLevels)}
            className="text-[10px] sm:text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest flex items-center gap-1"
          >
            {showPassedLevels ? "Fold" : "Show All"}
          </button>
          <button 
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-indigo-600/40 transition-all"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[600px] custom-scrollbar border border-slate-800 rounded-2xl bg-slate-900/50 p-2 sm:p-0">
        <table className="w-full text-left text-sm text-slate-400 border-collapse">
          <thead className="text-[10px] text-slate-500 uppercase bg-slate-800/80 backdrop-blur sticky top-0 z-[5]">
            <tr>
              <th className="px-4 py-4 font-black tracking-widest">Level</th>
              <th className="px-4 py-4 font-black tracking-widest hidden sm:table-cell">XP Req.</th>
              <th className="px-4 py-4 font-black tracking-widest">Reward</th>
              <th className="px-4 py-4 font-black tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleLevels.map(nextLvl => {
              const currentLvl = nextLvl - 1;
              const reward = state.levelRewards?.find((r: any) => r.level === nextLvl);
              const defaultReward = getDefaultRewardForLevel(nextLvl);
              const isCurrent = currentLevel === currentLvl;
              
              // Title levels boundary lines
              const showDivider = nextLvl === 4 || nextLvl === 16 || nextLvl === 43;
              const titleName = getTitleForLevel(nextLvl);
              const rankRange = nextLvl === 4 ? "4 - 15" : nextLvl === 16 ? "16 - 42" : "43+";

              return (
                <React.Fragment key={nextLvl}>
                  <tr 
                    className={cn(
                      "border-b border-slate-800/50 transition-colors",
                      isCurrent ? "bg-indigo-500/10" : "hover:bg-slate-800/30"
                    )}
                  >
                    <td className="px-4 py-4 font-bold w-24">
                      <div className="flex items-center gap-2 w-fit">
                        <span className={cn("text-xs", isCurrent ? "text-indigo-400" : "text-slate-500")}>{currentLvl}</span>
                        <ChevronRight size={10} className="text-indigo-500" />
                        <span className="text-white text-base">{nextLvl}</span>
                        {isCurrent && (
                          <span className="ml-2 px-2 py-0.5 bg-indigo-500 text-[8px] text-white rounded-full uppercase tracking-tighter font-black">Current</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell font-mono text-xs text-slate-500">
                      {getXPForLevel(currentLvl).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="scale-90 sm:scale-100 origin-left space-y-1.5 flex flex-col items-start">
                        <div>
                          {reward ? formatReward(reward) : formatReward(defaultReward)}
                        </div>
                        {showDivider && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-md border border-indigo-500/20 w-fit">
                            Unlock Title: {titleName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => {
                          openEditModal(nextLvl, reward);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        {reward ? 'Edit' : 'Add'}
                      </button>
                    </td>
                  </tr>

                  {showDivider && (
                    <tr className="border-none bg-slate-950/20">
                      <td colSpan={4} className="px-4 py-2 border-none">
                        <div className="flex items-center gap-3">
                          <div className="h-[1px] bg-indigo-500/20 flex-1" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/80 flex items-center gap-1 shrink-0">
                            <Sparkles size={10} className="text-indigo-400" />
                            <span>{titleName} Rank (Lv. {rankRange})</span>
                          </span>
                          <div className="h-[1px] bg-indigo-500/20 flex-1" />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {createPortal(
        <AnimatePresence>
          {isAddingNew && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 p-8 rounded-3xl border border-slate-700 w-full max-w-md space-y-6 shadow-2xl"
              >
                <h4 className="text-xl font-bold text-white">Add Reward for Level</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Target Level</label>
                    <SpinnerInput
                      value={newLevel === undefined || newLevel === null ? '' : newLevel}
                      onChange={(val) => setNewLevel(typeof val === 'number' ? val : ('' as any))}
                      min={2}
                    />
                    <p className="text-xs text-slate-500 italic">Reward given when reaching this level.</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsAddingNew(false)} className="px-4 py-2 text-slate-400 font-bold">Cancel</button>
                  <button 
                    onClick={() => {
                      if (newLevel === '' as any || isNaN(newLevel) || newLevel < 2) {
                        setModalConfig({
                          isOpen: true,
                          title: "Invalid Level",
                          message: "Please enter a valid target level (must be 2 or higher).",
                          confirmText: "Got it",
                          type: "warning",
                          isAlert: true
                        });
                        return;
                      }
                      setEditing({
                        level: newLevel,
                        rewards: [{ type: 'talentPoint', amount: 1, rewardText: '' }]
                      });
                      setIsAddingNew(false);
                    }}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold"
                  >
                    Next
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {editing && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-700 w-full max-w-lg space-y-4 shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="flex justify-between items-center bg-slate-900 border-b border-slate-800 pb-3 shrink-0">
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-white">Edit Rewards (Level {editing.level})</h4>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium font-sans">You can configure one or multiple custom rewards for this level up milestone.</p>
                  </div>
                  <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-white shrink-0"><X size={20} /></button>
                </div>

                {/* Rewards List Scrollable Area */}
                <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 max-h-[360px] custom-scrollbar">
                  {editing.rewards.map((rew: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 relative group">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Reward #{idx + 1}</span>
                        {editing.rewards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const list = [...editing.rewards];
                              list.splice(idx, 1);
                              setEditing({ ...editing, rewards: list });
                            }}
                            className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Reward Type</label>
                          <select
                            value={rew.type}
                            onChange={e => {
                              const list = [...editing.rewards];
                              list[idx] = { 
                                ...list[idx], 
                                type: e.target.value, 
                                amount: e.target.value === 'text' ? undefined : 1, 
                                rewardText: e.target.value === 'text' ? '' : undefined 
                              };
                              setEditing({ ...editing, rewards: list });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="talentPoint">Talent Scroll</option>
                            <option value="coins">Gold</option>
                            <option value="text">Text Reward</option>
                          </select>
                        </div>

                        {rew.type !== 'text' ? (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Amount</label>
                            <SpinnerInput
                              value={rew.amount === undefined || rew.amount === null ? '' : rew.amount}
                              onChange={(val) => {
                                const list = [...editing.rewards];
                                list[idx] = { ...list[idx], amount: typeof val === 'number' ? val : ('' as any) };
                                setEditing({ ...editing, rewards: list });
                              }}
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Reward Text</label>
                            <input
                              type="text"
                              value={rew.rewardText || ''}
                              onChange={e => {
                                const list = [...editing.rewards];
                                list[idx] = { ...list[idx], rewardText: e.target.value };
                                setEditing({ ...editing, rewards: list });
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 font-bold focus:border-indigo-500 focus:outline-none"
                              placeholder="e.g. Unlock Secret Dungeon"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setEditing({
                        ...editing,
                        rewards: [...editing.rewards, { type: 'talentPoint', amount: 1, rewardText: '' }]
                      });
                    }}
                    className="w-full py-2.5 bg-slate-800/40 hover:bg-slate-800 border border-dashed border-slate-700/60 rounded-2xl text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus size={14} /> Add Another Reward
                  </button>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-800 bg-slate-900 shrink-0">
                  <div>
                    {state.levelRewards?.some((r: any) => r.level === editing.level) && (
                      <button
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: "Delete Custom Reward",
                            message: `Are you sure you want to completely clear and delete custom rewards for Level ${editing.level}? It will revert to the default academic rewards.`,
                            confirmText: "Delete",
                            type: "danger",
                            isAlert: false,
                            onConfirm: () => {
                              const newRewards = [...(state.levelRewards || [])].filter((r: any) => r.level !== editing.level);
                              setState(prev => ({ ...prev, levelRewards: newRewards }));
                              setEditing(null);
                            }
                          });
                        }}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest rounded-xl border border-rose-500/20"
                      >
                        Delete Custom
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setEditing(null)} 
                      className="px-4 py-2 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        for (let i = 0; i < editing.rewards.length; i++) {
                          const rew = editing.rewards[i];
                          if (rew.type !== 'text' && (rew.amount === '' as any || isNaN(rew.amount as number) || (rew.amount as number) < 0)) {
                            setModalConfig({
                              isOpen: true,
                              title: "Invalid Amount",
                              message: `Please enter a valid non-negative amount for Reward #${i + 1}.`,
                              confirmText: "Got it",
                              type: "warning",
                              isAlert: true
                            });
                            return;
                          }
                          if (rew.type === 'text' && !rew.rewardText?.trim()) {
                            setModalConfig({
                              isOpen: true,
                              title: "Missing Reward Text",
                              message: `Please enter description text for Reward #${i + 1}.`,
                              confirmText: "Got it",
                              type: "warning",
                              isAlert: true
                            });
                            return;
                          }
                        }

                        // Remove from list and append editing with rewards array
                        const newRewards = [...(state.levelRewards || [])].filter((r: any) => r.level !== editing.level);
                        setState(prev => ({ 
                          ...prev, 
                          levelRewards: [...newRewards, {
                            level: editing.level,
                            rewards: editing.rewards
                          }] 
                        }));
                        setEditing(null);
                      }}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                    >
                      Save Rewards
                    </button>
                  </div>
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
        onConfirm={() => {
          if (modalConfig.onConfirm) {
            modalConfig.onConfirm();
          }
          setModalConfig({ ...modalConfig, isOpen: false });
        }}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
        isAlert={modalConfig.isAlert}
      />
    </div>
  );
};

