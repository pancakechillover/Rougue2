import React, { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Check, Settings2 } from 'lucide-react';
import { AppState } from '../../types';
import { useWorkstation } from '../../hooks/useWorkstation';
import { getWorkstationLocations, getWorkstationTotalMinutes } from '../../lib/workstationUtils';
import { cn, getSettlementDay } from '../../lib/utils';
import { LocationIcon } from './LocationIcon';
import { DurationText } from '../common/DurationText';
import { ManageLocationsModal } from './ManageLocationsModal';

interface WorkstationStatusChipProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
}

/**
 * Compact workstation status indicator for the app top bar.
 *
 * - Grey icon  = no active session
 * - Coloured   = session running (icon keeps its own location colour)
 * - Click      = check in (opens location picker) / check out
 * - Wide screen= shows today's total workstation time next to the icon
 */
export const WorkstationStatusChip: React.FC<WorkstationStatusChipProps> = ({
  state,
  setState,
  syncToCloud,
}) => {
  const { active, punchIn, punchOut } = useWorkstation({ state, setState, syncToCloud });

  const [now, setNow] = useState<Date>(() => new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);

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
        const elapsed = Math.max(0, differenceInMinutes(now, new Date(running.startTime)));
        map.set(loc, (map.get(loc) || 0) + elapsed);
      }
    }

    return map;
  }, [state.workstationLogs, state.activeWorkstationSession, state.timeSettings, todayStr, now]);

  const displayLocation = active?.location || preferredLocation;
  const isRunning = Boolean(active);

  const startAt = (location: string) => {
    try {
      localStorage.setItem('scholars_last_ws_location', location);
    } catch {}
    setPreferredLocation(location);
    punchIn({ location });
    setIsMenuOpen(false);
  };

  const handleClick = () => {
    if (isRunning) {
      punchOut({ fallbackLocation: preferredLocation });
      return;
    }
    if (locations.length <= 1) {
      startAt(locations[0] || 'Home');
      return;
    }
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center shrink-0">
      <button
        type="button"
        onClick={handleClick}
        title={
          isRunning
            ? `At ${displayLocation} — click to check out`
            : 'Not checked in — click to choose a location'
        }
        className={cn(
          'flex items-center gap-1.5 p-1 -m-1 rounded-lg transition-all active:scale-95',
          isRunning ? 'hover:bg-emerald-500/10' : 'hover:bg-slate-500/10'
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
            isRunning ? 'text-emerald-500' : 'text-slate-500'
          )}
        >
          <DurationText minutes={todayTotalMinutes} />
        </span>
      </button>

      {isMenuOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-44 rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Check in location
          </div>
          {locations.map((loc) => {
            const minutesHere = todayMinutesByLocation.get(loc) || 0;
            const isCurrent = loc === preferredLocation;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => startAt(loc)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors hover:bg-slate-800',
                  isCurrent ? 'text-slate-100' : 'text-slate-300'
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

          <div className="my-1 border-t border-slate-800" />

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsManageOpen(true);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
          >
            <Settings2 size={12} />
            <span>Manage</span>
          </button>
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
