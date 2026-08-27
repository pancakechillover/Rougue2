import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, ShopItem, GachaPool, Rarity } from '../../types';
import { INITIAL_GACHA } from '../../constants';
import { Plus, Trash2, Save, Edit2, X, ChevronRight, Coins, Zap, Sparkles, Trophy, Timer as TimerIcon, Package, Flame, AlertTriangle, Scroll, Volume2, VolumeX, Sun, Moon, Settings as SettingsIcon, ShoppingBag, Trees, Waves, Database, Download, Upload, Target, Gift, User, Sword, Eye, Palette, Check, Bell, BellOff, RefreshCw, Key, Layers, Sunrise, Cloud, CloudSun, Lollipop, Wrench, History, Ticket, ArrowLeft, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../../version';
import { cn, getXPForLevel, getDefaultRewardForLevel } from '../../lib/utils';
import { SETTINGS_SEARCH_INDEX } from './SettingsSearchIndex';
import { playSound } from '../../lib/sound';

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


import { ActivityTimeSettings } from './ActivityTimeSettings';
import { TimerSettingsSection } from './TimerSettingsSection';
import { LevelRewardsSettings } from './LevelRewardsSettings';
import { GeneralSettings } from './GeneralSettings';
import { DevResourceControl } from './DevResourceControl';
import { RewardSettings } from './RewardSettings';
import { ShopSettings } from './ShopSettings';
import { GachaSettings } from './GachaSettings';
import { DeveloperSettings } from './DeveloperSettings';
import { CalcSettingsSection } from './CalcSettingsSection';
import { SageSettingsSection } from './SageSettingsSection';
import { CloudSettingsSection } from './CloudSettingsSection';

interface VersionGroupProps {
  group: string;
  logs: typeof RELEASE_HISTORY;
  isInitialExpanded: boolean;
}

const VersionGroup: React.FC<VersionGroupProps> = ({ group, logs, isInitialExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(isInitialExpanded);
  
  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Layers size={16} className={cn("transition-colors", isExpanded ? "text-indigo-400" : "text-slate-500")} />
          <span className="text-sm font-black uppercase tracking-widest text-slate-200">Release {group}.x Series</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{logs.length} Updates</span>
          <ChevronRight size={16} className={cn("text-slate-600 transition-transform duration-300", isExpanded && "rotate-90")} />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 pb-6 pt-2 space-y-8 border-t border-slate-800/50">
              {logs.map((log, index, array) => {
                const isLast = index === array.length - 1;
                return (
                <div key={log.version} className="space-y-2 relative pl-6">
                  {/* Vertical connecting line */}
                  {!isLast && (
                     <div className={cn(
                       "absolute top-[10px] left-0 w-[2px] h-[calc(100%+32px)] z-0",
                       log.version === APP_VERSION ? "bg-indigo-500/50" : "bg-slate-700/50"
                     )} />
                  )}
                  {/* Horizontal branch */}
                  <div className={cn(
                     "absolute top-[10px] left-0 w-4 h-[2px] z-0",
                     log.version === APP_VERSION ? "bg-indigo-500/50" : "bg-slate-700/50"
                  )} />
                  {/* Node point */}
                  <div className={cn(
                    "absolute top-[6px] left-[12px] w-2 h-2 rounded-full z-10",
                    log.version === APP_VERSION ? "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-slate-600"
                  )} />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={cn(
                      "text-lg",
                      log.version === APP_VERSION ? "font-black text-white" : "font-bold text-slate-300"
                    )}>{log.version}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs font-bold font-mono">{log.date}</span>
                      {log.time && (
                        <span className="text-indigo-500/60 text-[10px] font-bold font-mono px-1.5 py-0.5 bg-indigo-500/5 rounded border border-indigo-500/10">
                          {log.time}
                        </span>
                      )}
                    </div>
                  </div>
                  <h5 className={cn(
                    log.version === APP_VERSION ? "font-bold text-indigo-300" : "font-medium text-slate-400"
                  )}>{log.title}</h5>
                  <ul className="text-slate-400 text-sm space-y-2 list-disc ml-4">
                    {log.items.map((item, i) => (
                      <li key={i}>
                        <span className="text-indigo-400 font-bold">{item.category}:</span> {item.description}
                      </li>
                    ))}
                  </ul>
                </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SETTINGS_COMPARTMENTS = [
  {
    id: 'general' as const,
    title: 'General Settings',
    desc: 'System core configuration, themes, and routines.',
    icon: SettingsIcon,
    borderColor: 'hover:border-indigo-500',
    iconColor: 'text-indigo-400',
    bgColor: 'bg-indigo-300/10 border-indigo-500/20'
  },
  {
    id: 'timer' as const,
    title: 'Timer Settings',
    desc: 'Focus loops, intervals, and chest loot pool.',
    icon: TimerIcon,
    borderColor: 'hover:border-amber-500',
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-300/10 border-amber-500/20'
  },
  {
    id: 'level' as const,
    title: 'Level & Milestones',
    desc: 'Milestone bonuses, Gold, XP, and talent rewards.',
    icon: Trophy,
    borderColor: 'hover:border-purple-500',
    iconColor: 'text-purple-400',
    bgColor: 'bg-purple-300/10 border-purple-500/20'
  },
  {
    id: 'merchant' as const,
    title: 'Merchant & Gacha',
    desc: 'Shop listing shelves and summon pool rates.',
    icon: ShoppingBag,
    borderColor: 'hover:border-emerald-500',
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-300/10 border-emerald-500/20'
  },
  {
    id: 'calculator' as const,
    title: 'Balance Calculator',
    desc: 'Mathematical simulations for economy drop expectations.',
    icon: Target,
    borderColor: 'hover:border-pink-500',
    iconColor: 'text-pink-400',
    bgColor: 'bg-pink-300/10 border-pink-500/20'
  },
  {
    id: 'sage' as const,
    title: 'Sage AI Assistant',
    desc: 'AI personality modes and interactive prompt engine.',
    icon: Sparkles,
    borderColor: 'hover:border-rose-500',
    iconColor: 'text-rose-400',
    bgColor: 'bg-rose-300/10 border-rose-500/20'
  },
  {
    id: 'cloud' as const,
    title: 'Cloud Archives',
    desc: 'Sync game progression and manage JSON backups.',
    icon: Cloud,
    borderColor: 'hover:border-blue-500',
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-300/10 border-blue-500/20'
  },
  {
    id: 'dev' as const,
    title: 'Developer Panel',
    desc: 'Developer console commands and stats overrides.',
    icon: Wrench,
    borderColor: 'hover:border-red-500',
    iconColor: 'text-red-400',
    bgColor: 'bg-red-300/10 border-red-500/20'
  },
  {
    id: 'about' as const,
    title: 'About Scholar\'s Dungeon',
    desc: 'Version release notes and external documentation.',
    icon: Scroll,
    borderColor: 'hover:border-slate-500',
    iconColor: 'text-slate-400',
    bgColor: 'bg-slate-300/10 border-slate-500/20'
  }
];

export interface SettingsProps {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  rewardPool: RewardCard[];
  shopItems: ShopItem[];
  gachaPools: GachaPool[];
  onUpdateRewards: (rewards: RewardCard[]) => void;
  onUpdateShop: (shop: ShopItem[]) => void;
  onUpdateGacha: (gacha: GachaPool[]) => void;
  onResetRewards?: () => void;
  addXP: (amount: number) => void;
  getNow: () => Date;
  activeSection: string;
  setActiveSection: (sec: string) => void;
  onTabChange?: (tab: any) => void;
  onOpenAstralArchives?: () => void;
  triggerSyncCheck?: (forceModal?: boolean) => void;
  isSyncing?: boolean;
  hasUnsyncedChanges?: boolean;
}

export const Settings = React.memo<SettingsProps & { onOpenAstralArchives?: () => void }>(({
  state,
  setState,
  rewardPool,
  shopItems,
  gachaPools,
  onUpdateRewards,
  onUpdateShop,
  onUpdateGacha,
  onResetRewards,
  addXP,
  getNow,
  activeSection,
  setActiveSection,
  onTabChange,
  onOpenAstralArchives,
  triggerSyncCheck,
  isSyncing,
  hasUnsyncedChanges
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [activeTab, setActiveTab ] = useState<string>(() => {
    if (activeSection && activeSection !== 'menu') return activeSection;
    return localStorage.getItem('settings_last_view') || 'menu';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('settings_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    const term = searchQuery.trim().toLowerCase();
    const newSearches = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(newSearches);
    localStorage.setItem('settings_recent_searches', JSON.stringify(newSearches));
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const newSearches = recentSearches.filter(t => t !== term);
    setRecentSearches(newSearches);
    localStorage.setItem('settings_recent_searches', JSON.stringify(newSearches));
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchQuery(term);
  };
  
  const [lastPropSection, setLastPropSection] = useState(activeSection);

  if (activeSection !== lastPropSection) {
    setLastPropSection(activeSection);
    setActiveTab(activeSection);
  }

  const setTabAndSave = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('settings_last_view', tab);
    setActiveSection(tab as any);
  };

  const currentCompartment = SETTINGS_COMPARTMENTS.find(c => c.id === activeTab);
  const CurrentIcon = currentCompartment?.icon;

  const filteredCompartments = SETTINGS_COMPARTMENTS.filter(c => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(term) || c.desc.toLowerCase().includes(term);
  });

  const filteredSettingsItems = searchQuery.trim() ? SETTINGS_SEARCH_INDEX.filter(item => {
    const term = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term) || item.keywords.some(k => k.includes(term));
  }) : [];

  const handleExportData = () => {
    const data = {
      state: state,
      dungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]'),
      majorDungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]'),
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholars_dungeon_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  return (
    <div className="p-6 space-y-8">
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 sm:p-8 backdrop-blur-sm">
        {activeTab === 'menu' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tighter uppercase italic flex items-center gap-3">
                <SettingsIcon className="text-indigo-500 w-6 h-6 sm:w-8 sm:h-8" />
                <span>Settings Panel</span>
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">Select a settings compartment to customize your experience.</p>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative max-w-4xl">
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => handleSearchSubmit()}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); handleSearchSubmit(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              )}
            </form>

            {recentSearches.length > 0 && !searchQuery.trim() && (
              <div className="flex flex-wrap items-center gap-2 max-w-4xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 shrink-0 px-1 pt-0.5">
                  Recent Searches:
                </span>
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentSearchClick(term)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30 transition-all group shrink-0"
                  >
                    <span>{term}</span>
                    <div
                      onClick={(e) => removeRecentSearch(e, term)}
                      className="p-0.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X size={12} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 max-w-4xl">
              {!searchQuery.trim() ? (
                // Normal Compartment View
                filteredCompartments.map(compartment => (
                  <button 
                    key={compartment.id}
                    onClick={() => setTabAndSave(compartment.id)} 
                    className={cn(
                      "flex items-center gap-4 p-5 bg-slate-900/40 hover:bg-slate-900/80 rounded-3xl border border-slate-800/80 transition-all text-left group w-full",
                      compartment.borderColor
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border group-hover:scale-105 transition-transform shrink-0", compartment.bgColor)}>
                      <compartment.icon size={22} className={compartment.iconColor} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white uppercase tracking-widest text-xs sm:text-sm truncate">{compartment.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-normal sm:line-clamp-1 line-clamp-2">{compartment.desc}</p>
                    </div>
                    <div className="ml-auto w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center transition-opacity transition-opacity">
                      <ChevronRight className={compartment.iconColor} size={16} />
                    </div>
                  </button>
                ))
              ) : (
                // Search Results View
                filteredSettingsItems.length === 0 ? (
                  <div className="py-12 text-center bg-slate-900/20 rounded-3xl border border-slate-800/50 border-dashed">
                    <p className="text-slate-500 font-medium">No settings matched "{searchQuery}".</p>
                  </div>
                ) : (
                  filteredSettingsItems.map(item => {
                    const compartment = SETTINGS_COMPARTMENTS.find(c => c.id === item.tab);
                    if (!compartment) return null;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => {
                          setTabAndSave(item.tab);
                          setTimeout(() => {
                            const el = document.getElementById(item.id);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900', 'transition-all', 'duration-500');
                              setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900'), 1500);
                            }
                          }, 150);
                        }} 
                        className={cn(
                          "flex items-start gap-4 p-5 bg-slate-900/40 hover:bg-slate-900/80 rounded-3xl border border-slate-800/80 transition-all text-left group w-full",
                          compartment.borderColor
                        )}
                      >
                        <div className={cn("w-10 h-10 mt-1 rounded-2xl flex items-center justify-center border shrink-0", compartment.bgColor)}>
                          <compartment.icon size={18} className={compartment.iconColor} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{compartment.title}</span>
                          </div>
                          <h3 className="font-bold text-white tracking-tight text-sm sm:text-base truncate">{item.title}</h3>
                          <p className="text-xs text-slate-400 font-medium mt-1 leading-normal sm:line-clamp-1 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="ml-auto w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center transition-opacity transition-opacity self-center">
                          <ChevronRight className={compartment.iconColor} size={16} />
                        </div>
                      </button>
                    );
                  })
                )
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header style matching our active custom compartments */}
            <div className="flex flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border shrink-0", currentCompartment?.bgColor || "bg-indigo-500/10 border-indigo-500/20")}>
                  {CurrentIcon && <CurrentIcon className={currentCompartment?.iconColor || "text-indigo-400"} size={22} />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-black text-slate-55 tracking-tight uppercase italic truncate">
                    {currentCompartment?.title || "Settings"}
                  </h2>
                  <p className="text-slate-500 text-[10px] sm:text-xs font-medium sm:line-clamp-1 line-clamp-2">{currentCompartment?.desc || "Tune the parameters of this compartment."}</p>
                </div>
              </div>
              <button 
                onClick={() => setTabAndSave('menu')}
                className="p-2 sm:px-4 sm:py-2 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500 transition-all flex items-center gap-2 group shrink-0"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Back to Menu</span>
              </button>
            </div>

            {/* Sub-Contents rendering */}
            <div>
              {activeTab === 'general' && (
                <GeneralSettings state={state} setState={setState} setShowClearConfirm={setShowClearConfirm} />
              )}
              {activeTab === 'timer' && (
                <TimerSettingsSection 
                  state={state} 
                  setState={setState} 
                  rewardPool={rewardPool}
                  onUpdateRewards={onUpdateRewards}
                  onResetRewards={onResetRewards}
                  onTabChange={onTabChange}
                />
              )}
              {activeTab === 'cloud' && (
                <CloudSettingsSection 
                  state={state}
                  setState={setState}
                  setActiveSection={setActiveSection}
                  onOpenAstralArchives={onOpenAstralArchives || (() => {})}
                  triggerSyncCheck={triggerSyncCheck}
                  isSyncing={isSyncing}
                  hasUnsyncedChanges={hasUnsyncedChanges}
                />
              )}
              {(activeTab === 'level' || activeTab === 'levelRewards') && (
                <LevelRewardsSettings state={state} setState={setState} />
              )}
              {activeTab === 'merchant' && (
                <div className="space-y-12">
                  <ShopSettings items={shopItems} onUpdate={onUpdateShop} />
                  
                  <div className="pt-12 border-t border-slate-800">
                    <GachaSettings pools={gachaPools} onUpdate={onUpdateGacha} />
                  </div>

                  {/* Draw Animation Section at the very end */}
                  <div className="pt-12 border-t border-slate-800 space-y-6">
                    <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
                      <Sparkles size={20} />
                      <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Draw Animation</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4 p-5 bg-slate-900/50 rounded-3xl border border-indigo-500/10 shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                          <Package size={16} className="text-indigo-400" />
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gacha Draw</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'card', name: 'Classic Flip', icon: Layers, desc: 'Vertical flip' },
                            { id: 'scratch', name: 'Scratch-off', icon: Scroll, desc: 'Reveal' }
                          ].map(effect => {
                            const isActive = (state.gachaAnimation || 'card') === effect.id;
                            return (
                              <button
                                key={effect.id}
                                onClick={() => setState((prev: any) => ({ ...prev, gachaAnimation: effect.id as 'card' | 'scratch' }))}
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all relative overflow-hidden group text-left",
                                  isActive 
                                    ? "bg-indigo-500/10 border-indigo-500" 
                                    : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                                )}
                              >
                                <effect.icon size={20} className={cn("transition-transform group-hover:scale-110", isActive ? "text-indigo-400" : "text-slate-600")} />
                                <div>
                                  <div className={cn("text-[9px] font-black uppercase tracking-widest leading-none mb-0.5", isActive ? "text-white" : "text-slate-500")}>
                                    {effect.name}
                                  </div>
                                  <div className="text-[8px] opacity-60 font-medium whitespace-nowrap">{effect.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4 p-5 bg-slate-900/50 rounded-3xl border border-indigo-500/10 shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                          <Ticket size={16} className="text-indigo-400" />
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ichiban Draw</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'card', name: 'Classic Flip', icon: Layers, desc: 'Vertical flip' },
                            { id: 'scratch', name: 'Scratch-off', icon: Scroll, desc: 'Reveal' }
                          ].map(effect => {
                            const isActive = (state.ichibanAnimation || 'scratch') === effect.id;
                            return (
                              <button
                                key={effect.id}
                                onClick={() => setState((prev: any) => ({ ...prev, ichibanAnimation: effect.id as 'card' | 'scratch' }))}
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all relative overflow-hidden group text-left",
                                  isActive 
                                    ? "bg-indigo-500/10 border-indigo-500" 
                                    : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                                )}
                              >
                                <effect.icon size={20} className={cn("transition-transform group-hover:scale-110", isActive ? "text-indigo-400" : "text-slate-600")} />
                                <div>
                                  <div className={cn("text-[9px] font-black uppercase tracking-widest leading-none mb-0.5", isActive ? "text-white" : "text-slate-500")}>
                                    {effect.name}
                                  </div>
                                  <div className="text-[8px] opacity-60 font-medium whitespace-nowrap">{effect.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Allow Overlap Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800 mt-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl", state.gachaAllowOverlap ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                          <Layers size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase text-xs tracking-widest">Overlap Mode</div>
                          <div className="text-[10px] text-slate-500">Show cards one by one with navigation</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setState((prev: any) => ({ ...prev, gachaAllowOverlap: !prev.gachaAllowOverlap }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                          state.gachaAllowOverlap ? "bg-indigo-500" : "bg-slate-700"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            state.gachaAllowOverlap ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'calculator' && (
                <CalcSettingsSection state={state} setState={setState} />
              )}
              {activeTab === 'sage' && (
                <SageSettingsSection state={state} setState={setState} />
              )}
              {activeTab === 'dev' && (
                <DeveloperSettings state={state} setState={setState} addXP={addXP} getNow={getNow} />
              )}
              {activeTab === 'about' && (
                <div className="space-y-8 py-4">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/20">
                      <SettingsIcon size={40} className="text-white-pure" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white tracking-tight">Scholar's Dungeon</h3>
                      <div className="flex flex-col items-center gap-1 mt-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full font-bold tracking-widest uppercase text-xs border border-indigo-500/30">
                          Version {APP_VERSION}
                        </span>
                        <span className="text-slate-500 text-xs font-medium">
                          Updated: {LAST_UPDATE_DATE}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 space-y-4">
                      <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
                        <Scroll size={20} />
                        <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Project Info</h4>
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        Scholar's Dungeon is a gamified learning system designed to turn study sessions into an immersive Roguelike adventure. 
                        By combining the Pomodoro technique with RPG progression, it helps students and lifelong learners maintain focus and motivation.
                      </p>
                    </div>

                    <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 space-y-6">
                      <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
                        <User size={20} />
                        <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Author & Links</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Author</span>
                          <span className="text-white font-bold">Karakn</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Email</span>
                          <a href="mailto:pankechill@outlool.com" className="text-indigo-400 hover:text-indigo-300 transition-colors font-mono text-sm">pankechill@outlool.com</a>
                        </div>
                        <div className="pt-4 space-y-3">
                          <a 
                            href="https://github.com/pancakechillover/ScholarDungeon" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all group"
                          >
                            <span className="text-slate-300 text-sm font-bold">GitHub Repository</span>
                            <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                          </a>
                          <a 
                            href="https://github.com/pancakechillover/ScholarDungeon/blob/main/README.md" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all group"
                          >
                            <span className="text-slate-300 text-sm font-bold">Documentation (README)</span>
                            <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 space-y-6">
                    <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
                      <History size={20} />
                      <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Release History</h4>
                    </div>
                    
                    <div className="space-y-6 relative ml-3">
                      {(() => {
                        if (RELEASE_HISTORY.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                              <History size={32} className="text-slate-700" />
                              <div>
                                <div className="text-slate-300 font-bold">No release history available yet</div>
                                <div className="text-slate-500 text-xs mt-1">Check back later for future updates.</div>
                              </div>
                            </div>
                          );
                        }

                        // Group history by Minor Version (e.g., v4.5, v4.4)
                        const grouped = RELEASE_HISTORY.reduce((acc, log) => {
                          const parts = log.version.replace('v', '').split('.');
                          const groupKey = `v${parts[0]}.${parts[1]}`;
                          if (!acc[groupKey]) acc[groupKey] = [];
                          acc[groupKey].push(log);
                          return acc;
                        }, {} as Record<string, typeof RELEASE_HISTORY>);

                        return Object.entries(grouped).map(([group, logs], index, array) => {
                          const isLast = index === array.length - 1;
                          return (
                            <div key={group} className="relative pl-8">
                              {/* Connecting branch to the box */}
                              <div className="absolute top-[26px] left-0 w-8 h-[2px] bg-slate-800" />
                              
                              {/* Vertical line connecting to the next item */}
                              {!isLast && (
                                <div className="absolute top-[27px] -left-px w-[2px] h-[calc(100%+24px)] bg-slate-800" />
                              )}

                              {/* Node point */}
                              <div className={cn(
                                "absolute top-[21px] -left-1.5 w-3 h-3 rounded-full border-2 border-slate-900 z-10",
                                logs.some(l => l.version === APP_VERSION) ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-slate-600"
                              )} />
                              
                              <VersionGroup 
                                group={group} 
                                logs={logs} 
                                isInitialExpanded={logs.some(l => l.version === APP_VERSION)} 
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="text-center pt-4">
                    <p className="text-slate-600 text-[10px] uppercase tracking-[0.3em] font-bold">
                      Built with Passion for Learning & Gaming
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {createPortal(
        <AnimatePresence>
          {showClearConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 w-full max-w-md rounded-3xl border border-red-500/30 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="text-red-400" />
                    Warning: Irreversible Action
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    You are about to clear <strong>ALL</strong> stored data. This includes your progress, talents, inventory, and history. This action <strong>cannot be undone</strong>.
                  </p>
                  
                  <div className="flex items-start gap-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                    <Cloud size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Note: This only affects the data stored on this device. Your <span className="text-indigo-300 font-bold">Cloud Archives</span> in the Astral Archives will remain untouched.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 space-y-3">
                    <p className="text-xs text-indigo-300 font-bold leading-relaxed">
                      Before proceeding, we strongly recommend exporting your data for safekeeping.
                    </p>
                    <button
                      onClick={handleExportData}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Database size={14} />
                      Export Data as JSON
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Type "Delete" to confirm</label>
                    <input 
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type Delete here"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-red-500 outline-none transition-all font-bold"
                    />
                  </div>

                  <p className="text-red-400 text-sm font-bold">
                    Are you absolutely sure you want to proceed?
                  </p>
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        setShowClearConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold transition-colors"
                    >
                      Yes, Clear Data
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      </div>
    </div>
  );
});
