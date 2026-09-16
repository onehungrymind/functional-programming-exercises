import type { Gen, Harness } from './types.js';

/**
 * Law suites, written once and parameterized by constructors and an equality function.
 *
 * Statements follow Fantasy Land. A failure names the law in the concept's own vocabulary
 * and prints the counterexample, because "composition failed" without an `n` and an `f`
 * is no more useful than "wrong".
 */

export interface LawContext<T> {
  /** Lifts a plain value into the structure under test. */
  of: (x: any) => T;
  /** Structural equality for the structure. Defaults to the harness's `eq`. */
  equals?: (a: T, b: T) => boolean;
  /** How many random cases each law runs. */
  runs?: number;
}

type Suite<T> = (api: Harness, ctx: LawContext<T>) => void;

const DEFAULT_RUNS = 50;

/** Shared setup every suite needs: an equality, a case count, and a value renderer. */
function prep<T>(api: Harness, ctx: LawContext<T>) {
  return {
    eq: ctx.equals ?? ((a: T, b: T) => api.eq(a, b)),
    runs: ctx.runs ?? DEFAULT_RUNS,
    show: (v: unknown) => api.fmt(v),
  };
}

// ---------------------------------------------------------------- setoid

export const setoid: Suite<any> = (api, ctx) => {
  const { runs } = prep(api, ctx);
  const equals = (a: any, b: any) => a.equals(b);

  api.law('Reflexivity: a.equals(a) is true', runs, (G: Gen) => {
    const a = ctx.of(G.int());
    return equals(a, a) === true || `${api.fmt(a)} is not equal to itself.`;
  });

  api.law('Symmetry: a.equals(b) matches b.equals(a)', runs, (G: Gen) => {
    const a = ctx.of(G.int());
    const b = ctx.of(G.int());
    return equals(a, b) === equals(b, a) || `${api.fmt(a)}.equals(${api.fmt(b)}) gave ${equals(a, b)}, the other way round gave ${equals(b, a)}.`;
  });

  api.law('Transitivity: a equals b and b equals c means a equals c', runs, (G: Gen) => {
    const n = G.int();
    const a = ctx.of(n);
    const b = ctx.of(n);
    const c = ctx.of(n);
    if (!(equals(a, b) && equals(b, c))) return true; // premise does not hold, nothing to prove
    return equals(a, c) === true || `${api.fmt(a)} equals ${api.fmt(b)} equals ${api.fmt(c)}, but the first and last are not equal.`;
  });
};

// ---------------------------------------------------------------- semigroup, monoid

export interface ConcatContext<T> extends LawContext<T> {
  /** Builds a value of the structure from a plain number. */
  lift: (n: number) => T;
}

export const semigroup = <T,>(api: Harness, ctx: ConcatContext<T>): void => {
  const { eq, runs } = prep(api, ctx);
  api.law('Associativity: a.concat(b).concat(c) equals a.concat(b.concat(c))', runs, (G: Gen) => {
    const [x, y, z] = [G.int(), G.int(), G.int()];
    const [a, b, c] = [ctx.lift(x!), ctx.lift(y!), ctx.lift(z!)];
    const left = (a as any).concat(b).concat(c);
    const right = (a as any).concat((b as any).concat(c));
    return eq(left, right) || `With ${x}, ${y}, ${z}: grouping left gave ${api.fmt(left)}, grouping right gave ${api.fmt(right)}.`;
  });
};

export interface MonoidContext<T> extends ConcatContext<T> {
  /** The identity element. */
  empty: () => T;
}

export const monoid = <T,>(api: Harness, ctx: MonoidContext<T>): void => {
  semigroup(api, ctx);
  const { eq, runs } = prep(api, ctx);

  api.law('Left identity: empty().concat(a) equals a', runs, (G: Gen) => {
    const n = G.int();
    const a = ctx.lift(n);
    const left = (ctx.empty() as any).concat(a);
    return eq(left, a) || `With ${n}: empty().concat(${api.fmt(a)}) gave ${api.fmt(left)}, not ${api.fmt(a)}.`;
  });

  api.law('Right identity: a.concat(empty()) equals a', runs, (G: Gen) => {
    const n = G.int();
    const a = ctx.lift(n);
    const right = (a as any).concat(ctx.empty());
    return eq(right, a) || `With ${n}: ${api.fmt(a)}.concat(empty()) gave ${api.fmt(right)}, not ${api.fmt(a)}.`;
  });
};

