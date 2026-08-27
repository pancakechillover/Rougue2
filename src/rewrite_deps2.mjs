import fs from 'fs';

let content = fs.readFileSync('src/hooks/useGameState.ts', 'utf8');

const regex = /addRewardToHistory \= useCallback\(\(reward: Omit<RewardHistoryItem, 'id' \| 'timestamp' \| 'redeemed'>, linkToSessionId\?: string\) => \{[\s\S]*?\}\);\n  \}, \[\]\);/;

if (regex.test(content)) {
  content = content.replace(regex, (match) => {
    return match.replace("}, []);", "}, [getNow]);");
  });
  fs.writeFileSync('src/hooks/useGameState.ts', content);
  console.log("Replaced addRewardToHistory deps");
} else {
  console.log("Not found addRewardToHistory deps");
}
