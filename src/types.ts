export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface RewardCard {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  type: 'coins' | 'xp' | 'item' | 'text';
  amount?: number;
  itemType?: 'double_xp' | 'double_coin' | 'talent_shard' | 'death_defying_medal' | 'xp_bonus_percent' | 'coin_bonus_percent';
  icon?: string;
  weight: number;
  limitCount?: number; // Max occurrences in the period
  limitPeriodDays?: number; // Period in days
  claimHistory?: string[]; // Timestamps of claims
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  branch: 'A' | 'B' | 'C';
  tier: 1 | 2 | 3;
  cost: number;
  effect: string;
  icon: string;
  unlocked: boolean;
  active: boolean;
  conflictsWith?: string[];
}

export interface DungeonReward {
  type: 'talentPoint' | 'coins' | 'item' | 'text' | 'xp';
  amount: number;
  itemName?: string;
  rewardText?: string;
  itemType?: 'double_xp' | 'double_coin' | 'talent_shard' | 'death_defying_medal' | 'xp_bonus_percent' | 'coin_bonus_percent';
}

export interface Dungeon {
  id: string;
  name: string;
  description?: string;
  totalSessions: number;
  completedSessions: number;
  isOpenEnded?: boolean;
  totalFocusTime?: number;
  rewardCoins: number;
  rewardXP: number;
  rewardText: string;
  rewards?: DungeonReward[];
  isLongTerm: boolean;
  status: 'active' | 'completed' | 'archived';
  parentId?: string; // ID of the Major Dungeon
  completedAt?: string;
  isRoutine?: boolean;
  routineType?: 'daily' | 'weekly' | 'monthly';
  lastRoutineReset?: string;
  deadline?: string; // YYYY-MM-DD
}

export interface MajorDungeon {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  isFinalized?: boolean;
  rewards?: DungeonReward[];
  completedAt?: string;
  isRoutine?: boolean;
  routineType?: 'daily' | 'weekly' | 'monthly';
  lastRoutineReset?: string;
  deadline?: string;
}

export interface RewardHistoryItem {
  id: string;
  name: string;
  rarity: string;
  color?: string;
  source: 'Explore' | 'Gacha' | 'Shop' | 'LevelUp' | 'Vault' | 'System';
  timestamp: string;
  type: 'coins' | 'xp' | 'item' | 'text';
  amount?: number;
  itemType?: 'double_xp' | 'double_coin' | 'talent_shard' | 'death_defying_medal' | 'xp_bonus_percent' | 'coin_bonus_percent' | 'talentPoint';
  redeemed: boolean;
  rewardText?: string;
  note?: string;
  sessionGoal?: number; 
  sessionDuration?: number;
}

export interface LevelReward {
  level: number;
  type?: 'talentPoint' | 'coins' | 'item' | 'text';
  amount?: number;
  itemName?: string;
  rewardText?: string;
  rewards?: {
    type: 'talentPoint' | 'coins' | 'text';
    amount?: number;
    rewardText?: string;
  }[];
}

export type QuestType = 'daily_sessions' | 'weekly_sessions' | 'monthly_sessions' | 'consecutive_days' | 'total_sessions';

export interface QuestReward {
  type: 'coins' | 'xp' | 'talentPoint' | 'item' | 'text';
  amount: number;
  itemType?: 'talent_shard' | 'death_defying_medal' | 'double_xp' | 'double_coin';
  itemName?: string;
  rewardText?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  progress: number;
  reward: QuestReward;
  rewards?: QuestReward[];
  completed: boolean;
  claimed?: boolean;
  lastReset?: string;
  order: number;
  isAchievement: boolean;
  isSpecial?: boolean;
  talentRequired?: string;
}

export interface TimeSettings {
  morning: { start: number; end: number };
  afternoon: { start: number; end: number };
  night: { start: number; end: number };
}

export interface QuestHistoryItem {
  id: string;
  questId: string;
  title: string;
  type: QuestType;
  timestamp: string;
  rewards: QuestReward[];
  isAchievement: boolean;
  talentRequired?: string;
}

export interface ReflectionTemplate {
  id: string;
  name: string;
  content: string;
  exampleContent?: string;
}

export interface SageModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'deepseek' | 'doubao' | 'claude' | 'siliconflow' | 'custom';
  apiKey?: string;
  apiUrl?: string;
  modelName: string;
}

export interface SagePromptConfig {
  id: string;
  title: string;
  prompt: string;
}

export interface SageConversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: number; reasoningContent?: string }[];
}

export interface Transaction {
  id: string;
  timestamp: string;
  type: 'coins' | 'xp';
  amount: number;
  reason: string;
}

export interface TodayTodo {
  id: string;
  title: string;
  dungeonId?: string;
  completed: boolean;
  durationMinutes?: number;
  date?: string; // Format: YYYY-MM-DD
}

