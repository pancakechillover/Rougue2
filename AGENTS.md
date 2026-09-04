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
- **Current Version:** v9.1.20
- **Last Update Date:** 2026-09-04
- **Last Update Time:** 05:45:00

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
> Detailed task history is archived and maintained in `TaskHistory.md` (retaining at most the 3 most recent entries).

- **v9.1.20 (2026-09-04):** Equal Height Card Grid & Rest-Time Distraction Controls
  - *Equal Column Heights:* Styled `Current Build` with `lg:flex-1 min-h-0` and `justify-between` so the right column cards and the left Timer card share the exact same height and bottom baseline on desktop screens.
  - *Rest Distraction Buttons:* Kept distraction buttons visible during rest periods while disabling click and long-press interactions (`disabled={isResting}`, dimmed opacity, non-clickable cursor, and informative tooltips).

- **v9.1.19 (2026-09-04):** Fullscreen Focus Mode Symmetrical Spacing & Dial Sizing Expansion
  - *Symmetric Top/Bottom Bounds:* Standardized symmetric padding (`py-6 sm:py-8 md:py-10`) so the top dungeon progress bar and the bottom distraction controls maintain the exact same aesthetic distance from the top and bottom viewport edges.
  - *Enlarged Circular Dial:* Expanded the fullscreen circular dial size limits up to `max-h-[min(46vh,500px)]` and `max-w-[540px]`, with countdown digits scaling up to `text-6xl sm:text-7xl md:text-8xl` for an immersive and legible focus experience.
  - *Proportional Controls:* Adjusted controls and exit fullscreen button placement (`top-5 sm:top-7 md:top-9`) for harmonious alignment with the top bar.

- **v9.1.18 (2026-09-04):** Flat Design Purity & Anti-Glow Cleanup
  - *Expedition Horizon Today Cell:* Removed artificial glow halos (`shadow-lg shadow-indigo-500/20`, `ring-1`, and text `drop-shadow`) from the "Today" cell to restore a pure, clean flat design aesthetic.
  - *PiP Minimal Play/Pause Button:* Removed outer glowing halos and round bubble style, replacing it with a clean flat rounded button (`rounded-lg` with subtle flat borders) that matches the surrounding distraction controls.
  - *Progress Bars:* Stripped high-blur glowing box shadows from progress indicators to maintain visual harmony with the minimalist design system.
