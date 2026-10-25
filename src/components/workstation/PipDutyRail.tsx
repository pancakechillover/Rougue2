import { useEffect, useMemo, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { DurationText } from '../common/DurationText';
import { AppState } from '../../types';
import { useWorkstation } from '../../hooks/useWorkstation';
import { getWorkstationLocations, getWorkstationTotalMinutes } from '../../lib/workstationUtils';
import { getSettlementDay } from '../../lib/utils';
import { LocationIcon } from '../workstation/LocationIcon';

interface PipDutyRailProps {
  pipWindow: Window | null;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (silent: boolean, data?: AppState, reason?: string) => void;
  children: ReactNode;
  /** Viewport width (px) at which the rail appears. */
  threshold?: number;
  /** Rail width (px). The timer gets viewport width minus this. */
  railWidth?: number;
}

/**
 * Minimal duty rail for wide Document PiP windows (>= threshold).
 *
 * A slim vertical strip docked on the left: the current location's preset
 * icon + today's workstation minutes. Clicking anywhere on the rail
 * toggles check-in / check-out.
 *
 * Zero-intrusion below the threshold: children render exactly as before.
 * At/above it, an absolute rail is portalled into the PiP body and the
 * timer root (.pip-container) is imperatively narrowed and shifted right.
 */
export const PipDutyRail: React.FC<PipDutyRailProps> = ({
  pipWindow,
  state,
  setState,
  syncToCloud,
  children,
  threshold = 340,
  railWidth = 56,
}) => {
  const [wide, setWide] = useState(false);
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

  const isRunning = Boolean(active);
  const displayLocation = active?.location || preferredLocation;

  const handleToggle = async (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (active) {
      await punchOut({});
    } else {
      await punchIn({ location: preferredLocation });
    }
  };

  // Width gate + imperative timer shift (inline style always wins)
  useEffect(() => {
    if (!pipWindow) return;
    const el = pipWindow.document.documentElement;
    const measure = () => {
      const isWide = el.clientWidth >= threshold;
      setWide(isWide);
      const container = pipWindow.document.querySelector<HTMLElement>('.pip-container');
      if (container) {
        container.style.width = isWide ? `calc(100dvw - ${railWidth}px)` : '';
        container.style.marginLeft = isWide ? `${railWidth}px` : '';
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    pipWindow.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      pipWindow.removeEventListener('resize', measure);
      const container = pipWindow.document.querySelector<HTMLElement>('.pip-container');
      if (container) {
        container.style.width = '';
        container.style.marginLeft = '';
      }
    };
  }, [pipWindow, threshold, railWidth]);

  if (!pipWindow) return <>{children}</>;

  const rail: ReactNode = (
    <div
      onClick={handleToggle}
      title={active ? `At ${displayLocation} — click to check out` : 'Click to check in'}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: railWidth,
        zIndex: 10,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        background: 'var(--color-slate-900, #1e293b)',
        borderRight: '1px solid var(--color-slate-800, #1e293b)',
        userSelect: 'none',
      }}
    >
      <LocationIcon
        locName={displayLocation}
        customIcons={state.workstationLocationIcons}
        size={20}
        className={cn('transition-colors duration-300', !isRunning && 'text-slate-500')}
      />
      <div
        style={{ fontSize: 13, lineHeight: 1 }}
        className={cn(
          'font-bold tabular-nums transition-colors duration-300',
          isRunning ? 'text-emerald-500' : 'text-slate-500'
        )}
      >
        <DurationText minutes={todayTotalMinutes} />
      </div>
    </div>
  );

  return (
    <>
      {children}
      {wide && createPortal(rail, pipWindow.document.body)}
    </>
  );
};
