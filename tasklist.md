# Refactor Task List: Migration to Pure Time-Based Tasks

## Completed Tasks
- [x] Create tasklist.md
- [x] Remove `timeBasedMode` from `AppState` in `src/types.ts`.
- [x] Remove `timeBasedMode` initialization and hydration in `src/hooks/useGameState.ts`.
- [x] Modify `getAddedProgress` in `src/hooks/useGameState.ts` to drop `timeBasedMode` and always calculate `val / denom`.
- [x] Ensure all usages of `getAddedProgress` are updated to remove the `timeBasedMode` argument.
- [x] Ensure base XP and Coins scale linearly based on `addedProgress` (i.e. `baseXP * addedProgress`). 
- [x] Review Talents A2, B2, A3, B3. Trigger correctly preserves proportional progression.
- [x] Remove `timeBasedMode` from `src/lib/rewardLogic.ts`.
- [x] Remove the "Compute Tasks by Time" toggle from `src/components/settings/GeneralSettings.tsx`.
- [x] Remove conditional logic from `src/components/ExploreView.tsx`
- [x] Remove conditional logic from `src/components/dungeons/DungeonsView.tsx`
- [x] Remove conditional logic from `src/components/dungeons/DungeonManager.tsx`
- [x] Remove conditional logic from `src/components/DailySummaryModal.tsx`
- [x] Remove conditional logic from `src/components/DashboardView.tsx`
- [x] Remove conditional logic from `src/components/Timer.tsx`
- [x] Remove conditional logic from `src/components/CompactTimer.tsx`
- [x] Remove conditional logic from `src/components/Stats.tsx`
- [x] Update Terminology "session" strings to "task" globally.

## Pending Tasks
- All planned refactoring tasks are completely cleared!
