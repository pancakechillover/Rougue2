# Task History Archive

- **v9.3.37 (2026-09-10):** Markdown Live Editor Multi-Line Paste, Delete Merging & Escape Preview
  - *Multi-Line Content Paste Expansion:* Added clipboard handler to automatically decompose multi-line pasted text into individual rows and position cursor at the tail of pasted block.
  - *Line-End Forward Delete Merging:* Enabled `Delete` key at the end of a line to smoothly merge subsequent rows into the active line.
  - *Escape Quick Preview & Typography Polish:* Enabled `Esc` to instantly blur active line and preview complete rendered markdown; optimized rich rendering of bold (`**`), italic (`*`), and strikethrough (`~~`).

- **v9.3.36 (2026-09-10):** Markdown Sub-List Indentation & Tab Navigation Hierarchy
  - *Full Second-Level Sub-List Support:* Enhanced `Tab` and `Shift + Tab` key handlers to automatically indent and outdent list items (`- `, `1. `, `- [ ] `) by 2 spaces at the beginning of the line regardless of cursor position within the line.
  - *Nested Multi-Level Markdown Live Rendering:* Non-active lines with leading indentations render as proper second-level hierarchical lists (nested hollow circle bullets, sub-alphabet numbers, and indented task checkboxes).
  - *Smart Multi-Level List Continuation & Exit:* Pressing `Enter` on a sub-list item automatically maintains indentation; pressing `Enter` on an empty sub-list item automatically outdents one level before exiting.

- **v9.3.35 (2026-09-10):** Markdown Live Editor Cursor Stabilization & Flow Optimization
  - *Elimination of Cursor Reset Glitch:* Refactored cursor positioning logic from reactive render loops to decoupled line-transition refs (`pendingCursorPosRef`), preventing unwanted reset of cursor position to the start of the line during continuous text input.
  - *Smooth Native Input Flow:* Maintained uninterrupted native browser cursor advancement, full IME input compatibility, and seamless line jumping on Enter, Backspace, and Arrow keys.

- **v9.3.30 (2026-09-10):** Journal Reflection Top Header & Editor Footer Simplification
  - *Strict Minimalist Top Header:* Simplified the journal right-page top header to strictly feature the date-defaulted editable Title input on the left and only the Quick Edit (`Edit3`) and Fullscreen Immersive (`Maximize2`) action buttons on the right.
  - *Removal of Unwanted Metric Footers:* Removed the word count and character count bar (`39 words · 209 characters`) from the bottom-left of the inline editor view, keeping a clean right-aligned Save button.

- **v9.3.29 (2026-09-10):** Streamlined Reflection Header Controls Across Journal, Start of Day, and Daily Summary
  - *Unified Header Layout & Dimension Standard:* Standardized all reflection header controls (`ReflectionHeaderControls.tsx`, `ReflectionTemplatesDropdown.tsx`, `EditorTypographyMenu.tsx`) to an ergonomic `h-7` button height, unified rounded borders (`border-slate-700/70`), and consistent icon sizing.
  - *Journal View Streamlining:* Integrated the journal entry title editor directly into the left side of the right-page header row (with `FileText` icon, inline hover/focus input, and instant clear trigger), completely eliminating the redundant full-width title box row.
  - *Start of Day & Daily Summary Parity:* Replaced multi-button bespoke layouts in `StartOfDayModal.tsx` and `DailySummaryModal.tsx` with the streamlined `ReflectionHeaderControls` bar for consistent single-line headers.

- **v9.3.28 (2026-09-10):** Edit Session Modal Objective Selection Parity with Agenda Expedition Tree Picker
  - *Unified Objective Selection Box:* Replaced the native HTML `<select>` dropdown in `EditSessionModal.tsx` with a custom selector button and interactive `ExpeditionTreePicker`, matching the exact visual style, animations, and interaction patterns of Agenda (`TodayView`).
  - *Completed Dungeon & Free Study Support:* Enhanced `ExpeditionTreePicker` to support selecting `Free Study` as well as browsing and selecting completed dungeons with an `All` / `Active` filter toggle and completed status badges, ensuring historical study sessions can be accurately reassigned.
  - *Outside Click & Keyboard Accessibility:* Integrated touch/mouse outside-click closing listeners and smooth dropdown positioning with highlighted current selections.

