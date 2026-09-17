import type { ExerciseSet } from '@fpx/engine/types';

export const totalFunction: ExerciseSet = {
  termId: 'total-function',
  rubric: [
    {
      id: 'definition',
      statement:
        'Knows total means an answer for every input in the domain, and that not throwing is necessary but not sufficient.',
    },
    {
      id: 'widen-the-output',
      statement:
        'Can make a function total by widening what it returns, rather than by inventing a value it does not have.',
    },
    {
      id: 'identity-for-empty',
      statement: 'Knows the empty case usually has a right answer already, and can say what it is for a sum, a product, and a repeat.',
    },
  ],
  notes: `Total means an answer for every input the signature admits. No throwing, no \`undefined\` where a
value was promised, no hanging.

There are exactly two ways to get there.

**Widen the output**, so the signature admits what was always the case:

\`\`\`js
// first :: [a] -> a          a lie
const first = (xs) => xs[0]

// first :: [a] -> Option a   true
const first = (xs) => (xs.length ? Some(xs[0]) : None())
\`\`\`

**Narrow the input**, so the question with no answer cannot be asked:

\`\`\`js
// head :: NonEmptyList a -> a
\`\`\`

What does not work is inventing a value. The test is whether the result **says which case it
is**:

\`\`\`js
const first = (xs) => xs[0] ?? null    // the signature still says a
first([])       // null. Is that the first element, or a failure?

const first = (xs) => (xs.length ? { found: true, value: xs[0] } : { found: false })
first([])       // { found: false }. Unambiguous.
first([null])   // { found: true, value: null }. Still unambiguous.
\`\`\`

The empty case deserves its own paragraph, because people reach for an error when there is a
right answer sitting there:

\`\`\`js
[].reduce((a, b) => a + b)      // TypeError: Reduce of empty array with no initial value
[].reduce((a, b) => a + b, 0)   // 0

sum([])       // 0    adding nothing changes nothing
product([])   // 1    multiplying by nothing changes nothing
'ab'.repeat(0) // ''  repeating nothing changes nothing
\`\`\`

In each case it is the value that leaves the other operand alone, which is exactly the
[monoid](#monoid) identity.`,
  rungs: [
    {
      id: 'implement',
      covers: ['widen-the-output', 'identity-for-empty'],
      kind: 'code',
      role: 'implement',
      title: 'Make three functions total',
      prompt:
        'Each of these is undefined somewhere. Give every input an answer: `sum` of an empty list, `first` of an empty list, and `times` with a negative count.',
      hints: [
        'An empty sum is 0, because adding nothing changes nothing.',
        '`first` cannot invent an element, so widen what it returns instead: `{ found: false }` when there is none.',
        'A negative repeat count is the same as repeating zero times.',
      ],
      exports: ['sum', 'first', 'times'],
      starter: `// sum :: [Number] -> Number
const sum = (xs) => xs.reduce((a, b) => a + b)

// first :: [a] -> { found :: Boolean, value :: a }
const first = (xs) => ({ found: true, value: xs[0] })

// times :: Number -> String -> String
const times = (n, s) => s.repeat(n)
`,
      solution: `// sum :: [Number] -> Number
const sum = (xs) => xs.reduce((a, b) => a + b, 0)

// first :: [a] -> { found :: Boolean, value :: a }
const first = (xs) => (xs.length > 0 ? { found: true, value: xs[0] } : { found: false })

// times :: Number -> String -> String
const times = (n, s) => (n > 0 ? s.repeat(n) : '')
`,
      broken: [
        // The starter: reduce with no seed throws, first lies, repeat throws.
        `const sum = (xs) => xs.reduce((a, b) => a + b)
const first = (xs) => ({ found: true, value: xs[0] })
const times = (n, s) => s.repeat(n)
`,
        // Guards the throws but still claims to have found something.
        `const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const first = (xs) => ({ found: true, value: xs[0] })
const times = (n, s) => (n > 0 ? s.repeat(n) : '')
`,
        // Returns a sentinel string instead of widening the type.
        `const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const first = (xs) => (xs.length ? { found: true, value: xs[0] } : 'none')
const times = (n, s) => (n > 0 ? s.repeat(n) : '')
`,
      ],
      checks: (T, exp) => {
        const sum = exp.sum as (xs: number[]) => number;
        const first = exp.first as (xs: any[]) => { found: boolean; value?: any };
        const times = exp.times as (n: number, s: string) => string;

        T.check('sum still adds a normal list', () => {
          const r = sum([1, 2, 3]);
          return r === 6 || `sum([1, 2, 3]) gave ${T.fmt(r)}`;
        });

        T.check('sum of nothing is 0', () => {
          const r = sum([]);
          return r === 0 || `sum([]) gave ${T.fmt(r)}. Adding nothing leaves you where you started.`;
        });

        T.law('sum never throws and always gives a number', 80, (G) => {
          const xs = G.ints();
          const r = sum(xs);
          return typeof r === 'number' || `sum(${T.fmt(xs)}) gave ${T.fmt(r)}`;
        });

        T.check('first reports what it found', () => {
          const r = first([10, 20]);
          return (r && r.found === true && r.value === 10) || `first([10, 20]) gave ${T.fmt(r)}`;
        });

        T.check('first says so when there is nothing', () => {
          const r = first([]);
          if (!r || typeof r !== 'object') return `first([]) gave ${T.fmt(r)}. Widen the return type rather than returning a sentinel.`;
          return (
            r.found === false ||
            `first([]) reported found: ${T.fmt(r.found)}. There is no first element of an empty list, so say so instead of claiming undefined.`
          );
        });

        T.check('first never claims a value it does not have', () => {
          const r = first([]);
          return (
            r.value === undefined ||
            `first([]) came back carrying ${T.fmt(r.value)}. Nothing was found, so there should be nothing to read.`
          );
        });

        T.check('times still repeats', () => {
          const r = times(3, 'ab');
          return r === 'ababab' || `times(3, "ab") gave ${T.fmt(r)}`;
        });

        T.check('A count of zero or less gives the empty string', () => {
          const zero = times(0, 'ab');
          const neg = times(-2, 'ab');
          if (zero !== '') return `times(0, "ab") gave ${T.fmt(zero)}`;
          return neg === '' || `times(-2, "ab") gave ${T.fmt(neg)}. Repeating a negative number of times is the same as not repeating.`;
        });

        T.law('times never throws, whatever the count', 80, (G) => {
          const n = G.int();
          const r = times(n, 'x');
          return typeof r === 'string' || `times(${n}, "x") gave ${T.fmt(r)}`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'expr',
      role: 'recognize',
      covers: ['identity-for-empty', 'definition'],
      title: 'What should the empty case give?',
      prompt:
        'Each of these folds has a right answer for the empty list, and it is never an error. Write them as an array, in order.',
      hints: [
        'The answer is whatever leaves the other operand alone.',
        'Adding it changes nothing, multiplying by it changes nothing, joining it changes nothing.',
      ],
      context: `// sum of no numbers
// product of no numbers
// concatenation of no strings
// "all of these are true" over no booleans`,
      placeholder: '[0, ...]',
      expect: [0, 1, '', true],
      solution: "[0, 1, '', true]",
      broken: [
        // Reaches for zero everywhere, which annihilates the product.
        "[0, 0, '', true]",
        // Treats "all of nothing" as false, which breaks the identity.
        "[0, 1, '', false]",
        // Assumes the empty cases have no answer.
        '[null, null, null, null]',
      ],
    },


    {
      id: 'prove-it',
      kind: 'code',
      role: 'apply',
      covers: ['definition', 'widen-the-output'],
      title: "Prove totality across a domain",
      prompt:
        "Total means defined for every input in the domain, which is a claim you can check. Write `isTotal`, then widen `at` so it becomes total over any index.",
      hints: [
        "A function is not defined at an input if it throws, or returns undefined, or returns NaN.",
        "`isTotal` has to survive a throw, so guard each call on its own.",
        "Widening means every index gets an answer, including the negative and the far-off ones.",
      ],
      exports: ['isTotal', 'at'],
      starter: `// isTotal :: ((a -> b), [a]) -> Boolean
const isTotal = (f, domain) => true

// at :: ([a], Number) -> a | null
const at = (xs, i) => xs[i]
`,
      solution: `// isTotal :: ((a -> b), [a]) -> Boolean
const isTotal = (f, domain) =>
  domain.every((x) => {
    try {
      const r = f(x)
      return r !== undefined && !(typeof r === 'number' && Number.isNaN(r))
    } catch {
      return false
    }
  })

// at :: ([a], Number) -> a | null
const at = (xs, i) => (i >= 0 && i < xs.length ? xs[i] : null)
`,
      broken: [
        `const isTotal = (f, domain) => {
  try {
    return domain.every((x) => f(x) !== undefined)
  } catch {
    return false
  }
}
const at = (xs, i) => (i >= 0 && i < xs.length ? xs[i] : null)
`,
        `const isTotal = (f, domain) =>
  domain.some((x) => {
    try {
      const r = f(x)
      return r !== undefined && !(typeof r === 'number' && Number.isNaN(r))
    } catch { return false }
  })
const at = (xs, i) => (i >= 0 && i < xs.length ? xs[i] : null)
`,
        `const isTotal = (f, domain) =>
  domain.every((x) => {
    try {
      const r = f(x)
      return r !== undefined && !(typeof r === 'number' && Number.isNaN(r))
    } catch { return false }
  })
const at = (xs, i) => xs[i]
`,
      ],
      checks: (T, exp) => {
        const { isTotal, at } = exp;

        T.check('A function defined everywhere is total', () => {
          return isTotal((n: number) => n * 2, [-1, 0, 1]) === true || 'Doubling was reported as partial.';
        });

        T.check('A throw makes it partial', () => {
          const f = (n: number) => {
            if (n === 0) throw new Error('nope');
            return n;
          };
          const r = isTotal(f, [-1, 0, 1]);
          return r === false || `A function throwing at zero was reported as ${T.fmt(r)}.`;
        });

        T.check('isTotal survives the throw rather than dying on it', () => {
          const f = (n: number) => {
            if (n < 2) throw new Error('nope');
            return n;
          };
          let crashed = false;
          try {
            isTotal(f, [0, 1, 2]);
          } catch {
            crashed = true;
          }
          return !crashed || 'The throw escaped. Each input needs its own guard, or the survey dies on the first gap.';
        });

        T.check('A silent undefined makes it partial too', () => {
          const half = (n: number) => (n % 2 === 0 ? n / 2 : undefined);
          return isTotal(half, [1, 2]) === false || `A function returning undefined for odds was reported as ${T.fmt(isTotal(half, [1, 2]))}.`;
        });

        T.check('NaN counts as a gap', () => {
          return isTotal((s: string) => Number(s), ['1', 'x']) === false || `Parsing was reported as total.`;
        });

        T.check('Every input has to hold, not just one', () => {
          const f = (n: number) => (n === 0 ? 0 : undefined);
          return isTotal(f, [0, 1, 2]) === false || 'A function defined only at zero was reported as total.';
        });

        T.check('at answers for an index that is there', () => {
          return at([4, 5, 6], 1) === 5 || `at([4, 5, 6], 1) gave ${T.fmt(at([4, 5, 6], 1))}.`;
        });

        T.check('at answers for an index that is not', () => {
          const got = [at([1], 5), at([1], -1)];
          return T.eq(got, [null, null]) || `Out of range gave ${T.fmt(got)}. Widening the output is what makes every index answerable.`;
        });

        T.check('at is total over a wide domain', () => {
          const domain = [-5, -1, 0, 1, 2, 99];
          const r = isTotal((i: number) => at([1, 2, 3], i), domain);
          return r === true || `Your own isTotal reports at as partial over ${T.fmt(domain)}.`;
        });
      },
    },
  ],
};
