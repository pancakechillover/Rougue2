import fs from 'fs';

let content = fs.readFileSync('src/hooks/useGameState.ts', 'utf8');

// 1. finalizeMajorDungeon
const finalizeRegex = /const finalizeMajorDungeon = useCallback\(\(id: string\) => \{[\s\S]*?\}, \[dungeons, addCoins, addXP, addRewardToHistory\]\);/;

if(finalizeRegex.test(content)){
  content = content.replace(finalizeRegex, `const finalizeMajorDungeon = useCallback((id: string) => {
    const major = majorDungeons.find(m => m.id === id);
    if (!major || major.isFinalized) return;
    
    // Check if it should be completed immediately
    const subs = dungeons.filter(d => d.parentId === id);
    const allCompleted = subs.length > 0 && subs.every(d => d.status === 'completed');

    setMajorDungeons(prevMajors => {
      const updatedMajors = prevMajors.map(m => m.id === id ? { ...m, isFinalized: true } : m);
      if (allCompleted) {
        return updatedMajors.map(m => m.id === id ? { ...m, status: 'completed', completedAt: getNow().toISOString() } : m);
      }
      return updatedMajors;
    });

    if (allCompleted && major.rewards && major.status !== 'completed') {
      // Trigger side-effects outside of updater
      let addedTalentPoints = 0;
      major.rewards.forEach(reward => {
        if (reward.type === 'talentPoint') addedTalentPoints += (reward.amount || 0);
        
        addRewardToHistory({
          name: reward.type === 'text' ? (reward.rewardText || 'Dungeon Goal Reward') : 
                reward.type === 'talentPoint' ? \`+\${reward.amount} Talent Scrolls\` :
                reward.type === 'coins' ? \`+\${reward.amount} Gold Coins\` :
                reward.type === 'xp' ? \`+\${reward.amount} Experience\` :
                (reward.itemName || 'Item'),
          rarity: 'rare',
          source: 'Explore',
          note: 'Dungeon Goal Reward',
          type: reward.type === 'text' ? 'text' : (reward.type === 'coins' ? 'coins' : (reward.type === 'xp' ? 'xp' : 'item')),
          amount: reward.amount,
          itemType: reward.itemType
        });
      });

      setState(s => ({
        ...s,
        talentPoints: s.talentPoints + addedTalentPoints,
        lastCompletionRewards: {
          dungeonName: major.name,
          type: 'dungeon',
          rewards: major.rewards || []
        }
      }));
    }
  }, [dungeons, majorDungeons, addRewardToHistory, getNow, setState]);`);

  fs.writeFileSync('src/hooks/useGameState.ts', content);
  console.log("Success finalizeMajor");
} else {
  console.log("Regex not found");
}

