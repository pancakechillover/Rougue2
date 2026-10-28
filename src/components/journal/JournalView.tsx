import { MarkdownEditor } from "../common/MarkdownEditor";
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 

  format, subDays, addDays, parseISO, isValid, isToday
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, ArrowLeft, ChevronLeft, ChevronRight, 
  PanelLeftClose, PanelLeftOpen,
  Star, Calculator, SlidersHorizontal, Heart, 
  Maximize2, Download, Edit3, 
  Clock, Target, Zap, 
  Compass, Bookmark, BookmarkCheck, Trash2, Calendar, X, FileText
} from 'lucide-react';
import { AppState, Dungeon, MajorDungeon } from '../../types';
import { cn, getSessionEffectiveMinutes } from '../../lib/utils';
import { DurationText } from '../common/DurationText';
import { getEffectiveTargetFocusMinutes } from '../../lib/workstationUtils';
import { DatePicker } from '../common/DatePicker';
import { ImmersiveReflectionModal } from './ImmersiveReflectionModal';
import { EfficiencyDetailsModal } from '../record/EfficiencyDetailsModal';
import { BatchExportModal } from '../modals/BatchExportModal';
import { MoodSelector } from '../common/MoodSelector';
import { StarRating } from '../common/StarRating';

import { playSound } from '../../lib/sound';

export interface JournalViewProps {
  state: AppState;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string, title?: string) => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  onBack: () => void;
  initialDate?: Date;
}

