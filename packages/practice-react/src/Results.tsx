import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import type { RunResult } from '@fpx/engine/types';

/**
 * Passing checks collapse to one line. The first failure is expanded, because that is the
 * one worth reading, and the rest stay closed so a wall of red does not bury it.
 */
export function Results({ result, running }: { result: RunResult | null; running: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!result) {
    return (
      <div className="results" id="practice-results" aria-live="polite">
        <p className="results-idle">
          {running ? 'Running checks...' : 'Checks run as you type, or press Cmd+Enter.'}
        </p>
      </div>
    );
  }

  if (result.fatal) {
    return (
      <div className="results" id="practice-results" aria-live="polite">
        <div className="fatal">
          <AlertTriangle size={13} aria-hidden />
          <span>{result.fatal}</span>
        </div>
        {result.logs.length > 0 && <Logs logs={result.logs} />}
      </div>
    );
  }

  const passed = result.results.filter((r) => r.ok).length;
  const total = result.results.length;
  const firstFailure = result.results.findIndex((r) => !r.ok);

  return (
    <div className="results" id="practice-results">
      {/* Only the count is announced. Reading out every line would be unusable. */}
      <p className="sr-only" aria-live="polite">
        {passed} of {total} checks passing
      </p>

      <div className="results-head" aria-hidden>
        <span className={passed === total ? 'tally ok' : 'tally'}>
          {passed} / {total} passing
        </span>
        {result.elapsedMs !== undefined && <span className="elapsed">{result.elapsedMs}ms</span>}
      </div>

      <ul className="check-list">
        {result.results.map((r, i) => {
          const expanded = r.ok ? openIndex === i : openIndex === null ? i === firstFailure : openIndex === i;
          return (
            <li key={`${r.name}-${i}`} className={r.ok ? 'check pass' : 'check fail'}>
              <button
                type="button"
                className="check-row"
                onClick={() => setOpenIndex(expanded ? -1 : i)}
                aria-expanded={expanded}
              >
                <span className="check-icon" aria-hidden>
                  {r.ok ? <Check size={12} /> : <X size={12} />}
                </span>
                <span className="check-name">{r.name}</span>
                {r.ok && r.detail && <span className="check-runs">{r.detail}</span>}
                {r.detail && !r.ok && (
                  <span className="check-chevron" aria-hidden>
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                )}
              </button>
              {expanded && r.detail && !r.ok && <pre className="check-detail">{r.detail}</pre>}
            </li>
          );
        })}
      </ul>

      {result.logs.length > 0 && <Logs logs={result.logs} />}
    </div>
  );
}

function Logs({ logs }: { logs: string[] }) {
  return (
    <details className="logs">
      <summary>console output ({logs.length})</summary>
      <pre>{logs.join('\n')}</pre>
    </details>
  );
}
