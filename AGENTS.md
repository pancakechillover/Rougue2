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
- **Current Version:** v9.0.73
- **Last Update Date:** 2026-08-30
- **Last Update Time:** 06:00:00

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

- **v9.0.73 (2026-08-30):** Full Restoration of Clean Timer CSS Architecture & Distraction Module Integration
  - *Restored Clean Timer CSS Layout:* Fully restored the original responsive CSS layout in `Timer.tsx` (`max-w-[280px] sm:max-w-[360px] lg:max-w-[420px] xl:max-w-[480px]` with `aspect-square`, `text-6xl sm:text-7xl lg:text-7xl` typography, and standard sized circular control buttons `w-24 h-24` / `p-4`), eliminating unstable JavaScript runtime scaling calculations and restores the rock-solid visual proportions.
  - *Distractions Module Seamless Integration:* Placed the Distractions module (`Internal` / `External` / `Unavoidable`) cleanly right below the primary control buttons without disturbing the center circle layout or typography.
  - *Restored Fullscreen Mode & Explore View Parity:* Restored the original clean scaling and top progress bar positioning in `ExploreView.tsx` during fullscreen mode.

- **v9.0.71 (2026-08-30):** Enlarge Countdown Typography & Streamline PiP Dual-Mode Responsive Layout
  - *Enlarge Countdown Typography:* Significantly enlarged the center countdown typography in `Timer.tsx` (scale ratio increased to `0.33 * safeDiameter`, scaling up to 128px) and in `CompactTimer.tsx` (`4.25rem` in Standard Mode, `2.75rem` in Condensed Mode), restoring the bold, prominent timer digits.
  - *PiP Dual-Mode Layout Clarification:* Clarified the architecture of the 2 responsive PiP modes (① Standard Vertical Card Mode, ② Condensed Horizontal Split Mode) and ensured the Distractions module seamlessly hides in ultra-short condensed mode (`max-height: 240px`) to prevent squeezing the countdown.

- **v9.0.69 (2026-08-30):** Soften Dark Mode Sunrise Solar Disc Brightness & Glow
  - *Calibrated Solar Glow:* Softened the glaring bright yellow overexposure on dark backgrounds by switching the solar disc to a rich, warm golden-amber gradient (`from-amber-300 via-amber-500 to-orange-600`) and reducing the drop-shadow radius/opacity (`shadow-[0_0_30px_rgba(245,158,11,0.35)]`).
  - *Gentle Ambient Atmosphere:* Muted the outer radial atmosphere aurora and sunbeam line intensities to eliminate neon glare, presenting a soft, atmospheric dawn warmth against dark theme backgrounds.

- **v9.0.68 (2026-08-30):** Sunrise Splash Light Theme Adaptation & Center Emblem Alignment
  - *Light Theme Color & Contrast Parity:* Fully adapted `SplashScreen.tsx` for Light Themes (`Daylight`, `Warm Sun`, `Candy`). Replaced washed-out pale yellow text and screen blends with crisp, high-contrast headings (`text-slate-900`), warm dawn sky ambient gradients, high-contrast golden-amber subtitles (`text-amber-700`), and balanced version tags.
  - *Logo & Rising Sun Unity:* Redesigned the Sunrise animation hierarchy to embed the App Emblem (Sword & Quill) directly into the mathematical and optical center of the glowing golden sun orb, with 12-ray rotating sunbeams and radiant halos expanding symmetrically from the center.

- **v9.0.67 (2026-08-30):** Reposition PiP Mode Distraction Module Below Controls
  - *PiP Layout Hierarchy Alignment:* Reordered the layout hierarchy in `CompactTimer.tsx` to position the distraction module (`[INT] [EXT] [UNA]`) directly below the primary timer controls (`Reset`, `Play/Pause`, `Skip`), matching the main Explore dashboard layout and improving one-handed touch/click ergonomics in Picture-in-Picture mode.

- **v9.0.66 (2026-08-30):** Remove Explore Ring Zoom Animation & Enlarge Center Countdown Typography
  - *Remove Ring Scale Animation:* Eliminated the spring scale-up animation and initial layout resizing artifacts when entering the Explore tab, ensuring the circular timer appears instantly and steadily without visual jump or magnification.
  - *Enlarge Center Timer Typography:* Significantly increased the center countdown digits (`04:04`) font size ratio (from ~19% to ~28.5% of the ring diameter, scaling up to 112px) with bold, high-contrast monospace styling matching the minimalist reference design.
  - *Balanced Inner Ring Hierarchy:* Adjusted the loops badge pill position and bottom status label spacing to comfortably accommodate the enlarged digits across both desktop and mobile viewports.