// ---------------------------------------------------------------- functor family

export const functor: Suite<any> = (api, ctx) => {
  const { eq, runs } = prep(api, ctx);

  api.law('Identity: u.map(x => x) equals u', runs, (G: Gen) => {
    const n = G.int();
    const u = ctx.of(n);
    const mapped = u.map((x: unknown) => x);
    return eq(mapped, u) || `${api.fmt(u)}.map(x => x) gave ${api.fmt(mapped)}. Mapping identity has to change nothing.`;
  });

  api.law('Composition: u.map(f).map(g) equals u.map(x => g(f(x)))', runs, (G: Gen) => {
    const n = G.int();
    const f = G.fn();
    const g = G.fn();
    const u = ctx.of(n);
    const left = u.map(f.f).map?.(g.f);
    const right = u.map((x: number) => g.f(f.f(x)));
    if (left === undefined) return `map did not give back something mappable, so the second map had nothing to run on. Got ${api.fmt(u.map(f.f))}.`;
    return eq(left, right) || `With n = ${n}, f = ${f.name}, g = ${g.name}: mapping twice gave ${api.fmt(left)}, mapping the composition gave ${api.fmt(right)}.`;
  });
};

export interface ContravariantContext extends LawContext<any> {
  /**
   * Runs the structure on an input. Required, and deliberately so.
   *
   * A Predicate's whole content is a function, and structural equality skips
   * function-valued keys, so comparing two of them directly compares nothing and every law
   * passes vacuously. Contravariant instances have to be judged by what they do.
   */
  run: (u: any, x: number) => unknown;
}

export const contravariant = (api: Harness, ctx: ContravariantContext): void => {
  const runs = ctx.runs ?? DEFAULT_RUNS;
  // Behavioral equality: two instances agree when they agree on every sample input.
  const SAMPLES = [-7, -1, 0, 1, 2, 5, 11];
  const same = (a: any, b: any) => SAMPLES.every((x) => api.eq(ctx.run(a, x), ctx.run(b, x)));
  const showOn = (u: any) => SAMPLES.map((x) => `${x} -> ${api.fmt(ctx.run(u, x))}`).join(', ');

  api.law('Identity: u.contramap(x => x) behaves like u', runs, () => {
    const u = ctx.of(null);
    const mapped = u.contramap((x: unknown) => x);
    return same(mapped, u) || `contramap with identity changed the behavior. Before: ${showOn(u)}. After: ${showOn(mapped)}.`;
  });

  api.law('Composition: u.contramap(f).contramap(g) equals u.contramap(x => f(g(x)))', runs, (G: Gen) => {
    const f = G.fn();
    const g = G.fn();
    const u = ctx.of(null);
    const left = u.contramap(f.f).contramap(g.f);
    const right = u.contramap((x: number) => f.f(g.f(x)));
    const x = SAMPLES.find((s) => !api.eq(ctx.run(left, s), ctx.run(right, s)));
    return (
      x === undefined ||
      `With f = ${f.name}, g = ${g.name}, on input ${x}: contramapping twice gave ${api.fmt(ctx.run(left, x))}, contramapping the composition gave ${api.fmt(ctx.run(right, x))}. Note the order reverses: contramap composes the other way round from map.`
    );
  });
};

export interface PairContext<T> extends LawContext<T> {
  /** Builds the two-slot structure from two numbers. */
  pair: (a: number, b: number) => T;
}

export const bifunctor = <T,>(api: Harness, ctx: PairContext<T>): void => {
  const { eq, runs } = prep(api, ctx);

  api.law('Identity: u.bimap(x => x, x => x) equals u', runs, (G: Gen) => {
    const [a, b] = [G.int(), G.int()];
    const u = ctx.pair(a!, b!);
    const out = (u as any).bimap((x: unknown) => x, (x: unknown) => x);
    return eq(out, u) || `bimap with two identities changed ${api.fmt(u)} into ${api.fmt(out)}.`;
  });

  api.law('Composition: bimap twice equals bimap of the compositions', runs, (G: Gen) => {
    const [a, b] = [G.int(), G.int()];
    const [f, g, h, i] = [G.fn(), G.fn(), G.fn(), G.fn()];
    const u = ctx.pair(a!, b!);
    const left = (u as any).bimap(f.f, g.f).bimap(h.f, i.f);
    const right = (u as any).bimap((x: number) => h.f(f.f(x)), (x: number) => i.f(g.f(x)));
    return eq(left, right) || `With (${a}, ${b}): got ${api.fmt(left)} and ${api.fmt(right)}.`;
  });
};

