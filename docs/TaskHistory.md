# Project Task History

This document records the recent task and release history for the Scholar's Dungeon project.
To keep context lean and focused, this file maintains at most the 3 most recent entries.

---

## Recent Task History (Latest 3)

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
