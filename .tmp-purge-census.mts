/**
 * Read-only census: classify each TS6133 as
 *   shorthand  – destructuring shorthand `{ x }`          -> remove binding
 *   renamed    – destructuring with alias `{ x: y }`      -> remove binding
 *   varSafe    – `const x = <no side effects>`            -> remove statement
 *   varUnsafe  – `const x = fn()` (side effects)          -> keep call, drop binding
 *   param      – unused function parameter                -> prefix `_`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Project, SyntaxKind, Node } from 'ts-morph';

const tscOut = readFileSync(process.argv[2], 'utf8');
const errors = [...tscOut.matchAll(/^(.+?)\((\d+),(\d+)\): error TS6133: '([^']+)'/gm)].map(
  ([, file, line, col, name]) => ({
    file: file.replace(/\\/g, '/'),
    line: Number(line) - 1,
    col: Number(col) - 1,
    name,
  })
);

console.log(`entries: ${errors.length}`);

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

const census: Record<string, string[]> = { shorthand: [], renamed: [], varSafe: [], varUnsafe: [], param: [], unknown: [] };
const plan: Array<{ file: string; kind: string; start: number; end: number; replacement: string; name: string }> = [];

const SIDE_EFFECT_FREE = (t: string) =>
  !/[()]/.test(t) || /^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(t.trim()) === false && false;

const isSimpleExpr = (t: string) => {
  const s = t.trim();
  if (s === '') return true;
  if (/[()]/.test(s)) return false;         // any call or grouping
  if (/\bnew\b|\bawait\b/.test(s)) return false;
  return true;                               // literals, identifiers, member chains, arrays, template-free strings
};

for (const e of errors) {
  const sf = project.getSourceFile(e.file);
  if (!sf) { census.unknown.push(`${e.file} (missing)`); continue; }

  const text = sf.getText();
  const lineOffsets: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineOffsets.push(i + 1);

  const pos = (lineOffsets[e.line] ?? 0) + e.col;
  if (text.slice(pos, pos + e.name.length) !== e.name) { census.unknown.push(`${file_label(e)} mismatch`); continue; }

  const node = sf.getDescendantAtPos(pos);
  const id = node?.asKind?.(SyntaxKind.Identifier);
  if (!id) { census.unknown.push(`${file_label(e)} no-id`); continue; }

  // Walk up for binding element
  let cur: Node | undefined = id;
  while (cur && cur.getKind() !== SyntaxKind.BindingElement) cur = cur.getParent();
  if (cur && cur.getKind() === SyntaxKind.BindingElement) {
    const b = cur.asKindOrThrow(SyntaxKind.BindingElement);
    const propNode = b.getPropertyNameNode();
    if (!propNode) {
      // shorthand `{ x }`
      const start = b.getStart();
      const end = b.getEnd();
      let dS = start, dE = end;
      if (text[end] === ',') dE = end + 1;
      else if (text[start - 1] === ',') dS = start - 1;
      plan.push({ file: e.file, kind: 'shorthand', start: dS, end: dE, replacement: '', name: e.name });
      census.shorthand.push(`${file_label(e)}`);
    } else {
      // `{ x: y }` — remove the whole binding
      const start = b.getStart();
      const end = b.getEnd();
      let dS = start, dE = end;
      if (text[end] === ',') dE = end + 1;
      else if (text[start - 1] === ',') dS = start - 1;
      plan.push({ file: e.file, kind: 'renamed', start: dS, end: dE, replacement: '', name: e.name });
      census.renamed.push(`${file_label(e)}`);
    }
    continue;
  }

  // Variable declaration?
  let vcur: Node | undefined = id;
  while (vcur && vcur.getKind() !== SyntaxKind.VariableDeclaration) vcur = vcur.getParent();
  if (vcur && vcur.getKind() === SyntaxKind.VariableDeclaration) {
    const init = vcur.getInitializer();
    const nameNode = vcur.getNameNode();
    if (nameNode.getText() !== e.name) { census.unknown.push(`${file_label(e)} name-mismatch`); continue; }

    const stmtSafe = isSimpleExpr(init ? init.getText() : '');
    const vStart = vcur.getStart();
    const vEnd = vcur.getEnd();
    if (stmtSafe) {
      // remove whole `const x = ...` plus trailing `;` — replace with ''
      let dE = vEnd;
      if (text[vEnd] === ';') dE = vEnd + 1;
      plan.push({ file: e.file, kind: 'varSafe', start: vStart, end: dE, replacement: '', name: e.name });
      census.varSafe.push(`${file_label(e)}`);
    } else {
      // keep the side effects: `const x = expr;` -> `expr;`
      const initText = init ? init.getText().trim() : '';
      plan.push({ file: e.file, kind: 'varUnsafe', start: vStart, end: vEnd, replacement: initText, name: e.name });
      census.varUnsafe.push(`${file_label(e)}`);
    }
    continue;
  }

  // Parameter?
  let pcur: Node | undefined = id;
  while (pcur && pcur.getKind() !== SyntaxKind.Parameter) pcur = pcur.getParent();
  if (pcur && pcur.getKind() === SyntaxKind.Parameter) {
    plan.push({ file: e.file, kind: 'param', start: id.getStart(), end: id.getEnd(), replacement: `_${e.name}`, name: e.name });
    census.param.push(`${file_label(e)}`);
    continue;
  }

  census.unknown.push(`${file_label(e)} unclassified`);
}

function file_label(e: { file: string; line: number }) { return `${e.file}:${e.line + 1}`; }

console.log('--- census ---');
for (const k of Object.keys(census)) console.log(`${k}: ${census[k].length}`);
writeFileSync(process.argv[3] || '.tmp-purge-plan.json', JSON.stringify({ plan, census }, null, 2));
console.log('plan written');
