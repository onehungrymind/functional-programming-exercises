# Progress

## Phase 1: Scaffold and data contract — done

npm workspaces, TypeScript project references, Vitest, `scripts/sync-jargons.mjs`,
`data/jargons.json`, `data/source.json`, `NOTICE.md`, `CLAUDE.md`.

Snapshot taken from upstream `62a3a2e` on 2026-09-16: 75 terms, 73 of them concepts, 130 links.

### Section 2 claims, checked against the clone

| Claim | Verdict |
|---|---|
| `app/src/data/jargons.json` is committed, no build needed | Confirmed |
| Top-level keys `meta`, `categories`, `terms`, `graph: {nodes, links}` | Confirmed |
| 75 terms, 130 links | Confirmed |
| Links typed `core` (112) or `reference` (18) | Confirmed |
| Term keys: id, title, depth, category, aliases, summary, body, codeBlocks, furtherReading, crossRefs, relatedIds | Confirmed, all eleven |
| `depth` is 2 for h2 and 3 for h3 | Confirmed. 61 at depth 2, 14 at depth 3 |
| Six categories with name, description, color, accent | Confirmed |
| 73 real concepts; `dealing-with-partial-functions` and `functional-programming-libraries-in-javascript` excluded | Confirmed |
| React 19 + Vite 8 + Tailwind 3 | Confirmed (react 19.3, vite 8.3, tailwind 3.4) |
| Light `#eaeae8`, dark `#121212`, all monospace | Confirmed |
| `GraphCanvas.jsx` is 913 lines | Confirmed |
| `canvas-confetti` installed but unused | Confirmed, it appears only in package.json |
| **"categories may be an array"** | **Wrong.** `categories` is an object keyed by id, not an array. The sync script flattens it to an ordered array so nothing downstream has to care. |
| **"Some list-like fields may be serialized strings"** | **Wrong.** Every array field is a real array. No unwrapping needed. The schema guard stays, since it is cheap and catches an upstream regression. |
| **`NodeDetailPanel.jsx` is 500 lines** | **Wrong.** It is 346 lines. The 500 in the plan is the drawer's pixel width, not its line count. |

### Things section 2 missed that turned out to matter

- **Category glyphs.** Upstream draws a math symbol inside every node and the plan never mentions
  it, but it is the most recognizable thing in the screenshots:
  `core-functions` λ, `composition` ∘, `purity-state` ≡, `category-morphisms` →,
  `algebraic-structures` ★, `types-data` ∑.
- **Category colors**, straight from the snapshot and matching the screenshots:
  core-functions `#3b82f6`, composition `#10b981`, purity-state `#f59e0b`,
  category-morphisms `#a855f7`, algebraic-structures `#ec4899`, types-data `#06b6d4`.
- **Upstream already uses `lucide-react`**, plus `marked` for markdown and `prismjs` for
  highlighting. The icon library matches this repo's standing rule, so no substitution needed.
- **The full token set** is in `app/src/index.css`, including `--surface`, `--surface-2`,
  `--line`, `--line-strong`, the easing curves, the 32px blueprint grid, and both Prism palettes.
  These were ported into `apps/web/src/styles/tokens.css` rather than re-derived.

### Deviations from the plan

- **Canvas, not SVG.** Section 5.8 says "use SVG first." Upstream renders to canvas with a
  hand-rolled force simulation, and the look in the screenshots is canvas-native: radial cluster
  glows, dashed constellation rings, a ripple pulse on the selected node, a lit particle
  travelling along highlighted links, arrowheads, glow shadows. Reproducing that in SVG means
  fighting the medium. Since the screenshots are the design reference, the graph is canvas.
- **Hand-rolled force simulation, not d3-force.** Section 5.8 suggests d3-force run to a fixed
  tick count and cached. Upstream integrates its own repulsion, spring, and cluster-gravity
  forces every frame, which is what produces the settling motion you see. d3-force would have
  been a dependency that reproduced it less exactly. See `apps/web/src/graph/simulation.ts`.
