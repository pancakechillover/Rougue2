import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, Edit2, Check, Clock, Brain, Wind, Zap, Hash, RotateCcw, Sparkles, Target, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { StudySession, Dungeon, MajorDungeon } from '../../types';
import { cn } from '../../lib/utils';
import { SpinnerInput } from '../common/SpinnerInput';
import { ExpeditionSelect } from '../common/ExpeditionSelect';

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
    }
  }, [session, isOpen]);

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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md m-0 p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        <motion.div
          initial={{ scale: 0.98, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border-0 rounded-none w-screen h-screen h-[100dvh] shadow-2xl overflow-hidden relative flex flex-col z-10"
        >
          {/* Top Full-Screen Header (Matches Start of the Day / End of the Day) */}
          <div className="py-4 px-6 sm:px-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent relative overflow-hidden flex-shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none z-0">
              <Edit2 size={80} />
            </div>

            <div className="flex justify-between items-center relative z-10 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 md:gap-5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-1 flex items-center gap-3">
                  Edit Session <Edit2 className="text-indigo-400" size={24} />
                </h2>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 tracking-wider flex items-center gap-2 mt-1 sm:mt-0 font-mono">
                  <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    Total: {totalDuration}m
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Full-Screen Body */}
          <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-grow custom-scrollbar lg:grid lg:grid-cols-2 lg:gap-8 space-y-6 lg:space-y-0 relative">
            {/* Left Column: Objective, Start Time, Duration & Distractions */}
            <div className="space-y-4 flex flex-col max-w-xl mx-auto w-full">
              {/* Objective & Start Time Card */}
              <div className="bg-slate-800/20 rounded-2xl p-4 sm:p-5 border border-slate-700/30 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Target size={15} className="text-indigo-400" />
                      Dungeon Objective
                    </label>
                    {dungeonId !== 'free_study' && (
                      <button
                        type="button"
                        onClick={() => setDungeonId('free_study')}
                        className="text-xs text-slate-500 hover:text-amber-400 transition-colors font-medium flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <ExpeditionSelect
                      dungeons={dungeons}
                      majorDungeons={majorDungeons}
                      selectedId={dungeonId}
                      includeCompleted
                      allowFreeStudy
                      matchTriggerWidth
                      zIndexClassName="z-[10000]"
                      onSelect={(item) => setDungeonId(item.id)}
                      renderTrigger={({ open, toggle, triggerRef }) => (
                        <button
                          ref={triggerRef}
                          type="button"
                          onClick={toggle}
                          className={cn(
                            'w-full bg-slate-950/70 border rounded-xl py-2.5 px-3.5 text-sm text-left flex items-center justify-between transition-all',
                            open
                              ? 'border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                              : 'border-slate-800 text-white hover:border-slate-700'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {selectedDungeon ? (
                              <>
                                <Target size={15} className="text-indigo-400 shrink-0" />
                                <span className="truncate font-semibold text-white">
                                  {selectedDungeon.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={15} className="text-amber-400 shrink-0" />
                                <span className="truncate font-semibold text-slate-200">
                                  Free Study
                                </span>
                              </>
                            )}
                          </div>
                          <ChevronDown
                            size={15}
                            className={cn(
                              'text-slate-400 transition-transform duration-200 shrink-0 ml-1',
                              open && 'rotate-180'
                            )}
                          />
                        </button>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Clock size={15} className="text-indigo-400" />
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:border-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Duration & Distractions Card */}
              <div className="bg-slate-800/20 rounded-2xl p-4 sm:p-5 border border-slate-700/30 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-indigo-400 block">
                      Focus Time (min)
                    </label>
                    <SpinnerInput
                      value={focusDuration}
                      onChange={(val) => setFocusDuration(typeof val === 'number' ? Math.max(0, val) : 0)}
                      className="w-full bg-slate-950/70"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">
                      Rest Time (min)
                    </label>
                    <SpinnerInput
                      value={restDuration}
                      onChange={(val) => setRestDuration(typeof val === 'number' ? Math.max(0, val) : 0)}
                      className="w-full bg-slate-950/70"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-800/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Distractions</span>
                      {totalDistractions > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-bold font-mono">
                          {totalDistractions} ({formattedRate}/m)
                        </span>
                      )}
                    </div>
                    {totalDistractions > 0 && (
                      <button
                        type="button"
                        onClick={handleResetDistractions}
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw size={12} />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                        <Brain size={12} />
                        <span>Internal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInternalDistractions((prev) => Math.max(0, prev - 1))}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="text-sm font-mono font-bold text-white w-5 text-center">
                          {internalDistractions}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInternalDistractions((prev) => prev + 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-orange-400">
                        <Wind size={12} />
                        <span>External</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExternalDistractions((prev) => Math.max(0, prev - 1))}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="text-sm font-mono font-bold text-white w-5 text-center">
                          {externalDistractions}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExternalDistractions((prev) => prev + 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                        <Zap size={12} />
                        <span>Unavoidable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUnavoidableDistractions((prev) => Math.max(0, prev - 1))}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="text-sm font-mono font-bold text-white w-5 text-center">
                          {unavoidableDistractions}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUnavoidableDistractions((prev) => prev + 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Study Note & Save Button (Matches End of the Day Right Column) */}
            <div className="space-y-4 flex flex-col max-w-xl mx-auto w-full">
              <div className="bg-slate-800/20 rounded-2xl p-4 sm:p-5 border border-slate-700/30 space-y-3 flex flex-col flex-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Hash size={14} className="text-indigo-400" />
                    Study Note
                  </label>
                  <span className="text-xs text-slate-500 font-mono">{note.length} chars</span>
                </div>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add notes, context, or #hashtags..."
                  className="w-full flex-1 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:border-indigo-500 outline-none resize-none placeholder:text-slate-600 min-h-[160px] transition-all leading-relaxed"
                />

                {allHashtags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {allHashtags.slice(0, 8).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertHashtag(tag)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg transition-all border',
                          note.includes(tag)
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-800/70 text-slate-400 border-slate-700/50 hover:text-white'
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 shrink-0"
              >
                <Check size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
