import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  BookOpen, 
  Coffee, 
  Laptop, 
  Sparkles, 
  Percent, 
  Play, 
  Square, 
  AlertCircle,
  Tag,
  ArrowLeft,
  Settings,
  RotateCcw,
  X,
  ListFilter
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  isValid, 
  addDays, 
  subDays, 
  differenceInMinutes 
} from 'date-fns';
import { AppState, WorkstationInterval, ActiveWorkstationSession } from '../../types';
import { cn, formatDuration, getSessionEffectiveMinutes, getSettlementDay } from '../../lib/utils';
import { 
  getWorkstationLocations,
  getWorkstationTotalMinutes, 
  getEffectiveTargetFocusMinutes, 
  getActiveSessionDurationFormatted,
  DEFAULT_WORKSTATION_LOCATIONS,
  MAX_WORKSTATION_SESSION_MINUTES
} from '../../lib/workstationUtils';
import { playSound } from '../../lib/sound';
import { DatePicker } from '../common/DatePicker';
import { LocationIcon, LocationIconPicker, resolveLocationIconOption } from './LocationIcon';

export interface WorkstationViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
  onBack?: () => void;
  initialDate?: string;
}

export const WorkstationView: React.FC<WorkstationViewProps> = ({
  state,
  setState,
  syncToCloud,
  onBack,
  initialDate
}) => {
  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');
  const todayStr = useMemo(() => getSettlementDay(new Date(), state.timeSettings), [state.timeSettings]);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [now, setNow] = useState<Date>(new Date());

  // Active session clock ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Locations list
  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);

  // Modals & Panels
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
  const [isIntervalModalOpen, setIsIntervalModalOpen] = useState(false);
  const [editingIntervalId, setEditingIntervalId] = useState<string | null>(null);

  // Interval Form States
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formLocation, setFormLocation] = useState<string>(locations[0] || 'Home');
  const [formNote, setFormNote] = useState('');

  // Location Manager Form States
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState<string>('building');
  const [editingLocIndex, setEditingLocIndex] = useState<number | null>(null);
  const [editingLocName, setEditingLocName] = useState('');
  const [editingLocIcon, setEditingLocIcon] = useState<string>('building');

  const activeSession = state.activeWorkstationSession;
  const isToday = selectedDate === todayStr;
  const intervals: WorkstationInterval[] = state.workstationLogs?.[selectedDate] || [];

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

  // Conversion rate calculation
  const conversionRate = totalPresenceMinutes > 0 
    ? Math.min(100, Math.round((selectedDateFocusMinutes / totalPresenceMinutes) * 100))
    : 0;

  // Breakdown by location for current day
  const locationBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    intervals.forEach(i => {
      const loc = i.location || 'Unknown';
      map[loc] = (map[loc] || 0) + (i.durationMinutes || 0);
    });

    if (isActiveOnSelectedDate && activeSession?.startTime) {
      const start = parseISO(activeSession.startTime);
      if (isValid(start)) {
        const mins = Math.max(0, differenceInMinutes(now, start));
        const loc = activeSession.location || 'Unknown';
        map[loc] = (map[loc] || 0) + mins;
      }
    }
    return map;
  }, [intervals, isActiveOnSelectedDate, activeSession, now]);

  // Unified locations list (configured locations + any recorded location for the day)
  const displayLocations = useMemo(() => {
    const set = new Set([...locations, ...Object.keys(locationBreakdown)]);
    return Array.from(set);
  }, [locations, locationBreakdown]);

  // Date Navigator helper
  const navigateDay = (direction: 'prev' | 'next') => {
    try {
      const curr = parseISO(selectedDate);
      const next = direction === 'prev' ? subDays(curr, 1) : addDays(curr, 1);
      setSelectedDate(format(next, 'yyyy-MM-dd'));
    } catch (e) {
      setSelectedDate(todayStr);
    }
  };

  // Icon mapping for locations
  const getLocationIcon = (locName?: string, size = 14) => {
    return <LocationIcon locName={locName} customIcons={state.workstationLocationIcons} size={size} />;
  };

  // Location Click Handler (Starts session or switches active location without zeroing time)
  const handleLocationClick = (loc: string) => {
    if (activeSession) {
      if (activeSession.location === loc) {
        return;
      }
      // Switch active session's location directly without resetting start time
      setState(prev => {
        if (!prev.activeWorkstationSession) return prev;
        const next: AppState = {
          ...prev,
          activeWorkstationSession: {
            ...prev.activeWorkstationSession,
            location: loc
          }
        };
        if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
        return next;
      });

      playSound('pop');
    } else {
      handleStartSession(loc);
    }
  };

  // Check In Handler
  const handleStartSession = (loc: string) => {
    const startISO = new Date().toISOString();
    const newSession: ActiveWorkstationSession = {
      id: `ws_${Date.now()}`,
      startTime: startISO,
      location: loc
    };

    setState(prev => {
      const next: AppState = {
        ...prev,
        activeWorkstationSession: newSession
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });

    playSound('click');
  };

  // Check Out Handler
  const handleEndSession = () => {
    if (!activeSession) return;
    const end = new Date();
    const start = parseISO(activeSession.startTime);
    const durMins = Math.min(MAX_WORKSTATION_SESSION_MINUTES, Math.max(1, differenceInMinutes(end, start)));
    const sessionDate = getSettlementDay(start, state.timeSettings);

    const completedInterval: WorkstationInterval = {
      id: activeSession.id,
      date: sessionDate,
      startTime: activeSession.startTime,
      endTime: end.toISOString(),
      durationMinutes: durMins,
      location: activeSession.location || locations[0] || 'Home',
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

  // Open modal to add interval
  const openAddIntervalModal = () => {
    setEditingIntervalId(null);
    setFormStartTime('09:00');
    setFormEndTime('12:00');
    setFormLocation(locations[0] || 'Home');
    setFormNote('');
    setIsIntervalModalOpen(true);
  };

  // Open modal to edit interval
  const openEditIntervalModal = (interval: WorkstationInterval) => {
    setEditingIntervalId(interval.id);
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
    setFormLocation(interval.location || locations[0] || 'Home');
    setFormNote(interval.note || '');
    setIsIntervalModalOpen(true);
  };

  // Save Interval (Add / Edit)
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

    // If end is before start, assume spans next day
    let finalEndDate = endDate;
    if (endDate <= startDate) {
      finalEndDate = addDays(endDate, 1);
    }

    const durMins = Math.max(1, differenceInMinutes(finalEndDate, startDate));

    const finalLocation = formLocation.trim() || locations[0] || 'Home';

    setState(prev => {
      const existing = prev.workstationLogs?.[selectedDate] || [];
      let updatedList: WorkstationInterval[];

      if (editingIntervalId) {
        updatedList = existing.map(item => {
          if (item.id === editingIntervalId) {
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
        updatedList = [...existing, newInterval];
      }

      // Sort by start time ascending
      updatedList.sort((a, b) => {
        const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return tA - tB;
      });

      const next: AppState = {
        ...prev,
        workstationLogs: {
          ...(prev.workstationLogs || {}),
          [selectedDate]: updatedList
        }
      };

      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });

    setIsIntervalModalOpen(false);
    playSound('success');
  };

  // Delete Interval
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

  // Location Management Handlers
  const handleAddLocation = () => {
    const trimmed = newLocationInput.trim();
    if (!trimmed) return;
    if (locations.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
      setNewLocationInput('');
      return;
    }
    const updated = [...locations, trimmed];
    setState(prev => {
      const updatedIcons = {
        ...(prev.workstationLocationIcons || {}),
        [trimmed]: newLocationIcon
      };
      const next: AppState = { 
        ...prev, 
        workstationLocations: updated,
        workstationLocationIcons: updatedIcons
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });
    setNewLocationInput('');
    setNewLocationIcon('building');
    playSound('click');
  };

  const startEditingLocation = (index: number) => {
    const locName = locations[index];
    setEditingLocIndex(index);
    setEditingLocName(locName);
    const resolvedIcon = resolveLocationIconOption(locName, state.workstationLocationIcons).id;
    setEditingLocIcon(resolvedIcon);
  };

  const handleUpdateLocation = (index: number) => {
    const trimmed = editingLocName.trim();
    if (!trimmed) return;
    const oldName = locations[index];
    const updated = [...locations];
    updated[index] = trimmed;
    setState(prev => {
      const updatedIcons = { ...(prev.workstationLocationIcons || {}) };
      if (oldName !== trimmed) {
        delete updatedIcons[oldName];
      }
      updatedIcons[trimmed] = editingLocIcon;
      const next: AppState = { 
        ...prev, 
        workstationLocations: updated,
        workstationLocationIcons: updatedIcons
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });
    setEditingLocIndex(null);
    setEditingLocName('');
    playSound('click');
  };

  const handleDeleteLocation = (index: number) => {
    if (locations.length <= 1) return; // Keep at least one location
    const locToDelete = locations[index];
    const updated = locations.filter((_, i) => i !== index);
    setState(prev => {
      const updatedIcons = { ...(prev.workstationLocationIcons || {}) };
      delete updatedIcons[locToDelete];
      const next: AppState = { 
        ...prev, 
        workstationLocations: updated,
        workstationLocationIcons: updatedIcons
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });
    playSound('pop');
  };

  const handleResetLocationsToDefault = () => {
    const defaults = [...DEFAULT_WORKSTATION_LOCATIONS];
    const defaultIcons: Record<string, string> = {
      Home: 'home',
      Lab: 'building',
      Library: 'book'
    };
    setState(prev => {
      const next: AppState = { 
        ...prev, 
        workstationLocations: defaults,
        workstationLocationIcons: defaultIcons
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });
    playSound('click');
  };

  // Date picker indicator dots
  const dateIndicators = useMemo(() => {
    const logs = state.workstationLogs || {};
    const map: Record<string, { highlight?: boolean; star?: boolean }> = {};
    Object.keys(logs).forEach(dateKey => {
      if (logs[dateKey] && logs[dateKey].length > 0) {
        map[dateKey] = {
          highlight: true
        };
      }
    });
    return map;
  }, [state.workstationLogs]);

  // Date boundaries for header subtitle display (aligned with Agenda & Journal)
  const borderHour = state.timeSettings?.morning?.start ?? 8;
  const viewStartTime = useMemo(() => {
    try {
      const base = parseISO(selectedDate);
      const st = new Date(base);
      st.setHours(borderHour, 0, 0, 0);
      return st;
    } catch (e) {
      const d = new Date();
      d.setHours(borderHour, 0, 0, 0);
      return d;
    }
  }, [selectedDate, borderHour]);

  const viewEndTime = useMemo(() => {
    const et = new Date(viewStartTime);
    et.setDate(et.getDate() + 1);
    return et;
  }, [viewStartTime]);

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 animate-in fade-in duration-200">
      {/* Top Banner Header & Date Navigator (Aligned with Journal & Agenda) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-black text-slate-50 tracking-tighter uppercase italic pr-3 flex items-center gap-2 sm:gap-3 min-w-0">
            <Building2 className="text-indigo-400 w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <span className="leading-none whitespace-nowrap pr-2">Workstation</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {format(viewStartTime, 'MMM do, HH:mm')} - {format(viewEndTime, 'MMM do, HH:mm')}
          </p>
        </div>

        {/* Action Controls & Date Navigator */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Location Manager Button */}
          <button
            onClick={() => setIsLocationManagerOpen(true)}
            className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-slate-100 rounded-xl flex items-center justify-center transition-all shrink-0 gap-2 font-bold text-xs sm:text-sm shadow-sm"
            title="Manage Check-In Locations"
          >
            <Tag size={15} className="text-indigo-400" />
            <span>Locations</span>
          </button>

          {/* Date Navigator Block */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 h-10 shadow-sm">
            <button 
              onClick={() => navigateDay('prev')}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={18} />
            </button>
            
            <DatePicker
              value={selectedDate}
              onChange={(val) => val && setSelectedDate(val)}
              indicators={dateIndicators}
            >
              <div className="px-3 text-xs sm:text-sm font-bold text-slate-100 whitespace-nowrap min-w-[110px] text-center hover:bg-slate-800 rounded-lg h-8 transition-colors flex items-center justify-center cursor-pointer gap-1.5">
                <Calendar size={13} className="text-indigo-400" />
                <span>{selectedDate === todayStr ? 'Today' : format(parseISO(selectedDate), 'MMM do')}</span>
              </div>
            </DatePicker>

            <button 
              onClick={() => navigateDay('next')}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Next Day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 shadow-sm"
              title="Back to Explore"
            >
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Unified Workstation Hub Card: Presence Vitals, Location Distribution & Timeline */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-5 transition-colors">
        {/* Card Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-100">
              <Clock size={18} className="text-indigo-400" />
              <span>Presence & Efficiency Hub</span>
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Workstation sessions, location distribution & focus conversion for {selectedDate === todayStr ? 'Today' : selectedDate}
            </p>
          </div>

          {/* Integrated Efficiency Vitals Pill Strip + Add Record */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-1.5 shadow-inner">
              {/* Presence */}
              <div className="flex items-center gap-1.5 text-xs">
                <Clock size={12} className="text-indigo-400 shrink-0" />
                <span className="text-slate-400 font-semibold hidden sm:inline">Presence:</span>
                <span className="font-mono font-black text-slate-100">{formatDuration(totalPresenceMinutes)}</span>
              </div>

              <span className="w-px h-3.5 bg-slate-800" />

              {/* Focus */}
              <div className="flex items-center gap-1.5 text-xs">
                <Sparkles size={12} className="text-indigo-400 shrink-0" />
                <span className="text-slate-400 font-semibold hidden sm:inline">Focus:</span>
                <span className="font-mono font-black text-slate-100">{formatDuration(selectedDateFocusMinutes)}</span>
              </div>

              <span className="w-px h-3.5 bg-slate-800" />

              {/* Conversion */}
              <div className="flex items-center gap-1.5 text-xs">
                <Percent size={12} className="text-indigo-400 shrink-0" />
                <span className="text-slate-400 font-semibold hidden sm:inline">Rate:</span>
                <span className="font-mono font-black text-indigo-400">{conversionRate}%</span>
              </div>
            </div>

            {/* Manual Add Interval Button */}
            <button
              onClick={openAddIntervalModal}
              className="h-8.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-all shrink-0 gap-1.5 font-bold text-xs shadow-sm active:scale-95"
              title="Manual Add Workstation Interval"
            >
              <Plus size={14} />
              <span>Add Record</span>
            </button>
          </div>
        </div>

        {/* Section 1: Location Time Distribution & Quick Check-In */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="uppercase tracking-wider flex items-center gap-1.5">
              <ListFilter size={13} className="text-indigo-400" />
              <span>Location Time Distribution</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {isToday ? 'Click a location to check in / switch' : `${displayLocations.length} location(s)`}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Proportional Segmented Progress Bar */}
            {totalPresenceMinutes > 0 && (
              <div className="w-full h-2.5 rounded-full bg-slate-800/90 overflow-hidden flex shadow-inner">
                {Object.entries(locationBreakdown)
                  .filter(([_, mins]) => mins > 0)
                  .map(([locName, mins], idx) => {
                    const pct = Math.max(1, Math.round((mins / totalPresenceMinutes) * 100));
                    const colors = [
                      'bg-indigo-500',
                      'bg-indigo-400',
                      'bg-indigo-600',
                      'bg-slate-400',
                      'bg-indigo-300',
                      'bg-slate-500'
                    ];
                    const color = colors[idx % colors.length];
                    return (
                      <div
                        key={locName}
                        style={{ width: `${pct}%` }}
                        className={cn("h-full transition-all duration-500", color)}
                        title={`${locName}: ${formatDuration(mins)} (${pct}%)`}
                      />
                    );
                  })}
              </div>
            )}

            {/* Merged Location Buttons Grid */}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {displayLocations.map((locName) => {
                const mins = locationBreakdown[locName] || 0;
                const isActiveThis = activeSession?.location === locName && isActiveOnSelectedDate;
                const pct = totalPresenceMinutes > 0 && mins > 0 
                  ? Math.round((mins / totalPresenceMinutes) * 100) 
                  : 0;

                return (
                  <button
                    key={locName}
                    type="button"
                    onClick={() => isToday && handleLocationClick(locName)}
                    disabled={!isToday}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm text-xs font-bold transition-all",
                      isToday ? "cursor-pointer active:scale-95" : "cursor-default",
                      isActiveThis
                        ? "bg-indigo-500/20 border-indigo-500 text-slate-100 ring-2 ring-indigo-500/40"
                        : mins > 0
                          ? "bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-slate-200 hover:text-slate-100"
                          : "bg-slate-800/50 hover:bg-slate-700/70 border-slate-800 text-slate-300 hover:text-slate-100"
                    )}
                    title={
                      isToday
                        ? isActiveThis
                          ? `Currently active at ${locName}`
                          : activeSession
                            ? `Switch active location to ${locName}`
                            : `Quick Check in at ${locName}`
                        : `${locName}: ${formatDuration(mins)}`
                    }
                  >
                    {getLocationIcon(locName)}
                    <span className="text-slate-100 font-bold">{locName}</span>
                    <span className={cn(
                      "font-mono font-black",
                      mins > 0 ? "text-indigo-400" : "text-slate-400"
                    )}>
                      {mins > 0 ? formatDuration(mins) : '0m'}
                    </span>
                    {pct > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-200 border border-slate-600/40">
                        {pct}%
                      </span>
                    )}
                    {isActiveThis && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Active location" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Chronological Presence Timeline */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock size={13} className="text-indigo-400" />
            <span>Timeline Log</span>
          </div>

          {/* Intervals List */}
          {intervals.length === 0 && !isActiveOnSelectedDate ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-400 flex flex-col items-center justify-center space-y-3">
              <div className="p-3 rounded-full bg-slate-800 text-indigo-400 mb-1">
                <Building2 size={22} />
              </div>
              <div className="text-sm font-bold text-slate-200">
                No Workstation Logs for this Date
              </div>
              <p className="text-xs max-w-sm leading-relaxed text-slate-400">
                {isToday 
                  ? 'Check in when arriving at your desk or add a manual log to calibrate focus efficiency.'
                  : 'No historical presence records found for this date. You can add one manually.'}
              </p>
              <div className="flex items-center gap-2 pt-2">
                {isToday && (
                  <button
                    onClick={() => handleLocationClick(locations[0] || 'Home')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm"
                  >
                    Check In Now ({locations[0] || 'Home'})
                  </button>
                )}
                <button
                  onClick={openAddIntervalModal}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all shadow-sm"
                >
                  + Add Record Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Ongoing Active Session Live Row */}
              {isActiveOnSelectedDate && activeSession && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 sm:p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-sm"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm sm:text-base text-slate-100">
                          {format(parseISO(activeSession.startTime), 'HH:mm')} - Present
                        </span>
                        <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-100 shadow-xs">
                          {getActiveSessionDurationFormatted(activeSession.startTime, now).textClock}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-100 border border-slate-700 flex items-center gap-1 shadow-xs">
                          {getLocationIcon(activeSession.location)}
                          <span>{activeSession.location || 'Home'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleEndSession}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 self-end sm:self-auto shrink-0"
                  >
                    <Square size={13} className="fill-current" />
                    <span>Check Out</span>
                  </button>
                </motion.div>
              )}

              {/* Completed Intervals */}
              {intervals.map((interval, index) => {
                const startFormatted = interval.startTime 
                  ? format(parseISO(interval.startTime), 'HH:mm')
                  : '--:--';
                const endFormatted = interval.endTime 
                  ? format(parseISO(interval.endTime), 'HH:mm')
                  : '--:--';

                return (
                  <motion.div
                    key={interval.id || index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-slate-800/60 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-slate-800/90 shadow-sm"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs shrink-0 text-indigo-400">
                        #{index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm sm:text-base text-slate-100">
                            {startFormatted} - {endFormatted}
                          </span>
                          <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-slate-800 text-indigo-500 border border-slate-700 shadow-xs">
                            {formatDuration(interval.durationMinutes || 0)}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-100 border border-slate-700 flex items-center gap-1 shadow-xs">
                            {getLocationIcon(interval.location)}
                            <span>{interval.location || 'Home'}</span>
                          </span>
                        </div>

                        {interval.note && (
                          <p className="text-xs font-medium mt-1 italic text-slate-400">
                            "{interval.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => openEditIntervalModal(interval)}
                        className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        title="Edit this interval"
                      >
                        <Edit3 size={13} className="text-indigo-400" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteInterval(interval.id)}
                        className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        title="Delete interval"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Add / Edit Interval Modal */}
      {isIntervalModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 size={18} className="text-indigo-400" />
                <span>{editingIntervalId ? 'Edit Workstation Interval' : 'Add Workstation Record'}</span>
              </h3>
              <button 
                onClick={() => setIsIntervalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-70">
                    Start Time (24H: {formStartTime || '--:--'})
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none focus:border-indigo-500 bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-70">
                    End Time (24H: {formEndTime || '--:--'})
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none focus:border-indigo-500 bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              {/* Real-time Calculated Duration Preview */}
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
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
                      <span className="text-slate-400 font-sans font-semibold">Calculated Duration:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-400">{durH}h {durM}m</span>
                        <span className="text-[11px] text-slate-500 font-sans">
                          ({formStartTime} → {formEndTime}{isCrossDay ? ' +1 day' : ''})
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Location Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-70">
                  Location
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {locations.map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setFormLocation(loc)}
                      className={cn(
                        "py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                        formLocation === loc
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-slate-100"
                      )}
                    >
                      {getLocationIcon(loc)}
                      <span className="truncate">{loc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-70">
                  Note / Task Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thesis writing, Lab simulation"
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-indigo-500 bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsIntervalModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInterval}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
              >
                {editingIntervalId ? 'Save Changes' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Location Manager Modal */}
      {isLocationManagerOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Tag size={18} className="text-indigo-400" />
                <span>Manage Check-In Locations</span>
              </h3>
              <button 
                onClick={() => setIsLocationManagerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Add New Location Input & Icon Selector */}
            <div className="space-y-2 shrink-0">
              <label className="text-xs font-bold uppercase tracking-wider block opacity-70">
                Add New Location
              </label>
              <div className="space-y-2 p-3 rounded-xl border border-slate-800 bg-slate-950/40">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-800 border-slate-700 focus-within:border-indigo-500">
                    <LocationIcon iconId={newLocationIcon} size={15} />
                    <input
                      type="text"
                      placeholder="e.g. Office, Dorm Desk, Cafe"
                      value={newLocationInput}
                      onChange={e => {
                        const val = e.target.value;
                        setNewLocationInput(val);
                        if (val.trim()) {
                          setNewLocationIcon(resolveLocationIconOption(val).id);
                        }
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                      className="w-full text-xs font-medium outline-none bg-transparent text-slate-100 placeholder-slate-400"
                    />
                  </div>
                  <button
                    onClick={handleAddLocation}
                    disabled={!newLocationInput.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-60">
                    Select Icon:
                  </span>
                  <LocationIconPicker
                    selectedIconId={newLocationIcon}
                    onSelectIcon={iconId => setNewLocationIcon(iconId)}
                  />
                </div>
              </div>
            </div>

            {/* Existing Locations List with Edit Icon support */}
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <label className="text-xs font-bold uppercase tracking-wider block opacity-70 shrink-0">
                Current Locations ({locations.length})
              </label>
              <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
                {locations.map((loc, index) => {
                  const isEditing = editingLocIndex === index;
                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-xl border transition-colors",
                        isEditing 
                          ? "p-3 border-indigo-500/80 bg-slate-950/60 space-y-2.5 shadow-md" 
                          : "p-2.5 border-slate-700 bg-slate-800/80 flex items-center justify-between gap-2"
                      )}
                    >
                      {isEditing ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-slate-900 border-indigo-500">
                              <LocationIcon iconId={editingLocIcon} size={15} />
                              <input
                                type="text"
                                value={editingLocName}
                                onChange={e => setEditingLocName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUpdateLocation(index)}
                                autoFocus
                                className="w-full text-xs font-bold outline-none bg-transparent text-slate-100"
                              />
                            </div>
                            <button
                              onClick={() => handleUpdateLocation(index)}
                              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                              title="Save Changes"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => { setEditingLocIndex(null); setEditingLocName(''); }}
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-60">
                              Select Icon:
                            </span>
                            <LocationIconPicker
                              selectedIconId={editingLocIcon}
                              onSelectIcon={iconId => setEditingLocIcon(iconId)}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <LocationIcon locName={loc} customIcons={state.workstationLocationIcons} size={15} />
                            <span className="text-xs font-bold truncate">{loc}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEditingLocation(index)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-slate-700 text-slate-400 hover:text-white"
                              title="Edit Location & Icon"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(index)}
                              disabled={locations.length <= 1}
                              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-slate-700 text-slate-400 hover:text-rose-400"
                              title={locations.length <= 1 ? "Keep at least one location" : "Delete Location"}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer with Reset Defaults */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={handleResetLocationsToDefault}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                title="Reset to default: Home, Lab, Library"
              >
                <RotateCcw size={13} />
                <span>Reset to Default 3</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLocationManagerOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
