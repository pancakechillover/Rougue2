import React from 'react';
import { DurationText } from '../../common/DurationText';
import { DAILY_POPOVER_CARD_CLASS, DAILY_POPOVER_TITLE_CLASS } from './StatsDailySection';

export interface TagSliceData {
  name: string;
  colorHex: string;
  minutes: number;
  percentage: number;
  sessionCount: number;
  distractionsPerHour: number;
}

interface TagSlicePopoverProps {
  data: TagSliceData;
}

/**
 * Card for a selected slice of the Tag Breakdown donut.
 *
 * Design is copied from the daily-column card in `StatsDailySection` on purpose
 * — same frame, same title rule, same "Time" row with the value in indigo, same
 * divided off distraction block. The earlier versions (a pinned one-line
 * readout, then a card of my own invention) both read as foreign objects on
 * this page.
 *
 * Opened by clicking a slice, not by hovering: the app is used on tablets and
 * phones, where a hover-only affordance is unreachable.
 */
export const TagSlicePopover: React.FC<TagSlicePopoverProps> = ({ data }) => {
  const { name, minutes, percentage, sessionCount, distractionsPerHour } = data;
  const avgPerSession = sessionCount > 0 ? Math.max(1, Math.round(minutes / sessionCount)) : 0;

  return (
    // `!bg-...` overrides the shared frame's 95% background: the card sits on
    // top of the donut, and at 95% the orange arc bled through the title.
    <div className={`${DAILY_POPOVER_CARD_CLASS} !bg-slate-900`}>
      <p className={`${DAILY_POPOVER_TITLE_CLASS} truncate`}>{name}</p>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Time</span>
          <span className="text-indigo-400 font-bold">
            <DurationText minutes={minutes} />
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Share</span>
          <span className="text-slate-200 font-mono">{percentage.toFixed(1)}%</span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Sessions</span>
          <span className="text-slate-200 font-mono">{sessionCount}</span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Avg / Session</span>
          <span className="text-slate-200">
            <DurationText minutes={avgPerSession} />
          </span>
        </div>
      </div>

      {distractionsPerHour > 0 && (
        <div className="border-t border-slate-800/50 my-1.5 pt-1.5">
          <div className="flex justify-between items-center gap-4 text-xs">
            <span className="text-rose-400 font-medium">Distracted</span>
            <span className="text-rose-300 font-bold font-mono shrink-0">
              {distractionsPerHour.toFixed(1)}
              <span className="text-[10px] text-slate-400 font-normal font-sans">/h</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
