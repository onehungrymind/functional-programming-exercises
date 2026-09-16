#!/usr/bin/env node
/**
 * Adds a typed second lap to an exercise set: a rubric item, `typedNotes`, and a
 * `lang: 'ts'` rung mapped onto it.
 *
 * Mechanical only. The judgment is in the content it is handed, and `npm run verify` is what
 * checks the result. Written because doing this by hand across 24 files invites exactly the
 * escaping mistakes that cost time earlier: a backtick inside the content ending the template
 * literal, and a rubric item id colliding with a rung id.
 *
 * Usage: node scripts/write-typed-lap.mjs <payload.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TERMS = join(ROOT, 'packages/exercises/src/terms');

/**
 * Content lands inside a template literal, so anything the template would eat is escaped.
 *
 * Backslash goes first and unconditionally: a template literal swallows an unknown escape, so
 * a regex like `/^\d+$/` in the payload arrives in the file as `/^d+$/` and silently matches
 * the wrong thing. Escaping backslash after the backtick pass would re-escape our own work.
 */
const lit = (text) =>
  text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const payload = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const problems = [];

for (const entry of payload) {
  const { term, rubric, typedNotes, rung } = entry;
  const file = join(TERMS, `${term}.ts`);
  let s = readFileSync(file, 'utf8');

  if (s.includes('typedNotes:')) {
    problems.push(`${term}: already has a typed lap`);
    continue;
  }
  if (!s.includes('  rubric: [')) {
    problems.push(`${term}: no rubric to add to`);
    continue;
  }

  // The rubric item goes last, so the typed lap reads as the final thing asked of the learner.
  const rubricEnd = s.indexOf('  ],\n', s.indexOf('  rubric: ['));
  s =
    s.slice(0, rubricEnd) +
    `    {\n      id: '${rubric.id}',\n      statement:\n        ${JSON.stringify(rubric.statement)},\n    },\n` +
    s.slice(rubricEnd);

  // typedNotes sits directly before the rungs.
  const rungsAt = s.indexOf('  rungs: [');
  if (rungsAt === -1) {
    problems.push(`${term}: no rungs array`);
    continue;
  }
  s = s.slice(0, rungsAt) + `  typedNotes: \`${lit(typedNotes)}\`,\n` + s.slice(rungsAt);

  // The typed rung goes last, after every JavaScript rung.
  const closeAt = s.lastIndexOf('  ],\n};');
  const broken = rung.broken.map((b) => `        \`${lit(b)}\`,\n`).join('');
  const hints = rung.hints.map((h) => `        ${JSON.stringify(h)},\n`).join('');
  const block =
    `\n    {\n` +
    `      id: 'typed',\n` +
    `      kind: 'code',\n` +
    `      role: 'implement',\n` +
    `      lang: 'ts',\n` +
    // The rubric item this script just added is always covered, whatever the payload says.
    // Forgetting it means verify rejects the set for a claim nothing demonstrates.
    `      covers: [${[...new Set([...entry.covers, rubric.id])].map((c) => `'${c}'`).join(', ')}],\n` +
    `      title: ${JSON.stringify(rung.title)},\n` +
    `      prompt:\n        ${JSON.stringify(rung.prompt)},\n` +
    `      hints: [\n${hints}      ],\n` +
    `      exports: [${rung.exports.map((e) => `'${e}'`).join(', ')}],\n` +
    `      starter: \`${lit(rung.starter)}\`,\n` +
    `      solution: \`${lit(rung.solution)}\`,\n` +
    `      broken: [\n${broken}      ],\n` +
    `      checks: ${rung.checks},\n` +
    `    },\n`;
  s = s.slice(0, closeAt) + block + s.slice(closeAt);

  writeFileSync(file, s);
  const blocks = (typedNotes.match(/```/g) ?? []).length / 2;
  console.log(`  ${term.padEnd(26)} ${blocks} code blocks in lap 2`);
}

if (problems.length) {
  console.error('\n  problems:');
  for (const p of problems) console.error(`   x ${p}`);
  process.exit(1);
}
