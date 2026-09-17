# FP Jargon: Applied Edition

A practice app for the 73 concepts in
[Functional Programming Jargon](https://github.com/hemanth/functional-programming-jargon) by
[Hemanth HM](https://github.com/hemanth). His project explains the vocabulary and maps it into
an interactive graph. This one asks you to write the code.

**[Try it](https://onehungrymind.github.io/functional-programming-exercises/)** &middot;
**[The original](https://hemanth.github.io/functional-programming-jargon/)**

Every concept has a rubric saying what competence looks like, rungs that make you demonstrate
each item, and teaching written to get you there. Your code runs in a sandboxed worker and is
graded against example checks and property-based laws, with counterexamples printed back.

```
73 concepts    249 rubric items    261 rungs    802 graded variants
```

## Why this exists

A glossary tells you what a word means. It cannot tell you whether you could use the thing.
Fifty of the seventy-three upstream entries are under 400 characters, which is the right length
for a reference and the wrong length for learning to write a lens.

So the unit here is not the definition, it is the demonstration. Each concept starts from a
question: what would a person need to be able to do to show solid competency in this? That
becomes a rubric, the rubric becomes rungs, and the rungs decide what the teaching has to
cover. `npm run verify` enforces the traceability in both directions, so a claim nobody is
asked to demonstrate fails the build, and so does a rung asking about something never taught.

## What a concept looks like

**Learn** is the upstream entry continued by teaching written for this app, as one voice rather
than two. Concepts whose types carry the lesson get a second lap: the same idea again with the
types written down, behind a clear divider.

**Practice** is a ladder of rungs. Every rubric item is demonstrated at least twice and at
least once by running code, so nothing can be cleared by ruling out three wrong answers.

| Rung kind | Count | What it is |
|---|---|---|
| `code` | 182 | Write it. Graded by example checks and property-based laws. |
| `choice` | 50 | Pick from options, for the genuinely conceptual questions. |
| `expr` | 29 | Type one expression. Producing beats picking. |

Rungs come in roles, because "write it" is not the only way to show you understand something:
95 `implement`, 79 `recognize`, 70 `apply`, 14 `break` and 3 `guided`. The break rungs are the
ones worth looking at first. Trampoline makes you watch a stack overflow at 100,000 frames
before the bounced version survives it. Equational Reasoning makes you find the input where
rewriting `f(x) + f(x)` as `2 * f(x)` changes the answer.

Where a rung leans on a concept the curriculum has not reached yet, it says so and links there,
because the material is interdependent and that is the point rather than a defect.

## Grading

Your code runs in a Web Worker the main thread can terminate, so an infinite loop costs you a
timeout rather than the tab. The harness gives you a fake console, spies on `Date.now`,
`Math.random` and `performance.now`, and freezes inputs so a mutation throws instead of passing
a careless test.

Laws are checked by property, not example. Generated functions carry their source, so a
counterexample reads `x => x * 2` rather than `[Function]`.

Typed rungs erase their types with [sucrase](https://github.com/alangpierce/sucrase) and grade
at runtime, and reject an answer leaning on `any`. That is a deliberate trade: checking the
learner's own annotations would mean shipping the TypeScript compiler, roughly 1.5MB gzip
against sucrase's 61KB. What the rung tests is reading a signature and satisfying it.

## Quality gates

`npm run verify` runs every solution, starter and broken variant through the same evaluator the
browser uses, in a worker with a timeout and a heap cap, because a broken variant is meant to
be wrong and a wrong one can loop forever. It fails if:

- a solution does not pass, a starter does pass, or a "broken" variant does not fail
- a rubric item has no rung, or a rung covers no rubric item
- an item is demonstrated only once, or only by a `choice` rung
- the notes never mention what a rubric item says they must teach
- a prompt does not name something the learner has to write
- a hint quotes its own solution
- the generated manifest, notes or `solutions.html` have drifted

802 variants are graded on every run.

## Running it

```sh
npm install
npm run dev          # the app
npm run verify       # the content gate
npm test             # unit tests
npm run test:e2e     # Playwright
```

After changing an exercise, run `npm run build:content`.

[`solutions.html`](solutions.html) is the back of the book: every rubric, prompt, hint, solution
and failing variant on one page. It is committed rather than hidden. Working a rung out unaided
is the better path, but reading the answer and reasoning backwards is also how people learn.

[`docs/teaching-day.md`](docs/teaching-day.md) is a plan for teaching this material in a day.

## Layout

```
data/          normalized snapshot of upstream, committed
scripts/       sync, verify, manifest and solutions generation
packages/
  engine/      framework-free: worker sandbox, harness, law library, shape rules
  editor/      framework-free CodeMirror setup
  exercises/   the content, one file per concept
  practice-react/  React panel built on engine + editor
apps/web/      the shell: canvas graph, drawer, routing, progress
```

Dependencies point one way: `apps/web` to `practice-react` to `engine`, `editor` and
`exercises`, and those to nothing app-specific. That is what would keep a contribution upstream
down to a thin adapter.

## Relationship to the original

The concept data is generated from Hemanth's `readme.md` and nothing here edits his repository.
All 75 term ids match his exactly, because `npm run sync:jargons` normalizes the same source he
parses. The graph layout approach and the category colors are derived from his web app.
Everything else is original.

See [NOTICE.md](NOTICE.md) for the attribution and the upstream license.

If you are Hemanth and want any of this upstream, open an issue here and we will work out the
shape. It is your vocabulary; this is a layer on top of it.

## License

MIT. The upstream content it builds on is MIT, copyright Hemanth HM.
