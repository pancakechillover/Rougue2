import React, { useMemo, useState } from 'react';
import { StudySession, Dungeon, MajorDungeon, AppState } from '../types';
import { X, Target, Clock, Activity, Calendar } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { cn } from '../lib/utils';
import { createPortal } from 'react-dom';
import { startOfYear, subDays, format } from 'date-fns';

interface RoutineDetailModalProps {
  routineId: string;
  history: StudySession[];
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  timezone?: string;
  onClose: () => void;
}

type Preset = 'last_7' | 'last_30' | 'this_year' | 'custom';

export const RoutineDetailModal: React.FC<RoutineDetailModalProps> = ({ routineId, history, dungeons, majorDungeons, timezone, onClose }) => {
  const [preset, setPreset] = useState<Preset>('last_7');
  
  // Custom date bounds (using YYYY-MM-DD for standard picker)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const routine = useMemo(() => {
    return dungeons.find(d => d.id === routineId) || majorDungeons.find(m => m.id === routineId);
  }, [routineId, dungeons, majorDungeons]);

  const { start, end } = useMemo(() => {
    const today = new Date();
    switch (preset) {
      case 'this_year': return { start: startOfYear(today), end: today };
      case 'last_7': return { start: subDays(today, 6), end: today };
      case 'last_30': return { start: subDays(today, 29), end: today };
      case 'custom': {
        const s = new Date(customStart);
        const e = new Date(customEnd);
        // If end is after customStart we swap safely
        return s <= e ? { start: s, end: e } : { start: e, end: s };
      }
    }
  }, [preset, customStart, customEnd]);

  const stats = useMemo(() => {
    // Collect related routines (major and their sub-dungeons)
    const validDungeonIds = new Set<string>();
    if (routine) {
        validDungeonIds.add(routine.id);
        const childDungeons = dungeons.filter(d => d.parentId === routine.id);
        childDungeons.forEach(d => validDungeonIds.add(d.id));
    }

    let totalDuration = 0;
    let completedDaysSet = new Set<string>();

    history.forEach(session => {
        if (!validDungeonIds.has(session.dungeonId)) return;
        
        // Parse time with timezone considerations if needed
        let sessionDate = new Date(session.timestamp);
        if (timezone) {
            try {
              const str = sessionDate.toLocaleString('en-US', { timeZone: timezone });
              sessionDate = new Date(str);
            } catch (e) {}
        }
        
        // Bound end to the end of the day visually
        const boundStart = new Date(start.setHours(0, 0, 0, 0));
        const boundEnd = new Date(end.setHours(23, 59, 59, 999));
        
        if (sessionDate >= boundStart && sessionDate <= boundEnd) {
             totalDuration += Math.round(session.duration || 0);
             completedDaysSet.add(format(sessionDate, 'yyyy-MM-dd'));
        }
    });

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Since start is at 00:00:00 and end is at 23:59:59, diffDays will be very close to the true difference + 1.
    // e.g. for last_7, subDays(today, 6) and today. Both adjusted above to 00:00 and 23:59.
    // So 6.99 days -> ceiling -> 7 days.
    const actualDays = Math.max(1, diffDays);

    const completedDays = completedDaysSet.size;
    const checkInRate = validDungeonIds.size > 0 ? (completedDays / actualDays) * 100 : 0;
    const avgDuration = completedDays > 0 ? totalDuration / completedDays : 0;
    
    return {
        checkInRate: Math.min(100, checkInRate).toFixed(1),
        avgDuration: Math.round(avgDuration),
        totalDuration,
        completedDays,
        totalDays: actualDays
    };
  }, [history, routine, start, end, timezone, preset, dungeons]);

  if (!routine) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-lg shadow-2xl flex flex-col md:max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-800/20">
          <div>
            <h2 className="text-xl font-black text-slate-100 pr-1">{routine.name}</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">Detailed Statistics & Data</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Timeframe Selector */}
          <div className="space-y-4">
               <div className="flex flex-wrap gap-2">
                 {[
                   { id: 'last_7', label: 'Last 7 Days' },
                   { id: 'last_30', label: 'Last 30 Days' },
                   { id: 'this_year', label: 'This Year' },
                   { id: 'custom', label: 'Custom' }
                 ].map(p => (
                   <button
                     key={p.id}
                     onClick={() => setPreset(p.id as Preset)}
                     className={cn(
                       "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors capitalize",
                       preset === p.id ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                     )}
                   >
                     {p.label}
                   </button>
                 ))}
               </div>
               
               {preset === 'custom' && (
                 <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl">
                   <Calendar size={16} className="text-indigo-400" />
                   <div className="flex-1 relative">
                      <DatePicker value={customStart} onChange={setCustomStart}>
                         <div className="text-sm font-bold text-slate-200 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-center cursor-pointer hover:bg-slate-800">{customStart}</div>
                      </DatePicker>
                   </div>
                   <span className="text-slate-500 font-bold">-</span>
                   <div className="flex-1 relative">
                      <DatePicker value={customEnd} onChange={setCustomEnd}>
                         <div className="text-sm font-bold text-slate-200 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-center cursor-pointer hover:bg-slate-800">{customEnd}</div>
                      </DatePicker>
                   </div>
                 </div>
               )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center">
                 <div className="text-slate-400 flex items-center gap-2 mb-2 font-bold text-sm tracking-wide uppercase"><Target size={16} className="text-indigo-400"/> Completion Rate</div>
                 <div className="text-3xl font-black text-white">{stats.checkInRate}%</div>
                 <div className="text-xs text-slate-500 font-bold mt-2 tracking-wide uppercase">{stats.completedDays} out of {stats.totalDays} Days</div>
             </div>

             <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center">
                 <div className="text-slate-400 flex items-center gap-2 mb-2 font-bold text-sm tracking-wide uppercase"><Clock size={16} className="text-amber-400"/> Avg Time Spent</div>
                 <div className="text-3xl font-black text-white">{stats.avgDuration} <span className="text-sm text-slate-500">min/day</span></div>
                 <div className="text-xs text-slate-500 font-bold mt-2 tracking-wide uppercase">Total {Math.round(stats.totalDuration)} min</div>
             </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
