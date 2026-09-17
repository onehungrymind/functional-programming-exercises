#!/usr/bin/env node
/**
 * Flags rungs whose directions are probably unclear.
 *
 * Not a gate. Clarity is a judgement and this only spots the shapes that have turned out to
 * hide it: an export nobody described, a prompt that says "write it" without a referent, a
 * multi-answer question that does not say it takes more than one.
 *
 * Usage: npx tsx scripts/audit-clarity.mjs [--verbose]
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { exerciseSets, exerciseTermIds } = await import(
  new URL(`file://${join(ROOT, 'packages/exercises/src/index.ts')}`).href
);

const findings = [];
const flag = (termId, rungId, kind, detail) => findings.push({ termId, rungId, kind, detail });

/**
 * True when the starter leaves this binding for the learner rather than handing it over done.
 *
 * Reads the balanced body rather than a fixed window of lines, because a window runs into the
 * next declaration and reports a finished constructor as a stub.
 */
const isStub = (starter, name) => {
  const lines = starter.split('\n');
  const at = lines.findIndex((l) => new RegExp(`^\\s*(const|function\\*?)\\s+${name}\\b`).test(l));
  if (at === -1) return false;

  const rest = lines.slice(at).join('\n');
  const eq = rest.indexOf('=');
  const open = rest.indexOf('{', eq === -1 ? 0 : eq);
  // No block at all: a stub only if the initialiser is a bare placeholder.
  if (open === -1 || (eq !== -1 && open > rest.indexOf('\n', eq) && rest.indexOf('\n', eq) !== -1)) {
    return /=\s*(false|true|0|1|-1|''|""|\[\]|\{\}|null|undefined)\s*[;,]?\s*$/.test(lines[at]);
  }

  let depth = 0;
  let end = -1;
  for (let i = open; i < rest.length; i += 1) {
    if (rest[i] === '{') depth += 1;
    else if (rest[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return false;
  const body = rest.slice(open + 1, end);
  // Anything left once comments and whitespace are gone means it was written for you.
  const meat = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (meat === '') return true;
  // An object literal with an empty method body is a stub too: `concat: (other) => {\n}`.
  return /[:=]\s*(\([^)]*\)|\w+)\s*=>\s*\{\s*(\/\/[^\n]*\s*)*\}/.test(body);
};

for (const termId of exerciseTermIds) {
  const set = exerciseSets[termId];
  for (const rung of set.rungs) {
    const prompt = rung.prompt;
    const said = (name) => prompt.includes(name);

    if (rung.kind === 'code') {
      const comments = rung.starter
        .split('\n')
        .filter((l) => l.trim().startsWith('//'))
        .join(' ');

      for (const name of rung.exports) {
        // Scaffolding handed over finished does not need describing; a stub does.
        if (!isStub(rung.starter, name)) continue;
        const lines = rung.starter.split('\n');
        const at = lines.findIndex((l) => new RegExp(`^\\s*(const|function\\*?)\\s+${name}\\b`).test(l));
        const above = at > 0 && lines[at - 1].trim().startsWith('//');
        if (!said(name) && !comments.includes(name) && !above) {
          flag(termId, rung.id, 'unnamed-export', `"${name}" is a stub and is described nowhere`);
        }
      }

      // Several things to write and no worked example anywhere.
      const toWrite = rung.exports.filter((n) => isStub(rung.starter, n));
      const hasExample = /->|=>\s*\S+\s*$/m.test(comments) || /`[^`]*\(\s*[^`]*\)[^`]*`/.test(prompt);
      if (toWrite.length >= 2 && !hasExample) {
        flag(termId, rung.id, 'no-example', `${toWrite.length} functions to write and no worked example in the prompt or starter`);
      }

      // A prompt that never tells you to do anything. An instruction can be an imperative,
      // a "define X", or an "X should ...". A starter comment sitting on the stub counts too:
      // the pair has to specify the job, not the prompt alone.
      const imperative =
        /\b(write|build|make|fix|repair|rewrite|give|add|implement|satisfy|fill|replace|show|find|split|turn|use|complete|count|list|name|sort|run|record|report|apply|compose|curry|wrap|guard|check|define|derive|predict|pick|choose|collect|produce|return|swap|reach|read|keep|drop|stop|prove|classify|separate|purify|inline|fold|unfold|insert|combine)\b/i.test(
          prompt,
        );
      const saidShould = rung.exports.some((n) => new RegExp(`\`?${n}\`?[^.]{0,40}\\bshould\\b`).test(prompt));
      const stubsExplained = rung.exports
        .filter((n) => isStub(rung.starter, n))
        .every((n) => comments.includes(n) || prompt.includes(n));
      if (!imperative && !saidShould && !stubsExplained) {
        flag(termId, rung.id, 'no-verb', 'neither the prompt nor the starter says what to do');
      }
    }

    if (rung.kind === 'choice') {
      const plural =
        /\ball\b|\bevery\b|\beverything\b|\bwhich of these\b|\bwhich statements\b|\bany\b|\bthose\b|\beach\b|\bselect\b/i.test(
          prompt,
        );
      if (rung.multi && !plural) {
        flag(termId, rung.id, 'multi-unsaid', 'more than one option is correct and the prompt does not say so');
      }
      // "the one" and "what does it" are singular however many other words are around them.
      const singular = /\bthe one\b|\bwhich one\b|\bpick one\b|\bwhat does\b|\bwhat is\b/i.test(prompt);
      if (!rung.multi && !singular && /\bwhich of these are\b|\bselect every\b|\bpick every\b/i.test(prompt)) {
        flag(termId, rung.id, 'single-unsaid', 'the prompt reads as multi-answer but only one option is correct');
      }
    }

    if (rung.kind === 'expr') {
      const shape = /array|number|boolean|string|list|type an?\b|`\[|tags|order/i.test(prompt) || !!rung.placeholder;
      if (!shape) flag(termId, rung.id, 'no-shape', 'the prompt does not say what shape the answer takes');
    }

    // Referent-free instructions.
    for (const phrase of ['write it and', 'do it and', 'then the other', 'the same for the other', 'and the other one']) {
      if (prompt.toLowerCase().includes(phrase)) {
        flag(termId, rung.id, 'dangling-referent', `"${phrase}" has no clear referent`);
      }
    }

  }
}

const byKind = {};
for (const f of findings) (byKind[f.kind] ??= []).push(f);
console.log(`\n  ${findings.length} findings across ${new Set(findings.map((f) => f.termId + '/' + f.rungId)).size} rungs\n`);
for (const [kind, list] of Object.entries(byKind).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${kind} (${list.length})`);
  for (const f of list) console.log(`    ${(f.termId + '/' + f.rungId).padEnd(40)} ${f.detail}`);
  console.log('');
}
