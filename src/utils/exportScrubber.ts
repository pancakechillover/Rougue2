export function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();

  if (lowerKey === 'googledrivetokens' || lowerKey === 'webdavsettings' || lowerKey === 'sageapiurl') {
    return true;
  }

  const sensitiveKeywords = [
    'apikey',
    'api_key',
    'token',
    'password',
    'secret',
    'privatekey',
    'private_key',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'clientsecret',
    'client_secret',
    'credential',
    'credentials'
  ];

  return sensitiveKeywords.some(keyword => lowerKey.includes(keyword));
}

export function scrubObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(scrubObject);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (isSensitiveKey(key)) {
        continue;
      }
      newObj[key] = scrubObject(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export function scrubExportData(dataToExport: any): any {
  // Remove sync passwords, nicknames, and unlock statuses
  const { 
    secretCode, 
    webdavSettings, 
    googleDriveTokens, 
    googleDriveFileId,
    isRedisUnlocked,
    isGoogleDriveUnlocked,
    syncProvider,
    deviceNickname, 
    deviceCode,
    syncHistory,
    pushEnabled,
    pushSubscription,
    userName,
    userAvatar,
    userBio,
    userTitle,
    userUniqueId,
    sageApiKey,
    sageApiUrl,
    ...safeState 
  } = dataToExport;

  let finalData: any = {
    ...scrubObject(safeState),
    deviceNickname: undefined,
    deviceCode: undefined,
    secretCode: undefined,
    googleDriveTokens: undefined,
    googleDriveFileId: undefined,
    isRedisUnlocked: false,
    isGoogleDriveUnlocked: false,
    syncProvider: undefined,
    webdavSettings: undefined,
    pushEnabled: false,
    pushSubscription: null,
    syncHistory: [],
    autoSyncMode: 'manual',
    autoSyncDebounceSeconds: 10,
    autoSyncIntervalMinutes: 1,
    userName: undefined,
    userAvatar: undefined,
    userBio: undefined,
    userTitle: undefined,
    userUniqueId: undefined,
    sageApiKey: undefined,
    sageApiUrl: undefined
  };

  // Also clean up fullLocalStorage if it's being used as the main source of truth
  if (finalData.fullLocalStorage) {
    const safeLocal: Record<string, string> = { ...finalData.fullLocalStorage };
    const keysToRemove = [
      'scholars_dungeon_sync_code',
      'scholars_dungeon_device_nickname',
      'scholars_dungeon_device_code',
      'scholars_dungeon_webdav_password'
    ];
    keysToRemove.forEach(k => delete safeLocal[k]);
    
    // Also the main state string in localStorage needs to be updated if it exists there
    if (safeLocal['scholars_dungeon_state']) {
      try {
        const parsed = JSON.parse(safeLocal['scholars_dungeon_state']);
        const scrubbedParsed = scrubObject(parsed);
        
        delete scrubbedParsed.secretCode;
        delete scrubbedParsed.deviceNickname;
        delete scrubbedParsed.deviceCode;
        delete scrubbedParsed.webdavSettings;
        delete scrubbedParsed.googleDriveTokens;
        delete scrubbedParsed.googleDriveFileId;
        scrubbedParsed.isRedisUnlocked = false;
        scrubbedParsed.isGoogleDriveUnlocked = false;
        scrubbedParsed.syncProvider = undefined;
        scrubbedParsed.pushEnabled = false;
        scrubbedParsed.pushSubscription = null;
        scrubbedParsed.syncHistory = [];
        scrubbedParsed.autoSyncMode = 'manual';
        scrubbedParsed.autoSyncDebounceSeconds = 10;
        scrubbedParsed.autoSyncIntervalMinutes = 1;
        delete scrubbedParsed.userName;
        delete scrubbedParsed.userAvatar;
        delete scrubbedParsed.userBio;
        delete scrubbedParsed.userTitle;
        delete scrubbedParsed.userUniqueId;
        delete scrubbedParsed.sageApiKey;
        delete scrubbedParsed.sageApiUrl;
        safeLocal['scholars_dungeon_state'] = JSON.stringify(scrubbedParsed);
      } catch (e) {}
    }
    finalData.fullLocalStorage = safeLocal;
  }

  return finalData;
}
