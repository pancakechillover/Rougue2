import fs from 'fs';

let content = fs.readFileSync('src/hooks/useGameState.ts', 'utf8');

const regex = /const forceCompleteSubDungeon = useCallback\(\(dungeonId: string\) => \{\s*setDungeons\(prevDungeons => \{[^]*?\}\);\s*\}, \[addRewardToHistory, getNow\]\);/;

const repStr = `const forceCompleteSubDungeon = useCallback((dungeonId: string) => {
    const dungeonIndex = dungeons.findIndex(d => d.id === dungeonId);
    if (dungeonIndex === -1) return;
    const d = dungeons[dungeonIndex];
    if (d.status === 'completed') return;

    let justCompletedMajorDungeon: any = null;
    const nextDungeons = [...dungeons];
    nextDungeons[dungeonIndex] = { ...d, status: 'completed' as const, completedAt: getNow().toISOString() };

    const allRewards: DungeonReward[] = [];
    if (d.rewardXP > 0) allRewards.push({ type: 'xp', amount: d.rewardXP });
    if (d.rewardCoins > 0) allRewards.push({ type: 'coins', amount: d.rewardCoins });
    if (d.rewards) allRewards.push(...d.rewards);

    let addedTalentPoints = 0;
    allRewards.forEach(reward => {
      if (reward.type === 'talentPoint') addedTalentPoints += (reward.amount || 0);
      
      addRewardToHistory({
        name: reward.type === 'text' ? (reward.rewardText || 'Dungeon Reward') : 
              reward.type === 'talentPoint' ? \`+\${reward.amount} Talent Scrolls\` :
              reward.type === 'coins' ? \`+\${reward.amount} Gold Coins\` :
              reward.type === 'xp' ? \`+\${reward.amount} Experience\` :
              (reward.itemName || 'Item'),
        rarity: 'common',
        source: 'Explore',
        note: 'Dungeon Reward',
        type: reward.type === 'text' ? 'text' : (reward.type === 'coins' ? 'coins' : (reward.type === 'xp' ? 'xp' : 'item')),
        amount: reward.amount,
        itemType: reward.itemType
      });
    });

    setState(s => ({
      ...s,
      talentPoints: s.talentPoints + addedTalentPoints,
      lastCompletionRewards: {
        dungeonName: d.name,
        type: 'dungeon',
        rewards: allRewards
      }
    }));

    if (d.parentId) {
      const major = majorDungeons.find(m => m.id === d.parentId);
      const otherSubs = nextDungeons.filter(sd => sd.parentId === d.parentId && sd.id !== d.id);
      const allOtherCompleted = otherSubs.every(sd => sd.status === 'completed');
      
      if (allOtherCompleted && major?.isFinalized && major.status !== 'completed') {
        justCompletedMajorDungeon = major;
      }
      
      if (justCompletedMajorDungeon) {
        setMajorDungeons(majorDungeons.map(m => m.id === d.parentId ? { ...m, status: 'completed' as const, completedAt: getNow().toISOString() } : m));
        
        let majorAddedTalentPoints = 0;
        if (major.rewards) {
          major.rewards.forEach((reward: DungeonReward) => {
            if (reward.type === 'talentPoint') majorAddedTalentPoints += (reward.amount || 0);
            
            addRewardToHistory({
              name: reward.type === 'text' ? (reward.rewardText || 'Major Reward') : 
                    reward.type === 'talentPoint' ? \`+\${reward.amount} Talent Scrolls\` :
                    reward.type === 'coins' ? \`+\${reward.amount} Gold Coins\` :
                    reward.type === 'xp' ? \`+\${reward.amount} Experience\` :
                    (reward.itemName || 'Item'),
              rarity: 'rare',
              source: 'Explore',
              note: 'Major Reward',
              type: reward.type === 'text' ? 'text' : (reward.type === 'coins' ? 'coins' : (reward.type === 'xp' ? 'xp' : 'item')),
              amount: reward.amount,
              itemType: reward.itemType
            });
          });

          setState(s => ({
            ...s,
            talentPoints: s.talentPoints + majorAddedTalentPoints,
            lastCompletionRewards: {
              dungeonName: major.name,
              type: 'dungeon',
              rewards: major.rewards || []
            }
          }));
        }
      }
    }

    setDungeons(nextDungeons);
  }, [dungeons, majorDungeons, setState, addRewardToHistory, getNow]);`;

if (regex.test(content)) {
  content = content.replace(regex, repStr);
  fs.writeFileSync('src/hooks/useGameState.ts', content);
  console.log("Success force regex");
} else {
  console.log("NOT FOUND!");
}
