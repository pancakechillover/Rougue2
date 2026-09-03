import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Clock, Trophy, Edit2, Trash2, Filter, Search, X, Check, SearchX, Calendar, Sword, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Zap, Layers, Download, Brain, Wind } from 'lucide-react';
import { StudySession, Dungeon, MajorDungeon, RewardCard, TimeSettings } from '../../types';
import { cn, getSessionEffectiveMinutes } from '../../lib/utils';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { SpinnerInput } from '../common/SpinnerInput';
import { DatePicker } from '../common/DatePicker';
import { BulkSessionModal } from './BulkSessionModal';
import { ConfirmModal } from '../modals/ConfirmModal';

interface RecentSessionsProps {
  history: StudySession[];
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  updateSession: (id: string, updates: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  bulkCreateSessions?: (data: { count: number, objectiveId: string, startTime: string, endTime: string, focusDuration?: number, restDuration?: number }) => void;
  bulkDeleteSessions?: (data: { startTime: string, endTime: string }) => void;
  rewardPool: RewardCard[];
  timeSettings?: TimeSettings;
  includeRestTimeInTasks?: boolean;
}

export const RecentSessions: React.FC<RecentSessionsProps> = ({
  history,
  dungeons,
  majorDungeons,
  updateSession,
  deleteSession,
  bulkCreateSessions,
  bulkDeleteSessions,
  rewardPool,
  timeSettings,
  includeRestTimeInTasks = false
}) => {
  const [showPeriodicSplits, setShowPeriodicSplits] = useState(true);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<StudySession | null>(null);
  const [viewingRewardName, setViewingRewardName] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDungeon, setFilterDungeon] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [durationRange, setDurationRange] = useState({ min: '', max: '' });
  const [sortConfig, setSortConfig] = useState<{ 
    key: keyof StudySession | 'dungeon' | 'date'; 
    direction: 'asc' | 'desc' | null 
  }>({ key: 'date', direction: 'desc' });

