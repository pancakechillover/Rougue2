import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  format, eachDayOfInterval, isSameDay, 
  startOfWeek, endOfWeek, subDays, addDays, subWeeks, addWeeks,
  startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, subMonths, addYears, subYears,
  parseISO, isWithinInterval
} from 'date-fns';
import { StudySession, AppState, RewardHistoryItem, Dungeon, MajorDungeon } from '../../types';
import { cn, getSessionEffectiveMinutes } from '../../lib/utils';
import { 
  BarChart2, Zap, Coins, ChevronLeft, ChevronRight, ChevronDown, Calendar, CalendarDays, Flame, Star, StarHalf, Edit2, Save, X, Eye, EyeOff, LineChart as LineChartIcon, Trophy, Sword, Heart, Maximize2, Minimize2, LayoutTemplate, File, FileText, RotateCcw, Share2, Moon, Clock, Target, Brain, Wind, BookOpen
} from 'lucide-react';
import { MOOD_OPTIONS, DEFAULT_ENABLED_MOODS } from '../../constants';

import { motion, AnimatePresence } from 'motion/react';
import { PageHeader } from '../common/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line, CartesianGrid, LabelList, PieChart, Pie, ComposedChart } from 'recharts';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { ImmersiveReflectionModal } from '../journal/ImmersiveReflectionModal';
import { DatePicker } from '../common/DatePicker';
import { DailySessionsModal } from './DailySessionsModal';
import { RoutineTracker } from '../vault/RoutineTracker';
import { RoutineCellEditor } from '../vault/RoutineCellEditor';
import { ShareRecordModal } from './ShareRecordModal';
import { ViewSettingsModal } from '../settings/ViewSettingsModal';
import { DailyPieChart } from './DailyPieChart';
import { WeeklyPieChart } from './WeeklyPieChart';
import { BulkSleepModal } from '../modals/BulkSleepModal';
import { PopoverPortal } from '../common/PopoverPortal';

export interface ShareConfig {
  showDaily: boolean;
  showWeekly: boolean;
  showRoutine: boolean;
  showHeatmap: boolean;
  showReflection: boolean;
  showSleep: boolean;
  aspectRatio: 'auto' | '1:1' | '4:3' | '16:9';
}

interface StatsProps {
  state: AppState;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string) => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
  updateSession?: (id: string, updates: Partial<StudySession>) => void;
  deleteSession?: (id: string) => void;
  completeSession?: (dungeonId: string | null, duration: number, focusDuration?: number, restDuration?: number, customTimestamp?: number) => void;
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  setShowStartOfDayModal?: (val: string | boolean) => void;
  onOpenJournal?: () => void;
}

const formatDuration = (val: number) => {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val) || val < 0) return '0min';
  const totalMin = Math.round(val);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const formatTimeTick = (val: number) => {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return '0';
  if (val >= 60) {
    const h = val / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
  }
  return `${val}m`;
};

const computeTimeYAxis = (maxMinutes: number, isFixed: boolean, defaultFixedMax: number = 240) => {
  if (isFixed) {
    const targetMax = Math.max(defaultFixedMax, Math.ceil(maxMinutes / 60) * 60);
    const step = targetMax <= 240 ? 60 : 120;
    const ticks: number[] = [];
    for (let t = 0; t <= targetMax; t += step) {
      ticks.push(t);
    }
    return { domain: [0, targetMax] as [number, number], ticks };
  }

  // Dynamic mode: when 0 recorded minutes, fallback to standard reference scale (0, 30m, 1h or 0, 1h, 2h)
  if (maxMinutes <= 0) {
    const fallbackMax = defaultFixedMax === 240 ? 60 : 120;
    const step = defaultFixedMax === 240 ? 30 : 60;
    const ticks: number[] = [];
    for (let t = 0; t <= fallbackMax; t += step) {
      ticks.push(t);
    }
    return { domain: [0, fallbackMax] as [number, number], ticks };
  }
  
  if (maxMinutes <= 30) {
    return { domain: [0, 30] as [number, number], ticks: [0, 15, 30] };
  }
  if (maxMinutes <= 60) {
    return { domain: [0, 60] as [number, number], ticks: [0, 30, 60] };
  }
  if (maxMinutes <= 120) {
    return { domain: [0, 120] as [number, number], ticks: [0, 60, 120] };
  }
  if (maxMinutes <= 240) {
    return { domain: [0, 240] as [number, number], ticks: [0, 60, 120, 180, 240] };
  }
  if (maxMinutes <= 480) {
    const targetMax = Math.ceil(maxMinutes / 120) * 120;
    const ticks: number[] = [];
    for (let t = 0; t <= targetMax; t += 120) {
      ticks.push(t);
    }
    return { domain: [0, targetMax] as [number, number], ticks };
  }
  const targetMax = Math.ceil(maxMinutes / 180) * 180;
  const ticks: number[] = [];
  for (let t = 0; t <= targetMax; t += 180) {
    ticks.push(t);
  }
  return { domain: [0, targetMax] as [number, number], ticks };
};

const getSessionDistractionCount = (distractions: any): number => {
  if (!distractions) return 0;
  if (typeof distractions === 'number') {
    return isNaN(distractions) ? 0 : distractions;
  }
  if (typeof distractions === 'object') {
    const internal = Number(distractions.internal) || 0;
    const external = Number(distractions.external) || 0;
    const unavoidable = Number(distractions.unavoidable) || 0;
    return internal + external + unavoidable;
  }
  return 0;
};

const SharedPopoverContent = ({
  label,
  totalSessions,
  morning,
  afternoon,
  night,
  other,
  coins,
  xp,
  distractions,
  internal,
  external,
  unavoidable,
  efficiency,
  mood,
  dateTimestamp,
  period,
}: any) => {
  const moodObj = mood ? MOOD_OPTIONS.find(m => m.id === mood) : null;
  const MoodIcon = moodObj ? moodObj.icon : null;
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transform = 'none';
      const rect = containerRef.current.getBoundingClientRect();
      const padding = 12;
      let shift = 0;
      
      // Calculate viewport constraints
      const viewportWidth = window.innerWidth;
      
      // Ensure it doesn't go off-screen
      if (rect.right > viewportWidth - padding) {
        shift = -(rect.right - (viewportWidth - padding));
      } else if (rect.left < padding) {
        shift = padding - rect.left;
      }
      
      if (shift !== 0) {
        containerRef.current.style.transform = `translateX(${shift}px)`;
      }
    }
  }, []);

  const distCount = Number(distractions) || 0;
  const hourlyDistRate = totalSessions > 0 
    ? (Math.round((distCount / (totalSessions / 60)) * 10) / 10).toFixed(1) 
    : distCount;

  return (
    <div 
      ref={containerRef}
      className="shared-popover-content animate-popover-enter bg-slate-900/95 backdrop-blur-md border border-slate-700/50 shadow-xl shadow-indigo-500/10 rounded-xl p-3.5 sm:p-4 z-[100] w-[200px] sm:w-[220px] max-w-[calc(100vw-24px)] overflow-hidden"
    >
      <p className="text-slate-50 font-bold mb-2 pb-2 border-b border-slate-800/50 text-[13px] sm:text-sm">{label}</p>
      <div className="space-y-1.5 text-xs text-slate-300">
        {totalSessions > 0 ? (
          <>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Study Time</span> <span className="text-slate-50 font-bold">{formatDuration(totalSessions)}</span></div>
            {morning > 0 && <div className="flex justify-between gap-4"><span className="text-amber-400">Morning</span> <span className="text-slate-200">{formatDuration(morning)}</span></div>}
            {afternoon > 0 && <div className="flex justify-between gap-4"><span className="text-orange-400">Afternoon</span> <span className="text-slate-200">{formatDuration(afternoon)}</span></div>}
            {night > 0 && <div className="flex justify-between gap-4"><span className="text-indigo-400">Night</span> <span className="text-slate-200">{formatDuration(night)}</span></div>}
            {other > 0 && <div className="flex justify-between gap-4"><span className="text-slate-400">Other</span> <span className="text-slate-200">{formatDuration(other)}</span></div>}
            <div className="border-t border-slate-800/50 my-1.5 pt-1.5 flex justify-between gap-4"><span className="text-yellow-400">Gold</span> <span className="text-slate-200 font-mono">+{coins}</span></div>
            <div className="flex justify-between gap-4"><span className="text-cyan-400">XP</span> <span className="text-slate-200 font-mono">+{xp}</span></div>
          </>
        ) : (
          <p className="text-slate-500 italic">No activity</p>
        )}

        {distCount > 0 && (
          <div className="border-t border-slate-800/50 my-1.5 pt-1.5 space-y-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-rose-400 font-medium">Distracted</span>
              <span className="text-rose-300 font-bold font-mono shrink-0">
                {distCount}{' '}
                <span className="text-[10px] text-slate-400 font-normal font-sans">
                  ({hourlyDistRate}/h)
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] pt-0.5">
              {Number(internal) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 flex items-center gap-1 font-medium">
                  <Brain size={10} className="shrink-0 text-indigo-400" />
                  <span>{internal}</span>
                </span>
              )}
              {Number(external) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 flex items-center gap-1 font-medium">
                  <Wind size={10} className="shrink-0 text-orange-400" />
                  <span>{external}</span>
                </span>
              )}
              {Number(unavoidable) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1 font-medium">
                  <Zap size={10} className="shrink-0 text-red-500" />
                  <span>{unavoidable}</span>
                </span>
              )}
            </div>
          </div>
        )}
        
        {efficiency !== undefined && efficiency !== null && (
          <div className="flex justify-between items-center gap-4 pt-1 mt-1 border-t border-slate-800/50">
            <span className="text-indigo-400 font-medium text-xs">Efficiency</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">{(Number(efficiency) * 20).toFixed(1)}%</span>
          </div>
        )}

        {moodObj && MoodIcon && (
          <div className="border-t border-slate-800/50 pt-1.5 mt-1.5 flex items-center justify-between gap-2">
            <span className="text-slate-500">Mood</span>
            <div className="flex items-center gap-1"><MoodIcon size={14} className={moodObj.color} /> <span className="font-medium text-slate-200">{moodObj.label}</span></div>
          </div>
        )}

        {dateTimestamp && (
          <div className="mt-4 pt-2 border-t border-slate-800/50 space-y-2">
            <button 
              type="button"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { 
                e.stopPropagation(); 
                window.dispatchEvent(new CustomEvent('statsShowDailySessionsModal', { 
                  detail: { timestamp: dateTimestamp, period: period || 'total' }
                })); 
              }}
              className="w-full text-emerald-400 hover:text-emerald-300 font-medium text-center transition-colors hover:bg-slate-800/30 rounded px-2 py-1 flex items-center justify-center gap-1.5"
            >
              <LayoutTemplate size={12} />
              <span>Show Daily Sessions</span>
            </button>
            <button 
              type="button"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { 
                e.stopPropagation(); 
                window.dispatchEvent(new CustomEvent('statsNavJump', { detail: dateTimestamp }));
              }}
              className="w-full text-indigo-400 hover:text-indigo-300 font-medium text-center transition-colors hover:bg-slate-800/30 rounded px-2 py-1 flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={12} />
              <span>Return to Day</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Moved outside to avoid redefining on every render, which causes extreme lag
const CustomWeeklyTooltip = ({ active, payload, label, allData, activeChart, chartId }: any) => {
  if (active && (!activeChart || activeChart === chartId)) {
    let data = payload && payload.length ? payload[0].payload : null;
    if (!data && allData && label) {
      data = allData.find((d: any) => d.fullDate === label || d.dayName === label || d.name === label);
    }
    if (data) {
      return (
        <SharedPopoverContent 
          label={data.fullDate || label}
          totalSessions={data.total}
          morning={data.Morning}
          afternoon={data.Afternoon}
          night={data.Night}
          other={data.Other}
          coins={data.coins}
          xp={data.xp}
          distractions={data.distractions}
          internal={data.internal}
          external={data.external}
          unavoidable={data.unavoidable}
          efficiency={data.efficiency}
          mood={data.mood}
          dateTimestamp={data.timestamp}
        />
      );
    }
  }
  return null;
};

