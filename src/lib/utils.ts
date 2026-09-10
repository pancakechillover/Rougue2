import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { TodayTodo, Dungeon, MajorDungeon } from "../types";

export function formatDuration(mins: number): string {
  const totalM = Math.round(mins);
  if (totalM <= 0) return '0m';
  const hours = Math.floor(totalM / 60);
  const remainingMins = totalM % 60;
  if (hours === 0) return `${remainingMins}m`;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortAgendaTodos(
  todoList: TodayTodo[],
  dungeonList: Dungeon[],
  majorList: MajorDungeon[],
  referenceDate: Date
): TodayTodo[] {
  if (todoList.length <= 1) return todoList;

  // Build O(1) Lookup Maps
  const dungeonMap = new Map<string, Dungeon>();
  for (const d of dungeonList) {
    dungeonMap.set(d.id, d);
  }

  const majorMap = new Map<string, MajorDungeon>();
  for (const m of majorList) {
    majorMap.set(m.id, m);
  }

  // Pre-calculate score for each todo in O(N)
  const scoredTodos = todoList.map((todo, index) => {
    const dungeonItem = todo.dungeonId ? dungeonMap.get(todo.dungeonId) : undefined;
    const isDungeonCompleted = dungeonItem?.status === 'completed';
    const isChecked = todo.completed || isDungeonCompleted;

    const parentMajor = dungeonItem?.parentId ? majorMap.get(dungeonItem.parentId) : undefined;
    const effectiveDeadline = dungeonItem?.deadline?.trim() || parentMajor?.deadline?.trim();

    let daysLeft: number | null = null;
    if (effectiveDeadline) {
      try {
        const ddlDate = parseISO(effectiveDeadline);
        daysLeft = differenceInCalendarDays(ddlDate, referenceDate);
      } catch {
        daysLeft = null;
      }
    }

    const isRoutine = Boolean(todo.source === 'routine' || dungeonItem?.isRoutine || parentMajor?.isRoutine);

    let tier = 5;
    let subScore = 0;

    if (daysLeft !== null && daysLeft <= 0) {
      tier = 1; // Overdue or Due Today DDL
      subScore = daysLeft; // Lower (more overdue) comes first
    } else if (todo.source === 'ddl' && (daysLeft === null || daysLeft <= 0)) {
      tier = 1;
      subScore = daysLeft ?? 0;
    } else if (daysLeft !== null && daysLeft > 0) {
      tier = 2; // Unexpired DDL with days remaining
      subScore = daysLeft; // Fewer days remaining comes first
    } else if (todo.source === 'yesterday') {
      tier = 3; // Yesterday unfinished task
      subScore = 0;
    } else if (isRoutine) {
      tier = 4; // Routine task
      subScore = 0;
    } else {
      tier = 5; // General task (manual or regular expedition)
      subScore = 0;
    }

    return {
      todo,
      originalIndex: index,
      isChecked: isChecked ? 1 : 0,
      tier,
      subScore
    };
  });

  scoredTodos.sort((a, b) => {
    // 1. Uncompleted tasks before completed tasks
    if (a.isChecked !== b.isChecked) {
      return a.isChecked - b.isChecked;
    }

    // 2. Tier: 1 (Overdue DDL) -> 2 (Left DDL) -> 3 (Yesterday) -> 4 (Routine) -> 5 (General)
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }

    // 3. Sub-score within tier (days left / overdue ranking)
    if (a.subScore !== b.subScore) {
      return a.subScore - b.subScore;
    }

    // 4. Stable sort preserving original relative order
    return a.originalIndex - b.originalIndex;
  });

  return scoredTodos.map(s => s.todo);
}

export function getSettlementDay(date: Date, timeSettings?: any): string {
  const ts = timeSettings || {
    morning: { start: 8, end: 12 },
    afternoon: { start: 14, end: 18 },
    night: { start: 20, end: 24 }
  };
  const hour = date.getHours();
  let baseDate = new Date(date);
  
  if (ts.night.start > ts.night.end && hour < ts.night.end) {
    baseDate.setDate(baseDate.getDate() - 1);
  } else if (hour < ts.morning.start) {
    baseDate.setDate(baseDate.getDate() - 1);
  }
  
  return format(baseDate, 'yyyy-MM-dd');
}

export function getSessionEffectiveMinutes(session: any, includeRestTimeInTasks: boolean): number {
  let baseDuration = (session.focusDuration !== undefined && session.focusDuration !== null) 
    ? session.focusDuration 
    : (session.duration || 0);

  if (typeof baseDuration !== 'number' || isNaN(baseDuration)) {
    baseDuration = 0;
  }
    
  if (includeRestTimeInTasks && typeof session.restDuration === 'number' && !isNaN(session.restDuration)) {
    return baseDuration + session.restDuration;
  }
  
  return baseDuration;
}

