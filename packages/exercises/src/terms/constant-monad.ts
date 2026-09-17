import type { ExerciseSet } from '@fpx/engine/types';

export const constantMonad: ExerciseSet = {
  termId: 'constant-monad',
  rubric: [
    {
      id: 'chain-keeps',
      statement:
        "Can write a chain that discards its function and keeps the carried value, matching the reference behaviour.",
    },
    {
      id: 'two-laws-hold',
      statement:
        "Knows right identity and associativity hold, and can check them.",
    },
    {
      id: 'left-identity-fails',
      statement:
        "Can show that left identity cannot hold for it, and say why no definition of of would fix it.",
    },
  ],
  notes: `\`Const\` with a \`chain\` that behaves like its \`map\`: drop the function, keep the value.

\`\`\`js
const Const = (value) => ({
  value,
  map: (f) => Const(value),
  chain: (f) => Const(value)
})

Const(1).chain((n) => Const(n + 1))   // Const(1)
\`\`\`

Two of the three monad laws hold:

\`\`\`js
// right identity: m.chain(of) equals m
Const('kept').chain(Const)            // Const('kept')

// associativity: the grouping does not matter
Const('a').chain(f).chain(g)                  // Const('a')
Const('a').chain((x) => f(x).chain(g))        // Const('a')
\`\`\`

**Left identity cannot.** The law says \`of(a).chain(f)\` equals \`f(a)\`. Since \`chain\`
discards \`f\`, the left side carries whatever \`of\` produced and the right side carries
whatever \`f\` chose, and those are different things:

\`\`\`js
const of = (x) => Const('')
const f = (x) => Const('something')

of(1).chain(f)   // Const('')
f(1)             // Const('something')
\`\`\`

No definition of \`of\` repairs it, because the two sides depend on different values. You could
make \`of\` return \`Const('something')\` and then pick a different \`f\`.

So the name is a name rather than a claim. \`Const\` is a lawful [functor](#functor) for any
carried type, and an Applicative when that type is a [monoid](#monoid), and not a lawful monad
at all. That is recorded in this repo's \`docs/upstream-notes.md\` as a suggested correction to
the reference.`,
  rungs: [
    {
      id: 'implement',
      covers: ['chain-keeps', 'two-laws-hold'],
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
      covers: ['left-identity-fails'],
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

    {
      id: 'which-laws',
      kind: 'code',
      role: 'break',
      covers: ['chain-keeps', 'two-laws-hold', 'left-identity-fails'],
      title: "Two laws hold, one does not",
      prompt:
        "Const's chain keeps its own value and never runs the function, which satisfies two of the three monad laws and breaks the third. Write it, then report which one fails.",
      hints: [
        "`chain` has nothing of the right type to hand the function, so it returns itself.",
        "Right identity and associativity both hold, because every side of them comes back to the same value.",
        "Left identity says `of(x).chain(f)` equals `f(x)`. Try it with an `f` that returns a different Const.",
      ],
      exports: ['constant', 'leftIdentity', 'rightIdentity', 'associativity'],
      starter: `// constant :: a -> Const a b
const constant = (value) => ({
  value,
  map: (f) => constant(value),
  chain: (f) => constant(value)
})

// of :: b -> Const b b
const of = (x) => constant(x)

// leftIdentity  :: (b, (b -> Const a b)) -> Boolean
const leftIdentity = (x, f) => true

// rightIdentity :: Const a b -> Boolean
const rightIdentity = (m) => true

// associativity :: (Const a b, f, g) -> Boolean
const associativity = (m, f, g) => true
`,
      solution: `// constant :: a -> Const a b
const constant = (value) => ({
  value,
  map: (f) => constant(value),
  chain: (f) => constant(value)
})

// of :: b -> Const b b
const of = (x) => constant(x)

// leftIdentity  :: (b, (b -> Const a b)) -> Boolean
const leftIdentity = (x, f) => of(x).chain(f).value === f(x).value

// rightIdentity :: Const a b -> Boolean
const rightIdentity = (m) => m.chain(of).value === m.value

// associativity :: (Const a b, f, g) -> Boolean
const associativity = (m, f, g) =>
  m.chain(f).chain(g).value === m.chain((x) => f(x).chain(g)).value
`,
      broken: [
        `const constant = (value) => ({ value, map: (f) => constant(value), chain: (f) => f(value) })
const of = (x) => constant(x)
const leftIdentity = (x, f) => of(x).chain(f).value === f(x).value
const rightIdentity = (m) => m.chain(of).value === m.value
const associativity = (m, f, g) =>
  m.chain(f).chain(g).value === m.chain((x) => f(x).chain(g)).value
`,
        `const constant = (value) => ({ value, map: (f) => constant(value), chain: (f) => constant(value) })
const of = (x) => constant(x)
const leftIdentity = (x, f) => true
const rightIdentity = (m) => m.chain(of).value === m.value
const associativity = (m, f, g) =>
  m.chain(f).chain(g).value === m.chain((x) => f(x).chain(g)).value
`,
        `const constant = (value) => ({ value, map: (f) => constant(value), chain: (f) => constant(value) })
const of = (x) => constant(x)
const leftIdentity = (x, f) => of(x).chain(f).value === f(x).value
const rightIdentity = (m) => false
const associativity = (m, f, g) => false
`,
      ],
      checks: (T, exp) => {
        const { constant, leftIdentity, rightIdentity, associativity } = exp;

        T.check('chain never runs the function', () => {
          let ran = false;
          constant('kept').chain(() => {
            ran = true;
            return constant('other');
          });
          return !ran || 'The function ran. There is no value of the right type in a Const to hand it, which is why chain can only keep what it has.';
        });

        T.check('chain keeps the value it already had', () => {
          const r = constant('kept').chain(() => constant('other'));
          return r.value === 'kept' || `Chaining gave ${T.fmt(r.value)}.`;
        });

        T.check('chain gives back something chainable', () => {
          const r = constant('kept').chain(() => constant('other'));
          return typeof r.chain === 'function' || `Chaining gave ${T.fmt(r)}, which cannot be chained again.`;
        });

        T.check('Right identity holds', () => {
          const r = rightIdentity(constant('kept'));
          return r === true || `Right identity reported ${T.fmt(r)}. Chaining with the constructor cannot change a value that chain never touches.`;
        });

        T.check('Associativity holds', () => {
          const f = (x: string) => constant(x + 'f');
          const g = (x: string) => constant(x + 'g');
          const r = associativity(constant('kept'), f, g);
          return r === true || `Associativity reported ${T.fmt(r)}. Both bracketings come back to the same value, because neither one moves.`;
        });

        T.check('Left identity fails', () => {
          const f = (x: string) => constant(x + '!');
          const r = leftIdentity('seed', f);
          return (
            r === false ||
            `Left identity reported ${T.fmt(r)}. of('seed').chain(f) keeps 'seed' while f('seed') gives 'seed!', and the rung wants that difference found rather than smoothed over.`
          );
        });

        T.check('Left identity is not just always false', () => {
          const identityF = (x: string) => constant(x);
          const r = leftIdentity('seed', identityF);
          return (
            r === true ||
            `With an f that changes nothing, left identity reported ${T.fmt(r)}. It should hold there, or the check is not measuring anything.`
          );
        });

        T.law('The value survives any number of chains', 60, (G) => {
          const v = G.str();
          const r = constant(v).chain(() => constant('a')).chain(() => constant('b')).value;
          return r === v || `${T.fmt(v)} came back as ${T.fmt(r)}.`;
        });
      },
    },
  ],
};
