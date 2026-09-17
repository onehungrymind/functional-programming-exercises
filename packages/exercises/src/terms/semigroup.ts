import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const semigroup: ExerciseSet = {
  termId: 'semigroup',
  rubric: [
    {
      id: 'concat-stays-inside',
      statement:
        "Can write a concat that returns the same type, so three values can be combined in one chain.",
    },
    {
      id: 'associativity',
      statement:
        "Knows associativity is the only requirement, and can name operations that have it and ones that do not.",
    },
    {
      id: 'several-instances',
      statement:
        "Knows one type can be a semigroup in several ways, and that the wrapper is what picks which.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `concat` and say that the three `A`s are what closure means: whatever goes in, the same type comes out.",
    },
  ],
  notes: `A Semigroup is a type with an associative \`concat\`. That is the whole definition: no identity,
no inverse, nothing else.

\`\`\`js
const Max = (value) => ({
  value,
  concat: (other) => Max(value > other.value ? value : other.value)
})

Max(3).concat(Max(7))            // Max(7)
Max(1).concat(Max(9)).concat(Max(5))   // Max(9)
\`\`\`

\`concat\` has to stay **inside** the type, or the second link in the chain has nothing to call:

\`\`\`js
concat: (other) => Math.max(value, other.value)   // gives a number
Max(1).concat(Max(2)).concat(Max(3))              // TypeError
\`\`\`

Associativity means the grouping cannot change the answer:

\`\`\`js
(1 + 2) + 3 === 1 + (2 + 3)      // addition: yes
(1 - 2) - 3 === 1 - (2 - 3)      // subtraction: -4 vs 2. No.
(8 / 4) / 2 === 8 / (4 / 2)      // division: 1 vs 4. No.
\`\`\`

Even "always keep the left one" is associative, which is why \`First\` is a legitimate semigroup
if not a very exciting one.

A type is usually a semigroup in **more than one way**, and the wrapper is how you choose:

\`\`\`js
Max(3).concat(Max(7)).value    // 7
Min(3).concat(Min(7)).value    // 3
Sum(3).concat(Sum(7)).value    // 10
\`\`\`

That is why they are wrapped at all. \`Number\` on its own does not say which combination you
meant.`,
  typedNotes: `Same track, second lap. One line, three mentions of the same variable.

\`\`\`ts
interface Semigroup<A> {
  concat: (a: A, b: A) => A
}
\`\`\`

In, in, out, all \`A\`. That is closure, and it is the property the whole concept rests on. A
function of type \`(a: A, b: A) => B\` is a perfectly reasonable thing to write and it is not a
semigroup, because you cannot apply it to its own result. Combining has to keep you where you
started or you cannot keep combining.

That is also why the same type can have several of them. The type variable is the set, and the
function is the operation, so pick a different operation and you get a different instance:

\`\`\`ts
const maxSemigroup: Semigroup<number> = { concat: (a, b) => Math.max(a, b) }
const minSemigroup: Semigroup<number> = { concat: (a, b) => Math.min(a, b) }
const sumSemigroup: Semigroup<number> = { concat: (a, b) => a + b }
const firstSemigroup: Semigroup<number> = { concat: (a) => a }
\`\`\`

All four are \`Semigroup<number>\` and all four are different. \`first\` is worth a second look:
it ignores \`b\` entirely, which the signature permits, and it is still associative. Being
lawful does not mean being interesting.

Because the type is closed, folding needs no special case except the empty list:

\`\`\`ts
const fold = <A>(S: Semigroup<A>, xs: A[]): A =>
  xs.reduce(S.concat)   // throws on []
\`\`\`

\`reduce\` with no seed is exactly the shape a semigroup gives you, and exactly where it runs
out. There is no value of type \`A\` to start from, because \`A\` is a variable and the interface
does not carry one. Adding that value is the entire difference between this and a
[monoid](#monoid), and in the types it is a single extra field.

\`\`\`ts
interface Monoid<A> extends Semigroup<A> {
  empty: A
}
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['concat-stays-inside', 'associativity', 'several-instances'],
      kind: 'code',
      role: 'implement',
      title: 'Three ways to combine two things',
      prompt:
        'A Semigroup has a `concat` that is associative. Write three of them over numbers: `Max` keeps the larger of the two, `Min` keeps the smaller, and `First` keeps the one it was called on and ignores the other.',
      hints: [
        'Each `concat` takes another value of the same type and gives one back.',
        'Associativity is what makes them semigroups. `First` is associative even though it ignores its argument.',
      ],
      exports: ['Max', 'Min', 'First'],
      starter: `// Each concat takes another of the same kind and returns another of the same kind, never a
// bare number, which is what lets the result be concatenated again.
//   Max(3).concat(Max(7))        ->  Max(7)
//   Max(3).concat(Max(7)).value  ->  7
const Max = (value) => ({
  value,
  concat: (other) => {
    // keep whichever of the two values is larger
  },
  inspect: () => \`Max(\${value})\`
})

const Min = (value) => ({
  value,
  concat: (other) => {
    // keep whichever of the two values is smaller
  },
  inspect: () => \`Min(\${value})\`
})

const First = (value) => ({
  value,
  concat: (other) => {
    // keep this one and ignore the other entirely
  },
  inspect: () => \`First(\${value})\`
})
`,
      solution: `const Max = (value) => ({
  value,
  concat: (other) => Max(value > other.value ? value : other.value),
  inspect: () => \`Max(\${value})\`
})

const Min = (value) => ({
  value,
  concat: (other) => Min(value < other.value ? value : other.value),
  inspect: () => \`Min(\${value})\`
})

const First = (value) => ({
  value,
  concat: (other) => First(value),
  inspect: () => \`First(\${value})\`
})
`,
      broken: [
        // Max and Min swapped.
        `const Max = (value) => ({ value, concat: (other) => Max(Math.min(value, other.value)), inspect: () => \`Max(\${value})\` })
const Min = (value) => ({ value, concat: (other) => Min(Math.max(value, other.value)), inspect: () => \`Min(\${value})\` })
const First = (value) => ({ value, concat: (other) => First(value), inspect: () => \`First(\${value})\` })
`,
        // concat gives back a raw number, so you cannot concat again.
        `const Max = (value) => ({ value, concat: (other) => Math.max(value, other.value), inspect: () => \`Max(\${value})\` })
const Min = (value) => ({ value, concat: (other) => Min(Math.min(value, other.value)), inspect: () => \`Min(\${value})\` })
const First = (value) => ({ value, concat: (other) => First(value), inspect: () => \`First(\${value})\` })
`,
        // First keeps the last instead, and subtraction is not associative.
        `const Max = (value) => ({ value, concat: (other) => Max(Math.max(value, other.value)), inspect: () => \`Max(\${value})\` })
const Min = (value) => ({ value, concat: (other) => Min(Math.min(value, other.value)), inspect: () => \`Min(\${value})\` })
const First = (value) => ({ value, concat: (other) => First(value - other.value), inspect: () => \`First(\${value})\` })
`,
      ],
      checks: (T, exp) => {
        const Max = exp.Max as (n: number) => any;
        const Min = exp.Min as (n: number) => any;
        const First = exp.First as (n: number) => any;

        T.check('Max keeps the larger', () => {
          const r = Max(3).concat(Max(7));
          return r?.value === 7 || `Got ${T.fmt(r)}, expected Max(7).`;
        });

        T.check('Min keeps the smaller', () => {
          const r = Min(3).concat(Min(7));
          return r?.value === 3 || `Got ${T.fmt(r)}, expected Min(3).`;
        });

        T.check('First keeps the left-hand one', () => {
          const r = First(3).concat(First(7));
          return r?.value === 3 || `Got ${T.fmt(r)}, expected First(3).`;
        });

        T.check('concat gives back something you can concat again', () => {
          const r = Max(1).concat(Max(2));
          return (
            typeof r?.concat === 'function' ||
            `Got ${T.fmt(r)}. concat has to stay inside the type, or a chain of three cannot work.`
          );
        });

        T.check('Three combine in one chain', () => {
          const r = Max(1).concat(Max(9)).concat(Max(5));
          return r?.value === 9 || `Got ${T.fmt(r)}, expected Max(9).`;
        });

        laws.semigroup(T, { of: Max, lift: Max, runs: 50 });
        laws.semigroup(T, { of: Min, lift: Min, runs: 50 });
        laws.semigroup(T, { of: First, lift: First, runs: 50 });
      },
    },

    {
      id: 'recognize',
      covers: ['associativity'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which operations are associative?',
      prompt: 'A semigroup needs associativity and nothing else. Select every operation that has it.',
      options: [
        { code: '(a, b) => a + b', correct: true, why: 'Addition groups either way.' },
        {
          code: '(a, b) => a - b',
          correct: false,
          why: '(1 - 2) - 3 is -4, but 1 - (2 - 3) is 2.',
        },
        { code: '(a, b) => Math.max(a, b)', correct: true, why: 'The largest of three is the largest however you group them.' },
        {
          code: '(a, b) => a / b',
          correct: false,
          why: 'Division is not associative either. Try 8, 4, 2.',
        },
        { code: '(a, b) => a.concat(b)  // string concat', correct: true, why: 'Joining text groups either way.' },
        { code: '(a, b) => a', correct: true, why: 'Always keeping the left one is associative, if not very useful.' },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['concat-stays-inside', 'several-instances', 'typed-signature'],
      title: "Satisfy Semigroup<number> three times",
      prompt:
        "The interface is given. Write three different instances over the same type: `maxSemigroup`, `minSemigroup` and `firstSemigroup`.",
      hints: [
        "All three have the identical signature. Only the body differs, which is the point of the rung.",
        "`firstSemigroup` ignores its second argument. That is allowed, and it is still associative.",
        "Nothing here may return anything but a number, or the result could not be combined again.",
      ],
      exports: ['maxSemigroup', 'minSemigroup', 'firstSemigroup'],
      starter: `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

const maxSemigroup: Semigroup<number> = { concat: (a, b) => 0 }

const minSemigroup: Semigroup<number> = { concat: (a, b) => 0 }

const firstSemigroup: Semigroup<number> = { concat: (a, b) => 0 }
`,
      solution: `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

const maxSemigroup: Semigroup<number> = { concat: (a, b) => Math.max(a, b) }

const minSemigroup: Semigroup<number> = { concat: (a, b) => Math.min(a, b) }

const firstSemigroup: Semigroup<number> = { concat: (a, b) => a }
`,
      broken: [
        `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

const maxSemigroup: Semigroup<number> = { concat: (a, b) => Math.max(a, b) }

const minSemigroup: Semigroup<number> = { concat: (a, b) => Math.max(a, b) }

const firstSemigroup: Semigroup<number> = { concat: (a, b) => a }
`,
        `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

const maxSemigroup: Semigroup<number> = { concat: (a, b) => [a, b].sort() as never }

const minSemigroup: Semigroup<number> = { concat: (a, b) => Math.min(a, b) }

const firstSemigroup: Semigroup<number> = { concat: (a, b) => a }
`,
        `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

const maxSemigroup: Semigroup<number> = { concat: (a, b) => Math.max(a, b) }

const minSemigroup: Semigroup<number> = { concat: (a, b) => Math.min(a, b) }

const firstSemigroup: Semigroup<number> = { concat: (a, b) => b }
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
        T.check('The Semigroup declaration is still there to satisfy', () => {
          return /interface\s+Semigroup/.test(T.src) || 'The Semigroup declaration has gone. It is the thing being satisfied.';
        });
        const { maxSemigroup, minSemigroup, firstSemigroup } = exp;

        T.check('max keeps the larger', () => {
          const r = maxSemigroup.concat(3, 7);
          return r === 7 || `concat(3, 7) on max gave ${T.fmt(r)}.`;
        });

        T.check('min keeps the smaller', () => {
          const r = minSemigroup.concat(3, 7);
          return r === 3 || `concat(3, 7) on min gave ${T.fmt(r)}.`;
        });

        T.check('first keeps the left one and ignores the right', () => {
          const r = firstSemigroup.concat(3, 7);
          return r === 3 || `concat(3, 7) on first gave ${T.fmt(r)}. It keeps the one on the left.`;
        });

        T.check('The three are actually different', () => {
          const a = maxSemigroup.concat(3, 7);
          const b = minSemigroup.concat(3, 7);
          const c = firstSemigroup.concat(3, 7);
          return (
            !(a === b && b === c) ||
            `All three gave ${T.fmt(a)} on the same input. One type can carry several instances, and these are meant to be three.`
          );
        });

        T.check('Combining stays inside the type', () => {
          for (const [name, S] of [['max', maxSemigroup], ['min', minSemigroup], ['first', firstSemigroup]] as [string, { concat: (a: number, b: number) => number }][]) {
            const r = S.concat(3, 7);
            if (typeof r !== 'number') {
              return `${name} gave ${T.fmt(r)}, a ${typeof r}. All three \`A\`s in the signature are the same, so what comes out has to go back in.`;
            }
          }
          return true;
        });

        T.check('The result can be combined again', () => {
          const r = maxSemigroup.concat(maxSemigroup.concat(1, 5), 3);
          return r === 5 || `Combining twice gave ${T.fmt(r)}.`;
        });

        T.law('All three are associative', 80, (G) => {
          const a = G.int();
          const b = G.int();
          const c = G.int();
          for (const [name, S] of [['max', maxSemigroup], ['min', minSemigroup], ['first', firstSemigroup]] as [string, { concat: (x: number, y: number) => number }][]) {
            const left = S.concat(S.concat(a, b), c);
            const right = S.concat(a, S.concat(b, c));
            if (left !== right) {
              return `${name} on ${T.fmt([a, b, c])}: bracketing left gave ${T.fmt(left)} and right gave ${T.fmt(right)}.`;
            }
          }
          return true;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'several-instances'],
      title: "One type, three instances",
      prompt:
        "The three `A`s in `concat` are the same variable, which is what lets the result go straight back in. Type an array of what each of the three gives for 3 and 7.",
      hints: [
        "`first` ignores its second argument entirely, which the signature permits.",
        "All three are `Semigroup<number>`, and all three are different.",
        "Being lawful does not mean being interesting.",
      ],
      context: `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

const max: Semigroup<number> = { concat: (a, b) => Math.max(a, b) }
const min: Semigroup<number> = { concat: (a, b) => Math.min(a, b) }
const first: Semigroup<number> = { concat: (a) => a }
`,
      placeholder: "[..., ..., ...]",
      expect: [7,3,3],
      solution: "[max.concat(3, 7), min.concat(3, 7), first.concat(3, 7)]",
      broken: ["[7, 3, 7]", "[7, 3, 10]", "[3, 7, 3]"],
    },
  ],
};
