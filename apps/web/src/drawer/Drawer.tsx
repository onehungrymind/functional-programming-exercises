import { useEffect, useMemo, useRef } from 'react';
import { ExternalLink, Link2, X } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { manifestByTerm } from '@fpx/exercises/manifest';
import { categoriesById, neighborsOf, termsById, upstreamUrl, type Term } from '../data';
import { nextConcept as nextInCurriculum } from '../curriculum';
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
  // Metadata only. The exercises themselves arrive with PracticeTab below.
  const entry = manifestByTerm[term.id];
  const bodyRef = useRef<HTMLDivElement>(null);

  const parts = useMemo(() => parseBody(term.body), [term.body]);
  const related = useMemo(() => neighborsOf(term.id), [term.id]);

  const rungTotal = entry?.rungs.length ?? 0;
  const rungDone = entry?.rungs.filter((r) => progress.isDone(term.id, r.id)).length ?? 0;

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

  /**
   * The next concept to offer, taken from the curriculum rather than from the graph.
   * Graph adjacency would happily send someone from Currying to Kleisli Composition.
   */
  const nextConcept = useMemo(
    () =>
      nextInCurriculum(term.id, (id) => {
        const e = manifestByTerm[id];
        return !!e && e.rungs.some((r) => !progress.isDone(id, r.id));
      }),
    [term.id],
  );

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
          {entry && (
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
        {route.tab === 'learn' || !entry ? (
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
          <Suspense fallback={<p className="results-idle">Loading the exercises...</p>}>
            <PracticeTab
              termId={term.id}
              rungId={route.rungId}
              nextConcept={nextConcept}
              onSelectTerm={onSelectTerm}
              onConceptComplete={onConceptComplete}
            />
          </Suspense>
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

/**
 * The exercise content is the largest thing this app ships, and the Learn tab never needs
 * it. Loading it here keeps it out of the initial bundle along with the editor.
 */
const PracticeTab = lazy(async () => {
  const [{ PracticePanel }, { getExerciseSet }] = await Promise.all([
    import('@fpx/practice-react'),
    import('@fpx/exercises'),
  ]);

  return {
    default: function PracticeTabInner({
      termId,
      rungId,
      nextConcept,
      onSelectTerm,
      onConceptComplete,
    }: {
      termId: string;
      rungId: string | null;
      nextConcept: { id: string; title: string } | null;
      onSelectTerm: (id: string) => void;
      onConceptComplete: (id: string) => void;
    }) {
      const exerciseSet = getExerciseSet(termId);
      if (!exerciseSet) return null;
      return (
        <PracticePanel
          termId={termId}
          exerciseSet={exerciseSet}
          progress={progress}
          rungId={rungId}
          nextConcept={nextConcept}
          createWorker={createCheckWorker}
          renderMarkdown={renderInline}
          onNavigate={(next) => {
            if (next.termId) onSelectTerm(next.termId);
            else navigate({ termId, tab: 'practice', rungId: next.rungId ?? null });
          }}
          onCompleteConcept={() => onConceptComplete(termId)}
        />
      );
    },
  };
});
