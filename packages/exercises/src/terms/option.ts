import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const option: ExerciseSet = {
  termId: 'option',
  rubric: [
    {
      id: 'absence-in-the-type',
      statement:
        "Knows Option makes \"there might be nothing\" part of the type, and that map on None skips the function entirely.",
    },
    {
      id: 'map-chain-getorelse',
      statement:
        "Can write map, chain and getOrElse, and knows chain is for a function that already returns an Option.",
    },
    {
      id: 'one-exit',
      statement:
        "Can chain a sequence of lookups so a miss anywhere short-circuits, with getOrElse as the only way out.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read an Option as a tagged union and say why `getOrElse` returns a plain value while `map` does not.",
    },
  ],
  notes: `Option puts "there might be nothing here" into the type, so the check happens once at the end
rather than at every step.

\`\`\`js
const Some = (value) => ({
  isSome: true, value,
  map: (f) => Some(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})
const None = () => ({
  isSome: false,
  map: () => None(),        // f never runs
  chain: () => None(),
  getOrElse: (fallback) => fallback
})
\`\`\`

\`map\` is for a plain function; \`chain\` is for one that already returns an Option. Using map
where chain belongs leaves you holding an Option of an Option:

\`\`\`js
const prop = (k) => (o) => (o != null && o[k] != null ? Some(o[k]) : None())

Some(user).map(prop('address'))    // Some(Some({...}))
Some(user).chain(prop('address'))  // Some({...})
\`\`\`

The payoff is a chain that short-circuits on the first miss, with no null checks in between:

\`\`\`js
const cityOf = (user) =>
  prop('address')(user).chain(prop('city')).getOrElse('unknown')

cityOf({ address: { city: 'Paris' } })   // 'Paris'
cityOf({ address: {} })                  // 'unknown'
cityOf({})                               // 'unknown'
cityOf(null)                             // 'unknown'
\`\`\`

Compare that with the version it replaces:

\`\`\`js
const cityOf = (user) => {
  if (user == null) return 'unknown'
  if (user.address == null) return 'unknown'
  if (user.address.city == null) return 'unknown'
  return user.address.city
}
\`\`\`

\`getOrElse\` is the way out, and it belongs **last**. Reaching for \`.value\` partway through
throws the whole thing away.`,
  typedNotes: `Same track, second lap. Option is the concept that was invented for a type system, so this is
where it finally reads the way it was meant to.

\`\`\`ts
type Option<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }
\`\`\`

A union of two shapes, told apart by a tag. Notice what is NOT there: the \`none\` case has no
\`value\` field at all. Absence is not a null sitting in the slot, it is a shape with no slot.

That is what makes the compiler useful here. Reach for \`.value\` without checking the tag and
it is an error, because the \`none\` half does not have one:

\`\`\`ts
const shout = (o: Option<string>) => o.value.toUpperCase()  // error

const shout = (o: Option<string>) =>
  o.tag === 'some' ? o.value.toUpperCase() : 'nothing'      // fine
\`\`\`

The \`o.tag === 'some'\` test narrows the union to the half that has a value. You cannot forget
the empty case, because forgetting it does not compile. That is the whole pitch.

Now the three operations, and the thing to read is what each one gives back:

\`\`\`ts
const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a === null || a === undefined ? { tag: 'none' } : { tag: 'some', value: a }

const map = <A, B>(f: (a: A) => B, o: Option<A>): Option<B> =>
  o.tag === 'some' ? { tag: 'some', value: f(o.value) } : o

const getOrElse = <A>(fallback: A, o: Option<A>): A =>
  o.tag === 'some' ? o.value : fallback
\`\`\`

\`map\` returns \`Option<B>\`, still wrapped, so it can be chained forever. \`getOrElse\` returns
plain \`A\`. It is the only one of the three whose return type has no Option in it, and that is
what "one exit" means: the type tells you where the optionality stops.

\`fromNullable\` is the door in, and its argument type \`A | null | undefined\` is doing the
narrowing. Everything downstream gets an \`A\` that really is an \`A\`.`,
  rungs: [
    {
      id: 'implement',
      covers: ['absence-in-the-type', 'map-chain-getorelse'],
      kind: 'code',
      role: 'implement',
      title: 'Some, None, and the three ways out',
      prompt:
        "Option makes \"there might be nothing here\" part of the type. Give it `map`, `chain`, and `getOrElse`, so a missing value flows through without a single null check. The constructors `Some` and `None` are yours to write too.",
      hints: [
        '`map` on None does nothing and stays None. On Some it applies the function and rewraps.',
        '`chain` is for a function that itself returns an Option, so do not wrap the result again.',
        '`getOrElse` is the only way out. It is where the default finally appears.',
      ],
      sidequests: [
        { termId: 'monad', why: "Option's `chain` is the same operation Maybe has. The laws it obeys are covered there." },
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
      covers: ['one-exit', 'map-chain-getorelse'],
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['absence-in-the-type', 'one-exit', 'typed-signature'],
      title: "Satisfy Option<A>",
      prompt:
        "The type is given. Write `fromNullable`, `map` and `getOrElse` so that absence survives a map and only `getOrElse` hands back a bare value.",
      hints: [
        "Test `o.tag === 'some'` before touching `o.value`. In the other branch there is no value to touch.",
        "`map` returns `Option<B>`. On the empty case there is nothing to apply `f` to, so hand the empty case straight back.",
        "Only `null` and `undefined` count as absent. `0` and `''` are values.",
      ],
      sidequests: [
        { termId: 'monad', why: "Chaining several lookups that can each come back empty is the pattern this is an instance of." },
      ],
      exports: ['fromNullable', 'map', 'getOrElse'],
      starter: `type Option<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const fromNullable = <A>(a: A | null | undefined): Option<A> => ({ tag: 'none' })

const map = <A, B>(f: (a: A) => B, o: Option<A>): Option<B> => ({ tag: 'none' })

const getOrElse = <A>(fallback: A, o: Option<A>): A => fallback
`,
      solution: `type Option<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a === null || a === undefined ? { tag: 'none' } : { tag: 'some', value: a }

const map = <A, B>(f: (a: A) => B, o: Option<A>): Option<B> =>
  o.tag === 'some' ? { tag: 'some', value: f(o.value) } : o

const getOrElse = <A>(fallback: A, o: Option<A>): A =>
  o.tag === 'some' ? o.value : fallback
`,
      broken: [
        `type Option<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a ? { tag: 'some', value: a } : { tag: 'none' }

const map = <A, B>(f: (a: A) => B, o: Option<A>): Option<B> =>
  o.tag === 'some' ? { tag: 'some', value: f(o.value) } : o

const getOrElse = <A>(fallback: A, o: Option<A>): A =>
  o.tag === 'some' ? o.value : fallback
`,
        `type Option<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a === null || a === undefined ? { tag: 'none' } : { tag: 'some', value: a }

const map = <A, B>(f: (a: A) => B, o: Option<A>): Option<B> =>
  ({ tag: 'some', value: f((o as { value: A }).value) })

const getOrElse = <A>(fallback: A, o: Option<A>): A =>
  o.tag === 'some' ? o.value : fallback
`,
        `type Option<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a === null || a === undefined ? { tag: 'none' } : { tag: 'some', value: a }

const map = <A, B>(f: (a: A) => B, o: Option<A>): Option<B> =>
  o.tag === 'some' ? { tag: 'some', value: f(o.value) } : o

const getOrElse = <A>(fallback: A, o: Option<A>): A =>
  (o.tag === 'some' ? o : fallback) as A
`,
      ],
      checks: (T, exp) => {
        T.check('The annotations are still doing work', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          if (/(:\s*any\b)|(\bas\s+any\b)/.test(src)) {
            return 'The answer leans on `any`, which satisfies nothing. The point is to satisfy the signature.';
          }
          return true;
        });
        const { fromNullable, map, getOrElse } = exp;
        const some = (v: unknown) => ({ tag: 'some', value: v });
        const none = { tag: 'none' };

        T.check('A real value becomes a some', () => {
          const r = fromNullable('ada');
          return T.eq(r, some('ada')) || `fromNullable('ada') gave ${T.fmt(r)}.`;
        });

        T.check('null and undefined become a none', () => {
          const a = fromNullable(null);
          const b = fromNullable(undefined);
          return (a.tag === 'none' && b.tag === 'none') || `null gave ${T.fmt(a)} and undefined gave ${T.fmt(b)}.`;
        });

        T.check('Zero and the empty string are values, not absence', () => {
          const a = fromNullable(0);
          const b = fromNullable('');
          return (
            (T.eq(a, some(0)) && T.eq(b, some(''))) ||
            `fromNullable(0) gave ${T.fmt(a)} and fromNullable('') gave ${T.fmt(b)}. Falsy is not the same as missing.`
          );
        });

        T.check('map reaches inside a some', () => {
          const r = map((n: number) => n * 2, some(21));
          return T.eq(r, some(42)) || `Doubling inside a some gave ${T.fmt(r)}.`;
        });

        T.check('map leaves a none alone', () => {
          let ran = false;
          const r = map((n: number) => { ran = true; return n * 2; }, none);
          if (ran) return 'The function ran on an empty Option. There is no value in that shape to hand it.';
          return r.tag === 'none' || `Mapping a none gave ${T.fmt(r)}.`;
        });

        T.check('getOrElse hands back a bare value, not an Option', () => {
          const r = getOrElse(0, some(42));
          return r === 42 || `getOrElse(0, some(42)) gave ${T.fmt(r)}. This is the one exit, so what comes out is the value itself.`;
        });

        T.check('getOrElse falls back when there is nothing', () => {
          const r = getOrElse(0, none);
          return r === 0 || `getOrElse(0, none) gave ${T.fmt(r)}.`;
        });

        T.law('Mapping with identity changes nothing', 60, (G) => {
          const o = G.bool() ? some(G.int()) : none;
          const r = map((x: number) => x, o);
          return T.eq(r, o) || `${T.fmt(o)} came back as ${T.fmt(r)}.`;
        });

        T.law('Mapping twice is mapping the composition', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const g = G.fn();
          const twice = map(g.f, map(f.f, some(n)));
          const once = map((x: number) => g.f(f.f(x)), some(n));
          return T.eq(twice, once) || `With ${f.name} then ${g.name} on ${n}: ${T.fmt(twice)} against ${T.fmt(once)}.`;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'absence-in-the-type'],
      title: "Falsy is not the same as missing",
      prompt:
        "`fromNullable` takes `A | null | undefined`, and nothing else counts as absent. Type an array of the four results, each already unwrapped with a fallback of -1.",
      hints: [
        "Only `null` and `undefined` go to the empty case.",
        "`0` and `''` are perfectly good values, so they survive and get doubled or measured.",
        "`getOrElse` returns a bare `A`, which is why these come out as plain values.",
      ],
      context: `type Option<A> = { tag: 'some', value: A } | { tag: 'none' }

const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a === null || a === undefined ? { tag: 'none' } : { tag: 'some', value: a }

const map = <A, B>(f: (a: A) => B, o: Option<A>): Option<B> =>
  o.tag === 'some' ? { tag: 'some', value: f(o.value) } : o

const getOrElse = <A>(fallback: A, o: Option<A>): A =>
  o.tag === 'some' ? o.value : fallback
`,
      placeholder: "[..., ..., ..., ...]",
      expect: [-1,0,-1,0],
      solution: "[getOrElse(-1, map((n: number) => n * 2, fromNullable<number>(null))), getOrElse(-1, map((n: number) => n * 2, fromNullable(0))), getOrElse(-1, map((s: string) => s.length, fromNullable<string>(undefined))), getOrElse(-1, map((s: string) => s.length, fromNullable('')))]",
      broken: ["[-1, -1, -1, -1]", "[-1, 0, -1, -1]", "[0, 0, 0, 0]"],
    },
  ],
};
