import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Lightbulb, Play, RotateCcw, Sparkles } from 'lucide-react';
// Imported by path rather than from the barrel: the barrel re-exports the shape rules and
// the evaluator, which would drag acorn into the main bundle for no reason.
import { CheckRunner } from '@fpx/engine/runner';
import type { CodeRung, ExerciseSet, ExprRung, RunResult, Rung } from '@fpx/engine/types';
import type { EditorHandle } from '@fpx/editor';
import { Results } from './Results.js';

/** The learner pauses, then the checks run. Long enough not to fight typing. */
const DEBOUNCE_MS = 550;

const ROLE_LABEL: Record<Rung['role'], string> = {
  recognize: 'Recognize',
  guided: 'Guided',
  implement: 'Implement',
  break: 'Break it',
  apply: 'Apply',
  articulate: 'Articulate',
};

export interface PracticeProgress {
  isDone(termId: string, rungId: string): boolean;
  markDone(termId: string, rungId: string): void;
  getDraft(termId: string, rungId: string): string | undefined;
  setDraft(termId: string, rungId: string, code: string): void;
  clearDraft(termId: string, rungId: string): void;
  getChoice(termId: string, rungId: string): number[] | undefined;
  setChoice(termId: string, rungId: string, picked: number[]): void;
}

export interface PracticePanelProps {
  termId: string;
  exerciseSet: ExerciseSet;
  progress: PracticeProgress;
  /** The rung to open. Undefined means the first one not yet done. */
  rungId?: string | null;
  onNavigate: (next: { rungId?: string | null; termId?: string }) => void;
  /** Offered in the cleared banner once every rung is done. */
  nextConcept?: { id: string; title: string } | null;
  /** The host builds the worker, because bundling it is the host's concern. */
  createWorker: () => Worker;
  /** Prompts arrive as markdown and the host owns the renderer. */
  renderMarkdown: (md: string) => string;
  onCompleteConcept?: () => void;
}

