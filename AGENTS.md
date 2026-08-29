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
- **Strict English UI Standard:** All UI elements across the application (labels, titles, headings, buttons, badges, tabs, tooltips, placeholders, modal dialogs, and settings descriptions) MUST strictly and exclusively be in English. NEVER use Chinese characters or bilingual slash labels (such as `English / 中文`) in the application interface or code. (Note: The assistant still replies to the user in Chinese (Simplified) during chat interactions, but the app UI itself is 100% pure English).
- **Full-Screen Modals:** Whenever creating a "full-screen" centered modal (especially `fixed inset-0`), you MUST use `createPortal(..., document.body)` from `react-dom` to render the modal directly on the `body`. If you do not use `createPortal`, parent elements with CSS `transform`, `filter`, or `perspective` will establish unintended containing blocks that capture the `fixed` positioning, causing the modal to appear in the middle of a scrolling page container instead of the actual screen view. Never make this mistake again.
- **Italic Clipping:** To prevent right-side clipping of italic text (especially in browsers with tight bounding boxes), always add a small right padding (e.g., `pr-1` or `px-0.5`) to the element or its immediate container.
- **Red Dot / Notification Placement:** Unread message or notification badges (red dots) on icons and buttons MUST ALWAYS be placed in the bottom-right corner (e.g. `absolute -bottom-0.5 -right-0.5`), NEVER in the top-right corner.
- **Touch-Friendly Controls:** Delete buttons or other critical actions MUST NOT be hover-only (e.g. `opacity-0 group-hover:opacity-100`), as this is unfriendly to touch-screen users. They should be visible or adapt properly for mobile devices.
- **Theme-Aware Colors & Minimalist UI:** We have 6 different theme colors. Every color choice (especially backgrounds, progress bars, or buttons) MUST consider all themes to maintain a minimalist and premium aesthetic. Avoid thick, flashy, or hardcoded colors like `bg-emerald-500` which may look jarring or "rough" (粗率) in certain themes. Rely on theme-aware colors (`indigo-300`, `indigo-400`, `indigo-500`, `indigo-600`) or neutral slate colors with opacity. DO NOT use `indigo-200` or `indigo-700`+ for primary themed elements, as they will appear in the default blue color across all themes.

## Current Status
- **Current Version:** v9.0.27
- **Last Update Date:** 2026-08-28
- **Last Update Time:** 02:58:00

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

- **v9.0.27 (2026-08-28):** Chart Root Component Key-Binding for Mutually Exclusive Tooltips & Reliable Outside Click Dismissal
  - *Chart Root Key-Binding:* Relocated `chartKeys` from child `<Tooltip>` components directly onto the parent `<ComposedChart key={chartKeys.xxx}>` and `<LineChart key={chartKeys.xxx}>` components. When changing keys, Recharts' internal chart state (`isTooltipActive`) is cleanly remounted and reset to `false`.
  - *Weekly Chart Mutual Exclusion:* In `handleChartClick`, clicking an element in the Weekly Activity Bar chart immediately regenerates `chartKeys.weeklyLine` (and vice-versa), ensuring only one chart's popover can exist at any time.
  - *Reliable Click-Outside Auto-Dismissal:* In `handleOutsideInteraction`, clicking anywhere outside active chart containers and popover contents resets all chart keys, immediately closing all open tooltips.

- **v9.0.26 (2026-08-28):** Click-Outside Popover Auto-Dismissal & Mutually Exclusive Chart Tooltips
  - *Reliable Click-Outside Dismissal:* Refined `handleOutsideInteraction` click target detection to check for interactive SVG elements (`recharts-bar-rectangle`, `recharts-dot`, `recharts-sector`, `g.recharts-layer`, `recharts-cartesian-axis-tick`) instead of entire chart wrapper bounds. Clicking anywhere outside active chart items (empty page, other cards, whitespace in or out of chart) now immediately closes open popovers.
  - *Mutually Exclusive Chart Popovers:* In `handleChartClick`, whenever a data point or category is clicked on any chart (such as Weekly Activity Bar or Weekly Efficiency Trend), all other charts' `chartKeys` are immediately regenerated, ensuring that only one chart tooltip can be open at any given moment.

