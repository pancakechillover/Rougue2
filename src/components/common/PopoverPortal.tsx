import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface PopoverPortalProps {
  anchorElement: HTMLElement | null;
  children: React.ReactNode;
  offsetY?: number;
}

/**
 * Floating panel anchored to an element.
 *
 * Positioning renders in two passes, and that is deliberate:
 *
 *   1. A hidden "ruler" is mounted off-screen with the real content, purely so
 *      its natural size can be measured.
 *   2. The actual card is then placed once, using the measured size.
 *
 * Placing directly and correcting afterwards looks like the card hops down and
 * then back up: the first pass has to guess the height, so it may decide "fits
 * above", while the measured pass flips to "place below". Measuring first means
 * only one placement ever reaches the screen.
 *
 * Clamping uses `documentElement.clientWidth` (content width) rather than
 * `window.innerWidth`, which includes the vertical scrollbar.
 */
export const PopoverPortal: React.FC<PopoverPortalProps> = ({ anchorElement, children, offsetY = 8 }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!anchorElement) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const next = anchorElement.getBoundingClientRect();
      // Only re-render when the anchor actually moved.
      setRect((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next
      );
    };

    updateRect();
    // Deliberately NOT a per-frame loop. The anchor cell scales up when
    // selected, and getBoundingClientRect() includes transforms — tracking it
    // every frame made the popover drift after the cell while it animated,
    // which reads as "it hops down and then back up". Scroll and resize are the
    // only events that actually move an anchor relative to the viewport.
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [anchorElement]);

  // Reset only when the anchor switches to a different element. Doing this
  // unconditionally also fires on mount — and mount effects run *after* the
  // measuring layout effect, wiping the size it just recorded.
  const prevAnchorRef = useRef<HTMLElement | null>(anchorElement);
  useLayoutEffect(() => {
    if (prevAnchorRef.current !== anchorElement) {
      prevAnchorRef.current = anchorElement;
      setSize(null);
    }
  }, [anchorElement]);

  // Measure the ruler. A second attempt on the next frame covers the case where
  // layout has not settled yet on the very first pass.
  useLayoutEffect(() => {
    if (size) return;
    const el = popoverRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (width > 0 && height > 0) {
        setSize({ width, height });
        return true;
      }
      return false;
    };

    if (measure()) return;
    const frameId = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(frameId);
  }, [size, anchorElement]);

  if (!anchorElement) return null;

  const margin = 12;
  const contentWidth = document.documentElement.clientWidth;
  const contentHeight = document.documentElement.clientHeight;
  const maxWidth = Math.max(contentWidth - margin * 2, 160);

  // ---- Pass 1: invisible ruler ----
  if (!size) {
    return createPortal(
      <div
        ref={popoverRef}
        aria-hidden="true"
        data-popover-ruler="1"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          maxWidth: `${maxWidth}px`,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>,
      document.body
    );
  }

  // ---- Pass 2: place once, with the real size ----
  if (!rect) return null;

  const panelWidth = Math.min(size.width, maxWidth);
  const panelHeight = size.height;
  const anchorCenter = rect.left + rect.width / 2;

  // Clamp the panel width first, then its left edge — so a panel wider than the
  // available space still cannot spill past the content box.
  const left = Math.min(
    Math.max(anchorCenter - panelWidth / 2, margin),
    Math.max(contentWidth - margin - panelWidth, margin)
  );

  const spaceAbove = rect.top - offsetY;
  const roomBelow = contentHeight - rect.bottom;
  const placeBelow = spaceAbove < panelHeight + 16 && roomBelow > panelHeight + 16;

  const rawTop = placeBelow ? rect.bottom + offsetY : rect.top - offsetY;
  const top = Math.min(
    Math.max(rawTop, margin),
    Math.max(contentHeight - margin - (placeBelow ? 0 : panelHeight), margin)
  );

  // Arrow points at the anchor, offset from the panel's centre.
  const arrowOffset = Math.max(
    -panelWidth / 2 + 16,
    Math.min(panelWidth / 2 - 16, anchorCenter - (left + panelWidth / 2))
  );

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999] pointer-events-auto select-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        maxWidth: `${maxWidth}px`,
        transform: placeBelow ? 'none' : 'translateY(-100%)',
      }}
    >
      <div className="relative">
        {children}
        {/* Dynamic pointer arrow */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `calc(50% + ${arrowOffset}px)`,
            transform: 'translateX(-50%)',
            ...(placeBelow
              ? { bottom: '100%', marginBottom: '-1px' }
              : { top: '100%', marginTop: '-1px' }),
          }}
        >
          <div
            className={
              placeBelow
                ? 'border-8 border-transparent border-b-slate-700'
                : 'border-8 border-transparent border-t-slate-700'
            }
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