export function PracticePanel({
  termId,
  exerciseSet,
  progress,
  rungId,
  onNavigate,
  nextConcept,
  createWorker,
  renderMarkdown,
  onCompleteConcept,
}: PracticePanelProps) {
  const rungs = exerciseSet.rungs;

  const firstUndone = useMemo(() => {
    const i = rungs.findIndex((r) => !progress.isDone(termId, r.id));
    return i === -1 ? 0 : i;
  }, [rungs, termId, progress]);

  const activeIndex = useMemo(() => {
    if (!rungId) return firstUndone;
    const i = rungs.findIndex((r) => r.id === rungId);
    return i === -1 ? firstUndone : i;
  }, [rungId, rungs, firstUndone]);

  const rung = rungs[activeIndex]!;
  const doneCount = rungs.filter((r) => progress.isDone(termId, r.id)).length;
  const allDone = doneCount === rungs.length;

  return (
    <div className="practice">
      <ol className="stepper" aria-label="Exercise steps">
        {rungs.map((r, i) => {
          const done = progress.isDone(termId, r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                className={`step${i === activeIndex ? ' active' : ''}${done ? ' done' : ''}`}
                onClick={() => onNavigate({ rungId: r.id })}
                aria-current={i === activeIndex ? 'step' : undefined}
              >
                <span className="step-mark" aria-hidden>
                  {done ? <Check size={11} /> : <Circle size={9} />}
                </span>
                <span className="step-num">{i + 1}</span>
                <span className="step-title">{r.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rung-head">
        <span className="role-label">{ROLE_LABEL[rung.role]}</span>
        <h3>{rung.title}</h3>
        <div className="prompt" dangerouslySetInnerHTML={{ __html: renderMarkdown(rung.prompt) }} />
      </div>

      {rung.kind === 'choice' && (
        <ChoiceRungView key={`${termId}/${rung.id}`} termId={termId} rung={rung} progress={progress} />
      )}
      {rung.kind === 'code' && (
        <CodeRungView
          key={`${termId}/${rung.id}`}
          termId={termId}
          rung={rung}
          progress={progress}
          createWorker={createWorker}
        />
      )}
      {rung.kind === 'expr' && (
        <ExprRungView
          key={`${termId}/${rung.id}`}
          termId={termId}
          rung={rung}
          progress={progress}
          createWorker={createWorker}
        />
      )}
      {rung.kind === 'reveal' && (
        <RevealRungView key={`${termId}/${rung.id}`} termId={termId} rung={rung} progress={progress} />
      )}

      {progress.isDone(termId, rung.id) && (
        <ClearedBanner
          allDone={allDone}
          hasNextRung={activeIndex < rungs.length - 1}
          nextConcept={nextConcept ?? null}
          onNextRung={() => onNavigate({ rungId: rungs[activeIndex + 1]?.id })}
          onNextConcept={() => nextConcept && onNavigate({ termId: nextConcept.id, rungId: null })}
          onComplete={onCompleteConcept}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- choice

function ChoiceRungView({
  termId,
  rung,
  progress,
}: {
  termId: string;
  rung: Extract<Rung, { kind: 'choice' }>;
  progress: PracticeProgress;
}) {
  const [picked, setPicked] = useState<number[]>(() => progress.getChoice(termId, rung.id) ?? []);
  const [checked, setChecked] = useState(() => progress.isDone(termId, rung.id));

  const toggle = (i: number) => {
    if (checked) return;
    setPicked((prev) => (rung.multi ? (prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i]) : [i]));
  };

  const submit = () => {
    setChecked(true);
    progress.setChoice(termId, rung.id, picked);
    const correct = rung.options
      .map((o, i) => (o.correct ? i : -1))
      .filter((i) => i >= 0)
      .sort();
    const chosen = [...picked].sort();
    if (correct.length === chosen.length && correct.every((c, i) => c === chosen[i])) {
      progress.markDone(termId, rung.id);
    }
  };

  const correctSoFar =
    checked &&
    rung.options.every((o, i) => o.correct === picked.includes(i));

  return (
    <div className="choice">
      <ul className="options" role={rung.multi ? 'group' : 'radiogroup'}>
        {rung.options.map((o, i) => {
          const on = picked.includes(i);
          const verdict = checked ? (o.correct ? 'right' : on ? 'wrong' : '') : '';
          return (
            <li key={i}>
              <button
                type="button"
                className={`option${on ? ' picked' : ''}${verdict ? ` ${verdict}` : ''}`}
                onClick={() => toggle(i)}
                aria-pressed={on}
                disabled={checked}
              >
                <span className="option-mark" aria-hidden>
                  {rung.multi ? (on ? <Check size={11} /> : <Circle size={9} />) : <Circle size={9} />}
                </span>
                <pre className="option-code">{o.code}</pre>
              </button>
              {checked && <p className={`why ${o.correct ? 'right' : 'wrong'}`}>{o.why}</p>}
            </li>
          );
        })}
      </ul>

      <div className="status-row">
        {!checked ? (
          <button type="button" className="primary" onClick={submit} disabled={picked.length === 0}>
            Check answer
          </button>
        ) : (
          <>
            <span className={correctSoFar ? 'tally ok' : 'tally'}>
              {correctSoFar ? 'Correct' : 'Not quite. The reasons are above.'}
            </span>
            {!correctSoFar && (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setChecked(false);
                  setPicked([]);
                }}
              >
                <RotateCcw size={12} aria-hidden /> Try again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- code

function CodeRungView({
  termId,
  rung,
  progress,
  createWorker,
}: {
  termId: string;
  rung: CodeRung;
  progress: PracticeProgress;
  createWorker: () => Worker;
}) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorHandle | null>(null);
  const runner = useRef<CheckRunner | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestSeq = useRef(0);

  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const initial = progress.getDraft(termId, rung.id) ?? rung.starter;

  const run = useCallback(
    async (code: string) => {
      if (!runner.current) return;
      setRunning(true);
      const mySeq = runner.current.currentSeq + 1;
      latestSeq.current = mySeq;
      const out = await runner.current.run({
        termId,
        rungId: rung.id,
        code,
        timeoutMs: rung.timeoutMs,
      });
      // A run the learner has already typed past is not worth showing.
      if (out.seq !== latestSeq.current) return;
      setRunning(false);
      setResult(out);
      if (!out.fatal && out.results.length > 0 && out.results.every((r) => r.ok)) {
        progress.markDone(termId, rung.id);
      }
    },
    [termId, rung.id, rung.timeoutMs, progress],
  );

  useEffect(() => {
    let cancelled = false;
    runner.current = new CheckRunner({ createWorker, prewarm: true });
    runner.current.warmUp();

    // CodeMirror is the single biggest thing this app loads, and the Learn tab never needs
    // it. Importing it here keeps it out of the initial bundle and off the critical path.
    void import('@fpx/editor').then(({ createEditor }) => {
      if (cancelled || !host.current) return;
      editor.current = createEditor({
        parent: host.current,
        doc: initial,
        scope: rung.exports,
        ariaLabel: rung.title,
        lang: rung.lang ?? 'js',
        onRun: () => {
          clearTimeout(debounce.current);
          void run(editor.current!.getDoc());
        },
        onChange: (doc) => {
          progress.setDraft(termId, rung.id, doc);
          clearTimeout(debounce.current);
          debounce.current = setTimeout(() => void run(doc), DEBOUNCE_MS);
        },
      });
      setEditorReady(true);
    });

    // Grade whatever is already there, so returning to a finished rung shows green
    // without waiting for the editor to arrive.
    void run(initial);

    return () => {
      cancelled = true;
      clearTimeout(debounce.current);
      editor.current?.destroy();
      runner.current?.dispose();
      editor.current = null;
      runner.current = null;
    };
    // Remounting per rung is handled by the `key` on this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    progress.clearDraft(termId, rung.id);
    editor.current?.setDoc(rung.starter);
    setResult(null);
    void run(rung.starter);
  };

  return (
    <div className="code-rung">
      <div className="editor-host" ref={host}>
        {!editorReady && <pre className="editor-skeleton">{initial}</pre>}
      </div>

      <div className="status-row">
        <button
          type="button"
          className="primary"
          onClick={() => {
            clearTimeout(debounce.current);
            void run(editor.current?.getDoc() ?? '');
          }}
        >
          <Play size={12} aria-hidden /> Run checks
          <kbd>{navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter</kbd>
        </button>
        <button type="button" className="ghost-btn" onClick={reset}>
          <RotateCcw size={12} aria-hidden /> Reset code
        </button>
        {rung.hints && hintsShown < rung.hints.length ? (
          <button type="button" className="ghost-btn" onClick={() => setHintsShown((n) => n + 1)}>
            <Lightbulb size={12} aria-hidden /> {hintsShown === 0 ? 'Show a hint' : 'Another hint'}
          </button>
        ) : (
          <button type="button" className="ghost-btn" onClick={() => setShowSolution((s) => !s)}>
            {showSolution ? 'Hide the solution' : 'Show a solution'}
          </button>
        )}
      </div>

      {hintsShown > 0 && rung.hints && (
        <ul className="hints">
          {rung.hints.slice(0, hintsShown).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}

      <Results result={result} running={running} />

      {showSolution && (
        <div className="solution">
          <p className="sect">ONE WAY TO WRITE IT</p>
          <pre>{rung.solution}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- expr

/**
 * A one-line fill-in. Graded in the worker like a code rung, because an expression can hang
 * just as easily, and because the learner should see the same failure vocabulary either way.
 */
function ExprRungView({
  termId,
  rung,
  progress,
  createWorker,
}: {
  termId: string;
  rung: ExprRung;
  progress: PracticeProgress;
  createWorker: () => Worker;
}) {
  const runner = useRef<CheckRunner | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestSeq = useRef(0);
  const [value, setValue] = useState(() => progress.getDraft(termId, rung.id) ?? '');
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const run = useCallback(
    async (source: string) => {
      if (!runner.current || !source.trim()) {
        setResult(null);
        return;
      }
      setRunning(true);
      const mySeq = runner.current.currentSeq + 1;
      latestSeq.current = mySeq;
      const out = await runner.current.run({ termId, rungId: rung.id, code: source });
      if (out.seq !== latestSeq.current) return;
      setRunning(false);
      setResult(out);
      if (!out.fatal && out.results.length > 0 && out.results.every((r) => r.ok)) {
        progress.markDone(termId, rung.id);
      }
    },
    [termId, rung.id, progress],
  );

  useEffect(() => {
    runner.current = new CheckRunner({ createWorker, prewarm: true });
    runner.current.warmUp();
    if (value.trim()) void run(value);
    return () => {
      clearTimeout(debounce.current);
      runner.current?.dispose();
      runner.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (next: string) => {
    setValue(next);
    progress.setDraft(termId, rung.id, next);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void run(next), DEBOUNCE_MS);
  };

  return (
    <div className="expr-rung">
      {rung.context && <pre className="expr-context">{rung.context.trim()}</pre>}

      <div className="expr-input">
        <label htmlFor={`expr-${rung.id}`} className="sr-only">
          {rung.title}
        </label>
        <input
          id={`expr-${rung.id}`}
          value={value}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          placeholder={rung.placeholder ?? 'your answer'}
          aria-describedby="practice-results"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              clearTimeout(debounce.current);
              void run(value);
            }
          }}
        />
      </div>

      <div className="status-row">
        <button
          type="button"
          className="primary"
          onClick={() => {
            clearTimeout(debounce.current);
            void run(value);
          }}
        >
          <Play size={12} aria-hidden /> Check
          <kbd>Enter</kbd>
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            setValue('');
            progress.clearDraft(termId, rung.id);
            setResult(null);
          }}
        >
          <RotateCcw size={12} aria-hidden /> Clear
        </button>
        {rung.hints && hintsShown < rung.hints.length ? (
          <button type="button" className="ghost-btn" onClick={() => setHintsShown((n) => n + 1)}>
            <Lightbulb size={12} aria-hidden /> {hintsShown === 0 ? 'Show a hint' : 'Another hint'}
          </button>
        ) : (
          <button type="button" className="ghost-btn" onClick={() => setShowSolution((v) => !v)}>
            {showSolution ? 'Hide the answer' : 'Show the answer'}
          </button>
        )}
      </div>

      {hintsShown > 0 && rung.hints && (
        <ul className="hints">
          {rung.hints.slice(0, hintsShown).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}

      <Results result={result} running={running} />

      {showSolution && (
        <div className="solution">
          <p className="sect">ONE WAY TO WRITE IT</p>
          <pre>{rung.solution}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- reveal

function RevealRungView({
  termId,
  rung,
  progress,
}: {
  termId: string;
  rung: Extract<Rung, { kind: 'reveal' }>;
  progress: PracticeProgress;
}) {
  const [shown, setShown] = useState(false);
  const [text, setText] = useState(() => progress.getDraft(termId, rung.id) ?? '');

  return (
    <div className="reveal">
      <textarea
        value={text}
        aria-label={rung.title}
        rows={5}
        onChange={(e) => {
          setText(e.target.value);
          progress.setDraft(termId, rung.id, e.target.value);
        }}
      />
      <div className="status-row">
        <button type="button" className="primary" onClick={() => setShown(true)} disabled={!text.trim()}>
          Compare with the reference
        </button>
      </div>
      {shown && (
        <div className="solution">
          <p className="sect">REFERENCE</p>
          <p>{rung.reference}</p>
          <div className="status-row">
            <button type="button" className="ghost-btn" onClick={() => progress.markDone(termId, rung.id)}>
              Mine says the same thing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- cleared

function ClearedBanner({
  allDone,
  hasNextRung,
  nextConcept,
  onNextRung,
  onNextConcept,
  onComplete,
}: {
  allDone: boolean;
  hasNextRung: boolean;
  nextConcept: { id: string; title: string } | null;
  onNextRung: () => void;
  onNextConcept: () => void;
  onComplete?: () => void;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (allDone && !fired.current) {
      fired.current = true;
      onComplete?.();
    }
  }, [allDone, onComplete]);

  return (
    <div className={`cleared${allDone ? ' concept-done' : ''}`}>
      <span className="cleared-mark" aria-hidden>
        {allDone ? <Sparkles size={13} /> : <Check size={13} />}
      </span>
      <span>{allDone ? 'Concept cleared.' : 'Cleared.'}</span>
      {hasNextRung && (
        <button type="button" className="ghost-btn" onClick={onNextRung}>
          Next rung
        </button>
      )}
      {allDone && nextConcept && (
        <button type="button" className="ghost-btn" onClick={onNextConcept}>
          Next: {nextConcept.title}
        </button>
      )}
    </div>
  );
}
