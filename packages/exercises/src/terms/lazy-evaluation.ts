import type { ExerciseSet } from '@fpx/engine/types';

export const lazyEvaluation: ExerciseSet = {
  termId: 'lazy-evaluation',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'An infinite list you can take from',
      prompt:
        'Lazy evaluation puts off work until the answer is needed. Write an endless `naturals` and a `take` that pulls only as many as it was asked for.',
      hints: [
        'A generator function is already lazy: nothing between yields runs until the next value is pulled.',
        '`take` must stop pulling the moment it has enough, or an endless source never ends.',
        '`for...of` pulls a value before the body can decide it has enough. Calling `.next()` yourself puts you in control of when.',
      ],
      timeoutMs: 3000,
      exports: ['naturals', 'take'],
      starter: `// naturals :: () -> Iterator Number
function* naturals() {
  // 0, 1, 2, ... forever
}

// take :: (Number, Iterator a) -> [a]
const take = (n, iterator) => {
  // pull exactly n values and stop
}
`,
      solution: `// naturals :: () -> Iterator Number
function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}

// take :: (Number, Iterator a) -> [a]
const take = (n, iterator) => {
  const it = iterator[Symbol.iterator]()
  const out = []
  while (out.length < n) {
    const step = it.next()
    if (step.done) break
    out.push(step.value)
  }
  return out
}
`,
      broken: [
        // Pulls one value too many before noticing it has enough.
        `function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}
const take = (n, iterator) => {
  const out = []
  for (const value of iterator) {
    out.push(value)
    if (out.length >= n) break
  }
  return out
}
`,
        // Drains the whole iterator before slicing. Against an endless source this never
        // returns, which is exactly what the pull-count check is there to catch early.
        `function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}
const take = (n, iterator) => [...iterator].slice(0, n)
`,
      ],
      checks: (T, exp) => {
        const naturals = exp.naturals as () => Generator<number>;
        const take = exp.take as (n: number, it: Iterable<number>) => number[];

        /**
         * Every source handed to the learner's `take` is bounded, on purpose.
         *
         * `take(n, it) => [...it].slice(0, n)` is a very plausible first attempt, and it
         * drains whatever it is given. Handing that an endless generator would hang the
         * page rather than telling them what is wrong. So the sources here stop, and the
         * checks report over-pulling instead of hitting it.
         */
        const bounded = (limit: number) => {
          const state = { pulled: 0 };
          function* source() {
            for (let n = 0; n < limit; n++) {
              state.pulled += 1;
              yield n;
            }
          }
          return { state, source };
        };

        T.check('take pulls the first few values', () => {
          const { source } = bounded(50);
          const r = take(5, source());
          return T.eq(r, [0, 1, 2, 3, 4]) || `Got ${T.fmt(r)}, expected [0, 1, 2, 3, 4].`;
        });

        T.check('Taking zero gives an empty list', () => {
          const { source } = bounded(50);
          const r = take(0, source());
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('take pulls exactly as many values as it needs', () => {
          const { state, source } = bounded(50);
          take(3, source());
          if (state.pulled === 3) return true;
          if (state.pulled >= 50) {
            return `Taking 3 values drained the whole source (${state.pulled} pulls). Something is consuming the iterator up front, like spreading it into an array. Against an endless source that never returns.`;
          }
          return `Taking 3 values pulled ${state.pulled} of them. Pulling one extra is the classic off-by-one: check whether you count before or after pushing.`;
        });

        T.check('Taking more than there is gives back what there was', () => {
          const { source } = bounded(4);
          const r = take(10, source());
          return T.eq(r, [0, 1, 2, 3]) || `Got ${T.fmt(r)}, expected [0, 1, 2, 3].`;
        });

        T.check('naturals counts up from zero', () => {
          // Pulled by hand rather than through take, so this says something about the
          // source even when take is still wrong.
          const it = naturals();
          const first = [it.next().value, it.next().value, it.next().value];
          return T.eq(first, [0, 1, 2]) || `The first three values were ${T.fmt(first)}.`;
        });

        T.check('naturals does not stop', () => {
          const it = naturals();
          let last;
          for (let i = 0; i < 10000; i++) {
            const step = it.next();
            if (step.done) return `The source ran out after ${i} values. A lazy source has no fixed end.`;
            last = step.value;
          }
          return last === 9999 || `After 10000 pulls the value was ${T.fmt(last)}, expected 9999.`;
        });

        T.check('Nothing is computed before the first pull', () => {
          let started = false;
          function* watched() {
            started = true;
            yield 1;
          }
          const it = watched();
          const before = started;
          take(1, it);
          return !before || 'The generator body ran as soon as it was created. Calling a generator function should compute nothing.';
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Filter an endless list',
      prompt:
        'Write `firstSquaresOver`, the first `count` perfect squares strictly greater than `floor`. The source stays endless, so only pull what you need.',
      hints: [
        'Walk the naturals, square each one, and keep the ones past the floor.',
        'Stop as soon as you have collected enough.',
      ],
      timeoutMs: 3000,
      exports: ['firstSquaresOver'],
      starter: `function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}

// firstSquaresOver :: (Number, Number) -> [Number]
const firstSquaresOver = (floor, count) => {
}
`,
      solution: `function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}

// firstSquaresOver :: (Number, Number) -> [Number]
const firstSquaresOver = (floor, count) => {
  const out = []
  for (const n of naturals()) {
    const sq = n * n
    if (sq > floor) out.push(sq)
    if (out.length >= count) break
  }
  return out
}
`,
      broken: [
        // Off by one on the floor: includes a square equal to it.
        `function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}
const firstSquaresOver = (floor, count) => {
  const out = []
  for (const n of naturals()) {
    const sq = n * n
    if (sq >= floor) out.push(sq)
    if (out.length >= count) break
  }
  return out
}
`,
        // Materializes a bounded prefix first, which is the eager habit this rung is against.
        `const firstSquaresOver = (floor, count) => {
  const all = []
  for (let n = 0; n < 100; n++) all.push(n * n)
  return all.filter((sq) => sq > floor).slice(0, count)
}
`,
      ],
      checks: (T, exp) => {
        const f = exp.firstSquaresOver as (floor: number, count: number) => number[];

        T.check('The first three squares over 10', () => {
          const r = f(10, 3);
          return T.eq(r, [16, 25, 36]) || `Got ${T.fmt(r)}, expected [16, 25, 36].`;
        });

        T.check('Strictly greater, so a square equal to the floor does not count', () => {
          const r = f(16, 2);
          return T.eq(r, [25, 36]) || `Got ${T.fmt(r)}. 16 is not greater than 16.`;
        });

        T.check('Asking for none gives none', () => {
          const r = f(10, 0);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('It reaches past any bounded prefix', () => {
          const r = f(1000000, 2);
          return (
            T.eq(r, [1002001, 1004004]) ||
            `Got ${T.fmt(r)}. If this comes back short, the source was capped at a fixed size instead of being pulled on demand.`
          );
        });
      },
    },
  ],
};
