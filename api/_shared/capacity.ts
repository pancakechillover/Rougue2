/**
 * The 300-seat quota on the free Redis tier.
 *
 * Only a Scholar Passport account holds a seat. A legacy sync code
 * (`scholar_sync_<code>` saves) has no account behind it: the code proves
 * nothing and anyone can invent one. Counting those as seats let a caller
 * exhaust the quota with throwaway strings and lock real users out of
 * registration, because /api/sync accepts unauthenticated posts and writes a
 * fresh entry for every code it has never seen. So the pool only counts ids the
 * server itself minted (`usr_…`).
 */

import { isAccountId } from './identity.js';

export const ACTIVE_USERS_KEY = 'scholar_active_users';
export const ACCOUNT_CAPACITY = 300;
export const ACTIVE_WINDOW_DAYS = 15;

/** Start of the activity window; entries older than this have expired. */
export function activeWindowStartMs(nowMs = Date.now()): number {
  return nowMs - ACTIVE_WINDOW_DAYS * 24 * 3600 * 1000;
}

/** Whether an entry is allowed to hold a seat in the quota. */
export function holdsCapacitySeat(identity: unknown): boolean {
  return isAccountId(identity);
}

export type CapacitySnapshot = {
  accounts: number;
  removedExpired: number;
  removedUnbacked: number;
};

/**
 * Brings the pool back to truth: drops entries that aged out of the window and
 * entries that never had an account behind them (leftovers from before the pool
 * was account-only, or codes injected through the anonymous sync route).
 *
 * Idempotent and bounded by the pool size, so it is safe to run on every
 * registration.
 */
export async function reconcileActiveAccounts(
  client: any,
  nowMs = Date.now()
): Promise<CapacitySnapshot> {
  const removedExpired =
    Number(await client.zRemRangeByScore(ACTIVE_USERS_KEY, 0, activeWindowStartMs(nowMs))) || 0;

  const members: string[] = (await client.zRange(ACTIVE_USERS_KEY, 0, -1)) || [];
  const unbacked = members.filter((member) => !holdsCapacitySeat(member));
  if (unbacked.length > 0) {
    await client.zRem(ACTIVE_USERS_KEY, unbacked);
  }

  const accounts = Number(await client.zCard(ACTIVE_USERS_KEY)) || 0;
  return { accounts, removedExpired, removedUnbacked: unbacked.length };
}

/**
 * Marks an account active. Returns false for anything that is not an account
 * id, which keeps legacy sync codes out of the quota.
 */
export async function touchActiveAccount(
  client: any,
  identity: string,
  nowMs = Date.now()
): Promise<boolean> {
  if (!holdsCapacitySeat(identity)) return false;
  await client.zAdd(ACTIVE_USERS_KEY, { score: nowMs, value: identity });
  return true;
}

/** Seat count after pruning entries that aged out of the window. */
export async function countActiveAccounts(client: any, nowMs = Date.now()): Promise<number> {
  await client.zRemRangeByScore(ACTIVE_USERS_KEY, 0, activeWindowStartMs(nowMs));
  return Number(await client.zCard(ACTIVE_USERS_KEY)) || 0;
}
