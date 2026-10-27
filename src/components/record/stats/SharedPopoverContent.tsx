import React, { useRef, useLayoutEffect } from 'react';
import { LayoutTemplate, Brain, Wind, Zap, Coins, Clock, Star, RotateCcw } from 'lucide-react';
import { MOOD_OPTIONS } from '../../../constants';
import { DurationText } from '../../common/DurationText';

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
  /** Forwarded to the daily-sessions modal so it can pre-select a period. */
  period?: string;
  /**
   * Set when an outer portal already handles positioning and viewport
   * clamping. Keeps this component from shifting itself a second time —
   * two clamps fighting each other is what made the card jump.
   */
  positioned?: boolean;
}

/**
 * The one popover used everywhere (heatmap cells, weekly bars, daily columns).
 *
 * It used to exist twice — a copy here and another inside StatsWeeklySection —
 * and the two drifted apart (different stat layout, different footer buttons),
 * which showed up as "the heatmap popover looks different from the weekly one".
 * This is now the single implementation.
 *
 * Layout notes:
 * - Fixed narrow width so it never grows into a wide slab on desktop; long
 *   date labels wrap instead of widening the card.
 * - Gold / XP get their own rows (mirrors the weekly view).
 * - Efficiency is `rating * 20` because ratings are 0–5.
 */
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
  period,
  positioned = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const moodOption = mood ? MOOD_OPTIONS.find((m) => m.id === mood) : null;
  const MoodIcon = moodOption ? moodOption.icon : null;

  useLayoutEffect(() => {
    if (positioned) return;

    const clamp = () => {
      const el = containerRef.current;
      if (!el) return;

      // Reset the shift first so the natural position can be measured.
      el.style.marginLeft = '0px';
      el.style.marginTop = '0px';

      const rect = el.getBoundingClientRect();
      const padding = 12;
      // clientWidth excludes the vertical scrollbar; innerWidth includes it and
      // would let the card slide underneath.
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
    window.addEventListener('resize', clamp);
    window.addEventListener('scroll', clamp, true);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', clamp);
      window.removeEventListener('scroll', clamp, true);
    };
  }, [positioned, label, totalSessions, coins, xp, distractions, efficiency, mood]);

  const distCount = Number(distractions) || 0;
  const hourlyRate =
    totalSessions > 0
      ? (Math.round((distCount / (totalSessions / 60)) * 10) / 10).toFixed(1)
      : distCount;

  return (
    <div
      ref={containerRef}
      className="shared-popover-content animate-popover-enter bg-slate-900/95 backdrop-blur-md border border-slate-700/50 shadow-xl shadow-indigo-500/10 rounded-xl p-3.5 sm:p-4 z-[100] w-[210px] sm:w-[230px] max-w-[calc(100vw-24px)] text-left box-border"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-slate-50 font-bold mb-2 pb-2 border-b border-slate-800/50 text-[13px] sm:text-sm">
        {label}
      </p>

      <div className="space-y-1.5 text-xs text-slate-300">
        {totalSessions > 0 ? (
          <>
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1 text-slate-500">
                <Clock size={11} className="text-indigo-400" />
                Study Time
              </span>
              <span className="text-slate-50 font-bold">
                <DurationText minutes={totalSessions} />
              </span>
            </div>

            {morning > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-amber-400">Morning</span>
                <span className="text-slate-200">
                  <DurationText minutes={morning} />
                </span>
              </div>
            )}
            {afternoon > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-orange-400">Afternoon</span>
                <span className="text-slate-200">
                  <DurationText minutes={afternoon} />
                </span>
              </div>
            )}
            {night > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-indigo-400">Night</span>
                <span className="text-slate-200">
                  <DurationText minutes={night} />
                </span>
              </div>
            )}
            {other > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Other</span>
                <span className="text-slate-200">
                  <DurationText minutes={other} />
                </span>
              </div>
            )}

            <div className="border-t border-slate-800/50 my-1.5 pt-1.5 flex justify-between gap-4">
              <span className="flex items-center gap-1 text-yellow-400">
                <Coins size={11} />
                Gold
              </span>
              <span className="text-slate-200 font-mono">+{coins}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1 text-cyan-400">
                <Zap size={11} />
                XP
              </span>
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
                  ({hourlyRate}/h)
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

        {efficiency !== undefined && efficiency !== null && efficiency > 0 && (
          <div className="flex justify-between items-center gap-4 pt-1 mt-1 border-t border-slate-800/50">
            <span className="flex items-center gap-1 text-indigo-400 font-medium">
              <Star size={11} className="fill-indigo-400" />
              Efficiency
            </span>
            <span className="text-emerald-400 font-bold font-mono">
              {(Number(efficiency) * 20).toFixed(1)}%
            </span>
          </div>
        )}

        {MoodIcon && moodOption && (
          <div className="border-t border-slate-800/50 pt-1.5 mt-1.5 flex items-center justify-between gap-2">
            <span className="text-slate-500">Mood</span>
            <div className="flex items-center gap-1">
              <MoodIcon size={14} className={moodOption.color} />
              <span className="font-medium text-slate-200">{moodOption.label}</span>
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
                window.dispatchEvent(
                  new CustomEvent('statsShowDailySessionsModal', {
                    detail: { timestamp: dateTimestamp, period: period || 'total' },
                  })
                );
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
