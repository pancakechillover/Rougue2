# Project Task History

This document records the recent task and release history for the Scholar's Dungeon project.
To keep context lean and focused, this file maintains at most the 3 most recent entries.

---

## Recent Task History (Latest 3)

- **v9.1.14 (2026-09-04):** PiP Ultra-Minimalist Mode Play/Pause Control Button
  - *Dedicated Minimal Controls:* Added a centered, responsive Play/Pause toggle button in the ultra-minimalist strip mode between the countdown digits and distraction buttons.
  - *Theme & Status Feedback:* Integrated active/resting state styling, glowing borders, and tactile touch feedback while adapting sizing smoothly across standard strip and ultra-low height windows.

- **v9.1.13 (2026-09-04):** End of Day Auto-Calculate Efficiency on Modal Open
  - *Dynamic Auto-Calculation:* Resolved the issue where existing daily logs prevented fresh efficiency calculations on modal open. When `autoCalculateOnOpen` is enabled (default), opening the End of the Day modal automatically calculates the up-to-date efficiency and star rating based on current cumulative focus duration and distraction records.
  - *State Synchronization:* Preserved saved ratings when `autoCalculateOnOpen` is explicitly toggled off while ensuring real-time calculation and animation accuracy when toggled on.

- **v9.1.12 (2026-09-04):** PiP Ultra-Minimalist Mode Typography & Proportion Enhancement
  - *Prominent Countdown Typography:* Upgraded countdown digit font size from `1.875rem` (30px) to `2.85rem` (~45px) with `-0.04em` tracking to fill available vertical space cleanly and create a high-contrast, modern aesthetic.
  - *Balanced Control Scaling:* Proportioned the distraction buttons (`28px`), task status metadata, and horizontal padding to create balanced visual hierarchy in narrow strip mode.
