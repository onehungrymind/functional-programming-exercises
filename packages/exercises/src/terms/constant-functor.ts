import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const constantFunctor: ExerciseSet = {
  termId: 'constant-functor',
  rubric: [
    {
      id: 'map-does-nothing',
      statement:
        "Can write a map that discards its function and keeps the carried value, still returning a mappable container.",
    },
    {
      id: 'lawful',
      statement:
        "Knows both functor laws hold precisely because nothing happens, and can say why.",
    },
    {
      id: 'what-it-is-for',
      statement:
        "Can say what Const buys you: accumulating a value while a generic traversal runs, which is how a lens getter is built.",
    },
  ],
  notes: `\`Const\` is a functor whose \`map\` throws the function away and keeps what it is carrying.

\`\`\`js
const Const = (value) => ({
  value,
  map: (f) => Const(value)      // f is never called
})

Const(5).map((n) => n * 100)    // Const(5)
Const('kept').map(() => 'replaced').map(() => 'again')   // Const('kept')
\`\`\`

Both functor laws hold, and they hold **because** nothing happens:

\`\`\`js
Const(5).map((x) => x)              // Const(5). Identity, trivially.
Const(5).map(f).map(g)              // Const(5)
Const(5).map((x) => g(f(x)))        // Const(5). Composition, trivially.
\`\`\`

That makes it sound useless, and its use is genuinely non-obvious: it is how you get a **getter
out of a setter**.

A van Laarhoven lens is one function parameterized by a functor. Run it with a functor that
applies its function and you get a setter. Run the very same code with \`Const\` and the
mapping does nothing while the payload travels back out:

\`\`\`js
// one definition
const nameLens = (F) => (f) => (s) => f(s.name).map((name) => ({ ...s, name }))

// with Identity: a setter
nameLens(Identity)((n) => Identity(n.toUpperCase()))({ name: 'ada', age: 36 })
// Identity({ name: 'ADA', age: 36 })

// with Const: a getter, because the rebuild is discarded
nameLens(Const)((n) => Const(n))({ name: 'ada', age: 36 })
// Const('ada')
\`\`\`

One traversal, two behaviours, decided entirely by which functor you hand it. That is the whole
trick behind optics libraries.`,
  rungs: [
    {
      id: 'implement',
      covers: ['map-does-nothing', 'lawful'],
      kind: 'code',
      role: 'implement',
      title: 'A functor whose map does nothing',
      prompt:
        '`Const` carries a value that `map` never touches. It still satisfies both functor laws, which is the surprising part.',
      hints: [
        '`map` has to give back a Const carrying the same value, ignoring the function entirely.',
        'Identity holds because nothing changed. Composition holds for the same reason.',
      ],
      exports: ['Const'],
      starter: `// Const :: a -> Const a b
const Const = (value) => ({
  value,
  map: (f) => {
    // f never runs
  },
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      solution: `// Const :: a -> Const a b
const Const = (value) => ({
  value,
  map: (f) => Const(value),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // Applies the function, which makes it an ordinary Identity functor.
        `const Const = (value) => ({
  value,
  map: (f) => Const(f(value)),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
        // Gives back the bare value, so you cannot map again.
        `const Const = (value) => ({
  value,
  map: (f) => value,
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const Const = exp.Const as (v: any) => any;

        T.check('map leaves the value alone', () => {
          const r = Const(5).map((n: number) => n * 100);
          return r?.value === 5 || `Got ${T.fmt(r)}, expected Const(5). The function is discarded.`;
        });

        T.check('The function is never called', () => {
          const spy = T.spyFn((n: number) => n);
          Const(5).map(spy);
          return spy.calls.length === 0 || `The function ran with ${T.fmt(spy.calls[0])}. Const drops it without looking.`;
        });

        T.check('map still gives back a Const', () => {
          const r = Const(5).map((n: number) => n);
          return typeof r?.map === 'function' || `Got ${T.fmt(r)}. You have to be able to go on mapping.`;
        });

        T.check('Mapping many times changes nothing', () => {
          const r = Const('kept').map((s: string) => s.toUpperCase()).map(() => 'replaced');
          return r?.value === 'kept' || `Got ${T.fmt(r)}`;
        });

        laws.functor(T, { of: Const, runs: 60 });
      },
    },

    {
      id: 'recognize',
      covers: ['what-it-is-for'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is Const good for?',
      prompt: 'A functor that ignores every function sounds useless. What does it actually buy you?',
      options: [
        {
          code: '// It collects a value while a generic traversal walks a structure,\n// which is how a lens getter is built',
          correct: true,
          why: 'Run a traversal with Const and the payload accumulates while the mapping does nothing. That is the trick behind van Laarhoven lenses.',
        },
        {
          code: '// It makes mapping faster',
          correct: false,
          why: 'It does skip the work, but nobody reaches for Const for speed.',
        },
        {
          code: '// It stops the value ever being read',
          correct: false,
          why: 'The value is perfectly readable. It is the mapping that is inert.',
        },
        {
          code: '// It is a placeholder with no real use',
          correct: false,
          why: 'It earns its place in optics, where the same traversal serves as both a getter and a setter depending which functor you hand it.',
        },
      ],
    },
  ],
};
