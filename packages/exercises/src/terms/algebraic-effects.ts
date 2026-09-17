import type { ExerciseSet } from '@fpx/engine/types';

export const algebraicEffects: ExerciseSet = {
  termId: 'algebraic-effects',
  rubric: [
    {
      id: 'ask-do-not-do',
      statement:
        "Knows the program states what it needs rather than how to get it, and carries no knowledge of the handler.",
    },
    {
      id: 'drive-it',
      statement:
        "Can write the interpreter that answers each request and feeds the answer back so the program can continue.",
    },
    {
      id: 'swap-handlers',
      statement:
        "Can run one program under two handlers and get different behaviour without touching the program.",
    },
  ],
  notes: `A program written with algebraic effects **asks** rather than **does**. It yields a request and
waits; something else decides how to answer.

\`\`\`js
function* greeting() {
  const name = yield { type: 'ask_config', key: 'name' }
  yield { type: 'log', message: \`greeting \${name}\` }
  return \`Hello, \${name}\`
}
\`\`\`

Nothing in there says where the name comes from or what logging means. The interpreter drives
it, answering each request and **feeding the answer back**:

\`\`\`js
const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  while (!step.done) {
    const request = step.value
    step = it.next(handlers[request.type](request))
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ without this the program sees undefined
  }
  return step.value
}
\`\`\`

The payoff is that one program runs two ways, with no change to the program:

\`\`\`js
run(greeting, {
  ask_config: (r) => config[r.key],
  log: (r) => console.log(r.message)
})   // 'Hello, ada'

run(greeting, {
  ask_config: () => 'test',
  log: () => {}
})   // 'Hi, test'   no config, no console, no mocking
\`\`\`

It works because a generator hands you the [continuation](#continuation) as a value. Once the
rest of the program is a thing you hold, you can resume it with whatever you like, or not at
all.`,
  rungs: [
    {
      id: 'implement',
      covers: ['drive-it', 'swap-handlers'],
      kind: 'code',
      role: 'implement',
      title: 'Write the handler',
      prompt:
        'A program written with algebraic effects asks for what it needs and lets someone else decide how to provide it. Write `run`, which drives a generator by answering each request it yields.',
      hints: [
        'The generator yields a request like `{ type: "ask", key: "url" }` and waits for an answer.',
        'Look the request type up in `handlers`, call it, and feed the answer back in with `it.next(answer)`.',
        'Stop when the generator reports it is done, and hand back its return value.',
      ],
      exports: ['run'],
      starter: `// run :: (Generator, { [String]: (payload -> a) }) -> b
const run = (gen, handlers) => {
  // drive the generator, answering each request from handlers
}
`,
      solution: `// run :: (Generator, { [String]: (payload -> a) }) -> b
const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  while (!step.done) {
    const request = step.value
    const handler = handlers[request.type]
    if (!handler) throw new Error(\`No handler for \${request.type}\`)
    step = it.next(handler(request))
  }
  return step.value
}
`,
      broken: [
        // Never feeds the answer back, so the program sees undefined at every step.
        `const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  while (!step.done) {
    handlers[step.value.type](step.value)
    step = it.next()
  }
  return step.value
}
`,
        // Handles one request and gives up.
        `const run = (gen, handlers) => {
  const it = gen()
  const step = it.next()
  if (step.done) return step.value
  return it.next(handlers[step.value.type](step.value)).value
}
`,
        // Returns the last answer instead of what the program returned.
        `const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  let last
  while (!step.done) {
    last = handlers[step.value.type](step.value)
    step = it.next(last)
  }
  return last
}
`,
      ],
      checks: (T, exp) => {
        const run = exp.run as (gen: () => Generator<any, any, any>, handlers: Record<string, (r: any) => any>) => any;

        const ask = (key: string) => ({ type: 'ask_config', key });
        const log = (message: string) => ({ type: 'log', message });

        function* greeting(): Generator<any, string, any> {
          const name = yield ask('name');
          yield log(`greeting ${name}`);
          const greeting = yield ask('greeting');
          return `${greeting}, ${name}`;
        }

        const config: Record<string, string> = { name: 'ada', greeting: 'Hello' };
        const baseHandlers = () => {
          const logged: string[] = [];
          return {
            logged,
            handlers: {
              ask_config: (r: any) => config[r.key],
              log: (r: any) => {
                logged.push(r.message);
              },
            },
          };
        };

        T.check('The answers reach the program', () => {
          const { handlers } = baseHandlers();
          const r = run(greeting, handlers);
          return (
            r === 'Hello, ada' ||
            `Got ${T.fmt(r)}, expected "Hello, ada". Each answer has to be fed back in with it.next(answer), or the program sees undefined.`
          );
        });

        T.check('Every request is handled, not just the first', () => {
          const { logged, handlers } = baseHandlers();
          run(greeting, handlers);
          return (
            T.eq(logged, ['greeting ada']) ||
            `The log handler saw ${T.fmt(logged)}. Keep driving until the generator reports done.`
          );
        });

        T.check('The program’s return value comes back, not the last answer', () => {
          function* answersThenReturns(): Generator<any, string, any> {
            yield ask('name');
            return 'the return value';
          }
          const { handlers } = baseHandlers();
          const r = run(answersThenReturns, handlers);
          return r === 'the return value' || `Got ${T.fmt(r)}. Hand back what the program returned.`;
        });

        T.check('A program that asks for nothing still works', () => {
          function* pure(): Generator<any, number, any> {
            return 7;
          }
          const { handlers } = baseHandlers();
          const r = run(pure, handlers);
          return r === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('Swapping the handlers changes the result without touching the program', () => {
          const { handlers } = baseHandlers();
          const real = run(greeting, handlers);

          const testConfig: Record<string, string> = { name: 'test', greeting: 'Hi' };
          const testHandlers = {
            ask_config: (r: any) => testConfig[r.key],
            log: () => {},
          };
          const fake = run(greeting, testHandlers);

          return (
            (real === 'Hello, ada' && fake === 'Hi, test') ||
            `The same program gave ${T.fmt(real)} under one set of handlers and ${T.fmt(fake)} under another. Expected "Hello, ada" and "Hi, test".`
          );
        });

        T.check('Effects happen in the order the program asks for them', () => {
          const seen: string[] = [];
          function* ordered(): Generator<any, void, any> {
            yield log('first');
            yield log('second');
            yield log('third');
          }
          run(ordered, { log: (r: any) => seen.push(r.message) });
          return T.eq(seen, ['first', 'second', 'third']) || `The handler saw ${T.fmt(seen)}.`;
        });
      },
    },

    {
      id: 'recognize',
      covers: ['ask-do-not-do'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does the program know?',
      prompt:
        'A program written with algebraic effects yields `{ type: "ask_config", key: "url" }`. What does it know about where the answer comes from?',
      options: [
        {
          code: '// Nothing. It states what it needs and something else decides how to supply it',
          correct: true,
          why: 'Separating the request from the interpretation is the whole idea. The same program runs against a real config or a fake one.',
        },
        {
          code: '// That the answer comes from a file on disk',
          correct: false,
          why: 'If the program knew that, swapping in a test handler would mean rewriting it.',
        },
        {
          code: '// That the handler is asynchronous',
          correct: false,
          why: 'Also a handler concern. The program just asks and waits to be resumed.',
        },
        {
          code: '// That there is exactly one handler for it',
          correct: false,
          why: 'Any number of handlers can interpret the same request differently.',
        },
      ],
    },

    {
      id: 'swap',
      kind: 'code',
      role: 'apply',
      covers: ['ask-do-not-do', 'swap-handlers', 'drive-it'],
      title: "One program, two handlers",
      prompt:
        "`greet` is written for you and you may not change it. Write two handler sets so the same program talks to a real environment under one and to a fixture under the other. If the program has to change, it knew too much.",
      hints: [
        "The program yields a request and waits. Whatever you send back becomes the value of the `yield`.",
        "`runWith` drives the generator: yield a request, look up the handler by its type, send the answer back, repeat until done.",
        "The two handler sets differ only in what they answer. Neither one edits `greet`.",
      ],
      exports: ['greet', 'runWith', 'live', 'fixture'],
      starter: `// Do not change this. It states what it needs and knows nothing about how.
function* greet(id) {
  const name = yield { type: 'lookup', id }
  yield { type: 'log', message: 'greeting ' + name }
  return 'hello ' + name
}

// runWith :: (Handlers, Generator) -> a
const runWith = (handlers, gen) => undefined

// live :: Handlers
const live = {}

// fixture :: Handlers
const fixture = {}
`,
      solution: `// Do not change this. It states what it needs and knows nothing about how.
function* greet(id) {
  const name = yield { type: 'lookup', id }
  yield { type: 'log', message: 'greeting ' + name }
  return 'hello ' + name
}

// runWith :: (Handlers, Generator) -> a
const runWith = (handlers, gen) => {
  let step = gen.next()
  while (!step.done) {
    const request = step.value
    step = gen.next(handlers[request.type](request))
  }
  return step.value
}

// live :: Handlers
const live = {
  lookup: (request) => 'user-' + request.id,
  log: (request) => console.log(request.message)
}

// fixture :: Handlers
const fixture = {
  lookup: () => 'ada',
  log: () => undefined
}
`,
      broken: [
        `function* greet(id) {
  const name = yield { type: 'lookup', id }
  yield { type: 'log', message: 'greeting ' + name }
  return 'hello ' + name
}
const runWith = (handlers, gen) => {
  const step = gen.next()
  return step.value
}
const live = { lookup: (r) => 'user-' + r.id, log: (r) => console.log(r.message) }
const fixture = { lookup: () => 'ada', log: () => undefined }
`,
        `function* greet(id) {
  const name = yield { type: 'lookup', id }
  yield { type: 'log', message: 'greeting ' + name }
  return 'hello ' + name
}
const runWith = (handlers, gen) => {
  let step = gen.next()
  while (!step.done) step = gen.next()
  return step.value
}
const live = { lookup: (r) => 'user-' + r.id, log: (r) => console.log(r.message) }
const fixture = { lookup: () => 'ada', log: () => undefined }
`,
        `function* greet(id) {
  const name = yield { type: 'lookup', id }
  yield { type: 'log', message: 'greeting ' + name }
  return 'hello ' + name
}
const runWith = (handlers, gen) => {
  let step = gen.next()
  while (!step.done) step = gen.next(handlers[step.value.type](step.value))
  return step.value
}
const live = { lookup: () => 'ada', log: () => undefined }
const fixture = { lookup: () => 'ada', log: () => undefined }
`,
      ],
      checks: (T, exp) => {
        const { greet, runWith, live, fixture } = exp;

        T.check('The program runs to a result under the fixture', () => {
          const r = runWith(fixture, greet(1));
          return r === 'hello ada' || `Under the fixture it gave ${T.fmt(r)}, expected 'hello ada'.`;
        });

        T.check('The same program gives a different answer under the live handlers', () => {
          const r = runWith(live, greet(7));
          return (
            r === 'hello user-7' ||
            `Under live it gave ${T.fmt(r)}, expected 'hello user-7'. The two handler sets are meant to differ.`
          );
        });

        T.check('The two are actually different', () => {
          const a = runWith(live, greet(7));
          const b = runWith(fixture, greet(7));
          return a !== b || `Both handler sets gave ${T.fmt(a)}. Swapping them should change the behaviour without touching the program.`;
        });

        T.check('Every request is answered, not just the first', () => {
          const seen: string[] = [];
          const watching = {
            lookup: () => {
              seen.push('lookup');
              return 'ada';
            },
            log: () => {
              seen.push('log');
              return undefined;
            },
          };
          runWith(watching, greet(1));
          return T.eq(seen, ['lookup', 'log']) || `The handlers saw ${T.fmt(seen)}, expected a lookup then a log.`;
        });

        T.check('The answer is fed back into the program', () => {
          const r = runWith({ lookup: () => 'grace', log: () => undefined }, greet(1));
          return (
            r === 'hello grace' ||
            `Answering the lookup with 'grace' gave ${T.fmt(r)}. The value handed to next() becomes the value of the yield.`
          );
        });

        T.check('The request carries what the handler needs', () => {
          let got: unknown;
          runWith(
            {
              lookup: (req: { id: number }) => {
                got = req.id;
                return 'x';
              },
              log: () => undefined,
            },
            greet(42),
          );
          return got === 42 || `The lookup handler was given ${T.fmt(got)} as the id.`;
        });

        T.check('The program still knows nothing about how', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('function* greet'), src.indexOf('const runWith'));
          return (
            !/console\.|fetch\(|localStorage|Math\.random|Date\.now/.test(body) ||
            'The program reaches for something itself. Asking rather than doing is the whole point, and a program that does anything cannot be re-handled.'
          );
        });
      },
    },
  ],
};
