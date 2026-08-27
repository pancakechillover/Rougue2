import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Upload, AlertTriangle, FileText, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (markdown: string) => void;
  exportData: string;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  exportData
}) => {
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expeditions_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      if (!importText.trim()) {
        setError('Please paste the markdown list first.');
        return;
      }
      onImport(importText);
      setImportText('');
      setError(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid format.');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 isolate">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header Decor */}
          <div className="h-2 w-full bg-indigo-500" />

          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <FileText size={20} />
              </div>
              Import / Export Expeditions
            </h3>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-xl">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                     Export Current List (Markdown)
                  </label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700"
                      title="Download as .md file"
                    >
                      <Download size={12} />
                      Download .md
                    </button>
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/5 px-2.5 py-1.5 rounded-lg border border-indigo-500/10"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="relative group">
                  <textarea 
                    readOnly
                    value={exportData}
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-slate-400 text-xs font-mono focus:outline-none"
                    placeholder="No expeditions to export"
                  />
                </div>
             </div>

             <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                   Paste Markdown to Import
                </label>
                <textarea 
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="# Expedition Goal: My Goal... (active)\n## Tier 1: Sub-task (active)\n..."
                  className={cn(
                    "w-full h-48 bg-slate-800 border rounded-2xl px-4 py-4 text-white text-xs font-mono focus:outline-none transition-all",
                    error ? "border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.1)]" : "border-slate-700 focus:border-indigo-500/50"
                  )}
                />
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-rose-400 text-[10px] font-bold bg-rose-500/5 p-3 rounded-xl border border-rose-500/10"
                  >
                    <AlertTriangle size={14} className="shrink-0" />
                    {error}
                  </motion.div>
                )}
             </div>

             <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  Note: Importing will <span className="text-amber-500 font-bold italic">APPEND</span> the new expeditions to your existing list. You can reorder, move, or delete them in Edit Mode later.
                </p>
             </div>
          </div>

          <div className="p-6 border-t border-slate-800 flex flex-col sm:flex-row justify-end gap-3">
             <button 
               onClick={onClose}
               className="order-2 sm:order-1 px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-white transition-colors"
             >
               Cancel
             </button>
             <button 
               onClick={handleImport}
               className="order-1 sm:order-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               <Upload size={18} />
               Import Expeditions
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