export interface AppState {
  level: number;
  xp: number;
  coins: number;
  talentPoints: number;
  talentShards: number;
  deathDefyingMedals: number;
  doubleXpCards?: number; // Added
  doubleGoldCards?: number; // Added
  doubleXpActive?: boolean; // Added
  doubleGoldActive?: boolean; // Added
  unlockedTalents: string[];
  activeTalents: string[];
  currentDungeonId: string | null;
  history: StudySession[];
  rewardHistory: RewardHistoryItem[];
  transactionHistory?: Transaction[];
  questHistory: QuestHistoryItem[];
  lastStudyDate: string | null;
  streak: number;
  dailySessions: number;
  lastDailyReset: string | null;
  lastStartOfDayPrompt?: string | null;
  enableStartOfDayPrompt?: boolean;
  lastWeeklyReset?: string | null;
  lastMonthlyReset?: string | null;
  patchedDays?: string[];
  dailyRerollUsed: boolean; // Track if Shuffler reroll was used today
  claimedDailyTalents?: string[]; // Track which daily talents have been claimed today
  inventory: string[]; // IDs of functional cards active for next session
  userName?: string;
  userUniqueId?: string; // Random short permanent user identifier
  teamId?: string;
  lastTeamData?: any;
  userBio?: string;
  userAvatar?: string;
  userTitle?: string;
  todayTodos?: TodayTodo[];
  // Quests & Achievements
  quests: Quest[];
  questNotificationStyle: 'red_dot' | 'popup';
  unclaimedQuests: number;
  // Developer Mode Settings
  devModeEnabled?: boolean;
  devBaseXP?: number;
  devMinXP?: number;
  devMaxXP?: number;
  devXpMode?: 'fixed' | 'random';
  devBaseCoins?: number;
  devMinCoins?: number;
  devMaxCoins?: number;
  devCoinMode?: 'fixed' | 'random';
  devCritChance?: number;
  devCritMultiplier?: number;
  theme?: string;
  autoTheme?: boolean;
  dayTheme?: string;
  nightTheme?: string;
  autoThemeNightStart?: string; // HH:mm
  autoThemeDayStart?: string;   // HH:mm
  timezone?: string;
  gachaEffect?: 'card' | 'scratch'; // Deprecated but kept for migration
  gachaAnimation?: 'card' | 'scratch';
  ichibanAnimation?: 'card' | 'scratch';
  gachaAllowOverlap?: boolean;
  soundEnabled?: boolean;
  soundVolume?: number;
  defaultMarkdownEnabled?: boolean;
  timerBannerCompactMode?: boolean;
  timerSkipVictoryMode?: 'none' | 'auto_pick_highest' | 'skip_rewards' | 'defer_to_chest';
  heatmapScaleMax?: number; // 0-8 or 0-16 for heatmap max range
  timerBannerShortcuts?: string[];
  requireFocusConfirmation?: boolean;
  defaultOpenEndedDungeon?: boolean;
  standardSessionMinutes?: number;
  standardRestMinutes?: number;
  includeRestTimeInTasks?: boolean;
  pendingRewardChest?: { session: StudySession; choices: RewardCard[]; }[];
  // Editable Pools
  rewardPoolMode?: 'fixed' | 'free'; // Added
  customRewardPool?: RewardCard[]; // Added to preserve user's free pool
  rewardPool: RewardCard[];
  shopItems: ShopItem[];
  gachaPools: GachaPool[];
  activeGachaPoolId?: string;
  activeIchibanPoolId?: string;
  levelRewards?: LevelReward[];
  lastCompletionRewards?: {
    dungeonName: string;
    type: 'dungeon' | 'quest' | 'achievement';
    rewards: DungeonReward[];
  } | null;
  bulkClaimResult?: {
    items: { title: string; rewards: QuestReward[]; isAchievement: boolean }[];
    timestamp: string;
  } | null;
  dailyLogs?: {
    [date: string]: {
      rating: number;
      reflection: string;
      mood?: string;
      moodScore?: number;
      sleepTime?: string;
      wakeTime?: string;
      sleepDurationMin?: number;
    };
  };
  reflectionTemplates?: ReflectionTemplate[];
  enabledMoods?: string[];
  lastUpdated?: string;
  secretCode?: string;
  isRedisUnlocked?: boolean;
  isGoogleDriveUnlocked?: boolean;
  syncProvider?: 'Redis' | 'Google Drive' | 'WebDAV';
  googleDriveTokens?: {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
  };
  googleDriveFileId?: string;
  webdavSettings?: {
    url: string;
    username: string;
    password?: string; // Stored securely if possible, or we just store an auth token
  };
  autoSyncMode?: 'debounce' | 'interval' | 'manual';
  autoSyncDebounceSeconds?: number;
  autoSyncIntervalMinutes?: number;
  deviceType?: string;
  deviceNickname?: string;
  deviceCode?: string;
  syncHistory?: {
    type: 'login' | 'force_sync' | 'local_to_cloud' | 'cloud_to_local' | 'cancel_login' | 'unbind_local' | 'delete_cloud';
    code: string;
    timestamp: string;
    status: 'success' | 'failed' | 'cancelled' | 'pending';
    error?: string;
    deviceType?: string;
    deviceNickname?: string;
    deviceCode?: string;
    syncMethod?: 'Manual' | 'Immediate' | 'Interval polling' | 'Visibility API Active';
    syncProvider?: 'Redis' | 'Google Drive' | 'WebDAV';
  }[];
  pushEnabled?: boolean;
  pushSubscription?: any;
  timeSettings?: TimeSettings;
  showOtherInActivityLog?: boolean;
  dailyProgressGoalConfig?: Record<number, number>;
  useSameDailyProgressGoalEveryDay?: boolean;
  dailyProgressGoal?: number;
  limitedMentalEffort?: boolean;
  // Custom Time Mocking
  customTimeEnabled?: boolean;
  customTimeOffset?: number; // Difference in milliseconds (SimulatedTime - RealTime)
  // Sage AI
  sageApiProvider?: 'google' | 'openai' | 'deepseek' | 'doubao' | 'claude' | 'siliconflow' | 'custom';
  sageApiKey?: string;
  sageApiUrl?: string; 
  sageModelName?: string;
  sageModels?: SageModelConfig[];
  activeSageModelId?: string;
  sagePrompts?: SagePromptConfig[];
  sageChatHistory?: { role: 'user' | 'assistant'; content: string; timestamp: number }[];
  sageConversations?: SageConversation[];
  activeSageConversationId?: string;
  sageIsLoading?: boolean;
  sageLoadingStartTime?: number | null;
  sagePersonality?: 'sage' | 'friend' | 'master' | 'custom';
  sagePersonalityPrompts?: Record<string, string>;
  sageAllowGameModifiers?: boolean;
  
