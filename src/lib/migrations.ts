/**
 * Save-format versioning.
 *
 * Every persisted `AppState` carries `schemaVersion`. When the shape of the
 * state changes, bump CURRENT_SCHEMA_VERSION and add a step in
 * `applyLegacyMigrations` (useGameState.ts). Saves without a version are
 * treated as v0 and upgraded on read.
 */

export const CURRENT_SCHEMA_VERSION = 1;

const MAIN_KEY = 'scholars_dungeon_state';

/** Snapshot taken right before a migration rewrites the save. */
export const PRE_MIGRATION_BACKUP_KEY = `${MAIN_KEY}__backup_raw`;

/** Raw payload preserved when the stored JSON cannot be parsed at all. */
export const CORRUPT_BACKUP_KEY = `${MAIN_KEY}__corrupt_raw`;

export function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function backupRaw(raw: string, key: string): string | null {
  try {
    localStorage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

/**
 * Parse a persisted save. Never throws.
 * A corrupt payload is copied to CORRUPT_BACKUP_KEY before being discarded, so
 * the user's data can still be recovered by hand.
 */
export function parseSave(raw: string | null): {
  parsed: Record<string, any> | null;
  corrupt: boolean;
} {
  if (!raw) return { parsed: null, corrupt: false };

  try {
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      backupRaw(raw, CORRUPT_BACKUP_KEY);
      return { parsed: null, corrupt: true };
    }
    return { parsed, corrupt: false };
  } catch {
    backupRaw(raw, CORRUPT_BACKUP_KEY);
    return { parsed: null, corrupt: true };
  }
}

/** Missing or malformed version counts as v0 (pre-versioning save). */
export function getSaveVersion(parsed: Record<string, any> | null): number {
  const value = parsed?.schemaVersion;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

/** Take a snapshot before rewriting an old save. No-op when there is nothing to back up. */
export function backupBeforeMigration(raw: string | null, fromVersion: number): string | null {
  if (!raw) return null;
  if (fromVersion >= CURRENT_SCHEMA_VERSION) return null;
  return backupRaw(raw, PRE_MIGRATION_BACKUP_KEY);
}

/** A save written by a newer build. We keep the data but must not silently downgrade it. */
export function isFutureSave(fromVersion: number): boolean {
  return fromVersion > CURRENT_SCHEMA_VERSION;
}