export const JournalView: React.FC<JournalViewProps> = ({
  state,
  saveDailyLog,
  onUpdateState,
  onBack,
  initialDate
}) => {
  // Resolve initial peak date
  const getInitialPeakDate = () => {
    if (initialDate && isValid(initialDate)) return initialDate;

    const ts = state.timeSettings || {
      morning: { start: 8, end: 12 },
      afternoon: { start: 14, end: 18 },
      night: { start: 20, end: 24 }
    };
    
    let now = new Date();
    if (state.timezone) {
      try {
        const str = now.toLocaleString('en-US', { timeZone: state.timezone });
        now = new Date(str);
      } catch (e) {
        console.error("Timezone error:", e);
      }
    }
    
    const hour = now.getHours();
    if (ts.night.start > ts.night.end && hour < ts.night.end) {
      return subDays(now, 1);
    } else if (hour < ts.morning.start) {
      return subDays(now, 1);
    }
    return now;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialPeakDate());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const [pageFlipDirection, setPageFlipDirection] = useState<'left' | 'right'>('right');

  // Logs state
  const dailyLogs = state.dailyLogs || {};
  const currentSavedLog = dailyLogs[selectedDateStr];

  // Bookmarks state (stored in state.journalBookmarks or fallback to localStorage)
  const bookmarks = useMemo(() => {
    return (state.journalBookmarks || []).filter(b => typeof b === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b));
  }, [state.journalBookmarks]);

  const isCurrentDateBookmarked = bookmarks.includes(selectedDateStr);

  const toggleBookmark = (dateToToggle = selectedDateStr) => {
    let updated: string[];
    const isBookmarked = bookmarks.includes(dateToToggle);
    if (isBookmarked) {
      updated = bookmarks.filter(d => d !== dateToToggle);
      playSound('click', state.soundVolume, state.soundEnabled);
    } else {
      updated = [...bookmarks, dateToToggle].sort().reverse();
      playSound('success', state.soundVolume, state.soundEnabled);
    }
    if (onUpdateState) {
      onUpdateState({ journalBookmarks: updated });
    }
  };

  // Editor states
  const [rating, setRating] = useState<number>(currentSavedLog?.rating || 0);
  const [reflection, setReflection] = useState<string>(currentSavedLog?.reflection || '');
  const [mood, setMood] = useState<string | undefined>(currentSavedLog?.mood);
  const [title, setTitle] = useState<string>(currentSavedLog?.title || '');
  const [isQuickEditing, setIsQuickEditing] = useState<boolean>(false);
  const [isImmersiveOpen, setIsImmersiveOpen] = useState(false);
  const [showEfficiencyDetails, setShowEfficiencyDetails] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);

  const [customTargetHours, setCustomTargetHours] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [_saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  // Sync editor when switching dates
  const isSwitchingDateRef = useRef(false);

  /**
   * Only a real date change may reset the editor.
   *
   * This effect also depends on `dailyLogs`, which the 800ms autosave updates —
   * so it used to re-run right after every save and call setIsQuickEditing(false),
   * kicking the user out of the editor a second after they started typing.
   */
  const lastLoadedDateRef = useRef(selectedDateStr);

  useEffect(() => {
    const dateChanged = lastLoadedDateRef.current !== selectedDateStr;
    if (!dateChanged) return;
    lastLoadedDateRef.current = selectedDateStr;

    isSwitchingDateRef.current = true;
    const log = dailyLogs[selectedDateStr];
    setRating(log?.rating || 0);
    setTitle(log?.title || '');

    let initialReflection = log?.reflection || '';
    if (!initialReflection.trim() && state.autoLoadTemplateId && state.reflectionTemplates) {
      const tpl = state.reflectionTemplates.find((t) => t.id === state.autoLoadTemplateId);
      if (tpl) {
        const tplText = (state.autoLoadTemplateMode === 'example' && tpl.exampleContent)
          ? tpl.exampleContent
          : tpl.content;
        if (tplText) {
          initialReflection = tplText;
        }
      }
    }

    setReflection(initialReflection);
    setMood(log?.mood);
    setSaveStatus('saved');
    setIsQuickEditing(false);
    setTimeout(() => {
      isSwitchingDateRef.current = false;
    }, 50);
    // dailyLogs / template settings are read here but must not retrigger a reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr]);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track title changes & auto-save
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSwitchingDateRef.current) {
      setSaveStatus('unsaved');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveDailyLog(selectedDateStr, rating, reflection, mood, val);
        setSaveStatus('saved');
      }, 800);
    }
  };

  // Track changes & auto-save or mark unsaved
  const handleReflectionChange = (val: string) => {
    setReflection(val);
    if (!isSwitchingDateRef.current) {
      setSaveStatus('unsaved');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveDailyLog(selectedDateStr, rating, val, mood, title);
        setSaveStatus('saved');
      }, 800);
    }
  };

  const handleMoodChange = (newMood?: string) => {
    setMood(newMood);
    saveDailyLog(selectedDateStr, rating, reflection, newMood, title);
    playSound('click', state.soundVolume, state.soundEnabled);
  };

  // Perform Save for reflection
  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    saveDailyLog(selectedDateStr, rating, reflection, mood, title);
    playSound('success', state.soundVolume, state.soundEnabled);
    setTimeout(() => {
      setSaveStatus('saved');
      setIsQuickEditing(false);
    }, 300);
  }, [saveDailyLog, selectedDateStr, rating, reflection, mood, title, state.soundVolume, state.soundEnabled]);

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Date indicators for DatePicker
  const dateIndicators = useMemo(() => {
    const res: Record<string, { highlight?: boolean; star?: boolean }> = {};
    if (state.history) {
      for (const session of state.history) {
        if (!session.timestamp) continue;
        const d = session.timestamp.substring(0, 10);
        if (!res[d]) res[d] = {};
        res[d].highlight = true;
      }
    }
    if (state.dailyLogs) {
      for (const [dateStr, log] of Object.entries(state.dailyLogs)) {
        if (log && (log.reflection || log.rating > 0 || log.mood)) {
          if (!res[dateStr]) res[dateStr] = {};
          res[dateStr].star = true;
        }
      }
    }
    return res;
  }, [state.history, state.dailyLogs]);

  // Period info helper
  const ts = state.timeSettings || {
    morning: { start: 8, end: 12 },
    afternoon: { start: 14, end: 18 },
    night: { start: 20, end: 24 }
  };

  const getPeriodInfo = useCallback((date: Date) => {
    let localDate = new Date(date);
    if (!date || isNaN(localDate.getTime())) {
      localDate = new Date();
    }
    if (state.timezone) {
      try {
        const str = localDate.toLocaleString('en-US', { timeZone: state.timezone });
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          localDate = parsed;
        }
      } catch (e) {}
    }
    const hour = localDate.getHours();
    
    if (ts.morning.start > ts.morning.end) {
      if (hour >= ts.morning.start) return { period: 'Morning', assignedDate: localDate };
      if (hour < ts.morning.end) return { period: 'Morning', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.morning.start && hour < ts.morning.end) {
      return { period: 'Morning', assignedDate: localDate };
    }
    
    if (ts.afternoon.start > ts.afternoon.end) {
      if (hour >= ts.afternoon.start) return { period: 'Afternoon', assignedDate: localDate };
      if (hour < ts.afternoon.end) return { period: 'Afternoon', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.afternoon.start && hour < ts.afternoon.end) {
      return { period: 'Afternoon', assignedDate: localDate };
    }

    if (ts.night.start > ts.night.end) {
      if (hour >= ts.night.start) return { period: 'Night', assignedDate: localDate };
      if (hour < ts.night.end) return { period: 'Night', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.night.start && hour < ts.night.end) {
      return { period: 'Night', assignedDate: localDate };
    }

    const resetHour = ts.night.end;
    if (hour < resetHour) {
      return { period: 'Other', assignedDate: subDays(localDate, 1) };
    }
    return { period: 'Other', assignedDate: localDate };
  }, [state.timezone, ts]);

  // Selected date statistics (focus minutes & distractions)
  const selectedDayStats = useMemo(() => {
    const sessions = (state.history || []).filter(s => {
      if (!s.timestamp) return false;
      const d = parseISO(s.timestamp);
      if (!isValid(d)) return false;
      const info = getPeriodInfo(d);
      return format(info.assignedDate, 'yyyy-MM-dd') === selectedDateStr;
    });

    let effectiveMinutes = 0;
    let totalDistractions = 0;
    let completedSessionsCount = 0;

    sessions.forEach(s => {
      effectiveMinutes += getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks);
      if (s.duration > 0 || (s.focusDuration && s.focusDuration > 0)) {
        completedSessionsCount++;
      }
      if (s.distractions) {
        if (typeof s.distractions === 'number') {
          totalDistractions += isNaN(s.distractions) ? 0 : s.distractions;
        } else if (typeof s.distractions === 'object') {
          totalDistractions += (Number(s.distractions.internal) || 0) + (Number(s.distractions.external) || 0) + (Number(s.distractions.unavoidable) || 0);
        }
      }
    });

    const targetFocusStats = getEffectiveTargetFocusMinutes(
      selectedDateStr,
      state,
      effectiveMinutes
    );
    const defaultTargetHours = targetFocusStats.targetHours;

    return {
      effectiveMinutes,
      totalDistractions,
      completedSessionsCount,
      defaultTargetHours,
      targetSource: targetFocusStats.source,
      workstationMinutes: targetFocusStats.workstationMinutes,
      workstationIntervalCount: targetFocusStats.intervalCount,
      conversionRate: targetFocusStats.conversionRate,
      completionPercent: Math.min(100, Math.round((effectiveMinutes / (defaultTargetHours * 60)) * 100))
    };
  }, [state.history, state.workstationLogs, state.activeWorkstationSession, state.includeRestTimeInTasks, state.useSameDailyProgressGoalEveryDay, state.dailyProgressGoal, state.dailyProgressGoalConfig, state.standardSessionMinutes, state.standardRestMinutes, selectedDate, selectedDateStr, getPeriodInfo]);

  // Navigate day helper with page flip animation
  const navigateDay = (direction: 'prev' | 'next') => {
    setPageFlipDirection(direction === 'prev' ? 'left' : 'right');
    playSound('pageTurn', state.soundVolume, state.soundEnabled);
    if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  // Handle star rating change
  const handleRatingChange = (newScore: number) => {
    setRating(newScore);
    saveDailyLog(selectedDateStr, newScore, reflection, mood, title);
    playSound('click', state.soundVolume, state.soundEnabled);
  };

  // Auto-calculate rating formula
  const handleAutoCalculate = () => {
    setIsCalculating(true);

    const actualHours = selectedDayStats.effectiveMinutes / 60;
    const targetHours = customTargetHours !== null ? customTargetHours : selectedDayStats.defaultTargetHours;
    const distractions = selectedDayStats.totalDistractions;

    const b = state.efficiencyRatingConfig?.maxDistractionsPerHour ?? 10;
    const c = (state.efficiencyRatingConfig?.completionRateWeight ?? 70) / 100;
    const d = (state.efficiencyRatingConfig?.focusQualityWeight ?? 30) / 100;
    const isCapped = state.efficiencyRatingConfig?.capMetrics !== false;

    let calculatedRating = 0;

    if (actualHours > 0) {
      const targetCompletionRate = targetHours > 0 ? actualHours / targetHours : 0;
      const normalizedCompletion = isCapped ? Math.min(1.0, targetCompletionRate) : targetCompletionRate;

      const distractionRate = distractions / actualHours;
      const penaltyRatio = b > 0 ? distractionRate / b : 0;
      const rawFocusDegree = 1.0 - penaltyRatio;
      const focusDegree = isCapped ? Math.max(0.0, rawFocusDegree) : rawFocusDegree;

      const finalEfficiency = (c * normalizedCompletion) + (d * focusDegree);
      calculatedRating = isCapped ? Math.max(0, Math.min(5, finalEfficiency * 5)) : (finalEfficiency * 5);
    }

    setTimeout(() => {
      setRating(calculatedRating);
      saveDailyLog(selectedDateStr, calculatedRating, reflection, mood, title);
      setIsCalculating(false);
      playSound('calculate', state.soundVolume, state.soundEnabled);
    }, 450);
  };

  // Word count helper
  const wordCount = useMemo(() => {
    const trimmed = reflection.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [reflection]);

  // Patchouli Bookmark Color Palettes (Refined Minimalist Grimoire & Stationery Palette)
  const getBookmarkColor = (isSelected: boolean) => {
    if (isSelected) {
      return {
        tab: 'bg-indigo-600 border-indigo-400 text-indigo-100 shadow-md shadow-indigo-600/25 translate-x-1 z-20',
        monthText: 'text-indigo-100 font-bold',
        dateText: 'text-indigo-100 font-black',
        deleteBtn: 'text-indigo-200 hover:text-rose-300 bg-indigo-900 border-indigo-400 hover:border-rose-400',
      };
    }
    return {
      tab: 'bg-slate-900/95 hover:bg-slate-850/95 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:translate-x-0.5 opacity-95',
      monthText: 'text-indigo-400 group-hover:text-indigo-300 font-semibold',
      dateText: 'text-slate-200 group-hover:text-slate-100 font-bold',
      deleteBtn: 'text-slate-400 hover:text-rose-400 bg-slate-900 border-slate-700 hover:border-rose-500',
    };
  };

  // Date boundaries for header subtitle display (aligned with Agenda & Workstation)
  const borderHour = state.timeSettings?.morning?.start ?? 8;
  const viewStartTime = useMemo(() => {
    const st = new Date(selectedDate);
    st.setHours(borderHour, 0, 0, 0);
    return st;
  }, [selectedDate, borderHour]);

  const viewEndTime = useMemo(() => {
    const et = new Date(viewStartTime);
    et.setDate(et.getDate() + 1);
    return et;
  }, [viewStartTime]);

  /** Every day that actually has content — reflection, rating or mood. */
  const entryDates = React.useMemo(() => {
    const logs = state.dailyLogs || {};
    return Object.keys(logs)
      .filter((d) => {
        const log = logs[d];
        if (!log) return false;
        return Boolean((log.reflection || '').trim() || log.rating || log.mood || (log.title || '').trim());
      })
      .sort((a, b) => b.localeCompare(a));
  }, [state.dailyLogs]);

  const [railCollapsed, setRailCollapsed] = React.useState(false);
  const [entrySearch, setEntrySearch] = React.useState('');
  const [entryFilter, setEntryFilter] = React.useState<'all' | 'notes' | 'starred'>('all');

  const visibleEntries = React.useMemo(() => {
    return entryDates.filter((d) => {
      const log = state.dailyLogs?.[d];
      if (entryFilter === 'starred' && !bookmarks.includes(d)) return false;
      if (entryFilter === 'notes' && !(log?.reflection || '').trim()) return false;
      if (entrySearch.trim()) {
        const q = entrySearch.toLowerCase();
        const hay = `${d} ${log?.title || ''} ${log?.reflection || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entryDates, entryFilter, entrySearch, bookmarks, state.dailyLogs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="flex w-full h-[100dvh] overflow-hidden bg-slate-950"
    >
      {/* Date navigator — typography mirrors the main sidebar so entering the
          journal reads as the sidebar switching content, not a modal on top. */}
      <aside className={cn(
        'hidden md:flex shrink-0 border-slate-800 flex-col bg-slate-950 transition-[width,border] duration-300 ease-out overflow-hidden',
        railCollapsed ? 'w-0 border-r-0' : 'w-[218px] border-r'
      )}>
        <div className="px-3 py-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 truncate">Entries</span>
            <span className="text-[11px] font-mono text-indigo-400 tabular-nums shrink-0">{entryDates.length}</span>
          </div>
          <button
            onClick={() => setRailCollapsed(true)}
            title="Collapse entries"
            className="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>

        <div className="px-3 py-3 space-y-2 border-b border-slate-800">
          <input
            value={entrySearch}
            onChange={(e) => setEntrySearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="flex gap-0.5">
            {(['all', 'notes', 'starred'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setEntryFilter(f)}
                className={cn(
                  'flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors',
                  entryFilter === f ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
          {visibleEntries.length === 0 && (
            <p className="px-4 py-6 text-[11px] text-slate-600 italic text-center">No entries</p>
          )}
          {visibleEntries.map((d) => {
            const log = state.dailyLogs?.[d];
            const isSelected = d === selectedDateStr;
            const parsed = parseISO(d);
            const valid = isValid(parsed);
            const words = (log?.reflection || '').trim() ? (log?.reflection || '').trim().split(/\s+/).length : 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => { if (d !== selectedDateStr) setSelectedDate(parsed); }}
                className={cn(
                  'w-full text-left px-3 py-2 transition-colors',
                  isSelected ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-xs font-bold truncate', isSelected ? 'text-white' : 'text-slate-200')}>
                    {log?.title?.trim() || (valid ? format(parsed, 'MMM dd') : d)}
                  </span>
                  <span className={cn('text-[10px] shrink-0', isSelected ? 'text-white/80' : 'text-slate-500')}>
                    {valid ? format(parsed, 'EEE') : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className={cn('text-[10px] truncate', isSelected ? 'text-white/75' : 'text-slate-500')}>
                    {log?.mood || (words > 0 ? `${words}w` : 'Empty')}
                  </span>
                  {typeof log?.rating === 'number' && log.rating > 0 && (
                    <span className={cn('text-[10px] font-mono tabular-nums shrink-0', isSelected ? 'text-white/85' : 'text-indigo-400')}>
                      {Math.round((log.rating / 5) * 100)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 py-5">
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner Header & Date Navigator (Aligned with Agenda / TodayView) */}
      <div className="sticky top-0 z-20 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none z-0">
          <BookOpen size={80} />
        </div>
        <div className="min-w-0 flex items-center gap-2">
          {railCollapsed && (
            <button
              onClick={() => setRailCollapsed(false)}
              title="Show entries"
              className="hidden md:flex shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors relative z-10"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-1 flex items-center gap-3 min-w-0 relative z-10">
            <BookOpen className="text-indigo-400 w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <span className="leading-none whitespace-nowrap pr-2">Journal</span>
          </h1>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 tracking-wider mt-1.5 relative z-10 font-mono">
            {format(viewStartTime, 'MMM do, HH:mm')} - {format(viewEndTime, 'MMM do, HH:mm')}
          </p>
        </div>
          
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap relative z-10">
          <button
            onClick={() => setShowBatchExport(true)}
            className="h-10 px-3 bg-slate-800 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-slate-100 rounded-xl flex items-center justify-center transition-all shrink-0 gap-2 font-bold text-sm shadow-sm"
            title="Batch Export"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 h-10 shadow-sm">
            <DatePicker
              value={selectedDateStr}
              onChange={(val) => val && setSelectedDate(parseISO(val))}
              indicators={dateIndicators}
              nav={{
                // navigateDay also plays the page-turn sound and sets the flip
                // direction, so the stepper must call it rather than set state.
                onPrev: () => navigateDay('prev'),
                onNext: () => navigateDay('next'),
                onToday: () => setSelectedDate(new Date()),
                size: 'md',
              }}
            >
              <div className="px-3 text-xs sm:text-sm font-bold text-white whitespace-nowrap min-w-[110px] text-center hover:bg-slate-800 rounded-lg h-8 transition-colors flex items-center justify-center cursor-pointer gap-1.5">
                <Calendar size={13} className="text-indigo-400" />
                <span>{isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM do')}</span>
              </div>
            </DatePicker>
          </div>

          <button
            onClick={onBack}
            className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
            title="Back to Record"
          >
            <ArrowLeft size={20} />
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* PATCHOULI / OPEN TOME SPREAD (摊开的学者日记圣典)                          */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden">
        {/* Tome Main Container */}
        <div className="relative rounded-xl bg-slate-900/30 p-1.5 sm:p-2 border border-slate-800/50 overflow-hidden">
          {/* Decorative Leather Tome Outer Binding Header Ornaments */}
          <div className="absolute top-0 inset-x-0 h-px bg-slate-800/40" />
          
          {/* Book Spread Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 relative min-h-[420px] rounded-lg bg-slate-950/40 border border-slate-800/40 overflow-hidden">
            {/* Central Book Spine Crease & Stitching (Desktop Only, Stationary) */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none z-20">
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-slate-700/50" />
              {/* Slim bookmark ribbon at the top of the gutter */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-7 bg-indigo-500/60 rounded-b-sm" />
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* LEFT PAGE CONTAINER: LOG & SNAPSHOT                                    */}
            {/* (Turns around central spine right-edge when flipping backward)         */}
            {/* --------------------------------------------------------------------- */}
            <div className="relative [perspective:1400px] border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-900/30 overflow-hidden min-h-[580px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`left-${selectedDateStr}`}
                  initial={
                    pageFlipDirection === 'left'
                      ? { opacity: 0, rotateY: -28, scale: 0.985, transformOrigin: 'right center' }
                      : { opacity: 0.6, rotateY: 0, scale: 1, transformOrigin: 'right center' }
                  }
                  animate={{
                    opacity: 1,
                    rotateY: 0,
                    scale: 1,
                    transformOrigin: 'right center'
                  }}
                  exit={
                    pageFlipDirection === 'left'
                      ? { opacity: 0, rotateY: 28, scale: 0.985, transformOrigin: 'right center' }
                      : { opacity: 0.6, rotateY: 0, scale: 1, transformOrigin: 'right center' }
                  }
                  transition={{
                    duration: pageFlipDirection === 'left' ? 0.32 : 0.2,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="p-5 sm:p-7 md:pr-10 flex flex-col justify-between space-y-6 relative h-full will-change-transform"
                >
                  {/* Dynamic Paper Page Turn Lighting Shimmer along Spine */}
                  {pageFlipDirection === 'left' && (
                    <motion.div
                      key={`left-shimmer-${selectedDateStr}`}
                      initial={{ opacity: 0.35, x: '20%' }}
                      animate={{ opacity: 0, x: '-60%' }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-l from-indigo-500/15 via-black/25 to-transparent"
                    />
                  )}

                  {/* Left Page Header */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300">
                        Log
                      </h2>
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        {format(selectedDate, 'yyyy.MM.dd')}
                      </span>
                    </div>

                    {/* Module 1: Feelings */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Heart size={14} className="text-rose-400" />
                          <span>Feelings</span>
                        </h3>
                        {mood && (
                          <span className="text-[10px] font-bold text-slate-400 capitalize px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                            {mood}
                          </span>
                        )}
                      </div>

                      <MoodSelector
                        value={mood}
                        onChange={handleMoodChange}
                        enabledMoods={state.enabledMoods}
                        variant="grid"
                      />
                    </div>

                    {/* Module 2: Efficiency */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Star size={14} className="text-amber-400" />
                          <span>Efficiency</span>
                        </h3>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            id="auto-calculate-rating-button"
                            onClick={handleAutoCalculate}
                            disabled={isCalculating}
                            className={cn(
                              "p-1.5 bg-slate-800 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-slate-100 rounded-lg transition-all active:scale-95 shadow-sm group",
                              isCalculating && "opacity-80 cursor-wait"
                            )}
                            title="Auto-calculate rating using focus duration & distraction metrics"
                          >
                            <Calculator size={13} className={cn("text-indigo-400 group-hover:text-indigo-300", isCalculating && "animate-spin")} />
                          </button>
                          <button
                            id="efficiency-formula-details-button"
                            onClick={() => setShowEfficiencyDetails(true)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                            title="View formula details, metrics, and customize parameters"
                          >
                            <SlidersHorizontal size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Rating Display Panel */}
                      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800/90 flex flex-col items-center justify-center relative overflow-hidden">
                        <motion.div 
                          className="flex justify-center gap-1 sm:gap-1.5"
                          animate={isCalculating ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] } : {}}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                          {state.efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency' ? (
                            <span className={cn(
                              "text-3xl sm:text-4xl font-black font-mono tracking-tight",
                              rating > 0 ? "text-indigo-400" : "text-slate-500"
                            )}>
                              {rating > 0 ? `${((rating / 5) * 100).toFixed(1).replace(/\.0$/, '')}%` : 'None'}
                            </span>
                          ) : (
                            <StarRating
                              value={rating}
                              onChange={handleRatingChange}
                              size="md"
                            />
                          )}
                        </motion.div>
                      </div>
                    </div>

                    {/* Module 3: Focus Vitals Snapshot (Patchouli Style Lore Cards) */}
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Compass size={13} className="text-indigo-400" />
                        <span>Expedition Vitals</span>
                      </h3>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/60 text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5">
                            <Clock size={10} className="text-indigo-400" /> Focus
                          </div>
                          <div className="text-xs sm:text-sm text-slate-200 font-mono">
                            <DurationText minutes={selectedDayStats.effectiveMinutes} />
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                            {selectedDayStats.completionPercent}% of {selectedDayStats.targetSource === 'workstation' ? 'Desk' : 'Goal'}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/60 text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5">
                            <Zap size={10} className="text-amber-400" /> Distractions
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold text-slate-200 font-mono">
                            {selectedDayStats.totalDistractions}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                            {selectedDayStats.effectiveMinutes > 0 
                              ? `${(selectedDayStats.totalDistractions / (selectedDayStats.effectiveMinutes / 60)).toFixed(1)}/hr`
                              : '0/hr'}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/60 text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5">
                            <Target size={10} className="text-emerald-400" /> Sessions
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold text-slate-200 font-mono">
                            {selectedDayStats.completedSessionsCount}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                            Logged
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Left Page Footer */}
                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <button
                      onClick={() => navigateDay('prev')}
                      className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                    >
                      <ChevronLeft size={14} />
                      <span>Previous Entry</span>
                    </button>
                    <span className="text-[10px] font-mono text-slate-600">
                      {format(selectedDate, 'MMM d')}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* RIGHT PAGE CONTAINER: REFLECTION READING VIEW                         */}
            {/* (Turns around central spine left-edge when flipping forward)          */}
            {/* --------------------------------------------------------------------- */}
            <div className="relative [perspective:1400px] bg-slate-900/20 overflow-hidden min-h-[580px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`right-${selectedDateStr}`}
                  initial={
                    pageFlipDirection === 'right'
                      ? { opacity: 0, rotateY: 28, scale: 0.985, transformOrigin: 'left center' }
                      : { opacity: 0.6, rotateY: 0, scale: 1, transformOrigin: 'left center' }
                  }
                  animate={{
                    opacity: 1,
                    rotateY: 0,
                    scale: 1,
                    transformOrigin: 'left center'
                  }}
                  exit={
                    pageFlipDirection === 'right'
                      ? { opacity: 0, rotateY: -28, scale: 0.985, transformOrigin: 'left center' }
                      : { opacity: 0.6, rotateY: 0, scale: 1, transformOrigin: 'left center' }
                  }
                  transition={{
                    duration: pageFlipDirection === 'right' ? 0.32 : 0.2,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="p-5 sm:p-7 md:pl-10 flex flex-col justify-between space-y-4 relative h-full will-change-transform"
                >
                  {/* Dynamic Paper Page Turn Lighting Shimmer along Spine */}
                  {pageFlipDirection === 'right' && (
                    <motion.div
                      key={`right-shimmer-${selectedDateStr}`}
                      initial={{ opacity: 0.35, x: '-20%' }}
                      animate={{ opacity: 0, x: '60%' }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-r from-indigo-500/15 via-black/25 to-transparent"
                    />
                  )}

                  {/* Right Page Header & Actions */}
                  <div className="flex flex-col flex-1 space-y-3">
                    {/* Unified Header & Actions Row */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/70 gap-2.5 min-w-0">
                      {/* Left: Integrated Title / Heading Field */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText size={15} className="text-indigo-400 shrink-0" />
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder={selectedDateStr}
                            className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-100 placeholder:text-slate-400 placeholder:font-bold outline-none hover:bg-slate-800/40 focus:bg-slate-800/60 px-2 py-1 rounded-lg border border-transparent focus:border-indigo-500/50 transition-all truncate"
                            title="Journal Title (Default: date)"
                          />
                          {title && (
                            <button
                              type="button"
                              onClick={() => handleTitleChange('')}
                              className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors shrink-0"
                              title="Reset to default date title"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Only Edit & Fullscreen Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setIsQuickEditing(!isQuickEditing)}
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded-lg border transition-all active:scale-95 shrink-0",
                            isQuickEditing 
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                              : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white border-slate-700/70"
                          )}
                          title={isQuickEditing ? "Finish Quick Edit" : "Quick Inline Edit"}
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          onClick={() => setIsImmersiveOpen(true)}
                          className="h-7 w-7 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/20 active:scale-95 border border-indigo-500 shrink-0"
                          title="Open Fullscreen Immersive Writing Mode"
                        >
                          <Maximize2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Main Reflection Content Area (Reading / Markdown Display) */}
                    <div className="flex-1 min-h-[360px] flex flex-col justify-start">
                      {/* The page embeds the editor directly — the rendered
                          view and the source are the same surface, so a single
                          click on any line starts writing. No pencil button,
                          no separate reading mode. */}
                      <MarkdownEditor
                        value={reflection}
                        onChange={handleReflectionChange}
                        placeholder={`Write your reflection for ${format(selectedDate, 'MMM do')}...`}
                        className="flex-1 min-h-[320px]"
                      />
                    </div>
                  </div>

                  {/* Right Page Footer */}
                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span className="font-bold text-slate-600 uppercase tracking-widest text-[10px]">
                      {!isQuickEditing && (reflection.trim() ? `${wordCount} words` : 'Empty Page')}
                    </span>
                    <button
                      onClick={() => navigateDay('next')}
                      className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                    >
                      <span>Next Entry</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        {/* ========================================================================= */}
        {/* PATCHOULI BOOKMARK INDEX TABS (Right-side Hanging Bookmarks)              */}
          {/* ========================================================================= */}
          <div className="hidden md:flex flex-col absolute left-full top-8 -ml-px space-y-2 z-30">
            {/* Quick Bookmark Current Date Tab */}
            <button
              onClick={() => toggleBookmark()}
              className={cn(
                "w-11 h-9 rounded-r-md border border-l-0 shadow-sm flex items-center justify-center transition-all group relative",
                isCurrentDateBookmarked 
                  ? "bg-amber-500/15 border-amber-400/80 text-amber-400 translate-x-1 shadow-amber-500/10" 
                  : "bg-slate-900/95 hover:bg-slate-850/95 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 hover:translate-x-0.5"
              )}
              title={isCurrentDateBookmarked ? "Remove Bookmark for this day" : "Bookmark this day"}
            >
              {isCurrentDateBookmarked ? (
                <BookmarkCheck size={16} className="fill-amber-400/30 text-amber-400" />
              ) : (
                <Bookmark size={16} />
              )}
              {/* Tooltip on hover (pops out left towards book) */}
              <span className="absolute right-full mr-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl z-50">
                {isCurrentDateBookmarked ? "Remove bookmark" : "Add bookmark"}
              </span>
            </button>

            {/* Bookmarked Dates List (Tabs) */}
            {bookmarks.map((bDate) => {
              const isSelected = bDate === selectedDateStr;
              const parsed = parseISO(bDate);
              const palette = getBookmarkColor(isSelected);

              return (
                <div key={bDate} className="relative group">
                  <button
                    onClick={() => {
                      if (isValid(parsed)) {
                        setPageFlipDirection(bDate > selectedDateStr ? 'right' : 'left');
                        setSelectedDate(parsed);
                        playSound('pageTurn', state.soundVolume, state.soundEnabled);
                      }
                    }}
                    className={cn(
                      "w-11 py-2 px-1 rounded-r-md border border-l-0 shadow-sm flex flex-col items-center justify-center transition-all font-mono text-[10px]",
                      palette.tab
                    )}
                    title={`Jump to ${bDate}`}
                  >
                    <span className={cn("text-[9px] uppercase tracking-wider leading-tight font-sans", palette.monthText)}>
                      {isValid(parsed) ? format(parsed, 'MMM') : 'Day'}
                    </span>
                    <span className={cn("text-xs leading-none mt-0.5", palette.dateText)}>
                      {isValid(parsed) ? format(parsed, 'dd') : bDate.slice(8)}
                    </span>
                  </button>

                  {/* Delete Bookmark Icon Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(bDate);
                    }}
                    className={cn(
                      "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md z-40",
                      palette.deleteBtn
                    )}
                    title={`Delete bookmark for ${bDate}`}
                  >
                    <Trash2 size={8} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile / Small Screen Bookmarks Strip */}
        {bookmarks.length > 0 && (
          <div className="md:hidden mt-4 p-2.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 shrink-0 pr-2 border-r border-slate-800">
              <Bookmark size={14} className="text-amber-400" />
              <span>Bookmarks:</span>
            </div>
            {bookmarks.map((bDate) => {
              const isSelected = bDate === selectedDateStr;
              const parsed = parseISO(bDate);

              return (
                <div key={bDate} className="flex items-center shrink-0">
                  <button
                    onClick={() => {
                      if (isValid(parsed)) {
                        setPageFlipDirection(bDate > selectedDateStr ? 'right' : 'left');
                        setSelectedDate(parsed);
                        playSound('pageTurn', state.soundVolume, state.soundEnabled);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1 border",
                      isSelected 
                        ? "bg-slate-800 border-indigo-400 text-indigo-300 shadow-sm" 
                        : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <span>{isValid(parsed) ? format(parsed, 'MMM dd') : bDate}</span>
                  </button>
                  <button
                    onClick={() => toggleBookmark(bDate)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors ml-0.5"
                    title="Remove Bookmark"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EFFICIENCY FORMULA DETAILS MODAL                                          */}
      {/* ========================================================================= */}
      <BatchExportModal isOpen={showBatchExport} onClose={() => setShowBatchExport(false)} state={state} />
      {showEfficiencyDetails && (
        <EfficiencyDetailsModal
          effectiveMinutes={selectedDayStats.effectiveMinutes}
          totalDistractions={selectedDayStats.totalDistractions}
          defaultTargetHours={selectedDayStats.defaultTargetHours}
          customTargetHours={customTargetHours}
          onUpdateCustomTargetHours={setCustomTargetHours}
          config={state.efficiencyRatingConfig || {}}
          targetSource={selectedDayStats.targetSource}
          workstationPresenceMinutes={selectedDayStats.workstationMinutes}
          workstationIntervalCount={selectedDayStats.workstationIntervalCount}
          _conversionRate={selectedDayStats.conversionRate}
          onUpdateConfig={(newConfig) => {
            onUpdateState?.({
              efficiencyRatingConfig: {
                ...(state.efficiencyRatingConfig || {}),
                ...newConfig
              }
            });
          }}
          onApplyRating={(calcRating) => {
            setRating(calcRating);
            saveDailyLog(selectedDateStr, calcRating, reflection, mood, title);
            setIsCalculating(true);
            playSound('calculate', state.soundVolume, state.soundEnabled);
            setTimeout(() => setIsCalculating(false), 600);
          }}
          onClose={() => setShowEfficiencyDetails(false)}
          state={state}
          onUpdateState={onUpdateState}
        />
      )}

      {/* ========================================================================= */}
      {/* FULLSCREEN IMMERSIVE REFLECTION EDITOR MODAL                              */}
      {/* ========================================================================= */}
      {isImmersiveOpen && (
        <ImmersiveReflectionModal
          isOpen={isImmersiveOpen}
          dateString={selectedDateStr}
          reflection={reflection}
          setReflection={handleReflectionChange}
          title={title}
          onTitleChange={handleTitleChange}
          dailyLogs={dailyLogs}
          efficiencyRatingConfig={state.efficiencyRatingConfig}
          onSelectDate={(newDateStr) => {
            // Auto save current day first
            saveDailyLog(selectedDateStr, rating, reflection, mood, title);
            const parsed = parseISO(newDateStr);
            if (isValid(parsed)) {
              setPageFlipDirection(newDateStr > selectedDateStr ? 'right' : 'left');
              setSelectedDate(parsed);
              playSound('pageTurn', state.soundVolume, state.soundEnabled);
            }
          }}
          bookmarks={bookmarks}
          _onToggleBookmark={toggleBookmark}
          history={state.history}
          isMarkdownEnabled={true}
          setIsMarkdownEnabled={() => {}}
          templates={state.reflectionTemplates}
          onUpdateTemplates={(templates) => onUpdateState?.({ reflectionTemplates: templates })}
          autoLoadTemplateId={state.autoLoadTemplateId}
          autoLoadTemplateMode={state.autoLoadTemplateMode}
          onSetAutoLoadTemplate={(templateId, mode) => {
            onUpdateState?.({
              autoLoadTemplateId: templateId,
              autoLoadTemplateMode: mode || 'empty'
            });
          }}
          onClose={() => {
            setIsImmersiveOpen(false);
            // Auto save when closing immersive modal
            saveDailyLog(selectedDateStr, rating, reflection, mood, title);
          }}
        />
      )}
    </div>
        </div>
      </div>
    </motion.div>
  );
};
