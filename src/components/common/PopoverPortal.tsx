import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface PopoverPortalProps {
  /** Any element with a layout box — HTML or SVG (chart sectors are SVGPathElement). */
  anchorElement?: Element | null;
  /**
   * Anchor a panel to a viewport point instead of an element.
   *
   * Needed when the anchor node is owned by a chart library: recharts recreates
   * sector paths on every re-render, so a stored path reference is detached by
   * the time the panel mounts and its bounding box reads as all zeros — the
   * panel lands in the top-left corner. A point cannot go stale that way.
   *
   * Because the point is viewport-relative, scroll/resize closes the panel
   * through `onRequestClose` rather than letting it drift.
   */
  anchorPoint?: { x: number; y: number } | null;
  children: React.ReactNode;
  offsetY?: number;
  /**
   * Optional. When provided, the popover closes itself on outside pointer-down
   * or Escape. Both the anchor and the panel count as "inside", so callers do
   * not have to re-implement the `closest('.some-container')` dance — and it
   * keeps working after the panel moves to a portal outside the caller's DOM
   * subtree, which that dance cannot do.
   */
  onRequestClose?: () => void;
  /**
   * Which side wins when both fit. Defaults to `above`, the dropdown
   * convention (the trigger is usually followed by content below it). Charts
   * want `below`: the point you tapped is mid-figure, and opening upwards
   * buries whatever sits above the chart.
   */
  preferPlacement?: 'above' | 'below';
  /** Tailwind z-index class for the panel. Raise it when the anchor lives inside a modal. */
  zIndexClassName?: string;
  showArrow?: boolean;
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
export const PopoverPortal: React.FC<PopoverPortalProps> = ({
  anchorElement,
  anchorPoint,
  children,
  offsetY = 8,
  onRequestClose,
  preferPlacement = 'above',
  zIndexClassName = 'z-[9999]',
  showArrow = true,
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (anchorPoint) {
      setRect((prev) =>
        prev && prev.left === anchorPoint.x && prev.top === anchorPoint.y && prev.width === 0
          ? prev
          : new DOMRect(anchorPoint.x, anchorPoint.y, 0, 0)
      );
      return;
    }

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
  }, [anchorElement, anchorPoint?.x, anchorPoint?.y]);

  // A point anchor is viewport-relative and goes stale the moment the page
  // moves, so close instead of floating in the wrong place.
  useEffect(() => {
    if (anchorElement || !anchorPoint || !onRequestClose) return;
    const close = () => onRequestClose();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [anchorElement, anchorPoint?.x, anchorPoint?.y, onRequestClose]);

  // Reset only when the anchor switches. Doing this unconditionally also fires
  // on mount — and mount effects run *after* the measuring layout effect,
  // wiping the size it just recorded.
  const prevAnchorRef = useRef<Element | null>(null);
  const prevPointRef = useRef<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const pointChanged =
      prevPointRef.current?.x !== anchorPoint?.x || prevPointRef.current?.y !== anchorPoint?.y;
    if (prevAnchorRef.current !== anchorElement || pointChanged) {
      prevAnchorRef.current = anchorElement ?? null;
      prevPointRef.current = anchorPoint ?? null;
      setSize(null);
    }
  }, [anchorElement, anchorPoint?.x, anchorPoint?.y]);

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

  // Dismiss handling. Only armed once the real panel is on screen — during the
  // hidden ruler pass the pointer-events-none node would never be hit anyway,
  // and arming early can close the popover before it appears.
  useEffect(() => {
    if (!onRequestClose || !size) return;

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorElement?.contains(target)) return;
      onRequestClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onRequestClose();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onRequestClose, size, anchorElement]);

  if (!anchorElement && !anchorPoint) return null;

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
  const fitsAbove = spaceAbove >= panelHeight + 16;
  const fitsBelow = roomBelow >= panelHeight + 16;
  const placeBelow =
    preferPlacement === 'below' ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;

  const rawTop = placeBelow ? rect.bottom + offsetY : rect.top - offsetY;
  // For an upward panel the *visual* top is `top - panelHeight`, so clamping
  // `top` to the viewport is not enough — that let tall panels poke past the
  // top edge and lose their header. Clamp the visual edge instead: if the panel
  // cannot fit above, it slides down until its first row is at least `margin`
  // from the top, even when that means covering the anchor.
  const minTop = placeBelow ? margin : margin + panelHeight;
  const maxTop = placeBelow
    ? Math.max(contentHeight - margin - panelHeight, margin)
    : Math.max(contentHeight - margin, margin);
  const top = Math.min(Math.max(rawTop, minTop), maxTop);

  // Arrow points at the anchor, offset from the panel's centre.
  const arrowOffset = Math.max(
    -panelWidth / 2 + 16,
    Math.min(panelWidth / 2 - 16, anchorCenter - (left + panelWidth / 2))
  );

  return createPortal(
    <div
      ref={popoverRef}
      className={`fixed ${zIndexClassName} pointer-events-auto select-none`}
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
        {showArrow && (
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
        )}
      </div>
    </div>,
    document.body
  );
};
