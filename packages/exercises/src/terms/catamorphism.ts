import type { ExerciseSet } from '@fpx/engine/types';

export const catamorphism: ExerciseSet = {
  termId: 'catamorphism',
  rubric: [
    {
      id: 'fold-to-a-value',
      statement:
        "Can write a fold and express several operations in terms of it, differing only in the step and the seed.",
    },
    {
      id: 'seed-is-the-identity',
      statement:
        "Knows the seed decides the empty case and must be the identity for the operation.",
    },
    {
      id: 'direction',
      statement:
        "Knows cata tears down where ana builds up, and that neither is tied to lists.",
    },
  ],
  notes: `A catamorphism tears a structure down to a single value. For a list that is a fold, and the
only things that vary are the step and the seed.

\`\`\`js
const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(acc, x)
  return acc
}

const sum    = cata((a, b) => a + b)(0)
const max    = cata((a, b) => (b > a ? b : a))(-Infinity)
const length = cata((a) => a + 1)(0)
\`\`\`

The seed is not an implementation detail: it **is** the empty case, and getting it wrong is
silent until someone passes an empty list.

\`\`\`js
sum([])                          // 0    correct
cata((a, b) => a + b)(1)([])     // 1    quietly wrong
\`\`\`

And it has to be the identity for the operation, or a non-empty list goes wrong too:

\`\`\`js
const max = cata((a, b) => (b > a ? b : a))(0)
max([-5, -2, -9])   // 0, which is not in the list
\`\`\`

Note also that \`length\`'s step ignores its element entirely, which is what makes it work for
lists of anything, including falsy values:

\`\`\`js
length([0, '', null, false, 1])   // 5
cata((a, b) => (b ? a + 1 : a))(0)([0, '', null, false, 1])   // 1
\`\`\`

The name generalizes beyond lists: a catamorphism folds any recursive structure, so the same
idea covers summing a tree or evaluating an expression. Its opposite is
[anamorphism](#anamorphism), which builds one up.`,
  rungs: [
    {
      id: 'implement',
      covers: ['fold-to-a-value', 'seed-is-the-identity'],
      kind: 'code',
      role: 'implement',
      title: 'Collapse a structure to a value',
      prompt:
        'A catamorphism tears a structure down to one value. Write `cata` once, then express sum, max, and length in terms of it.',
      hints: [
        '`cata` is a fold: an accumulator, a step, and a list.',
        'Each of the three is the same fold with a different step and seed.',
      ],
      exports: ['cata', 'sum', 'max', 'length'],
      starter: `// cata :: ((b, a) -> b) -> b -> [a] -> b
const cata = (step) => (seed) => (xs) => {
}

// Express all three with cata:
const sum = null
const max = null
const length = null
`,
      solution: `// cata :: ((b, a) -> b) -> b -> [a] -> b
const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(acc, x)
  return acc
}

const sum = cata((a, b) => a + b)(0)
const max = cata((a, b) => (b > a ? b : a))(-Infinity)
const length = cata((a) => a + 1)(0)
`,
      broken: [
        // Applies the step with the arguments the wrong way round.
        `const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(x, acc)
  return acc
}
const sum = cata((a, b) => a + b)(0)
const max = cata((a, b) => (b > a ? b : a))(-Infinity)
const length = cata((a) => a + 1)(0)
`,
        // The seeds are wrong, so the empty cases lie.
        `const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(acc, x)
  return acc
}
const sum = cata((a, b) => a + b)(1)
const max = cata((a, b) => (b > a ? b : a))(0)
const length = cata((a) => a + 1)(0)
`,
        // length counts the elements it likes the look of.
        `const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(acc, x)
  return acc
}
const sum = cata((a, b) => a + b)(0)
const max = cata((a, b) => (b > a ? b : a))(-Infinity)
const length = cata((a, b) => (b ? a + 1 : a))(0)
`,
      ],
      checks: (T, exp) => {
        const sum = exp.sum as (xs: number[]) => number;
        const max = exp.max as (xs: number[]) => number;
        const length = exp.length as (xs: unknown[]) => number;

        T.check('sum adds them up', () => {
          const r = sum([1, 2, 3, 4]);
          return r === 10 || `Got ${T.fmt(r)}`;
        });

        T.check('max finds the largest', () => {
          const r = max([3, 9, 2]);
          return r === 9 || `Got ${T.fmt(r)}`;
        });

        T.check('max works when every number is negative', () => {
          const r = max([-5, -2, -9]);
          return (
            r === -2 ||
            `Got ${T.fmt(r)}. A seed of 0 would win here, which is why the seed has to be smaller than anything possible.`
          );
        });

        T.check('length counts everything, including falsy elements', () => {
          const r = length([0, '', null, false, 1]);
          return (
            r === 5 ||
            `Got ${T.fmt(r)}. The step for length ignores the element entirely, so nothing can be skipped for being falsy.`
          );
        });

        T.check('The empty cases are the identities', () => {
          const s = sum([]);
          const l = length([]);
          if (s !== 0) return `sum([]) gave ${T.fmt(s)}, expected 0.`;
          return l === 0 || `length([]) gave ${T.fmt(l)}, expected 0.`;
        });

        T.check('The step sees the accumulator first', () => {
          const order: string[] = [];
          const cata = exp.cata as (s: (a: any, b: any) => any) => (seed: any) => (xs: any[]) => any;
          cata((acc: string, x: string) => {
            order.push(`${acc}|${x}`);
            return acc;
          })('seed')(['a']);
          return (
            T.eq(order, ['seed|a']) ||
            `The step was called as ${T.fmt(order)}. It takes the accumulator first and the element second.`
          );
        });

        T.law('sum agrees with adding by hand', 60, (G) => {
          const xs = G.ints();
          const want = xs.reduce((a, b) => a + b, 0);
          const got = sum(xs);
          return got === want || `On ${T.fmt(xs)}: got ${T.fmt(got)}, expected ${want}.`;
        });
      },
    },

    {
      id: 'recognize',
      covers: ['direction'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which direction?',
      prompt: 'A catamorphism and an anamorphism are opposites. Which is which?',
      options: [
        {
          code: '// cata tears a structure down to a value;\n// ana builds a structure up from a value',
          correct: true,
          why: 'Cata is a fold, ana is an unfold. The Greek is "downwards" and "upwards".',
        },
        {
          code: '// cata builds up; ana tears down',
          correct: false,
          why: 'The right idea, the wrong way round.',
        },
        {
          code: '// Both tear down, but cata is recursive',
          correct: false,
          why: 'Both are recursive. It is the direction that differs.',
        },
        {
          code: '// cata works on lists; ana works on trees',
          correct: false,
          why: 'Neither is tied to a shape. Both are defined for any recursive structure.',
        },
      ],
    },

    {
      id: 'direction',
      kind: 'code',
      role: 'break',
      covers: ['direction', 'fold-to-a-value', 'seed-is-the-identity'],
      title: "Show that the direction matters",
      prompt:
        "Write `foldLeft` and `foldRight` yourself, then find the operation where they disagree. For an associative operation with the right seed they always agree, and that is why the difference is easy to forget until it bites.",
      hints: [
        "`foldLeft` starts from the seed and works along the list. `foldRight` starts from the far end and comes back.",
        "Subtraction is not associative. That is the whole exercise.",
        "`agree` runs both and compares, so it needs to call each one exactly once.",
      ],
      exports: ['foldLeft', 'foldRight', 'agree'],
      starter: `// foldLeft :: (((b, a) -> b), b, [a]) -> b
const foldLeft = (f, seed, xs) => seed

// foldRight :: (((a, b) -> b), b, [a]) -> b
const foldRight = (f, seed, xs) => seed

// agree :: (((x, y) -> z), z, [a]) -> Boolean
const agree = (f, seed, xs) => true
`,
      solution: `// foldLeft :: (((b, a) -> b), b, [a]) -> b
const foldLeft = (f, seed, xs) => {
  let acc = seed
  for (const x of xs) acc = f(acc, x)
  return acc
}

// foldRight :: (((a, b) -> b), b, [a]) -> b
const foldRight = (f, seed, xs) => {
  let acc = seed
  for (let i = xs.length - 1; i >= 0; i -= 1) acc = f(xs[i], acc)
  return acc
}

// agree :: (((x, y) -> z), z, [a]) -> Boolean
const agree = (f, seed, xs) =>
  JSON.stringify(foldLeft(f, seed, xs)) === JSON.stringify(foldRight(f, seed, xs))
`,
      broken: [
        `const foldLeft = (f, seed, xs) => {
  let acc = seed
  for (const x of xs) acc = f(acc, x)
  return acc
}
const foldRight = (f, seed, xs) => {
  let acc = seed
  for (const x of xs) acc = f(x, acc)
  return acc
}
const agree = (f, seed, xs) =>
  JSON.stringify(foldLeft(f, seed, xs)) === JSON.stringify(foldRight(f, seed, xs))
`,
        `const foldLeft = (f, seed, xs) => {
  let acc = seed
  for (let i = xs.length - 1; i >= 0; i -= 1) acc = f(acc, xs[i])
  return acc
}
const foldRight = (f, seed, xs) => {
  let acc = seed
  for (let i = xs.length - 1; i >= 0; i -= 1) acc = f(xs[i], acc)
  return acc
}
const agree = (f, seed, xs) =>
  JSON.stringify(foldLeft(f, seed, xs)) === JSON.stringify(foldRight(f, seed, xs))
`,
        `const foldLeft = (f, seed, xs) => {
  let acc = seed
  for (const x of xs) acc = f(acc, x)
  return acc
}
const foldRight = (f, seed, xs) => {
  let acc = seed
  for (let i = xs.length - 1; i >= 0; i -= 1) acc = f(xs[i], acc)
  return acc
}
const agree = (f, seed, xs) => true
`,
      ],
      checks: (T, exp) => {
        const { foldLeft, foldRight, agree } = exp;
        const sub = (a: number, b: number) => a - b;
        const add = (a: number, b: number) => a + b;

        T.check('Both fold a sum the same way', () => {
          const a = foldLeft(add, 0, [1, 2, 3]);
          const b = foldRight(add, 0, [1, 2, 3]);
          return (a === 6 && b === 6) || `Left gave ${T.fmt(a)} and right gave ${T.fmt(b)}, and both should be 6.`;
        });

        T.check('foldLeft subtracts from the front', () => {
          const r = foldLeft(sub, 0, [1, 2, 3]);
          return r === -6 || `foldLeft(sub, 0, [1, 2, 3]) gave ${T.fmt(r)}. Working along the list gives ((0-1)-2)-3.`;
        });

        T.check('foldRight subtracts from the back', () => {
          const r = foldRight(sub, 0, [1, 2, 3]);
          return r === 2 || `foldRight(sub, 0, [1, 2, 3]) gave ${T.fmt(r)}. Coming back from the far end gives 1-(2-(3-0)).`;
        });

        T.check('The two really disagree on subtraction', () => {
          const r = agree(sub, 0, [1, 2, 3]);
          return (
            r === false ||
            `agree reported ${T.fmt(r)} for subtraction. If they match, one of the folds is going the wrong way.`
          );
        });

        T.check('And they agree on addition', () => {
          const r = agree(add, 0, [1, 2, 3, 4]);
          return r === true || `agree reported ${T.fmt(r)} for addition, which is associative with 0 as its identity.`;
        });

        T.check('The argument order and the travel direction both differ', () => {
          // Two elements, not one: with a single element a fold that walks the list
          // backwards produces the same shape as one that walks it forwards.
          const shape = (a: unknown, b: unknown) => '(' + a + ' ' + b + ')';
          const l = foldLeft(shape, 'z', ['a', 'b']);
          const r = foldRight(shape, 'z', ['a', 'b']);
          if (l !== '((z a) b)') {
            return `foldLeft gave ${T.fmt(l)}, expected '((z a) b)'. It starts at the seed, takes the first element, and works along.`;
          }
          return r === '(a (b z))' || `foldRight gave ${T.fmt(r)}, expected '(a (b z))'. It starts at the far end and comes back.`;
        });

        T.check('The empty list gives the seed back, both ways', () => {
          const a = foldLeft(sub, 7, []);
          const b = foldRight(sub, 7, []);
          return (
            a === 7 && b === 7 ||
            `Left gave ${T.fmt(a)} and right gave ${T.fmt(b)}. With nothing to fold, the seed is the answer, which is why it has to be the identity for the two to line up.`
          );
        });

        T.law('Rebuilding a list from the right gives it back', 60, (G) => {
          const xs = G.ints();
          const r = foldRight((x: number, acc: number[]) => [x, ...acc], [] as number[], xs);
          return T.eq(r, xs) || `${T.fmt(xs)} rebuilt as ${T.fmt(r)}.`;
        });
      },
    },
  ],
};
