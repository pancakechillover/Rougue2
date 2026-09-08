import React, { useRef, useLayoutEffect } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  Cell, 
  Line,
  LineChart,
  CartesianGrid
} from 'recharts';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Brain, 
  Wind, 
  Zap, 
  LayoutTemplate,
  LineChart as LineChartIcon
} from 'lucide-react';
import { AppState, StudySession, ChartLayerSelection } from '../../../types';
import { DatePicker } from '../../common/DatePicker';
import { MOOD_OPTIONS } from '../../../constants';
import { StatsOverviewCards } from './StatsOverviewCards';
import { WeeklyPieChart } from '../WeeklyPieChart';
import { ChartLayerFilterDropdown, DEFAULT_CHART_LAYERS } from './ChartLayerFilterDropdown';

interface StatsWeeklySectionProps {
  weeklyMode: 'calendar' | 'rolling';
  setWeeklyMode: (mode: 'calendar' | 'rolling') => void;
  weeklyChartLayers?: ChartLayerSelection;
  setWeeklyChartLayers?: (layers: ChartLayerSelection) => void;
  weeklyLayerMode?: 'both' | 'bars' | 'lines';
  setWeeklyLayerMode?: (mode: 'both' | 'bars' | 'lines') => void;
  weeklyDate: Date;
  setWeeklyDate: React.Dispatch<React.SetStateAction<Date>>;
  weekStart: Date;
  weekEnd: Date;
  dateIndicators?: Record<string, { highlight?: boolean; star?: boolean }>;
  viewOpts: NonNullable<AppState['statsViewOpts']>;
  weeklyActiveDaysCount: number;
  weeklyDays: Date[];
  weeklyGains: { coins: number; xp: number; tasks: number; distractions: number };
  weeklyData: any[];
  chartKey: number;
  lineChartKey?: number;
  handleChartClick: (state: any, chartId: string) => void;
  activeChart: string | null;
  weeklyTimeAxis: { domain: [number, number]; ticks: number[] };
  formatTimeTick: (val: number) => string;
  formatDuration: (minutes: number) => string;
  state: AppState;
  dungeons?: any[];
  majorDungeons?: any[];
  weeklySessions: StudySession[];
}

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
  formatDuration,
}: any) => {
  const moodObj = mood ? MOOD_OPTIONS.find(m => m.id === mood) : null;
  const MoodIcon = moodObj ? moodObj.icon : null;
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const clamp = () => {
      const el = containerRef.current;
      if (!el) return;

      // Reset shift first to accurately measure natural position
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

      if (shiftX !== 0) {
        el.style.marginLeft = `${shiftX}px`;
      }
      if (shiftY !== 0) {
        el.style.marginTop = `${shiftY}px`;
      }
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
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Study Time</span> 
              <span className="text-slate-50 font-bold">{formatDuration(totalSessions)}</span>
            </div>
            {morning > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-amber-400">Morning</span> 
                <span className="text-slate-200">{formatDuration(morning)}</span>
              </div>
            )}
            {afternoon > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-orange-400">Afternoon</span> 
                <span className="text-slate-200">{formatDuration(afternoon)}</span>
              </div>
            )}
            {night > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-indigo-400">Night</span> 
                <span className="text-slate-200">{formatDuration(night)}</span>
              </div>
            )}
            {other > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Other</span> 
                <span className="text-slate-200">{formatDuration(other)}</span>
              </div>
            )}
            <div className="border-t border-slate-800/50 my-1.5 pt-1.5 flex justify-between gap-4">
              <span className="text-yellow-400">Gold</span> 
              <span className="text-slate-200 font-mono">+{coins}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-cyan-400">XP</span> 
              <span className="text-slate-200 font-mono">+{xp}</span>
            </div>
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
            <div className="flex items-center gap-1">
              <MoodIcon size={14} className={moodObj.color} /> 
              <span className="font-medium text-slate-200">{moodObj.label}</span>
            </div>
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

const CustomWeeklyTooltip = ({ active, payload, label, allData, activeChart, chartId, formatDuration }: any) => {
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
          formatDuration={formatDuration}
        />
      );
    }
  }
  return null;
};

