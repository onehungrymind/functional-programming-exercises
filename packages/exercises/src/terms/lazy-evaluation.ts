import type { ExerciseSet } from '@fpx/engine/types';

export const lazyEvaluation: ExerciseSet = {
  termId: 'lazy-evaluation',
  rubric: [
    {
      id: 'pull-not-push',
      statement:
        "Knows nothing is computed until something asks, and can build an endless source that costs nothing to define.",
    },
    {
      id: 'no-over-pulling',
      statement:
        "Can take exactly as many values as needed, and knows why pulling one extra breaks against an endless source.",
    },
    {
      id: 'filter-lazily',
      statement:
        "Can filter an endless source without materializing it, stopping as soon as enough has been collected.",
    },
  ],
  notes: `Lazy means the work happens when the answer is wanted, not when the expression is written. A
generator is lazy out of the box: nothing between yields runs until something pulls.

\`\`\`js
function* naturals() {
  let n = 0
  while (true) {          // costs nothing until pulled
    yield n
    n += 1
  }
}

const it = naturals()
it.next().value   // 0
it.next().value   // 1
\`\`\`

The discipline is to **pull exactly what you need**. \`for...of\` pulls a value before the body
can decide it has enough, which is one too many:

\`\`\`js
const take = (n, iterator) => {
  const out = []
  for (const value of iterator) {
    out.push(value)
    if (out.length >= n) break      // the nth pull already happened
  }
  return out
}

const take = (n, iterator) => {
  const it = iterator[Symbol.iterator]()
  const out = []
  while (out.length < n) {          // decide, then pull
    const step = it.next()
    if (step.done) break
    out.push(step.value)
  }
  return out
}
\`\`\`

Against a finite source that is an off-by-one. Against an endless one it is the difference
between working and not:

\`\`\`js
const take = (n, it) => [...it].slice(0, n)   // drains the iterator
take(3, naturals())                           // never returns
\`\`\`

Same rule when filtering. Walk and stop; do not build a prefix and hope it was big enough:

\`\`\`js
const firstSquaresOver = (floor, count) => {
  const out = []
  for (const n of naturals()) {
    const sq = n * n
    if (sq > floor) out.push(sq)
    if (out.length >= count) break
  }
  return out
}

firstSquaresOver(1000000, 2)   // [1002001, 1004004], reached without a million steps of storage
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['pull-not-push', 'no-over-pulling'],
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
      covers: ['filter-lazily', 'no-over-pulling'],
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

    {
      id: 'pull',
      kind: 'code',
      role: 'apply',
      covers: ['pull-not-push', 'filter-lazily'],
      title: "Only do the work that is asked for",
      prompt:
        "Lazy means the consumer pulls, so nothing past what was asked for ever runs. Write `lazyMap`, `lazyFilter` and `take` over generators, then show the work count stays small.",
      hints: [
        "Each one is a generator that yields as it goes, rather than building an array.",
        "`take` stops after n, and stopping is what keeps the source from being drained.",
        "The source here is endless. If your pipeline tries to finish it, nothing will come back.",
      ],
      exports: ['lazyMap', 'lazyFilter', 'take'],
      starter: `// naturals :: () -> Generator   endless
function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}

// lazyMap :: ((a -> b), Iterable a) -> Generator b
function* lazyMap(f, xs) {
}

// lazyFilter :: ((a -> Boolean), Iterable a) -> Generator a
function* lazyFilter(p, xs) {
}

// take :: (Number, Iterable a) -> [a]
const take = (n, xs) => []
`,
      solution: `// naturals :: () -> Generator   endless
function* naturals() {
  let n = 0
  while (true) {
    yield n
    n += 1
  }
}

// lazyMap :: ((a -> b), Iterable a) -> Generator b
function* lazyMap(f, xs) {
  for (const x of xs) yield f(x)
}

// lazyFilter :: ((a -> Boolean), Iterable a) -> Generator a
function* lazyFilter(p, xs) {
  for (const x of xs) if (p(x)) yield x
}

// take :: (Number, Iterable a) -> [a]
const take = (n, xs) => {
  const out = []
  if (n <= 0) return out
  for (const x of xs) {
    out.push(x)
    if (out.length === n) break
  }
  return out
}
`,
      broken: [
        `function* naturals() { let n = 0; while (true) { yield n; n += 1 } }
