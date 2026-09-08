# Task History Archive

- **v9.3.2 (2026-09-08):** Fix Missing Distraction Counts in Newly Created Focus Sessions
  - *Live Distraction Store Retrieval in Timer:* Fixed an issue in `Timer.tsx` where `handleComplete` closed over stale initial `distractions` state (`0, 0, 0`), discarding user distraction clicks upon timer completion or skip. Now reads fresh live distraction counts directly from `useTimerStore.getState().distractions` and safely resets the store only after completion payload dispatch.
  - *Defensive Distraction Normalization across Session Creation:* Added strict distraction object normalization (`{ internal, external, unavoidable }`) across `completeSession` and `bulkCreateSessions` in `useGameState.ts`, `RoutineCellEditor.tsx`, and `EditSessionModal.tsx`, guaranteeing that all newly generated or updated sessions maintain a non-null, structured distraction record.

- **v9.3.1 (2026-09-08):** Fix Distraction Statistics Aggregation & Weekly Avg Distracted Rate Calculation
  - *Distraction Object Parsing in Utils:* Fixed `getSessionDistractionCount` in `src/lib/utils.ts` which omitted object distraction schemas `{ internal, external, unavoidable }`, causing heatmap statistics and utility aggregators to miss distraction counts and return 0.
  - *Weekly Hourly Rate & Overview Cards Fix:* Fixed an arithmetic mismatch in `StatsWeeklySection.tsx` and `StatsOverviewCards.tsx` where 7-day total distractions were divided by 1 day's average focus time (artificially multiplying the hourly distraction rate by 7). Now accurately computes `distractionsPerHour` against total focus minutes (`totalDistractions / (totalFocusMinutes / 60)`), and enhanced the card tooltip to display full weekly totals and daily averages.
  - *Consistent Weekly Rolling Period Filtering:* Fixed `getGainsForPeriod` in `Stats.tsx` to filter on `s.assignedDate` using full day intervals (`startOfDay` to `endOfDay`), ensuring 100% data synchronization with `weeklyData` across both Natural and Last 7d rolling modes.

- **v9.3.0 (2026-09-08):** Fix Duplicate Session Completion Bug on PiP/Fullscreen Transitions & State Guard
  - *Prevent Concurrent Dual-Instance Timer Mounting:* Fixed an issue in `ExploreView.tsx` where `renderTimerContent()` was simultaneously rendered in both the fullscreen portal and the standard page view layout when `isFullscreenExplore` was active, causing two distinct `Timer` component instances to run worker timers and fire duplicate completions. Conditioned the standard view container with `{!isFullscreenExplore && renderTimerContent()}`.
  - *State Manager Completion Deduplication Guard:* Added an idempotent sub-second cooldown guard (`2000ms`) inside `completeSession` in `useGameState.ts` to intercept and safely drop identical concurrent completion calls.
  - *Official Release Rollout:* Aggregated changelog and updated `RELEASE_HISTORY` and `public/version.json` for major release `v9.3.0`.

- **v9.2.14 (2026-09-08):** Fix Phantom Rest Duration Bug When Timer Rest Mode is Disabled
  - *Rest Mode State Check on Focus Completion:* Fixed an issue in `Timer.tsx` where completed sessions were unconditionally passed the preset's configured `restDuration` value regardless of `enableRest` toggle state. Now strictly calculates `actualRestDuration = (enableRest && restDuration > 0) ? restDuration : 0`.
  - *Defensive Progress & Session State Clamping:* Hardened `completeSession` and `getAddedProgress` in `useGameState.ts` to strictly handle `restDuration === 0` as 0 instead of falling back to `standardRestMinutes`, and updated `RecentSessions.tsx` to safely fallback on legacy session `duration`.

