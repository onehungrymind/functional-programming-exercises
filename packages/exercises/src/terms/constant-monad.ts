import type { ExerciseSet } from '@fpx/engine/types';

export const constantMonad: ExerciseSet = {
  termId: 'constant-monad',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'A chain that keeps the contents',
      prompt:
        'Give Const a `chain` that ignores its function and keeps what it carries, matching the reference example: `Constant(1).chain(n => Constant(n + 1))` is `Constant(1)`.',
      hints: [
        'chain behaves exactly like map here: drop the function, keep the value.',
        'It never unwraps, so the function is never given anything to work with.',
      ],
      exports: ['Const'],
      starter: `// Const :: a -> Const a b
const Const = (value) => ({
  value,
  map: (f) => Const(value),
  chain: (f) => {
  },
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      solution: `// Const :: a -> Const a b
const Const = (value) => ({
  value,
  map: (f) => Const(value),
  chain: (f) => Const(value),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // chain runs the function, which lets the payload be replaced.
        `const Const = (value) => ({
  value,
  map: (f) => Const(value),
  chain: (f) => f(value),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
        // Gives back a bare value, so you cannot chain again.
        `const Const = (value) => ({
  value,
  map: (f) => Const(value),
  chain: (f) => value,
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const Const = exp.Const as (v: any) => any;

        T.check('The reference example holds', () => {
          const r = Const(1).chain((n: number) => Const(n + 1));
          return r?.value === 1 || `Const(1).chain(n => Const(n + 1)) gave ${T.fmt(r)}, expected Const(1).`;
        });

        T.check('The chained function never runs', () => {
          const spy = T.spyFn(() => Const('replaced'));
          Const('kept').chain(spy);
          return spy.calls.length === 0 || 'The function ran. Const drops it without looking, exactly as map does.';
        });

        T.check('chain gives back a Const', () => {
          const r = Const(1).chain(() => Const(2));
          return typeof r?.chain === 'function' || `Got ${T.fmt(r)}. You have to be able to go on chaining.`;
        });

        T.check('A long chain changes nothing', () => {
          const r = Const('first')
            .chain(() => Const('second'))
            .chain(() => Const('third'))
            .map(() => 'fourth');
          return r?.value === 'first' || `Got ${T.fmt(r)}, expected Const("first").`;
        });

        T.check('Right identity holds: m.chain(Const) equals m', () => {
          const m = Const('kept');
          const r = m.chain(Const);
          return r?.value === 'kept' || `Got ${T.fmt(r)}`;
        });

        T.check('Associativity holds', () => {
          const m = Const('a');
          const f = (_x: any) => Const('b');
          const g = (_x: any) => Const('c');
          const left = m.chain(f).chain(g).value;
          const right = m.chain((x: any) => f(x).chain(g)).value;
          return left === right || `Grouping left gave ${T.fmt(left)}, grouping right gave ${T.fmt(right)}.`;
        });
      },
    },

    {
      id: 'break',
      kind: 'code',
      role: 'break',
      inverted: true,
      title: 'Show that it is not a lawful monad',
      prompt:
        'The reference calls this a monad, but it cannot satisfy the left identity law. Supply a concrete counterexample and the check will confirm it.',
      hints: [
        'Left identity says `of(a).chain(f)` equals `f(a)`.',
        'Const drops f, so the left side always carries whatever `of` put there. Pick an f that carries something else.',
        'Return the pieces: a starting value, and a function whose Const carries a different payload.',
      ],
      exports: ['of', 'a', 'f'],
      starter: `const Const = (value) => ({
  value,
  map: () => Const(value),
  chain: () => Const(value),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})

// of has to produce a Const without a payload to carry,
// so it falls back on something neutral.
const of = (x) => Const('')

// A starting value:
const a = 1

// A function a -> Const, carrying something of its own:
const f = (x) => Const('')
`,
      solution: `const Const = (value) => ({
  value,
  map: () => Const(value),
  chain: () => Const(value),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})

const of = (x) => Const('')

const a = 1

// of(a).chain(f) keeps "", but f(a) carries "something".
// No definition of of can fix this: chain discards f, so the left
// side can never see what f wanted to carry.
const f = (x) => Const('something')
`,
      broken: [
        // f carries the same thing of does, so the two sides agree by accident.
        `const Const = (value) => ({ value, map: () => Const(value), chain: () => Const(value), inspect: () => \`Const(\${JSON.stringify(value)})\` })
const of = (x) => Const('')
const a = 1
const f = (x) => Const('')
`,
        // Redefining chain to run f dodges the question instead of answering it.
        `const Const = (value) => ({ value, map: () => Const(value), chain: (g) => g(value), inspect: () => \`Const(\${JSON.stringify(value)})\` })
const of = (x) => Const('')
const a = 1
const f = (x) => Const('something')
`,
      ],
      checks: (T, exp) => {
        const of = exp.of as (x: any) => any;
        const a = exp.a as any;
        const f = exp.f as (x: any) => any;

        T.check('of and f both give back a Const', () => {
          const lifted = of(a);
          const applied = f(a);
          const ok = (c: any) => c && typeof c.chain === 'function' && 'value' in c;
          return (
            (ok(lifted) && ok(applied)) ||
            `of(a) gave ${T.fmt(lifted)} and f(a) gave ${T.fmt(applied)}. Both have to stay Consts.`
          );
        });

        T.check('chain still ignores its function', () => {
          const spy = T.spyFn(() => of(0));
          of(a).chain(spy);
          return (
            spy.calls.length === 0 ||
            'chain ran the function. Changing chain sidesteps the point: with this chain there is no lawful monad to be had.'
          );
        });

        T.check('Left identity fails, which is the thing to show', () => {
          const left = of(a).chain(f);
          const right = f(a);
          return (
            !T.eq(left.value, right.value) ||
            `of(a).chain(f) and f(a) both carried ${T.fmt(left.value)}. Pick an f whose Const carries something other than what of produces, and the law breaks in the open.`
          );
        });

        T.check('The other two laws still hold, so this is the only failure', () => {
          const m = of(a);
          const rightIdentity = m.chain(of).value === m.value;
          const g = () => of('g');
          const assocLeft = m.chain(f).chain(g).value;
          const assocRight = m.chain((x: any) => f(x).chain(g)).value;
          if (!rightIdentity) return 'Right identity broke too, which means something other than left identity is wrong.';
          return (
            assocLeft === assocRight ||
            `Associativity gave ${T.fmt(assocLeft)} and ${T.fmt(assocRight)}. Only left identity should fail.`
          );
        });
      },
    },
  ],
};
