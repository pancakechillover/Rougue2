import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PipResponsiveLayoutProps {
  pipWindow: Window | null;
  /** Rendered as an absolutely-positioned left column when wide. */
  side?: ReactNode;
  children: ReactNode;
  /** Width threshold (px) at which the side panel appears. */
  threshold?: number;
}

/**
 * Zero-intrusion responsive layer for Document Picture-in-Picture.
 *
 * Below the threshold the DOM is EXACTLY what it was before this component
 * existed (children rendered straight into the PiP body, native 100dvw/dvh
 * sizing) — pixel-identical to the legacy behaviour.
 *
 * At/above the threshold:
 * - a `pip-wide` class on the PiP documentElement activates a CSS override
 *   that shrinks `.pip-container` to (100dvw - 118px)
 * - the `side` panel is portalled into the PiP body as an absolute column
 *   on the freed left space
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

    const measure = () => {
      // Both dimensions matter: a short-but-wide strip (the common shape)
      // cannot fit a side column without crushing the timer.
      const isWide = el.clientWidth >= threshold && el.clientHeight >= 150;
      setWide(isWide);
      // Imperative width control on the timer root — a CSS override via a
      // copied stylesheet proved unreliable, inline style always wins.
      const container = pipWindow.document.querySelector<HTMLElement>('.pip-container');
      if (container) {
        container.style.width = isWide ? 'calc(100dvw - 118px)' : '';
        // Move it out from under the absolutely-positioned side panel —
        // shrinking alone left it at x=0, hidden BENEATH the panel.
        container.style.marginLeft = isWide ? '118px' : '';
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
  }, [pipWindow, threshold]);

  if (!pipWindow) return <>{children}</>;

  return (
    <>
      {children}
      {wide &&
        side &&
        createPortal(
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 118,
              zIndex: 10,
              borderRight: '1px solid rgba(30,41,59,0.9)',
              background: 'rgba(15,23,42,0.92)',
              overflowY: 'auto',
            }}
          >
            {side}
          </div>,
          pipWindow.document.body
        )}
    </>
  );
};
