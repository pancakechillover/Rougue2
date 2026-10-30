import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { rafThrottle } from '../../../lib/timing';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  Line,
  LabelList,
} from 'recharts';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { Moon, Edit2 } from 'lucide-react';
import { DatePicker } from '../../common/DatePicker';
import { PopoverPortal } from '../../common/PopoverPortal';
import { resolveChartPoint, useAnchoredPopover } from '../../../hooks/useAnchoredPopover';

interface StatsSleepTrackerSectionProps {
  sleepData: any[];
  sleepMode: 'calendar' | 'rolling';
  setSleepMode: (mode: 'calendar' | 'rolling') => void;
  sleepDate: Date;
  setSleepDate: React.Dispatch<React.SetStateAction<Date>>;
  sleepStart: Date;
  sleepEnd: Date;
  dateIndicators?: Record<string, { highlight?: boolean; star?: boolean }>;
  chartKey: number;
  handleChartClick: (state: any, chartId: string) => void;
  onOpenBulkSleepModal?: (dateStr?: string) => void;
  setShowBulkSleepModal?: React.Dispatch<React.SetStateAction<boolean>> | ((show: boolean) => void);
}

const SLEEP_COLOR = '#6366f1';
const WAKE_COLOR = '#fbbf24';
const DURATION_COLOR = '#818cf8';

