import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Sword, 
  Clock, 
  Trophy, 
  Zap, 
  Edit2, 
  Trash2, 
  Check,
  SearchX,
  Sunrise,
  Sun,
  Moon,
  Star
} from 'lucide-react';
import { StudySession, Dungeon, MajorDungeon, RewardCard, AppState } from '../types';
import { cn, getSessionEffectiveMinutes } from '../lib/utils';
import { format, parseISO, isSameDay } from 'date-fns';
import { SpinnerInput } from './SpinnerInput';
import { createPortal } from 'react-dom';
import { ConfirmModal } from './ConfirmModal';

interface DailySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  history: StudySession[];
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  updateSession: (id: string, updates: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  rewardPool: RewardCard[];
  timeSettings: AppState['timeSettings'];
  period?: string;
  includeRestTimeInTasks?: boolean;
}

export const DailySessionsModal: React.FC<DailySessionsModalProps> = ({
  isOpen,
  onClose,
  date,
  history,
  dungeons,
  majorDungeons,
  updateSession,
  deleteSession,
  rewardPool,
  timeSettings,
  period,
  includeRestTimeInTasks
}) => {
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [viewingRewardName, setViewingRewardName] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; type?: 'danger'|'warning'|'info'; isAlert?: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const customConfirm = (message: string, onConfirm: () => void, title = 'Confirm', type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: false, type, onConfirm });
  };

  const getPeriod = useCallback((timestamp: string) => {
    if (!timeSettings) return { name: 'Other' };
    const dateObj = parseISO(timestamp);
    const hour = dateObj.getHours();
    const { morning, afternoon, night } = timeSettings;

    const isInRange = (h: number, start: number, end: number) => {
      if (start <= end) return h >= start && h < end;
      return h >= start || h < end;
    };

    let pName = 'Other';
    if (isInRange(hour, morning.start, morning.end)) pName = 'Morning';
    else if (isInRange(hour, afternoon.start, afternoon.end)) pName = 'Afternoon';
    else if (isInRange(hour, night.start, night.end)) pName = 'Night';
    
    return { name: pName };
  }, [timeSettings]);

  const dailyHistory = useMemo(() => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let filtered = history.filter(session => {
      // Use assignedDateStr if available (from processedHistory), fallback to timestamp
      const sDateStr = session.assignedDateStr || format(parseISO(session.timestamp), 'yyyy-MM-dd');
      return sDateStr === dateStr;
    });
    
    if (period && period !== 'total') {
      filtered = filtered.filter(s => {
        const p = s.period || getPeriod(s.timestamp).name;
        return p === period;
      });
    }

    return filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [history, date, period, getPeriod]);

  const rowSegments = useMemo(() => {
    const segments: (
      | { type: 'separator'; period: string; key: string; bgVariant: number }
      | { type: 'session'; session: StudySession; key: string; bgVariant: number }
    )[] = [];

    let currentBgVariant = 0;
    const showSections = !period || period === 'total';

    dailyHistory.forEach((session, index, array) => {
      const sPeriod = session.period || getPeriod(session.timestamp).name;
      const prevSession = index > 0 ? array[index - 1] : null;
      const prevPeriodName = prevSession ? (prevSession.period || getPeriod(prevSession.timestamp).name) : null;
      
      if (showSections && (index === 0 || sPeriod !== prevPeriodName)) {
        currentBgVariant = index === 0 ? 0 : (currentBgVariant + 1) % 2;
        segments.push({ 
          type: 'separator', 
          period: sPeriod, 
          key: `sep-${session.id}`,
          bgVariant: currentBgVariant
        });
      }
      segments.push({ type: 'session', session, key: session.id, bgVariant: currentBgVariant });
    });

    return segments;
  }, [dailyHistory, getPeriod, period]);

  if (!isOpen) return null;

  const getPeriodIcon = (p: string) => {
    switch(p) {
      case 'Morning': return Sunrise;
      case 'Afternoon': return Sun;
      case 'Night': return Moon;
      default: return Star;
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
              <Calendar size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white leading-none">Daily Sessions</h3>
                {period && period !== 'total' && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
                    {period}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">{format(date, 'MMMM do, yyyy')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto overflow-x-auto p-4 sm:p-6 custom-scrollbar scroll-smooth overscroll-contain">
          {dailyHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 grayscale opacity-60">
              <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
                <SearchX size={40} className="text-slate-600" />
              </div>
              <h4 className="text-white font-bold text-lg">No sessions found</h4>
              <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">No mystical progress was recorded on this day of your journey.</p>
            </div>
          ) : (
            <div className="border border-slate-800/50 rounded-2xl overflow-hidden bg-slate-800/20">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800/40 border-b border-slate-700/50">
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-[120px]">Time</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Dungeon Goal</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-[160px]">Duration</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Reward</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-[120px]">Gains</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {rowSegments.map((segment) => {
                    if (segment.type === 'separator') {
                      const Icon = getPeriodIcon(segment.period);
                      const colors = {
                        Morning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
                        Afternoon: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
                        Night: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
                        Other: 'text-slate-400 bg-slate-400/10 border-slate-400/20'
                      }[segment.period as keyof typeof colors] || 'text-slate-400 bg-slate-400/10 border-slate-400/20';

                      return (
                        <tr key={segment.key} className={cn("relative z-10 transition-colors duration-300", segment.bgVariant === 0 ? "bg-transparent" : "bg-indigo-500/5")}>
                          <td colSpan={6} className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest", colors)}>
                                <Icon size={12} className="shrink-0" />
                                {segment.period}
                              </div>
                              <div className="h-px flex-grow bg-gradient-to-r from-slate-700/50 to-transparent" />
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const session = segment.session;
                    const dungeon = dungeons.find(d => d.id === session.dungeonId);
                    const majorDungeon = dungeon?.parentId ? majorDungeons.find(m => m.id === dungeon.parentId) : null;
                    
                    return (
                      <tr key={session.id} className={cn("group transition-colors", segment.bgVariant === 0 ? "hover:bg-slate-800/30" : "bg-indigo-500/5 hover:bg-indigo-500/10")}>
                        <td className="px-5 py-4 font-bold text-slate-400 tabular-nums text-center whitespace-nowrap">
                          {format(parseISO(session.timestamp), 'HH:mm')}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col min-w-0">
                            {majorDungeon && (
                              <span className="text-[10px] font-bold text-indigo-400/70 uppercase tracking-wider mb-0.5 truncate italic pr-1">
                                {majorDungeon.name}
                              </span>
                            )}
                            <span className="text-white font-bold truncate">
                              {dungeon?.name || 'Free Study'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            <div className="text-[11px] font-bold">
                              <span className="text-indigo-400">{session.focusDuration || session.duration || 0}m</span>
                              <span className="text-slate-600 mx-1">+</span>
                              <span className="text-emerald-400">{session.restDuration || 0}m</span>
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-tighter mt-0.5">Total: {getSessionEffectiveMinutes(session, includeRestTimeInTasks)}m</div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {session.rewardName ? (
                            <button 
                              onClick={() => setViewingRewardName(session.rewardName || null)}
                              className="text-amber-500 hover:text-amber-400 font-bold transition-colors underline decoration-amber-500/20 underline-offset-4 cursor-pointer text-xs"
                            >
                              {session.rewardName}
                            </button>
                          ) : (
                            <span className="text-slate-600 italic text-xs pr-1">None</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-0.5 font-bold text-[10px]">
                            <span className="text-emerald-400">+{session.xpEarned} XP</span>
                            <span className="text-amber-500">+{session.coinsEarned} GOLD</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 transition-opacity">
                            <button
                              onClick={() => setEditingSession(session)}
                              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                customConfirm('Erase this record from time? Progress will be lost.', () => {
                                  deleteSession(session.id);
                                }, "Erase Record", "danger");
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-600 text-center font-bold uppercase tracking-widest">
          {dailyHistory.length} Sessions Recorded • Total Focus: {dailyHistory.reduce((acc, s) => acc + getSessionEffectiveMinutes(s, includeRestTimeInTasks), 0)}m
        </div>
      </motion.div>

      {/* Edit Modal Over Modal */}
      <AnimatePresence>
        {editingSession && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 w-full max-w-sm rounded-[2rem] border border-slate-700 shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-white">Edit Record</h4>
                <button onClick={() => setEditingSession(null)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Dungeon Goal</label>
                  <select
                    value={editingSession.dungeonId}
                    onChange={(e) => setEditingSession({ ...editingSession, dungeonId: e.target.value })}
                    className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="free_study">Free Study</option>
                    {dungeons.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block text-indigo-400">Focus (m)</label>
                    <SpinnerInput
                      value={editingSession.focusDuration || 0}
                      onChange={(val) => setEditingSession({ ...editingSession, focusDuration: typeof val === 'number' ? val : 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block text-emerald-400">Rest (m)</label>
                    <SpinnerInput
                      value={editingSession.restDuration || 0}
                      onChange={(val) => setEditingSession({ ...editingSession, restDuration: typeof val === 'number' ? val : 0 })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      updateSession(editingSession.id, {
                        ...editingSession,
                        duration: (editingSession.focusDuration || 0) + (editingSession.restDuration || 0)
                      });
                      setEditingSession(null);
                    }}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Update
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reward Detail Over Modal */}
      <AnimatePresence>
        {viewingRewardName && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setViewingRewardName(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-amber-500/30 shadow-2xl p-8 relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
                  <Trophy size={32} className="text-amber-500 shadow-amber-500/50" />
                </div>
                
                <h4 className="text-xl font-black text-white mb-2">{viewingRewardName}</h4>
                
                {(() => {
                  const reward = rewardPool.find(r => r.name === viewingRewardName);
                  return reward ? (
                    <p className="text-slate-400 text-sm leading-relaxed mb-6 italic pr-1">
                      {reward.description}
                    </p>
                  ) : (
                    <p className="text-slate-600 text-sm italic mb-6">Details not found.</p>
                  );
                })()}

                <button 
                  onClick={() => setViewingRewardName(null)}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && modalContent}
        </AnimatePresence>,
        document.body
      )}
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