- **v9.0.65 (2026-08-30):** Sunrise Splash Animation & Direct Start of the Day Transition
  - *Sunrise Splash Animation:* Designed a dedicated Sunrise splash variant with rising sun animations, multi-layered warm auroras, rotating sunbeams, and luminous dawn typography while preserving the original App Logo.
  - *Seamless Direct Entry:* When `Show "Start of the Day" Prompt` is enabled, the app automatically plays the Sunrise splash on startup and transitions directly into the full-screen Start of the Day interface without any delay or secondary pop-up jumping animations.
  - *Clean Modal Fade Transition:* Removed the jarring `scale` and `y` bounce animation from `StartOfDayModal`, replacing it with a clean, smooth fade transition.

- **v9.0.63 (2026-08-29):** Fix Record View Tooltip Clipping
  - *Boundary-Aware Tooltips:* Fixed a bug where data popover bubbles on the `Record` view chart would occasionally overflow the screen boundary. Implemented enhanced viewport-aware constraints and `max-width` handling to ensure popovers always remain fully contained within the screen viewport.

- **v9.0.62 (2026-08-29):** Efficiency% Mode Parity for Record & End of Day Summary
  - *Record Trend Alignment:* Updated the `Efficiency Trend` line chart in the `Record` view to dynamically adapt to the global `ratingDisplayPreference`. When `Efficiency %` mode is enabled, the Y-axis scales from 0-100% and data points are mapped accordingly, providing a consistent numerical view across the app.
  - *Context-Aware Rating:* Updated `DailySummaryModal` to respect the global `ratingDisplayPreference` toggle. When set to `Efficiency %` mode, the End of the Day summary panel dynamically replaces star ratings with a high-contrast percentage display, ensuring consistent visual representation across the dashboard and record views.

- **v9.0.61 (2026-08-29):** Global Rating Display Preference Toggle
  - *Rating Display Toggle:* Added a global toggle in `Adjustable Parameters` to switch between `Efficiency %` and `Star Rating` display modes.
  - *Global Effect:* Setting persists in `EfficiencyRatingConfig` and dynamically updates the `Resulting Rating` card and `Apply & Calculate` button label across the UI.
  - *Context-Aware Rendering:* Automatically hides star icons and switches to numeric percentage display when `Efficiency %` mode is enabled.

- **v9.0.60 (2026-08-29):** Parameter Steppers Modernization, Spinner Removal & Matrix High-Performance Optimization
  - *Browser Spin Button Eradication:* Cleaned up browser-native up/down arrow spin buttons across all number inputs in `EfficiencyDetailsModal` and `index.css` via `[appearance:textfield]` and `-webkit-appearance: none`.
  - *Unified Left/Right Stepper Controls for Weights:* Modernized `Rating Weight Preference` inputs into dual left `[-]` and right `[+]` precision steppers with ±10% step increments, maintaining seamless 100% total balance.
  - *Expanded Modal Canvas Width:* Expanded `EfficiencyDetailsModal` width container from `max-w-2xl` to `max-w-4xl lg:max-w-5xl`, allowing the reference matrix and calculation breakdown to expand fully without unnecessary scrollbars on desktop screens.
  - *High-Performance Matrix Memoization:* Encapsulated Dynamic Rating Reference Matrix table construction and formula evaluations in `useMemo`, eliminating lag and unnecessary re-renders when adjusting parameters.

- **v9.0.59 (2026-08-29):** Dynamic Efficiency Matrix & Rating Reference Lookup Table
  - *Dynamic Reference Matrix Table:* Added a dedicated `Dynamic Rating Reference Matrix` lookup table to `EfficiencyDetailsModal`:
    - **Header Columns (Distraction Rate):** `0 / hr`, `0.2b / hr`, `0.4b / hr`, `0.6b / hr`, `0.8b / hr`, `≥ b / hr` (dynamically calculating step increments based on $b$).
    - **Row Intervals (Actual Focus Time):** `0.25a h`, `0.50a h`, `0.75a h`, `≥ a h` (dynamically calculating time milestones based on $a$).
    - **Cell Values Format:** `Efficiency % / Star Rating` (e.g., `25% / 1.5★`, `70.5% / 3.5★`, `100% / 5★`), computed with mathematical precision according to live parameters $a, b, c, d$.
    - *Theme-Aware Styling:* Clean monospace typography, responsive horizontal scrolling, subtle alternating row zebra stripes, and high-contrast star ratings across all Light and Dark themes.

