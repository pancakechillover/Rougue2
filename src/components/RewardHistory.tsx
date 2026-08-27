import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scroll, 
  CheckCircle2, 
  Clock, 
  Package, 
  Trophy, 
  Filter, 
  Calendar, 
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Coins,
  Zap,
  Circle,
  History,
  Tag
} from 'lucide-react';
import { AppState, RewardHistoryItem, Transaction } from '../types';
import { cn } from '../lib/utils';
import { PageHeader } from './PageHeader';
import { format, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { getColorClass } from '../lib/colors';
import { EconomyLog } from './EconomyLog';
import { InventoryTab } from './InventoryTab';

interface RewardHistoryProps {
  history: RewardHistoryItem[];
  transactionHistory?: Transaction[];
  appState: AppState;
  onToggleRedeemed: (id: string) => void;
  useInventoryItem: (id: string) => void;
}

type FilterTab = 'all' | 'treasures' | 'custom' | 'economy' | 'inventory';
type TimeRange = 'all' | 'today' | '7d' | '30d';
type SourceFilter = 'all' | 'Explore' | 'Gacha' | 'Shop' | 'LevelUp';
type StatusFilter = 'all' | 'redeemed' | 'pending';
type RarityFilter = 'all' | 'COMMON' | 'RARE' | 'EPIC' | 'LASTONE';

export const RewardHistory: React.FC<RewardHistoryProps> = ({ history, transactionHistory = [], appState, onToggleRedeemed, useInventoryItem }) => {
  const [activeTab, setActiveTab] = useState<FilterTab | 'menu'>(() => {
    const saved = localStorage.getItem('vault_last_view');
    if (saved === 'treasures' || saved === 'custom') {
      return 'all';
    }
    return (saved as FilterTab | 'menu') || 'menu';
  });

  const [subTab, setSubTab] = useState<'all' | 'treasures' | 'custom'>(() => {
    const saved = localStorage.getItem('vault_last_view');
    if (saved === 'treasures' || saved === 'custom' || saved === 'all') {
      return saved as 'all' | 'treasures' | 'custom';
    }
    return 'all';
  });

  const setTabAndSave = (tab: FilterTab | 'menu' | 'treasures' | 'custom') => {
    if (tab === 'treasures' || tab === 'custom') {
      setActiveTab('all');
      setSubTab(tab);
      localStorage.setItem('vault_last_view', tab);
    } else if (tab === 'all') {
      setActiveTab('all');
      setSubTab('all');
      localStorage.setItem('vault_last_view', 'all');
    } else {
      setActiveTab(tab);
      localStorage.setItem('vault_last_view', tab);
    }
  };
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Tab Filtering
      if (activeTab === 'all') {
        if (subTab === 'treasures' && item.type === 'text') return false;
        if (subTab === 'custom' && item.type !== 'text') return false;
      }

      // Search Filtering
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Time Filtering
      if (timeRange !== 'all') {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        let start;
        if (timeRange === 'today') start = startOfDay(now);
        else if (timeRange === '7d') start = startOfDay(subDays(now, 7));
        else start = startOfDay(subDays(now, 30));
        
        if (!isWithinInterval(itemDate, { start, end: endOfDay(now) })) return false;
      }

      // Source Filtering
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;

      // Status Filtering
      if (statusFilter !== 'all') {
        const isRedeemed = item.redeemed;
        if (statusFilter === 'redeemed' && !isRedeemed) return false;
        if (statusFilter === 'pending' && isRedeemed) return false;
      }

      // Rarity Filtering
      if (rarityFilter !== 'all') {
        const r = item.rarity.toUpperCase();
        if (rarityFilter === 'COMMON' && !r.includes('COMMON') && !r.includes('D')) return false;
        if (rarityFilter === 'RARE' && !r.includes('RARE') && !r.includes('C') && r !== 'R') return false;
        if (rarityFilter === 'EPIC' && !r.includes('EPIC') && !r.includes('SR') && !r.includes('B')) return false;
        if (rarityFilter === 'LASTONE' && !r.includes('LASTONE')) return false;
      }

      return true;
    });
  }, [history, activeTab, subTab, timeRange, sourceFilter, statusFilter, rarityFilter, searchQuery]);

  const stats = useMemo(() => {
    const treasures = history.filter(i => i.type !== 'text').length;
    const custom = history.filter(i => i.type === 'text').length;
    const pending = history.filter(i => i.type === 'text' && !i.redeemed).length;
    return { treasures, custom, pending };
  }, [history]);

  if (activeTab === 'menu') {
    return (
      <div className="w-full space-y-6 sm:space-y-8">
        <PageHeader 
          title="Reward Vault"
          description="Select a vault compartment to view."
          icon={History}
        />
        <div className="grid grid-cols-1 gap-4 max-w-3xl">
          <button onClick={() => setTabAndSave('all')} className="flex items-center gap-4 p-5 bg-slate-900/50 hover:bg-slate-900 rounded-3xl border border-slate-800 hover:border-indigo-500 transition-all text-left group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
              <History size={24} />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-widest text-sm">All Rewards</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Complete history of all acquisitions.</p>
            </div>
            <div className="ml-auto w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center transition-opacity transition-opacity">
              <ChevronRight className="text-indigo-400" size={16} />
            </div>
          </button>

          <button onClick={() => setTabAndSave('economy')} className="flex items-center gap-4 p-5 bg-slate-900/50 hover:bg-slate-900 rounded-3xl border border-slate-800 hover:border-emerald-500 transition-all text-left group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
              <Coins size={24} />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-widest text-sm">Economy Log</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Transaction history of Gold and XP.</p>
            </div>
            <div className="ml-auto w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center transition-opacity transition-opacity">
              <ChevronRight className="text-emerald-400" size={16} />
            </div>
          </button>

          <button onClick={() => setTabAndSave('inventory')} className="flex items-center gap-4 p-5 bg-slate-900/50 hover:bg-slate-900 rounded-3xl border border-slate-800 hover:border-blue-500 transition-all text-left group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform shrink-0">
              <Package size={24} />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-widest text-sm">Item Inventory</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Manage consumable items and medals.</p>
            </div>
            <div className="ml-auto w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center transition-opacity transition-opacity">
              <ChevronRight className="text-blue-400" size={16} />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {activeTab === 'economy' ? (
        <PageHeader 
          title="Economy Log"
          description="Comprehensive history of all Gold Coins and Experience Points acquired and spent."
          icon={Coins}
          action={
            <button 
              onClick={() => setTabAndSave('menu')}
              className="p-2 sm:px-4 sm:py-2.5 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500 transition-all flex items-center gap-2 group shrink-0"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Back to Vault</span>
            </button>
          }
        />
      ) : activeTab === 'inventory' ? (
        <PageHeader 
          title="Item Inventory"
          description="View and manage your active consumable items, shards, and special medals."
          icon={Package}
          action={
            <button 
              onClick={() => setTabAndSave('menu')}
              className="p-2 sm:px-4 sm:py-2.5 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500 transition-all flex items-center gap-2 group shrink-0"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Back to Vault</span>
            </button>
          }
        />
      ) : (
        <PageHeader 
          title="All Rewards"
          description="Manage your complete reward history including system-granted items and custom text rewards."
          icon={History}
          action={
            <button 
              onClick={() => setTabAndSave('menu')}
              className="p-2 sm:px-4 sm:py-2.5 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500 transition-all flex items-center gap-2 group shrink-0"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Back to Vault</span>
            </button>
          }
        />
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row gap-4 max-w-full">
        {activeTab === 'all' && (
          <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800 w-full lg:w-fit overflow-x-auto flex-nowrap shrink-0 snap-x">
            <button
              onClick={() => setTabAndSave('all')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0 snap-start",
                subTab === 'all' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              All
            </button>
            <button
              onClick={() => setTabAndSave('treasures')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0 snap-start",
                subTab === 'treasures' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Treasures
            </button>
            <button
              onClick={() => setTabAndSave('custom')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0 snap-start",
                subTab === 'custom' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Custom
            </button>
          </div>
        )}

        {activeTab !== 'economy' && activeTab !== 'inventory' && (
          <div className="flex-grow flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search rewards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-4 rounded-2xl border transition-all flex items-center gap-2",
                showFilters ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              )}
            >
              <Filter size={18} />
              <span className="hidden sm:inline text-xs font-bold uppercase">Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && activeTab !== 'economy' && activeTab !== 'inventory' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-900/30 rounded-3xl border border-slate-800/50">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Tag size={12} /> Source
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="Explore">Explore</option>
                  <option value="Gacha">Gacha</option>
                  <option value="Shop">Shop</option>
                  <option value="LevelUp">Level Up</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={12} /> Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="redeemed">Redeemed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Tag size={12} /> Rarity
                </label>
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value as RarityFilter)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="all">All Rarity</option>
                  <option value="COMMON">Common</option>
                  <option value="RARE">Rare</option>
                  <option value="EPIC">Epic</option>
                  <option value="LASTONE">Last One</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {activeTab === 'economy' ? (
        <motion.div
          key="economy-log"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EconomyLog history={transactionHistory} />
        </motion.div>
      ) : activeTab === 'inventory' ? (
        <motion.div
          key="inventory-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <InventoryTab appState={appState} history={history} useInventoryItem={useInventoryItem} />
        </motion.div>
      ) : (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-slate-800 bg-slate-950/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-16">Icon</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reward</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:table-cell w-24 text-center">Rarity</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:table-cell w-40 text-center">Session Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:table-cell w-32">Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40 text-center">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <Scroll size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 font-medium">No rewards match your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr 
                    key={item.id}
                    className={cn(
                      "group hover:bg-slate-800/20 transition-colors",
                      item.redeemed ? "bg-lime-500/5" : ""
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border shrink-0",
                        (() => {
                          if (item.color) {
                            const { borderClass, bgClass, textClass } = getColorClass(item.color);
                            return `${bgClass} ${borderClass} ${textClass}`;
                          }
                          const r = item.rarity.toUpperCase();
                          if (r.includes('LASTONE') || r.includes('MYTHIC')) return "bg-rose-500/10 border-rose-500/20 text-rose-500";
                          if (r.includes('LEGENDARY') || r.includes('SSR') || r.includes('A PRIZE') || r === 'A') return "bg-amber-500/10 border-amber-500/20 text-amber-500";
                          if (r.includes('EPIC') || r.includes('SR') || r.includes('B PRIZE') || r === 'B') return "bg-purple-500/10 border-purple-500/20 text-purple-500";
                          if (r.includes('RARE') || r === 'R' || r.includes('C PRIZE') || r === 'C') return "bg-blue-500/10 border-blue-500/20 text-blue-500";
                          if (r.includes('UNCOMMON') || r.includes('D PRIZE') || r === 'D') return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
                          return "bg-slate-500/10 border-slate-500/20 text-slate-500";
                        })()
                      )}>
                        {item.type === 'coins' ? <Coins size={18} className="text-amber-400" /> :
                         item.type === 'xp' ? <Zap size={18} className="text-indigo-400" /> :
                         item.type === 'item' ? (
                           item.itemType === 'talent_shard' ? <Trophy size={18} className="text-purple-400" /> :
                           item.itemType === 'death_defying_medal' ? <Trophy size={18} className="text-amber-400" /> :
                           <Package size={18} className="text-indigo-400" />
                         ) :
                         <Scroll size={18} className="text-slate-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors text-sm">
                            {item.name}
                          </span>
                          {item.amount && item.amount > 1 && item.type !== 'coins' && item.type !== 'xp' && item.itemType !== 'xp_bonus_percent' && item.itemType !== 'coin_bonus_percent' && item.itemType !== 'double_xp' && item.itemType !== 'double_coin' && (
                            <span className="text-[10px] font-black text-indigo-400">x{item.amount}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.type === 'coins' ? `+${item.amount} gold coins` :
                           item.type === 'xp' ? `+${item.amount} experience points` :
                           item.type === 'item' ? (
                             item.itemType === 'double_xp' ? "Double XP" :
                             item.itemType === 'double_coin' ? "Double Coins" :
                             item.itemType === 'talent_shard' ? "Unlock talents" :
                             item.itemType === 'death_defying_medal' ? "Streak shield" :
                             item.itemType === 'xp_bonus_percent' ? `+${item.amount}% XP` :
                             item.itemType === 'coin_bonus_percent' ? `+${item.amount}% Coins` :
                             "Dungeon item"
                           ) : "Message reward"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded border border-current inline-block",
                        (() => {
                          if (item.color) {
                            const { textClass, bgClass } = getColorClass(item.color);
                            return `${textClass} ${bgClass}`;
                          }
                          const r = item.rarity.toUpperCase();
                          if (r.includes('LASTONE') || r.includes('MYTHIC')) return "text-rose-500 bg-rose-500/5";
                          if (r.includes('LEGENDARY') || r.includes('SSR') || r.includes('A PRIZE') || r === 'A') return "text-amber-500 bg-amber-500/5";
                          if (r.includes('EPIC') || r.includes('SR') || r.includes('B PRIZE') || r === 'B') return "text-purple-500 bg-purple-500/5";
                          if (r.includes('RARE') || r === 'R' || r.includes('C PRIZE') || r === 'C') return "text-blue-500 bg-blue-500/5";
                          if (r.includes('UNCOMMON') || r.includes('D PRIZE') || r === 'D') return "text-emerald-500 bg-emerald-500/5";
                          return "text-slate-500 bg-slate-800";
                        })()
                      )}>
                        {item.rarity}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {item.sessionDuration !== undefined ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 text-indigo-400">
                            <Clock size={12} />
                            <span className="text-[10px] font-black uppercase tracking-tight">{item.sessionDuration}m Clear</span>
                          </div>
                          {item.sessionGoal !== undefined && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Trophy size={11} />
                              <span className="text-[9px] font-bold uppercase tracking-tight">{item.sessionGoal}m Goal</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-[10px] text-slate-600 italic pr-1">No Session</div>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Tag size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{item.source}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5 text-slate-500">
                        <Calendar size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider font-mono">
                          {format(new Date(item.timestamp), 'yyyy-MM-dd')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(item.type === 'text' || item.source === 'Shop') ? (
                        <button
                          onClick={() => onToggleRedeemed(item.id)}
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all justify-center",
                            item.redeemed 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 shadow-sm"
                          )}
                        >
                          {item.redeemed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                          <span className="text-[10px] font-black uppercase tracking-tight">
                            {item.redeemed ? 'Reaped' : 'Secure'}
                          </span>
                        </button>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-tight italic pr-1">Claimed</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
