import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCOUNT_CAPACITY,
  ACTIVE_USERS_KEY,
  ACTIVE_WINDOW_DAYS,
  activeWindowStartMs,
  countActiveAccounts,
  holdsCapacitySeat,
  reconcileActiveAccounts,
  touchActiveAccount,
} from '../api/_shared/capacity.ts';

/** Minimal in-memory stand-in for the sorted set the quota lives in. */
function makeFakeClient(entries: Array<[string, number]> = []) {
  const scores = new Map<string, number>(entries);
  const ops: string[] = [];

  return {
    scores,
    ops,
    async zRemRangeByScore(_key: string, min: number, max: number) {
      let removed = 0;
      for (const [member, score] of [...scores]) {
        if (score >= min && score <= max) {
          scores.delete(member);
          removed += 1;
        }
      }
      return removed;
    },
    async zRange(_key: string, _start: number, _stop: number) {
      return [...scores.entries()].sort((a, b) => a[1] - b[1]).map(([member]) => member);
    },
    async zRem(_key: string, members: string | string[]) {
      const list = Array.isArray(members) ? members : [members];
      let removed = 0;
      for (const member of list) {
        if (scores.delete(member)) removed += 1;
      }
      return removed;
    },
    async zAdd(_key: string, entry: { score: number; value: string }) {
      scores.set(entry.value, entry.score);
      ops.push(`zAdd:${entry.value}`);
      return 1;
    },
    async zCard(_key: string) {
      return scores.size;
    },
  };
}

test('only server-minted account ids may hold a seat', () => {
  assert.equal(holdsCapacitySeat('usr_abc123'), true);
  assert.equal(holdsCapacitySeat('abc12345'), false, 'a legacy sync code proves nothing');
  assert.equal(holdsCapacitySeat(''), false);
  assert.equal(holdsCapacitySeat(null), false);
  assert.equal(holdsCapacitySeat(undefined), false);
  // A code that merely looks long enough is still not an account.
  assert.equal(holdsCapacitySeat('a'.repeat(64)), false);
});

test('the activity window is measured in days, not requests', () => {
  const now = Date.UTC(2026, 9, 31, 12, 0, 0);
  const start = activeWindowStartMs(now);
  assert.equal(now - start, ACTIVE_WINDOW_DAYS * 24 * 3600 * 1000);
  assert.ok(ACTIVE_WINDOW_DAYS >= 1);
});

test('reconciling drops expired and never-backed entries before counting seats', async () => {
  const now = Date.UTC(2026, 9, 31, 12, 0, 0);
  const fresh = now - 3600 * 1000;
  const stale = now - 400 * 24 * 3600 * 1000;

  const client = makeFakeClient([
    ['usr_active', fresh],
    ['usr_stale', stale],
    ['abc12345', fresh], // legacy code injected through the anonymous sync route
    ['usr_other', fresh],
  ]);

  const snapshot = await reconcileActiveAccounts(client, now);

  assert.equal(snapshot.removedExpired, 1);
  assert.equal(snapshot.removedUnbacked, 1);
  assert.equal(snapshot.accounts, 2);
  assert.deepEqual([...client.scores.keys()].sort(), ['usr_active', 'usr_other']);
  assert.equal(client.scores.has('abc12345'), false);
});

test('reconciling is idempotent, so it can run on every registration', async () => {
  const now = Date.UTC(2026, 9, 31, 12, 0, 0);
  const client = makeFakeClient([
    ['usr_a', now],
    ['usr_b', now],
  ]);

  const first = await reconcileActiveAccounts(client, now);
  const second = await reconcileActiveAccounts(client, now);

  assert.equal(first.accounts, 2);
  assert.deepEqual(second, { accounts: 2, removedExpired: 0, removedUnbacked: 0 });
});

test('a legacy code is never written to the pool', async () => {
  const client = makeFakeClient();

  assert.equal(await touchActiveAccount(client, 'abc12345'), false);
  assert.equal(client.scores.size, 0, 'an anonymous code must not claim a seat');
  assert.deepEqual(client.ops, []);

  assert.equal(await touchActiveAccount(client, 'usr_real', 1000), true);
  assert.equal(client.scores.get('usr_real'), 1000);
});

test('clearing the injected codes frees exactly the seats they were stealing', async () => {
  const now = Date.UTC(2026, 9, 31, 12, 0, 0);
  // The attack: 300 throwaway codes, no accounts behind them.
  const flood: Array<[string, number]> = [];
  for (let i = 0; i < ACCOUNT_CAPACITY; i += 1) {
    flood.push([`flood${String(i).padStart(4, '0')}`, now - i * 1000]);
  }
  const client = makeFakeClient(flood);

  assert.equal(await countActiveAccounts(client, now), ACCOUNT_CAPACITY);

  const snapshot = await reconcileActiveAccounts(client, now);
  assert.equal(snapshot.removedUnbacked, ACCOUNT_CAPACITY);
  assert.equal(snapshot.accounts, 0, 'a full pool of invented codes is an empty pool');
});

test('a real account still gets a seat in a pool that was flooded', async () => {
  const now = Date.UTC(2026, 9, 31, 12, 0, 0);
  const client = makeFakeClient([['flood0001', now], ['flood0002', now]]);

  await reconcileActiveAccounts(client, now);
  await touchActiveAccount(client, 'usr_newcomer', now);
  const seats = await countActiveAccounts(client, now);

  assert.equal(seats, 1);
  assert.equal(client.scores.has('usr_newcomer'), true);
});

test('the pool key is the one production reads', () => {
  assert.equal(ACTIVE_USERS_KEY, 'scholar_active_users');
  assert.equal(ACCOUNT_CAPACITY, 300);
});
