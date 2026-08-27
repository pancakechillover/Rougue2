import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';
import { APP_VERSION } from '../version';

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkForUpdate = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.version && data.version !== APP_VERSION) {
          // Version comparison: only update if remote version is newer
          const compareVersions = (v1: string, v2: string) => {
            const p1 = v1.replace(/^v/, '').split('.').map(Number);
            const p2 = v2.replace(/^v/, '').split('.').map(Number);
            for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
              const num1 = p1[i] || 0;
              const num2 = p2[i] || 0;
              if (num1 > num2) return 1;
              if (num1 < num2) return -1;
            }
            return 0;
          };
          
          if (compareVersions(data.version, APP_VERSION) > 0) {
            if (mounted) {
              setUpdateAvailable(data);
              setIsOpen(true);
            }
          }
        }
      } catch (err) {
        // Silently ignore update check failures (offline, unbuilt, etc.)
      }
    };
    
    // Check initially
    checkForUpdate();

    // Check again when the app comes back to focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdate();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 inset-x-0 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Update Available</h3>
                  <p className="text-xs font-bold text-slate-400">
                    {APP_VERSION} <span className="text-slate-600">→</span> <span className="text-indigo-400">{updateAvailable.version}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <X size={20} />
              </button>
            </div>

            {updateAvailable.latestRelease && (
              <div className="relative z-10 bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                  <h4 className="text-sm font-bold text-white">{updateAvailable.latestRelease.title}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{updateAvailable.date}</span>
                </div>
                <div className="space-y-2">
                  {updateAvailable.latestRelease.items?.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 text-xs">
                      <span className={
                        item.category === 'Feature' ? 'text-emerald-400' :
                        item.category === 'UI' ? 'text-indigo-400' :
                        item.category === 'Math' ? 'text-amber-400' :
                        item.category === 'Bug Fix' ? 'text-rose-400' : 'text-slate-400'
                      }>
                        [{item.category}]
                      </span>
                      <span className="text-slate-300 leading-snug">{item.description}</span>
                    </div>
                  ))}
                  {updateAvailable.latestRelease.items?.length > 3 && (
                    <p className="text-[10px] text-slate-500 mt-2 italic">And more changes...</p>
                  )}
                </div>
              </div>
            )}

            <div className="relative z-10 flex gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Later
              </button>
              <button 
                onClick={handleUpdate}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all"
              >
                Refresh to Update
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
