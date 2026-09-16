import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Github, List, Moon, Network, Search, Sun, Target } from 'lucide-react';
import { exerciseSets, getExerciseSet } from '@fpx/exercises';
import { categoriesById, graph, meta, termsById } from './data';
import { GraphCanvas } from './graph/GraphCanvas';
import { Drawer } from './drawer/Drawer';
import { SearchHUD } from './SearchHUD';
import { TermList } from './TermList';
import { ProgressMenu } from './ProgressMenu';
import { progress } from './progress';
import { navigate, useRoute } from './routing';
import { useTheme } from './theme';
import { celebrate } from './celebrate';

export function App() {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const [practiceFilter, setPracticeFilter] = useState(false);

  // Re-render whenever progress changes, so the arcs and the tab counts stay in step.
  useSyncExternalStore(progress.subscribe, progress.getSnapshot);

  const term = route.termId ? termsById.get(route.termId) : undefined;

  /** Term id -> done/total, for the graph arcs and the header readout. */
  const progressByTerm = useMemo(() => {
    const out = new Map<string, { done: number; total: number }>();
    for (const [termId, set] of Object.entries(exerciseSets)) {
      out.set(termId, {
        done: set.rungs.filter((r) => progress.isDone(termId, r.id)).length,
        total: set.rungs.length,
      });
    }
    return out;
    // getSnapshot's identity changes on every commit, which is exactly the signal we want.
  }, [progress.getSnapshot()]);

  const overall = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const p of progressByTerm.values()) {
      done += p.done;
      total += p.total;
    }
    return { done, total };
  }, [progressByTerm]);

  const select = useCallback((id: string | null) => {
    if (!id) {
      navigate({ termId: null, tab: 'learn', rungId: null });
      return;
    }
    // Open straight into Practice when there is something to practice and it is unfinished.
    const set = getExerciseSet(id);
    const unfinished = set?.rungs.some((r) => !progress.isDone(id, r.id));
    navigate({ termId: id, tab: set && unfinished ? 'practice' : 'learn', rungId: null });
  }, []);

  // Keyboard: `/` opens search, Escape closes whatever is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.closest('.cm-editor');

      if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        // Escape closes the drawer only when the editor does not have focus.
        else if (route.termId && !(el as HTMLElement | null)?.closest('.cm-editor')) {
          navigate({ termId: null, tab: 'learn', rungId: null });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, route.termId]);

  const conceptCount = Object.keys(exerciseSets).length;

  return (
    <div className={`app${term ? ' drawer-open' : ''}`}>
      <main className="stage">
        <div className="brand">
          <span className="logo" aria-hidden>
            λ
          </span>
          <div>
            <h1>
              {meta.title} <span className="badge">{graph.nodes.length} TERMS</span>
            </h1>
            <p>
              {graph.nodes.length} concepts &middot; {graph.links.length} relationships
              {overall.total > 0 && (
                <>
                  {' '}
                  &middot; {overall.done}/{overall.total} rungs
                </>
              )}
            </p>
          </div>
        </div>

        <div className="toolbar">
          <button type="button" className="ghost-btn" onClick={() => setSearchOpen(true)} title="Search">
            <Search size={14} aria-hidden />
            <kbd>/</kbd>
          </button>
          <button
            type="button"
            className={practiceFilter ? 'ghost-btn on' : 'ghost-btn'}
            onClick={() => setPracticeFilter((p) => !p)}
            title={`Highlight the ${conceptCount} concepts with exercises`}
            aria-pressed={practiceFilter}
          >
            <Target size={14} aria-hidden />
            Practice
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setView((v) => (v === 'graph' ? 'list' : 'graph'))}
            title={view === 'graph' ? 'Switch to the list' : 'Switch to the graph'}
          >
            {view === 'graph' ? <List size={14} aria-hidden /> : <Network size={14} aria-hidden />}
          </button>
          <ProgressMenu />
          <button type="button" className="ghost-btn" onClick={toggleTheme} title="Switch theme">
            {theme === 'dark' ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <a
            className="ghost-btn"
            href={meta.sourceRepo}
            target="_blank"
            rel="noopener noreferrer"
            title="The upstream repository"
          >
            <Github size={14} aria-hidden />
          </a>
        </div>

        {view === 'graph' ? (
          <GraphCanvas
            selectedId={route.termId}
            onSelect={select}
            searchQuery={searchOpen ? query : ''}
            progressByTerm={progressByTerm}
            practiceFilter={practiceFilter}
            theme={theme}
          />
        ) : (
          <TermList
            selectedId={route.termId}
            onSelect={select}
            progressByTerm={progressByTerm}
            practiceFilter={practiceFilter}
          />
        )}
      </main>

      {term && (
        <Drawer
          term={term}
          route={route}
          onClose={() => navigate({ termId: null, tab: 'learn', rungId: null })}
          onSelectTerm={select}
          onConceptComplete={() => celebrate(categoriesById.get(term.category)?.color)}
        />
      )}

      <SearchHUD
        open={searchOpen}
        query={query}
        onQuery={setQuery}
        onClose={() => {
          setSearchOpen(false);
          setQuery('');
        }}
        onSelect={(id) => {
          setSearchOpen(false);
          setQuery('');
          select(id);
        }}
      />
    </div>
  );
}
