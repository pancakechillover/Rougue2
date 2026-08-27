import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StudySession, Dungeon, MajorDungeon } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfYear, eachMonthOfInterval, endOfYear, subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { CalendarCheck2, ChevronLeft, ChevronRight, Check, Settings, X, Activity, Clock, Target } from 'lucide-react';
import { AppState } from '../types';
import { PopoverPortal } from './PopoverPortal';
import { RoutineDetailModal } from './RoutineDetailModal';

interface RoutineTrackerProps {
  history: StudySession[];
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  timeSettings?: AppState['timeSettings'];
  timezone?: string;
  renderPopover?: (date: Date, routineId: string, onClose?: () => void) => React.ReactNode;
  hiddenRoutines?: string[];
  onUpdateHiddenRoutines?: (hiddenIds: string[]) => void;
}

export const RoutineTracker: React.FC<RoutineTrackerProps> = ({ history, dungeons = [], majorDungeons = [], timeSettings, timezone, renderPopover, hiddenRoutines = [], onUpdateHiddenRoutines }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{date: number, routineId: string, element?: HTMLElement} | null>(null);
  const [isEditingVisibility, setIsEditingVisibility] = useState(false);
  const [detailRoutineId, setDetailRoutineId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element;
      if (!target.closest('.routine-cell-container') && !target.closest('.shared-popover-content')) {
        setSelectedCell(null);
      }
    };
    document.addEventListener('click', handleOutside, { capture: true });
    document.addEventListener('touchstart', handleOutside, { passive: true, capture: true });
    return () => {
      document.removeEventListener('click', handleOutside, { capture: true });
      document.removeEventListener('touchstart', handleOutside, { capture: true });
    };
  }, []);


  const routines = useMemo(() => {
    const majors = (majorDungeons || []).filter(m => m.isRoutine && m.routineType === activeTab).map(m => ({
      id: m.id,
      name: m.name,
      isMajor: true,
      tier: 'major' as const
    }));
    const subs = (dungeons || []).filter(d => d.isRoutine && d.routineType === activeTab).map(d => ({
      id: d.id,
      name: d.name,
      isMajor: false,
      tier: 'sub' as const
    }));
    return [...majors, ...subs];
  }, [majorDungeons, dungeons, activeTab]);

  const visibleRoutines = useMemo(() => {
    return routines.filter(r => !hiddenRoutines.includes(r.id));
  }, [routines, hiddenRoutines]);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (activeTab === 'monthly') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (activeTab === 'monthly') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const columns = useMemo(() => {
    if (activeTab === 'monthly') {
      return eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
    } else {
      return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    }
  }, [currentDate, activeTab]);

  const checkIns = useMemo(() => {
    const records: Record<string, Set<string>> = {}; 
    
    visibleRoutines.forEach(r => {
      records[r.id] = new Set();
    });

    history.forEach(session => {
      let sessionDate = new Date(session.timestamp);
      
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
      
      if (activeTab === 'monthly') {
        if (sessionDate.getFullYear() !== currentDate.getFullYear()) return;
      } else {
        if (sessionDate.getFullYear() !== currentDate.getFullYear() || sessionDate.getMonth() !== currentDate.getMonth()) return;
      }

      const key = activeTab === 'monthly' ? format(sessionDate, 'yyyy-MM') : format(sessionDate, 'yyyy-MM-dd');

      const isSubDungeon = dungeons.find(d => d.id === session.dungeonId);
      const isMajorDungeon = majorDungeons && majorDungeons.find(m => m.id === session.dungeonId);
      
      if (!isSubDungeon && !isMajorDungeon) return;

      if (records[session.dungeonId]) {
        records[session.dungeonId].add(key);
      }
      if (isSubDungeon && isSubDungeon.parentId && records[isSubDungeon.parentId]) {
        records[isSubDungeon.parentId].add(key);
      }
    });

    return records;
  }, [history, visibleRoutines, currentDate, activeTab, dungeons, majorDungeons]);

  const dateLabel = activeTab === 'monthly' ? format(currentDate, 'yyyy') : format(currentDate, 'MMM yyyy');

  return (
    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 lg:col-span-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 uppercase tracking-widest">
            <CalendarCheck2 size={20} className="text-indigo-400" />
            Routine Tracker
          </h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Tabs */}
          <div className="flex bg-slate-800/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            {(['daily', 'weekly', 'monthly'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveTab(mode)}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-xs font-bold rounded-md transition-all capitalize whitespace-nowrap",
                  activeTab === mode ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date Navigator */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-800/50 rounded-lg p-1 w-full sm:w-auto">
            <button 
              onClick={handlePrev} 
              className="p-2 sm:p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 select-none"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-2 min-w-[100px] text-center font-bold text-sm text-slate-200">
              {dateLabel}
            </div>
            <button 
              onClick={handleNext} 
              className="p-2 sm:p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 select-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {visibleRoutines.length === 0 ? (
        <div className="py-8 text-center border-t border-slate-800/50">
          <p className="text-sm font-medium text-slate-500 italic pr-1">No tracked {activeTab} routines active.</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th 
                  onClick={() => setIsEditingVisibility(true)}
                  className="sticky left-0 z-10 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-r border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)] cursor-pointer hover:text-indigo-400 transition-colors"
                  title="Configure task visibility"
                >
                  <div className="flex items-center gap-1 group">
                    Task
                    <Settings size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                {columns.map(col => {
                  const label = activeTab === 'monthly' ? format(col, 'MMM') : format(col, 'd');
                  
                  let isCurrent = false;
                  const today = new Date();
                  if (activeTab === 'monthly') {
                    isCurrent = col.getFullYear() === today.getFullYear() && col.getMonth() === today.getMonth();
                  } else {
                    isCurrent = col.getFullYear() === today.getFullYear() && col.getMonth() === today.getMonth() && col.getDate() === today.getDate();
                  }

                  return (
                    <th key={col.toISOString()} className={cn(
                      "px-1 py-2 text-[10px] font-bold text-center border-b min-w-[28px]",
                      isCurrent ? "text-indigo-400 border-indigo-500/50 bg-indigo-500/5" : "text-slate-500 border-transparent"
                    )}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRoutines.map((routine, idx) => (
                <tr key={routine.id} className={cn("group hover:bg-slate-800/20", idx !== visibleRoutines.length - 1 ? "border-b border-slate-800/30" : "")}>
                  <td 
                    onClick={() => setDetailRoutineId(routine.id)}
                    className="sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800/80 px-3 py-2 text-sm font-bold text-slate-200 border-r border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)] whitespace-nowrap max-w-[200px] truncate cursor-pointer hover:text-indigo-300 transition-colors" 
                    title={routine.name}
                  >
                    {routine.name}
                  </td>
                  {columns.map(col => {
                    const colKey = activeTab === 'monthly' ? format(col, 'yyyy-MM') : format(col, 'yyyy-MM-dd');
                    const isChecked = checkIns[routine.id]?.has(colKey);
                    
                    return (
                      <td key={col.toISOString()} className="p-1 text-center relative routine-cell-container">
                        <button
                          type="button"
                          onClick={(e) => activeTab !== 'monthly' ? setSelectedCell(selectedCell?.date === col.getTime() && selectedCell?.routineId === routine.id ? null : { date: col.getTime(), routineId: routine.id, element: e.currentTarget }) : undefined}
                          className={cn(
                            "mx-auto w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer",
                            isChecked ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800/30 text-transparent hover:bg-slate-800/60"
                          )}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          <PopoverPortal anchorElement={selectedCell?.element || null}>
             {selectedCell?.date && renderPopover?.(new Date(selectedCell.date), selectedCell.routineId, () => setSelectedCell(null))}
          </PopoverPortal>
        </div>
      )}

      {isEditingVisibility && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-indigo-400" />
                Configure Tasks
              </h3>
              <button 
                onClick={() => setIsEditingVisibility(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-2 relative">
              {routines.map(routine => {
                const isHidden = hiddenRoutines.includes(routine.id);
                return (
                  <div key={routine.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800 flex-shrink-0">
                    <span className={cn("font-medium text-sm truncate pr-2", isHidden ? "text-slate-500 line-through" : "text-slate-200")}>
                      {routine.name}
                    </span>
                    <button
                      onClick={() => {
                        if (isHidden) {
                          onUpdateHiddenRoutines?.(hiddenRoutines.filter(id => id !== routine.id));
                        } else {
                          onUpdateHiddenRoutines?.([...hiddenRoutines, routine.id]);
                        }
                      }}
                      className={cn(
                        "w-10 h-6 shrink-0 rounded-full transition-colors relative",
                        !isHidden ? "bg-indigo-500" : "bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 max-w-[16px] w-4 h-4 rounded-full transition-all flex items-center justify-center",
                        !isHidden ? "right-1 bg-white" : "left-1 bg-slate-400"
                      )} />
                    </button>
                  </div>
                );
              })}
              {routines.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No routines found.
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
              <button 
                onClick={() => setIsEditingVisibility(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detailRoutineId && (
        <RoutineDetailModal
          routineId={detailRoutineId}
          history={history}
          dungeons={dungeons}
          majorDungeons={majorDungeons}
          timezone={timezone}
          onClose={() => setDetailRoutineId(null)}
        />
      )}
    </div>
  );
};
