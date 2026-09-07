import React from 'react';
import { MOOD_OPTIONS, DEFAULT_ENABLED_MOODS } from '../../constants';
import { cn } from '../../lib/utils';

export interface MoodSelectorProps {
  value?: string;
  onChange: (mood: string | undefined) => void;
  enabledMoods?: string[];
  variant?: 'wrap' | 'grid' | 'chips';
  className?: string;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  value,
  onChange,
  enabledMoods,
  variant = 'wrap',
  className,
}) => {
  const activeMoods = enabledMoods || DEFAULT_ENABLED_MOODS;
  const options = MOOD_OPTIONS.filter((m) => activeMoods.includes(m.id));

  if (variant === 'chips') {
    return (
      <div className={cn("flex gap-2 overflow-x-auto pb-1 custom-scrollbar items-center", className)}>
        {options.map((m) => {
          const isSelected = value === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(isSelected ? undefined : m.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap",
                isSelected
                  ? `${m.bg} ${m.border} ${m.color} scale-105 shadow-lg font-bold`
                  : "bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              )}
              title={`Select ${m.label}`}
            >
              <Icon size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={cn("grid grid-cols-4 sm:grid-cols-5 gap-2 py-1", className)}>
        {options.map((m) => {
          const isSelected = value === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(isSelected ? undefined : m.id)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center group min-h-[44px]",
                isSelected
                  ? `${m.bg} ${m.border} ${m.color} shadow-lg scale-105 font-bold`
                  : "bg-slate-900/70 border-slate-800/80 text-slate-500 hover:bg-slate-800/80 hover:text-slate-300 hover:border-slate-700"
              )}
              title={`Select ${m.label}`}
            >
              <Icon size={18} className={cn("transition-transform group-hover:scale-110", isSelected && "scale-110")} />
              <span className="text-[9px] font-bold uppercase tracking-wider truncate w-full hidden 2xl:block mt-1">{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default: 'wrap' (used in DailySummaryModal)
  return (
    <div className={cn("flex flex-wrap justify-center gap-2.5 py-1.5 overflow-y-visible", className)}>
      {options.map((m) => {
        const isSelected = value === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(isSelected ? undefined : m.id)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[48px] sm:min-w-[64px] p-2 rounded-xl border transition-all pointer-events-auto",
              isSelected
                ? `${m.bg} ${m.border} ${m.color} scale-125 shadow-xl z-10 font-bold`
                : "bg-slate-950/50 border-slate-800 text-slate-500 hover:bg-slate-800 hover:border-slate-700 hover:scale-110"
            )}
            title={`Select ${m.label}`}
          >
            <Icon size={20} className="sm:mb-1.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:block">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