- **v9.0.25 (2026-08-28):** Fix Daily Distractions Mode Bar Isolation, Cursor Ghost Columns & 0-Data Popover Stability
  - *Distractions-Only Bar Isolation:* Explicitly mapped `<Cell fill="transparent" fillOpacity={0} stroke="transparent" />` to hit-box `<Bar>` elements in `Distractions` (lines) mode in both Daily and Weekly charts, completely eliminating unintentional colored session bars from leaking into the Distractions view.
  - *Eliminate Lingering Cursor Ghost Highlight:* Removed Recharts `cursor={{ fill: ... }}` background highlight (`cursor={false}`) across Daily, Weekly, and Sleep charts, preventing any grey columns from remaining visible after popovers close.
  - *Reliable 0-Data Category Popovers:* Fixed `handleOutsideInteraction` and `handleChartClick` so clicking periods with zero recorded time or zero distractions stably opens the popover ("No activity") without premature dismissal or flickering.
  - *Data Fallback in Tooltips:* Added `allData` fallback lookups in `CustomDailyTooltip` and `CustomWeeklyTooltip` to guarantee popover rendering even when Recharts returns an empty `payload` array.

- **v9.0.24 (2026-08-28):** Fix Record Bubble Card (Popover/Tooltip) Interaction & Synchronization Bugs
  - *Single-Click Tooltip Open:* Refined `handleChartClick` so clicking data points on any chart opens the popover immediately without resetting the active chart's key or requiring a double-click.
  - *Transparent Bar Hitboxes:* Added transparent `<Bar>` overlays for `Distractions` line mode in both Daily and Weekly `ComposedChart` components, making trend line nodes effortless to click and tap on touch/mobile devices.
  - *Reliable Click-Outside Dismissal:* Enhanced the global `click` and `touchstart` listener to cleanly dismiss all popovers when clicking outside charts, popovers, or heatmap cells while preventing premature dismissal during button clicks.
  - *Scroll & Resize Synchronization:* Added listeners to dismiss open popovers during scroll or window resize events to eliminate floating detachments.
  - *Heatmap Distractions Breakdown:* Fixed missing `distractions`, `internal`, `external`, and `unavoidable` count aggregation in `renderHeatmapPopover`, ensuring full parity with Daily and Weekly card popovers.
  - *Session Details Integrity:* Passed `processedHistory` with pre-computed `assignedDateStr` and `period` into `DailySessionsModal` to guarantee accurate session listings and period breakdowns.

- **v9.0.23 (2026-08-28):** Strict English UI Standard & Clean Average Calculation Settings
  - *Strict English UI Standard:* Added a strict rule to `AGENTS.md` specifying that all UI elements across the application must strictly and exclusively be in English with zero Chinese characters or bilingual slashes.
  - *Clean Average Calculation Setting:* Removed the Chinese label suffix and the descriptive `(e.g. ...)` subtext from the "Average Calculation" section in `ViewSettingsModal.tsx`, leaving clean, minimalist buttons ("Total Days" / "Active Days").

- **v9.0.22 (2026-08-28):** Heatmap Hourly Distraction Rate & Dashboard Average Baseline Toggle
  - *Heatmap Avg/h Distraction Rate:* Updated the Distractions summary card in the Activity Heatmap from "Avg/Day" to "Avg/h", dividing total interruptions by effective study hours `(distractions / (timeOrTasks / 60))` to accurately reflect focus quality across any time scale.
  - *Dashboard Layout Average Calculation Toggle:* Added an "Average Calculation" setting in Dashboard Layout (`statsViewOpts.averageCalculationBase`), allowing users to switch whether daily averages (Avg Gold, Avg Exp, Avg Time) in Weekly and Heatmap summaries are computed using Active Days or Total Calendar Days.

- **v9.0.21 (2026-08-28):** Fix Distractions-Only Y-Axis Display in Daily and Weekly Activity Charts
  - *Clean Conditional Y-Axis Rendering:* Resolved an issue where the Distractions Y-axis did not render on the left in single-axis mode (`Distractions` only) due to multi-axis layout collisions with hidden axes. Now mounts only the active Y-axis in single mode (`yAxisId="distractions"`, `orientation="left"`), rendering integer count ticks clearly on the left.
  - *Seamless Dual/Single Mode Axis Binding:* In `Both` mode, mounts `yAxisId="time"` (left) and `yAxisId="distractions"` (right); in `Time` mode, mounts `yAxisId="time"` (left); in `Distractions` mode, mounts `yAxisId="distractions"` (left).

