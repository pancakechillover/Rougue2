import fs from 'fs';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // isDarkTheme with parens
  content = content.replace(/\(isDarkTheme \? ("[^\"]*") : "[^\"]*"\)/g, '$1');

  // isDarkTheme multiline
  content = content.replace(/isDarkTheme\s*\n?\s*\?\s*("[^\"]*")\s*\n?\s*:\s*("[^\"]*")/g, '$1');

  // isDarkTheme \?\s*\n?\s*("[^\"]*")\s*\n?\s*:\s*cn\([^)]*\)\s*
  // This is too complex for simple regex.

  fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('src/components/DashboardView.tsx');
fixFile('src/components/settings/SageSettingsSection.tsx');
fixFile('src/components/dashboard/SageLoadingTimer.tsx');
