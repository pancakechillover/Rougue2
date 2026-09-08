import React from 'react';
import { Coins, Zap, Sword } from 'lucide-react';

interface StatsOverviewCardsProps {
  gold: number;
  exp: number;
  timeMinutes: number;
  distractions: number;
  totalTimeMinutes?: number;
  totalDistractions?: number;
  weeklyDivisor?: number;
  isAverage?: boolean;
  formatDuration?: (minutes: number) => string;
}

export const StatsOverviewCards: React.FC<StatsOverviewCardsProps> = ({
  gold,
  exp,
  timeMinutes,
  distractions,
  totalTimeMinutes,
  totalDistractions,
  weeklyDivisor,
  isAverage = false,
  formatDuration = (mins) => `${mins}m`,
}) => {
  const effectiveMinutes = totalTimeMinutes !== undefined ? totalTimeMinutes : timeMinutes;
  const effectiveDistractions = totalDistractions !== undefined ? totalDistractions : distractions;

  const distractionsPerHour = effectiveMinutes > 0
    ? (Math.round((effectiveDistractions / (effectiveMinutes / 60)) * 10) / 10).toFixed(1)
    : (effectiveDistractions > 0 ? String(effectiveDistractions) : '0.0');

  const tooltipTitle = isAverage
    ? `Total interruptions: ${effectiveDistractions} across ${formatDuration(effectiveMinutes)} focus time${weeklyDivisor ? ` (Avg ${(effectiveDistractions / weeklyDivisor).toFixed(1)}/day)` : ''}`
    : `Total interruptions: ${effectiveDistractions} across ${formatDuration(effectiveMinutes)} focus time`;

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
      {/* Gold Card */}
      <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
        <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">
          {isAverage ? 'Avg Gold' : 'Gold'}
        </span>
        <div className="flex items-center gap-1 sm:gap-1.5 text-amber-400 min-w-0">
          <Coins size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
          <span className="text-[10px] sm:text-lg font-black font-mono truncate">+{gold}</span>
        </div>
      </div>

      {/* Exp Card */}
      <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
        <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">
          {isAverage ? 'Avg Exp' : 'Exp'}
        </span>
        <div className="flex items-center gap-1 sm:gap-1.5 text-indigo-400 min-w-0">
          <Zap size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
          <span className="text-[10px] sm:text-lg font-black font-mono truncate">+{exp}</span>
        </div>
      </div>

      {/* Time Card */}
      <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
        <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">
          {isAverage ? 'Avg Time' : 'Time'}
        </span>
        <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 min-w-0">
          <Sword size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
          <span className="text-[10px] sm:text-lg font-black font-mono truncate">
            {formatDuration(timeMinutes)}
          </span>
        </div>
      </div>

      {/* Distracted Card */}
      <div 
        className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0" 
        title={tooltipTitle}
      >
        <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">
          {isAverage ? 'Avg Distracted' : 'Distracted'}
        </span>
        <div className="flex items-center gap-0.5 sm:gap-1 text-rose-400 min-w-0">
          <Zap size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
          <span className="text-[10px] sm:text-lg font-black font-mono truncate">
            {distractionsPerHour}
          </span>
          <span className="text-[8px] sm:text-xs text-rose-400/80 font-mono -ml-0.5">/h</span>
        </div>
      </div>
    </div>
  );
};
