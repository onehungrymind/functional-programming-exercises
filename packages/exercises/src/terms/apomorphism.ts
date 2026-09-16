import type { ExerciseSet } from '@fpx/engine/types';

export const apomorphism: ExerciseSet = {
  termId: 'apomorphism',
  rubric: [
    {
      id: 'early-finish',
      statement:
        "Knows an apomorphism can stop generating and hand back the whole remainder in one step.",
    },
    {
      id: 'three-outcomes',
      statement:
        "Can write a step that continues, finishes with a whole structure, or stops with nothing.",
    },
    {
      id: 'use-it',
      statement:
        "Can express something that stops early and keeps the rest untouched, such as inserting into a sorted list.",
    },
  ],
  notes: `An [anamorphism](#anamorphism) can produce one element at a time or stop. An apomorphism adds a
third option: **stop, and here is the rest**.

\`\`\`js
// the step returns one of:
//   { next: [value, seed] }   keep going
//   { done: [...values] }     finish with these, all at once
//   null                      stop with nothing more

const apo = (step, seed) => {
  const out = []
  let current = seed
  while (true) {
    const result = step(current)
    if (result === null) return out
    if (result.done !== undefined) return out.concat(result.done)
    out.push(result.next[0])
    current = result.next[1]
  }
}
\`\`\`

That middle case is the whole point, and dropping it loses everything after the stopping point:

\`\`\`js
if (result.done !== undefined) return out      // the remainder is thrown away
\`\`\`

Inserting into a sorted list is the natural example. Once you find the place, the rest of the
list is already correct and there is no reason to walk it:

\`\`\`js
const insert = (x, sorted) =>
  apo((rest) => {
    if (rest.length === 0) return { done: [x] }
    if (x <= rest[0]) return { done: [x, ...rest] }   // place it, keep the rest as it is
    return { next: [rest[0], rest.slice(1)] }
  }, sorted)

insert(3, [1, 2, 4, 5])   // [1, 2, 3, 4, 5]
insert(0, [1, 2, 3])      // [0, 1, 2, 3]
insert(9, [1, 2, 3])      // [1, 2, 3, 9]
insert(1, [])             // [1]
\`\`\`

A hand-written loop reaches the same answer. What the shape gives you is the ability to say
"and the remainder is this" as part of the unfold itself, rather than as an escape from it.`,
  rungs: [
    {
      id: 'implement',
      covers: ['early-finish', 'three-outcomes', 'use-it'],
      kind: 'code',
      role: 'implement',
      title: 'An unfold that can finish early',
      prompt:
        'An apomorphism is an unfold that can stop generating and hand back the rest in one go. Write `apo`, then use it to insert a value into a sorted list.',
      hints: [
        'The step returns one of three things: continue with a seed, finish with a whole list, or stop.',
        'Once the insertion point is found, the rest of the list can be returned as it is.',
      ],
      timeoutMs: 3000,
      exports: ['apo', 'insert'],
      starter: `// The step returns one of:
//   { next: [value, seed] }  keep going
//   { done: [...values] }    finish with these and stop
//   null                     stop with nothing more

// apo :: ((b -> Step), b) -> [a]
const apo = (step, seed) => {
}

// insert :: (Number, [Number]) -> [Number]   into a sorted list
const insert = (x, sorted) => {
}
`,
      solution: `// apo :: ((b -> Step), b) -> [a]
const apo = (step, seed) => {
  const out = []
  let current = seed
  while (true) {
    const result = step(current)
    if (result === null) return out
    if (result.done !== undefined) return out.concat(result.done)
    out.push(result.next[0])
    current = result.next[1]
  }
}

// insert :: (Number, [Number]) -> [Number]
const insert = (x, sorted) =>
  apo((rest) => {
    if (rest.length === 0) return { done: [x] }
    if (x <= rest[0]) return { done: [x, ...rest] }
    return { next: [rest[0], rest.slice(1)] }
  }, sorted)
`,
      broken: [
        // Ignores the early finish, so the rest of the list is dropped.
        `const apo = (step, seed) => {
  const out = []
  let current = seed
  while (true) {
    const result = step(current)
    if (result === null || result.done !== undefined) return out
    out.push(result.next[0])
    current = result.next[1]
  }
}
const insert = (x, sorted) =>
  apo((rest) => {
    if (rest.length === 0) return { done: [x] }
    if (x <= rest[0]) return { done: [x, ...rest] }
    return { next: [rest[0], rest.slice(1)] }
  }, sorted)
`,
        // Keeps unfolding after the insertion point, which is the work apo exists to skip.
        `const apo = (step, seed) => {
  const out = []
  let current = seed
  while (true) {
    const result = step(current)
    if (result === null) return out
    if (result.done !== undefined) return out.concat(result.done)
    out.push(result.next[0])
    current = result.next[1]
  }
}
const insert = (x, sorted) => {
  const out = []
  let placed = false
  for (const v of sorted) {
    if (!placed && x <= v) { out.push(x); placed = true }
    out.push(v)
  }
  if (!placed) out.push(x)
  return out
}
`,
        // Hands back the tail but forgets to include the value being inserted.
        `const apo = (step, seed) => {
  const out = []
  let current = seed
  while (true) {
    const result = step(current)
    if (result === null) return out
    if (result.done !== undefined) return out.concat(result.done)
    out.push(result.next[0])
    current = result.next[1]
  }
}
const insert = (x, sorted) =>
  apo((rest) => {
    if (rest.length === 0) return { done: [x] }
    if (x <= rest[0]) return { done: rest }
    return { next: [rest[0], rest.slice(1)] }
  }, sorted)
`,
      ],
      checks: (T, exp) => {
        const apo = exp.apo as (step: (b: any) => any, seed: any) => any[];
        const insert = exp.insert as (x: number, xs: number[]) => number[];

        T.check('apo can finish early with a whole list', () => {
          const r = apo((n: number) => (n < 2 ? { next: [n, n + 1] } : { done: ['rest', 'of', 'it'] }), 0);
          return (
            T.eq(r, [0, 1, 'rest', 'of', 'it']) ||
            `Got ${T.fmt(r)}, expected [0, 1, "rest", "of", "it"]. The early finish contributes its whole list, not nothing.`
          );
        });

        T.check('apo can also just stop', () => {
          const r = apo((n: number) => (n < 3 ? { next: [n, n + 1] } : null), 0);
          return T.eq(r, [0, 1, 2]) || `Got ${T.fmt(r)}`;
        });

        T.check('insert puts the value in order', () => {
          const r = insert(3, [1, 2, 4, 5]);
          return T.eq(r, [1, 2, 3, 4, 5]) || `Got ${T.fmt(r)}`;
        });

        T.check('insert at the front', () => {
          const r = insert(0, [1, 2, 3]);
          return T.eq(r, [0, 1, 2, 3]) || `Got ${T.fmt(r)}`;
        });

        T.check('insert at the end', () => {
          const r = insert(9, [1, 2, 3]);
          return T.eq(r, [1, 2, 3, 9]) || `Got ${T.fmt(r)}`;
        });

        T.check('insert into an empty list', () => {
          const r = insert(1, []);
          return T.eq(r, [1]) || `Got ${T.fmt(r)}`;
        });

        T.check('An equal value is placed without losing anything', () => {
          const r = insert(2, [1, 2, 3]);
          return (
            T.eq(r, [1, 2, 2, 3]) ||
            `Got ${T.fmt(r)}, expected [1, 2, 2, 3]. Nothing should be dropped or duplicated when the value is already there.`
          );
        });

        T.check('insert is built on apo', () => {
          // A hand-written loop gets the same answer. The point of the rung is the shape:
          // the early finish is what hands back the untouched tail in one step.
          return (
            /\bapo\s*\(/.test(T.src.split('const insert')[1] ?? '') ||
            'insert does not use apo. A loop gets the same answer, but the rung is about expressing "stop here and keep the rest" as an unfold.'
          );
        });

        T.law('The result stays sorted', 60, (G) => {
          const xs = G.ints().sort((a, b) => a - b);
          const x = G.int();
          const r = insert(x, xs);
          const sorted = r.every((v, i) => i === 0 || r[i - 1]! <= v);
          if (!sorted) return `Inserting ${x} into ${T.fmt(xs)} gave ${T.fmt(r)}, which is not sorted.`;
          return (
            r.length === xs.length + 1 ||
            `Inserting ${x} into ${T.fmt(xs)} gave ${r.length} values, expected ${xs.length + 1}.`
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['early-finish'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which unfold is which?',
      prompt: 'An anamorphism and an apomorphism both build a structure. What can the apomorphism do that the anamorphism cannot?',
      options: [
        {
          code: '// Stop early and hand back the rest of the structure in one step',
          correct: true,
          why: 'An ordinary unfold can only produce one element at a time, or stop. An apomorphism can also say "and the remainder is this".',
        },
        {
          code: '// Produce an infinite structure',
          correct: false,
          why: 'An ordinary unfold does that perfectly well by never stopping.',
        },
        {
          code: '// See the part it has already produced',
          correct: false,
          why: 'Neither can. Looking at what is left is the paramorphism, and that is a fold.',
        },
        {
          code: '// Run in constant memory',
          correct: false,
          why: 'Unrelated to the distinction. Both build as much structure as they are asked for.',
        },
      ],
    },
  ],
};
