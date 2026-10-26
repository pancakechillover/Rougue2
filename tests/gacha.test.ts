/**
 * Unit tests for the gacha roll computation.
 *
 * The function is pure on purpose: the previous implementation filled a results
 * array from inside a React state updater and read it immediately afterwards,
 * and it only charged for pulls that happened to resolve to a configured item.
 * These tests pin both behaviours so they cannot regress silently.
 */
import test from 'node:test';
import assert from 'node:assert';

import { computeGachaPull } from '../src/lib/gacha.ts';
import type { GachaPoolLike } from '../src/lib/gacha.ts';

const makePool = (overrides: Partial<GachaPoolLike> = {}): GachaPoolLike => ({
  id: 'test',
  name: 'Test Pool',
  type: 'gacha',
  cost: 10,
  rarities: [
    { id: 'SSR', name: 'SSR', color: 'amber', weight: 0 },
    { id: 'SR', name: 'SR', color: 'purple', weight: 0 },
    { id: 'R', name: 'R', color: 'blue', weight: 100 },
  ],
  items: [{ rarity: 'R', name: 'Common Thing' }],
  ...overrides,
});

test('refuses to roll when the balance cannot cover it', () => {
  const pool = makePool();
  assert.equal(computeGachaPull(pool, 1, 9), null);
  assert.equal(computeGachaPull(pool, 1, 10) !== null, true);
});

test('charges once per successful pull', () => {
  const pool = makePool();
  const result = computeGachaPull(pool, 5, 1000);
  assert.ok(result);
  assert.equal(result.results.length, 5);
  assert.equal(result.spent, 5 * pool.cost);
});

test('does not charge for a rarity that has no configured item', () => {
  // The R rarity resolves to nothing, so every pull is a dud. The old loop
  // skipped the coin subtraction in that case but still reported a pull.
  const pool = makePool({
    rarities: [{ id: 'R', name: 'R', color: 'blue', weight: 100 }],
    items: [{ rarity: 'SSR', name: 'Unreachable' }],
  });
  const result = computeGachaPull(pool, 3, 1000);
  assert.ok(result);
  assert.equal(result.results.length, 0);
  assert.equal(result.spent, 0);
});

test('can return any entry of the same rarity, not just the first', () => {
  // Two items share the R rarity. The old find() could only ever reach the
  // first one, so the second was dead configuration.
  const pool = makePool({
    items: [
      { rarity: 'R', name: 'First' },
      { rarity: 'R', name: 'Second' },
    ],
  });

  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const r = computeGachaPull(pool, 1, 1000);
    if (r && r.results[0]) seen.add(r.results[0].item);
  }

  assert.ok(seen.has('First'), 'first item should appear');
  assert.ok(seen.has('Second'), 'second item should appear too');
});

test('ichiban decrements counts and awards LastOne when the box empties', () => {
  const pool: GachaPoolLike = {
    id: 'ichiban',
    name: 'Ichiban',
    type: 'ichiban',
    cost: 10,
    items: [
      { rarity: 'A', name: 'Grand Prize', count: 1, initialCount: 1 },
      { rarity: 'B', name: 'Small Prize', count: 2, initialCount: 2 },
      { rarity: 'LastOne', name: 'Last One', count: 1, initialCount: 1 },
    ],
  };

  const result = computeGachaPull(pool, 3, 1000);
  assert.ok(result);
  assert.equal(result.spent, 30);

  // 1x A + 2x B = 3 draws, then LastOne rides along on the final draw.
  const items = result.results.map((r) => r.item);
  assert.ok(items.includes('Grand Prize'));
  assert.ok(items.includes('Small Prize'));
  assert.ok(items.includes('Last One'), 'LastOne should be awarded once the box is empty');

  const remaining = result.newPool.items
    .filter((i) => i.rarity !== 'LastOne')
    .reduce((acc, i) => acc + (i.count || 0), 0);
  assert.equal(remaining, 0);
});

test('stops early when an ichiban box runs dry', () => {
  const pool: GachaPoolLike = {
    id: 'small',
    name: 'Small Box',
    type: 'ichiban',
    cost: 10,
    items: [{ rarity: 'A', name: 'Only', count: 1, initialCount: 1 }],
  };

  const result = computeGachaPull(pool, 5, 1000);
  assert.ok(result);
  assert.equal(result.spent, 10, 'only one pull was possible');
});