- **v9.0.58 (2026-08-29):** Free-Form Numeric Inputs with Precision Steppers & Streamlined Minimalist Result Card
  - *Free-Form Input Fields & Precision Steppers:* Completely replaced the slider controls (`<input type="range" />`) in `EfficiencyDetailsModal` with sleek, directly typeable numeric inputs paired with precision steppers:
    - **Target Focus Time:** Free input with strict ±0.5h step constraints (`0.5h ~ 24h`) and one-click Sanctum Goal reset.
    - **Acceptable Distraction Rate:** Free integer input with ±1 steppers (`1 ~ 50 / hr`).
    - **Weight Preferences:** Free percentage inputs for Completion Rate Weight and Focus Degree Weight (summing to 100%).
  - *Clean & Minimalist Resulting Rating Card:* Eradicated cluttered technical text (`Raw score: ...`, `(Rounded to nearest 0.5★)`, `(...% Efficiency)`), replaced with a clean, high-contrast rating card centering the badge, large score display, and golden star indicators.
  - *Full Theme Parity:* Seamless contrast across all light and dark themes.

- **v9.0.57 (2026-08-29):** End of the Day Efficiency Rating Auto-Calculation, Animation & Dynamic Formula Details Modal
  - *Auto-Calculation Button with Delightful Animation:* Added an animated Calculate (`<Sparkles />`) button in `DailySummaryModal`'s Efficiency Rating card that executes the dynamic formula with interactive star scale/rotation animations, audio cues, and instant score feedback badges.
  - *Dynamic Formula & Parameters Modal (`EfficiencyDetailsModal`):* Built a full-screen portal modal displaying the active mathematical formulas, today's step-by-step metrics breakdown, and real-time interactive parameter adjustments:
    - **Target Focus Time ($a$ hours):** Defaults to the Sanctum Today goal, with day-only slider/stepper overrides and quick goal resets.
    - **Max Tolerable Distraction Rate ($b$ times/hr):** Global setting (default 10) dynamically calculating distraction penalty rates.
    - **Rating Preference Weights ($c\%$ vs $d\%$):** Interactive dual-weight slider (default 70% / 30%) balancing duration achievement against deep concentration quality.
    - **Auto-Calculation on Open Toggle:** Global preference allowing users to enable/disable automatic rating calculations when opening the End of the Day modal (default: enabled).
  - *Full Theme & Contrast Parity:* Designed with theme-aware tokens, math badges, and responsive controls across all Light and Dark themes.

- **v9.0.56 (2026-08-29):** Desktop Fullscreen Modals, Rest-Aware Target Duration & Duration Display Formatting
  - *Desktop Full-Screen Modals:* Updated `StartOfDayModal` and `DailySummaryModal` to fill the entire desktop screen (`w-screen h-screen rounded-none border-0`), achieving full parity with the mobile immersive full-screen experience.
  - *Rest-Inclusive Daily Goal Calculation:* Integrated Pomodoro standard rest duration (`(standardSessionMinutes || 25) + (standardRestMinutes || 5)`) into daily target calculations across both the Sanctum Today Card in `DashboardView` and Daily Progress in `DailySummaryModal` (e.g. 16 pomodoros target = 8h).
  - *Universal Duration Formatting (`h min`):* Implemented global `formatDuration` helper in `src/lib/utils.ts` and integrated it into Sanctum's Today progress card, End of Day Daily Progress, and Today's Record summary stat cards (e.g. `1h 30m`, `8h`).

- **v9.0.55 (2026-08-29):** Vibrant Color Upgrade for Yesterday & Routine/DDL Tags
  - *Vibrant Blue for Yesterday:* Replaced the muted/dark `sky-600` / `sky-400` with the app's established bright blue palette (`text-blue-500` / `text-blue-400`, `bg-blue-500`), matching the Rare rarity and system status indicators.
  - *Vibrant Flame Orange for Routine & DDL:* Replaced the muddy/brownish `amber-600` / `amber-400` with the app's established bright flame orange palette (`text-orange-500` / `text-orange-400`, `bg-orange-500`), matching the Flame, Streak, Productive, and Afternoon activity indicators.
  - *Dual-View Parity:* Applied unified color standards across both `TodayView` and `StartOfDayModal` across all light and dark themes.

