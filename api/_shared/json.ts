/**
 * JSON helpers shared by the serverless API routes.
 *
 * Values read back from Redis are written by many client versions, so a stale,
 * truncated, or manually edited payload must degrade to a fallback instead of
 * throwing and turning the whole request into a 500.
 */

/**
 * Parses a JSON payload without throwing.
 *
 * Returns `fallback` when the input is empty or cannot be parsed. A value that
 * is already decoded (an object or a primitive) is passed straight through —
 * stringifying it would yield "[object Object]" and silently lose the data.
 * A legitimate `0` / `false` payload is likewise preserved.
 */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
