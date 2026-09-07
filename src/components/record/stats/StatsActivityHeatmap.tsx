import React, { useMemo } from 'react';
import { 
  format, 
  subDays, 
  addDays, 
  subMonths, 
  addMonths, 
  subYears, 
  addYears, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  eachDayOfInterval, 
  parseISO 
} from 'date-fns';
import { 
  Flame, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Clock, 
  Target, 
  Coins, 
  Zap 
} from 'lucide-react';
import { AppState, StudySession, DailyLog } from '../../../types';
import { cn, getSessionEffectiveMinutes, getSessionDistractionCount } from '../../../lib/utils';
import { DatePicker } from '../../common/DatePicker';
import { MOOD_OPTIONS } from '../../../constants';
import { PopoverPortal } from '../../common/PopoverPortal';

interface StatsActivityHeatmapProps {
  state: AppState;
  history: StudySession[];
  dailyLogs: Record<string, DailyLog>;
  dateIndicators?: Record<string, { highlight?: boolean; star?: boolean }>;
  getSessionsForDate: (date: Date) => StudySession[];
  renderHeatmapPopover: (date: Date) => React.ReactNode;
  heatmapDate: Date;
  setHeatmapDate: React.Dispatch<React.SetStateAction<Date>>;
  heatmapMode: '30days' | 'month' | 'year';
  setHeatmapMode: (mode: '30days' | 'month' | 'year') => void;
  heatmapMetric: 'time' | 'efficiency';
  setHeatmapMetric: (metric: 'time' | 'efficiency') => void;
  showHeatmapMood: boolean;
  setShowHeatmapMood: (show: boolean) => void;
  heatmapPopoverAnchor: { date: number; element: HTMLElement } | null;
  setHeatmapPopoverAnchor: React.Dispatch<React.SetStateAction<{ date: number; element: HTMLElement } | null>>;
  formatDuration: (minutes: number) => string;
  viewOpts: {
    averageCalculationBase?: 'active_days' | 'total_days';
  };
}

export const StatsActivityHeatmap: React.FC<StatsActivityHeatmapProps> = ({
  state,
  history,
  dailyLogs,
  dateIndicators,
  getSessionsForDate,
  renderHeatmapPopover,
  heatmapDate,
  setHeatmapDate,
  heatmapMode,
  setHeatmapMode,
  heatmapMetric,
  setHeatmapMetric,
  showHeatmapMood,
  setShowHeatmapMood,
  heatmapPopoverAnchor,
  setHeatmapPopoverAnchor,
  formatDuration,
  viewOpts,
}) => {
  // Days Interval
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

  // Month labels for column headers
  const heatmapMonthLabels = useMemo(() => {
    if (heatmapDays.length === 0) return [];
    const labels: { month: string; colIndex: number }[] = [];
    let currentMonth = -1;
    let currentDayOfWeek = (heatmapDays[0].getDay() + 6) % 7;
    let currentCol = 0;

    for (let i = 0; i < heatmapDays.length; i++) {
      const d = heatmapDays[i];
      if (d.getMonth() !== currentMonth) {
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

      if (count < max * 0.25) return 'bg-indigo-500/20';
      if (count < max * 0.5) return 'bg-indigo-500/40';
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

  const heatmapSummary = useMemo(() => {
    if (heatmapDays.length === 0) return null;
    const startObj = heatmapDays[0];
    const endObj = addDays(heatmapDays[heatmapDays.length - 1], 1);

    const activeDates = new Set<string>();
    let gold = 0;
    let xp = 0;
    let timeOrTasks = 0;
    let distractions = 0;

    history.forEach((session) => {
      const sessionDate = parseISO(session.timestamp || '');
      if (sessionDate >= startObj && sessionDate < endObj) {
        activeDates.add(format(sessionDate, 'yyyy-MM-dd'));
        gold += session.coinsEarned || 0;
        xp += session.xpEarned || 0;
        timeOrTasks += getSessionEffectiveMinutes(session, !!state.includeRestTimeInTasks);
        distractions += getSessionDistractionCount(session.distractions);
      }
    });

    const activeDaysCount = activeDates.size;
    const daysDivisor =
      viewOpts.averageCalculationBase === 'active_days'
        ? activeDaysCount > 0
          ? activeDaysCount
          : 1
        : heatmapDays.length > 0
        ? heatmapDays.length
        : 1;

    return {
      activeDays: activeDaysCount,
      totalTimeOrTasks: timeOrTasks,
      avgTimeOrTasks: Math.round(timeOrTasks / daysDivisor),
      totalGold: gold,
      avgGold: Math.round(gold / daysDivisor),
      totalExp: xp,
      avgExp: Math.round(xp / daysDivisor),
      totalDistractions: distractions,
      avgDistractionsPerHour:
        timeOrTasks > 0 ? Math.round((distractions / (timeOrTasks / 60)) * 10) / 10 : 0,
    };
  }, [heatmapDays, history, state.includeRestTimeInTasks, viewOpts.averageCalculationBase]);

  return (
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
            {(['30days', 'month', 'year'] as const).map((mode) => (
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
                {heatmapMode === '30days'
                  ? `${format(subDays(heatmapDate, 29), 'MMM dd')} - ${format(heatmapDate, 'MMM dd')}`
                  : heatmapMode === 'month'
                  ? format(heatmapDate, 'MMM yyyy')
                  : format(heatmapDate, 'yyyy')}
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

      <div
        className={cn(
          "flex flex-col gap-6 w-full mt-4",
          heatmapMode === 'year'
            ? "items-center justify-center"
            : "lg:flex-row lg:items-stretch justify-center"
        )}
      >
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
                      fontSize: 'var(--label-size)',
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
                  const isSelected = heatmapPopoverAnchor?.date === date.getTime();
                  return (
                    <div
                      key={i}
                      className="relative heatmap-cell-container flex items-center justify-center"
                      style={{ width: 'var(--cell-size)', height: 'var(--cell-size)' }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isSelected) {
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
                          boxShadow: isSelected ? '0 0 0 2px #818cf8' : 'none',
                          transform: isSelected ? 'scale(1.25)' : 'none',
                          zIndex: isSelected ? 10 : 1,
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

        {heatmapSummary && (
          <div
            className={cn(
              "shrink-0 flex flex-col bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800/60 mb-4",
              heatmapMode === 'year' ? "w-full max-w-2xl mx-auto" : "w-full lg:w-72 lg:mb-0"
            )}
          >
            <div className="flex items-center justify-center gap-2 pb-3 border-b border-slate-800/50 mb-4">
              <CalendarDays size={14} className="text-indigo-400 shrink-0" />
              <span className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-wide leading-none italic pr-1 select-none">
                {heatmapMode === '30days' ? '30 Days Summary' : heatmapMode === 'month' ? 'Month Summary' : 'Year Summary'}
              </span>
            </div>

            <div
              className={cn(
                "grid gap-3",
                heatmapMode === 'year' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-1"
              )}
            >
              <div
                className={cn(
                  "flex justify-between items-center bg-slate-900/50 px-3 py-2.5 rounded-xl border border-slate-800/40",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
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
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
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
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
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
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
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
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
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
                        ? heatmapSummary.avgDistractionsPerHour.toFixed(1)
                        : heatmapSummary.totalDistractions > 0
                        ? String(heatmapSummary.totalDistractions)
                        : '0.0'}
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
  );
};
