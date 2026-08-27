import React from 'react';
import { motion } from 'motion/react';
import { X, Flame, Search, HelpCircle } from 'lucide-react';
import { AppState } from '../types';
import { format, subDays, parseISO } from 'date-fns';
import { cn, getSettlementDay } from '../lib/utils';
import { ConfirmModal } from './ConfirmModal';

interface StreakRecordModalProps {
  state: AppState;
  onClose: () => void;
  repairStreak: (dateStr: string) => void;
  openGuideBook?: (chapter: number) => void;
}

export const StreakRecordModal: React.FC<StreakRecordModalProps> = ({ state, onClose, repairStreak, openGuideBook }) => {
  const [confirmRepairDate, setConfirmRepairDate] = React.useState<string | null>(null);
  const [showNoMedalAlert, setShowNoMedalAlert] = React.useState(false);

  const streakData = (() => {
    const dates = new Set<string>();
    state.history.forEach(session => {
      let sessionDate = new Date(session.timestamp);
      if (state.timezone) {
        try {
          sessionDate = new Date(sessionDate.toLocaleString('en-US', { timeZone: state.timezone }));
        } catch (e) {}
      }
      dates.add(getSettlementDay(sessionDate, state.timeSettings));
    });
    (state.patchedDays || []).forEach(d => dates.add(d));

    const result = [];
    let now = new Date();
    if (state.timezone) {
      try {
        now = new Date(now.toLocaleString('en-US', { timeZone: state.timezone }));
      } catch (e) {}
    }

    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const str = getSettlementDay(d, state.timeSettings);
      const isCompleted = dates.has(str);
      const isPatched = (state.patchedDays || []).includes(str);
      result.push({
        dateStr: str,
        shortDate: format(d, 'MM/dd'),
        displayLabel: format(d, 'EEEEEE'),
        isCompleted,
        isPatched,
        isToday: i === 0,
        // Using raw now (ignoring exact day string for future block, safe for local rendering) 
        isFuture: d > now
      });
    }
    return result;
  })();

  const availableMedals = state.deathDefyingMedals || 0;

  const hasStudiedToday = streakData.find(d => d.isToday)?.isCompleted;

  return (
    <>
      <div key="streak-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-900 w-full max-w-sm rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl relative"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                  <Flame className="text-orange-500" size={24} />
                  Streak <span className="text-orange-500">{state.streak}</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">7-Day Activity Record</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className={cn("text-xs font-bold mb-4 px-3 py-2 rounded-xl flex items-center justify-center border",
              hasStudiedToday 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            )}>
              {hasStudiedToday ? "You have studied today! Keep up the momentum." : "You haven't studied today yet. Keep the streak going!"}
            </div>

            <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 flex justify-between mb-6">
              {streakData.map((day) => (
                <div key={day.dateStr} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-medium text-slate-500 mb-0.5 tracking-wider">
                    {day.shortDate}
                  </span>
                  <span className={cn("text-[10px] font-bold uppercase", day.isToday ? "text-white" : "text-slate-400")}>
                    {day.displayLabel}
                  </span>
                  <div className="relative group mt-1">
                    {day.isCompleted ? (
                      <div className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all",
                        day.isPatched 
                          ? "bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                          : "bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                      )}>
                        <Flame size={14} className={day.isPatched ? "text-amber-400" : "text-orange-400"} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 overflow-visible relative">
                        <span className="text-slate-600 font-bold text-xs">X</span>
                        {!day.isCompleted && !day.isToday && !day.isFuture && (
                          <div 
                            className="absolute inset-0 bg-indigo-500 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-110 transition-all z-10"
                            onClick={() => {
                              if (availableMedals > 0) {
                                setConfirmRepairDate(day.dateStr);
                              } else {
                                setShowNoMedalAlert(true);
                              }
                            }}
                            title="Patch missing streak"
                          >
                            <Flame size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Search className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Streak Repair Modules</h4>
                  <p className="text-xs text-indigo-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis"><span className="text-white font-bold">{availableMedals}</span> Death Defying Gold Medal{availableMedals !== 1 ? 's' : ''} stored</p>
                </div>
              </div>
              {openGuideBook && (
                <button 
                  onClick={() => openGuideBook(4)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition-all shrink-0 ml-2"
                >
                  <HelpCircle size={16} />
                </button>
              )}
            </div>
            {(state.patchedDays || []).length > 0 && (
              <p className="text-[10px] text-slate-500 text-center mt-3 font-medium uppercase tracking-widest">
                <span className="text-amber-500">{(state.patchedDays || []).length}</span> days revived
              </p>
            )}
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={!!confirmRepairDate}
        title="Revive Streak?"
        message={`Are you sure you want to consume 1 Death Defying Gold Medal to repair your streak for ${confirmRepairDate}?`}
        onConfirm={() => {
          if (confirmRepairDate) {
            repairStreak(confirmRepairDate);
            setConfirmRepairDate(null);
          }
        }}
        onClose={() => setConfirmRepairDate(null)}
      />

      <ConfirmModal
        isOpen={showNoMedalAlert}
        onClose={() => setShowNoMedalAlert(false)}
        onConfirm={() => setShowNoMedalAlert(false)}
        title="Module Missing"
        message="You do not have any Death Defying Gold Medals to patch this missing day. You can acquire them from the Gacha or the standard Item Shop."
        confirmText="Understood"
        type="warning"
      />
    </>
  );
};
