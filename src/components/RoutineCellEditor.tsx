import React, { useState } from 'react';
import { StudySession, Dungeon, AppState, MajorDungeon } from '../types';
import { cn } from '../lib/utils';
import { Check, X, Clock, Trash2 } from 'lucide-react';
import { format, isSameDay, subDays } from 'date-fns';

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
  completeSession?: (dungeonId: string | null, duration: number, focusDuration?: number, restDuration?: number, customTimestamp?: number) => void;
  timezone?: string;
  timeSettings?: AppState['timeSettings'];
  onClose?: () => void;
}) => {
  const [durationStr, setDurationStr] = useState('30');
  
  const routine = dungeons.find(d => d.id === routineId) || majorDungeons?.find(m => m.id === routineId);
  if (!routine) return null;

  // find sessions on this date for this routine
  const sessions = history.filter(s => {
    let sessionDate = new Date(s.timestamp);
    if (timezone) {
      try {
        const str = sessionDate.toLocaleString('en-US', { timeZone: timezone });
        sessionDate = new Date(str);
      } catch (e) {}
    }
    const resetHour = timeSettings?.night?.end || 0;
    if (resetHour > 0 && sessionDate.getHours() < resetHour) {
      sessionDate = subDays(sessionDate, 1);
    }
    return isSameDay(sessionDate, date) && (s.dungeonId === routineId || routineId === dungeons.find(x => x.id === s.dungeonId)?.parentId);
  });

  const handleAdd = () => {
    const mins = parseInt(durationStr);
    if (isNaN(mins) || mins <= 0 || !onUpdateState) return;
    
    // We want a physical timestamp that, when interpreted in the target timezone, 
    // falls on the exact calendar day represented by `date`.
    let targetTimestamp = date.getTime() + 12 * 60 * 60 * 1000;

    if (timezone) {
      // Find an absolute timestamp that will map to the target date around noon in the target timezone
      // We can iterate hour offsets from a sensible UTC baseline.
      const utcNoon = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      targetTimestamp = utcNoon; // fallback
      
      for (let offset = -24; offset <= 24; offset++) {
        const testTime = utcNoon + offset * 60 * 60 * 1000;
        try {
          const str = new Date(testTime).toLocaleString('en-US', { timeZone: timezone });
          const testD = new Date(str);
          if (testD.getFullYear() === date.getFullYear() && testD.getMonth() === date.getMonth() && testD.getDate() === date.getDate()) {
            targetTimestamp = testTime;
            if (testD.getHours() === 12) {
              break;
            }
          }
        } catch(e) {}
      }
    }

    // Bypass complex completeSession RPG logic for manual force check-ins to guarantee it works.
    // Also, historical manual corrections should not grant XP/Coins to prevent cheating.
    const newSession: StudySession = {
      id: "SD-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      dungeonId: routineId,
      timestamp: new Date(targetTimestamp).toISOString(),
      duration: mins,
      coinsEarned: 0,
      xpEarned: 0
    };
    onUpdateState({ history: [...history, newSession] });
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