- **`isConcept` added to each term** during sync, so the app never has to hardcode the two
  non-concept ids.

## Phase 2: Engine — done

`packages/engine`: worker sandbox, main-thread runner, harness, labelled generators, acorn
shape rules, law library. `scripts/verify-exercises.mjs`. The POC's three concepts ported to
`packages/exercises` as real modules.

- `npm run verify`: 3 concepts, 6 code rungs, 24 variants graded through the real harness.
- 32 engine tests cover timeout-and-restart, stale `seq` dropping, a syntax error, a missing
  export, frozen-input mutation, effect spying, deterministic law counterexamples, and every
  shape rule.

Two deviations worth naming:

- **`inverted` does not flip results.** The plan reads as though the engine should negate a
  break rung's checks. The POC writes those checks already inverted ("the law checker finds a
  counterexample" passes when a law fails), so flipping again would invert twice and turn
  every readable failure message into a bare negation. The flag stays as UI framing.
- **The law library and the acorn shape rules landed here rather than in Phase 6.** The
  currying point-free rung and the functor rungs need them, and shipping a regex in the
  meantime only to delete it later was wasted work. Phase 6 is now the remaining suites
  (traversable, foldable, free monad, and the rest) plus their accept/reject tests.

## Phase 3: Editor — done

`packages/editor`: explicit extension list rather than `basicSetup`, a theme built from the
shared tokens, an acorn lint source at 200ms, a scope-aware completion source, and
Cmd/Ctrl+Enter.

- **Bundle: 142KB gzip, lazy-loaded.** Under the 150KB target. Getting there took three cuts.
  `basicSetup` was never used. The Learn tab's code blocks originally imported
  CodeMirror's `HighlightStyle` and `javascript()`, which drag `@codemirror/view`,
  autocomplete, and lint into the initial bundle; they now use the bare `@lezer/javascript`
  parser with a tag-to-CSS-class map that reads the same `--tok-*` tokens. And
  `practice-react` imports `@fpx/engine/runner` rather than the barrel, which was pulling
  acorn and the evaluator onto the main thread for nothing.
- Initial bundle is 174KB gzip, the worker another 41KB, both separate from the editor.

## Phase 4: Shell with drawer and practice — done

`apps/web` with tokens, hash routing, the drawer with Learn and Practice, the
category-grouped list, and `packages/practice-react`.

## Phase 5: Graph and progress — done

Canvas graph, progress store and arcs, the Practice filter, the next-concept suggestion,
and the completion ring pulse.

- **The layout takes 742 ticks to settle**, not the 220 first guessed. `settle()` now runs
  to quiescence rather than a fixed count, because the camera fits to the bounding box and a
  box measured mid-settle put a third of the graph off screen.
- **The camera fits the graph on open** instead of using a fixed zoom, which either cropped
  it on a laptop or stranded it on a large display.
- **The simulation stops when it is still** and wakes on a drag. A graph that drifts under
  the cursor is distracting, and an idle tab should not burn a core on physics.
- **Confetti is a hand-drawn ring pulse**, not `canvas-confetti`. Upstream installs that
  package and never uses it; it is not worth a dependency for two seconds of animation.

### Verification

- 28 Playwright tests: solving a rung, a wrong answer's message, the point-free shape rule,
  a syntax error, a missing export, the timeout path and the worker restart after it, choice
  grading and retry, all four deep-link shapes, search, Escape in and out of the editor,
  the theme toggle across a reload, the list fallback, keyboard graph navigation, progress
  export/import/reset, a 420px viewport, reduced motion, and **all 75 terms rendering in
  Learn with no console error**.
- With `../functional-programming-jargon` moved aside entirely, `npm test`, `npm run verify`,
  and the production build all still pass. Nothing outside `scripts/sync-jargons.mjs`
  mentions the sibling folder.

## Phase 6: Shape rules and the law library — not started

## Phase 7: Content at scale — in progress