- **v9.3.27 (2026-09-10):** Expedition Tree Picker Decimal Stripping & Session Metric Integer Formatting
  - *Expedition Tree Picker Decimal Artifact Removal:* Eliminated raw IEEE-754 floating-point numbers (e.g. `3.8666666666666667/10` and `33.16666666666667/24`) in `ExpeditionTreePicker.tsx` by applying strict `Math.round` integer formatting to both completed and total sessions.
  - *Hierarchy Minutes & Open-Ended Metric Sanitization:* Rounded `completedMinutes` and `totalFocusTime` across `getDungeonHierarchyStats`, `DungeonManager.tsx`, and `DashboardView.tsx` to completely remove fractional minutes in open-ended tier metrics and dashboard session counters.

- **v9.3.26 (2026-09-10):** Dev Server Robustness, EADDRINUSE Auto-Recovery & Top-Level Module Import Optimization
  - *Dev Server EADDRINUSE Auto-Recovery:* Added error listener on Express HTTP `server` to handle `EADDRINUSE` gracefully with automated retry instead of unhandled fatal exception crashes when dev server reboots or previous sockets are closing.
  - *Vite Development Middleware Configuration:* Passed explicit `hmr: process.env.DISABLE_HMR === 'true' ? false : undefined` to `createViteServer` to avoid port collisions on WebSocket ports (24678) in headless preview containers.
  - *Module Imports Refactoring:* Cleaned up dynamic/in-line proxy handlers in `server.ts` to strictly adhere to top-level import standards and ensure clean startup.

- **v9.3.25 (2026-09-09):** Reflection Markdown Editor History Stack & Undo / Redo (Ctrl+Z & Ctrl+Y)
  - *Comprehensive Undo / Redo Engine:* Implemented a full-document history stack (`undoStackRef` & `redoStackRef`) inside `MarkdownEditor.tsx` supporting up to 80 operations, with discrete action snapshotting (line splits, merges, indentation, formatting wrappers, list toggles, heading outline levels, checkbox toggles) and debounced typing burst snapshots (650ms).
  - *Full Keyboard Shortcuts Support:* Handled standard `Ctrl+Z` / `Cmd+Z` for Undo, and both `Ctrl+Y` / `Cmd+Y` and `Ctrl+Shift+Z` / `Cmd+Shift+Z` for Redo across all line textareas as well as editor-level wrapper keydown events.
  - *Toolbar Controls & Interactive Cheatsheet:* Added responsive Undo and Redo icon buttons (`Undo2`, `Redo2`) to the editor toolbar with live enabled/disabled feedback, cursor focus restoration, and documented the new history shortcuts in the shortcuts cheatsheet guide modal.

- **v9.3.24 (2026-09-09):** Immersive Journal Sidebar Left Relocation, Decimal Stripping & Efficiency Preference Sync
  - *Sidebar Left Relocation:* Replaced right-side drawer placement with an ergonomic left-hand entries navigation drawer (`border-r border-slate-800`), pairing with a left-aligned header drawer toggle button (`PanelLeftClose` / `PanelLeftOpen`) directly adjacent to the reflection title.
  - *Integer-Only Metrics (Decimal Stripping):* Eliminated all raw floating-point numbers and decimal artifacts across the sidebar. Both stars and percentage modes now strictly round to clean integers via `Math.round`. Fixed a JSX truthiness bug that previously rendered stray `0` text when rating was zero.
  - *Preference-Aligned Efficiency Display:* Synchronized sidebar entry rating badges with the user's global efficiency preference (`state.efficiencyRatingConfig.ratingDisplayPreference`), seamlessly toggling between integer percentage badges (`%`) and star ratings (`★`).

- **v9.3.23 (2026-09-09):** Markdown Secondary List Indentation (Tab) & Typography Synchronization
  - *Secondary & Multi-Level Lists (Tab Indentation):* Upgraded Tab and Shift+Tab key handling to seamlessly indent and outdent bullet lists, ordered lists, task checklists, and quotes. Rendered nested bullet lists with standard hierarchical styles (Level 1 `list-[circle]` ◦, Level 2+ `list-[square]` ▪) and ordered lists with alphabetic/roman styling, backed by enhanced Backspace outdenting.
  - *Unified Typography (Writing & Rendering Parity):* Replaced textarea `font-mono` with the exact same `font-sans` family (`Inter`), font size, line height, font weight, and letter spacing used in live preview rendering, ensuring a true WYSIWYG writing experience without visual jumps.

