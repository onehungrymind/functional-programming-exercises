import type { ExerciseSet } from '@fpx/engine/types';

export const value: ExerciseSet = {
  termId: 'value',
  rubric: [
    {
      id: 'what-qualifies',
      statement:
        "Knows what can be a value in JavaScript, and that functions and classes are among them.",
    },
    {
      id: 'expression-not-statement',
      statement:
        "Can tell an expression from a statement, and knows only the former produces a value.",
    },
    {
      id: 'functions-as-data',
      statement:
        "Can store operations in a data structure and look one up at runtime, rather than branching on a name.",
    },
  ],
  notes: `A value is anything you can assign to a variable, pass as an argument, and return. In
JavaScript that list is wider than people expect.

\`\`\`js
const a = 42
const b = { name: 'ada' }
const c = [1, 2, 3]
const d = (x) => x * 2         // functions are values
const e = class Point {}       // so are classes, which are functions underneath
const f = Symbol('id')
\`\`\`

What is **not** a value is a statement. The test is whether you can put it on the right of an
\`=\`:

\`\`\`js
const x = if (cond) { 1 } else { 2 }     // SyntaxError: if is a statement
const x = cond ? 1 : 2                   // fine: the ternary is an expression

const y = for (const n of ns) {}         // SyntaxError
const y = ns.map((n) => n)               // fine
\`\`\`

That distinction is why expression-oriented code composes and statement-oriented code does not.
An expression can go anywhere a value can go; a statement can only sit in a block.

The practical payoff of functions being values is that behaviour becomes **data**, and a table
replaces a branch:

\`\`\`js
const apply = (name, a, b) => {
  if (name === 'add') return a + b        // adding an operation means editing this
  if (name === 'sub') return a - b
  return null
}

const registry = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b
}
const apply = (name, a, b) => {
  const op = registry[name]
  return typeof op === 'function' ? op(a, b) : null
}

registry.pow = (a, b) => a ** b           // extended without touching apply
apply('pow', 2, 5)                        // 32
\`\`\``,
  rungs: [
    {
      id: 'recognize',
      covers: ['what-qualifies', 'expression-not-statement'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'What can be a value?',
      prompt:
        'A value is anything that can be assigned to a variable, passed as an argument, and returned. Select everything that qualifies in JavaScript.',
      options: [
        { code: '42', correct: true, why: 'The obvious case.' },
        {
          code: '(x) => x * 2',
          correct: true,
          why: 'Functions are values here. That is what makes higher-order functions possible.',
        },
        { code: '{ name: "ada" }', correct: true, why: 'Objects are values, and can be passed around freely.' },
        { code: '[1, 2, 3]', correct: true, why: 'So are arrays.' },
        {
          code: 'if (x) { ... }',
          correct: false,
          why: 'A statement, not an expression. You cannot assign it to anything.',
        },
        {
          code: 'class Point { }',
          correct: true,
          why: 'A class is a function underneath, so it too can be stored and passed.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['functions-as-data', 'what-qualifies'],
      kind: 'code',
      role: 'implement',
      title: 'Treat a function as data',
      prompt:
        'Build `registry`, a plain object mapping names to operations, and `apply`, which looks one up and runs it. Functions really are just values you can store.',
      hints: [
        'The registry is an ordinary object whose values happen to be functions.',
        '`apply` should say something useful when the name is not there rather than throwing.',
      ],
      exports: ['registry', 'apply'],
      starter: `// registry :: { [String]: (Number, Number) -> Number }
const registry = {
  // add, sub, mul
}

// apply :: (String, Number, Number) -> Number | null
const apply = (name, a, b) => {
  // look the operation up and run it, or give back null
}
`,
      solution: `// registry :: { [String]: (Number, Number) -> Number }
const registry = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b
}

// apply :: (String, Number, Number) -> Number | null
const apply = (name, a, b) => {
  const op = registry[name]
  return typeof op === 'function' ? op(a, b) : null
}
`,
      broken: [
        // Throws on an unknown name instead of answering.
        `const registry = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b
}
const apply = (name, a, b) => registry[name](a, b)
`,
        // Stores the results of calling the operations rather than the operations.
        `const registry = {
  add: (0 + 0),
  sub: (0 - 0),
  mul: (0 * 0)
}
const apply = (name, a, b) => registry[name] ?? null
`,
        // A switch instead of a lookup: the operations are no longer data.
        `const registry = {}
const apply = (name, a, b) => {
  if (name === 'add') return a + b
  if (name === 'sub') return a - b
  if (name === 'mul') return a * b
  return null
}
`,
      ],
      checks: (T, exp) => {
        const registry = exp.registry as Record<string, (a: number, b: number) => number>;
        const apply = exp.apply as (name: string, a: number, b: number) => number | null;

        T.check('The registry holds functions, not results', () => {
          const missing = ['add', 'sub', 'mul'].filter((k) => typeof registry[k] !== 'function');
          return (
            missing.length === 0 ||
            `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not a function. Store the operation itself, so it can be run later with any arguments.`
          );
        });

        T.check('Each operation does what its name says', () => {
          const cases: [string, number][] = [
            ['add', 7],
            ['sub', 1],
            ['mul', 12],
          ];
          for (const [name, want] of cases) {
            const got = registry[name]?.(4, 3);
            if (got !== want) return `registry.${name}(4, 3) gave ${T.fmt(got)}, expected ${want}.`;
          }
          return true;
        });

        T.check('apply looks the operation up and runs it', () => {
          const r = apply('mul', 6, 7);
          return r === 42 || `apply("mul", 6, 7) gave ${T.fmt(r)}`;
        });

        T.check('An unknown name gives null rather than throwing', () => {
          const r = apply('divide', 6, 3);
          return r === null || `Got ${T.fmt(r)}. Looking up a name that is not there should answer, not blow up.`;
        });

        T.check('apply reads from the registry, so adding an entry works', () => {
          // This is the payoff of keeping operations as data.
          (registry as any).pow = (a: number, b: number) => a ** b;
          const r = apply('pow', 2, 5);
          delete (registry as any).pow;
          return (
            r === 32 ||
            `After adding pow to the registry, apply("pow", 2, 5) gave ${T.fmt(r)}. apply should read from the registry rather than hardcoding the names.`
          );
        });
      },
    },

    {
      id: 'expressions',
      kind: 'code',
      role: 'apply',
      covers: ['expression-not-statement', 'functions-as-data'],
      title: "Turn statements into expressions",
      prompt:
        "Only an expression produces a value, which is why a statement cannot be passed to anything. Rewrite `label` and `rate` as expressions, then use them inline in `describe` without a single intermediate binding.",
      hints: [
        "`if` is a statement. The ternary is its expression form, and it evaluates to something.",
        "`switch` is a statement too. A lookup object is data, and indexing it is an expression.",
        "`describe` should read as one expression: nothing assigned, nothing returned early.",
      ],
      exports: ['label', 'rate', 'describe'],
      starter: `// label :: Number -> String
const label = (n) => {
  if (n > 0) {
    return 'positive'
  } else if (n < 0) {
    return 'negative'
  } else {
    return 'zero'
  }
}

// rate :: String -> Number
const rate = (tier) => {
  switch (tier) {
    case 'gold': return 0.2
    case 'silver': return 0.1
    default: return 0
  }
}

// describe :: (Number, String) -> String
const describe = (n, tier) => {
  const l = label(n)
  const r = rate(tier)
  return l + ' at ' + r
}
`,
      solution: `// label :: Number -> String
const label = (n) => (n > 0 ? 'positive' : n < 0 ? 'negative' : 'zero')

// rate :: String -> Number
const rates = { gold: 0.2, silver: 0.1 }
const rate = (tier) => rates[tier] ?? 0

// describe :: (Number, String) -> String
const describe = (n, tier) => label(n) + ' at ' + rate(tier)
`,
      broken: [
        `const label = (n) => {
  if (n > 0) return 'positive'
  if (n < 0) return 'negative'
  return 'zero'
}
const rates = { gold: 0.2, silver: 0.1 }
const rate = (tier) => rates[tier] ?? 0
const describe = (n, tier) => label(n) + ' at ' + rate(tier)
`,
        `const label = (n) => (n > 0 ? 'positive' : n < 0 ? 'negative' : 'zero')
const rate = (tier) => {
  switch (tier) {
    case 'gold': return 0.2
    case 'silver': return 0.1
    default: return 0
  }
}
const describe = (n, tier) => label(n) + ' at ' + rate(tier)
`,
        `const label = (n) => (n > 0 ? 'positive' : 'negative')
const rates = { gold: 0.2, silver: 0.1 }
const rate = (tier) => rates[tier] ?? 0
const describe = (n, tier) => label(n) + ' at ' + rate(tier)
`,
        `const label = (n) => (n > 0 ? 'positive' : n < 0 ? 'negative' : 'zero')
const rates = { gold: 0.2, silver: 0.1 }
const rate = (tier) => rates[tier]
const describe = (n, tier) => label(n) + ' at ' + rate(tier)
`,
      ],
      checks: (T, exp) => {
        const { label, rate, describe } = exp;

        T.check('label covers all three cases', () => {
          const got = [label(5), label(-5), label(0)];
          return T.eq(got, ['positive', 'negative', 'zero']) || `label gave ${T.fmt(got)} for 5, -5 and 0.`;
        });

        T.check('rate looks up the tiers it knows', () => {
          const got = [rate('gold'), rate('silver')];
          return T.eq(got, [0.2, 0.1]) || `rate gave ${T.fmt(got)} for gold and silver.`;
        });

        T.check('An unknown tier still produces a number', () => {
          const r = rate('bronze');
          return r === 0 || `rate('bronze') gave ${T.fmt(r)}. A missing key gives undefined, which is not a value you meant.`;
        });

        T.check('describe puts the two together', () => {
          const r = describe(5, 'gold');
          return r === 'positive at 0.2' || `describe(5, 'gold') gave ${T.fmt(r)}.`;
        });

        T.check('No if or switch statement is left', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
          const found = /\bif\s*\(/.test(src) ? 'if' : /\bswitch\s*\(/.test(src) ? 'switch' : '';
          return (
            !found ||
            `There is still an \`${found}\` statement. A statement does something; only an expression evaluates to a value, which is why one can be passed along and the other cannot.`
          );
        });

        T.check('describe holds no intermediate bindings', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const describe'));
          return (
            !/\b(const|let|var)\s+\w+\s*=/.test(body.slice(body.indexOf('=>'))) ||
            'describe still assigns to something along the way. Once both halves are expressions they can be written where they are used.'
          );
        });

        T.check('rate is backed by data rather than branching', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          return (
            /\{\s*gold\s*:/.test(src) || /'gold'\s*:/.test(src) || /"gold"\s*:/.test(src)
              ? true
              : 'The tiers are still written as control flow. Putting them in an object makes them data, which you can then look up, extend, or hand to something else.'
          );
        });
      },
    },
  ],
};
