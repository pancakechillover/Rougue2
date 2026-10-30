import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAccountId,
  isPublicGuildRequest,
  isValidSecretCode,
  resolveSyncIdentity,
} from '../api/_shared/identity.ts';

test('a session acts as its own account, and the body cannot redirect it', () => {
  assert.deepEqual(resolveSyncIdentity('usr_self', undefined), {
    kind: 'granted',
    identity: 'usr_self',
    unified: true,
  });

  // Naming someone else's id in the body must not move the request onto their save.
  assert.deepEqual(resolveSyncIdentity('usr_self', 'usr_victim'), {
    kind: 'granted',
    identity: 'usr_self',
    unified: true,
  });

  // A legacy code in the body is likewise ignored when a session is present.
  assert.deepEqual(resolveSyncIdentity('usr_self', 'abc12345'), {
    kind: 'granted',
    identity: 'usr_self',
    unified: true,
  });
});

test('an account id without a session is refused, not mapped onto a save', () => {
  for (const session of [null, undefined, '']) {
    assert.deepEqual(resolveSyncIdentity(session, 'usr_victim'), {
      kind: 'denied',
      status: 401,
      error: 'Sign in to your Scholar Passport to read or write an account save.',
    });
  }
});

test('a legacy sync code without a session still works, and stays a legacy save', () => {
  assert.deepEqual(resolveSyncIdentity(null, 'abc12345'), {
    kind: 'granted',
    identity: 'abc12345',
    unified: false,
  });

  // Only a leading prefix marks an account id; one further inside is just a code.
  assert.deepEqual(resolveSyncIdentity(null, 'xxusr_yy'), {
    kind: 'granted',
    identity: 'xxusr_yy',
    unified: false,
  });
});

/** The status a denial would answer with, or null when the request was granted. */
function denialStatus(result: ReturnType<typeof resolveSyncIdentity>): number | null {
  return result.kind === 'denied' ? result.status : null;
}

test('a missing identity is a bad request, and a malformed one never authenticates', () => {
  for (const claimed of [undefined, null, '']) {
    assert.equal(denialStatus(resolveSyncIdentity(null, claimed)), 400);
  }

  for (const claimed of ['short', 'has space', 'a'.repeat(65), 42, {}, []]) {
    assert.equal(denialStatus(resolveSyncIdentity(null, claimed)), 400);
  }
});

test('isAccountId only matches ids that start with the account prefix', () => {
  assert.equal(isAccountId('usr_abc'), true);
  assert.equal(isAccountId('usr_'), true);
  assert.equal(isAccountId(''), false);
  assert.equal(isAccountId('xusr_abc'), false);
  assert.equal(isAccountId('usr'), false);
  assert.equal(isAccountId(null), false);
  assert.equal(isAccountId(undefined), false);
});

test('isValidSecretCode keeps accepting legacy codes and account ids alike', () => {
  // Both shapes pass the format check; what makes an account id unusable is
  // where it appears, not whether it looks like a code.
  assert.equal(isValidSecretCode('usr_9f2a1c0d'), true);
  assert.equal(isValidSecretCode('abc12345'), true);
  assert.equal(isValidSecretCode('AB-12_cd-ef'), true);
  assert.equal(isValidSecretCode('short'), false);
  assert.equal(isValidSecretCode(''), false);
});

test('only the guild lobby is public; one guild\'s insides are not', () => {
  // Browsing what exists needs no account: names, descriptions, member counts.
  assert.equal(isPublicGuildRequest('GET', false), true);
  assert.equal(isPublicGuildRequest('get', false), true);

  // Naming a guild asks for its roster, chat and applications.
  assert.equal(isPublicGuildRequest('GET', true), false);

  // Nothing that changes a guild is ever public, with or without an id.
  for (const method of ['POST', 'DELETE', 'PUT', 'PATCH']) {
    assert.equal(isPublicGuildRequest(method, false), false);
    assert.equal(isPublicGuildRequest(method, true), false);
  }

  // A missing method is not a free pass either.
  assert.equal(isPublicGuildRequest(undefined, false), false);
});
