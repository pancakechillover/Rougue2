# Unified Scholar Account & Cloud-Guild Identity Architecture (Phase 1 & Phase 2)

This milestone implements **Phase 1 (Backend Authentication & Complete Legacy Migration Engine)** and **Phase 2 (Frontend Account State & `useAuth` Hook)** of the Unified Scholar Account architecture. It unifies the three core server-backed subsystems—**Cloud Save**, **Fellowship Guild**, and **Web Push Notifications**—under a single permanent `userId` while keeping Guest Mode 100% functional offline.

> [!NOTE]
> **Terminology Clarification ("Dual-Core Cloud Services" vs. Multi-Cloud)**: The Chinese plan's "双核云端" refers to the two primary server-backed modules (**Cloud Save** and **Fellowship Guild**, alongside **Web Push**) sharing a unified account identity on Redis—not two separate cloud vendors. Phases 1 & 2 build the complete `/api/auth` service, legacy migration engine, and client `useAuth` hook; Phase 3 will switch `/api/sync`, `/api/teams`, and `/api/push` to read `Bearer` tokens directly; Phase 4 will introduce the `ScholarPassportModal` UI.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All security and concurrency audit findings have been incorporated into the architecture below:

- **Scope (Phase 1 & Phase 2 First)**: Deliver `/api/auth.ts`, Express/Vercel routing, `.env.example`, `AppState.account` schema, and `src/hooks/useAuth.ts` without breaking any existing guest or legacy flows.
- **Fail-Closed Secret Validation (`REGISTRATION_SECRET` & `AUTH_TOKEN_SECRET`)**:
  - Both secrets are strictly mandatory.
  - Missing `AUTH_TOKEN_SECRET` (or `< 16` chars) causes all token-issuing and token-verifying endpoints to fail closed with HTTP `503` (`"Server authentication secret (AUTH_TOKEN_SECRET) is not configured."`). Never fallback to `undefined` or a default string.
  - Missing `REGISTRATION_SECRET` causes `register` to fail closed with HTTP `503` (`"Server registration secret (REGISTRATION_SECRET) is not configured."`).
- **Complete Legacy Migration (`migrate_legacy`) Across All 4 Redis Domains**:
  1. **Cloud Save & History** (`scholar_sync_{code}` -> `scholar_user:{userId}:save`).
  2. **Fellowship Guild Identity** (rewriting `sha256(secretCode).slice(0, 16)` across `members`, `applicants`, `proposal`, `messages`, and `events` without `KEYS`, using in-place `LSET` for chat/event lists and mandatory client `AppState.teamId` injection).
  3. **Active User Quota ZSET** (`scholar_active_users` deduplication so migrated users never occupy ghost slots).
  4. **Web Push Subscriptions & Queued Tasks** (migrating `scholar_push_subs_{code}`, rewriting pending tasks in `scholar_push_tasks`, and migrating `scholar_push_task_ref_{code}` TTLs with cron race protection).

---

## 1. Overview & Core Concept

- **What It Does**: Replaces device-fragile random strings (`secretCode` and hashed guild seeds) with an invite-gated Scholar Account (`userId`, `username`, and revocable session token) backed by Redis, while preserving zero-friction local storage for unauthenticated guests.
- **Target Audience / Persona**: Scholars who use multiple devices or PWAs, participate in Fellowship Guilds, and rely on Cloud Sync and Web Push timers without wanting to manually manage random secret codes or suffer `"403 Not a member"` guild lockouts after clearing browser cache.
- **Key Value**: Permanent cross-device identity, strict invite-key protection for server/Redis quotas, and a lossless, idempotent migration bridge for existing users.

---

## 2. User Experience & Visual Design

