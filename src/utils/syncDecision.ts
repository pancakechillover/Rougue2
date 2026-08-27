export type SyncDecision = 
  | 'silent_upload'
  | 'silent_noop'
  | 'block_cloud_newer'
  | 'block_read_failed'
  | 'force_upload'
  | 'ask_local_newer'
  | 'device_mismatch_conflict';

interface SyncDecisionParams {
  localFingerprint: string;
  cloudFingerprint: string;
  localTime: number;
  cloudTime: number;
  cloudExists: boolean;
  cloudReadError?: boolean;
  forceOverwrite: boolean;
  identitiesMatch?: boolean;
}

export function decideCloudSyncAction({
  localFingerprint,
  cloudFingerprint,
  localTime,
  cloudTime,
  cloudExists,
  cloudReadError,
  forceOverwrite,
  identitiesMatch = true
}: SyncDecisionParams): SyncDecision {
  if (cloudReadError) {
    return 'block_read_failed';
  }

  // If manual force overwrite, always upload
  if (forceOverwrite) {
    return 'force_upload';
  }

  // If cloud doesn't exist, silently initialize
  if (!cloudExists) {
    return 'silent_upload';
  }

  // Cloud exists, check fingerprints
  if (localFingerprint === cloudFingerprint) {
    // Content is exactly the same. 
    return 'silent_upload'; // To refresh metadata
  }

  // Critical Mismatch Guard: If device codes strictly differ, NEVER silently overwrite.
  // Force a conflict modal, unless explicitly forced by user.
  if (!identitiesMatch) {
    if (cloudTime > localTime) {
      return 'block_cloud_newer';
    }
    return 'device_mismatch_conflict';
  }

  // Fingerprints differ. Check timestamps.
  if (cloudTime > localTime) { // cloud is newer
    return 'block_cloud_newer';
  }

  // Local is newer AND identities match. 
  // Safe to silently overwrite.
  return 'silent_upload';
}
