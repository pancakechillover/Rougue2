import { useEffect, useMemo, useState } from 'react';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';
import { AppState } from '../../types';
import { useWorkstation } from '../../hooks/useWorkstation';
import { getWorkstationLocations, getWorkstationTotalMinutes } from '../../lib/workstationUtils';
import { getSettlementDay } from '../../lib/utils';

interface PipWorkstationPanelProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (silent: boolean, data?: AppState, reason?: string) => void;
}

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}m` : `${m}m`;
};

/**
 * Compact vertical workstation panel for the left column of a wide
 * Document Picture-in-Picture window (only rendered when the window is
 * wide enough, see PipResponsiveLayout).
 *
 * Uses the remembered last location (localStorage) so punch-in works with
 * a single tap — no location picker inside the small PiP window.
 */
export const PipWorkstationPanel: React.FC<PipWorkstationPanelProps> = ({
  state,
  setState,
  syncToCloud,
}) => {
  const { active, punchIn, punchOut } = useWorkstation({ state, setState, syncToCloud });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);
  const preferredLocation = useMemo(() => {
    try {
      const saved = localStorage.getItem('scholars_last_ws_location');
      if (saved && locations.includes(saved)) return saved;
    } catch { /* private mode */ }
    return locations[0] || 'Home';
  }, [locations]);

  const todayStr = useMemo(() => getSettlementDay(new Date(), state.timeSettings), [state.timeSettings]);
  const todayTotalMinutes = getWorkstationTotalMinutes(todayStr, state, now);

  const running = state.activeWorkstationSession;
  const runningLocation = running?.location || preferredLocation;
  const runningMinutes = useMemo(() => {
    if (!active || !running?.startTime) return 0;
    const start = parseISO(running.startTime);
    if (!isValid(start)) return 0;
    return Math.max(0, differenceInMinutes(now, start));
  }, [active, running?.startTime, now]);

  const handleToggle = async () => {
    if (active) {
      await punchOut({});
    } else {
      await punchIn({ location: preferredLocation });
    }
  };

  return (
    <div className="p-2 flex flex-col gap-1.5 h-full overflow-y-auto text-slate-200">
      <div className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">Workstation</div>

      {active ? (
        <>
          <div
            className="text-xs font-semibold text-indigo-300 truncate"
            title={runningLocation}
          >
            {runningLocation}
          </div>
          <div className="text-xl font-bold text-indigo-200 tabular-nums leading-none">
            {formatMinutes(runningMinutes)}
          </div>
          <div className="text-[10px] text-slate-500">on duty now</div>
        </>
      ) : (
        <>
          <div className="text-xs font-semibold text-slate-400">Off duty</div>
          <div className="text-xl font-bold text-slate-300 tabular-nums leading-none">
            {formatMinutes(todayTotalMinutes)}
          </div>
          <div className="text-[10px] text-slate-500">today total</div>
        </>
      )}

      <button
        onClick={handleToggle}
        className={
          'mt-1 w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ' +
          (active
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30')
        }
      >
        {active ? 'Check Out' : 'Check In'}
      </button>
    </div>
  );
};
