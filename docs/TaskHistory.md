# Project Task History

This document records the recent task and release history for the Scholar's Dungeon project.
To keep context lean and focused, this file maintains at most the 3 most recent entries.

---

## Recent Task History (Latest 3)

- **v9.4.0 (2026-10-24):** Unified Scholar Account & Cloud-Guild Identity Architecture (Phase 1 – Phase 4)
  - *Backend Authentication & 4-Domain Migrator (`/api/auth.ts` & `server.ts`):* Implemented fail-closed secret verification (`AUTH_TOKEN_SECRET` & `REGISTRATION_SECRET`), dedicated Redis rate limiters, asynchronous `crypto.scrypt` password hashing, rollback-protected `SETNX` username registration, 30-day sliding HMAC-signed sessions, and an idempotent `migrate_legacy` processor across Cloud Save, `scholar_active_users`, Fellowship Guilds, and Web Push queues.
  - *Cloud Save, Fellowship Guild & Push Cutover (`/api/sync.ts`, `/api/teams.ts`, `/api/push.ts`, `useCloudSync.ts`, `TeamModule.tsx`):* Upgraded all backend endpoints and frontend hooks to prioritize `Authorization: Bearer <token>` and `scholar_user:{userId}:save`, using raw `usr_<uuid>` guild member keys and push subscriptions while retaining backward compatibility for legacy `secretCode` users.
  - *Scholar Passport UI (`ScholarPassportModal.tsx`, `CloudSettingsSection.tsx`, `ProfileModal.tsx`, `App.tsx`):* Replaced the legacy developer-password-gated Redis modal with the unified `ScholarPassportModal` supporting Sign In, Registration with invite key, Cloud Archive comparison, and one-click Legacy Secret Code migration.

- **v9.1.20 (2026-09-04):** Equal Height Card Grid & Rest-Time Distraction Controls
  - *Equal Column Heights:* Styled `Current Build` with `lg:flex-1 min-h-0` and `justify-between` so the right column cards and the left Timer card share the exact same height and bottom baseline on desktop screens.
  - *Rest Distraction Buttons:* Kept distraction buttons visible during rest periods while disabling click and long-press interactions (`disabled={isResting}`, dimmed opacity, non-clickable cursor, and informative tooltips).

- **v9.1.19 (2026-09-04):** Fullscreen Focus Mode Symmetrical Spacing & Dial Sizing Expansion
  - *Symmetric Top/Bottom Bounds:* Standardized symmetric padding (`py-6 sm:py-8 md:py-10`) so the top dungeon progress bar and the bottom distraction controls maintain the exact same aesthetic distance from the top and bottom viewport edges.
  - *Enlarged Circular Dial:* Expanded the fullscreen circular dial size limits up to `max-h-[min(46vh,500px)]` and `max-w-[540px]`, with countdown digits scaling up to `text-6xl sm:text-7xl md:text-8xl` for an immersive and legible focus experience.
  - *Proportional Controls:* Adjusted controls and exit fullscreen button placement (`top-5 sm:top-7 md:top-9`) for harmonious alignment with the top bar.