Order: Core Functions, Composition & Flow, Purity & Reasoning, Types & Data Modeling,
Algebraic Structures, Category & Morphisms. One commit per category, `npm run verify` green.

### Core Functions — done (11 of 11)

`arity`, `closure`, `function`, `higher-order-functions-hof`, `lambda`, `partial-function`,
`predicate`, `pure-function`, `thunk`, `total-function`, `trampoline`.

Every concept has at least two rungs and at least one that is code-graded.
`npm run verify`: 13 concepts, 20 code rungs, 84 variants.

Reading the failure messages back turned up three that were not good enough, and fixing them
improved the engine rather than the exercises:

- A write to a frozen input surfaced as `TypeError: Cannot assign to read only property '1'
  of object '[object Array]'`. That is the engine's wording, not the concept's. The harness
  now says "You changed a value you were handed. Inputs are frozen on purpose: build and
  return a new value instead of writing into the argument." Every mutation check benefits.
- Two starters returned undefined and then failed later with `TypeError: f is not a
  function`, which blames the wrong line. Those rungs now check the shape first.

### Composition & Flow — done (10 of 10)

`algebraic-effects`, `auto-currying`, `continuation`, `currying`, `function-composition`,
`functional-combinator`, `io`, `lazy-evaluation`, `partial-application`, `point-free-style`.

`npm run verify`: 22 concepts, 33 code rungs, 144 variants.

This category found four real bugs, three of them mine and one in the engine:

- **`npm run verify` could take the whole process down.** A broken variant for
  `lazy-evaluation` spread an endless generator into an array, and the out-of-memory abort
  killed the run, not just the grading. Verify now grades inside a worker thread with a
  10s timeout and a heap cap, replacing the worker after a hang. That mirrors the browser
  runner, and it means content that is doing its job cannot hang CI.
- **A check could have hung the learner's own tab.** `take(n, it) => [...it].slice(0, n)` is
  a plausible first attempt, and the original checks handed it an endless source. Every
  source the learner's `take` now receives is bounded, and the over-pull is reported as a
  message instead of being hit. This is a content rule worth keeping: a check must be safe
  against the mistake it is testing for.
- **`spyFn` lost the wrapped function's arity.** The wrapper takes a rest parameter, so
  `fn.length` came back 0, and `auto-currying` called straight through under test while
  behaving correctly in the app. It now copies `length` and `name`.
- **Two "broken" variants were not broken.** Upper-casing an exclamation mark is a no-op, so
  a composition in the wrong order gave the right answer; and an IO variant meant to be
  eager was in fact lazy. Build-time execution is not observable from outside the learner's
  module, so that variant was replaced rather than papered over.

### Purity & Reasoning — done (9 of 9)

`constant`, `constant-function`, `contracts`, `equational-reasoning`, `idempotence`,
`memoization`, `referential-transparency`, `side-effects`, `value`.

`npm run verify`: 31 concepts, 44 code rungs, 195 variants.

One engine gap: **a check could not see what the learner printed.** Learner code is handed a
fake console, so the `side-effects` checks swapping `console.log` observed nothing. Captured
output is now shared with the harness as `T.logs`, used the same way as `T.effects`. An
exercise about effects has to be able to assert on the effect.

### Types & Data Modeling — done (11 of 11)

`algebraic-data-type`, `either`, `iso`, `lambda-calculus`, `lens`, `option`, `prism`,
`product-type`, `sum-type`, `traversal`, `type-signatures`.

`npm run verify`: 42 concepts, 58 code rungs, 262 variants.

The optics rungs use the law library rather than restating the laws: `lens` gets get-set,
set-get and set-set, `prism` gets both round trips, `iso` gets both directions.

One thing worth recording: **the iso counterexample survived by luck.** A rounded
Celsius/Fahrenheit pair round-trips whole degrees correctly often enough that a law sampling
integers accepted it. The samples are fractional now. Picking a generator that cannot
distinguish the broken case from the right one is a quiet way for a law to be useless.

