import { Check } from 'lucide-react';
import { categories, terms } from './data';
import { CATEGORY_GLYPH } from './graph/GraphCanvas';

/**
 * The category-grouped list. It was the Phase 4 navigation before the graph existed and it
 * stays as a fallback, because a canvas graph is a poor way to find a concept by name on a
 * phone.
 */
export function TermList({
  selectedId,
  onSelect,
  progressByTerm,
  practiceFilter,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  progressByTerm: Map<string, { done: number; total: number }>;
  practiceFilter: boolean;
}) {
  return (
    <div className="term-list">
      {categories.map((cat) => {
        const inCat = terms
          .filter((t) => t.category === cat.id)
          .filter((t) => !practiceFilter || progressByTerm.has(t.id));
        if (inCat.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 style={{ color: cat.color }}>
              <span className="list-glyph" aria-hidden>{CATEGORY_GLYPH[cat.id]}</span>
              {cat.name}
              <span className="list-count">{inCat.length}</span>
            </h2>
            <p className="list-desc">{cat.description}</p>
            <ul>
              {inCat.map((t) => {
                const p = progressByTerm.get(t.id);
                const complete = p && p.done >= p.total;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`list-item${t.id === selectedId ? ' active' : ''}`}
                      onClick={() => onSelect(t.id)}
                      style={{ borderLeftColor: t.id === selectedId ? cat.color : undefined }}
                    >
                      <span className="list-title">{t.title}</span>
                      <span className="list-summary">{t.summary}</span>
                      {p && (
                        <span className={complete ? 'list-badge done' : 'list-badge'}>
                          {complete ? <Check size={10} aria-hidden /> : null}
                          {p.done}/{p.total}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
