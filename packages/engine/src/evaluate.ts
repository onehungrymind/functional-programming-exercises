import { createHarness } from './harness.js';
import type { CodeRung, RunResult } from './types.js';

const MAX_LOG_LINES = 20;

/**
 * Evaluates learner code and runs a rung's checks against it.
 *
 * Environment-free on purpose: the worker calls this, and so does `npm run verify` in Node,
 * so the thing CI grades is the thing the browser grades.
 *
 * It does NOT enforce a time limit. A `while (true)` in learner code blocks whatever
 * thread this runs on, which is exactly why the browser runs it inside a worker that the
 * main thread can terminate. See `runner.ts`.
 */
export function evaluateRung(rung: CodeRung, code: string, seq = 0): RunResult {
  const logs: string[] = [];
  const { api, state } = createHarness(code);

  const fakeConsole = {
    log: (...args: unknown[]) => {
      if (logs.length < MAX_LOG_LINES) logs.push(args.map((a) => api.fmt(a)).join(' '));
      else if (logs.length === MAX_LOG_LINES) logs.push('... more output suppressed');
    },
  } as unknown as Console;
  fakeConsole.info = fakeConsole.warn = fakeConsole.error = fakeConsole.debug = fakeConsole.log;

  const realRandom = Math.random;
  const realNow = Date.now;
  const realPerfNow = typeof performance !== 'undefined' ? performance.now.bind(performance) : null;

  let exports: Record<string, unknown>;

  try {
    // Strict mode, so writing to a frozen argument throws instead of failing silently.
    const body =
      '"use strict";\n' +
      code +
      '\n;return {' +
      rung.exports.map((n) => `${JSON.stringify(n)}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') +
      '};';

    let factory: (console: Console) => Record<string, unknown>;
    try {
      factory = new Function('console', body) as typeof factory;
    } catch (e) {
      // A syntax error is the learner mid-keystroke, not a graded failure.
      const err = e as Error;
      return { seq, results: [], logs, fatal: `${err.name || 'SyntaxError'}: ${err.message}` };
    }

    // Spies go up before the learner's top level runs, so an effect at module scope is caught too.
    Math.random = () => {
      state.effects.push('Math.random()');
      return realRandom();
    };
    Date.now = () => {
      state.effects.push('Date.now()');
      return realNow();
    };
    if (realPerfNow) {
      performance.now = () => {
        state.effects.push('performance.now()');
        return realPerfNow();
      };
    }

    try {
      exports = factory(fakeConsole);
    } catch (e) {
      const err = e as Error;
      return { seq, results: [], logs, fatal: `${err.name || 'Error'}: ${err.message}` };
    }

    const missing = rung.exports.filter((n) => exports[n] === undefined);
    if (missing.length) {
      const names = missing.map((n) => `\`${n}\``).join(' and ');
      return {
        seq,
        results: [],
        logs,
        fatal: `Define ${names} so ${missing.length === 1 ? 'it' : 'they'} can be checked.`,
      };
    }

    // Effects from defining things are not the learner's fault. Only what the checks trigger counts.
    state.effects.length = 0;

    try {
      rung.checks(api, exports);
    } catch (e) {
      const err = e as Error;
      return {
        seq,
        results: state.results,
        logs,
        fatal: `The checks could not finish. ${err.name || 'Error'}: ${err.message}`,
      };
    }
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
    if (realPerfNow) performance.now = realPerfNow;
  }

  // Note on `inverted`: a 'break' rung's checks already phrase the inversion themselves
  // ("the law checker finds a counterexample" passes when a law fails). Flipping results here
  // too would invert twice, and would turn every readable failure message into a bare negation.
  // The flag is for the UI, which frames the rung as "you pass when it breaks".
  return { seq, results: state.results, logs };
}

/** True when every check passed and nothing was fatal. Used by the runner and by verify. */
export function didPass(result: RunResult): boolean {
  return !result.fatal && result.results.length > 0 && result.results.every((r) => r.ok);
}
