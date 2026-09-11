import { StudySession, Team, TeamMember } from '../types';
import { getSessionEffectiveMinutes } from './utils';

export function getCycleKey(targetType?: string, resetTimeStr = '00:00', date: Date = new Date()): string {
  const type = targetType || 'total_time';
  if (type === 'total_time') return 'total';

  const resetHour = parseInt(resetTimeStr.split(':')[0] || '0', 10);
  const d = new Date(date);
  if (d.getHours() < resetHour) {
    d.setDate(d.getDate() - 1);
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  if (type === 'daily_time') {
    return `${y}-${m}-${day}`;
  }

  if (type === 'weekly_time') {
    const dayOfWeek = d.getDay();
    const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diffToMonday);
    const my = monday.getFullYear();
    const mm = pad(monday.getMonth() + 1);
    const md = pad(monday.getDate());
    return `W-${my}-${mm}-${md}`;
  }

  if (type === 'monthly_time') {
    return `M-${y}-${m}`;
  }

  if (type === 'yearly_time') {
    return `Y-${y}`;
  }

  return 'total';
}

export function getCycleBounds(targetType?: string, resetTimeStr = '00:00', date: Date = new Date()): { start: Date; end: Date; displayString: string } {
  const type = targetType || 'total_time';
  const resetHour = parseInt(resetTimeStr.split(':')[0] || '0', 10);
  const now = new Date(date);

  if (type === 'total_time') {
    return {
      start: new Date(0),
      end: new Date(8640000000000000),
      displayString: 'All Time'
    };
  }

  const start = new Date(now);
  start.setHours(resetHour, 0, 0, 0);
  if (now.getHours() < resetHour) {
    start.setDate(start.getDate() - 1);
  }

  let end = new Date(start);

  if (type === 'weekly_time') {
    const dayOfWeek = start.getDay();
    const diffToMonday = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    start.setDate(diffToMonday);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (type === 'monthly_time') {
    start.setDate(1);
    end = new Date(start);
    end.setMonth(end.getMonth() + 1);
  } else if (type === 'yearly_time') {
    start.setMonth(0, 1);
    end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
  } else {
    // daily_time
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const displayString = `${pad(start.getMonth() + 1)}/${pad(start.getDate())} ${pad(start.getHours())}:00 — ${pad(end.getMonth() + 1)}/${pad(end.getDate())} ${pad(end.getHours())}:00`;

  return { start, end, displayString };
}

export function calculateUserTotalFocus(history: StudySession[] = [], includeRestTimeInTasks = false): number {
  if (!Array.isArray(history) || history.length === 0) return 0;
  return Math.round(
    history.reduce((acc, s) => acc + getSessionEffectiveMinutes(s, includeRestTimeInTasks), 0)
  );
}

export function calculateUserCycleFocus(
  history: StudySession[] = [],
  targetType = 'total_time',
  resetTimeStr = '00:00',
  includeRestTimeInTasks = false
): number {
  if (!Array.isArray(history) || history.length === 0) return 0;
  if (targetType === 'total_time' || !targetType) {
    return calculateUserTotalFocus(history, includeRestTimeInTasks);
  }

  const { start, end } = getCycleBounds(targetType, resetTimeStr);
  const startTime = start.getTime();
  const endTime = end.getTime();

  const matchingMinutes = history.reduce((acc, s) => {
    if (!s.timestamp) return acc;
    const sessionTime = new Date(s.timestamp).getTime();
    if (sessionTime >= startTime && sessionTime < endTime) {
      return acc + getSessionEffectiveMinutes(s, includeRestTimeInTasks);
    }
    return acc;
  }, 0);

  return Math.round(matchingMinutes);
}

export function getTeamCycleState(
  team: Team,
  userCalculated?: {
    cycleFocus?: number;
    totalFocus?: number;
    userId?: string;
    uniqueId?: string;
  }
): { cycleProgress: number; memberProgress: Record<string, number>; currentCycleKey: string } {
  const targetType = team.config?.targetType || 'total_time';
  const resetTime = team.config?.resetTime || '00:00';
  const currentCycleKey = getCycleKey(targetType, resetTime);
  const { start: cycleStart } = getCycleBounds(targetType, resetTime);
  const cycleStartTime = cycleStart.getTime();

  let cycleProgress = 0;
  const memberProgress: Record<string, number> = {};

  if (!team.members || team.members.length === 0) {
    return { cycleProgress: 0, memberProgress: {}, currentCycleKey };
  }

  team.members.forEach((m: TeamMember) => {
    let mProg = 0;
    const isCurrentUser = Boolean(
      (userCalculated?.userId && m.userId === userCalculated.userId) ||
      (userCalculated?.uniqueId && m.uniqueId === userCalculated.uniqueId) ||
      (team.myUserId && m.userId === team.myUserId)
    );

    if (targetType === 'total_time') {
      mProg = m.totalFocusTime || 0;
      if (isCurrentUser && userCalculated?.totalFocus !== undefined) {
        mProg = Math.max(mProg, userCalculated.totalFocus);
      }
    } else {
      const keyMatches = m.cycleKey === currentCycleKey;
      const targetMatches = m.cycleTargetType === targetType;
      const startMatches = m.cycleStart !== undefined && Math.abs(m.cycleStart - cycleStartTime) < 86400000;

      if (keyMatches || (targetMatches && startMatches)) {
        mProg = m.cycleFocusTime || 0;
      }

      if (isCurrentUser && userCalculated?.cycleFocus !== undefined) {
        mProg = Math.max(mProg, userCalculated.cycleFocus);
      }
    }

    memberProgress[m.userId] = mProg;
    cycleProgress += mProg;
  });

  return { cycleProgress, memberProgress, currentCycleKey };
}
