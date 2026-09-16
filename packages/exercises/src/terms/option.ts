import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const option: ExerciseSet = {
  termId: 'option',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Some, None, and the three ways out',
      prompt:
        'Option makes "there might be nothing here" part of the type. Give it `map`, `chain`, and `getOrElse`, so a missing value flows through without a single null check.',
      hints: [
        '`map` on None does nothing and stays None. On Some it applies the function and rewraps.',
        '`chain` is for a function that itself returns an Option, so do not wrap the result again.',
        '`getOrElse` is the only way out. It is where the default finally appears.',
      ],
      exports: ['Some', 'None'],
      starter: `// Some :: a -> Option a
const Some = (value) => ({
  isSome: true,
  value,
  map: (f) => {
  },
  chain: (f) => {
  },
  getOrElse: (fallback) => {
  },
  inspect: () => \`Some(\${JSON.stringify(value)})\`
})

// None :: () -> Option a
const None = () => ({
  isSome: false,
  map: (f) => {
  },
  chain: (f) => {
  },
  getOrElse: (fallback) => {
  },
  inspect: () => 'None'
})
`,
      solution: `// Some :: a -> Option a
const Some = (value) => ({
  isSome: true,
  value,
  map: (f) => Some(f(value)),
  chain: (f) => f(value),
  getOrElse: (fallback) => value,
  inspect: () => \`Some(\${JSON.stringify(value)})\`
})

// None :: () -> Option a
const None = () => ({
  isSome: false,
  map: (f) => None(),
  chain: (f) => None(),
  getOrElse: (fallback) => fallback,
  inspect: () => 'None'
})
`,
      broken: [
        // None runs the function anyway, which is the thing Option exists to prevent.
        `const Some = (value) => ({
  isSome: true,
  value,
  map: (f) => Some(f(value)),
  chain: (f) => f(value),
  getOrElse: (fallback) => value,
  inspect: () => \`Some(\${JSON.stringify(value)})\`
})
const None = () => ({
  isSome: false,
  map: (f) => Some(f(undefined)),
  chain: (f) => f(undefined),
  getOrElse: (fallback) => fallback,
  inspect: () => 'None'
})
`,
        // chain wraps again, so you end up with an Option inside an Option.
        `const Some = (value) => ({
  isSome: true,
  value,
  map: (f) => Some(f(value)),
  chain: (f) => Some(f(value)),
  getOrElse: (fallback) => value,
  inspect: () => \`Some(\${JSON.stringify(value)})\`
})
const None = () => ({
  isSome: false,
  map: (f) => None(),
  chain: (f) => None(),
  getOrElse: (fallback) => fallback,
  inspect: () => 'None'
})
`,
        // getOrElse on Some hands back the fallback.
        `const Some = (value) => ({
  isSome: true,
  value,
  map: (f) => Some(f(value)),
  chain: (f) => f(value),
  getOrElse: (fallback) => fallback,
  inspect: () => \`Some(\${JSON.stringify(value)})\`
})
const None = () => ({
  isSome: false,
  map: (f) => None(),
  chain: (f) => None(),
  getOrElse: (fallback) => fallback,
  inspect: () => 'None'
})
`,
      ],
      checks: (T, exp) => {
        const Some = exp.Some as (v: any) => any;
        const None = exp.None as () => any;

        T.check('Some maps the value and stays an Option', () => {
          const r = Some(2).map((n: number) => n + 1);
          return (r && r.isSome === true && r.getOrElse(0) === 3) || `Got ${T.fmt(r)}, expected Some(3).`;
        });

        T.check('None ignores map entirely', () => {
          const spy = T.spyFn((n: number) => n + 1);
          const r = None().map(spy);
          if (spy.calls.length > 0) return 'map ran the function on None. Skipping it is the whole point.';
          return r && r.isSome === false || `Got ${T.fmt(r)}. Mapping None should still give None.`;
        });

        T.check('getOrElse hands back the value when there is one', () => {
          const r = Some(5).getOrElse(99);
          return r === 5 || `Got ${T.fmt(r)}. The fallback is only for None.`;
        });

        T.check('getOrElse hands back the fallback when there is not', () => {
          const r = None().getOrElse(99);
          return r === 99 || `Got ${T.fmt(r)}`;
        });

        T.check('chain does not double-wrap', () => {
          const r = Some(2).chain((n: number) => Some(n * 10));
          return (
            r && r.isSome === true && r.getOrElse(0) === 20 ||
            `Got ${T.fmt(r)}, expected Some(20). If the value came back as an Option, chain wrapped a result that was already wrapped.`
          );
        });

        T.check('chain can turn a Some into a None', () => {
          const r = Some(2).chain(() => None());
          return (r && r.isSome === false) || `Got ${T.fmt(r)}. A lookup that fails mid-chain has to be able to say so.`;
        });

        T.check('A chain of lookups short-circuits on the first miss', () => {
          const find = (o: any, k: string) => (k in o ? Some(o[k]) : None());
          const deep = (o: any) => find(o, 'a').chain((x: any) => find(x, 'b')).chain((x: any) => find(x, 'c'));
          const hit = deep({ a: { b: { c: 'found' } } }).getOrElse('missing');
          const miss = deep({ a: {} }).getOrElse('missing');
          if (hit !== 'found') return `A complete path gave ${T.fmt(hit)} instead of "found".`;
          return miss === 'missing' || `A broken path gave ${T.fmt(miss)} instead of falling through to the default.`;
        });

        laws.functor(T, { of: Some, equals: (a: any, b: any) => a.getOrElse('!') === b.getOrElse('!'), runs: 50 });
        laws.monad(T, {
          of: Some,
          lift: Some,
          equals: (a: any, b: any) => a.getOrElse('!') === b.getOrElse('!'),
          runs: 50,
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Read a nested field safely',
      prompt:
        'Using the Option given, write `cityOf`, which reads `user.address.city` and falls back to "unknown" when any step is missing.',
      hints: ['`prop` already returns an Option. Chain the steps and finish with `getOrElse`.'],
      exports: ['cityOf'],
      starter: `const Some = (value) => ({
  isSome: true, value,
  map: (f) => Some(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})
const None = () => ({
  isSome: false,
  map: () => None(),
  chain: () => None(),
  getOrElse: (fallback) => fallback
})

const prop = (k) => (o) =>
  o != null && o[k] != null ? Some(o[k]) : None()

// cityOf :: User -> String
const cityOf = (user) => {
}
`,
      solution: `const Some = (value) => ({
  isSome: true, value,
  map: (f) => Some(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})
const None = () => ({
  isSome: false,
  map: () => None(),
  chain: () => None(),
  getOrElse: (fallback) => fallback
})

const prop = (k) => (o) =>
  o != null && o[k] != null ? Some(o[k]) : None()

// cityOf :: User -> String
const cityOf = (user) =>
  prop('address')(user).chain(prop('city')).getOrElse('unknown')
`,
      broken: [
        // Reaches into the value directly, which crashes when address is missing.
        `const Some = (value) => ({ isSome: true, value, map: (f) => Some(f(value)), chain: (f) => f(value), getOrElse: () => value })
const None = () => ({ isSome: false, map: () => None(), chain: () => None(), getOrElse: (fallback) => fallback })
const prop = (k) => (o) => (o != null && o[k] != null ? Some(o[k]) : None())

const cityOf = (user) => prop('address')(user).value.city
`,
        // Uses map where chain is needed, so the result is an Option inside an Option.
        `const Some = (value) => ({ isSome: true, value, map: (f) => Some(f(value)), chain: (f) => f(value), getOrElse: () => value })
const None = () => ({ isSome: false, map: () => None(), chain: () => None(), getOrElse: (fallback) => fallback })
const prop = (k) => (o) => (o != null && o[k] != null ? Some(o[k]) : None())

const cityOf = (user) => prop('address')(user).map(prop('city')).getOrElse('unknown')
`,
      ],
      checks: (T, exp) => {
        const cityOf = exp.cityOf as (u: any) => string;

        T.check('A complete record gives the city', () => {
          const r = cityOf({ address: { city: 'Paris' } });
          return r === 'Paris' || `Got ${T.fmt(r)}`;
        });

        T.check('A missing city falls back', () => {
          const r = cityOf({ address: {} });
          return r === 'unknown' || `Got ${T.fmt(r)}`;
        });

        T.check('A missing address falls back rather than throwing', () => {
          const r = cityOf({});
          return r === 'unknown' || `Got ${T.fmt(r)}`;
        });

        T.check('Null and undefined are handled too', () => {
          const a = cityOf(null);
          const b = cityOf({ address: null });
          return (a === 'unknown' && b === 'unknown') || `Got ${T.fmt(a)} and ${T.fmt(b)}.`;
        });

        T.check('The result is a plain string, not an Option', () => {
          const r = cityOf({ address: { city: 'Paris' } });
          return (
            typeof r === 'string' ||
            `Got ${T.fmt(r)}. getOrElse is the way out of Option, and it should be the last step.`
          );
        });
      },
    },
  ],
};
