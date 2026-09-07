import React, { useRef, useLayoutEffect } from 'react';
import { LayoutTemplate, Brain, Wind, Zap, Coins, Clock, Star } from 'lucide-react';
import { MOOD_OPTIONS } from '../../../constants';

interface SharedPopoverContentProps {
  label: string;
  totalSessions: number;
  morning: number;
  afternoon: number;
  night: number;
  other: number;
  coins: number;
  xp: number;
  distractions?: number;
  internal?: number;
  external?: number;
  unavoidable?: number;
  efficiency?: number;
  mood?: string;
  dateTimestamp?: number;
}

export const SharedPopoverContent: React.FC<SharedPopoverContentProps> = ({
  label,
  totalSessions,
  morning,
  afternoon,
  night,
  other,
  coins,
  xp,
  distractions = 0,
  internal = 0,
  external = 0,
  unavoidable = 0,
  efficiency,
  mood,
  dateTimestamp,
}) => {
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

  const moodOption = mood ? MOOD_OPTIONS.find((m) => m.id === mood) : null;
  const hourlyRate = totalSessions > 0 
    ? (Math.round((distractions / (totalSessions / 60)) * 10) / 10).toFixed(1) 
    : distractions;

  const formatDuration = (mins: number) => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div 
      ref={containerRef}
      className="shared-popover-content animate-popover-enter bg-slate-900/95 backdrop-blur-md border border-slate-700/50 shadow-xl shadow-indigo-500/10 rounded-xl p-3.5 sm:p-4 z-50 w-[220px] sm:w-[240px] max-w-[calc(100vw-24px)] text-left box-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/50">
        <p className="text-slate-50 font-bold text-[13px] sm:text-sm">{label}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {moodOption && (
            <span className={`p-0.5 rounded ${moodOption.bg} ${moodOption.border} border`} title={moodOption.label}>
              <moodOption.icon size={14} className={moodOption.color} />
            </span>
          )}
          {efficiency !== undefined && efficiency > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
              <Star size={10} className="fill-amber-400" />
              <span>{efficiency}</span>
            </span>
          )}
        </div>
      </div>

      {totalSessions > 0 ? (
        <div className="space-y-1.5 text-xs mb-2">
          <div className="flex justify-between items-center text-slate-300 font-medium">
            <span className="flex items-center gap-1 text-slate-400">
              <Clock size={12} className="text-indigo-400" />
              Total Time
            </span>
            <span className="text-indigo-400 font-bold">{formatDuration(totalSessions)}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px] text-slate-400">
            {morning > 0 && (
              <div className="flex justify-between">
                <span>Morning:</span>
                <span className="text-amber-400 font-medium">{formatDuration(morning)}</span>
              </div>
            )}
            {afternoon > 0 && (
              <div className="flex justify-between">
                <span>Afternoon:</span>
                <span className="text-orange-400 font-medium">{formatDuration(afternoon)}</span>
              </div>
            )}
            {night > 0 && (
              <div className="flex justify-between">
                <span>Night:</span>
                <span className="text-indigo-400 font-medium">{formatDuration(night)}</span>
              </div>
            )}
            {other > 0 && (
              <div className="flex justify-between">
                <span>Other:</span>
                <span className="text-slate-400 font-medium">{formatDuration(other)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-slate-500 italic text-xs mb-2">No activity recorded</p>
      )}

      {/* Gains */}
      {(coins > 0 || xp > 0) && (
        <div className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-slate-800/40 border border-slate-800/60 my-1.5 text-xs font-mono">
          <div className="flex items-center gap-1 text-amber-400">
            <Coins size={12} />
            <span>+{coins}</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-400">
            <Zap size={12} />
            <span>+{xp}</span>
          </div>
        </div>
      )}

      {/* Distractions */}
      {distractions > 0 && (
        <div className="border-t border-slate-800/50 my-1.5 pt-1.5 space-y-1.5">
          <div className="flex justify-between items-center gap-4 text-xs">
            <span className="text-rose-400 font-medium">Distractions</span>
            <span className="text-rose-300 font-bold font-mono shrink-0">
              {distractions}{' '}
              <span className="text-[10px] text-slate-400 font-normal font-sans">
                ({hourlyRate}/h)
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] pt-0.5">
            {internal > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium flex items-center gap-1">
                <Brain size={10} className="shrink-0 text-indigo-400" />
                <span>{internal}</span>
              </span>
            )}
            {external > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium flex items-center gap-1">
                <Wind size={10} className="shrink-0 text-orange-400" />
                <span>{external}</span>
              </span>
            )}
            {unavoidable > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium flex items-center gap-1">
                <Zap size={10} className="shrink-0 text-red-500" />
                <span>{unavoidable}</span>
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
                detail: { timestamp: dateTimestamp } 
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
};
