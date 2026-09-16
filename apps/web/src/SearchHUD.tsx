import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { categoriesById, terms } from './data';
import { hasExercises } from '@fpx/exercises/manifest';

/**
 * Command-palette search over titles and aliases. `/` opens it, Escape closes it,
 * arrows move, Enter selects.
 */
export function SearchHUD({
  open,
  query,
  onQuery,
  onClose,
  onSelect,
}: {
  open: boolean;
  query: string;
  onQuery: (q: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms.slice(0, 8);
    return terms
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.includes(q) ||
          t.aliases.some((a) => a.toLowerCase().includes(q)),
      )
      // A title that starts with the query is almost always the one they meant.
      .sort((a, b) => {
        const rank = (t: typeof a) => (t.title.toLowerCase().startsWith(q) ? 0 : 1);
        return rank(a) - rank(b) || a.title.length - b.title.length;
      })
      .slice(0, 10);
  }, [query]);

  useEffect(() => {
    if (open) {
      input.current?.focus();
      setCursor(0);
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  return (
    <div className="search-backdrop" onClick={onClose} role="presentation">
      <div className="search-hud" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search concepts">
        <div className="search-input">
          <Search size={14} aria-hidden />
          <input
            ref={input}
            value={query}
            placeholder="Search concepts and aliases"
            aria-label="Search concepts"
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, hits.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === 'Enter' && hits[cursor]) {
                onSelect(hits[cursor]!.id);
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="search-hits">
          {hits.map((t, i) => {
            const cat = categoriesById.get(t.category);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={i === cursor ? 'hit active' : 'hit'}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => onSelect(t.id)}
                >
                  <b style={{ background: cat?.color }} aria-hidden />
                  <span className="hit-title">{t.title}</span>
                  {hasExercises(t.id) && <span className="hit-tag">practice</span>}
                  <span className="hit-cat">{cat?.name}</span>
                </button>
              </li>
            );
          })}
          {hits.length === 0 && <li className="hit-empty">Nothing matches that.</li>}
        </ul>
      </div>
    </div>
  );
}
