import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from '../types';
import { GoogleDriveAPI } from '../lib/googleDriveApi';
import { getSyncFingerprint } from '../utils/syncFingerprint';
import { decideCloudSyncAction } from '../utils/syncDecision';

import { getDeviceCode } from '../lib/utils';

export function useCloudSync(
  state: AppState, 
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  setDungeons: React.Dispatch<React.SetStateAction<any[]>>,
  setMajorDungeons: React.Dispatch<React.SetStateAction<any[]>>
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCooledDown, setIsCooledDown] = useState(false);
  const cooldownEndRef = useRef<number>(0);
  const [syncCheckResult, setSyncCheckResult] = useState<{
    status: 'no_save' | 'cloud_newer' | 'local_newer';
    cloudData?: any;
    code: string;
  } | null>(null);

  const [isInitialSyncCheckDone, setIsInitialSyncCheckDone] = useState(false);
  const activeSyncRequestRef = useRef<number>(0);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const stripVolatile = useCallback((dataObj: any) => {
    if (!dataObj || !dataObj.state) return dataObj;
    const { 
      lastUpdated, 
      syncHistory, 
      deviceType, 
      deviceNickname,
      deviceCode,
      pushSubscription, 
      secretCode, 
      googleDriveTokens, 
      googleDriveFileId, 
      webdavSettings, 
      syncProvider,
      isGoogleDriveUnlocked,
      isRedisUnlocked,
      ...restState 
    } = dataObj.state;
    return {
      ...dataObj,
      state: restState
    };
  }, []);

  // Invalidate any ongoing requests when provider/code is cleared (Cross-tab safety)
  useEffect(() => {
    if (!state.secretCode && !state.syncProvider && !state.googleDriveTokens && !state.webdavSettings) {
      activeSyncRequestRef.current++;
    }
  }, [state.secretCode, state.syncProvider, state.googleDriveTokens, state.webdavSettings]);

  const logSyncEvent = useCallback((
    type: 'login' | 'force_sync' | 'local_to_cloud' | 'cloud_to_local' | 'cancel_login' | 'unbind_local' | 'delete_cloud', 
    code: string,
    status: 'success' | 'failed' | 'cancelled' | 'pending' = 'success',
    error?: string,
    syncMethod?: 'Manual' | 'Immediate' | 'Interval polling' | 'Visibility API Active',
    syncProvider?: 'Redis' | 'Google Drive' | 'WebDAV'
  ) => {
    setState(prev => {
      const newHistory = [...(prev.syncHistory || [])];
      newHistory.unshift({ 
        type, 
        code, 
        status,
        error,
        timestamp: new Date().toISOString(), 
        deviceType: prev.deviceType,
        deviceNickname: prev.deviceNickname,
        deviceCode: getDeviceCode(),
        syncMethod,
        syncProvider: syncProvider || (prev.syncProvider as any) || 'Redis'
      });
      if (newHistory.length > 50) newHistory.pop();
      return { ...prev, syncHistory: newHistory };
    });
  }, [setState]);

  const syncToCloud = useCallback(async (
    forceOverwrite = false, 
    specificState?: AppState,
    syncMethod: 'Manual' | 'Immediate' | 'Interval polling' | 'Visibility API Active' = 'Manual',
    options?: { localDirtyAt?: number; onSuccess?: () => void }
  ) => {
    const currentState = specificState || state;
    
    // Safety lock: DO NOT AUTO-SYNC IF INITIAL CHECK IS PENDING! Let manual overwrites pass to break loops.
    if (!forceOverwrite && (currentState.secretCode || currentState.syncProvider) && !isInitialSyncCheckDone) {
      if (import.meta.env.DEV) console.log(`[Cloud Sync] Blocked background auto-sync before initial sync integrity verified.`);
      return;
    }

    const isGoogleDrive = currentState.syncProvider === 'Google Drive';
    const isWebDav = currentState.syncProvider === 'WebDAV';
    if (!isGoogleDrive && !isWebDav && (!currentState.secretCode || !currentState.isRedisUnlocked)) return;
    if (isGoogleDrive && !currentState.googleDriveTokens) return;
    if (isWebDav && (!currentState.webdavSettings || !currentState.webdavSettings.url || !currentState.isRedisUnlocked)) return;

    // Prevent overlapping during active verification
    if (isVerifying) return;

    const requestId = ++activeSyncRequestRef.current;
    setIsSyncing(true);
    setSyncError(null);

    // Check cool-down
    if (isCooledDown && Date.now() < cooldownEndRef.current) {
      const remaining = Math.ceil((cooldownEndRef.current - Date.now()) / 1000);
      setSyncError(`Transmissions overtaxed (429). The Astral Archives are cooling down. ${remaining}s left.`);
      setIsSyncing(false);
      return;
    } else if (isCooledDown) {
      setIsCooledDown(false);
    }

    if (!isOnline()) {
      setSyncError("Network unavailable. Please connect to the void to access archives.");
      setIsSyncing(false);
      return;
    }

    try {
      const localIdentity = currentState.deviceNickname || currentState.deviceType;

      let localData: any = {
        state: currentState,
        savedBy: localIdentity, // Metadata to identify the saving device
        savedByDeviceCode: getDeviceCode(), // Unique device identifier
        dungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]'),
        majorDungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]'),
        lastUpdated: new Date().toISOString()
      };

      const localDataToCompare = stripVolatile({
        state: currentState,
        dungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]'),
        majorDungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]')
      });

      // Ensure volatile fields are stripped before sync
      localData = stripVolatile(localData);

      if (isWebDav && currentState.webdavSettings) {
        const { url, username, password } = currentState.webdavSettings;
        
        // Ensure parent directory exists for WebDAV (prevent root pollution)
        try {
          const lastSlashIndex = url.lastIndexOf('/');
          if (lastSlashIndex !== -1) {
            const folderUrl = url.substring(0, lastSlashIndex + 1);
            await fetch('/api/webdav/proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: folderUrl, username, password, method: 'MKCOL' })
            });
          }
        } catch (e) {
          // Ignore errors, could be folder already exists
          console.warn("WebDAV folder creation check handled:", e);
        }
        
        let oldCloudData = null;
        if (!forceOverwrite) {
          // Check if cloud is newer
          const getResponse = await fetch('/api/webdav/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, username, password, method: 'GET' })
          });
          
          if (!getResponse.ok) {
            throw new Error(await getResponse.text() || 'Failed to read from WebDAV during pre-check');
          }
          
          if (getResponse.ok) {
            const result = await getResponse.json();
            if (result.data) {
              oldCloudData = result.data;
              const cloudDeviceCode = result.data.savedByDeviceCode;
              const identitiesMatch = cloudDeviceCode ? cloudDeviceCode === getDeviceCode() : (!result.data.savedBy || result.data.savedBy === localIdentity);

              const cloudDataToCompare = stripVolatile({
                state: result.data.state || result.data,
                dungeons: result.data.dungeons || [],
                majorDungeons: result.data.majorDungeons || []
              });

              const cloudFingerprint = getSyncFingerprint(cloudDataToCompare);
              const localFingerprint = getSyncFingerprint(localDataToCompare);
              const cloudTime = new Date(result.data.lastUpdated || (result.data.state && result.data.state.lastUpdated) || 0).getTime();
              const stateLastUpdatedTime = new Date(currentState.lastUpdated || 0).getTime();
              const dirtyTime = options?.localDirtyAt || 0;
              const localTime = Math.max(stateLastUpdatedTime, dirtyTime);

              const decision = decideCloudSyncAction({
                localFingerprint,
                cloudFingerprint,
                localTime,
                cloudTime,
                cloudExists: true,
                identitiesMatch,
                forceOverwrite
              });

              if (decision === 'block_cloud_newer' || decision === 'device_mismatch_conflict') {
                if (syncMethod === 'Visibility API Active') {
                   console.warn("Cloud sync aborted: " + decision);
                   setIsSyncing(false);
                   return;
                }
                setSyncCheckResult({
                    status: cloudTime > localTime ? 'cloud_newer' : 'local_newer',
                    cloudData: oldCloudData,
                    code: 'WebDAV'
                });
                setIsSyncing(false);
                return;
              }

              // Otherwise continue to write to WebDAV
            }
          }
        }
        
        // Backup WebDAV History (Non-blocking)
        if (oldCloudData && oldCloudData.lastUpdated && oldCloudData.lastUpdated !== localData.lastUpdated) {
           setTimeout(async () => {
             try {
                let historyUrl = url;
                if (historyUrl.endsWith('scholars_dungeon_save.json')) {
                    historyUrl = historyUrl.replace('scholars_dungeon_save.json', '');
                }
                if (!historyUrl.endsWith('/')) historyUrl += '/';
                historyUrl += 'scholars_dungeon_save_history.json';
                
                const historyGet = await fetch('/api/webdav/proxy', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: historyUrl, username, password, method: 'GET' })
                });
                let historyList = [];
                if (historyGet.ok) {
                  const historyRaw = await historyGet.json();
                  historyList = Array.isArray(historyRaw) ? historyRaw : [];
                }
                historyList.unshift(oldCloudData);
                historyList = historyList.slice(0, 3);
                await fetch('/api/webdav/proxy', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: historyUrl, username, password, method: 'PUT', body: historyList })
                });
             } catch (err) {
                console.error("Failed to backup WebDAV history", err);
             }
           }, 100);
        }

        // Write to WebDAV
        const payloadText = JSON.stringify({ url, username, password, method: 'PUT', body: localData });
        const payloadSize = new Blob([payloadText]).size;
        
        if (payloadSize > 3.5 * 1024 * 1024) {
          throw new Error("WebDAV sync payload is too large. Please export a backup manually or clear old local cache.");
        }

        const putResponse = await fetch('/api/webdav/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadText
        });
        
        if (putResponse.status === 429) {
          setIsCooledDown(true);
          cooldownEndRef.current = Date.now() + 60000;
          throw new Error("Transmissions overtaxed (429). The Astral Archives are cooling down. Please wait 60 seconds.");
        }

        if (!putResponse.ok) {
           throw new Error(await putResponse.text() || 'Failed to sync to WebDAV');
        }
        
        if (requestId !== activeSyncRequestRef.current) return;
        
        setState(prev => ({ 
          ...prev, 
          lastUpdated: localData.lastUpdated 
        }));
        setSyncCheckResult(null);
        logSyncEvent(forceOverwrite ? 'force_sync' : 'local_to_cloud', 'WebDAV', 'success', undefined, syncMethod, 'WebDAV');
        options?.onSuccess?.();

      } else if (isGoogleDrive && currentState.googleDriveTokens) {
        const drive = new GoogleDriveAPI(currentState.googleDriveTokens.access_token);
        
        let fileId = currentState.googleDriveFileId || await drive.findSaveFile();
        
        let oldCloudData = null;
        if (fileId && !forceOverwrite) {
          // Check if cloud is newer or identity mismatch
          const cloudData = await drive.readSaveFile(fileId);
          if (cloudData) {
            oldCloudData = cloudData;
            const cloudDeviceCode = cloudData.savedByDeviceCode;
            const identitiesMatch = cloudDeviceCode ? cloudDeviceCode === getDeviceCode() : (!cloudData.savedBy || cloudData.savedBy === localIdentity);

            const cloudDataToCompare = stripVolatile({
              state: cloudData.state || cloudData,
              dungeons: cloudData.dungeons || [],
              majorDungeons: cloudData.majorDungeons || []
            });

            const cloudFingerprint = getSyncFingerprint(cloudDataToCompare);
            const localFingerprint = getSyncFingerprint(localDataToCompare);
            const cloudTime = new Date(cloudData.lastUpdated || (cloudData.state && cloudData.state.lastUpdated) || 0).getTime();
            const stateLastUpdatedTime = new Date(currentState.lastUpdated || 0).getTime();
            const dirtyTime = options?.localDirtyAt || 0;
            const localTime = Math.max(stateLastUpdatedTime, dirtyTime);

            const decision = decideCloudSyncAction({
              localFingerprint,
              cloudFingerprint,
              localTime,
              cloudTime,
              cloudExists: true,
              identitiesMatch,
              forceOverwrite
            });

            if (decision === 'block_cloud_newer' || decision === 'device_mismatch_conflict') {
              if (syncMethod === 'Visibility API Active') {
                console.warn("Cloud sync aborted: " + decision);
                setIsSyncing(false);
                return;
              }
              setSyncCheckResult({
                  status: cloudTime > localTime ? 'cloud_newer' : 'local_newer', 
                  cloudData,
                  code: 'Google Drive Auth'
              });
              setIsSyncing(false);
              return;
            }

            // Otherwise continue to write to Google Drive
          }
        }

        // Backup Drive History (Non-blocking)
        if (oldCloudData && oldCloudData.lastUpdated && oldCloudData.lastUpdated !== localData.lastUpdated) {
          setTimeout(async () => {
            try {
              const historyId = await drive.findFileByName('scholars_dungeon_save_history.json');
              let historyList = [];
              if (historyId) {
                const historyRaw = await drive.readSaveFile(historyId);
                historyList = Array.isArray(historyRaw) ? historyRaw : [];
              }
              historyList.unshift(oldCloudData);
              historyList = historyList.slice(0, 3);
              if (historyId) {
                await drive.updateSaveFile(historyId, historyList);
              } else {
                await drive.createFileByName('scholars_dungeon_save_history.json', historyList);
              }
            } catch (err) {
              console.error("Failed to backup Drive history", err);
            }
          }, 100);
        }

        if (fileId) {
          await drive.updateSaveFile(fileId, localData);
        } else {
          fileId = await drive.createSaveFile(localData);
        }
        
        if (requestId !== activeSyncRequestRef.current) return;

        setState(prev => ({ 
          ...prev, 
          lastUpdated: localData.lastUpdated,
          googleDriveFileId: fileId 
        }));
        setSyncCheckResult(null);
        logSyncEvent(forceOverwrite ? 'force_sync' : 'local_to_cloud', 'Google Drive', 'success', undefined, syncMethod, 'Google Drive');
        options?.onSuccess?.();

      } else {
        let backendForceOverwrite = forceOverwrite;
        // Redis
        if (!forceOverwrite) {
          // Fetch first to check identity
          const getResponse = await fetch('/api/sync/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secretCode: currentState.secretCode })
          });
          
          if (getResponse.status === 429) {
            setIsCooledDown(true);
            cooldownEndRef.current = Date.now() + 60000;
            throw new Error("Transmissions overtaxed (429). The Astral Archives are cooling down. Please wait 60 seconds.");
          }

          if (!getResponse.ok) {
            throw new Error(await getResponse.text() || 'Failed to read from Redis during pre-check');
          }

          if (getResponse.ok) {
            const data = await getResponse.json();
            if (data.cloudData) {
              const cloudDeviceCode = data.cloudData.savedByDeviceCode;
              const identitiesMatch = cloudDeviceCode ? cloudDeviceCode === getDeviceCode() : (!data.cloudData.savedBy || data.cloudData.savedBy === localIdentity);

              const cloudDataToCompare = stripVolatile({
                state: data.cloudData.state || data.cloudData,
                dungeons: data.cloudData.dungeons || [],
                majorDungeons: data.cloudData.majorDungeons || []
              });

              const cloudFingerprint = getSyncFingerprint(cloudDataToCompare);
              const localFingerprint = getSyncFingerprint(localDataToCompare);
              const cloudTime = new Date(data.cloudData.lastUpdated || (data.cloudData.state && data.cloudData.state.lastUpdated) || 0).getTime();
              const stateLastUpdatedTime = new Date(currentState.lastUpdated || 0).getTime();
              const dirtyTime = options?.localDirtyAt || 0;
              const localTime = Math.max(stateLastUpdatedTime, dirtyTime);

              const decision = decideCloudSyncAction({
                localFingerprint,
                cloudFingerprint,
                localTime,
                cloudTime,
                cloudExists: true,
                identitiesMatch,
                forceOverwrite
              });

              if (decision === 'block_cloud_newer' || decision === 'device_mismatch_conflict') {
                if (syncMethod === 'Visibility API Active') {
                   console.warn("Cloud sync aborted: " + decision);
                   setIsSyncing(false);
                   return;
                }
                setSyncCheckResult({
                  status: cloudTime > localTime ? 'cloud_newer' : 'local_newer', // Conflict
                  cloudData: data.cloudData,
                  code: currentState.secretCode!
                });
                setIsSyncing(false);
                return;
              }

              if (decision === 'silent_upload') {
                 backendForceOverwrite = true;
              }
              // Otherwise continue to write to Redis
            }
          }
        }

        const payload = {
          secretCode: currentState.secretCode,
          localData,
          forceOverwrite: backendForceOverwrite
        };

        const response = await fetch('/api/sync/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          setIsCooledDown(true);
          cooldownEndRef.current = Date.now() + 60000; // 60s cooldown
          throw new Error("Transmissions overtaxed (429). The Astral Archives are cooling down. Please wait 60 seconds.");
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Server returned non-JSON response (${response.status}).`);
        }

        const data = await response.json();

        if (response.status === 409) {
          if (requestId === activeSyncRequestRef.current) {
            setSyncCheckResult({
              status: 'cloud_newer',
              cloudData: data.cloudData,
              code: currentState.secretCode!
            });
          }
        } else if (!response.ok) {
          throw new Error(data.error || 'Failed to sync');
        } else {
          if (requestId === activeSyncRequestRef.current) {
            setState(prev => ({ ...prev, lastUpdated: data.cloudData.lastUpdated }));
            setSyncCheckResult(null);
            logSyncEvent(forceOverwrite ? 'force_sync' : 'local_to_cloud', currentState.secretCode!, 'success', undefined, syncMethod, 'Redis');
            options?.onSuccess?.();
          }
        }
      }
    } catch (err: any) {
      if (requestId === activeSyncRequestRef.current) {
        setSyncError(err.message);
        const prov = currentState.syncProvider || 'Redis';
        const code = prov === 'WebDAV' ? 'WebDAV' : (prov === 'Google Drive' ? 'Google Drive' : (currentState.secretCode || 'Unknown'));
        logSyncEvent(forceOverwrite ? 'force_sync' : 'local_to_cloud', code, 'failed', err.message, syncMethod, prov);
      }
    } finally {
      if (requestId === activeSyncRequestRef.current) {
        setIsSyncing(false);
      }
    }
  }, [state, setState, logSyncEvent, isVerifying, stripVolatile, isInitialSyncCheckDone, isCooledDown, isSyncing]);

  const resolveConflict = useCallback(async (useCloud: boolean) => {
    if (!syncCheckResult) return;

    setIsSyncing(true);
    try {
      if (useCloud && syncCheckResult.cloudData) {
        if (syncCheckResult.cloudData.fullLocalStorage) {
          Object.keys(syncCheckResult.cloudData.fullLocalStorage).forEach(key => {
            // Avoid overwriting specific local settings in localStorage if they already exist
            if (key === 'scholars_dungeon_state') {
                const cloudStateRaw = syncCheckResult.cloudData.fullLocalStorage[key];
                const cloudState = JSON.parse(cloudStateRaw);
                const localStateRaw = localStorage.getItem('scholars_dungeon_state');
                const localState = localStateRaw ? JSON.parse(localStateRaw) : state;
                
                const mergedState = {
                    ...cloudState,
                    // Preserve local identity/sync settings
                    deviceNickname: localState.deviceNickname || cloudState.deviceNickname,
                    deviceCode: cloudState.deviceCode || syncCheckResult.cloudData.savedByDeviceCode || getDeviceCode(),
                    secretCode: localState.secretCode || cloudState.secretCode,
                    syncProvider: localState.syncProvider || cloudState.syncProvider,
                    googleDriveTokens: localState.googleDriveTokens || cloudState.googleDriveTokens,
                    googleDriveFileId: localState.googleDriveFileId || cloudState.googleDriveFileId,
                    webdavSettings: localState.webdavSettings || cloudState.webdavSettings,
                    isGoogleDriveUnlocked: localState.isGoogleDriveUnlocked || cloudState.isGoogleDriveUnlocked,
                    isRedisUnlocked: localState.isRedisUnlocked || cloudState.isRedisUnlocked
                };
                localStorage.setItem(key, JSON.stringify(mergedState));
            } else if (key !== 'scholars_dungeon_device_code') {
                localStorage.setItem(key, syncCheckResult.cloudData.fullLocalStorage[key]);
            }
          });
        } else {
          localStorage.setItem('scholars_dungeon_state', JSON.stringify({
              ...syncCheckResult.cloudData.state,
              deviceNickname: state.deviceNickname || syncCheckResult.cloudData.state.deviceNickname,
              deviceCode: syncCheckResult.cloudData.state.deviceCode || syncCheckResult.cloudData.savedByDeviceCode || getDeviceCode(),
              secretCode: state.secretCode || syncCheckResult.cloudData.state.secretCode,
              syncProvider: state.syncProvider || syncCheckResult.cloudData.state.syncProvider,
              googleDriveTokens: state.googleDriveTokens || syncCheckResult.cloudData.state.googleDriveTokens,
              webdavSettings: state.webdavSettings || syncCheckResult.cloudData.state.webdavSettings
          }));
          localStorage.setItem('scholars_dungeon_state_dungeons', JSON.stringify(syncCheckResult.cloudData.dungeons));
          localStorage.setItem('scholars_dungeon_state_major_dungeons', JSON.stringify(syncCheckResult.cloudData.majorDungeons));
        }

        const mergedState = {
            ...syncCheckResult.cloudData.state,
            deviceNickname: state.deviceNickname || syncCheckResult.cloudData.state.deviceNickname,
            deviceCode: syncCheckResult.cloudData.state.deviceCode || syncCheckResult.cloudData.savedByDeviceCode || getDeviceCode(),
            secretCode: (syncCheckResult.code !== 'WebDAV' && syncCheckResult.code !== 'GoogleDrive' && syncCheckResult.code !== 'GoogleDriveAuth') 
                ? syncCheckResult.code 
                : (state.secretCode || syncCheckResult.cloudData.state.secretCode),
            syncProvider: syncCheckResult.code === 'WebDAV' 
                ? 'WebDAV' 
                : (syncCheckResult.code === 'GoogleDrive' || syncCheckResult.code === 'GoogleDriveAuth') 
                    ? 'Google Drive' 
                    : 'Redis',
            googleDriveTokens: state.googleDriveTokens || syncCheckResult.cloudData.state.googleDriveTokens,
            googleDriveFileId: state.googleDriveFileId || syncCheckResult.cloudData.state.googleDriveFileId,
            webdavSettings: state.webdavSettings || syncCheckResult.cloudData.state.webdavSettings,
            isGoogleDriveUnlocked: state.isGoogleDriveUnlocked || syncCheckResult.cloudData.state.isGoogleDriveUnlocked,
            isRedisUnlocked: state.isRedisUnlocked || syncCheckResult.cloudData.state.isRedisUnlocked
        };

        const newDeviceCode = syncCheckResult.cloudData.state?.deviceCode || syncCheckResult.cloudData?.savedByDeviceCode;
        if (newDeviceCode) {
            localStorage.setItem('scholars_dungeon_device_code', newDeviceCode);
        }

        setState(mergedState);
        setDungeons(syncCheckResult.cloudData.dungeons);
        setMajorDungeons(syncCheckResult.cloudData.majorDungeons);
        
        logSyncEvent('cloud_to_local', syncCheckResult.code, 'success');

        await syncToCloud(true, mergedState, 'Immediate');
      } else if (!useCloud) {
        const isProviderCode = syncCheckResult.code === 'WebDAV' || syncCheckResult.code === 'GoogleDrive' || syncCheckResult.code === 'GoogleDriveAuth';
        const newSecretCode = isProviderCode ? state.secretCode : syncCheckResult.code;
        const newSyncProvider = syncCheckResult.code === 'WebDAV' ? 'WebDAV' : (syncCheckResult.code === 'GoogleDrive' || syncCheckResult.code === 'GoogleDriveAuth' ? 'Google Drive' : 'Redis');
        
        setState(prev => ({ 
          ...prev, 
          secretCode: newSecretCode,
          syncProvider: newSyncProvider
        }));
        await syncToCloud(true, { ...state, secretCode: newSecretCode, syncProvider: newSyncProvider }, 'Manual');
      }
      setSyncCheckResult(null);
      setIsInitialSyncCheckDone(true);
    } finally {
      setIsSyncing(false);
    }
  }, [syncCheckResult, setState, setDungeons, setMajorDungeons, syncToCloud, state, logSyncEvent]);

  const fetchFromCloud = useCallback(async (code: string) => {
    const requestId = ++activeSyncRequestRef.current;
    setIsSyncing(true);
    setSyncError(null);

    // Check cool-down
    if (isCooledDown && Date.now() < cooldownEndRef.current) {
      const remaining = Math.ceil((cooldownEndRef.current - Date.now()) / 1000);
      setSyncError(`Transmissions overtaxed (429). The Astral Archives are cooling down. ${remaining}s left.`);
      setIsSyncing(false);
      return;
    } else if (isCooledDown) {
      setIsCooledDown(false);
    }

    setIsVerifying(false);
    setSyncCheckResult(null);

    if (!isOnline()) {
      setSyncError("Network unavailable. Please connect to the void to access archives.");
      setIsSyncing(false);
      return;
    }

    try {
      let cloudDataToProcess: any = null;

      if (code === 'GoogleDrive' && state.googleDriveTokens) {
        const drive = new GoogleDriveAPI(state.googleDriveTokens.access_token);
        const fileId = state.googleDriveFileId || await drive.findSaveFile();
        if (fileId) {
           cloudDataToProcess = await drive.readSaveFile(fileId);
        }
      } else if (code === 'WebDAV' && state.webdavSettings) {
        const { url, username, password } = state.webdavSettings;
        const response = await fetch('/api/webdav/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, username, password, method: 'GET' })
        });
        if (response.ok) {
            const result = await response.json();
            if (!result.is404 && result.data) {
                cloudDataToProcess = result.data;
            }
        }
      } else {
        // Redis
        const response = await fetch('/api/sync/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ secretCode: code })
        });

        if (response.status === 429) {
          setIsCooledDown(true);
          cooldownEndRef.current = Date.now() + 60000;
          throw new Error("Transmissions overtaxed (429). The Astral Archives are cooling down. Please wait 60 seconds.");
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response received:', text);
          throw new Error(`Server returned non-JSON response (${response.status}).`);
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch from cloud');
        }
        cloudDataToProcess = data.cloudData;
      }

      // Check if request is still active
      if (requestId !== activeSyncRequestRef.current) return;

      // ENTER VERIFICATION PHASE
      setIsVerifying(true);
      await delay(1500); // Artificial delay to simulate thorough checking
      
      // Check again after delay
      if (requestId !== activeSyncRequestRef.current) return;

      if (cloudDataToProcess) {
        logSyncEvent('login', code, 'success', undefined, 'Manual');
        const cloudTime = new Date(cloudDataToProcess.lastUpdated || (cloudDataToProcess.state && cloudDataToProcess.state.lastUpdated) || 0).getTime();
        const localTime = new Date(state.lastUpdated || 0).getTime();

        const localDataToCompare = stripVolatile({
          state: state,
          dungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]'),
          majorDungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]')
        });
        
        const cloudDataToCompare = stripVolatile({
          state: cloudDataToProcess.state,
          dungeons: cloudDataToProcess.dungeons || [],
          majorDungeons: cloudDataToProcess.majorDungeons || []
        });

        const localIdentity = state.deviceNickname || state.deviceType;
        const cloudDeviceCode = cloudDataToProcess.savedByDeviceCode;
        const identitiesMatch = cloudDeviceCode ? cloudDeviceCode === getDeviceCode() : (!cloudDataToProcess.savedBy || cloudDataToProcess.savedBy === localIdentity);

        const localFingerprint = getSyncFingerprint(localDataToCompare);
        const cloudFingerprint = getSyncFingerprint(cloudDataToCompare);

        const decision = decideCloudSyncAction({
          localFingerprint,
          cloudFingerprint,
          localTime,
          cloudTime,
          cloudExists: true,
          identitiesMatch,
          forceOverwrite: false // it's just check
        });

        if (decision === 'silent_upload') {
          const isProviderCode = code === 'WebDAV' || code === 'GoogleDrive' || code === 'GoogleDriveAuth';
          setState(prev => ({ 
            ...prev, 
            lastUpdated: cloudDataToProcess.lastUpdated, 
            secretCode: !isProviderCode ? code : prev.secretCode,
            syncProvider: (code === 'WebDAV') ? 'WebDAV' : ((code === 'GoogleDrive' || code === 'GoogleDriveAuth') ? 'Google Drive' : 'Redis')
          }));
          setSyncCheckResult(null);
          setIsVerifying(false); 
          return;
        }

        if (decision === 'block_cloud_newer' || decision === 'device_mismatch_conflict') {
          setSyncCheckResult({ status: cloudTime > localTime ? 'cloud_newer' : 'local_newer', cloudData: cloudDataToProcess, code });
        } else {
          // fetchFromCloud is always user-initiated, thus we can show local_newer
          setSyncCheckResult({ status: 'local_newer', cloudData: cloudDataToProcess, code });
        }
      } else {
        logSyncEvent('login', code, 'success', undefined, 'Manual');
        setSyncCheckResult({ status: 'no_save', code });
      }
    } catch (err: any) {
      if (requestId === activeSyncRequestRef.current) {
        setSyncError(err.message);
        logSyncEvent('login', code, 'failed', err.message, 'Manual');
      }
    } finally {
      if (requestId === activeSyncRequestRef.current) {
        setIsSyncing(false);
        setIsVerifying(false);
      }
    }
  }, [state, logSyncEvent, stripVolatile, setState, isCooledDown, isInitialSyncCheckDone, isSyncing, isVerifying]);

  const checkCloudSync = useCallback(async (forceModal = false, isStartup = false) => {
    const isGoogleDrive = state.syncProvider === 'Google Drive';
    const isWebDav = state.syncProvider === 'WebDAV';

    if (!isGoogleDrive && !isWebDav && (!state.secretCode || !state.isRedisUnlocked)) return;
    if (isGoogleDrive && !state.googleDriveTokens) return;
    if (isWebDav && (!state.webdavSettings || !state.webdavSettings.url || !state.isRedisUnlocked)) return;

    // Prevent overlapping sync operations
    if (isSyncing || isVerifying) return;

    const requestId = ++activeSyncRequestRef.current;
    setIsSyncing(true);
    setSyncError(null);

    // Check cool-down
    if (isCooledDown && Date.now() < cooldownEndRef.current) {
      const remaining = Math.ceil((cooldownEndRef.current - Date.now()) / 1000);
      setSyncError(`Transmissions overtaxed (429). The Astral Archives are cooling down. ${remaining}s left.`);
      setIsSyncing(false);
      return;
    } else if (isCooledDown) {
      setIsCooledDown(false);
    }

    setIsVerifying(false);

    if (!isOnline()) {
      // For silent checks, we might want to be less intrusive, but the user requested a reminder.
      setSyncError("Network unavailable. Please connect to the void to access archives.");
      setIsSyncing(false);
      return;
    }

    const checkNewer = async (data: any, code: string) => {
        if (!data) {
            if (forceModal) setSyncCheckResult({ status: 'no_save', code });
            if (isStartup) setIsInitialSyncCheckDone(true);
            return;
        }
        
        const cloudTime = new Date(data.lastUpdated || (data.state && data.state.lastUpdated) || 0).getTime();
        const localTime = new Date(state.lastUpdated || 0).getTime();

        const localDataToCompare = stripVolatile({
          state: state,
          dungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]'),
          majorDungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]')
        });
        
        const cloudDataToCompare = stripVolatile({
          state: data.state,
          dungeons: data.dungeons || [],
          majorDungeons: data.majorDungeons || []
        });

        const localIdentity = state.deviceNickname || state.deviceType;
        const cloudDeviceCode = data.savedByDeviceCode;
        const identitiesMatch = cloudDeviceCode ? cloudDeviceCode === getDeviceCode() : (!data.savedBy || data.savedBy === localIdentity);

        const localFingerprint = getSyncFingerprint(localDataToCompare);
        const cloudFingerprint = getSyncFingerprint(cloudDataToCompare);

        const decision = decideCloudSyncAction({
          localFingerprint,
          cloudFingerprint,
          localTime,
          cloudTime,
          cloudExists: true,
          identitiesMatch,
          forceOverwrite: false // it's just check
        });

        // If exact data match, we can silently refresh local identity by not showing modal
        if (localFingerprint === cloudFingerprint && !forceModal) {
          const isProviderCode = code === 'WebDAV' || code === 'GoogleDrive' || code === 'GoogleDriveAuth';
          setState(prev => ({ 
            ...prev, 
            lastUpdated: data.lastUpdated || (data.state && data.state.lastUpdated), 
            secretCode: !isProviderCode ? code : prev.secretCode,
            syncProvider: (code === 'WebDAV') ? 'WebDAV' : ((code === 'GoogleDrive' || code === 'GoogleDriveAuth') ? 'Google Drive' : 'Redis')
          }));
          setSyncCheckResult(null);
          setIsVerifying(false);
          setIsSyncing(false);
          if (isStartup || !forceModal) setIsInitialSyncCheckDone(true);
          return;
        }

        // ENTER VERIFICATION PHASE ONLY FOR CONFLICTS
        setIsVerifying(true);
        await delay(1200); // Artificial delay to simulate thorough checking

        if (requestId !== activeSyncRequestRef.current) return;

        if (decision === 'block_cloud_newer' || decision === 'device_mismatch_conflict') {
          setSyncCheckResult({ status: cloudTime > localTime ? 'cloud_newer' : 'local_newer', cloudData: data, code });
        } else if (forceModal) {
          setSyncCheckResult({ status: 'local_newer', cloudData: data, code });
        } else {
          setSyncCheckResult(null);
          setIsVerifying(false);
          setIsSyncing(false);
          if (isStartup || !forceModal) setIsInitialSyncCheckDone(true);
        }
    };

    try {
      if (isWebDav && state.webdavSettings) {
        const { url, username, password } = state.webdavSettings;
        const response = await fetch('/api/webdav/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, username, password, method: 'GET' })
        });
        if (response.ok) {
            const result = await response.json();
            if (result.is404 || !result.data) {
                if (forceModal) setSyncCheckResult({ status: 'no_save', code: 'WebDAV' });
                if (isStartup || !forceModal) setIsInitialSyncCheckDone(true);
            } else {
                await checkNewer(result.data, 'WebDAV');
            }
        } else {
            throw new Error(await response.text() || 'Failed to fetch from WebDAV');
        }
      } else if (isGoogleDrive && state.googleDriveTokens) {
        const drive = new GoogleDriveAPI(state.googleDriveTokens.access_token);
        const fileId = state.googleDriveFileId || await drive.findSaveFile();
        if (fileId) {
            const result = await drive.readSaveFile(fileId);
            await checkNewer(result, 'GoogleDrive');
        } else {
            if (forceModal) setSyncCheckResult({ status: 'no_save', code: 'GoogleDrive' });
            if (isStartup || !forceModal) setIsInitialSyncCheckDone(true);
        }
      } else if (state.secretCode) {
        // Redis
        const response = await fetch('/api/sync/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secretCode: state.secretCode })
        });

        if (response.status === 429) {
          setIsCooledDown(true);
          cooldownEndRef.current = Date.now() + 60000;
          throw new Error("Transmissions overtaxed (429). The Astral Archives are cooling down. Please wait 60 seconds.");
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Server returned non-JSON response (${response.status}).`);
        }
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch from cloud');
        }
        if (data.cloudData) {
            await checkNewer(data.cloudData, state.secretCode);
        } else {
            if (forceModal) setSyncCheckResult({ status: 'no_save', code: state.secretCode });
            if (isStartup || !forceModal) setIsInitialSyncCheckDone(true);
        }
      }
    } catch (err: any) {
      setSyncError(err.message);
      const prov = state.syncProvider || 'Redis';
      const code = prov === 'WebDAV' ? 'WebDAV' : (prov === 'Google Drive' ? 'Google Drive' : (state.secretCode || 'Unknown'));
      logSyncEvent('force_sync', code, 'failed', err.message, 'Manual', prov);
    } finally {
      if (requestId === activeSyncRequestRef.current) {
        setIsSyncing(false);
        setIsVerifying(false);
      }
    }
  }, [state, logSyncEvent, setState, stripVolatile, isSyncing, isVerifying, isCooledDown, isInitialSyncCheckDone]);

  const unbindFromCloud = useCallback(() => {
    activeSyncRequestRef.current++; // Invalidate any pending requests
    const provider = state.syncProvider || 'Redis';
    const code = state.secretCode || (provider === 'Google Drive' ? 'Google' : 'WebDAV');
    logSyncEvent('unbind_local', code, 'success', undefined, 'Manual', provider);
    
    // Clear ephemeral sync states
    setSyncCheckResult(null);
    setSyncError(null);
    setIsSyncing(false);
    setIsVerifying(false);
    setIsInitialSyncCheckDone(true);
    
    if (state.secretCode && state.pushEnabled) {
      fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode: state.secretCode, subscription: null })
      }).catch(err => console.debug("Push cancel skipped or failed:", err));
    }

    setState(prev => {
      const newState = { ...prev };
      delete newState.secretCode;
      delete newState.syncProvider;
      delete newState.googleDriveTokens;
      delete newState.googleDriveFileId;
      delete newState.webdavSettings;
      newState.pushEnabled = false;
      return newState;
    });
  }, [setState, state.secretCode, state.syncProvider, state.pushEnabled, logSyncEvent]);

  const deleteCloudData = useCallback(async () => {
    if (!state.secretCode) return;
    const code = state.secretCode;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch('/api/sync/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secretCode: code })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text);
        throw new Error(`Server returned non-JSON response (${response.status}).`);
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete cloud data');
      }
      logSyncEvent('delete_cloud', code, 'success', undefined, 'Manual');
      unbindFromCloud();
    } catch (err: any) {
      setSyncError(err.message);
      logSyncEvent('delete_cloud', code, 'failed', err.message, 'Manual');
    } finally {
      setIsSyncing(false);
    }
  }, [state.secretCode, unbindFromCloud, logSyncEvent]);

  return {
    isSyncing,
    isVerifying,
    syncError,
    setSyncError,
    syncCheckResult,
    setSyncCheckResult,
    syncToCloud,
    resolveConflict,
    fetchFromCloud,
    unbindFromCloud,
    deleteCloudData,
    logSyncEvent,
    checkCloudSync,
    setIsSyncing,
    setIsVerifying,
    isInitialSyncCheckDone
  };
}

const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};
