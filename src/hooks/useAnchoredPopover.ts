import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One popover, anchored to a target, with hover intent and click-to-pin.
 *
 * The three rules this encodes, all learned the hard way:
 *
 * 1. A hover has to *settle* before it opens. Opening on the first pixel of
 *    contact fired a card per column while the pointer was only passing
 *    through — the grid is dense and crossing it costs nothing.
 * 2. Once open, the card does not follow the pointer. The position is captured
 *    from the target and left alone; re-placing it on every mousemove is what
 *    makes a card impossible to reach with the cursor.
 * 3. Leaving grants a grace period, cancelled if the pointer lands on the card
 *    itself. Without that the card closes halfway through the journey toward
 *    it, which is the difference between "readable" and "copyable".
 *
 * Touch has no hover: a tap opens and pins in one go, a second tap on the same
 * target releases it.
 */

export interface AnchoredPopoverTarget {
  /** Identity of the thing being described: column index, talent id, slice index. */
  key: string;
  /** Viewport point the card hangs from. */
  point: { x: number; y: number };
  /** Only for element-anchored cards; recharts-style point anchors leave it unset. */
  element?: HTMLElement | null;
}

interface AnchoredPopoverOptions {
  /** How long the pointer must rest before the card appears. */
  openDelay?: number;
  /** How long the pointer may leave before the card closes. */
  closeDelay?: number;
  /** Entrance animation duration plus a little slack, in ms. */
  enterWindow?: number;
}

export function useAnchoredPopover({
  openDelay = 150,
  closeDelay = 250,
  enterWindow = 220,
}: AnchoredPopoverOptions = {}) {
  const [target, setTarget] = useState<AnchoredPopoverTarget | null>(null);
  const [entering, setEntering] = useState(false);

  const targetRef = useRef<AnchoredPopoverTarget | null>(null);
  targetRef.current = target;

  const pinnedRef = useRef(false);
  const pointerInCardRef = useRef(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // `target` only changes identity when the card genuinely moves or reopens, so
  // this is the one place the entrance animation is allowed to play.
  useEffect(() => {
    if (!target) {
      setEntering(false);
      return undefined;
    }
    setEntering(true);
    const timer = window.setTimeout(() => setEntering(false), enterWindow);
    return () => window.clearTimeout(timer);
  }, [target, enterWindow]);

  const place = useCallback((next: AnchoredPopoverTarget) => {
    setTarget((prev) => {
      if (!prev) return next;
      if (prev.key !== next.key) return next;
      // Same target: keep the old object so nothing re-renders. A new identity
      // here re-runs the portal's measuring pass and blinks the card.
      if (prev.point.x === next.point.x && prev.point.y === next.point.y && prev.element === next.element) {
        return prev;
      }
      return next;
    });
  }, []);

  /** Pointer rested on a target: open after the dwell, but never chase the pointer. */
  const hoverAt = useCallback((next: AnchoredPopoverTarget) => {
    if (pinnedRef.current) return;
    if (targetRef.current && targetRef.current.key === next.key) return;
    clearTimers();
    openTimer.current = window.setTimeout(() => place(next), openDelay);
  }, [clearTimers, openDelay, place]);

  const leave = useCallback(() => {
    if (pinnedRef.current) return;
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      if (!pointerInCardRef.current) setTarget(null);
    }, closeDelay);
  }, [clearTimers, closeDelay]);

  /** Click or tap: open and pin, or release if this is already the pinned one. */
  const pressAt = useCallback((next: AnchoredPopoverTarget) => {
    const current = targetRef.current;
    if (current && current.key === next.key && pinnedRef.current) {
      pinnedRef.current = false;
      clearTimers();
      setTarget(null);
      return;
    }
    pinnedRef.current = true;
    clearTimers();
    if (!current || current.key !== next.key) {
      place(next);
    } else {
      setEntering(false);
    }
  }, [clearTimers, place]);

  const pressNothing = useCallback(() => {
    pinnedRef.current = false;
    clearTimers();
    setTarget(null);
  }, [clearTimers]);

  const close = useCallback(() => {
    pinnedRef.current = false;
    clearTimers();
    setTarget(null);
  }, [clearTimers]);

  const cardHandlers = {
    onMouseEnter: () => {
      pointerInCardRef.current = true;
      clearTimers();
    },
    onMouseLeave: () => {
      pointerInCardRef.current = false;
      leave();
    },
  };

  return {
    target,
    isOpen: !!target,
    pinnedRef,
    /** Pass to the wrapper around the card; suppresses the entrance replay. */
    skipEnterClass: entering ? undefined : 'popover-skip-enter',
    hoverAt,
    leave,
    pressAt,
    pressNothing,
    close,
    cardHandlers,
  };
}

/**
 * Where the pointer is, in chart terms: which column, and where that column's
 * centre sits inside the wrapper.
 *
 * Recharts hands back `activeTooltipIndex`/`activeCoordinate` from the internal
 * tooltip state, which only exists while a `<Tooltip>` child is mounted — and
 * these charts no longer have one. The x-axis ticks are laid out in data order
 * and are still in the DOM, so they make a reliable fallback: nearest tick wins,
 * and its index is the datum index.
 */
export function resolveChartPoint(
  wrap: HTMLElement | null,
  state: any,
  event?: any,
  count?: number
): { index: number; x: number } | null {
  const rect = wrap?.getBoundingClientRect();
  if (!rect) return null;

  const chartX = state?.activeCoordinate?.x;
  const chartIndex = state?.activeTooltipIndex;
  if (typeof chartX === 'number' && typeof chartIndex === 'number') {
    return { index: chartIndex, x: chartX };
  }

  // Nothing exposes the column geometry now that the tooltip is gone. Categorical
  // axes in recharts are evenly spaced, so the plot bounds plus the row count are
  // enough: take the width from a horizontal grid line, split it into `count`
  // equal columns, and the pointer picks one. Reading positions off the marks
  // instead would break on sparse weeks — a column with no bar has no mark, and
  // the nearest-mark index then points at the wrong row.
  let pointerX: number | null = null;
  if (typeof event?.clientX === 'number') pointerX = event.clientX;
  else if (typeof state?.activeCoordinate?.x === 'number') pointerX = rect.left + state.activeCoordinate.x;
  if (pointerX === null) return null;

  let plotLeft = rect.left;
  let plotWidth = rect.width;
  const gridLine = wrap.querySelector('.recharts-cartesian-grid line');
  if (gridLine) {
    const g = gridLine.getBoundingClientRect();
    if (g.width > 0) {
      plotLeft = g.left;
      plotWidth = g.width;
    }
  }

  if (count && count > 1) {
    const step = plotWidth / count;
    const index = Math.min(count - 1, Math.max(0, Math.round((pointerX - plotLeft) / step - 0.5)));
    return { index, x: plotLeft + (index + 0.5) * step - rect.left };
  }

  const markers = Array.from(
    wrap.querySelectorAll('.recharts-bar-rectangle, .recharts-line-dot, .recharts-dot')
  )
    .map((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 ? r.left + r.width / 2 : null;
    })
    .filter((x): x is number => x !== null);
  const centers = Array.from(new Set(markers.map((x) => Math.round(x)))).sort((a, b) => a - b);
  if (!centers.length) return null;
  let best = 0;
  for (let i = 1; i < centers.length; i++) {
    if (Math.abs(centers[i] - pointerX) < Math.abs(centers[best] - pointerX)) best = i;
  }
  return { index: best, x: centers[best] - rect.left };
}
