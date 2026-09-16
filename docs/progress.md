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

## Phase 3: Editor — done

## Phase 4: Shell with drawer and practice — done

## Phase 5: Graph and progress — done

## Phase 6: Shape rules and the law library — not started

## Phase 7: Content at scale — not started

## Phase 8 (stretch): TypeScript rungs — not started
