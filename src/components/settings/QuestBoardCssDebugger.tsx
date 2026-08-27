import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Clock, Target, Coins, Zap, Gift, Square, CheckSquare, Copy, Pin, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../ConfirmModal';

interface QuestBoardCssDebuggerProps {
  onClose: () => void;
}

const CSS_VARIABLES = [
  { name: '--qb-board-bg', label: 'Board Background' },
  { name: '--qb-board-border', label: 'Board Border' },
  { name: '--qb-card-bg', label: 'Card Background' },
  { name: '--qb-card-border', label: 'Card Border' },
  { name: '--qb-card-text', label: 'Card Title Text' },
  { name: '--qb-desc-text', label: 'Card Description' },
  { name: '--qb-tag-bg', label: 'Tag Background' },
  { name: '--qb-tag-border', label: 'Tag Border' },
  { name: '--qb-tag-text', label: 'Tag Text' },
  { name: '--qb-success-bg', label: 'Success (Done) BG' },
  { name: '--qb-success-border', label: 'Success Border' },
  { name: '--qb-success-text', label: 'Success Icon Text' },
  { name: '--qb-success-hover', label: 'Success Hover BG' },
  { name: '--qb-dark-box-bg', label: 'Icon Box BG' },
  { name: '--qb-dark-box-border', label: 'Icon Box Border' },
  { name: '--qb-dark-box-text', label: 'Icon Box Text' },
  { name: '--qb-progress-bg', label: 'Progress Track BG' },
  { name: '--qb-progress-fill', label: 'Progress Fill Active' },
  { name: '--qb-progress-fill-done', label: 'Progress Fill Done' },
  { name: '--qb-progress-text', label: 'Progress Text color' },
  { name: '--qb-board-out-border', label: 'Board Outer Border' },
  { name: '--qb-checkbox-empty', label: 'Checkbox Empty Color' },
  { name: '--qb-checkbox-checked', label: 'Checkbox Checked Color' },
];

const THEMES = [
  { id: ':root', name: 'Global (Default)', attr: null },
  { id: '[data-theme="night"]', name: 'Night', attr: 'night' },
  { id: '[data-theme="forest"]', name: 'Forest', attr: 'forest' },
  { id: '[data-theme="ocean"]', name: 'Ocean', attr: 'ocean' },
  { id: '[data-theme="daylight"]', name: 'Daylight', attr: 'daylight' },
  { id: '[data-theme="warm"]', name: 'Warm Sun', attr: 'warm' },
  { id: '[data-theme="candy"]', name: 'Candy', attr: 'candy' }
];

