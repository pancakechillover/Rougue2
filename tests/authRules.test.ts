/**
 * Guards the credential rules that both the web form and the serverless handler
 * use.
 *
 * They used to keep private copies: the client allowed usernames up to 20 and
 * passwords up to 64, the server 24 and 128. Accounts created through the API
 * with the longer values existed but could never sign in from the web form.
 *
 * The first group of tests pins the boundaries. The last two read the source
 * files and fail if either side stops importing the shared module, which is what
 * would let the two drift apart again unnoticed.
 */
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

import {
  isValidUsernameForSignUp,
  isValidUsernameForSignIn,
  isValidPassword,
  USERNAME_MIN,
  USERNAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX,
} from '../src/lib/authRules.ts';

const repeat = (ch: string, n: number) => ch.repeat(n);

// ── Sign-up: strict on both ends ─────────────────────────────────────────

test('sign-up accepts exactly the maximum username length and rejects one more', () => {
  assert.equal(isValidUsernameForSignUp(repeat('a', USERNAME_MAX)), true);
  assert.equal(isValidUsernameForSignUp(repeat('a', USERNAME_MAX + 1)), false);
});

test('sign-up rejects names below the minimum', () => {
  assert.equal(isValidUsernameForSignUp(repeat('a', USERNAME_MIN - 1)), false);
  assert.equal(isValidUsernameForSignUp(repeat('a', USERNAME_MIN)), true);
});

test('sign-up rejects characters outside letters, digits and underscore', () => {
  assert.equal(isValidUsernameForSignUp('bad name'), false);
  assert.equal(isValidUsernameForSignUp('with-dash'), false);
  assert.equal(isValidUsernameForSignUp('with.dot'), false);
  assert.equal(isValidUsernameForSignUp('ok_name99'), true);
});

test('sign-up trims surrounding whitespace before validating', () => {
  assert.equal(isValidUsernameForSignUp('  karakan  '), true);
  assert.equal(isValidUsernameForSignUp('   '), false);
});

// ── Sign-in: deliberately tolerant of the upper bound ────────────────────

test('sign-in accepts legacy usernames longer than the sign-up limit', () => {
  assert.equal(USERNAME_MAX, 20);
  assert.equal(isValidUsernameForSignIn(repeat('a', 24)), true);
  assert.equal(isValidUsernameForSignIn(repeat('a', 40)), true);
});

test('sign-in still enforces the floor and the character set', () => {
  assert.equal(isValidUsernameForSignIn(repeat('a', USERNAME_MIN - 1)), false);
  assert.equal(isValidUsernameForSignIn('bad name'), false);
  assert.equal(isValidUsernameForSignIn(repeat('a', USERNAME_MIN)), true);
});

// ── Password bounds ──────────────────────────────────────────────────────

test('password accepts exactly the maximum length and rejects one more', () => {
  assert.equal(isValidPassword(repeat('x', PASSWORD_MAX)), true);
  assert.equal(isValidPassword(repeat('x', PASSWORD_MAX + 1)), false);
});

test('password rejects values below the minimum', () => {
  assert.equal(isValidPassword(repeat('x', PASSWORD_MIN - 1)), false);
  assert.equal(isValidPassword(repeat('x', PASSWORD_MIN)), true);
});

test('password rejects non-string input', () => {
  assert.equal(isValidPassword(undefined), false);
  assert.equal(isValidPassword(null), false);
  assert.equal(isValidPassword(12345678), false);
});

// ── Both sides must actually use the shared module ───────────────────────

test('the API handler imports the shared rules and keeps no private copy', () => {
  const src = readFileSync(new URL('../api/auth.ts', import.meta.url), 'utf8');

  assert.match(
    src,
    /from '\.\.\/src\/lib\/authRules\.js'/,
    'api/auth.ts must import the shared rules (note the .js extension required by the ESM runtime)'
  );
  assert.doesNotMatch(
    src,
    /\{3,24\}/,
    'api/auth.ts must not reintroduce the old 24-character username pattern'
  );
  assert.doesNotMatch(
    src,
    /length <= 128/,
    'api/auth.ts must not reintroduce the old 128-character password bound'
  );
});

test('the web form imports the shared rules and keeps no private copy', () => {
  const src = readFileSync(
    new URL('../src/components/settings/ScholarPassportModal.tsx', import.meta.url),
    'utf8'
  );

  assert.match(
    src,
    /from '\.\.\/\.\.\/lib\/authRules'/,
    'the passport modal must import the shared rules'
  );
  assert.doesNotMatch(
    src,
    /\{3,20\}/,
    'the passport modal must not hard-code the username pattern'
  );
  assert.doesNotMatch(
    src,
    /password\.length < 6 \|\| password\.length > 64/,
    'the passport modal must not hard-code the password bounds'
  );
});