const CustomDailyTooltip = ({ active, payload, label, dateTimestamp, allData, activeChart, chartId }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (active && containerRef.current) {
      containerRef.current.style.transform = 'none';
      const rect = containerRef.current.getBoundingClientRect();
      const padding = 12;
      let shift = 0;
      if (rect.right > window.innerWidth - padding) {
        shift = -(rect.right - window.innerWidth + padding);
      } else if (rect.left < padding) {
        shift = padding - rect.left;
      }
      if (shift !== 0) {
        containerRef.current.style.transform = `translateX(${shift}px)`;
      } else {
        containerRef.current.style.transform = 'none';
      }
    }
  });

  if (active && (!activeChart || activeChart === chartId)) {
    let data = payload && payload.length ? payload[0].payload : null;
    if (!data && allData && label) {
      data = allData.find((d: any) => d.name === label);
    }
    if (data) {
      const totalDistractions = data.distractions || (Number(data.internal) || 0) + (Number(data.external) || 0) + (Number(data.unavoidable) || 0);
      const hourlyRate = data.sessions > 0 
        ? (Math.round((totalDistractions / (data.sessions / 60)) * 10) / 10).toFixed(1) 
        : totalDistractions;

      return (
        <div 
          ref={containerRef}
          className="shared-popover-content animate-popover-enter bg-slate-900/95 backdrop-blur-md border border-slate-700/50 shadow-xl shadow-indigo-500/10 rounded-xl p-3.5 sm:p-4 z-50 w-[200px] sm:w-[220px]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-slate-50 font-bold mb-2 pb-2 border-b border-slate-800/50 text-[13px] sm:text-sm">{label || data.name}</p>
          {data.sessions > 0 ? (
            <div className="flex justify-between gap-4 text-xs mb-2">
              <span className="text-slate-400">Time</span>
              <span className="text-indigo-400 font-bold">{formatDuration(data.sessions)}</span>
            </div>
          ) : (
            <p className="text-slate-500 italic text-xs mb-2">No activity</p>
          )}

          {totalDistractions > 0 && (
            <div className="border-t border-slate-800/50 my-1.5 pt-1.5 space-y-1.5">
              <div className="flex justify-between items-center gap-4 text-xs">
                <span className="text-rose-400 font-medium">Distracted</span>
                <span className="text-rose-300 font-bold font-mono shrink-0">
                  {totalDistractions}{' '}
                  <span className="text-[10px] text-slate-400 font-normal font-sans">
                    ({hourlyRate}/h)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] pt-0.5">
                {Number(data.internal) > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium flex items-center gap-1">
                    <Brain size={10} className="shrink-0 text-indigo-400" />
                    <span>{data.internal}</span>
                  </span>
                )}
                {Number(data.external) > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium flex items-center gap-1">
                    <Wind size={10} className="shrink-0 text-orange-400" />
                    <span>{data.external}</span>
                  </span>
                )}
                {Number(data.unavoidable) > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium flex items-center gap-1">
                    <Zap size={10} className="shrink-0 text-red-500" />
                    <span>{data.unavoidable}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {dateTimestamp && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/50 mt-2">
              <button 
                type="button"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  window.dispatchEvent(new CustomEvent('statsShowDailySessionsModal', { 
                    detail: { timestamp: dateTimestamp, period: data.periodKey } 
                  })); 
                }}
                className="w-full text-emerald-400 hover:text-emerald-300 font-medium text-xs text-center transition-colors hover:bg-slate-800/30 rounded py-1 flex items-center justify-center gap-1.5"
              >
                <LayoutTemplate size={12} />
                <span>Show Daily Sessions</span>
              </button>
            </div>
          )}
        </div>
      );
    }
  }
  return null;
};

const CustomSleepTooltip = ({ active, payload, activeChart, chartId }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (active && containerRef.current) {
      containerRef.current.style.transform = 'none';
      const rect = containerRef.current.getBoundingClientRect();
      const padding = 12;
      let shift = 0;
      if (rect.right > window.innerWidth - padding) {
        shift = -(rect.right - window.innerWidth + padding);
      } else if (rect.left < padding) {
        shift = padding - rect.left;
      }
      if (shift !== 0) {
        containerRef.current.style.transform = `translateX(${shift}px)`;
      } else {
        containerRef.current.style.transform = 'none';
      }
    }
  });

  if (active && (!activeChart || activeChart === chartId) && payload && payload.length) {
    const data = payload[0].payload;
    if (!data.hasRecord) return null;
    const formatT = (val: number | null) => {
      if (val === null) return '--:--';
      let h = Math.floor(val);
      const m = Math.round((val - h) * 60);
      if (h >= 24) h -= 24;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    return (
      <div 
        ref={containerRef}
        className="animate-popover-enter bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl flex flex-col gap-2 z-50 min-w-[150px]"
      >
        <p className="text-white font-bold text-sm">{data.fullName}</p>
        <div className="text-xs text-slate-300 grid grid-cols-2 gap-x-4 gap-y-2">
           <span className="text-indigo-400 font-bold">Fell Asleep:</span>
           <span className="text-right font-mono">{formatT(data.sleepTime)}</span>
           <span className="text-amber-400 font-bold">Woke Up:</span>
           <span className="text-right font-mono">{formatT(data.wakeTime)}</span>
           <span className="text-emerald-400 font-bold">Duration:</span>
           <span className="text-right font-mono">{data.duration}h</span>
        </div>
      </div>
    );
  }
  return null;
};


