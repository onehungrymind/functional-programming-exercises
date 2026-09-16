import { describe, expect, it } from 'vitest';
import { createHarness } from './harness.js';
import * as laws from './laws.js';
import type { CheckResult, Harness } from './types.js';

/**
 * Every suite gets the same two questions: does it accept a lawful instance, and does it
 * reject a known-unlawful one.
 *
 * The rejection half is the one that matters. A law suite that never fails is worse than
 * no suite at all, because it tells the learner their broken instance is fine.
 */

function run(suite: (api: Harness) => void): CheckResult[] {
  const { api, state } = createHarness('');
  suite(api);
  return state.results;
}

const accepts = (results: CheckResult[]) => results.every((r) => r.ok);
const rejects = (results: CheckResult[]) => results.some((r) => !r.ok);

/** The failing law's message, which is what the learner actually reads. */
const firstFailure = (results: CheckResult[]) => results.find((r) => !r.ok);

/** Asserts the suite passes on `good`, fails on `bad`, and says something useful when it does. */
function lawful(
  name: string,
  suite: (api: Harness, instance: any) => void,
  good: any,
  bad: any,
  expectedMention?: RegExp,
) {
  describe(name, () => {
    it('accepts a lawful instance', () => {
      const results = run((api) => suite(api, good));
      expect(results.length).toBeGreaterThan(0);
      if (!accepts(results)) throw new Error(`Rejected a lawful instance: ${firstFailure(results)?.detail}`);
    });

    it('rejects an unlawful one, and says why', () => {
      const results = run((api) => suite(api, bad));
      expect(rejects(results)).toBe(true);
      const failure = firstFailure(results)!;
      expect(failure.detail).toBeTruthy();
      // No bare "failed": a message has to carry the counterexample.
      expect(failure.detail!.length).toBeGreaterThan(20);
      if (expectedMention) expect(failure.detail).toMatch(expectedMention);
    });
  });
}

// ---------------------------------------------------------------- instances

const Box = (value: any): any => ({
  value,
  map: (f: any) => Box(f(value)),
  ap: (b: any) => Box(value(b.value)),
  chain: (f: any) => f(value),
  extract: () => value,
  extend: (f: any) => Box(f(Box(value))),
  inspect: () => `Box(${JSON.stringify(value)})`,
});

/** map applies the function twice, which identity catches immediately. */
const DoubleMapBox = (value: any): any => ({
  value,
  map: (f: any) => DoubleMapBox(f(f(value))),
  inspect: () => `Box(${JSON.stringify(value)})`,
});

/** ap applies its arguments the wrong way round. */
const FlippedBox = (value: any): any => ({
  value,
  map: (f: any) => FlippedBox(f(value)),
  ap: (b: any) => FlippedBox(b.value(value)),
  inspect: () => `Box(${JSON.stringify(value)})`,
});

/** chain unwraps one level too many, breaking associativity. */
const GreedyBox = (value: any): any => ({
  value,
  map: (f: any) => GreedyBox(f(value)),
  chain: (f: any) => {
    const out = f(value);
    return out && 'value' in out ? out.value : out;
  },
  inspect: () => `Box(${JSON.stringify(value)})`,
});

const Sum = (n: number): any => ({
  value: n,
  concat: (b: any) => Sum(n + b.value),
  inspect: () => `Sum(${n})`,
});

/** Subtraction is the README's own counterexample: no two-sided identity. */
const Diff = (n: number): any => ({
  value: n,
  concat: (b: any) => Diff(n - b.value),
  inspect: () => `Diff(${n})`,
});

const Point = (n: number): any => ({
  value: n,
  equals: (b: any) => b.value === n,
  inspect: () => `Point(${n})`,
});

/** equals is not symmetric, which is exactly what the setoid laws exist to catch. */
const SloppyPoint = (n: number): any => ({
  value: n,
  equals: (b: any) => b.value >= n,
  inspect: () => `Point(${n})`,
});

