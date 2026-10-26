# Project Task History

This document records the recent task and release history for the Scholar's Dungeon project.
To keep context lean and focused, this file maintains at most the 3 most recent entries.

---

## Recent Task History (Latest 3)

- **v9.4.1 (2026-10-26):** Scholar Passport Modal Bug Fixes, Real-Time Username Duplicate Detection, Post-Registration State Fix, Theme-Aware Error Boundary & Rest-Mode WYSIWYG Study Note
  - *Rest-Mode WYSIWYG Study Note (`useTimerStore.ts`, `Timer.tsx`, `CompactTimer.tsx`, `ExploreView.tsx`, `App.tsx`):* Replaced the 3 disabled Distraction buttons during Rest mode (`isResting === true`) across all 5 timer surfaces (Explore page, Fullscreen, and PiP Standard / Condensed / Ultra-Minimalist Strip modes) with a single-line WYSIWYG Study Note preview/input pill synchronized in real time with the Victory modal's `Study Note`, `state.history`, and `dailyLogs` reflection entries.
  - *Post-Registration Crash Fix (`useAuth.ts`, `App.tsx`, `useGameState.ts`):* Fixed `syncAccountState` and `useAuth`'s `onUpdateState` callback so account registration/login merges `{ account }` into the existing `AppState` rather than overwriting `state` with a partial object (which previously caused `state.activeTalents.includes` to throw `Cannot read properties of undefined (reading 'includes')`). Added automatic recovery from `scholars_dungeon_state__backup_raw` and array guards.
  - *Real-Time Username Duplicate Detection (`/api/auth.ts`, `ScholarPassportModal.tsx`):* Added a rate-limited `GET /api/auth?action=check_username` endpoint (case-insensitive check against `scholar_user_lookup:{username}` with orphan-lookup verification) alongside the atomic `SETNX` registration guard, and wired debounced live availability feedback (`Checking...` / `Available` / `Already Taken` / `Invalid Format`) into the Sign Up form.
  - *Theme-Adaptive Error Boundary (`ErrorBoundary.tsx`, `App.tsx`):* Redesigned the crash fallback screen to automatically detect and apply the active theme (`night`, `forest`, `ocean`, `daylight`, `warm`, `candy`) from `data-theme` or `localStorage`, styled with theme-aware `indigo` and `slate` tokens, ambient glow, and one-click diagnostic log copying.
  - *Scholar Passport Terminology & Verification Code (`ScholarPassportModal.tsx`, `CloudSettingsSection.tsx`, `ProfileModal.tsx`, `/api/auth.ts`, `src/index.css`):* Standardized "Log In" / "Sign Up" labels, replaced `svg-captcha` with a zero-filesystem SVG generator, and hid duplicate native browser password eye icons.

- **v9.4.0 (2026-10-24):** Unified Scholar Account & Cloud-Guild Identity Architecture (Phase 1 – Phase 4)
  - *Backend Authentication & 4-Domain Migrator (`/api/auth.ts` & `server.ts`):* Implemented fail-closed secret verification (`AUTH_TOKEN_SECRET` & `REGISTRATION_SECRET`), dedicated Redis rate limiters, asynchronous `crypto.scrypt` password hashing, rollback-protected `SETNX` username registration, 30-day sliding HMAC-signed sessions, and an idempotent `migrate_legacy` processor across Cloud Save, `scholar_active_users`, Fellowship Guilds, and Web Push queues.
  - *Cloud Save, Fellowship Guild & Push Cutover (`/api/sync.ts`, `/api/teams.ts`, `/api/push.ts`, `useCloudSync.ts`, `TeamModule.tsx`):* Upgraded all backend endpoints and frontend hooks to prioritize `Authorization: Bearer <token>` and `scholar_user:{userId}:save`, using raw `usr_<uuid>` guild member keys and push subscriptions while retaining backward compatibility for legacy `secretCode` users.
  - *Scholar Passport UI (`ScholarPassportModal.tsx`, `CloudSettingsSection.tsx`, `ProfileModal.tsx`, `App.tsx`):* Replaced the legacy developer-password-gated Redis modal with the unified `ScholarPassportModal` supporting Sign In, Registration with invite key, Cloud Archive comparison, and one-click Legacy Secret Code migration.

- **v9.1.20 (2026-09-04):** Equal Height Card Grid & Rest-Time Distraction Controls
  - *Equal Column Heights:* Styled `Current Build` with `lg:flex-1 min-h-0` and `justify-between` so the right column cards and the left Timer card share the exact same height and bottom baseline on desktop screens.
  - *Rest Distraction Buttons:* Kept distraction buttons visible during rest periods while disabling click and long-press interactions (`disabled={isResting}`, dimmed opacity, non-clickable cursor, and informative tooltips).