- **v9.0.54 (2026-08-29):** Agenda UI Streamlining, Toolbar Reordering, Auto Scroll & State Persistence
  - *Clean Ratio & Auto-Sort Badges:* Eradicated "Completed" text from the ratio badge (`X / Y`) and "Auto Sort" text from the auto-sort button across `TodayView` and `StartOfDayModal`, presenting ultra-clean minimalist icons and pill counters.
  - *Add Task Button Relocation:* Moved the Add Task (`<Plus />`) button to the far right of the input row (`Import → Expedition Picker → Add Task`), establishing a logical workflow from auxiliary imports to primary submission.
  - *Banner Back Button Relocation:* Repositioned the Back button (`<ArrowLeft />`) to the far right edge of the top banner toolbar in `TodayView`.
  - *Instant Scroll-to-Top on Enter:* Configured automatic window and scroll container reset (`window.scrollTo(0, 0)`) whenever navigating into the Agenda view or upon `TodayView` mounting.
  - *Agenda View State Persistence:* Persisted `dashboard_showTodayView` in `localStorage`, guaranteeing that if the user was on the Agenda page, reopening or returning to Sanctum automatically preserves and displays the Agenda view.

- **v9.0.53 (2026-08-29):** Routine Task Integration for Agenda Auto-Import, Amber Tagging & Hierarchy Sorting
  - *Routine Auto-Import:* Integrated uncompleted routine expeditions (`isRoutine` on sub-dungeon or parent Major Dungeon) into the one-click Agenda Auto-Import engine (`importableTasks`) across `TodayView` and `StartOfDayModal`, preventing duplicate insertions while preserving clean task titles.
  - *Amber Routine Tag & Indicator:* Configured dedicated Orange/Amber visual styling (`text-amber-400` / `text-amber-600`, `<RefreshCcw />`, `bg-amber-500`) with cycle frequency badges (`Daily`, `Weekly`, `Monthly`) matching the DDL Amber design language.
  - *5-Tier Auto-Sort Priority Engine:* Updated `sortAgendaTodos` in `src/lib/utils.ts` to implement the strict hierarchy: `Overdue DDL (Due Today & Overdue) → Left DDL (Unexpired DDLs) → Yesterday (Yesterday's Uncompleted) → Routine (Routine Expeditions) → General (Manual & Standard Tasks)`, keeping uncompleted tasks sorted above completed tasks.

- **v9.0.52 (2026-08-29):** Relocate Ratio Badge to Left of Auto-Sort & Eradicate "Focusing" Tag
  - *Ratio Badge Relocation:* Repositioned the `Completed` ratio badge (`X / Y Completed`) in the top banner header of `TodayView` and the modal header of `StartOfDayModal` to sit directly to the left of the `Auto Sort` button, maintaining visual cohesion in the toolbar controls.
  - *Eradicate "Focusing" Tag:* Removed the redundant `Focusing` badge and pulsing tag text from active focus task rows across `TodayView` and `StartOfDayModal`, relying on the refined pulsing outer ring, radial glow, and play button highlights for a clean and minimalist aesthetic.

- **v9.0.51 (2026-08-29):** O(1) Index Maps & High-Performance Derived Memoization for Agenda & Horizon
  - *O(1) Map Lookups:* Integrated memoized `dungeonMap: Map<string, Dungeon>` and `majorDungeonMap: Map<string, MajorDungeon>` in `TodayView` and `StartOfDayModal`, reducing expedition and deadline lookups from $O(N)$ linear scans to instant $O(1)$ dictionary queries.
  - *Optimized Auto-Sort Engine:* Refactored `sortAgendaTodos` in `src/lib/utils.ts` to pre-calculate item tier scores in a single $O(N)$ pass with Map indexing, eliminating redundant sorting comparison evaluations ($O(N \log N)$) and reducing date-parsing overhead.
  - *List Render & Hierarchy Optimization:* Accelerated `getDungeonDepth`, completion count calculations, and Todo list map loops across both dashboard and modal views using index caches.

- **v9.0.50 (2026-08-29):** Remove Sound Effect on Auto-Sort & Architecture Analysis
  - *Remove Auto-Sort Sound Effect:* Removed the `playSound('click')` invocation from the Agenda Auto-Sort button, preventing auditory confusion with the distraction notification sound.
  - *Performance & Horizon Integration Analysis:* Documented current computing mechanisms and roadmap for memory caching and memoized index trees to keep Agenda and Expedition Horizon synchronizations lightweight.

