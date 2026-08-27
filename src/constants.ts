import { RewardCard, Talent, GachaPool, Quest } from './types';
import { Sun, CloudLightning, Flame, BatteryLow, Sparkles, Brain, Coffee, Smile, Frown, Meh } from 'lucide-react';

export const MOOD_OPTIONS = [
  { id: 'great', label: 'Great', icon: Sun, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  { id: 'good', label: 'Good', icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  { id: 'neutral', label: 'Okay', icon: Meh, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { id: 'bad', label: 'Bad', icon: Frown, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
  { id: 'awful', label: 'Awful', icon: CloudLightning, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { id: 'productive', label: 'Productive', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { id: 'tired', label: 'Tired', icon: BatteryLow, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
  { id: 'inspired', label: 'Inspired', icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  { id: 'focused', label: 'Focused', icon: Brain, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/30' },
  { id: 'chill', label: 'Chill', icon: Coffee, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/30' }
];

export const DEFAULT_ENABLED_MOODS = ['great', 'good', 'neutral', 'bad', 'awful'];

export const DEFAULT_QUESTS: Quest[] = [
  // Daily Quests
  { id: 'q_daily_1', title: 'Daily Warmup', description: 'Complete 1 task today', type: 'daily_sessions', target: 1, progress: 0, reward: { type: 'xp', amount: 50 }, completed: false, order: 1, isAchievement: false },
  { id: 'q_daily_2', title: 'Daily Grind', description: 'Complete 3 tasks today', type: 'daily_sessions', target: 3, progress: 0, reward: { type: 'coins', amount: 10 }, completed: false, order: 2, isAchievement: false },
  { id: 'q_daily_3', title: 'Daily Master', description: 'Complete 5 tasks today', type: 'daily_sessions', target: 5, progress: 0, reward: { type: 'item', amount: 1, itemName: 'Small Wallet' }, completed: false, order: 3, isAchievement: false },
  
  // Weekly Quests
  { id: 'q_weekly_1', title: 'Weekly Scholar', description: 'Complete 10 tasks this week', type: 'weekly_sessions', target: 10, progress: 0, reward: { type: 'xp', amount: 300 }, completed: false, order: 4, isAchievement: false },
  { id: 'q_weekly_2', title: 'Weekly Dedication', description: 'Complete 25 tasks this week', type: 'weekly_sessions', target: 25, progress: 0, reward: { type: 'coins', amount: 50 }, completed: false, order: 5, isAchievement: false },
  
  // Monthly Quests
  { id: 'q_monthly_1', title: 'Monthly Marathon', description: 'Complete 50 tasks this month', type: 'monthly_sessions', target: 50, progress: 0, reward: { type: 'talentPoint', amount: 1 }, completed: false, order: 6, isAchievement: false },
  
  // Achievements
  { id: 'a_total_10', title: 'First Steps', description: 'Complete 10 tasks in total', type: 'total_sessions', target: 10, progress: 0, reward: { type: 'coins', amount: 20 }, completed: false, order: 11, isAchievement: true },
  { id: 'a_total_50', title: 'Getting Serious', description: 'Complete 50 tasks in total', type: 'total_sessions', target: 50, progress: 0, reward: { type: 'xp', amount: 500 }, completed: false, order: 12, isAchievement: true },
  { id: 'a_total_100', title: 'Centurion', description: 'Complete 100 tasks in total', type: 'total_sessions', target: 100, progress: 0, reward: { type: 'talentPoint', amount: 1 }, completed: false, order: 13, isAchievement: true },
  { id: 'a_streak_3', title: 'Warming Up', description: 'Maintain a 3-day streak', type: 'consecutive_days', target: 3, progress: 0, reward: { type: 'coins', amount: 15 }, completed: false, order: 14, isAchievement: true },
  { id: 'a_streak_7', title: 'Unstoppable', description: 'Maintain a 7-day streak', type: 'consecutive_days', target: 7, progress: 0, reward: { type: 'item', amount: 1, itemName: 'Death Defying Gold Medal' }, completed: false, order: 15, isAchievement: true },
];

export const INITIAL_REWARD_POOL: RewardCard[] = [
  // ===== Common: 50 total =====
  {
    id: 'lucky_penny',
    name: 'Lucky Penny',
    description: 'Gain 1 Gold Coin',
    rarity: 'common',
    type: 'coins',
    amount: 1,
    weight: 16.67
  },
  {
    id: 'scribbled_note',
    name: 'Scribbled Note',
    description: 'Gain 10 XP',
    rarity: 'common',
    type: 'xp',
    amount: 10,
    weight: 16.67
  },
  {
    id: 'one_song_pass',
    name: 'One Song Pass',
    description: 'Listen to one song as a short reward before your next task',
    rarity: 'common',
    type: 'text',
    weight: 16.66,
    limitCount: 3,
    limitPeriodDays: 1
  },

  // ===== Uncommon: 25 total =====
  {
    id: 'two_coppers',
    name: 'Two Coppers',
    description: 'Gain 2 Gold Coins',
    rarity: 'uncommon',
    type: 'coins',
    amount: 2,
    weight: 8.33
  },
  {
    id: 'study_gem',
    name: 'Study Gem',
    description: 'Gain 20 XP',
    rarity: 'uncommon',
    type: 'xp',
    amount: 20,
    weight: 8.33
  },
  {
    id: 'page_marker',
    name: 'Page Marker',
    description: 'Next Coins +5%',
    rarity: 'uncommon',
    type: 'item',
    itemType: 'coin_bonus_percent',
    amount: 5,
    weight: 8.34
  },

  // ===== Rare: 15 total =====
  {
    id: 'copper_bag',
    name: 'Copper Bag',
    description: 'Gain 3 Gold Coins',
    rarity: 'rare',
    type: 'coins',
    amount: 3,
    weight: 5
  },
  {
    id: 'tiny_scroll',
    name: 'Tiny Scroll',
    description: 'Gain 30 XP',
    rarity: 'rare',
    type: 'xp',
    amount: 30,
    weight: 5
  },
  {
    id: 'coffee_bean',
    name: 'Coffee Bean',
    description: 'Next XP +10%',
    rarity: 'rare',
    type: 'item',
    itemType: 'xp_bonus_percent',
    amount: 10,
    weight: 5
  },

  // ===== Epic: 8 total =====
  {
    id: 'small_wallet',
    name: 'Small Wallet',
    description: 'Gain 5 Gold Coins',
    rarity: 'epic',
    type: 'coins',
    amount: 5,
    weight: 2.67
  },
  {
    id: 'bookmark',
    name: 'Bookmark',
    description: 'Next Coins +10%',
    rarity: 'epic',
    type: 'item',
    itemType: 'coin_bonus_percent',
    amount: 10,
    weight: 2.67
  },
  {
    id: 'five_minute_scroll',
    name: 'Five-Minute Scroll',
    description: 'Take a timed 5-minute scroll break, then return to your next task',
    rarity: 'epic',
    type: 'text',
    weight: 2.66,
    limitCount: 2,
    limitPeriodDays: 1
  },

  // ===== Legendary: 1.5 total =====
  {
    id: 'talent_shard',
    name: 'Talent Shard',
    description: 'Talent scroll piece (1/3)',
    rarity: 'legendary',
    type: 'item',
    itemType: 'talent_shard',
    amount: 1,
    weight: 0.75,
    limitCount: 3,
    limitPeriodDays: 3
  },
  {
    id: 'death_gold',
    name: 'Death Defying Medal',
    description: 'Prevent one streak break',
    rarity: 'legendary',
    type: 'item',
    itemType: 'death_defying_medal',
    amount: 1,
    weight: 0.75,
    limitCount: 1,
    limitPeriodDays: 3
  },

  // ===== Mythic: 0.5 total =====
  {
    id: 'mini_game_token',
    name: 'Mini Game Token',
    description: 'Play one short game or a 5–10 minute mini-game session as a rare reward',
    rarity: 'mythic',
    type: 'text',
    weight: 0.25,
    limitCount: 1,
    limitPeriodDays: 1
  },
  {
    id: 'guilty_pleasure_coupon',
    name: 'Guilty Pleasure Coupon',
    description: 'Claim one small guilty pleasure, with a timer, then return to your quest',
    rarity: 'mythic',
    type: 'text',
    weight: 0.25,
    limitCount: 1,
    limitPeriodDays: 7
  }
];

export const TALENTS: Talent[] = [
  // Branch A: Truth Crown
  { id: 'a1', name: 'Mind Lubrication', description: 'Base XP +10% per task', branch: 'A', tier: 1, cost: 1, effect: 'xp_10', icon: 'BicepsFlexed', unlocked: false, active: false },
  { id: 'a2', name: 'Flow Experience α', description: 'Accumulate 8 hours of focus time in one day to claim 200 XP.', branch: 'A', tier: 2, cost: 2, effect: 'daily_16_xp', icon: 'BrainCircuit', unlocked: false, active: false },
  { id: 'a3', name: 'Perfect Theory', description: 'Accumulate 4 hours of focus time. Yields (20 * Streak) XP. Streak caps at 10 days.', branch: 'A', tier: 3, cost: 3, effect: 'streak_xp', icon: 'Rocket', unlocked: false, active: false },
  
  // Branch B: Golden Law
  { id: 'b1', name: 'Alchemy', description: 'Base coins +15% per task', branch: 'B', tier: 1, cost: 1, effect: 'coin_15_perc', icon: 'Pickaxe', unlocked: false, active: false },
  { id: 'b2', name: 'Flow Experience β', description: 'Accumulate 8 hours of focus time in one day to claim 50 Coins.', branch: 'B', tier: 2, cost: 2, effect: 'daily_16_coin', icon: 'BrainCog', unlocked: false, active: false },
  { id: 'b3', name: 'Bounty Decree', description: 'Accumulate 4 hours of focus time. Yields (10 * Streak) Coins. Streak caps at 10 days.', branch: 'B', tier: 3, cost: 3, effect: 'streak_coin', icon: 'Goal', unlocked: false, active: false },

  // Branch C: Fate Dice
  { id: 'c1', name: 'Extra Chance', description: 'Loot choice becomes 4-of-1', branch: 'C', tier: 1, cost: 1, effect: 'loot_4', icon: 'HeartPlus', unlocked: false, active: false },
  { id: 'c2', name: 'Shuffler', description: '1 free reroll per chest draw', branch: 'C', tier: 2, cost: 2, effect: 'loot_reroll', icon: 'Dices', unlocked: false, active: false },
  { id: 'c3', name: 'Critical Intuition', description: '5% chance for 5x coins', branch: 'C', tier: 3, cost: 3, effect: 'coin_crit', icon: 'HandCoins', unlocked: false, active: false },
];

export const INITIAL_GACHA: GachaPool[] = [
  {
    id: 'standard_gacha',
    name: 'Standard Gacha',
    type: 'gacha',
    cost: 100,
    rarities: [
      { id: 'SSR', name: 'SSR', color: 'amber', weight: 5, rarityValue: 5 },
      { id: 'SR', name: 'SR', color: 'purple', weight: 15, rarityValue: 4 },
      { id: 'R', name: 'R', color: 'blue', weight: 80, rarityValue: 3 },
    ],
    items: [
      { rarity: 'SSR', name: 'Big Lego Set / New Gadget / Weekend Trip', rarityValue: 5 },
      { rarity: 'SR', name: 'Fancy Dinner / Movie Night / Dessert', rarityValue: 4 },
      { rarity: 'R', name: '1 Hour Gaming / 15m Nap / Favorite Snack', rarityValue: 3 }
    ]
  },
  {
    id: 'ichiban_1',
    name: 'Standard Ichiban Kuji',
    type: 'ichiban',
    cost: 50,
    items: [
      { rarity: 'A Prize', name: 'Premium Figure / Limited Artbook', count: 1, initialCount: 1, color: 'amber', rarityValue: 5 },
      { rarity: 'B Prize', name: 'Luxury Cushion / Desk Mat', count: 2, initialCount: 2, color: 'purple', rarityValue: 4 },
      { rarity: 'C Prize', name: 'Acrylic Stand / Keychain Set', count: 5, initialCount: 5, color: 'blue', rarityValue: 3 },
      { rarity: 'D Prize', name: 'Sticker Pack / Badge', count: 12, initialCount: 12, color: 'emerald', rarityValue: 2 },
      { rarity: 'LastOne', name: 'Golden Trophy / Special Edition Figure', count: 1, initialCount: 1, color: 'rose', rarityValue: 6 }
    ]
  }
];

export const DEFAULT_SAGE_PROMPTS = [
  { id: 'prompt_welcome', title: 'App Intro', prompt: 'Sage, please introduce me to the "Scholar\'s Dungeon" application. What are its core mechanics, reward systems, and how should I start my journey of growth here?' },
  { id: 'prompt_tasks', title: 'Create Tasks', prompt: 'Help me plan an expedition. Please create a structured learning task or expedition for me, including its tiers, required tasks, and rewards.' },
  { id: 'prompt_balance', title: 'Balance Guide', prompt: 'Based on my current level, gold earning rate, and shop prices, could you recommend how I should set my game balance? For example, how should XP and Gold rewards for each Focus Session be distributed to be fair and motivating?' },
  { id: 'prompt_week', title: 'Weekly Analysis', prompt: 'Please retrieve my study records from the past 7 days and analyze my peak focus hours, as well as the correlation between my emotional state and productivity. Please summarize my overall performance this week using intuitive data observations.' },
  { id: 'prompt_month', title: 'Monthly Review', prompt: 'I would like to do a deep reflection on the past month. Please analyze my monthly progress curve. Have I stagnated in any area? Based on my growth rate, please set three specific "step-by-step goals" for next month.' },
  { id: 'prompt_1', title: 'Efficiency', prompt: 'Please analyze my recent learning efficiency trends and provide three practical and actionable suggestions for improvement.' },
  { id: 'prompt_3', title: 'Encouragement', prompt: 'I have been feeling a bit exhausted lately. Please give me some encouragement and motivation.' }
];
