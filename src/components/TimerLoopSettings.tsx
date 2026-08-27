import React from 'react';
import { cn } from '../lib/utils';
import { Repeat } from 'lucide-react';
import { SpinnerInput } from './SpinnerInput';

interface TimerLoopSettingsProps {
  isLooping: boolean;
  setIsLooping: (val: boolean) => void;
  loopTarget: number;
  setLoopTarget: (val: number) => void;
  setLoopCount: (val: number) => void;
}

export const TimerLoopSettings: React.FC<TimerLoopSettingsProps> = ({
  isLooping,
  setIsLooping,
  loopTarget,
  setLoopTarget,
  setLoopCount
}) => {
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 text-sm font-bold text-slate-300 cursor-pointer group">
        <div className={cn(
          "w-8 h-5 rounded-full transition-colors relative",
          isLooping ? "bg-indigo-500" : "bg-slate-700"
        )}>
          <div className={cn(
            "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
            isLooping ? "translate-x-3" : "translate-x-0"
          )} />
        </div>
        <input 
          type="checkbox" 
          className="hidden"
          checked={isLooping}
          onChange={(e) => {
            setIsLooping(e.target.checked);
            setLoopCount(0);
          }}
        />
        Loop
      </label>
      {isLooping && (
        <div className="relative ml-1 flex items-center gap-2">
          <SpinnerInput
            allowInfinity
            min={2}
            value={loopTarget < 2 ? -1 : loopTarget}
            onChange={(val) => {
              if (typeof val === 'number' && val >= 2) {
                setLoopTarget(val);
              } else {
                setLoopTarget(0); // 0 acts as infinity based on previous behavior
              }
              setLoopCount(0);
            }}
            className="w-20 px-2 py-1.5 text-xs text-center border bg-slate-800 text-slate-300 focus:border-indigo-500 transition-all font-bold"
          />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Times</span>
        </div>
      )}
    </div>
  );
};
