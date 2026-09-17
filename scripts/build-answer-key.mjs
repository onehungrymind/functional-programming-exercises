#!/usr/bin/env node
/**
 * Generates a standalone answer key for every rung in the repo.
 *
 * This is an authoring tool, not something a learner should see. It exists because the only
 * way to judge whether the content is any good is to read the rubric, the rungs and the
 * solutions side by side, and doing that across 73 source files means never actually doing it.
 *
 * Generated rather than written, so it cannot go stale: run it again after changing a set.
 * The output is deliberately gitignored. It contains every solution, and a committed copy is
 * a file that eventually gets served.
 *
 * Usage: npx tsx scripts/build-answer-key.mjs [outfile]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'answer-key.html'));

const { exerciseSets, exerciseTermIds } = await import(
  new URL(`file://${join(ROOT, 'packages/exercises/src/index.ts')}`).href
);
const snapshot = JSON.parse(readFileSync(join(ROOT, 'data/jargons.json'), 'utf8'));
const termsById = new Map(snapshot.terms.map((t) => [t.id, t]));
const categories = Object.fromEntries(snapshot.categories.map((c) => [c.id, c]));

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Escaping for code that lands in a text node rather than an attribute.
 *
 * A double quote is safe there, and escaping it would hide every double-quoted string from
 * the highlighter below, which only ever sees the escaped text.
 */
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Enough highlighting to read code at a glance.
 *
 * One pass with alternation rather than several passes, so a keyword inside a comment or a
 * string is never recoloured: whichever branch matches first owns that span of text, and
 * comments and strings come first in the alternation.
 */
const KEYWORDS = new Set(
  ('const let var function return if else for of in while switch case default throw new typeof ' +
    'instanceof interface type extends never unknown boolean number string import export as yield ' +
    'async await class this null undefined true false')
    .split(' '),
);

const TOKEN =
  /(\/\/[^\n]*)|(`(?:[^`\\]|\\[\s\S])*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)/g;

const highlight = (code) =>
  escText(code).replace(TOKEN, (match, comment, str, num, word) => {
    if (comment) return `<i class="c">${comment}</i>`;
    if (str) return `<i class="s">${str}</i>`;
    if (num) return `<i class="n">${num}</i>`;
    if (KEYWORDS.has(word)) return `<i class="k">${word}</i>`;
    return word;
  });

