import { useEffect, useMemo, useState } from 'react';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';
import { LogIn, LogOut } from 'lucide-react';
import { AppState } from '../../types';
import { useWorkstation } from '../../hooks/useWorkstation';
import { getWorkstationLocations, getWorkstationTotalMinutes } from '../../lib/workstationUtils';
import { getSettlementDay } from '../../lib/utils';
import { LocationIcon } from './LocationIcon';

interface PipWorkstationPanelProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (silent: boolean, data?: AppState, reason?: string) => void;
}

const fmt = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}m` : `${m}m`;
};

/**
 * Compact workstation panel for the wide PiP left column.
 *
 * Inline styles with theme-aware CSS variables (--color-*), so colours
 * follow the active theme. The location row uses the shared LocationIcon
 * (preset lucide icon per location). No redundant captions.
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
  const runningMinutes = useMemo(() => {
    if (!active || !running?.startTime) return 0;
    const start = parseISO(running.startTime);
    if (!isValid(start)) return 0;
    return Math.max(0, differenceInMinutes(now, start));
  }, [active, running?.startTime, now]);

  const displayLocation = active?.location || preferredLocation;

  const handleToggle = async () => {
    if (active) {
      await punchOut({});
    } else {
      await punchIn({ location: preferredLocation });
    }
  };

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflowY: 'auto', color: 'var(--color-slate-100, #e2e8f0)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <LocationIcon locName={displayLocation} size={15} />
        <span
          style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={displayLocation}
        >
          {displayLocation}
        </span>
      </div>

      <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: 'var(--color-indigo-500, #6366f1)' }}>
        {fmt(active ? runningMinutes : todayTotalMinutes)}
      </div>

      <button
        onClick={handleToggle}
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          width: '100%',
          padding: '7px 0',
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 700,
          background: active ? 'var(--color-slate-800, #1e293b)' : 'var(--color-indigo-600, #4f46e5)',
          color: active ? 'var(--color-slate-300, #cbd5e1)' : '#ffffff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {active ? <LogOut size={11} /> : <LogIn size={11} />}
        {active ? 'Check Out' : 'Check In'}
      </button>
    </div>
  );
};
