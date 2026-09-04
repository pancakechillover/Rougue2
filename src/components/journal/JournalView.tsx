import { MarkdownEditor } from "../common/MarkdownEditor";
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 

  format, subDays, addDays, parseISO, isValid
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, ArrowLeft, ChevronLeft, ChevronRight, 
  Star, StarHalf, Calculator, SlidersHorizontal, Heart, 
  Maximize2, Save, Download, Copy, Check, Edit3, 
  Clock, Target, Zap, 
  Compass, Feather, Bookmark, BookmarkCheck, Plus, Trash2, Calendar
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { AppState, Dungeon, MajorDungeon } from '../../types';
import { cn, formatDuration, getSessionEffectiveMinutes } from '../../lib/utils';
import { MOOD_OPTIONS, DEFAULT_ENABLED_MOODS } from '../../constants';
import { DatePicker } from '../common/DatePicker';
import { ImmersiveReflectionModal } from './ImmersiveReflectionModal';
import { EfficiencyDetailsModal } from '../record/EfficiencyDetailsModal';
import { BatchExportModal } from '../modals/BatchExportModal';

import { playSound } from '../../lib/sound';

export interface JournalViewProps {
  state: AppState;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string) => void;
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
  const [isQuickEditing, setIsQuickEditing] = useState<boolean>(false);
  const [isImmersiveOpen, setIsImmersiveOpen] = useState(false);
  const [showEfficiencyDetails, setShowEfficiencyDetails] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);

  const [customTargetHours, setCustomTargetHours] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [copied, setCopied] = useState(false);

  // Sync editor when switching dates
  const isSwitchingDateRef = useRef(false);

  useEffect(() => {
    isSwitchingDateRef.current = true;
    const log = dailyLogs[selectedDateStr];
    setRating(log?.rating || 0);
    setReflection(log?.reflection || '');
    setMood(log?.mood);
    setSaveStatus('saved');
    setIsQuickEditing(false);
    setTimeout(() => {
      isSwitchingDateRef.current = false;
    }, 50);
  }, [selectedDateStr, dailyLogs]);

  // Track changes & auto-save or mark unsaved
  const handleReflectionChange = (val: string) => {
    setReflection(val);
    if (!isSwitchingDateRef.current) {
      setSaveStatus('unsaved');
    }
  };

  const handleMoodChange = (newMood?: string) => {
    setMood(newMood);
    saveDailyLog(selectedDateStr, rating, reflection, newMood);
    playSound('click', state.soundVolume, state.soundEnabled);
  };

  // Perform Save for reflection
  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    saveDailyLog(selectedDateStr, rating, reflection, mood);
    playSound('success', state.soundVolume, state.soundEnabled);
    setTimeout(() => {
      setSaveStatus('saved');
      setIsQuickEditing(false);
    }, 300);
  }, [saveDailyLog, selectedDateStr, rating, reflection, mood, state.soundVolume, state.soundEnabled]);

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

    const day = selectedDate.getDay();
    const dailyGoal = state.useSameDailyProgressGoalEveryDay ?? true 
      ? (state.dailyProgressGoal ?? 8) 
      : (state.dailyProgressGoalConfig?.[day] ?? 8);

    const pomodoroDuration = (state.standardSessionMinutes || 25) + (state.standardRestMinutes || 5);
    const defaultTargetHours = Math.max(0.1, Number(((dailyGoal * pomodoroDuration) / 60).toFixed(2)));

    return {
      effectiveMinutes,
      totalDistractions,
      completedSessionsCount,
      defaultTargetHours,
      completionPercent: Math.min(100, Math.round((effectiveMinutes / (defaultTargetHours * 60)) * 100))
    };
  }, [state.history, state.includeRestTimeInTasks, state.useSameDailyProgressGoalEveryDay, state.dailyProgressGoal, state.dailyProgressGoalConfig, state.standardSessionMinutes, state.standardRestMinutes, selectedDate, selectedDateStr, getPeriodInfo]);

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

  // Copy reflection text
  const handleCopyReflection = () => {
    if (!reflection) return;
    navigator.clipboard.writeText(reflection);
    setCopied(true);
    playSound('click', state.soundVolume, state.soundEnabled);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rating Stars rendering with half-star click detection
  const renderStars = () => {
    const displayRating = Math.round(rating * 2) / 2;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = displayRating >= i;
      const isHalf = displayRating >= i - 0.5 && displayRating < i;
      
      stars.push(
        <div 
          key={i} 
          className="relative cursor-pointer transition-transform hover:scale-110 active:scale-95 group"
          style={{ width: '28px', height: '28px' }}
        >
          {/* Left half clickable zone */}
          <button
            type="button"
            className="absolute left-0 top-0 w-1/2 h-full z-10 opacity-0 cursor-pointer"
            onClick={() => {
              const newScore = rating === i - 0.5 ? 0 : i - 0.5;
              setRating(newScore);
              saveDailyLog(selectedDateStr, newScore, reflection, mood);
              playSound('click', state.soundVolume, state.soundEnabled);
            }}
            title={`${i - 0.5} Stars`}
          />
          {/* Right half clickable zone */}
          <button
            type="button"
            className="absolute right-0 top-0 w-1/2 h-full z-10 opacity-0 cursor-pointer"
            onClick={() => {
              const newScore = rating === i ? 0 : i;
              setRating(newScore);
              saveDailyLog(selectedDateStr, newScore, reflection, mood);
              playSound('click', state.soundVolume, state.soundEnabled);
            }}
            title={`${i} Stars`}
          />
          {/* Star Icon Display */}
          <div className="w-full h-full flex items-center justify-center pointer-events-none">
            {isFull ? (
              <Star size={24} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            ) : isHalf ? (
              <StarHalf size={24} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            ) : (
              <Star size={24} className="text-slate-700 hover:text-slate-600 transition-colors" />
            )}
          </div>
        </div>
      );
    }
    return stars;
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

    let calculatedRating = 0;

    if (actualHours > 0) {
      const targetCompletionRate = targetHours > 0 ? actualHours / targetHours : 0;
      const normalizedCompletion = Math.min(1.0, targetCompletionRate);

      const distractionRate = distractions / actualHours;
      const penaltyRatio = b > 0 ? distractionRate / b : 0;
      const focusDegree = Math.max(0.0, 1.0 - penaltyRatio);

      const finalEfficiency = (c * normalizedCompletion) + (d * focusDegree);
      const rawRating = Math.max(0, Math.min(5, finalEfficiency * 5));
      calculatedRating = rawRating;
    }

    setTimeout(() => {
      setRating(calculatedRating);
      saveDailyLog(selectedDateStr, calculatedRating, reflection, mood);
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

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner Header & Date Navigator (Aligned with Agenda / TodayView) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-black text-slate-50 tracking-tighter uppercase italic pr-1 flex items-center gap-2 sm:gap-3 min-w-0">
            <BookOpen className="text-indigo-400 w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <span className="truncate leading-none">Journal</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {format(selectedDate, 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
          
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowBatchExport(true)}
            className="h-10 px-3 bg-slate-800 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-slate-100 rounded-xl flex items-center justify-center transition-all shrink-0 gap-2 font-bold text-sm shadow-sm"
            title="Batch Export"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 h-10 shadow-sm">
            <button 
              onClick={() => navigateDay('prev')}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={18} />
            </button>
            
            <DatePicker
              value={selectedDateStr}
              onChange={(val) => val && setSelectedDate(parseISO(val))}
              indicators={dateIndicators}
            >
              <div className="px-3 text-sm font-bold text-white whitespace-nowrap min-w-[120px] text-center hover:bg-slate-800 rounded-lg h-8 transition-colors flex items-center justify-center cursor-pointer">
                {format(selectedDate, 'MMMM do')}
              </div>
            </DatePicker>

            <button 
              onClick={() => navigateDay('next')}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Next Day"
            >
              <ChevronRight size={18} />
            </button>
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
      <div className="relative pr-0 md:pr-14">
        {/* Tome Main Container */}
        <div className="relative rounded-[2rem] bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-2 sm:p-4 md:p-6 border border-slate-800/90 shadow-2xl overflow-visible">
          {/* Decorative Leather Tome Outer Binding Header Ornaments */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          
          {/* Book Spread Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 relative min-h-[580px] rounded-3xl bg-slate-950/70 border border-slate-800/80 overflow-hidden shadow-inner">
            {/* Central Book Spine Crease & Stitching (Desktop Only, Stationary) */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none z-20">
              <div className="w-full h-full bg-gradient-to-r from-black/50 via-slate-950/90 to-black/50 opacity-90" />
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-slate-800/80 shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
              {/* Decorative Book Ribbon / Bookmark hanging at the top */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-10 bg-indigo-500/80 rounded-b-md shadow-md border-b-2 border-indigo-400" />
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

                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 py-1">
                        {MOOD_OPTIONS.filter(m => (state.enabledMoods || DEFAULT_ENABLED_MOODS).includes(m.id)).map((m) => {
                          const isSelected = mood === m.id;
                          const Icon = m.icon;
                          return (
                            <button
                              key={m.id}
                              onClick={() => handleMoodChange(isSelected ? undefined : m.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center group min-h-[44px]",
                                isSelected 
                                  ? `${m.bg} ${m.border} ${m.color} shadow-lg scale-105 font-bold` 
                                  : "bg-slate-900/70 border-slate-800/80 text-slate-500 hover:bg-slate-800/80 hover:text-slate-300 hover:border-slate-700"
                              )}
                              title={`Select ${m.label}`}
                            >
                              <Icon size={18} className={cn("transition-transform group-hover:scale-110", isSelected && "scale-110")} />
                              <span className="text-[9px] font-bold uppercase tracking-wider truncate w-full hidden 2xl:block mt-1">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
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
                            renderStars()
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
                          <div className="text-xs sm:text-sm font-extrabold text-slate-200 font-mono">
                            {formatDuration(selectedDayStats.effectiveMinutes)}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                            {selectedDayStats.completionPercent}% of Goal
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
                  <div className="flex flex-col flex-1 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/70 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300">
                          Reflection
                        </h2>
                      </div>

                      {/* Right Page Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {reflection.trim().length > 0 && (
                          <>
                            <button
                              onClick={handleCopyReflection}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/60"
                              title="Copy Reflection"
                            >
                              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                            
                            <button
                              onClick={() => {
                                const blob = new Blob([reflection], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `journal-${selectedDateStr}.md`;
                                a.click();
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/60"
                              title="Export Markdown"
                            >
                              <Download size={14} />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setIsQuickEditing(!isQuickEditing)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all",
                            isQuickEditing 
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80"
                          )}
                          title={isQuickEditing ? "Finish Quick Edit" : "Quick Inline Edit"}
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => setIsImmersiveOpen(true)}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                          title="Open Fullscreen Immersive Writing Mode"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Main Reflection Content Area (Reading / Markdown Display) */}
                    <div className="flex-1 min-h-[360px] flex flex-col justify-start">
                      {isQuickEditing ? (
                        <div className="flex-1 flex flex-col space-y-2">
                          <div className="w-full flex-1 min-h-[300px] bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus-within:border-indigo-500/80 transition-all custom-scrollbar flex overflow-hidden">
                            <MarkdownEditor 
                              value={reflection}
                              onChange={handleReflectionChange}
                              placeholder="Write your reflection for this day... (Markdown supported)"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {wordCount} words · {reflection.length} characters
                            </span>
                            <button
                              onClick={handleSave}
                              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
                            >
                              <Save size={12} />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : reflection.trim() ? (
                        <div className="w-full h-full p-4 sm:p-5 bg-slate-950/40 rounded-2xl border border-slate-800/60 overflow-y-auto max-h-[440px] custom-scrollbar">
                          <div className="prose prose-invert prose-slate max-w-none text-slate-200 prose-p:text-slate-200 prose-p:leading-relaxed prose-headings:text-slate-100 prose-headings:font-bold prose-strong:text-indigo-400 prose-li:text-slate-200 prose-ol:text-slate-200 prose-ul:text-slate-200 marker:text-slate-200 marker:font-bold prose-blockquote:border-indigo-500/60 prose-blockquote:text-slate-300">
                            <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {reflection}
                            </Markdown>
                          </div>
                        </div>
                      ) : (
                        /* Empty Parchment State (Atmospheric Patchouli Theme) */
                        <div className="flex-1 min-h-[320px] flex flex-col items-center justify-center p-6 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800/80 text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <Feather size={24} className="opacity-80" />
                          </div>
                          
                          <div className="space-y-1 max-w-xs">
                            <h4 className="text-sm font-bold text-slate-300">
                              Unwritten Parchment
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              No reflection has been written for {format(selectedDate, 'MMMM do')}. Record your thoughts, lessons, or achievements.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Page Footer */}
                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span className="font-bold text-slate-600 uppercase tracking-widest text-[10px]">
                      {reflection.trim() ? `${wordCount} words` : 'Empty Page'}
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
            saveDailyLog(selectedDateStr, calcRating, reflection, mood);
            setIsCalculating(true);
            playSound('calculate', state.soundVolume, state.soundEnabled);
            setTimeout(() => setIsCalculating(false), 600);
          }}
          onClose={() => setShowEfficiencyDetails(false)}
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
          isMarkdownEnabled={true}
          setIsMarkdownEnabled={() => {}}
          onClose={() => {
            setIsImmersiveOpen(false);
            // Auto save when closing immersive modal
            saveDailyLog(selectedDateStr, rating, reflection, mood);
          }}
        />
      )}
    </div>
  );
};