export const profunctor: Suite<any> = (api, ctx) => {
  const { runs } = prep(api, ctx);

  api.law('Identity: p.promap(x => x, x => x) behaves like p', runs, (G: Gen) => {
    const n = G.int();
    const p = ctx.of(null);
    const out = p.promap((x: unknown) => x, (x: unknown) => x);
    return out.run(n) === p.run(n) || `On input ${n}: the promapped version gave ${api.fmt(out.run(n))}, the original gave ${api.fmt(p.run(n))}.`;
  });

  api.law('Composition: promap twice equals promap of the compositions', runs, (G: Gen) => {
    const n = G.int();
    const [f, g, h, i] = [G.fn(), G.fn(), G.fn(), G.fn()];
    const p = ctx.of(null);
    // Contravariant on the input, covariant on the output, so the input functions compose reversed.
    const left = p.promap(f.f, g.f).promap(h.f, i.f);
    const right = p.promap((x: number) => f.f(h.f(x)), (x: number) => i.f(g.f(x)));
    return left.run(n) === right.run(n) || `On input ${n} with f = ${f.name}, g = ${g.name}, h = ${h.name}, i = ${i.name}: got ${api.fmt(left.run(n))} and ${api.fmt(right.run(n))}.`;
  });
};

// ---------------------------------------------------------------- apply, applicative

/**
 * Apply is Functor plus `ap`. Composition is its only law, and it is the one that catches
 * an `ap` that applies its arguments in the wrong order.
 */
export const apply: Suite<any> = (api, ctx) => {
  const { eq, runs } = prep(api, ctx);

  api.law('Composition: v.ap(u.ap(a.map(compose))) equals v.ap(u).ap(a)', runs, (G: Gen) => {
    const n = G.int();
    const f = G.fn();
    const g = G.fn();
    const compose = (h: (x: number) => number) => (i: (x: number) => number) => (x: number) => h(i(x));

    const a = ctx.of(n);
    const u = ctx.of(f.f);
    const v = ctx.of(g.f);

    const left = ctx.of(compose).ap(v).ap(u).ap(a);
    const right = v.ap(u.ap(a));
    return eq(left, right) || `With n = ${n}, f = ${f.name}, g = ${g.name}: composing first gave ${api.fmt(left)}, applying in sequence gave ${api.fmt(right)}.`;
  });
};

export const applicative: Suite<any> = (api, ctx) => {
  apply(api, ctx);
  const { eq, runs } = prep(api, ctx);

  api.law('Identity: A.of(x => x).ap(v) equals v', runs, (G: Gen) => {
    const n = G.int();
    const v = ctx.of(n);
    const out = ctx.of((x: unknown) => x).ap(v);
    return eq(out, v) || `Applying the identity function to ${api.fmt(v)} gave ${api.fmt(out)}.`;
  });

  api.law('Homomorphism: A.of(f).ap(A.of(x)) equals A.of(f(x))', runs, (G: Gen) => {
    const n = G.int();
    const f = G.fn();
    const left = ctx.of(f.f).ap(ctx.of(n));
    const right = ctx.of(f.f(n));
    return eq(left, right) || `With n = ${n}, f = ${f.name}: got ${api.fmt(left)} and ${api.fmt(right)}. Lifting then applying has to match applying then lifting.`;
  });

  api.law('Interchange: A.of(f).ap(A.of(y)) equals A.of(g => g(y)).ap(A.of(f))', runs, (G: Gen) => {
    const y = G.int();
    const f = G.fn();
    const left = ctx.of(f.f).ap(ctx.of(y));
    const right = ctx.of((g: (n: number) => number) => g(y)).ap(ctx.of(f.f));
    return eq(left, right) || `With y = ${y}, f = ${f.name}: got ${api.fmt(left)} and ${api.fmt(right)}.`;
  });
};

