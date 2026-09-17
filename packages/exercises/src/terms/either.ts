import type { ExerciseSet } from '@fpx/engine/types';

export const either: ExerciseSet = {
  termId: 'either',
  rubric: [
    {
      id: 'carries-the-reason',
      statement:
        "Knows Either carries a failure that says why, unlike Option which only says there was one.",
    },
    {
      id: 'right-biased',
      statement:
        "Knows map and chain work on the Right only, so a Left passes through untouched, and fold runs exactly one branch.",
    },
    {
      id: 'distinct-failures',
      statement:
        "Can build a pipeline where each step fails with its own message, and the first failure ends it.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `Either<E, A>` and point at where right-bias lives: `map` names only `A` in its signature, so the failure side cannot be touched.",
    },
  ],
  notes: `Either is Option that **says why**. A failure carries a value, so the caller learns which step
went wrong.

\`\`\`js
const Left = (error) => ({
  isRight: false,
  map: () => Left(error),        // the failure passes straight through
  chain: () => Left(error),
  fold: (onLeft, onRight) => onLeft(error)
})
const Right = (value) => ({
  isRight: true,
  map: (f) => Right(f(value)),
  chain: (f) => f(value),
  fold: (onLeft, onRight) => onRight(value)
})
\`\`\`

It is **right-biased**: map and chain only ever touch the success side, which is what lets a
failure travel the length of a pipeline without being handled at every step.

\`\`\`js
Left('not found').map((n) => n * 100).map((n) => n + 1)
// Left('not found'), and neither function ran
\`\`\`

\`fold\` is the way out, and exactly one branch runs:

\`\`\`js
result.fold(
  (err) => \`failed: \${err}\`,
  (val) => \`ok: \${val}\`
)
\`\`\`

The reason to prefer it over throwing is that each step keeps its own message, and the whole
thing stays a value:

\`\`\`js
const parseJson = (s) => { try { return Right(JSON.parse(s)) } catch { return Left('not json') } }
const getAge = (o) => ('age' in o ? Right(o.age) : Left('no age'))
const checkPositive = (n) => (typeof n === 'number' && n > 0 ? Right(n) : Left('age must be positive'))

const parseAge = (json) => parseJson(json).chain(getAge).chain(checkPositive)

parseAge('{"age": 30}')     // Right(30)
parseAge('nope')            // Left('not json')
parseAge('{"name":"ada"}')  // Left('no age')
parseAge('{"age": -1}')     // Left('age must be positive')
\`\`\`

Three different failures, three different messages, and no try/catch at the call site.`,
  typedNotes: `Same track, second lap. [Option](#option) tells you something is missing. Either tells you
what went wrong, and the second type variable is that difference.

\`\`\`ts
type Either<E, A> =
  | { tag: 'left', left: E }
  | { tag: 'right', right: A }
\`\`\`

\`E\` is the reason, \`A\` is the result. Two variables rather than one, which is the whole
upgrade: a \`none\` is interchangeable with every other \`none\`, while a \`Left<string>\` and a
\`Left<ValidationError>\` are different types and the compiler keeps them apart.

Now the bit that is worth staring at. Here is \`map\`:

\`\`\`ts
const map = <E, A, B>(f: (a: A) => B, e: Either<E, A>): Either<E, B> =>
  e.tag === 'right' ? { tag: 'right', right: f(e.right) } : e
\`\`\`

\`A\` becomes \`B\`. \`E\` goes in as \`E\` and comes out as \`E\`, untouched. Right-bias is not a
convention someone agreed on, it is written into the signature: there is no \`f\` you could pass
to \`map\` that would change the left, because \`f\` is typed \`(a: A) => B\` and the left is not an
\`A\`. If you want the other side you need a different function, and its type says so:

\`\`\`ts
const mapLeft = <E, A, F>(f: (e: E) => F, e: Either<E, A>): Either<F, A> =>
  e.tag === 'left' ? { tag: 'left', left: f(e.left) } : e
\`\`\`

\`E\` becomes \`F\` and \`A\` is the one held fixed. Exactly mirrored.

Getting out is \`fold\`, and its return type is the interesting part:

\`\`\`ts
const fold = <E, A, B>(onLeft: (e: E) => B, onRight: (a: A) => B, e: Either<E, A>): B =>
  e.tag === 'left' ? onLeft(e.left) : onRight(e.right)

const describe = (e: Either<string, number>) =>
  fold((err) => 'failed: ' + err, (n) => 'got ' + n, e)
\`\`\`

Both handlers return \`B\`, the same \`B\`, and \`fold\` returns a bare \`B\` with no Either in sight.
That shared variable is the type system making you decide what the two branches have in
common before it will let you leave.`,
  rungs: [
    {
      id: 'implement',
      covers: ['carries-the-reason', 'right-biased'],
      kind: 'code',
      role: 'implement',
      title: 'Left, Right, and fold',
      prompt:
        "Either carries a success or a failure, and says which. `map` and `chain` work on the Right only; `fold` is how you finally handle both. Write `Left` and `Right`.",
      hints: [
        'Left is the failure. Mapping over it changes nothing and keeps the error intact.',
        '`fold(onLeft, onRight)` runs exactly one of the two, depending which side you are on.',
      ],
      exports: ['Left', 'Right'],
      starter: `// Left :: e -> Either e a
const Left = (error) => ({
  isRight: false,
  map: (f) => {
  },
  chain: (f) => {
  },
  fold: (onLeft, onRight) => {
  },
  inspect: () => \`Left(\${JSON.stringify(error)})\`
})

// Right :: a -> Either e a
const Right = (value) => ({
  isRight: true,
  map: (f) => {
  },
  chain: (f) => {
  },
  fold: (onLeft, onRight) => {
  },
  inspect: () => \`Right(\${JSON.stringify(value)})\`
})
`,
      solution: `// Left :: e -> Either e a
const Left = (error) => ({
  isRight: false,
  map: (f) => Left(error),
  chain: (f) => Left(error),
  fold: (onLeft, onRight) => onLeft(error),
  inspect: () => \`Left(\${JSON.stringify(error)})\`
})

// Right :: a -> Either e a
const Right = (value) => ({
  isRight: true,
  map: (f) => Right(f(value)),
  chain: (f) => f(value),
  fold: (onLeft, onRight) => onRight(value),
  inspect: () => \`Right(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // Left maps too, which loses the error.
        `const Left = (error) => ({
  isRight: false,
  map: (f) => Left(f(error)),
  chain: (f) => f(error),
  fold: (onLeft, onRight) => onLeft(error),
  inspect: () => \`Left(\${JSON.stringify(error)})\`
})
const Right = (value) => ({
  isRight: true,
  map: (f) => Right(f(value)),
  chain: (f) => f(value),
  fold: (onLeft, onRight) => onRight(value),
  inspect: () => \`Right(\${JSON.stringify(value)})\`
})
`,
        // fold runs both handlers.
        `const Left = (error) => ({
  isRight: false,
  map: (f) => Left(error),
  chain: (f) => Left(error),
  fold: (onLeft, onRight) => { onRight(error); return onLeft(error) },
  inspect: () => \`Left(\${JSON.stringify(error)})\`
})
const Right = (value) => ({
  isRight: true,
  map: (f) => Right(f(value)),
  chain: (f) => f(value),
  fold: (onLeft, onRight) => { onLeft(value); return onRight(value) },
  inspect: () => \`Right(\${JSON.stringify(value)})\`
})
`,
        // chain on Right wraps again.
        `const Left = (error) => ({
  isRight: false,
  map: (f) => Left(error),
  chain: (f) => Left(error),
  fold: (onLeft, onRight) => onLeft(error),
  inspect: () => \`Left(\${JSON.stringify(error)})\`
})
const Right = (value) => ({
  isRight: true,
  map: (f) => Right(f(value)),
  chain: (f) => Right(f(value)),
  fold: (onLeft, onRight) => onRight(value),
  inspect: () => \`Right(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const Left = exp.Left as (e: any) => any;
        const Right = exp.Right as (v: any) => any;

        T.check('Right maps its value', () => {
          const r = Right(2).map((n: number) => n + 1);
          return r.fold(() => 'left', (v: number) => v) === 3 || `Got ${T.fmt(r)}, expected Right(3).`;
        });

        T.check('Left ignores map and keeps its error', () => {
          const spy = T.spyFn((n: number) => n + 1);
          const r = Left('boom').map(spy);
          if (spy.calls.length > 0) return 'map ran on a Left. The failure branch should pass straight through.';
          return (
            r.fold((e: string) => e, () => 'right') === 'boom' ||
            `The error came out as ${T.fmt(r.fold((e: any) => e, () => 'right'))}, expected "boom".`
          );
        });

        T.check('fold runs the right-hand handler on a Right', () => {
          const r = Right(5).fold(() => 'failed', (v: number) => `ok ${v}`);
          return r === 'ok 5' || `Got ${T.fmt(r)}`;
        });

        T.check('fold runs the left-hand handler on a Left', () => {
          const r = Left('bad').fold((e: string) => `failed ${e}`, () => 'ok');
          return r === 'failed bad' || `Got ${T.fmt(r)}`;
        });

        T.check('fold runs exactly one of the two', () => {
          const onLeft = T.spyFn((e: any) => e);
          const onRight = T.spyFn((v: any) => v);
          Right(1).fold(onLeft, onRight);
          if (onLeft.calls.length !== 0) return 'The left handler ran on a Right.';
          Left('x').fold(onLeft, onRight);
          return (
            onRight.calls.length === 1 ||
            `The right handler ran ${onRight.calls.length} times across a Right and a Left. Exactly one branch should run each time.`
          );
        });

        T.check('chain does not double-wrap', () => {
          const r = Right(2).chain((n: number) => Right(n * 10));
          const out = r.fold(() => 'left', (v: any) => v);
          return out === 20 || `Got ${T.fmt(out)}. A value of Right(20) means chain wrapped a result that was already an Either.`;
        });

        T.check('chain can fail partway through', () => {
          const r = Right(2).chain(() => Left('nope')).map((n: number) => n * 100);
          return r.fold((e: string) => e, () => 'right') === 'nope' || `Got ${T.fmt(r)}. Once it is a Left, the rest is skipped.`;
        });
      },
    },

    {
      id: 'apply',
      covers: ['distinct-failures', 'right-biased'],
      kind: 'code',
      role: 'apply',
      title: 'A parse pipeline that reports why it failed',
      prompt:
        'Write `parseAge`: the input must be valid JSON, must have an `age`, and that age must be a positive number. Each failure gets its own message.',
      hints: [
        'Wrap `JSON.parse` in a try/catch and turn the throw into a Left.',
        'Chain the three steps. The first Left ends it, and its message survives to the end.',
      ],
      exports: ['parseAge'],
      starter: `const Left = (error) => ({
  isRight: false,
  map: () => Left(error),
  chain: () => Left(error),
  fold: (onLeft) => onLeft(error)
})
const Right = (value) => ({
  isRight: true,
  map: (f) => Right(f(value)),
  chain: (f) => f(value),
  fold: (onLeft, onRight) => onRight(value)
})

// parseAge :: String -> Either String Number
const parseAge = (json) => {
  // "not json" / "no age" / "age must be positive"
}
`,
      solution: `const Left = (error) => ({
  isRight: false,
  map: () => Left(error),
  chain: () => Left(error),
  fold: (onLeft) => onLeft(error)
})
const Right = (value) => ({
  isRight: true,
  map: (f) => Right(f(value)),
  chain: (f) => f(value),
  fold: (onLeft, onRight) => onRight(value)
})

const parseJson = (s) => {
  try {
    return Right(JSON.parse(s))
  } catch (e) {
    return Left('not json')
  }
}

const getAge = (o) => (o != null && 'age' in o ? Right(o.age) : Left('no age'))

const checkPositive = (n) =>
  typeof n === 'number' && n > 0 ? Right(n) : Left('age must be positive')

// parseAge :: String -> Either String Number
const parseAge = (json) => parseJson(json).chain(getAge).chain(checkPositive)
`,
      broken: [
        // Lets the JSON throw escape instead of turning it into a Left.
        `const Left = (error) => ({ isRight: false, map: () => Left(error), chain: () => Left(error), fold: (onLeft) => onLeft(error) })
const Right = (value) => ({ isRight: true, map: (f) => Right(f(value)), chain: (f) => f(value), fold: (onLeft, onRight) => onRight(value) })

const parseAge = (json) => {
  const o = JSON.parse(json)
  if (!('age' in o)) return Left('no age')
  return o.age > 0 ? Right(o.age) : Left('age must be positive')
}
`,
        // One message for every failure, which tells the caller nothing.
        `const Left = (error) => ({ isRight: false, map: () => Left(error), chain: () => Left(error), fold: (onLeft) => onLeft(error) })
const Right = (value) => ({ isRight: true, map: (f) => Right(f(value)), chain: (f) => f(value), fold: (onLeft, onRight) => onRight(value) })

const parseAge = (json) => {
  try {
    const o = JSON.parse(json)
    if (!('age' in o) || typeof o.age !== 'number' || o.age <= 0) return Left('invalid')
    return Right(o.age)
  } catch (e) {
    return Left('invalid')
  }
}
`,
      ],
      checks: (T, exp) => {
        const parseAge = exp.parseAge as (s: string) => any;
        const out = (s: string) => parseAge(s).fold((e: string) => ({ err: e }), (v: number) => ({ ok: v }));

        T.check('Valid input gives the age', () => {
          const r = out('{"age": 30}');
          return T.eq(r, { ok: 30 }) || `Got ${T.fmt(r)}`;
        });

        T.check('Broken JSON is reported as such, not thrown', () => {
          let r;
          try {
            r = out('not json at all');
          } catch {
            return 'The JSON error escaped. Catch it and turn it into a Left, or the caller gets an exception instead of a value.';
          }
          return T.eq(r, { err: 'not json' }) || `Got ${T.fmt(r)}, expected the message "not json".`;
        });

        T.check('A missing age says so', () => {
          const r = out('{"name": "ada"}');
          return T.eq(r, { err: 'no age' }) || `Got ${T.fmt(r)}, expected the message "no age".`;
        });

        T.check('A non-positive age says so', () => {
          const r = out('{"age": -1}');
          return T.eq(r, { err: 'age must be positive' }) || `Got ${T.fmt(r)}, expected "age must be positive".`;
        });

        T.check('An age of zero is not positive', () => {
          const r = out('{"age": 0}');
          return T.eq(r, { err: 'age must be positive' }) || `Got ${T.fmt(r)}`;
        });

        T.check('Each failure has its own message', () => {
          const messages = ['nope', '{"name":"ada"}', '{"age":-1}'].map((s) => (out(s) as any).err);
          return (
            new Set(messages).size === 3 ||
            `The three failures gave ${T.fmt(messages)}. Either exists so the caller learns which step failed.`
          );
        });
      },
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['carries-the-reason', 'right-biased', 'typed-signature'],
      title: "Satisfy Either<E, A>",
      prompt:
        "The type is given. Write `map`, `mapLeft` and `fold` so each one touches only the side its signature names.",
      hints: [
        "`map` returns `Either<E, B>`. `E` is unchanged, so a left passes through exactly as it arrived.",
        "`mapLeft` is the mirror image. Same shape, other tag.",
        "`fold` returns a bare `B`. Both handlers produce one, which is why there is nothing left to unwrap.",
      ],
      exports: ['map', 'mapLeft', 'fold'],
      starter: `type Either<E, A> =
  | { tag: 'left', left: E }
  | { tag: 'right', right: A }

const map = <E, A, B>(f: (a: A) => B, e: Either<E, A>): Either<E, B> => e as never

const mapLeft = <E, A, F>(f: (e: E) => F, e: Either<E, A>): Either<F, A> => e as never

const fold = <E, A, B>(onLeft: (e: E) => B, onRight: (a: A) => B, e: Either<E, A>): B =>
  undefined as never
`,
      solution: `type Either<E, A> =
  | { tag: 'left', left: E }
  | { tag: 'right', right: A }

const map = <E, A, B>(f: (a: A) => B, e: Either<E, A>): Either<E, B> =>
  e.tag === 'right' ? { tag: 'right', right: f(e.right) } : e

const mapLeft = <E, A, F>(f: (e: E) => F, e: Either<E, A>): Either<F, A> =>
  e.tag === 'left' ? { tag: 'left', left: f(e.left) } : e

const fold = <E, A, B>(onLeft: (e: E) => B, onRight: (a: A) => B, e: Either<E, A>): B =>
  e.tag === 'left' ? onLeft(e.left) : onRight(e.right)
`,
      broken: [
        `type Either<E, A> =
  | { tag: 'left', left: E }
  | { tag: 'right', right: A }

const map = <E, A, B>(f: (a: A) => B, e: Either<E, A>): Either<E, B> =>
  e.tag === 'right'
    ? { tag: 'right', right: f(e.right) }
    : { tag: 'left', left: f(e.left as never) as never }

const mapLeft = <E, A, F>(f: (e: E) => F, e: Either<E, A>): Either<F, A> =>
  e.tag === 'left' ? { tag: 'left', left: f(e.left) } : e

const fold = <E, A, B>(onLeft: (e: E) => B, onRight: (a: A) => B, e: Either<E, A>): B =>
  e.tag === 'left' ? onLeft(e.left) : onRight(e.right)
`,
        `type Either<E, A> =
  | { tag: 'left', left: E }
  | { tag: 'right', right: A }

const map = <E, A, B>(f: (a: A) => B, e: Either<E, A>): Either<E, B> =>
  e.tag === 'right' ? { tag: 'right', right: f(e.right) } : e

const mapLeft = <E, A, F>(f: (e: E) => F, e: Either<E, A>): Either<F, A> =>
  e.tag === 'right' ? { tag: 'right', right: f(e.right as never) as never } : e as never

const fold = <E, A, B>(onLeft: (e: E) => B, onRight: (a: A) => B, e: Either<E, A>): B =>
  e.tag === 'left' ? onLeft(e.left) : onRight(e.right)
`,
        `type Either<E, A> =
  | { tag: 'left', left: E }
  | { tag: 'right', right: A }

const map = <E, A, B>(f: (a: A) => B, e: Either<E, A>): Either<E, B> =>
  e.tag === 'right' ? { tag: 'right', right: f(e.right) } : e

const mapLeft = <E, A, F>(f: (e: E) => F, e: Either<E, A>): Either<F, A> =>
  e.tag === 'left' ? { tag: 'left', left: f(e.left) } : e

const fold = <E, A, B>(onLeft: (e: E) => B, onRight: (a: A) => B, e: Either<E, A>): B =>
  onRight((e as { right: A }).right)
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
        const { map, mapLeft, fold } = exp;
        const left = (v: unknown) => ({ tag: 'left', left: v });
        const right = (v: unknown) => ({ tag: 'right', right: v });

        T.check('map reaches the right', () => {
          const r = map((n: number) => n * 2, right(21));
          return T.eq(r, right(42)) || `Doubling a right gave ${T.fmt(r)}.`;
        });

        T.check('map leaves the left alone, reason and all', () => {
          let ran = false;
          const r = map((n: number) => { ran = true; return n * 2; }, left('bad input'));
          if (ran) return 'The function ran on a left. `f` is typed to take the right, so there is nothing on a left to hand it.';
          return T.eq(r, left('bad input')) || `Mapping a left gave ${T.fmt(r)}. The reason has to survive untouched.`;
        });

        T.check('mapLeft is the mirror image', () => {
          const r = mapLeft((s: string) => s.toUpperCase(), left('bad'));
          return T.eq(r, left('BAD')) || `mapLeft over a left gave ${T.fmt(r)}.`;
        });

        T.check('mapLeft leaves a right alone', () => {
          let ran = false;
          const r = mapLeft((s: string) => { ran = true; return s; }, right(1));
          if (ran) return 'mapLeft ran its function on a right. It only names `E` in its signature.';
          return T.eq(r, right(1)) || `mapLeft over a right gave ${T.fmt(r)}.`;
        });

        T.check('fold picks the right handler and returns a bare value', () => {
          const describe = (e: unknown) => fold((err: string) => 'failed: ' + err, (n: number) => 'got ' + n, e);
          const a = describe(right(3));
          const b = describe(left('nope'));
          return (a === 'got 3' && b === 'failed: nope') || `fold gave ${T.fmt(a)} and ${T.fmt(b)}.`;
        });

        T.check('The two sides stay distinguishable', () => {
          const r = fold(() => 'L', () => 'R', left('x'));
          return r === 'L' || `Folding a left ran the right handler. The tag is the only thing that decides.`;
        });

        T.law('Mapping with identity changes nothing, on either side', 60, (G) => {
          const e = G.bool() ? right(G.int()) : left(G.str());
          const r = map((x: number) => x, e);
          return T.eq(r, e) || `${T.fmt(e)} came back as ${T.fmt(r)}.`;
        });

        T.law('A left survives any number of maps', 60, (G) => {
          const reason = G.str();
          const r = map(G.fn().f, map(G.fn().f, left(reason)));
          return T.eq(r, left(reason)) || `After two maps the left read ${T.fmt(r)}.`;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'distinct-failures'],
      title: "map names only A, so the reason survives",
      prompt:
        "`map` is typed `(f: (a: A) => B, e: Either<E, A>) => Either<E, B>`, and `E` goes in and out untouched. Type an array of what folding each of these gives after mapping and mapping the left.",
      hints: [
        "Mapping a left does nothing at all, because there is no `A` on that side to hand `f`.",
        "`mapLeft` is the mirror: it does nothing to a right.",
        "`fold` returns a bare `B`, and both handlers have to produce the same type.",
      ],
      context: `type Either<E, A> =
  | { tag: 'left', left: E }
  | { tag: 'right', right: A }

const map = <E, A, B>(f: (a: A) => B, e: Either<E, A>): Either<E, B> =>
  e.tag === 'right' ? { tag: 'right', right: f(e.right) } : e

const mapLeft = <E, A, F>(f: (e: E) => F, e: Either<E, A>): Either<F, A> =>
  e.tag === 'left' ? { tag: 'left', left: f(e.left) } : e

const fold = <E, A, B>(onLeft: (e: E) => B, onRight: (a: A) => B, e: Either<E, A>): B =>
  e.tag === 'left' ? onLeft(e.left) : onRight(e.right)

const bad: Either<string, number> = { tag: 'left', left: 'nope' }
const good: Either<string, number> = { tag: 'right', right: 3 }
`,
      placeholder: "[..., ...]",
      expect: ["NOPE","got 6"],
      solution: "[fold((e) => e.toUpperCase(), (n) => 'got ' + n, mapLeft((e: string) => e, map((n: number) => n * 2, bad))), fold((e) => e.toUpperCase(), (n) => 'got ' + n, map((n: number) => n * 2, good))]",
      broken: [
        "['nope', 'got 6']",
        "['NOPE', 'got 3']",
        "[fold((e) => e, (n) => 'got ' + n, bad), fold((e) => e.toUpperCase(), (n) => 'got ' + n, map((n: number) => n * 2, good))]",
      ],
    },
  ],
};