- **v9.2.13 (2026-09-07):** Efficiency Rating Formula Metric Bounds (Cap) Toggle & Uncapped Calculation Engine
  - *Metric Bounds Clamping Toggle (`capMetrics`):* Added a dedicated toggle switch in `EfficiencyDetailsModal` allowing users to configure whether Completion Rate and Focus Degree should be clamped to [0%, 100%] bounds or remain uncapped.
  - *Uncapped Arithmetic Behavior:* When uncapped, Completion Rate does not clamp to `min(..., 1.0)` (can exceed 100%), and Focus Degree does not clamp to `max(0, ...)` (can drop into negative values), reflecting actual focus overtime and distraction penalties authentically.
  - *Synchronized Across Calculation Points:* Fully synchronized uncapped math across `calculateEfficiencyValue` in `efficiencyUtils.ts`, `EfficiencyDetailsModal.tsx`, `DailyRecordCard.tsx`, `DailySummaryModal.tsx`, `JournalView.tsx`, and the batch `RecalculateHistoryModal.tsx`.

- **v9.2.12 (2026-09-07):** Efficiency Rating Formula Weight Formulas & Batch History Recalculation Modal
  - *Dynamic Weight Formula Annotations:* Added live annotations next to "Completion Rate Weight" (`+X% × W% = +Y% / hr`) and "Focus Degree Weight" (`-X% × W% = -Y% / dist`), explicitly demonstrating the exact efficiency gain per 1 hour of focus and penalty deduction per distraction.
  - *Apply & Recalculate History Modal (`RecalculateHistoryModal.tsx`):* Added "Apply & Recalculate All..." button in `EfficiencyDetailsModal`, allowing users to batch re-compute past daily ratings across configurable timeframes (All Recorded Time, Past 7/30/90 Days, This Month, Custom Range) with irreversible action warnings, progress spinners, sound effects, and instant state synchronization.
  - *Cross-Modal State Integration:* Connected batch recalculation across `DailyRecordCard.tsx`, `DailySummaryModal.tsx`, and `JournalView.tsx`.

- **v9.2.11 (2026-09-07):** Workstation Timeout Modal Theme Adaptation, Content Streamlining & Date Display
  - *Full Theme Adaptation:* Refactored `WorkstationTimeoutModal` to strictly use the application's theme-aware design tokens (`bg-slate-900`, `border-slate-800`, `text-indigo-400`, `bg-indigo-500/10`, `bg-indigo-600`), ensuring seamless contrast and unified aesthetics across all 6 themes (Night, Forest, Ocean, Daylight, Warm, Candy).
  - *Content Streamlining:* Removed verbose subtitles and redundant paragraphs, creating a clean, high-efficiency single-sentence prompt (`Auto-saved to workstation logs. Continue timing now?`).
  - *Date in Time Recorded:* Updated the recorded time display to explicitly include the date (e.g., `Sep 7, 21:25 – 01:25 (4h)` or multi-day format if crossing midnight).

- **v9.2.10 (2026-09-07):** Workstation Active Session 4-Hour Limit & Auto-Stop Prompt Modal
  - *4-Hour Continuous Limit:* Implemented continuous session monitoring across the entire application; whenever an active workstation check-in reaches 4 hours (240 minutes), the timer automatically stops and saves the completed 4-hour interval to the daily workstation logs and syncs with cloud storage.
  - *Interactive Timeout Prompt Modal (`WorkstationTimeoutModal`):* Created a dedicated popup dialog displaying recorded session details (location with icon, time range, note, and 4h duration), asking the user if they wish to start a new timing session or finish.
  - *Defensive Clamping Across Views:* Added strict 240-minute duration clamping to `workstationUtils.ts`, `WorkstationHeaderControls.tsx`, `WorkstationModal.tsx`, and `WorkstationView.tsx` to ensure total minutes and active session timers never exceed the maximum single-session threshold.

- **v9.2.9 (2026-09-07):** Weekly Distraction Hourly Rate Metric & Efficiency Trend Interaction Fix
  - *Distraction Rate Metric (/h):* Updated the distraction line charts in the Weekly view (`StatsWeeklySection.tsx` & `Stats.tsx`) to measure distraction intensity by hourly rate (`distractions / (focusHours)` as `count/h`) rather than raw counts; updated Y-axis tick formatting to `${val}/h` with flexible decimal support and appropriate right padding.
  - *Efficiency Trend Bubble Interaction:* Fixed unclickable bubble points on the Weekly Efficiency Trend chart by decoupling the LineChart key from the ComposedChart key with `lineChartKey`, stabilizing tooltips against unmount cycles, and mapping direct data property keys for precise Recharts hit detection.

