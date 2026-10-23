export const APP_VERSION = 'v9.4.0';
export const LAST_UPDATE_DATE = '2026-10-23';
export const LAST_UPDATE_TIME = '17:01:00';

export interface ReleaseLog {
  version: string;
  date: string;
  time: string;
  title: string;
  items: { category: string; description: string }[];
}

export const RELEASE_HISTORY: ReleaseLog[] = [
  {
    version: 'v9.4.0',
    date: '2026-10-23',
    time: '17:01:00',
    title: 'Version 9.4: Workstation Session Architecture Consolidation',
    items: [
      { category: 'Workstation Refactor', description: 'Consolidated four duplicated punch-in / punch-out implementations (header controls, workstation modal, workstation view and the 4-hour timeout effect) into a single useWorkstation hook. Session start, settle, timeout and cloud sync now share one code path.' },
      { category: 'Dependency Fix', description: 'Replaced the unresolved framer-motion import with motion/react, which previously crashed the app under strict package managers.' },
      { category: 'Versioning', description: 'Unified the package.json version with the runtime APP_VERSION so the in-app update checker can no longer drift.' },
      { category: 'Performance', description: 'Stabilized the workstation hook callbacks with a state ref, so the 4-hour timeout interval is no longer torn down and rebuilt on every render.' },
      { category: 'Workstation Status Chip', description: 'Added a top-bar status chip using the user\'s own location icon: grey when idle, coloured while on duty, click to check in or out. Shows the day total on wide screens. The duplicated Check In / Desk Log controls were removed from the Explore header.' },
      { category: 'Location Management', description: 'The check-in popover now exposes a Manage entry that opens the location editor. Extracted it into a shared ManageLocationsModal, and added a confirmation step with explicit data-loss warning before resetting to the three defaults.' },
      { category: 'Duration Typography', description: 'Durations now render with a bold number and a lighter, smaller unit (e.g. 1h30m) via a shared DurationText component. Applied to the Sanctum today card, Record overview cards, weekly heatmap totals and Journal day summary.' },
      { category: 'Error Boundary', description: 'Added a render-error boundary around the whole app and around the active page. A crashing view now shows a recoverable panel (try again / reload / export data) instead of a blank screen, and the sidebar keeps working.' },
      { category: 'Save Versioning', description: 'Saves now carry a schema version. Loading, cloud restore and file import all go through the same migration path, and the previous save is snapshotted before any migration or import so bad data can be recovered.' },
      { category: 'Cloud Sync Hardening', description: 'Secret codes are now format-validated before any backend work, and cloud sync endpoints apply a per-IP rate limit (60s / 20 requests) on top of the existing 300-user quota.' }
    ]
  },
  {
    version: 'v9.3.0',
    date: '2026-09-08',
    time: '02:30:00',
    title: 'Version 9.3 Major Update: Multi-Window Synchronization & Focus Architecture Hardening',
    items: [
      { category: 'Multi-Window & PiP Hardening', description: 'Eliminated dual-instance session duplication bug caused by simultaneous rendering of fullscreen portal and standard explore timer views during PiP and popup transitions.' },
      { category: 'Session Deduplication Guard', description: 'Implemented global sub-second completion deduplication engine in state manager to guarantee idempotent focus session logging across all window modes.' },
      { category: 'Efficiency & Progress Engine', description: 'Hardened rest duration calculations and added customizable efficiency bounds (capped vs uncapped) with dynamic weight formula annotations and batch historical recalculation tools.' },
      { category: 'Workstation Tracking & Analytics', description: 'Enhanced workstation presence monitoring with 4-hour continuous duration safety limits, auto-timeout prompts, multi-layer distraction rate charts (/h), and full theme adaptation.' }
    ]
  },
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
