#!/usr/bin/env node
/**
 * The ONLY code in this repo that reads ../functional-programming-jargon.
 * It reads. It never writes to, builds, or otherwise touches the clone.
 *
 * Outputs: data/jargons.json, data/source.json, NOTICE.md
 * It never commits. Review the diff yourself.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UPSTREAM = resolve(ROOT, process.env.JARGON_REPO ?? '../functional-programming-jargon');

const CATEGORY_IDS = [
  'core-functions',
  'composition',
  'purity-state',
  'category-morphisms',
  'algebraic-structures',
  'types-data',
];

/** Terms that are structural, not concepts. They render in the graph but get no exercises. */
const NON_CONCEPT_IDS = new Set([
  'dealing-with-partial-functions',
  'functional-programming-libraries-in-javascript',
]);

const fail = (msg) => {
  console.error(`\n  sync:jargons failed\n  ${msg}\n`);
  process.exit(1);
};

// ---------------------------------------------------------------- 1. locate

if (!existsSync(UPSTREAM)) {
  fail(
    `No upstream clone at ${UPSTREAM}\n` +
      `  Clone it next to this repo:\n` +
      `    git clone https://github.com/hemanth/functional-programming-jargon.git ${UPSTREAM}\n` +
      `  Or point JARGON_REPO at an existing clone.`,
  );
}

const SOURCE_JSON = join(UPSTREAM, 'app/src/data/jargons.json');
const SOURCE_LICENSE = join(UPSTREAM, 'LICENSE');
for (const f of [SOURCE_JSON, SOURCE_LICENSE]) {
  if (!existsSync(f)) fail(`Expected ${f} in the upstream clone, but it is not there.`);
}

// ---------------------------------------------------------------- 2. read

const git = (...args) => {
  try {
    return execFileSync('git', ['-C', UPSTREAM, ...args], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

const sha = git('rev-parse', 'HEAD');
const dirty = git('status', '--porcelain');
if (dirty === null) console.warn('  warning: upstream is not a git clone, so no commit sha was recorded.');
else if (dirty !== '') {
  console.warn('  warning: the upstream clone has uncommitted changes.');
  console.warn('  The snapshot below may not match any real commit.\n');
}

let raw;
try {
  raw = JSON.parse(readFileSync(SOURCE_JSON, 'utf8'));
} catch (e) {
  fail(`Could not parse ${SOURCE_JSON}: ${e.message}`);
}

// ---------------------------------------------------------------- 3. validate

const errors = [];
const need = (cond, msg) => {
  if (!cond) errors.push(msg);
};
const isStr = (v) => typeof v === 'string';
const isArrOf = (v, pred) => Array.isArray(v) && v.every(pred);

need(raw && typeof raw === 'object', 'Root is not an object');
for (const k of ['meta', 'categories', 'terms', 'graph']) need(k in raw, `Missing top-level key "${k}"`);
need(raw.graph && Array.isArray(raw.graph.nodes), 'graph.nodes is not an array');
need(raw.graph && Array.isArray(raw.graph.links), 'graph.links is not an array');
need(Array.isArray(raw.terms), 'terms is not an array');
need(
  raw.categories && typeof raw.categories === 'object' && !Array.isArray(raw.categories),
  'categories is not an object keyed by id',
);

if (errors.length) fail(errors.join('\n  '));

// Upstream ships categories as an object keyed by id. The app wants an ordered array,
// so flatten it here and let nothing downstream care about the difference.
const categoryList = Object.values(raw.categories);
const catIds = categoryList.map((c) => c.id);
for (const id of CATEGORY_IDS) need(catIds.includes(id), `Expected category "${id}" but it is not in the snapshot`);
for (const c of categoryList) {
  for (const k of ['id', 'name', 'description', 'color']) need(isStr(c[k]), `Category ${c.id}: "${k}" is not a string`);
  need(/^#[0-9a-f]{6}$/i.test(c.color), `Category ${c.id}: color "${c.color}" is not a hex value`);
}

const termIds = new Set();
for (const t of raw.terms) {
  need(isStr(t.id), `A term has no string id`);
  need(!termIds.has(t.id), `Duplicate term id "${t.id}"`);
  termIds.add(t.id);
  need(isStr(t.title), `${t.id}: title is not a string`);
  need(t.depth === 2 || t.depth === 3, `${t.id}: depth is ${t.depth}, expected 2 or 3`);
  need(catIds.includes(t.category), `${t.id}: unknown category "${t.category}"`);
  need(isStr(t.summary), `${t.id}: summary is not a string`);
  need(isStr(t.body), `${t.id}: body is not a string`);
  need(isArrOf(t.aliases, isStr), `${t.id}: aliases is not a string array`);
  need(isArrOf(t.crossRefs, isStr), `${t.id}: crossRefs is not a string array`);
  need(isArrOf(t.relatedIds, isStr), `${t.id}: relatedIds is not a string array`);
  need(
    isArrOf(t.codeBlocks, (b) => b && isStr(b.code)),
    `${t.id}: codeBlocks is not an array of {lang, code}`,
  );
  need(
    isArrOf(t.furtherReading, (r) => r && isStr(r.title) && isStr(r.url)),
    `${t.id}: furtherReading is not an array of {title, url}`,
  );
}

for (const n of raw.graph.nodes) need(termIds.has(n.id), `graph node "${n.id}" has no matching term`);
for (const l of raw.graph.links) {
  need(termIds.has(l.source), `link source "${l.source}" has no matching term`);
  need(termIds.has(l.target), `link target "${l.target}" has no matching term`);
  need(l.type === 'core' || l.type === 'reference', `link ${l.source}->${l.target}: unknown type "${l.type}"`);
}

if (errors.length) fail(`The upstream snapshot is not the shape this app expects:\n  ${errors.join('\n  ')}`);

// ---------------------------------------------------------------- 4. normalize

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const snapshot = {
  meta: {
    title: raw.meta.title,
    subtitle: raw.meta.subtitle,
    totalTerms: raw.terms.length,
    totalRelationships: raw.graph.links.length,
    sourceRepo: raw.meta.sourceRepo,
    originalAuthor: raw.meta.originalAuthor,
  },
  categories: [...categoryList]
    .sort((a, b) => CATEGORY_IDS.indexOf(a.id) - CATEGORY_IDS.indexOf(b.id))
    .map((c) => ({ id: c.id, name: c.name, description: c.description, color: c.color })),
  terms: [...raw.terms].sort(byId).map((t) => ({
    id: t.id,
    title: t.title,
    depth: t.depth,
    category: t.category,
    isConcept: !NON_CONCEPT_IDS.has(t.id),
    aliases: [...t.aliases].sort(),
    summary: t.summary,
    body: t.body,
    codeBlocks: t.codeBlocks.map((b) => ({ lang: b.lang || 'js', code: b.code })),
    furtherReading: t.furtherReading.map((r) => ({ title: r.title, url: r.url })),
    crossRefs: [...new Set(t.crossRefs)].sort(),
    relatedIds: [...new Set(t.relatedIds)].sort(),
  })),
  graph: {
    nodes: [...raw.graph.nodes].sort(byId).map((n) => ({
      id: n.id,
      name: n.name,
      category: n.category,
      val: n.val,
    })),
    links: [...raw.graph.links]
      .map((l) => ({ source: l.source, target: l.target, type: l.type }))
      .sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target)),
  },
};

// ---------------------------------------------------------------- 5. diff

const OUT_JSON = join(ROOT, 'data/jargons.json');
const prev = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, 'utf8')) : null;