- **v9.2.8 (2026-09-07):** Modernized Edit Session Architecture & Full-Featured Bulk Session Operations Hub
  - *Unified Edit Session Modal:* Transferred Study Note authoring/editing directly into the dedicated `EditSessionModal` with live hashtag insertion pills; added editable distraction breakdown counters (`Internal`, `External`, `Unavoidable`); eliminated manual Total Duration input by auto-calculating `Total = Focus + Rest`.
  - *Full-Featured Bulk Session Operations Hub:* Completely modernized `BulkSessionModal.tsx` into a 3-tab hub:
    - `Batch Actions`: Interactive session search and dungeon/time filters, multi-select toolbar, batch dungeon re-assignment, bulk tag append, batch timestamp shift (+/- hours), distraction reset, batch deletion, and JSON data export.
    - `Generator`: Presets (Pomodoro, Deep Work, Ultradian, Custom), date/time boundaries, auto or fixed session counts, and live timeline preview.
    - `Range Purge`: Visual date/time range purge with matching session counter and destructive confirmation.
  - *Cleaned Recent Sessions Table:* Replaced cluttered inline accordion rows with direct modal triggers and added elegant note previews in the objective column.

- **v9.2.7 (2026-09-07):** Recent Sessions Elimination of Scrollbar Flash on Row Deletion
  - *Table Row Exit Animation Optimization:* Removed disruptive `mode="popLayout"` from `<AnimatePresence>` in `RecentSessions.tsx` and switched to `layout="position"` with a fast, smooth fade-out (`duration: 0.15s`), preventing deleted `<tr>` elements from turning into absolute-positioned out-of-flow blocks that momentarily expand container height.
  - *Confirm Modal Non-Intrusive Scroll State:* Removed `document.body.style.overflow = 'hidden'` toggling from `ConfirmModal.tsx`, keeping page body overflow completely stable during dialog confirmation without triggering scrollbar show/hide layout shifts.
  - *Cross-Browser Scrollbar Rule Hardening:* Added standard `scrollbar-width: none` and `-ms-overflow-style: none` to `html, body, #root` in `src/index.css` to prevent brief browser-native scrollbar flashes on modern browsers.

- **v9.2.6 (2026-09-07):** PiP Window Victory Rewards Dynamic Expansion & Ultra-Compact Summary Adaptation
  - *Dynamic Height Adaptive Reward Cards:* Replaced hardcoded `max-h-[145px]` constraint with `flex-1 min-h-0` in `CompactTimer.tsx`, allowing the 3 reward cards to expand fully and naturally without clipping or scrollbars whenever the PiP window has sufficient vertical space.
  - *Ultra-Compact Skip/Auto-Reward Summary:* Implemented responsive 3-tier layout architecture (`pip-overlay-standard`, `pip-overlay-condensed`, `pip-overlay-minimal`) for `showTransientSummary`, ensuring that auto-skipped or auto-selected victory summaries fit cleanly into a streamlined horizontal bar in ultra-narrow and low-height PiP modes without any text clipping.
  - *Responsive Overflow Guard:* Maintained clean scrolling fallback for compact window heights while pinning bottom chest actions (`Save to Chest`).

