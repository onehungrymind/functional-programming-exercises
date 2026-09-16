import { useEffect, useState } from 'react';

/**
 * Hash routing, so the app can be hosted anywhere static.
 *
 *   #/                                 the graph, nothing selected
 *   #/term/currying                    the drawer on Learn
 *   #/term/currying/practice           Practice, at the first incomplete rung
 *   #/term/currying/practice/implement a specific rung
 */

export interface Route {
  termId: string | null;
  tab: 'learn' | 'practice';
  rungId: string | null;
}

const EMPTY: Route = { termId: null, tab: 'learn', rungId: null };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'term' || !parts[1]) {
    // Upstream links to bare `#currying`. Honour that shape so shared links keep working.
    if (parts.length === 1 && parts[0]) return { termId: parts[0], tab: 'learn', rungId: null };
    return EMPTY;
  }
  return {
    termId: parts[1],
    tab: parts[2] === 'practice' ? 'practice' : 'learn',
    rungId: parts[2] === 'practice' ? (parts[3] ?? null) : null,
  };
}

export function buildHash(route: Route): string {
  if (!route.termId) return '#/';
  const base = `#/term/${route.termId}`;
  if (route.tab !== 'practice') return base;
  return route.rungId ? `${base}/practice/${route.rungId}` : `${base}/practice`;
}

export function navigate(route: Route, replace = false): void {
  const next = buildHash(route);
  if (window.location.hash === next) return;
  if (replace) window.history.replaceState(null, '', next);
  else window.location.hash = next;
  // replaceState does not fire hashchange, so tell the app ourselves.
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