- **v9.3.22 (2026-09-09):** Immersive Reflection Sidebar & Journal Title System
  - *Immersive Journal Sidebar:* Added an expandable right-hand entries drawer in full-screen immersive reflection mode to quickly navigate and browse other days' journals, with search by title/date/content, bookmarks filter, and word count preview.
  - *Journal Entry Title Setting:* Added title customization for journal entries defaulting to the date, integrated with quick reset, persistent storage in `DailyLog`, single/batch markdown exports, and unified support across Journal, Daily Record, and Daily Summary modals.

- **v9.3.21 (2026-09-09):** Markdown Writing Experience Upgrade: Outline Shortcuts, Continuous Numbering & Bullet Notes
  - *Outline & Heading Shortcuts:* Implemented `Alt+1`~`Alt+6` (and `Ctrl+1`~`6`) outline shortcuts to quickly set or toggle Headings 1–6, `Alt+0` for standard text, and `Tab` / `Shift+Tab` to demote/promote headings.
  - *Smart Continuous Lists & Auto-Numbering:* Implemented automatic list continuation for bullet points (`- `), ordered numbering (`1. `, `2. ` auto-incrementing), checklists (`- [ ] `), and blockquotes (`> `). Pressing Enter on an empty list item cleanly exits the list.
  - *Indentation & Keyboard Shortcuts:* Added `Tab` / `Shift+Tab` 2-space indentation and outdenting for lists, list shortcuts (`Alt+U` bullets, `Alt+O` numbered, `Alt+C` checklist, `Alt+Q` quotes), formatting shortcuts (`Ctrl+B`, `Ctrl+I`, `Alt+S`, `Alt+E`, `Ctrl+K`), an empty item placeholder in preview mode, and an in-editor shortcuts cheatsheet modal.

- **v9.3.20 (2026-09-09):** Reflection Auto-Save, Ctrl+S Shortcut, Journal Word Count Cleanup, and Double Container Removal
  - *Reflection Auto-Save & Ctrl+S:* Implemented debounced auto-saving while typing (0.8s) and global `Ctrl+S` / `Cmd+S` keyboard shortcut handler to immediately save reflections with success feedback and sound.
  - *Removed Duplicated Word Count:* Cleaned up journal right page footer to omit duplicate word count readings when quick editing is active.
  - *Eliminated Nested Card Containers:* Removed redundant outer card wrapper containers across Journal, Daily Summary, Start of Day, Daily Record Card, and Immersive modals so that `MarkdownEditor` acts as a clean, single-layer card container.

- **v9.3.18 (2026-09-09):** Harmonize Dungeon Colors with Record Interface Palette (Vibrant Amber & Emerald)
  - *Unified Record Color Standards:* Replaced washed-out pale amber and dull greens with the clean, vibrant, high-contrast amber (`text-amber-400`, `bg-amber-500`) and emerald (`text-emerald-400`, `bg-emerald-500`) palette used throughout the Record and Dashboard stats modules.
  - *Polished Progress Bars & Typography:* Upgraded progress bar tier segment colors and text styles for both Major Goals and Sub-Dungeons to match the Record interface aesthetic.

- **v9.3.17 (2026-09-09):** Fix Completed Status Color Synchronization for Major Goals and Sub-Dungeon Text & Borders
  - *Unified Emerald Completion Aesthetics:* Fixed a bug where Major Goal time text remained hardcoded to gold when the progress bar turned emerald green upon completion; now synchronously switches both time readings, separators, and border outlines to radiant emerald green (`text-emerald-400 border-emerald-500/30`).
  - *Completed Status Clarification:* Clarified hierarchy completion evaluation where multi-tier parents require both sub-tier task completion and target time fulfillment to switch from in-progress golden/indigo to complete emerald green.

- **v9.3.16 (2026-09-09):** Compact Distance Between Progress/Time Statistics and Checkbox Action Column
  - *Eliminated Stranded Action Spacing:* Removed forced wide action container wrapper when outside edit mode and tightened time typography column (`w-20 font-mono`), seamlessly bringing the progress/time statistics into comfortable proximity with the status checkbox and chevron controls.
  - *Maintained Unified Vertical Column Baseline:* Preserved exact left and right alignment baselines across Major Goals and nested sub-dungeons.

