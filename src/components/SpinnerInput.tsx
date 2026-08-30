import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface SpinnerInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string;
  onChange: (val: number | string) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  allowInfinity?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
}

export const SpinnerInput: React.FC<SpinnerInputProps> = ({ 
  value, 
  onChange, 
  onIncrement, 
  onDecrement,
  allowInfinity = false,
  min,
  max,
  step = 1,
  className,
  ...props 
}) => {
  const isInfinity = allowInfinity && (value === -1 || value === '∞' || value === 0);
  const displayValue = isInfinity ? '∞' : (value === undefined || value === null ? '' : value);

  const getStep = () => Number(step) || 1;

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onIncrement) {
      onIncrement();
      return;
    }
    
    if (isInfinity) {
      onChange(min !== undefined ? Math.max(min, getStep()) : getStep());
      return;
    }
    
    if (typeof value === 'number') {
      const next = Number((value + getStep()).toFixed(5));
      if (max !== undefined && next > max) return;
      onChange(next);
    } else if (value === '') {
      onChange(min !== undefined ? Math.max(min, getStep()) : getStep());
    } else {
      const parsed = parseFloat(value as string);
      if (!isNaN(parsed)) {
        const next = Number((parsed + getStep()).toFixed(5));
        if (max !== undefined && next > max) return;
        onChange(next);
      }
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDecrement) {
      onDecrement();
      return;
    }

    if (isInfinity) return;

    if (typeof value === 'number') {
      const next = Number((value - getStep()).toFixed(5));
      if (allowInfinity && ((min !== undefined && next < min) || next <= 0)) {
        onChange(-1);
        return;
      }
      if (min !== undefined && next < min) return;
      onChange(next);
    } else if (value === '') {
      if (allowInfinity) {
        onChange(-1);
      } else {
        onChange(min !== undefined ? min : 0);
      }
    } else {
      const parsed = parseFloat(value as string);
      if (!isNaN(parsed)) {
        const next = Number((parsed - getStep()).toFixed(5));
        if (allowInfinity && ((min !== undefined && next < min) || next <= 0)) {
          onChange(-1);
          return;
        }
        if (min !== undefined && next < min) return;
        onChange(next);
      }
    }
  };

  return (
    <div className="relative group/spinner inline-flex items-center w-full">
      <input 
        type="text" 
        value={displayValue} 
        onChange={e => {
          const val = e.target.value;
          if (val === '' || (allowInfinity && val === '∞')) {
            onChange(allowInfinity && val === '∞' ? -1 : '');
          } else {
            const parsed = val.includes('.') ? parseFloat(val) : parseInt(val, 10);
            if (!isNaN(parsed)) {
              onChange(parsed);
            } else if (val.endsWith('.')) {
              // Allow typing decimal point
              onChange(val);
            }
          }
        }} 
        className={cn(
          "w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 transition-colors",
          className,
          "!pr-6",
          isInfinity && "text-indigo-400 font-bold"
        )} 
        {...props}
      />
      <div className="absolute right-1 top-1 bottom-1 w-4.5 sm:w-5 flex flex-col justify-between py-0.5 pointer-events-auto rounded overflow-hidden select-none">
        <button 
          type="button"
          tabIndex={-1}
          onClick={handleIncrement}
          aria-label="Increment"
          className="flex-1 w-full flex items-center justify-center rounded-t text-slate-400 hover:text-indigo-400 hover:bg-slate-700/70 active:bg-indigo-500/20 active:scale-90 transition-all cursor-pointer"
        >
          <ChevronUp size={11} strokeWidth={2.5} />
        </button>
        <button 
          type="button"
          tabIndex={-1}
          onClick={handleDecrement}
          aria-label="Decrement"
          className="flex-1 w-full flex items-center justify-center rounded-b text-slate-400 hover:text-indigo-400 hover:bg-slate-700/70 active:bg-indigo-500/20 active:scale-90 transition-all cursor-pointer"
        >
          <ChevronDown size={11} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