/** Markdown-lite for prompts and rubric statements: inline code and #term links. */
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(#([a-z0-9-]+)\)/g, '<a href="#$2">$1</a>');

const pre = (code, lang) =>
  `<pre class="code${lang === 'ts' ? ' ts' : ''}"><code>${highlight(String(code).replace(/\n+$/, ''))}</code></pre>`;

// ------------------------------------------------------------------ the audit

const rows = exerciseTermIds.map((id) => {
  const set = exerciseSets[id];
  const code = set.rungs.filter((r) => r.kind === 'code');
  const seen = new Map();
  for (const r of set.rungs) for (const c of r.covers) seen.set(c, (seen.get(c) ?? 0) + 1);
  return {
    id,
    set,
    code,
    seen,
    // A rubric item nothing grades by running code is one the app only asks you to recognize.
    weak: set.rubric.filter((item) => {
      const rungs = set.rungs.filter((r) => r.covers.includes(item.id));
      return rungs.length && rungs.every((r) => r.kind === 'choice' || r.kind === 'reveal');
    }),
    single: set.rubric.filter((item) => (seen.get(item.id) ?? 0) === 1),
  };
});

const totals = {
  concepts: rows.length,
  rungs: rows.reduce((n, r) => n + r.set.rungs.length, 0),
  code: rows.reduce((n, r) => n + r.code.length, 0),
  variants: rows.reduce((n, r) => n + r.code.reduce((m, c) => m + c.broken.length, 0), 0),
  rubric: rows.reduce((n, r) => n + r.set.rubric.length, 0),
  typed: rows.filter((r) => r.set.typedNotes).length,
  weak: rows.reduce((n, r) => n + r.weak.length, 0),
  single: rows.reduce((n, r) => n + r.single.length, 0),
  minimum: rows.filter((r) => r.set.rungs.length === 2).length,
};

const stat = (label, value, note = '') =>
  `<div class="stat"><dt>${esc(label)}</dt><dd>${esc(value)}${note ? `<span>${esc(note)}</span>` : ''}</dd></div>`;

// ------------------------------------------------------------------ rendering

const renderRung = (rung, set) => {
  const flags = [
    `<span class="tag kind-${rung.kind}">${rung.kind}</span>`,
    `<span class="tag">${esc(rung.role)}</span>`,
    rung.lang === 'ts' ? '<span class="tag lap2">lap 2 &middot; ts</span>' : '',
    rung.inverted ? '<span class="tag">inverted</span>' : '',
  ].join('');

  const covers = rung.covers
    .map((c) => `<a class="pill" href="#${set.termId}--${c}">${esc(c)}</a>`)
    .join('');

  let body = '';

  if (rung.kind === 'choice') {
    body = `<ol class="options">${rung.options
      .map(
        (o) =>
          `<li class="${o.correct ? 'right' : 'wrong'}"><span class="mark">${
            o.correct ? 'correct' : 'wrong'
          }</span>${pre(o.code)}<p class="why">${inline(o.why)}</p></li>`,
      )
      .join('')}</ol>`;
  } else if (rung.kind === 'expr') {
    body =
      (rung.context ? `<h5>Given</h5>${pre(rung.context)}` : '') +
      `<h5>Answer</h5>${pre(rung.solution)}` +
      `<p class="expect">evaluates to <code>${esc(JSON.stringify(rung.expect))}</code></p>` +
      (rung.broken.length
        ? `<h5>Rejected</h5><ul class="flat">${rung.broken.map((b) => `<li>${pre(b)}</li>`).join('')}</ul>`
        : '');
  } else if (rung.kind === 'code') {
    const exports = rung.exports.map((e) => `<code>${esc(e)}</code>`).join(', ');
    body =
      `<h5>Solution</h5>${pre(rung.solution, rung.lang)}` +
      `<details><summary>Starter &middot; ${rung.exports.length} export${
        rung.exports.length === 1 ? '' : 's'
      }: ${exports}</summary>${pre(rung.starter, rung.lang)}</details>` +
      `<details><summary>${rung.broken.length} variant${
        rung.broken.length === 1 ? '' : 's'
      } that must fail</summary>${rung.broken.map((b) => pre(b, rung.lang)).join('')}</details>`;
  } else if (rung.kind === 'reveal') {
    body = `<h5>Reference</h5>${pre(rung.reference)}`;
  }

  const hints = rung.hints?.length
    ? `<details class="hints"><summary>${rung.hints.length} hint${
        rung.hints.length === 1 ? '' : 's'
      }</summary><ol>${rung.hints.map((h) => `<li>${inline(h)}</li>`).join('')}</ol></details>`
    : '';

  return `<article class="rung" id="${set.termId}--rung-${rung.id}">
  <header><h4>${esc(rung.title)}</h4><div class="flags">${flags}</div></header>
  <p class="prompt">${inline(rung.prompt)}</p>
  <div class="covers">demonstrates ${covers}</div>
  ${hints}
  ${body}
</article>`;
};

const renderConcept = (row) => {
  const { set, seen } = row;
  const term = termsById.get(set.termId);
  const cat = categories[term?.category];
  const lap1 = set.rungs.filter((r) => r.lang !== 'ts');
  const lap2 = set.rungs.filter((r) => r.lang === 'ts');

  const rubric = set.rubric
    .map((item) => {
      const n = seen.get(item.id) ?? 0;
      const weak = row.weak.some((w) => w.id === item.id);
      return `<li id="${set.termId}--${item.id}" class="${weak ? 'weak' : ''}">
        <span class="count" title="${n} rung${n === 1 ? '' : 's'} demonstrate this">${n}</span>
        <span class="statement">${inline(item.statement)}</span>
        ${weak ? '<span class="tag warn">recognition only</span>' : ''}
      </li>`;
    })
    .join('');

  const lapBlock = (label, rungs) =>
    rungs.length ? `<h3 class="lap">${esc(label)}</h3>${rungs.map((r) => renderRung(r, set)).join('')}` : '';

  const haystack = (
    set.termId +
    ' ' +
    (term?.title ?? '') +
    ' ' +
    (cat?.name ?? '') +
    ' ' +
    set.rungs.map((r) => r.title).join(' ')
  ).toLowerCase();

  return `<section class="concept" id="${set.termId}" data-search="${esc(haystack)}">
  <header class="concept-head">
    <h2><a href="#${set.termId}">${esc(term?.title ?? set.termId)}</a></h2>
    <div class="meta">
      ${cat ? `<span class="cat" style="--c: var(--cat-${esc(cat.id)})">${esc(cat.name)}</span>` : ''}
      <span>${set.rubric.length} rubric</span>
      <span>${set.rungs.length} rungs</span>
      <span>${row.code.reduce((n, c) => n + c.broken.length, 0)} variants</span>
      ${lap2.length ? '<span class="tag lap2">typed lap</span>' : ''}
    </div>
  </header>
  <ol class="rubric">${rubric}</ol>
  ${lapBlock(lap2.length ? 'Lap 1 · JavaScript' : 'Rungs', lap1)}
  ${lapBlock('Lap 2 · With types', lap2)}
</section>`;
};

const nav = rows
  .map((r) => {
    const title = termsById.get(r.set.termId)?.title ?? r.set.termId;
    return `<a href="#${r.set.termId}" data-search="${esc(
      (r.set.termId + ' ' + title).toLowerCase(),
    )}">${esc(title)}<em>${r.set.rungs.length}</em></a>`;
  })
  .join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Answer Key</title>
<style>
:root {
  --bg: #121212; --panel: #1a1a19; --card: #1f1f1f; --card2: #262624;
  --line: rgba(240,240,238,.12); --line2: rgba(240,240,238,.28);
  --text: #f0f0ee; --muted: rgba(240,240,238,.6); --faint: rgba(240,240,238,.38);
  --accent: #93c5fd; --accent-bg: rgba(147,197,253,.13); --accent-line: rgba(147,197,253,.42);
  --ok: #34d399; --no: #f87171;
  --warn: #fbbf24; --warn-bg: rgba(251,191,36,.12);
  --tok-kw: #f43f5e; --tok-fn: #60a5fa; --tok-str: #34d399; --tok-num: #fb923c; --tok-com: #64748b;
  --cat-core-functions: #3b82f6; --cat-composition: #10b981; --cat-purity-state: #f59e0b;
  --cat-category-morphisms: #a855f7; --cat-algebraic-structures: #ec4899; --cat-types-data: #06b6d4;
  --mono: 'JetBrains Mono','Space Mono',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 13px/1.65 var(--mono); -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code { background: var(--card2); padding: 1px 4px; border-radius: 3px; font-size: .92em; }

.wrap { display: grid; grid-template-columns: 232px minmax(0, 1fr); align-items: start; }

.side {
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
  border-right: 1px solid var(--line); background: var(--panel); padding: 16px 0 40px;
}
.side h1 { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--faint); margin: 0 16px 12px; }
.side input {
  width: calc(100% - 32px); margin: 0 16px 12px; padding: 7px 9px; font: inherit;
  background: var(--card); color: var(--text); border: 1px solid var(--line); border-radius: 4px;
}
.side input:focus { outline: none; border-color: var(--accent-line); }
.side nav { display: flex; flex-direction: column; }
.side nav a { display: flex; justify-content: space-between; gap: 8px; padding: 4px 16px; color: var(--muted); font-size: 12px; }
.side nav a:hover { background: var(--card); color: var(--text); text-decoration: none; }
.side nav a em { font-style: normal; color: var(--faint); }

main { padding: 32px 28px 30vh; max-width: 980px; }
.warning {
  border: 1px solid var(--warn); background: var(--warn-bg); color: var(--text);
  padding: 10px 14px; border-radius: 6px; margin: 0 0 24px;
}
.warning b { color: var(--warn); }

h2 { font-size: 19px; margin: 0; }
h3.lap {
  font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--faint);
  margin: 28px 0 12px; padding-top: 12px; border-top: 1px solid var(--line);
}
h4 { font-size: 14px; margin: 0; }
h5 { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--faint); margin: 14px 0 6px; }