- **v9.2.5 (2026-09-07):** Custom Chart Layer Multi-Select Popover & Granular Distraction Filter Engine
  - *Custom Multi-Select Popover:* Replaced default HTML `<select>` dropdowns with a dedicated, custom-styled animated popover (`ChartLayerFilterDropdown.tsx`) featuring layer checkboxes, contextual category icons, instant preset buttons (`Both`, `Time`, `Total`, `All`), and automatic click-outside detection.
  - *Unified Trigger Button Styling:* Restyled the layer filter trigger button to match the minimalist mode button (`NATURAL`), removing extra borders and SVG icons for a unified capsule aesthetic.
  - *Portal Floating & Anti-Jitter Architecture:* Portaled the popover to `document.body` with fixed coordinate calculation, eliminating horizontal jumping/jitter when button label width changes during checkbox toggles.
  - *Viewport Boundary Clamping:* Added strict screen boundary clamping (`left >= 12px` and right boundary protection) so the popover is never clipped by sidebars or screen edges.
  - *Multi-Layer Granular Filtering:* Enabled granular multi-select of Focus Time bar charts, Aggregate Total Distraction trend lines, and individual breakdown lines (`Internal`, `External`, `Unavoidable`) for both Daily and Weekly charts.
  - *Persistent Layer State:* Upgraded state management in `Stats.tsx` with full `localStorage` serialization and backward compatibility with previous layer configurations.

- **v9.2.4 (2026-09-07):** Daily Sessions Distraction Integration & Recent Sessions Divider Harmonization
  - *Daily Sessions Distraction Badges:* Integrated real-time distraction metrics into `DailySessionsModal.tsx` under the Duration column with rate per minute calculation (`/min`) and categorical icons (`Brain` internal, `Wind` external, `Zap` unavoidable), fully aligning with Recent Sessions.
  - *Recent Sessions Divider Alignment:* Harmonized the time-period section divider lines in `RecentSessions.tsx` to match `DailySessionsModal.tsx` with left-aligned period capsule badges, period-specific icons (`Sunrise`, `Sun`, `Moon`, `Star`), and smooth gradient divider rules.

- **v9.2.3 (2026-09-06):** Complete Viewport Clamping & Anti-Overflow Architecture for Record Tooltips
  - *Dynamic Viewport Clamping:* Replaced fragile `style.transform` overrides (which were suppressed by CSS keyframes) with dynamic, animation-safe `marginLeft`/`marginTop` positioning and layout effect observers across `StatsWeeklySection`, `StatsDailySection`, `SharedPopoverContent`, and `StatsSleepTrackerSection`.
  - *Responsive Boundaries & Overflow Guards:* Added `max-w-[calc(100vw-24px)]` and real-time bounding box measurement on every render, scroll, and resize event, completely eliminating tooltip overflow on all screen sizes.

- **v9.2.2 (2026-09-06):** Daily Record Efficiency Display & Edit Controls Refinement
  - *Single Efficiency Metric Indicator:* Streamlined `DailyRecordCard.tsx` so only one rating indicator (either Star Rating or Percentage badge) is displayed at a time according to the user's display preference.
  - *Edit-Only Calculation & Formula Controls:* Confined the Auto-Calculate and Formula Details buttons to edit mode only, keeping the view/read-only mode completely clean and minimal.

- **v9.2.1 (2026-09-06):** Daily Record Card Modernization (Instant Markdown & Efficiency Upgrades)
  - *Instant Markdown Editor:* Removed legacy split-pane Markdown preview and MD toggle button in `DailyRecordCard.tsx`, replacing it with unified WYSIWYG `MarkdownEditor` and fullscreen immersive modal.
  - *Efficiency Auto-Calculation & Details:* Integrated auto-calculation trigger button with magical chime sound, formula detail inspector modal (`EfficiencyDetailsModal`), and flexible Star vs. Percentage display toggle matching user configuration preferences.

- **v9.2.20 (2026-09-06):** Quest & Achievement Progress Integer Display Formatting
  - *Integer Progress Display:* Formatted quest and achievement progress fraction displays in `QuestManager.tsx` and `sageService.ts` using `Math.floor(quest.progress + 0.0001)` to eliminate floating-point precision artifacts (e.g. `66.20000000000002/10` -> `66/10`), ensuring clean, integer-based task count progress.

