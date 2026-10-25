import React, { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Check, Clock, Settings2, Square } from 'lucide-react';
import { AppState } from '../../types';
import { useWorkstation } from '../../hooks/useWorkstation';
import {
  getActiveSessionDurationFormatted,
  getMaxWorkstationSessionMinutes,
  getWorkstationLocations,
  getWorkstationTotalMinutes,
} from '../../lib/workstationUtils';
import { cn, getSettlementDay } from '../../lib/utils';
import { LocationIcon } from './LocationIcon';
import { DurationText } from '../common/DurationText';
import { ManageLocationsModal } from './ManageLocationsModal';

interface WorkstationStatusChipProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
  onOpenDeskLog?: () => void;
}

/**
 * Compact workstation status indicator for the app top bar.
 *
 * - Grey icon  = no active session
 * - Coloured   = session running (icon keeps its own location colour)
 * - Click      = opens quick menu (Check Out / Switch Location / Desk Log / Manage)
 * - Wide screen= shows today's total workstation time next to the icon
 */
export const WorkstationStatusChip: React.FC<WorkstationStatusChipProps> = ({
  state,
  setState,
  syncToCloud,
  onOpenDeskLog,
}) => {
  const { active, punchIn, punchOut, switchLocation } = useWorkstation({
    state,
    setState,
    syncToCloud,
  });

  const [now, setNow] = useState<Date>(() => new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);
  const maxSessionMins = getMaxWorkstationSessionMinutes(state);

  const [preferredLocation, setPreferredLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('scholars_last_ws_location');
      if (saved && locations.includes(saved)) return saved;
    } catch {}
    return locations[0] || 'Home';
  });

  useEffect(() => {
    if (!locations.includes(preferredLocation)) {
      setPreferredLocation(locations[0] || 'Home');
    }
  }, [locations, preferredLocation]);

  // Only tick while a session is running; the daily total is static otherwise.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isMenuOpen]);

  const todayStr = useMemo(
    () => getSettlementDay(new Date(), state.timeSettings),
    [state.timeSettings]
  );
  const todayTotalMinutes = getWorkstationTotalMinutes(todayStr, state, now);

  /** Minutes spent at each location today, including a running session. */
  const todayMinutesByLocation = useMemo(() => {
    const map = new Map<string, number>();
    const list = state.workstationLogs?.[todayStr] || [];
    list.forEach((item) => {
      const loc = item.location || 'Unknown';
      map.set(loc, (map.get(loc) || 0) + (item.durationMinutes || 0));
    });

    const running = state.activeWorkstationSession;
    if (running?.startTime) {
      const runningDay = getSettlementDay(new Date(running.startTime), state.timeSettings);
      if (runningDay === todayStr) {
        const loc = running.location || 'Unknown';
        const elapsed = Math.min(
          maxSessionMins,
          Math.max(0, differenceInMinutes(now, new Date(running.startTime)))
        );
        map.set(loc, (map.get(loc) || 0) + elapsed);
      }
    }

    return map;
  }, [
    state.workstationLogs,
    state.activeWorkstationSession,
    state.timeSettings,
    todayStr,
    now,
    maxSessionMins,
  ]);

  const displayLocation = active?.location || preferredLocation;
  const isRunning = Boolean(active);

  const handleSelectLocation = (location: string) => {
    try {
      localStorage.setItem('scholars_last_ws_location', location);
    } catch {}
    setPreferredLocation(location);

    if (isRunning) {
      if (active?.location !== location) {
        switchLocation(location);
      }
    } else {
      punchIn({ location });
    }
    setIsMenuOpen(false);
  };

  const handleCheckOut = () => {
    punchOut({ fallbackLocation: preferredLocation });
    setIsMenuOpen(false);
  };

  const handleClick = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center shrink-0">
      <button
        type="button"
        onClick={handleClick}
        title={
          isRunning
            ? `At ${displayLocation} — click to open workstation menu`
            : 'Not checked in — click to choose a location'
        }
        className={cn(
          'flex items-center gap-1.5 p-1 -m-1 rounded-lg transition-all active:scale-95',
          isRunning ? 'hover:bg-indigo-500/10' : 'hover:bg-slate-500/10'
        )}
      >
        <LocationIcon
          locName={displayLocation}
          customIcons={state.workstationLocationIcons}
          size={14}
          className={cn('transition-colors duration-300', !isRunning && 'text-slate-500')}
        />

        <span
          className={cn(
            'hidden lg:inline-flex items-center text-xs sm:text-sm leading-none transition-colors',
            isRunning ? 'text-indigo-400 font-bold' : 'text-slate-500'
          )}
        >
          <DurationText minutes={todayTotalMinutes} />
        </span>
      </button>

      {isMenuOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-150">
          {/* Active Session Banner & Check Out */}
          {isRunning && active?.startTime && (
            <div className="mb-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    {active.location || preferredLocation}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-black text-indigo-400 tabular-nums shrink-0">
                  {getActiveSessionDurationFormatted(active.startTime, now, maxSessionMins).textClock}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckOut}
                className="w-full py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Square size={11} className="fill-current" />
                <span>Check Out</span>
              </button>
            </div>
          )}

          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isRunning ? 'Switch location' : 'Check in location'}
          </div>
          <div className="space-y-0.5">
            {locations.map((loc) => {
              const minutesHere = todayMinutesByLocation.get(loc) || 0;
              const isCurrent = isRunning ? active?.location === loc : loc === preferredLocation;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleSelectLocation(loc)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors hover:bg-slate-800',
                    isCurrent ? 'bg-slate-800/70 text-slate-100' : 'text-slate-300'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <LocationIcon
                      locName={loc}
                      customIcons={state.workstationLocationIcons}
                      size={14}
                    />
                    <span className="truncate">{loc}</span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {minutesHere > 0 && (
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        <DurationText minutes={minutesHere} />
                      </span>
                    )}
                    {isCurrent && <Check size={12} className="text-indigo-400" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="my-1.5 border-t border-slate-800" />

          <div className="space-y-0.5">
            {onOpenDeskLog && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenDeskLog();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors text-slate-300 hover:bg-slate-800 hover:text-indigo-400"
              >
                <Clock size={12} className="text-indigo-400" />
                <span>Desk Log</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setIsManageOpen(true);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
            >
              <Settings2 size={12} />
              <span>Manage Locations</span>
            </button>
          </div>
        </div>
      )}

      <ManageLocationsModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        state={state}
        setState={setState}
        syncToCloud={syncToCloud}
      />
    </div>
  );
};

