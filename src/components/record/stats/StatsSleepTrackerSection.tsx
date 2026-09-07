import React, { useRef, useLayoutEffect } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  Line 
} from 'recharts';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { Moon, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Edit2 } from 'lucide-react';
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
        className="animate-popover-enter bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl flex flex-col gap-2 z-50 min-w-[150px] max-w-[calc(100vw-24px)] box-border"
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
  return (
    <div id="sleep-tracker-section" className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-6 w-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-2">
          <Moon className="text-indigo-400" size={20} />
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Sleep Tracker</h3>
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
          <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1">
            <button 
              onClick={() => setSleepDate(subDays(sleepDate, 7))} 
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
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
            <button 
              onClick={() => setSleepDate(addDays(sleepDate, 7))} 
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            >
              <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => setSleepDate(new Date())}
              className="p-1 text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 rounded transition-colors"
              title="Return to Today"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <button
            onClick={() => {
              if (onOpenBulkSleepModal) {
                onOpenBulkSleepModal();
              } else if (setShowBulkSleepModal) {
                setShowBulkSleepModal(true);
              }
            }}
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
            key={chartKey}
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
              key={chartKey}
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
  );
};
