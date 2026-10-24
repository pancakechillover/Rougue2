/**
 * Apply the purge plan: per file, splice text ranges (descending).
 * Verifies each range's original text starts with the expected name before cutting.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const { plan } = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const byFile = new Map();
for (const p of plan) {
  if (!byFile.has(p.file)) byFile.set(p.file, []);
  byFile.get(p.file).push(p);
}

let applied = 0;
const problems: string[] = [];

for (const [file, items] of byFile) {
  let text = readFileSync(file, 'utf8');

  // Build line offsets from the CURRENT text
  const lineOffsets: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineOffsets.push(i + 1);

  for (const it of [...items].sort((a, b) => b.start - a.start)) {
    const expected = it.kind === 'varUnsafe' ? `const ${it.name}` : it.name;
    const slice = text.slice(it.start, it.end);
    if (it.kind === 'varUnsafe') {
      if (!slice.startsWith(`const ${it.name}`)) {
        problems.push(`${file}@${it.start}: expected "const ${it.name}...", got "${slice.slice(0, 40)}"`);
        continue;
      }
    } else if (it.kind !== 'varSafe' && slice !== it.name) {
      problems.push(`${file}@${it.start}: expected "${it.name}", got "${slice}"`);
      continue;
    }

    if (it.kind === 'varUnsafe') {
      // `const x = expr;` -> `expr;`
      const afterSemi = text[it.end] === ';' ? ';' : '';
      text = text.slice(0, it.start) + it.replacement + afterSemi + text.slice(it.end + (afterSemi ? 1 : 0));
    } else {
      // remove the whole range
      // also swallow an indent run before the range if the range starts a line
      let dS = it.start;
      const lineStart = text.lastIndexOf('\n', dS - 1) + 1;
      if (text.slice(lineStart, dS).trim() === '') dS = lineStart;
      text = text.slice(0, dS) + text.slice(it.end);
    }
    applied++;
  }

  writeFileSync(file, text);
}

console.log(`applied: ${applied}, problems: ${problems.length}`);
if (problems.length) for (const p of problems) console.log(' ', p);
