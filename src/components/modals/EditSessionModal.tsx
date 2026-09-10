import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, Edit2, Check, Clock, Calendar, Brain, Wind, Zap, Hash, RotateCcw, Sparkles, Target, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { StudySession, Dungeon, MajorDungeon } from '../../types';
import { cn } from '../../lib/utils';
import { SpinnerInput } from '../common/SpinnerInput';
import { ExpeditionTreePicker } from '../common/ExpeditionTreePicker';

interface EditSessionModalProps {
  session: StudySession | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionId: string, updates: Partial<StudySession>) => void;
  dungeons: Dungeon[];
  majorDungeons?: MajorDungeon[];
  allHashtags?: string[];
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onSave,
  dungeons,
  majorDungeons = [],
  allHashtags = []
}) => {
  const [dungeonId, setDungeonId] = useState('free_study');
  const [showExpeditionPicker, setShowExpeditionPicker] = useState(false);
  const [timestamp, setTimestamp] = useState('');
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [restDuration, setRestDuration] = useState<number>(5);
  const [internalDistractions, setInternalDistractions] = useState<number>(0);
  const [externalDistractions, setExternalDistractions] = useState<number>(0);
  const [unavoidableDistractions, setUnavoidableDistractions] = useState<number>(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (session && isOpen) {
      setDungeonId(session.dungeonId || 'free_study');
      try {
        setTimestamp(format(parseISO(session.timestamp), "yyyy-MM-dd'T'HH:mm"));
      } catch {
        setTimestamp(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      }
      setFocusDuration(session.focusDuration !== undefined ? session.focusDuration : (session.duration || 0));
      setRestDuration(session.restDuration !== undefined ? session.restDuration : 0);
      setInternalDistractions(session.distractions?.internal || 0);
      setExternalDistractions(session.distractions?.external || 0);
      setUnavoidableDistractions(session.distractions?.unavoidable || 0);
      setNote(session.note || '');
      setShowExpeditionPicker(false);
    }
  }, [session, isOpen]);

  // Close expedition picker when clicking outside
  useEffect(() => {
    if (!showExpeditionPicker) return;
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.expedition-picker-container')) {
        setShowExpeditionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [showExpeditionPicker]);

  if (!isOpen || !session) return null;

  const selectedDungeon = dungeonId !== 'free_study'
    ? (dungeons.find(d => d.id === dungeonId) || majorDungeons.find(m => m.id === dungeonId))
    : null;

  const totalDuration = (Number(focusDuration) || 0) + (Number(restDuration) || 0);
  const totalDistractions = internalDistractions + externalDistractions + unavoidableDistractions;
  const focusMins = Math.max(1, Number(focusDuration) || totalDuration || 1);
  const distractionRate = totalDistractions / focusMins;
  const formattedRate = distractionRate < 0.1 ? distractionRate.toFixed(2) : (distractionRate >= 10 ? Math.round(distractionRate).toString() : distractionRate.toFixed(1));

  const handleSave = () => {
    const updatedDistractions = {
      internal: Number(internalDistractions) || 0,
      external: Number(externalDistractions) || 0,
      unavoidable: Number(unavoidableDistractions) || 0
    };

    let isoTimestamp = session.timestamp;
    try {
      if (timestamp) {
        isoTimestamp = new Date(timestamp).toISOString();
      }
    } catch (e) {
      console.error('Invalid timestamp format:', e);
    }

    onSave(session.id, {
      dungeonId,
      timestamp: isoTimestamp,
      focusDuration: Number(focusDuration) || 0,
      restDuration: Number(restDuration) || 0,
      duration: totalDuration,
      distractions: updatedDistractions,
      note: note.trim() || undefined
    });
    onClose();
  };

  const insertHashtag = (tag: string) => {
    if (!note.includes(tag)) {
      setNote(prev => prev ? `${prev} ${tag}` : tag);
    }
  };

  const handleResetDistractions = () => {
    setInternalDistractions(0);
    setExternalDistractions(0);
    setUnavoidableDistractions(0);
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 isolate">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl z-10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 pb-3 shrink-0 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Edit2 size={18} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Edit Session
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {session.id ? `ID: #${session.id.slice(-6)}` : 'Session Details'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/60 hover:bg-slate-800 rounded-full"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body content */}
          <div className="p-5 sm:p-6 pt-4 space-y-5 overflow-y-auto min-h-0 custom-scrollbar">
            {/* Dungeon Objective */}
            <div className="space-y-1.5 relative expedition-picker-container">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Target size={12} className="text-indigo-400" />
                  Dungeon Objective
                </label>
                {dungeonId !== 'free_study' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDungeonId('free_study');
                      setShowExpeditionPicker(false);
                    }}
                    className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors font-medium flex items-center gap-1 pr-1"
                    title="Switch back to Free Study"
                  >
                    <RotateCcw size={10} />
                    Reset to Free Study
                  </button>
                )}
              </div>

              {/* Selector Box */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExpeditionPicker(!showExpeditionPicker)}
                  className={cn(
                    "w-full bg-slate-800/90 border rounded-xl py-2.5 px-3.5 text-sm text-left flex items-center justify-between transition-all group",
                    showExpeditionPicker
                      ? "border-indigo-500 ring-2 ring-indigo-500/30 text-white"
                      : "border-slate-700/80 text-white hover:border-slate-600 hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {selectedDungeon ? (
                      <>
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <Target size={14} />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="truncate font-semibold text-white">
                            {selectedDungeon.name}
                          </span>
                          {'status' in selectedDungeon && selectedDungeon.status === 'completed' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0 uppercase tracking-wider">
                              Completed
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                          <Sparkles size={14} />
                        </div>
                        <span className="truncate font-semibold text-slate-200">
                          Free Study
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                      {showExpeditionPicker ? 'Close' : 'Change'}
                    </span>
                    <ChevronDown 
                      size={15} 
                      className={cn("text-slate-400 transition-transform duration-200", showExpeditionPicker && "rotate-180")} 
                    />
                  </div>
                </button>

                {/* Dropdown ExpeditionTreePicker */}
                {showExpeditionPicker && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] shadow-2xl z-50">
                    <ExpeditionTreePicker
                      dungeons={dungeons}
                      majorDungeons={majorDungeons}
                      selectedId={dungeonId}
                      includeCompleted={true}
                      allowFreeStudy={true}
                      onSelect={(item) => {
                        setDungeonId(item.id);
                        setShowExpeditionPicker(false);
                      }}
                      onClose={() => setShowExpeditionPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Start Time */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Dungeon Start Time
              </label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
              />
              <p className="text-[10px] text-slate-500 italic px-1">Adjusting time aligns daily analytics in Record charts.</p>
            </div>

            {/* Durations with Auto-Summed Display */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} className="text-indigo-400" />
                  Duration Breakdown
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black">
                  <span>Total:</span>
                  <span className="font-mono text-sm">{totalDuration}</span>
                  <span className="text-[10px] text-indigo-400 font-sans font-medium">min</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block ml-0.5">
                    Focus Time (m)
                  </label>
                  <SpinnerInput
                    value={focusDuration}
                    onChange={(val) => setFocusDuration(typeof val === 'number' ? Math.max(0, val) : 0)}
                    className="w-full bg-slate-800/90"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block ml-0.5">
                    Rest Time (m)
                  </label>
                  <SpinnerInput
                    value={restDuration}
                    onChange={(val) => setRestDuration(typeof val === 'number' ? Math.max(0, val) : 0)}
                    className="w-full bg-slate-800/90"
                  />
                </div>
              </div>
            </div>

            {/* Distraction Counts */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Distractions
                  </span>
                  {totalDistractions > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold font-mono">
                      {totalDistractions} total ({formattedRate}/min)
                    </span>
                  )}
                </div>
                {totalDistractions > 0 && (
                  <button
                    onClick={handleResetDistractions}
                    className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
                    title="Reset all distractions to 0"
                  >
                    <RotateCcw size={10} />
                    Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Internal */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400">
                    <Brain size={12} />
                    <span>Internal</span>
                  </div>
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setInternalDistractions(prev => Math.max(0, prev - 1))}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-mono font-bold text-white w-6 text-center">
                      {internalDistractions}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInternalDistractions(prev => prev + 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* External */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400">
                    <Wind size={12} />
                    <span>External</span>
                  </div>
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setExternalDistractions(prev => Math.max(0, prev - 1))}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-mono font-bold text-white w-6 text-center">
                      {externalDistractions}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExternalDistractions(prev => prev + 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Unavoidable */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                    <Zap size={12} />
                    <span>Unavoidable</span>
                  </div>
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setUnavoidableDistractions(prev => Math.max(0, prev - 1))}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-mono font-bold text-white w-6 text-center">
                      {unavoidableDistractions}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUnavoidableDistractions(prev => prev + 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Study Note Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Hash size={12} className="text-indigo-400" />
                  Study Note
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {note.length} chars
                </span>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add notes, context, or #hashtags about this session..."
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none placeholder:text-slate-600 min-h-[90px] transition-all leading-relaxed"
              />

              {allHashtags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">
                    Quick Tags:
                  </span>
                  {allHashtags.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertHashtag(tag)}
                      className={cn(
                        "px-2 py-0.5 text-[11px] rounded-lg transition-all border",
                        note.includes(tag)
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                          : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 pt-3 pb-5 border-t border-slate-800/80 flex gap-3 bg-slate-950/40">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
