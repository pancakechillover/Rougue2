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
  const isInfinity = allowInfinity && (value === -1 || value === '∞');
  const displayValue = isInfinity ? '∞' : (value === undefined || value === null ? '' : value);

  const getStep = () => Number(step) || 1;

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onIncrement) {
      onIncrement();
      return;
    }
    
    if (isInfinity) {
       onChange(getStep());
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
    if (onDecrement) {
      onDecrement();
      return;
    }

    if (isInfinity) return;

    if (typeof value === 'number') {
      const next = Number((value - getStep()).toFixed(5));
      if (allowInfinity && next <= 0) {
        onChange(-1);
        return;
      }
      if (min !== undefined && next < min) return;
      onChange(next);
    } else if (value === '') {
      onChange(min !== undefined ? min : 0);
    } else {
      const parsed = parseFloat(value as string);
      if (!isNaN(parsed)) {
        const next = Number((parsed - getStep()).toFixed(5));
        if (allowInfinity && next <= 0) {
          onChange(-1);
          return;
        }
        if (min !== undefined && next < min) return;
        onChange(next);
      }
    }
  };

  return (
    <div className="relative group/spinner">
      <input 
        type="text" 
        value={displayValue} 
        onChange={e => {
          const val = e.target.value;
          if (val === '' || (allowInfinity && val === '∞')) {
             onChange(allowInfinity && val === '∞' ? -1 : '');
          } else {
             const parsed = val.includes('.') ? parseFloat(val) : parseInt(val);
             if (!isNaN(parsed)) {
               onChange(parsed);
             } else if (val.endsWith('.')) {
               // Allow typing decimal point
               onChange(val);
             }
          }
        }} 
        className={cn(
          "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:border-indigo-500 transition-colors",
          className
        )} 
        {...props}
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
        <button 
          type="button"
          onClick={handleIncrement}
          className="p-0.5 hover:bg-slate-700 rounded text-slate-500 hover:text-indigo-400 transition-colors"
        >
          <ChevronUp size={14} strokeWidth={3} />
        </button>
        <button 
          type="button"
          onClick={handleDecrement}
          className="p-0.5 hover:bg-slate-700 rounded text-slate-500 hover:text-indigo-400 transition-colors"
        >
          <ChevronDown size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};
