import React, { useMemo, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { rafThrottle } from '../../../lib/timing';
import { DurationText } from '../../common/DurationText';
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
  _formatDuration: (minutes: number) => string;
  viewOpts: {
    averageCalculationBase?: 'active_days' | 'total_days';
  };
}

/**
 * Tiny per-day bar strip used inside the summary cards. Values are normalised
 * to the largest one so a quiet month still reads as a shape rather than a
 * flat line.
 */
const MiniBars: React.FC<{ values: number[]; barClass: string }> = ({ values, barClass }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px] w-full h-full" aria-hidden="true">
      {values.map((v, i) => (
        <div
          key={i}
          className={cn('flex-1 rounded-[2px]', v > 0 ? barClass : 'bg-slate-800/50')}
          style={{ height: `${v > 0 ? Math.max((v / max) * 100, 12) : 6}%` }}
        />
      ))}
    </div>
  );
};

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
  _formatDuration: __formatDuration,
  viewOpts,
}) => {
  // Hover opens the card, click pins it.
  //
  // Opening on a bare mouseenter would fire a popover per square: the grid is
  // 30–53 squares wide and crossing it to reach a neighbour costs nothing. So a
  // 150ms dwell is required before anything appears, and leaving grants 250ms
  // for the pointer to cross the gap into the card — that grace period is the
  // whole reason the card can be copied from instead of just read.
  const hoverOpenTimer = useRef<number | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const pointerInCardRef = useRef(false);
  const pinnedRef = useRef(false);

  const clearHoverTimers = useCallback(() => {
    if (hoverOpenTimer.current !== null) {
      window.clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimers, [clearHoverTimers]);

  const scheduleCardOpen = useCallback((date: Date, el: HTMLElement) => {
    if (pinnedRef.current) return;
    clearHoverTimers();
    hoverOpenTimer.current = window.setTimeout(() => {
      setHeatmapPopoverAnchor({ date: date.getTime(), element: el });
    }, 150);
  }, [clearHoverTimers, setHeatmapPopoverAnchor]);

  const scheduleCardClose = useCallback(() => {
    if (pinnedRef.current) return;
    clearHoverTimers();
    hoverCloseTimer.current = window.setTimeout(() => {
      if (!pointerInCardRef.current) setHeatmapPopoverAnchor(null);
    }, 250);
  }, [clearHoverTimers, setHeatmapPopoverAnchor]);

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

  // Number of week-columns the grid occupies. The padding cells of the first
  // week are grid items too, so it is not simply days / 7.
  const heatmapColumnCount = useMemo(() => {
    if (heatmapDays.length === 0) return 1;
    const offset = (heatmapDays[0].getDay() + 6) % 7;
    return Math.max(1, Math.ceil((offset + heatmapDays.length) / 7));
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
    // Per-day buckets, keyed by yyyy-MM-dd. Feeds the sparklines and streaks.
    const perDay = new Map<
      string,
      { gold: number; xp: number; minutes: number; distractions: number }
    >();
    let gold = 0;
    let xp = 0;
    let timeOrTasks = 0;
    let distractions = 0;

    history.forEach((session) => {
      const sessionDate = parseISO(session.timestamp || '');
      if (sessionDate >= startObj && sessionDate < endObj) {
        const key = format(sessionDate, 'yyyy-MM-dd');
        const minutes = getSessionEffectiveMinutes(session, !!state.includeRestTimeInTasks);
        const sessionGold = session.coinsEarned || 0;
        const sessionXp = session.xpEarned || 0;
        const sessionDistractions = getSessionDistractionCount(session.distractions);

        activeDates.add(key);
        gold += sessionGold;
        xp += sessionXp;
        timeOrTasks += minutes;
        distractions += sessionDistractions;

        const bucket = perDay.get(key) || { gold: 0, xp: 0, minutes: 0, distractions: 0 };
        bucket.gold += sessionGold;
        bucket.xp += sessionXp;
        bucket.minutes += minutes;
        bucket.distractions += sessionDistractions;
        perDay.set(key, bucket);
      }
    });

    // One entry per day in the window, in chronological order.
    const empty = { gold: 0, xp: 0, minutes: 0, distractions: 0 };
    const daily = heatmapDays.map((d) => perDay.get(format(d, 'yyyy-MM-dd')) || empty);
    const activeFlags = daily.map((d) => d.minutes > 0);

    let bestStreak = 0;
    let running = 0;
    for (const active of activeFlags) {
      running = active ? running + 1 : 0;
      if (running > bestStreak) bestStreak = running;
    }
    // A streak counts back from the most recent day of the window.
    let currentStreak = 0;
    for (let i = activeFlags.length - 1; i >= 0; i--) {
      if (!activeFlags[i]) break;
      currentStreak++;
    }

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
      daily,
      currentStreak,
      bestStreak,
    };
  }, [heatmapDays, history, state.includeRestTimeInTasks, viewOpts.averageCalculationBase]);

  // The calendar and the summary sit side by side and are supposed to share one
  // top edge and one bottom edge. Stretching alone cannot deliver that: the flex
  // row is as tall as whichever column needs more, so when the summary is the
  // taller one the calendar gets vertically centred with a few pixels of slack
  // above and below. Tying the panel to the calendar's measured height makes the
  // calendar the reference, which is the way round the design reads.
  // Only on lg+ (side by side) and never in year mode (stacked, full width).
  const calendarRef = useRef<HTMLDivElement>(null);
  const summaryPanelRef = useRef<HTMLDivElement>(null);
  // The panel only exists while there is something to summarise, and it is a new
  // DOM node when that flips, so the effect has to re-run on that transition.
  const hasHeatmapSummary = !!heatmapSummary;
  useLayoutEffect(() => {
    const calendar = calendarRef.current;
    const panel = summaryPanelRef.current;
    if (!calendar || !panel) return;
    const sideBySide = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (heatmapMode === 'year' || !sideBySide.matches) {
        panel.style.height = '';
        return;
      }
      // Exact value, not rounded. Rounding to whole pixels left the panel a
      // fraction of a pixel short of the calendar, which shows up as one bottom
      // edge sitting a hair above the other at fractional device pixel ratios.
      panel.style.height = `${calendar.getBoundingClientRect().height}px`;
    };
    sync();
    // The calendar only changes height when a media query moves the cell size,
    // and the panel never feeds back into it, so this cannot loop.
    const observer = new ResizeObserver(sync);
    observer.observe(calendar);
    sideBySide.addEventListener('change', sync);
    // The observer already batches per frame; window resize does not, so funnel it.
    const onViewportChange = rafThrottle(sync);
    window.addEventListener('resize', onViewportChange);
    return () => {
      observer.disconnect();
      sideBySide.removeEventListener('change', sync);
      onViewportChange.cancel();
      window.removeEventListener('resize', onViewportChange);
      panel.style.height = '';
    };
  }, [heatmapMode, hasHeatmapSummary]);

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
          <div className="bg-slate-800/50 rounded-lg p-1 w-full sm:w-auto">
            <DatePicker
              value={format(heatmapDate, 'yyyy-MM-dd')}
              onChange={(val) => val && setHeatmapDate(parseISO(val))}
              indicators={dateIndicators}
              className="text-xs font-bold text-slate-300 w-full sm:w-36 text-center hover:text-indigo-400 transition-colors py-1 inline-block whitespace-nowrap cursor-pointer"
              nav={{
                // Step size follows the active mode: 30 days, one month, one year.
                onPrev: () => {
                  if (heatmapMode === '30days') setHeatmapDate(subDays(heatmapDate, 30));
                  else if (heatmapMode === 'month') setHeatmapDate(subMonths(heatmapDate, 1));
                  else setHeatmapDate(subYears(heatmapDate, 1));
                },
                onNext: () => {
                  if (heatmapMode === '30days') setHeatmapDate(addDays(heatmapDate, 30));
                  else if (heatmapMode === 'month') setHeatmapDate(addMonths(heatmapDate, 1));
                  else setHeatmapDate(addYears(heatmapDate, 1));
                },
                onToday: () => setHeatmapDate(new Date()),
                size: 'sm',
              }}
            >
              {heatmapMode === '30days'
                ? `${format(subDays(heatmapDate, 29), 'MMM dd')} - ${format(heatmapDate, 'MMM dd')}`
                : heatmapMode === 'month'
                ? format(heatmapDate, 'MMM yyyy')
                : format(heatmapDate, 'yyyy')}
            </DatePicker>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-6 lg:gap-4 w-full mt-4",
          heatmapMode === 'year'
            ? "items-center justify-center"
            : // stretch (not start) so the calendar and the summary share one
              // top edge and one bottom edge instead of the summary card
              // floating short of the grid.
              "lg:flex-row lg:items-stretch justify-between"
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
          /* The 30-day grid is five columns by six rows, so its natural height
             is (6 * cell + 5 * gap). The summary card next to it needs ~400px,
             which 40px cells could never reach — that is why the two never lined
             up. Sizing the cells against that height fixes the column at the
             source instead of hiding the gap with vertical centring. */
          @media (min-width: 1024px) {
             .heatmap-responsive {
               --cell-size: 56px;
               --cell-gap: 6px;
               --cell-radius: 9px;
               --label-size: 12px;
               --mood-size: 26px;
             }
          }
          @media (min-width: 1280px) {
             .heatmap-responsive {
               --cell-size: 60px;
               --cell-gap: 8px;
               --cell-radius: 10px;
               --label-size: 13px;
               --mood-size: 28px;
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
               --cell-gap: 3px;
               --cell-radius: 3px;
               --label-size: 12px;
               --mood-size: 14px;
             }
          }
        `}</style>

        <div
          className={cn(
            // overflow-visible：选中格子会放大 25% 并带 2px 光圈，任何 overflow
            // 都会把最右/最下那一圈切掉。各模式都自适应宽度，不需要横向滚动。
            "overflow-visible pb-4 lg:pb-0 w-full flex justify-start lg:justify-center lg:items-center",
            heatmapMode === 'year' ? "lg:w-full" : "lg:w-auto"
          )}
        >
          <div
            ref={calendarRef}
            className={cn(
              "mx-auto",
              heatmapMode === 'year'
                ? "w-full min-w-0 grid heatmap-year"
                : "w-full min-w-0 grid heatmap-responsive"
            )}
            style={{
              gridTemplateColumns:
                heatmapMode === 'year' ? 'auto minmax(0, 1fr)' : 'auto auto',
              columnGap: 'var(--cell-gap)',
            }}
          >
            <div
              className="grid grid-rows-7 text-slate-500 font-medium pr-1 text-right mt-6"
              style={{ rowGap: 'var(--cell-gap)', fontSize: 'var(--label-size)' }}
            >
              <div className="flex items-center justify-end leading-none">Mon</div>
              <div className="invisible" />
              <div className="flex items-center justify-end leading-none">Wed</div>
              <div className="invisible" />
              <div className="flex items-center justify-end leading-none">Fri</div>
              <div className="invisible" />
              <div className="invisible" />
            </div>

            <div className="flex flex-col min-w-0">
              <div
                className="h-6 grid items-end"
                style={{
                  // Same column tracks as the cell grid, so a month label always
                  // sits over its own week — also when the columns resize.
                  ...(heatmapMode === 'year'
                    ? { gridTemplateColumns: `repeat(${heatmapColumnCount}, minmax(0, 1fr))` }
                    : { gridAutoColumns: 'var(--cell-size)' }),
                }}
              >
                {heatmapMonthLabels.map((label, i) => (
                  <span
                    key={i}
                    className="text-slate-500 font-medium min-w-0 truncate"
                    style={{
                      // Span two columns: a single year-mode column (~13px) is
                      // too narrow for "Jan" and would truncate it.
                      gridColumn: `${label.colIndex + 1} / span 2`,
                      fontSize: 'var(--label-size)',
                    }}
                  >
                    {label.month}
                  </span>
                ))}
              </div>
              <div
                className="grid grid-rows-7 grid-flow-col justify-stretch"
                style={{
                  gap: 'var(--cell-gap)',
                  // The year view has 53 narrow columns: letting them share
                  // the row fills the width without inflating the height.
                  ...(heatmapMode === 'year'
                    ? { gridTemplateColumns: `repeat(${heatmapColumnCount}, minmax(0, 1fr))` }
                    : { gridAutoColumns: 'var(--cell-size)' }),
                }}
              >
                {Array.from({ length: (heatmapDays[0].getDay() + 6) % 7 }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border border-transparent"
                    style={
                      heatmapMode === 'year'
                        ? { width: '100%', aspectRatio: '1' }
                        : { width: 'var(--cell-size)', height: 'var(--cell-size)' }
                    }
                  />
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
                      style={
                        heatmapMode === 'year'
                          ? { width: '100%', aspectRatio: '1' }
                          : { width: 'var(--cell-size)', height: 'var(--cell-size)' }
                      }
                    >
                      <button
                        type="button"
                        onMouseEnter={(e) => scheduleCardOpen(date, e.currentTarget)}
                        onMouseLeave={() => scheduleCardClose()}
                        onFocus={(e) => scheduleCardOpen(date, e.currentTarget)}
                        onBlur={() => scheduleCardClose()}
                        onClick={(e) => {
                          // Click pins: the card stops following the pointer and
                          // stays until you click it off, click away, or press Esc.
                          if (isSelected && pinnedRef.current) {
                            pinnedRef.current = false;
                            setHeatmapPopoverAnchor(null);
                          } else {
                            pinnedRef.current = true;
                            clearHoverTimers();
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
                          // The pop-out on select is intentional; the container
                          // must not clip it (see overflow-visible below).
                          transform: isSelected ? 'scale(1.25)' : 'none',
                          zIndex: isSelected ? 10 : 1,
                        }}
                      >
                        {showHeatmapMood && MoodIcon && (
                          <MoodIcon
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md text-white"
                            color="white"
                            strokeWidth={2.5}
                            style={
                              heatmapMode === 'year'
                                ? { width: 'var(--mood-size)', height: 'var(--mood-size)' }
                                // Follows the cell width, which now flexes.
                                : { width: 'var(--mood-size)', height: 'var(--mood-size)' }
                            }
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
            ref={summaryPanelRef}
            className={cn(
              // min-h-0 lets the panel be shorter than its own content, which is
              // what makes it able to adopt the calendar's height instead of
              // forcing the row taller than the calendar.
              "shrink-0 flex flex-col bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800/60 mb-4 lg:min-h-0",
              // Non-year views let the summary absorb the leftover width: the
              // 30-day grid is only five columns wide, so a fixed 288px card left
              // ~270px of dead space on each side. h-full + the stretched row
              // above keep its bottom edge flush with the calendar.
              // The calendar takes the leftover width, so its cells flex to
              // fill the column. The summary keeps a floor so its stat
              // blocks never get crushed on narrower screens.
              heatmapMode === 'year'
                  ? "w-full"
                  : "w-full lg:flex-1 lg:min-w-0 lg:mb-0 lg:self-stretch"
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
                "grid gap-3 lg:min-h-0",
                // The two stat rows split whatever height the card has, so a
                // card stretched to match the calendar does not end up with a
                // band of dead space underneath.
                heatmapMode === 'year'
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
                  : // Two columns at every width, deliberately including very wide
                    // ones. Going four-across on 2xl split the leftover width into
                    // four 190px columns that were twice as tall as they were wide,
                    // and a 165x238 strip of thirty 4px bars reads as sparse noise.
                    // Two wide, short cards show the same shape and stay readable.
                    "grid-cols-2 lg:grid-cols-2 lg:grid-rows-[auto_1fr_1fr] lg:flex-1"
              )}
            >
              <div
                className={cn(
                  "flex justify-between items-center bg-slate-900/50 px-3 py-2.5 rounded-xl border border-slate-800/40 min-h-0",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Flame size={14} className="text-orange-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Focused Days</span>
                  <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wide whitespace-nowrap">
                    {heatmapSummary.currentStreak > 0
                      ? `Streak ${heatmapSummary.currentStreak} · Best ${heatmapSummary.bestStreak}`
                      : heatmapSummary.bestStreak > 0
                      ? `Best ${heatmapSummary.bestStreak}`
                      : ''}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black font-mono text-indigo-400">{heatmapSummary.activeDays}</span>
                  <span className="text-xs font-bold text-slate-600">/{heatmapDays.length}</span>
                </div>
              </div>

              {/* Merged Time/Task Stats Card */}
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40 min-h-0",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                  {heatmapMetric === 'time' ? <Clock size={14} className="text-sky-400" /> : <Target size={14} className="text-sky-400" />}
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {heatmapMetric === 'time' ? 'Study Time' : 'Tasks Completed'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-8 sm:gap-12 py-0.5">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Total</span>
                    <span className="text-base font-black font-mono text-sky-400">
                      {heatmapMetric === 'time' ? <DurationText minutes={heatmapSummary.totalTimeOrTasks} /> : heatmapSummary.totalTimeOrTasks}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Avg/Day</span>
                    <span className="text-base font-black font-mono text-sky-400/80">
                      {heatmapMetric === 'time' ? <DurationText minutes={heatmapSummary.avgTimeOrTasks} /> : Math.round(heatmapSummary.avgTimeOrTasks * 10) / 10}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 flex-1 min-h-[44px]">
                  <MiniBars values={heatmapSummary.daily.map((d) => d.minutes)} barClass="bg-sky-500/50" />
                </div>
              </div>

              {/* Merged Gold Stats Card */}
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40 min-h-0",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                  <Coins size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Gold Earnings</span>
                </div>
                <div className="flex items-center justify-center gap-8 sm:gap-12 py-0.5">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Total</span>
                    <span className="text-base font-black font-mono text-amber-400">+{heatmapSummary.totalGold}</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Avg/Day</span>
                    <span className="text-base font-black font-mono text-amber-400/80">+{heatmapSummary.avgGold}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex-1 min-h-[44px]">
                  <MiniBars values={heatmapSummary.daily.map((d) => d.gold)} barClass="bg-amber-500/50" />
                </div>
              </div>

              {/* Merged EXP Stats Card */}
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40 min-h-0",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                  <Zap size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase">EXP Earnings</span>
                </div>
                <div className="flex items-center justify-center gap-8 sm:gap-12 py-0.5">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Total</span>
                    <span className="text-base font-black font-mono text-indigo-400">+{heatmapSummary.totalExp}</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Avg/Day</span>
                    <span className="text-base font-black font-mono text-indigo-400/80">+{heatmapSummary.avgExp}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex-1 min-h-[44px]">
                  <MiniBars values={heatmapSummary.daily.map((d) => d.xp)} barClass="bg-indigo-500/50" />
                </div>
              </div>

              {/* Merged Distractions Stats Card */}
              <div
                className={cn(
                  "flex flex-col bg-slate-900/50 p-3 rounded-xl border border-slate-800/40 min-h-0",
                  heatmapMode === 'year' ? "col-span-1" : "col-span-2 lg:col-span-1"
                )}
              >
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800/30">
                  <Zap size={14} className="text-rose-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Distractions</span>
                </div>
                <div className="flex items-center justify-center gap-8 sm:gap-12 py-0.5">
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
                <div className="mt-2.5 flex-1 min-h-[44px]">
                  <MiniBars values={heatmapSummary.daily.map((d) => d.distractions)} barClass="bg-rose-500/50" />
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

      <PopoverPortal
        anchorElement={heatmapPopoverAnchor?.element || null}
        onRequestClose={() => {
          pinnedRef.current = false;
          setHeatmapPopoverAnchor(null);
        }}
      >
        {heatmapPopoverAnchor && (
          // The card itself counts as "still hovering": without this the 250ms
          // grace would run out while the pointer is on the card, because the
          // portal lives outside the cell's subtree.
          <div
            onMouseEnter={() => {
              pointerInCardRef.current = true;
              clearHoverTimers();
            }}
            onMouseLeave={() => {
              pointerInCardRef.current = false;
              scheduleCardClose();
            }}
          >
            {renderHeatmapPopover(new Date(heatmapPopoverAnchor.date))}
          </div>
        )}
      </PopoverPortal>
    </div>
  );
};
