import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, X, Sun, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { useScrollLock } from '../hooks/useScrollLock';
import { AppState } from '../types';
import { cn } from '../lib/utils';

interface BulkSleepModalProps {
  state: AppState;
  onClose: () => void;
  onSave: (date: string, sleepTime: string, wakeTime: string, sleepDurationMin: number) => void;
}

export const BulkSleepModal: React.FC<BulkSleepModalProps> = ({ state, onClose, onSave }) => {
  useScrollLock(true);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Load existing if any
  const existingLog = state.dailyLogs?.[dateStr];
  
  const [sleepTime, setSleepTime] = useState(existingLog?.sleepTime || "22:00");
  const [wakeTime, setWakeTime] = useState(existingLog?.wakeTime || "07:00");

  React.useEffect(() => {
     setSleepTime(existingLog?.sleepTime || "22:00");
     setWakeTime(existingLog?.wakeTime || "07:00");
     setSaved(false);
  }, [dateStr, existingLog?.sleepTime, existingLog?.wakeTime]);

  const { sleepDurationMin, isTimeValid } = useMemo(() => {
    if (!sleepTime || !wakeTime) return { sleepDurationMin: 0, isTimeValid: false };
    const [sH, sM] = sleepTime.split(':').map(Number);
    const [wH, wM] = wakeTime.split(':').map(Number);
    let s = sH + sM/60;
    let w = wH + wM/60;
    
    if (s <= w) {
        if (s <= 12) {
            s += 24;
            w += 24;
        }
    } else {
        w += 24; 
    }
    
    const duration = Math.round((w - s) * 60);
    const valid = duration > 0 && duration <= 16 * 60;
    
    return { sleepDurationMin: duration, isTimeValid: valid };
  }, [sleepTime, wakeTime]);

  const durationHours = Math.floor(sleepDurationMin / 60);
  const durationMins = sleepDurationMin % 60;

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!isTimeValid) return;
    onSave(dateStr, sleepTime, wakeTime, sleepDurationMin);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm m-0 border-0">
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 10 }}
           className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-visible flex flex-col"
        >
          {/* Header Decor */}
          <div className="h-2 w-full bg-indigo-500 rounded-t-3xl shrink-0" />

          {/* Simple header like other modals */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400">
                <Moon size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide uppercase">Supplement Sleep</h3>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-visible">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Date</label>
              <DatePicker
                value={dateStr}
                onChange={(str) => setSelectedDate(new Date(str))}
                className="w-full relative z-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Moon size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Fell Asleep</span>
                </div>
                <TimePicker
                  value={sleepTime}
                  onChange={setSleepTime}
                  className="w-full relative z-40"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sun size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Woke Up</span>
                </div>
                <TimePicker
                  value={wakeTime}
                  onChange={setWakeTime}
                  className="w-full relative z-30"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50 flex flex-col items-center justify-center">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Duration</span>
               <div className={cn(
                 "text-4xl font-black tabular-nums tracking-tight",
                 isTimeValid ? "text-white" : "text-rose-500"
               )}>
                 {isTimeValid ? (
                   <>
                     {durationHours}<span className="text-xl text-slate-400 mr-2">h</span>
                     {durationMins.toString().padStart(2, '0')}<span className="text-xl text-slate-400">m</span>
                   </>
                 ) : (
                   <span className="text-xl">Invalid</span>
                 )}
               </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-800/50 bg-slate-900/50 flex-shrink-0 flex flex-col gap-3">
            {!isTimeValid && (
              <div className="flex items-center justify-center gap-1.5 text-rose-400 bg-rose-500/10 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
                <X size={14} /> Sleep must be logically before wake (max 16h)
              </div>
            )}
             <button
              onClick={handleSave}
              disabled={!isTimeValid || saved}
              className={cn(
                "w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-2",
                saved ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                : isTimeValid
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              )}
             >
               <CheckCircle2 size={18} />
               {saved ? "Saved" : "Save Date"}
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
