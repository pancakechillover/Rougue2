import { useCallback, useEffect, useState } from 'react';

/**
 * History-API routing: page state lives in the URL path (`/explore`).
 *
 * Requires the host to serve index.html for unknown paths:
 * - Vercel: vercel.json rewrites
 * - server.ts: express fallback (already present)
 * - vite dev: appType "spa" fallback (built in)
 *
 * Legacy `#/tab` bookmarks are migrated to clean paths on first load.
 */
export function useHistoryRoute(
  validTabs: readonly string[],
  fallback: string
): [string, (tab: string) => void] {
  const parse = useCallback((): string => {
    const raw = window.location.pathname.replace(/^\/+|\/+$/g, '');
    return validTabs.includes(raw) ? raw : fallback;
    // validTabs is a module-level constant in practice; keep it out of deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback]);

  const [tab, setTabState] = useState<string>(parse);

  // One-time: migrate legacy `#/tab` bookmarks to clean paths
  useEffect(() => {
    const match = window.location.hash.match(/^#\/([a-z]+)/);
    if (
      match &&
      validTabs.includes(match[1]) &&
      window.location.pathname !== `/${match[1]}`
    ) {
      window.history.replaceState(null, '', `/${match[1]}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPop = () => setTabState(parse());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [parse]);

  const setTab = useCallback(
    (next: string) => {
      if (!validTabs.includes(next)) return;
      const target = `/${next}`;
      if (window.location.pathname === target) return;
      window.history.pushState(null, '', target);
      setTabState(next); // pushState does not fire popstate
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return [tab, setTab];
}
