export function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();

  if (
    lowerKey === 'googledrivetokens' ||
    lowerKey === 'webdavsettings' ||
    lowerKey === 'sageapiurl' ||
    lowerKey === 'account'
  ) {
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

  return sensitiveKeywords.some((keyword) => lowerKey.includes(keyword));
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

function scrubStateFields(rawState: any): any {
  const scrubbed = scrubObject(rawState);

  // 1. Cloud Account, Auth, Sync & Guild credentials
  delete scrubbed.account;
  delete scrubbed.secretCode;
  delete scrubbed.webdavSettings;
  delete scrubbed.googleDriveTokens;
  delete scrubbed.googleDriveFileId;
  delete scrubbed.syncProvider;
  delete scrubbed.deviceNickname;
  delete scrubbed.deviceCode;
  delete scrubbed.teamId;
  delete scrubbed.lastTeamData;
  scrubbed.isRedisUnlocked = false;
  scrubbed.isGoogleDriveUnlocked = false;
  scrubbed.pushEnabled = false;
  scrubbed.pushSubscription = null;
  scrubbed.syncHistory = [];
  scrubbed.autoSyncMode = 'manual';
  scrubbed.autoSyncDebounceSeconds = 10;
  scrubbed.autoSyncIntervalMinutes = 1;

  // 2. Personal Profile Info
  delete scrubbed.userName;
  delete scrubbed.userAvatar;
  delete scrubbed.userBio;
  delete scrubbed.userTitle;
  delete scrubbed.userUniqueId;

  // 3. User's Diaries / Journals / Reflections
  scrubbed.dailyLogs = {};
  scrubbed.journalBookmarks = [];
  delete scrubbed.reflectionTemplates;
  scrubbed.autoLoadTemplateId = null;

  // 4. Sage AI Credentials & Private Conversations
  delete scrubbed.sageApiKey;
  delete scrubbed.sageApiUrl;
  scrubbed.sageModels = [];
  delete scrubbed.activeSageModelId;
  scrubbed.sageChatHistory = [];
  scrubbed.sageConversations = [];
  delete scrubbed.activeSageConversationId;
  delete scrubbed.sagePrompts;
  delete scrubbed.sagePersonalityPrompts;

  return scrubbed;
}

function isSensitiveStorageKey(key: string): boolean {
  const lower = key.toLowerCase();
  const explicitRemove = new Set([
    'scholars_dungeon_sync_code',
    'scholars_dungeon_device_nickname',
    'scholars_dungeon_device_code',
    'scholars_dungeon_webdav_password',
    'scholars_dungeon_auth',
    'scholars_dungeon_unsynced',
    'scholars_dungeon_state__backup_raw',
    'scholars_dungeon_state__corrupt_raw',
    'team_identity_code',
    'scholars_last_ws_location',
    'settings_recent_searches'
  ]);
  if (explicitRemove.has(key) || explicitRemove.has(lower)) {
    return true;
  }
  const blockedPatterns = [
    'backup',
    'corrupt',
    'auth',
    'token',
    'secret',
    'password',
    'credential',
    'device_code',
    'device_nickname',
    'team_identity',
    'webdav'
  ];
  return blockedPatterns.some((p) => lower.includes(p));
}

export function scrubExportData(dataToExport: any): any {
  const { fullLocalStorage, ...restData } = dataToExport;
  const finalData: any = scrubStateFields(restData);

  if (fullLocalStorage && typeof fullLocalStorage === 'object') {
    const safeLocal: Record<string, string> = {};
    for (const [key, val] of Object.entries(fullLocalStorage)) {
      if (isSensitiveStorageKey(key)) {
        continue;
      }
      if (key === 'scholars_dungeon_state' && typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          safeLocal[key] = JSON.stringify(scrubStateFields(parsed));
        } catch {
          // Skip malformed state
        }
      } else if (typeof val === 'string') {
        safeLocal[key] = val;
      }
    }
    finalData.fullLocalStorage = safeLocal;
  }

  return finalData;
}

