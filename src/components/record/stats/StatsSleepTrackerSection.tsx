import React, { useRef, useLayoutEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from 'recharts';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { Moon, Edit2 } from 'lucide-react';
import { DatePicker } from '../../common/DatePicker';

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
  activeChart: string | null;
  onOpenBulkSleepModal?: () => void;
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

const CustomSleepTooltip = ({ active, payload, activeChart, chartId }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const clamp = () => {
      const el = containerRef.current;
      if (!el) return;

      el.style.marginLeft = '0px';
      el.style.marginTop = '0px';

      const rect = el.getBoundingClientRect();
      const padding = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

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
    window.addEventListener('resize', clamp);
    window.addEventListener('scroll', clamp);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', clamp);
      window.removeEventListener('scroll', clamp);
    };
  });

  if (active && activeChart === chartId && payload && payload.length) {
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
  activeChart,
  onOpenBulkSleepModal,
  setShowBulkSleepModal,
}) => {
  const openEditor = () => {
    if (onOpenBulkSleepModal) onOpenBulkSleepModal();
    else if (setShowBulkSleepModal) setShowBulkSleepModal(true);
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
            onClick={openEditor}
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
          <div className="h-64 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart
                key={`times-${chartKey}`}
                data={sleepData}
                onClick={(state) => handleChartClick(state, 'sleepTimes')}
                style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible', cursor: 'pointer' }}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-800)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis
                  domain={[4, 40]}
                  tickCount={7}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  scale="time"
                  tickFormatter={formatClock}
                />
                <Tooltip
                  key={`times-tt-${chartKey}`}
                  trigger="click"
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  content={<CustomSleepTooltip activeChart={activeChart} chartId="sleepTimes" />}
                  cursor={false}
                />
                <Line
                  type="linear"
                  dataKey="sleepTime"
                  stroke={SLEEP_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3.5, strokeWidth: 2, fill: '#1e293b' }}
                  connectNulls
                />
                <Line
                  type="linear"
                  dataKey="wakeTime"
                  stroke={WAKE_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3.5, strokeWidth: 2, fill: WAKE_COLOR }}
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
          <div className="h-64 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart
                key={`duration-${chartKey}`}
                data={sleepData}
                onClick={(state) => handleChartClick(state, 'sleepDuration')}
                style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible', cursor: 'pointer' }}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-800)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                <YAxis
                  domain={[0, 24]}
                  tickCount={7}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val}h`}
                />
                <Tooltip
                  key={`duration-tt-${chartKey}`}
                  trigger="click"
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  content={<CustomSleepTooltip activeChart={activeChart} chartId="sleepDuration" />}
                  cursor={false}
                />
                <Bar
                  dataKey="duration"
                  fill={DURATION_COLOR}
                  radius={[4, 4, 0, 0]}
                  opacity={0.55}
                  maxBarSize={26}
                />
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
    </div>
  );
};
