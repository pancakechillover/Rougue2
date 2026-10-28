export const APP_VERSION = 'v9.4.26';
export const LAST_UPDATE_DATE = '2026-10-27';
export const LAST_UPDATE_TIME = '12:20:00';

export interface ReleaseLog {
  version: string;
  date: string;
  time: string;
  title: string;
  items: { category: string; description: string }[];
}

export const RELEASE_HISTORY: ReleaseLog[] = [
  {
    version: 'v9.4.26',
    date: '2026-10-28',
    time: '12:20:00',
    title: 'Version 9.4.26: Expedition Actions Move Into a Menu',
    items: [
      { category: 'Expedition', description: 'Each task row carried seven permanent icons — move to top, move up, move down, add sub-task, edit, delete, complete. Reordering already had a drag handle, so three of those were a second entrance to the same operation. Rows now show the drag handle, the checkbox and a single menu button.' },
      { category: 'Expedition', description: 'The menu holds edit, add sub-task, the three reorder commands and delete. It is rendered against the viewport, so it cannot be clipped by the scrolling list.' },
      { category: 'Expedition', description: 'Dungeon goals got the same treatment. The edit toggle in the toolbar is now a Select button that only governs batch selection; undo is available without entering a mode first.' }
    ]
  },
  {
    version: 'v9.4.25',
    date: '2026-10-28',
    time: '02:05:00',
    title: 'Version 9.4.25: Real Heatmap Equal Height',
    items: [
      { category: 'Record', description: 'The calendar and the summary still did not match on iPad. They were never going to: five columns by six rows at 40px cells tops out around 270px while the summary needs roughly 400px, so no amount of alignment fixes the column height. Cells now scale with the breakpoint (56px from 1024, 60px from 1280) and the two measure exactly equal.' },
      { category: 'Settings', description: 'Locking body overflow alone did not stop iOS Safari from scrolling the document. The root element is locked too now, and overscroll behaviour is disabled while Settings is open.' }
    ]
  },
  {
    version: 'v9.4.24',
    date: '2026-10-28',
    time: '01:55:00',
    title: 'Version 9.4.24: Heatmap Alignment and iOS Scroll Lock',
    items: [
      { category: 'Record', description: 'The 30-day calendar and the summary card now share a top and bottom edge. The row already stretched, but the calendar column aligned its grid to the top, leaving a strip of dead space underneath. It is centred and fills the column now, and the gap between the two is tighter.' },
      { category: 'Settings', description: 'Measuring the pane height was not enough on iOS Safari — the page stayed scrollable and a swipe over the rail still dragged it. On desktop widths the body scroll is now locked while Settings is open, so the gesture has nothing to move, and the scroll position is restored on the way out.' }
    ]
  },
  {
    version: 'v9.4.23',
    date: '2026-10-28',
    time: '01:25:00',
    title: 'Version 9.4.23: Settings Panes on iOS',
    items: [
      { category: 'Settings', description: 'On iPad the rail and content still scrolled together. The pane height was a hard-coded calc(100dvh - 73px): Safari resolves dvh against the viewport with its toolbars hidden and the chrome above the panel is a different height, so the page stayed taller than the screen and a swipe over the rail dragged the whole page. The pane now measures its own available height, and re-measures when the toolbar slides or the device rotates.' },
      { category: 'Settings', description: 'Both panes also stop scroll chaining, so a swipe that reaches the end of one pane no longer pulls the page behind it.' }
    ]
  },
  {
    version: 'v9.4.22',
    date: '2026-10-28',
    time: '01:10:00',
    title: 'Version 9.4.22: Settings Page Cannot Scroll',
    items: [
      { category: 'Settings', description: 'Wheeling over the rail still scrolled the whole page. The pane height was 100dvh, but the top status bar (41px) and the app wrapper padding (32px) sit outside it, so the page stayed 73px taller than the viewport and the wheel fell through to it. The height now subtracts both, the page is exactly viewport-tall, and the wheel has nowhere to go except the pane under the cursor.' }
    ]
  },
  {
    version: 'v9.4.21',
    date: '2026-10-28',
    time: '00:55:00',
    title: 'Version 9.4.21: Two Independent Panes',
    items: [
      { category: 'Settings', description: 'The rail and the content column now scroll separately instead of the whole page scrolling as one. On desktop the settings screen occupies the viewport and each pane owns its own scrollbar.' },
      { category: 'Settings', description: 'Removed the extra top padding that left a blank band above the search field; the search box now lines up with the content heading.' },
      { category: 'Settings', description: 'Widened the rail so the longest label no longer truncates.' }
    ]
  },
  {
    version: 'v9.4.20',
    date: '2026-10-28',
    time: '00:45:00',
    title: 'Version 9.4.20: Icon Rail and Search',
    items: [
      { category: 'Settings', description: 'Every rail entry now carries its section icon, so the list can be scanned by shape instead of reading each label.' },
      { category: 'Settings', description: 'Search sits at the top of the rail. Results render in the content column and jump straight to the matching control, then clear the query so the section is visible.' },
      { category: 'Settings', description: 'The rail sticks to the top of the viewport and scrolls on its own if it ever outgrows the screen, so it no longer trails the content column while scrolling.' }
    ]
  },
  {
    version: 'v9.4.19',
    date: '2026-10-27',
    time: '23:40:00',
    title: 'Version 9.4.19: Settings Rail',
    items: [
      { category: 'Settings', description: 'Settings now uses a left rail on desktop — Personal / Data / Gameplay / About — with the section you are in highlighted. Opening /settings lands on General instead of a redundant entry list.' },
      { category: 'Settings', description: 'The outer card around the whole panel is gone. It added a border, a translucent fill and a backdrop blur that did nothing on a solid background, while eating 30px of content width.' },
      { category: 'Settings', description: 'Content sits in one consistent column at a fixed maximum width, so wide screens no longer leave a dead strip on the right and ultrawide screens no longer stretch a single toggle across the page.' },
      { category: 'Settings', description: 'On phones the rail becomes its usual entry list with grouped headers and hairline dividers, and each section keeps a back button — same group data, one component, two presentations.' }
    ]
  },
  {
    version: 'v9.4.18',
    date: '2026-10-27',
    time: '23:30:00',
    title: 'Version 9.4.18: Settings Restructure',
    items: [
      { category: 'Settings', description: 'The settings menu is one continuous list instead of a stack of cards — smaller icons, hairline separators, and no per-row borders or oversized corners.' },
      { category: 'Settings', description: 'Data Management moved up to sit right after General Settings.' },
      { category: 'Settings', description: 'Every compartment now has its own URL (/settings/general, /settings/cloud …), so the address bar reflects where you are, a refresh reopens the same page, and back/forward work.' },
      { category: 'Settings', description: 'Heatmap saturation moved out of General Settings into the Record page layout panel, next to the Activity Heatmap toggle it belongs with.' },
      { category: 'Settings', description: 'The "End of the day" block is now "Start/End of the day" and also holds Tasks Default to Open-Ended and the Start of the Day prompt, instead of them sitting in their own section.' }
    ]
  },
  {
    version: 'v9.4.17',
    date: '2026-10-27',
    time: '22:45:00',
    title: 'Version 9.4.17: No More Popover Jitter',
    items: [
      { category: 'Record', description: 'The day popover drifted vertically right after it opened. The anchor cell scales up on select, and the portal was re-reading the anchor every animation frame — getBoundingClientRect includes transforms, so the card kept chasing the zoom. Anchor tracking is now event-driven (scroll / resize only), so the card is placed once and stays put.' },
      { category: 'Record', description: 'The card is also measured before it is placed, instead of being positioned with a guessed height and corrected afterwards — the corrected pass could flip it from above the cell to below it, which looked like a hop.' },
      { category: 'Record', description: 'Chart tooltips no longer recompute their clamping on every render, and they measure against the content width rather than the window width.' }
    ]
  },
  {
    version: 'v9.4.16',
    date: '2026-10-27',
    time: '22:20:00',
    title: 'Version 9.4.16: One Popover Everywhere',
    items: [
      { category: 'Record', description: 'The day popover existed twice — once shared, once copied inside the weekly section — and they had drifted: different stat rows, different footer buttons. There is now a single implementation, so the heatmap and the weekly chart show the same card.' },
      { category: 'Record', description: 'The heatmap cell ring was being clipped on the right edge by the scrolling container. The container no longer clips, so the selected cell can pop out properly again.' },
      { category: 'Record', description: 'Efficiency is shown as a percentage rather than a raw rating, and the day popover gained the Return to Day shortcut.' }
    ]
  },
  {
    version: 'v9.4.15',
    date: '2026-10-27',
    time: '22:00:00',
    title: 'Version 9.4.15: Heatmap Scrollbar and Selection',
    items: [
      { category: 'Record', description: 'A stray horizontal scrollbar could appear under the heatmap: sub-pixel rounding sometimes made the content one pixel wider than its box. The bar is now hidden while scrolling still works.' },
      { category: 'Record', description: 'The selected day used to scale up by a quarter, which pushed it over its neighbours and made it read as a floating white block. It now gets an inset ring instead, so the grid stays perfectly regular.' }
    ]
  },
  {
    version: 'v9.4.14',
    date: '2026-10-27',
    time: '19:40:00',
    title: 'Version 9.4.14: Phone Layout Fixes',
    items: [
      { category: 'Mobile', description: 'The Expedition Horizon heading refused to shrink and ran into the range controls on phones, so the two overlapped. It now shrinks, and screens narrower than 640px get the short label instead of the full name.' },
      { category: 'Mobile', description: 'The 24h Presence & Focus Ring heading and its "tap ring segments" hint were forced onto one line and collided. They now wrap onto a second line when there is not enough room.' }
    ]
  },
  {
    version: 'v9.4.13',
    date: '2026-10-27',
    time: '18:45:00',
    title: 'Version 9.4.13: Popover Clamping Actually Works Now',
    items: [
      { category: 'UI', description: 'The popover centred itself with translateX(-50%) and clamped that centre against a half-width taken from a 260px fallback. Real panels are wider than that, so the right edge still pushed past the card and was clipped. Positioning now uses an absolute left edge and clamps the panel width first, then its left edge, which makes an overflow impossible.' },
      { category: 'UI', description: 'The panel is also measured only when its content changes. Measuring on every anchor frame kept re-rendering and left the geometry one frame behind the truth.' }
    ]
  },
  {
    version: 'v9.4.12',
    date: '2026-10-27',
    time: '18:30:00',
    title: 'Version 9.4.12: Popovers No Longer Tuck Under the Scrollbar',
    items: [
      { category: 'UI', description: 'Floating panels were clamped against window.innerWidth, which includes the width of the vertical scrollbar. The last stretch of every popover therefore slid under the scrollbar and looked clipped by the card edge; they now clamp against the actual content width.' }
    ]
  },
  {
    version: 'v9.4.11',
    date: '2026-10-27',
    time: '18:10:00',
    title: 'Version 9.4.11: Trend Strips and Streaks',
    items: [
      { category: 'Record', description: 'Each summary card now carries a 30-day bar strip of its own metric, so the tall card is filled with something worth reading instead of empty space. The strip normalises to the busiest day, which keeps a quiet month readable.' },
      { category: 'Record', description: 'Focused Days now also reports the current and best run of consecutive active days.' },
      { category: 'Record', description: 'The Study Time / Efficiency toggle is remembered between visits instead of resetting to Study Time every time.' }
    ]
  },
  {
    version: 'v9.4.10',
    date: '2026-10-27',
    time: '17:50:00',
    title: 'Version 9.4.10: No Scrollbar, Responsive Year Grid',
    items: [
      { category: 'Heatmap', description: 'The year view no longer spills into a horizontal scrollbar. Its wrapper was still pinned to max-content width, so the 53 columns pushed past the card; it now shares the same shrinkable grid as the other views and stays inside its container.' },
      { category: 'Heatmap', description: 'Cell size follows the space actually available, so collapsing the sidebar makes every cell grow to fill the extra width instead of leaving it unused.' },
      { category: 'Heatmap', description: 'The year summary card now spans the full row with its stat blocks flowing into up to five columns, and the month labels span two tracks so they are no longer clipped to a single letter.' }
    ]
  },
  {
    version: 'v9.4.9',
    date: '2026-10-27',
    time: '17:00:00',
    title: 'Version 9.4.9: Year Heatmap Fills the Row',
    items: [
      { category: 'Heatmap', description: 'The year view now spreads its 53 week-columns across the full width instead of huddling in the middle, and every cell keeps a square shape by deriving its height from its width. Because the columns are narrow, filling the row barely changes the height of the chart.' },
      { category: 'Heatmap', description: 'The month labels and the weekday labels now share the exact same column tracks as the cells, so they stay aligned when the columns resize.' }
    ]
  },
  {
    version: 'v9.4.8',
    date: '2026-10-27',
    time: '16:35:00',
    title: 'Version 9.4.8: Flexible Heatmap Cells',
    items: [
      { category: 'Heatmap', description: 'The calendar cells now size themselves to the space they are given instead of a fixed pixel value. The weekday column and the cell grid share one set of column tracks, so the month labels stay locked over their own week at any width.' },
      { category: 'Heatmap', description: 'The dead space between the calendar and the summary card is gone. The two columns now split the row, leaving only the regular gap between them, and a floor on the summary width keeps its stat blocks readable on narrower screens.' }
    ]
  },
  {
    version: 'v9.4.7',
    date: '2026-10-27',
    time: '15:10:00',
    title: 'Version 9.4.7: Heatmap Alignment',
    items: [
      { category: 'Heatmap', description: 'The calendar and the summary card now share a single top edge and a single bottom edge. The row used to be top-aligned only, so the summary card ended roughly 40px short of the grid and the two blocks looked like they were floating at different heights.' },
      { category: 'Heatmap', description: 'The stat rows inside the summary split the leftover height instead of leaving a band of dead space, and the calendar column no longer reserves extra padding below the last row of cells.' }
    ]
  },
  {
    version: 'v9.4.6',
    date: '2026-10-27',
    time: '14:40:00',
    title: 'Version 9.4.6: Heatmap Layout Balance',
    items: [
      { category: 'Heatmap', description: 'The summary card now grows to fill the leftover width instead of sitting at a fixed 288px. A 30-day grid is only five columns wide, so the old layout left roughly 270px of empty space on each side; the stats are now laid out as one full-width row plus a 2x2 block, which finally has room to breathe.' },
      { category: 'Heatmap', description: 'Cells grow to 48px on wide screens, and the card is sized to its content rather than stretched to match the calendar height.' }
    ]
  },
  {
    version: 'v9.4.5',
    date: '2026-10-27',
    time: '13:50:00',
    title: 'Version 9.4.5: No More Pointless Comparisons & Record Header Layout',
    items: [
      { category: 'Cloud Sync', description: 'Restoring a cloud save no longer pops the comparison dialog again. Two things caused it: the "identical data" shortcut was skipped whenever the caller asked to force the modal, and a check that was still in its delay could wake up after the conflict had been resolved and write a fresh comparison. Identical saves are now always silent, and resolving a conflict cancels any check still in flight.' },
      { category: 'Record Layout', description: 'The chart-layer filter moved from beside the card title to the right-hand control row, next to the date stepper, so all interactive controls sit together and the title row stays clean. Applied to both Daily and Weekly.' }
    ]
  },
  {
    version: 'v9.4.4',
    date: '2026-10-27',
    time: '01:10:00',
    title: 'Version 9.4.4: Sleep Charts Split, Unified Date Stepper & Gacha Fixes',
    items: [
      { category: 'Sleep Tracker', description: 'Split into two charts that answer different questions: when you slept (two lines for bedtime and wake time) and how much you slept (one bar per night). They share a single date control, sit side by side on wide screens and stack on narrow ones, and the block no longer carries a border.' },
      { category: 'Calendar Markers', description: 'Days with sleep but no study session showed nothing in the date picker, because only study sessions and reflections fed the markers. Sleep now counts as activity too.' },
      { category: 'Date Navigation', description: 'Every date control in Record, Today, Workstation and Journal now uses one stepper component: previous / next / back-to-today. The Heatmap had no back-to-today at all and now has one; Today, Workstation and Journal gained it for consistency. Step sizes stay with each page, so a week, a month or a year still moves by a week, a month or a year.' },
      { category: 'Sleep Entry', description: 'The entry dialog now warns when a date already has a record, and offers three one-tap presets for the most common bedtime/wake patterns.' },
      { category: 'Gacha Reliability', description: 'Roll results are computed before the state update instead of being collected inside it, so a deferred update can no longer return an empty result list. Charging is now tied to pulls that actually produce an item, which fixes a case where hitting an unconfigured rarity counted as a pull but cost nothing.' },
      { category: 'Gacha Pools', description: 'Multiple items can now share one rarity and all of them are reachable; previously only the first configured entry could ever be drawn.' }
    ]
  },
  {
    version: 'v9.4.3',
    date: '2026-10-27',
    time: '00:20:00',
    title: 'Version 9.4.3: Account Rule Consistency & Enumeration Hardening',
    items: [
      { category: 'Sign-Up Validation', description: 'The client accepted usernames up to 20 characters and passwords up to 64, while the server allowed 24 and 128. Accounts created through the API with the longer values could never sign in from the web form, which rejected them outright. Both sides now share one set of limits (3–20 / 6–64) defined in a single module, and a test asserts the two ends agree on the boundaries so they cannot drift apart again.' },
      { category: 'Sign-In Tolerance', description: 'Sign-in deliberately checks the username more loosely than sign-up (length floor and character set only). Tightening the server to 20 would otherwise have locked out any account that already used 21–24 characters.' },
      { category: 'Enumeration', description: 'The live username-availability lookup could be polled without limit to discover which names exist. The per-IP budget is now tighter; the lookup itself is kept because it is the only way to tell a user their name is taken before they submit.' },
      { category: 'Sign-In Errors', description: 'A missing account and a wrong password now return the same status and message, so the response no longer reveals whether a name is registered.' },
      { category: 'Rate Limiting', description: 'Registration and sign-in no longer share one budget. Failing to sign in ten times used to block creating a new account for five minutes; the two flows now have separate limits.' }
    ]
  },
  {
    version: 'v9.4.2',
    date: '2026-10-26',
    time: '23:59:00',
    title: 'Version 9.4.2: Passport Dialog Fixes & Verification Hardening',
    items: [
      { category: 'Verification', description: 'Verification characters are now drawn as a dot matrix rather than text nodes, so the answer can no longer be pulled out of the markup with a single regular expression. The client-side fallback challenge was removed: the server only accepts codes it signed itself, and an unreachable challenge now shows a retry state instead of a code that could never pass.' },
      { category: 'Passport Dialog', description: 'Dismissing the red error banner no longer closes the entire window.' },
      { category: 'Passport Dialog', description: 'The compact view no longer offers "Dismiss Comparison" when there is nothing to compare; in that state it reads "Not Now".' },
      { category: 'Comparison', description: 'The comparison table now covers the five fields that decide the choice: level/XP, gold, session count, last update, and which device saved each side.' },
      { category: 'Cloud Sync', description: 'Initializing a cloud archive no longer pops a second comparison straight afterwards. Automatic checks pause briefly once a conflict has been resolved, while explicit checks still run.' },
      { category: 'Device Identity', description: 'Restoring a cloud save no longer overwrites this browser\'s device code, so Chrome and Edge on the same computer keep separate identities instead of being treated as one device. New codes carry a browser prefix, and a reset control is available when an identity has already been shared.' }
    ]
  },
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
      { category: 'Cloud Sync Hardening', description: 'Secret codes are now format-validated before any backend work, and cloud sync endpoints apply a per-IP rate limit (60s / 20 requests) on top of the existing 300-user quota.' },
      { category: 'Lint Setup', description: 'Added ESLint 9 flat config (typescript-eslint + react-hooks) and Prettier. The first audit caught a duplicate interface, dead code and a misleading hook-like callback name; lint passes with 0 errors.' },
      { category: 'CI', description: 'Every push and pull request now runs install, typecheck, lint, tests and a full build on GitHub Actions. Failures block the PR and upload the build output for diagnosis.' },
      { category: 'Routing', description: 'Page state now lives in the URL path (/explore, /stats, ...). Refreshing, deep-linking and the mobile back button all work; unknown paths fall back to the dashboard, and legacy #/tab bookmarks are migrated automatically.' }
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
