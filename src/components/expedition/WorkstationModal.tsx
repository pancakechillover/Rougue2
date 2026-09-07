import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MapPin, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  Home, 
  BookOpen, 
  Coffee, 
  Laptop, 
  Sparkles,
  Percent,
  Play,
  Square,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, isValid, addDays, subDays, differenceInMinutes } from 'date-fns';
import { AppState, WorkstationInterval, ActiveWorkstationSession } from '../../types';
import { cn, formatDuration, getSessionEffectiveMinutes, getSettlementDay } from '../../lib/utils';
import { 
  getWorkstationLocations,
  getWorkstationTotalMinutes, 
  getEffectiveTargetFocusMinutes, 
  getActiveSessionDurationFormatted 
} from '../../lib/workstationUtils';
import { playSound } from '../../lib/sound';
import { LocationIcon } from '../workstation/LocationIcon';

interface WorkstationModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
  initialDate?: string;
}

export const WorkstationModal: React.FC<WorkstationModalProps> = ({
  isOpen,
  onClose,
  state,
  setState,
  syncToCloud,
  initialDate
}) => {
  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');
  const todayStr = useMemo(() => getSettlementDay(new Date(), state.timeSettings), [state.timeSettings]);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [now, setNow] = useState<Date>(new Date());

  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);
  const defaultLoc = locations[0] || 'Home';

  // Active session clock ticking
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Form states for adding / editing intervals
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add / Edit form fields
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formLocation, setFormLocation] = useState<string>(defaultLoc);
  const [formNote, setFormNote] = useState('');
  const [formCustomLocation, setFormCustomLocation] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  // Quick punch location selection inside modal
  const [quickCheckInLocation, setQuickCheckInLocation] = useState(defaultLoc);
  const [quickCheckInNote, setQuickCheckInNote] = useState('');

  if (!isOpen) return null;

  const intervals: WorkstationInterval[] = state.workstationLogs?.[selectedDate] || [];
  const activeSession = state.activeWorkstationSession;
  const isToday = selectedDate === todayStr;

  // Active session calculation if on selected date
  const isActiveOnSelectedDate = activeSession && activeSession.startTime && (
    getSettlementDay(parseISO(activeSession.startTime), state.timeSettings) === selectedDate
  );

  // Focus duration on selected date
  const selectedDateFocusMinutes = (state.history || [])
    .filter(s => getSettlementDay(new Date(s.timestamp), state.timeSettings) === selectedDate)
    .reduce((acc, s) => acc + getSessionEffectiveMinutes(s, state.includeRestTimeInTasks ?? false), 0);

  const totalPresenceMinutes = getWorkstationTotalMinutes(selectedDate, state, now);
  const targetFocusStats = getEffectiveTargetFocusMinutes(selectedDate, state, selectedDateFocusMinutes, now);

  const conversionRate = totalPresenceMinutes > 0
    ? Math.min(100, Math.round((selectedDateFocusMinutes / totalPresenceMinutes) * 100))
    : 0;

  const handleStartSession = (locationToUse?: string, noteToUse?: string) => {
    const startISO = new Date().toISOString();
    const loc = locationToUse || quickCheckInLocation || defaultLoc;
    const note = noteToUse || quickCheckInNote;
    const newSession: ActiveWorkstationSession = {
      id: `ws_${Date.now()}`,
      startTime: startISO,
      location: loc,
      note: note.trim() || undefined
    };

    setState(prev => {
      const next: AppState = {
        ...prev,
        activeWorkstationSession: newSession
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });

    setQuickCheckInNote('');
    playSound('click');
  };

  const handleEndSession = () => {
    if (!activeSession) return;
    const end = new Date();
    const start = parseISO(activeSession.startTime);
    const durMins = Math.max(1, differenceInMinutes(end, start));
    const sessionDate = getSettlementDay(start, state.timeSettings);

    const completedInterval: WorkstationInterval = {
      id: activeSession.id,
      date: sessionDate,
      startTime: activeSession.startTime,
      endTime: end.toISOString(),
      durationMinutes: durMins,
      location: activeSession.location || defaultLoc,
      note: activeSession.note
    };

    setState(prev => {
      const existing = prev.workstationLogs?.[sessionDate] || [];
      const updatedLogs = {
        ...(prev.workstationLogs || {}),
        [sessionDate]: [...existing, completedInterval]
      };
      const next: AppState = {
        ...prev,
        workstationLogs: updatedLogs,
        activeWorkstationSession: null
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });

    playSound('reward');
  };

  const handleDeleteInterval = (id: string) => {
    setState(prev => {
      const existing = prev.workstationLogs?.[selectedDate] || [];
      const filtered = existing.filter(i => i.id !== id);
      const next: AppState = {
        ...prev,
        workstationLogs: {
          ...(prev.workstationLogs || {}),
          [selectedDate]: filtered
        }
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });
    playSound('pop');
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormStartTime('09:00');
    setFormEndTime('12:00');
    setFormLocation(defaultLoc);
    setIsCustomLocation(false);
    setFormCustomLocation('');
    setFormNote('');
    setIsAdding(true);
  };

  const openEditForm = (interval: WorkstationInterval) => {
    setEditingId(interval.id);
    if (interval.startTime) {
      try {
        setFormStartTime(format(parseISO(interval.startTime), 'HH:mm'));
      } catch (e) {
        setFormStartTime('09:00');
      }
    }
    if (interval.endTime) {
      try {
        setFormEndTime(format(parseISO(interval.endTime), 'HH:mm'));
      } catch (e) {
        setFormEndTime('12:00');
      }
    }

    const loc = interval.location || defaultLoc;
    if (locations.includes(loc)) {
      setFormLocation(loc);
      setIsCustomLocation(false);
      setFormCustomLocation('');
    } else {
      setIsCustomLocation(true);
      setFormCustomLocation(loc);
    }
    setFormNote(interval.note || '');
    setIsAdding(true);
  };

  const handleSaveInterval = () => {
    const [startH, startM] = formStartTime.split(':').map(Number);
    const [endH, endM] = formEndTime.split(':').map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return;
    }

    const baseDate = parseISO(selectedDate);
    const startDate = new Date(baseDate);
    startDate.setHours(startH, startM, 0, 0);

    const endDate = new Date(baseDate);
    endDate.setHours(endH, endM, 0, 0);

    let finalEndDate = endDate;
    if (endDate <= startDate) {
      finalEndDate = addDays(endDate, 1);
    }

    const durMins = Math.max(1, differenceInMinutes(finalEndDate, startDate));
    const finalLocation = isCustomLocation 
      ? (formCustomLocation.trim() || defaultLoc)
      : formLocation;

    if (editingId) {
      setState(prev => {
        const existing = prev.workstationLogs?.[selectedDate] || [];
        const updated = existing.map(item => {
          if (item.id === editingId) {
            return {
              ...item,
              startTime: startDate.toISOString(),
              endTime: finalEndDate.toISOString(),
              durationMinutes: durMins,
              location: finalLocation,
              note: formNote.trim() || undefined
            };
          }
          return item;
        });

        updated.sort((a, b) => {
          const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
          return tA - tB;
        });

        const next: AppState = {
          ...prev,
          workstationLogs: {
            ...(prev.workstationLogs || {}),
            [selectedDate]: updated
          }
        };
        if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
        return next;
      });
    } else {
      const newInterval: WorkstationInterval = {
        id: `ws_manual_${Date.now()}`,
        date: selectedDate,
        startTime: startDate.toISOString(),
        endTime: finalEndDate.toISOString(),
        durationMinutes: durMins,
        location: finalLocation,
        note: formNote.trim() || undefined
      };

      setState(prev => {
        const existing = prev.workstationLogs?.[selectedDate] || [];
        const updated = [...existing, newInterval];
        updated.sort((a, b) => {
          const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
          return tA - tB;
        });

        const next: AppState = {
          ...prev,
          workstationLogs: {
            ...(prev.workstationLogs || {}),
            [selectedDate]: updated
          }
        };
        if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
        return next;
      });
    }

    setIsAdding(false);
    setEditingId(null);
    playSound('click');
  };

  const getLocationIcon = (loc?: string, size = 14) => {
    return <LocationIcon locName={loc} customIcons={state.workstationLocationIcons} size={size} />;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={cn(
          "w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors",
          isDarkTheme ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={cn(
          "flex items-center justify-between p-4 sm:p-5 border-b shrink-0 transition-colors",
          isDarkTheme ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-2 rounded-xl border",
              isDarkTheme ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-600"
            )}>
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Workstation Log
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border",
                  isDarkTheme ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                )}>
                  Presence Tracker
                </span>
              </h2>
              <p className={cn("text-xs font-medium", isDarkTheme ? "text-slate-400" : "text-slate-500")}>
                Track desk check-ins to calibrate actual focus conversion rate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl transition-colors",
              isDarkTheme ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Date Navigator */}
        <div className={cn(
          "flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0 transition-colors",
          isDarkTheme ? "bg-slate-950/40 border-slate-800" : "bg-slate-100/60 border-slate-200"
        )}>
          <button
            onClick={() => setSelectedDate(prev => format(subDays(parseISO(prev), 1), 'yyyy-MM-dd'))}
            className={cn(
              "p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-bold shadow-sm",
              isDarkTheme ? "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-indigo-500" />
            <span className="text-sm font-bold">
              {selectedDate}
            </span>
            {isToday ? (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
                Today
              </span>
            ) : (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors border",
                  isDarkTheme ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                Jump to Today
              </button>
            )}
          </div>

          <button
            onClick={() => setSelectedDate(prev => format(addDays(parseISO(prev), 1), 'yyyy-MM-dd'))}
            className={cn(
              "p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-bold shadow-sm",
              isDarkTheme ? "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* Active Ongoing Session Card (if active and on today/selected date) */}
          {isActiveOnSelectedDate && activeSession && (
            <div className={cn(
              "p-4 rounded-2xl border relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm",
              isDarkTheme 
                ? "bg-indigo-950/40 border-indigo-500/30 text-slate-100" 
                : "bg-indigo-50 border-indigo-200 text-slate-900"
            )}>
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    isDarkTheme ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                  )}>
                    <Clock size={20} className="animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      isDarkTheme ? "text-indigo-300" : "text-indigo-950"
                    )}>
                      Currently at Workstation
                    </span>
                    <span className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border shadow-sm",
                      isDarkTheme ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-white text-slate-900 border-slate-300"
                    )}>
                      {getLocationIcon(activeSession.location)}
                      {activeSession.location || defaultLoc}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-black mt-0.5">
                    {getActiveSessionDurationFormatted(activeSession.startTime, now).textClock}
                  </div>
                </div>
              </div>

              <button
                onClick={handleEndSession}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 transition-all active:scale-95 shrink-0"
              >
                <Square size={14} className="fill-current" />
                <span>Check Out / End Desk Time</span>
              </button>
            </div>
          )}

          {/* Daily Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Presence */}
            <div className={cn(
              "p-3.5 rounded-2xl border flex flex-col justify-between shadow-sm",
              isDarkTheme ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-200"
            )}>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-70">
                <span>Desk Presence</span>
                <Clock size={14} className="text-indigo-500" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-black font-mono">
                  {formatDuration(totalPresenceMinutes)}
                </div>
                <div className="text-[11px] font-medium opacity-60 mt-0.5">
                  {intervals.length + (isActiveOnSelectedDate ? 1 : 0)} recorded session(s)
                </div>
              </div>
            </div>

            {/* Focus Study Time */}
            <div className={cn(
              "p-3.5 rounded-2xl border flex flex-col justify-between shadow-sm",
              isDarkTheme ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-200"
            )}>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-70">
                <span>Study Focus Time</span>
                <Sparkles size={14} className="text-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-black font-mono text-emerald-500">
                  {formatDuration(selectedDateFocusMinutes)}
                </div>
                <div className="text-[11px] font-medium opacity-60 mt-0.5">
                  Effective sessions logged
                </div>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className={cn(
              "p-3.5 rounded-2xl border flex flex-col justify-between shadow-sm",
              isDarkTheme ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-200"
            )}>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-70">
                <span>Desk Conversion</span>
                <Percent size={14} className="text-amber-500" />
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-mono text-amber-500">
                    {conversionRate}%
                  </span>
                  <span className="text-[10px] font-bold opacity-60">Focus Efficiency</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, conversionRate)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Check-In Box (Only on Today and when no active session) */}
          {isToday && !activeSession && (
            <div className={cn(
              "p-4 rounded-2xl border shadow-sm space-y-3",
              isDarkTheme ? "bg-slate-800/60 border-slate-700/80" : "bg-slate-50 border-slate-200"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Play size={13} className="text-emerald-500" />
                  <span>Start Workstation Session Now</span>
                </span>
                <span className="text-[11px] font-medium opacity-60">
                  Punch in as you arrive at desk
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Location selector pills */}
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {locations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => setQuickCheckInLocation(loc)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all shadow-sm",
                        quickCheckInLocation === loc
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : isDarkTheme
                            ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {getLocationIcon(loc)}
                      <span>{loc}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleStartSession()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <Play size={13} className="fill-current" />
                  <span>Punch In</span>
                </button>
              </div>
            </div>
          )}

          {/* Section: Timeline Records & Add Button */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-500" />
                <span>Recorded Intervals ({intervals.length})</span>
              </h3>

              {!isAdding && (
                <button
                  onClick={openAddForm}
                  className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                >
                  <Plus size={13} />
                  <span>Add Record</span>
                </button>
              )}
            </div>

            {/* Add / Edit Form Card */}
            {isAdding && (
              <div className={cn(
                "p-4 rounded-2xl border shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150",
                isDarkTheme ? "bg-slate-800 border-indigo-500/50" : "bg-indigo-50/50 border-indigo-200"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-500">
                    {editingId ? 'Edit Workstation Interval' : 'Add Manual Workstation Interval'}
                  </span>
                  <button
                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                      Start Time (24H: {formStartTime || '--:--'})
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500",
                        isDarkTheme ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                      End Time (24H: {formEndTime || '--:--'})
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500",
                        isDarkTheme ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>
                </div>

                {/* Real-time Duration Preview */}
                {(() => {
                  const [sH, sM] = formStartTime.split(':').map(Number);
                  const [eH, eM] = formEndTime.split(':').map(Number);
                  if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
                    let totalDiff = (eH * 60 + eM) - (sH * 60 + sM);
                    const isCrossDay = totalDiff <= 0;
                    if (isCrossDay) totalDiff += 24 * 60;
                    const durH = Math.floor(totalDiff / 60);
                    const durM = totalDiff % 60;
                    return (
                      <div className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-mono",
                        isDarkTheme ? "bg-slate-900/80 border-slate-800" : "bg-slate-50 border-slate-200"
                      )}>
                        <span className="opacity-70 font-sans font-semibold">Calculated Duration:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-500">{durH}h {durM}m</span>
                          <span className="text-[10px] opacity-60 font-sans">
                            ({formStartTime} → {formEndTime}{isCrossDay ? ' +1 day' : ''})
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Location Picker */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                    Location
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {locations.map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setFormLocation(loc);
                          setIsCustomLocation(false);
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all",
                          !isCustomLocation && formLocation === loc
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : isDarkTheme
                              ? "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-850"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {getLocationIcon(loc)}
                        <span>{loc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note Field */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                    Note / Activity (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coding project, Paper research"
                    value={formNote}
                    onChange={e => setFormNote(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500",
                      isDarkTheme ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                    )}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors",
                      isDarkTheme ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInterval}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    {editingId ? 'Save Changes' : 'Confirm Add'}
                  </button>
                </div>
              </div>
            )}

            {/* Intervals List Display */}
            {intervals.length === 0 ? (
              <div className={cn(
                "p-8 text-center rounded-2xl border border-dashed text-xs space-y-1",
                isDarkTheme ? "bg-slate-950/20 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
              )}>
                <div className="font-bold">No presence intervals recorded for this date.</div>
                <div className="text-[11px]">Use "Add Record" or punch in to track physical desk presence.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {intervals.map((item, idx) => {
                  const startFormatted = item.startTime
                    ? format(parseISO(item.startTime), 'HH:mm')
                    : '--:--';
                  const endFormatted = item.endTime
                    ? format(parseISO(item.endTime), 'HH:mm')
                    : '--:--';

                  return (
                    <div
                      key={item.id || idx}
                      className={cn(
                        "p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors shadow-sm",
                        isDarkTheme ? "bg-slate-800/60 border-slate-800 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold",
                          isDarkTheme ? "bg-slate-700 text-slate-300" : "bg-white border border-slate-200 text-slate-700"
                        )}>
                          {idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-black">
                              {startFormatted} - {endFormatted}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              {formatDuration(item.durationMinutes || 0)}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border shadow-sm",
                              isDarkTheme ? "bg-slate-900 text-slate-300 border-slate-700" : "bg-white text-slate-800 border-slate-200"
                            )}>
                              {getLocationIcon(item.location)}
                              <span>{item.location || defaultLoc}</span>
                            </span>
                          </div>

                          {item.note && (
                            <p className="text-[11px] opacity-60 italic mt-0.5">
                              "{item.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditForm(item)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-colors",
                            isDarkTheme ? "hover:bg-slate-700 text-slate-300 border-slate-700" : "hover:bg-slate-200 text-slate-600 border-slate-200"
                          )}
                          title="Edit"
                        >
                          <Edit3 size={12} className="text-indigo-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteInterval(item.id)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-colors",
                            isDarkTheme ? "hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border-slate-700" : "hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200"
                          )}
                          title="Delete"
                        >
                          <Trash2 size={12} className="text-rose-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={cn(
          "p-4 border-t flex items-center justify-between shrink-0 transition-colors",
          isDarkTheme ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"
        )}>
          <div className="text-[11px] opacity-60">
            Efficiency is calibrated dynamically based on desk presence.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