  // Record View Options
  statsViewOpts?: {
    showDailyBar?: boolean;
    showDailyDonut?: boolean;
    showWeeklyBar?: boolean;
    showWeeklyDonut?: boolean;
    showRoutineTracker?: boolean;
    showSleepTracker?: boolean;
    showHeatmap?: boolean;
    dailyDonutMode?: '24h' | 'compact';
    weeklyDonutMode?: 'time_of_day' | 'day_of_week';
    hiddenRoutines?: string[];
  };
}

export interface StudySession {
  id: string;
  dungeonId: string;
  duration: number; // total minutes
  focusDuration?: number; // focus minutes
  restDuration?: number;
  distractions?: { internal: number; external: number; unavoidable: number };
  timestamp: string;
  coinsEarned: number;
  xpEarned: number;
  rewardName?: string;
  rewardIcon?: string;
  note?: string;
  isCrit?: boolean;
  period?: string;
  assignedDateStr?: string;
  triggeredTalents?: {
    flowExperience?: { xp: number; coins: number };
    perfectTheory?: { xp: number; coins: number };
  };
}

export interface TeamMember {
  userId: string;
  name: string;
  avatar: string;
  title?: string;
  bio?: string;
  level?: number;
  joinedAt: number;
  totalFocusTime: number; // minutes contributed
  cycleFocusTime?: number; // minutes contributed in the current active cycle limit
  cycleStart?: number; // timestamp representing the start of the current cycle bounds
  cycleTargetType?: string; // targetType at the time cycleFocusTime was incremented
  isCaptain: boolean;
  lastActive?: number;
  uniqueId?: string; // Short permanent identifier
}

export interface TeamMessage {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: number;
}

export interface TeamEvent {
  id: string;
  type: 'join' | 'leave' | 'focus' | 'target_change' | 'reward_change';
  content: string;
  timestamp: number;
}

export interface TeamSettingProposal {
  id: string;
  proposerId: string;
  targetType: 'total_time' | 'daily_time' | 'weekly_time' | 'monthly_time' | 'yearly_time';
  targetValue: number;
  rewardType: 'item' | 'text';
  rewardContent: string;
  votes: Record<string, boolean>; // userId -> boolean (true: accept, false: reject)
  status: 'pending' | 'approved' | 'rejected';
  expiresAt: number;
}

export interface TeamConfig {
  permission: 'captain_only' | 'unanimous';
  targetType: 'total_time' | 'daily_time' | 'weekly_time' | 'monthly_time' | 'yearly_time';
  targetValue: number; // stored in minutes
  rewardType: 'item' | 'text' | 'coins' | 'xp' | string;
  rewardContent: string; // e.g. "Pizza party!" or "{ type: 'item', id: '123' }"
  joinRule?: 'direct' | 'approval' | string;
  resetTime?: string; // e.g. "00:00" or "04:00"
}

export interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  members: TeamMember[];
  config: TeamConfig;
  currentProposal?: TeamSettingProposal;
  applicants?: TeamMember[] | any[];
  myUserId?: string;
  avatar?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
  stock?: number; // -1 for infinite
  icon?: string; // Lucide icon name
}

export interface GachaPool {
  id: string;
  name: string;
  type: 'gacha' | 'ichiban';
  cost: number;
  weights?: Record<string, number>;
  rarities?: {
    id: string;
    name: string;
    color: string;
    weight: number;
    rarityValue?: number;
  }[];
  items: {
    rarity: string;
    name: string;
    count?: number; // For Ichiban
    initialCount?: number; // For Ichiban
    color?: string; // For Ichiban custom colors
    rarityValue?: number; // numeric value (1-6)
  }[];
}
