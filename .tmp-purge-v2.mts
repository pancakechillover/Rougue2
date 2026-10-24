/**
 * Purge v2: statement-level removal / hook-call preservation.
 *
 * - HOOK inits (useMemo/useRef/...): `const x = hook(...)` -> `hook(...)` (call kept, React rules intact)
 * - `const x = await ...`            -> `await ...`
 * - everything else single-decl      -> remove the whole statement
 * - multi-decl statements            -> remove just the declaration + adjacent comma
 * - imports / special cases          -> skipped (handled by eslint --fix / manually)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Project, SyntaxKind } from 'ts-morph';

const tscOut = readFileSync(process.argv[2], 'utf8');
const errors = [...tscOut.matchAll(/^(.+?)\((\d+),(\d+)\): error TS6133: '([^']+)'/gm)].map(
  ([, file, line, col, name]) => ({
    file: file.replace(/\\/g, '/'),
    line: Number(line) - 1,
    col: Number(col) - 1,
    name,
  })
);

const SKIP_FILES = new Set([
  'src/components/settings/ProfileModal.tsx', // __streakData ternary w/ IIFE — manual
]);

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

type Edit = { start: number; end: number; replacement: string; name: string; kind: string };
const byFile = new Map<string, Edit[]>();
const skipped: string[] = [];
let hookKept = 0, stmtRemoved = 0, declRemoved = 0;

for (const e of errors) {
  if (SKIP_FILES.has(e.file)) { skipped.push(`${e.file}:${e.line + 1} (manual)`); continue; }
  const sf = project.getSourceFile(e.file);
  if (!sf) { skipped.push(`${e.file} missing`); continue; }

  const text = sf.getFullText();
  const offsets: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') offsets.push(i + 1);
  // getFullText may include a BOM; ts-morph positions are text-based already

  const pos = (offsets[e.line] ?? 0) + e.col;
  const node = sf.getDescendantAtPos(pos);
  const id = node?.asKind?.(SyntaxKind.Identifier);
  if (!id) { skipped.push(`${e.file}:${e.line + 1} no-id`); continue; }

  // If this is inside an import declaration -> leave for eslint --fix
  let anc: Node | undefined = id;
  while (anc && anc.getKind() !== SyntaxKind.ImportDeclaration && anc.getKind() !== SyntaxKind.VariableDeclaration) {
    anc = anc.getParent();
  }
  if (!anc) { skipped.push(`${e.file}:${e.line + 1} no-ancestor`); continue; }

  if (anc.getKind() === SyntaxKind.ImportDeclaration) {
    skipped.push(`${e.file}:${e.line + 1} import (eslint --fix)`);
    continue;
  }

  const varDecl = anc.asKindOrThrow(SyntaxKind.VariableDeclaration);
  const list = varDecl.getParent().asKindOrThrow(SyntaxKind.VariableDeclarationList);
  const stmt = list.getParent().asKindOrThrow(SyntaxKind.VariableStatement);
  const stmtText = stmt.getText();

  if (list.getDeclarations().length > 1) {
    // multi-declaration: remove just this declaration via text range + comma
    const dStart = varDecl.getStart();
    const dEnd = varDecl.getEnd();
    let dS = dStart, dE = dEnd;
    if (text[dEnd] === ',') dE = dEnd + 1;
    else if (text[dStart - 1] === ',') dS = dStart - 1;
    if (!byFile.has(e.file)) byFile.set(e.file, []);
    byFile.get(e.file)!.push({ start: dS, end: dE, replacement: '', name: e.name, kind: 'multi-decl' });
    declRemoved++;
    continue;
  }

  // single declaration
  const m = stmtText.match(/^const\s+[\w$]+\s*=\s*([\s\S]+);?$/);
  if (!m) { skipped.push(`${e.file}:${e.line + 1} no-match: ${stmtText.slice(0, 40)}`); continue; }
  const initText = m[1].trim();

  const isHook = /^\s*(React\.)?use[A-Z]/.test(initText);
  const isAwait = /^await\s/.test(initText);

  const sStart = stmt.getStart(true); // include leading trivia (indentation)
  const sEnd = stmt.getEnd();
  let dS = sStart, dE = sEnd;
  if (text[dE] === ';') dE = dE + 1;

  let replacement = '';
  let kind = 'remove';
  if (isHook) {
    replacement = initText + ';';
    kind = 'hook-keep';
    hookKept++;
  } else if (isAwait) {
    replacement = initText + ';';
    kind = 'await-keep';
  } else {
    stmtRemoved++;
  }

  // swallow the whole line if the statement is alone on it
  const lineStart = text.lastIndexOf('\n', dS - 1) + 1;
  const before = text.slice(lineStart, dS);
  const afterFirst = text.slice(dE, text.indexOf('\n', dE) === -1 ? text.length : text.indexOf('\n', dE));
  if (before.trim() === '' && afterFirst.trim() === '') {
    dS = lineStart;
    // include the newline itself
    const nl = text.indexOf('\n', dE);
    if (nl !== -1) dE = nl + 1;
  }

  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file)!.push({ start: dS, end: dE, replacement, name: e.name, kind });
}

// Apply per file, descending
let total = 0;
for (const [file, edits] of byFile) {
  const sf = project.getSourceFile(file)!;
  const text = sf.getFullText();
  let newText = text;
  for (const ed of [...edits].sort((a, b) => b.start - a.start)) {
    newText = newText.slice(0, ed.start) + ed.replacement + newText.slice(ed.end);
    total++;
  }
  sf.replaceWithText(newText);
}

await project.save();
console.log(`edits applied: ${total} (hooks kept: ${hookKept}, statements removed: ${stmtRemoved}, decl removed: ${declRemoved})`);
if (skipped.length) {
  console.log('--- skipped ---');
  for (const s of skipped) console.log(' ', s);
}
