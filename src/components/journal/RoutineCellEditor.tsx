import React, { useState, useMemo } from 'react';
import { StudySession, Dungeon, AppState, MajorDungeon } from '../../types';
import { cn, getSessionSettlementDate, getDescendantDungeonIds } from '../../lib/utils';
import { Check, X, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export const RoutineCellEditor = ({ 
  date, 
  routineId, 
  history, 
  dungeons, 
  majorDungeons,
  onUpdateState, 
  deleteSession,
  completeSession,
  timezone,
  timeSettings,
  onClose
}: { 
  date: Date;
  routineId: string;
  history: StudySession[];
  dungeons: Dungeon[];
  majorDungeons?: MajorDungeon[];
  onUpdateState?: (updates: any) => void;
  deleteSession?: (id: string) => void;
  completeSession?: (dungeonId: string | null, duration: number, focusDuration?: number, restDuration?: number, customTimestamp?: number, distractions?: any, assignedDateStr?: string) => void;
  timezone?: string;
  timeSettings?: AppState['timeSettings'];
  onClose?: () => void;
}) => {
  const [durationStr, setDurationStr] = useState('30');
  
  const routine = dungeons.find(d => d.id === routineId) || majorDungeons?.find(m => m.id === routineId);
  const targetDateStr = format(date, 'yyyy-MM-dd');
  const descendantIds = useMemo(() => getDescendantDungeonIds(routineId, dungeons), [routineId, dungeons]);

  // find sessions on this date for this routine
  const sessions = useMemo(() => {
    return history.filter(s => {
      const dayStr = getSessionSettlementDate(s, timeSettings, timezone);
      return dayStr === targetDateStr && descendantIds.has(s.dungeonId);
    });
  }, [history, targetDateStr, descendantIds, timezone, timeSettings]);

  if (!routine) return null;

  const handleAdd = () => {
    const mins = parseInt(durationStr);
    if (isNaN(mins) || mins <= 0) return;
    
    // Create a safe noon date for the given calendar day
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d, 12, 0, 0, 0);

    if (completeSession) {
      completeSession(
        routineId,
        mins,
        mins,
        0,
        targetDate.getTime(),
        { internal: 0, external: 0, unavoidable: 0 },
        targetDateStr
      );
    } else if (onUpdateState) {
      const newSession: StudySession = {
        id: "SD-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        dungeonId: routineId,
        timestamp: targetDate.toISOString(),
        assignedDateStr: targetDateStr,
        duration: mins,
        focusDuration: mins,
        restDuration: 0,
        distractions: { internal: 0, external: 0, unavoidable: 0 },
        coinsEarned: 0,
        xpEarned: 0
      };
      onUpdateState({ history: [...history, newSession] });
    }
    setDurationStr('30');
    if (onClose) onClose();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col gap-3 min-w-[200px] pointer-events-auto">
      <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-1">
        <span className="text-sm font-bold text-slate-200">{routine.name}</span>
        <span className="text-xs text-slate-500">{format(date, 'MMM d')}</span>
      </div>

      {sessions.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Check size={14} /> {s.duration} min
              </div>
              {deleteSession && (
                <button 
                  onClick={() => deleteSession(s.id)}
                  className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors"
                  title="Delete this record"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {onUpdateState && (
        <div className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="number" 
              value={durationStr} 
              onChange={(e) => setDurationStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
              placeholder="Mins"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </div>
          <button 
            onClick={handleAdd}
            disabled={!parseInt(durationStr)}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