- **v9.0.49 (2026-08-29):** Relocate Ratio Badge & Auto-Sort to Banner, Clean Ratio Badge UI
  - *Banner Relocation:* Moved the `Completed` ratio badge pill and the `Auto Sort` button from inside the card up into the top page banner header (alongside the Agenda title and date navigation picker), eliminating unnecessary in-card clutter.
  - *Clean Ratio Badge:* Removed the trailing `(... left)` / `(... pending)` suffix from completion ratio badges across `TodayView` and `StartOfDayModal`, presenting a clean and concise `X / Y Completed` counter.

- **v9.0.48 (2026-08-29):** Agenda Auto-Sort Engine & Completed vs Uncompleted Ratio Badges
  - *Priority-Based Auto-Sort:* Added an Auto-Sort button (`<ArrowUpDown />`) across `TodayView` and `StartOfDayModal` with default sorting priority: `Overdue DDL (Due Today & Overdue, most overdue first) → Left DDL (Unexpired DDLs, ascending by remaining days) → Yesterday (Unfinished tasks from yesterday) → General (Regular expedition & manual tasks)`, with uncompleted tasks prioritized above completed tasks.
  - *Completed vs Pending Ratio Badges:* Integrated clean, theme-aware completion ratio pills (`X / Y Completed (Z pending/left)`) with emerald contrast highlights across both the Today Agenda dashboard toolbar and Start of Day Modal header.

- **v9.0.47 (2026-08-29):** Clean Task Titles & Dynamic DDL Tag Color with Days-Remaining Counter
  - *Strip [Tier X] Prefix from Agenda Titles:* Added global title sanitization across `TodayView` and `StartOfDayModal` (both in rendering and importing/adding logic) to strip all leading `[Tier X]` prefixes, ensuring titles are pure and clean.
  - *Red Deadline Tag & Indicator:* DDL tasks that are due today (`Due today`), overdue (`Xd overdue`), or imported from DDL sources now display a prominent Red tag (`text-rose-400` / `text-rose-600`) and matching progress bar indicator.
  - *Orange Unexpired DDL Tag with Countdown:* Agenda tasks linked to expeditions with an active, unexpired deadline (> 0 days remaining) now render with an Orange/Amber tag (`text-amber-400` / `text-amber-600`, `<CalendarClock />`) and display a clear days-remaining counter (`· Xd left`) alongside an amber progress bar indicator.

- **v9.0.46 (2026-08-29):** Clean "Expedition" Label & Differentiated DDL / Yesterday Source Tags
  - *Clean "Expedition" Labeling:* Renamed all instances of "Expedition Tier" to "Expedition" in both `TodayView` and `StartOfDayModal`, maintaining a clean and concise UI standard.
  - *Special DDL & Yesterday Tags:* Added source tracking (`source: 'yesterday' | 'ddl' | 'expedition' | 'manual'`) and dedicated visual tags with distinct theme-aware color schemes:
    - **Yesterday (昨日未完成):** Rendered with a `<RotateCcw />` icon in cool sky blue (`text-sky-400` / `text-sky-600`) and matching progress bar indicator.
    - **Deadline (DDL):** Rendered with a `<CalendarClock />` icon in warm amber (`text-amber-400` / `text-amber-600`) and matching progress bar indicator.
    - **Expedition:** Rendered with a `<Layers />` icon in theme-indigo (`text-indigo-400` / `text-indigo-600`).
  - *Universal Manual & Dungeon Support:* Tag badges and progress indicators seamlessly adapt to both manual tasks imported from yesterday and multi-tier expedition tasks.

- **v9.0.45 (2026-08-29):** Fix Post-Drag Lingering Shadow, 0.3s Drag Activation & Toggleable Agenda Focus
  - *Fix Post-Drag Lingering Shadow Bug:* Removed inline `whileDrag` box-shadow styling from Framer Motion that was causing persistent heavy drop-shadow artifacts after dragging completed; migrated drag feedback entirely to React-controlled CSS classes with immediate cleanup on drag release.
  - *Fast 0.3s Drag Threshold:* Optimized the long-press drag activation threshold from 0.8s down to 0.3s (300ms) for an ultra-responsive, swift reordering experience.
  - *Toggleable Focus Selection:* Clicking on an already-focused expedition task in Today's Agenda (in both `TodayView` and `StartOfDayModal`) now smoothly cancels the current focus selection (`currentDungeonId: undefined`), allowing users to toggle focus on and off with a single click.