- **Key User Flows (Phase 1 & Phase 2 Foundation)**:
  1. **Unauthenticated Guest Flow**: Users launch the app and use all local features immediately (`account` is `null`).
  2. **Invite-Gated Registration Flow**: Submitting `username`, `password`, and `registrationKey` verifies server secrets, checks dedicated auth rate limits, hashes the password via async `crypto.scrypt`, atomically claims the username with rollback protection, and issues a signed session token.
  3. **Sign-In & Auto-Renewal Flow**: Signing in or reopening the app validates the Bearer token against `GET /api/auth?action=me`, refreshes the 30-day sliding session TTL in Redis, and exposes the authoritative `userId`.
  4. **Lossless Legacy Migration Flow**: Submitting an old `secretCode` (alongside the client's current `AppState.teamId` and `userUniqueId`) to `POST /api/auth?action=migrate_legacy` migrates the user's Cloud Save, Guild membership/captaincy/chat ownership, Active User quota slot, and pending Web Push tasks into their new `userId`.
- **Visual Identity & Theme**:
  - Phase 1 & Phase 2 operate at the API and state/hook layers; all server responses and hook error messages use 100% pure English copy ready for Phase 4 UI integration.

---

## 3. Key Product Decisions & Known Trade-Offs

- **Decision 1: Asynchronous `crypto.scrypt` Password Hashing (No Event-Loop Blocking)**
  - *Chosen Approach*: Strictly use Node's asynchronous `crypto.scrypt` (wrapped in `util.promisify`) and **forbid `crypto.scryptSync`** so Vercel Serverless functions never block the event loop.
  - *Locked Parameters*:
    - `N = 16384` (`2^14`), `r = 8`, `p = 1`, `keylen = 64` bytes (`maxmem = 32 * 1024 * 1024`).
    - `salt`: 16 random bytes (`crypto.randomBytes(16)`) stored as a 32-char hex string.
    - Storage format in `scholar_user:{userId}` hash: `passwordHash` (128-char hex), `salt` (32-char hex), and `kdf` (`"scrypt:16384:8:1:64"`).
    - Verification uses `crypto.timingSafeEqual(derivedBuffer, storedHashBuffer)`.
- **Decision 2: Signed & Revocable Redis Sessions**
  - *Chosen Approach*: Token format is `<tokenId>.<hmacSha256(tokenId, AUTH_TOKEN_SECRET)>`, where `tokenId` is a 32-byte random hex string stored at `scholar_session:{tokenId}` with a 30-day sliding TTL (`2592000` seconds).
  - *Why*: Combines tamper-proof HMAC verification with instant server-side revocation on logout.
- **Decision 3: Dedicated Auth Rate Limiting & Registration Rollback**
  - *Chosen Approach*: Separate auth rate-limit buckets (`scholar_auth_rate:{ip}`: max 10 requests per 300s for login/register; `scholar_auth_migrate_rate:{ip}`: max 5 requests per 300s for migration) isolated from `/api/sync.ts`'s `scholar_rate_{ip}`. Registration wraps post-`SETNX` writes in a `try/catch` that deletes `scholar_user_lookup:{username}` on failure, and heals orphaned lookup keys whose target `scholar_user:{userId}` hash does not exist.
- **Known Trade-Offs (Explicitly Accepted for Phase 1 & 2)**:
  1. **No Password Recovery Endpoint in Phase 1**: Because registration collects zero PII (no email/phone) and `REGISTRATION_SECRET` is shared among all invited users (making it unsuitable for admin authentication), Phase 1 intentionally exposes **no password reset API endpoint**. Forgetting a password has no in-app recovery path in Phase 1 (an administrator with direct Redis console access can manually delete or update `scholar_user:{userId}` if needed).
  2. **`localStorage` Session Token in PWA / Cross-Origin Iframe**: Because the app runs both inside cross-origin preview iframes (where third-party `HttpOnly` cookies are blocked) and as an installed PWA, storing the session token in `localStorage` is a deliberate trade-off. Risk is mitigated by storing session state in Redis (`scholar_session:{tokenId}`) enabling immediate server-side revocation.
  3. **Dormant Guild (>15 Days Inactive) Discovery Limit**: `scholar_active_teams` prunes guilds inactive for more than 15 days. While `useAuth.migrateLegacy` mitigates this by explicitly passing the client's local `AppState.teamId` (in addition to `cloudData.teamId` and `scholar_active_teams`), a residual edge case remains: if a guild has been inactive for >15 days, AND `cloudData` did not record `teamId`, AND the user migrates from a wiped browser with no local `AppState.teamId`, that dormant guild will not be discovered during `migrate_legacy`.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Frontend Client (React SPA)                         │
│                                                                            │
│  ┌──────────────────────────────┐      ┌────────────────────────────────┐  │
│  │    AppState & Storage        │      │         useAuth Hook           │  │
│  │  - account: ScholarAccount   │◄────►│  - register(user, pass, key)   │  │
│  │  - teamId / userUniqueId     │      │  - login(user, pass)           │  │
│  │  - schemaVersion migration   │      │  - logout() / refreshSession() │  │
│  └──────────────┬───────────────┘      │  - migrateLegacy(secretCode)   │  │
│                 │                      │    [auto-injects local teamId] │  │
└─────────────────┼──────────────────────┴───────────────┬────────────────┘  │
                  │ Unified Identity (userId + Bearer)   │ HTTPS / JSON
                  ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   Backend API Layer (Express & Vercel)                     │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                  Authentication Service (/api/auth)                  │  │
│  │  - Fail-closed check for AUTH_TOKEN_SECRET & REGISTRATION_SECRET     │  │
│  │  - Dedicated Rate Limiters (scholar_auth_rate / migrate_rate)        │  │
│  │  - POST ?action=register  (async scrypt + SETNX + rollback guard)    │  │
│  │  - POST ?action=login     (timingSafeEqual + 30d Redis session)      │  │
│  │  - GET  ?action=me        (HMAC verify + sliding TTL renewal)        │  │
│  │  - POST ?action=logout    (DEL scholar_session:{tokenId})            │  │
│  │  - POST ?action=migrate_legacy (4-domain atomic/idempotent migrator) │  │
│  └──────┬───────────────────┬───────────────────────┬───────────────┬───┘  │
└─────────┼───────────────────┼───────────────────────┼───────────────┼──────┘
          │                   │                       │               │
          ▼                   ▼                       ▼               ▼
┌───────────────────┐ ┌────────────────────┐ ┌─────────────────┐ ┌───────────┐
│   Account Store   │ │ Cloud Save & Quota │ │   Guild Store   │ │ Web Push  │
│ - scholar_user:   │ │ - scholar_user:    │ │ - scholar_team: │ │ - push_   │
│   {userId}        │ │   {userId}:save    │ │   {id}:members  │ │   subs_   │
│ - user_lookup:    │ │ - scholar_active_  │ │ - applicants /  │ │ - push_   │
│   {name_lower}    │ │   users (ZSET)     │ │   proposal /    │ │   tasks   │
│ - session:{tokId} │ │   [zRem old code]  │ │   LSET messages │ │ - task_ref│
└───────────────────┘ └────────────────────┘ └─────────────────┘ └───────────┘
```

### Data Model & Redis Schemas

| Redis Key | Type | Description |
| :--- | :--- | :--- |
| `scholar_user:{userId}` | Hash | `userId`, `username`, `displayName`, `passwordHash`, `salt`, `kdf`, `createdAt`, `lastLoginAt`, `teamId`, `boundOldCode` |
| `scholar_user_lookup:{username_lower}` | String | Case-insensitive username -> `userId` index |
| `scholar_session:{tokenId}` | String | JSON `{ userId, username, issuedAt, expiresAt }` with 30-day sliding TTL |
| `scholar_auth_rate:{ip}` | String | Fixed-window counter (300s TTL, max 10) for `register` / `login` |
| `scholar_auth_migrate_rate:{ip}` | String | Fixed-window counter (300s TTL, max 5) for `migrate_legacy` |
| `scholar_user:{userId}:save` | String | Account-bound JSON cloud save payload |
| `scholar_user:{userId}:save_history` | String | JSON array of up to 3 recent save snapshots |

### Detailed Legacy Migration Specification (`POST /api/auth?action=migrate_legacy`)

When an authenticated user (`newUserId`) invokes `useAuth.migrateLegacy(secretCode)`, the hook automatically reads `state.teamId` and `state.userUniqueId` from `AppState` and submits `{ secretCode, teamId: state.teamId, userUniqueId: state.userUniqueId }`:

1. **Pre-Flight & Idempotency Check**:
   - Validate `secretCode` against `^[A-Za-z0-9-]{8,64}$`.
   - Derive `oldGuildKey = crypto.createHash('sha256').update(secretCode).digest('hex').substring(0, 16)` (and `oldUniqueKey = userUniqueId ? sha256(userUniqueId).slice(0, 16) : null`).
   - All 4 domain steps below are **idempotent**: re-running `migrate_legacy` with the same `secretCode` safely converges without duplicating records or throwing errors.

2. **Domain A — Cloud Save & History Migration**:
   - Read `scholar_sync_${secretCode}` and `scholar_sync_${secretCode}_history`.
   - If `scholar_sync_${secretCode}` exists and `scholar_user:${newUserId}:save` does not exist (or `forceOverwrite` is passed), write the payload to `scholar_user:${newUserId}:save` and history to `scholar_user:${newUserId}:save_history`.
   - Retain `scholar_sync_${secretCode}` untouched as a read-only backup.

3. **Domain B — Active User Quota ZSET (`scholar_active_users`)**:
   - Remove the legacy slot and register the unified account slot:
     - `zRem('scholar_active_users', secretCode)`
     - `zAdd('scholar_active_users', { score: Date.now(), value: newUserId })`
   - **Coexistence Rule**: `scholar_active_users` holds 1 entry per active user (`userId` for registered accounts, `secretCode` for unmigrated legacy users). Removing `secretCode` on migration prevents ghost entries and double-counting.

4. **Domain C — Fellowship Guild Identity Migration (Zero `KEYS`, In-Place `LSET`)**:
   - **Team Discovery (Mandatory Client Fallback + Bounded Index)**: Build the deduplicated set of candidate `teamId`s from:
     1. `req.body.teamId` (mandatory fallback automatically injected from client `AppState.teamId` by `useAuth`)
     2. `cloudData?.teamId` (extracted from the migrated save payload)
     3. `userHash.teamId` (if previously recorded on the user hash)
     4. `await client.zRange('scholar_active_teams', 0, -1)` (bounded ZSET of active teams within the last 15 days, max 50).
   - **Per-Team Member & Applicant Migration (`scholar_team:{teamId}:members` & `:applicants`)**:
     - Inspect `hGet(membersKey, oldGuildKey)` (and `oldUniqueKey` if present) alongside `hGet(membersKey, newUserId)`.
     - If a legacy member record exists:
       - Construct migrated member object: set `userId = newUserId`, preserve `isCaptain`, `joinedAt`, and if `newUserId` already existed, merge by taking `Math.max(old.totalFocusTime, current.totalFocusTime)` and `Math.max(old.cycleFocusTime, current.cycleFocusTime)`.
       - **Write-First Rollback Safety**: Execute `await client.hSet(membersKey, newUserId, JSON.stringify(migratedMember))` **before** `await client.hDel(membersKey, oldGuildKey)`. If `hSet` fails, `oldGuildKey` remains untouched.
     - Repeat the same write-first-then-delete key replacement on `scholar_team:{teamId}:applicants`.
   - **Active Proposal Migration (`scholar_team:{teamId}:proposal`)**:
     - If a proposal JSON exists, rewrite `proposerId` from `oldGuildKey` to `newUserId`, and if `votes[oldGuildKey] !== undefined`, copy `votes[newUserId] = votes[oldGuildKey]` and `delete votes[oldGuildKey]`.
   - **Chat Messages & Events Ownership via In-Place `LSET` (No `DEL + RPUSH` Race)**:
     - Never delete or recreate the list (`DEL + RPUSH` would wipe any concurrent message `LPUSH`ed by another guild member between read and write).
     - Instead, read `lRange(listKey, 0, -1)` (bounded at max 100 items) and for each index `i` where `item.userId === oldGuildKey` (or `oldUniqueKey`), verify `await client.lIndex(listKey, i) === rawItem` (or adjust index offset if a concurrent `LPUSH` shifted the list by `k` positions) and update in-place via `await client.lSet(listKey, targetIdx, JSON.stringify(updatedItem))`.

5. **Domain D — Web Push Subscriptions & Pending Task Queue Migration**:
   - **Subscription Set**:
     - Read all members of `scholar_push_subs_${secretCode}` (plus legacy `scholar_push_sub_${secretCode}`).
     - If non-empty, `sAdd('scholar_push_subs_' + newUserId, ...subs)` and set a 24-hour grace TTL on the old key (`expire('scholar_push_subs_' + secretCode, 86400)`) instead of immediate deletion.
   - **Cron Race Protection & Queued Tasks (`scholar_push_tasks`)**:
     - If `/api/push/check` triggers mid-migration before a task in `scholar_push_tasks` is rewritten, the 24h grace TTL on `scholar_push_subs_${secretCode}` guarantees the notification is still delivered.
     - Scan `await client.zRangeWithScores('scholar_push_tasks', 0, -1)`.
     - For each task where `parsed.secretCode === secretCode`:
       - Remove the old member first via `const removed = await client.zRem('scholar_push_tasks', rawTaskStr)`.
       - **Only if `removed === 1`** (meaning the cron worker did not already pop and fire it), insert the rewritten task `{ ...parsed, secretCode: newUserId }` at the original `score` (`targetTime`).
   - **Quick-Cancel Reference (`scholar_push_task_ref_{code}`)**:
     - Read `rawRef = await client.get('scholar_push_task_ref_' + secretCode)` and `pttl = await client.pTTL('scholar_push_task_ref_' + secretCode)`.
     - If `rawRef` exists and `pttl > 0`, rewrite `secretCode: newUserId` inside the JSON, `set('scholar_push_task_ref_' + newUserId, newRefStr, { PX: pttl })`, and `del('scholar_push_task_ref_' + secretCode)`.