export function getSessionDistractionCount(distractions: any): number {
  if (!distractions) return 0;
  if (typeof distractions === 'number') return isNaN(distractions) ? 0 : distractions;
  if (Array.isArray(distractions)) return distractions.length;
  if (typeof distractions === 'object') {
    const internal = Number(distractions.internal) || 0;
    const external = Number(distractions.external) || 0;
    const unavoidable = Number(distractions.unavoidable) || 0;
    return internal + external + unavoidable;
  }
  return 0;
}

export function getSessionSettlementDate(session: any, timeSettings?: any, timezone?: string): string {
  if (session?.assignedDateStr) {
    return session.assignedDateStr;
  }
  let sessionDate = new Date(session.timestamp);
  if (timezone) {
    try {
      const str = sessionDate.toLocaleString('en-US', { timeZone: timezone });
      sessionDate = new Date(str);
    } catch (e) {}
  }
  return getSettlementDay(sessionDate, timeSettings);
}

export const getXPForLevel = (lvl: number) => 1000 + Math.floor((lvl - 1) / 10) * 100;

export function getTitleForLevel(level: number): string {
  if (level >= 1 && level < 4) {
    return 'Novice';
  } else if (level >= 4 && level < 16) {
    return 'Veteran';
  } else if (level >= 16 && level < 43) {
    return 'Master';
  } else {
    return 'Grandmaster';
  }
}

export const getDefaultRewardForLevel = (lvl: number) => {
  if (lvl <= 1) return null;
  if (lvl <= 4) return { type: 'talentPoint', amount: 1 };
  if (lvl > 4 && lvl <= 16 && (lvl - 4) % 2 === 0) return { type: 'talentPoint', amount: 1 };
  if (lvl > 16 && lvl <= 43 && (lvl - 16) % 3 === 0) return { type: 'talentPoint', amount: 1 };
  if (lvl > 43 && (lvl - 43) % 5 === 0) return { type: 'talentPoint', amount: 1 };
  return null;
};

export function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/Macintosh/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown Device';
}

export function getDescendantDungeonIds(targetId: string, allDungeons: Dungeon[] = []): Set<string> {
  const ids = new Set<string>([targetId]);
  let added = true;
  while (added) {
    added = false;
    for (const d of allDungeons) {
      if (d.parentId && ids.has(d.parentId) && !ids.has(d.id)) {
        ids.add(d.id);
        added = true;
      }
    }
  }
  return ids;
}

export interface TierSegment {
  level: number;
  label: string;
  minutes: number;
  percent: number;
}

export interface DungeonHierarchyStats {
  hasChildren: boolean;
  totalSessions: number;
  completedSessions: number;
  targetMinutes: number;
  completedMinutes: number;
  totalFocusTime: number;
  directCompletedMinutes: number;
  childrenCompletedMinutes: number;
  directSessions: number;
  childrenSessions: number;
  isOpenEnded: boolean;
  progressPercent: number;
  directPercent: number;
  childrenPercent: number;
  tierSegments: TierSegment[];
  isAllCompleted: boolean;
}

export function getDungeonLevel(nodeId: string, allDungeons: Dungeon[] = []): number {
  let level = 1;
  let curr = allDungeons.find(d => d.id === nodeId);
  if (!curr) return 0;
  const visited = new Set<string>();
  while (curr && curr.parentId) {
    if (visited.has(curr.id)) break;
    visited.add(curr.id);
    const parent = allDungeons.find(d => d.id === curr.parentId);
    if (!parent) {
      break;
    }
    level++;
    curr = parent;
  }
  return level;
}

export function getTierProgressColor(
  level: number, 
  isCompleted: boolean = false, 
  variant: 'indigo' | 'amber' = 'indigo'
): string {
  if (isCompleted) {
    if (level <= 1) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
    if (level === 2) return 'bg-emerald-500';
    if (level === 3) return 'bg-emerald-400';
    return 'bg-emerald-400/90';
  }

  if (variant === 'amber') {
    if (level === 0) return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    if (level === 1) return 'bg-amber-500';
    if (level === 2) return 'bg-amber-400';
    return 'bg-amber-400/90';
  }

  if (level <= 1) return 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]';
  if (level === 2) return 'bg-indigo-500';
  if (level === 3) return 'bg-indigo-400';
  return 'bg-indigo-400/90';
}

