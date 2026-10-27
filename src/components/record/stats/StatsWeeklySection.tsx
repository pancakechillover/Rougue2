import React from 'react';
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
import { SharedPopoverContent } from './SharedPopoverContent';
import { CalendarDays, LineChart as LineChartIcon } from 'lucide-react';
import { AppState, StudySession, ChartLayerSelection } from '../../../types';
import { DatePicker } from '../../common/DatePicker';
import { StatsOverviewCards } from './StatsOverviewCards';
import { WeeklyPieChart } from '../WeeklyPieChart';
import { ChartLayerFilterDropdown, DEFAULT_CHART_LAYERS } from './ChartLayerFilterDropdown';

interface StatsWeeklySectionProps {
  weeklyMode: 'calendar' | 'rolling';
  setWeeklyMode: (mode: 'calendar' | 'rolling') => void;
  weeklyChartLayers?: ChartLayerSelection;
  setWeeklyChartLayers?: (layers: ChartLayerSelection) => void;
  weeklySelectedTagIds?: string[];
  setWeeklySelectedTagIds?: (ids: string[]) => void;
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
  _dungeons?: any[];
  _majorDungeons?: any[];
  weeklySessions: StudySession[];
  onUpdateState?: (updates: Partial<AppState>) => void;
}

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

export const StatsWeeklySection: React.FC<StatsWeeklySectionProps> = ({
  weeklyMode,
  setWeeklyMode,
  weeklyChartLayers,
  setWeeklyChartLayers,
  weeklySelectedTagIds = [],
  setWeeklySelectedTagIds,
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
  _dungeons: __dungeons = [],
  _majorDungeons: __majorDungeons = [],
  weeklySessions,
  onUpdateState,
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
    <div id="weekly-activity-section" className="bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-indigo-400" size={20} />
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Weekly</h3>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <ChartLayerFilterDropdown
            layers={activeLayers}
            onChange={handleLayersChange}
            weekMode={weeklyMode}
            onWeekModeChange={setWeeklyMode}
            tags={state.tags || []}
            selectedTagIds={weeklySelectedTagIds}
            onSelectedTagIdsChange={setWeeklySelectedTagIds}
            title="Weekly View & Layers"
          />
          <div className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-slate-800/50 rounded-lg p-0.5 sm:p-1">
          <DatePicker
            value={format(weeklyDate, 'yyyy-MM-dd')}
            onChange={(val) => val && setWeeklyDate(parseISO(val))}
            indicators={dateIndicators}
            className="text-[10px] sm:text-xs font-bold text-slate-300 w-[90px] sm:w-28 text-center hover:text-indigo-400 transition-colors inline-block whitespace-nowrap cursor-pointer"
            nav={{
              onPrev: () => setWeeklyDate(subDays(weeklyDate, 7)),
              onNext: () => setWeeklyDate(addDays(weeklyDate, 7)),
              onToday: () => setWeeklyDate(new Date()),
              size: 'sm',
            }}
          >
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
          </DatePicker>
          </div>
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
            onChangeMode={
              onUpdateState
                ? (nextMode) => onUpdateState({ statsViewOpts: { ...viewOpts, weeklyDonutMode: nextMode } })
                : undefined
            }
            tags={state.tags || []}
            dungeons={__dungeons}
            majorDungeons={__majorDungeons}
            includeRestTimeInTasks={!!state.includeRestTimeInTasks}
            _timeSettings={state.timeSettings}
          />
        )}
      </div>
    </div>
  );
};