// ---------------------------------------------------------------- chain, monad

export interface MonadContext<T> extends LawContext<T> {
  /** A number -> structure function, for the chain laws. */
  lift?: (n: number) => T;
}

export const monad = <T,>(api: Harness, ctx: MonadContext<T>): void => {
  const { eq, runs } = prep(api, ctx);
  const lift = ctx.lift ?? ((n: number) => ctx.of(n));

  api.law('Left identity: M.of(a).chain(f) equals f(a)', runs, (G: Gen) => {
    const a = G.int();
    const fn = G.fn();
    const f = (x: number) => lift(fn.f(x));
    const left = (ctx.of(a) as any).chain(f);
    const right = f(a);
    return eq(left, right) || `With a = ${a}, f = x => of(${fn.name}): got ${api.fmt(left)} and ${api.fmt(right)}.`;
  });

  api.law('Right identity: m.chain(M.of) equals m', runs, (G: Gen) => {
    const a = G.int();
    const m = lift(a);
    const out = (m as any).chain((x: unknown) => ctx.of(x));
    return eq(out, m) || `With a = ${a}: chaining with of gave ${api.fmt(out)}, not ${api.fmt(m)}.`;
  });

  api.law('Associativity: m.chain(f).chain(g) equals m.chain(x => f(x).chain(g))', runs, (G: Gen) => {
    const a = G.int();
    const [fn, gn] = [G.fn(), G.fn()];
    const f = (x: number) => lift(fn.f(x));
    const g = (x: number) => lift(gn.f(x));
    const m = lift(a);
    const left = (m as any).chain(f).chain(g);
    const right = (m as any).chain((x: number) => (f(x) as any).chain(g));
    return eq(left, right) || `With a = ${a}, f = x => of(${fn.name}), g = x => of(${gn.name}): got ${api.fmt(left)} and ${api.fmt(right)}.`;
  });
};

// ---------------------------------------------------------------- category, semigroupoid

export interface ComposeContext {
  /** Builds a morphism from a labelled function. */
  lift: (f: (n: number) => number) => any;
  /** The identity morphism, for the category laws. */
  id?: () => any;
  /** Runs a morphism on an input. */
  run: (m: any, x: number) => number;
  runs?: number;
}

export const semigroupoid = (api: Harness, ctx: ComposeContext): void => {
  const runs = ctx.runs ?? DEFAULT_RUNS;
  api.law('Associativity: a.compose(b).compose(c) equals a.compose(b.compose(c))', runs, (G: Gen) => {
    const n = G.int();
    const [f, g, h] = [G.fn(), G.fn(), G.fn()];
    const [a, b, c] = [ctx.lift(f.f), ctx.lift(g.f), ctx.lift(h.f)];
    const left = ctx.run(a.compose(b).compose(c), n);
    const right = ctx.run(a.compose(b.compose(c)), n);
    return left === right || `On ${n} with ${f.name}, ${g.name}, ${h.name}: grouping left gave ${api.fmt(left)}, grouping right gave ${api.fmt(right)}.`;
  });
};

export const category = (api: Harness, ctx: ComposeContext): void => {
  semigroupoid(api, ctx);
  const runs = ctx.runs ?? DEFAULT_RUNS;
  if (!ctx.id) return;

  api.law('Left identity: id().compose(a) behaves like a', runs, (G: Gen) => {
    const n = G.int();
    const f = G.fn();
    const a = ctx.lift(f.f);
    const out = ctx.run(ctx.id!().compose(a), n);
    return out === ctx.run(a, n) || `On ${n} with ${f.name}: composing with id first gave ${api.fmt(out)}, the morphism alone gave ${api.fmt(ctx.run(a, n))}.`;
  });

  api.law('Right identity: a.compose(id()) behaves like a', runs, (G: Gen) => {
    const n = G.int();
    const f = G.fn();
    const a = ctx.lift(f.f);
    const out = ctx.run(a.compose(ctx.id!()), n);
    return out === ctx.run(a, n) || `On ${n} with ${f.name}: composing with id last gave ${api.fmt(out)}, the morphism alone gave ${api.fmt(ctx.run(a, n))}.`;
  });
};

