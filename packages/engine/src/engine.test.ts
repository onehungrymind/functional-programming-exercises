import { describe, expect, it, vi } from 'vitest';
import { createShapeRules } from './shape.js';
import { didPass, evaluateRung } from './evaluate.js';
import { createHarness, eq, fmt } from './harness.js';
import { CheckRunner } from './runner.js';
import type { CodeRung, RunResult } from './types.js';

/** A minimal code rung, so each test only spells out the part it is about. */
const rung = (over: Partial<CodeRung>): CodeRung => ({
  id: 'r',
  kind: 'code',
  role: 'implement',
  title: 't',
  prompt: 'p',
  starter: '',
  solution: '',
  broken: [],
  exports: ['f'],
  checks: (T, exp) => T.check('f(1) is 2', () => (exp.f as any)(1) === 2 || 'no'),
  ...over,
});

describe('evaluateRung', () => {
  it('passes when the code is right', () => {
    const r = evaluateRung(rung({}), 'const f = (x) => x + 1');
    expect(didPass(r)).toBe(true);
    expect(r.results[0]).toMatchObject({ name: 'f(1) is 2', ok: true });
  });

  it('reports a syntax error as fatal without grading anything', () => {
    const r = evaluateRung(rung({}), 'const f = (x) => {');
    expect(r.fatal).toMatch(/SyntaxError/);
    expect(r.results).toHaveLength(0);
    expect(didPass(r)).toBe(false);
  });

  it('names a missing export instead of blaming the checks', () => {
    const r = evaluateRung(rung({ exports: ['curry2'] }), 'const other = 1');
    expect(r.fatal).toBe('Define `curry2` so it can be checked.');
  });

  it('names every missing export when more than one is absent', () => {
    const r = evaluateRung(rung({ exports: ['a', 'b'] }), 'const c = 1');
    expect(r.fatal).toBe('Define `a` and `b` so they can be checked.');
  });

  it('throws on a write to a frozen input, because the body runs in strict mode', () => {
    const r = evaluateRung(
      rung({
        exports: ['mutate'],
        checks: (T, exp) => {
          const frozen = T.freeze({ items: [1] });
          T.check('leaves the input alone', () => {
            (exp.mutate as any)(frozen);
            return true;
          });
        },
      }),
      'const mutate = (o) => { o.items = []; return o }',
    );
    expect(r.results[0]!.ok).toBe(false);
    // Phrased for the learner, not passed through from the engine.
    expect(r.results[0]!.detail).toMatch(/changed a value you were handed/);
    expect(r.results[0]!.detail).not.toMatch(/TypeError/);
  });

  it('spies on the clock and the random number generator', () => {
    const r = evaluateRung(
      rung({
        exports: ['impure'],
        checks: (T, exp) => {
          T.effects.length = 0;
          (exp.impure as any)();
          T.check('no effects', () => T.effects.length === 0 || `Called ${T.effects.join(', ')}`);
        },
      }),
      'const impure = () => Date.now() + Math.random()',
    );
    expect(r.results[0]!.ok).toBe(false);
    expect(r.results[0]!.detail).toContain('Date.now()');
    expect(r.results[0]!.detail).toContain('Math.random()');
  });

  it('restores the real clock afterwards', () => {
    const before = Date.now;
    evaluateRung(rung({ exports: ['f'] }), 'const f = (x) => x + 1');
    expect(Date.now).toBe(before);
  });

  it('captures console output instead of letting it escape', () => {
    const r = evaluateRung(rung({}), 'console.log("hello", 42)\nconst f = (x) => x + 1');
    expect(r.logs).toEqual(['"hello" 42']);
  });

  it('caps captured output at 20 lines', () => {
    const r = evaluateRung(rung({}), 'for (let i = 0; i < 50; i++) console.log(i)\nconst f = (x) => x + 1');
    expect(r.logs).toHaveLength(21);
    expect(r.logs[20]).toBe('... more output suppressed');
  });

  it('explains runaway recursion in the concept\'s terms', () => {
    const r = evaluateRung(
      rung({ exports: ['f'], checks: (T, exp) => T.check('terminates', () => (exp.f as any)(1)) }),
      'const f = (x) => f(x) + 1',
    );
    expect(r.results[0]!.detail).toMatch(/base case/);
  });

  it('does not flip results for an inverted rung, since its checks already do', () => {
    const r = evaluateRung(
      rung({ inverted: true, exports: ['f'], checks: (T) => T.check('caught it', () => true) }),
      'const f = 1',
    );
    expect(r.results[0]!.ok).toBe(true);
  });
});

