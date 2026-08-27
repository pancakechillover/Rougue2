import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutTemplate, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
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
    showSleepTracker?: boolean;
    dailyDonutMode?: '24h' | 'compact';
    weeklyDonutMode?: 'time_of_day' | 'day_of_week';
    showHeatmap?: boolean;
  };
  onUpdate: (updates: Partial<ViewSettingsModalProps['opts']>) => void;
}

export const ViewSettingsModal: React.FC<ViewSettingsModalProps> = ({ isOpen, onClose, opts, onUpdate }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-xl">
              <LayoutTemplate className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 uppercase tracking-widest text-sm">Dashboard Layout</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors p-2 bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Daily Configurations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Daily Display</h3>
            <div className="space-y-3 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50">
              <ToggleRow 
                label="Daily Bar Chart" 
                checked={opts.showDailyBar ?? true} 
                onChange={() => onUpdate({ showDailyBar: !(opts.showDailyBar ?? true) })}
              />
              <div className="h-px bg-slate-700/50" />
              <ToggleRow 
                label="Daily Pie Chart" 
                checked={opts.showDailyDonut ?? false} 
                onChange={() => onUpdate({ showDailyDonut: !(opts.showDailyDonut ?? false) })}
              />
              {opts.showDailyDonut && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onUpdate({ dailyDonutMode: 'compact' })}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all",
                      opts.dailyDonutMode !== '24h' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    Compact (Sum)
                  </button>
                  <button
                    onClick={() => onUpdate({ dailyDonutMode: '24h' })}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all",
                      opts.dailyDonutMode === '24h' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    24h Distribution
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Configurations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Weekly Display</h3>
            <div className="space-y-3 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50">
              <ToggleRow 
                label="Weekly Bar Chart" 
                checked={opts.showWeeklyBar ?? true} 
                onChange={() => onUpdate({ showWeeklyBar: !(opts.showWeeklyBar ?? true) })}
              />
              <div className="h-px bg-slate-700/50" />
              <ToggleRow 
                label="Weekly Pie Chart" 
                checked={opts.showWeeklyDonut ?? false} 
                onChange={() => onUpdate({ showWeeklyDonut: !(opts.showWeeklyDonut ?? false) })}
              />
              {opts.showWeeklyDonut && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onUpdate({ weeklyDonutMode: 'time_of_day' })}
                    className={cn(
                      "flex-1 py-1.5 px-1 text-[11px] font-bold rounded-lg border transition-all",
                      opts.weeklyDonutMode === 'time_of_day' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    Morning/Night
                  </button>
                  <button
                    onClick={() => onUpdate({ weeklyDonutMode: 'day_of_week' })}
                    className={cn(
                      "flex-1 py-1.5 px-1 text-[11px] font-bold rounded-lg border transition-all",
                      opts.weeklyDonutMode === 'day_of_week' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    Day of Week
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Other Modules */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Modules</h3>
            <div className="space-y-3 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50">
              <ToggleRow 
                label="Routine Tracker" 
                checked={opts.showRoutineTracker ?? true} 
                onChange={() => onUpdate({ showRoutineTracker: !(opts.showRoutineTracker ?? true) })}
              />
              <div className="h-px bg-slate-700/50" />
              <ToggleRow 
                label="Sleep Tracker" 
                checked={opts.showSleepTracker ?? true} 
                onChange={() => onUpdate({ showSleepTracker: !(opts.showSleepTracker ?? true) })}
              />
              <div className="h-px bg-slate-700/50" />
              <ToggleRow 
                label="Activity Heatmap" 
                checked={opts.showHeatmap ?? true} 
                onChange={() => onUpdate({ showHeatmap: !(opts.showHeatmap ?? true) })}
              />
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
