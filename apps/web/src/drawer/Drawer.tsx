import { useEffect, useMemo, useRef } from 'react';
import { ExternalLink, Link2, X } from 'lucide-react';
import { PracticePanel } from '@fpx/practice-react';
import { getExerciseSet } from '@fpx/exercises';
import { categoriesById, neighborsOf, termsById, upstreamUrl, type Term } from '../data';
import { progress } from '../progress';
import { navigate, type Route } from '../routing';
import { CodeBlock } from './CodeBlock';
import { parseBody, renderInline } from './markdown';
import { createCheckWorker } from '../worker-factory';

export interface DrawerProps {
  term: Term;
  route: Route;
  onClose: () => void;
  onSelectTerm: (id: string) => void;
  /** Fired once when a concept's last rung is cleared. */
  onConceptComplete: (termId: string) => void;
}

export function Drawer({ term, route, onClose, onSelectTerm, onConceptComplete }: DrawerProps) {
  const cat = categoriesById.get(term.category);
  const exerciseSet = getExerciseSet(term.id);
  const bodyRef = useRef<HTMLDivElement>(null);

  const parts = useMemo(() => parseBody(term.body), [term.body]);
  const related = useMemo(() => neighborsOf(term.id), [term.id]);

  const rungTotal = exerciseSet?.rungs.length ?? 0;
  const rungDone = exerciseSet?.rungs.filter((r) => progress.isDone(term.id, r.id)).length ?? 0;

  // An internal `#term` link should switch concepts, not jump the page.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[data-term-id]');
      if (!link) return;
      const id = link.getAttribute('data-term-id')!;
      if (!termsById.has(id)) return;
      e.preventDefault();
      onSelectTerm(id);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [onSelectTerm, term.id]);

  /** Prefers a connected concept that still has rungs left, then any unfinished one. */
  const nextConcept = useMemo(() => {
    const unfinished = (id: string) => {
      const set = getExerciseSet(id);
      return !!set && set.rungs.some((r) => !progress.isDone(id, r.id));
    };
    const connected = related.find((n) => n.id !== term.id && unfinished(n.id));
    const pick = connected?.id ?? [...termsById.keys()].find((id) => id !== term.id && unfinished(id));
    if (!pick) return null;
    return { id: pick, title: termsById.get(pick)!.title };
  }, [related, term.id]);

  const copyLink = () => {
    const url = `${location.origin}${location.pathname}#/term/${term.id}`;
    void navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <aside className="drawer" aria-label={`${term.title} details`}>
      <header className="drawer-head">
        <div className="drawer-head-row">
          <div className="drawer-crumbs">
            {cat && (
              <span className="chip" style={{ borderColor: cat.color, color: cat.color }}>
                <b style={{ background: cat.color }} aria-hidden />
                {cat.name}
              </span>
            )}
            <span className="anchor">#{term.id}</span>
          </div>
          <div className="drawer-actions">
            <button type="button" className="ghost-btn tiny" onClick={copyLink} title="Copy a link to this concept">
              <Link2 size={13} aria-hidden />
              <span className="sr-only">Copy link</span>
            </button>
            <button type="button" className="ghost-btn tiny" onClick={onClose}>
              [ Esc ] <X size={13} aria-hidden />
            </button>
          </div>
        </div>

        <h2>{term.title}</h2>

        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={route.tab === 'learn'}
            onClick={() => navigate({ termId: term.id, tab: 'learn', rungId: null })}
          >
            Learn
          </button>
          {exerciseSet && (
            <button
              type="button"
              role="tab"
              className="tab"
              aria-selected={route.tab === 'practice'}
              onClick={() => navigate({ termId: term.id, tab: 'practice', rungId: null })}
            >
              Practice <span className="count">{rungDone}/{rungTotal}</span>
            </button>
          )}
        </div>
      </header>

      <div className="drawer-body" ref={bodyRef}>
        {route.tab === 'learn' || !exerciseSet ? (
          <>
            <p className="sect">
              <span>DEFINITION</span>
            </p>
            <div className="defbox">{term.summary}</div>

            <p className="sect">
              <span>EXPLANATION &amp; EXAMPLES</span>
              <span>
                {term.codeBlocks.length} CODE BLOCK{term.codeBlocks.length === 1 ? '' : 'S'}
              </span>
            </p>
            {parts.map((part, i) =>
              part.type === 'code' ? (
                <CodeBlock key={i} code={part.code} lang={part.lang} />
              ) : (
                <div key={i} className="prose" dangerouslySetInnerHTML={{ __html: part.html }} />
              ),
            )}

            {term.furtherReading.length > 0 && (
              <>
                <p className="sect">
                  <span>FURTHER READING</span>
                </p>
                <ul className="reading">
                  {term.furtherReading.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.title} <ExternalLink size={11} aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {related.length > 0 && (
              <>
                <p className="sect">
                  <span>CONNECTED CONCEPTS</span>
                  <span>{related.length}</span>
                </p>
                <div className="related">
                  {related.map((n) => {
                    const t = termsById.get(n.id);
                    if (!t) return null;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className={`related-chip${n.type === 'reference' ? ' ref' : ''}`}
                        onClick={() => onSelectTerm(n.id)}
                      >
                        {t.title}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <PracticePanel
            termId={term.id}
            exerciseSet={exerciseSet}
            progress={progress}
            rungId={route.rungId}
            nextConcept={nextConcept}
            createWorker={createCheckWorker}
            renderMarkdown={renderInline}
            onNavigate={(next) => {
              if (next.termId) onSelectTerm(next.termId);
              else navigate({ termId: term.id, tab: 'practice', rungId: next.rungId ?? null });
            }}
            onCompleteConcept={() => onConceptComplete(term.id)}
          />
        )}
      </div>

      <footer className="drawer-foot">
        <a href={upstreamUrl(term.id)} target="_blank" rel="noopener noreferrer">
          Open on FP Jargon <ExternalLink size={11} aria-hidden />
        </a>
        <span>{term.isConcept ? 'Concept' : 'Section'}</span>
      </footer>
    </aside>
  );
}