- **v9.3.15 (2026-09-09):** Perfect Column Grid Alignment Across Major Dungeons & Nested Sub-Tiers
  - *Full-Width Row Architecture & Left-Only Tree Indentation:* Eliminated outer container margin/padding shifts on nested sub-tiers, applying hierarchical indentation purely to the left title area (`paddingLeft`).
  - *Standardized Control Slot Geometry:* Unified right action slots to fixed `w-20 shrink-0` across Major Dungeons and all Sub-Dungeon tiers, ensuring progress bars and time readings align in an unbroken vertical column across the entire manager view.

- **v9.3.14 (2026-09-09):** Standardized Sizing & Uniform Left Alignment for Dungeon Progress Bars & Time Indicators
  - *Unified Left Alignment for Time Statistics:* Replaced right-aligned time text with left-aligned (`justify-start w-28 font-mono`), ensuring focus time readings across Major Dungeons and all nested sub-tiers start at the exact same horizontal position.
  - *Full-Width Tree Container & Progress Bar Sizing:* Standardized progress bar containers to uniform dimensions (`w-16 h-1.5`) and refactored nested sub-tier tree containers to maintain full-width right boundaries, perfectly aligning progress bars, time displays, and action controls across all tier depths.

- **v9.3.13 (2026-09-09):** Tier Depth-Based Multi-Level Color Scale for Stacked Progress Bars
  - *Tier-Graded Color Hierarchy (色阶区分):* Enhanced stacked progress bars to dynamically render segmented time contributions based on tree depth level (Tier 1 uses deepest solid tone, Tier 2 medium tone, Tier 3+ soft light tone).
  - *Unified Multi-Segment Rendering:* Refactored `DungeonManager`, `TodayView`, and `StartOfDayModal` to iterate over `stats.tierSegments` with precision color assignments via `getTierProgressColor`.

- **v9.3.12 (2026-09-09):** Hierarchical Expedition Time Aggregation & Stacked Depth Progress Bars
  - *Recursive Tier Time Aggregation:* Implemented `getDungeonHierarchyStats` to calculate parent tier time and sessions as the recursive sum of direct time plus all sub-tier times across Major Dungeons, sub-tiers, expedition pickers, and agenda views.
  - *Stacked Segmented Progress Bars (堆积进度条):* Converted progress bars to stacked multi-segment indicators where direct/self focus time renders in solid, deeper shades and children/sub-tier accumulated time renders in lighter, soft shades. Removed all `Σ` symbols for a clean, minimalist display.

- **v9.3.11 (2026-09-08):** Overhaul Markdown Editor with True Syntax Editing, Live Preview & Typography Controls
  - *True Markdown Syntax Fidelity:* Replaced TipTap hidden-syntax formatting with a transparent, responsive Markdown editor where raw syntax (`##`, `**`, `-`, `>`) remains fully editable and never stripped.
  - *Interactive View Modes & Smart Lists:* Added Edit, Live Split (Side-by-side), and Rendered Preview view modes with smart Enter list continuation (tasks, bullets, numbered lists), tab indentation, and format shortcut hotkeys.
  - *Customizable Typography & Compact Spacing:* Created `useEditorTypography` and `EditorTypographyMenu` allowing users to freely adjust base font size (12px to 18px) and line spacing (Tight 1.35x to Loose 2.1x) with local persistence and synchronized preview rendering across `JournalView`, `ImmersiveReflectionModal`, and daily summary modals.

- **v9.3.10 (2026-09-08):** Modernize Default Daily Reflection & Journal Templates
  - *Deep Work & Dungeon Alignment:* Refreshed default presets (`Standard Review`, `3-2-1 Summary`, `KISS Retrospective`) with rich headings and actionable placeholders tailored to dungeon quests, distractions tracking, and routine habit consistency.
  - *Seamless Data Migration:* Updated state migration logic in `useGameState.ts` to seamlessly upgrade default system templates for existing users without modifying any custom user-authored templates.

- **v9.3.9 (2026-09-08):** Streamline Reflection Template Dropdown with Bottom Auto-Load Toggle Switch
  - *Clean Minimalist Dropdown UI:* Removed all per-row sparkle buttons, cluttered badges, and jarring top status banners from `ReflectionTemplatesDropdown.tsx`, restoring clean single-click template insertion and tidy delete actions.
  - *Bottom Unified Toggle Switch:* Added a sleek, modern toggle switch ("Auto-load on open") in the bottom action bar for instantaneous enable/disable of blank reflection auto-insertion, retaining clear active checkmarks next to the selected template.