if (!prev) {
  console.log(`\n  First sync. Writing ${snapshot.terms.length} terms and ${snapshot.graph.links.length} links.`);
} else {
  const prevMap = new Map(prev.terms.map((t) => [t.id, t]));
  const nextMap = new Map(snapshot.terms.map((t) => [t.id, t]));
  const added = snapshot.terms.filter((t) => !prevMap.has(t.id)).map((t) => t.id);
  const removed = prev.terms.filter((t) => !nextMap.has(t.id)).map((t) => t.id);
  const changed = snapshot.terms
    .filter((t) => {
      const p = prevMap.get(t.id);
      return p && (p.title !== t.title || p.category !== t.category || p.body !== t.body);
    })
    .map((t) => t.id);

  console.log('\n  Snapshot diff');
  console.log(`    added    ${added.length ? added.join(', ') : 'none'}`);
  console.log(`    removed  ${removed.length ? removed.join(', ') : 'none'}`);
  console.log(`    changed  ${changed.length ? changed.join(', ') : 'none'}`);

  // A removed id with an exercise file is the one change that actually breaks the app.
  if (removed.length) {
    const exDir = join(ROOT, 'packages/exercises/src/terms');
    const orphaned = removed.filter((id) => existsSync(join(exDir, `${id}.ts`)));
    if (orphaned.length) {
      console.log('');
      console.log('  These ids disappeared upstream but still have exercise files:');
      for (const id of orphaned) console.log(`    packages/exercises/src/terms/${id}.ts`);
      console.log('  Upstream probably renamed them. Rename the files to match, or npm run verify will fail.');
    }
  }
}

// ---------------------------------------------------------------- 6. write

writeFileSync(OUT_JSON, JSON.stringify(snapshot, null, 2) + '\n');

writeFileSync(
  join(ROOT, 'data/source.json'),
  JSON.stringify(
    {
      repo: 'https://github.com/hemanth/functional-programming-jargon',
      commit: sha,
      dirty: dirty !== null && dirty !== '',
      syncedAt: new Date().toISOString().slice(0, 10),
      termCount: snapshot.terms.length,
      conceptCount: snapshot.terms.filter((t) => t.isConcept).length,
      linkCount: snapshot.graph.links.length,
    },
    null,
    2,
  ) + '\n',
);

const license = readFileSync(SOURCE_LICENSE, 'utf8').trim();
writeFileSync(
  join(ROOT, 'NOTICE.md'),
  `# Notice

The concept data in \`data/jargons.json\` is a normalized snapshot of
[hemanth/functional-programming-jargon](https://github.com/hemanth/functional-programming-jargon)
by Hemanth HM, taken from commit \`${sha ?? 'unknown'}\` on ${new Date().toISOString().slice(0, 10)}.

The graph layout approach and the category color table in this app are derived from the
same project's web app. Everything else here is original work.

Regenerate the snapshot with \`npm run sync:jargons\`.

## Upstream license

\`\`\`
${license}
\`\`\`
`,
);

console.log(`\n  Wrote data/jargons.json, data/source.json, NOTICE.md`);
console.log(`  ${snapshot.terms.length} terms (${snapshot.terms.filter((t) => t.isConcept).length} concepts), ${snapshot.graph.links.length} links, upstream ${sha?.slice(0, 7) ?? '?'}\n`);
