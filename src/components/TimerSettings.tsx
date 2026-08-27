import React, { useState } from 'react';
import { Settings2, Plus, Trash2, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { TimerLoopSettings } from './TimerLoopSettings';
import { SpinnerInput } from './SpinnerInput';

interface TimerSettingsProps {
  focusDuration: number;
  setFocusDuration: (val: number) => void;
  restDuration: number;
  setRestDuration: (val: number) => void;
  enableRest: boolean;
  setEnableRest: (val: boolean) => void;
  isLooping: boolean;
  setIsLooping: (val: boolean) => void;
  loopTarget: number;
  setLoopTarget: (val: number) => void;
  loopCount: number;
  setLoopCount: (val: number) => void;
  isActive: boolean;
  isResting: boolean;
  applyPreset: (focus: number, rest: number) => void;
  handleCustomChange: (focus: number, rest: number) => void;
  presets: { focus: number, rest: number }[];
  addPreset: (focus: number, rest: number) => void;
  removePreset: (focus: number, rest: number) => void;
}

export const TimerSettings: React.FC<TimerSettingsProps> = ({
  focusDuration,
  setFocusDuration,
  restDuration,
  setRestDuration,
  enableRest,
  setEnableRest,
  isLooping,
  setIsLooping,
  loopTarget,
  setLoopTarget,
  loopCount,
  setLoopCount,
  isActive,
  isResting,
  applyPreset,
  handleCustomChange,
  presets,
  addPreset,
  removePreset
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{ focus: number, rest: number } | null>(null);

  const isCurrentMatchPreset = presets.some(p => p.focus === focusDuration && p.rest === restDuration);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6 backdrop-blur-sm relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 shrink-0">
          <Settings2 size={16} />
          Timer Settings
        </h3>

        {/* Dynamic Preset Management moved to Header */}
        <div className="flex-1 flex items-center justify-end gap-3 px-2">
          {!isCurrentMatchPreset && (
            <button
              onClick={() => addPreset(focusDuration, restDuration)}
              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all border border-dashed border-slate-700 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400 flex items-center justify-center bg-slate-900/30"
              title="Save current time as preset"
            >
              <Plus size={14} />
            </button>
          )}
          {isCurrentMatchPreset && presets.length > 1 && (
            <button
              onClick={() => {
                const preset = presets.find(p => p.focus === focusDuration && p.rest === restDuration);
                if (preset) setDeleteConfirm(preset);
              }}
              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-800 text-slate-500 hover:border-red-500/30 hover:text-red-400 flex items-center justify-center bg-slate-900/30"
              title="Remove this preset"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300 cursor-pointer group">
            <div className={cn(
              "w-8 h-5 rounded-full transition-colors relative",
              enableRest ? "bg-emerald-500" : "bg-slate-700"
            )}>
              <div className={cn(
                "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                enableRest ? "translate-x-3" : "translate-x-0"
              )} />
            </div>
            <input 
              type="checkbox" 
              className="hidden"
              checked={enableRest}
              onChange={(e) => setEnableRest(e.target.checked)}
            />
            Rest
          </label>
          <TimerLoopSettings 
            isLooping={isLooping}
            setIsLooping={setIsLooping}
            loopTarget={loopTarget}
            setLoopTarget={setLoopTarget}
            setLoopCount={setLoopCount}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {presets.map((p, idx) => (
          <div key={idx} className="group relative">
            <button
              onClick={() => applyPreset(p.focus, p.rest)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2",
                focusDuration === p.focus && restDuration === p.rest 
                  ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 ring-1 ring-indigo-500/30" 
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
              )}
            >
              {enableRest ? `${p.focus} min + ${p.rest} min` : `${p.focus} min`}
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Focus (min)</span>
          <SpinnerInput 
            min={1}
            value={focusDuration} 
            onChange={(val) => handleCustomChange(typeof val === 'number' ? val : 1, restDuration)}
            className="w-24 text-center text-white font-mono focus:border-indigo-500"
          />
        </div>
        {enableRest && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Rest (min)</span>
            <SpinnerInput 
              min={1}
              value={restDuration} 
              onChange={(val) => handleCustomChange(focusDuration, typeof val === 'number' ? val : 1)}
              className="w-24 text-center text-emerald-400 font-mono focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Delete Preset?</p>
              <p className="text-sm font-bold text-white">
                {deleteConfirm.focus} min {enableRest ? `+ ${deleteConfirm.rest} min` : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removePreset(deleteConfirm.focus, deleteConfirm.rest);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