const formatClock = (val: number | null) => {
  if (val === null || val === undefined) return '--:--';
  let h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  if (h >= 24) h -= 24;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// One night runs from 18:00 to 18:00 the next evening. Hours are stored as
// "hours since midnight, plus 24 for anything past midnight", so a 01:30 bedtime
// arrives as 25.5. Rebasing everything into that 24-hour window keeps the axis
// monotonic in clock terms — the old 04:00→16:00 domain wrapped at midnight and
// printed 20:00 above 01:00.
//
// The window below is only a fallback for an empty week. With data the axis
// hugs the actual bedtimes and wake-ups, two hours clear on either side, so a
// week of 23:00–07:00 nights uses the axis for those eight hours instead of
// leaving three quarters of a fixed 24-hour band empty.
const SLEEP_CYCLE_START = 18;
const SLEEP_CYCLE_END = 42; // 18:00 next day
const SLEEP_AXIS_PADDING = 2;

// Tick spacing follows the window: a tight week of similar nights gets 1-hour
// ticks, a wide one 3-hour ticks, and either way the labels stay on the hour so
// they read as clock times rather than as 22.5.
const pickSleepTickStep = (span: number) => (span <= 7 ? 1 : span <= 14 ? 2 : 3);

const intoSleepCycle = (val: number | null) =>
  val === null || val === undefined ? null : val < SLEEP_CYCLE_START ? val + 24 : val;

const CustomSleepTooltip = ({ active, payload, activeChart, chartId, onEdit }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const clamp = () => {
      const el = containerRef.current;
      if (!el) return;

      el.style.marginLeft = '0px';
      el.style.marginTop = '0px';

      const rect = el.getBoundingClientRect();
      const padding = 12;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      let shiftX = 0;
      if (rect.right > viewportWidth - padding) {
        shiftX = -(rect.right - (viewportWidth - padding));
      } else if (rect.left < padding) {
        shiftX = padding - rect.left;
      }

      let shiftY = 0;
      if (rect.bottom > viewportHeight - padding) {
        shiftY = -(rect.bottom - (viewportHeight - padding));
      } else if (rect.top < padding) {
        shiftY = padding - rect.top;
      }

      if (shiftX !== 0) el.style.marginLeft = `${shiftX}px`;
      if (shiftY !== 0) el.style.marginTop = `${shiftY}px`;
    };

    clamp();
    const frameId = requestAnimationFrame(clamp);
    const onViewportChange = rafThrottle(clamp);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange);

    return () => {
      cancelAnimationFrame(frameId);
      onViewportChange.cancel();
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange);
    };
    // Only re-clamp when the content actually changes; without deps this ran on
    // every render and forced a synchronous layout each time.
  }, [activeChart, chartId]);

  if (active && (!activeChart || activeChart === chartId) && payload && payload.length) {
    const data = payload[0].payload;
    if (!data.hasRecord) return null;
    return (
      <div
        ref={containerRef}
        className="animate-popover-enter bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl flex flex-col gap-2 z-50 min-w-[150px] max-w-[calc(100vw-24px)] box-border"
      >
        <p className="text-white font-bold text-sm">{data.fullName}</p>
        <div className="text-xs text-slate-300 grid grid-cols-2 gap-x-4 gap-y-2">
          <span className="text-indigo-400 font-bold">Fell Asleep:</span>
          <span className="text-right font-mono">{formatClock(data.sleepTime)}</span>
          <span className="text-amber-400 font-bold">Woke Up:</span>
          <span className="text-right font-mono">{formatClock(data.wakeTime)}</span>
          <span className="text-emerald-400 font-bold">Duration:</span>
          <span className="text-right font-mono">{data.duration}h</span>
        </div>

        {/* Entry point into the editor for this exact night, without hunting for the header button */}
        <div className="pt-2 mt-0.5 border-t border-slate-700/60 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(data.dateStr);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 text-white text-[10px] font-bold uppercase tracking-wider leading-none transition-colors cursor-pointer"
            title={`Edit sleep record for ${data.fullName}`}
          >
            <Edit2 size={11} />
            <span>Edit</span>
          </button>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Sleep statistics, split into two charts that answer different questions:
 * "when did I sleep" (times) and "how much did I sleep" (duration). They used to
 * share one composed chart with two y-axes, which made the duration bars hard to
 * read against the clock axis.
 *
 * The block deliberately has no border: the two charts sit side by side on wide
 * screens and stack on narrow ones, with one shared date control on top.
 */
export const StatsSleepTrackerSection: React.FC<StatsSleepTrackerSectionProps> = ({
  sleepData,
  sleepMode,
  setSleepMode,
  sleepDate,
  setSleepDate,
  sleepStart,
  sleepEnd,
  dateIndicators,
  chartKey,
  handleChartClick,
  onOpenBulkSleepModal,
  setShowBulkSleepModal,
}) => {
  const openEditor = (dateStr?: string) => {
    if (onOpenBulkSleepModal) onOpenBulkSleepModal(dateStr);
    else if (setShowBulkSleepModal) setShowBulkSleepModal(true);
  };

  // Times in a single 18:00→18:00 window so the line reads left-to-right in
  // clock order instead of jumping back at midnight.
  const timesData = useMemo(
    () =>
      sleepData.map((d) => ({
        ...d,
        sleepTime: intoSleepCycle(d.sleepTime),
        wakeTime: intoSleepCycle(d.wakeTime),
      })),
    [sleepData]
  );

  // Window = the earliest and latest clock value across both lines, plus two
  // hours either side. Rounded outwards to whole hours so no tick lands on :30,
  // and so the padding is never less than the two hours it claims to be.
  const timesDomain = useMemo(() => {
    const values: number[] = [];
    timesData.forEach((d) => {
      if (typeof d.sleepTime === 'number' && Number.isFinite(d.sleepTime)) values.push(d.sleepTime);
      if (typeof d.wakeTime === 'number' && Number.isFinite(d.wakeTime)) values.push(d.wakeTime);
    });
    // A week with no records at all still has to draw an axis, so fall back to
    // the plain 18:00 → 18:00 night instead of handing recharts an empty range:
    // with no ticks the whole grid disappears and the panel reads as broken
    // rather than as "nothing happened this week".
    if (values.length === 0) {
      return { min: SLEEP_CYCLE_START, max: SLEEP_CYCLE_END, hasData: false };
    }
    const min = Math.floor(Math.min(...values)) - SLEEP_AXIS_PADDING;
    const max = Math.ceil(Math.max(...values)) + SLEEP_AXIS_PADDING;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 2) {
      return { min: SLEEP_CYCLE_START, max: SLEEP_CYCLE_END, hasData: false };
    }
    return { min, max, hasData: true };
  }, [timesData]);

  // recharts only draws a numeric axis when a visible series gives it a numeric
  // extent, and a week of nulls gives it none — the axis, its labels and the
  // whole grid silently disappear, which reads as a broken panel rather than as
  // a quiet week. Feeding it the midpoint keeps the scale valid; the lines are
  // then painted transparent rather than `hide`-den, because a hidden series is
  // excluded from the domain calculation and puts us back where we started.
  const timesChartData = useMemo(() => {
    if (timesDomain.hasData) return timesData;
    const mid = (timesDomain.min + timesDomain.max) / 2;
    return timesData.map((d) => ({ ...d, sleepTime: mid, wakeTime: mid }));
  }, [timesData, timesDomain]);

  const timesTicks = useMemo(() => {
    const step = pickSleepTickStep(timesDomain.max - timesDomain.min);
    const ticks: number[] = [];
    for (let v = timesDomain.min; v <= timesDomain.max; v += step) ticks.push(v);
    return ticks.length > 0 ? ticks : [SLEEP_CYCLE_START, SLEEP_CYCLE_END];
  }, [timesDomain]);

  // Duration axis grows in 2h steps: a 7h night should not be a short bar on a
  // 24h axis. Anything beyond 10h pushes the ceiling to 12, 14, 16…
  const durationCeiling = useMemo(() => {
    const longest = sleepData.reduce((max, d) => Math.max(max, Number(d.duration) || 0), 0);
    return Math.max(10, Math.ceil(longest / 2) * 2);
  }, [sleepData]);

  const durationTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= durationCeiling; v += 2) ticks.push(v);
    return ticks;
  }, [durationCeiling]);

  // Two charts, two cards, same contract as the rest of the page: hover settles,
  // the card is pinned to the hovered column, click pins it, tap works alone.
  const timesWrapRef = useRef<HTMLDivElement>(null);
  const durationWrapRef = useRef<HTMLDivElement>(null);
  const timesTip = useAnchoredPopover();
  const durationTip = useAnchoredPopover();

  const tipPoint = (el: HTMLDivElement | null, chartX: number) => {
    const rect = el?.getBoundingClientRect();
    return rect ? { x: rect.left + chartX, y: rect.top + 6 } : null;
  };

  return (
    <div
      id="sleep-tracker-section"
      className="bg-slate-900 rounded-3xl p-4 sm:p-6 w-full flex flex-col space-y-4"
    >
      {/* Shared header: one date control drives both charts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Moon className="text-indigo-400" size={20} />
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">
            Sleep Tracker
          </h3>
          <button
            type="button"
            onClick={() => setSleepMode(sleepMode === 'calendar' ? 'rolling' : 'calendar')}
            className="bg-slate-800/50 hover:bg-slate-700 transition-colors rounded-lg flex items-center px-2 py-1 cursor-pointer group ml-2"
            title="Switch Sleep Mode"
          >
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest text-indigo-400 group-hover:text-indigo-300 whitespace-nowrap">
              {sleepMode === 'calendar' ? 'Natural' : 'Last 7d'}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
          <div className="bg-slate-800/50 rounded-lg p-0.5 sm:p-1">
            <DatePicker
              value={format(sleepDate, 'yyyy-MM-dd')}
              onChange={(val) => val && setSleepDate(parseISO(val))}
              indicators={dateIndicators}
              className="text-[10px] sm:text-xs font-bold text-slate-300 w-[90px] sm:w-28 text-center hover:text-indigo-400 transition-colors inline-block whitespace-nowrap cursor-pointer px-1"
              nav={{
                onPrev: () => setSleepDate(subDays(sleepDate, 7)),
                onNext: () => setSleepDate(addDays(sleepDate, 7)),
                onToday: () => setSleepDate(new Date()),
                size: 'sm',
              }}
            >
              {format(sleepStart, 'MMM d')} - {format(sleepEnd, 'MMM d')}
            </DatePicker>
          </div>
          <button
            onClick={() => openEditor()}
            className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
          >
            <Edit2 size={14} />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline">
              Edit
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        {/* Chart 1: when */}
        <div className="min-w-0 flex flex-col">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Sleep Times
          </div>
          <div className="h-64 min-h-[240px]" ref={timesWrapRef}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart
                key={`times-${chartKey}`}
                data={timesChartData}
                onClick={(state, event) => {
                  const hit = resolveChartPoint(timesWrapRef.current, state, event, sleepData.length);
                  if (!hit || !sleepData[hit.index] || !sleepData[hit.index].hasRecord) timesTip.pressNothing();
                  else {
                    const pt = tipPoint(timesWrapRef.current, hit.x);
                    if (pt) timesTip.pressAt({ key: String(hit.index), point: pt });
                  }
                  handleChartClick(state, 'sleepTimes');
                }}

                onMouseMove={(state, event) => {
                  const hit = resolveChartPoint(timesWrapRef.current, state, event, sleepData.length);
                  if (!hit || !sleepData[hit.index] || !sleepData[hit.index].hasRecord) return;
                  const pt = tipPoint(timesWrapRef.current, hit.x);
                  if (pt) timesTip.hoverAt({ key: String(hit.index), point: pt });
                }}

                onMouseLeave={() => timesTip.leave()}

                style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible', cursor: 'pointer' }}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-800)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis
                  domain={[timesDomain.min, timesDomain.max]}
                  ticks={timesTicks}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatClock}
                />
                <Line
                  type="linear"
                  dataKey="sleepTime"
                  stroke={timesDomain.hasData ? SLEEP_COLOR : 'transparent'}
                  strokeWidth={2}
                  dot={timesDomain.hasData ? { r: 3.5, strokeWidth: 2, fill: '#1e293b' } : false}
                  connectNulls
                />
                <Line
                  type="linear"
                  dataKey="wakeTime"
                  stroke={timesDomain.hasData ? WAKE_COLOR : 'transparent'}
                  strokeWidth={2}
                  dot={timesDomain.hasData ? { r: 3.5, strokeWidth: 2, fill: WAKE_COLOR } : false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] text-slate-400 font-medium pt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ background: SLEEP_COLOR }} />
              <span>Fell Asleep</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ background: WAKE_COLOR }} />
              <span>Woke Up</span>
            </div>
          </div>
        </div>

        {/* Chart 2: how much */}
        <div className="min-w-0 flex flex-col">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Sleep Duration
          </div>
          <div className="h-64 min-h-[240px]" ref={durationWrapRef}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart
                key={`duration-${chartKey}`}
                data={sleepData}
                onClick={(state, event) => {
                  const hit = resolveChartPoint(durationWrapRef.current, state, event, sleepData.length);
                  if (!hit || !sleepData[hit.index] || !sleepData[hit.index].hasRecord) durationTip.pressNothing();
                  else {
                    const pt = tipPoint(durationWrapRef.current, hit.x);
                    if (pt) durationTip.pressAt({ key: String(hit.index), point: pt });
                  }
                  handleChartClick(state, 'sleepDuration');
                }}

                onMouseMove={(state, event) => {
                  const hit = resolveChartPoint(durationWrapRef.current, state, event, sleepData.length);
                  if (!hit || !sleepData[hit.index] || !sleepData[hit.index].hasRecord) return;
                  const pt = tipPoint(durationWrapRef.current, hit.x);
                  if (pt) durationTip.hoverAt({ key: String(hit.index), point: pt });
                }}

                onMouseLeave={() => durationTip.leave()}

                style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible', cursor: 'pointer' }}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-800)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis
                  domain={[0, durationCeiling]}
                  ticks={durationTicks}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val}h`}
                />
                <Bar
                  dataKey="duration"
                  fill={DURATION_COLOR}
                  radius={[4, 4, 0, 0]}
                  opacity={0.55}
                  maxBarSize={26}
                >
                  {/* The bars are short by design; the number on top is what
                      makes the exact value readable without opening a tooltip. */}
                  <LabelList
                    dataKey="duration"
                    position="top"
                    offset={6}
                    style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                    formatter={(value: unknown) => {
                      const v = Number(value);
                      return v > 0 ? `${Number.isInteger(v) ? v : v.toFixed(1)}h` : '';
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] text-slate-400 font-medium pt-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-2 rounded-sm"
                style={{ background: DURATION_COLOR, opacity: 0.55 }}
              />
              <span>Hours Slept</span>
            </div>
          </div>
        </div>
      </div>
      {timesTip.target && sleepData[Number(timesTip.target.key)]?.hasRecord && (
        <PopoverPortal
          anchorPoint={timesTip.target.point}
          offsetY={10}
          preferPlacement="above"
          showArrow={false}
          onRequestClose={timesTip.close}
        >
          <div className={timesTip.skipEnterClass} {...timesTip.cardHandlers}>
            <CustomSleepTooltip
              active
              payload={[{ payload: sleepData[Number(timesTip.target.key)] }]}
              activeChart="sleepTimes"
              chartId="sleepTimes"
              onEdit={openEditor}
            />
          </div>
        </PopoverPortal>
      )}

      {durationTip.target && sleepData[Number(durationTip.target.key)]?.hasRecord && (
        <PopoverPortal
          anchorPoint={durationTip.target.point}
          offsetY={10}
          preferPlacement="above"
          showArrow={false}
          onRequestClose={durationTip.close}
        >
          <div className={durationTip.skipEnterClass} {...durationTip.cardHandlers}>
            <CustomSleepTooltip
              active
              payload={[{ payload: sleepData[Number(durationTip.target.key)] }]}
              activeChart="sleepDuration"
              chartId="sleepDuration"
              onEdit={openEditor}
            />
          </div>
        </PopoverPortal>
      )}
    </div>
  );
};