  // Extract all hashtags from history
  const allHashtags = useMemo(() => {
    const tags = new Set<string>();
    history.forEach(session => {
      if (session.note) {
        const matches = session.note.match(/#[\w\u4e00-\u9fa5]+/g);
        if (matches) {
          matches.forEach(tag => tags.add(tag));
        }
      }
    });
    return Array.from(tags).sort();
  }, [history]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('scholars_dungeon_column_widths');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse column widths', e);
      }
    }
    return {
      date: 160,
      dungeon: 220,
      duration: 140,
      reward: 140,
      gains: 110,
      actions: 90
    };
  });

  const handleResize = (column: string, width: number) => {
    setColumnWidths(prev => {
      const updated = { ...prev, [column]: Math.max(width, 60) };
      localStorage.setItem('scholars_dungeon_column_widths', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle jump from Stats
  React.useEffect(() => {
    const handleJump = (e: any) => {
      const timestamp = e.detail;
      const dateStr = format(new Date(timestamp), 'yyyy-MM-dd');
      setDateRange({ start: dateStr, end: dateStr });
      setShowFilters(true);
      setSearchTerm('');
      setFilterDungeon('all');
      setDurationRange({ min: '', max: '' });
    };

    window.addEventListener('recentSessionsJumpToDate', handleJump);
    return () => window.removeEventListener('recentSessionsJumpToDate', handleJump);
  }, []);

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'desc' ? 'asc' : 'desc') : 'desc'
    }));
  };

  // Sorting Logic
  const sortedSessions = useMemo(() => {
    const sessions = [...history];
    if (!sortConfig.direction) return sessions;

    return sessions.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortConfig.key === 'date') {
        valA = new Date(a.timestamp).getTime();
        valB = new Date(b.timestamp).getTime();
      } else if (sortConfig.key === 'dungeon') {
        const dA = dungeons.find(d => d.id === a.dungeonId)?.name || 'Free Study';
        const dB = dungeons.find(d => d.id === b.dungeonId)?.name || 'Free Study';
        valA = dA.toLowerCase();
        valB = dB.toLowerCase();
      } else {
        valA = a[sortConfig.key as keyof StudySession] || 0;
        valB = b[sortConfig.key as keyof StudySession] || 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [history, sortConfig, dungeons]);

  const getPeriod = useCallback((timestamp: string) => {
    if (!timeSettings) return { name: 'Other', date: '', fullKey: 'Other' };
    const dateObj = parseISO(timestamp);
    const hour = dateObj.getHours();
    const dateStr = format(dateObj, 'MMM dd');
    const { morning, afternoon, night } = timeSettings;

    const isInRange = (h: number, start: number, end: number) => {
      if (start <= end) return h >= start && h < end;
      return h >= start || h < end; // spans across midnight
    };

    let pName = 'Other';
    if (isInRange(hour, morning.start, morning.end)) pName = 'Morning';
    else if (isInRange(hour, afternoon.start, afternoon.end)) pName = 'Afternoon';
    else if (isInRange(hour, night.start, night.end)) pName = 'Night';
    
    return { name: pName, date: dateStr, fullKey: `${dateStr}-${pName}` };
  }, [timeSettings]);

  const filteredSessions = useMemo(() => {
    return sortedSessions.filter(session => {
      const dungeon = dungeons.find(d => d.id === session.dungeonId);
      const majorDungeon = dungeon?.parentId ? majorDungeons.find(m => m.id === dungeon.parentId) : null;
      const dungeonName = dungeon?.name || 'Free Study';
      const majorName = majorDungeon?.name || '';
      
      const matchesSearch = 
        dungeonName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        majorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (session.rewardName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (session.note?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDungeon = filterDungeon === 'all' || session.dungeonId === filterDungeon;
      
      // Date Range Filter
      let matchesDate = true;
      const sessionDate = parseISO(session.timestamp);
      if (dateRange.start) {
        matchesDate = matchesDate && isAfter(sessionDate, startOfDay(parseISO(dateRange.start)));
      }
      if (dateRange.end) {
        matchesDate = matchesDate && isBefore(sessionDate, endOfDay(parseISO(dateRange.end)));
      }

      // Duration Filter
      let matchesDuration = true;
      const effectiveDuration = getSessionEffectiveMinutes(session, includeRestTimeInTasks);
      if (durationRange.min) {
        matchesDuration = matchesDuration && effectiveDuration >= parseInt(durationRange.min);
      }
      if (durationRange.max) {
        matchesDuration = matchesDuration && effectiveDuration <= parseInt(durationRange.max);
      }

      return matchesSearch && matchesDungeon && matchesDate && matchesDuration;
    });
  }, [sortedSessions, dungeons, majorDungeons, searchTerm, filterDungeon, dateRange, durationRange]);

  const rowSegments = useMemo(() => {
    const segments: (
      | { type: 'separator'; period: string; date: string; key: string; bgVariant: number }
      | { type: 'session'; session: StudySession; key: string; bgVariant: number }
    )[] = [];

    let currentBgVariant = 0;

    filteredSessions.slice(0, 50).forEach((session, index, array) => {
      const period = getPeriod(session.timestamp);
      const prevSession = index > 0 ? array[index - 1] : null;
      const prevPeriod = prevSession ? getPeriod(prevSession.timestamp) : null;
      
      if (showPeriodicSplits && prevPeriod && period.fullKey !== prevPeriod.fullKey) {
        currentBgVariant = (currentBgVariant + 1) % 2;
        segments.push({ 
          type: 'separator', 
          period: period.name, 
          date: period.date, 
          key: `sep-${session.id}`,
          bgVariant: currentBgVariant
        });
      }
      segments.push({ type: 'session', session, key: session.id, bgVariant: currentBgVariant });
    });

    return segments;
  }, [filteredSessions, getPeriod, showPeriodicSplits]);

  const stats = useMemo(() => {
    return {
      totalTime: history.reduce((acc, s) => acc + getSessionEffectiveMinutes(s, includeRestTimeInTasks), 0),
      totalGold: history.reduce((acc, s) => acc + s.coinsEarned, 0),
      totalXP: history.reduce((acc, s) => acc + s.xpEarned, 0),
    };
  }, [history, includeRestTimeInTasks]);

  const exportToCSV = useCallback(() => {
    // CSV Header
    const headers = ['Date', 'Major Dungeon', 'Dungeon Goal', 'Focus (min)', 'Rest (min)', 'Total (min)', 'Reward', 'XP Earned', 'Gold Earned', 'Note'];
    
    // Data Rows
    const rows = filteredSessions.map(session => {
      const dungeon = dungeons.find(d => d.id === session.dungeonId);
      const majorDungeon = dungeon?.parentId ? majorDungeons.find(m => m.id === dungeon.parentId) : null;
      
      return [
        format(parseISO(session.timestamp), 'yyyy-MM-dd HH:mm'),
        majorDungeon?.name || '',
        dungeon?.name || 'Free Study',
        session.focusDuration || session.duration || 0,
        session.restDuration || 0,
        getSessionEffectiveMinutes(session, includeRestTimeInTasks),
        session.rewardName || 'None',
        session.xpEarned,
        session.coinsEarned,
        session.note || ''
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `recent_sessions_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredSessions, dungeons, majorDungeons]);

  return (
    <div id="recent-sessions-anchor" className="w-full space-y-6 mt-12 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="text-indigo-400" />
          Recent Sessions
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold",
              showFilters || filterDungeon !== 'all' || searchTerm 
                ? "bg-indigo-600 border-indigo-500 text-white" 
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
            )}
          >
            <Filter size={16} />
            Filter
            {(filterDungeon !== 'all' || searchTerm) && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:border-amber-500/50 hover:text-amber-400 transition-all text-sm font-bold active:scale-95 shadow-lg shadow-amber-500/5"
            title="Export as CSV"
          >
            <Download size={16} />
            CSV
          </button>

          <button
            onClick={() => setShowPeriodicSplits(!showPeriodicSplits)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold active:scale-95 shadow-lg",
              showPeriodicSplits 
                ? "bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/10" 
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 shadow-slate-900/5"
            )}
            title="Toggle Periodic Splits"
          >
            <Layers size={16} />
            Splits
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 transition-all text-sm font-bold active:scale-95 shadow-lg shadow-indigo-500/5"
          >
            <Layers size={16} />
            Bulk Manage
          </button>
        </div>
      </div>

      <BulkSessionModal 
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onBulkCreate={(data) => bulkCreateSessions?.(data)}
        onBulkDelete={(data) => bulkDeleteSessions?.(data)}
        dungeons={dungeons}
      />

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-2 relative flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search goal, reward, or #hashtags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>
                  {allHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allHashtags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (searchTerm.includes(tag)) {
                              setSearchTerm(searchTerm.replace(tag, '').trim());
                            } else {
                              setSearchTerm((searchTerm + ' ' + tag).trim());
                            }
                          }}
                          className={cn(
                            "px-2 py-1 text-xs rounded-md transition-colors",
                            searchTerm.includes(tag)
                              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={filterDungeon}
                  onChange={(e) => setFilterDungeon(e.target.value)}
                  className="bg-slate-800 border-none rounded-xl py-2 px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none flex-1 mt-0 md:mt-0"
                >
                  <option value="all">All Dungeons</option>
                  <option value="free_study">Free Study</option>
                  {dungeons.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Start Date</label>
                  <DatePicker 
                    value={dateRange.start}
                    onChange={(val) => setDateRange(prev => ({ ...prev, start: val }))}
                    className="w-full bg-slate-800 border-none text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">End Date</label>
                  <DatePicker 
                    value={dateRange.end}
                    onChange={(val) => setDateRange(prev => ({ ...prev, end: val }))}
                    className="w-full bg-slate-800 border-none text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Min Duration (m)</label>
                  <SpinnerInput 
                    placeholder="Min"
                    value={durationRange.min}
                    onChange={(val) => setDurationRange(prev => ({ ...prev, min: val as string }))}
                    className="w-full bg-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Max Duration (m)</label>
                  <SpinnerInput 
                    placeholder="Max"
                    value={durationRange.max}
                    onChange={(val) => setDurationRange(prev => ({ ...prev, max: val as string }))}
                    className="w-full bg-slate-800"
                  />
                </div>
              </div>

              {(searchTerm || filterDungeon !== 'all' || dateRange.start || dateRange.end || durationRange.min || durationRange.max) && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterDungeon('all');
                      setDateRange({ start: '', end: '' });
                      setDurationRange({ min: '', max: '' });
                    }}
                    className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <X size={10} />
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden border border-slate-800 rounded-3xl bg-slate-900/40 backdrop-blur-sm">
        <div className="overflow-x-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-12 flex flex-col items-center text-center">
              <SearchX size={48} className="text-slate-700 mb-4" />
              <h4 className="text-slate-500 font-bold">No sessions found</h4>
              <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or record a new session!</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="relative px-6 py-5 text-center" style={{ width: columnWidths.date }}>
                    <button 
                      onClick={() => handleSort('date')}
                      className="flex items-center justify-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors w-full"
                    >
                      <Calendar size={16} className="shrink-0" />
                      <span className="whitespace-nowrap">Date</span>
                      {sortConfig.key === 'date' && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </button>
                    <div 
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/50"
                      onMouseDown={(e) => {
                        const startX = e.pageX;
                        const startWidth = columnWidths.date;
                        const moveHandler = (moveEvent: MouseEvent) => {
                          handleResize('date', startWidth + (moveEvent.pageX - startX));
                        };
                        const upHandler = () => {
                          window.removeEventListener('mousemove', moveHandler);
                          window.removeEventListener('mouseup', upHandler);
                        };
                        window.addEventListener('mousemove', moveHandler);
                        window.addEventListener('mouseup', upHandler);
                      }}
                    />
                  </th>
                  <th className="relative px-6 py-5 text-center" style={{ width: columnWidths.dungeon }}>
                    <button 
                      onClick={() => handleSort('dungeon')}
                      className="flex items-center justify-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors w-full"
                    >
                      <Sword size={16} className="shrink-0" />
                      <span className="whitespace-nowrap">Dungeon Goal</span>
                      {sortConfig.key === 'dungeon' && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </button>
                    <div 
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/50"
                      onMouseDown={(e) => {
                        const startX = e.pageX;
                        const startWidth = columnWidths.dungeon;
                        const moveHandler = (moveEvent: MouseEvent) => {
                          handleResize('dungeon', startWidth + (moveEvent.pageX - startX));
                        };
                        const upHandler = () => {
                          window.removeEventListener('mousemove', moveHandler);
                          window.removeEventListener('mouseup', upHandler);
                        };
                        window.addEventListener('mousemove', moveHandler);
                        window.addEventListener('mouseup', upHandler);
                      }}
                    />
                  </th>
                  <th className="relative px-6 py-5 text-center" style={{ width: columnWidths.duration }}>
                    <button 
                      onClick={() => handleSort('duration')}
                      className="flex items-center justify-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors w-full"
                    >
                      <Clock size={16} className="shrink-0" />
                      <span className="whitespace-nowrap">Duration</span>
                      {sortConfig.key === 'duration' && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </button>
                    <div 
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/50"
                      onMouseDown={(e) => {
                        const startX = e.pageX;
                        const startWidth = columnWidths.duration;
                        const moveHandler = (moveEvent: MouseEvent) => {
                          handleResize('duration', startWidth + (moveEvent.pageX - startX));
                        };
                        const upHandler = () => {
                          window.removeEventListener('mousemove', moveHandler);
                          window.removeEventListener('mouseup', upHandler);
                        };
                        window.addEventListener('mousemove', moveHandler);
                        window.addEventListener('mouseup', upHandler);
                      }}
                    />
                  </th>
                  <th className="relative px-6 py-5 text-center" style={{ width: columnWidths.reward }}>
                    <div className="flex items-center justify-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      <Trophy size={16} className="shrink-0" />
                      <span className="whitespace-nowrap">Reward</span>
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/50"
                      onMouseDown={(e) => {
                        const startX = e.pageX;
                        const startWidth = columnWidths.reward;
                        const moveHandler = (moveEvent: MouseEvent) => {
                          handleResize('reward', startWidth + (moveEvent.pageX - startX));
                        };
                        const upHandler = () => {
                          window.removeEventListener('mousemove', moveHandler);
                          window.removeEventListener('mouseup', upHandler);
                        };
                        window.addEventListener('mousemove', moveHandler);
                        window.addEventListener('mouseup', upHandler);
                      }}
                    />
                  </th>
                  <th className="relative px-6 py-5 text-center" style={{ width: columnWidths.gains }}>
                    <div className="flex items-center justify-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      <Zap size={16} className="shrink-0" />
                      <span className="whitespace-nowrap">Gains</span>
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-500/50"
                      onMouseDown={(e) => {
                        const startX = e.pageX;
                        const startWidth = columnWidths.gains;
                        const moveHandler = (moveEvent: MouseEvent) => {
                          handleResize('gains', startWidth + (moveEvent.pageX - startX));
                        };
                        const upHandler = () => {
                          window.removeEventListener('mousemove', moveHandler);
                          window.removeEventListener('mouseup', upHandler);
                        };
                        window.addEventListener('mousemove', moveHandler);
                        window.addEventListener('mouseup', upHandler);
                      }}
                    />
                  </th>
                  <th className="px-6 py-5 text-center" style={{ width: columnWidths.actions }}>
                    <div className="flex items-center justify-center text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      <span className="whitespace-nowrap">Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <AnimatePresence mode="popLayout">
                  {rowSegments.map((segment) => {
                    const getBgStyle = (variant: number) => ({
                      bg: variant === 0 ? 'bg-transparent' : 'bg-indigo-500/5',
                      hover: variant === 0 ? 'hover:bg-indigo-500/5' : 'hover:bg-indigo-500/10',
                    });

                    const getLabelStyle = (period: string) => {
                      const styles: Record<string, { label: string, text: string }> = {
                        'Morning': { label: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', text: 'text-yellow-300' },
                        'Afternoon': { label: 'bg-orange-500/20 text-orange-300 border-orange-500/30', text: 'text-orange-300' },
                        'Night': { label: 'bg-blue-500/20 text-blue-300 border-blue-500/30', text: 'text-blue-300' },
                        'Other': { label: 'bg-slate-500/20 text-slate-300 border-slate-500/30', text: 'text-slate-300' }
                      };
                      return styles[period] || styles['Other'];
                    };

                    const bg = getBgStyle(segment.bgVariant);
                    const rowBg = bg.bg;
                    const rowHover = bg.hover;
                    const labelStyle = segment.type === 'separator' ? getLabelStyle(segment.period) : null;

                    if (segment.type === 'separator') {
                      return (
                        <motion.tr 
                          layout 
                          key={segment.key}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn("relative z-10 transition-colors duration-300", rowBg)}
                        >
                          <td colSpan={6} className="px-6 py-3">
                            <div className="flex items-center gap-4">
                              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                              <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-lg",
                                labelStyle!.label
                              )}>
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-[0.2em]",
                                  labelStyle!.text
                                )}>
                                  {segment.date} • {segment.period}
                                </span>
                              </div>
                              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                            </div>
                          </td>
                        </motion.tr>
                      );
                    }

                    const { session } = segment;
                    const dungeon = dungeons.find(d => d.id === session.dungeonId);
                    const majorDungeon = dungeon?.parentId ? majorDungeons.find(m => m.id === dungeon.parentId) : null;
                    
                    return (
                      <React.Fragment key={segment.key}>
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "group transition-all duration-300",
                          rowBg,
                          rowHover
                        )}
                      >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-400">
                            {format(parseISO(session.timestamp), 'MM/dd HH:mm')}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                             <div className="flex flex-col min-w-0">
                               {majorDungeon && (
                                 <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                                   {majorDungeon.name}
                                 </span>
                               )}
                               <span className="text-xs sm:text-sm font-bold text-white truncate">
                                 {dungeon?.name || 'Free Study'}
                               </span>
                             </div>
                           </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                             <div className="text-[10px] sm:text-xs font-bold text-slate-300">
                               <span className="text-indigo-400">{session.focusDuration || 0} min</span>
                               <span className="text-slate-500"> + </span>
                               <span className="text-emerald-400">{session.restDuration || 0} min</span>
                             </div>
                              {session.distractions && (session.distractions.internal > 0 || session.distractions.external > 0 || session.distractions.unavoidable > 0) && (
                                <div className="mt-1 flex items-center justify-center gap-1 opacity-80" title={`Total Distractions: ${(session.distractions.internal || 0) + (session.distractions.external || 0) + (session.distractions.unavoidable || 0)}`}>
                                 <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-0.5 font-bold font-mono">
                                   <span className="text-rose-400">{(() => {
                                     const totalDist = (session.distractions.internal || 0) + (session.distractions.external || 0) + (session.distractions.unavoidable || 0);
                                     const durMins = Math.max(1, (session.focusDuration || session.duration || 1));
                                     const rate = totalDist / durMins;
                                     return rate < 0.1 ? rate.toFixed(2) : (rate >= 10 ? Math.round(rate).toString() : rate.toFixed(1));
                                   })()}</span>
                                   <span className="text-slate-400 font-sans font-normal text-[8.5px]">/min</span>
                                 </span>
                                 <div className="flex items-center gap-0.5 ml-1">
                                   {session.distractions.internal > 0 && <span className="flex items-center gap-0.5 text-[9px] text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded" title="Internal"><Brain size={10} />{session.distractions.internal}</span>}
                                   {session.distractions.external > 0 && <span className="flex items-center gap-0.5 text-[9px] text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded" title="External"><Wind size={10} />{session.distractions.external}</span>}
                                   {session.distractions.unavoidable > 0 && <span className="flex items-center gap-0.5 text-[9px] text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded" title="Unavoidable"><Zap size={10} />{session.distractions.unavoidable}</span>}
                                 </div>
                               </div>
                             )}
                           </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-center">
                          {session.rewardName ? (
                            <div className="flex items-center justify-center gap-2 overflow-hidden">
                              <button 
                                onClick={() => setViewingRewardName(session.rewardName || null)}
                                className="text-[10px] sm:text-xs font-bold text-amber-500/90 hover:text-amber-400 truncate underline decoration-amber-500/30 underline-offset-2 transition-colors cursor-pointer"
                                title="Click to view details"
                              >
                                {session.rewardName}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] sm:text-xs text-slate-600 italic pr-1">None</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center text-[9px] sm:text-[10px]">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-emerald-400">+{session.xpEarned}X</span>
                            <span className="font-black text-amber-400">+{session.coinsEarned}G</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                            <button
                              onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                              className={cn("p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg transition-all", expandedSessionId === session.id ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500 hover:text-white")}
                              title="Toggle Note"
                            >
                              <ChevronDown size={12} className={cn("transition-transform", expandedSessionId === session.id ? "rotate-180" : "rotate-0")} />
                            </button>
                            <button
                              onClick={() => setEditingSession(session)}
                              className="p-1.5 sm:p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                              title="Edit Session"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => {
                                setSessionToDelete(session);
                              }}
                              className="p-1.5 sm:p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                              title="Delete Session"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                      
                      {expandedSessionId === session.id && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-slate-900/80 border-t border-slate-800/50"
                        >
                          <td colSpan={6} className="px-6 py-4">
                            <div className="flex items-start gap-3 w-full max-w-4xl mx-auto">
                              <Edit2 size={14} className="text-slate-500 mt-1 shrink-0" />
                              <div className="flex-1">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Study Note</h4>
                                <textarea
                                  defaultValue={session.note || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== session.note) {
                                      updateSession(session.id, { note: e.target.value });
                                    }
                                  }}
                                  placeholder="Add notes, context, or #hashtags about this session..."
                                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-700 min-h-[80px]"
                                />
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSession && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit2 className="text-indigo-400" />
                  Edit Session
                </h3>
                <button onClick={() => setEditingSession(null)} className="text-slate-500 hover:text-white">
                  <X />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Dungeon</label>
                  <select
                    value={editingSession.dungeonId}
                    onChange={(e) => setEditingSession({ ...editingSession, dungeonId: e.target.value })}
                    className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="free_study">Free Study</option>
                    {dungeons.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Dungeon Start Time</label>
                  <input
                    type="datetime-local"
                    value={format(parseISO(editingSession.timestamp), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setEditingSession({ ...editingSession, timestamp: new Date(e.target.value).toISOString() })}
                    className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 italic pr-1">Adjusting this helps the "Daily" calculation in Record charts.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block text-indigo-400">Focus (m)</label>
                    <SpinnerInput
                      value={editingSession.focusDuration || 0}
                      onChange={(val) => setEditingSession({ ...editingSession, focusDuration: typeof val === 'number' ? val : 0 })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block text-emerald-400">Rest (m)</label>
                    <SpinnerInput
                      value={editingSession.restDuration || 0}
                      onChange={(val) => setEditingSession({ ...editingSession, restDuration: typeof val === 'number' ? val : 0 })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Total Duration (m)</label>
                  <SpinnerInput
                    value={editingSession.duration}
                    onChange={(val) => setEditingSession({ ...editingSession, duration: typeof val === 'number' ? val : 0 })}
                    className="w-full"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 italic pr-1">Note: Changing duration does NOT automatically adjust XP/Gold already earned.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingSession(null)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      updateSession(editingSession.id, {
                        dungeonId: editingSession.dungeonId,
                        duration: editingSession.duration,
                        focusDuration: editingSession.focusDuration,
                        restDuration: editingSession.restDuration,
                        timestamp: editingSession.timestamp
                      });
                      setEditingSession(null);
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reward Details Modal */}
      <AnimatePresence>
        {viewingRewardName && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
               onClick={() => setViewingRewardName(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 w-full max-w-sm rounded-3xl border border-amber-500/20 overflow-hidden shadow-2xl relative"
            >
              {(() => {
                const reward = rewardPool.find(r => r.name === viewingRewardName);
                
                return (
                  <>
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                      <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
                        <Trophy size={20} />
                        Reward Details
                      </h3>
                      <button onClick={() => setViewingRewardName(null)} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div className="text-center">
                        <h4 className="text-lg font-black text-white mb-2">{viewingRewardName}</h4>
                        {reward ? (
                          <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            {reward.description}
                          </p>
                        ) : (
                          <div className="text-slate-400 text-sm italic py-4">
                            This reward is no longer in your active Loot Pool, or it is a custom item.
                          </div>
                        )}
                      </div>
                      
                      {reward && (
                        <div className="flex gap-2 justify-center pt-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded",
                            reward.rarity === 'legendary' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            reward.rarity === 'epic' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                            reward.rarity === 'rare' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          )}>
                            {reward.rarity}
                          </span>
                          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border border-slate-700">
                            {reward.type === 'coins' ? 'Gold Coins' : 
                             reward.type === 'xp' ? 'Experience' : 
                             reward.type === 'item' ? 'Functional Item' : 'Text Entry'}
                          </span>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => setViewingRewardName(null)}
                        className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <ConfirmModal 
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete) {
            deleteSession(sessionToDelete.id);
            setSessionToDelete(null);
          }
        }}
        title="Delete Session"
        message="Are you sure you want to delete this session? This will revert dungeon progress, XP, and Gold."
        confirmText="Delete Session"
        type="danger"
      />
    </div>
  );
};
