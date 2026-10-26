/**
 * Single source of truth for account credential rules.
 *
 * Both the web form (`ScholarPassportModal`) and the serverless handler
 * (`api/auth.ts`) import from here. They used to hard-code their own numbers and
 * drifted apart: the client accepted usernames up to 20 and passwords up to 64,
 * the server allowed 24 and 128. Anything created through the API with the
 * longer values then failed the client's own validation at sign-in, producing an
 * account that existed but could never be used.
 *
 * `tests/authRules.test.ts` asserts both ends agree on the boundaries, so a
 * future edit to one side fails the suite instead of silently creating more
 * unreachable accounts.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 64;

/** Letters, digits and underscore. Length is checked separately so the two
 *  call sites below can apply different upper bounds. */
export const USERNAME_CHARSET_PATTERN = /^[A-Za-z0-9_]+$/;

/** Strict rule, used when creating an account. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Sign-up: full validation.
 */
export function isValidUsernameForSignUp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) return false;
  return USERNAME_CHARSET_PATTERN.test(trimmed);
}

/**
 * Sign-in: length floor and character set only, deliberately no upper bound.
 *
 * Accounts registered before the limits were unified may carry 21–24 character
 * names. Rejecting those at sign-in would lock their owners out permanently,
 * while registration stays strict so no new ones can be created.
 */
export function isValidUsernameForSignIn(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < USERNAME_MIN) return false;
  return USERNAME_CHARSET_PATTERN.test(trimmed);
}

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= PASSWORD_MIN &&
    value.length <= PASSWORD_MAX
  );
}
