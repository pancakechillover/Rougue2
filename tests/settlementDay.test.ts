/**
 * Guards the rule that decides which day a moment belongs to.
 *
 * The day boundary is not midnight: it is derived from the Activity Time Peaks,
 * so a night period running 19:00 to 04:00 means the day starts at 04:00. Every
 * label in the app ("Today", the calendar ring, report headers) and every range
 * filter has to agree with the function that stamped the record, otherwise the
 * numbers and the labels describe different days.
 *
 * They did not agree. The Record view carried its own copy of this rule and
 * measured the fallback from `night.end` while the writer measured from
 * `morning.start`. On the default 8-12 / 14-18 / 20-24 settings a session at
 * 12:30 was filed under the previous day, roughly one record in five.
 *
 * These tests pin the boundaries so a third copy cannot appear unnoticed, and
 * cover the gap case that made the two implementations diverge.
 */
import test from 'node:test';
import assert from 'node:assert';

import {
  getDayStartHour,
  getSettlementDay,
  isSettlementToday,
  getSettlementStart,
  getSettlementEnd,
} from '../src/lib/utils.ts';

// What the report actually deals with: a night block crossing midnight.
const CROSSING = {
  morning: { start: 4, end: 14 },
  afternoon: { start: 14, end: 19 },
  night: { start: 19, end: 4 },
};

// The defaults, which leave 12:00-14:00 and 18:00-20:00 outside every period.
const DEFAULT = {
  morning: { start: 8, end: 12 },
  afternoon: { start: 14, end: 18 },
  night: { start: 20, end: 24 },
};

const at = (y: number, mo: number, d: number, h = 0, mi = 0) =>
  new Date(y, mo - 1, d, h, mi, 0, 0);

test('day start comes from the peak periods', () => {
  assert.equal(getDayStartHour(CROSSING), 4, 'crossing night ends at 04:00');
  assert.equal(getDayStartHour(DEFAULT), 8, 'otherwise the morning start rules');
  assert.equal(getDayStartHour(undefined), 8, 'no settings falls back to defaults');
});

test('a crossing day runs 04:00 to 04:00', () => {
  assert.equal(getSettlementDay(at(2026, 10, 29, 3, 59), CROSSING), '2026-10-28');
  assert.equal(getSettlementDay(at(2026, 10, 29, 4, 0), CROSSING), '2026-10-29');
  assert.equal(getSettlementDay(at(2026, 10, 29, 13, 59), CROSSING), '2026-10-29');
  assert.equal(getSettlementDay(at(2026, 10, 29, 19, 0), CROSSING), '2026-10-29');
  assert.equal(getSettlementDay(at(2026, 10, 30, 1, 0), CROSSING), '2026-10-29');
});

test('the defaults start the day at 08:00', () => {
  assert.equal(getSettlementDay(at(2026, 10, 29, 7, 59), DEFAULT), '2026-10-28');
  assert.equal(getSettlementDay(at(2026, 10, 29, 8, 0), DEFAULT), '2026-10-29');
});

test('hours outside every period still belong to the right day', () => {
  // The regression. 12:30 sits in the gap between morning and afternoon; the
  // old per-period implementation pushed it back a day because its fallback
  // measured from night.end (24) instead of morning.start (8).
  assert.equal(getSettlementDay(at(2026, 10, 29, 12, 30), DEFAULT), '2026-10-29');
  assert.equal(getSettlementDay(at(2026, 10, 29, 13, 30), DEFAULT), '2026-10-29');
  assert.equal(getSettlementDay(at(2026, 10, 29, 18, 30), DEFAULT), '2026-10-29');
  assert.equal(getSettlementDay(at(2026, 10, 29, 19, 30), DEFAULT), '2026-10-29');
});

test('"today" follows the day in progress, not the calendar date', () => {
  const now = at(2026, 10, 30, 1, 30);
  const running = at(2026, 10, 29);
  const justStarted = at(2026, 10, 30);

  assert.equal(isSettlementToday(running, CROSSING, now), true, '01:30 still belongs to the 29th');
  assert.equal(isSettlementToday(justStarted, CROSSING, now), false, 'the 30th has not begun at 04:00 yet');

  const later = at(2026, 10, 30, 9, 0);
  assert.equal(isSettlementToday(justStarted, CROSSING, later), true);
  assert.equal(isSettlementToday(running, CROSSING, later), false);
});

test('settlement range spans exactly one day', () => {
  const start = getSettlementStart(at(2026, 10, 29, 1, 0), CROSSING);
  const end = getSettlementEnd(at(2026, 10, 29, 1, 0), CROSSING);

  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 9);
  assert.equal(start.getDate(), 28, '01:00 belongs to the day that began on the 28th');
  assert.equal(start.getHours(), 4);

  assert.equal(end.getDate(), 29);
  assert.equal(end.getHours(), 3);
  assert.equal(end.getMinutes(), 59);
  assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000 - 1);
});

test('a crossing night and a later morning settle on one boundary', () => {
  // Night 19:00-04:00 with morning 08:00-12:00 leaves 04:00-08:00 belonging to
  // neither block. getSettlementDay checks both conditions, so the day does not
  // turn over at 04:00 — it waits until 08:00. The helper has to report the same
  // hour, otherwise labels would flip at 04:00 while the numbers flipped at 08:00.
  const SPLIT = {
    morning: { start: 8, end: 12 },
    afternoon: { start: 14, end: 18 },
    night: { start: 19, end: 4 },
  };

  assert.equal(getDayStartHour(SPLIT), 8, 'the later of the two blocks opens the day');
  assert.equal(getSettlementDay(at(2026, 10, 29, 5, 0), SPLIT), '2026-10-28');
  assert.equal(getSettlementDay(at(2026, 10, 29, 7, 59), SPLIT), '2026-10-28');
  assert.equal(getSettlementDay(at(2026, 10, 29, 8, 0), SPLIT), '2026-10-29');
});

test('the helper agrees with the day rule for every hour of the day', () => {
  // Anything that reads the boundary from getDayStartHour must land on the same
  // day getSettlementDay files the record under. Checked hour by hour because the
  // two used to be written out separately and drifted.
  const configs = [
    CROSSING,
    DEFAULT,
    { morning: { start: 8, end: 12 }, afternoon: { start: 14, end: 18 }, night: { start: 19, end: 4 } },
    { morning: { start: 6, end: 13 }, afternoon: { start: 14, end: 18 }, night: { start: 19, end: 3 } },
  ];
  const noon = at(2026, 10, 29, 12, 0);

  for (const ts of configs) {
    const startHour = getDayStartHour(ts);
    for (let hour = 0; hour < 24; hour++) {
      const belongsToPrevious = getSettlementDay(at(2026, 10, 29, hour, 30), ts) !== getSettlementDay(noon, ts);
      assert.equal(
        belongsToPrevious,
        hour < startHour,
        `hour ${hour} with day starting at ${startHour}`
      );
    }
  }
});

test('a noon moment and an early-morning moment share a range only when they share a day', () => {
  const noon = getSettlementStart(at(2026, 10, 29, 12, 0), CROSSING);
  const night = getSettlementStart(at(2026, 10, 29, 2, 0), CROSSING);
  const sameDay = getSettlementStart(at(2026, 10, 29, 23, 0), CROSSING);

  assert.equal(noon.getTime(), getSettlementStart(at(2026, 10, 29, 5, 0), CROSSING).getTime());
  assert.notEqual(noon.getTime(), night.getTime());
  assert.equal(noon.getTime(), sameDay.getTime());
});
