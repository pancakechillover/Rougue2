import { useCallback, useEffect, useState } from 'react';

/**
 * Two-way sync between a tab state and the URL hash (`#/tabname`).
 *
 * - Reading: on load and on `hashchange` (browser back/forward, pasted URLs)
 * - Writing: `setTab` assigns `location.hash`, which pushes a history entry so
 *   the mobile back button and Ctrl+Z-style navigation behave naturally
 *
 * Invalid hashes fall back to `fallback` without touching the URL.
 */
export function useHashRoute(
  validTabs: readonly string[],
  fallback: string
): [string, (tab: string) => void] {
  const parse = useCallback((): string => {
    const raw = window.location.hash.replace(/^#\/?/, '').replace(/\/.*$/, '');
    return validTabs.includes(raw) ? raw : fallback;
    // validTabs is a module-level constant in practice; keep it out of deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback]);

  const [tab, setTabState] = useState<string>(parse);

  useEffect(() => {
    const onHashChange = () => setTabState(parse());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [parse]);

  // Normalise the URL on first mount (e.g. bare `/` -> `#/dashboard`) without
  // creating a history entry.
  useEffect(() => {
    const target = `#/${tab}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [tab]);

  const setTab = useCallback(
    (next: string) => {
      if (!validTabs.includes(next)) return;
      const target = `#/${next}`;
      if (window.location.hash === target) return;
      window.location.hash = target; // hashchange listener does the setState
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return [tab, setTab];
}
