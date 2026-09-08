import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Play, 
  Square, 
  ChevronDown, 
  ListChecks, 
  Sparkles,
  Check,
  Tag,
  Home,
  BookOpen,
  Coffee
} from 'lucide-react';
import { parseISO, differenceInMinutes } from 'date-fns';
import { AppState, WorkstationInterval, ActiveWorkstationSession } from '../../types';
import { cn, formatDuration, getSettlementDay } from '../../lib/utils';
import { 
  getWorkstationLocations,
  getWorkstationTotalMinutes, 
  getActiveSessionDurationFormatted,
  MAX_WORKSTATION_SESSION_MINUTES
} from '../../lib/workstationUtils';
import { WorkstationModal } from './WorkstationModal';
import { playSound } from '../../lib/sound';
import { LocationIcon } from '../workstation/LocationIcon';

interface WorkstationHeaderControlsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
  onOpenWorkstationView?: () => void;
}

export const WorkstationHeaderControls: React.FC<WorkstationHeaderControlsProps> = ({
  state,
  setState,
  syncToCloud,
  onOpenWorkstationView
}) => {
  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date>(new Date());

  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);
  const defaultLoc = locations[0] || 'Home';

  const [preferredLocation, setPreferredLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('scholars_last_ws_location');
      return saved && locations.includes(saved) ? saved : defaultLoc;
    } catch {
      return defaultLoc;
    }
  });

  useEffect(() => {
    if (!locations.includes(preferredLocation)) {
      setPreferredLocation(locations[0] || 'Home');
    }
  }, [locations, preferredLocation]);

  // Active session
  const activeSession = state.activeWorkstationSession;
  const todayStr = getSettlementDay(new Date(), state.timeSettings);

  // Ticking timer for active session
  useEffect(() => {
    if (!activeSession) return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // Close location menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsLocationMenuOpen(false);
      }
    };
    if (isLocationMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLocationMenuOpen]);

  const totalDeskMinutesToday = getWorkstationTotalMinutes(todayStr, state, now);

  const handleStartSession = (location: string = preferredLocation || defaultLoc) => {
    try {
      localStorage.setItem('scholars_last_ws_location', location);
    } catch {}
    setPreferredLocation(location);

    const startISO = new Date().toISOString();
    const newSession: ActiveWorkstationSession = {
      id: `ws_${Date.now()}`,
      startTime: startISO,
      location: location
    };

    setState(prev => {
      const next: AppState = {
        ...prev,
        activeWorkstationSession: newSession
      };
      if (syncToCloud) setTimeout(() => syncToCloud(false, next, 'Immediate'), 50);
      return next;
    });

    setIsLocationMenuOpen(false);
    playSound('click');
  };

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
      location: activeSession.location || preferredLocation || defaultLoc,
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

  const formattedActive = activeSession?.startTime
    ? getActiveSessionDurationFormatted(activeSession.startTime, now)
    : null;

  const getLocationIcon = (locName?: string, size = 13) => {
    return <LocationIcon locName={locName} customIcons={state.workstationLocationIcons} size={size} />;
  };

  const handleOpenDeskLog = () => {
    if (onOpenWorkstationView) {
      onOpenWorkstationView();
    } else {
      setIsModalOpen(true);
    }
  };

  const currentCheckInLoc = preferredLocation || defaultLoc;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Button 1: Quick Punch Button (Check In / Check Out) */}
        {activeSession ? (
          <button
            onClick={handleEndSession}
            title="Click to Check Out & settle current workstation session"
            className="group relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-200 text-xs font-semibold select-none cursor-pointer shadow-sm border border-slate-800 bg-slate-900/90 hover:bg-slate-800/80 text-slate-100 hover:text-white active:scale-95"
          >
            {/* Pulsing indicator */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            {/* Location Icon */}
            {getLocationIcon(activeSession.location, 14)}

            {/* Label / Timer */}
            <span className="font-mono tracking-tight font-black text-slate-100">
              {formattedActive?.textShort || 'At Desk'}
            </span>

            {/* Action text */}
            <span className="hidden sm:inline text-[11px] font-bold border-l border-slate-800 pl-2 text-rose-500 group-hover:text-rose-400 transition-colors">
              Check Out
            </span>
          </button>
        ) : (
          <div className="relative" ref={menuRef}>
            <div className="flex items-center rounded-xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-colors shadow-sm">
              <button
                onClick={() => handleStartSession(currentCheckInLoc)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-slate-100 hover:text-white hover:bg-slate-800/60 transition-colors"
                title={`Check in at Workstation (${currentCheckInLoc})`}
              >
                {getLocationIcon(currentCheckInLoc, 14)}
                <span>Check In</span>
              </button>

              <button
                onClick={() => setIsLocationMenuOpen(prev => !prev)}
                className="p-1.5 sm:p-2 border-l border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                title="Select location for Check In"
              >
                <ChevronDown size={13} className={cn("transition-transform duration-200", isLocationMenuOpen && "rotate-180")} />
              </button>
            </div>

            {/* Location Dropdown Menu */}
            {isLocationMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Check In Location
                </div>

                {locations.map(loc => (
                  <button
                    key={loc}
                    onClick={() => handleStartSession(loc)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors hover:bg-slate-800 hover:text-slate-100",
                      loc === currentCheckInLoc ? "bg-slate-800 text-slate-100 font-bold" : "text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {getLocationIcon(loc)}
                      <span>{loc}</span>
                    </div>
                    <Play size={10} className="text-slate-500" />
                  </button>
                ))}

                <div className="my-1 border-t border-slate-800" />

                <button
                  onClick={() => {
                    setIsLocationMenuOpen(false);
                    handleOpenDeskLog();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors text-indigo-400 hover:bg-slate-800/80"
                >
                  <Tag size={12} />
                  <span>Manage Locations...</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Button 2: Workstation Details / Log View Button */}
        <button
          onClick={handleOpenDeskLog}
          title={`Workstation Log (Today: ${formatDuration(totalDeskMinutesToday)})`}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800/80 text-slate-100 hover:text-white transition-all text-xs font-bold shadow-sm"
        >
          <ListChecks size={14} className="text-indigo-400 shrink-0" />
          <span className="hidden sm:inline">Desk Log</span>
          {totalDeskMinutesToday > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              {formatDuration(totalDeskMinutesToday)}
            </span>
          )}
        </button>
      </div>

      {/* Fallback Modal */}
      <WorkstationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        state={state}
        setState={setState}
        syncToCloud={syncToCloud}
      />
    </>
  );
};
