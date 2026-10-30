import type { TagColor, Dungeon, MajorDungeon, StudySession, TodayTodo } from '../types';

export const TAG_COLORS: TagColor[] = [
  'indigo',
  'sky',
  'amber',
  'rose',
  'violet',
  'cyan',
  'teal',
  'fuchsia',
];

export const TAG_COLOR_STYLES: Record<
  TagColor,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    hex: string;
    activeBg: string;
  }
> = {
  indigo: {
    bg: 'bg-indigo-500/15',
    text: 'tag-text-indigo text-indigo-300',
    border: 'border-indigo-500/35',
    dot: 'bg-indigo-500',
    hex: '#6366f1',
    activeBg: 'tag-active-indigo bg-indigo-500/25 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30',
  },
  sky: {
    bg: 'bg-sky-500/15',
    text: 'tag-text-sky text-sky-300',
    border: 'border-sky-500/35',
    dot: 'bg-sky-500',
    hex: '#0ea5e9',
    activeBg: 'tag-active-sky bg-sky-500/25 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/30',
  },
  amber: {
    bg: 'bg-amber-500/15',
    text: 'tag-text-amber text-amber-300',
    border: 'border-amber-500/35',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
    activeBg: 'tag-active-amber bg-amber-500/25 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/30',
  },
  rose: {
    bg: 'bg-rose-500/15',
    text: 'tag-text-rose text-rose-300',
    border: 'border-rose-500/35',
    dot: 'bg-rose-500',
    hex: '#f43f5e',
    activeBg: 'tag-active-rose bg-rose-500/25 border-rose-500 text-white shadow-sm ring-1 ring-rose-500/30',
  },
  violet: {
    bg: 'bg-violet-500/15',
    text: 'tag-text-violet text-violet-300',
    border: 'border-violet-500/35',
    dot: 'bg-violet-500',
    hex: '#8b5cf6',
    activeBg: 'tag-active-violet bg-violet-500/25 border-violet-500 text-white shadow-sm ring-1 ring-violet-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/15',
    text: 'tag-text-cyan text-cyan-300',
    border: 'border-cyan-500/35',
    dot: 'bg-cyan-500',
    hex: '#06b6d4',
    activeBg: 'tag-active-cyan bg-cyan-500/25 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/30',
  },
  teal: {
    bg: 'bg-teal-500/15',
    text: 'tag-text-teal text-teal-300',
    border: 'border-teal-500/35',
    dot: 'bg-teal-500',
    hex: '#14b8a6',
    activeBg: 'tag-active-teal bg-teal-500/25 border-teal-500 text-white shadow-sm ring-1 ring-teal-500/30',
  },
  fuchsia: {
    bg: 'bg-fuchsia-500/15',
    text: 'tag-text-fuchsia text-fuchsia-300',
    border: 'border-fuchsia-500/35',
    dot: 'bg-fuchsia-500',
    hex: '#d946ef',
    activeBg: 'tag-active-fuchsia bg-fuchsia-500/25 border-fuchsia-500 text-white shadow-sm ring-1 ring-fuchsia-500/30',
  },
};

export const generateTagId = () =>
  `tag_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36).slice(-3)}`;

/**
 * Returns the inherited tag IDs from ancestors (MajorDungeon and parent Dungeons)
 * for a given parentId.
 */
export function getInheritedTagIds(
  parentId: string | undefined,
  dungeons: Dungeon[],
  majorDungeons: MajorDungeon[]
): string[] {
  if (!parentId) return [];
  const inherited = new Set<string>();
  const visited = new Set<string>();

  let currId: string | undefined = parentId;
  while (currId && !visited.has(currId)) {
    visited.add(currId);
    const parentSub = dungeons.find((d) => d.id === currId);
    if (parentSub) {
      (parentSub.tags || []).forEach((tId) => inherited.add(tId));
      currId = parentSub.parentId;
    } else {
      const parentMajor = majorDungeons.find((m) => m.id === currId);
      if (parentMajor) {
        (parentMajor.tags || []).forEach((tId) => inherited.add(tId));
      }
      break;
    }
  }

  return Array.from(inherited);
}

/**
 * Returns all effective tag IDs (both own tags and inherited ancestor tags)
 * for a given Dungeon ID or MajorDungeon ID.
 */
export function getEffectiveDungeonTagIds(
  dungeonId: string | null | undefined,
  dungeons: Dungeon[],
  majorDungeons: MajorDungeon[]
): string[] {
  if (!dungeonId || dungeonId === 'free_study') return [];

  const major = majorDungeons.find((m) => m.id === dungeonId);
  if (major) {
    return Array.from(new Set(major.tags || []));
  }

  const sub = dungeons.find((d) => d.id === dungeonId);
  if (!sub) return [];

  const ownTags = sub.tags || [];
  const inherited = getInheritedTagIds(sub.parentId, dungeons, majorDungeons);
  return Array.from(new Set([...inherited, ...ownTags]));
}