- **v9.2.19 (2026-09-06):** Unified Subtitle Time Range Format Across Workstation, Journal & Agenda
  - *Unified Time Window Format:* Updated both `WorkstationView.tsx` and `JournalView.tsx` header subtitles to format the daily settlement window as `format(viewStartTime, 'MMM do, HH:mm') - format(viewEndTime, 'MMM do, HH:mm')` (e.g., `Sep 6th, 00:00 - Sep 7th, 00:00`), bringing 100% visual and functional consistency with Agenda (`TodayView.tsx`).

- **v9.2.18 (2026-09-06):** Sleep Tracker UI Clean-up & TimePicker Precision Wheel Scrolling
  - *Redundant Icons Removal:* Removed the redundant Moon and Sun icons from the "Fell Asleep" and "Woke Up" input cards in `StartOfDayModal.tsx`, providing a cleaner layout and aligned typography.
  - *TimePicker Precision Wheel Interaction:* Upgraded `TimePicker.tsx` with dedicated mouse wheel delta handling, precise single-step stepping, and exact 3-row (36px x 3 = 108px) viewport alignment, eliminating overshooting and imprecise box landing.

- **v9.2.17 (2026-09-06):** Daylight & Light Themes Header Button Contrast Optimization
  - *Theme-Adaptive Backgrounds:* Replaced the overly dark `bg-slate-800/90 border-slate-700/80` in `WorkstationHeaderControls.tsx` (`Check In` and `Desk Log` buttons) with clean, theme-aware `bg-slate-900/90 border-slate-800`.
  - *Clean Light Mode Aesthetic:* Ensures buttons render as crisp, subtle off-white capsules in Daylight/Light themes without dark grey dullness while maintaining dark theme legibility.

- **v9.2.16 (2026-09-06):** Balanced Location Icon Picker Grid & Orphan Icon Fix
  - *Symmetrical Grid Layout:* Replaced `flex-wrap` in `LocationIconPicker` with a structured `grid grid-cols-6 sm:grid-cols-12 gap-1.5` layout (`LocationIcon.tsx`).
  - *12-Icon Balanced Palette:* Added the `Atom` (Science / Research) icon option to complete a clean 12-icon set, ensuring exactly 2 symmetrical rows of 6 on compact views and 1 unified row of 12 on wider screens, eliminating orphan icon drop-downs.

- **v9.2.15 (2026-09-06):** Single Hub Card Consolidation & Continuous Timer Location Switch
  - *Unified Hub Card Architecture:* Removed the 4 fragmented metric cards and integrated a streamlined Efficiency Vitals Pill (`Presence`, `Focus`, `Conversion Rate`) directly into the header of the primary Workstation card (`WorkstationView.tsx`).
  - *Continuous Timer Location Switch:* Updated `handleLocationClick` so switching active locations directly updates the active session's location tag without zeroing out or resetting the running timer.
  - *Clean Layout & Zero Nesting:* Drastically simplified the visual hierarchy into a single cohesive, high-efficiency dashboard.

- **v9.2.14 (2026-09-06):** Global Theme Palette Restoration & Pure Theme Reset
  - *Theme Color Reversion:* Removed erroneous `--color-indigo-*` variables from `[data-theme="daylight"]` in `src/index.css`, immediately restoring the original vibrant color scheme, button styling, and theme palettes across the entire application.
  - *Visual Consistency Check:* Verified that theme-aware variables correctly resolve in all 6 light and dark themes without inverted color artifacts.

- **v9.2.13 (2026-09-06):** Merged Quick Check-In & Location Time Distribution + Redundant UI Cleanup
  - *Location Controls Consolidation:* Merged the top Quick Check In buttons and Location Time Distribution chips into a unified interactive location list (`WorkstationView.tsx`). Locations now display cumulative time, percentage, and active status while allowing instant one-click check-in and location switching.
  - *Redundant Top Check Out Button Removal:* Removed the duplicate Check Out button in the card header (keeping the dedicated Check Out action within the live session row).
  - *Redundant Ongoing Badge Removal:* Cleaned up the extra green `ONGOING` text badge in the active session row to streamline information density.