export const QuestBoardCssDebugger: React.FC<QuestBoardCssDebuggerProps> = ({ onClose }) => {
  const [activeThemeId, setActiveThemeId] = useState(':root');
  const [colorOverrides, setColorOverrides] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem('questBoardColorOverrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [copied, setCopied] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; type?: 'danger'|'warning'|'info'; isAlert?: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const customConfirm = (message: string, onConfirm: () => void, title = 'Confirm', type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: false, type, onConfirm });
  };

  // Re-generate CSS string whenever color overrides change
  useEffect(() => {
    localStorage.setItem('questBoardColorOverrides', JSON.stringify(colorOverrides));

    let cssLines = ['/* Quest Board CSS Customizations */'];
    
    // Default raw Custom CSS can still be appended if needed, but here we build from object
    for (const [theme, vars] of Object.entries(colorOverrides)) {
      if (Object.keys(vars).length > 0) {
        cssLines.push(`${theme} {`);
        for (const [vName, vVal] of Object.entries(vars)) {
          if (vVal) cssLines.push(`  ${vName}: ${vVal} !important;`);
        }
        cssLines.push(`}`);
      }
    }

    const cssString = cssLines.join('\n');
    localStorage.setItem('questBoardCustomCss', cssString);

    let styleEl = document.getElementById('questboard-live-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'questboard-live-css';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = cssString;
  }, [colorOverrides]);

  const handleColorChange = (varName: string, value: string) => {
    setColorOverrides(prev => ({
      ...prev,
      [activeThemeId]: {
        ...(prev[activeThemeId] || {}),
        [varName]: value
      }
    }));
  };

  const handleClearColor = (varName: string) => {
    setColorOverrides(prev => {
      const newThemeVars = { ...(prev[activeThemeId] || {}) };
      delete newThemeVars[varName];
      return {
        ...prev,
        [activeThemeId]: newThemeVars
      };
    });
  };

  const generateExportCss = () => {
    let cssLines = ['/* Quest Board CSS Customizations */'];
    for (const [theme, vars] of Object.entries(colorOverrides)) {
      if (Object.keys(vars).length > 0) {
        cssLines.push(`${theme} {`);
        for (const [vName, vVal] of Object.entries(vars)) {
          if (vVal) cssLines.push(`  ${vName}: ${vVal};`); // Don't include !important in export if user applies directly in code
        }
        cssLines.push(`}`);
      }
    }
    return cssLines.join('\n');
  };

  const handleExport = () => {
    navigator.clipboard.writeText(generateExportCss());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTheme = THEMES.find(t => t.id === activeThemeId)!;
  const currentVars = colorOverrides[activeThemeId] || {};
  const [realisticMode, setRealisticMode] = useState(false);

  const modalContent = createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-[2rem] w-full h-full max-w-none flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-800 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-xs font-black text-indigo-400 tracking-[0.3em] uppercase mb-0.5">Development Utility</h2>
              <h3 className="text-sm sm:text-xl font-black text-white tracking-tight uppercase">Quest Board CSS Debugger</h3>
            </div>
            
            <div className="hidden lg:flex items-center bg-black/40 rounded-2xl p-1 border border-white/5 shadow-inner">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveThemeId(t.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all",
                    activeThemeId === t.id 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                      : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setRealisticMode(!realisticMode)}
              className={cn(
                "hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                realisticMode 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                  : "bg-slate-800 border-white/10 text-slate-400 hover:text-slate-200"
              )}
            >
              Realistic Mode
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Copy size={14} />
              {copied ? 'Copied' : 'Export CSS'}
            </button>
            <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block" />
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-all bg-slate-800 hover:bg-slate-700 p-2.5 rounded-2xl border border-white/5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mobile/Small theme selector */}
        <div className="lg:hidden flex items-center bg-black/20 p-2 overflow-x-auto shrink-0 border-b border-white/5 gap-1 custom-scrollbar">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveThemeId(t.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap",
                activeThemeId === t.id 
                  ? "bg-indigo-600 text-white shadow-lg" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top Preview Section - Resized to fit on screen */}
          <div className="p-4 overflow-y-auto border-b border-slate-800 flex flex-col items-center justify-center relative bg-black/20 shrink-0" data-theme={activeTheme.attr}>
            <div className="absolute top-2 left-4 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
              Preview Mode: <span className="text-indigo-400">{activeTheme.name}</span>
            </div>

            <div className="w-full max-w-4xl qb-board p-4 rounded-xl relative border shadow-xl mt-6">
              <div className="flex flex-col gap-3">
                {/* 1. Active Quest (Not Completed) */}
                <div 
                  className="qb-card border rounded-lg p-4 flex items-center justify-between gap-4 relative shadow-md transition-all hover:shadow-xl hover:-translate-y-0.5"
                  style={{ transform: realisticMode ? 'rotate(-1deg)' : 'none' }}
                >
                  {realisticMode && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-rose-600 drop-shadow-md">
                      <Pin size={20} fill="currentColor" strokeWidth={1} className="-rotate-12" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 shadow-sm transition-colors qb-dark-box">
                      <Target size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-sm leading-tight truncate">Defeat the Final Boss</h4>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded qb-tag text-[9px] font-bold uppercase tracking-tighter shrink-0 border">
                          <Clock size={10} /> DAILY
                        </div>
                      </div>
                      <p className="qb-card-desc font-handwriting text-xs font-bold leading-tight line-clamp-1">Enter the lair and vanquish the ancient evil.</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded qb-tag border text-[9px] font-black shadow-sm">
                          <Coins size={10} className="text-amber-600" />
                          <span>100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="h-1 w-16 qb-progress-bg rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-500 qb-progress-fill w-1/2" />
                      </div>
                      <span className="text-[9px] font-black qb-progress-text tabular-nums">0/1</span>
                    </div>
                    <div className="flex items-center pointer-events-auto ml-1">
                      <span className="flex items-center w-6 justify-end opacity-20">
                        <Square size={20} className="qb-checkbox-empty" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Completed (Not Claimed) */}
                <div 
                  className="qb-card border rounded-lg p-4 flex items-center justify-between gap-4 relative shadow-md opacity-80 grayscale-[0.4] transition-all"
                  style={{ transform: realisticMode ? 'rotate(0.5deg)' : 'none' }}
                >
                  {realisticMode && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-rose-600 drop-shadow-md">
                      <Pin size={20} fill="currentColor" strokeWidth={1} className="rotate-6" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 shadow-sm transition-colors qb-success">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-sm leading-tight truncate">Gather 10 Herbs</h4>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded qb-tag text-[9px] font-bold uppercase tracking-tighter shrink-0 border">
                          <Clock size={10} /> WEEKLY
                        </div>
                      </div>
                      <p className="qb-card-desc font-handwriting text-xs font-bold leading-tight line-clamp-1">Find the rare plants in the mystical forest.</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded qb-tag border text-[9px] font-black shadow-sm">
                          <Zap size={10} className="text-indigo-600" />
                          <span>10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="h-1 w-16 qb-progress-bg rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-500 qb-progress-fill-done w-full" />
                      </div>
                      <span className="text-[9px] font-black qb-progress-text tabular-nums">10/10</span>
                    </div>
                    <div className="flex items-center pointer-events-auto ml-1">
                      <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest transition-all shadow-lg hover:-rotate-1 active:scale-95 flex items-center gap-1.5">
                        <Gift size={12} />
                        Claim
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Completed (Claimed) */}
                <div 
                  className="qb-card border rounded-lg p-4 flex items-center justify-between gap-4 relative shadow-md opacity-80 grayscale-[0.4] transition-all"
                  style={{ transform: realisticMode ? 'rotate(-0.5deg)' : 'none' }}
                >
                  {realisticMode && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-rose-600 drop-shadow-md">
                      <Pin size={20} fill="currentColor" strokeWidth={1} className="-rotate-6" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 shadow-sm transition-colors qb-success">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-sm leading-tight truncate">First Login Today</h4>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded qb-tag text-[9px] font-bold uppercase tracking-tighter shrink-0 border">
                          <Clock size={10} /> DAILY
                        </div>
                      </div>
                      <p className="qb-card-desc font-handwriting text-xs font-bold leading-tight line-clamp-1">Welcome back to the Scholar's Sanctum.</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded qb-tag border text-[9px] font-black shadow-sm">
                          <Coins size={10} className="text-amber-600" />
                          <span>50</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="h-1 w-16 qb-progress-bg rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-500 qb-progress-fill-done w-full" />
                      </div>
                      <span className="text-[9px] font-black qb-progress-text tabular-nums">1/1</span>
                    </div>
                    <div className="flex items-center pointer-events-auto ml-1 w-[68px] justify-end">
                      <span className="flex items-center justify-end">
                        <CheckSquare size={20} className="qb-checkbox-checked opacity-80" />
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Bottom Control Section */}
          <div className="flex-1 p-6 sm:p-10 overflow-y-auto bg-slate-950 custom-scrollbar">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-white/5">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Color Palette Overrides</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium max-w-md">
                  Modify the CSS variables for the <strong className="text-indigo-400 uppercase tracking-widest">{activeTheme.name}</strong> theme level. These settings are applied via <code className="text-rose-400 font-mono text-[10px]">!important</code> in the live preview.
                </p>
              </div>
              <button 
                onClick={() => {
                  customConfirm(`Reset all colors for ${activeTheme.name}?`, () => {
                    setColorOverrides(prev => ({ ...prev, [activeThemeId]: {} }));
                  }, "Reset Colors", "danger");
                }}
                className="px-6 py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20 active:scale-95 shrink-0"
              >
                Reset {activeTheme.name}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {CSS_VARIABLES.map(variable => {
                const val = currentVars[variable.name] || '';
                return (
                  <div key={variable.name} className="flex flex-col p-4 bg-slate-900 border border-white/5 rounded-[1.5rem] relative overflow-hidden group hover:bg-slate-800 hover:border-indigo-500/30 transition-all shadow-lg">
                    <div className="flex items-center justify-between mb-3 w-full">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[70%]">{variable.label}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(variable.name);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 rounded-lg transition-all"
                        title="Copy variable name"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Native Color Picker */}
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border-2 border-white/5 shadow-2xl group cursor-pointer transition-transform active:scale-90">
                        <input 
                          type="color" 
                          value={val.startsWith('#') && (val.length === 7 || val.length === 9) ? val.slice(0,7) : '#000000'}
                          onChange={(e) => handleColorChange(variable.name, e.target.value)}
                          className="absolute inset-[-20px] w-[200%] h-[200%] opacity-0 cursor-pointer z-10"
                        />
                        <div 
                          className="w-full h-full pointer-events-none transition-transform group-hover:scale-110" 
                          style={{ backgroundColor: val || 'rgba(255,255,255,0.05)' }} 
                        />
                        {!val && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Plus size={14} className="text-white/20" />
                          </div>
                        )}
                        {val && (
                          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl pointer-events-none" />
                        )}
                      </div>
                      
                      {/* Text Input for HEX/RGBA */}
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={val}
                          onChange={(e) => handleColorChange(variable.name, e.target.value)}
                          placeholder="Default"
                          className="w-full bg-black border border-white/10 text-indigo-200 text-[11px] font-mono px-3 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700"
                        />
                        {val && (
                          <button 
                            onClick={() => handleClearColor(variable.name)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                            title="Clear"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 text-[9px] font-mono text-slate-600 truncate transition-opacity transition-opacity">
                      {variable.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {modalContent}
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

