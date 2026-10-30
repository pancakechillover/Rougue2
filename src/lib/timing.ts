/**
 * Timing helpers.
 *
 * The project had none, so every debounce was a hand-rolled `setTimeout` with its
 * own delay and its own cleanup rules — 320 ms for the username check, 800 ms for
 * the journal autosave, 150 ms for chart cards. Copying that pattern is where the
 * leaks came from, so the two shapes that are actually needed live here instead.
 */

export type Cancellable<F> = F & { cancel: () => void };

/**
 * Trailing-edge debounce. Only the last call of a burst runs, after `waitMs` of
 * quiet. `cancel()` drops a pending call — use it on unmount and before a flush.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number
): Cancellable<(...args: A) => void> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wrapped = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return wrapped;
}

/**
 * Collapses a burst of events (resize, scroll, pointermove) into at most one call
 * per animation frame, passing the arguments of the most recent event. Unlike a
 * time-based throttle this stays in step with the compositor, so a handler that
 * measures layout always runs right before the frame that paints it.
 */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void): Cancellable<(...args: A) => void> {
  let frame: number | null = null;
  let pendingArgs: A | null = null;

  const run = () => {
    frame = null;
    if (!pendingArgs) return;
    const args = pendingArgs;
    pendingArgs = null;
    fn(...args);
  };

  const wrapped = (...args: A) => {
    pendingArgs = args;
    if (frame === null) frame = requestAnimationFrame(run);
  };

  wrapped.cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    pendingArgs = null;
  };

  return wrapped;
}
