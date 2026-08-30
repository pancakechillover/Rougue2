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

export function getSessionSettlementDate(session: any, timeSettings: any): string {
  return getSettlementDay(new Date(session.timestamp), timeSettings);
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

export function getDeviceCode(): string {
  if (typeof localStorage === 'undefined') return 'server';
  let code = localStorage.getItem('scholars_dungeon_device_code');
  if (!code) {
    code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('scholars_dungeon_device_code', code);
  }
  return code;
}