export const StatsWeeklySection: React.FC<StatsWeeklySectionProps> = ({
  weeklyMode,
  setWeeklyMode,
  weeklyChartLayers,
  setWeeklyChartLayers,
  weeklyLayerMode,
  setWeeklyLayerMode,
  weeklyDate,
  setWeeklyDate,
  weekStart,
  weekEnd,
  dateIndicators,
  viewOpts,
  weeklyActiveDaysCount,
  weeklyDays,
  weeklyGains,
  weeklyData,
  chartKey,
  lineChartKey,
  handleChartClick,
  activeChart,
  weeklyTimeAxis,
  formatTimeTick,
  formatDuration,
  state,
  dungeons = [],
  majorDungeons = [],
  weeklySessions,
}) => {
  const activeLayers: ChartLayerSelection = weeklyChartLayers || (weeklyLayerMode === 'bars'
    ? { time: true, totalDistractions: false, internal: false, external: false, unavoidable: false }
    : weeklyLayerMode === 'lines'
    ? { time: false, totalDistractions: false, internal: true, external: true, unavoidable: true }
    : DEFAULT_CHART_LAYERS);

  const handleLayersChange = (newLayers: ChartLayerSelection) => {
    if (setWeeklyChartLayers) {
      setWeeklyChartLayers(newLayers);
    } else if (setWeeklyLayerMode) {
      if (newLayers.time && (newLayers.internal || newLayers.external || newLayers.unavoidable || newLayers.totalDistractions)) {
        setWeeklyLayerMode('both');
      } else if (newLayers.time) {
        setWeeklyLayerMode('bars');
      } else {
        setWeeklyLayerMode('lines');
      }
    }
  };

  const hasTime = activeLayers.time;
  const hasDistractions = activeLayers.totalDistractions || activeLayers.internal || activeLayers.external || activeLayers.unavoidable;
  const bothAxes = hasTime && hasDistractions;

  const weeklyDivisor = viewOpts.averageCalculationBase === 'active_days' 
    ? weeklyActiveDaysCount 
    : Math.max(1, weeklyDays.length);

  return (
    <div id="weekly-activity-section" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
        <div className="flex flex-wrap items-center justify-between md:justify-start gap-2.5">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-indigo-400" size={20} />
            <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Weekly</h3>
          </div>
          <button 
            type="button"
            onClick={() => setWeeklyMode(weeklyMode === 'calendar' ? 'rolling' : 'calendar')}
            className="bg-slate-800/50 hover:bg-slate-700 transition-colors rounded-lg flex items-center px-2 py-1 cursor-pointer group"
            title="Switch Week Mode"
          >
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide sm:tracking-widest text-indigo-400 group-hover:text-indigo-300 whitespace-nowrap">
              {weeklyMode === 'calendar' ? 'Natural' : 'Last 7d'}
            </span>
          </button>

          <ChartLayerFilterDropdown 
            layers={activeLayers}
            onChange={handleLayersChange}
            title="Weekly Chart Layers"
          />
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1 w-full md:w-auto shrink-0">
          <button 
            onClick={() => setWeeklyDate(subDays(weeklyDate, 7))} 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft size={16} />
          </button>
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
          <button 
            onClick={() => setWeeklyDate(addDays(weeklyDate, 7))} 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          >
            <ChevronRight size={16} />
          </button>
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
      <StatsOverviewCards
        gold={Math.round(weeklyGains.coins / weeklyDivisor)}
        exp={Math.round(weeklyGains.xp / weeklyDivisor)}
        timeMinutes={Math.round(weeklyGains.tasks / weeklyDivisor)}
        distractions={weeklyGains.distractions}
        totalTimeMinutes={weeklyGains.tasks}
        totalDistractions={weeklyGains.distractions}
        weeklyDivisor={weeklyDivisor}
        isAverage={true}
        formatDuration={formatDuration}
      />
      
      <div className="space-y-6">
        {(viewOpts.showWeeklyBar ?? true) && (
          <>
            <div className="h-48 min-h-[192px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart 
                key={chartKey}
                data={weeklyData} 
                onClick={(state) => handleChartClick(state, 'weeklyBar')} 
                margin={{ top: 12, right: bothAxes ? 12 : 16, left: 0, bottom: 0 }}
                style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible' }}
              >
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#64748b', fontSize: 10 }} />
                {hasTime && (
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
                {hasDistractions && (
                  <YAxis 
                    yAxisId="distractions" 
                    orientation={bothAxes ? 'right' : 'left'} 
                    domain={[0, (dataMax: number) => Math.max(2, Math.ceil((dataMax || 0) * 1.25))]} 
                    allowDecimals={true} 
                    tickFormatter={(val: number) => {
                      if (val === 0) return '0';
                      return Number.isInteger(val) ? `${val}/h` : `${val.toFixed(1)}/h`;
                    }}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={bothAxes ? 32 : 36}
                  />
                )}
                <Tooltip 
                  key={chartKey}
                  trigger="click"
                  content={<CustomWeeklyTooltip allData={weeklyData} activeChart={activeChart} chartId="weeklyBar" formatDuration={formatDuration} />}
                  cursor={false}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
                {hasTime && (
                  <>
                    <Bar yAxisId="time" dataKey="Morning" stackId="a" fill="#fbbf24" isAnimationActive={false} />
                    <Bar yAxisId="time" dataKey="Afternoon" stackId="a" fill="#fb923c" isAnimationActive={false} />
                    <Bar yAxisId="time" dataKey="Night" stackId="a" fill="#818cf8" isAnimationActive={false} />
                    <Bar yAxisId="time" dataKey="Other" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {weeklyData.map((entry, index) => {
                        const topKey = entry.Other > 0 ? 'Other' : entry.Night > 0 ? 'Night' : entry.Afternoon > 0 ? 'Afternoon' : 'Morning';
                        return <Cell key={`cell-${index}`} className={topKey === 'Other' ? 'rounded-t' : ''} />;
                      })}
                    </Bar>
                  </>
                )}
                {!hasTime && hasDistractions && (
                  <Bar yAxisId="distractions" dataKey="distractionsRate" isAnimationActive={false}>
                    {weeklyData.map((_, index) => (
                      <Cell key={`transparent-weekly-cell-${index}`} fill="transparent" fillOpacity={0} stroke="transparent" />
                    ))}
                  </Bar>
                )}
                {activeLayers.totalDistractions && (
                  <Line 
                    yAxisId="distractions" 
                    type="monotone" 
                    dataKey="distractionsRate" 
                    stroke="#f43f5e" 
                    strokeWidth={2.5} 
                    isAnimationActive={false}
                    dot={{ fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                    activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#f43f5e' }}
                    name="Total Distractions (/h)"
                  />
                )}
                {activeLayers.internal && (
                  <Line 
                    yAxisId="distractions" 
                    type="monotone" 
                    dataKey="internalRate" 
                    stroke="#818cf8" 
                    strokeWidth={2} 
                    isAnimationActive={false}
                    dot={{ fill: '#818cf8', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                    activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#818cf8' }}
                    name="Internal (/h)"
                  />
                )}
                {activeLayers.external && (
                  <Line 
                    yAxisId="distractions" 
                    type="monotone" 
                    dataKey="externalRate" 
                    stroke="#fb923c" 
                    strokeWidth={2} 
                    isAnimationActive={false}
                    dot={{ fill: '#fb923c', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                    activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#fb923c' }}
                    name="External (/h)"
                  />
                )}
                {activeLayers.unavoidable && (
                  <Line 
                    yAxisId="distractions" 
                    type="monotone" 
                    dataKey="unavoidableRate" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    isAnimationActive={false}
                    dot={{ fill: '#ef4444', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                    activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#ef4444' }}
                    name="Unavoidable (/h)"
                  />
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
                  key={`trend-${lineChartKey ?? chartKey}`}
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
                    key={`trend-tip-${lineChartKey ?? chartKey}`}
                    trigger="click"
                    content={<CustomWeeklyTooltip allData={weeklyData} activeChart={activeChart} chartId="weeklyLine" formatDuration={formatDuration} />}
                    cursor={false}
                    wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                    allowEscapeViewBox={{ x: true, y: true }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="efficiencyDisplay"
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

        {(viewOpts.showWeeklyDonut) && (
          <WeeklyPieChart 
            weekSessions={weeklySessions} 
            mode={viewOpts.weeklyDonutMode || 'time_of_day'} 
            includeRestTimeInTasks={!!state.includeRestTimeInTasks}
            timeSettings={state.timeSettings}
          />
        )}
      </div>
    </div>
  );
};
