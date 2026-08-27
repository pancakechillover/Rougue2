# Project Tracker & Agent Instructions

## Role & Workflow
You are an AI assistant maintaining the "Scholar's Dungeon" project. 
At the start of every interaction, you automatically read this file (injected into your system prompt).

**CRITICAL RULE FOR EVERY UPDATE:**
We now separate updates into **Preview Updates** (预览更新) and **Official Updates** (正式更新):

**1. Preview Updates (预览更新 - Default):**
- Update the `APP_VERSION` in `src/version.ts`.
- Update the `Current Version` and `Last Update Date` in this `AGENTS.md` file.
- Log the completed task in the `Task History` section below.
- *Do not* modify `RELEASE_HISTORY` in `src/version.ts` or `public/version.json`.

**2. Official Updates (正式更新 - Only when requested):**
- Do all the steps for Preview Updates.
- Aggregate all features/fixes logged in `AGENTS.md` since the last Official Update.
- Write a comprehensive changelog summarizing these updates.
- Update `RELEASE_HISTORY` in `src/version.ts` with this aggregated changelog.
- Update `public/version.json` with the new version and changelog to trigger the app update popup.

**VERSIONING POLICY (x.y.z):**
- **x (Major):** Critical architectural changes or full-scale system overhauls.
- **y (Minor):** New features, significant UI additions, or functional enhancements.
- **z (Patch):** Bug fixes, micro-optimizations, documentation updates, and UI refinements.

**COMMUNICATION RULE:**
- You MUST ALWAYS reply to the user in Chinese (Simplified). This is an absolute requirement for every response you give.

**CSS & UI STANDARDS:**
- **Full-Screen Modals:** Whenever creating a "full-screen" centered modal (especially `fixed inset-0`), you MUST use `createPortal(..., document.body)` from `react-dom` to render the modal directly on the `body`. If you do not use `createPortal`, parent elements with CSS `transform`, `filter`, or `perspective` will establish unintended containing blocks that capture the `fixed` positioning, causing the modal to appear in the middle of a scrolling page container instead of the actual screen view. Never make this mistake again.
- **Italic Clipping:** To prevent right-side clipping of italic text (especially in browsers with tight bounding boxes), always add a small right padding (e.g., `pr-1` or `px-0.5`) to the element or its immediate container.
- **Red Dot / Notification Placement:** Unread message or notification badges (red dots) on icons and buttons MUST ALWAYS be placed in the bottom-right corner (e.g. `absolute -bottom-0.5 -right-0.5`), NEVER in the top-right corner.
- **Touch-Friendly Controls:** Delete buttons or other critical actions MUST NOT be hover-only (e.g. `opacity-0 group-hover:opacity-100`), as this is unfriendly to touch-screen users. They should be visible or adapt properly for mobile devices.
- **Theme-Aware Colors & Minimalist UI:** We have 6 different theme colors. Every color choice (especially backgrounds, progress bars, or buttons) MUST consider all themes to maintain a minimalist and premium aesthetic. Avoid thick, flashy, or hardcoded colors like `bg-emerald-500` which may look jarring or "rough" (粗率) in certain themes. Rely on theme-aware colors (`indigo-300`, `indigo-400`, `indigo-500`, `indigo-600`) or neutral slate colors with opacity. DO NOT use `indigo-200` or `indigo-700`+ for primary themed elements, as they will appear in the default blue color across all themes.

## Current Status
- **Current Version:** v9.0.7
- **Last Update Date:** 2026-08-27
- **Last Update Time:** 08:20:00

## Dark Themes Definition
The following themes are considered "Dark Themes" and form the baseline for vibrant visual effects and high-contrast glowing elements:
- **Night** (`data-theme="night"`)
- **Forest** (`data-theme="forest"`)
- **Ocean** (`data-theme="ocean"`)

## Light Themes Definition
The following themes are considered "Light Themes" and require special CSS handling (e.g., avoiding white text on light backgrounds, using theme-aware colors for modals and charts):
- **Daylight** (`data-theme="daylight"`)
- **Warm Sun** (`state.theme === "warm"`)
- **Candy** (`state.theme === "candy"`)

## Push Notification Troubleshooting Protocols
Due to inconsistencies in Web Push delivery in various environments (Iframes, PWAs), follow this hierarchy:
1. **Execution Context:** Web Push is often blocked in cross-origin IFRAMES. Always test by opening the app in a **New Tab** or as an **Installed PWA**.
2. **Direct Permission Check:** Verify address bar shows "Allowed". 
3. **Service Worker Console:** Switch to `Application -> Service Workers -> Inspect` in DevTools to see SW-specific logs (`[Service Worker]`). Main console may skip these.
4. **OS Level:** Check Windows Focus Assist or macOS Do Not Disturb.
5. **Direct API Test:** Use the "Test Local Notification (Direct)" tool in Developer settings. If this fails, the browser/OS is blocking notifications globally.
6. **VAPID Integrity:** If VAPID keys change, "Clear Server Sub" + "Reset Service Worker" is mandatory.


## Task History

