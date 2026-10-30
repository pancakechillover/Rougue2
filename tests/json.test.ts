import test from 'node:test';
import assert from 'node:assert/strict';

import { safeJsonParse } from '../api/_shared/json.ts';

test('safeJsonParse parses a valid payload', () => {
  assert.deepEqual(safeJsonParse('{"a":1,"b":[2,3]}', null), { a: 1, b: [2, 3] });
  assert.deepEqual(safeJsonParse('[1,2,3]', []), [1, 2, 3]);
});

test('safeJsonParse returns the fallback for corrupt or empty input', () => {
  const fallback = { ok: false };

  assert.deepEqual(safeJsonParse(null, fallback), fallback);
  assert.deepEqual(safeJsonParse(undefined, fallback), fallback);
  assert.deepEqual(safeJsonParse('', fallback), fallback);
  assert.deepEqual(safeJsonParse('{"truncated":', fallback), fallback);
  assert.deepEqual(safeJsonParse('not json at all', fallback), fallback);
});

test('safeJsonParse preserves falsy-but-valid payloads', () => {
  // A stored `0` or `false` is real data, not an empty value.
  assert.equal(safeJsonParse('0', 'fallback'), 0);
  assert.equal(safeJsonParse('false', 'fallback'), false);
  assert.equal(safeJsonParse('null', 'fallback'), null);
});

test('safeJsonParse never throws on hostile input', () => {
  const hostile = ['{'.repeat(10000), '\u0000', '{"a": __proto__}', '[]]'];

  for (const value of hostile) {
    assert.doesNotThrow(() => safeJsonParse(value, 'fallback'));
  }
});

test('safeJsonParse passes already-decoded values through unchanged', () => {
  // Stringifying an object would yield "[object Object]" and lose the data.
  assert.deepEqual(safeJsonParse({ a: 1 }, null), { a: 1 });
  assert.deepEqual(safeJsonParse([1, 2], null), [1, 2]);
  assert.equal(safeJsonParse(42, null), 42);
  assert.equal(safeJsonParse(false, 'fallback'), false);
});
