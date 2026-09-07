export const APP_VERSION = 'v9.2.9';
export const LAST_UPDATE_DATE = '2026-09-07';
export const LAST_UPDATE_TIME = '06:35:00';

export interface ReleaseLog {
  version: string;
  date: string;
  time: string;
  title: string;
  items: { category: string; description: string }[];
}

export const RELEASE_HISTORY: ReleaseLog[] = [
  {
    version: 'v9.2.0',
    date: '2026-09-06',
    time: '03:00:00',
    title: 'Version 9.2 Major Update: Workstation Presence Tracking & Precision Focus System',
    items: [
      { category: 'Workstation Tracking', description: 'Replaced fixed target focus time with real-time workstation presence tracking. Check in across locations (Office, Lab, Library, Home Desk, Cafe) with automatic conversion rate metrics and fallback support.' },
      { category: 'Presence & Efficiency Hub', description: 'Integrated Presence Hub with location distribution bars, live status tracking, manual interval logging, and retroactive punch-card adjustments.' },
      { category: 'Location Icon Library', description: 'Customizable 12-icon preset library for check-in locations with responsive selector grids and seamless in-place editing.' },
      { category: 'Visual Polish & Consistency', description: 'Standardized header banners, subtitle time range formats, theme-aware color palettes, and precision TimePicker wheel controls across Agenda, Workstation, and Journal.' }
    ]
  },
  {
    version: 'v9.0.0',
    date: '2026-06-23',
    time: '01:00:00',
    title: 'Version 9.0 Major Update: Loot Pool fixed mode, performance tweaks & QOLs',
    items: [
      { category: 'Loot Pool Config', description: 'Added Fixed/Free Loot Pool modes. Fixed Mode restricts edits to maintain a default 100-point balanced experience across 6 rarities while allowing customizations to text descriptions. Free mode preserves previous setups.' },
      { category: 'Performance', description: 'Decoupled the timer state using Zustand. It significantly boosts performance by preventing massive VDOM re-renders during countdowns.' },
      { category: 'Study Notes & Reflections', description: 'Users can now log study notes directly at the end of sessions. Added features to edit previous notes, hashtag filters, and automatic integration into daily reflections.' },
      { category: 'Routine Tracker', description: 'Revamped Routine Tracker to allow adding stats, inline duration editing, and hiding tasks. Includes a detailed full-screen stats view with date ranges.' },
      { category: 'Fellowship Tools', description: 'Captains can now Reclaim captaincy if they leave and rejoin. Captains can also directly Banish (Kick) inactive members, syncing stats immediately.' },
      { category: 'UI & Polish', description: 'Re-enabled theme-aware custom scrollbars. Added Merchant Outpost shortcut, adjusted Alchemy scaling multiplier (+15%), and re-scaled Grandmaster rank boundary.' }
    ]
  }
];
