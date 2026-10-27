import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Cloud,
  HardDrive,
  CheckCircle2,
  ChevronRight,
  Settings,
  X,
  History,
  ArrowDownUp,
  RefreshCw,
  LogIn,
  Trash2,
  ShieldBan,
  Search,
  Download,
  Upload,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Copy,
  Check,
  WifiOff,
  Users,
  Database,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { AppState } from '../../types';
import { cn, getDeviceCode } from '../../lib/utils';
import { CURRENT_SCHEMA_VERSION, PRE_MIGRATION_BACKUP_KEY, backupRaw } from '../../lib/migrations';
import { ConfirmModal } from '../modals/ConfirmModal';
import { CloudHistoryModal } from './CloudHistoryModal';
import { scrubExportData } from '../../utils/exportScrubber';
import {
  PRE_DEMO_BACKUP_KEY,
  loadPreviewDemoDataIntoStorage,
  restorePreDemoBackupFromStorage,
  downloadPreviewDemoJsonFile,
} from '../../lib/previewDemoData';

interface CloudSettingsSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setActiveSection: (sec: any) => void;
  onOpenAstralArchives: () => void;
  triggerSyncCheck?: (forceModal?: boolean) => void;
  isSyncing?: boolean;
  hasUnsyncedChanges?: boolean;
  setShowClearConfirm: (show: boolean) => void;
}

interface DeviceRecord {
  deviceCode: string;
  deviceNickname: string;
  deviceType: string;
  lastSeen?: string;
  isCurrent: boolean;
}

