# FP Exercises: Build Plan (sibling-folder layout)

A plan for Claude Code to build a standalone practice app for the concepts on [FP Jargon](https://hemanth.github.io/functional-programming-jargon/), with hands-on exercises and immediate feedback. The app lives in its own repo next to a local clone of [hemanth/functional-programming-jargon](https://github.com/hemanth/functional-programming-jargon):

```
projects/
  functional-programming-jargon/     # upstream clone. Read-only reference and data source.
  functional-programming-exercises/  # this project
```

The companion file `docs/fp-jargon-practice-poc.html` is a working single-file proof of concept. Treat it as the behavioral reference for the grading engine, exercise format, and feedback UX, not as code to paste in.

## 0. Setup and kickoff

### 0.1 One-time setup

```bash
cd ~/projects
git clone https://github.com/hemanth/functional-programming-jargon.git
mkdir functional-programming-exercises && cd functional-programming-exercises
git init
mkdir docs
cp ~/Downloads/fp-exercises-plan.md ~/Downloads/fp-jargon-practice-poc.html docs/
claude --add-dir ../functional-programming-jargon
```

Start Claude Code inside `functional-programming-exercises`. `--add-dir` gives it read access to the clone without making the clone its working directory.

### 0.2 Kickoff prompt (first session)

> Read `docs/fp-exercises-plan.md` end to end, then open `docs/fp-jargon-practice-poc.html` in a browser and try the Currying, Pure Function, and Functor exercises. The sibling folder `../functional-programming-jargon` is read-only: never create, edit, delete, or generate files there, and never run its build or install scripts. Before writing code, inspect the sibling repo and confirm or correct every claim in section 2, and list any discrepancies. Then create `CLAUDE.md` from section 0.4 and execute Phase 1 only. Stop at the Phase 1 exit criteria and summarize what you built, what you verified, and anything you changed from the plan and why.

### 0.3 Later sessions

> Read `docs/fp-exercises-plan.md` and `CLAUDE.md`, check `docs/progress.md` to see which phases are done, then execute Phase N only. Stop at its exit criteria, update `docs/progress.md`, and commit.

Run one phase per session. Each phase ends with exit criteria that must be demonstrably true before starting the next.

### 0.4 `CLAUDE.md` for this repo

Claude Code creates this in Phase 1 and keeps it current:

```md
# functional-programming-exercises

Standalone practice app for FP Jargon concepts. Plan: docs/fp-exercises-plan.md. Progress log: docs/progress.md.

## Hard rules
- ../functional-programming-jargon is READ-ONLY. Never create, edit, delete, or generate files there. Never run npm install, build, parse, or git commands that change its state. git log and git rev-parse are fine.
- Only scripts/sync-jargons.mjs reads the sibling folder. No app code, test, or build step may import or read from it.
- Every code rung ships starter, solution, and broken variants; npm run verify must pass before committing exercise changes.
- One plan phase per session. Stop at the phase exit criteria.

## Commands
(filled in during Phase 1)
```

## 1. Goals and non-goals

Goals:
- A standalone app for practicing all 73 FP Jargon concepts, with the look and feel of the upstream site: a graph of concepts, a detail drawer, and Learn and Practice tabs.
- Exercises give feedback within about half a second of the learner pausing, without a server.
- Grading is precise and explains failures in the concept's own terms. For example, "Composition law failed for n = -26, f = x => x * 2, g = x => x - 7" instead of "wrong."
- Learner code can't hang or break the page.
- Zero code dependency on the upstream repo. The only coupling is a synced data snapshot keyed by term id.
- The engine, editor, and exercises are packaged so they could later be offered upstream, or reused elsewhere, without dragging this app's shell along.

Non-goals for now:
- Accounts, a backend, or cross-device sync. Progress lives in localStorage.
- A full IDE. No file tree, terminal, or multi-file projects.
- Full TypeScript type checking in v1. It's a stretch phase.
- Exercises for all 73 concepts before the engine is proven. Content scales after the engine and shell phases.
- Modifying the upstream clone in any way.

## 2. What the upstream repo provides (verify first)

These facts come from reading the upstream repo on September 15, 2026. Claude Code should confirm each one in the sibling folder before relying on it.

**The data contract.** The upstream build parses the root `readme.md` into `app/src/data/jargons.json`, which is committed to the repo, so no build is needed to read it. That file is the only thing this project consumes:

- Top-level keys: `meta`, `categories`, `terms`, `graph: { nodes, links }`.
- 75 terms and 130 links. Links are typed `core` (112) or `reference` (18).
- Each term has `id`, `title`, `depth` (2 for h2 terms, 3 for h3 subterms), `category`, `aliases`, `summary`, `body` (markdown with fenced code), `codeBlocks`, `furtherReading`, `crossRefs`, and `relatedIds`.
- Six categories: `core-functions`, `composition`, `purity-state`, `category-morphisms`, `algebraic-structures`, and `types-data`, each with a `name`, `description`, `color`, and Tailwind `accent` classes.
- Some list-like fields may be serialized strings rather than arrays. Verify, and normalize in the sync script, not the app.
- There are 73 real concepts. `dealing-with-partial-functions` is a subsection and `functional-programming-libraries-in-javascript` is a link list, so neither gets exercises of its own.

**Design reference (read, don't import).** These files show the look to recreate:

- The app is React 19 + Vite 8 + Tailwind 3. `app/src/index.css` and `app/tailwind.config.js` hold the design tokens.
- `GraphCanvas.jsx` is the graph (913 lines), `NodeDetailPanel.jsx` is the drawer (500px at `sm`, 560px at `lg`, a bottom sheet on mobile), and `CodeBlock.jsx` is the Prism code block.
- The light background is `#eaeae8` and the dark one is `#121212`. The whole UI is set in monospace.
- `utils/audio.js` has UI sound effects. `canvas-confetti` is installed but doesn't appear to be used.

Upstream is MIT licensed. Porting small pieces (a color table, the graph layout approach) is fine with attribution in `NOTICE.md`. Prefer re-implementing over copying whole components, so this project doesn't inherit upstream's structure.

## 3. What the POC proves

The POC is one HTML file with no build step. It demonstrates:

1. **The exercise-as-data format.** Each rung has `kind`, `prompt`, `starter`, `solution`, `broken`, `exports`, and `tests`.
2. **A sandboxed runner.** Learner code runs in a Web Worker created from a Blob. The main thread kills the worker after 1.5 seconds and reports a likely infinite loop.
3. **A grading vocabulary** that turned out sufficient for three very different concepts:
   - `check(name, fn)` for example-based assertions.
   - `law(name, runs, prop)` for property-based law checks, using a tiny generator (`G.int`, `G.fn`) that labels functions so counterexamples are readable.
   - Runtime probes: `freeze` for deep-freeze mutation detection, `effects` for spying on `Date.now` and `Math.random`, and arity and call-count checks.
   - A source-shape check for point-free style (a regex in the POC; replace it with an AST in production).
   - Inverted grading for "break it" rungs.
4. **The feedback loop.** Checks run 550ms after typing stops, or on Cmd/Ctrl+Enter. Results show per check, with the first counterexample. Syntax errors are reported without losing your place. Drafts, completion, and choice selections persist.
5. **The progress model.** Each rung is either done or not. A concept's ring fills as rungs are cleared, and a "next rung" or "next concept" prompt appears.
6. **The quality gate.** Every code rung's `solution` passes, its `broken` fails, and its `starter` fails. The POC was verified this way in Node before shipping.

The POC has these deliberate shortcuts. Don't port them:
- Its CodeMirror load from esm.sh with a textarea fallback. Use npm packages.
- Regex-based shape checks. Use acorn.
- Tests written as strings. Use real modules. See section 5.2.
- A hand-positioned graph of 14 nodes. Build a real layout for all 75 terms.
- Inline styles and a hand-copied term table. Use the synced data and a proper styling setup.

## 4. Target architecture

Use npm workspaces. The boundaries matter more than the tooling; Nx is fine instead if preferred, but set it up in Phase 1, not later.

```
functional-programming-exercises/
  CLAUDE.md
  NOTICE.md                  # upstream MIT license + attribution
  package.json               # workspaces, top-level scripts
  data/
    jargons.json             # normalized snapshot, committed
    source.json              # upstream commit sha, synced-at date, term count
  scripts/
    sync-jargons.mjs         # the ONLY code that reads ../functional-programming-jargon
    verify-exercises.mjs     # solution passes, broken fails, starter fails
  packages/
    engine/                  # framework-free: worker, runner, harness, laws, shape rules
    editor/                  # framework-free CodeMirror setup + theme + lint
    exercises/               # content, one file per term id, no UI imports
    practice-react/          # React PracticePanel built on engine + editor
  apps/
    web/                     # the shell: graph, drawer, routing, progress, theming
      tests/                 # Playwright
  docs/
    fp-exercises-plan.md
    fp-jargon-practice-poc.html
    progress.md
    upstream-notes.md
```

Dependency direction is one way: `apps/web` → `practice-react` → `engine`, `editor`, `exercises` → nothing app-specific. `exercises` depends only on the engine's types and law library. That's what keeps a future upstream contribution to a thin adapter.

Default stack: TypeScript everywhere, Vite, React 19 for the shell and `practice-react`, and plain CSS custom properties for tokens (Tailwind optional). React matches upstream, which keeps the adapter path short. If you'd rather build the shell in another framework, only `apps/web` and `practice-react` change.

## 5. Detailed design

### 5.1 Exercise schema

```ts
type RungKind = 'choice' | 'expr' | 'code' | 'reveal';
type RungRole = 'recognize' | 'guided' | 'implement' | 'break' | 'apply' | 'articulate';

interface ExerciseSet {
  termId: string;                 // must exist in data/jargons.json
  rungs: Rung[];
}

interface BaseRung {
  id: string;                     // stable, url-safe, unique within the set
  role: RungRole;
  title: string;                  // sentence case, imperative or question
  prompt: string;                 // markdown, internal #term links allowed
  hints?: string[];               // revealed one at a time
}

interface ChoiceRung extends BaseRung {
  kind: 'choice';
  multi: boolean;
  options: { code: string; correct: boolean; why: string }[];
}

interface ExprRung extends BaseRung {
  kind: 'expr';                   // one-line fill-in, graded by value
  context?: string;               // read-only code shown above the input
  expect: unknown;                // deep-compared
}

interface CodeRung extends BaseRung {
  kind: 'code';
  starter: string;
  solution: string;               // must pass (CI)
  broken: string[];               // each must fail (CI); cover the classic mistakes
  exports: string[];              // top-level bindings the checks need
  checks: (api: Harness, exp: Record<string, any>) => void;
  inverted?: boolean;             // 'break' rungs: pass means a law was caught failing
  timeoutMs?: number;             // default 1500
}

interface RevealRung extends BaseRung {
  kind: 'reveal';                 // self-assessed: write, then compare to reference
  reference: string;
}
```

Order rungs as recognize, guided, implement, break, then apply. Not every concept needs every role. Two to four rungs per concept is the target.

### 5.2 Runner and sandbox

- Run each check in a dedicated module worker (`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`). Vite bundles it. The engine package exports the worker entry so any host app can bundle it.
- Protocol: `{ seq, termId, rungId, code }` goes in, `{ seq, results, logs, fatal? }` comes out. Checks are looked up inside the worker by `termId/rungId`, so functions never cross the message boundary. This replaces the POC's string-based tests.
- On a new run, drop stale results by `seq`. On timeout, `terminate()` the worker and spawn a fresh one for the next run. Consider pre-warming a spare worker so the restart doesn't add latency.
- Inside the worker, before evaluating learner code:
  - Wrap it in a `"use strict"` function body so writes to frozen objects throw.
  - Pass a fake `console` that captures output (show up to 20 lines).
  - Replace `Date.now`, `Math.random`, and `performance.now` with spies for the duration of the checks, and restore them in `finally`.
  - Evaluate with `new Function`, returning the requested `exports`. A missing export produces a friendly fatal ("Define `curry2` so it can be checked").
- Guard against learner code blocking the worker's event loop between checks. Run checks synchronously in one task. Timeouts are enforced only from the main thread.
- Report infinite recursion (`RangeError: Maximum call stack size exceeded`) with a concept-aware message. Trampoline exercises depend on it.
- The worker has no DOM and no network use is expected. Also set `self.fetch` and `importScripts` to throwing stubs, so exercises can't depend on them by accident.

### 5.3 Harness API (runs in the worker)

```ts
interface Harness {
  check(name: string, fn: () => true | string | void): void;
  law(name: string, prop: fc.IProperty<any> | ((G: Gen) => true | string), opts?: { runs?: number }): void;
  eq(a: unknown, b: unknown): boolean;         // structural, ignores function-valued keys
  fmt(v: unknown): string;                     // uses inspect() when present
  freeze<T>(v: T): T;                          // deep freeze
  clone<T>(v: T): T;
  effects: string[];                           // spied impure calls since last reset
  spyFn<F extends Function>(f: F): F & { calls: unknown[][] };
  G: Gen;                                      // labelled generators, see below
  src: string;                                 // learner source, for shape rules
  shape: ShapeRules;                           // see 5.5
}
```

- Use fast-check for laws. Labelled function generators matter: counterexamples must print as `x => x * 2`, not `[Function]`. Build `G.fn()` from a pool of named, pure number functions, and add string and array pools later. Use `fc.pre` sparingly. Shrink results before display.
- A failure message says what was expected, what happened, and the smallest counterexample, using the notation from the site. Never surface a raw stack trace, and never mention the harness.

### 5.4 Law library

Write each suite once, parameterized by constructors and an equality function, and reuse it across concepts:

| Suite | Laws |
|---|---|
| `setoid` | reflexivity, symmetry, transitivity |
| `semigroup` | associativity of `concat` |
| `monoid` | semigroup + left identity + right identity |
| `functor` | identity, composition |
| `contravariant` | identity, composition (reversed) |
| `bifunctor` | identity, composition |
| `profunctor` | identity, composition |
| `apply` / `applicative` | composition, identity, homomorphism, interchange |
| `chain` / `monad` | associativity, left identity, right identity |
| `alt` / `alternative` | associativity, distributivity, annihilation |
| `comonad` | extract/extend laws |
| `foldable` | reduce consistent with toArray |
| `traversable` | naturality, identity, composition |
| `category` / `semigroupoid` | associativity (+ identity for category) |
| `natural-transformation` | naturality `nat(fa.map(f)) ≡ nat(fa).map(f)` |
| `lens` | get-set, set-get, set-set |
| `prism` | preview-review, review-preview when it matches |
| `iso` | `from(to(x)) ≡ x`, `to(from(y)) ≡ y` |
| `idempotence` | `f(f(x)) ≡ f(x)` |

Use Fantasy Land law statements as the source of truth. Link them from failure messages where it helps.

### 5.5 Shape rules (acorn)

Parse with acorn (`ecmaVersion: 'latest'`) in the worker and expose these rules:

- `isPointFree(bindingName)`: the initializer is not an arrow or function expression and introduces no parameters at its top level.
- `isCurried(bindingName)`: the initializer is a chain of single-parameter arrows at the syntax level. Pair it with the runtime `length === 1` checks.
- `noMutation(bindingName)`: no assignment to member expressions or calls to known mutators (`push`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`, `set`, `delete`) on parameters. Runtime freezing stays the authoritative check; this rule gives better messages.
- `usesOnly(bindingName, allowedIdentifiers)`: for "compose it from these pieces" rungs.
- `noLoops(bindingName)`: for recursion-scheme rungs.
- `callsSelfInTailPosition(bindingName)`: for trampoline rungs.

Shape rules must never be the only check on a rung. They add precision to behavioral checks.

### 5.6 Editor

Install `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/lang-javascript`, `@codemirror/lint`, `@codemirror/autocomplete`, and `@lezer/highlight`. Don't use the `codemirror` meta package's `basicSetup`. Compose extensions explicitly so the bundle stays small and the look matches the site:

- Line numbers, history, bracket matching, close brackets, indent on input, and the default keymap with `indentWithTab`.
- A theme built from the design tokens in section 5.8 for both themes, plus a `HighlightStyle` whose token colors match the upstream Prism look (read `../functional-programming-jargon/app/src/components/CodeBlock.jsx` and its CSS to get them). Switching themes reconfigures a `Compartment` rather than remounting the editor.
- A lint source that runs acorn on the document and reports the syntax error at the right position, debounced about 200ms.
- Autocomplete of the exercise's in-scope identifiers (its `exports` and any given helpers) plus JS keywords. No type-aware completion in v1.
- Cmd/Ctrl+Enter runs checks. Esc closes the drawer only when the editor isn't focused.
- The drawer is wider in Practice mode on desktop (around 720px), because upstream's 560px clips realistic lines. On small screens, Practice opens as a full-height sheet.

Accessibility: CodeMirror's `EditorView.contentAttributes` gets an aria label naming the rung. The results list is an `aria-live="polite"` region that announces only the pass count, not every line.

**Stretch (Phase 7): type hints.** Load the TypeScript language service in a separate worker (`@typescript/vfs` + `typescript`, or `@valtown/codemirror-ts`) only when a rung sets `lang: 'ts'`. Keep it lazy so the Learn view never pays for it.

### 5.7 Data sync

`scripts/sync-jargons.mjs`, run manually as `npm run sync:jargons`:

1. Resolve the upstream path from `JARGON_REPO`, defaulting to `../functional-programming-jargon`. Fail with a clear message if it's missing.
2. Read (never write) `app/src/data/jargons.json` and the upstream `LICENSE`. Record `git -C <path> rev-parse HEAD`. If the clone has uncommitted changes, warn, since the snapshot may not match any real commit.
3. Validate the shape from section 2 with a schema (zod or hand-written), and fail on anything unexpected.
4. Normalize: parse any stringified arrays, drop fields the app doesn't use, and sort terms by id for stable diffs.
5. Diff against the current `data/jargons.json`, and print terms added, removed, and changed (title, category, or body). Flag removed or renamed ids that have exercise files. A renamed id is the one change that breaks things.
6. Write `data/jargons.json`, `data/source.json`, and `NOTICE.md`. The script never commits; review the diff and commit it yourself.

`npm run verify` fails if any exercise file's `termId` is missing from `data/jargons.json`. Nothing else in the repo knows the sibling folder exists, so the app builds and CI runs from a fresh clone of this repo alone.

### 5.8 Shell app

**Design tokens.** Define light and dark tokens as CSS custom properties, taken from reading upstream's `index.css`, `tailwind.config.js`, and components: background, panel, card, border, text, muted, the six category colors from `data/jargons.json`, and syntax token colors. Everything, including the CodeMirror theme, reads from these.

**Graph.** Render all 75 terms and 130 links:
- Use a force layout (d3-force) computed once and cached, or run to a fixed number of ticks at startup, so nodes don't jitter on every visit.
- Nodes cluster by category, with soft category halos and labels.
- Selecting a node dims the rest of the graph and highlights its direct links. `reference` links are dashed.
- Pan and zoom with drag and scroll, a Reset control, and keyboard focus on nodes.
- Use SVG first. Switch to canvas only if profiling on a mid-range laptop shows a real problem.

**Drawer.** It shows the category chip, anchor, title, and Learn and Practice tabs.
- **Learn:** renders the term's `summary` and `body`. Use markdown with internal `#term` links routed in-app, code blocks highlighted to match the editor, a further-reading list, connected concepts from `graph.links`, and an "Open on FP Jargon" link.
- **Practice:** mounts `PracticePanel` from `practice-react`. The tab only appears when an exercise file exists for the term, and its label shows `done/total`.

**Routing.** Hash-based, so the app can be hosted anywhere static:
- `#/` shows the graph with no selection.
- `#/term/currying` opens the drawer on Learn.
- `#/term/currying/practice` opens Practice at the first incomplete rung.
- `#/term/currying/practice/implement` opens a specific rung.

**Search.** A command-palette search over titles and aliases, which upstream also has. Lower priority than the graph and drawer.

### 5.9 Practice UI (`packages/practice-react`)

`PracticePanel` takes `{ termId, exerciseSet, progress, onNavigate, theme }` and has no knowledge of the shell.
- **Layout:** from top to bottom, the rung stepper (numbered because rungs are a real sequence), the role label and title, the prompt, then the editor or choices, a status line with "Reset code", "Show a solution", and "Run checks", the results, and the cleared banner.
- **"Show a solution"** reveals the reference solution beneath the results without replacing the learner's code. Hints come first, one at a time, if the rung has them.
- **Results:** passing checks collapse to one line each. The first failing check expands with its detail. Law checks show the number of cases tried when they pass.
- **Cleared banner:** offers the next rung, or once the concept is done, the next unfinished concept. Prefer a connected concept from `graph.links`, falling back to the same category.
- **Celebration:** a subtle ring pulse per rung. A sound (behind a mute toggle) and confetti fire only when a whole concept is completed, and respect `prefers-reduced-motion`.

### 5.10 Progress

- Store `{ version: 1, done: { [termId/rungId]: timestamp }, drafts: { [termId/rungId]: string }, choices: {...} }` under one localStorage key, with all access wrapped in try/catch. The store emits change events so the graph and panel stay in sync.
- On the graph, terms with exercises get a thin progress arc around the node: no arc when untouched, the accent color when in progress, and a success color when complete. Leave nodes without exercises visually unchanged.
- Add a "Practice" filter that highlights only terms with exercises, and a small overall progress readout in the header.
- Add export and import of progress as a JSON file, which is cheap insurance against a cleared browser.
- Put "Reset progress" behind a confirm step, in a low-emphasis spot.

## 6. Content authoring rules

- Exercise files are keyed by the exact term id from `data/jargons.json`. `npm run verify` fails on unknown ids.
- Every `code` rung ships `starter`, `solution`, and at least one `broken` implementation that encodes a real misconception, such as "map returns the raw value instead of a Box". CI runs all three through the real harness and requires `solution` to pass, every `broken` to fail, and `starter` to fail.
- Every failure message names the concept's rule in plain language and includes the concrete input.
- Prompts are two sentences at most. The Learn tab does the teaching; Practice asks.
- Starter code includes the Hindley-Milner style signature comment the README uses, such as `// curry2 :: ((a, b) -> c) -> a -> b -> c`.
- Examples stay close to the README's own vocabulary (Box, Option/Maybe, Either, the cart and user examples) so Learn and Practice feel continuous.
- Wherever the README's explanation is loose (for example, the Monoid identity wording, or the manual naturality example), write the exercise against the precise law. Note the discrepancy in `docs/upstream-notes.md` as a candidate README fix rather than silently diverging.
- Credit: every drawer links to the concept on the upstream site and repo, and `NOTICE.md` carries the upstream MIT license for the synced data.

## 7. Curriculum map

This is the target set, with a suggested anchor exercise per concept. Roles: R = recognize, G = guided, I = implement, B = break it, A = apply.

**Core Functions**
- `arity`: R. Classify nullary through variadic; `fn.length` pitfalls with defaults and rest params.
- `function`: R. Which of these meets the strict definition of one input, one output, no hidden effects.
- `lambda`: G. Replace named callbacks with inline lambdas in a pipeline.
- `higher-order-functions-hof`: I. Write `filter` and `is(type)` from the README; A: `once`.
- `closure`: I. `counter()` with private state; B: a loop-closure bug to fix.
- `predicate`: I. `both`, `either`, and `not` predicate combinators.
- `pure-function`: R, I. Purify `addItem`. Done in the POC.
- `thunk`: I. Defer an expensive value; check it's computed zero times until forced.
- `trampoline`: I. Trampoline `sumBelow`; the check runs `n = 1e6` without a stack overflow.
- `partial-function`: R. Find the inputs that make three functions blow up.
- `total-function`: I. Make `sum`, `first`, and `times` total; property checks over empty and negative inputs.

**Composition & Flow**
- `partial-application`: I. `partial(f, ...args)`; A: build `fivePlus`.
- `currying`: R, I, A. Done in the POC.
- `auto-currying`: I. `curry(f)` that respects `f.length` across any call grouping.
- `function-composition`: I. Variadic `compose` and `pipe`; law: associativity and identity.
- `point-free-style`: A. Refactor three definitions to point-free; shape rule plus behavior.
- `functional-combinator`: I. `C` (flip), `K` (constant), `I` (identity), `S`; check the combinator identities.
- `continuation`: I. Convert a direct-style function to continuation-passing style.
- `lazy-evaluation`: I. An infinite `naturals()` generator plus `take`; check no over-pulling.
- `io`: I. `IO` with `map` and `chain`; spy proves nothing runs before `.run()`.
- `algebraic-effects`: I. A handler for `ask_config` and `log`; swap handlers without changing the program.

**Purity & Reasoning**
- `side-effects`: R. Spot every effect in a snippet.
- `idempotence`: R, I. Classify functions via the `f(f(x)) ≡ f(x)` law, then make `normalizeEmail` idempotent.
- `contracts`: I. Wrap a function with input and output contracts.
- `value`: R. Which are values.
- `constant`: R. Const binding vs deep immutability; `Object.freeze` depth.
- `constant-function`: I. `constant(a)`; A: use it with `map`.
- `referential-transparency`: R. Which calls can be replaced by their result.
- `equational-reasoning`: G. Rewrite an expression step by step using known laws.
- `memoization`: I. `memoize` that caches by argument; B: memoize an impure function and watch it lie.

**Category & Morphisms**
- `category`: I. `Max` compose and id; category laws.
- `semigroupoid`: I. The composition wrapper; associativity law.
- `morphism`: R. Identify objects and arrows in a snippet.
- `homomorphism`: I. Prove `join` preserves the monoid structure with a property check.
- `endomorphism`: R, I. Endo monoid under composition.
- `isomorphism`: I. `pairToCoords` and `coordsToPair`; round-trip laws.
- `catamorphism`: I. `sum`, `max`, and `length` as folds.
- `anamorphism`: I. `unfold`; `range` and `countDown`.
- `hylomorphism`: A. `factorial` as unfold then fold.
- `paramorphism`: I. `para` plus `suffixes`.
- `apomorphism`: I. An unfold with early exit.
- `natural-transformation`: I. `head :: Array a -> Maybe a`; naturality law.

**Algebraic Structures**
- `setoid`: I. `equals` for points; setoid laws.
- `semigroup`: I. `Max`, `Min`, and `First` semigroups; associativity.
- `monoid`: I, B. Sum, Product, All, Any; B: subtraction has no two-sided identity.
- `functor`: I, A, B. Done in the POC.
- `pointed-functor`: I. `Box.of`.
- `constant-functor`: I. `Const` whose `map` ignores its function; functor laws still hold.
- `constant-monad`: I. `Const` `chain` behavior.
- `lift`: I. `liftA2` over arrays and Maybe.
- `applicative-functor`: I. `ap` for Box and Array; applicative laws.
- `monad`: I. `chain` for Array and Maybe; monad laws.
- `kleisli-composition`: I. `composeK`; A: `parseAndValidate`.
- `comonad`: I. `extract` and `extend` for CoIdentity; comonad laws.
- `free-monad`: A. Add a new instruction and interpreter to the Log program.
- `monad-transformer`: A. `MaybeT` over `Id`, then over a Promise-like Task.
- `bifunctor`: I. `Pair` `bimap`; laws.
- `contravariant-functor`: I. `Predicate.contramap`; laws.
- `profunctor`: I. Function profunctor `promap`; laws.
- `alternative`: I. `alt` for Maybe; laws.
- `foldable`: I. `reduce` for a Tree.
- `traversable`: I. `sequence` for Array of Maybe, then Array of Promise.

**Types & Data Modeling**
- `lambda-calculus`: G. Evaluate Church numerals; implement `succ` and `add`.
- `type-signatures`: R. Match signatures to implementations.
- `algebraic-data-type`: R. Classify sum vs product.
- `sum-type`: I. A tagged union with an exhaustive `match`.
- `product-type`: R. Count the inhabitants of a product.
- `option`: I. `Some` and `None` with `map`, `chain`, and `getOrElse`.
- `either`: I. `Left` and `Right` with `fold`; A: `parseJson` pipeline.
- `lens`: I. `lens`, `view`, `set`, and `over`; lens laws; A: nested update.
- `prism`: I. `integerPrism`; prism laws.
- `iso`: I. `tempIso`; iso laws with float tolerance.
- `traversal`: I. `evenTraversal`; `modify` consistent with `getAll`.

## 8. Phases

### Phase 1: Scaffold and data contract
Set up the workspace layout from section 4, TypeScript, lint, Vitest, and `CLAUDE.md`. Write `sync-jargons.mjs` and run it once to produce `data/jargons.json`, `data/source.json`, and `NOTICE.md`. Create `docs/progress.md`.

Exit criteria:
- `npm run sync:jargons` produces a normalized snapshot and a readable diff on a second run (no changes).
- The sibling clone shows no changes: `git -C ../functional-programming-jargon status` is clean.
- A fresh clone of this repo, with no sibling folder present, installs and passes `npm test`.
- Section 2 claims are confirmed or corrected in `docs/progress.md`.

### Phase 2: Engine
Build `packages/engine` (worker, runner, harness, `law` on top of fast-check, probes) and `scripts/verify-exercises.mjs`. Port the POC's six code rungs to `packages/exercises` as real modules.

Exit criteria:
- `npm run verify` passes: every solution passes, every broken fails, every starter fails, and every `termId` exists in the snapshot.
- Unit tests cover timeout-and-restart, stale `seq` dropping, a syntax error, a missing export, frozen-input mutation, effect spying, and a shrunk law counterexample message.

### Phase 3: Editor
Build `packages/editor` with the theme, highlight style, lint, keymap, and theme compartment, plus a minimal Vite playground page for trying it alone.

Exit criteria:
- Token colors match the POC's light and dark palettes side by side.
- A syntax error shows at the right location within 250ms.
- Cmd/Ctrl+Enter triggers the run callback.
- Measure the editor's bundle size and report it. The target is under 150KB gzip, lazy-loaded.

### Phase 4: Shell with drawer and practice
Build `apps/web` with design tokens, routing, the drawer with Learn and Practice, and `packages/practice-react`. For navigation, use a simple category-grouped list of all terms first; the graph comes in Phase 5.

Exit criteria:
- Every term renders in Learn with correct markdown, code highlighting, and working internal links.
- Currying, Pure Function, and Functor behave like the POC, including in dark mode and on a narrow viewport.
- Playwright tests cover solving a rung, the timeout path, and deep links to a specific rung.

### Phase 5: Graph and progress
Add the graph (section 5.8), the progress store and arcs, the Practice filter, the next-concept suggestion, and the completion celebration. Keep the Phase 4 list as a fallback view.

Exit criteria:
- The graph renders all 75 terms with a stable layout, keyboard-selectable nodes, and pan, zoom, and reset.
- Progress survives a reload, and arcs update without a re-layout.
- Reduced motion disables confetti; export, import, and reset work.

### Phase 6: Shape rules and the law library
Add acorn shape rules and the full law library from section 5.4, with tests that each law suite accepts a lawful instance and rejects a known-unlawful one.

Exit criteria: all suites have passing accept and reject tests; the POC's regex point-free check is replaced.

### Phase 7: Content at scale
Write exercises category by category, in this order: Core Functions, Composition & Flow, Purity & Reasoning, Types & Data Modeling, Algebraic Structures, then Category & Morphisms. Commit each category separately with `npm run verify` green. Keep `docs/upstream-notes.md` current.

Exit criteria per category: every concept has at least two rungs, one of which is code-graded; verify passes; a manual walkthrough finds no confusing failure messages.

### Phase 8 (stretch): TypeScript rungs
Add a lazy TS language service worker, `lang: 'ts'` rungs, and type errors as lint diagnostics. Start with Option, Either, and Functor, where types teach the most.

## 9. Testing strategy

- **Engine:** Vitest for the harness and law suites, plus Node execution of every exercise's solution, broken, and starter variants.
- **UI:** Playwright tests in `apps/web/tests`. Type into CodeMirror via `page.keyboard`, since `fill` doesn't work on contenteditable.
- **Isolation:** CI runs in a checkout of this repo only. If any test or build step needs the sibling folder, that's a bug. Only `npm run sync:jargons` may touch it.
- **Performance:** the time from last keystroke to results should be under 700ms on a mid-range laptop for every rung. Log it in dev.
- **Accessibility:** keyboard-only completion of one choice rung and one code rung. Screen reader announcements of the pass count, checked with VoiceOver.

## 10. Keeping up with upstream

- Pull the sibling clone when you want new content: `git -C ../functional-programming-jargon pull`, then `npm run sync:jargons`, then review and commit the snapshot diff.
- Upstream term renames are the only breaking change. The sync diff flags them, and `npm run verify` fails until the affected exercise file is renamed.
- New upstream terms simply appear in the graph without a Practice tab until exercises are written.

## 11. If you contribute upstream later

Because the engine, editor, exercises, and practice panel have no dependency on this app's shell, an upstream contribution is mostly an adapter:

1. Open an issue on the upstream repo with a link to the deployed app and a short screen recording. Ask whether the maintainer wants Practice mode in their site, and in what form: a dependency on published packages, vendored code, or content only.
2. The adapter mounts `PracticePanel` in their `NodeDetailPanel` and extends their hash routing so `#term/practice/rung` still resolves the term. Their router matches term ids exactly today.
3. Offer `docs/upstream-notes.md` corrections as separate README PRs so they stand on their own.

## 12. Open questions to resolve during the build

- Should the exercises and engine packages be published to npm, or is this repo the only consumer for now? Default to unpublished.
- Is a category-grouped list enough of a navigation fallback on small screens, or does the graph need a mobile mode?
- Should "Show a solution" be gated behind at least one run, or be available immediately? The POC makes it available immediately.
- Where will the app be hosted? Hash routing works on GitHub Pages, Netlify, or onehungrymind.com without server config.