const Pair = (a: any, b: any): any => ({
  a,
  b,
  bimap: (f: any, g: any) => Pair(f(a), g(b)),
  inspect: () => `Pair(${JSON.stringify(a)}, ${JSON.stringify(b)})`,
});

/** bimap runs both functions on the wrong slots. */
const SwappedPair = (a: any, b: any): any => ({
  a,
  b,
  bimap: (f: any, g: any) => SwappedPair(g(b), f(a)),
  inspect: () => `Pair(${JSON.stringify(a)}, ${JSON.stringify(b)})`,
});

const Fn = (run: any): any => ({
  run,
  promap: (f: any, g: any) => Fn((x: any) => g(run(f(x)))),
});

/** promap applies its input function on the output side too. */
const BadFn = (run: any): any => ({
  run,
  promap: (f: any, g: any) => BadFn((x: any) => f(g(run(f(x))))),
});

const Predicate = (run: any): any => ({
  run,
  contramap: (f: any) => Predicate((x: any) => run(f(x))),
  value: run,
});

/** contramap composes in the covariant direction, which reverses the wrong way. */
const BadPredicate = (run: any): any => ({
  run,
  contramap: (f: any) => BadPredicate((x: any) => f(run(x))),
  value: run,
});

const Morphism = (f: any): any => ({
  f,
  compose: (g: any) => Morphism((x: any) => f(g.f(x))),
});

/** compose applies its arguments in the wrong order, which identity catches. */
const BadMorphism = (f: any): any => ({
  f,
  compose: (g: any) => BadMorphism((x: any) => g.f(f(x)) + 1),
});

const List = (xs: number[]): any => ({
  xs,
  map: (f: any) => List(xs.map(f)),
  reduce: (f: any, seed: any) => xs.reduce(f, seed),
  traverse: (of: any, f: any) => of(xs.map((x) => f(x).value)),
  inspect: () => `List(${JSON.stringify(xs)})`,
});

/** reduce visits the elements backwards. */
const ReversedList = (xs: number[]): any => ({
  xs,
  map: (f: any) => ReversedList(xs.map(f)),
  reduce: (f: any, seed: any) => [...xs].reverse().reduce(f, seed),
  traverse: (of: any, f: any) => of([...xs].reverse().map((x) => f(x).value)),
  inspect: () => `List(${JSON.stringify(xs)})`,
});

const Just = (v: any): any => ({
  v,
  isNothing: false,
  map: (f: any) => Just(f(v)),
  alt: (_b: any) => Just(v),
  inspect: () => `Just(${JSON.stringify(v)})`,
});
const Nothing = (): any => ({
  v: null,
  isNothing: true,
  map: () => Nothing(),
  alt: (b: any) => b,
  inspect: () => 'Nothing',
});

/**
 * Always taking the right-hand side is still a lawful Alt (both groupings reach the same
 * place), so it only trips the Alternative annihilation law, not associativity.
 */
const RightBiased = (v: any): any => ({
  v,
  isNothing: false,
  map: (f: any) => RightBiased(f(v)),
  alt: (b: any) => b,
  inspect: () => `Just(${JSON.stringify(v)})`,
});

/** alt combines by subtraction, which is neither associative nor distributive over map. */
const SubtractingAlt = (v: any): any => ({
  v,
  map: (f: any) => SubtractingAlt(f(v)),
  alt: (b: any) => SubtractingAlt(v - b.v),
  inspect: () => `Alt(${JSON.stringify(v)})`,
});

/** extend forgets to rewrap, so the comonad identities fail. */
const FlatBox = (value: any): any => ({
  value,
  map: (f: any) => FlatBox(f(value)),
  extract: () => value,
  extend: (f: any) => FlatBox(f(FlatBox(value)) + 1),
  inspect: () => `Box(${JSON.stringify(value)})`,
});

// ---------------------------------------------------------------- suites

lawful('setoid', (api, of) => laws.setoid(api, { of }), Point, SloppyPoint, /equals/);

lawful(
  'semigroup',
  (api, lift) => laws.semigroup(api, { of: lift, lift }),
  Sum,
  // Subtraction is not associative: (a - b) - c is not a - (b - c).
  Diff,
  /grouping left/,
);

