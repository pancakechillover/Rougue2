import { MajorDungeon, Dungeon, DungeonReward, Tag } from '../types';
import { TAG_COLORS, generateTagId } from './tags';

/**
 * Exports Expeditions to a human-readable Markdown format.
 */
export const exportExpeditionsToMarkdown = (
  majors: MajorDungeon[],
  subs: Dungeon[],
  tags: Tag[] = []
): string => {
  let md = "# Scholar's Expedition List\n\n";

  const formatTagNames = (tagIds?: string[]) => {
    if (!tagIds || tagIds.length === 0) return '';
    const names = tagIds
      .map((id) => tags.find((t) => t.id === id)?.name)
      .filter((n): n is string => !!n);
    if (names.length === 0) return '';
    return names.map((n) => `#${n}`).join(', ');
  };

  const renderSubs = (parentId: string, level: number) => {
    let result = '';
    const children = subs.filter((s) => s.parentId === parentId);
    const hashes = '#'.repeat(level + 1);

    children.forEach((sub) => {
      result += `${hashes} Tier ${level}: ${sub.name} (${sub.status})\n`;
      result += `- Total: ${sub.totalSessions}\n`;
      result += `- Completed: ${sub.completedSessions}\n`;
      if (sub.description) result += `- Description: ${sub.description}\n`;
      const subTagsStr = formatTagNames(sub.tags);
      if (subTagsStr) result += `- Tags: ${subTagsStr}\n`;
      if (sub.rewards && sub.rewards.length > 0) {
        result += `- Rewards: ${sub.rewards
          .map((r) => {
            let rewardStr = `${r.type}:${r.amount}`;
            if (r.itemName) rewardStr += `:${r.itemName}`;
            return rewardStr;
          })
          .join(', ')}\n`;
      }
      result += '\n';
      result += renderSubs(sub.id, level + 1);
    });
    return result;
  };

  majors.forEach((major) => {
    md += `# Expedition Goal: ${major.name} (${major.status})\n`;
    if (major.description) md += `Description: ${major.description}\n`;
    const majorTagsStr = formatTagNames(major.tags);
    if (majorTagsStr) md += `Tags: ${majorTagsStr}\n`;
    if (major.rewards && major.rewards.length > 0) {
      md += `Rewards: ${major.rewards
        .map((r) => {
          let rewardStr = `${r.type}:${r.amount}`;
          if (r.itemName) rewardStr += `:${r.itemName}`;
          return rewardStr;
        })
        .join(', ')}\n`;
    }
    md += '\n';
    md += renderSubs(major.id, 1);
    md += '---\n\n';
  });

  return md.trim();
};

/**
 * Imports Expeditions from the Markdown format.
 * Throws an error if the format is invalid or no expeditions are found.
 */
export const importExpeditionsFromMarkdown = (
  md: string,
  existingTags: Tag[] = []
): { majors: MajorDungeon[]; subs: Dungeon[]; updatedTags: Tag[] } => {
  const lines = md.split('\n');
  const majors: MajorDungeon[] = [];
  const subs: Dungeon[] = [];
  const updatedTags: Tag[] = [...existingTags];

  let currentMajor: MajorDungeon | null = null;
  let subStack: { id: string; level: number }[] = [];
  let currentSub: Dungeon | null = null;

  const generateId = () =>
    Math.random().toString(36).substring(2, 11) + Date.now().toString(36).slice(-4);

  const parseRewards = (str: string): DungeonReward[] => {
    if (!str || !str.trim()) return [];
    return str.split(',').map((s) => {
      const parts = s.trim().split(':');
      const type = (parts[0] || 'coins') as any;
      const amount = parseInt(parts[1]) || 0;
      const itemName = parts[2] || undefined;
      return { type, amount, itemName };
    });
  };

  const resolveTagIds = (str: string): string[] => {
    if (!str || !str.trim()) return [];
    const rawNames = str
      .split(',')
      .map((s) => s.trim().replace(/^#+/, '').trim())
      .filter(Boolean);

    const ids: string[] = [];
    rawNames.forEach((name) => {
      let tag = updatedTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (!tag) {
        tag = {
          id: generateTagId(),
          name,
          color: TAG_COLORS[updatedTags.length % TAG_COLORS.length],
        };
        updatedTags.push(tag);
      }
      if (!ids.includes(tag.id)) {
        ids.push(tag.id);
      }
    });
    return ids;
  };

  let foundAny = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Major Goal: # Expedition Goal: [Name] ([Status])
    const majorMatch = trimmed.match(
      /^# Expedition Goal: (.+) \((active|completed|archived)\)$/
    );
    if (majorMatch) {
      foundAny = true;
      currentMajor = {
        id: generateId(),
        name: majorMatch[1],
        status: majorMatch[2] as any,
        description: '',
        rewards: [],
        tags: [],
      };
      majors.push(currentMajor);
      currentSub = null;
      subStack = [];
      return;
    }

    if (currentMajor && !currentSub && trimmed.startsWith('Description: ')) {
      currentMajor.description = trimmed.replace('Description: ', '');
      return;
    }

    if (currentMajor && !currentSub && trimmed.startsWith('Tags: ')) {
      const tagsStr = trimmed.replace('Tags: ', '');
      currentMajor.tags = resolveTagIds(tagsStr);
      return;
    }

    if (currentMajor && !currentSub && trimmed.startsWith('Rewards: ')) {
      const rewardsStr = trimmed.replace('Rewards: ', '');
      currentMajor.rewards = parseRewards(rewardsStr);
      return;
    }

    // Tier: ## Tier [N]: [Name] ([Status])
    const tierMatch = trimmed.match(/^(#+) Tier (\d+): (.+) \((active|completed|archived)\)$/);
    if (tierMatch && currentMajor) {
      const level = parseInt(tierMatch[2]);
      const name = tierMatch[3];
      const status = tierMatch[4] as any;

      // Determine parent based on subStack
      let parentId = currentMajor.id;
      while (subStack.length > 0 && subStack[subStack.length - 1].level >= level) {
        subStack.pop();
      }
      if (subStack.length > 0) {
        parentId = subStack[subStack.length - 1].id;
      }

      currentSub = {
        id: generateId(),
        parentId,
        name,
        status,
        totalSessions: 10,
        completedSessions: 0,
        rewardCoins: 0,
        rewardXP: 0,
        rewardText: '',
        rewards: [],
        isLongTerm: false,
        tags: [],
      };
      subs.push(currentSub);
      subStack.push({ id: currentSub.id, level });
      return;
    }

    if (currentSub) {
      if (trimmed.startsWith('- Total: ')) {
        currentSub.totalSessions = parseInt(trimmed.replace('- Total: ', '')) || 10;
      } else if (trimmed.startsWith('- Completed: ')) {
        currentSub.completedSessions = parseInt(trimmed.replace('- Completed: ', '')) || 0;
      } else if (trimmed.startsWith('- Description: ')) {
        currentSub.description = trimmed.replace('- Description: ', '');
      } else if (trimmed.startsWith('- Tags: ')) {
        currentSub.tags = resolveTagIds(trimmed.replace('- Tags: ', ''));
      } else if (trimmed.startsWith('- Rewards: ')) {
        currentSub.rewards = parseRewards(trimmed.replace('- Rewards: ', ''));
      }
    }
  });

  if (!foundAny) {
    throw new Error('No valid Expedition Goals found. Please check the markdown format.');
  }

  return { majors, subs, updatedTags };
};
