# AGENTS.md — Scholar's Dungeon

Read this first. Chat with the user in **Chinese**; the app UI is **pure English**.

## Multi-Agent Workflow
- **Google AI Studio (you):** commit directly to `main`. Small commits: one task, one push.
- **CodeBuddy (小迪):** works on `feat-workstation-checkin`, owns final merges into `main`.
- **NEVER edit** `src/version.ts`, `ROADMAP.md`, or this file — centrally managed by CodeBuddy.
- Every push runs CI (typecheck / lint / test / build). Red check -> fix in a follow-up commit before new work.
- Production broken after deploy? User can Instant-Rollback on Vercel. Never force-push.

## Version Status
- Current: **v9.4.0** (2026-10-24) — see `docs/TaskHistory.md` (recent) and `docs/archive/` (full history).

## Roadmap
- Work only on tasks the user assigns. Never start roadmap items unprompted. See `ROADMAP.md`.

## Update Flow (per release)
- Preview update: bump `APP_VERSION` in `src/version.ts` + log in `docs/TaskHistory.md`. Do NOT touch `RELEASE_HISTORY`.
- Official update (user-requested): additionally update `RELEASE_HISTORY` and `public/version.json`.

## Hard UI Rules (each one was a real bug — do not violate)
- Full-screen modals: ALWAYS render via `createPortal(..., document.body)`. Fixed elements inside transformed ancestors break positioning.
- Red-dot badges: bottom-right (`-bottom-0.5 -right-0.5`), never top-right.
- Critical actions (delete etc.): never hover-only — must be visible/tappable on touch devices.
- Italic text: add `pr-1` (or similar) to prevent right-edge clipping.
- Colors: theme-aware (`indigo-400/500`, slate+opacity). Avoid `bg-emerald-500`-style hardcodes, `indigo-200`, and `indigo-700+` for primary elements. Dark themes: night/forest/ocean. Light: daylight/warm/candy.

## Web Push Troubleshooting (in order)
1. Test in a new tab or installed PWA (iframes block push) -> 2. permission "Allowed" -> 3. SW console `Application > Service Workers > Inspect` -> 4. OS focus-assist -> 5. Dev settings "Test Local Notification (Direct)" -> 6. VAPID keys changed? Then "Clear Server Sub" + "Reset Service Worker".