- **v9.0.20 (2026-08-28):** Refined Layer Selector Labels & Responsive Single/Dual Y-Axes Display
  - *Clean Layer Selector Labels:* Removed the "Layer:" prefix from the Daily and Weekly selector badges and option menus, displaying concise pills: `Both`, `Time`, and `Distractions`.
  - *Contextual Single/Dual Y-Axes:* Configured Recharts Y-axes in both Daily and Weekly charts to dynamically show values based on the active mode:
    - When single axis (`Time` or `Distractions` only): Displays the respective tick values on the left Y-axis.
    - When dual axis (`Both` mode): Left Y-axis displays formatted focus time (e.g. `30m`, `1h`), and right Y-axis displays integer distraction counts (0, 1, 2, 3...).

- **v9.0.19 (2026-08-28):** 3-Mode Layer Toggle & Deep Crimson Red for Unavoidable Distractions
  - *3-Mode Layer Toggle:* Restructured the Layer dropdown selector in both Daily and Weekly activity cards into 3 intuitive modes: ① `Layer: Time` (时长的柱状图), ② `Layer: Distractions` (分心的折线图), ③ `Layer: Both` (两者都有), with persistent local storage.
  - *Deep Red for Unavoidable Interruptions:* Changed the color representation for "Unavoidable" interruptions from rose-pink (`#fb7185`) to a distinct, high-contrast deep crimson red (`#ef4444` / `text-red-400` / `bg-red-500/20`), clearly separating it from Afternoon's orange (`#f97316` / `#fb923c`) across the Timer buttons, Chart trend lines, and Popover tooltips.

- **v9.0.18 (2026-08-28):** Fix Recharts Line Right-Side Animation Clipping Bug
  - *ClipPath Animation Bug Fix:* Disabled `isAnimationActive` on `ComposedChart` `Line` and `Bar` series in both Daily and Weekly charts. This eliminates Recharts' dynamic SVG clipPath truncation where line segments were prematurely cut off midway before connecting to rightmost data points.
  - *Balanced Margins:* Normalized chart margins to symmetric `margin={{ top: 12, right: 16, left: 16, bottom: 0 }}` ensuring consistent padding and unobstructed rendering for all nodes and line paths across all screen sizes.

- **v9.0.17 (2026-08-28):** Streamlined Layer Dropdown & Matching Timer Distraction Colors with Light Strokes
  - *Streamlined Layer Dropdown:* Replaced multi-button layer toggle groups in Daily & Weekly headers with compact, elegant dropdown selectors matching the "Last 7d / Natural" pill design (`Layer: All`, `Layer: Internal`, `Layer: External`, `Layer: Unavoidable`, `Layer: Off`).
  - *Timer-Matched Distraction Colors:* Aligned the 3 distraction trend lines and tooltip badges directly with the Timer interface's color scheme (Internal: Indigo `#818cf8`, External: Orange `#fb923c`, Unavoidable: Rose `#fb7185`).
  - *Light-Colored Dot Strokes:* Replaced dark dot borders with clean, high-contrast light white strokes (`stroke: '#ffffff'`) on chart dots and active hover states for superior visibility across all dark and light themes.

- **v9.0.16 (2026-08-27):** Refined Distraction Layer Controls, Chart Margin & SVG Icon Purity
  - *SVG Icon Purity:* Replaced all emojis in `SharedPopoverContent` and `CustomDailyTooltip` with pure Lucide SVG icons (`Brain`, `Wind`, `Zap`), strictly eliminating emoji usage across tooltips and popovers.
  - *High-Contrast Chart Lines:* Shifted Distraction trend lines to non-colliding colors (Internal: Sky `#38bdf8`, External: Emerald `#34d399`, Unavoidable: Rose `#f43f5e`) ensuring crisp contrast against Yellow, Orange, Indigo, and Slate bars.
  - *Right Boundary Margin Fix:* Added `margin={{ top: 12, right: 18, left: -20, bottom: 0 }}` and `overflow: 'visible'` to `ComposedChart` in both Daily and Weekly views to prevent rightmost dots and line endpoints from being clipped.
  - *Header Row Layer Controls:* Relocated Distraction Layer toggle buttons directly into the header rows of both Daily and Weekly activity cards, creating a cleaner and unified card layout.

