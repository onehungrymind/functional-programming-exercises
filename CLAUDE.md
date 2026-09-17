# functional-programming-exercises

Standalone practice app for the 73 concepts on [FP Jargon](https://hemanth.github.io/functional-programming-jargon/).
Plan: `docs/fp-exercises-plan.md`. Progress log: `docs/progress.md`.
Teaching a day of this: `docs/teaching-day.md`. It names specific rungs to demo, and verify
fails if any of them stops existing.
Visual reference: `docs/reference/upstream-0*.png` (screenshots of the upstream site).

## Hard rules

- `../functional-programming-jargon` is READ-ONLY. Never create, edit, delete, or generate files
  there. Never run npm install, build, parse, or any git command that changes its state.
  `git log` and `git rev-parse` are fine.
- Only `scripts/sync-jargons.mjs` reads the sibling folder. No app code, test, or build step
  may import or read from it. CI runs from a clone of this repo alone.
- Every code rung ships `starter`, `solution`, and `broken` variants. `npm run verify` must pass
  before committing exercise changes.
- Every concept gets at least two rungs and at least one that is code-graded. Enforced by verify.
- **Every rubric item is demonstrated twice, and at least once by running code.** An item behind
  a single rung is a single point of failure: if that rung is soft, the claim is unverified and
  nothing says so. An item graded only by a `choice` rung can be cleared by elimination, which
  is not the same as being able to do the thing. Both are enforced by verify. If an existing
  rung already demonstrates an item, say so in its `covers` rather than adding a rung for the
  count, but only where a learner lacking that competency would actually fail its checks.
- **The rubric is the spec, the rungs are the tests, the notes are the implementation.**
  Write the rubric first: what would a person need to know to show solid competency here?
  Then rungs that demonstrate each item, then notes that teach it. Verify enforces the
  traceability both ways: a rubric item with no rung is a claim nothing checks, and a rung
  covering no item is asking about something we never said mattered.
- **Verify checks that the notes at least mention each rubric item.** It derives candidate
  terms from the statement and wants two of them in the prose; set `teaches` on the item where
  the statement is abstract and that picks the wrong words. This cannot tell good teaching from
  bad. It catches the case that actually happened: a rung asking about something Learn never
  covered at all.
- **A rung may only ask about something the Learn tab has covered.** Upstream is a glossary,
  not a syllabus: 50 of 73 entries are under 400 characters of prose. Diverge from it freely.
- **The typed material is a second lap, not a continuation.** It lives in `typedNotes`, gets
  its own divider in Learn and in the stepper, and is visible but marked as not yet reached
  until the JavaScript rungs are clear. Never slide from JavaScript into TypeScript inside one
  run of prose. Verify requires `typedNotes` whenever a set has a `lang: 'ts'` rung, and
  rejects `typedNotes` with no typed rung to test it.
- **A typed rung supplies the interface.** `lang: 'ts'` erases types with sucrase and grades at
  runtime, so what is tested is reading a signature and satisfying it. It does not check the
  learner's own annotations; that would mean shipping the TypeScript compiler, roughly 1.5MB
  gzip against sucrase's 61KB. Add one only where the signature carries the lesson, which is
  the generic containers and optics, not `(n: number) => string`.
- **A hint describes, it does not quote.** Someone who reads every hint should still have to
  write the line themselves; the solution button is what exists for giving up. Verify rejects a
  hint that quotes more than a fragment of its own solution, unless that text is already in the
  starter, where it gives nothing away.
- **Prefer an `expr` rung to a `choice` rung when the answer is a value.** Producing beats
  picking: a multiple-choice rung can be cleared by elimination. Keep `choice` for genuinely
  conceptual questions where there is no value to type.
- **Code carries more than prose.** Show the concept, do not only describe it. Prefer a
  contrast pair, wrong above right, with the output in a trailing comment. Prose is the
  connective tissue between examples, not the vehicle. Verify requires at least three code
  blocks per set of notes and reports the overall share by volume.
- **Learn reads as one voice.** The upstream entry and our notes are not labelled as separate
  sources, because to a learner they are not: it is all just the explanation. Attribution lives
  in the footer link and NOTICE.md. Write notes that continue the page, not that annotate it.
  Every set declares a `rubric` or `rubricTodo`, and either `notes`, `upstreamIsEnough`, or
  `rubricTodo`. Verify prints how many concepts are still unmigrated.
- Learning order comes from `apps/web/src/curriculum.ts`, never from the graph. The graph's
  links say "related to", not "depends on", and their direction is whichever way the upstream
  README cross-referenced. Ask it for concepts with no prerequisites and it offers comonad and
  hylomorphism.
- A check must be safe against the mistake it is testing for. Never hand learner code an endless
  source when the likely wrong answer would drain it.
- After changing an exercise set, run `npm run build:manifest`. It writes two files, and verify
  fails if either drifts. `manifest.ts` is structure and ships in the entry bundle; `notes.ts`
  is the prose and the drawer imports it on demand. Neither carries the checks or the variants.
  Prose does not belong in the manifest: it is six times the size of the structure and nobody
  reads it until a drawer is open.
- One plan phase per session unless told otherwise. Stop at the phase exit criteria.

## Design rules

- No emojis anywhere: not in the UI, not in docs, not in commit messages. Icons come from
  `lucide-react`, rendered as `currentColor` line icons through the design tokens.
- The whole UI is monospace. Design tokens live in `apps/web/src/styles/tokens.css` and every
  surface, including the CodeMirror theme, reads from them.
- No AI/Claude/Anthropic attribution in commits or PR bodies.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server for `apps/web` |
| `npm run build` | Build every workspace that has a build script |
| `npm test` | Vitest across the repo |
| `npm run typecheck` | `tsc --build` over all project references |
| `npm run verify` | Every solution passes, every broken fails, every starter fails, every termId exists |
| `npm run test:e2e` | Playwright against `apps/web`, starting the dev server itself |
| `npm run build:manifest` | Regenerate `packages/exercises/src/{manifest,notes}.ts` after changing an exercise |
| `npm run sync:jargons` | Re-read the sibling clone into `data/`. Never commits. |
| `npx tsx scripts/build-answer-key.mjs` | Authoring copy of every rubric, solution, hint and failing variant. Gitignored. |

## Layout

```
data/          normalized snapshot of upstream, committed. The only coupling to the clone.
scripts/       sync-jargons.mjs (reads sibling), verify-exercises.mjs (never does)
packages/
  engine/      framework-free: worker sandbox, runner, harness, law library, shape rules
  editor/      framework-free CodeMirror setup, theme, lint
  exercises/   content, one file per term id, no UI imports
  practice-react/  React PracticePanel built on engine + editor
apps/web/      the shell: canvas graph, drawer, routing, progress, theming
```

Dependency direction is one way and must stay that way:
`apps/web` -> `practice-react` -> `engine`, `editor`, `exercises` -> nothing app-specific.
That is what keeps a future upstream contribution down to a thin adapter.
