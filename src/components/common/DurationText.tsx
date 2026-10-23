import React from 'react';
import { cn } from '../../lib/utils';

interface DurationTextProps {
  minutes: number;
  className?: string;
  /** Class for the numeric part. Defaults to font-bold; pass font-black for big emphasis. */
  digitClassName?: string;
}

/**
 * Renders a duration with the numeric part bold and the unit (h / m) lighter
 * and slightly smaller — e.g. **1**h**30**m.
 *
 * `formatDuration()` still returns a plain string for titles / aria labels.
 */
export const DurationText: React.FC<DurationTextProps> = ({
  minutes,
  className,
  digitClassName = 'font-bold',
}) => {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  const Unit = ({ children }: { children: string }) => (
    <span className="font-medium opacity-65 text-[0.82em] tracking-normal ml-[0.5px]">{children}</span>
  );
  const Value = ({ children }: { children: React.ReactNode }) => (
    <span className={cn('tabular-nums', digitClassName)}>{children}</span>
  );

  if (total <= 0) {
    return (
      <span className={cn('inline-flex items-baseline', className)}>
        <Value>0</Value>
        <Unit>m</Unit>
      </span>
    );
  }

  if (hours === 0) {
    return (
      <span className={cn('inline-flex items-baseline', className)}>
        <Value>{mins}</Value>
        <Unit>m</Unit>
      </span>
    );
  }

  if (mins === 0) {
    return (
      <span className={cn('inline-flex items-baseline', className)}>
        <Value>{hours}</Value>
        <Unit>h</Unit>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-baseline', className)}>
      <Value>{hours}</Value>
      <Unit>h</Unit>
      <Value>{mins}</Value>
      <Unit>m</Unit>
    </span>
  );
};