- **v9.2.12 (2026-09-06):** Complete CSS Text Readability & 6-Theme Contrast Optimization
  - *Workstation View Contrast Overhaul:* Replaced low-contrast text classes (`text-indigo-200`, `text-indigo-300`, washed-out badges) with high-contrast theme-aware typography (`text-slate-100`, `font-black`, `bg-emerald-600 text-white` for ongoing status, and solid theme-aware duration badges).
  - *Modal & Input Field Readability:* Replaced invisible `text-white` on light backgrounds with theme-adaptive `text-slate-100 placeholder-slate-400` across all location manager and time interval inputs.

- **v9.2.11 (2026-09-06):** Unified Workstation Card & Quick Check-In / Location Switching Fix
  - *Unified Card Architecture:* Merged Location Time Distribution, Quick Check In/Out controls, and the Chronological Presence Timeline into a single cohesive, unfragmented card (`WorkstationView.tsx`).
  - *Quick Check-In & Location Switch Fix:* Implemented seamless location switching (`handleLocationClick`), which safely settles the current active interval and starts a new one at the selected location with instant audio and visual feedback.
  - *Integrated Distribution & Live Session Row:* Included a segmented proportional progress bar for location time breakdown and embedded the active live session row directly into the timeline sequence.

- **v9.2.10 (2026-09-06):** Merged Workstation Location Distribution into Timeline Card
  - *Card Consolidation:* Merged the standalone `LOCATION TIME DISTRIBUTION` card directly into the `Presence Timeline` card (`WorkstationView.tsx`).
  - *Integrated Distribution Banner:* Cleanly positioned the location breakdown chips (`Distribution: [ 🏠 Home 4m 100% ]`) under the timeline header with a subtle top border divider, eliminating redundant vertical card nesting.
  - *Theme Harmony:* Maintained high contrast and smooth responsiveness across all 6 light and dark themes.

- **v9.2.9 (2026-09-06):** Abbreviated Month Name Standard Across All Views
  - *Abbreviated Month Formatting:* Standardized all full-name month formatters across date pickers, headers, modals, and charts from `MMMM` (e.g. "September 6th", "Sunday, September 6th, 2026") to abbreviated format `MMM` (e.g. "Sep 6th", "Sunday, Sep 6th, 2026").
  - *Universal Date Switcher Compactness:* Applied concise `MMM do` formatting across Workstation (`WorkstationView.tsx`), Journal (`JournalView.tsx`), Agenda (`TodayView.tsx`), Session Modals (`DailySessionsModal.tsx`), and Calendar Pickers (`DatePicker.tsx`).
  - *Title Italic Clipping Safeguards:* Reinforced italic safe margins and padding across all primary headers (`Workstation`, `Journal`, `Agenda`).

- **v9.2.8 (2026-09-06):** Workstation Persistence, Title Clipping Fix & Universal DatePicker Today Display
  - *Workstation Page Persistence:* Added `localStorage` synchronization for `explore_showWorkstationLogView`, so returning to or refreshing the Explore page remembers if the Workstation view was open and restores it immediately.
  - *Italic Title Text Overflow Fix:* Removed the inner `truncate` overflow-clip on the `Workstation` title span and applied `pr-3` padding to ensure the italic slanted glyph bounding box ('N') is never clipped.
  - *Universal "Today" DatePicker Display:* Harmonized date switchers across Workstation (`WorkstationView.tsx`), Journal (`JournalView.tsx`), Agenda (`TodayView.tsx`), and Stats Daily (`StatsDailySection.tsx`) to show `Today` when the selected date is the current day with a standardized Calendar icon.

- **v9.2.7 (2026-09-06):** Minimalist Header Layout Refinement for Workstation View
  - *Header Modernization:* Redesigned the Workstation page header to `🏢 Workstation`, featuring a clean subtitle showing the full formatted date, matched with a right-aligned date switcher (`[ < Today / Date > ]`) and back button (`[ ← ]`), strictly mirroring the Journal & Agenda page structure.
  - *Toolbar De-cluttering:* Moved `+ Add Record` into the Presence Timeline header next to the Quick Check In controls, giving the top of the page a balanced, high-contrast, uncluttered layout.

