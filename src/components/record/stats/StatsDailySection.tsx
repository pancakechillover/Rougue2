import React, { useRef, useLayoutEffect } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  Cell, 
  Line 
} from 'recharts';
import { format, parseISO, subDays, addDays, isToday } from 'date-fns';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Brain, 
  Wind, 
  Zap, 
  LayoutTemplate 
} from 'lucide-react';
import { AppState, StudySession, ReflectionTemplate, ChartLayerSelection } from '../../../types';
import { DatePicker } from '../../common/DatePicker';
import { StatsOverviewCards } from './StatsOverviewCards';
import { DailyPieChart } from '../DailyPieChart';
import { DailyRecordCard } from './DailyRecordCard';
import { ChartLayerFilterDropdown, DEFAULT_CHART_LAYERS } from './ChartLayerFilterDropdown';

interface StatsDailySectionProps {
  dailyChartLayers?: ChartLayerSelection;
  setDailyChartLayers?: (layers: ChartLayerSelection) => void;
  dailyLayerMode?: 'both' | 'bars' | 'lines';
  setDailyLayerMode?: (mode: 'both' | 'bars' | 'lines') => void;
  dailyDate: Date;
  handleDailyDateChange: (newDate: Date) => void;
  dateIndicators?: Record<string, { highlight?: boolean; star?: boolean }>;
  dailyGains: { coins: number; xp: number; tasks: number; distractions: number };
  formatDuration: (minutes: number) => string;
  viewOpts: NonNullable<AppState['statsViewOpts']>;
  chartKey: number;
  dailyData: any[];
  handleChartClick: (state: any, chartId: string) => void;
  activeChart: string | null;
  dailyTimeAxis: { domain: [number, number]; ticks: number[] };
  formatTimeTick: (val: number) => string;
  dailySessions: StudySession[];
  dungeons?: any[];
  majorDungeons?: any[];
  state: AppState;
  currentLog?: any;
  showReflection: boolean;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string, title?: string) => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
  onOpenJournal?: (dateStr?: string) => void;
}

