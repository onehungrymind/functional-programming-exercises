import { createGen } from './gen.js';
import { createShapeRules } from './shape.js';
import type { CheckResult, Gen, Harness } from './types.js';

export function fmt(v: unknown, depth = 0): string {
  try {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'function') {
      const f = v as { name?: string };
      return f.name ? `[fn ${f.name}]` : '[fn]';
    }
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'bigint') return `${v}n`;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'symbol') return v.toString();

    // A container that knows how to describe itself gets to.
    const insp = (v as { inspect?: unknown }).inspect;
    if (typeof insp === 'function') {
      const out = (insp as () => unknown).call(v);
      if (typeof out === 'string') return out;
    }
    if (depth > 3) return Array.isArray(v) ? '[...]' : '{...}';
    if (Array.isArray(v)) return `[${v.map((x) => fmt(x, depth + 1)).join(', ')}]`;

    const entries = Object.entries(v as object).filter(([, val]) => typeof val !== 'function');
    if (entries.length === 0) return Object.keys(v as object).length ? '{ }' : '{}';
    return `{ ${entries.map(([k, val]) => `${k}: ${fmt(val, depth + 1)}`).join(', ')} }`;
  } catch {
    return String(v);
  }
}

/**
 * Structural equality that ignores function-valued keys, so `Box(3)` equals `Box(3)`
 * even though the two `map` closures are different objects.
 */
export function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = (o: object) => Object.keys(o).filter((k) => typeof (o as any)[k] !== 'function');
  const ka = keys(a);
  const kb = keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && eq((a as any)[k], (b as any)[k]));
}

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o as object)) deepFreeze((o as any)[k]);
  }
  return o;
}

function clone<T>(o: T): T {
  if (o === null || typeof o !== 'object') return o;
  if (Array.isArray(o)) return o.map(clone) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o as object)) out[k] = typeof v === 'function' ? v : clone(v);
  return out as T;
}

export interface HarnessState {
  results: CheckResult[];
  effects: string[];
}

/**
 * Builds the API an exercise's `checks` function is handed.
 * Every failure it records is phrased for the learner: what was expected, what happened,
 * and the smallest counterexample. It never leaks a stack trace or names itself.
 */
export function createHarness(src: string, seed = 0x5eed): { api: Harness; state: HarnessState } {
  const results: CheckResult[] = [];
  const effects: string[] = [];
  const G: Gen = createGen(seed);

  const describeError = (e: unknown): string => {
    if (e instanceof RangeError && /call stack/i.test(e.message)) {
      return 'Ran out of stack. That usually means the recursion never reaches a base case.';
    }
    // Checks freeze the inputs they hand out, so a write to one surfaces here as a
    // strict-mode TypeError. Say what it means rather than passing the engine's wording on.
    if (e instanceof TypeError && /read only|not extensible|object is not extensible|Cannot add property|Cannot delete/i.test(e.message)) {
      return 'You changed a value you were handed. Inputs are frozen on purpose: build and return a new value instead of writing into the argument.';
    }
    if (e instanceof TypeError && /read propert|of undefined|of null/i.test(e.message)) {
      return `${e.message}. Something in the chain handed back nothing where a value was expected.`;
    }
    if (e instanceof TypeError && /is not a function/i.test(e.message)) {
      return `${e.message}. Check what the previous step actually returned.`;
    }
    if (e && typeof e === 'object' && 'message' in e) {
      const name = (e as Error).name ?? 'Error';
      return `${name}: ${(e as Error).message}`;
    }
    return String(e);
  };

  const api: Harness = {
    check(name, fn) {
      try {
        const r = fn();
        if (r === true || r === undefined) results.push({ name, ok: true });
        else results.push({ name, ok: false, detail: typeof r === 'string' ? r : `Returned ${fmt(r)}` });
      } catch (e) {
        results.push({ name, ok: false, detail: describeError(e) });
      }
    },

    law(name, runs, prop) {
      for (let i = 0; i < runs; i++) {
        let out: true | string;
        try {
          out = prop(G);
        } catch (e) {
          results.push({ name, ok: false, detail: `Threw on case ${i + 1}. ${describeError(e)}`, runs: i });
          return false;
        }
        if (out !== true) {
          results.push({
            name,
            ok: false,
            detail: typeof out === 'string' ? out : `Failed on case ${i + 1}`,
            runs: i,
          });
          return false;
        }
      }
      results.push({ name, ok: true, detail: `${runs} random cases`, runs });
      return true;
    },

    eq,
    fmt,
    freeze: deepFreeze,
    clone,
    effects,

    spyFn(f) {
      const calls: unknown[][] = [];
      const wrapped = ((...args: unknown[]) => {
        calls.push(args);
        return f(...args);
      }) as typeof f & { calls: unknown[][] };
      wrapped.calls = calls;
      return wrapped;
    },

    G,
    src,
    shape: createShapeRules(src),
  };

  return { api, state: { results, effects } };
}
