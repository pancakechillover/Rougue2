import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RotateCcw, 
  AlertTriangle, 
  Calendar, 
  Check, 
  Loader2, 
  CheckCircle2, 
  Sliders, 
  Sparkles,
  Layers
} from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { cn } from '../../lib/utils';
import { AppState, EfficiencyRatingConfig } from '../../types';
import { 
  getRecordedDateRangeInfo, 
  filterDatesInRange, 
  recalculateEfficiencyHistory 
} from '../../lib/efficiencyUtils';
import { playSound } from '../../lib/sound';

type RangePreset = 'all' | '7d' | '30d' | '90d' | 'month' | 'custom';

interface RecalculateHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  newConfig: EfficiencyRatingConfig;
  onSuccess: (updatedCount: number, affectedDates: string[]) => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
}

export const RecalculateHistoryModal: React.FC<RecalculateHistoryModalProps> = ({
  isOpen,
  onClose,
  state,
  newConfig,
  onSuccess,
  onUpdateState,
}) => {
  // Date range discovery
  const rangeInfo = useMemo(() => getRecordedDateRangeInfo(state), [state]);
  
  const [preset, setPreset] = useState<RangePreset>('all');
  const [startDate, setStartDate] = useState<string>(rangeInfo.earliestDate);
  const [endDate, setEndDate] = useState<string>(rangeInfo.latestDate);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [progressCount, setProgressCount] = useState<number>(0);
  const [resultCount, setResultCount] = useState<number>(0);

  // Calculate matching dates
  const matchingDates = useMemo(() => {
    return filterDatesInRange(rangeInfo.allRecordedDates, startDate, endDate);
  }, [rangeInfo.allRecordedDates, startDate, endDate]);

  // Handle Preset Changes
  const applyPreset = (newPreset: RangePreset) => {
    setPreset(newPreset);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (newPreset === 'all') {
      setStartDate(rangeInfo.earliestDate);
      setEndDate(rangeInfo.latestDate);
    } else if (newPreset === '7d') {
      setStartDate(format(subDays(today, 6), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (newPreset === '30d') {
      setStartDate(format(subDays(today, 29), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (newPreset === '90d') {
      setStartDate(format(subDays(today, 89), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (newPreset === 'month') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    }
  };

  const handleStartRecalculation = async () => {
    if (matchingDates.length === 0) return;

    setStatus('processing');
    setProgressCount(0);

    // Give visual animation feedback before batch execution
    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const result = recalculateEfficiencyHistory(
        state,
        startDate,
        endDate,
        newConfig
      );

      setProgressCount(result.updatedCount);
      setResultCount(result.updatedCount);

      // Apply to global state
      if (onUpdateState) {
        onUpdateState({
          efficiencyRatingConfig: newConfig,
          dailyLogs: result.updatedLogs,
        });
      }

      playSound('calculate', state.soundVolume ?? 0.5, state.soundEnabled ?? true);
      setStatus('success');

      // Notify parent
      onSuccess(result.updatedCount, result.datesProcessed);

      // Automatically close after a short delay
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 1200);
    } catch (e) {
      console.error('Failed to recalculate efficiency history:', e);
      setStatus('idle');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (status !== 'processing') onClose();
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <RotateCcw size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-100">
                  Recalculate Efficiency History
                </h2>
                <p className="text-[11px] text-slate-400">
                  Batch recompute past ratings using new formula rules
                </p>
              </div>
            </div>
            {status !== 'processing' && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
            {status === 'idle' && (
              <>
                {/* Irreversible Warning Box */}
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-3 text-amber-300">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-amber-200">
                      Irreversible Operation
                    </p>
                    <p className="text-amber-300/80 leading-relaxed text-[11px]">
                      This will overwrite existing daily ratings in the selected date range using the current formula weights and focus targets. Manual ratings will be replaced.
                    </p>
                  </div>
                </div>

                {/* Formula Snapshot */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Sliders size={13} className="text-indigo-400" /> Applied Formula Parameters
                    </span>
                    <span className="text-indigo-400 font-mono">
                      {newConfig.completionRateWeight ?? 70}% Comp + {newConfig.focusQualityWeight ?? 30}% Focus
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block">Max Distractions:</span>
                      <span className="font-semibold text-slate-200">{newConfig.maxDistractionsPerHour ?? 10} / hr</span>
                    </div>
                    <div className="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block">Target Source:</span>
                      <span className="font-semibold text-slate-200">
                        {newConfig.targetTimeMode === 'daily_goal' ? 'Daily Goal' : 'Workstation Time'}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 text-[10px] block">Metric Bounds:</span>
                      <span className={cn(
                        "font-semibold",
                        newConfig.capMetrics !== false ? "text-slate-200" : "text-amber-300"
                      )}>
                        {newConfig.capMetrics !== false ? "Capped (0–100%)" : "Uncapped"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date Range Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar size={13} className="text-indigo-400" />
                    Select Time Range
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'all', label: 'All Recorded Time' },
                      { id: '7d', label: 'Past 7 Days' },
                      { id: '30d', label: 'Past 30 Days' },
                      { id: '90d', label: 'Past 90 Days' },
                      { id: 'month', label: 'This Month' },
                      { id: 'custom', label: 'Custom Range' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id as RangePreset)}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs font-medium border transition-all truncate text-center",
                          preset === p.id
                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-semibold"
                            : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPreset('custom');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPreset('custom');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Match Summary Badge */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Layers size={14} className="text-indigo-400" />
                    <span>Matching records found:</span>
                  </div>
                  <span className="font-bold font-mono text-indigo-400">
                    {matchingDates.length} {matchingDates.length === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </>
            )}

            {/* Processing State with Spinner */}
            {status === 'processing' && (
              <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative flex items-center justify-center">
                  <Loader2 size={40} className="animate-spin text-indigo-400" />
                  <Sparkles size={16} className="absolute text-indigo-300 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-100">
                    Recalculating Efficiency Ratings...
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluating {matchingDates.length} daily logs against the new formula
                  </p>
                </div>
                <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full w-full animate-pulse rounded-full" />
                </div>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
                <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-300">
                    Recalculation Complete!
                  </h3>
                  <p className="text-xs text-slate-400">
                    Successfully updated {resultCount} daily efficiency records.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {status === 'idle' && (
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRecalculation}
                disabled={matchingDates.length === 0}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all active:scale-95",
                  matchingDates.length > 0
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                )}
              >
                <Check size={14} />
                <span>Confirm & Recalculate ({matchingDates.length} Days)</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
