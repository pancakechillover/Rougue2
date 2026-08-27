import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Calendar, Clock, Target, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { StudySession, Dungeon } from '../types';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

interface BulkSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkCreate: (data: {
    count: number;
    objectiveId: string;
    startTime: string;
    endTime: string;
    focusDuration?: number;
    restDuration?: number;
  }) => void;
  onBulkDelete: (data: {
    startTime: string;
    endTime: string;
  }) => void;
  dungeons: Dungeon[];
}

export const BulkSessionModal: React.FC<BulkSessionModalProps> = ({
  isOpen,
  onClose,
  onBulkCreate,
  onBulkDelete,
  dungeons
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'delete'>('create');
  const [objectiveId, setObjectiveId] = useState('');
  
  // Default to today
  const today = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const [countMode, setCountMode] = useState<'fixed' | 'auto'>('auto');
  const [fixedCount, setFixedCount] = useState<number | ''>(5);
  const [focusDuration, setFocusDuration] = useState<number | ''>(25);
  const [restDuration, setRestDuration] = useState<number | ''>(5);

  const calculateAutoCount = () => {
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    const days = Math.max(1, Math.floor((parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let dailyMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (dailyMinutes < 0) dailyMinutes += 24 * 60;

    const totalMinutes = days * dailyMinutes;
    const cycle = (Number(focusDuration) || 25) + (Number(restDuration) || 5);
    return Math.max(1, Math.floor(totalMinutes / cycle));
  };

  const currentCount = countMode === 'fixed' ? (Number(fixedCount) || 5) : calculateAutoCount();

  const handleCreate = () => {
    onBulkCreate({
      count: currentCount,
      objectiveId,
      startTime: `${startDate}T${startTime}:00`,
      endTime: `${endDate}T${endTime}:00`,
      focusDuration: Number(focusDuration) || 25,
      restDuration: Number(restDuration) || 5
    });
    onClose();
  };

  const handleDelete = () => {
    onBulkDelete({
      startTime: `${startDate}T${startTime}:00`,
      endTime: `${endDate}T${endTime}:00`
    });
    onClose();
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 pb-2 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic pr-1">Bulk Manage Sessions</h3>
              <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 gap-1">
              <button
                onClick={() => setActiveTab('create')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'create' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Plus size={14} /> Batch Entry
              </button>
              <button
                onClick={() => setActiveTab('delete')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'delete' ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Trash2 size={14} /> Batch Delete
              </button>
            </div>
          </div>

          <div className="p-6 pt-4 pb-8 space-y-6 overflow-y-auto min-h-0 custom-scrollbar">
            {/* Time Range Section - Shared */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                  <DatePicker 
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    className="w-full bg-slate-800 border-slate-700 py-2.5 text-sm font-medium hover:border-indigo-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                  <DatePicker 
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    className="w-full bg-slate-800 border-slate-700 py-2.5 text-sm font-medium hover:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Daily Start</label>
                  <TimePicker 
                    value={startTime}
                    onChange={(val) => setStartTime(val)}
                    className="w-full bg-slate-800 border-slate-700 py-2.5 text-sm font-medium hover:border-indigo-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Daily End</label>
                  <TimePicker 
                    value={endTime}
                    onChange={(val) => setEndTime(val)}
                    className="w-full bg-slate-800 border-slate-700 py-2.5 text-sm font-medium hover:border-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            {activeTab === 'create' ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Session Count</label>
                    <div className="flex bg-slate-900 rounded-lg border border-slate-700/50 p-1">
                      <button
                        onClick={() => setCountMode('auto')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                          countMode === 'auto' ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => setCountMode('fixed')}
                        className={cn(
                          "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                          countMode === 'fixed' ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        Fixed
                      </button>
                    </div>
                  </div>

                  {countMode === 'fixed' ? (
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        min="1" max="1000" 
                        value={fixedCount}
                        onChange={(e) => setFixedCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-4 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors font-bold"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400">Calculated Sessions</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Based on selected time range</span>
                      </div>
                      <span className="text-2xl font-black text-indigo-400 italic pr-1">{currentCount}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Duration (min)</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input 
                        type="number" 
                        min="1"
                        value={focusDuration}
                        onChange={(e) => setFocusDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rest (min)</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input 
                        type="number" 
                        min="0"
                        value={restDuration === '' ? '' : restDuration}
                        onChange={(e) => setRestDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Focus Objective</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <select 
                      value={objectiveId}
                      onChange={(e) => setObjectiveId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none"
                    >
                      <option value="">No Active Objective</option>
                      {dungeons.filter(d => d.status === 'active').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-3">
                  <Sparkles size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Batch sessions will be distributed across the time range. Session rewards (Coins/XP) will be automatically sent to your <span className="text-indigo-300 font-bold">Treasure Chest</span> for manual claiming.
                  </p>
                </div>

                <button 
                  onClick={handleCreate}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={18} />
                  Execute Batch Entry
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex gap-3">
                  <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Warning: All sessions within the selected range will be removed. This action <span className="text-rose-400 font-bold">cannot be undone</span>. Deleting sessions will <span className="text-indigo-300 font-bold">NOT</span> revoke rewards, Coins, or XP already claimed.
                  </p>
                </div>

                <button 
                  onClick={handleDelete}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <Trash2 size={18} />
                  Delete Sessions in Range
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
