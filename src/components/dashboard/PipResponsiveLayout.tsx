import { useEffect, useState, ReactNode } from 'react';

interface PipResponsiveLayoutProps {
  pipWindow: Window | null;
  /** Rendered in the left column when the PiP window is wide enough. */
  side?: ReactNode;
  children: ReactNode;
  /** Width threshold (px) at which the side panel appears. */
  threshold?: number;
}

/**
 * Layout wrapper for Document Picture-in-Picture windows.
 *
 * Watches the PiP window's own viewport width with a ResizeObserver:
 * - below `threshold` (default 340): single column, only `children`
 * - at/above `threshold`: two columns — `side` panel on the left,
 *   `children` (the timer) filling the rest
 *
 * Chrome clamps PiP windows to a 240px minimum width, so the single-column
 * layout must always fit ~240px.
 */
export const PipResponsiveLayout: React.FC<PipResponsiveLayoutProps> = ({
  pipWindow,
  side,
  children,
  threshold = 340,
}) => {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (!pipWindow) return;
    const el = pipWindow.document.documentElement;
    const measure = () => setWide(el.clientWidth >= threshold);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    pipWindow.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      pipWindow.removeEventListener('resize', measure);
    };
  }, [pipWindow, threshold]);

  if (!pipWindow) return <>{children}</>;

  return (
    <div className="w-full min-h-screen flex items-stretch">
      {wide && (
        <div className="w-[118px] shrink-0 border-r border-slate-800 bg-slate-900/60">
          {side}
        </div>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};
