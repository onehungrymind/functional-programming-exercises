import type { ExerciseSet } from '@fpx/engine/types';

export const kleisliComposition: ExerciseSet = {
  termId: 'kleisli-composition',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Compose functions that return containers',
      prompt:
        'Ordinary composition cannot join `a -> M b` with `b -> M c`, because the second takes a `b` and gets an `M b`. `composeK` bridges that with chain.',
      hints: [
        'Run the first function, then chain the second onto its result.',
        'Like compose, it reads right to left: the rightmost function runs first.',
      ],
      exports: ['composeK'],
      starter: `// composeK :: ((b -> M c), (a -> M b)) -> (a -> M c)
const composeK = (g, f) => {
}
`,
      solution: `// composeK :: ((b -> M c), (a -> M b)) -> (a -> M c)
const composeK = (g, f) => (a) => f(a).chain(g)
`,
      broken: [
        // Left to right, which is the opposite of what compose means.
        `const composeK = (g, f) => (a) => g(a).chain(f)
`,
        // Uses map, so the result ends up doubly wrapped.
        `const composeK = (g, f) => (a) => f(a).map(g)
`,
      ],
      checks: (T, exp) => {
        const composeK = exp.composeK as (g: (b: any) => any, f: (a: any) => any) => (a: any) => any;

        const Just = (value: any): any => ({
          isNothing: false,
          value,
          map: (fn: any) => Just(fn(value)),
          chain: (fn: any) => fn(value),
          inspect: () => `Just(${JSON.stringify(value)})`,
        });
        const Nothing = (): any => ({
          isNothing: true,
          map: () => Nothing(),
          chain: () => Nothing(),
          inspect: () => 'Nothing',
        });

        const half = (n: number) => (n % 2 === 0 ? Just(n / 2) : Nothing());
        const positive = (n: number) => (n > 0 ? Just(n) : Nothing());

        T.check('Two successful steps compose', () => {
          const f = composeK(positive, half);
          const r = f(8);
          return (r?.isNothing === false && r.value === 4) || `Got ${T.fmt(r)}, expected Just(4).`;
        });

        T.check('The rightmost function runs first', () => {
          const order: string[] = [];
          const a = (n: number) => {
            order.push('a');
            return Just(n);
          };
          const b = (n: number) => {
            order.push('b');
            return Just(n);
          };
          composeK(a, b)(1);
          return (
            T.eq(order, ['b', 'a']) ||
            `They ran in the order ${T.fmt(order)}. composeK(g, f) means f first, the same way compose does.`
          );
        });

        T.check('The result is not doubly wrapped', () => {
          const f = composeK(positive, half);
          const r = f(8);
          return (
            typeof r?.value !== 'object' || r.value === null ||
            `Got ${T.fmt(r)}. Using map instead of chain leaves a container inside a container.`
          );
        });

        T.check('A failure in the first step short-circuits', () => {
          const spy = T.spyFn((n: number) => Just(n));
          const f = composeK(spy, half);
          const r = f(7);
          if (spy.calls.length > 0) return 'The second step ran even though the first gave Nothing.';
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('A failure in the second step comes through', () => {
          const f = composeK(positive, half);
          const r = f(-4);
          return r?.isNothing === true || `Got ${T.fmt(r)}, expected Nothing: -4 halves to -2, which is not positive.`;
        });

        T.check('Three compose as easily as two', () => {
          const f = composeK(composeK(positive, half), half);
          const r = f(16);
          return (r?.isNothing === false && r.value === 4) || `Got ${T.fmt(r)}, expected Just(4).`;
        });

        T.law('Associativity: grouping the composition makes no difference', 50, (G) => {
          const n = G.int();
          const mk = (k: number) => (x: number) => (x + k > 0 ? Just(x + k) : Nothing());
          const [f, g, h] = [mk(1), mk(2), mk(3)];
          const left = composeK(composeK(h, g), f)(n);
          const right = composeK(h, composeK(g, f))(n);
          const same = left.isNothing === right.isNothing && (left.isNothing || left.value === right.value);
          return same || `On ${n}: grouping left gave ${T.fmt(left)}, grouping right gave ${T.fmt(right)}.`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Why not ordinary composition?',
      prompt: 'Given `half :: Number -> Maybe Number`, why does `compose(half, half)` not work?',
      options: [
        {
          code: '// The second half receives a Maybe Number, but it expects a Number',
          correct: true,
          why: 'The shapes do not meet. composeK uses chain to unwrap between the steps.',
        },
        {
          code: '// half is not curried',
          correct: false,
          why: 'Currying is unrelated. The problem is the shape of what comes out.',
        },
        {
          code: '// Maybe has no map',
          correct: false,
          why: 'It does, and map is what makes the doubly wrapped version. chain is what avoids it.',
        },
        {
          code: '// compose only takes two functions',
          correct: false,
          why: 'Variadic compose is easy to write. The mismatch would still be there.',
        },
      ],
    },
  ],
};