function collectSubtreeLevelMinutes(
  nodeId: string,
  allDungeons: Dungeon[],
  timePerRoom: number,
  levelMap: Map<number, number>,
  visited: Set<string>
) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  const node = allDungeons.find(d => d.id === nodeId);
  const level = getDungeonLevel(nodeId, allDungeons);
  const directMinutes = node?.isOpenEnded
    ? (node?.totalFocusTime || 0)
    : ((node?.completedSessions || 0) * timePerRoom);

  if (directMinutes > 0) {
    levelMap.set(level, (levelMap.get(level) || 0) + directMinutes);
  }

  const children = allDungeons.filter(d => d.parentId === nodeId);
  for (const child of children) {
    collectSubtreeLevelMinutes(child.id, allDungeons, timePerRoom, levelMap, visited);
  }
}

export function getDungeonHierarchyStats(
  targetId: string,
  allDungeons: Dungeon[] = [],
  timePerRoom: number = 25,
  visited: Set<string> = new Set()
): DungeonHierarchyStats {
  if (visited.has(targetId)) {
    return {
      hasChildren: false,
      totalSessions: 0,
      completedSessions: 0,
      targetMinutes: 0,
      completedMinutes: 0,
      totalFocusTime: 0,
      directCompletedMinutes: 0,
      childrenCompletedMinutes: 0,
      directSessions: 0,
      childrenSessions: 0,
      isOpenEnded: false,
      progressPercent: 0,
      directPercent: 0,
      childrenPercent: 0,
      tierSegments: [],
      isAllCompleted: false,
    };
  }
  visited.add(targetId);

  const directChildren = allDungeons.filter(d => d.parentId === targetId);
  const targetNode = allDungeons.find(d => d.id === targetId);
  const targetLevel = getDungeonLevel(targetId, allDungeons);

  if (directChildren.length === 0) {
    const totalSessions = targetNode?.totalSessions || 0;
    const completedSessions = targetNode?.completedSessions || 0;
    const isOpenEnded = !!targetNode?.isOpenEnded;
    const targetMinutes = isOpenEnded ? 0 : Math.round(totalSessions * timePerRoom);
    const completedMinutes = isOpenEnded
      ? Math.round(targetNode?.totalFocusTime || 0)
      : Math.round(completedSessions * timePerRoom);
    const totalFocusTime = Math.round(targetNode?.totalFocusTime || (completedSessions * timePerRoom));
    const isAllCompleted = targetNode?.status === 'completed' || (!isOpenEnded && totalSessions > 0 && completedSessions >= totalSessions);
    const progressPercent = isAllCompleted
      ? 100
      : isOpenEnded
        ? 0
        : targetMinutes > 0
          ? Math.min(100, Math.max(0, (completedMinutes / targetMinutes) * 100))
          : 0;

    const tierSegments: TierSegment[] = completedMinutes > 0 || isAllCompleted
      ? [{
          level: targetLevel,
          label: targetLevel === 0 ? 'Major' : `Tier ${targetLevel}`,
          minutes: completedMinutes,
          percent: progressPercent,
        }]
      : [];

    return {
      hasChildren: false,
      totalSessions,
      completedSessions,
      targetMinutes,
      completedMinutes,
      totalFocusTime,
      directCompletedMinutes: completedMinutes,
      childrenCompletedMinutes: 0,
      directSessions: completedSessions,
      childrenSessions: 0,
      isOpenEnded,
      progressPercent,
      directPercent: progressPercent,
      childrenPercent: 0,
      tierSegments,
      isAllCompleted,
    };
  }

  // Parent node with children: calculate recursively from children
  let sumTotalSessions = 0;
  let sumCompletedSessions = 0;
  let sumTargetMinutes = 0;
  let sumCompletedMinutes = 0;
  let sumFocusTime = 0;
  let allChildrenOpenEnded = true;
  let allChildrenCompleted = true;

  for (const child of directChildren) {
    const childStats = getDungeonHierarchyStats(child.id, allDungeons, timePerRoom, visited);
    sumTotalSessions += childStats.totalSessions;
    sumCompletedSessions += childStats.completedSessions;
    sumTargetMinutes += childStats.targetMinutes;
    sumCompletedMinutes += childStats.completedMinutes;
    sumFocusTime += childStats.totalFocusTime;

    if (!childStats.isOpenEnded && childStats.targetMinutes > 0) {
      allChildrenOpenEnded = false;
    }
    if (!childStats.isAllCompleted) {
      allChildrenCompleted = false;
    }
  }

  // Direct historical focus time and sessions directly logged on parent if any
  const parentDirectSessions = targetNode?.completedSessions || 0;
  const parentDirectFocusTime = targetNode?.isOpenEnded
    ? (targetNode?.totalFocusTime || 0)
    : (parentDirectSessions > 0 ? parentDirectSessions * timePerRoom : (targetNode?.totalFocusTime || 0));

  const totalCompletedMinutes = Math.round(sumCompletedMinutes + parentDirectFocusTime);
  const totalCompletedSessions = sumCompletedSessions + parentDirectSessions;
  const effectiveFocusTime = Math.round(sumFocusTime + (targetNode?.totalFocusTime || 0));

  // If sub-tiers have 0 target minutes but parent has totalSessions, fallback to parent target
  const effectiveTargetMinutes = sumTargetMinutes > 0 
    ? sumTargetMinutes 
    : ((targetNode?.totalSessions || 0) * timePerRoom);
  const effectiveTotalSessions = sumTotalSessions > 0
    ? sumTotalSessions
    : (targetNode?.totalSessions || 0);

  const isOpenEnded = allChildrenOpenEnded && effectiveTargetMinutes === 0 && (targetNode?.isOpenEnded ?? false);
  const isAllCompleted = targetNode?.status === 'completed' || (allChildrenCompleted && (!effectiveTargetMinutes || totalCompletedMinutes >= effectiveTargetMinutes));

  let directPercent = 0;
  let childrenPercent = 0;

  if (isAllCompleted) {
    if (totalCompletedMinutes > 0) {
      directPercent = (parentDirectFocusTime / totalCompletedMinutes) * 100;
      childrenPercent = 100 - directPercent;
    } else {
      childrenPercent = 100;
    }
  } else if (!isOpenEnded && effectiveTargetMinutes > 0) {
    directPercent = Math.min(100, Math.max(0, (parentDirectFocusTime / effectiveTargetMinutes) * 100));
    childrenPercent = Math.min(100 - directPercent, Math.max(0, (sumCompletedMinutes / effectiveTargetMinutes) * 100));
  } else if (!isOpenEnded && effectiveTotalSessions > 0) {
    directPercent = Math.min(100, Math.max(0, (parentDirectSessions / effectiveTotalSessions) * 100));
    childrenPercent = Math.min(100 - directPercent, Math.max(0, (sumCompletedSessions / effectiveTotalSessions) * 100));
  }

  const progressPercent = Math.min(100, directPercent + childrenPercent);

  // Collect level minutes across the whole subtree to generate stacked tier segments
  const levelMinutesMap = new Map<number, number>();
  const subtreeVisited = new Set<string>();
  collectSubtreeLevelMinutes(targetId, allDungeons, timePerRoom, levelMinutesMap, subtreeVisited);

  // Sort by level ascending (Level 0/1 -> Level 2 -> Level 3 -> ...)
  const sortedLevels = Array.from(levelMinutesMap.keys()).sort((a, b) => a - b);
  const tierSegments: TierSegment[] = [];

  let allocatedPercent = 0;
  for (let i = 0; i < sortedLevels.length; i++) {
    const lvl = sortedLevels[i];
    const mins = levelMinutesMap.get(lvl) || 0;
    if (mins <= 0) continue;

    let segPercent = 0;
    if (isAllCompleted) {
      segPercent = totalCompletedMinutes > 0 ? (mins / totalCompletedMinutes) * 100 : (100 / sortedLevels.length);
    } else if (!isOpenEnded && effectiveTargetMinutes > 0) {
      segPercent = (mins / effectiveTargetMinutes) * 100;
    } else if (!isOpenEnded && effectiveTotalSessions > 0) {
      segPercent = (mins / (effectiveTotalSessions * timePerRoom)) * 100;
    }

    // Ensure total segments percent doesn't exceed progressPercent due to rounding
    if (i === sortedLevels.length - 1 && isAllCompleted) {
      segPercent = Math.max(0, 100 - allocatedPercent);
    } else {
      segPercent = Math.min(progressPercent - allocatedPercent, Math.max(0, segPercent));
    }
    allocatedPercent += segPercent;

    tierSegments.push({
      level: lvl,
      label: lvl === 0 ? 'Major' : `Tier ${lvl}`,
      minutes: mins,
      percent: segPercent,
    });
  }

  return {
    hasChildren: true,
    totalSessions: effectiveTotalSessions,
    completedSessions: totalCompletedSessions,
    targetMinutes: effectiveTargetMinutes,
    completedMinutes: totalCompletedMinutes,
    totalFocusTime: effectiveFocusTime,
    directCompletedMinutes: parentDirectFocusTime,
    childrenCompletedMinutes: sumCompletedMinutes,
    directSessions: parentDirectSessions,
    childrenSessions: sumCompletedSessions,
    isOpenEnded,
    progressPercent,
    directPercent,
    childrenPercent,
    tierSegments,
    isAllCompleted,
  };
}

export function getDeviceCode(): string {
  if (typeof localStorage === 'undefined') return 'server';
  let code = localStorage.getItem('scholars_dungeon_device_code');
  if (!code) {
    code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('scholars_dungeon_device_code', code);
  }
  return code;
}