describe('law counterexamples', () => {
  it('names the smallest failing case with readable function labels', () => {
    const { api, state } = createHarness('');
    api.law('Composition holds', 50, (G) => {
      const n = G.int();
      const f = G.fn();
      return n === 0 ? true : `n = ${n}, f = ${f.name}: mismatch`;
    });
    expect(state.results[0]!.ok).toBe(false);
    // The label, not "[Function]".
    expect(state.results[0]!.detail).toMatch(/f = x => /);
  });

  it('reports the number of cases tried when a law passes', () => {
    const { api, state } = createHarness('');
    api.law('Always true', 25, () => true);
    expect(state.results[0]).toMatchObject({ ok: true, detail: '25 random cases', runs: 25 });
  });

  it('is deterministic, so the same failure reproduces', () => {
    const run = () => {
      const { api, state } = createHarness('');
      api.law('L', 50, (G) => `n = ${G.int()}`);
      return state.results[0]!.detail;
    };
    expect(run()).toBe(run());
  });
});

describe('eq and fmt', () => {
  it('compares containers by contents, ignoring their methods', () => {
    const Box = (v: unknown) => ({ value: v, map: (f: any) => Box(f(v)) });
    expect(eq(Box(3), Box(3))).toBe(true);
    expect(eq(Box(3), Box(4))).toBe(false);
  });

  it('treats NaN as equal to itself', () => {
    expect(eq(NaN, NaN)).toBe(true);
  });

  it('uses inspect() when a value has one', () => {
    expect(fmt({ value: 3, inspect: () => 'Box(3)' })).toBe('Box(3)');
  });

  it('renders a function by name rather than as [object]', () => {
    expect(fmt(function double() {})).toBe('[fn double]');
  });
});

describe('shape rules', () => {
  it('rejects a definition that still names its argument', () => {
    const s = createShapeRules('const inc = (xs) => map(add(1))(xs)');
    expect(s.isPointFree('inc')).toMatch(/still names its argument \(xs\)/);
  });

  it('accepts a genuinely point-free definition', () => {
    expect(createShapeRules('const inc = map(add(1))').isPointFree('inc')).toBe(true);
  });

  it('counts the arity of each curried step', () => {
    expect(createShapeRules('const c = (f) => (a) => (b) => f(a, b)').isCurried('c', 3)).toBe(true);
    expect(createShapeRules('const c = (f) => (a, b) => f(a, b)').isCurried('c', 3)).toMatch(/Step 2 .* takes 2/);
  });

  it('catches a mutating method call on a parameter', () => {
    expect(createShapeRules('const f = (xs) => { xs.push(1); return xs }').noMutation('f')).toMatch(/xs\.push\(\)/);
  });

  it('catches an assignment into a parameter', () => {
    expect(createShapeRules('const f = (o) => { o.a = 1; return o }').noMutation('f')).toMatch(/assigns to `o`/);
  });

  it('allows mutating a local that was never passed in', () => {
    expect(createShapeRules('const f = (xs) => { const out = []; out.push(1); return out }').noMutation('f')).toBe(true);
  });

  it('finds loops where recursion was asked for', () => {
    expect(createShapeRules('const f = (n) => { for (;;) {} }').noLoops('f')).toMatch(/uses a `for` loop/);
    expect(createShapeRules('const f = (n) => n <= 0 ? 0 : n + f(n - 1)').noLoops('f')).toBe(true);
  });

  it('explains itself when the code will not parse', () => {
    expect(createShapeRules('const f = (').isPointFree('f')).toMatch(/Could not read your code/);
  });

  it('says so when the binding is not there at all', () => {
    expect(createShapeRules('const g = 1').isPointFree('f')).toMatch(/Could not find a top-level definition of `f`/);
  });
});

