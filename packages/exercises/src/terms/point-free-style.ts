import type { ExerciseSet } from '@fpx/engine/types';

export const pointFreeStyle: ExerciseSet = {
  termId: 'point-free-style',
  rubric: [
    {
      id: 'spot-it',
      statement:
        "Can tell a point-free definition from one that names an argument only to pass it straight on.",
    },
    {
      id: 'remove-the-point',
      statement:
        "Can rewrite a definition to drop the argument it never really used, using composition or a curried helper.",
    },
    {
      id: 'when-not-to',
      statement:
        "Knows point-free is a readability choice, not a virtue, and can say when naming the argument is clearer.",
    },
  ],
  notes: `Point-free means the definition never names the data it works on. The "point" is the argument.

\`\`\`js
const incrementAll = (xs) => map(add(1))(xs)   // names xs to pass it straight on
const incrementAll = map(add(1))               // point-free
\`\`\`

The move is mechanical. Wherever the body is \`f(g(x))\` and the parameter is \`x\`, the
definition is \`compose(f, g)\`:

\`\`\`js
const shout = (s) => exclaim(upper(s))
const shout = compose(exclaim, upper)

const countOf = (k) => (o) => length(prop(k)(o))
const countOf = (k) => compose(length, prop(k))   // k is a real argument, keep it
\`\`\`

This only works because the helpers are [curried](#currying). \`map\` taking its function first
and its list second is what leaves a list-shaped hole to drop.

It is a readability choice, not a virtue. Point-free shines when the composition reads as a
sentence, and hurts when it forces contortions:

\`\`\`js
// clear
const activeNames = compose(map(prop('name')), filter(prop('active')))

// technically point-free, and worse for everyone
const avg = converge(divide, [sum, length])
const avg = (xs) => sum(xs) / xs.length
\`\`\`

When you reach for a combinator whose name you have to look up, name the argument instead.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['spot-it', 'when-not-to'],
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
      covers: ['remove-the-point', 'spot-it'],
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

    {
      id: 'judgement',
      kind: 'code',
      role: 'apply',
      covers: ['when-not-to', 'remove-the-point', 'spot-it'],
      title: "Go point-free one way, and back the other",
      prompt:
        "Point-free is a readability choice, not a virtue. Make `activeNames` point-free because it reads better that way, and give `taxOn` its argument back because it does not.",
      hints: [
        "`activeNames` is a chain of maps and filters over one argument that it only passes along.",
        "`taxOn` is a tangle of curried helpers doing arithmetic. Naming the amount makes it ordinary again.",
        "Neither direction is the right answer everywhere. That is the whole point of the rung.",
      ],
      exports: ['activeNames', 'taxOn'],
      starter: `const prop = (k) => (o) => o[k]
const filterBy = (p) => (xs) => xs.filter(p)
const mapWith = (f) => (xs) => xs.map(f)
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)

const multiply = (a) => (b) => a * b
const add = (a) => (b) => a + b

// activeNames :: [User] -> [String]   make this point-free
const activeNames = (users) => users.filter(prop('active')).map(prop('name'))

// taxOn :: Number -> Number   give this one its argument back
const taxOn = compose(Math.round, add(5), multiply(0.2))
`,
      solution: `const prop = (k) => (o) => o[k]
const filterBy = (p) => (xs) => xs.filter(p)
const mapWith = (f) => (xs) => xs.map(f)
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)

const multiply = (a) => (b) => a * b
const add = (a) => (b) => a + b

// activeNames :: [User] -> [String]
const activeNames = compose(mapWith(prop('name')), filterBy(prop('active')))

// taxOn :: Number -> Number
const taxOn = (amount) => Math.round(amount * 0.2 + 5)
`,
      broken: [
        `const prop = (k) => (o) => o[k]
const filterBy = (p) => (xs) => xs.filter(p)
const mapWith = (f) => (xs) => xs.map(f)
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)
const multiply = (a) => (b) => a * b
const add = (a) => (b) => a + b

const activeNames = (users) => users.filter(prop('active')).map(prop('name'))
const taxOn = (amount) => Math.round(amount * 0.2 + 5)
`,
        `const prop = (k) => (o) => o[k]
const filterBy = (p) => (xs) => xs.filter(p)
const mapWith = (f) => (xs) => xs.map(f)
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)
const multiply = (a) => (b) => a * b
const add = (a) => (b) => a + b

const activeNames = compose(mapWith(prop('name')), filterBy(prop('active')))
const taxOn = compose(Math.round, add(5), multiply(0.2))
`,
        `const prop = (k) => (o) => o[k]
const filterBy = (p) => (xs) => xs.filter(p)
const mapWith = (f) => (xs) => xs.map(f)
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)
const multiply = (a) => (b) => a * b
const add = (a) => (b) => a + b

const activeNames = compose(filterBy(prop('active')), mapWith(prop('name')))
const taxOn = (amount) => Math.round(amount * 0.2 + 5)
`,
      ],
      checks: (T, exp) => {
        const { activeNames, taxOn } = exp;
        const users = () => [
          { name: 'ada', active: true },
          { name: 'bob', active: false },
          { name: 'cy', active: true },
        ];

        T.check('activeNames keeps the active ones and takes their names', () => {
          const r = activeNames(users());
          return T.eq(r, ['ada', 'cy']) || `activeNames gave ${T.fmt(r)}, expected ['ada', 'cy'].`;
        });

        T.check('activeNames filters before it maps', () => {
          const r = activeNames([{ name: 'x', active: false }]);
          return T.eq(r, []) || `An all-inactive list gave ${T.fmt(r)}. Mapping first throws the flag away before anything can filter on it.`;
        });

        T.check('activeNames never names its argument', () => T.shape.isPointFree('activeNames'));

        T.check('taxOn still computes the same number', () => {
          const r = taxOn(100);
          return r === 25 || `taxOn(100) gave ${T.fmt(r)}, expected 25.`;
        });

        T.law('taxOn agrees with the arithmetic at every amount', 60, (G) => {
          const n = G.nat() * 7;
          const r = taxOn(n);
          const want = Math.round(n * 0.2 + 5);
          return r === want || `taxOn(${n}) gave ${T.fmt(r)}, expected ${want}.`;
        });

        T.check('taxOn names its argument now', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const line = src.split('\n').find((l) => /const\s+taxOn\s*=/.test(l)) ?? '';
          return (
            /=>/.test(line) && !/compose\s*\(/.test(line)
              ? true
              : 'taxOn is still built out of compose. This half of the rung is the judgement call: when the pieces are arithmetic, the named argument reads better and there is no prize for avoiding it.'
          );
        });
      },
    },
  ],
};
