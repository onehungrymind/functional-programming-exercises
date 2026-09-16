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

export const contravariant: Suite<any> = (api, ctx) => {
  const { eq, runs } = prep(api, ctx);

  api.law('Identity: u.contramap(x => x) equals u', runs, (G: Gen) => {
    const n = G.int();
    const u = ctx.of(n);
    const mapped = u.contramap((x: unknown) => x);
    return eq(mapped, u) || `contramap with identity changed ${api.fmt(u)} into ${api.fmt(mapped)}.`;
  });

  api.law('Composition: u.contramap(f).contramap(g) equals u.contramap(x => f(g(x)))', runs, (G: Gen) => {
    const n = G.int();
    const f = G.fn();
    const g = G.fn();
    const u = ctx.of(n);
    const left = u.contramap(f.f).contramap(g.f);
    const right = u.contramap((x: number) => f.f(g.f(x)));
    return eq(left, right) || `With n = ${n}, f = ${f.name}, g = ${g.name}: got ${api.fmt(left)} and ${api.fmt(right)}. Note the order reverses: contramap composes the other way round from map.`;
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

export const applicative: Suite<any> = (api, ctx) => {
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
