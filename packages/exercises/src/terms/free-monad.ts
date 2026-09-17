import type { ExerciseSet } from '@fpx/engine/types';

export const freeMonad: ExerciseSet = {
  termId: 'free-monad',
  rubric: [
    {
      id: 'program-as-data',
      statement:
        "Knows a free monad turns a program into data, so nothing happens until an interpreter runs it.",
    },
    {
      id: 'instruction-carries',
      statement:
        "Can add an instruction that carries what an interpreter needs to act on it.",
    },
    {
      id: 'many-interpreters',
      statement:
        "Can run one program under two interpreters and get different behaviour with no change to the program.",
    },
  ],
  notes: `A free monad turns a program into **data**. The instructions describe what should happen;
nothing happens until an interpreter walks them.

\`\`\`js
const Write = (text) => ({ type: 'write', text })
const Read  = (key)  => ({ type: 'read', key })

const program = [Write('start'), Read('name'), Write('done')]
// a plain array. Nothing has been written or read.
\`\`\`

Each instruction has to carry enough for an interpreter to act:

\`\`\`js
const Read = () => ({ type: 'read' })          // read what?
const Read = (key) => ({ type: 'read', key })
\`\`\`

The interpreter is a lookup from tag to behaviour:

\`\`\`js
const interpret = (program, handlers) =>
  program.map((instruction) => handlers[instruction.type](instruction))
\`\`\`

And the payoff is two interpreters over one program:

\`\`\`js
interpret(program, {
  write: (i) => i.text,
  read: (i) => String(store[i.key])
})   // ['start', 'ada', 'done']

interpret(program, {
  write: (i) => \`WROTE: \${i.text}\`,
  read: () => 'stub'
})   // ['WROTE: start', 'stub', 'WROTE: done']
\`\`\`

No mocking, no dependency injection, no test doubles: the test interpreter is just another
function. You can also write one that logs the program without running it, or one that counts
how many reads it would do.

The cost is real. Every instruction is an allocation, the interpreter is an indirection, and
you have built a small language that someone now has to learn. It earns its place when the same
program genuinely needs more than one interpretation.

The name comes from getting a monad "for free" from any functor, which is the formal version of
this trick.`,
  rungs: [
    {
      id: 'apply',
      covers: ['instruction-carries', 'many-interpreters'],
      kind: 'code',
      role: 'apply',
      title: 'Add an instruction to the program',
      prompt:
        'A Free Monad turns a program into data, so the same program can be interpreted in more than one way. Add a `Read` instruction and teach both interpreters about it.',
      hints: [
        'An instruction is a plain object with a tag and a payload.',
        'The interpreter is a lookup from tag to behavior. Each one answers Read differently.',
      ],
      exports: ['Read', 'runReal', 'runTest'],
      starter: `// The program is a list of instructions, built by the constructors below.
const Write = (text) => ({ type: 'write', text })

// Read :: String -> Instruction
const Read = (key) => {
}

// runReal :: ([Instruction], Object) -> [String]
// write appends to the output; read looks the key up in store
const runReal = (program, store) => {
}

// runTest :: [Instruction] -> [String]
// write appends "WROTE: text"; read always answers "stub"
const runTest = (program) => {
}
`,
      solution: `const Write = (text) => ({ type: 'write', text })

// Read :: String -> Instruction
const Read = (key) => ({ type: 'read', key })

const interpret = (program, handlers) =>
  program.map((instruction) => handlers[instruction.type](instruction))

// runReal :: ([Instruction], Object) -> [String]
const runReal = (program, store) =>
  interpret(program, {
    write: (i) => i.text,
    read: (i) => String(store[i.key])
  })

// runTest :: [Instruction] -> [String]
const runTest = (program) =>
  interpret(program, {
    write: (i) => \`WROTE: \${i.text}\`,
    read: () => 'stub'
  })
`,
      broken: [
        // The two interpreters behave identically, so there is no point separating them.
        `const Write = (text) => ({ type: 'write', text })
const Read = (key) => ({ type: 'read', key })
const interpret = (program, handlers) => program.map((i) => handlers[i.type](i))
const runReal = (program, store) => interpret(program, { write: (i) => i.text, read: (i) => String(store[i.key]) })
const runTest = (program) => interpret(program, { write: (i) => i.text, read: (i) => 'stub' })
`,
        // Read carries no key, so the real interpreter has nothing to look up.
        `const Write = (text) => ({ type: 'write', text })
const Read = () => ({ type: 'read' })
const interpret = (program, handlers) => program.map((i) => handlers[i.type](i))
const runReal = (program, store) => interpret(program, { write: (i) => i.text, read: () => 'unknown' })
const runTest = (program) => interpret(program, { write: (i) => \`WROTE: \${i.text}\`, read: () => 'stub' })
`,
        // The interpreters drop instructions they do not recognize instead of handling them.
        `const Write = (text) => ({ type: 'write', text })
const Read = (key) => ({ type: 'read', key })
const runReal = (program, store) => program.filter((i) => i.type === 'write').map((i) => i.text)
const runTest = (program) => program.filter((i) => i.type === 'write').map((i) => \`WROTE: \${i.text}\`)
`,
      ],
      checks: (T, exp) => {
        const Read = exp.Read as (k: string) => any;
        const runReal = exp.runReal as (p: any[], s: Record<string, any>) => string[];
        const runTest = exp.runTest as (p: any[]) => string[];
        const Write = (text: string) => ({ type: 'write', text });

        const program = [Write('start'), Read('name'), Write('done')];

        T.check('Read is data, carrying the key it wants', () => {
          const r = Read('name');
          return (
            r && r.type === 'read' && r.key === 'name' ||
            `Got ${T.fmt(r)}. An instruction is a description, so it has to carry enough for an interpreter to act on it.`
          );
        });

        T.check('The real interpreter reads from the store', () => {
          const r = runReal(program, { name: 'ada' });
          return T.eq(r, ['start', 'ada', 'done']) || `Got ${T.fmt(r)}, expected ["start", "ada", "done"].`;
        });

        T.check('The test interpreter answers without a store', () => {
          const r = runTest(program);
          return (
            T.eq(r, ['WROTE: start', 'stub', 'WROTE: done']) ||
            `Got ${T.fmt(r)}, expected ["WROTE: start", "stub", "WROTE: done"].`
          );
        });

        T.check('Every instruction is handled, none dropped', () => {
          const r = runTest(program);
          return (
            r.length === program.length ||
            `Three instructions produced ${r.length} results. Filtering out the ones an interpreter does not know about hides the gap rather than closing it.`
          );
        });

        T.check('The two interpreters really do differ', () => {
          const real = runReal(program, { name: 'ada' });
          const test = runTest(program);
          return (
            !T.eq(real, test) ||
            `Both gave ${T.fmt(real)}. If the interpreters agree on everything there is no reason to have two.`
          );
        });

        T.check('The program itself is untouched by running it', () => {
          const frozen = T.freeze([Write('a'), Read('k')]);
          runTest(frozen as any[]);
          runReal(frozen as any[], { k: 'v' });
          return (
            T.eq(frozen, [
              { type: 'write', text: 'a' },
              { type: 'read', key: 'k' },
            ]) || 'Running the program changed it. A description should be reusable.'
          );
        });

        T.check('The same program runs under both without being rewritten', () => {
          // This is the whole point: one description, many interpretations.
          const p = [Read('a'), Write('x')];
          const real = runReal(p, { a: '1' });
          const test = runTest(p);
          return (
            real.length === 2 && test.length === 2 ||
            `The same program gave ${T.fmt(real)} and ${T.fmt(test)}. Both interpreters have to accept it as it is.`
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['program-as-data'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does "free" buy you?',
      prompt: 'Why build a program as data rather than just calling the functions?',
      options: [
        {
          code: '// The same program can be interpreted more than one way:\n// really, in a test, or logged without running at all',
          correct: true,
          why: 'Separating the description from the interpretation is the whole trade. A test interpreter needs no mocking.',
        },
        {
          code: '// It runs faster',
          correct: false,
          why: 'It runs slower. You are paying for flexibility.',
        },
        {
          code: '// It makes the instructions pure',
          correct: false,
          why: 'Building the description is pure, but the real interpreter still performs the effects. They have just moved.',
        },
        {
          code: '// It removes the need for a monad',
          correct: false,
          why: 'The opposite. It gives you a monad for free from any functor, which is where the name comes from.',
        },
      ],
    },

    {
      id: 'inspect',
      kind: 'code',
      role: 'apply',
      covers: ['program-as-data', 'many-interpreters'],
      title: "Read a program without running it",
      prompt:
        "If the program is data, you can look at it before anything happens. Write `describe`, which lists the instructions a program will issue without performing any of them, and two interpreters that give the same program different behaviour.",
      hints: [
        "`describe` drives the program the way an interpreter does, but answers every request with a placeholder and records the type instead of acting.",
        "A generator that has not been advanced has done nothing. Only `next` moves it.",
        "The two interpreters differ only in what they answer, never in what they are handed.",
      ],
      exports: ['describe', 'runWith', 'loud', 'quiet', 'saveUser'],
      starter: `// Do not change this.
function* saveUser(name) {
  const id = yield { type: 'insert', name }
  yield { type: 'notify', id }
  return id
}

// describe :: (() -> Generator) -> [String]   the instruction types, nothing performed
const describe = (makeProgram) => []

// runWith :: (Handlers, Generator) -> a
const runWith = (handlers, gen) => undefined

// loud :: Handlers    notify records something
const loud = {}

// quiet :: Handlers   notify records nothing
const quiet = {}
`,
      solution: `// Do not change this.
function* saveUser(name) {
  const id = yield { type: 'insert', name }
  yield { type: 'notify', id }
  return id
}

// describe :: (() -> Generator) -> [String]   the instruction types, nothing performed
const describe = (makeProgram) => {
  const gen = makeProgram()
  const types = []
  let step = gen.next()
  while (!step.done) {
    types.push(step.value.type)
    step = gen.next(null)
  }
  return types
}

// runWith :: (Handlers, Generator) -> a
const runWith = (handlers, gen) => {
  let step = gen.next()
  while (!step.done) step = gen.next(handlers[step.value.type](step.value))
  return step.value
}

// loud :: Handlers    notify records something
const loud = {
  sent: [],
  insert: (req) => 'id-' + req.name,
  notify: (req) => loud.sent.push(req.id)
}

// quiet :: Handlers   notify records nothing
const quiet = {
  sent: [],
  insert: (req) => 'id-' + req.name,
  notify: () => undefined
}
`,
      broken: [
        `function* saveUser(name) {
  const id = yield { type: 'insert', name }
  yield { type: 'notify', id }
  return id
}
const describe = (makeProgram) => ['insert']
const runWith = (handlers, gen) => {
  let step = gen.next()
  while (!step.done) step = gen.next(handlers[step.value.type](step.value))
  return step.value
}
const loud = { sent: [], insert: (r) => 'id-' + r.name, notify: (r) => loud.sent.push(r.id) }
const quiet = { sent: [], insert: (r) => 'id-' + r.name, notify: () => undefined }
`,
        `function* saveUser(name) {
  const id = yield { type: 'insert', name }
  yield { type: 'notify', id }
  return id
}
const describe = (makeProgram) => {
  const gen = makeProgram()
  const types = []
  let step = gen.next()
  while (!step.done) {
    types.push(step.value.type)
    step = gen.next(null)
  }
  return types
}
const runWith = (handlers, gen) => {
  let step = gen.next()
  while (!step.done) step = gen.next(handlers[step.value.type](step.value))
  return step.value
}
const loud = { sent: [], insert: (r) => 'id-' + r.name, notify: () => undefined }
const quiet = { sent: [], insert: (r) => 'id-' + r.name, notify: () => undefined }
`,
        `function* saveUser(name) {
  const id = yield { type: 'insert', name }
  yield { type: 'notify', id }
  return id
}
const describe = (makeProgram) => {
  const gen = makeProgram()
  const types = []
  let step = gen.next()
  while (!step.done) {
    types.push(step.value.type)
    step = gen.next(null)
  }
  return types
}
const runWith = (handlers, gen) => {
  const step = gen.next()
  return step.value
}
const loud = { sent: [], insert: (r) => 'id-' + r.name, notify: (r) => loud.sent.push(r.id) }
const quiet = { sent: [], insert: (r) => 'id-' + r.name, notify: () => undefined }
`,
      ],
      checks: (T, exp) => {
        const { describe, runWith, loud, quiet } = exp;
        const saveUser = exp.saveUser;

        T.check('describe lists the instructions in order', () => {
          const r = describe(() => saveUser('ada'));
          return T.eq(r, ['insert', 'notify']) || `describe gave ${T.fmt(r)}, expected ['insert', 'notify'].`;
        });

        T.check('describe performs nothing', () => {
          const before = loud.sent.length;
          describe(() => saveUser('ada'));
          return (
            loud.sent.length === before ||
            'Something was actually sent while describing. A program that is data can be read without being run, and that is the property being demonstrated.'
          );
        });

        T.check('describe is not a hardcoded list', () => {
          function* other() {
            yield { type: 'notify', id: 1 };
            yield { type: 'notify', id: 2 };
            yield { type: 'insert', name: 'x' };
          }
          const r = describe(() => other());
          return T.eq(r, ['notify', 'notify', 'insert']) || `A different program described as ${T.fmt(r)}.`;
        });

        T.check('Running it produces the result', () => {
          const r = runWith(quiet, saveUser('ada'));
          return r === 'id-ada' || `Running under quiet gave ${T.fmt(r)}.`;
        });

        T.check('The loud interpreter records the notification', () => {
          loud.sent.length = 0;
          runWith(loud, saveUser('ada'));
          return T.eq(loud.sent, ['id-ada']) || `loud.sent holds ${T.fmt(loud.sent)}, expected ['id-ada'].`;
        });

        T.check('The quiet interpreter does not', () => {
          quiet.sent.length = 0;
          runWith(quiet, saveUser('ada'));
          return (
            T.eq(quiet.sent, []) ||
            `quiet.sent holds ${T.fmt(quiet.sent)}. The two interpreters are meant to differ, or there is only one of them.`
          );
        });

        T.check('Both reach the same result despite behaving differently', () => {
          const a = runWith(loud, saveUser('grace'));
          const b = runWith(quiet, saveUser('grace'));
          return a === b || `loud gave ${T.fmt(a)} and quiet gave ${T.fmt(b)}.`;
        });

        T.check('Every instruction is answered, not just the first', () => {
          const seen: string[] = [];
          runWith(
            { insert: () => { seen.push('insert'); return 'id'; }, notify: () => { seen.push('notify'); } },
            saveUser('x'),
          );
          return T.eq(seen, ['insert', 'notify']) || `The interpreter saw ${T.fmt(seen)}.`;
        });
      },
    },
  ],
};