lawful(
  'monoid',
  (api, inst) => laws.monoid(api, { of: inst.lift, lift: inst.lift, empty: inst.empty }),
  { lift: Sum, empty: () => Sum(0) },
  // Diff is not even a semigroup, and zero is only a right identity for it.
  { lift: Diff, empty: () => Diff(0) },
);

lawful('functor', (api, of) => laws.functor(api, { of }), Box, DoubleMapBox, /Identity|map/i);

lawful(
  'contravariant',
  (api, of) =>
    laws.contravariant(api, {
      of: () => of((x: number) => x * 3),
      // Without this the suite would compare two closures structurally and pass vacuously.
      run: (u, x) => u.run(x),
    }),
  Predicate,
  BadPredicate,
  /contramap/,
);

lawful(
  'bifunctor',
  (api, pair) => laws.bifunctor(api, { of: (x: any) => pair(x, x), pair }),
  Pair,
  SwappedPair,
);

lawful(
  'profunctor',
  (api, ctor) => laws.profunctor(api, { of: () => ctor((x: number) => x * 3) }),
  Fn,
  BadFn,
);

lawful('apply', (api, of) => laws.apply(api, { of }), Box, FlippedBox);

lawful('applicative', (api, of) => laws.applicative(api, { of }), Box, FlippedBox);

lawful('monad', (api, of) => laws.monad(api, { of, lift: of }), Box, GreedyBox);

lawful(
  'semigroupoid',
  (api, ctor) =>
    laws.semigroupoid(api, {
      lift: (f) => ctor(f),
      run: (m, x) => m.f(x),
    }),
  Morphism,
  BadMorphism,
  /grouping/,
);

lawful(
  'category',
  (api, ctor) =>
    laws.category(api, {
      lift: (f) => ctor(f),
      id: () => ctor((x: number) => x),
      run: (m, x) => m.f(x),
    }),
  Morphism,
  BadMorphism,
);

lawful('alt', (api, ctor) => laws.alt(api, { of: ctor }), Just, SubtractingAlt, /grouping|mapping/);

lawful(
  'alternative',
  (api, inst) => laws.alternative(api, { of: inst.of, zero: inst.zero }),
  { of: Just, zero: Nothing },
  { of: RightBiased, zero: Nothing },
);

lawful('comonad', (api, of) => laws.comonad(api, { of }), Box, FlatBox);

lawful(
  'foldable',
  (api, ctor) => laws.foldable(api, { fromArray: ctor, toArray: (u) => u.xs }),
  List,
  ReversedList,
  /order/,
);

lawful(
  'traversable',
  (api, ctor) =>
    laws.traversable(api, {
      fromArray: ctor,
      toArray: (u) => u.xs,
      of: Box,
      extract: (fa) => ctor(fa.value),
    }),
  List,
  ReversedList,
);

describe('lens', () => {
  const view = (s: any) => s.name;
  const set = (v: any, s: any) => ({ ...s, name: v });
  const sample = (G: any) => ({ name: G.str(), age: G.nat() });
  const value = (G: any) => G.str();

  it('accepts a lawful lens', () => {
    const results = run((api) => laws.lens(api, { view, set, sample, value }));
    expect(accepts(results)).toBe(true);
  });

  it('rejects a set that also touches another field', () => {
    const results = run((api) =>
      laws.lens(api, { view, set: (v, s) => ({ ...s, name: v, age: s.age + 1 }), sample, value }),
    );
    expect(rejects(results)).toBe(true);
    expect(firstFailure(results)!.detail).toMatch(/set/);
  });

  it('rejects a set-get that does not round trip', () => {
    const results = run((api) =>
      laws.lens(api, { view, set: (v, s) => ({ ...s, name: `${v}!` }), sample, value }),
    );
    expect(rejects(results)).toBe(true);
  });
});