- **v9.2.6 (2026-09-06):** Custom Location Icon Library & In-place Icon Editing
  - *Location Icon Library:* Built `LocationIcon.tsx` with a curated set of 12 preset icons (`Home`, `Lab/Office`, `Library`, `Cafe`, `Laptop`, `Compass/Outdoors`, `Building`, `Graduation`, `Briefcase`, `Armchair`, `Atom`, `Coffee`) with automatic fallback mapping.
  - *Custom Icon Picker & Management:* Integrated `LocationIconPicker` into the Check-In Location Manager modal in `WorkstationView.tsx`, allowing users to select or switch icons when creating new locations or editing existing locations.
  - *Full Modal & Header Icon Sync:* Synchronized custom icon resolution across `WorkstationHeaderControls.tsx`, `WorkstationModal.tsx`, and `WorkstationView.tsx`.
  - *Portal Rendering:* Wrapped modals with `createPortal(..., document.body)` adhering to the application's full-screen modal standard.

- **v9.2.5 (2026-09-06):** Dynamic Location-Aware Workstation Punch Icon
  - *Dynamic Check In Icon:* Updated the Explore header Check In button (`WorkstationHeaderControls.tsx`) to dynamically display the icon corresponding to the preferred/selected location (Home 🏠, Lab 🏢, Library 📖, Cafe ☕, etc.).
  - *Active Session Synchronization:* The button icon now seamlessly updates to reflect the specific location during active desk sessions as well as across quick check-in actions and dropdown selections.

- **v9.2.4 (2026-09-06):** High Contrast & Readability Fix for Explore Workstation Button
  - *Readability Optimization:* Replaced the low-contrast faint amber/rose styling on the active workstation punch button in Explore header (`WorkstationHeaderControls.tsx`) with the standard theme-aware high-contrast container (`bg-slate-800/90`, `border-slate-700/80`, `text-slate-100`).
  - *Clean Action Indicator:* Added a vibrant emerald pulsing dot and an explicit high-contrast `Check Out` action text, ensuring clear visibility across both light themes (Daylight, Warm Sun, Candy) and dark themes (Night, Forest, Ocean).

- **v9.2.3 (2026-09-05):** Standard Color System Harmonization for Workstation Log
  - *Color Harmonization:* Replaced all arbitrary rainbow accent colors (green, amber, purple metric texts and custom gradient fills) with the app's established theme-aware palette (`indigo-400`, `indigo-500`, `slate-50`, `slate-400`).
  - *Header & Title Fix:* Resolved title text truncation and aligned action buttons to match the exact aesthetic and spacing of Journal and Agenda views.

- **v9.2.1 (2026-09-05):** Workstation Log Page, Light Theme Optimization & Location CRUD
  - *Full Page Workstation Log:* Created `WorkstationView.tsx` with full date navigation, detailed metrics overview, location distribution, interval editor, and integrated it directly into Explore view.
  - *Dynamic Location Management:* Configured default locations to `Home`, `Lab`, and `Library` while supporting full custom location add, inline rename, delete, and default reset.

- **v9.1.31 (2026-09-05):** Plan Formulation: Workstation Presence & Target Focus Time Upgrade
  - *Formulated Plan.md:* Drafted a comprehensive 4-phase technical roadmap (`Plan.md`) covering data model structures, Explore header dual-button entry points, punch-in/out logic, modal management, fallback handling, and efficiency equation integration.
  - *Configured AGENTS.md Directives:* Added project-level development directives in `AGENTS.md` ensuring strict step-by-step phased execution.
  - *Maintained Version History:* Archived older task history into `TaskHistory.md` and incremented app version to `v9.1.31`.

- **v9.1.30 (2026-09-05):** Fix Missing Date-fns & UI Imports in Stats Dashboard
  - *Fixed ReferenceError:* Re-imported `eachDayOfInterval`, `isSameDay` from `date-fns` in `src/components/record/Stats.tsx`.
  - *Fixed Missing Component Imports:* Added missing `LayoutTemplate` (from `lucide-react`), `MOOD_OPTIONS` (from `constants`), and `RewardHistoryItem` (from `types`) to resolve runtime exceptions and compilation warnings.
  - *Code Validation:* Successfully validated via TypeScript linter and project compiler with 0 errors.

