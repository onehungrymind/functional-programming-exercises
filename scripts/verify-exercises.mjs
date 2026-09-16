#!/usr/bin/env node
/**
 * The quality gate.
 *
 * For every code rung: the solution must pass, every broken variant must fail, and the
 * starter must fail. Every termId must exist in the snapshot. Every rung id must be unique.
 *
 * It runs the same `evaluateRung` the browser runs, so a rung that passes here passes there.
 * It never reads the sibling clone. A fresh checkout of this repo alone is enough.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SNAPSHOT = join(ROOT, 'data/jargons.json');
if (!existsSync(SNAPSHOT)) {
  console.error('\n  data/jargons.json is missing. Run `npm run sync:jargons` first.\n');
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const termsById = new Map(snapshot.terms.map((t) => [t.id, t]));

// TypeScript sources are loaded through a bundler, so run this via `npm run verify`,
// which hands the file to Vite's node runner. See the root package.json.
const { evaluateRung, didPass } = await import(pathToFileURL(join(ROOT, 'packages/engine/src/index.ts')).href);
const { exerciseSets } = await import(pathToFileURL(join(ROOT, 'packages/exercises/src/index.ts')).href);

const problems = [];
const note = (msg) => problems.push(msg);

let codeRungs = 0;
let variants = 0;

const describe = (result) => {
  if (result.fatal) return result.fatal;
  const failed = result.results.filter((r) => !r.ok);
  if (!failed.length) return 'every check passed';
  return failed.map((f) => `${f.name}${f.detail ? ` -- ${f.detail}` : ''}`).join('\n         ');
};

for (const [termId, set] of Object.entries(exerciseSets)) {
  if (set.termId !== termId) note(`${termId}: the set's termId is "${set.termId}", which does not match its key.`);
  if (!termsById.has(termId)) {
    note(`${termId}: no term with this id exists in data/jargons.json. Upstream may have renamed it.`);
    continue;
  }
  if (termsById.get(termId).isConcept === false) {
    note(`${termId}: this is a structural section upstream, not a concept. It should not have exercises.`);
  }

  const seen = new Set();
  for (const rung of set.rungs) {
    if (seen.has(rung.id)) note(`${termId}/${rung.id}: duplicate rung id.`);
    seen.add(rung.id);

    if (rung.kind === 'choice') {
      if (!rung.options.some((o) => o.correct)) note(`${termId}/${rung.id}: no option is marked correct.`);
      if (!rung.multi && rung.options.filter((o) => o.correct).length > 1) {
        note(`${termId}/${rung.id}: single-select, but more than one option is correct.`);
      }
      if (rung.options.some((o) => !o.why?.trim())) note(`${termId}/${rung.id}: an option has no "why".`);
      continue;
    }

    if (rung.kind !== 'code') continue;
    codeRungs++;

    if (!rung.broken?.length) note(`${termId}/${rung.id}: no broken variant. Every code rung needs at least one.`);
    if (!rung.exports?.length) note(`${termId}/${rung.id}: no exports listed.`);

    // 1. The solution must pass.
    variants++;
    const solved = evaluateRung(rung, rung.solution);
    if (!didPass(solved)) {
      note(`${termId}/${rung.id}: the SOLUTION does not pass.\n         ${describe(solved)}`);
    }

    // 2. The starter must fail, or the rung asks nothing.
    variants++;
    const started = evaluateRung(rung, rung.starter);
    if (didPass(started)) {
      note(`${termId}/${rung.id}: the STARTER already passes, so the rung asks the learner for nothing.`);
    }

    // 3. Every broken variant must fail, and fail for a reason worth reading.
    for (const [i, src] of (rung.broken ?? []).entries()) {
      variants++;
      const out = evaluateRung(rung, src);
      if (didPass(out)) {
        note(`${termId}/${rung.id}: broken variant ${i + 1} PASSES, so the checks do not catch that mistake.`);
      } else if (!out.fatal && out.results.filter((r) => !r.ok).every((r) => !r.detail)) {
        note(`${termId}/${rung.id}: broken variant ${i + 1} fails with no explanation. Give the check a detail message.`);
      }
    }
  }
}

// ---------------------------------------------------------------- report

const termCount = Object.keys(exerciseSets).length;

if (problems.length) {
  console.error(`\n  verify failed: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`);
  for (const p of problems) console.error(`   x ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `\n  verify passed\n  ${termCount} concepts, ${codeRungs} code rungs, ${variants} variants graded through the real harness\n`,
);
