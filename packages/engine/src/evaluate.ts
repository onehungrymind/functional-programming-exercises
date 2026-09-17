import { createHarness } from './harness.js';
import { stripTypes, usesAny } from './typescript.js';
import { eq, fmt } from './harness.js';
import type { CodeRung, ExprRung, RunResult } from './types.js';

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
export function evaluateRung(rung: CodeRung, source: string, seq = 0): RunResult {
  // A typed rung runs its erased form. The harness still sees the original, so a check can
  // ask about the annotations the learner actually wrote.
  let code = source;
  if (rung.lang === 'ts') {
    const stripped = stripTypes(source);
    if ('error' in stripped) {
      return { seq, results: [], logs: [], fatal: `SyntaxError: ${stripped.error}` };
    }
    code = stripped.code;
  }

  const { api, state } = createHarness(source);
  // Shared with the harness, so a check can assert on what the learner printed.
  const logs = state.logs;

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

/**
 * Evaluates a one-line expression and compares it to what the rung expects.
 *
 * Runs in the same sandbox as a code rung, because an expression can loop forever just as
 * easily as a statement can.
 */
export function evaluateExpr(rung: ExprRung, source: string, seq = 0): RunResult {
  const expression = source.trim();
  if (!expression) {
    return { seq, results: [], logs: [], fatal: 'Type an expression to have it checked.' };
  }

  const logs: string[] = [];
  const fakeConsole = {
    log: (...args: unknown[]) => {
      if (logs.length < MAX_LOG_LINES) logs.push(args.map((a) => fmt(a)).join(' '));
    },
  } as unknown as Console;
  fakeConsole.info = fakeConsole.warn = fakeConsole.error = fakeConsole.debug = fakeConsole.log;

  // A typed rung's context is a real signature, so it has to be erased before it can run.
  let context = rung.context ?? '';
  if (rung.lang === 'ts' && context) {
    const stripped = stripTypes(context);
    if ('error' in stripped) {
      return { seq, results: [], logs: [], fatal: `SyntaxError in the given code: ${stripped.error}` };
    }
    context = stripped.code;
  }

  let value: unknown;
  try {
    const body = `"use strict";\n${context}\n;return (${expression});`;
    let factory: (console: Console) => unknown;
    try {
      factory = new Function('console', body) as typeof factory;
    } catch (e) {
      const err = e as Error;
      return { seq, results: [], logs, fatal: `${err.name || 'SyntaxError'}: ${err.message}` };
    }
    value = factory(fakeConsole);
  } catch (e) {
    const err = e as Error;
    return { seq, results: [], logs, fatal: `${err.name || 'Error'}: ${err.message}` };
  }

  const ok = eq(value, rung.expect);

  // Deliberately not printing `expect` on a miss. Handing the answer over on the first wrong
  // attempt turns a recall question into a giveaway: type anything, read the answer, type it
  // back, clear the rung having learned nothing. The hints and the notes do the teaching.
  // What is safe to say is the shape, which is usually where the mistake is.
  let detail: string | undefined;
  if (!ok) {
    detail = `It came to ${fmt(value)}, which is not it.`;
    const got = Array.isArray(value);
    const want = Array.isArray(rung.expect);
    if (want && got && (value as unknown[]).length !== (rung.expect as unknown[]).length) {
      detail += ` The answer has ${(rung.expect as unknown[]).length} entries and you gave ${(value as unknown[]).length}.`;
    } else if (want !== got) {
      detail += want ? ' The answer is an array.' : ` The answer is not an array.`;
    } else if (!want && typeof value !== typeof rung.expect) {
      detail += ` The answer is a ${typeof rung.expect}.`;
    }
  }

  return {
    seq,
    logs,
    results: [{ name: 'The expression evaluates to the right value', ok, detail }],
  };
}