- **v9.0.44 (2026-08-29):** Fix Agenda Drag Width Overflow, Adjust Hold Duration to 0.8s & Clean UI
  - *Fix Drag Width Overflow Bug:* Removed Framer Motion `scale` transform distortion on drag, enforced `as="div"` on `Reorder.Group` / `Reorder.Item` containers with strict `w-full` layout constraints, completely fixing the bug where items widened past container boundaries after dragging.
  - *Fast 0.8s Drag Activation:* Reduced the long-press threshold from 2.0s to 0.8s (800ms) for snappy, natural drag initiation while preserving regular click/tap selection behavior.
  - *Minimalist Hold Feedback:* Removed the bottom hold progress bar for a cleaner, distraction-free visual experience.

- **v9.0.43 (2026-08-29):** Long-Press (2s) Drag-and-Drop Agenda Reordering
  - *Handle-Free Drag Reordering:* Implemented direct 2-second long-press drag-and-drop reordering for Today's Agenda in both `TodayView` and `StartOfDayModal` without cluttered drag handle icons.
  - *Fluid Visual Feedback & Vibration:* Integrated a subtle 2-second linear progress bar indicator at the bottom edge during hold, with haptic vibration feedback upon drag activation and smooth floating lift animations (`whileDrag`).
  - *Action Isolation:* Wrapped inner interactive buttons (checkbox, focus, delete) with pointer-down stop-propagation to ensure immediate click responsiveness without triggering drag gestures.

- **v9.0.42 (2026-08-29):** Fix Expedition Picker Auto-Dismissal, Clean DDL Task Naming & Light Theme Inversion Colors
  - *Outside Click/Tap Auto-Dismissal:* Added touch and mouse event listeners (`mousedown`, `touchstart`) on `document` in both `TodayView` and `StartOfDayModal`, ensuring clicking or tapping anywhere outside the Expedition picker popover closes it smoothly.
  - *Clean DDL Task Naming:* Resolved the task naming bug where `[Tier 1]` / `[Tier X]` was being prepended to task titles when importing expeditions with deadlines, keeping the task titles clean and matching pure expedition names (`d.name`).
  - *Theme Inversion Color Compliance:* Replaced inappropriate hardcoded `bg-slate-100` classes with theme-aware `slate-800` / `slate-900` system tokens, eliminating the solid black rectangular button artifacts on Daylight, Warm Sun, and Candy light themes.

- **v9.0.41 (2026-08-29):** One-Click Import for Yesterday's Uncompleted Tasks & Active Deadline Expeditions
  - *Smart Import Engine:* Implemented intelligent deduction and import calculation in both `TodayView` and `StartOfDayModal`, capturing ① all uncompleted manual and expedition-linked tasks from yesterday's settlement date, and ② all active expeditions that have an approaching/active deadline (DDL) set (directly or inherited from parent Major Dungeons).
  - *Deduplication & Depth Preservation:* Automatically filters out tasks already present in today's agenda or already completed in expedition records, preserving hierarchical Tier depth prefixes (`[Tier X] ...`).
  - *Minimalist Button & Badge Indicator:* Added a dedicated `CalendarClock` icon button beside the agenda input with bottom-right numerical pending count badges, informative tooltips, and theme-aware contrast styling across both Light and Dark themes.

- **v9.0.39 (2026-08-29):** Global Navigation Event Listener for StartOfDayModal
  - *Explore Navigation Fix:* Implemented a global `window.dispatchEvent(new CustomEvent('nav-to-explore'))` mechanism inside `StartOfDayModal` and a corresponding `useEffect` listener in the root `App.tsx` component. This guarantees that clicking "Focus" or "Focusing" buttons inside the full-screen modal accurately switches the application's active tab to the Explore (Timer) interface across all layouts.

- **v9.0.38 (2026-08-28):** Import Bug Fix
  - *Missing Import Fix:* Resolved an issue where `StartOfDayModal` crashed upon render due to a missing `Play` icon import from `lucide-react`, and fixed a missing `MajorDungeon` type import in `DashboardView`.