// ---------------------------------------------------------------- optics

export interface LensContext {
  view: (s: any) => any;
  set: (v: any, s: any) => any;
  /** Sample structures to run the laws over. */
  sample: (G: Gen) => any;
  /** A value the focus could hold. */
  value: (G: Gen) => any;
  runs?: number;
}

export const lens = (api: Harness, ctx: LensContext): void => {
  const runs = ctx.runs ?? DEFAULT_RUNS;

  api.law('Get-set: setting what you just got changes nothing', runs, (G: Gen) => {
    const s = ctx.sample(G);
    const out = ctx.set(ctx.view(s), s);
    return api.eq(out, s) || `On ${api.fmt(s)}: set(view(s), s) gave ${api.fmt(out)}.`;
  });

  api.law('Set-get: getting what you just set gives it back', runs, (G: Gen) => {
    const s = ctx.sample(G);
    const v = ctx.value(G);
    const out = ctx.view(ctx.set(v, s));
    return api.eq(out, v) || `On ${api.fmt(s)} setting ${api.fmt(v)}: view came back as ${api.fmt(out)}.`;
  });

  api.law('Set-set: the last set is the one that counts', runs, (G: Gen) => {
    const s = ctx.sample(G);
    const [a, b] = [ctx.value(G), ctx.value(G)];
    const left = ctx.set(b, ctx.set(a, s));
    const right = ctx.set(b, s);
    return api.eq(left, right) || `On ${api.fmt(s)}: setting ${api.fmt(a)} then ${api.fmt(b)} gave ${api.fmt(left)}, setting ${api.fmt(b)} alone gave ${api.fmt(right)}.`;
  });
};

export interface IsoContext {
  to: (a: any) => any;
  from: (b: any) => any;
  sample: (G: Gen) => any;
  /** Float round-trips need a tolerance. Defaults to exact structural equality. */
  close?: (a: any, b: any) => boolean;
  runs?: number;
}

export const iso = (api: Harness, ctx: IsoContext): void => {
  const runs = ctx.runs ?? DEFAULT_RUNS;
  const close = ctx.close ?? ((a: any, b: any) => api.eq(a, b));

  api.law('Round trip: from(to(x)) equals x', runs, (G: Gen) => {
    const x = ctx.sample(G);
    const out = ctx.from(ctx.to(x));
    return close(out, x) || `${api.fmt(x)} became ${api.fmt(ctx.to(x))} and came back as ${api.fmt(out)}.`;
  });

  api.law('Round trip the other way: to(from(y)) equals y', runs, (G: Gen) => {
    const y = ctx.to(ctx.sample(G));
    const out = ctx.to(ctx.from(y));
    return close(out, y) || `${api.fmt(y)} became ${api.fmt(ctx.from(y))} and came back as ${api.fmt(out)}.`;
  });
};

// ---------------------------------------------------------------- alt, alternative

export interface AltContext<T> extends LawContext<T> {
  /** The empty case, for the annihilation laws. Alt alone does not need it. */
  zero?: () => T;
}

export const alt = <T,>(api: Harness, ctx: AltContext<T>): void => {
  const { eq, runs } = prep(api, ctx);

  api.law('Associativity: a.alt(b).alt(c) equals a.alt(b.alt(c))', runs, (G: Gen) => {
    const [x, y, z] = [G.int(), G.int(), G.int()];
    const [a, b, c] = [ctx.of(x), ctx.of(y), ctx.of(z)] as any[];
    const left = a.alt(b).alt(c);
    const right = a.alt(b.alt(c));
    return eq(left, right) || `With ${x}, ${y}, ${z}: grouping left gave ${api.fmt(left)}, grouping right gave ${api.fmt(right)}.`;
  });

  api.law('Distributivity: a.alt(b).map(f) equals a.map(f).alt(b.map(f))', runs, (G: Gen) => {
    const [x, y] = [G.int(), G.int()];
    const f = G.fn();
    const [a, b] = [ctx.of(x), ctx.of(y)] as any[];
    const left = a.alt(b).map(f.f);
    const right = a.map(f.f).alt(b.map(f.f));
    return eq(left, right) || `With ${x}, ${y}, f = ${f.name}: mapping after alt gave ${api.fmt(left)}, mapping each side gave ${api.fmt(right)}.`;
  });
};

