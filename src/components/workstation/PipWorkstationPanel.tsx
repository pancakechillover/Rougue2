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

const fmt = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}m` : `${m}m`;
};

/**
 * Compact vertical workstation panel for the wide PiP left column.
 *
 * Styled with INLINE STYLES only: Tailwind classes generated for the main
 * document are not guaranteed to exist inside the PiP document (styles are
 * copied by enumeration, so classes unused in the main document have no
 * rules there). Inline styles are immune to that.
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

  const accent = active ? '#818cf8' : '#94a3b8';
  const btnBg = active ? 'rgba(244,63,94,0.15)' : 'rgba(99,102,241,0.18)';
  const btnBorder = active ? 'rgba(244,63,94,0.45)' : 'rgba(99,102,241,0.45)';
  const btnColor = active ? '#fda4af' : '#a5b4fc';

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflowY: 'auto', color: '#e2e8f0' }}>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: '#64748b' }}>DUTY</div>

      {active ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={runningLocation}>
            {runningLocation}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {fmt(runningMinutes)}
          </div>
          <div style={{ fontSize: 9, color: '#64748b' }}>on duty now</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: accent }}>Off duty</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {fmt(todayTotalMinutes)}
          </div>
          <div style={{ fontSize: 9, color: '#64748b' }}>today total</div>
        </>
      )}

      <button
        onClick={handleToggle}
        style={{
          marginTop: 4,
          width: '100%',
          padding: '6px 0',
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          background: btnBg,
          border: `1px solid ${btnBorder}`,
          color: btnColor,
          cursor: 'pointer',
        }}
      >
        {active ? 'Check Out' : 'Check In'}
      </button>
    </div>
  );
};