export const Stats = React.memo<StatsProps>(({ state, saveDailyLog, onUpdateState, updateSession, deleteSession, completeSession, dungeons = [], majorDungeons = [], setShowStartOfDayModal, onOpenJournal }) => {
  const history = state.history;
  const dailyLogs = state.dailyLogs || {};
  const [showDailySessionsDate, setShowDailySessionsDate] = useState<Date | null>(null);
  const [showDailySessionsPeriod, setShowDailySessionsPeriod] = useState<string | undefined>();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [shareConfig, setShareConfig] = useState<ShareConfig>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_share_config');
      if (saved) return JSON.parse(saved);
    } catch(e){}
    return {
      showDaily: true,
      showWeekly: true,
      showRoutine: true,
      showHeatmap: true,
      showReflection: true,
      showSleep: true,
      aspectRatio: 'auto'
    };
  });

  useEffect(() => {
    localStorage.setItem('scholar_dungeon_share_config', JSON.stringify(shareConfig));
  }, [shareConfig]);
  const statsContainerRef = useRef<HTMLDivElement>(null);
  
  const viewOpts: NonNullable<AppState['statsViewOpts']> = state.statsViewOpts || {
    showDailyBar: true,
    showDailyDonut: false,
    showWeeklyBar: true,
    showWeeklyDonut: false,
    showRoutineTracker: true,
    showSleepTracker: true,
    showHeatmap: true,
    dailyDonutMode: 'compact' as const,
    weeklyDonutMode: 'time_of_day' as const,
    averageCalculationBase: 'total_days' as const,
    yAxisMaxMode: 'dynamic' as const,
  };
  
  const getInitialPeakDate = () => {
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

  const [dailyDate, setDailyDate] = useState(getInitialPeakDate());
  const [weeklyDate, setWeeklyDate] = useState(getInitialPeakDate());
  const [weeklyMode, setWeeklyMode] = useState<'calendar' | 'rolling'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_weeklyMode');
      if (saved === 'calendar' || saved === 'rolling') return saved;
    } catch(e){}
    return 'calendar';
  });
  const [sleepDate, setSleepDate] = useState(getInitialPeakDate());
  const [sleepMode, setSleepMode] = useState<'calendar' | 'rolling'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_sleepMode');
      if (saved === 'calendar' || saved === 'rolling') return saved;
    } catch(e){}
    return 'calendar';
  });
  const [showBulkSleepModal, setShowBulkSleepModal] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<'30days' | 'month' | 'year'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_heatmapMode');
      if (saved === '30days' || saved === 'month' || saved === 'year') return saved;
    } catch(e){}
    return '30days';
  });
  const [showHeatmapMood, setShowHeatmapMood] = useState(() => {
    try {
      return localStorage.getItem('scholar_dungeon_stats_heatmapMood') === 'true';
    } catch(e){}
    return false;
  });
  const [dailyLayerMode, setDailyLayerMode] = useState<'both' | 'bars' | 'lines'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_dailyLayerMode');
      if (saved && ['both', 'bars', 'lines'].includes(saved)) return saved as any;
    } catch(e){}
    return 'both';
  });
  const [weeklyLayerMode, setWeeklyLayerMode] = useState<'both' | 'bars' | 'lines'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_weeklyLayerMode');
      if (saved && ['both', 'bars', 'lines'].includes(saved)) return saved as any;
    } catch(e){}
    return 'both';
  });

  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_weeklyMode', weeklyMode);
  }, [weeklyMode]);
  
  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_sleepMode', sleepMode);
  }, [sleepMode]);
  
  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_heatmapMode', heatmapMode);
  }, [heatmapMode]);
  
  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_heatmapMood', String(showHeatmapMood));
  }, [showHeatmapMood]);

  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_dailyLayerMode', dailyLayerMode);
  }, [dailyLayerMode]);

  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_weeklyLayerMode', weeklyLayerMode);
  }, [weeklyLayerMode]);
  const [heatmapMetric, setHeatmapMetric] = useState<'time' | 'efficiency'>('time');
  const [heatmapPopoverAnchor, setHeatmapPopoverAnchor] = useState<{ date: number, element: HTMLElement | null } | null>(null);

  const [chartKeys, setChartKeys] = useState({
    daily: Date.now(),
    weeklyBar: Date.now() + 1,
    weeklyLine: Date.now() + 2,
    sleep: Date.now() + 3
  });
  const [activeChart, setActiveChart] = useState<'daily' | 'weeklyBar' | 'weeklyLine' | 'sleep' | null>(null);

  const dateIndicators = React.useMemo(() => {
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
        if (log && log.reflection) {
          if (!res[dateStr]) res[dateStr] = {};
          res[dateStr].star = true;
        }
      }
    }
    return res;
  }, [state.history, state.dailyLogs]);

  const handleChartClick = (chartState: any, chart: 'daily' | 'weeklyBar' | 'weeklyLine' | 'sleep') => {
    const hasTarget = chartState && (
      chartState.activeTooltipIndex !== undefined || 
      chartState.activeLabel !== undefined ||
      (chartState.activePayload && chartState.activePayload.length > 0)
    );

    if (!hasTarget) {
      setActiveChart(null);
      setChartKeys({
        daily: Date.now() + Math.random(),
        weeklyBar: Date.now() + Math.random(),
        weeklyLine: Date.now() + Math.random(),
        sleep: Date.now() + Math.random()
      });
    } else {
      setActiveChart(chart);
      // Keep only the clicked chart active; force-reset all other charts to close their popovers
      setChartKeys(prev => ({
        daily: chart === 'daily' ? prev.daily : Date.now() + Math.random(),
        weeklyBar: chart === 'weeklyBar' ? prev.weeklyBar : Date.now() + Math.random(),
        weeklyLine: chart === 'weeklyLine' ? prev.weeklyLine : Date.now() + Math.random(),
        sleep: chart === 'sleep' ? prev.sleep : Date.now() + Math.random()
      }));
    }
  };

  const [isEditingLog, setIsEditingLog] = useState(false);
  const [isFullscreenEdit, setIsFullscreenEdit] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editReflection, setEditReflection] = useState('');
  const [editMood, setEditMood] = useState<string | undefined>();
  const [isMarkdownPreview, setIsMarkdownPreview] = useState(true);

  // Refs for auto-save on unmount and stale closures in effects
  const editRatingRef = useRef(editRating);
  const editReflectionRef = useRef(editReflection);
  const editMoodRef = useRef(editMood);
  const isEditingLogRef = useRef(isEditingLog);
  const dailyDateRef = useRef(dailyDate);
  const saveDailyLogRef = useRef(saveDailyLog);

  useEffect(() => {
    editRatingRef.current = editRating;
    editReflectionRef.current = editReflection;
    editMoodRef.current = editMood;
    isEditingLogRef.current = isEditingLog;
    dailyDateRef.current = dailyDate;
    saveDailyLogRef.current = saveDailyLog;
  }, [editRating, editReflection, editMood, isEditingLog, dailyDate, saveDailyLog]);

  useEffect(() => {
    let dismissalTimeout: any = null;

    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element;
      
      const inHeatmap = !!target.closest('.heatmap-cell-container');
      const inTooltip = !!target.closest('.recharts-tooltip-wrapper') || !!target.closest('.recharts-tooltip-portal') || !!target.closest('.shared-popover-content');
      const inChart = !!target.closest('.recharts-responsive-container') || !!target.closest('.recharts-wrapper');
      
      if (dismissalTimeout) clearTimeout(dismissalTimeout);

      dismissalTimeout = setTimeout(() => {
        if (!inHeatmap && !target.closest('.shared-popover-content')) {
          setHeatmapPopoverAnchor(prev => prev !== null ? null : prev);
        }
        
        if (!inTooltip && !inChart) {
          setActiveChart(null);
          setChartKeys({
            daily: Date.now() + Math.random(),
            weeklyBar: Date.now() + Math.random(),
            weeklyLine: Date.now() + Math.random(),
            sleep: Date.now() + Math.random()
          });
        }
      }, 30);
    };

    const handleScrollOrResize = () => {
      // Dismiss popovers on scroll or resize to prevent floating detachments
      setHeatmapPopoverAnchor(prev => prev !== null ? null : prev);
    };

    document.addEventListener('click', handleOutsideInteraction, { capture: true });
    document.addEventListener('touchstart', handleOutsideInteraction, { passive: true, capture: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    const handleJump = (e: any) => {
      // Use refs to avoid stale closure in effect
      if (isEditingLogRef.current) {
        saveDailyLogRef.current(format(dailyDateRef.current, 'yyyy-MM-dd'), editRatingRef.current, editReflectionRef.current, editMoodRef.current);
        setIsEditingLog(false);
      }
      setDailyDate(new Date(e.detail));
      setWeeklyDate(new Date(e.detail));
      setHeatmapPopoverAnchor(null);
      setChartKeys({
        daily: Date.now() + Math.random(),
        weeklyBar: Date.now() + Math.random(),
        weeklyLine: Date.now() + Math.random(),
        sleep: Date.now() + Math.random()
      });
      document.getElementById('daily-activity-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleShowSessions = (e: any) => {
      const { timestamp, period } = typeof e.detail === 'object' ? e.detail : { timestamp: e.detail, period: undefined };
      setShowDailySessionsDate(new Date(timestamp));
      setShowDailySessionsPeriod(period);
    };

    window.addEventListener('statsNavJump', handleJump);
    window.addEventListener('statsShowDailySessionsModal', handleShowSessions);

    return () => {
      if (dismissalTimeout) clearTimeout(dismissalTimeout);
      document.removeEventListener('click', handleOutsideInteraction, { capture: true });
      document.removeEventListener('touchstart', handleOutsideInteraction, { capture: true });
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('statsNavJump', handleJump);
      window.removeEventListener('statsShowDailySessionsModal', handleShowSessions);
      
      // AUTO-SAVE ON UNMOUNT (e.g. switching views)
      if (isEditingLogRef.current) {
        saveDailyLogRef.current(format(dailyDateRef.current, 'yyyy-MM-dd'), editRatingRef.current, editReflectionRef.current, editMoodRef.current);
      }
    };
  }, []);

  const renderHeatmapPopover = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = dailyLogs[dateStr];
    const daySessions = getSessionsForDate(date);
    const dayRewards = getRewardsForDate(date);
    const coins = daySessions.reduce((acc, s) => acc + s.coinsEarned, 0) + 
                  dayRewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (r.amount || 0), 0);
    const xp = daySessions.reduce((acc, s) => acc + s.xpEarned, 0) + 
               dayRewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (r.amount || 0), 0);
    
    const counts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
    let dayInternal = 0;
    let dayExternal = 0;
    let dayUnavoidable = 0;
    let dayTotalDistractions = 0;

    daySessions.forEach(s => {
      const p = s.period || getPeriod(new Date(s.timestamp));
      const amount = Math.max(1, getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks));
      if (p in counts) {
        counts[p as keyof typeof counts] += amount;
      } else {
        counts.Other += amount;
      }

      if (s.distractions) {
        const intCount = typeof s.distractions === 'number' ? (isNaN(s.distractions) ? 0 : s.distractions) : (Number(s.distractions.internal) || 0);
        const extCount = typeof s.distractions === 'object' ? (Number(s.distractions.external) || 0) : 0;
        const unavCount = typeof s.distractions === 'object' ? (Number(s.distractions.unavoidable) || 0) : 0;
        dayInternal += intCount;
        dayExternal += extCount;
        dayUnavoidable += unavCount;
        dayTotalDistractions += (intCount + extCount + unavCount);
      }
    });

    if (true) {
      counts.Morning = Math.floor(counts.Morning);
      counts.Afternoon = Math.floor(counts.Afternoon);
      counts.Night = Math.floor(counts.Night);
      counts.Other = Math.floor(counts.Other);
    }
    
    const totalCount = counts.Morning + counts.Afternoon + counts.Night + counts.Other;

    return (
      <SharedPopoverContent 
          label={format(date, 'EEE, MMM d, yyyy')}
          totalSessions={totalCount}
          morning={counts.Morning}
          afternoon={counts.Afternoon}
          night={counts.Night}
          other={counts.Other}
          coins={coins}
          xp={xp}
          distractions={dayTotalDistractions}
          internal={dayInternal}
          external={dayExternal}
          unavoidable={dayUnavoidable}
          efficiency={log?.rating}
          mood={log?.mood}
          dateTimestamp={date.getTime()}
      />
    );
  };
  const [heatmapDate, setHeatmapDate] = useState(getInitialPeakDate());

  const [showTemplates, setShowTemplates] = useState(false);
  const [templateMode, setTemplateMode] = useState<'empty' | 'example'>('empty');
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const renderTemplateControls = () => (
    <div className="relative flex items-center gap-0 h-[26px]">
      <button
        onClick={() => setShowTemplates(!showTemplates)}
        className={cn(
          "flex items-center justify-center gap-1.5 h-full px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
          showTemplates 
            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
            : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-white"
        )}
      >
        <LayoutTemplate size={12} />
        <span>Templates</span>
      </button>

      {/* Templates Dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex border-b border-slate-800 p-1 bg-slate-900/50 gap-1 relative z-10">
               <button
                  onClick={() => {
                    setTemplateMode('empty');
                  }}
                  className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1", templateMode === 'empty' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:bg-slate-800 hover:text-white")}
                  title="Blank Template Mode: Load templates without examples"
               >
                 <File size={12} /> Blank
               </button>
               <button
                  onClick={() => {
                    setTemplateMode('example');
                  }}
                  className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1", templateMode === 'example' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:bg-slate-800 hover:text-white")}
                  title="Example Template Mode: Load templates with examples"
               >
                 <FileText size={12} /> Example
               </button>
            </div>
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {state.reflectionTemplates?.map((template) => (
                <div key={template.id} className="group relative">
                  {templateToDelete === template.id ? (
                    <div className="flex items-center justify-between w-full px-3 py-2 bg-rose-500/10 rounded-xl">
                      <span className="text-xs text-rose-400 font-medium">Delete {template.name}?</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (onUpdateState) {
                              onUpdateState({
                                reflectionTemplates: state.reflectionTemplates?.filter(t => t.id !== template.id)
                              });
                            }
                            setTemplateToDelete(null);
                          }}
                          className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30 text-[10px] font-bold"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setTemplateToDelete(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 text-[10px] font-bold"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (templateMode === 'example' && template.exampleContent) {
                            setEditReflection(template.exampleContent);
                          } else {
                            setEditReflection(template.content);
                          }
                          setShowTemplates(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors pr-8"
                      >
                        {template.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-all"
                        title="Delete Template"
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-slate-800 bg-slate-950/50">
              {isSavingTemplate ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Template name..."
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTemplateName.trim()) {
                        if (onUpdateState) {
                          const templates = [...(state.reflectionTemplates || [])];
                          const existingIndex = templates.findIndex(t => t.name.toLowerCase() === newTemplateName.trim().toLowerCase());
                          
                          if (existingIndex >= 0) {
                            if (templateMode === 'example') {
                              templates[existingIndex] = { ...templates[existingIndex], exampleContent: editReflection };
                            } else {
                              templates[existingIndex] = { ...templates[existingIndex], content: editReflection };
                            }
                          } else {
                            templates.push({
                              id: `user-${Date.now()}`,
                              name: newTemplateName.trim(),
                              content: templateMode === 'empty' ? editReflection : '',
                              exampleContent: templateMode === 'example' ? editReflection : ''
                            });
                          }
                          
                          onUpdateState({ reflectionTemplates: templates });
                        }
                        setNewTemplateName('');
                        setIsSavingTemplate(false);
                      } else if (e.key === 'Escape') {
                        setIsSavingTemplate(false);
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!editReflection.trim()) return;
                    setIsSavingTemplate(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all"
                >
                  <Save size={12} />
                  <span>Save as {templateMode === 'example' ? 'Example' : 'Blank'}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const handleDailyDateChange = (newDate: Date) => {
    if (isEditingLog) {
      saveDailyLog(dailyDateStr, editRating, editReflection, editMood);
      setIsEditingLog(false);
    }
    setDailyDate(newDate);
  };

  const dailyDateStr = format(dailyDate, 'yyyy-MM-dd');
  const currentLog = dailyLogs[dailyDateStr];

  const startEditing = () => {
    setEditRating(currentLog?.rating || 0);
    setEditReflection(currentLog?.reflection || '');
    setEditMood(currentLog?.mood);
    setIsEditingLog(true);
  };

  const saveLog = () => {
    saveDailyLog(dailyDateStr, editRating, editReflection, editMood);
    setIsEditingLog(false);
  };

  const dailyInputRef = useRef<HTMLInputElement>(null);
  const weeklyInputRef = useRef<HTMLInputElement>(null);
  const heatmapInputRef = useRef<HTMLInputElement>(null);

  // --- Date Range Calculations ---
  const weekStart = weeklyMode === 'calendar' 
    ? startOfWeek(weeklyDate, { weekStartsOn: 1 })
    : subDays(weeklyDate, 6);
  const weekEnd = weeklyMode === 'calendar'
    ? endOfWeek(weeklyDate, { weekStartsOn: 1 })
    : weeklyDate;

  const sleepStart = sleepMode === 'calendar' 
    ? startOfWeek(sleepDate, { weekStartsOn: 1 })
    : subDays(sleepDate, 6);
  const sleepEnd = sleepMode === 'calendar'
    ? endOfWeek(sleepDate, { weekStartsOn: 1 })
    : sleepDate;

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
    
    // Morning
    if (ts.morning.start > ts.morning.end) {
      if (hour >= ts.morning.start) return { period: 'Morning', assignedDate: localDate };
      if (hour < ts.morning.end) return { period: 'Morning', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.morning.start && hour < ts.morning.end) {
      return { period: 'Morning', assignedDate: localDate };
    }
    
    // Afternoon
    if (ts.afternoon.start > ts.afternoon.end) {
      if (hour >= ts.afternoon.start) return { period: 'Afternoon', assignedDate: localDate };
      if (hour < ts.afternoon.end) return { period: 'Afternoon', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.afternoon.start && hour < ts.afternoon.end) {
      return { period: 'Afternoon', assignedDate: localDate };
    }

    // Night
    if (ts.night.start > ts.night.end) {
      if (hour >= ts.night.start) return { period: 'Night', assignedDate: localDate };
      if (hour < ts.night.end) return { period: 'Night', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.night.start && hour < ts.night.end) {
      return { period: 'Night', assignedDate: localDate };
    }

    // Other (fallback based on day-reset hour)
    const resetHour = ts.night.end;
    if (hour < resetHour) {
      return { period: 'Other', assignedDate: subDays(localDate, 1) };
    }
    
    return { period: 'Other', assignedDate: localDate };
  }, [state.timezone, ts]);

  const processedHistory = useMemo(() => {
    return (history || []).map(s => {
      const validDate = s.timestamp && !isNaN(new Date(s.timestamp).getTime()) ? new Date(s.timestamp) : new Date();
      const info = getPeriodInfo(validDate);
      return {
        ...s,
        assignedDate: info.assignedDate,
        assignedDateStr: format(info.assignedDate, 'yyyy-MM-dd'),
        period: info.period
      };
    });
  }, [history, getPeriodInfo]);

  const processedRewards = useMemo(() => {
    return (state.rewardHistory || []).map(r => {
      const validDate = r.timestamp && !isNaN(new Date(r.timestamp).getTime()) ? new Date(r.timestamp) : new Date();
      const info = getPeriodInfo(validDate);
      return {
        ...r,
        assignedDate: info.assignedDate,
        assignedDateStr: format(info.assignedDate, 'yyyy-MM-dd'),
      };
    });
  }, [state.rewardHistory, getPeriodInfo]);

  const sessionsByDateStr = useMemo(() => {
    const map: Record<string, typeof processedHistory> = {};
    processedHistory.forEach(s => {
      if (!map[s.assignedDateStr]) map[s.assignedDateStr] = [];
      map[s.assignedDateStr].push(s);
    });
    return map;
  }, [processedHistory]);

  const rewardsByDateStr = useMemo(() => {
    const map: Record<string, typeof processedRewards> = {};
    processedRewards.forEach(r => {
      if (!map[r.assignedDateStr]) map[r.assignedDateStr] = [];
      map[r.assignedDateStr].push(r);
    });
    return map;
  }, [processedRewards]);

  const getSessionsForDate = useCallback((date: Date) => {
    if (!date || isNaN(date.getTime())) return [];
    return sessionsByDateStr[format(date, 'yyyy-MM-dd')] || [];
  }, [sessionsByDateStr]);

  const getRewardsForDate = useCallback((date: Date) => {
    if (!date || isNaN(date.getTime())) return [];
    return rewardsByDateStr[format(date, 'yyyy-MM-dd')] || [];
  }, [rewardsByDateStr]);

  const isSamePeakDay = (sessionDate: Date, targetDate: Date) => {
    const info = getPeriodInfo(sessionDate);
    return isSameDay(info.assignedDate, targetDate);
  };

  const calculateDistractionCount = (distractions: any) => {
    if (!distractions) return 0;
    if (typeof distractions === 'number') return isNaN(distractions) ? 0 : distractions;
    return (Number(distractions.internal) || 0) + (Number(distractions.external) || 0) + (Number(distractions.unavoidable) || 0);
  };

  // --- Aggregate Helpers ---
  const getGainsForPeriod = (sessions: StudySession[], rewards: RewardHistoryItem[], dateRange?: { start: Date, end: Date }) => {
    const periodSessions = dateRange 
      ? processedHistory.filter(s => {
          if (heatmapMode === 'year' || weeklyMode === 'calendar') {
             return isWithinInterval(s.assignedDate, dateRange);
          }
          return isWithinInterval(new Date(s.timestamp), dateRange);
        })
      : processedHistory;
    const periodRewards = dateRange
      ? processedRewards.filter(r => isWithinInterval(new Date(r.timestamp), dateRange))
      : processedRewards;

    const coins = periodSessions.reduce((acc, s) => acc + (Number(s.coinsEarned) || 0), 0) + 
                  periodRewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const xp = periodSessions.reduce((acc, s) => acc + (Number(s.xpEarned) || 0), 0) + 
               periodRewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    
    const tasks = Math.floor(periodSessions.reduce((acc, s) => acc + getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks), 0));
    const distractions = periodSessions.reduce((acc, s) => acc + calculateDistractionCount(s.distractions), 0);

    return { coins, xp, tasks, distractions };
  };

  const dailyGains = useMemo(() => {
    const sessions = getSessionsForDate(dailyDate);
    const rewards = getRewardsForDate(dailyDate);
    
    const coins = sessions.reduce((acc, s) => acc + (Number(s.coinsEarned) || 0), 0) + 
                  rewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const xp = sessions.reduce((acc, s) => acc + (Number(s.xpEarned) || 0), 0) + 
               rewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    
    const tasks = Math.floor(sessions.reduce((acc, s) => acc + getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks), 0));
    const distractions = sessions.reduce((acc, s) => acc + calculateDistractionCount(s.distractions), 0);

    return { coins, xp, tasks, distractions };
  }, [getSessionsForDate, getRewardsForDate, dailyDate, state.includeRestTimeInTasks]);

  const weeklyGains = useMemo(() => {
    const interval = { start: weekStart, end: weekEnd };
    return getGainsForPeriod(history, state.rewardHistory || [], interval);
  }, [history, state.rewardHistory, weekStart, weekEnd, processedHistory, processedRewards, state.includeRestTimeInTasks]);

  const getPeriod = (date: Date) => {
    return getPeriodInfo(date).period;
  };

  const dailyData = useMemo(() => {
    const currentDailySessions = getSessionsForDate(dailyDate);
    const dailyCounts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
    const dailyDistractions = {
      Morning: { internal: 0, external: 0, unavoidable: 0, total: 0 },
      Afternoon: { internal: 0, external: 0, unavoidable: 0, total: 0 },
      Night: { internal: 0, external: 0, unavoidable: 0, total: 0 },
      Other: { internal: 0, external: 0, unavoidable: 0, total: 0 },
    };

    currentDailySessions.forEach(s => {
      const p = s.period || getPeriod(new Date(s.timestamp));
      const amount = Math.max(0, getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks));
      if (p in dailyCounts) {
        dailyCounts[p as keyof typeof dailyCounts] += amount;
      } else {
        dailyCounts.Other += amount;
      }

      const targetPeriod = (p in dailyDistractions ? p : 'Other') as keyof typeof dailyDistractions;
      if (s.distractions) {
        const intCount = typeof s.distractions === 'number' ? (isNaN(s.distractions) ? 0 : s.distractions) : (Number(s.distractions.internal) || 0);
        const extCount = typeof s.distractions === 'object' ? (Number(s.distractions.external) || 0) : 0;
        const unavCount = typeof s.distractions === 'object' ? (Number(s.distractions.unavoidable) || 0) : 0;
        dailyDistractions[targetPeriod].internal += intCount;
        dailyDistractions[targetPeriod].external += extCount;
        dailyDistractions[targetPeriod].unavoidable += unavCount;
        dailyDistractions[targetPeriod].total += (intCount + extCount + unavCount);
      }
    });

    dailyCounts.Morning = Math.floor(dailyCounts.Morning);
    dailyCounts.Afternoon = Math.floor(dailyCounts.Afternoon);
    dailyCounts.Night = Math.floor(dailyCounts.Night);
    dailyCounts.Other = Math.floor(dailyCounts.Other);

    return [
      { 
        name: `Morning (${ts.morning.start}-${ts.morning.end})`, 
        sessions: dailyCounts.Morning, 
        fill: '#fde047', 
        periodKey: 'Morning',
        internal: dailyDistractions.Morning.internal,
        external: dailyDistractions.Morning.external,
        unavoidable: dailyDistractions.Morning.unavoidable,
        distractions: dailyDistractions.Morning.total,
      },
      { 
        name: `Afternoon (${ts.afternoon.start}-${ts.afternoon.end})`, 
        sessions: dailyCounts.Afternoon, 
        fill: '#f97316', 
        periodKey: 'Afternoon',
        internal: dailyDistractions.Afternoon.internal,
        external: dailyDistractions.Afternoon.external,
        unavoidable: dailyDistractions.Afternoon.unavoidable,
        distractions: dailyDistractions.Afternoon.total,
      },
      { 
        name: `Night (${ts.night.start}-${ts.night.end})`, 
        sessions: dailyCounts.Night, 
        fill: '#6366f1', 
        periodKey: 'Night',
        internal: dailyDistractions.Night.internal,
        external: dailyDistractions.Night.external,
        unavoidable: dailyDistractions.Night.unavoidable,
        distractions: dailyDistractions.Night.total,
      },
      ...(state.showOtherInActivityLog !== false ? [{ 
        name: 'Other', 
        sessions: dailyCounts.Other, 
        fill: '#64748b', 
        periodKey: 'Other',
        internal: dailyDistractions.Other.internal,
        external: dailyDistractions.Other.external,
        unavoidable: dailyDistractions.Other.unavoidable,
        distractions: dailyDistractions.Other.total,
      }] : [])
    ];
  }, [dailyDate, getSessionsForDate, ts, state.showOtherInActivityLog, state.includeRestTimeInTasks, getPeriodInfo]);

  const dailySessions = getSessionsForDate(dailyDate);
  const dailyCounts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
  dailySessions.forEach(s => {
    const p = s.period || getPeriod(new Date(s.timestamp));
    if (p in dailyCounts) {
      dailyCounts[p as keyof typeof dailyCounts]++;
    } else {
      dailyCounts.Other++;
    }
  });

  let maxPeriod = 'Morning';
  let maxCount = dailyCounts.Morning;
  ['Afternoon', 'Night'].forEach(p => {
    if (dailyCounts[p as keyof typeof dailyCounts] > maxCount) {
      maxCount = dailyCounts[p as keyof typeof dailyCounts];
      maxPeriod = p;
    }
  });
  const highestEnergyPrompt = dailySessions.length > 0 
    ? (maxCount > 0 
        ? `Your highest energy period today is ${maxPeriod}!` 
        : "No sessions recorded during main periods today.")
    : "The archives are silent for today. Embark on a new journey to begin your record.";

  const weeklyDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyActiveDaysCount = useMemo(() => {
    const count = weeklyDays.filter(date => {
      const hasSessions = getSessionsForDate(date).length > 0;
      const hasRewards = getRewardsForDate(date).length > 0;
      return hasSessions || hasRewards;
    }).length;
    return count > 0 ? count : 1;
  }, [weeklyDays, sessionsByDateStr, rewardsByDateStr]);

  const sleepDays = eachDayOfInterval({ start: sleepStart, end: sleepEnd });

  const sleepData = useMemo(() => {
    return sleepDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const log = dailyLogs[dateStr] || ({} as any);
      const durationHours = (log.sleepDurationMin || 0) / 60;
      
      let sleepTimeNum: number | null = null;
      let wakeTimeNum: number | null = null;
      if (log.sleepTime && log.wakeTime) {
         const [sh, sm] = log.sleepTime.split(':').map(Number);
         const [wh, wm] = log.wakeTime.split(':').map(Number);
         
         let s = sh + sm/60;
         let w = wh + wm/60;
         
         if (s <= w) {
             if (s <= 12) {
                 s += 24;
                 w += 24;
             }
         } else {
             w += 24;
         }
         sleepTimeNum = s;
         wakeTimeNum = w;
      } else if (log.sleepTime) {
         const [h, m] = log.sleepTime.split(':').map(Number);
         sleepTimeNum = h < 12 ? h + 24 + m/60 : h + m/60;
      } else if (log.wakeTime) {
         const [h, m] = log.wakeTime.split(':').map(Number);
         wakeTimeNum = h + 24 + m/60;
      }

      return {
        name: format(date, 'EEE'),
        fullName: format(date, 'eeee, MMMM do'),
        dateStr,
        duration: Number(durationHours.toFixed(1)),
        sleepTime: sleepTimeNum !== null ? Number(sleepTimeNum.toFixed(2)) : null,
        wakeTime: wakeTimeNum !== null ? Number(wakeTimeNum.toFixed(2)) : null,
        hasRecord: !!log.sleepDurationMin
      };
    });
  }, [sleepDays, dailyLogs]);

  const weeklyData = useMemo(() => {
    return weeklyDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const log = dailyLogs[dateStr];
      const daySessions = getSessionsForDate(date);
      const dayRewards = getRewardsForDate(date);
      const coins = daySessions.reduce((acc, s) => acc + s.coinsEarned, 0) + 
                    dayRewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (r.amount || 0), 0);
      const xp = daySessions.reduce((acc, s) => acc + s.xpEarned, 0) + 
                 dayRewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (r.amount || 0), 0);
      const counts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
      
      let dayInternal = 0;
      let dayExternal = 0;
      let dayUnavoidable = 0;
      let dayTotalDistractions = 0;

      daySessions.forEach(s => {
        const p = s.period || getPeriod(new Date(s.timestamp));
        const amount = Math.max(1, getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks));
        if (p in counts) {
          counts[p as keyof typeof counts] += amount;
        } else {
          counts.Other += amount;
        }

        if (s.distractions) {
          const intCount = typeof s.distractions === 'number' ? (isNaN(s.distractions) ? 0 : s.distractions) : (Number(s.distractions.internal) || 0);
          const extCount = typeof s.distractions === 'object' ? (Number(s.distractions.external) || 0) : 0;
          const unavCount = typeof s.distractions === 'object' ? (Number(s.distractions.unavoidable) || 0) : 0;
          dayInternal += intCount;
          dayExternal += extCount;
          dayUnavoidable += unavCount;
          dayTotalDistractions += (intCount + extCount + unavCount);
        }
      });
      if (true) {
        counts.Morning = Math.floor(counts.Morning);
        counts.Afternoon = Math.floor(counts.Afternoon);
        counts.Night = Math.floor(counts.Night);
        counts.Other = Math.floor(counts.Other);
      }
      const total = counts.Morning + counts.Afternoon + counts.Night + counts.Other;
      return {
        name: format(date, 'EEE').toUpperCase(),
        fullDate: format(date, 'EEE, MMM d, yyyy'),
        Morning: counts.Morning,
        Afternoon: counts.Afternoon,
        Night: counts.Night,
        Other: counts.Other,
        total,
        xp,
        coins,
        internal: dayInternal,
        external: dayExternal,
        unavoidable: dayUnavoidable,
        distractions: dayTotalDistractions,
        moodHeight: 0,
        mood: log?.mood,
        efficiency: log?.rating || null,
        timestamp: date.getTime(),
      };
    });
  }, [weeklyDays, dailyLogs, getSessionsForDate, getRewardsForDate, state.includeRestTimeInTasks, getPeriodInfo]);

  const isFixedYAxis = viewOpts.yAxisMaxMode === 'fixed';

  const dailyTimeAxis = useMemo(() => {
    const maxMins = Math.max(...dailyData.map(d => d.sessions || 0), 0);
    return computeTimeYAxis(maxMins, isFixedYAxis, 240);
  }, [dailyData, isFixedYAxis]);

  const weeklyTimeAxis = useMemo(() => {
    const maxMins = Math.max(
      ...weeklyData.map(d => 
        (d.Morning || 0) + 
        (d.Afternoon || 0) + 
        (d.Night || 0) + 
        (state.showOtherInActivityLog !== false ? (d.Other || 0) : 0)
      ),
      0
    );
    return computeTimeYAxis(maxMins, isFixedYAxis, 480);
  }, [weeklyData, state.showOtherInActivityLog, isFixedYAxis]);

  // --- Heatmap Data ---
  const heatmapDays = useMemo(() => {
    let days: Date[] = [];
    if (heatmapMode === '30days') {
      days = eachDayOfInterval({ start: subDays(heatmapDate, 29), end: heatmapDate });
    } else if (heatmapMode === 'month') {
      days = eachDayOfInterval({ start: startOfMonth(heatmapDate), end: endOfMonth(heatmapDate) });
    } else if (heatmapMode === 'year') {
      days = eachDayOfInterval({ start: startOfYear(heatmapDate), end: endOfYear(heatmapDate) });
    }
    return days;
  }, [heatmapMode, heatmapDate]);

  const heatmapMonthLabels = useMemo(() => {
    if (heatmapDays.length === 0) return [];
    const labels: { month: string, colIndex: number }[] = [];
    let currentMonth = -1;
    let currentDayOfWeek = (heatmapDays[0].getDay() + 6) % 7;
    let currentCol = 0;
    
    for (let i = 0; i < heatmapDays.length; i++) {
      const d = heatmapDays[i];
      if (d.getMonth() !== currentMonth) {
        // Only add label if there's enough space from the previous label (e.g. at least 2 columns) so they don't overlap
        if (labels.length === 0 || currentCol - labels[labels.length - 1].colIndex > 2) {
           labels.push({ month: format(d, 'MMM'), colIndex: currentCol });
        }
        currentMonth = d.getMonth();
      }
      currentDayOfWeek++;
      if (currentDayOfWeek > 6) {
        currentDayOfWeek = 0;
        currentCol++;
      }
    }
    return labels;
  }, [heatmapDays]);


  const getIntensity = (date: Date) => {
    if (heatmapMetric === 'time') {
      const count = getSessionsForDate(date).length;
      if (count === 0) return 'bg-slate-800/50';
      
      const max = state.heatmapScaleMax ?? 8;
      
      if (count < (max * 0.25)) return 'bg-indigo-500/20';
      if (count < (max * 0.5)) return 'bg-indigo-500/40';
      if (count < max) return 'bg-indigo-500/70';
      return 'bg-indigo-500';
    } else {
      const log = dailyLogs[format(date, 'yyyy-MM-dd')];
      if (!log || log.rating === 0) return 'bg-slate-800/50';
      if (log.rating < 2) return 'bg-indigo-500/20';
      if (log.rating < 3.5) return 'bg-indigo-500/50';
      if (log.rating < 4.5) return 'bg-indigo-500/80';
      return 'bg-indigo-500';
    }
  };

  const renderMoodIcon = (props: any) => {
    const { x, y, width, payload, value } = props;
    // Extract actual payload whether stacked or not
    const actualPayload = payload?.payload || payload;
    if (!actualPayload) return null;

    const moodId = actualPayload.mood;
    const total = actualPayload.total;
    const moodObj = moodId ? MOOD_OPTIONS.find((m) => m.id === moodId) : null;
    const Icon = moodObj ? moodObj.icon : null;

    return (
      <g transform={`translate(${x + width / 2}, ${y - 10})`}>
        {/* Render total value */}
        <text
          x={0}
          y={Icon ? -16 : 0}
          fill="#94a3b8"
          fontSize={10}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {total > 0 ? total : ''}
        </text>
        {/* Render mood icon if available */}
        {Icon && (
          <g transform={`translate(-7, -7)`}>
            <Icon size={14} className={moodObj.color} />
          </g>
        )}
      </g>
    );
  };

  const heatmapSummary = useMemo(() => {
    if (heatmapDays.length === 0) return null;
    const startObj = heatmapDays[0];
    const endObj = addDays(heatmapDays[heatmapDays.length - 1], 1);
    
    const activeDates = new Set<string>();
    let gold = 0;
    let xp = 0;
    let timeOrTasks = 0;
    let distractions = 0;

    history.forEach(session => {
       const sessionDate = parseISO(session.timestamp || '');
       if (sessionDate >= startObj && sessionDate < endObj) {
          activeDates.add(format(sessionDate, 'yyyy-MM-dd'));
          gold += (session.coinsEarned || 0);
          xp += (session.xpEarned || 0);
          timeOrTasks += getSessionEffectiveMinutes(session, !!state.includeRestTimeInTasks);
          distractions += getSessionDistractionCount(session.distractions);
       }
    });

    const activeDaysCount = activeDates.size;
    const daysDivisor = viewOpts.averageCalculationBase === 'active_days'
      ? (activeDaysCount > 0 ? activeDaysCount : 1)
      : (heatmapDays.length > 0 ? heatmapDays.length : 1);
    
    return {
      activeDays: activeDaysCount,
      totalTimeOrTasks: timeOrTasks,
      avgTimeOrTasks: Math.round(timeOrTasks / daysDivisor),
      totalGold: gold,
      avgGold: Math.round(gold / daysDivisor),
      totalExp: xp,
      avgExp: Math.round(xp / daysDivisor),
      totalDistractions: distractions,
      avgDistractionsPerHour: timeOrTasks > 0 ? Math.round((distractions / (timeOrTasks / 60)) * 10) / 10 : 0,
    };
  }, [heatmapDays, heatmapMode, history, state.includeRestTimeInTasks, viewOpts.averageCalculationBase]);

  return (
    <div ref={statsContainerRef} className="w-full space-y-6 sm:space-y-8" onClick={() => {}} style={{ cursor: 'auto' }}>
      <PageHeader 
        title="Record"
        description="Your journey through the dungeon"
        icon={BarChart2}
        action={
          <div id="stats-header-actions" className="flex gap-2">
            <button
              onClick={() => setShowViewSettings(true)}
              className="p-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <LayoutTemplate size={18} />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Layout</span>
            </button>
            <button 
              id="share-button"
              onClick={() => setShowShareModal(true)}
              className="p-2 sm:px-4 sm:py-2.5 bg-indigo-600/10 hover:bg-indigo-600 rounded-xl border border-indigo-500/20 text-indigo-400 hover:text-white transition-all flex items-center justify-center gap-2 group shrink-0"
            >
              <Share2 size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Share</span>
            </button>
          </div>
        }
      />

      <div id="charts-grid" className={cn(
        "grid gap-8 transition-all",
        (shareConfig.showDaily && shareConfig.showWeekly) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        
        {/* Daily */}
        {shareConfig.showDaily && (
          <div id="daily-activity-section" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="text-indigo-400" size={20} />
                <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Daily</h3>
              </div>

              <div className="relative bg-slate-800/50 hover:bg-slate-700 transition-colors rounded-lg flex items-center p-0.5 sm:p-1 cursor-pointer group" title="Layer Mode">
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest text-indigo-400 group-hover:text-indigo-300 whitespace-nowrap pointer-events-none flex items-center gap-1">
                  {dailyLayerMode === 'both' && 'Both'}
                  {dailyLayerMode === 'bars' && 'Time'}
                  {dailyLayerMode === 'lines' && 'Distractions'}
                  <ChevronDown size={12} className="opacity-70" />
                </span>
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={dailyLayerMode}
                  onChange={(e) => setDailyLayerMode(e.target.value as 'both' | 'bars' | 'lines')}
                >
                  <option value="both">Both</option>
                  <option value="bars">Time</option>
                  <option value="lines">Distractions</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1 w-full sm:w-auto shrink-0">
              <button onClick={() => handleDailyDateChange(subDays(dailyDate, 1))} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"><ChevronLeft size={16} /></button>
              <div className="relative flex items-center justify-center flex-1 sm:flex-none">
                <DatePicker 
                  value={format(dailyDate, 'yyyy-MM-dd')}
                  onChange={(val) => val && handleDailyDateChange(parseISO(val))}
                  indicators={dateIndicators}
                  className="text-[10px] sm:text-xs font-bold text-slate-300 w-full sm:w-24 text-center hover:text-indigo-400 transition-colors inline-block whitespace-nowrap cursor-pointer"
                >
                  {format(dailyDate, 'MMM d, yyyy')}
                </DatePicker>
              </div>
              <button onClick={() => handleDailyDateChange(addDays(dailyDate, 1))} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"><ChevronRight size={16} /></button>
              <button 
                onClick={() => handleDailyDateChange(new Date())}
                className="p-1 text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 rounded transition-colors"
                title="Return to Today"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Daily Gains Summary */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
              <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full">Gold</span>
              <div className="flex items-center gap-1 sm:gap-1.5 text-amber-400 min-w-0">
                <Coins size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                <span className="text-[10px] sm:text-lg font-black font-mono truncate">+{dailyGains.coins}</span>
              </div>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
              <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full">Exp</span>
              <div className="flex items-center gap-1 sm:gap-1.5 text-indigo-400 min-w-0">
                <Zap size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                <span className="text-[10px] sm:text-lg font-black font-mono truncate">+{dailyGains.xp}</span>
              </div>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
              <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full">Time</span>
              <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 min-w-0">
                <Sword size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                <span className="text-[10px] sm:text-lg font-black font-mono truncate">{formatDuration(dailyGains.tasks)}</span>
              </div>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0" title={`Total interruptions: ${dailyGains.distractions} across ${formatDuration(dailyGains.tasks)} focus time`}>
              <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full">Distracted</span>
              <div className="flex items-center gap-0.5 sm:gap-1 text-rose-400 min-w-0">
                <Zap size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                <span className="text-[10px] sm:text-lg font-black font-mono truncate">
                  {dailyGains.tasks > 0 
                    ? (Math.round((dailyGains.distractions / (dailyGains.tasks / 60)) * 10) / 10).toFixed(1) 
                    : (dailyGains.distractions > 0 ? String(dailyGains.distractions) : '0.0')}
                </span>
                <span className="text-[8px] sm:text-xs text-rose-400/80 font-mono -ml-0.5">/h</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {(viewOpts.showDailyBar ?? true) && (
              <div className="h-48 min-h-[192px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <ComposedChart 
                    key={chartKeys.daily}
                    data={dailyData} 
                    onClick={(state) => handleChartClick(state, 'daily')} 
                    margin={{ top: 12, right: dailyLayerMode === 'both' ? 12 : 16, left: 0, bottom: 0 }}
                    style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible' }}
                  >
                    <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#64748b', fontSize: 10 }} />
                    {(dailyLayerMode === 'both' || dailyLayerMode === 'bars') && (
                      <YAxis 
                        yAxisId="time" 
                        orientation="left"
                        domain={dailyTimeAxis.domain} 
                        ticks={dailyTimeAxis.ticks}
                        tickFormatter={formatTimeTick}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                    )}
                    {(dailyLayerMode === 'both' || dailyLayerMode === 'lines') && (
                      <YAxis 
                        yAxisId="distractions" 
                        orientation={dailyLayerMode === 'both' ? 'right' : 'left'} 
                        domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.25))]} 
                        allowDecimals={false} 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={dailyLayerMode === 'both' ? 20 : 28}
                      />
                    )}
                    <Tooltip 
                      key={chartKeys.daily}
                      trigger="click"
                      content={<CustomDailyTooltip dateTimestamp={dailyDate.getTime()} allData={dailyData} activeChart={activeChart} chartId="daily" />}
                      cursor={false}
                      wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                    {(dailyLayerMode === 'both' || dailyLayerMode === 'bars') && (
                      <Bar yAxisId="time" dataKey="sessions" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {dailyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    )}
                    {dailyLayerMode === 'lines' && (
                      <Bar yAxisId="distractions" dataKey="distractions" isAnimationActive={false}>
                        {dailyData.map((_, index) => (
                          <Cell key={`transparent-daily-cell-${index}`} fill="transparent" fillOpacity={0} stroke="transparent" />
                        ))}
                      </Bar>
                    )}
                    {(dailyLayerMode === 'both' || dailyLayerMode === 'lines') && (
                      <>
                        <Line 
                          yAxisId="distractions" 
                          type="monotone" 
                          dataKey="internal" 
                          stroke="#818cf8" 
                          strokeWidth={2} 
                          isAnimationActive={false}
                          dot={{ fill: '#818cf8', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                          activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#818cf8' }}
                          name="Internal"
                        />
                        <Line 
                          yAxisId="distractions" 
                          type="monotone" 
                          dataKey="external" 
                          stroke="#fb923c" 
                          strokeWidth={2} 
                          isAnimationActive={false}
                          dot={{ fill: '#fb923c', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                          activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#fb923c' }}
                          name="External"
                        />
                        <Line 
                          yAxisId="distractions" 
                          type="monotone" 
                          dataKey="unavoidable" 
                          stroke="#ef4444" 
                          strokeWidth={2} 
                          isAnimationActive={false}
                          dot={{ fill: '#ef4444', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                          activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#ef4444' }}
                          name="Unavoidable"
                        />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {(viewOpts.showDailyDonut) && (
              <DailyPieChart 
                date={dailyDate} 
                sessions={dailySessions} 
                dungeons={dungeons} 
                majorDungeons={majorDungeons} 
                mode={viewOpts.dailyDonutMode || 'compact'} 
                includeRestTimeInTasks={!!state.includeRestTimeInTasks}
                timeSettings={state.timeSettings}
              />
            )}
          </div>

          {/* Daily Log Section */}
          <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="text-amber-400" size={16} />
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Daily Record</span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenJournal && (
                  <button
                    onClick={onOpenJournal}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider transition-all group"
                    title="Open Dedicated Journal Page"
                  >
                    <BookOpen size={12} className="group-hover:scale-110 transition-transform" />
                    <span>Journal</span>
                    <ChevronRight size={12} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
                {!isEditingLog ? (
                  <button 
                    onClick={startEditing}
                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                    title="Edit Record"
                  >
                    <Edit2 size={14} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center gap-0 h-[26px]">
                      {renderTemplateControls()}
                    </div>
                    
                    <button 
                      onClick={() => setIsMarkdownPreview(!isMarkdownPreview)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        isMarkdownPreview ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"
                      )}
                    >
                      {isMarkdownPreview ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>MD</span>
                    </button>
                    <button 
                      onClick={saveLog}
                      className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                    >
                      <Save size={14} />
                    </button>
                    <button 
                      onClick={saveLog}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Finish and Auto-save"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isEditingLog ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-5">
                  {/* Efficiency Edit */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5 mb-1">Efficiency</div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const val = i + 1;
                        const isFull = editRating >= val;
                        const isHalf = editRating >= val - 0.5 && editRating < val;
                        return (
                          <button
                            key={val}
                            onClick={() => setEditRating(isFull ? val - 0.5 : isHalf ? val - 1 : val)}
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            {isFull ? (
                              <Star size={18} className="text-amber-400 fill-amber-400" />
                            ) : isHalf ? (
                              <StarHalf size={18} className="text-amber-400 fill-amber-400" />
                            ) : (
                              <Star size={18} className="text-slate-700" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Feelings Edit */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5 mb-1">Feelings</div>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar items-center">
                      {MOOD_OPTIONS.filter(m => (state.enabledMoods || DEFAULT_ENABLED_MOODS).includes(m.id)).map((m) => {
                        const isSelected = editMood === m.id;
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setEditMood(isSelected ? undefined : m.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap",
                              isSelected 
                                ? `${m.bg} ${m.border} ${m.color} scale-105 shadow-lg` 
                                : "bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                            )}
                          >
                            <Icon size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className={cn("grid gap-4", isMarkdownPreview ? "grid-cols-1" : "grid-cols-1")}>
                  <div className="relative">
                    <textarea
                      value={editReflection}
                      onChange={(e) => setEditReflection(e.target.value)}
                      className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all resize-none custom-scrollbar"
                      placeholder="Reflect on your day..."
                    />
                    <button
                      onClick={() => setIsFullscreenEdit(true)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
                      title="Fullscreen Edit"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                  {isMarkdownPreview && editReflection && (
                    <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl overflow-y-auto max-h-32 custom-scrollbar">
                      <div className="prose prose-invert prose-sm max-w-none text-slate-200 prose-p:text-slate-200 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-li:text-slate-200 prose-ol:text-slate-200 prose-ul:text-slate-200 marker:text-slate-200 marker:font-bold">
                        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editReflection}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  {/* Efficiency Rating Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Efficiency</span>
                    <div className="flex items-center gap-1">
                      {currentLog ? (
                        Array.from({ length: 5 }).map((_, i) => {
                          const val = i + 1;
                          if (val <= currentLog.rating) return <Star key={i} size={15} className="text-amber-400 fill-amber-400" />;
                          if (val - 0.5 === currentLog.rating) return <StarHalf key={i} size={15} className="text-amber-400 fill-amber-400" />;
                          return <Star key={i} size={15} className="text-slate-800" />;
                        })
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">No rating</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Daily Feeling Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Feelings</span>
                    {currentLog?.mood ? (() => {
                      const moodObj = MOOD_OPTIONS.find(m => m.id === currentLog.mood);
                      if (!moodObj) return <span className="text-[10px] text-slate-600 italic uppercase">None</span>;
                      const Icon = moodObj.icon;
                      return (
                        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md border", moodObj.bg, moodObj.border, moodObj.color)}>
                          <Icon size={10} />
                          <span className="text-[9px] font-black uppercase tracking-wider">{moodObj.label}</span>
                        </div>
                      );
                    })() : (
                      <span className="text-[10px] text-slate-600 italic uppercase">None</span>
                    )}
                  </div>
                </div>

                {shareConfig.showReflection && (
                  <div className="text-sm text-slate-300 leading-relaxed pt-3 border-t border-slate-900">
                    {currentLog?.reflection ? (
                      <div className="prose prose-invert prose-sm max-w-none text-slate-200 prose-p:text-slate-200 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-li:text-slate-200 prose-ol:text-slate-200 prose-ul:text-slate-200 marker:text-slate-200 marker:font-bold">
                        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{currentLog.reflection}</Markdown>
                      </div>
                    ) : (
                      <p className="italic text-xs text-slate-600">The day's reflections are yet to be chronicled.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Weekly */}
        {shareConfig.showWeekly && (
          <div id="weekly-activity-section" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
            <div className="flex flex-wrap items-center justify-between md:justify-start gap-2.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-indigo-400" size={20} />
                <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Weekly</h3>
              </div>
              <div className="relative bg-slate-800/50 hover:bg-slate-700 transition-colors rounded-lg flex items-center p-0.5 sm:p-1 cursor-pointer group">
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest text-indigo-400 group-hover:text-indigo-300 whitespace-nowrap pointer-events-none flex items-center gap-1">
                  {weeklyMode === 'calendar' ? 'Natural' : 'Last 7d'}
                  <ChevronDown size={12} className="opacity-70" />
                </span>
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={weeklyMode}
                  onChange={(e) => setWeeklyMode(e.target.value as 'calendar' | 'rolling')}
                >
                  <option value="calendar">Natural</option>
                  <option value="rolling">Last 7d</option>
                </select>
              </div>

              <div className="relative bg-slate-800/50 hover:bg-slate-700 transition-colors rounded-lg flex items-center p-0.5 sm:p-1 cursor-pointer group" title="Layer Mode">
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest text-indigo-400 group-hover:text-indigo-300 whitespace-nowrap pointer-events-none flex items-center gap-1">
                  {weeklyLayerMode === 'both' && 'Both'}
                  {weeklyLayerMode === 'bars' && 'Time'}
                  {weeklyLayerMode === 'lines' && 'Distractions'}
                  <ChevronDown size={12} className="opacity-70" />
                </span>
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={weeklyLayerMode}
                  onChange={(e) => setWeeklyLayerMode(e.target.value as 'both' | 'bars' | 'lines')}
                >
                  <option value="both">Both</option>
                  <option value="bars">Time</option>
                  <option value="lines">Distractions</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1 w-full md:w-auto shrink-0">
              <button onClick={() => {
                setWeeklyDate(subDays(weeklyDate, 7));
              }} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"><ChevronLeft size={16} /></button>
              <div className="relative flex items-center justify-center flex-1 sm:flex-none">
                <DatePicker 
                  value={format(weeklyDate, 'yyyy-MM-dd')}
                  onChange={(val) => val && setWeeklyDate(parseISO(val))}
                  indicators={dateIndicators}
                  className="text-[10px] sm:text-xs font-bold text-slate-300 w-[90px] sm:w-28 text-center hover:text-indigo-400 transition-colors inline-block whitespace-nowrap cursor-pointer"
                >
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                </DatePicker>
              </div>
              <button onClick={() => {
                setWeeklyDate(addDays(weeklyDate, 7));
              }} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"><ChevronRight size={16} /></button>
              <button 
                onClick={() => setWeeklyDate(new Date())}
                className="p-1 text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 rounded transition-colors"
                title="Return to Today"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Weekly Gains Summary */}
          {(() => {
            const weeklyDivisor = viewOpts.averageCalculationBase === 'active_days' 
              ? weeklyActiveDaysCount 
              : Math.max(1, weeklyDays.length);
            return (
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">Avg Gold</span>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-amber-400 min-w-0">
                    <Coins size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                    <span className="text-[10px] sm:text-lg font-black font-mono truncate">+{Math.round(weeklyGains.coins / weeklyDivisor)}</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">Avg Exp</span>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-indigo-400 min-w-0">
                    <Zap size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                    <span className="text-[10px] sm:text-lg font-black font-mono truncate">+{Math.round(weeklyGains.xp / weeklyDivisor)}</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">Avg Time</span>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 min-w-0">
                    <Sword size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                    <span className="text-[10px] sm:text-lg font-black font-mono truncate">{formatDuration(Math.round(weeklyGains.tasks / weeklyDivisor))}</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0" title={`Total interruptions: ${weeklyGains.distractions} across ${formatDuration(weeklyGains.tasks)} focus time`}>
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">Avg Distracted</span>
                  <div className="flex items-center gap-0.5 sm:gap-1 text-rose-400 min-w-0">
                    <Zap size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
                    <span className="text-[10px] sm:text-lg font-black font-mono truncate">
                      {weeklyGains.tasks > 0 
                        ? (Math.round((weeklyGains.distractions / (weeklyGains.tasks / 60)) * 10) / 10).toFixed(1) 
                        : (weeklyGains.distractions > 0 ? String(weeklyGains.distractions) : '0.0')}
                    </span>
                    <span className="text-[8px] sm:text-xs text-rose-400/80 font-mono -ml-0.5">/h</span>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div className="space-y-6">
            {(viewOpts.showWeeklyBar ?? true) && (
              <>
                <div className="h-48 min-h-[192px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <ComposedChart 
                      key={chartKeys.weeklyBar}
                      data={weeklyData} 
                      onClick={(state) => handleChartClick(state, 'weeklyBar')} 
                      margin={{ top: 12, right: weeklyLayerMode === 'both' ? 12 : 16, left: 0, bottom: 0 }}
                      style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible' }}
                    >
                      <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#64748b', fontSize: 10 }} />
                      {(weeklyLayerMode === 'both' || weeklyLayerMode === 'bars') && (
                        <YAxis 
                          yAxisId="time" 
                          orientation="left"
                          domain={weeklyTimeAxis.domain} 
                          ticks={weeklyTimeAxis.ticks}
                          tickFormatter={formatTimeTick}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={32}
                        />
                      )}
                      {(weeklyLayerMode === 'both' || weeklyLayerMode === 'lines') && (
                        <YAxis 
                          yAxisId="distractions" 
                          orientation={weeklyLayerMode === 'both' ? 'right' : 'left'} 
                          domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.25))]} 
                          allowDecimals={false} 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={weeklyLayerMode === 'both' ? 20 : 28}
                        />
                      )}
                      <Tooltip 
                        key={chartKeys.weeklyBar}
                        trigger="click"
                        content={<CustomWeeklyTooltip allData={weeklyData} activeChart={activeChart} chartId="weeklyBar" />}
                        cursor={false}
                        wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                        allowEscapeViewBox={{ x: true, y: true }}
                      />
                      {(weeklyLayerMode === 'both' || weeklyLayerMode === 'bars') && (
                        <>
                          <Bar yAxisId="time" dataKey="Morning" stackId="a" fill="#fde047" isAnimationActive={false} />
                          <Bar yAxisId="time" dataKey="Afternoon" stackId="a" fill="#f97316" isAnimationActive={false} />
                          <Bar yAxisId="time" dataKey="Night" stackId="a" fill="#6366f1" isAnimationActive={false} />
                          {state.showOtherInActivityLog !== false && (
                            <Bar yAxisId="time" dataKey="Other" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          )}
                          {/* Mood Icon Layer - Stacked with 0 height to stay at the top */}
                          <Bar yAxisId="time" dataKey="moodHeight" stackId="a" fill="transparent" isAnimationActive={false}>
                            <LabelList content={renderMoodIcon} />
                          </Bar>
                        </>
                      )}
                      {weeklyLayerMode === 'lines' && (
                        <Bar yAxisId="distractions" dataKey="distractions" isAnimationActive={false}>
                          {weeklyData.map((_, index) => (
                            <Cell key={`transparent-weekly-cell-${index}`} fill="transparent" fillOpacity={0} stroke="transparent" />
                          ))}
                        </Bar>
                      )}
                      {(weeklyLayerMode === 'both' || weeklyLayerMode === 'lines') && (
                        <>
                          <Line 
                            yAxisId="distractions" 
                            type="monotone" 
                            dataKey="internal" 
                            stroke="#818cf8" 
                            strokeWidth={2} 
                            isAnimationActive={false}
                            dot={{ fill: '#818cf8', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                            activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#818cf8' }}
                            name="Internal"
                          />
                          <Line 
                            yAxisId="distractions" 
                            type="monotone" 
                            dataKey="external" 
                            stroke="#fb923c" 
                            strokeWidth={2} 
                            isAnimationActive={false}
                            dot={{ fill: '#fb923c', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                            activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#fb923c' }}
                            name="External"
                          />
                          <Line 
                            yAxisId="distractions" 
                            type="monotone" 
                            dataKey="unavoidable" 
                            stroke="#ef4444" 
                            strokeWidth={2} 
                            isAnimationActive={false}
                            dot={{ fill: '#ef4444', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                            activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#ef4444' }}
                            name="Unavoidable"
                          />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="text-indigo-400" size={16} />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Efficiency Trend</span>
                  </div>
                  <div className="h-32 min-h-[128px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <LineChart 
                        key={chartKeys.weeklyLine}
                        data={weeklyData} 
                        margin={{ top: 12, right: weeklyLayerMode === 'both' ? 12 : 16, left: 0, bottom: 0 }} 
                        onClick={(state) => handleChartClick(state, 'weeklyLine')} 
                        style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis 
                          domain={state.efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency' ? [0, 100] : [0, 5]} 
                          ticks={state.efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency' ? [0, 25, 50, 75, 100] : [1, 2, 3, 4, 5]} 
                          allowDecimals={false}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={32}
                          tickFormatter={state.efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency' ? (val) => `${val}%` : (val) => String(val)}
                        />
                        <Tooltip 
                          key={chartKeys.weeklyLine}
                          trigger="click"
                          content={<CustomWeeklyTooltip allData={weeklyData} activeChart={activeChart} chartId="weeklyLine" />}
                          cursor={false}
                          wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                          allowEscapeViewBox={{ x: true, y: true }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={(d) => {
                            if (state.efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency') {
                              return Math.round((d.efficiency || 0) * 20); // Scale 0-5 stars to 0-100%
                            }
                            return d.efficiency || 0;
                          }}
                          stroke="var(--color-indigo-500, #6366f1)" 
                          strokeWidth={2.5} 
                          isAnimationActive={false}
                          dot={{ fill: 'var(--color-indigo-500, #6366f1)', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                          activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: 'var(--color-indigo-400, #818cf8)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {viewOpts.showWeeklyDonut && (
              <WeeklyPieChart 
                weekSessions={processedHistory.filter(s => {
                  return isWithinInterval(s.assignedDate, {
                    start: weekStart,
                    end: weekEnd
                  });
                })} 
                mode={viewOpts.weeklyDonutMode || 'time_of_day'} 
                includeRestTimeInTasks={!!state.includeRestTimeInTasks}
                timeSettings={state.timeSettings}
              />
            )}
          </div>
        </div>
        )}
      </div>

      {(shareConfig.showRoutine && (viewOpts.showRoutineTracker ?? true)) && (
        <div id="routine-tracker-section" className="w-full">
          <RoutineTracker 
            history={state.history} 
            dungeons={dungeons} 
            majorDungeons={majorDungeons} 
            timeSettings={state.timeSettings}
            timezone={state.timezone}
            hiddenRoutines={viewOpts.hiddenRoutines || []}
            onUpdateHiddenRoutines={onUpdateState ? (ids) => onUpdateState({ statsViewOpts: { ...viewOpts, hiddenRoutines: ids } }) : undefined}
            renderPopover={(date, routineId, onClose) => (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-auto z-[100]">
                <RoutineCellEditor 
                  date={date} 
                  routineId={routineId} 
                  history={state.history} 
                  dungeons={dungeons} 
                  majorDungeons={majorDungeons} 
                  onUpdateState={onUpdateState} 
                  deleteSession={deleteSession} 
                  completeSession={completeSession}
                  timezone={state.timezone}
                  timeSettings={state.timeSettings}
                  onClose={onClose}
                />
              </div>
            )}
          />
        </div>
      )}

      {(viewOpts.showSleepTracker ?? true) && (
        <div id="sleep-tracker-section" className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-6 w-full flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-4">
            <div className="flex items-center gap-2">
              <Moon className="text-indigo-400" size={20} />
              <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Sleep Tracker</h3>
              <div className="relative bg-slate-800/50 hover:bg-slate-700 transition-colors rounded-lg flex items-center p-0.5 sm:p-1 cursor-pointer group ml-2">
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest text-indigo-400 group-hover:text-indigo-300 whitespace-nowrap pointer-events-none flex items-center gap-1">
                  {sleepMode === 'calendar' ? 'Natural' : 'Last 7d'}
                  <ChevronDown size={12} className="opacity-70" />
                </span>
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={sleepMode}
                  onChange={(e) => setSleepMode(e.target.value as 'calendar' | 'rolling')}
                >
                  <option value="calendar">Natural</option>
                  <option value="rolling">Last 7d</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
              <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1">
                <button onClick={() => {
                  setSleepDate(subDays(sleepDate, 7));
                }} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"><ChevronLeft size={16} /></button>
                <div className="relative flex items-center justify-center">
                  <DatePicker 
                    value={format(sleepDate, 'yyyy-MM-dd')}
                    onChange={(val) => val && setSleepDate(parseISO(val))}
                    indicators={dateIndicators}
                    className="text-[10px] sm:text-xs font-bold text-slate-300 w-[90px] sm:w-28 text-center hover:text-indigo-400 transition-colors inline-block whitespace-nowrap cursor-pointer"
                  >
                    {format(sleepStart, 'MMM d')} - {format(sleepEnd, 'MMM d')}
                  </DatePicker>
                </div>
                <button onClick={() => {
                  setSleepDate(addDays(sleepDate, 7));
                }} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"><ChevronRight size={16} /></button>
                <button 
                  onClick={() => setSleepDate(new Date())}
                  className="p-1 text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 rounded transition-colors"
                  title="Return to Today"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <button
                onClick={() => setShowBulkSleepModal(true)}
                className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors ml-2"
              >
                <Edit2 size={14} />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline">Edit</span>
              </button>
            </div>
          </div>
          <div className="h-80 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart 
                key={chartKeys.sleep}
                data={sleepData} 
                onClick={(state) => handleChartClick(state, 'sleep')}
                style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible', cursor: 'pointer' }} 
                margin={{ top: 10, right: -5, left: -30, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis 
                   yAxisId="right" 
                   orientation="right" 
                   domain={[0, 24]}
                   tickCount={7}
                   tick={{ fill: '#64748b', fontSize: 9 }} 
                   axisLine={false} 
                   tickLine={false} 
                   tickFormatter={(val) => `${val}h`} 
                />
                <YAxis
                   yAxisId="left"
                   orientation="left"
                   domain={[4, 40]}
                   tickCount={7}
                   tick={{ fill: '#64748b', fontSize: 9 }}
                   axisLine={false}
                   tickLine={false}
                   scale="time"
                   tickFormatter={(val) => {
                     let h = Math.floor(val);
                     const m = Math.round((val - h) * 60);
                     if (h >= 24) h -= 24;
                     return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                   }}
                />
                 <Tooltip
                  key={chartKeys.sleep}
                  trigger="click"
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  content={<CustomSleepTooltip activeChart={activeChart} chartId="sleep" />}
                  cursor={false}
                />
                <Bar yAxisId="right" dataKey="duration" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.5} barSize={20} />
                <Line yAxisId="left" type="linear" dataKey="sleepTime" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#1e293b' }} />
                <Line yAxisId="left" type="linear" dataKey="wakeTime" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fbbf24' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Sleep Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] sm:text-xs text-slate-400 font-medium pt-2 border-t border-slate-800/30">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded-sm bg-[#818cf8]" style={{ opacity: 0.5 }} />
              <span>Sleep Duration (h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#6366f1]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-[#6366f1] -ml-2.5" />
              <span>Fell Asleep</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#fbbf24]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-[#fbbf24] -ml-2.5" />
              <span>Woke Up</span>
            </div>
          </div>
        </div>
      )}

      {/* Study Heatmap */}
      {(shareConfig.showHeatmap && (viewOpts.showHeatmap ?? true)) && (
        <div id="heatmap-section" className="bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-800 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/50 pb-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <Flame className="text-indigo-400" size={20} />
                <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Heatmap</h3>
              </div>
              <div className="flex bg-slate-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setHeatmapMetric('time')}
                  className={cn(
                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                    heatmapMetric === 'time' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Study Time
                </button>
                <button
                  onClick={() => setHeatmapMetric('efficiency')}
                  className={cn(
                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                    heatmapMetric === 'efficiency' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Efficiency
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex bg-slate-800/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                {(['30days', 'month', 'year'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setHeatmapMode(mode)}
                    className={cn(
                      "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-xs font-bold rounded-md transition-all capitalize whitespace-nowrap",
                      heatmapMode === mode ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {mode === '30days' ? '30 Days' : mode}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-800/50 rounded-lg p-1 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    if (heatmapMode === '30days') setHeatmapDate(subDays(heatmapDate, 30));
                    else if (heatmapMode === 'month') setHeatmapDate(subMonths(heatmapDate, 1));
                    else setHeatmapDate(subYears(heatmapDate, 1));
                  }} 
                  className="p-2 sm:p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="relative flex items-center justify-center flex-1 sm:flex-none">
                  <DatePicker 
                    value={format(heatmapDate, 'yyyy-MM-dd')}
                    onChange={(val) => val && setHeatmapDate(parseISO(val))}
                    indicators={dateIndicators}
                    className="text-xs font-bold text-slate-300 w-full sm:w-36 text-center hover:text-indigo-400 transition-colors py-1 inline-block whitespace-nowrap cursor-pointer"
                  >
                    {heatmapMode === '30days' ? `${format(subDays(heatmapDate, 29), 'MMM dd')} - ${format(heatmapDate, 'MMM dd')}` : heatmapMode === 'month' ? format(heatmapDate, 'MMM yyyy') : format(heatmapDate, 'yyyy')}
                  </DatePicker>
                </div>
                <button 
                  onClick={() => {
                    if (heatmapMode === '30days') setHeatmapDate(addDays(heatmapDate, 30));
                    else if (heatmapMode === 'month') setHeatmapDate(addMonths(heatmapDate, 1));
                    else setHeatmapDate(addYears(heatmapDate, 1));
                  }} 
                  className="p-2 sm:p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
          
          <div className={cn(
             "flex flex-col gap-6 w-full mt-4",
             heatmapMode === 'year' 
               ? "items-center justify-center" 
               : "lg:flex-row lg:items-stretch justify-center"
          )}>
            <style>{`
              .heatmap-responsive {
                 --cell-size: min(9vw, 36px);
                 --cell-gap: 4px;
                 --cell-radius: 4px;
                 --label-size: 10px;
                 --mood-size: calc(var(--cell-size) * 0.6);
              }
              @media (min-width: 380px) {
                 .heatmap-responsive {
                   --cell-size: min(10vw, 42px);
                   --cell-gap: 5px;
                   --cell-radius: 5px;
                 }
              }
              @media (min-width: 640px) {
                 .heatmap-responsive {
                   --cell-size: 32px;
                   --cell-gap: 6px;
                   --cell-radius: 6px;
                   --label-size: 11px;
                   --mood-size: 20px;
                 }
              }
              @media (min-width: 768px) {
                 .heatmap-responsive {
                   --cell-size: 40px;
                   --cell-gap: 6px;
                   --cell-radius: 8px;
                   --label-size: 12px;
                   --mood-size: 24px;
                 }
              }
              .heatmap-year {
                 --cell-size: 10px;
                 --cell-gap: 2px;
                 --cell-radius: 2px;
                 --label-size: 9px;
                 --mood-size: 8px;
              }
              @media (min-width: 640px) {
                 .heatmap-year {
                   --cell-size: 12px;
                   --cell-gap: 3px;
                   --cell-radius: 2px;
                   --label-size: 10px;
                   --mood-size: 10px;
                 }
              }
              @media (min-width: 1024px) {
                 .heatmap-year {
                   --cell-size: 14px;
                   --cell-gap: 3px;
                   --cell-radius: 3px;
                   --label-size: 11px;
                   --mood-size: 12px;
                 }
              }
              @media (min-width: 1280px) {
                 .heatmap-year {
                   --cell-size: 16px;
                   --cell-gap: 4px;
                   --cell-radius: 3px;
                   --label-size: 12px;
                   --mood-size: 14px;
                 }
              }
            `}</style>
            
            <div className="overflow-x-auto pb-4 custom-scrollbar w-full lg:w-auto flex justify-start lg:justify-center">
              <div className={cn("min-w-max flex mx-auto", heatmapMode === 'year' ? "heatmap-year gap-1.5" : "heatmap-responsive gap-2")}>
                <div 
                   className="grid grid-rows-7 text-slate-500 font-medium pr-1 text-right mt-6"
                   style={{ rowGap: 'var(--cell-gap)', fontSize: 'var(--label-size)' }}
                >
                   <div style={{ height: 'var(--cell-size)' }} className="flex items-center justify-end leading-none">Mon</div>
                   <div style={{ height: 'var(--cell-size)' }} className="invisible" />
                   <div style={{ height: 'var(--cell-size)' }} className="flex items-center justify-end leading-none">Wed</div>
                   <div style={{ height: 'var(--cell-size)' }} className="invisible" />
                   <div style={{ height: 'var(--cell-size)' }} className="flex items-center justify-end leading-none">Fri</div>
                   <div style={{ height: 'var(--cell-size)' }} className="invisible" />
                   <div style={{ height: 'var(--cell-size)' }} className="invisible" />
                </div>
                
                <div className="flex flex-col">
                   <div className="h-6 relative">
                     {heatmapMonthLabels.map((label, i) => (
                       <span
                         key={i}
                         className="absolute text-slate-500 font-medium"
                         style={{ 
                            left: `calc(${label.colIndex} * (var(--cell-size) + var(--cell-gap)))`, 
                            bottom: '4px',
                            fontSize: 'var(--label-size)'
                         }}
                       >
                         {label.month}
                       </span>
                     ))}
                   </div> 
                   <div className="grid grid-rows-7 grid-flow-col justify-start auto-cols-max" style={{ gap: 'var(--cell-gap)' }}>
                     {Array.from({ length: (heatmapDays[0].getDay() + 6) % 7 }).map((_, i) => (
                       <div key={`empty-${i}`} className="border border-transparent" style={{ width: 'var(--cell-size)', height: 'var(--cell-size)' }} />
                     ))}
                     {heatmapDays.map((date, i) => {
                       const log = dailyLogs[format(date, 'yyyy-MM-dd')];
                       const moodObj = log?.mood ? MOOD_OPTIONS.find((m) => m.id === log.mood) : null;
                       const MoodIcon = moodObj ? moodObj.icon : null;
                       return (
                         <div
                           key={i}
                           className="relative heatmap-cell-container flex items-center justify-center"
                           style={{ width: 'var(--cell-size)', height: 'var(--cell-size)' }}
                         >
                           <button
                             type="button"
                             onClick={(e) => {
                               if (heatmapPopoverAnchor?.date === date.getTime()) {
                                 setHeatmapPopoverAnchor(null);
                               } else {
                                 setHeatmapPopoverAnchor({ date: date.getTime(), element: e.currentTarget });
                               }
                             }}
                             className={cn(
                               "transition-all cursor-pointer outline-none flex items-center justify-center relative overflow-hidden",
                               getIntensity(date)
                             )}
                             style={{ 
                               width: '100%', 
                               height: '100%',
                               borderRadius: 'var(--cell-radius)',
                               boxShadow: heatmapPopoverAnchor?.date === date.getTime() ? '0 0 0 2px #818cf8' : 'none',
                               transform: heatmapPopoverAnchor?.date === date.getTime() ? 'scale(1.25)' : 'none',
                               zIndex: heatmapPopoverAnchor?.date === date.getTime() ? 10 : 1
                             }}
                           >
                             {showHeatmapMood && MoodIcon && (
                                <MoodIcon 
                                   className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md text-white" 
                                   color="white" 
                                   strokeWidth={2.5}
                                   style={{ width: 'var(--mood-size)', height: 'var(--mood-size)' }}
                                />
                             )}
                           </button>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>
            </div>

            {(heatmapMode === '30days' || heatmapMode === 'month' || heatmapMode === 'year') && heatmapSummary && (
               <div className={cn(
                  "shrink-0 flex flex-col bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800/60 mb-4",
                  heatmapMode === 'year' ? "w-full max-w-2xl mx-auto" : "w-full lg:w-72 lg:mb-0"
               )}>
                 <div className="flex items-center justify-center gap-2 pb-3 border-b border-slate-800/50 mb-4">
                    <CalendarDays size={14} className="text-indigo-400 shrink-0" />
                    <span className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-wide leading-none italic pr-1 select-none">
                       {heatmapMode === '30days' ? '30 Days Summary' : heatmapMode === 'month' ? 'Month Summary' : 'Year Summary'}
                    </span>
                 </div>
                 
                 <div className={cn(
                    "grid gap-3",
                    heatmapMode === 'year' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-1"
                 )}>
                     <div className={cn(
                        "flex justify-between items-center bg-slate-900/50 px-3 py-2.5 rounded-xl border border-slate-800/40",
                        heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                     )}>
                       <div className="flex items-center gap-2">
                           <Flame size={14} className="text-orange-500" />
                           <span className="text-xs font-bold text-slate-500 uppercase">Focused Days</span>
                       </div>
                       <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black font-mono text-indigo-400">{heatmapSummary.activeDays}</span>
                          <span className="text-xs font-bold text-slate-600">/{heatmapDays.length}</span>
                       </div>
                     </div>

                     {/* Merged Time/Task Stats Card */}
                     <div className={cn(
                        "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                        heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                     )}>
                        <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                           {heatmapMetric === 'time' ? <Clock size={14} className="text-sky-400" /> : <Target size={14} className="text-sky-400" />}
                           <span className="text-xs font-bold text-slate-500 uppercase">
                              {heatmapMetric === 'time' ? 'Study Time' : 'Tasks Completed'}
                           </span>
                        </div>
                        <div className="flex items-center justify-center gap-10 sm:gap-16 py-0.5">
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Total</span>
                              <span className="text-base font-black font-mono text-sky-400">
                                 {heatmapMetric === 'time' ? formatDuration(heatmapSummary.totalTimeOrTasks) : heatmapSummary.totalTimeOrTasks}
                              </span>
                           </div>
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Avg/Day</span>
                              <span className="text-base font-black font-mono text-sky-400/80">
                                 {heatmapMetric === 'time' ? formatDuration(heatmapSummary.avgTimeOrTasks) : Math.round(heatmapSummary.avgTimeOrTasks * 10) / 10}
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Merged Gold Stats Card */}
                     <div className={cn(
                        "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                        heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                     )}>
                        <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                           <Coins size={14} className="text-amber-500" />
                           <span className="text-xs font-bold text-slate-500 uppercase">Gold Earnings</span>
                        </div>
                        <div className="flex items-center justify-center gap-10 sm:gap-16 py-0.5">
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Total</span>
                              <span className="text-base font-black font-mono text-amber-400">+{heatmapSummary.totalGold}</span>
                           </div>
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Avg/Day</span>
                              <span className="text-base font-black font-mono text-amber-400/80">+{heatmapSummary.avgGold}</span>
                           </div>
                        </div>
                     </div>

                     {/* Merged EXP Stats Card */}
                     <div className={cn(
                        "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                        heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                     )}>
                        <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                           <Zap size={14} className="text-indigo-400" />
                           <span className="text-xs font-bold text-slate-500 uppercase">EXP Earnings</span>
                        </div>
                        <div className="flex items-center justify-center gap-10 sm:gap-16 py-0.5">
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Total</span>
                              <span className="text-base font-black font-mono text-indigo-400">+{heatmapSummary.totalExp}</span>
                           </div>
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Avg/Day</span>
                              <span className="text-base font-black font-mono text-indigo-400/80">+{heatmapSummary.avgExp}</span>
                           </div>
                        </div>
                     </div>

                     {/* Merged Distractions Stats Card */}
                     <div className={cn(
                        "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                        heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                     )}>
                        <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                           <Zap size={14} className="text-rose-400" />
                           <span className="text-xs font-bold text-slate-500 uppercase">Distractions</span>
                        </div>
                        <div className="flex items-center justify-center gap-10 sm:gap-16 py-0.5">
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Total</span>
                              <span className="text-base font-black font-mono text-rose-400">{heatmapSummary.totalDistractions}</span>
                           </div>
                           <div className="flex flex-col items-center text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Avg/h</span>
                              <span className="text-base font-black font-mono text-rose-400/80">
                                {heatmapSummary.totalTimeOrTasks > 0 
                                  ? (heatmapSummary.avgDistractionsPerHour).toFixed(1) 
                                  : (heatmapSummary.totalDistractions > 0 ? String(heatmapSummary.totalDistractions) : '0.0')}
                              </span>
                           </div>
                        </div>
                     </div>
                 </div>
               </div>
            )}
          </div>
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500 uppercase font-bold px-2">
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300 transition-colors">
              <input 
                type="checkbox" 
                className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer" 
                checked={showHeatmapMood} 
                onChange={(e) => setShowHeatmapMood(e.target.checked)} 
              />
              Show Mood
            </label>
            <div className="flex items-center space-x-2">
              <span>Less</span>
              <div className="w-3 h-3 rounded-[2px] bg-slate-800/50" />
              <div className="w-3 h-3 rounded-[2px] bg-indigo-500/20" />
              <div className="w-3 h-3 rounded-[2px] bg-indigo-500/40" />
              <div className="w-3 h-3 rounded-[2px] bg-indigo-500/70" />
              <div className="w-3 h-3 rounded-[2px] bg-indigo-500" />
              <span>More</span>
            </div>
          </div>
          
          <PopoverPortal anchorElement={heatmapPopoverAnchor?.element || null}>
             {heatmapPopoverAnchor && renderHeatmapPopover(new Date(heatmapPopoverAnchor.date))}
          </PopoverPortal>
        </div>
      )}

      {showBulkSleepModal && (
        <BulkSleepModal
          state={state}
          onClose={() => setShowBulkSleepModal(false)}
          onSave={(dateStr, sleepTime, wakeTime, sleepDurationMin) => {
             const existing = state.dailyLogs?.[dateStr] || {};
             if (onUpdateState) {
               onUpdateState({
                 dailyLogs: {
                   ...(state.dailyLogs || {}),
                   [dateStr]: {
                     rating: 0,
                     reflection: '',
                     ...existing,
                     sleepTime,
                     wakeTime,
                     sleepDurationMin
                   }
                 }
               });
             }
          }}
        />
      )}
      
      <ImmersiveReflectionModal
        isOpen={isFullscreenEdit}
        onClose={() => setIsFullscreenEdit(false)}
        dateString={format(dailyDate, 'MMM d, yyyy')}
        reflection={editReflection}
        setReflection={setEditReflection}
        isMarkdownEnabled={isMarkdownPreview}
        setIsMarkdownEnabled={setIsMarkdownPreview}
        renderTemplateControls={renderTemplateControls}
      />

      {showShareModal && (
        <ShareRecordModal 
          onClose={() => {
            setShowShareModal(false);
            setShareConfig({
              showDaily: true,
              showWeekly: true,
              showRoutine: true,
              showHeatmap: true,
              showReflection: true,
              showSleep: true,
              aspectRatio: 'auto'
            });
          }} 
          containerRef={statsContainerRef} 
          config={shareConfig}
          setConfig={setShareConfig}
          dailyLogs={state.dailyLogs || {}}
          indicators={dateIndicators}
        />
      )}

      <ViewSettingsModal 
        isOpen={showViewSettings}
        onClose={() => setShowViewSettings(false)}
        opts={viewOpts}
        onUpdate={(updates) => onUpdateState?.({ statsViewOpts: { ...viewOpts, ...updates } })}
      />

      {showDailySessionsDate && (
        <DailySessionsModal 
          isOpen={!!showDailySessionsDate}
          onClose={() => {
            setShowDailySessionsDate(null);
            setShowDailySessionsPeriod(undefined);
          }}
          date={showDailySessionsDate}
          history={processedHistory}
          dungeons={dungeons}
          majorDungeons={majorDungeons}
          updateSession={updateSession || (() => {})}
          deleteSession={deleteSession || (() => {})}
          rewardPool={state.rewardPool || []}
          timeSettings={state.timeSettings}
          period={showDailySessionsPeriod}
          includeRestTimeInTasks={state.includeRestTimeInTasks}
        />
      )}
    </div>
  );
});