dl.stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); gap: 1px;
  background: var(--line); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; margin: 0 0 28px;
}
.stat { background: var(--panel); padding: 10px 12px; }
.stat dt { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
.stat dd { margin: 2px 0 0; font-size: 20px; }
.stat dd span { display: block; font-size: 11px; color: var(--muted); }

.concept { border-top: 1px solid var(--line2); padding: 28px 0 8px; }
.concept-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; }
.concept-head h2 a { color: var(--text); }
.meta { display: flex; flex-wrap: wrap; gap: 10px; color: var(--faint); font-size: 11px; margin-left: auto; }
.cat { color: var(--c); }

ol.rubric { list-style: none; margin: 14px 0 0; padding: 0; }
ol.rubric li { display: flex; gap: 10px; align-items: flex-start; padding: 5px 0; color: var(--muted); }
ol.rubric li.weak { color: var(--text); }
.count {
  flex: none; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 4px;
  background: var(--card2); color: var(--faint); font-size: 11px;
}
ol.rubric li.weak .count { background: var(--warn-bg); color: var(--warn); }

.rung { border: 1px solid var(--line); border-radius: 6px; background: var(--panel); padding: 14px 16px; margin: 0 0 14px; }
.rung > header { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.flags { display: flex; gap: 6px; margin-left: auto; }
.tag {
  font-size: 10px; letter-spacing: .08em; text-transform: uppercase; padding: 2px 6px;
  border: 1px solid var(--line2); border-radius: 3px; color: var(--muted);
}
.tag.kind-code { border-color: var(--accent-line); color: var(--accent); }
.tag.kind-expr { border-color: var(--ok); color: var(--ok); }
.tag.lap2 { border-color: var(--accent-line); color: var(--accent); background: var(--accent-bg); }
.tag.warn { border-color: var(--warn); color: var(--warn); }
.prompt { margin: 10px 0 8px; color: var(--muted); }
.covers { font-size: 11px; color: var(--faint); }
.pill { display: inline-block; margin-left: 5px; padding: 1px 6px; border: 1px solid var(--line); border-radius: 10px; color: var(--muted); }

details { margin: 10px 0 0; }
summary { cursor: pointer; color: var(--muted); font-size: 12px; padding: 3px 0; }
summary:hover { color: var(--text); }
details.hints ol { margin: 6px 0 0; padding-left: 20px; color: var(--muted); }

pre.code {
  margin: 6px 0 0; padding: 10px 12px; background: var(--card); border: 1px solid var(--line);
  border-radius: 5px; overflow-x: auto; font-size: 12px; line-height: 1.6;
}
pre.code.ts { border-left: 2px solid var(--accent-line); }
/* The inline-code chip styling must not follow <code> into a block. */
pre.code code { background: none; padding: 0; border-radius: 0; font-size: inherit; }
pre.code i { font-style: normal; }
pre.code .k { color: var(--tok-kw); }
pre.code .s { color: var(--tok-str); }
pre.code .n { color: var(--tok-num); }
pre.code .c { color: var(--tok-com); }

ol.options { list-style: none; margin: 12px 0 0; padding: 0; }
ol.options li { border-left: 2px solid var(--line2); padding: 0 0 0 12px; margin: 0 0 12px; }
ol.options li.right { border-color: var(--ok); }
ol.options li.wrong { border-color: var(--no); }
.mark { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--no); }
li.right .mark { color: var(--ok); }
.why { color: var(--muted); margin: 6px 0 0; }
.expect { color: var(--muted); margin: 8px 0 0; }
ul.flat { list-style: none; margin: 0; padding: 0; }