describe('iso', () => {
  const sample = (G: any) => G.int();

  it('accepts a lawful iso', () => {
    const results = run((api) =>
      laws.iso(api, { to: (c: number) => c * 1.8 + 32, from: (f: number) => (f - 32) / 1.8, sample, close: (a, b) => Math.abs(a - b) < 1e-9 }),
    );
    expect(accepts(results)).toBe(true);
  });

  it('rejects a conversion that loses information', () => {
    const results = run((api) =>
      laws.iso(api, { to: (n: number) => Math.round(n / 10), from: (n: number) => n * 10, sample }),
    );
    expect(rejects(results)).toBe(true);
  });

  it('needs a tolerance for floats, and says so through the counterexample', () => {
    // Without `close`, exact equality on a float round trip is the wrong question.
    const results = run((api) =>
      laws.iso(api, { to: (c: number) => c * 1.8 + 32, from: (f: number) => (f - 32) / 1.8, sample: () => 0.1 }),
    );
    // Either it passes outright or the message shows the two nearly-equal numbers.
    if (rejects(results)) expect(firstFailure(results)!.detail).toMatch(/came back as/);
  });
});

describe('prism', () => {
  // An integer prism over strings: "42" matches, "abc" does not.
  const preview = (s: string) => (/^-?\d+$/.test(s) ? { just: true, v: Number(s) } : { just: false });
  const review = (n: number) => String(n);

  const ctx = {
    preview,
    review,
    matched: (p: any) => p.just,
    focus: (p: any) => p.v,
    sample: (G: any) => (G.bool() ? String(G.int()) : G.str()),
    value: (G: any) => G.int(),
  };

  it('accepts a lawful prism', () => {
    expect(accepts(run((api) => laws.prism(api, ctx)))).toBe(true);
  });

  it('rejects a review that does not round trip', () => {
    const results = run((api) => laws.prism(api, { ...ctx, review: (n: number) => `#${n}` }));
    expect(rejects(results)).toBe(true);
  });

  it('rejects a preview that matches things it cannot rebuild', () => {
    const results = run((api) =>
      laws.prism(api, { ...ctx, preview: (s: string) => ({ just: true, v: Number(s) || 0 }) }),
    );
    expect(rejects(results)).toBe(true);
  });
});

describe('idempotence', () => {
  it('accepts a function that settles after one application', () => {
    const results = run((api) => laws.idempotence(api, (s: string) => s.trim().toLowerCase(), (G) => G.str()));
    expect(accepts(results)).toBe(true);
  });

  it('rejects one that keeps changing its input', () => {
    const results = run((api) => laws.idempotence(api, (n: number) => n + 1, (G) => G.int()));
    expect(rejects(results)).toBe(true);
    expect(firstFailure(results)!.detail).toMatch(/once gave .* twice gave/);
  });
});

describe('natural transformation', () => {
  const head = (l: any) => (l.xs.length ? Just(l.xs[0]) : Nothing());

  it('accepts a lawful transformation', () => {
    const results = run((api) => laws.naturalTransformation(api, head, (n) => List([n, n + 1])));
    expect(accepts(results)).toBe(true);
  });

  it('rejects one that peeks at the values on the way through', () => {
    const results = run((api) =>
      laws.naturalTransformation(api, (l: any) => (l.xs.length ? Just(l.xs[0] + 1) : Nothing()), (n) => List([n, n + 1])),
    );
    expect(rejects(results)).toBe(true);
    expect(firstFailure(results)!.detail).toMatch(/mapping before the transformation/);
  });
});

describe('the suites as a set', () => {
  it('every exported suite is covered by an accept and a reject test', () => {
    // A suite added to laws.ts without tests is the failure mode this guards against.
    const exported = Object.keys(laws).filter((k) => typeof (laws as any)[k] === 'function');
    const tested = [
      'setoid', 'semigroup', 'monoid', 'functor', 'contravariant', 'bifunctor', 'profunctor',
      'apply', 'applicative', 'monad', 'semigroupoid', 'category', 'alt', 'alternative',
      'comonad', 'foldable', 'traversable', 'lens', 'iso', 'prism', 'idempotence',
      'naturalTransformation',
    ];
    expect(exported.filter((k) => !tested.includes(k))).toEqual([]);
  });
});
