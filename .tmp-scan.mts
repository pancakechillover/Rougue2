import { readFileSync } from 'node:fs';
import { Project, SyntaxKind } from 'ts-morph';

const tscOut = readFileSync(process.argv[2], 'utf8');
const errors = [...tscOut.matchAll(/^(.+?)\((\d+),(\d+)\): error TS6133: '([^']+)'/gm)].map(
  ([, file, line, col, name]) => ({
    file: file.replace(/\\/g, '/'),
    line: Number(line),
    col: Number(col),
    name,
  })
);

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
const lines: string[] = [];

for (const e of errors) {
  const sf = project.getSourceFile(e.file);
  if (!sf) { lines.push(`${e.file}:${e.line} ?? missing`); continue; }
  const raw = sf.getFullText().split('\n')[e.line - 1] ?? '';
  const trimmed = raw.trim();

  let kind = 'other';
  if (/^import\s/.test(trimmed)) kind = 'IMPORT';
  else if (/^const\s/.test(trimmed) && /=\s*(useMemo|useCallback|useRef|useEffect|useState)\(/.test(raw)) kind = 'HOOK';
  else if (/^const\s/.test(trimmed) && /=>\s*[{(]/.test(raw)) kind = 'ARROW_DEF';
  else if (/^let\s/.test(trimmed)) kind = 'LET';
  else if (/^const\s/.test(trimmed)) kind = 'CONST_OTHER';
  else if (/^[a-z_$]/i.test(trimmed) && /=$/.test(trimmed)) kind = 'ASSIGN_CONT';
  else if (/^type\s/.test(trimmed) || /^interface\s/.test(trimmed)) kind = 'TYPE';

  lines.push(`${kind.padEnd(11)} ${e.file}:${e.line}:${e.col} '${e.name}' | ${trimmed.slice(0, 70)}`);
}

console.log(lines.join('\n'));