- **v9.0.37 (2026-08-28):** CSS Variable Inversion Fixes & StartOfDayModal Parity
  - *Automatic CSS Inversion Compliance:* Reverted hardcoded `bg-white` and `bg-slate-100` classes in `TodayView` and `StartOfDayModal` that were unintentionally mapping to pure black (`#0f172a`) in Daylight mode. Now correctly relying on the app's native `index.css` Tailwind CSS variable inversion, ensuring all slate colors properly map to their light/dark equivalents.
  - *StartOfDayModal Action Parity:* Added the missing `Focus` / `Focusing` action buttons directly to the `StartOfDayModal`'s "Today's Agenda" list.
  - *Action Separation:* Ensured both Agenda views (Dashboard and Modal) strictly separate "Clicking the row" (Selects the focus target silently) from "Clicking the Focus button" (Navigates to the timer screen).

- **v9.0.36 (2026-08-28):** Theme-Aware UI Refinements & Click Interaction Optimization
  - *Theme-Aware Focus Colors:* Restyled the `TodayView` selected agenda task rows to explicitly check for `isDarkTheme`. Light themes now correctly render with deep contrast text (`text-indigo-900`) and soft, legible background opacities (`bg-indigo-50`), fixing the unreadable light-blue-on-white text issues.
  - *Click-to-Select vs Click-to-Focus:* Separated interaction layers in `TodayView` and `StartOfDayModal`. Clicking anywhere on a task row now exclusively selects it as the active dungeon (`currentDungeonId`) without forcing a screen navigation. Only clicking the dedicated `Focusing` or `Focus` button will trigger the jump to the Explore/Timer interface.
  - *Emoji Eradication:* Replaced the tomato emoji (`🍅`) in `TodayView` and `StartOfDayModal` progression counts with standard pure-text UI formats `(X/Y)`, maintaining exact consistency with the `ExpeditionTreePicker` counters.

