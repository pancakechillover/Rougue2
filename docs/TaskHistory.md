# Project Task History

This document records the recent task and release history for the Scholar's Dungeon project.
To keep context lean and focused, this file maintains at most the 3 most recent entries.

---

## Recent Task History (Latest 3)

- **v9.1.6 (2026-09-04):** Domain-Driven Component Architecture Organization
  - *Native Workspace Move:* Safely migrated all 40+ flat `.tsx` components into domain folders (`dashboard`, `journal`, `record`, `expedition`, `talents`, `shop`, `guild`, `vault`, `settings`, `common`, `modals`) via IDE workspace tool calls, ensuring perfect file explorer and ZIP export synchronization.
  - *Zero Root Pollution:* Verified that `/src/components/` root contains strictly domain directories with 0 scattered files.
  - *Clean Import Graph & Builds:* Fully updated relative import graphs across all files, successfully compiling with `tsc --noEmit` and `vite build`.

- **v9.1.5 (2026-09-04):** Project Structure Optimization & Task History Archival
  - *Root Directory Cleanup:* Archived scattered root documentation files (`DEPLOYMENT.md`, `FEATURES.md`, `GUIDEBOOK.md`, `TUTORIAL.md`, `plan.md`) into `/docs/`.
  - *Script Organization:* Moved `generate-vapid.js` to `/scripts/`.
  - *Legacy File Deletion:* Cleaned up unused `/app/` directory, redundant `bun.lock`, and 7 leftover `rewrite_*.mjs` migration scripts in `/src/`.
  - *Task History Modularization:* Extracted monolithic historical task logs from `AGENTS.md` into `TaskHistory.md` capped at the 3 most recent entries, eliminating system prompt truncation.

- **v9.1.4 (2026-09-03):** Fellowship Member Auto-Healing & "Not a member" Resolution
  - *Multi-Factor Member Resolution (`api/teams.ts`):* Implemented `resolveMember` engine supporting fallback resolution across `userId`, `userUniqueId`, and `userName`. Even if client `secretCode` / session identity shifts across devices or clears, existing guild members are seamlessly recognized.
  - *Automatic Self-Healing & Member Migration:* When a member is resolved via their persistent `userUniqueId` or matching `userName`, the system automatically migrates their Redis membership record and active proposal votes to their current session key, completely eliminating 403 "Not a member" errors.
  - *Universal Action Coverage:* Wired `resolveMember` across all guild endpoints (`GET team`, `join`, `message`, `event`, `settings`, `vote`, `handle_applicant`, `leave`, `transfer`, `kick`, `reclaim`).
  - *Client Identity Resiliency:* Updated focus session broadcast and guild member interactions (`TeamModule.tsx`, `useGameState.ts`) to reliably transmit `userUniqueId` and fallback identity codes.
