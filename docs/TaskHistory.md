# Project Task History

This document records the recent task and release history for the Scholar's Dungeon project.
To keep context lean and focused, this file maintains at most the 3 most recent entries.

---

## Recent Task History (Latest 3)

- **v9.1.12 (2026-09-04):** PiP Ultra-Minimalist Mode Typography & Proportion Enhancement
  - *Prominent Countdown Typography:* Upgraded countdown digit font size from `1.875rem` (30px) to `2.85rem` (~45px) with `-0.04em` tracking to fill available vertical space cleanly and create a high-contrast, modern aesthetic.
  - *Balanced Control Scaling:* Proportioned the distraction buttons (`28px`), task status metadata, and horizontal padding to create balanced visual hierarchy in narrow strip mode.

- **v9.1.11 (2026-09-04):** PiP Rest Distractions & Typography Color Alignment
  - *Rest Distraction Interactivity:* Kept distraction buttons (INT, EXT, UNA) visible and fully active during rest sessions in both standard, condensed, and minimalist modes to eliminate empty space and allow uninterrupted interruption logging.
  - *Unified Countdown Color:* Aligned PiP timer digits to standard high-contrast theme typography (`text-white`, rendering dark slate in Daylight and crisp white in Dark themes) matching the main timer digits, with emerald green strictly reserved for the resting status label and pause controls.

- **v9.1.10 (2026-09-04):** Synchronized Reward State Resolution & PiP Auto-Dismiss
  - *Instant Reward Clear:* Removed artificial modal closing delays on the main timer victory screen, synchronously clearing `activeRewardSession` and `showRewards` upon selecting or deferring cards.
  - *Universal State Propagation:* Connected `selectReward` directly to the centralized timer store to guarantee immediate dismissal of the PiP reward overlay regardless of which screen or component processes the reward.
