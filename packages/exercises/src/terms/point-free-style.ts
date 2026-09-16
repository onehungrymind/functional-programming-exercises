import type { ExerciseSet } from '@fpx/engine/types';

export const pointFreeStyle: ExerciseSet = {
  termId: 'point-free-style',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which definitions are point-free?',
      prompt:
        'Point-free means the definition never names the data it operates on. Select every definition that manages it.',
      options: [
        { code: 'const inc = map(add(1))', correct: true, why: 'No parameter is introduced. It is built from other functions.' },
        {
          code: 'const inc = (xs) => map(add(1))(xs)',
          correct: false,
          why: 'It names `xs` only to pass it straight through, which is the argument point-free style removes.',
        },
        {
          code: 'const total = reduce(add, 0)',
          correct: true,
          why: 'Two arguments are fixed and the data is never mentioned.',
        },
        {
          code: 'const shout = compose(exclaim, upper)',
          correct: true,
          why: 'A composition of two functions, and no parameter anywhere.',
        },
        {
          code: 'const pairUp = (a) => (b) => [a, b]',
          correct: false,
          why: 'It introduces two parameters. Naming arguments is fine, it is just not point-free.',
        },
      ],
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Remove the arguments',
      prompt:
        'All three definitions below name an argument only to hand it straight on. Rewrite each one without it.',
      hints: [
        'Wherever the body is `f(g(x))` and the parameter is `x`, the definition is `compose(f, g)`.',
        '`countOf` needs two steps composed; the others need one.',
      ],
      exports: ['shout', 'evens', 'countOf'],
      starter: `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
const map = (fn) => (xs) => xs.map(fn)
const filter = (fn) => (xs) => xs.filter(fn)
const prop = (k) => (o) => o[k]
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'
const isEven = (n) => n % 2 === 0
const length = (xs) => xs.length

// Rewrite all three without naming an argument:
const shout = (s) => exclaim(upper(s))
const evens = (xs) => filter(isEven)(xs)
const countOf = (k) => (o) => length(prop(k)(o))
`,
      solution: `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
const map = (fn) => (xs) => xs.map(fn)
const filter = (fn) => (xs) => xs.filter(fn)
const prop = (k) => (o) => o[k]
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'
const isEven = (n) => n % 2 === 0
const length = (xs) => xs.length

const shout = compose(exclaim, upper)
const evens = filter(isEven)
const countOf = (k) => compose(length, prop(k))
`,
      broken: [
        // The starter: all three still name their argument.
        `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
const filter = (fn) => (xs) => xs.filter(fn)
const prop = (k) => (o) => o[k]
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'
const isEven = (n) => n % 2 === 0
const length = (xs) => xs.length

const shout = (s) => exclaim(upper(s))
const evens = filter(isEven)
const countOf = (k) => compose(length, prop(k))
`,
        // Point-free, but countOf composed the wrong way round.
        `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
const filter = (fn) => (xs) => xs.filter(fn)
const prop = (k) => (o) => o[k]
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'
const isEven = (n) => n % 2 === 0
const length = (xs) => xs.length

const shout = compose(exclaim, upper)
const evens = filter(isEven)
const countOf = (k) => compose(prop(k), length)
`,
        // Point-free, but filtering the wrong half.
        `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
const filter = (fn) => (xs) => xs.filter(fn)
const prop = (k) => (o) => o[k]
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'
const isEven = (n) => n % 2 === 0
const length = (xs) => xs.length

const shout = compose(exclaim, upper)
const evens = filter((n) => !isEven(n))
const countOf = (k) => compose(length, prop(k))
`,
      ],
      checks: (T, exp) => {
        const shout = exp.shout as (s: string) => string;
        const evens = exp.evens as (xs: number[]) => number[];
        const countOf = exp.countOf as (k: string) => (o: any) => number;

        T.check('shout upper-cases then adds the mark', () => {
          const r = shout('hi');
          return r === 'HI!' || `shout("hi") gave ${T.fmt(r)}, expected "HI!".`;
        });

        T.check('evens keeps the even numbers', () => {
          const r = evens([1, 2, 3, 4]);
          return T.eq(r, [2, 4]) || `Got ${T.fmt(r)}`;
        });

        T.check('countOf reads a list off an object and measures it', () => {
          const r = countOf('tags')({ tags: ['a', 'b', 'c'] });
          return r === 3 || `Got ${T.fmt(r)}`;
        });

        T.check('shout is point-free', () => T.shape.isPointFree('shout'));
        T.check('evens is point-free', () => T.shape.isPointFree('evens'));

        T.check('countOf introduces only its key, never the object', () => {
          // countOf is allowed one parameter, the key. What it must not name is the record.
          const m = T.src.match(/const\s+countOf\s*=\s*\(?\s*(\w+)\s*\)?\s*=>\s*([\s\S]*?)(?:\n(?=const|$)|$)/);
          if (!m) return 'Could not find the countOf definition.';
          const body = m[2] ?? '';
          return (
            !/=>/.test(body) ||
            `countOf still names the record it reads from: ${body.trim().split('\n')[0]}. Only the key should be a parameter.`
          );
        });
      },
    },
  ],
};
