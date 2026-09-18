# Where this stands

Written 2026-09-18, so a cold session can pick up without re-deriving anything.

## The short version

The app is finished, deployed, and public. Hemanth has been told about it and has asked for a
pull request against his repository. That PR has not been started. Everything below is either
context for that, or a record of decisions that would otherwise have to be made twice.

## Live

| | |
|---|---|
| App | https://onehungrymind.github.io/functional-programming-exercises/ |
| Answer key | https://onehungrymind.github.io/functional-programming-exercises/solutions.html |
| Repo | https://github.com/onehungrymind/functional-programming-exercises |
| Workshop plan | `docs/teaching-day.md` |

Deploys on push to `main` via `.github/workflows/pages.yml`, which runs `verify` and the unit
tests before it builds. A failing content gate stops the deploy.

## Content, as it stands

```
73 concepts    249 rubric items    261 rungs    802 graded variants
182 code rungs    50 choice    29 expr
95 implement    79 recognize    70 apply    14 break    3 guided
25 concepts have a typed second lap
```

Suites: 114 unit, 56 Playwright, `npm run verify`, all green. 503 broken variants, none of
which fail by crashing.

## The Hemanth thread

He is the author of [functional-programming-jargon](https://github.com/hemanth/functional-programming-jargon),
which this is built on. The repo is MIT and actively developed; his last commit was 2026-09-14.

**Sent:** an email offering the work, saved at `~/Desktop/hemanth-fp-jargon.html`. It laid out
three outcomes (take it upstream, link to it, or stay clear of it) and stated a preference for
integrating into one project. It told him plainly the exercise content is around 33,000 lines
and "not a patch you merge on a Sunday".

**His reply, in full:**

> Thanks! I would actually suggest submitting a PR directly to the main repository instead.

"Instead" means instead of linking or staying separate. He is choosing integration, and he was
told the scale before saying so.

**Read nothing more into the terseness.** "Submit a PR" is what maintainers say to clear an
inbox. It is not an evaluation of the work, in either direction.

## The PR plan

Not started. This is the agreed shape.

### Arrangement

`../functional-programming-jargon` is no longer a read-only reference. It is a clone of
`onehungrymind/functional-programming-jargon`, our fork, with `upstream` pointing at Hemanth's.
Branch it, build it, open PRs from it. Never push to `upstream`.

**His default branch is `master`, not `main`.**

### Why the port is tractable

- `practice-react` imports only `react`, `lucide-react` (he already has both), and our own
  packages. No coupling to our app shell at all.
- The exercises are keyed by term-id strings and import no data. All 75 term ids match his
  exactly, so our `data/` snapshot and `sync-jargons.mjs` never enter his repo.
- Only 7 distinct cross-package import specifiers need rewriting, mostly `@fpx/engine/types`.
  It is a find-and-replace, not a rewrite.
- Vite compiles `.ts`/`.tsx` natively, so no build configuration is needed for TypeScript.

### PR 1, roughly 4,000 lines

Everything lands in one new directory so the diff is contained:

```
app/src/practice/
  engine/       packages/engine/src            2,750 lines
  editor/       packages/editor/src              315
  ui/           packages/practice-react/src      792
  exercises/    11 Core Functions concepts     4,041
  practice.css  scoped tokens, no Tailwind      ~700
```

Core Functions is: function, arity, lambda, higher-order-functions-hof, closure, predicate,
pure-function, thunk, partial-function, total-function, trampoline. 11 concepts, 36 rungs.

**Three of his files get touched.** `app/src/components/NodeDetailPanel.jsx` gains tab state and
a Practice pane, `app/package.json` gains the CodeMirror packages plus acorn and sucrase, and
one import line for the stylesheet.

His `npm run build` and `node tests/e2e.test.mjs` have to pass. Then push the branch to
`origin` and open the PR against his `master`.

The remaining 62 concepts follow in category batches. There is no version of this where anyone
writes a 37,000-line PR in one go.

### Decisions made, to be stated in the PR body with an offer to change either

**TypeScript.** His repo is all `.jsx`. Vite builds `.ts` with zero config, and we already
depend on sucrase, so stripping to plain JS later is mechanical.

**A scoped stylesheet rather than Tailwind.** Our panel uses about 35 CSS custom properties.
A self-contained stylesheet cannot collide with his existing styles. Converting to Tailwind
classes later is possible if he prefers it.

### The part that will draw review comments

His `NodeDetailPanel.jsx` is a single scrolling column with no tabs. Adding a Practice tab
changes how his existing content is laid out. That is the one piece of genuine design work and
it cannot be made invisible.

## Things learned the hard way, worth not rediscovering

**His default branch is `master`.** Already said above, and worth saying twice.

**`sync-jargons.mjs` credits Hemanth by a hardcoded URL**, not by reading the git remote. That
is why attribution still points at him now that `origin` is our fork. It was luck rather than
design. If that script is ever refactored, do not make the repo URL dynamic.

**A check must be safe against the mistake it tests for.** This is in CLAUDE.md and it still
caught us twice in one session: a lazy-evaluation rung with an endless generator, and two
apomorphism variants that never terminated. All three ate the verify worker's heap.

**JetBrains Mono ligatures are off on purpose.** It draws `!=` as one crossed-out equals and
`!==` as a nearly identical one, which is actively harmful in an app teaching that distinction.

**The e2e suite must never hardcode rung counts.** Nine tests once failed on content changes
that were entirely correct. Counts come from the generated manifest now.

**Run `npm run build:content` after changing an exercise**, not just `build:manifest`. It does
the manifest, the notes, and `solutions.html`, and verify fails if any of the three is stale.

## Open, nobody is blocked on them

Accessibility has never been tested, and was deliberately deferred while this is a
single-person tool. `docs/progress.md` has what doing it properly would involve; the canvas
graph having no accessible representation is the real gap.

## If you are picking this up cold

Read `CLAUDE.md` first. It has the hard rules, and most of them exist because breaking one cost
a session. `docs/progress.md` has the build history and a write-up of the polish pass.
`solutions.html` is the fastest way to see what the content actually is.
