/**
 * Guards "one session, one tag".
 *
 * Tag Breakdown credits a session's whole duration to each of its tags. When a
 * session could carry several, a three-tag session was counted three times: the
 * card's own total said 18h30m while its donut said 26h30m, and every
 * percentage was divided by the inflated sum, so a tag worth 40% of the real
 * time read as 28%.
 *
 * The pickers are single-choice now, but sessions saved earlier still hold
 * several ids in storage. The selector is what keeps the numbers honest for
 * those records, so the contract is asserted here rather than left to the UI:
 * at most one id, the first one, and storage is never rewritten.
 */
import test from 'node:test';
import assert from 'node:assert';

import { getSessionEffectiveTagIds, getEffectiveDungeonTagIds } from '../src/lib/tags.ts';

const tagsOf = (...ids: string[]) => ids;

const dungeons = [
  { id: 'sub-a', name: 'Sub A', parentId: 'major-a', tags: tagsOf('t-sub') },
  { id: 'sub-b', name: 'Sub B', parentId: 'major-a', tags: [] },
  { id: 'sub-c', name: 'Sub C', parentId: null, tags: tagsOf('t-c1', 't-c2') },
] as any[];

const majorDungeons = [{ id: 'major-a', name: 'Major A', tags: tagsOf('t-major') }] as any[];

const session = (over: Record<string, unknown>) => ({ id: 's', timestamp: 0, ...over }) as any;

test('a session with several stored tags reports only the first', () => {
  const s = session({ tags: ['t-1', 't-2', 't-3'] });
  assert.deepEqual(getSessionEffectiveTagIds(s, dungeons, majorDungeons), ['t-1']);
});

test('a session with one tag reports that tag', () => {
  const s = session({ tags: ['t-only'] });
  assert.deepEqual(getSessionEffectiveTagIds(s, dungeons, majorDungeons), ['t-only']);
});

test('an untagged session falls back to its dungeon, still one id', () => {
  // Sub C carries two tags of its own; a session inside it must not inherit both.
  const s = session({ tags: [], dungeonId: 'sub-c' });
  assert.deepEqual(getSessionEffectiveTagIds(s, dungeons, majorDungeons), ['t-c1']);
});

test('a sub-dungeon session inherits from the parent, but only the first', () => {
  const s = session({ tags: [], dungeonId: 'sub-a' });
  // getEffectiveDungeonTagIds unions inherited + own; the session selector caps it.
  assert.ok(getEffectiveDungeonTagIds('sub-a', dungeons, majorDungeons).length > 1);
  assert.equal(getSessionEffectiveTagIds(s, dungeons, majorDungeons).length, 1);
});

test('no dungeon and no tags means no tag', () => {
  assert.deepEqual(getSessionEffectiveTagIds(session({ tags: [] }), dungeons, majorDungeons), []);
  assert.deepEqual(
    getSessionEffectiveTagIds(session({ tags: [], dungeonId: 'free_study' }), dungeons, majorDungeons),
    []
  );
});

test('junk entries in the stored array do not become tags', () => {
  const s = session({ tags: [null, '', 42, 't-real'] });
  assert.deepEqual(getSessionEffectiveTagIds(s, dungeons, majorDungeons), ['t-real']);
});

test('the selector never mutates the stored array', () => {
  const stored = ['t-1', 't-2'];
  const s = session({ tags: stored });
  getSessionEffectiveTagIds(s, dungeons, majorDungeons);
  assert.deepEqual(stored, ['t-1', 't-2'], 'records saved before the change must survive intact');
});

test('attribution can no longer exceed the time actually focused', () => {
  // The invariant the card depends on: summing per-tag minutes over a set of
  // sessions equals the sum of their durations, not a multiple of it.
  const sessions = [
    session({ id: 'a', tags: ['t-1', 't-2'], minutes: 60 }),
    session({ id: 'b', tags: ['t-2', 't-3', 't-4'], minutes: 30 }),
    session({ id: 'c', tags: [], dungeonId: 'sub-c', minutes: 45 }),
  ];
  let focused = 0;
  let attributed = 0;
  for (const s of sessions) {
    focused += s.minutes;
    for (const _tag of getSessionEffectiveTagIds(s, dungeons, majorDungeons)) {
      attributed += s.minutes;
    }
  }
  assert.equal(attributed, focused);
});