- **v9.3.7 (2026-09-08):** Add Automatic Template Insertion (Auto-Load) for Daily Reflections & Journal
  - *Template Auto-Load Configuration:* Added `autoLoadTemplateId` and `autoLoadTemplateMode` (`empty` | `example`) to global `AppState` and template models, enabling users to designate a favorite template to automatically populate empty daily reflections.
  - *Template Management Dropdown UI:* Enhanced `ReflectionTemplatesDropdown.tsx` with dedicated Auto-load toggle buttons, active status banners, and sparkle indicators for quick toggling between blank framework or example content insertion.
  - *Seamless Cross-Modal Initialization:* Integrated automatic blank reflection injection across `JournalView.tsx` (on date switching and page open), `DailyRecordCard.tsx`, `DailySummaryModal.tsx`, and `StartOfDayModal.tsx` while strictly preserving any existing user writings.

- **v9.3.6 (2026-09-08):** Restore & Enhance PiP Header Progress Bar Fill Color & Track Thickness
  - *Vibrant Filled Progress Bar:* Replaced the flat hairline/border in `CompactTimer.tsx` with a dedicated, theme-adaptive filled progress bar (`bg-indigo-500` / `bg-emerald-500` with subtle glow) across all PiP window sizes.
  - *Detached Window Style Resilience:* Switched from framer-motion DOM bindings to direct CSS width percentage transitions (`transition-all duration-500`), ensuring the progress fill renders instantly and reliably in Document Picture-in-Picture windows.
  - *Optimized Track Height & Padding:* Raised the minimum progress bar height in ultra-compact modes to 3.5px/3px and eliminated border collapse so progress is vividly legible in all themes.

- **v9.3.5 (2026-09-08):** Enhance PiP & Timer Distraction Badge Legibility & Light Font Color
  - *High-Contrast White Typography:* Upgraded distraction count badge typography in `CompactTimer.tsx` (both minimal horizontal pill and standard mode layouts) and `Timer.tsx` to use crisp, solid light text (`text-white font-black`) with high-contrast colored backgrounds (`bg-indigo-600`, `bg-orange-600`, `bg-red-600`).
  - *Rest Mode Color Harmonization:* Improved resting state distraction badge readability with clear `bg-slate-700/60 text-slate-300` styling, ensuring optimal visibility across both light and dark themes.

- **v9.3.4 (2026-09-08):** Fix Routine Manual Check-In State Persistence & Assigned Date Synchronization
  - *Assigned Settlement Date Storage in CompleteSession:* Upgraded `completeSession` in `useGameState.ts` to accept and persist explicit `assignedDateStr` attributes onto new `StudySession` records, ensuring manually added check-in sessions are forever locked to the user's targeted calendar date.
  - *Unified Date Settlement Evaluation:* Enhanced `getSessionSettlementDate` in `src/lib/utils.ts` to prioritize `session.assignedDateStr` and adapt seamlessly to timezones and custom day start thresholds across `RoutineTracker.tsx`, `RoutineCellEditor.tsx`, and `RoutineDetailModal.tsx`.
  - *Manual Check-In Reactivity & Fallback:* Updated `RoutineCellEditor.tsx` to dispatch `completeSession` with explicit `targetDateStr` bounds and instant optimistic `onUpdateState` fallback, guaranteeing immediate checkmark rendering in the tracker table upon adding records.

- **v9.3.3 (2026-09-08):** Comprehensive Routine System Fixes & Hardening
  - *Elimination of Phantom Deleted/Archived Routines:* Fixed deletion cascades in `App.tsx` (`handleDeleteMajor`, `handleDeleteSub`) to immediately scrub orphaned todos and hidden routine entries. Hardened auto-import logic in `TodayView.tsx` and `StartOfDayModal.tsx` to strictly discard deleted, completed, or archived dungeons (and their parents) while accurately supporting routine major goals.
  - *Routine Tracker Manual Check-In & Multi-Tier Resolution:* Overhauled `RoutineTracker.tsx`, `RoutineCellEditor.tsx`, and `RoutineDetailModal.tsx` to use unified `getSettlementDay` date matching and recursive `getDescendantDungeonIds` tree traversal. Fixed cell check-in creation to dispatch clean daytime timestamps and connect directly with `completeSession` / state managers for instant reactivity and persistence.
  - *Archived Routine Filtering & Reset Initialization:* Filtered archived goals and sub-tiers from `RoutineTracker` and auto-initialized missing `lastRoutineReset` timestamps on startup to prevent routine reset lockouts.

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