- **v9.0.35 (2026-08-28):** Hierarchical Expedition Picker & Two-Way Agenda-Expedition Focus Linking
  - *Hierarchical Expedition Tree Picker:* Integrated the multi-tier `ExpeditionTreePicker` into both `TodayView` (Agenda) and `StartOfDayModal` (Today's Agenda). Users can browse Major Goals, expandable Tier-1 / Tier-2 parent nodes, and directly pick child dungeons with session progress badges.
  - *Agenda-to-Expedition Focus Linkage:* Clicking an agenda item linked to an expedition sets it as the current active focus dungeon (`state.currentDungeonId`) and immediately navigates to Explore/Timer mode. Active focus agenda items display glowing rings, pulsing status dots, and a dedicated "Focusing" badge.
  - *Automatic Agenda Completion:* Completing an expedition (via timer focus sessions or manual force-complete) automatically marks all associated Agenda todos (`todayTodos` matching `dungeonId`) as `completed: true`.

- **v9.0.34 (2026-08-28):** Viewport-Safe Talent Tooltips with Dynamic Boundary Clamping & PopoverPortal
  - *Full Viewport Clamping & Edge Safety:* Refactored Active Talent tooltips in `ExploreView` from clipped, overflow-vulnerable relative CSS blocks to the portal-rendered `<PopoverPortal>` component with dynamic viewport horizontal boundary clamping (`Math.max(12, Math.min(window.innerWidth - popoverRect.width - 12, left))`) and vertical overflow flipping (top vs bottom placement).
  - *Dynamic Pointer Arrow:* Calculated an adaptive arrow position that smoothly tracks the icon's anchor center even when the bubble body is clamped against the screen edges.
  - *Reliable Hover & Tap Triggering:* Enabled seamless hover preview and click/tap toggles with outside-click dismissal, preventing clipped text and unusable claim buttons on all screen dimensions and mobile viewports.

- **v9.0.33 (2026-08-28):** Enhanced Timer Loop Stepper UI & Contained Stepper Chevrons
  - *Pixel-Perfect Contained Steppers:* Redesigned the `SpinnerInput` up/down stepper chevron buttons into a neatly bounded vertical dock (`absolute right-1 top-1 bottom-1 w-4.5 sm:w-5`) with rounded inner edges and crisp micro-chevrons (`size={11}`, `strokeWidth={2.5}`), completely eliminating button overflowing, misalignment, and clipping across all compact input sizes and theme modes.
  - *Smooth Infinity Cycle Transition:* Fixed the stepping logic for `allowInfinity` when `min={2}`: clicking Up on infinity (`∞`) transitions directly to the minimum value (`2`), and clicking Down from `2` transitions cleanly back to infinity (`∞`) without getting stuck.
  - *Refined Typography & Focus Rings:* Enforced dedicated right padding (`!pr-6`), distinct indigo coloring for infinity, and smooth fade-in transitions.

- **v9.0.32 (2026-08-28):** Refactor Distraction Penalty to Direct Interruption Frequency Badge (`/min`)
  - *Direct Interruption Frequency:* Replaced the negative percentage deduction indicator (`-100% Focus`) in Recent Sessions with a clear and intuitive frequency badge (`0.9/min`, `1.0/min`), directly showing `(Total Distractions / Focus Duration)` in times per minute.
  - *Clean Typography & Sizing:* Formatted the rate with a high-contrast mono number and clean `/min` unit suffix, along with an informative tooltip detailing the total interruptions and focus duration.

- **v9.0.31 (2026-08-28):** Zero-Data Y-Axis Fallback & Configurable Dynamic/Fixed Y-Axis Scale
  - *Always-Visible Zero-Data Y-Axis:* Resolved an issue where Daily and Weekly bar charts would render an empty left Y-axis when no study sessions were logged. The new `computeTimeYAxis` helper provides standard baseline reference ticks (`[0, 30m, 1h]` for Daily, `[0, 1h, 2h]` for Weekly) even on days with 0 minutes recorded.
  - *Y-Axis Scale Mode Setting:* Added a "Y-Axis Scale" configuration toggle (`Dynamic Max` vs `Fixed Max`) in Record Dashboard Layout settings (`ViewSettingsModal`), allowing users to choose between content-adaptive scaling and fixed standard maximums (4h for Daily, 8h for Weekly).
  - *Unified Tick Formatting:* Applied consistent time tick generation across dynamic steps (15m, 30m, 1h, 2h, 3h) and fixed steps with zero axis clipping.

- **v9.0.30 (2026-08-28):** Enable Y-Axis on Weekly Efficiency Trend Chart
  - *Visible Efficiency Y-Axis:* Added an explicit, styled Y-axis to the Weekly Efficiency Trend `<LineChart>` with integer star rating ticks (`[1, 2, 3, 4, 5]`), clean slate typography (`text-slate-500` / `#64748b`), and zero-border minimalism.
  - *Unified Grid Alignment:* Synchronized chart margins and Y-axis width (`width={32}`, `margin={{ top: 12, right: weeklyLayerMode === 'both' ? 12 : 16, left: 0, bottom: 0 }}`) with the Weekly Activity Bar chart above, ensuring pixel-perfect horizontal alignment of gridlines and X-axis labels across both charts.
  - *Refined Trend Line Node Styling:* Updated the line node styling (`stroke: '#ffffff'`, `strokeWidth: 1.5`, `isAnimationActive: false`) for crisp visibility and zero clip-path animation anomalies.

- **v9.0.29 (2026-08-28):** Widen Daily Tooltip Popover & Lightweight Popover Entrance Animation
  - *Unified Card Width:* Widened the Daily activity chart popover tooltip (`CustomDailyTooltip`) from `min-w-[140px]` to `w-[200px] sm:w-[220px]` (matching the Weekly chart and Activity Heatmap popovers).
  - *Spacious Distraction Layout:* Increased internal horizontal spacing (`p-3.5 sm:p-4` and `gap-4`) so "Distracted" and the count / hourly rate `(x.x/h)` now breathe comfortably with no overlapping or cramped wrapping.
  - *Smooth Entrance Animation:* Implemented a hardware-accelerated `.animate-popover-enter` keyframe animation (`160ms cubic-bezier(0.16, 1, 0.3, 1)` with `scale(0.94) translateY(4px)` to `scale(1) translateY(0)`), giving all chart and calendar tooltip bubbles a silky-smooth, fluid appearance without performance lag or layout shifts.

- **v9.0.28 (2026-08-28):** Strict Tooltip Active-State Mutual Exclusion & Popover Isolation
  - *Strict Mutual Exclusion via `activeChart` State:* Added an explicit `activeChart` state (`'daily' | 'weeklyBar' | 'weeklyLine' | 'sleep' | null`) to coordinate all tooltip components. Custom tooltips (`CustomWeeklyTooltip`, `CustomDailyTooltip`, `CustomSleepTooltip`) now verify `activeChart === chartId` before returning popover JSX, rendering `null` if any other chart is active.
  - *Zero Dual-Tooltip Guarantee:* Clicking Weekly Activity Bar immediately restricts active tooltips to `weeklyBar`, forcing Weekly Efficiency Trend to return `null` even if Recharts retains internal active hover states (and vice-versa).
  - *Complete Click-Outside Cleanup:* Resetting `activeChart` to `null` on outside interactions or clicks on empty chart space instantly closes all active popovers.

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
