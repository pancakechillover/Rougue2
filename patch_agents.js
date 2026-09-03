const fs = require('fs');
let content = fs.readFileSync('AGENTS.md', 'utf8');
const newLog = `- **v9.0.97 (2026-09-02):** Efficiency Formula Display Optimization
  - *Unified Formula Syntax Coloring (\`EfficiencyDetailsModal.tsx\`):* Added rigorous, color-coded variable highlighting (\`text-emerald-400\` for Efficiency, \`text-indigo-400\` for Completion Rate, \`text-sky-400\` for Focus Degree) across all steps of the Active Mathematical Formula to visually link parameters with their calculated outputs.
  - *Formula Accuracy Correction:* Corrected a visual math typo where the formula mistakenly displayed \`Completion Rate × (70% + 30% × Focus Degree)\`, updating it to accurately reflect the true weighted codebase formula: \`(Completion Rate × 70%) + (Focus Degree × 30%)\`.
  - *Removed Stale Rounding Text:* Stripped the \`(Rounded to 0.5★)\` sub-text from the Star Rating formula, reflecting the recent underlying high-precision tracking logic update.

`;
content = content.replace('## Task History\n\n', '## Task History\n\n' + newLog);
fs.writeFileSync('AGENTS.md', content);
