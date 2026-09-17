#!/usr/bin/env node
/**
 * Adds a rung to an existing exercise set.
 *
 * Mechanical only. The judgment is in the content it is handed, and `npm run verify` is what
 * checks the result. Written because doing this by hand across 73 files invites the escaping
 * mistakes that have cost time before: a backtick inside content ending the template literal,
 * a `\d` in a regex being eaten by the template, and a new rung landing after the typed lap
 * instead of before it.
 *
 * A new JavaScript rung is inserted before the first `lang: 'ts'` rung, so lap 2 stays last.
 *
 * Usage: node scripts/add-rung.mjs <payload.json>
 * Payload: [{ term, rung: { id, kind, role, covers, title, prompt, hints, ... } }]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TERMS = join(ROOT, 'packages/exercises/src/terms');

/**
 * Content lands inside a template literal, so anything the template would eat is escaped.
 * Backslash goes first and unconditionally, or a regex like `/^\d+$/` arrives as `/^d+$/`.
 */
const lit = (text) =>
  String(text).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const j = (v) => JSON.stringify(v);
const list = (xs) => xs.map((x) => `'${x}'`).join(', ');

const payload = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const problems = [];

for (const { term, rung } of payload) {
  const file = join(TERMS, `${term}.ts`);
  let s;
  try {
    s = readFileSync(file, 'utf8');
  } catch {
    problems.push(`${term}: no such set`);
    continue;
  }

  // Rubric items and rungs are both objects with an `id` at the same indent, so only look
  // past the start of the rungs array. A rubric item may legitimately share a rung's name.
  const rungsAt = s.indexOf('  rungs: [');
  if (rungsAt === -1) {
    problems.push(`${term}: no rungs array`);
    continue;
  }
  if (new RegExp(`^ {6}id: '${rung.id}',$`, 'm').test(s.slice(rungsAt))) {
    problems.push(`${term}: already has a rung called "${rung.id}"`);
    continue;
  }

  const head =
    `\n    {\n` +
    `      id: '${rung.id}',\n` +
    `      kind: '${rung.kind}',\n` +
    `      role: '${rung.role}',\n` +
    (rung.lang ? `      lang: '${rung.lang}',\n` : '') +
    `      covers: [${list(rung.covers)}],\n` +
    `      title: ${j(rung.title)},\n` +
    `      prompt:\n        ${j(rung.prompt)},\n` +
    (rung.hints?.length
      ? `      hints: [\n${rung.hints.map((h) => `        ${j(h)},\n`).join('')}      ],\n`
      : '');

  let body;
  if (rung.kind === 'code') {
    body =
      `      exports: [${list(rung.exports)}],\n` +
      `      starter: \`${lit(rung.starter)}\`,\n` +
      `      solution: \`${lit(rung.solution)}\`,\n` +
      `      broken: [\n${rung.broken.map((b) => `        \`${lit(b)}\`,\n`).join('')}      ],\n` +
      (rung.inverted ? `      inverted: true,\n` : '') +
      `      checks: ${rung.checks},\n`;
  } else if (rung.kind === 'expr') {
    body =
      (rung.context ? `      context: \`${lit(rung.context)}\`,\n` : '') +
      (rung.placeholder ? `      placeholder: ${j(rung.placeholder)},\n` : '') +
      `      expect: ${j(rung.expect)},\n` +
      `      solution: ${j(rung.solution)},\n` +
      `      broken: [${rung.broken.map((b) => j(b)).join(', ')}],\n`;
  } else if (rung.kind === 'choice') {
    body =
      `      multi: ${rung.multi ? 'true' : 'false'},\n` +
      `      options: [\n` +
      rung.options
        .map(
          (o) =>
            `        {\n          code: \`${lit(o.code)}\`,\n` +
            `          correct: ${o.correct},\n          why: ${j(o.why)},\n        },\n`,
        )
        .join('') +
      `      ],\n`;
  } else {
    problems.push(`${term}: rung kind "${rung.kind}" is not handled`);
    continue;
  }

  const block = `${head}${body}    },\n`;

  // A new JavaScript rung belongs before lap 2, so the stepper still reads in order.
  const typedAt = s.indexOf("      lang: 'ts',");
  let at;
  if (!rung.lang && typedAt !== -1) {
    at = s.lastIndexOf('\n    {', typedAt);
    if (at === -1) {
      problems.push(`${term}: found a typed rung but not where it starts`);
      continue;
    }
  } else {
    at = s.lastIndexOf('  ],\n};');
    if (at === -1) {
      problems.push(`${term}: no rungs array to append to`);
      continue;
    }
  }

  writeFileSync(file, s.slice(0, at) + block + s.slice(at));
  console.log(`  ${term.padEnd(26)} + ${rung.kind.padEnd(6)} ${rung.role.padEnd(10)} covers ${rung.covers.join(', ')}`);
}

if (problems.length) {
  console.error('\n  problems:');
  for (const p of problems) console.error(`   x ${p}`);
  process.exit(1);
}