export const CloudSettingsSection: React.FC<CloudSettingsSectionProps> = ({
  state,
  setState,
  onOpenAstralArchives,
  triggerSyncCheck,
  isSyncing,
  hasUnsyncedChanges,
  setShowClearConfirm
}) => {
  const syncMode = state.autoSyncMode === 'manual' ? 'manual' : state.autoSyncMode ? 'debounce' : 'manual';

  const [showWebdavModal, setShowWebdavModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAllDevicesModal, setShowAllDevicesModal] = useState(false);
  const [deviceDraftNames, setDeviceDraftNames] = useState<Record<string, string>>({});
  const [editingDeviceCode, setEditingDeviceCode] = useState<string | null>(null);
  const [copiedDeviceCode, setCopiedDeviceCode] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);
  const [stats, setStats] = useState<{ users: number; maxUsers: number; teams: number; maxTeams: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const isCloudActive = Boolean(
    (state.account?.token && state.account?.userId) ||
      (state.syncProvider === 'WebDAV' && state.webdavSettings?.url)
  );

  const currentDeviceCode = getDeviceCode();

  const allDevices = useMemo<DeviceRecord[]>(() => {
    const map = new Map<string, DeviceRecord>();
    const cleanCurrentCode = currentDeviceCode.slice(0, 8);

    map.set(cleanCurrentCode, {
      deviceCode: cleanCurrentCode,
      deviceNickname: state.deviceNickname || '',
      deviceType: state.deviceType || 'PC',
      lastSeen: state.lastUpdated || undefined,
      isCurrent: true
    });

    (state.syncHistory || []).forEach((log) => {
      const rawCode = log.deviceCode || 'Legacy';
      const code = rawCode === 'Legacy' ? 'Legacy' : rawCode.slice(0, 8);
      const existing = map.get(code);
      if (!existing) {
        map.set(code, {
          deviceCode: code,
          deviceNickname: log.deviceNickname || '',
          deviceType: log.deviceType || 'PC',
          lastSeen: log.timestamp,
          isCurrent: code === cleanCurrentCode
        });
      } else {
        if (!existing.deviceNickname && log.deviceNickname) {
          existing.deviceNickname = log.deviceNickname;
        }
        if (!existing.lastSeen && log.timestamp) {
          existing.lastSeen = log.timestamp;
        }
      }
    });

    return Array.from(map.values());
  }, [currentDeviceCode, state.deviceNickname, state.deviceType, state.lastUpdated, state.syncHistory]);

  const openAllDevicesModal = () => {
    const drafts: Record<string, string> = {};
    allDevices.forEach((d) => {
      drafts[d.deviceCode] = d.deviceNickname || '';
    });
    setDeviceDraftNames(drafts);
    setEditingDeviceCode(null);
    setShowAllDevicesModal(true);
  };

  const handleSaveDeviceName = (deviceCode: string, overrideName?: string) => {
    const rawVal = overrideName !== undefined ? overrideName : (deviceDraftNames[deviceCode] ?? '');
    const trimmed = rawVal.trim();
    setState((prev) => {
      const targetCode = deviceCode.slice(0, 8);
      const updatedHistory = (prev.syncHistory || []).map((log) => {
        const logCode = (log.deviceCode || 'Legacy').slice(0, 8);
        if (logCode === targetCode || (log.deviceCode || 'Legacy') === deviceCode) {
          return { ...log, deviceNickname: trimmed };
        }
        return log;
      });
      return {
        ...prev,
        ...(deviceCode.slice(0, 8) === currentDeviceCode.slice(0, 8) ? { deviceNickname: trimmed } : {}),
        syncHistory: updatedHistory
      };
    });
  };

  const handleCopyCode = (code: string) => {
    const shortCode = code.slice(0, 8);
    navigator.clipboard.writeText(shortCode);
    setCopiedDeviceCode(shortCode);
    setTimeout(() => {
      setCopiedDeviceCode((curr) => (curr === shortCode ? null : curr));
    }, 1800);
  };

  const handleRetryConnection = async () => {
    if (isCheckingNetwork) return;
    setIsCheckingNetwork(true);
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
        const data = await res.json().catch(() => null);
        if (data && !data.error) setStats(data);
        if (triggerSyncCheck) triggerSyncCheck(false);
      } else {
        setIsOnline(navigator.onLine);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsCheckingNetwork(false);
    }
  };

  const customAlert = (message: string, title = 'Notification') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: true, type: 'info' });
  };

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch((e) => console.error('Could not fetch stats', e));
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

  const handleRedisClick = () => {
    onOpenAstralArchives();
  };

  const executeExport = (includeSensitiveData: boolean = true) => {
    const fullLocalStorage: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        fullLocalStorage[key] = localStorage.getItem(key) || '';
      }
    }

    let dataToExport: any = {
      ...state,
      dungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_dungeons') || '[]'),
      majorDungeons: JSON.parse(localStorage.getItem('scholars_dungeon_state_major_dungeons') || '[]'),
      fullLocalStorage
    };

    if (!includeSensitiveData) {
      dataToExport = scrubExportData(dataToExport);
    }

    const filename = includeSensitiveData
      ? 'scholars_dungeon_full_save.json'
      : 'scholars_dungeon_safe_save.json';
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const handleExport = (includeSensitiveData: boolean = true) => {
    if (includeSensitiveData) {
      setConfirmDialog({
        isOpen: true,
        title: 'Full Export Warning',
        message:
          'This full export will include all your personal information, including your unique user ID and active cloud sync credentials. Are you sure you want to proceed?',
        confirmText: 'Export Full Data',
        type: 'warning',
        isAlert: false,
        onConfirm: () => executeExport(true)
      });
    } else {
      executeExport(false);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (importedData && typeof importedData === 'object') {
          const { dungeons, majorDungeons, fullLocalStorage, ...importedState } = importedData;

          const currentRaw = localStorage.getItem('scholars_dungeon_state');
          if (currentRaw) backupRaw(currentRaw, PRE_MIGRATION_BACKUP_KEY);

          if (fullLocalStorage) {
            if (!fullLocalStorage['scholars_dungeon_auth'] && !importedState.account) {
              localStorage.removeItem('scholars_dungeon_auth');
            }
            if (!fullLocalStorage['scholars_dungeon_sync_code'] && !importedState.secretCode) {
              localStorage.removeItem('scholars_dungeon_sync_code');
            }
            if (!fullLocalStorage['team_identity_code'] && !importedState.teamId) {
              localStorage.removeItem('team_identity_code');
            }

            Object.keys(fullLocalStorage).forEach((key) => {
              if (key !== 'scholars_dungeon_device_code') {
                localStorage.setItem(key, fullLocalStorage[key]);
              }
            });
          } else {
            if (!importedState.account) {
              localStorage.removeItem('scholars_dungeon_auth');
            }
            if (!importedState.secretCode) {
              localStorage.removeItem('scholars_dungeon_sync_code');
            }
            if (!importedState.teamId) {
              localStorage.removeItem('team_identity_code');
            }

            localStorage.setItem(
              'scholars_dungeon_state',
              JSON.stringify({ ...importedState, schemaVersion: CURRENT_SCHEMA_VERSION })
            );
            if (dungeons)
              localStorage.setItem('scholars_dungeon_state_dungeons', JSON.stringify(dungeons));
            if (majorDungeons)
              localStorage.setItem(
                'scholars_dungeon_state_major_dungeons',
                JSON.stringify(majorDungeons)
              );
          }

          window.location.reload();
        } else {
          setConfirmDialog({
            isOpen: true,
            title: 'Import Error',
            message: 'Invalid save file format.',
            confirmText: 'Close',
            type: 'danger',
            isAlert: true
          });
        }
      } catch (error) {
        setConfirmDialog({
          isOpen: true,
          title: 'Import Failure',
          message: 'Error parsing save file or invalid JSON.',
          confirmText: 'Close',
          type: 'danger',
          isAlert: true
        });
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const [webdavUrl, setWebdavUrl] = useState(state.webdavSettings?.url || '');
  const [webdavUser, setWebdavUser] = useState(state.webdavSettings?.username || '');
  const [webdavPass, setWebdavPass] = useState(state.webdavSettings?.password || '');
  const [webdavChecking, setWebdavChecking] = useState(false);
  const [webdavCheckError, setWebdavCheckError] = useState('');

  const handleWebdavConnection = async () => {
    if (!webdavUrl || !webdavUser || !webdavPass) {
      setWebdavCheckError('URL, Username and Password are required.');
      return;
    }

    if (webdavUrl.includes('\\') || webdavUrl.match(/^[a-zA-Z]:/)) {
      setWebdavCheckError(
        'Please enter a WebDAV URL (starting with https://), not a local file path (C:\\Users\\...). For Jianguoyun, it is usually https://dav.jianguoyun.com/dav/'
      );
      return;
    }

    if (!webdavUrl.startsWith('http')) {
      setWebdavCheckError('URL must start with http:// or https://');
      return;
    }

    let targetUrl = webdavUrl;
    if (!targetUrl.endsWith('.json')) {
      if (!targetUrl.endsWith('/')) targetUrl += '/';

      const folderName = 'SCHOLARS DUNGEON';
      if (!targetUrl.toUpperCase().includes(folderName.toUpperCase())) {
        targetUrl += encodeURIComponent(folderName) + '/';
      }

      targetUrl += 'scholars_dungeon_save.json';
    }

    setWebdavChecking(true);
    setWebdavCheckError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const lastSlashIndex = targetUrl.lastIndexOf('/');
      const folderUrl =
        lastSlashIndex !== -1 ? targetUrl.substring(0, lastSlashIndex + 1) : targetUrl;

      const response = await fetch('/api/webdav/proxy', {
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

      const responseText = await response.text();
      let serverStatus = response.status;

      if (response.ok) {
        try {
          const json = JSON.parse(responseText);
          if (json.status !== undefined) {
            serverStatus = json.status;
          }
        } catch {
          // ignore non-json
        }
      }

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
          } catch {
            // ignore non-json
          }
        }

        if ([200, 201, 204, 405, 409].includes(mkcolStatus)) {
          serverStatus = 200;
        } else {
          let errMsg = mkcolText;
          try {
            const json = JSON.parse(mkcolText);
            if (json.error) errMsg = json.error;
          } catch {
            // ignore non-json
          }

          if (mkcolStatus === 401 || mkcolStatus === 403) {
            errMsg =
              'Username, password, or permissions are incorrect. Please check your credentials.';
          } else if (mkcolStatus >= 500) {
            errMsg = `WebDAV server or service error (${mkcolStatus}). Please try again later.`;
          } else {
            errMsg = errMsg
              ? `WebDAV error: ${errMsg}`
              : `WebDAV server returned status ${mkcolStatus}`;
          }
          throw new Error(errMsg);
        }
      } else {
        const isSuccessfulStatus = [200, 204, 207, 405, 409].includes(serverStatus);
        if (!isSuccessfulStatus) {
          let errMsg = responseText;
          try {
            const json = JSON.parse(responseText);
            if (json.error) errMsg = json.error;
          } catch {
            // ignore non-json
          }

          if (serverStatus === 401 || serverStatus === 403) {
            errMsg =
              'Username, password, or permissions are incorrect. Please check your credentials.';
          } else if (serverStatus >= 500) {
            errMsg = `WebDAV server or service error (${serverStatus}). Please try again later.`;
          } else {
            errMsg = errMsg
              ? `WebDAV error: ${errMsg}`
              : `WebDAV server returned status ${serverStatus}`;
          }
          throw new Error(errMsg);
        }
      }

      setState((s) => ({
        ...s,
        webdavSettings: {
          url: targetUrl,
          username: webdavUser,
          password: webdavPass
        },
        syncProvider: 'WebDAV'
      }));

      setShowWebdavModal(false);
    } catch (e: any) {
      let errMessage = e.message || 'Connection failed.';
      if (
        errMessage.includes('FUNCTION_INVOCATION_FAILED') ||
        errMessage.includes('Unexpected token') ||
        errMessage.includes('JSON')
      ) {
        errMessage =
          'WebDAV proxy failed on the server. Please check Vercel Function Logs or use Scholar Passport sync for now.';
      }
      setWebdavCheckError(errMessage);
    } finally {
      setWebdavChecking(false);
    }
  };

  const recentSyncHistory = (state.syncHistory || []).slice(0, 10);

  return (
    <>
      <div className="space-y-8">
        {/* 1. Storage Providers */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
            <Cloud size={20} />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Storage Providers</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scholar Passport (Cloud) */}
            <button
              onClick={handleRedisClick}
              className={cn(
                'relative text-left p-5 rounded-2xl transition-all group overflow-hidden border flex flex-col justify-between h-full w-full',
                state.account?.token && state.account?.userId
                  ? 'bg-slate-900 border-emerald-500/50 hover:border-emerald-400'
                  : 'bg-slate-900 border-slate-700 hover:border-indigo-500/50'
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-indigo-500/20" />
              <div className="relative z-10 flex flex-col justify-between h-full w-full space-y-4">
                <div className="space-y-4 flex-1">
                  <div className="flex items-start justify-between min-h-[40px]">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl transition-colors',
                        state.account?.token && state.account?.userId
                          ? 'bg-slate-800 text-emerald-400 group-hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-500/20'
                      )}
                    >
                      <Cloud size={24} />
                    </div>
                    {Boolean(state.account?.token && state.account?.userId) && (
                      <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {state.account?.username ? `@${state.account.username}` : 'Connected'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200 mb-1">Scholar Passport</h5>
                    <p className="text-xs text-slate-400 leading-relaxed min-h-[3rem]">
                      Unified cloud account for real-time Cloud Save, Fellowship Guilds, and Web Push notifications.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono border-t border-slate-700/50 pt-2 min-h-[38px]">
                    <div className="flex flex-col">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Users</span>
                      <span
                        className={cn(
                          'font-bold',
                          stats && stats.users >= stats.maxUsers ? 'text-rose-400' : 'text-emerald-400'
                        )}
                      >
                        {stats ? `${stats.users} / ${stats.maxUsers}` : '1 / 300'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Guilds</span>
                      <span
                        className={cn(
                          'font-bold',
                          stats && stats.teams >= stats.maxTeams ? 'text-rose-400' : 'text-emerald-400'
                        )}
                      >
                        {stats ? `${stats.teams} / ${stats.maxTeams}` : '1 / 50'}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center justify-between text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity pt-2 mt-auto',
                    state.account?.token && state.account?.userId
                      ? 'text-emerald-400'
                      : 'text-indigo-400'
                  )}
                >
                  <span>{state.account?.token ? 'Manage Passport' : 'Log In / Sign Up'}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </button>

            {/* WebDAV */}
            <button
              id="setting-webdav"
              onClick={() => setShowWebdavModal(true)}
              className={cn(
                'relative text-left p-5 rounded-2xl overflow-hidden transition-all group border flex flex-col justify-between h-full w-full',
                state.webdavSettings
                  ? 'bg-slate-900 border-emerald-500/50 hover:border-emerald-400'
                  : 'bg-slate-900 border-slate-700 hover:border-indigo-500/50'
              )}
            >
              {state.webdavSettings && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-emerald-500/10" />
              )}
              <div className="relative z-10 flex flex-col justify-between h-full w-full space-y-4">
                <div className="space-y-4 flex-1">
                  <div className="flex items-start justify-between min-h-[40px]">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl transition-colors',
                        state.webdavSettings
                          ? 'bg-slate-800 text-emerald-400 group-hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-500/20'
                      )}
                    >
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
                    <h5 className="font-bold text-slate-200 mb-1">WebDAV</h5>
                    <p className="text-xs text-slate-400 leading-relaxed min-h-[3rem]">
                      Custom server sync (e.g., Jianguoyun, Nextcloud). Full control over your save data location.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono border-t border-slate-700/50 pt-2 min-h-[38px]">
                    <div className="flex flex-col">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Protocol</span>
                      <span className={cn('font-bold', state.webdavSettings ? 'text-emerald-400' : 'text-slate-400')}>
                        {state.webdavSettings ? 'Active' : 'HTTP / HTTPS'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Storage</span>
                      <span className={cn('font-bold truncate max-w-[130px]', state.webdavSettings ? 'text-emerald-400' : 'text-slate-400')}>
                        {state.webdavSettings
                          ? (() => {
                              try {
                                return new URL(state.webdavSettings.url).hostname || 'Custom';
                              } catch {
                                return 'Custom';
                              }
                            })()
                          : 'Self-Hosted'}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center justify-between text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity pt-2 mt-auto',
                    state.webdavSettings ? 'text-emerald-400' : 'text-indigo-400'
                  )}
                >
                  <span>{state.webdavSettings ? 'Manage Connection' : 'Connect'}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Cloud Sync Status */}
        <div id="setting-sync-status" className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2.5 text-indigo-400 mb-6 pb-2">
            <Cloud size={20} />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Cloud Sync Status</h4>
          </div>

          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-colors group-hover:bg-indigo-500/10" />
            <div className="relative z-10 space-y-1">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Connection
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {!isOnline ? (
                      <button
                        type="button"
                        onClick={handleRetryConnection}
                        disabled={isCheckingNetwork}
                        title="Click to retry network connection"
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-700 hover:border-indigo-500/40 transition-all cursor-pointer active:scale-95 w-max"
                      >
                        {isCheckingNetwork ? (
                          <RefreshCw size={10} className="animate-spin text-indigo-400" />
                        ) : (
                          <WifiOff size={10} className="text-rose-400" />
                        )}
                        {isCheckingNetwork ? 'Reconnecting...' : 'Offline'}
                      </button>
                    ) : isCloudActive ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-emerald-500/20 w-max">
                        <CheckCircle2 size={10} />{' '}
                        {state.account?.username ? `@${state.account.username} (Active)` : 'Active'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-700 w-max">
                        <X size={10} /> Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Provider
                  </span>
                  <span className="text-sm font-black text-indigo-300 mt-1 uppercase tracking-tight">
                    {state.account?.token
                      ? 'Scholar Passport'
                      : state.syncProvider === 'WebDAV' && state.webdavSettings?.url
                        ? 'WebDAV'
                        : 'None'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Save State
                  </span>
                  {isSyncing ? (
                    <span className="flex items-center gap-1.5 text-sm font-black mt-1 uppercase tracking-tight text-amber-500">
                      <RefreshCw size={12} className="animate-spin" /> Syncing
                    </span>
                  ) : hasUnsyncedChanges ? (
                    <span className="text-sm font-black mt-1 uppercase tracking-tight text-rose-500">
                      Unsynced
                    </span>
                  ) : (
                    <span className="text-sm font-black mt-1 uppercase tracking-tight text-emerald-400">
                      Up to Date
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Last Updated
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 mt-1 whitespace-nowrap bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/50">
                    {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {triggerSyncCheck && isCloudActive && (
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-slate-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Manual Operations
                    </span>
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
                message:
                  'This will completely replace your current local progress with the selected history backup. This action cannot be reversed. Are you sure?',
                isAlert: false,
                type: 'danger',
                onConfirm: () => {
                  const stateData = historyData.state || historyData;

                  const currentRaw = localStorage.getItem('scholars_dungeon_state');
                  if (currentRaw) backupRaw(currentRaw, PRE_MIGRATION_BACKUP_KEY);

                  localStorage.setItem(
                    'scholars_dungeon_state',
                    JSON.stringify({
                      ...stateData,
                      schemaVersion: CURRENT_SCHEMA_VERSION,
                      deviceCode: getDeviceCode()
                    })
                  );
                  if (historyData.dungeons)
                    localStorage.setItem(
                      'scholars_dungeon_state_dungeons',
                      JSON.stringify(historyData.dungeons)
                    );
                  if (historyData.majorDungeons)
                    localStorage.setItem(
                      'scholars_dungeon_state_major_dungeons',
                      JSON.stringify(historyData.majorDungeons)
                    );

                  window.location.reload();
                }
              });
            }}
          />
        )}

        {/* 3. Auto-Sync Preferences */}
        <div className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2.5 text-slate-300 mb-6 pb-2">
            <Settings size={20} />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">
              Auto-Sync Preferences
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setState((s) => ({ ...s, autoSyncMode: 'manual' }))}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5',
                syncMode === 'manual'
                  ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              )}
            >
              <div className="font-black uppercase tracking-widest text-xs flex items-center justify-between">
                <span>Manual</span>
                {syncMode === 'manual' && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-normal leading-normal">
                Only sync archives when manually triggered.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setState((s) => ({ ...s, autoSyncMode: 'debounce' }))}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5',
                syncMode === 'debounce'
                  ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              )}
            >
              <div className="font-black uppercase tracking-widest text-xs flex items-center justify-between">
                <span>Immediate</span>
                {syncMode === 'debounce' && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-normal leading-normal">
                Automatically push updates to the cloud in real time.
              </div>
            </button>
          </div>
        </div>

        {/* 4. Fellowship Key (if in guild) */}
        {state.teamId && (
          <div className="space-y-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2.5 text-slate-200 mb-6 pb-2">
              <Users size={20} className="text-indigo-450" />
              <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Fellowship Key</h4>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">
                  Guild Identity Code / Team Secret Key
                </label>
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
                <p className="text-[9px] text-slate-600 italic ml-1 mt-1 font-medium">
                  This is your unique Fellowship Key. Share this with other scholars to invite them to join your guild.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. Sync Status & History */}
        <div className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2">
            <div className="flex items-center gap-2.5 text-slate-300">
              <History size={20} />
              <h4 className="text-lg font-bold uppercase tracking-widest pr-1">
                Sync Status & History
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {state.syncHistory && state.syncHistory.length > 0 && (
                <button
                  onClick={() => {
                    const headers = [
                      'Time',
                      'Operation',
                      'Provider',
                      'Device Name',
                      'Device Code'
                    ];
                    const rows = (state.syncHistory || []).map((log) => [
                      log.timestamp,
                      log.type,
                      log.syncProvider === 'WebDAV' ? 'WebDAV' : 'redis',
                      log.deviceNickname || log.deviceType || '',
                      log.deviceCode || ''
                    ]);
                    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute(
                      'download',
                      `scholars_sync_history_${new Date().toISOString().split('T')[0]}.csv`
                    );
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700"
                >
                  <Download size={14} /> Export CSV
                </button>
              )}
              <button
                type="button"
                onClick={openAllDevicesModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/30"
              >
                <Laptop size={14} /> All Devices
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Recent 10 Records
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-medium">Last Synced:</span>
                <span className="text-[11px] font-black text-indigo-400 tracking-tight">
                  {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/20 border-b border-slate-800">
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Time
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Operation
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Device
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {recentSyncHistory.length > 0 ? (
                    recentSyncHistory.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleDateString()}{' '}
                            <span className="text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {log.type === 'login' && (
                              <LogIn size={13} className="text-emerald-400" />
                            )}
                            {log.type === 'force_sync' && (
                              <RefreshCw size={13} className="text-indigo-400" />
                            )}
                            {log.type === 'local_to_cloud' && (
                              <ArrowDownUp size={13} className="text-emerald-400 rotate-90" />
                            )}
                            {log.type === 'cloud_to_local' && (
                              <ArrowDownUp size={13} className="text-blue-400 -rotate-90" />
                            )}
                            {log.type === 'unbind_local' && (
                              <ShieldBan size={13} className="text-amber-400" />
                            )}
                            {log.type === 'delete_cloud' && (
                              <Trash2 size={13} className="text-red-400" />
                            )}
                            <span className="text-xs font-semibold text-slate-200 capitalize">
                              {log.type === 'local_to_cloud'
                                ? 'Upload'
                                : log.type === 'cloud_to_local'
                                  ? 'Download'
                                  : log.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50">
                            {log.syncProvider === 'WebDAV' ? 'WebDAV' : 'redis'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300">
                              {log.deviceNickname || log.deviceType || 'Current Device'}
                            </span>
                            {log.deviceCode && (
                              <span className="text-[10px] font-mono text-slate-500">
                                ({log.deviceCode.slice(0, 8)})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-xs text-slate-600 italic"
                      >
                        Chronicles are empty. No sync history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 6. Data Management (Export / Import JSON) */}
        <div id="setting-data-management" className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2.5 text-blue-400 mb-6 pb-2">
            <Database size={20} />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Data Management</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-white font-bold">
                <div className="flex items-center gap-3">
                  <Download size={20} className="text-blue-400" />
                  Export Data
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Save your progress to a file. <b>Safe Export</b> strips cloud accounts, journals, AI chats, and device info.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExport(false)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 group"
                >
                  <ShieldCheck
                    size={14}
                    className="text-blue-400 group-hover:scale-110 transition-transform"
                  />
                  Safe Export
                </button>
                <button
                  onClick={() => handleExport(true)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 group"
                >
                  <Database
                    size={14}
                    className="text-indigo-400 group-hover:scale-110 transition-transform"
                  />
                  Full Export
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-3 text-white font-bold">
                <Upload size={20} className="text-blue-400" />
                Import Data
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Restore your progress from a previously exported file.
              </p>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                className="hidden"
                id="import-data"
              />
              <label
                htmlFor="import-data"
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm cursor-pointer flex items-center justify-center"
              >
                Import JSON
              </label>
            </div>
          </div>

          {/* Preview Demo Dataset Card */}
          <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-white font-bold">
                <Sparkles size={20} className="text-indigo-400" />
                <span>Preview Demo Dataset</span>
              </div>
              {state.userUniqueId === 'ID-ARIA7' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Active Preview Data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Load or download a comprehensive showcase dataset (multi-tier goals, 8 color tags, 30-day focus history, workstation & sleep logs, journals, talents, quests, vault items, and fellowship preview).
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Load Preview Demo Data?',
                    message:
                      'This will load the comprehensive preview dataset into your browser (your current local save will be backed up automatically so you can restore it anytime).',
                    confirmText: 'Load Demo Data',
                    type: 'info',
                    isAlert: false,
                    onConfirm: () => {
                      loadPreviewDemoDataIntoStorage();
                      window.location.reload();
                    },
                  });
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} />
                Load Preview Demo
              </button>

              <button
                type="button"
                onClick={() => downloadPreviewDemoJsonFile()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} className="text-indigo-400" />
                Download Demo JSON
              </button>

              {typeof window !== 'undefined' && Boolean(localStorage.getItem(PRE_DEMO_BACKUP_KEY)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (restorePreDemoBackupFromStorage()) {
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Restore Previous Save
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 7. Danger Zone */}
        <div className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2.5 text-red-400 mb-6 pb-2">
            <AlertTriangle size={20} />
            <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Danger Zone</h4>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Clearing all data will reset your local progress, inventory, and settings. This action is irreversible.
            </p>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* All Devices Modal */}
      {showAllDevicesModal &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                    <Laptop size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest pr-1">
                      All Synced Devices
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Sequence codes and custom device aliases
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllDevicesModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3.5 space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {allDevices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 italic">
                    No synced devices recorded.
                  </div>
                ) : (
                  allDevices.map((dev) => {
                    const isEditing = editingDeviceCode === dev.deviceCode;
                    const draftVal = deviceDraftNames[dev.deviceCode] ?? dev.deviceNickname ?? '';
                    const shortCode = (dev.deviceCode || '').slice(0, 8);

                    return (
                      <div
                        key={dev.deviceCode}
                        className="flex items-center justify-between gap-2.5 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700/60 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 shrink-0">
                            {dev.deviceType === 'Mobile' ? (
                              <Smartphone size={15} />
                            ) : dev.deviceType === 'Tablet' ? (
                              <Tablet size={15} />
                            ) : (
                              <Monitor size={15} />
                            )}
                          </div>

                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              maxLength={20}
                              placeholder="Device name..."
                              value={draftVal}
                              onChange={(e) =>
                                setDeviceDraftNames((prev) => ({
                                  ...prev,
                                  [dev.deviceCode]: e.target.value
                                }))
                              }
                              onBlur={() => {
                                handleSaveDeviceName(dev.deviceCode);
                                setEditingDeviceCode(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveDeviceName(dev.deviceCode);
                                  setEditingDeviceCode(null);
                                } else if (e.key === 'Escape') {
                                  setEditingDeviceCode(null);
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-900 border border-indigo-500 rounded-lg text-white text-xs font-bold focus:outline-none w-36 sm:w-44"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-bold text-white truncate max-w-[130px]">
                                {dev.deviceNickname || dev.deviceType || 'Unnamed Device'}
                              </span>
                              {dev.isCurrent && (
                                <span className="px-1.5 py-0.5 bg-indigo-500/15 border border-indigo-500/30 rounded text-[8px] font-black text-indigo-400 uppercase tracking-tight shrink-0">
                                  This Device
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setDeviceDraftNames((prev) => ({
                                    ...prev,
                                    [dev.deviceCode]: dev.deviceNickname || ''
                                  }));
                                  setEditingDeviceCode(dev.deviceCode);
                                }}
                                className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors shrink-0"
                                title="Rename Device"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
                          <span className="font-mono text-[10px] text-slate-400 select-all font-semibold">
                            {shortCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(shortCode)}
                            className="p-0.5 text-slate-500 hover:text-indigo-400 transition-colors"
                            title="Copy Device Code"
                          >
                            {copiedDeviceCode === shortCode ? (
                              <Check size={11} className="text-indigo-400" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* WebDAV Modal */}
      {showWebdavModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
              <button
                onClick={() => setShowWebdavModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <div className="mb-6 mt-2 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <HardDrive size={24} />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">
                  WebDAV Connection
                </h3>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
                  Enter your WebDAV server details. <strong className="text-indigo-300">Note:</strong>{' '}
                  This is a <span className="underline">SERVER URL</span>, not a local folder path on your computer.
                  <br />
                  Example: <code>https://dav.jianguoyun.com/dav/</code>
                </p>
                <p className="text-[10px] text-amber-500/80 leading-relaxed max-w-xs mt-2 p-2 bg-amber-500/10 rounded-lg">
                  WebDAV sync is experimental on Vercel deployments. If it fails, please use Scholar Passport sync or manual export for now.
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Server URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://dav.jianguoyun.com/dav/"
                    value={webdavUrl}
                    onChange={(e) => setWebdavUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Username / Email
                  </label>
                  <input
                    type="text"
                    placeholder="Your Jianguoyun Login Email"
                    value={webdavUser}
                    onChange={(e) => setWebdavUser(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    App Password
                  </label>
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
                  {webdavChecking
                    ? 'Connecting...'
                    : state.webdavSettings
                      ? 'Update WebDAV Settings'
                      : 'Connect to WebDAV'}
                </button>
                {state.webdavSettings && (
                  <button
                    onClick={() => {
                      setState((s) => {
                        const newState = { ...s };
                        delete newState.webdavSettings;
                        if (newState.syncProvider === 'WebDAV') delete newState.syncProvider;
                        return newState;
                      });
                      setShowWebdavModal(false);
                    }}
                    className="w-full py-3 mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                  >
                    Disconnect WebDAV
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        isAlert={confirmDialog.isAlert}
      />
    </>
  );
};