### Algebraic Structures — done (20 of 20)

`alternative`, `applicative-functor`, `bifunctor`, `comonad`, `constant-functor`,
`constant-monad`, `contravariant-functor`, `foldable`, `free-monad`, `functor`,
`kleisli-composition`, `lift`, `monad`, `monad-transformer`, `monoid`, `pointed-functor`,
`profunctor`, `semigroup`, `setoid`, `traversable`.

`npm run verify`: 61 concepts, 84 code rungs, 375 variants.

Most of these lean on the law library rather than restating laws by hand, which is what
Phase 6 was for.

Two rungs had to be rewritten:

- **`constant-monad` is not a lawful monad.** The README's own example (`chain` keeps the
  contents) cannot satisfy left identity, because `chain` discards the function while the
  right-hand side depends on it. Per the plan's rule for loose README wording, the exercise
  now teaches the precise position: the implement rung verifies the two laws that do hold,
  and the break rung has the learner produce the counterexample for the one that does not.
  Recorded in `docs/upstream-notes.md`, which this phase created.
- **`monoid`'s break rung asked for nothing.** Its starter already demonstrated the point, so
  `npm run verify` caught it as a rung a learner would pass without doing anything. It now
  asks for concrete counterexamples: a triple whose grouping changes the answer, and a value
  that zero fails to fix on the left.

### Category & Morphisms — done (12 of 12)

`anamorphism`, `apomorphism`, `catamorphism`, `category`, `endomorphism`, `homomorphism`,
`hylomorphism`, `isomorphism`, `morphism`, `natural-transformation`, `paramorphism`,
`semigroupoid`.

Two apomorphism variants turned out not to be broken. Strict versus non-strict comparison
gives the same sorted list, and an imperative rewrite of `insert` is simply correct: what it
skips is `apo`, so the rung now says that directly rather than trying to detect it through a
proxy that counted property reads.

## Phase 7 complete: all 73 concepts

`npm run verify`: 73 concepts, 97 code rungs, 434 variants. 148 rungs in total, broken down
as 50 recognize, 66 implement, 23 apply, 5 break, 4 guided. Every concept has at least two
rungs and at least one that is code-graded, and `npm run verify` now enforces both so the
criterion cannot regress.

### The bundle regression this caused, and the fix

Scaling the content pushed the initial bundle from 174KB gzip to 250KB, because the shell
imported the exercise sets directly to render the Practice tab and its count. That pulled
every `checks` function, solution, and broken variant onto the main thread, none of which it
runs.

`scripts/build-manifest.mjs` now generates `packages/exercises/src/manifest.ts`: term ids,
rung ids, roles, titles, and kinds, and nothing else. The shell reads that, and imports the
real content only when a Practice tab opens. The manifest is committed and `npm run verify`
fails if it has drifted from the sets, so there is one source of truth.

Back to 174KB gzip initial, with the content a separate 75KB chunk and the editor a separate
146KB one. Opening Learn downloads neither.

## Phase 8 (stretch): TypeScript rungs — not started

## The polish pass

A walk through everything that stood between this and something you could teach from with
total confidence. Each item was decided on its own, and this is what came of them.

### Every rubric item is demonstrated twice, at least once by running code

Three measurements started at bad numbers and end at zero.

| | before | after |
|---|---|---|
| Items graded only by a choice rung | 31 | 0 |
| Items resting on a single rung | 164 | 0 |
| Sets sitting at the two-rung floor | 44 | 0 |

211 rungs, up from 176. 984 variants graded, none of which fail by crashing. Verify enforces
both properties, so neither can come back quietly.

The role spread moved as a side effect rather than a goal: `apply` went from 24 to 70 and
`break` from 5 to 14. That is what happens when you stop reaching for "write it" every time
and start asking what would actually demonstrate the claim. Repairing three near-misses.
Watching a stack overflow before fixing it. Writing the substitution test rather than reading
about it. Finding the input where a safe rewrite stops being safe.