export const alternative = <T,>(api: Harness, ctx: AltContext<T>): void => {
  alt(api, ctx);
  if (!ctx.zero) return;
  const { eq, runs } = prep(api, ctx);

  api.law('Left annihilation: zero().alt(a) equals a', runs, (G: Gen) => {
    const n = G.int();
    const a = ctx.of(n) as any;
    const out = (ctx.zero!() as any).alt(a);
    return eq(out, a) || `With ${n}: zero().alt(${api.fmt(a)}) gave ${api.fmt(out)}. The empty case has to step aside.`;
  });

  api.law('Right annihilation: a.alt(zero()) equals a', runs, (G: Gen) => {
    const n = G.int();
    const a = ctx.of(n) as any;
    const out = (a as any).alt(ctx.zero!());
    return eq(out, a) || `With ${n}: ${api.fmt(a)}.alt(zero()) gave ${api.fmt(out)}.`;
  });

  api.law('Annihilation: zero().map(f) equals zero()', runs, (G: Gen) => {
    const f = G.fn();
    const out = (ctx.zero!() as any).map(f.f);
    return eq(out, ctx.zero!()) || `zero().map(${f.name}) gave ${api.fmt(out)}. There is nothing inside to map over.`;
  });
};

// ---------------------------------------------------------------- comonad

export const comonad: Suite<any> = (api, ctx) => {
  const { eq, runs } = prep(api, ctx);

  api.law('Left identity: w.extend(w => w.extract()) equals w', runs, (G: Gen) => {
    const n = G.int();
    const w = ctx.of(n);
    const out = w.extend((x: any) => x.extract());
    return eq(out, w) || `With ${n}: extending with extract gave ${api.fmt(out)}, not ${api.fmt(w)}.`;
  });

  api.law('Right identity: w.extend(f).extract() equals f(w)', runs, (G: Gen) => {
    const n = G.int();
    const fn = G.fn();
    const f = (x: any) => fn.f(x.extract());
    const w = ctx.of(n);
    const left = w.extend(f).extract();
    const right = f(w);
    return left === right || `With ${n}, f = w => ${fn.name}(w.extract()): got ${api.fmt(left)} and ${api.fmt(right)}.`;
  });

  api.law('Associativity: w.extend(f).extend(g) equals w.extend(w => g(w.extend(f)))', runs, (G: Gen) => {
    const n = G.int();
    const [fn, gn] = [G.fn(), G.fn()];
    const f = (x: any) => fn.f(x.extract());
    const g = (x: any) => gn.f(x.extract());
    const w = ctx.of(n);
    const left = w.extend(f).extend(g);
    const right = w.extend((x: any) => g(x.extend(f)));
    return eq(left, right) || `With ${n}, f via ${fn.name}, g via ${gn.name}: got ${api.fmt(left)} and ${api.fmt(right)}.`;
  });
};

// ---------------------------------------------------------------- foldable, traversable

export interface FoldableContext {
  /** Builds the structure from a list of numbers. */
  fromArray: (xs: number[]) => any;
  /** The list the structure should fold down to, in order. */
  toArray: (u: any) => number[];
  runs?: number;
}

export const foldable = (api: Harness, ctx: FoldableContext): void => {
  const runs = ctx.runs ?? DEFAULT_RUNS;

  api.law('reduce agrees with folding the same elements in order', runs, (G: Gen) => {
    const xs = G.ints();
    const u = ctx.fromArray(xs);
    const f = (acc: number, x: number) => acc * 2 + x;
    const left = u.reduce(f, 0);
    const right = ctx.toArray(u).reduce(f, 0);
    return left === right || `On ${api.fmt(xs)}: reduce gave ${api.fmt(left)}, folding the elements gave ${api.fmt(right)}. Check the order and that nothing is visited twice.`;
  });

  api.law('An empty structure reduces to the seed', 1, () => {
    const u = ctx.fromArray([]);
    const out = u.reduce((acc: number, x: number) => acc + x, 42);
    return out === 42 || `Reducing an empty structure gave ${api.fmt(out)} instead of the seed, 42.`;
  });
};

