import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Download, AlertTriangle, Cloud, HardDrive, Database, Server, RefreshCw } from 'lucide-react';
import { AppState } from '../../types';
import { cn } from '../../lib/utils';
import { GoogleDriveAPI } from '../../lib/googleDriveApi';

interface CloudHistoryModalProps {
  onClose: () => void;
  state: AppState;
  onRestore: (data: any) => void;
}

export function CloudHistoryModal({ onClose, state, onRestore }: CloudHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      if (state.syncProvider === 'Redis' && state.secretCode) {
        const res = await fetch('/api/sync/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secretCode: state.secretCode })
        });
        const data = await res.json();
        if (data.history) {
          setHistory(data.history);
        } else {
          setError(data.error || 'Failed to fetch Redis history');
        }
      } else if (state.syncProvider === 'Google Drive' && state.googleDriveTokens) {
        const driveApi = new GoogleDriveAPI(state.googleDriveTokens.access_token);
        const fileId = await driveApi.findFileByName('scholars_dungeon_save_history.json');
        if (fileId) {
          const data = await driveApi.readSaveFile(fileId);
          setHistory(Array.isArray(data) ? data : []);
        } else {
          setHistory([]);
        }
      } else if (state.syncProvider === 'WebDAV' && state.webdavSettings?.url) {
        let baseUrl = state.webdavSettings.url;
        if (baseUrl.endsWith('scholars_dungeon_save.json')) {
            baseUrl = baseUrl.replace('scholars_dungeon_save.json', '');
        }
        if (!baseUrl.endsWith('/')) baseUrl += '/';
        const url = baseUrl + 'scholars_dungeon_save_history.json';
        
        const res = await fetch('/api/webdav/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                username: state.webdavSettings.username,
                password: state.webdavSettings.password,
                method: 'GET'
            })
        });
        if (res.status === 404) {
            setHistory([]);
        } else if (res.ok) {
            const data = await res.json();
            setHistory(Array.isArray(data) ? data : []);
        } else {
            setError(`WebDAV returned ${res.status}`);
        }
      } else {
        setError('No active cloud provider connected.');
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [state.syncProvider]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm border-0 m-0">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
               <History size={24} />
             </div>
             <div>
               <h3 className="text-xl font-bold text-white tracking-tight">Cloud Save History</h3>
               <p className="text-sm text-slate-400">Last 3 prior configurations overwritten on the cloud</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4 opacity-70">
              <RefreshCw className="animate-spin text-indigo-400" size={32} />
              <div className="text-slate-400 text-sm tracking-widest font-medium uppercase">Fetching Chronology...</div>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col items-center gap-3 text-center">
               <AlertTriangle className="text-rose-400" size={32} />
               <p className="text-rose-300 font-medium">{error}</p>
               <button onClick={fetchHistory} className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">Retry</button>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3 opacity-60">
              <Database size={48} className="text-slate-600" />
              <div className="text-slate-400 text-sm font-medium">No previous history records available.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => {
                const updatedObj = new Date(record.lastUpdated || (record.state && record.state.lastUpdated) || 0);
                const updatedStr = updatedObj.getTime() ? updatedObj.toLocaleString() : 'Unknown';
                const nick = record.savedBy || record.state?.deviceNickname || 'Unknown Device';
                const dCode = record.savedByDeviceCode || record.state?.deviceCode || record.deviceCode || '???';
                
                return (
                  <div key={index} className="p-5 bg-slate-800/60 rounded-2xl border border-slate-700/60 hover:bg-slate-800 transition-colors group flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs font-bold text-slate-300">#{index + 1}</span>
                        <span className="font-bold text-slate-200 truncate">{updatedStr}</span>
                      </div>
                      <div className="text-sm text-slate-400 flex items-center gap-2">
                        <HardDrive size={14} /> {nick} 
                        <span className="opacity-50 text-[10px]">({dCode})</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => onRestore(record)}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95 shrink-0 shadow-lg shadow-indigo-500/20"
                    >
                      <Download size={16} />
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
