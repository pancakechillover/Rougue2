# Project Task History

This document records the recent task and release history for the Scholar's Dungeon project.
To keep context lean and focused, this file maintains at most the 3 most recent entries.

---

## Recent Task History (Latest 3)

- **v9.1.10 (2026-09-04):** Synchronized Reward State Resolution & PiP Auto-Dismiss
  - *Instant Reward Clear:* Removed artificial modal closing delays on the main timer victory screen, synchronously clearing `activeRewardSession` and `showRewards` upon selecting or deferring cards.
  - *Universal State Propagation:* Connected `selectReward` directly to the centralized timer store to guarantee immediate dismissal of the PiP reward overlay regardless of which screen or component processes the reward.

- **v9.1.9 (2026-09-04):** PiP Ultra-Minimalist Strip Mode Compact Refinement
  - *Sleeker Horizontal Layout:* Compacted the PiP strip mode (height <= 165px) with reduced container padding (`px-1.5 py-1`), optimized countdown typography (`1.875rem`), and streamlined spacing.
  - *Mini Distraction Controls:* Scaled down distraction buttons to `22px` with compact icons, tighter gap, and reduced container padding, allowing the window to fit comfortably into very narrow widths without excessive whitespace.

- **v9.1.8 (2026-09-04):** Rest Session Palette Alignment in PiP Window
  - *Rest Digits Color Calibration:* Replaced bright neon green (`emerald-400`) on the PiP countdown digits and rest mode indicators with the standard `text-emerald-500` matching the main timer rest ring.