export interface TraversableContext extends FoldableContext {
  /** The applicative to traverse into. Needs `of` and `ap`, or `map` and `ap`. */
  of: (x: any) => any;
  /** Pulls the plain value back out of that applicative, to compare results. */
  extract: (fa: any) => any;
}

export const traversable = (api: Harness, ctx: TraversableContext): void => {
  const runs = ctx.runs ?? DEFAULT_RUNS;

  api.law('Identity: traversing with of rebuilds the same structure', runs, (G: Gen) => {
    const xs = G.ints();
    const u = ctx.fromArray(xs);
    const out = ctx.extract(u.traverse(ctx.of, ctx.of));
    return api.eq(ctx.toArray(out), xs) || `On ${api.fmt(xs)}: came back as ${api.fmt(ctx.toArray(out))}.`;
  });

  api.law('Naturality: traversing then mapping equals mapping then traversing', runs, (G: Gen) => {
    const xs = G.ints();
    const f = G.fn();
    const u = ctx.fromArray(xs);
    const left = ctx.toArray(ctx.extract(u.traverse(ctx.of, (x: number) => ctx.of(f.f(x)))));
    const right = ctx.toArray(ctx.extract(u.map(f.f).traverse(ctx.of, ctx.of)));
    return api.eq(left, right) || `On ${api.fmt(xs)} with f = ${f.name}: got ${api.fmt(left)} and ${api.fmt(right)}.`;
  });
};

// ---------------------------------------------------------------- prism

export interface PrismContext {
  /** Returns the focus when the case matches, and nothing when it does not. */
  preview: (s: any) => any;
  /** Rebuilds the whole from a focus. */
  review: (a: any) => any;
  /** True when preview found something. */
  matched: (p: any) => boolean;
  /** Reads the focus out of a successful preview. */
  focus: (p: any) => any;
  /** Values that should match, and values that should not. */
  sample: (G: Gen) => any;
  value: (G: Gen) => any;
  runs?: number;
}

export const prism = (api: Harness, ctx: PrismContext): void => {
  const runs = ctx.runs ?? DEFAULT_RUNS;

  api.law('Preview-review: rebuilding what you previewed gives back the original', runs, (G: Gen) => {
    const s = ctx.sample(G);
    const p = ctx.preview(s);
    if (!ctx.matched(p)) return true; // the case did not match, so there is nothing to rebuild
    const out = ctx.review(ctx.focus(p));
    return api.eq(out, s) || `On ${api.fmt(s)}: previewed ${api.fmt(ctx.focus(p))} and rebuilt ${api.fmt(out)}.`;
  });

  api.law('Review-preview: previewing something you built always matches', runs, (G: Gen) => {
    const a = ctx.value(G);
    const p = ctx.preview(ctx.review(a));
    if (!ctx.matched(p)) return `Building from ${api.fmt(a)} produced something the prism does not recognize.`;
    return api.eq(ctx.focus(p), a) || `Built from ${api.fmt(a)} and previewed ${api.fmt(ctx.focus(p))}.`;
  });
};

// ---------------------------------------------------------------- misc

export const idempotence = (api: Harness, f: (x: any) => any, sample: (G: Gen) => any, runs = DEFAULT_RUNS): void => {
  api.law('Idempotence: f(f(x)) equals f(x)', runs, (G: Gen) => {
    const x = sample(G);
    const once = f(x);
    const twice = f(once);
    return api.eq(once, twice) || `On ${api.fmt(x)}: once gave ${api.fmt(once)}, twice gave ${api.fmt(twice)}. Applying it again has to change nothing.`;
  });
};

export const naturalTransformation = (
  api: Harness,
  nat: (fa: any) => any,
  lift: (n: number) => any,
  runs = DEFAULT_RUNS,
): void => {
  api.law('Naturality: nat(fa.map(f)) equals nat(fa).map(f)', runs, (G: Gen) => {
    const n = G.int();
    const f = G.fn();
    const fa = lift(n);
    const left = nat(fa.map(f.f));
    const right = nat(fa).map(f.f);
    return api.eq(left, right) || `With n = ${n}, f = ${f.name}: mapping before the transformation gave ${api.fmt(left)}, mapping after gave ${api.fmt(right)}.`;
  });
};
