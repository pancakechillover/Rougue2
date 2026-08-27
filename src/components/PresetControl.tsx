import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, X, Check, Star, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PresetControlProps<T> {
  type: string;
  currentData: T;
  onLoad: (data: T) => void;
  className?: string;
  // Fallback data when resetting/clearing
  defaultData: T;
}

export function PresetControl<T>({ type, currentData, onLoad, className, defaultData }: PresetControlProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<Record<string, T>>({});
  const [newName, setNewName] = useState('');
  const [autoLoad, setAutoLoad] = useState(false);

  const presetsKey = `${type}_presets_v2`;
  const autoLoadKey = `${type}_autoload_v2`;
  const activePresetKey = `${type}_active_name_v2`;

  useEffect(() => {
    const saved = localStorage.getItem(presetsKey);
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse presets', e);
      }
    }
    setAutoLoad(localStorage.getItem(autoLoadKey) === 'true');
  }, [presetsKey, autoLoadKey]);

  const savePreset = () => {
    if (!newName.trim()) return;
    const updated = { ...presets, [newName.trim()]: currentData };
    setPresets(updated);
    localStorage.setItem(presetsKey, JSON.stringify(updated));
    localStorage.setItem(activePresetKey, newName.trim());
    setNewName('');
  };

  const deletePreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...presets };
    delete updated[name];
    setPresets(updated);
    localStorage.setItem(presetsKey, JSON.stringify(updated));
    if (localStorage.getItem(activePresetKey) === name) {
      localStorage.removeItem(activePresetKey);
    }
  };

  const toggleAutoLoad = () => {
    const next = !autoLoad;
    setAutoLoad(next);
    localStorage.setItem(autoLoadKey, next ? 'true' : 'false');
  };

  const loadPreset = (name: string) => {
    onLoad(presets[name]);
    localStorage.setItem(activePresetKey, name);
    setIsOpen(false);
  };

  const presetNames = Object.keys(presets);

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
          isOpen 
            ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" 
            : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
        )}
      >
        <FolderOpen size={12} className={cn(isOpen && "animate-pulse")} />
        Presets {presetNames.length > 0 && `(${presetNames.length})`}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[120]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl z-[130] space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Manage Presets</h4>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className={cn(
                    "text-[9px] font-bold transition-colors uppercase tracking-tight",
                    autoLoad ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400"
                  )}>Auto-Load</span>
                  <div 
                    onClick={(e) => { e.preventDefault(); toggleAutoLoad(); }}
                    className={cn(
                      "w-7 h-4 rounded-full relative transition-colors",
                      autoLoad ? "bg-indigo-600" : "bg-slate-800 border border-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                      autoLoad ? "left-3.5" : "left-0.5"
                    )} />
                  </div>
                </label>
              </div>

              {/* Save New */}
              <div className="space-y-2">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Preset Name..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                    onKeyDown={e => e.key === 'Enter' && savePreset()}
                  />
                  <button
                    onClick={savePreset}
                    disabled={!newName.trim()}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Save size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {presetNames.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic pr-1">No presets saved</p>
                  </div>
                ) : (
                  presetNames.map(name => (
                    <div
                      key={name}
                      onClick={() => loadPreset(name)}
                      className="group flex items-center justify-between p-2 rounded-xl bg-slate-950/50 hover:bg-slate-800/80 border border-transparent hover:border-indigo-500/30 transition-all cursor-pointer"
                    >
                      <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate pr-2">{name}</span>
                      <button
                        onClick={(e) => deletePreset(name, e)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-opacity transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function getAutoLoadedPreset<T>(type: string): T | null {
  const presetsKey = `${type}_presets_v2`;
  const autoLoadKey = `${type}_autoload_v2`;
  const activePresetKey = `${type}_active_name_v2`;

  if (localStorage.getItem(autoLoadKey) !== 'true') return null;

  const activeName = localStorage.getItem(activePresetKey);
  if (!activeName) return null;

  const saved = localStorage.getItem(presetsKey);
  if (!saved) return null;

  try {
    const presets = JSON.parse(saved);
    return presets[activeName] || null;
  } catch (e) {
    return null;
  }
}
