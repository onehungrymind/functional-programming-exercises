import type { ExerciseSet } from '@fpx/engine/types';

export const either: ExerciseSet = {
  termId: 'either',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Left, Right, and fold',
      prompt:
        'Either carries a success or a failure, and says which. `map` and `chain` work on the Right only; `fold` is how you finally handle both.',
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
  ],
};