Nine items turned out to be demonstrated already by a rung that did not declare it, and those
`covers` lists now say so. Two of the eleven I proposed did not hold up and were dropped, which
is the only reason that half is trustworthy.

### Hints describe, they do not quote

Eight rungs had a hint handing over a chunk of their own solution, the worst being a rung whose
only hint was the answer. Rewritten to name the shape instead, and gated.

The gate exempts text already visible in the starter. The first version flagged a comonad hint
for quoting an interface printed two inches above it, and satisfying that would have made the
hint worse.

### Verify checks that the notes mention each rubric item

It derives terms from each statement and wants two of them in the prose, with a `teaches`
override for the 14 statements worded too abstractly for that to work.

Three items looked like real gaps and were not. Higher-order functions never says "argument"
and does say **takes**, in the first line. Pure function never says "impure" and instead says
code usually breaks one requirement and not the other. Memoization never says "pure" because it
says referentially transparent and links to it. I went looking to fix prose and found prose
that was right and a heuristic that was wrong.

### solutions.html

Committed rather than hidden. The answers were never really a secret, and withholding them only
means whoever needs one goes and finds a worse version somewhere else. Reading the answer and
reasoning backwards is a way people learn, not a failure to try, and the page says so at the
top rather than scolding. Verify fails if it has drifted.

### docs/teaching-day.md

Five sessions, about 22 concepts covered properly, a map to the other 51. Each session names
what to open with, the demo to keep if only one survives, the questions that always come, and
where to stop. Verify checks every rung it points at, because a renamed rung turns a demo into
a dead end and the place you find that out is in front of a room.

### Two rules I broke while writing the content

Both are in CLAUDE.md and both caught me anyway, which is worth recording.

A check must be safe against the mistake it is testing for. The lazy evaluation rung had an
endless generator, and a broken variant whose `take` drains its source ate the verify worker's
heap. Two apomorphism variants did the same by never terminating. Bounded now, and the
apomorphism rung caps how often it will let a step be asked, so a learner whose unfold never
stops gets a sentence instead of a frozen tab.

The end-to-end suite hardcoded rung counts, so nine tests failed on content changes that were
entirely correct. They derive from the manifest now.

## Deferred, on purpose

Things that are genuinely not done, kept here rather than in a comment nobody reads. None of
these are blocking while this is a single-person tool.

### Accessibility

Never tested, at all. Decided against spending on it while nobody else is using this, and to
do it when it goes somewhere.

What it would involve when that happens, roughly in order of value:

- `@axe-core/playwright` against the existing e2e suite, over the graph, the drawer, and both
  tabs. Catches contrast, missing labels, roles, and focus traps, and becomes a gate.
- The canvas graph has no accessible representation at all. It is the largest gap: a keyboard
  user gets the concept list, and a screen reader gets nothing from the canvas itself.
- Grading results appear asynchronously, so passes and failures need a live region or they
  are silent. Same for a rung clearing and for the lap transition.
- CodeMirror ships reasonable defaults, but the lint annotations and the run shortcut want
  checking rather than assuming.

### Performance, measured

The plan set a sub-700ms keystroke-to-results target and nobody had ever checked it. Measured
now, headless Chromium against the dev server on an M-series Mac:

| | median | worst of 8 |
|---|---|---|
| currying/implement, warm worker | 35ms | 36ms |
| functor/implement, warm worker | 34ms | 38ms |
| first run after a cold page load | 8ms | 8ms |

Twenty times inside the budget. Two caveats worth keeping with the number. This is a
development build on a fast machine, and the warm figures include a React re-render before the
tally text changes, which is why they read higher than the cold one. Nothing here measures a
slow machine, a large rung, or a law that runs 80 cases against a slow implementation, and
those are the cases that would move it.

The target is not in danger. It is also not the interesting number any more: grading is fast
because it happens in a worker on a few hundred bytes of code. If this ever gets slow it will
be the editor or the graph, not the checks.
