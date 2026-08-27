import fs from 'fs';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace ternary string literals: isDarkTheme ? "A" : "B" => "A"
  // Handles simple double-quote literals
  content = content.replace(/isDarkTheme \? ("[^"]*") : "[^"]*"/g, '$1');
  
  // Handle empty string A: isDarkTheme ? "" : "B" => ""
  content = content.replace(/isDarkTheme \? ("") : "[^"]*"/g, '$1');

  // Handle template literals if any: isDarkTheme ? `A` : `B` 
  content = content.replace(/isDarkTheme \? (`[^`]*`) : `[^`]*`/g, '$1');

  // Handle complex nested paren cases if needed
  // e.g. isDarkTheme ? "text-indigo-400 group-hover:text-slate-400" : "text-indigo-600..."
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
}

fixFile('src/components/DashboardView.tsx');
fixFile('src/components/settings/SageSettingsSection.tsx');
fixFile('src/components/dashboard/SageLoadingTimer.tsx');
