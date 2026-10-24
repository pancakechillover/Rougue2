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
    const style = pipWindow.document.createElement('style');
    style.textContent =
      'html.pip-wide .pip-container { width: calc(100dvw - 118px) !important; }';
    pipWindow.document.head.appendChild(style);

    const measure = () => {
      const isWide = el.clientWidth >= threshold;
      setWide(isWide);
      el.classList.toggle('pip-wide', isWide);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    pipWindow.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      pipWindow.removeEventListener('resize', measure);
      el.classList.remove('pip-wide');
      style.remove();
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
            className="absolute left-0 top-0 bottom-0 w-[118px] z-10 border-r border-slate-800 bg-slate-900/60 overflow-y-auto"
          >
            {side}
          </div>,
          pipWindow.document.body
        )}
    </>
  );
};