- **v9.0.7 (2026-08-27):** Distraction Scale Dynamic Curve & Fullscreen Zero-Overlap Layout
  - *UI Adjustment:* Refined the focus timer circle's starting scale to 0.85 (more compact and elegant) and smoothly scales up to maximum 1.0 upon reaching 10 distractions (`0.85 + (min(distractions, 10) / 10) * 0.15`).
  - *Layout:* Restructured the Fullscreen Explore layout into a strict flexbox column where the top dungeon progress bar is part of the layout flow (`shrink-0`) and the timer gets the exact remaining viewport space (`flex-1 min-h-0`), guaranteeing that even at maximum scale and distraction count, the circle will never overlap the progress bar or bottom distraction controls.

- **v9.0.6 (2026-08-27):** Distractions in PIP, Custom Sounds & Fullscreen Layout Fix
  - *Feature:* Added the Distraction tracking module to the Compact (Picture-in-Picture) timer interface, migrating the state up to `useTimerStore`.
  - *Audio:* Implemented new synthesized audio feedback effects (`pop` and `error` in Web Audio API) so that the three distraction buttons now emit distinct sounds (Click, Pop, Error) for immediate blind-feedback.
  - *Bugfix:* Removed arbitrary CSS transform scales (`lg:scale-[1.35]`) from the Fullscreen Explore layout which was causing the dynamically expanding Timer component (under distraction pressure) to overflow flexbox constraints and visually overlap the top progress bar and bottom distractions panel. Reduced maximum distraction pressure scale to 5% to maintain visual integrity.

- **v9.0.5 (2026-08-13):** Distraction Tracking Feature
  - *Feature:* Added three localized distraction tracking buttons (自身 Internal, 环境 External, 不可抗 Unavoidable) right below the active timer controls to allow users to manually log interruptions during focus sessions.
  - *UI Adjustment:* Updated the Recent Sessions history table to dynamically compute and display a "Focus Quality" (专注度) score for sessions that recorded distractions, highlighting the precise count of each interruption type.

- **v9.0.4 (2026-06-23):** Force Check-in Fix & UI Slider Styling
  - *Bugfix:* Bypassed completeSession logic during manual Routine Tracker check-ins to directly append the session into local history. This guarantees a forced check-in completes accurately regardless of dungeon progression states, whilst omitting game rewards to prevent cheating. Popover now correctly closes after submission to offer immediate UI feedback.
  - *UI Adjustment:* Extracted HTML Range slider styles across the application settings panel. Thrice thickened the track visually (8px height) and integrated dynamic CSS linear-gradients to distinctly differentiate the covered (slid) and uncovered (unslid) regions for both WebKit & Firefox natively based on element value percentages.

- **v9.0.3 (2026-06-23):** Scrollbar OS Overrides & Check-in UTC Bug
  - *Bugfix:* Patched WebKit scrollbars ignoring customizations on Chrome 121+ by disabling the generic CSS `scrollbar-color` specification on non-Firefox browsers. The scrollbars will now properly retain theme `border-radius` and `background-clip` padding.
  - *Bugfix:* Forced `RoutineCellEditor` to synthesize timestamps via explicit physical `Date.UTC` mappings instead of looping an OS localizer. Fixes checks silently failing to commit on select time zones due to off-by-one mismatches.

- **v9.0.2 (2026-06-23):** Scrollbar & Routine Check-in Fix
  - *Bugfix:* Re-wrote routine manual check-in target timestamp synthesis to guarantee that the converted physical timezone mapped exactly to the user's selected grid-box timeframe.
  - *Bugfix:* Extracted custom scrollbar global CSS mapping (`.custom-scrollbar::-webkit-scrollbar`) out of Tailwind's internal `@layer base` sandbox into the global cascade layer. This patches an issue where browser native UI was preempting the style on WebKit rendering engines.

- **v9.0.1 (2026-06-23):** Heatmap Grid Quick-Add Timezone Fix
  - *Bugfix:* Fixed a critical timezone parsing bug in the Routine Tracker quick-add interface where `customTimestamp` was incorrectly converted into an ISO string via an intermediate local-time `Date` formatter, causing manual additions to silently drift backwards by a day. Manual inputs now enforce strict absolute UTC stamps.

- **v9.0.0 (2026-06-23):** Official Major Update
  - *Loot Pool Config:* Added Fixed/Free Loot Pool modes. Fixed Mode restricts edits to maintain a default 100-point balanced experience across 6 rarities while allowing customizations to text descriptions. Free mode preserves previous setups.
  - *Performance:* Decoupled the timer state using Zustand. It significantly boosts performance by preventing massive VDOM re-renders during countdowns.
  - *Notes & Reflections:* Users can now log study notes directly at the end of sessions. Added features to edit previous notes, hashtag filters, and automatic integration into daily reflections.
  - *Routine Tracker:* Revamped Routine Tracker to allow adding stats, inline duration editing, and hiding tasks. Includes a detailed full-screen stats view with date ranges.
  - *Fellowship Tools:* Captains can now Reclaim captaincy if they leave and rejoin. Captains can also directly Banish (Kick) inactive members, syncing stats immediately.
  - *UI & Polish:* Re-enabled theme-aware custom scrollbars. Added Merchant Outpost shortcut, adjusted Alchemy scaling multiplier (+15%), and re-scaled Grandmaster rank boundary.
