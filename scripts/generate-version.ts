import fs from 'fs';
import path from 'path';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../src/version.ts';

const outData = {
  version: APP_VERSION,
  date: LAST_UPDATE_DATE,
  latestRelease: RELEASE_HISTORY[0] || null,
  timestamp: Date.now()
};

const outPath = path.join(process.cwd(), 'public', 'version.json');
fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));
console.log(`Generated public/version.json for version ${APP_VERSION}`);
