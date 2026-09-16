import { useEffect, useState } from 'react';
import type { ConceptNotes } from '@fpx/exercises/notes';

/**
 * Loads the Learn prose for a concept.
 *
 * The prose is roughly six times the size of everything else the shell needs before it can
 * paint, and nobody reads it until a drawer is open. So it ships as its own module and
 * arrives here instead of in the initial bundle. The module resolves once and is cached by
 * the browser after that, so only the first concept a visitor opens waits on it.
 *
 * Returns null until it lands. The upstream body renders from `data/jargons.json`, which is
 * already in hand, so the drawer is never blank while this is in flight.
 */
let cached: Record<string, ConceptNotes> | null = null;
let pending: Promise<Record<string, ConceptNotes>> | null = null;

const load = () => {
  if (cached) return Promise.resolve(cached);
  pending ??= import('@fpx/exercises/notes').then((m) => {
    cached = m.conceptNotes;
    pending = null;
    return cached;
  });
  return pending;
};

export function useConceptNotes(termId: string): ConceptNotes | null {
  const [all, setAll] = useState<Record<string, ConceptNotes> | null>(cached);

  useEffect(() => {
    if (cached) return;
    let live = true;
    load().then((loaded) => {
      if (live) setAll(loaded);
    });
    return () => {
      live = false;
    };
  }, []);

  return all?.[termId] ?? null;
}
