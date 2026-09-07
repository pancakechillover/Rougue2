import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Trash2, Calendar, Clock, Target, AlertCircle, Sparkles, CheckCircle2, 
  Layers, Filter, CheckSquare, Square, Search, ArrowRight, Tag, RotateCcw, 
  Download, Copy, Check, ChevronDown, Brain, Wind, Zap, Sliders, Play
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { format, parseISO, addHours, addDays } from 'date-fns';
import { cn } from '../../lib/utils';
import { StudySession, Dungeon } from '../../types';
import { DatePicker } from '../common/DatePicker';
import { TimePicker } from '../common/TimePicker';
import { SpinnerInput } from '../common/SpinnerInput';

interface BulkSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkCreate: (data: {
    count: number;
    objectiveId: string;
    startTime: string;
    endTime: string;
    focusDuration?: number;
    restDuration?: number;
  }) => void;
  onBulkDelete: (data: {
    startTime?: string;
    endTime?: string;
    sessionIds?: string[];
  }) => void;
  onBulkUpdate?: (
    sessionIds: string[], 
    updates: Partial<StudySession> | ((session: StudySession) => Partial<StudySession>)
  ) => void;
  dungeons: Dungeon[];
  history?: StudySession[];
  allHashtags?: string[];
}

type TabType = 'manage' | 'create' | 'delete';
type PresetType = 'pomo' | 'deep' | 'ultra' | 'custom';
type DistributionType = 'sequential' | 'even' | 'random';

