import { parseISO, isValid, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { AppState, WorkstationInterval, ActiveWorkstationSession } from '../types';
import { getSettlementDay } from './utils';

export const DEFAULT_WORKSTATION_LOCATIONS = [
  'Home',
  'Lab',
  'Library'
] as const;

export const MAX_WORKSTATION_SESSION_MINUTES = 240; // 4 hours maximum single session
export const MAX_WORKSTATION_SESSION_MS = MAX_WORKSTATION_SESSION_MINUTES * 60 * 1000;

/**
 * Returns the configured workstation locations for the user or default 3 locations.
 */
export function getWorkstationLocations(state: AppState): string[] {
  if (state.workstationLocations && state.workstationLocations.length > 0) {
    return state.workstationLocations;
  }
  return [...DEFAULT_WORKSTATION_LOCATIONS];
}

/**
 * Calculates total workstation minutes for a given date, including any active ongoing session.
 */
export function getWorkstationTotalMinutes(
  dateStr: string,
  state: AppState,
  now: Date = new Date()
): number {
  const intervals = state.workstationLogs?.[dateStr] || [];
  let totalMins = 0;

  for (const interval of intervals) {
    if (typeof interval.durationMinutes === 'number' && interval.durationMinutes > 0) {
      totalMins += interval.durationMinutes;
    } else if (interval.startTime && interval.endTime) {
      const start = parseISO(interval.startTime);
      const end = parseISO(interval.endTime);
      if (isValid(start) && isValid(end)) {
        totalMins += Math.max(0, differenceInMinutes(end, start));
      }
    }
  }

  // Include active session if it belongs to this date
  const active = state.activeWorkstationSession;
  if (active && active.startTime) {
    const activeStart = parseISO(active.startTime);
    if (isValid(activeStart)) {
      const activeDateStr = getSettlementDay(activeStart, state.timeSettings);
      if (activeDateStr === dateStr) {
        const activeMins = Math.min(MAX_WORKSTATION_SESSION_MINUTES, Math.max(0, differenceInMinutes(now, activeStart)));
        totalMins += activeMins;
      }
    }
  }

  return totalMins;
}

/**
 * Retrieves the count of workstation intervals for a given date.
 */
export function getWorkstationIntervalCount(
  dateStr: string,
  state: AppState
): number {
  const intervals = state.workstationLogs?.[dateStr] || [];
  let count = intervals.length;

  const active = state.activeWorkstationSession;
  if (active && active.startTime) {
    const activeStart = parseISO(active.startTime);
    if (isValid(activeStart)) {
      const activeDateStr = getSettlementDay(activeStart, state.timeSettings);
      if (activeDateStr === dateStr) {
        count += 1;
      }
    }
  }

  return count;
}

export interface EffectiveTargetFocusResult {
  targetMinutes: number;
  targetHours: number;
  source: 'workstation' | 'goal' | 'manual';
  workstationMinutes: number;
  intervalCount: number;
  fallbackGoalMinutes: number;
  conversionRate: number;
}

/**
 * Calculates the effective target focus minutes for efficiency rating.
 * Prioritizes workstation presence time when available; smoothly falls back to daily pomodoro goal.
 */
export function getEffectiveTargetFocusMinutes(
  dateStr: string,
  state: AppState,
  effectiveFocusMinutes: number = 0,
  now: Date = new Date()
): EffectiveTargetFocusResult {
  const workstationMinutes = getWorkstationTotalMinutes(dateStr, state, now);
  const intervalCount = getWorkstationIntervalCount(dateStr, state);
  const conversionRate = workstationMinutes > 0 
    ? Math.min(100, Math.round((effectiveFocusMinutes / workstationMinutes) * 100))
    : 0;

  // Derive daily pomodoro goal fallback
  const parsedDate = parseISO(dateStr);
  const day = isValid(parsedDate) ? parsedDate.getDay() : new Date().getDay();
  const dailyGoalCount = (state.useSameDailyProgressGoalEveryDay ?? true)
    ? (state.dailyProgressGoal ?? 8)
    : (state.dailyProgressGoalConfig?.[day] ?? 8);

  const pomodoroDuration = (state.standardSessionMinutes || 25) + (state.standardRestMinutes || 5);
  const fallbackGoalMinutes = Math.max(1, dailyGoalCount * pomodoroDuration);

  const mode = state.efficiencyRatingConfig?.targetTimeMode || 'workstation';

  if (mode === 'daily_goal') {
    const targetMins = Math.max(fallbackGoalMinutes, effectiveFocusMinutes, 1);
    return {
      targetMinutes: targetMins,
      targetHours: Number((targetMins / 60).toFixed(2)),
      source: 'goal',
      workstationMinutes,
      intervalCount,
      fallbackGoalMinutes,
      conversionRate
    };
  }

  // Workstation mode (default)
  if (workstationMinutes > 0) {
    const targetMins = Math.max(workstationMinutes, effectiveFocusMinutes, 1);
    return {
      targetMinutes: targetMins,
      targetHours: Number((targetMins / 60).toFixed(2)),
      source: 'workstation',
      workstationMinutes,
      intervalCount,
      fallbackGoalMinutes,
      conversionRate
    };
  }

  // Fallback to daily goal if no workstation check-in today
  const targetMins = Math.max(fallbackGoalMinutes, effectiveFocusMinutes, 1);
  return {
    targetMinutes: targetMins,
    targetHours: Number((targetMins / 60).toFixed(2)),
    source: 'goal',
    workstationMinutes: 0,
    intervalCount: 0,
    fallbackGoalMinutes,
    conversionRate: 0
  };
}

/**
 * Helper to compute elapsed time string (e.g. "02h 15m 30s" or "02:15:30") from ISO start time.
 */
export function getActiveSessionDurationFormatted(
  startTimeISO: string,
  now: Date = new Date()
): { hours: number; minutes: number; seconds: number; textShort: string; textClock: string } {
  const start = parseISO(startTimeISO);
  if (!isValid(start)) {
    return { hours: 0, minutes: 0, seconds: 0, textShort: '0m', textClock: '00:00:00' };
  }

  const totalSecs = Math.min(
    MAX_WORKSTATION_SESSION_MINUTES * 60,
    Math.max(0, differenceInSeconds(now, start))
  );
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const textClock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  let textShort = '';
  if (hours > 0) {
    textShort = `${hours}h ${minutes}m`;
  } else {
    textShort = `${minutes}m ${seconds}s`;
  }

  return { hours, minutes, seconds, textShort, textClock };
}
