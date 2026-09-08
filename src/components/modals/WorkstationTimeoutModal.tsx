import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Play, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { LocationIcon } from '../workstation/LocationIcon';

export interface WorkstationTimeoutInfo {
  id: string;
  location: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  note?: string;
}

export interface WorkstationTimeoutModalProps {
  isOpen: boolean;
  info: WorkstationTimeoutInfo | null;
  onContinue: (location: string, note?: string) => void;
  onDismiss: () => void;
  theme?: string;
}

export const WorkstationTimeoutModal: React.FC<WorkstationTimeoutModalProps> = ({
  isOpen,
  info,
  onContinue,
  onDismiss
}) => {
  if (!isOpen || !info) return null;

  const timeRecordedFormatted = (() => {
    try {
      const start = parseISO(info.startTime);
      const end = parseISO(info.endTime);
      if (!isValid(start) || !isValid(end)) return '4h 00m';

      const startDayStr = format(start, 'MMM d');
      const endDayStr = format(end, 'MMM d');
      const startTimeStr = format(start, 'HH:mm');
      const endTimeStr = format(end, 'HH:mm');

      if (startDayStr === endDayStr) {
        return `${startDayStr}, ${startTimeStr} – ${endTimeStr} (4h)`;
      } else {
        return `${startDayStr} ${startTimeStr} – ${endDayStr} ${endTimeStr} (4h)`;
      }
    } catch {
      return '4h 00m';
    }
  })();

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 isolate">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl p-6 z-10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Workstation Session Limit
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wider">
                  4h Max
                </span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/60 hover:bg-slate-800 rounded-full"
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>

          {/* Session Summary Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 mb-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Location:</span>
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <LocationIcon locName={info.location} className="w-3.5 h-3.5" />
                <span>{info.location}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Time Recorded:</span>
              <span className="font-semibold text-slate-200 tracking-tight font-mono">
                {timeRecordedFormatted}
              </span>
            </div>

            {info.note && (
              <div className="flex items-start justify-between text-xs pt-1.5 border-t border-slate-800/60">
                <span className="text-slate-400">Note:</span>
                <span className="text-slate-300 font-medium truncate max-w-[220px]">
                  {info.note}
                </span>
              </div>
            )}
          </div>

          {/* Simplified Prompt */}
          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            Auto-saved to workstation logs. Continue timing now?
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onDismiss}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              I'm Done
            </button>
            <button
              onClick={() => onContinue(info.location, info.note)}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Continue Timing</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