.concept[hidden], .side nav a[hidden] { display: none; }

@media (max-width: 800px) {
  .wrap { grid-template-columns: 1fr; }
  .side { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--line); }
  .side nav { flex-direction: row; flex-wrap: wrap; }
  main { padding: 20px 16px 30vh; }
}
@media print { .side { display: none; } .wrap { grid-template-columns: 1fr; } details { display: block; } }
</style>
</head>
<body>
<div class="wrap">
  <aside class="side">
    <h1>Answer Key</h1>
    <input id="q" type="search" placeholder="filter concepts" autocomplete="off">
    <nav>${nav}</nav>
  </aside>
  <main>
    <p class="warning"><b>Authoring copy.</b> Every solution, every hint, and every variant that
    is meant to fail. Regenerate with <code>npx tsx scripts/build-answer-key.mjs</code> after
    changing a set. It is gitignored on purpose: do not commit it or serve it next to the app.</p>

    <dl class="stats">
      ${stat('Concepts', totals.concepts)}
      ${stat('Rubric items', totals.rubric)}
      ${stat('Rungs', totals.rungs, `${totals.code} code-graded`)}
      ${stat('Failing variants', totals.variants)}
      ${stat('Typed laps', totals.typed, `of ${totals.concepts}`)}
      ${stat('Two-rung sets', totals.minimum, 'at the floor')}
      ${stat('Single-rung items', totals.single, 'one demonstration only')}
      ${stat('Recognition only', totals.weak, 'no code grades these')}
    </dl>

    ${rows.map(renderConcept).join('\n')}
  </main>
</div>
<script>
  // Filtering is plain substring matching over a precomputed haystack, which is fast enough
  // for 73 sections and needs nothing loaded.
  const q = document.getElementById('q');
  const targets = [...document.querySelectorAll('.concept, .side nav a')];
  q.addEventListener('input', () => {
    const needle = q.value.trim().toLowerCase();
    for (const el of targets) el.hidden = needle !== '' && !el.dataset.search.includes(needle);
  });
  // "/" focuses the filter, the way the app does it.
  addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q) {
      e.preventDefault();
      q.focus();
      q.select();
    }
  });
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(
  `\n  wrote ${relative(ROOT, OUT)} (${Math.round(Buffer.byteLength(html) / 1024)} kB)\n` +
    `  ${totals.concepts} concepts, ${totals.rungs} rungs, ${totals.variants} failing variants\n` +
    `  ${totals.weak} rubric items are graded by recognition only, ${totals.single} by a single rung\n`,
);