export const BulkSessionModal: React.FC<BulkSessionModalProps> = ({
  isOpen,
  onClose,
  onBulkCreate,
  onBulkDelete,
  onBulkUpdate,
  dungeons,
  history = [],
  allHashtags = []
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('manage');
  
  // Manage Tab States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDungeonId, setFilterDungeonId] = useState('all');
  const [manageDatePreset, setManageDatePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);
  
  // Batch Action Sub-controls
  const [batchActionType, setBatchActionType] = useState<'' | 'reassign' | 'tag' | 'shift' | 'clearDistractions'>('');
  const [reassignTargetDungeon, setReassignTargetDungeon] = useState('free_study');
  const [batchTagInput, setBatchTagInput] = useState('');
  const [shiftHours, setShiftHours] = useState(1);
  const [shiftDirection, setShiftDirection] = useState<'forward' | 'backward'>('forward');

  // Batch Create States
  const today = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [preset, setPreset] = useState<PresetType>('pomo');
  const [countMode, setCountMode] = useState<'fixed' | 'auto'>('auto');
  const [fixedCount, setFixedCount] = useState<number>(4);
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [restDuration, setRestDuration] = useState<number>(5);
  const [distribution, setDistribution] = useState<DistributionType>('sequential');
  const [createObjectiveId, setCreateObjectiveId] = useState('');

  // Range Purge States
  const [purgeStartDate, setPurgeStartDate] = useState(today);
  const [purgeEndDate, setPurgeEndDate] = useState(today);
  const [purgeStartTime, setPurgeStartTime] = useState('00:00');
  const [purgeEndTime, setPurgeEndTime] = useState('23:59');
  const [purgeDungeonId, setPurgeDungeonId] = useState('all');

  // Preset Switcher
  const applyPreset = (type: PresetType) => {
    setPreset(type);
    if (type === 'pomo') {
      setFocusDuration(25);
      setRestDuration(5);
    } else if (type === 'deep') {
      setFocusDuration(50);
      setRestDuration(10);
    } else if (type === 'ultra') {
      setFocusDuration(90);
      setRestDuration(15);
    }
  };

  // Auto count calculation
  const calculateAutoCount = () => {
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    const days = Math.max(1, Math.floor((parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const [startH, startM] = (startTime || '09:00').split(':').map(Number);
    const [endH, endM] = (endTime || '18:00').split(':').map(Number);
    let dailyMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (dailyMinutes < 0) dailyMinutes += 24 * 60;

    const totalMinutes = days * dailyMinutes;
    const cycle = (Number(focusDuration) || 25) + (Number(restDuration) || 5);
    return Math.max(1, Math.floor(totalMinutes / cycle));
  };

  const currentGenerateCount = countMode === 'fixed' ? (Number(fixedCount) || 1) : calculateAutoCount();

  // Generated Sessions Preview
  const previewGeneratedSessions = useMemo(() => {
    if (activeTab !== 'create' || currentGenerateCount <= 0) return [];
    
    const count = Math.min(currentGenerateCount, 30); // preview up to 30
    const start = new Date(`${startDate}T${startTime}:00`).getTime();
    const end = new Date(`${endDate}T${endTime}:00`).getTime();
    const cycleMins = (focusDuration || 25) + (restDuration || 5);
    const previewList: Array<{ time: string; focus: number; rest: number }> = [];

    for (let i = 0; i < count; i++) {
      let ts = start;
      if (distribution === 'sequential') {
        ts = start + i * cycleMins * 60 * 1000;
      } else if (distribution === 'even') {
        const step = count > 1 ? (end - start - cycleMins * 60 * 1000) / (count - 1) : 0;
        ts = start + i * step;
      } else {
        ts = start + (i / count) * (end - start);
      }
      previewList.push({
        time: format(new Date(ts), 'MMM d, HH:mm'),
        focus: focusDuration,
        rest: restDuration
      });
    }
    return previewList;
  }, [activeTab, currentGenerateCount, startDate, endDate, startTime, endTime, focusDuration, restDuration, distribution]);

  // Manage Tab: Filtered Sessions
  const filteredSessions = useMemo(() => {
    return history.filter(session => {
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const dungeonName = dungeons.find(d => d.id === session.dungeonId)?.name?.toLowerCase() || 'free study';
        const noteMatch = session.note?.toLowerCase().includes(query);
        const dungeonMatch = dungeonName.includes(query);
        if (!noteMatch && !dungeonMatch) return false;
      }

      // Dungeon filter
      if (filterDungeonId !== 'all') {
        if (filterDungeonId === 'free_study' && session.dungeonId && session.dungeonId !== 'free_study') return false;
        if (filterDungeonId !== 'free_study' && session.dungeonId !== filterDungeonId) return false;
      }

      // Date preset
      if (manageDatePreset !== 'all') {
        const sessionTs = new Date(session.timestamp).getTime();
        const now = Date.now();
        if (manageDatePreset === 'today') {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const sessionDayStr = format(new Date(session.timestamp), 'yyyy-MM-dd');
          if (todayStr !== sessionDayStr) return false;
        } else if (manageDatePreset === '7days') {
          if (now - sessionTs > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (manageDatePreset === '30days') {
          if (now - sessionTs > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [history, searchQuery, filterDungeonId, manageDatePreset, dungeons]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredSessions.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Selected stats
  const selectedStats = useMemo(() => {
    const selected = history.filter(s => selectedIds.has(s.id));
    const totalFocus = selected.reduce((acc, s) => acc + (s.focusDuration || s.duration || 0), 0);
    const totalRest = selected.reduce((acc, s) => acc + (s.restDuration || 0), 0);
    const totalDistractions = selected.reduce((acc, s) => {
      return acc + (s.distractions?.internal || 0) + (s.distractions?.external || 0) + (s.distractions?.unavoidable || 0);
    }, 0);
    return { count: selected.length, totalFocus, totalRest, totalDistractions };
  }, [history, selectedIds]);

  // Range Purge: Matching sessions calculation
  const purgeMatchingSessions = useMemo(() => {
    if (activeTab !== 'delete') return [];
    try {
      const start = new Date(`${purgeStartDate}T${purgeStartTime}:00`).getTime();
      const end = new Date(`${purgeEndDate}T${purgeEndTime}:00`).getTime();
      return history.filter(s => {
        const ts = new Date(s.timestamp).getTime();
        if (ts < start || ts > end) return false;
        if (purgeDungeonId !== 'all') {
          if (purgeDungeonId === 'free_study' && s.dungeonId && s.dungeonId !== 'free_study') return false;
          if (purgeDungeonId !== 'free_study' && s.dungeonId !== purgeDungeonId) return false;
        }
        return true;
      });
    } catch {
      return [];
    }
  }, [activeTab, purgeStartDate, purgeEndDate, purgeStartTime, purgeEndTime, purgeDungeonId, history]);

  // Batch actions on selected
  const handleBatchDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    onBulkDelete({ sessionIds: Array.from(selectedIds) });
    setSelectedIds(new Set());
    setBatchActionType('');
  };

  const handleBatchReassign = () => {
    if (selectedIds.size === 0 || !onBulkUpdate) return;
    onBulkUpdate(Array.from(selectedIds), { dungeonId: reassignTargetDungeon });
    setSelectedIds(new Set());
    setBatchActionType('');
  };

  const handleBatchTag = () => {
    if (selectedIds.size === 0 || !onBulkUpdate || !batchTagInput.trim()) return;
    const tagToAdd = batchTagInput.trim().startsWith('#') ? batchTagInput.trim() : `#${batchTagInput.trim()}`;
    onBulkUpdate(Array.from(selectedIds), (session) => {
      const currentNote = session.note || '';
      const updatedNote = currentNote ? `${currentNote} ${tagToAdd}` : tagToAdd;
      return { note: updatedNote };
    });
    setBatchTagInput('');
    setBatchActionType('');
  };

  const handleBatchShift = () => {
    if (selectedIds.size === 0 || !onBulkUpdate) return;
    const hours = shiftDirection === 'forward' ? shiftHours : -shiftHours;
    onBulkUpdate(Array.from(selectedIds), (session) => {
      const shifted = addHours(new Date(session.timestamp), hours);
      return { timestamp: shifted.toISOString() };
    });
    setBatchActionType('');
  };

  const handleBatchClearDistractions = () => {
    if (selectedIds.size === 0 || !onBulkUpdate) return;
    onBulkUpdate(Array.from(selectedIds), {
      distractions: undefined
    });
    setBatchActionType('');
  };

  const handleExportSelected = () => {
    const selected = history.filter(s => selectedIds.has(s.id));
    if (selected.length === 0) return;

    const dataToExport = selected.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      dungeon: dungeons.find(d => d.id === s.dungeonId)?.name || 'Free Study',
      focusMinutes: s.focusDuration || s.duration,
      restMinutes: s.restDuration || 0,
      totalMinutes: s.duration,
      distractions: s.distractions || { internal: 0, external: 0, unavoidable: 0 },
      note: s.note || '',
      xp: s.xpEarned,
      coins: s.coinsEarned
    }));

    navigator.clipboard.writeText(JSON.stringify(dataToExport, null, 2));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Execution Handlers
  const handleExecuteCreate = () => {
    onBulkCreate({
      count: currentGenerateCount,
      objectiveId: createObjectiveId || 'free_study',
      startTime: `${startDate}T${startTime}:00`,
      endTime: `${endDate}T${endTime}:00`,
      focusDuration: Number(focusDuration) || 25,
      restDuration: Number(restDuration) || 5
    });
    onClose();
  };

  const handleExecutePurge = () => {
    if (purgeMatchingSessions.length === 0) return;
    onBulkDelete({
      sessionIds: purgeMatchingSessions.map(s => s.id)
    });
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 isolate">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl z-10 flex flex-col overflow-hidden"
        >
          {/* Header & Tabs */}
          <div className="p-5 sm:p-6 pb-3 shrink-0 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Bulk Manage Sessions
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Batch Operations & Timeline Generator
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/60 hover:bg-slate-800 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Tab Controls */}
            <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800/90 gap-1">
              <button
                onClick={() => setActiveTab('manage')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                  activeTab === 'manage'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Sliders size={13} />
                Batch Actions ({history.length})
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                  activeTab === 'create'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Plus size={13} />
                Generator
              </button>
              <button
                onClick={() => setActiveTab('delete')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                  activeTab === 'delete'
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Trash2 size={13} />
                Range Purge
              </button>
            </div>
          </div>

          {/* Tab 1: Manage Existing Sessions */}
          {activeTab === 'manage' && (
            <div className="flex-1 min-h-0 flex flex-col p-5 sm:p-6 pt-4 space-y-4 overflow-hidden">
              {/* Filter Bar */}
              <div className="space-y-2 shrink-0">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notes, #tags, dungeons..."
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    />
                  </div>
                  <select
                    value={filterDungeonId}
                    onChange={(e) => setFilterDungeonId(e.target.value)}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60"
                  >
                    <option value="all">All Objectives</option>
                    <option value="free_study">Free Study</option>
                    {dungeons.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Quick Date Presets & Selection Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1">
                    {(['all', 'today', '7days', '30days'] as const).map(presetKey => (
                      <button
                        key={presetKey}
                        onClick={() => setManageDatePreset(presetKey)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all",
                          manageDatePreset === presetKey
                            ? "bg-slate-800 text-indigo-400 border border-indigo-500/30"
                            : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {presetKey === 'all' ? 'All Time' : presetKey === 'today' ? 'Today' : presetKey === '7days' ? '7 Days' : '30 Days'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectedIds.size === filteredSessions.length && filteredSessions.length > 0 ? deselectAll : selectAllFiltered}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                    >
                      {selectedIds.size === filteredSessions.length && filteredSessions.length > 0 ? (
                        <>
                          <Square size={13} /> Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare size={13} /> Select Filtered ({filteredSessions.length})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky Batch Operations Action Bar (when sessions are selected) */}
              {selectedIds.size > 0 && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl shrink-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-xs font-black text-white">
                        {selectedStats.count} Selected
                      </span>
                      <span className="text-[10px] text-indigo-300 font-mono">
                        ({Math.round(selectedStats.totalFocus)}m focus)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleExportSelected}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="Copy selected data as JSON"
                      >
                        {copiedNotification ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedNotification ? 'Copied' : 'Export'}
                      </button>
                      <button
                        onClick={() => setBatchActionType(prev => prev === 'reassign' ? '' : 'reassign')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Target size={12} /> Reassign
                      </button>
                      <button
                        onClick={() => setBatchActionType(prev => prev === 'tag' ? '' : 'tag')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Tag size={12} /> Tag
                      </button>
                      <button
                        onClick={() => setBatchActionType(prev => prev === 'shift' ? '' : 'shift')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Clock size={12} /> Shift
                      </button>
                      <button
                        onClick={handleBatchDeleteSelected}
                        className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Sub-action drawer */}
                  {batchActionType === 'reassign' && (
                    <div className="pt-2 border-t border-indigo-500/20 flex items-center gap-2 animate-in fade-in duration-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">To Objective:</span>
                      <select
                        value={reassignTargetDungeon}
                        onChange={(e) => setReassignTargetDungeon(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white"
                      >
                        <option value="free_study">Free Study</option>
                        {dungeons.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBatchReassign}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {batchActionType === 'tag' && (
                    <div className="pt-2 border-t border-indigo-500/20 flex items-center gap-2 animate-in fade-in duration-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Append Tag:</span>
                      <input
                        type="text"
                        value={batchTagInput}
                        onChange={(e) => setBatchTagInput(e.target.value)}
                        placeholder="#thesis or tag..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-1 px-2.5 text-xs text-white placeholder:text-slate-600"
                      />
                      <button
                        onClick={handleBatchTag}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Add Tag
                      </button>
                    </div>
                  )}

                  {batchActionType === 'shift' && (
                    <div className="pt-2 border-t border-indigo-500/20 flex items-center gap-2 animate-in fade-in duration-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Shift By:</span>
                      <select
                        value={shiftDirection}
                        onChange={(e: any) => setShiftDirection(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white"
                      >
                        <option value="forward">+ Forward</option>
                        <option value="backward">- Backward</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="720"
                        value={shiftHours}
                        onChange={(e) => setShiftHours(Number(e.target.value) || 1)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white text-center font-mono"
                      />
                      <span className="text-[11px] text-slate-400">hours</span>
                      <button
                        onClick={handleBatchShift}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Shift
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Scrollable List of Sessions */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No sessions match the current search or filters.
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const isSelected = selectedIds.has(session.id);
                    const dungeonName = dungeons.find(d => d.id === session.dungeonId)?.name || 'Free Study';
                    const hasDistractions = session.distractions && (session.distractions.internal > 0 || session.distractions.external > 0 || session.distractions.unavoidable > 0);
                    
                    return (
                      <div
                        key={session.id}
                        onClick={() => toggleSelect(session.id)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs select-none",
                          isSelected
                            ? "bg-indigo-950/40 border-indigo-500/50 shadow-sm"
                            : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className={cn(
                              "w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0",
                              isSelected ? "bg-indigo-600 text-white" : "border border-slate-700 text-transparent hover:border-slate-500"
                            )}
                          >
                            <Check size={11} strokeWidth={3} />
                          </button>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-slate-400">
                                {format(parseISO(session.timestamp), 'yyyy-MM-dd HH:mm')}
                              </span>
                              <span className="font-bold text-white truncate max-w-[140px]">
                                {dungeonName}
                              </span>
                            </div>
                            {session.note && (
                              <p className="text-[10px] text-slate-400 italic truncate max-w-[240px] mt-0.5">
                                {session.note}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasDistractions && (
                            <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              {session.distractions?.internal ? <span className="text-indigo-400 flex items-center gap-0.5"><Brain size={9} />{session.distractions.internal}</span> : null}
                              {session.distractions?.external ? <span className="text-orange-400 flex items-center gap-0.5"><Wind size={9} />{session.distractions.external}</span> : null}
                              {session.distractions?.unavoidable ? <span className="text-rose-400 flex items-center gap-0.5"><Zap size={9} />{session.distractions.unavoidable}</span> : null}
                            </div>
                          )}
                          <div className="text-right">
                            <span className="font-bold text-indigo-400">{session.focusDuration || session.duration}m</span>
                            <span className="text-slate-500"> + </span>
                            <span className="font-bold text-emerald-400">{session.restDuration || 0}m</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Batch Generator */}
          {activeTab === 'create' && (
            <div className="flex-1 min-h-0 flex flex-col p-5 sm:p-6 pt-4 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Preset Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Preset Templates
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('pomo')}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all",
                      preset === 'pomo' ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="block text-xs font-black">Pomodoro</span>
                    <span className="text-[10px] text-indigo-400 font-mono">25+5m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('deep')}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all",
                      preset === 'deep' ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="block text-xs font-black">Deep Work</span>
                    <span className="text-[10px] text-indigo-400 font-mono">50+10m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('ultra')}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all",
                      preset === 'ultra' ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="block text-xs font-black">Ultradian</span>
                    <span className="text-[10px] text-indigo-400 font-mono">90+15m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('custom')}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all",
                      preset === 'custom' ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="block text-xs font-black">Custom</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Custom</span>
                  </button>
                </div>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <DatePicker value={startDate} onChange={setStartDate} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <DatePicker value={endDate} onChange={setEndDate} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Start</label>
                  <TimePicker value={startTime} onChange={setStartTime} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily End</label>
                  <TimePicker value={endTime} onChange={setEndTime} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
              </div>

              {/* Duration Config */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block ml-0.5">Focus Duration (m)</label>
                  <SpinnerInput value={focusDuration} onChange={(val) => { setFocusDuration(Number(val) || 25); setPreset('custom'); }} className="w-full bg-slate-950/80" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block ml-0.5">Rest Duration (m)</label>
                  <SpinnerInput value={restDuration} onChange={(val) => { setRestDuration(Number(val) || 0); setPreset('custom'); }} className="w-full bg-slate-950/80" />
                </div>
              </div>

              {/* Count Mode & Distribution */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Count Mode</span>
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCountMode('auto')}
                      className={cn("px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all", countMode === 'auto' ? "bg-indigo-600 text-white" : "text-slate-400")}
                    >
                      Auto ({calculateAutoCount()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountMode('fixed')}
                      className={cn("px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all", countMode === 'fixed' ? "bg-indigo-600 text-white" : "text-slate-400")}
                    >
                      Fixed Count
                    </button>
                  </div>
                </div>

                {countMode === 'fixed' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Total sessions to generate:</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={fixedCount}
                      onChange={(e) => setFixedCount(Number(e.target.value) || 1)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white text-center font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Objective Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Dungeon</label>
                <select
                  value={createObjectiveId}
                  onChange={(e) => setCreateObjectiveId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Free Study</option>
                  {dungeons.filter(d => d.status === 'active').map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Live Preview List */}
              {previewGeneratedSessions.length > 0 && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={12} />
                      Will Generate {currentGenerateCount} Sessions ({Math.round(currentGenerateCount * focusDuration)}m total focus)
                    </span>
                    <span className="text-[10px] text-slate-400">Preview (First {previewGeneratedSessions.length})</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5">
                    {previewGeneratedSessions.map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 font-mono">
                        #{idx + 1} {p.time} ({p.focus}m)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExecuteCreate}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Execute Batch Entry ({currentGenerateCount} Sessions)
              </button>
            </div>
          )}

          {/* Tab 3: Range Purge */}
          {activeTab === 'delete' && (
            <div className="flex-1 min-h-0 flex flex-col p-5 sm:p-6 pt-4 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3">
                <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-rose-300 uppercase tracking-wider">
                    Range Purge Warning
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    All sessions matching this exact time range and filter will be permanently removed. This repairs historical charts and progress rollbacks.
                  </p>
                </div>
              </div>

              {/* Date & Time Range Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <DatePicker value={purgeStartDate} onChange={setPurgeStartDate} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <DatePicker value={purgeEndDate} onChange={setPurgeEndDate} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                  <TimePicker value={purgeStartTime} onChange={setPurgeStartTime} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                  <TimePicker value={purgeEndTime} onChange={setPurgeEndTime} className="w-full bg-slate-950/80 border-slate-800 py-2 text-xs" />
                </div>
              </div>

              {/* Dungeon Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objective Filter</label>
                <select
                  value={purgeDungeonId}
                  onChange={(e) => setPurgeDungeonId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="all">All Objectives (Entire Range)</option>
                  <option value="free_study">Free Study Only</option>
                  {dungeons.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Matching Result Summary */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Matching Records to Purge</span>
                  <span className="text-[10px] text-slate-500">Sessions matching specified range</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-black text-rose-400">
                    {purgeMatchingSessions.length}
                  </span>
                  <span className="text-xs text-slate-400 font-sans ml-1">sessions</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={purgeMatchingSessions.length === 0}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2",
                  purgeMatchingSessions.length > 0
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-95"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                )}
              >
                <Trash2 size={16} />
                Purge {purgeMatchingSessions.length} Sessions in Range
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