// ---------------------------------------------------------------- runner

/** A fake worker whose reply behavior each test controls. */
class FakeWorker implements Partial<Worker> {
  static live = 0;
  terminated = false;
  onmessage: ((e: MessageEvent<RunResult>) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  #reply: (req: any, send: (r: RunResult) => void) => void;

  constructor(reply: (req: any, send: (r: RunResult) => void) => void) {
    this.#reply = reply;
    FakeWorker.live++;
  }
  postMessage(req: any) {
    this.#reply(req, (r) => {
      if (!this.terminated) this.onmessage?.({ data: r } as MessageEvent<RunResult>);
    });
  }
  terminate() {
    this.terminated = true;
    FakeWorker.live--;
  }
}

const ok = (seq: number): RunResult => ({ seq, results: [{ name: 'c', ok: true }], logs: [] });

describe('CheckRunner', () => {
  it('resolves with the worker result', async () => {
    const runner = new CheckRunner({
      createWorker: () => new FakeWorker((req, send) => queueMicrotask(() => send(ok(req.seq)))) as any,
    });
    const r = await runner.run({ termId: 't', rungId: 'r', code: 'x' });
    expect(r.results[0]!.ok).toBe(true);
    expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
    runner.dispose();
  });

  it('drops a stale reply that arrives after a newer run', async () => {
    const pending: Array<() => void> = [];
    const runner = new CheckRunner({
      createWorker: () =>
        new FakeWorker((req, send) => pending.push(() => send({ ...ok(req.seq), logs: [`seq${req.seq}`] }))) as any,
    });

    const first = runner.run({ termId: 't', rungId: 'r', code: 'a' });
    const second = runner.run({ termId: 't', rungId: 'r', code: 'b' });

    // The first worker answers late. The runner must not let it settle the second run.
    pending[0]!();
    pending[1]!();

    expect((await second).logs).toEqual(['seq2']);
    // The superseded run still resolves, so nothing awaits forever.
    expect((await first).seq).toBe(1);
    runner.dispose();
  });

  it('kills the worker on a timeout and explains what a hang means', async () => {
    vi.useFakeTimers();
    let created: FakeWorker | null = null;
    const runner = new CheckRunner({
      createWorker: () => {
        created = new FakeWorker(() => {
          /* never replies, like a while(true) */
        });
        return created as any;
      },
      defaultTimeoutMs: 1500,
    });

    const p = runner.run({ termId: 't', rungId: 'r', code: 'while(true){}' });
    await vi.advanceTimersByTimeAsync(1600);
    const r = await p;

    expect(r.fatal).toMatch(/did not finish in 1500ms/);
    expect(r.fatal).toMatch(/loop or a recursion with no way out/);
    expect(created!.terminated).toBe(true);
    vi.useRealTimers();
    runner.dispose();
  });

  it('spawns a fresh worker for the run after a timeout', async () => {
    vi.useFakeTimers();
    let hang = true;
    const made: FakeWorker[] = [];
    const runner = new CheckRunner({
      createWorker: () => {
        const w = new FakeWorker((req, send) => {
          if (!hang) queueMicrotask(() => send(ok(req.seq)));
        });
        made.push(w);
        return w as any;
      },
      defaultTimeoutMs: 100,
    });

    const first = runner.run({ termId: 't', rungId: 'r', code: 'hang' });
    await vi.advanceTimersByTimeAsync(150);
    await first;
    expect(made[0]!.terminated).toBe(true);

    hang = false;
    vi.useRealTimers();
    const second = await runner.run({ termId: 't', rungId: 'r', code: 'fine' });
    expect(second.results[0]!.ok).toBe(true);
    expect(made).toHaveLength(2);
    runner.dispose();
  });

  it('reports a worker error rather than hanging', async () => {
    const runner = new CheckRunner({
      createWorker: () => {
        const w = new FakeWorker(() => {
          queueMicrotask(() => w.onerror?.({ message: 'the sandbox died' }));
        });
        return w as any;
      },
    });
    const r = await runner.run({ termId: 't', rungId: 'r', code: 'x' });
    expect(r.fatal).toBe('the sandbox died');
    runner.dispose();
  });
});
