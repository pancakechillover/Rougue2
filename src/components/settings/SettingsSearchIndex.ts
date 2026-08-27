export interface SettingsSearchItem {
  id: string;
  tab: string;
  title: string;
  description: string;
  keywords: string[];
}

export const SETTINGS_SEARCH_INDEX: SettingsSearchItem[] = [
  // General Themes & Styling
  { id: 'setting-themes', tab: 'general', title: 'Themes', description: 'Appearance themes and colors', keywords: ['color', 'dark mode', 'light mode'] },
  { id: 'setting-auto-sync', tab: 'general', title: 'Auto Sync System', description: 'Switch Day/Night themes automatically', keywords: ['time', 'schedule theme', 'auto'] },
  { id: 'setting-timezone', tab: 'general', title: 'Timezone Selection', description: 'Configure timezone for daily reset', keywords: ['time zone', 'local system time', 'utc', 'region'] },
  
  // General Audio
  { id: 'setting-sound', tab: 'general', title: 'Sound Effects', description: 'Play sounds for actions like gacha and rewards', keywords: ['audio', 'music', 'volume'] },

  // General Time-Based Calculation
  { id: 'setting-time-based', tab: 'timer', title: 'Time-Based Calculation', description: 'Compute tasks by time instead of sessions', keywords: ['compute', 'session duration', 'minutes', 'rest time', 'include rest'] },
  { id: 'setting-open-ended', tab: 'general', title: 'Tasks Default to Open-Ended', description: 'Tasks default to tracking total time with no specific session limits', keywords: ['rooms', 'endless', 'open-ended', 'default'] },
  
  // General Heatmap
  { id: 'setting-heatmap', tab: 'general', title: 'Performance Heatmap', description: 'Heatmap saturation range configuration', keywords: ['0-8 mode', '0-16 mode', 'darkest color'] },
  
  // General End of the Day
  { id: 'setting-markdown', tab: 'general', title: 'Default Markdown', description: 'Enable Markdown in Daily Reflection by default', keywords: ['editor', 'text formatting'] },
  { id: 'setting-moods', tab: 'general', title: 'Mood Configuration', description: 'Selected moods available in daily summary', keywords: ['emoji', 'emotion', 'feeling'] },
  { id: 'setting-daily-goal', tab: 'general', title: 'Daily Progress Goal', description: 'Target focus session count progress', keywords: ['target', 'sessions', 'objective'] },
  
  // General Push Notifications
  { id: 'setting-push', tab: 'general', title: 'Push Notifications', description: 'Receive browser notifications for events', keywords: ['alerts', 'mobile push', 'service worker'] },
  
  // General Data Management
  { id: 'setting-data-management', tab: 'general', title: 'Data Management', description: 'Export backup, import JSON file, reset local data', keywords: ['download data', 'upload data', 'wipe data', 'clear storage', 'reset'] },

  // Timer Settings
  { id: 'setting-banner', tab: 'timer', title: 'Compact Timer Banner', description: 'Display a minimalist floating countdown banner globally', keywords: ['floating timer', 'minimal', 'overlay', 'global'] },
  { id: 'setting-manual-start', tab: 'timer', title: 'Manual Focus Start', description: 'Require explicit button click to begin next focus', keywords: ['auto start', 'continuous', 'pause', 'wait'] },
  { id: 'setting-skip-victory', tab: 'timer', title: 'Skip Victory Screen', description: 'Bypass the victory screen after focus finishes', keywords: ['auto resume', 'finish', 'end screen'] },

  // Level Rewards
  { id: 'setting-milestones', tab: 'level', title: 'Milestone List', description: 'Customize level-up bonuses, gold, and talent scrolls', keywords: ['levels', 'rewards', 'experience', 'xp requirement'] },

  // Merchant & Gacha
  { id: 'setting-shop', tab: 'merchant', title: 'Merchant Shop Shelves', description: 'Edit merchant shop listing shelves and prices', keywords: ['items', 'buy', 'merchant', 'inventory'] },
  { id: 'setting-gacha', tab: 'merchant', title: 'Gacha Summon Pools', description: 'Summon pool draw rates and items', keywords: ['loot boxes', 'drop rate', 'summon', 'probability', 'chest'] },

  // Balance Calculator
  { id: 'setting-calculator', tab: 'calculator', title: 'Economy Simulation Calculator', description: 'Mathematical simulations for expected economy drops', keywords: ['expected value', 'gold expected', 'xp', 'simulation', 'math'] },

  // Sage AI
  { id: 'setting-sage', tab: 'sage', title: 'Sage AI Assistant', description: 'Configure Sage personality modes and API integration', keywords: ['assistant', 'prompt', 'gemini ai', 'openai', 'claude', 'personality'] },

  // Cloud Archives
  { id: 'setting-sync-status', tab: 'cloud', title: 'Cloud Sync Status', description: 'Sync game progression to Astral Archives Servers', keywords: ['backup', 'save data', 'cross device', 'account code', 'login'] },
  { id: 'setting-webdav', tab: 'cloud', title: 'WebDAV Integration', description: 'Sync via personal WebDAV server', keywords: ['owncloud', 'nextcloud', 'custom host'] },
  { id: 'setting-drive', tab: 'cloud', title: 'Google Drive Sync', description: 'Sync via Google Drive', keywords: ['gdrive', 'google cloud'] },

  // Developer Panel
  { id: 'setting-dev', tab: 'dev', title: 'Developer Control', description: 'Access developer console commands and hard overrides', keywords: ['cheats', 'testing', 'override', 'debug'] },
  { id: 'setting-rewards', tab: 'timer', title: 'Reward Pool Management', description: 'Configure random rewards from chests and focus sessions', keywords: ['drop pool', 'items', 'copper bag', 'energy drink', 'rates'] }
];
