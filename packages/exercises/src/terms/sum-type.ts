import type { ExerciseSet } from '@fpx/engine/types';

export const sumType: ExerciseSet = {
  termId: 'sum-type',
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'A tagged union with an exhaustive match',
      prompt:
        'A sum type is a value that is one of several shapes. Build the three constructors and a `match` that refuses to run unless every case is handled.',
      hints: [
        'Each constructor tags its value: `{ type: "loading" }`, `{ type: "ok", data }`, `{ type: "failed", error }`.',
        '`match` looks the handler up by tag. Missing handlers should throw, not silently return undefined.',
      ],
      exports: ['Loading', 'Ok', 'Failed', 'match'],
      starter: `const Loading = () => {
}
const Ok = (data) => {
}
const Failed = (error) => {
}

// match :: (State, { loading, ok, failed }) -> a
const match = (state, handlers) => {
}
`,
      solution: `const Loading = () => ({ type: 'loading' })
const Ok = (data) => ({ type: 'ok', data })
const Failed = (error) => ({ type: 'failed', error })

const CASES = ['loading', 'ok', 'failed']

// match :: (State, { loading, ok, failed }) -> a
const match = (state, handlers) => {
  const missing = CASES.filter((c) => typeof handlers[c] !== 'function')
  if (missing.length) {
    throw new TypeError(\`match is missing a handler for: \${missing.join(', ')}\`)
  }
  return handlers[state.type](state)
}
`,
      broken: [
        // No exhaustiveness check, so a forgotten case silently returns undefined.
        `const Loading = () => ({ type: 'loading' })
const Ok = (data) => ({ type: 'ok', data })
const Failed = (error) => ({ type: 'failed', error })
const match = (state, handlers) => handlers[state.type](state)
`,
        // Checks that handlers exist, but then always runs the first one.
        `const Loading = () => ({ type: 'loading' })
const Ok = (data) => ({ type: 'ok', data })
const Failed = (error) => ({ type: 'failed', error })
const CASES = ['loading', 'ok', 'failed']
const match = (state, handlers) => {
  const missing = CASES.filter((c) => typeof handlers[c] !== 'function')
  if (missing.length) throw new TypeError('missing handler')
  return handlers.loading(state)
}
`,
        // Constructors do not carry their payload.
        `const Loading = () => ({ type: 'loading' })
const Ok = () => ({ type: 'ok' })
const Failed = () => ({ type: 'failed' })
const CASES = ['loading', 'ok', 'failed']
const match = (state, handlers) => {
  const missing = CASES.filter((c) => typeof handlers[c] !== 'function')
  if (missing.length) throw new TypeError('missing handler')
  return handlers[state.type](state)
}
`,
      ],
      checks: (T, exp) => {
        const Loading = exp.Loading as () => any;
        const Ok = exp.Ok as (d: any) => any;
        const Failed = exp.Failed as (e: any) => any;
        const match = exp.match as (s: any, h: Record<string, (s: any) => any>) => any;

        const handlers = {
          loading: () => 'still loading',
          ok: (s: any) => `got ${s.data}`,
          failed: (s: any) => `failed: ${s.error}`,
        };

        T.check('Each constructor tags its value', () => {
          const tags = [Loading().type, Ok(1).type, Failed('e').type];
          return (
            T.eq(tags, ['loading', 'ok', 'failed']) ||
            `The tags were ${T.fmt(tags)}. Each case needs a tag so match can tell them apart.`
          );
        });

        T.check('Ok and Failed carry their payload', () => {
          const ok = Ok('data');
          const failed = Failed('boom');
          if (ok.data !== 'data') return `Ok("data") lost its payload: ${T.fmt(ok)}`;
          return failed.error === 'boom' || `Failed("boom") lost its payload: ${T.fmt(failed)}`;
        });

        T.check('match runs the branch that matches', () => {
          const results = [match(Loading(), handlers), match(Ok(42), handlers), match(Failed('x'), handlers)];
          return (
            T.eq(results, ['still loading', 'got 42', 'failed: x']) ||
            `Got ${T.fmt(results)}. Each state should reach its own branch.`
          );
        });

        T.check('A missing handler throws rather than returning nothing', () => {
          try {
            match(Ok(1), { loading: () => 'l', ok: (s: any) => s.data } as any);
            return 'A match with no handler for "failed" was allowed. A silent undefined is exactly what exhaustiveness is meant to prevent.';
          } catch {
            return true;
          }
        });

        T.check('The error names the case that was forgotten', () => {
          try {
            match(Loading(), { loading: () => 'l', ok: () => 'o' } as any);
            return 'No error was thrown.';
          } catch (e) {
            const message = (e as Error).message ?? '';
            return /failed/.test(message) || `The message was ${T.fmt(message)}. Name the missing case.`;
          }
        });

        T.check('A complete match never throws', () => {
          try {
            match(Failed('e'), handlers);
            return true;
          } catch (e) {
            return `A match with all three handlers threw: ${(e as Error).message}`;
          }
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which of these are sum types?',
      prompt: 'A sum type is "one of these". Select every example.',
      options: [
        {
          code: '// Either e a  is Left e or Right a',
          correct: true,
          why: 'Exactly two shapes, and a value is one of them.',
        },
        {
          code: '// { x :: Number, y :: Number }',
          correct: false,
          why: 'A point has an x AND a y. That is a product.',
        },
        {
          code: '// Option a  is Some a or None',
          correct: true,
          why: 'One of two shapes again.',
        },
        {
          code: '// Boolean  is true or false',
          correct: true,
          why: 'The smallest interesting sum type: two shapes, neither carrying anything.',
        },
        {
          code: '// [a]  a list of values',
          correct: true,
          why: 'Empty or a head followed by a tail. A list is a sum type that happens to be recursive.',
        },
      ],
    },
  ],
};
