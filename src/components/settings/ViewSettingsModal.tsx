import React from 'react';
import { motion } from 'motion/react';
import { X, LayoutTemplate } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

interface ViewSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  opts: {
    showDailyBar?: boolean;
    showDailyDonut?: boolean;
    showWeeklyBar?: boolean;
    showWeeklyDonut?: boolean;
    showRoutineTracker?: boolean;
    showWorkstationTracker?: boolean;
    showSleepTracker?: boolean;
    showTagTracker?: boolean;
    dailyDonutMode?: '24h' | 'compact' | 'tags';
    weeklyDonutMode?: 'time_of_day' | 'day_of_week' | 'tags';
    showHeatmap?: boolean;
    averageCalculationBase?: 'active_days' | 'total_days';
    yAxisMaxMode?: 'dynamic' | 'fixed';
  };
  onUpdate: (updates: Partial<ViewSettingsModalProps['opts']>) => void;
  /** Heatmap colour saturation ceiling — lives on the main state, not in opts. */
  heatmapScaleMax?: number;
  onHeatmapScaleChange?: (value: number) => void;
}

export const ViewSettingsModal: React.FC<ViewSettingsModalProps> = ({
  isOpen,
  onClose,
  opts,
  onUpdate,
  heatmapScaleMax,
  onHeatmapScaleChange,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md m-0 p-0">
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-900 border-0 rounded-none w-screen h-screen h-[100dvh] shadow-2xl overflow-hidden relative flex flex-col z-10"
      >
        {/* Top Full-Screen Header (Matches Start of the Day / End of the Day) */}
        <div className="py-4 px-6 sm:px-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none z-0">
            <LayoutTemplate size={80} />
          </div>

          <div className="flex justify-between items-center relative z-10 w-full">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-1 flex items-center gap-3">
              Dashboard Layout <LayoutTemplate className="text-indigo-400" size={24} />
            </h2>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Full-Screen Body */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-grow custom-scrollbar lg:grid lg:grid-cols-2 lg:gap-8 space-y-6 lg:space-y-0 relative items-start">
          {/* Left Column: Daily & Weekly Charts */}
          <div className="space-y-4 max-w-xl mx-auto w-full">
            {/* Daily Display Card */}
            <div className="bg-slate-800/20 rounded-2xl p-5 border border-slate-700/30 space-y-3.5">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                Daily Display
              </h3>
              <div className="space-y-3">
                <ToggleRow
                  label="Daily Bar Chart"
                  checked={opts.showDailyBar ?? true}
                  onChange={() => onUpdate({ showDailyBar: !(opts.showDailyBar ?? true) })}
                />
                <ToggleRow
                  label="Daily Pie Chart"
                  checked={opts.showDailyDonut ?? false}
                  onChange={() => onUpdate({ showDailyDonut: !(opts.showDailyDonut ?? false) })}
                />
                {opts.showDailyDonut && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => onUpdate({ dailyDonutMode: 'compact' })}
                      className={cn(
                        'py-2 px-2 text-xs font-bold rounded-xl border transition-all',
                        (opts.dailyDonutMode ?? 'compact') === 'compact'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      Compact (Sum)
                    </button>
                    <button
                      onClick={() => onUpdate({ dailyDonutMode: '24h' })}
                      className={cn(
                        'py-2 px-2 text-xs font-bold rounded-xl border transition-all',
                        opts.dailyDonutMode === '24h'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      24h Distribution
                    </button>
                    <button
                      onClick={() => onUpdate({ dailyDonutMode: 'tags' })}
                      className={cn(
                        'py-2 px-2 text-xs font-bold rounded-xl border transition-all',
                        opts.dailyDonutMode === 'tags'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      By Tag
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Display Card */}
            <div className="bg-slate-800/20 rounded-2xl p-5 border border-slate-700/30 space-y-3.5">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                Weekly Display
              </h3>
              <div className="space-y-3">
                <ToggleRow
                  label="Weekly Bar Chart"
                  checked={opts.showWeeklyBar ?? true}
                  onChange={() => onUpdate({ showWeeklyBar: !(opts.showWeeklyBar ?? true) })}
                />
                <ToggleRow
                  label="Weekly Pie Chart"
                  checked={opts.showWeeklyDonut ?? false}
                  onChange={() => onUpdate({ showWeeklyDonut: !(opts.showWeeklyDonut ?? false) })}
                />
                {opts.showWeeklyDonut && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => onUpdate({ weeklyDonutMode: 'time_of_day' })}
                      className={cn(
                        'py-2 px-2 text-xs font-bold rounded-xl border transition-all',
                        (opts.weeklyDonutMode ?? 'time_of_day') === 'time_of_day'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      Morning/Night
                    </button>
                    <button
                      onClick={() => onUpdate({ weeklyDonutMode: 'day_of_week' })}
                      className={cn(
                        'py-2 px-2 text-xs font-bold rounded-xl border transition-all',
                        opts.weeklyDonutMode === 'day_of_week'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      Day of Week
                    </button>
                    <button
                      onClick={() => onUpdate({ weeklyDonutMode: 'tags' })}
                      className={cn(
                        'py-2 px-2 text-xs font-bold rounded-xl border transition-all',
                        opts.weeklyDonutMode === 'tags'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      )}
                    >
                      By Tag
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Modules & Calculation Baselines */}
          <div className="space-y-4 max-w-xl mx-auto w-full">
            {/* Modules Card */}
            <div className="bg-slate-800/20 rounded-2xl p-5 border border-slate-700/30 space-y-3.5">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                Modules
              </h3>
              <div className="space-y-3">
                <ToggleRow
                  label="Tag Breakdown"
                  checked={opts.showTagTracker ?? true}
                  onChange={() => onUpdate({ showTagTracker: !(opts.showTagTracker ?? true) })}
                />
                <ToggleRow
                  label="Routine Tracker"
                  checked={opts.showRoutineTracker ?? true}
                  onChange={() => onUpdate({ showRoutineTracker: !(opts.showRoutineTracker ?? true) })}
                />
                <ToggleRow
                  label="Workstation Tracker"
                  checked={opts.showWorkstationTracker ?? true}
                  onChange={() => onUpdate({ showWorkstationTracker: !(opts.showWorkstationTracker ?? true) })}
                />
                <ToggleRow
                  label="Sleep Tracker"
                  checked={opts.showSleepTracker ?? true}
                  onChange={() => onUpdate({ showSleepTracker: !(opts.showSleepTracker ?? true) })}
                />
                <ToggleRow
                  label="Activity Heatmap"
                  checked={opts.showHeatmap ?? true}
                  onChange={() => onUpdate({ showHeatmap: !(opts.showHeatmap ?? true) })}
                />
                {/* Moved here from Settings → General: it is a heatmap display
                    concern, so it belongs with the rest of the layout options. */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-300">Saturation Range</div>
                    <div className="text-[11px] text-slate-500 leading-snug">
                      Sessions needed to reach the darkest cell
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0 rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                    {[8, 16].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onHeatmapScaleChange?.(value)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors',
                          (heatmapScaleMax ?? 8) === value
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        )}
                      >
                        0–{value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Baselines Card */}
            <div className="bg-slate-800/20 rounded-2xl p-5 border border-slate-700/30 space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  Average Calculation
                </h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdate({ averageCalculationBase: 'total_days' })}
                    className={cn(
                      'py-2 px-3 text-xs font-bold rounded-lg transition-all text-center',
                      (opts.averageCalculationBase ?? 'total_days') === 'total_days'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Total Days
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ averageCalculationBase: 'active_days' })}
                    className={cn(
                      'py-2 px-3 text-xs font-bold rounded-lg transition-all text-center',
                      opts.averageCalculationBase === 'active_days'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Active Days
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  Y-Axis Scale
                </h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdate({ yAxisMaxMode: 'dynamic' })}
                    className={cn(
                      'py-2 px-3 text-xs font-bold rounded-lg transition-all text-center',
                      (opts.yAxisMaxMode ?? 'dynamic') === 'dynamic'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Dynamic Max
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ yAxisMaxMode: 'fixed' })}
                    className={cn(
                      'py-2 px-3 text-xs font-bold rounded-lg transition-all text-center',
                      opts.yAxisMaxMode === 'fixed'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    Fixed Max
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <div className="flex items-center justify-between cursor-pointer group" onClick={onChange}>
    <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{label}</span>
    <button
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-indigo-500" : "bg-slate-700"
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  </div>
);
