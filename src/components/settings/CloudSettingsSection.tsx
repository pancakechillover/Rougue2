import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, Server, HardDrive, CheckCircle2, ChevronRight, Settings, Lock, X, History, ArrowDownUp, RefreshCw, LogIn, Trash2, ShieldBan, Eye, Search, UploadCloud, DownloadCloud, Download, Laptop, Monitor, Smartphone, Tablet, Copy, Key, WifiOff, Users, Database } from 'lucide-react';
import { AppState } from '../../types';
import { cn, getDeviceCode } from '../../lib/utils';
import { ConfirmModal } from '../ConfirmModal';
import { CloudHistoryModal } from './CloudHistoryModal';

interface CloudSettingsSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setActiveSection: (sec: any) => void;
  onOpenAstralArchives: () => void;
  triggerSyncCheck?: (forceModal?: boolean) => void;
  isSyncing?: boolean;
  hasUnsyncedChanges?: boolean;
}

export const CloudSettingsSection: React.FC<CloudSettingsSectionProps> = ({
  state,
  setState,
  setActiveSection,
  onOpenAstralArchives,
  triggerSyncCheck,
  isSyncing,
  hasUnsyncedChanges
}) => {
  const syncMode = state.autoSyncMode || 'manual';
  const debounceSeconds = state.autoSyncDebounceSeconds || 10;
  const intervalMinutes = state.autoSyncIntervalMinutes || 1;

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<'redis' | 'google' | 'webdav' | null>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [stats, setStats] = useState<{ users: number, maxUsers: number, teams: number, maxTeams: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: React.ReactNode; type?: 'danger'|'warning'|'info'; isAlert?: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const customAlert = (message: string, title = 'Notification') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: true, type: 'info' });
  };

  const [localBackups, setLocalBackups] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('scholars_dungeon_local_backups') || '[]');
    } catch {
      return [];
    }
  });

  const createLocalBackup = () => {
    try {
      const stateData = JSON.parse(localStorage.getItem('scholars_dungeon_state') || '{}');
      const dungeons = JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]');
      const majorDungeons = JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]');
      
      const newBackup = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: stateData.level || 1,
        coins: stateData.coins || 0,
        state: stateData,
        dungeons,
        majorDungeons
      };
      
      const updatedBackups = [newBackup, ...localBackups].slice(0, 10);
      setLocalBackups(updatedBackups);
      localStorage.setItem('scholars_dungeon_local_backups', JSON.stringify(updatedBackups));
      
      customAlert('Local snapshot created successfully.', 'Snapshot Saved');
    } catch (e) {
      console.error(e);
      customAlert('Failed to create local snapshot.', 'Error');
    }
  };

  const restoreLocalBackup = (backup: any) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restore Local Snapshot?',
      message: (
        <div className="mt-2 space-y-4 text-left">
          <p className="text-slate-400 text-sm leading-relaxed">
            This will replace your current active game profile with this snapshot. Please compare the data below:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-2xl rounded-full -mr-8 -mt-8" />
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-1.5">
                <Cloud size={12} /> Current / Cloud Save
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-200">Level {state.level || 1}</div>
                <div className="text-xs text-amber-500/90 font-mono">{state.coins || 0} Coins</div>
                <div className="text-[9px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800">
                  {new Date(state.lastUpdated || Date.now()).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-2xl rounded-full -mr-8 -mt-8" />
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
                <Database size={12} /> Snapshot
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-200">Level {backup.level}</div>
                <div className="text-xs text-amber-500/90 font-mono">{backup.coins} Coins</div>
                <div className="text-[9px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800">
                  {new Date(backup.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <p className="text-rose-400 text-xs font-bold uppercase tracking-widest bg-rose-500/10 inline-block px-3 py-1.5 rounded-lg border border-rose-500/20">
            This action cannot be reversed. Are you sure?
          </p>
        </div>
      ),
      isAlert: false,
      type: 'danger',
      onConfirm: () => {
        localStorage.setItem('scholars_dungeon_state', JSON.stringify({ ...backup.state, deviceCode: getDeviceCode() }));
        if (backup.dungeons) localStorage.setItem('scholars_dungeon_state_dungeons', JSON.stringify(backup.dungeons));
        if (backup.majorDungeons) localStorage.setItem('scholars_dungeon_state_major_dungeons', JSON.stringify(backup.majorDungeons));
        window.location.reload();
      }
    });
  };

  const deleteLocalBackup = (id: string) => {
    const updated = localBackups.filter(b => b.id !== id);
    setLocalBackups(updated);
    localStorage.setItem('scholars_dungeon_local_backups', JSON.stringify(updated));
  };

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
         if (!data.error) setStats(data);
      })
      .catch(e => console.error("Could not fetch stats", e));
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin strictly matches the current application location
      const origin = event.origin;
      if (origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        const tokens = event.data.tokens;
        setState(s => ({
          ...s,
          syncProvider: 'Google Drive',
          googleDriveTokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + (tokens.expires_in * 1000)
          }
        }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setState]);

  const [localNickname, setLocalNickname] = useState(state.deviceNickname || '');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleSaveNickname = () => {
    setState(s => ({ ...s, deviceNickname: localNickname }));
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);
  };

  const handleRedisClick = () => {
    if (state.isRedisUnlocked) {
      onOpenAstralArchives();
    } else {
      setUnlockTarget('redis');
      setShowUnlockModal(true);
    }
  };

  const startGoogleAuth = async () => {
    try {
      const origin = encodeURIComponent(window.location.origin);
      const response = await fetch(`/api/auth/google/url?origin=${origin}`);
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        customAlert('Please allow popups for this site to connect your Google Drive account.', 'Popup Blocked');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      customAlert('Failed to connect to Google Drive.', 'OAuth Error');
    }
  };

  const handleGoogleDriveClick = async () => {
    if (state.googleDriveTokens) {
      // Already connected. Provide management in future expansions
      return;
    }
    
    if (!state.isGoogleDriveUnlocked) {
      setUnlockTarget('google');
      setShowUnlockModal(true);
      return;
    }
    
    await startGoogleAuth();
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setUnlockError('');
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlockPassword })
      });
      if (!res.ok) {
        setUnlockError('Invalid password');
        setIsUnlocking(false);
        return;
      }
    } catch (err) {
      setUnlockError('Verification failed');
      setIsUnlocking(false);
      return;
    }

    setIsUnlocking(false);
    setUnlockPassword('');
    if (unlockTarget === 'redis') {
      setState(s => ({ ...s, isRedisUnlocked: true }));
      setShowUnlockModal(false);
      setUnlockTarget(null);
      onOpenAstralArchives();
    } else if (unlockTarget === 'google') {
      setState(s => ({ ...s, isGoogleDriveUnlocked: true }));
      setShowUnlockModal(false);
      setUnlockTarget(null);
      await startGoogleAuth();
    }
  };

  const [webdavUrl, setWebdavUrl] = useState(state.webdavSettings?.url || '');
  const [webdavUser, setWebdavUser] = useState(state.webdavSettings?.username || '');
  const [webdavPass, setWebdavPass] = useState(state.webdavSettings?.password || '');
  const [webdavChecking, setWebdavChecking] = useState(false);
  const [webdavCheckError, setWebdavCheckError] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleWebdavConnection = async () => {
    if (!webdavUrl || !webdavUser || !webdavPass) {
      setWebdavCheckError('URL, Username and Password are required.');
      return;
    }

    // Validation for local paths which users often mistakenly enter
    if (webdavUrl.includes('\\') || webdavUrl.match(/^[a-zA-Z]:/)) {
        setWebdavCheckError('Please enter a WebDAV URL (starting with https://), not a local file path (C:\\Users\\...). For Jianguoyun, it is usually https://dav.jianguoyun.com/dav/');
        return;
    }

    if (!webdavUrl.startsWith('http')) {
        setWebdavCheckError('URL must start with http:// or https://');
        return;
    }

    let targetUrl = webdavUrl;
    if (!targetUrl.endsWith('.json')) {
      if (!targetUrl.endsWith('/')) targetUrl += '/';
      
      // Ensure it goes into the SCHOLARS DUNGEON subfolder to avoid root directory pollution
      const folderName = 'SCHOLARS DUNGEON';
      if (!targetUrl.toUpperCase().includes(folderName.toUpperCase())) {
          targetUrl += encodeURIComponent(folderName) + '/';
      }
      
      targetUrl += 'scholars_dungeon_save.json';
    }

    setWebdavChecking(true);
    setWebdavCheckError('');
    try {
        // Verification delay to simulate thorough checking as requested
        await new Promise(resolve => setTimeout(resolve, 2000));

        const lastSlashIndex = targetUrl.lastIndexOf('/');
        const folderUrl = lastSlashIndex !== -1 ? targetUrl.substring(0, lastSlashIndex + 1) : targetUrl;

        let response = await fetch('/api/webdav/proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: folderUrl,
            username: webdavUser,
            password: webdavPass,
            method: 'PROPFIND'
        })
        });
        
        let responseText = await response.text();
        let serverStatus = response.status;
        
        if (response.ok) {
           try {
             const json = JSON.parse(responseText);
             if (json.status !== undefined) {
               serverStatus = json.status;
             }
           } catch { }
        }

        // Folder 404 means the container or path is correct, but folder itself doesn't exist yet. Let's create it via MKCOL!
        if (serverStatus === 404) {
            const mkcolResponse = await fetch('/api/webdav/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: folderUrl,
                    username: webdavUser,
                    password: webdavPass,
                    method: 'MKCOL'
                })
            });
            const mkcolText = await mkcolResponse.text();
            let mkcolStatus = mkcolResponse.status;
            if (mkcolResponse.ok) {
                try {
                    const json = JSON.parse(mkcolText);
                    if (json.status !== undefined) {
                        mkcolStatus = json.status;
                    }
                } catch { }
            }
            
            // Success responses for MKCOL include 201, 200, 204, 405 (already exists), or 409 (already exists)
            if ([200, 201, 204, 405, 409].includes(mkcolStatus)) {
                serverStatus = 200;
            } else {
                let errMsg = mkcolText;
                try {
                    const json = JSON.parse(mkcolText);
                    if (json.error) errMsg = json.error;
                } catch { }

                if (mkcolStatus === 401 || mkcolStatus === 403) {
                    errMsg = 'Username, password, or permissions are incorrect. Please check your credentials.';
                } else if (mkcolStatus >= 500) {
                    errMsg = `WebDAV server or service error (${mkcolStatus}). Please try again later.`;
                } else {
                    errMsg = errMsg ? `WebDAV error: ${errMsg}` : `WebDAV server returned status ${mkcolStatus}`;
                }
                throw new Error(errMsg);
            }
        } else {
            // Check status against allowed successful statuses for PROPFIND: 200, 204, 207, 405, 409
            const isSuccessfulStatus = [200, 204, 207, 405, 409].includes(serverStatus);
            if (!isSuccessfulStatus) {
                let errMsg = responseText;
                try {
                    const json = JSON.parse(responseText);
                    if (json.error) errMsg = json.error;
                } catch { }

                if (serverStatus === 401 || serverStatus === 403) {
                    errMsg = 'Username, password, or permissions are incorrect. Please check your credentials.';
                } else if (serverStatus >= 500) {
                    errMsg = `WebDAV server or service error (${serverStatus}). Please try again later.`;
                } else {
                    errMsg = errMsg ? `WebDAV error: ${errMsg}` : `WebDAV server returned status ${serverStatus}`;
                }
                throw new Error(errMsg);
            }
        }
        
        setState(s => ({
            ...s,
            webdavSettings: {
                url: targetUrl,
                username: webdavUser,
                password: webdavPass
            },
            syncProvider: 'WebDAV'
        }));
        
        setShowUnlockModal(false);
        setUnlockTarget(null);
    } catch (e: any) {
        let errMessage = e.message || 'Connection failed.';
        if (errMessage.includes('FUNCTION_INVOCATION_FAILED') || errMessage.includes('Unexpected token') || errMessage.includes('JSON')) {
             errMessage = 'WebDAV proxy failed on the server. Please check Vercel Function Logs or use Redis sync for now.';
        }
        setWebdavCheckError(errMessage);
    } finally {
        setWebdavChecking(false);
    }
  };

  return (
    <>
    <div className="space-y-8">
      <div id="setting-sync-status" className="space-y-6">
        <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
          <Cloud size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Cloud Sync</h4>
        </div>

        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-indigo-500/10" />
          <div className="relative z-10 space-y-1">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Connection</span>
              <div className="mt-1 flex items-center gap-2">
                {!isOnline ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-700 w-max">
                    <WifiOff size={10} /> Offline
                  </span>
                ) : isSyncing ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-md border border-amber-500/20 w-max">
                    <RefreshCw size={10} className="animate-spin" /> Syncing
                  </span>
                ) : (state.secretCode || state.syncProvider) ? (
                  <>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-emerald-500/20 w-max">
                      <CheckCircle2 size={10} /> Active
                    </span>
                    {hasUnsyncedChanges && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-md border border-rose-500/20 w-max animate-pulse">
                        Unsynced
                      </span>
                    )}
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-700 w-max">
                    <X size={10} /> Inactive
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Provider</span>
              <span className="text-sm font-black text-indigo-300 mt-1 uppercase tracking-tight">
                {state.syncProvider || (state.secretCode ? 'Redis' : 'None')}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">State Data</span>
              <span className={cn("text-sm font-black mt-1 uppercase tracking-tight", hasUnsyncedChanges ? "text-rose-500" : "text-emerald-400")}>
                {hasUnsyncedChanges ? 'Unsynced' : 'Up to Date'}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Last Updated</span>
              <span className="text-[11px] font-mono text-slate-400 mt-1 whitespace-nowrap bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/50">
                {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {triggerSyncCheck && (state.secretCode || state.syncProvider) && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 mb-6 relative overflow-hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manual Operations</span>
              </div>
              <div className="h-px flex-1 bg-slate-800/50 mx-4" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button 
                onClick={() => triggerSyncCheck(true)}
                disabled={isSyncing}
                title="Compare local and cloud save data"
                className="relative z-10 w-full sm:w-auto px-6 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-50 text-indigo-400 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2.5 border border-indigo-500/30 shadow-lg shadow-indigo-500/5 active:scale-[0.98]"
              >
                <Search size={18} /> 
                Verify & Compare Archives
              </button>

              <button 
                onClick={() => setShowHistoryModal(true)}
                title="View previous cloud save configurations"
                className="relative z-10 w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2.5 border border-slate-700 shadow-lg active:scale-[0.98]"
              >
                <History size={18} /> 
                Cloud History
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {showHistoryModal && (
        <CloudHistoryModal 
          onClose={() => setShowHistoryModal(false)}
          state={state}
          onRestore={(historyData) => {
            setConfirmDialog({
              isOpen: true,
              title: 'Restore Cloud Backup?',
              message: 'This will completely replace your current local progress with the selected history backup. This action cannot be reversed. Are you sure?',
              isAlert: false,
              type: 'danger',
              onConfirm: () => {
                // To restore safely, we just update the local state and trigger a refresh.
                // We'll pass the payload to setState and major dungeons etc if possible, but actually we need to trigger the hook's replace logic. 
                // Or we can just rewrite localStorage here.
                const stateData = historyData.state || historyData;
                const dungs = historyData.dungeons || [];
                const majorDungs = historyData.majorDungeons || [];
                
                localStorage.setItem('scholars_dungeon_state', JSON.stringify({ ...stateData, deviceCode: getDeviceCode() }));
                if (historyData.dungeons) localStorage.setItem('scholars_dungeon_state_dungeons', JSON.stringify(historyData.dungeons));
                if (historyData.majorDungeons) localStorage.setItem('scholars_dungeon_state_major_dungeons', JSON.stringify(historyData.majorDungeons));
                
                window.location.reload();
              }
            });
          }}
        />
      )}

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-slate-300 mb-6 pb-2">
          <Laptop size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Device Identity</h4>
        </div>
        
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
               {state.deviceType === 'Mobile' ? <Smartphone size={32} /> : 
                state.deviceType === 'Tablet' ? <Tablet size={32} /> : 
                <Monitor size={32} />}
            </div>
            <div className="flex-1 space-y-3 w-full">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Device Nickname</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. Work PC, Gaming Laptop"
                    value={localNickname}
                    onChange={(e) => setLocalNickname(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-all font-bold text-sm h-[40px]"
                  />
                  <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-tighter shrink-0 h-[40px]">
                    {state.deviceType || 'PC'}
                  </div>
                  <button
                    onClick={handleSaveNickname}
                    className={cn(
                      "px-3 h-[40px] rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                      showSavedFeedback 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : localNickname !== (state.deviceNickname || '')
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    )}
                  >
                    {showSavedFeedback ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic ml-1">This name identifies this device in your cloud sync history.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/50 flex flex-col gap-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Device Sequence Code</label>
            <div className="flex items-center gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 group/code">
              <div className="p-2 bg-slate-900 rounded-lg text-indigo-400">
                <Key size={16} />
              </div>
              <div className="flex-1 font-mono text-xs text-slate-300 break-all select-all font-bold tracking-tight">
                {getDeviceCode()}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(getDeviceCode());
                }}
                className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                title="Copy Device Code"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-[9px] text-slate-600 italic ml-1 font-medium">Unique hash for this installation. Used for silent identity verification during sync.</p>
          </div>
        </div>
      </div>

      {state.teamId && (
        <div className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2.5 text-slate-200 mb-6 pb-2">
            <Users size={20} className="text-indigo-450" />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Fellowship Key</h4>
          </div>
          
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Guild Identity Code / Team Secret Key</label>
              <div className="flex items-center gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 group/teamcode">
                <div className="p-2 bg-slate-900 rounded-lg text-indigo-400">
                  <Users size={16} />
                </div>
                <div className="flex-1 font-mono text-xs text-slate-350 break-all select-all font-bold tracking-tight">
                  {state.teamId}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(state.teamId || '');
                    customAlert('Guild Key copied to clipboard!', 'Success');
                  }}
                  className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                  title="Copy Guild Key"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-[9px] text-slate-600 italic ml-1 mt-1 font-medium">This is your unique Fellowship Key. Share this with other scholars to invite them to join your guild.</p>
            </div>
          </div>
        </div>
      )}
      <div>
        <div>
          <div>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
          <Server size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Storage Providers</h4>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Redis / The Astral Archives */}
        <button
          onClick={handleRedisClick}
          className="relative text-left p-5 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 rounded-2xl transition-all group overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-indigo-500/20" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                <Server size={24} />
              </div>
              {(state.secretCode && (state.syncProvider === 'Redis' || !state.syncProvider)) && (
                <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Connected
                </div>
              )}
            </div>
            <div>
              <h5 className="font-bold text-slate-200 mb-1">Redis Backend</h5>
              <p className="text-xs text-slate-400 leading-relaxed min-h-[3rem]">
                The Astral Archives. High-speed custom cloud server using short secret codes.
                {stats && (
                  <span className="block mt-2 flex items-center gap-4 text-[10px] font-mono border-t border-slate-700/50 pt-2">
                     <span className="flex flex-col">
                       <span className="text-slate-500 uppercase">Users</span>
                       <span className={cn("font-bold", stats.users >= stats.maxUsers ? "text-rose-400" : "text-emerald-400")}>
                         {stats.users} / {stats.maxUsers}
                       </span>
                     </span>
                     <span className="flex flex-col">
                       <span className="text-slate-500 uppercase">Guilds</span>
                       <span className={cn("font-bold", stats.teams >= stats.maxTeams ? "text-rose-400" : "text-emerald-400")}>
                         {stats.teams} / {stats.maxTeams}
                       </span>
                     </span>
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-400 opacity-80 group-hover:opacity-100 transition-opacity pt-2">
              <span>{state.secretCode ? 'Manage Connection' : 'Connect'}</span>
              {!state.isRedisUnlocked ? (
                <Lock size={16} className="text-amber-400/80" />
              ) : (
                <ChevronRight size={16} />
              )}
            </div>
          </div>
        </button>

        {/* Google OAuth */}
        <button
          id="setting-drive"
          onClick={handleGoogleDriveClick}
          className={`relative text-left p-5 rounded-2xl overflow-hidden transition-all group ${
            state.googleDriveTokens 
              ? 'bg-slate-900 border border-emerald-500/50 hover:border-emerald-400'
              : 'bg-slate-900 border border-slate-700 hover:border-indigo-500/50'
          }`}
        >
          {state.googleDriveTokens && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-emerald-500/10" />}
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl transition-colors ${
                state.googleDriveTokens 
                  ? 'bg-slate-800 text-emerald-400 group-hover:bg-emerald-500/20' 
                  : 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-500/20'
              }`}>
                <Cloud size={24} />
              </div>
              {state.googleDriveTokens && (
                <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Connected
                </div>
              )}
            </div>
            <div>
              <h5 className="font-bold text-slate-300 mb-1">Google Drive</h5>
              <p className="text-xs text-slate-400 leading-relaxed min-h-[3rem]">
                OAuth 2.0 integration. Sync securely to your personal Google Drive app data folder.
              </p>
            </div>
            <div className={`flex items-center justify-between text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity pt-2 ${
              state.googleDriveTokens ? 'text-emerald-400' : 'text-indigo-400'
            }`}>
              <span>{state.googleDriveTokens ? 'Manage Connection' : 'Connect'}</span>
              {!state.isGoogleDriveUnlocked ? (
                <Lock size={16} className="text-amber-400/80" />
              ) : (
                <ChevronRight size={16} />
              )}
            </div>
          </div>
        </button>

        {/* WebDAV */}
        <button
          id="setting-webdav"
          onClick={() => {
            setUnlockTarget('webdav');
            setShowUnlockModal(true);
          }}
          className={`relative text-left p-5 rounded-2xl overflow-hidden transition-all group ${
            state.webdavSettings 
              ? 'bg-slate-900 border border-emerald-500/50 hover:border-emerald-400'
              : 'bg-slate-900 border border-slate-700 hover:border-indigo-500/50'
          }`}
        >
          {state.webdavSettings && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-emerald-500/10" />}
          <div className="relative z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl transition-colors ${
                state.webdavSettings 
                  ? 'bg-slate-800 text-emerald-400 group-hover:bg-emerald-500/20' 
                  : 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-500/20'
              }`}>
                <HardDrive size={24} />
              </div>
              {state.webdavSettings && (
                <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Connected
                </div>
              )}
            </div>
            <div>
              <h5 className="font-bold text-slate-300 mb-1">WebDAV</h5>
              <p className="text-xs text-slate-400 leading-relaxed min-h-[3rem]">
                Custom server sync (e.g., Jianguoyun, Nextcloud). Full control over your save data location.
              </p>
            </div>
            <div className={`flex items-center justify-between text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity pt-2 ${
              state.webdavSettings ? 'text-emerald-400' : 'text-indigo-400'
            }`}>
              <span>{state.webdavSettings ? 'Manage Connection' : 'Connect'}</span>
              <ChevronRight size={16} />
            </div>
          </div>
        </button>
      </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Database size={20} className="text-emerald-400" />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">SNAPSHOTS</h4>
          </div>
          <button
            onClick={createLocalBackup}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-emerald-500/30 w-full sm:w-auto"
          >
            <Download size={14} /> Create Snapshot (Max 10)
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saved Snapshots</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium">Count:</span>
              <span className="text-[11px] font-black text-emerald-400 tracking-tight">
                {localBackups.length} / 10
              </span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-950/20 border-b border-slate-800">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">State Data</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {localBackups.length > 0 ? (
                  localBackups.map((bkp: any) => (
                    <tr key={bkp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(bkp.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono opacity-70">
                          {new Date(bkp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-emerald-300">Level {bkp.level}</span>
                           <span className="text-[9px] text-amber-500/80 font-mono">{bkp.coins} Coins</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 flex items-center justify-end gap-2">
                        <button
                          onClick={() => restoreLocalBackup(bkp)}
                          className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md transition-colors"
                          title="Restore"
                        >
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => deleteLocalBackup(bkp.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-600 italic">
                      No local snapshots found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-slate-300 mb-6 pb-2">
          <Settings size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Auto-Sync Preferences</h4>
        </div>
        
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Sync Strategy</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['manual', 'debounce', 'interval'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setState(s => ({ ...s, autoSyncMode: mode }))}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    syncMode === mode 
                      ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  <div className="font-bold capitalize mb-1">
                    {mode === 'debounce' ? 'Immediate (Debounce)' : mode === 'interval' ? 'Interval Polling' : 'Manual Only'}
                  </div>
                  <div className="text-[10px] opacity-80 leading-relaxed">
                    {mode === 'manual' && 'Only sync when starting the app or opening Astral Archives.'}
                    {mode === 'debounce' && 'Sync shortly after any changes are made to your data.'}
                    {mode === 'interval' && 'Sync automatically on a fixed time interval.'}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Eye size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400 leading-relaxed">
                <span className="font-bold text-indigo-300">Visibility API Active: </span>
                When you leave the app, lock your screen, or close the tab, any unsynced changes will reliably be pushed to the cloud automatically (unless 'Manual Only' is selected).
              </div>
            </div>
          </div>

          {syncMode === 'manual' && (
            <div className="pt-4 border-t border-slate-800/50">
              <button
                onClick={() => {
                  setActiveSection('general');
                  setTimeout(() => {
                    const el = document.getElementById('setting-data-management');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
                className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400 group-hover:text-indigo-400 transition-colors">
                    <HardDrive size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-200">Data Management</div>
                    <div className="text-[10px] text-slate-500">Import, export, or clear your local save data manually.</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </button>
            </div>
          )}

          {syncMode === 'debounce' && (
            <div className="pt-4 border-t border-slate-800/50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Debounce Delay</label>
                  <p className="text-[10px] text-slate-500 mt-1">Wait this long after your last action before syncing.</p>
                </div>
                <div className="text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg">
                  {debounceSeconds} seconds
                </div>
              </div>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={debounceSeconds}
                onChange={(e) => setState(s => ({ ...s, autoSyncDebounceSeconds: parseInt(e.target.value) }))}
                className="w-full text-indigo-500 rounded-lg cursor-pointer transition-all mt-2"
                style={{
                  background: `linear-gradient(to right, currentColor ${((debounceSeconds - 3) / 57) * 100}%, var(--color-slate-800, #1e293b) ${((debounceSeconds - 3) / 57) * 100}%)`
                }}
              />
            </div>
          )}

          {syncMode === 'interval' && (
            <div className="pt-4 border-t border-slate-800/50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sync Interval</label>
                  <p className="text-[10px] text-slate-500 mt-1">Wait exactly this long between automatic syncs.</p>
                </div>
                <div className="text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg">
                  {intervalMinutes} {intervalMinutes === 1 ? 'minute' : 'minutes'}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={intervalMinutes}
                onChange={(e) => setState(s => ({ ...s, autoSyncIntervalMinutes: parseInt(e.target.value) }))}
                className="w-full text-indigo-500 rounded-lg cursor-pointer transition-all mt-2"
                style={{
                  background: `linear-gradient(to right, currentColor ${((intervalMinutes - 1) / 59) * 100}%, var(--color-slate-800, #1e293b) ${((intervalMinutes - 1) / 59) * 100}%)`
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex items-center justify-between mb-6 pb-2">
          <div className="flex items-center gap-2.5 text-slate-300">
            <History size={20} />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Sync Status & History</h4>
          </div>
          {state.syncHistory && state.syncHistory.length > 0 && (
            <button
              onClick={() => {
                const headers = ['Type', 'Provider', 'Method', 'Device', 'Nickname', 'Timestamp', 'Code'];
                const rows = (state.syncHistory || []).map(log => [
                  log.type,
                  log.syncProvider || '',
                  log.syncMethod || '',
                  log.deviceType || '',
                  log.deviceNickname || '',
                  log.timestamp,
                  log.code
                ]);
                const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `scholars_sync_history_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
        
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Status</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium">Last Synced:</span>
              <span className="text-[11px] font-black text-indigo-400 tracking-tight">
                {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-950/20 border-b border-slate-800">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Operation</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Provider</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Device Name</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Device Code</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {state.syncHistory && state.syncHistory.length > 0 ? (
                  state.syncHistory.map((log, index) => (
                    <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono opacity-70">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                           {log.type === 'login' && <LogIn size={12} className="text-emerald-400" />}
                           {log.type === 'force_sync' && <RefreshCw size={12} className="text-indigo-400" />}
                           {log.type === 'local_to_cloud' && <ArrowDownUp size={12} className="text-emerald-400 rotate-90" />}
                           {log.type === 'cloud_to_local' && <ArrowDownUp size={12} className="text-blue-400 -rotate-90" />}
                           {log.type === 'unbind_local' && <ShieldBan size={12} className="text-amber-400" />}
                           {log.type === 'delete_cloud' && <Trash2 size={12} className="text-red-400" />}
                           <span className="text-[10px] font-bold text-slate-200 capitalize">
                             {log.type.replace(/_/g, ' ')}
                           </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
                          {log.syncProvider || 'Redis'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[10px] font-bold text-slate-300">
                          {log.deviceNickname || log.deviceType || 'Unknown Device'}
                        </div>
                        {log.deviceNickname && log.deviceType && (
                          <div className="text-[8px] text-slate-500 uppercase tracking-tighter opacity-60">
                            {log.deviceType}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[10px] font-mono text-slate-500 break-all w-24 truncate" title={log.deviceCode}>
                          {log.deviceCode || 'Legacy'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded",
                          log.syncMethod === 'Visibility API Active' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 bg-slate-800'
                        )}>
                          {log.syncMethod || 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-600 italic">
                      Chronicles are empty. No sync history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

      {showUnlockModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => {
                setShowUnlockModal(false);
                setUnlockTarget(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            {unlockTarget === 'webdav' ? (
              <>
                <div className="mb-6 mt-2 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                    <HardDrive size={24} />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">WebDAV Connection</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
                    Enter your WebDAV server details. <strong className="text-indigo-300">Note:</strong> This is a <span className="underline">SERVER URL</span>, not a local folder path on your computer.
                    <br />Example: <code>https://dav.jianguoyun.com/dav/</code>
                  </p>
                  <p className="text-[10px] text-amber-500/80 leading-relaxed max-w-xs mt-2 p-2 bg-amber-500/10 rounded-lg">
                    WebDAV sync is experimental on Vercel deployments. If it fails, please use Redis sync or manual export for now.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Server URL</label>
                    <input
                      type="text"
                      placeholder="https://dav.jianguoyun.com/dav/"
                      value={webdavUrl}
                      onChange={(e) => setWebdavUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Username / Email</label>
                    <input
                      type="text"
                      placeholder="Your Jianguoyun Login Email"
                      value={webdavUser}
                      onChange={(e) => setWebdavUser(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">App Password</label>
                    <input
                      type="password"
                      placeholder="Jianguoyun Application Password"
                      value={webdavPass}
                      onChange={(e) => setWebdavPass(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                    />
                  </div>
                  {webdavCheckError && (
                    <p className="text-red-400 text-xs text-center mt-2 break-words">
                      {webdavCheckError}
                    </p>
                  )}
                  <button
                    onClick={handleWebdavConnection}
                    disabled={webdavChecking}
                    className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-500/20"
                  >
                    {webdavChecking ? 'Connecting...' : (state.webdavSettings ? 'Update WebDAV Settings' : 'Connect to WebDAV')}
                  </button>
                  {state.webdavSettings && (
                     <button
                       onClick={() => {
                          setState(s => {
                             const newState = { ...s };
                             delete newState.webdavSettings;
                             if (newState.syncProvider === 'WebDAV') delete newState.syncProvider;
                             return newState;
                          });
                          setShowUnlockModal(false);
                          setUnlockTarget(null);
                       }}
                       className="w-full py-3 mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                     >
                        Disconnect WebDAV
                     </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 mt-2 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Notice</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
                    {unlockTarget === 'redis' 
                      ? 'To stay within free tier quotas, maximum registered users is capped at 300 and guilds at 50. To prevent capacity overflow, inactive accounts and guilds (15 consecutive days of inactivity) will be automatically pruned from the cloud (local data is unaffected). Do you wish to proceed?'
                      : 'Google Drive Auth is currently restricted to approved internal testers only due to pending Google Verification. This is a beta feature for testing. Do you wish to proceed?'
                    }
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Unlock Password</label>
                    <input
                      type="password"
                      placeholder="Enter access code"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm text-center tracking-widest"
                    />
                  </div>
                  {unlockError && (
                    <p className="text-red-400 text-xs text-center mt-2 break-words">
                      {unlockError}
                    </p>
                  )}
                  <button
                    onClick={handleUnlock}
                    disabled={isUnlocking || !unlockPassword}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-500/20"
                  >
                    {isUnlocking ? 'Verifying...' : 'Acknowledge & Proceed'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      , document.body)}
      
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        isAlert={confirmDialog.isAlert}
      />
    </>
  );
};