- **v9.1.29 (2026-09-04):** Phase 3 Architecture Refactoring: Fully Modularized Stats Dashboard
  - *Extracted StatsDailySection:* Decoupled the entire Daily stats module into `<StatsDailySection />` (`src/components/record/stats/StatsDailySection.tsx`), integrating the daily bar/line composed chart, custom popover tooltip, daily gains cards, donut chart toggle, and daily reflection editor card.
  - *Extracted StatsWeeklySection:* Decoupled the entire Weekly stats module into `<StatsWeeklySection />` (`src/components/record/stats/StatsWeeklySection.tsx`), integrating the weekly time breakdown/efficiency trend charts, custom responsive tooltips, gains summary cards, and weekly donut pie chart.
  - *Extracted StatsSleepTrackerSection:* Encapsulated the Sleep Tracker module into `<StatsSleepTrackerSection />` (`src/components/record/stats/StatsSleepTrackerSection.tsx`), managing natural/rolling sleep intervals, composed bed/wake/duration charts, and bulk edit triggers.
  - *Extracted SharedPopoverContent:* Centralized the universal popover content renderer for activity heatmap cells into `<SharedPopoverContent />` (`src/components/record/stats/SharedPopoverContent.tsx`).

- **v9.1.28 (2026-09-04):** Phase 2 Architecture Refactoring: Decoupled Stats Module
  - *Extracted StatsOverviewCards:* Decoupled the 4-grid metric summary cards (Gold, EXP, Time, Distractions) into a reusable `<StatsOverviewCards />` component (`src/components/record/stats/StatsOverviewCards.tsx`), supporting both real-time daily metrics and weekly average calculations.
  - *Extracted StatsActivityHeatmap:* Encapsulated the study activity heatmap into a dedicated `<StatsActivityHeatmap />` component (`src/components/record/stats/StatsActivityHeatmap.tsx`), encompassing interval date generations, responsive grid cells, mood overlays, interval summary statistics, and popover triggers.
  - *Drastic Code Reduction:* Removed hundreds of lines of monolithic JSX and redundant memo computations from `src/components/record/Stats.tsx`, greatly improving maintainability and component readability.

- **v9.1.27 (2026-09-04):** Centralized StarRating Component Decoupling
  - *Extracted StarRating Component:* Created a universal `<StarRating />` component (`src/components/common/StarRating.tsx`) supporting interactive half-star clicking/tapping, customizable sizes (`sm`, `md`, `lg`), read-only presentation, zero-clearing, and amber glow effects.
  - *Unified Efficiency Rating:* Replaced hand-rolled 5-star loops, bounding client rect detections, and rating states across `DailySummaryModal`, `JournalView`, and `Stats`.
  - *Word Count Metric Badge:* Added optional word count metrics badge to `ReflectionHeaderControls`.
  - *Eliminated Redundant State:* Removed duplicated `copied` states, file reader loaders, and export blobs across `DailySummaryModal`, `Stats`, and `JournalView`.
  - *Clean Modularity:* Greatly simplified header sections in all reflection editing containers.

- **v9.1.26 (2026-09-04):** Centralized ReflectionHeaderControls Component Decoupling
  - *Unified Reflection Toolbar:* Extracted duplicated reflection control bars into `ReflectionHeaderControls` (`src/components/common/ReflectionHeaderControls.tsx`), integrating template dropdowns, Markdown preview/edit toggling, immersive full-screen trigger, file import/export, and clipboard copying with timed feedback.
  - *Eliminated Redundant State:* Removed duplicated `copied` states, file reader loaders, and export blobs across `DailySummaryModal`, `Stats`, and `JournalView`.
  - *Clean Modularity:* Greatly simplified header sections in all reflection editing containers.
