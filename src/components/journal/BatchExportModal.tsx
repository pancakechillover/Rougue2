import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, FileArchive, Calendar } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { AppState } from '../../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DatePicker } from '../common/DatePicker';

export interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
}

export function BatchExportModal({ isOpen, onClose, state }: BatchExportModalProps) {
  const [startDate, setStartDate] = useState(() => {
    return format(subDays(new Date(), 30), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [exportType, setExportType] = useState<'merged' | 'separated'>('merged');
  const [isExporting, setIsExporting] = useState(false);

  // Generate markdown content for a specific date
  const generateMarkdownForDate = (dateStr: string) => {
    const log = state.dailyLogs?.[dateStr];
    if (!log) return null;
    
    let md = `# Journal Entry: ${dateStr}\n\n`;
    md += `**Rating:** ${log.rating} Stars\n`;
    if (log.mood) {
      md += `**Mood:** ${log.mood}\n`;
    }
    md += `\n## Reflection\n\n${log.reflection || '*No reflection recorded.*'}\n\n`;
    md += `---\n\n`;
    return md;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Find all dates within range
      const allDates = Object.keys(state.dailyLogs || {}).filter(date => {
        return date >= startDate && date <= endDate;
      }).sort(); // Chronological

      if (allDates.length === 0) {
        alert("No journal entries found in this time range.");
        setIsExporting(false);
        return;
      }

      if (exportType === 'merged') {
        let content = `# Scholar's Dungeon - Journal Export\n\n**Period:** ${startDate} to ${endDate}\n\n---\n\n`;
        allDates.forEach(date => {
          const md = generateMarkdownForDate(date);
          if (md) content += md;
        });

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, `journal_export_${startDate}_to_${endDate}.md`);
      } else {
        const zip = new JSZip();
        const folder = zip.folder(`journal_export_${startDate}_to_${endDate}`);
        
        allDates.forEach(date => {
          const md = generateMarkdownForDate(date);
          if (md) {
            folder?.file(`journal_${date}.md`, md);
          }
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `journal_export_${startDate}_to_${endDate}.zip`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to export.");
    }
    setIsExporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-4 sm:p-6"
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex-none p-6 pb-4 flex items-center justify-between border-b border-slate-800">
            <h2 className="text-xl font-black text-slate-200 uppercase tracking-widest flex items-center gap-3">
              <Download className="text-indigo-400" size={24} />
              Export Journal
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white bg-slate-950/50 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} /> Date Range
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase">Start</label>
                  <DatePicker value={startDate} onChange={(val) => val && setStartDate(val)}>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-mono text-sm hover:border-slate-700 transition-colors cursor-pointer text-center">
                      {startDate}
                    </div>
                  </DatePicker>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase">End</label>
                  <DatePicker value={endDate} onChange={(val) => val && setEndDate(val)}>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-mono text-sm hover:border-slate-700 transition-colors cursor-pointer text-center">
                      {endDate}
                    </div>
                  </DatePicker>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Export Format</h3>
              <button
                onClick={() => setExportType('merged')}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  exportType === 'merged' 
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${exportType === 'merged' ? 'bg-indigo-500/20' : 'bg-slate-900'}`}>
                  <FileText size={20} className={exportType === 'merged' ? 'text-indigo-400' : 'text-slate-500'} />
                </div>
                <div className="text-left flex-1">
                  <div className={`font-bold ${exportType === 'merged' ? 'text-indigo-300' : 'text-slate-300'}`}>Merged Markdown</div>
                  <div className="text-xs text-slate-500 mt-0.5">All entries in a single .md file</div>
                </div>
              </button>

              <button
                onClick={() => setExportType('separated')}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  exportType === 'separated' 
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${exportType === 'separated' ? 'bg-indigo-500/20' : 'bg-slate-900'}`}>
                  <FileArchive size={20} className={exportType === 'separated' ? 'text-indigo-400' : 'text-slate-500'} />
                </div>
                <div className="text-left flex-1">
                  <div className={`font-bold ${exportType === 'separated' ? 'text-indigo-300' : 'text-slate-300'}`}>Separate Files (ZIP)</div>
                  <div className="text-xs text-slate-500 mt-0.5">One .md file per day, compressed</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              {isExporting ? 'Exporting...' : 'Export Now'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
