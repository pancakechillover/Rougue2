/**
 * Who a cloud-save request acts as.
 *
 * A Scholar Passport id (`usr_…`) names an account. It is not a credential: it
 * travels in guild member lists, in query strings and in request headers, so
 * treating it as proof of identity let anyone quote someone else's id and read,
 * overwrite or delete that account's whole save. Only a bearer session may
 * address an account save; a bare `usr_…` in a request body is refused.
 *
 * Legacy sync codes are a different thing. A `scholar_sync_<code>` save has no
 * account behind it, so the code is the only handle to it and is still accepted
 * from the body — that path is unchanged.
 */

export const ACCOUNT_ID_PREFIX = 'usr_';

/** Legacy base36 codes, UUID codes, and unified usr_<uuid> ids. */
export const SECRET_CODE_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isAccountId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ACCOUNT_ID_PREFIX);
}

export function isValidSecretCode(value: unknown): value is string {
  return typeof value === 'string' && SECRET_CODE_PATTERN.test(value);
}

export type IdentityResolution =
  | { kind: 'granted'; identity: string; unified: boolean }
  | { kind: 'denied'; status: 400 | 401; error: string };

/**
 * Resolves the identity a save request is allowed to touch.
 *
 * The session always wins: a verified caller acts as themselves and cannot name
 * another account, whatever the body says. Without a session only a legacy sync
 * code is accepted, and an account id in that position is rejected outright
 * rather than quietly mapped onto an account save.
 */
export function resolveSyncIdentity(
  verifiedUserId: string | null | undefined,
  claimedCode: unknown
): IdentityResolution {
  if (typeof verifiedUserId === 'string' && verifiedUserId.length > 0) {
    return { kind: 'granted', identity: verifiedUserId, unified: true };
  }

  if (claimedCode === undefined || claimedCode === null || claimedCode === '') {
    return { kind: 'denied', status: 400, error: 'Authentication or valid secret code required' };
  }

  if (isAccountId(claimedCode)) {
    return {
      kind: 'denied',
      status: 401,
      error: 'Sign in to your Scholar Passport to read or write an account save.',
    };
  }

  if (!isValidSecretCode(claimedCode)) {
    return { kind: 'denied', status: 400, error: 'Invalid secret code format' };
  }

  return { kind: 'granted', identity: claimedCode, unified: false };
}
