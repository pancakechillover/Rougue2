export function getSyncFingerprint(data: any): string {
  if (!data) return '';

  // Handle nested states if passed directly from cloud data (cloudData.state) or local state
  const stateToFingerprint = data.state ? { ...data.state } : { ...data };
  
  // Exclude volatile and sync-specific fields
  const excludedFields = [
    'lastUpdated',
    'syncHistory',
    'pushSubscription',
    'deviceNickname',
    'deviceCode',
    'deviceType',
    'deviceTheme',
    'secretCode',
    'googleDriveTokens',
    'webdavSettings',
    'syncProvider',
    'syncStatus',
    'hasUnsyncedChanges',
    'isRedisUnlocked',
    'isGoogleDriveUnlocked'
  ];

  excludedFields.forEach(field => {
    delete stateToFingerprint[field];
  });

  const rawDungeons = Array.isArray(data.dungeons) ? data.dungeons : (Array.isArray(stateToFingerprint.dungeons) ? stateToFingerprint.dungeons : []);
  const rawMajorDungeons = Array.isArray(data.majorDungeons) ? data.majorDungeons : (Array.isArray(stateToFingerprint.majorDungeons) ? stateToFingerprint.majorDungeons : []);
  
  delete stateToFingerprint.dungeons;
  delete stateToFingerprint.majorDungeons;

  const dataToFingerprint = {
    state: stateToFingerprint,
    dungeons: rawDungeons,
    majorDungeons: rawMajorDungeons
  };

  // Sort keys deeply for stable serialization
  const deepSortKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(deepSortKeys);
    }
    
    return Object.keys(obj)
      .sort()
      .reduce((acc: any, key) => {
        acc[key] = deepSortKeys(obj[key]);
        return acc;
      }, {});
  };

  const stabilizedData = deepSortKeys(dataToFingerprint);
  return JSON.stringify(stabilizedData);
}