function* lazyMap(f, xs) { for (const x of xs) yield f(x) }
function* lazyFilter(p, xs) { for (const x of xs) if (p(x)) yield x }
const take = (n, xs) => {
  const out = []
  for (const x of xs) out.push(x)
  return out.slice(0, n)
}
`,
        `function* naturals() { let n = 0; while (true) { yield n; n += 1 } }
function* lazyMap(f, xs) { for (const x of xs) yield x }
function* lazyFilter(p, xs) { for (const x of xs) if (p(x)) yield x }
const take = (n, xs) => {
  const out = []
  if (n <= 0) return out
  for (const x of xs) { out.push(x); if (out.length === n) break }
  return out
}
`,
        `function* naturals() { let n = 0; while (true) { yield n; n += 1 } }
function* lazyMap(f, xs) { for (const x of xs) yield f(x) }
function* lazyFilter(p, xs) { for (const x of xs) yield x }
const take = (n, xs) => {
  const out = []
  if (n <= 0) return out
  for (const x of xs) { out.push(x); if (out.length === n) break }
  return out
}
`,
      ],
      checks: (T, exp) => {
        const { lazyMap, lazyFilter, take } = exp;
        const upto = function* (n: number) {
          for (let i = 0; i < n; i += 1) yield i;
        };

        T.check('take stops at n', () => {
          const r = take(3, upto(100));
          return T.eq(r, [0, 1, 2]) || `take(3, 0..99) gave ${T.fmt(r)}.`;
        });

        T.check('take of nothing is nothing', () => {
          return T.eq(take(0, upto(10)), []) || `take(0, ...) gave ${T.fmt(take(0, upto(10)))}.`;
        });

        T.check('take of more than there is gives what there is', () => {
          return T.eq(take(10, upto(3)), [0, 1, 2]) || `It gave ${T.fmt(take(10, upto(3)))}.`;
        });

        T.check('lazyMap applies the function', () => {
          const r = take(3, lazyMap((n: number) => n * 2, upto(10)));
          return T.eq(r, [0, 2, 4]) || `Doubling then taking three gave ${T.fmt(r)}.`;
        });

        T.check('lazyFilter keeps only what passes', () => {
          const r = take(3, lazyFilter((n: number) => n % 2 === 0, upto(20)));
          return T.eq(r, [0, 2, 4]) || `Filtering to evens then taking three gave ${T.fmt(r)}.`;
        });

        T.check('Only the work that was asked for happens', () => {
          let calls = 0;
          const counted = (n: number) => {
            calls += 1;
            return n * 2;
          };
          take(3, lazyMap(counted, upto(1000)));
          return (
            calls <= 4 ||
            `The function ran ${calls} times to produce three answers. Pulling means the consumer decides how far the source is drained, so nothing past what was asked for should run.`
          );
        });

        T.check('A filtered pipeline only pulls as far as it must', () => {
          let seen = 0;
          const source = function* () {
            for (let i = 0; i < 1000; i += 1) {
              seen += 1;
              yield i;
            }
          };
          take(2, lazyFilter((n: number) => n % 3 === 0, source()));
          return seen <= 5 || `The source produced ${seen} values to yield two multiples of three. Expected to stop around the fourth.`;
        });

        T.check('A source with no natural end is fine, because nothing tries to finish it', () => {
          // Deliberately NOT endless. A `take` that drains its source first is the likely
          // wrong answer here, and handing that an infinite generator hangs the tab rather
          // than failing the rung. This one gives up loudly instead.
          const LIMIT = 10_000;
          let pulled = 0;
          const naturals = function* () {
            let n = 0;
            while (true) {
              pulled += 1;
              if (pulled > LIMIT) throw new Error('drained');
              yield n;
              n += 1;
            }
          };
          let r;
          try {
            r = take(4, lazyMap((n: number) => n * n, lazyFilter((n: number) => n % 2 === 1, naturals())));
          } catch {
            return `The pipeline pulled more than ${LIMIT} values to produce four. A source with no natural end only works if the consumer stops, so something downstream is draining it before taking its four.`;
          }
          if (!T.eq(r, [1, 9, 25, 49])) return `The pipeline gave ${T.fmt(r)}, expected [1, 9, 25, 49].`;
          return pulled <= 10 || `It pulled ${pulled} values to produce four.`;
        });
      },
    },
  ],
};
