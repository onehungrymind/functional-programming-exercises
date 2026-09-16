#!/usr/bin/env node
/**
 * Applies a rubric, notes, and rung coverage to an exercise set.
 *
 * Purely mechanical: it moves text into the right place in the file and removes the
 * `rubricTodo` marker. The judgment is in the content it is handed. Used while migrating the
 * sets that predate the rubric model; `npm run verify` is what actually checks the result.
 *
 * Usage: node scripts/write-rubric.mjs <payload.json>
 * Payload: [{ term, rubric: [{id, statement}], notes, covers: { rungId: [itemId] } }]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TERMS = join(ROOT, 'packages/exercises/src/terms');

const payload = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const problems = [];

for (const { term, rubric, notes, covers } of payload) {
  const file = join(TERMS, `${term}.ts`);
  let s = readFileSync(file, 'utf8');

  if (!s.includes('rubricTodo: true')) {
    problems.push(`${term}: not marked rubricTodo, refusing to rewrite`);
    continue;
  }

  // Drop the backlog marker and its comment.
  s = s.replace(/ *\/\/ TODO: predates the rubric[\s\S]*?\n *\/\/ rungs mapped onto it\.\n *rubricTodo: true,\n/, '');
  s = s.replace(/ *rubricTodo: true,\n/, '');

  const rubricBlock =
    '  rubric: [\n' +
    rubric
      .map(
        (r) =>
          `    {\n      id: '${r.id}',\n      statement:\n        ${JSON.stringify(r.statement)},\n    },\n`,
      )
      .join('') +
    '  ],\n';

  // The notes land inside a template literal, so an example that is itself a template literal
  // would end it early or interpolate into it. Escape any backtick and any dollar-brace that
  // is not escaped already; the fences in the payload arrive escaped and are left alone.
  const safeNotes = notes.replace(/(?<!\\)`/g, '\\`').replace(/(?<!\\)\$\{/g, '\\${');
  const notesBlock = `  notes: \`${safeNotes}\`,\n`;

  const anchor = s.match(/ {2}termId: '[^']+',\n/);
  if (!anchor) {
    problems.push(`${term}: no termId line`);
    continue;
  }
  const at = anchor.index + anchor[0].length;
  s = s.slice(0, at) + rubricBlock + notesBlock + s.slice(at);

  // Rubric items and rungs are both objects with an `id` at the same indent, so anchor the
  // search past the start of the rungs array. A rubric item sharing a rung's id would
  // otherwise collect the `covers` meant for the rung.
  const rungsAt = s.indexOf('  rungs: [');
  if (rungsAt === -1) {
    problems.push(`${term}: no rungs array`);
    continue;
  }
  let head = s.slice(0, rungsAt);
  let tail = s.slice(rungsAt);
  for (const [rungId, items] of Object.entries(covers)) {
    const needle = `      id: '${rungId}',\n`;
    if (!tail.includes(needle)) {
      problems.push(`${term}: no rung "${rungId}"`);
      continue;
    }
    tail = tail.replace(needle, needle + `      covers: [${items.map((i) => `'${i}'`).join(', ')}],\n`);
  }
  s = head + tail;

  writeFileSync(file, s);
  const blocks = (notes.match(/\\`\\`\\`/g) ?? []).length / 2;
  console.log(`  ${term.padEnd(26)} ${rubric.length} rubric items, ${blocks} code blocks`);
}

if (problems.length) {
  console.error('\n  problems:');
  for (const p of problems) console.error(`   x ${p}`);
  process.exit(1);
}
