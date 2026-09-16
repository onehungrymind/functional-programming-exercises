import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const alternative: ExerciseSet = {
  termId: 'alternative',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Fall back to the other one',
      prompt:
        '`alt` picks the first of two that actually has something. Give Maybe an `alt` and a `zero`, and you can chain fallbacks.',
      hints: [
        'On a Just, alt keeps what it has and ignores the alternative.',
        'On Nothing, alt hands back whatever it was offered.',
        '`zero` is the empty case: Nothing.',
      ],
      exports: ['Just', 'Nothing'],
      starter: `const Just = (value) => ({
  isNothing: false,
  value,
  map: (f) => Just(f(value)),
  alt: (other) => {
  },
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})

const Nothing = () => ({
  isNothing: true,
  map: () => Nothing(),
  alt: (other) => {
  },
  inspect: () => 'Nothing'
})

Just.zero = () => Nothing()
`,
      solution: `const Just = (value) => ({
  isNothing: false,
  value,
  map: (f) => Just(f(value)),
  alt: (other) => Just(value),
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})

const Nothing = () => ({
  isNothing: true,
  map: () => Nothing(),
  alt: (other) => other,
  inspect: () => 'Nothing'
})

Just.zero = () => Nothing()
`,
      broken: [
        // Always prefers the right-hand side, so the first success is thrown away.
        `const Just = (value) => ({
  isNothing: false, value,
  map: (f) => Just(f(value)),
  alt: (other) => other,
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})
const Nothing = () => ({ isNothing: true, map: () => Nothing(), alt: (other) => other, inspect: () => 'Nothing' })
Just.zero = () => Nothing()
`,
        // Nothing keeps itself, so a fallback never wins.
        `const Just = (value) => ({
  isNothing: false, value,
  map: (f) => Just(f(value)),
  alt: () => Just(value),
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})
const Nothing = () => ({ isNothing: true, map: () => Nothing(), alt: () => Nothing(), inspect: () => 'Nothing' })
Just.zero = () => Nothing()
`,
      ],
      checks: (T, exp) => {
        const Just = exp.Just as any;
        const Nothing = exp.Nothing as any;

        T.check('A Just keeps what it has', () => {
          const r = Just(1).alt(Just(2));
          return r?.value === 1 || `Got ${T.fmt(r)}, expected Just(1). The first success wins.`;
        });

        T.check('A Nothing takes the alternative', () => {
          const r = Nothing().alt(Just(2));
          return (r?.isNothing === false && r.value === 2) || `Got ${T.fmt(r)}, expected Just(2).`;
        });

        T.check('Two Nothings stay Nothing', () => {
          const r = Nothing().alt(Nothing());
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('A chain of fallbacks takes the first that has something', () => {
          const r = Nothing().alt(Nothing()).alt(Just('third')).alt(Just('fourth'));
          return r?.value === 'third' || `Got ${T.fmt(r)}, expected Just("third").`;
        });

        T.check('zero is the empty case', () => {
          const z = Just.zero();
          return z?.isNothing === true || `Got ${T.fmt(z)}`;
        });

        T.check('zero steps aside on either side', () => {
          const left = Just.zero().alt(Just(1));
          const right = Just(1).alt(Just.zero());
          return (
            left?.value === 1 && right?.value === 1 ||
            `zero.alt(Just(1)) gave ${T.fmt(left)} and Just(1).alt(zero) gave ${T.fmt(right)}, expected Just(1) for both.`
          );
        });

        const equals = (a: any, b: any) => a.isNothing === b.isNothing && (a.isNothing || a.value === b.value);
        laws.alternative(T, { of: Just, zero: () => Nothing(), equals, runs: 50 });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Try several sources in order',
      prompt:
        'Write `firstAvailable`, which reads a key from a list of sources and returns the first one that has it, or Nothing.',
      hints: ['Turn each source into a Maybe and combine them with alt.'],
      exports: ['firstAvailable'],
      starter: `const Just = (value) => ({ isNothing: false, value, alt: () => Just(value) })
const Nothing = () => ({ isNothing: true, alt: (other) => other })

const lookup = (key) => (source) =>
  key in source ? Just(source[key]) : Nothing()

// firstAvailable :: (String, [Object]) -> Maybe a
const firstAvailable = (key, sources) => {
}
`,
      solution: `const Just = (value) => ({ isNothing: false, value, alt: () => Just(value) })
const Nothing = () => ({ isNothing: true, alt: (other) => other })

const lookup = (key) => (source) =>
  key in source ? Just(source[key]) : Nothing()

// firstAvailable :: (String, [Object]) -> Maybe a
const firstAvailable = (key, sources) =>
  sources.map(lookup(key)).reduce((acc, m) => acc.alt(m), Nothing())
`,
      broken: [
        // Reduces the other way round, so the last source wins.
        `const Just = (value) => ({ isNothing: false, value, alt: () => Just(value) })
const Nothing = () => ({ isNothing: true, alt: (other) => other })
const lookup = (key) => (source) => (key in source ? Just(source[key]) : Nothing())

const firstAvailable = (key, sources) =>
  sources.map(lookup(key)).reduceRight((acc, m) => acc.alt(m), Nothing())
`,
        // Starts from a Just, so it never sees any source at all.
        `const Just = (value) => ({ isNothing: false, value, alt: () => Just(value) })
const Nothing = () => ({ isNothing: true, alt: (other) => other })
const lookup = (key) => (source) => (key in source ? Just(source[key]) : Nothing())

const firstAvailable = (key, sources) =>
  sources.map(lookup(key)).reduce((acc, m) => acc.alt(m), Just('default'))
`,
      ],
      checks: (T, exp) => {
        const firstAvailable = exp.firstAvailable as (k: string, s: Record<string, any>[]) => any;

        T.check('The first source that has the key wins', () => {
          const r = firstAvailable('port', [{}, { port: 8080 }, { port: 9090 }]);
          return r?.value === 8080 || `Got ${T.fmt(r)}, expected Just(8080).`;
        });

        T.check('Earlier sources take precedence', () => {
          const r = firstAvailable('port', [{ port: 1 }, { port: 2 }]);
          return (
            r?.value === 1 ||
            `Got ${T.fmt(r)}, expected Just(1). The order of the list is the order of precedence.`
          );
        });

        T.check('No source having it gives Nothing', () => {
          const r = firstAvailable('port', [{}, { host: 'x' }]);
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('An empty list of sources gives Nothing', () => {
          const r = firstAvailable('port', []);
          return (
            r?.isNothing === true ||
            `Got ${T.fmt(r)}. With nothing to look in, the answer has to be the empty case rather than a made-up default.`
          );
        });

        T.check('A value of 0 or false still counts as present', () => {
          const r = firstAvailable('debug', [{ debug: false }, { debug: true }]);
          return (
            r?.value === false ||
            `Got ${T.fmt(r)}. Present-but-falsy is still present, which is why the check is on the key, not the value.`
          );
        });
      },
    },
  ],
};
