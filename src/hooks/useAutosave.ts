import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Debounced autosave for the two day pages.
 *
 * Both of them used to keep the reflection in component state and write it only
 * when the user pressed the button at the bottom. The page owns the whole
 * viewport now (it is a route, not a dialog), so pressing Back, switching tabs
 * or closing the tab threw the text away.
 *
 * `markDirty` is what separates "the user typed" from "we prefilled a template":
 * only the former schedules a write. Without it, opening a page whose day has no
 * reflection yet would save the auto-loaded template as if it were written.
 *
 * A pending write is flushed when the page hides or unmounts, so the last
 * keystrokes before leaving are not lost to the debounce window.
 */
export function useAutosave(
  deps: readonly unknown[],
  save: () => void,
  delayMs = 800
): { markDirty: () => void; status: AutosaveStatus } {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const saveRef = useRef(save);
  saveRef.current = save;
  const dirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const flush = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    saveRef.current();
  }, []);

  useEffect(() => {
    if (!dirtyRef.current) return;
    setStatus('saving');
    const id = window.setTimeout(() => {
      dirtyRef.current = false;
      saveRef.current();
      setStatus('saved');
    }, delayMs);
    return () => window.clearTimeout(id);
    // The dependency list is the caller's value list on purpose: every change
    // restarts the timer, which is the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const handleHide = () => flush();
    window.addEventListener('pagehide', handleHide);
    return () => {
      window.removeEventListener('pagehide', handleHide);
      flush();
    };
  }, [flush]);

  return { markDirty, status };
}