- **v9.0.15 (2026-08-27):** Dual-Layer Distraction Composed Charts & Hourly Interruption Rate KPIs
  - *Composed Dual-Layer Charts:* Upgraded Daily and Weekly activity charts from simple BarCharts to Recharts `ComposedChart` with dual Y-axes (`yAxisId="left"` for session durations, `yAxisId="right"` for distraction counts), preventing scale interference between minutes and counts.
  - *Distraction Trend Lines & Filters:* Added individual trend lines for Internal (`#818cf8`), External (`#fb923c`), and Unavoidable (`#fb7185`) interruptions, along with top layer filter toggles (`All`, `Internal`, `External`, `Unavoidable`, `Hide`) and local persistence.
  - *Hourly Distraction Rate KPI (次/h):* Refactored the Daily "Distracted" and Weekly "Avg Distracted" KPI cards to calculate the normalized focus interruption rate `(分心次数 / 专注时长小时数) 次/h` to accurately reflect focus quality.
  - *Interactive Tooltips:* Enhanced Daily and Weekly chart tooltips with rich popovers breaking down total distraction counts, hourly rates, and per-type distributions with themed icons.

- **v9.0.14 (2026-08-27):** Daily Activity Section & Chart Dependency Robustness Fix
  - *Data & Computation Integrity:* Fixed date validation in `getPeriodInfo` and memoized session and reward fetchers (`getSessionsForDate`, `getRewardsForDate`) to ensure the Daily section updates smoothly on date changes.
  - *Distraction & NaN Safeguards:* Added universal fallback calculations for `distractions` in `dailyGains`, `weeklyGains`, `dailyData`, and `heatmapSummary` to prevent `NaN` values from breaking the Daily gains cards and charts.
  - *Daily Pie Chart Dependencies:* Resolved undeclared dependency bugs in `DailyPieChart.tsx` by directly watching `sessions`, `date`, `dungeons`, and `timeSettings`.

- **v9.0.12 (2026-08-27):** Restored Subtle Inline Translucent Badges with Fixed Footprints
  - *UI Aesthetic Restoration:* Reverted the 100% opaque corner badge back to the elegant, subtle theme-aware translucent inline pill badges (`bg-indigo-500/20 text-indigo-400`, `bg-orange-500/20 text-orange-400`, `bg-rose-500/20 text-rose-400`).
  - *Zero-Jitter Fixed Layout:* Maintained fixed, tailored button widths (`w-[84px] sm:w-[94px] md:w-[104px]` for Internal/External, `w-[96px] sm:w-[106px] md:w-[118px]` for Unavoidable) so that buttons never expand, shrink, or push neighboring elements when counts change.

- **v9.0.11 (2026-08-27):** Fixed Distraction Footprint & Zero-Jitter Badges
  - *Layout Stability:* Standardized all three Distraction buttons (Internal, External, Unavoidable) with fixed proportional width dimensions (`w-[86px] sm:w-[98px] md:w-[112px]`).
  - *Zero Layout Shift:* Converted distraction counts from inline flow elements to non-intrusive bottom-right absolute corner badges (`absolute -bottom-1 -right-0.5`). Clicking distraction buttons and recording counts now preserves the exact same container footprint without any stretching, shifting, or jumping.

- **v9.0.10 (2026-08-27):** Persistent Distraction Controls & Layout Stability
  - *UI & UX Stability:* Distraction tracking controls (Internal, External, Unavoidable) are now permanently and stably visible during all focus timer states (ready to start, running, paused) rather than appearing only after clicking start. This eliminates layout shifts and abrupt pop-ins upon starting a focus session.
  - *Compact / PIP Parity:* Ensured consistent visibility and standardized notification badge positioning in both full timer and Compact (Picture-in-Picture) timer views.

- **v9.0.9 (2026-08-27):** Dynamic Mathematical Layout & Absolute Non-Overlapping Guarantee
  - *Layout Architecture:* Replaced manual / absolute positioning with an integrated Flex column layout where Distractions, Controls, and the Circular Arena are distinct sequential flex children (`justify-between`), completely eliminating any possibility of Controls overlapping Distractions.
  - *Mathematical Safe Sizing:* Implemented a dynamic calculation hook using `ResizeObserver` that measures exact container height/width in real-time, deducts the precise heights of Controls, Distraction controls, and safety margins, and computes `safeDiameter`. Circle scaling (0.85 -> 1.0) strictly respects this ceiling so it will never overlap or push into adjacent components regardless of screen height or distraction count.

- **v9.0.8 (2026-08-27):** Fullscreen Distraction Bottom Anchor & Expanded Circular Arena
  - *UI Refactor:* Re-anchored the active Distraction tracker to the absolute bottom of the screen (`absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2`) when in Fullscreen mode.
  - *Layout & Sizing:* Freed up vertical space for the central timer display by separating distractions from the controls flex flow, expanding the maximum responsive bounds of the timer in fullscreen mode up to `max-w-[540px]` / `max-h-[540px]` on wide viewports without any danger of overlapping.

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