const CustomDailyTooltip = ({ active, payload, label, dateTimestamp, allData, activeChart, chartId, formatDuration }: any) => {
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
          className="shared-popover-content animate-popover-enter bg-slate-900/95 backdrop-blur-md border border-slate-700/50 shadow-xl shadow-indigo-500/10 rounded-xl p-3.5 sm:p-4 z-50 w-[200px] sm:w-[220px] max-w-[calc(100vw-24px)] box-border"
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

export const StatsDailySection: React.FC<StatsDailySectionProps> = ({
  dailyChartLayers,
  setDailyChartLayers,
  dailyLayerMode,
  setDailyLayerMode,
  dailyDate,
  handleDailyDateChange,
  dateIndicators,
  dailyGains,
  formatDuration,
  viewOpts,
  chartKey,
  dailyData,
  handleChartClick,
  activeChart,
  dailyTimeAxis,
  formatTimeTick,
  dailySessions,
  dungeons = [],
  majorDungeons = [],
  state,
  currentLog,
  showReflection,
  saveDailyLog,
  onUpdateState,
  onOpenJournal,
}) => {
  const activeLayers: ChartLayerSelection = dailyChartLayers || (dailyLayerMode === 'bars'
    ? { time: true, totalDistractions: false, internal: false, external: false, unavoidable: false }
    : dailyLayerMode === 'lines'
    ? { time: false, totalDistractions: false, internal: true, external: true, unavoidable: true }
    : DEFAULT_CHART_LAYERS);

  const handleLayersChange = (newLayers: ChartLayerSelection) => {
    if (setDailyChartLayers) {
      setDailyChartLayers(newLayers);
    } else if (setDailyLayerMode) {
      if (newLayers.time && (newLayers.internal || newLayers.external || newLayers.unavoidable || newLayers.totalDistractions)) {
        setDailyLayerMode('both');
      } else if (newLayers.time) {
        setDailyLayerMode('bars');
      } else {
        setDailyLayerMode('lines');
      }
    }
  };

  const hasTime = activeLayers.time;
  const hasDistractions = activeLayers.totalDistractions || activeLayers.internal || activeLayers.external || activeLayers.unavoidable;
  const bothAxes = hasTime && hasDistractions;

  return (
    <div id="daily-activity-section" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="text-indigo-400" size={20} />
            <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Daily</h3>
          </div>

          <ChartLayerFilterDropdown 
            layers={activeLayers}
            onChange={handleLayersChange}
            title="Daily Chart Layers"
          />
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1 w-full sm:w-auto shrink-0">
          <button 
            onClick={() => handleDailyDateChange(subDays(dailyDate, 1))} 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="relative flex items-center justify-center flex-1 sm:flex-none">
            <DatePicker 
              value={format(dailyDate, 'yyyy-MM-dd')}
              onChange={(val) => val && handleDailyDateChange(parseISO(val))}
              indicators={dateIndicators}
              className="text-[10px] sm:text-xs font-bold text-slate-300 w-full sm:w-auto text-center hover:text-indigo-400 transition-colors inline-block whitespace-nowrap cursor-pointer"
            >
              <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 hover:bg-slate-700/60 rounded transition-colors text-white font-bold">
                <Calendar size={13} className="text-indigo-400" />
                <span>{isToday(dailyDate) ? 'Today' : format(dailyDate, 'MMM d, yyyy')}</span>
              </div>
            </DatePicker>
          </div>
          <button 
            onClick={() => handleDailyDateChange(addDays(dailyDate, 1))} 
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          >
            <ChevronRight size={16} />
          </button>
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
      <StatsOverviewCards
        gold={dailyGains.coins}
        exp={dailyGains.xp}
        timeMinutes={dailyGains.tasks}
        distractions={dailyGains.distractions}
        isAverage={false}
        formatDuration={formatDuration}
      />

      <div className="space-y-6">
        {(viewOpts.showDailyBar ?? true) && (
          <div className="h-48 min-h-[192px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart 
                key={chartKey}
                data={dailyData} 
                onClick={(state) => handleChartClick(state, 'daily')} 
                margin={{ top: 12, right: bothAxes ? 12 : 16, left: 0, bottom: 0 }}
                style={{ outline: 'none', touchAction: 'pan-y', overflow: 'visible' }}
              >
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#64748b', fontSize: 10 }} />
                {hasTime && (
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
                {hasDistractions && (
                  <YAxis 
                    yAxisId="distractions" 
                    orientation={bothAxes ? 'right' : 'left'} 
                    domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.25))]} 
                    allowDecimals={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={bothAxes ? 20 : 28}
                  />
                )}
                <Tooltip 
                  key={chartKey}
                  trigger="click"
                  content={<CustomDailyTooltip dateTimestamp={dailyDate.getTime()} allData={dailyData} activeChart={activeChart} chartId="daily" formatDuration={formatDuration} />}
                  cursor={false}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
                {hasTime && (
                  <Bar yAxisId="time" dataKey="sessions" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                )}
                {!hasTime && hasDistractions && (
                  <Bar yAxisId="distractions" dataKey="distractions" isAnimationActive={false}>
                    {dailyData.map((_, index) => (
                      <Cell key={`transparent-daily-cell-${index}`} fill="transparent" fillOpacity={0} stroke="transparent" />
                    ))}
                  </Bar>
                )}
                {activeLayers.totalDistractions && (
                  <Line 
                    yAxisId="distractions" 
                    type="monotone" 
                    dataKey="distractions" 
                    stroke="#f43f5e" 
                    strokeWidth={2.5} 
                    isAnimationActive={false}
                    dot={{ fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                    activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#f43f5e' }}
                    name="Total Distractions"
                  />
                )}
                {activeLayers.internal && (
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
                )}
                {activeLayers.external && (
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
                )}
                {activeLayers.unavoidable && (
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
      <DailyRecordCard
        date={dailyDate}
        currentLog={currentLog}
        state={state}
        showReflection={showReflection}
        onSaveDailyLog={saveDailyLog}
        onUpdateTemplates={(templates: ReflectionTemplate[]) => onUpdateState?.({ reflectionTemplates: templates })}
        onOpenJournal={onOpenJournal}
        onUpdateState={onUpdateState}
      />
    </div>
  );
};
