import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const pointedFunctor: ExerciseSet = {
  termId: 'pointed-functor',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'A functor that knows how to lift',
      prompt:
        'A Pointed Functor is a functor with an `of` that puts any value into the most ordinary container it can. Add one to Box.',
      hints: [
        '`of` should do the least interesting thing possible: just wrap the value.',
        'It hangs off the constructor, so `Box.of(3)` works without an existing Box.',
      ],
      exports: ['Box'],
      starter: `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})

// of :: a -> Box a
Box.of = (value) => {
}
`,
      solution: `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})

// of :: a -> Box a
Box.of = (value) => Box(value)
`,
      broken: [
        // of does something extra, so it is no longer the neutral lift.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = (value) => Box(value * 2)
`,
        // of hands back the bare value.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = (value) => value
`,
        // of flattens a Box that is handed to it, which of must not do.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = (value) => (value && value.map ? value : Box(value))
`,
      ],
      checks: (T, exp) => {
        const Box = exp.Box as any;

        T.check('of gives back a Box', () => {
          const r = Box.of(3);
          return (r && typeof r.map === 'function') || `Got ${T.fmt(r)}`;
        });

        T.check('of wraps the value unchanged', () => {
          const r = Box.of(3);
          return r.value === 3 || `Box.of(3) holds ${T.fmt(r.value)}. of is the neutral way in: it should add nothing.`;
        });

        T.check('of does nothing clever with a container', () => {
          const inner = Box(1);
          const r = Box.of(inner);
          return (
            r.value === inner ||
            `Box.of(Box(1)) unwrapped its argument. of lifts exactly one level, whatever it is given. Flattening is chain's job.`
          );
        });

        T.law('Lifting then mapping equals lifting the applied value', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const left = Box.of(n).map(f.f).value;
          const right = Box.of(f.f(n)).value;
          return (
            left === right ||
            `With n = ${n}, f = ${f.name}: mapping after of gave ${T.fmt(left)}, of after applying gave ${T.fmt(right)}.`
          );
        });

        laws.functor(T, { of: (x: any) => Box.of(x), runs: 50 });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is of allowed to do?',
      prompt: 'Pick the rule `of` has to follow.',
      options: [
        {
          code: '// Put the value in the container and nothing else',
          correct: true,
          why: 'of is the neutral way in. Anything extra would break the laws that build on it.',
        },
        {
          code: '// Validate the value and reject bad ones',
          correct: false,
          why: 'That would make of partial, and the applicative laws assume it always succeeds.',
        },
        {
          code: '// Flatten the value if it is already a container',
          correct: false,
          why: 'of always adds exactly one layer. Removing one is what chain does.',
        },
        {
          code: '// Pick the most appropriate case for the value',
          correct: false,
          why: 'Tempting for something like Either, but of has to be predictable. It always goes to the same side.',
        },
      ],
    },
  ],
};