/**
 * Returns the effective tag IDs for a StudySession — exactly one, or none.
 *
 * Prefers the persisted `session.tags` snapshot if present, otherwise falls
 * back to the current effective tags of `session.dungeonId`.
 *
 * A session belongs to one tag. It used to return however many it carried, and
 * Tag Breakdown credits a session's full duration to each of them: a session
 * with three tags counted three times, so the card's own total and its donut
 * disagreed and every percentage was divided by an inflated sum. Sessions saved
 * before the pickers were single-choice still hold several ids in storage —
 * those records are left untouched (nothing is destroyed), the first one is the
 * one that counts, and re-tagging a session rewrites it to a single id.
 */
export function getSessionEffectiveTagIds(
  session: StudySession,
  dungeons: Dungeon[],
  majorDungeons: MajorDungeon[]
): string[] {
  const own = Array.isArray(session.tags)
    ? session.tags.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  if (own.length > 0) return [own[0]];

  const inherited = getEffectiveDungeonTagIds(session.dungeonId, dungeons, majorDungeons);
  return inherited.length > 0 ? [inherited[0]] : [];
}

/**
 * Returns the effective tag IDs for a TodayTodo item (own tags + linked dungeon tags).
 */
export function getTodoEffectiveTagIds(
  todo: TodayTodo,
  dungeons: Dungeon[],
  majorDungeons: MajorDungeon[]
): string[] {
  const own = todo.tags || [];
  const fromDungeon = todo.dungeonId
    ? getEffectiveDungeonTagIds(todo.dungeonId, dungeons, majorDungeons)
    : [];
  return Array.from(new Set([...fromDungeon, ...own]));
}

/**
 * Calculate depth of a sub-dungeon (Tier 1 = 1, Tier 2 = 2, Tier 3 = 3)
 */
export function getDungeonDepth(subId: string, dungeons: Dungeon[]): number {
  let current = dungeons.find((d) => d.id === subId);
  if (!current) return 0;

  let depth = 1;
  const visited = new Set<string>([subId]);
  while (current && current.parentId) {
    if (visited.has(current.parentId)) break;
    visited.add(current.parentId);
    const parent = dungeons.find((d) => d.id === current!.parentId);
    if (parent) {
      depth++;
      current = parent;
    } else {
      break;
    }
  }
  return depth;
}

/**
 * Calculate the maximum subtree depth below a given sub-dungeon.
 * E.g. if sub has no children -> 0. If sub has direct children only -> 1.
 */
export function getSubtreeMaxRelativeDepth(subId: string, dungeons: Dungeon[]): number {
  const visited = new Set<string>();
  const helper = (id: string): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    const children = dungeons.filter((d) => d.parentId === id);
    if (children.length === 0) return 0;
    return 1 + Math.max(...children.map((c) => helper(c.id)));
  };
  return helper(subId);
}

/**
 * Checks if moving `movingId` under `targetParentId` would create a cycle or exceed max depth 3.
 */
export function canMoveSubDungeonToParent(
  movingId: string,
  targetParentId: string,
  dungeons: Dungeon[],
  majorDungeons: MajorDungeon[]
): { valid: boolean; reason?: string; newTier?: number } {
  if (movingId === targetParentId) {
    return { valid: false, reason: 'Cannot move a task into itself.' };
  }

  // Check if targetParentId is a MajorDungeon
  const isTargetMajor = majorDungeons.some((m) => m.id === targetParentId);
  const subtreeDepth = getSubtreeMaxRelativeDepth(movingId, dungeons);

  if (isTargetMajor) {
    const newTier = 1;
    if (newTier + subtreeDepth > 3) {
      return {
        valid: false,
        reason: `Sub-tasks would exceed maximum Tier 3 depth.`,
      };
    }
    return { valid: true, newTier };
  }

  // Target is another sub-dungeon: check cycle
  let curr: string | undefined = targetParentId;
  const visited = new Set<string>();
  while (curr) {
    if (curr === movingId) {
      return { valid: false, reason: 'Cannot move a task into its own sub-tier.' };
    }
    if (visited.has(curr)) break;
    visited.add(curr);
    const p = dungeons.find((d) => d.id === curr);
    curr = p?.parentId;
  }

  const targetDepth = getDungeonDepth(targetParentId, dungeons);
  const newTier = targetDepth + 1;
  if (newTier + subtreeDepth > 3) {
    return {
      valid: false,
      reason: `Moving here would place tiers at level ${newTier + subtreeDepth} (max is Tier 3).`,
    };
  }

  return { valid: true, newTier };
}
