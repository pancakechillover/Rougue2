import fs from 'fs';

let content = fs.readFileSync('src/hooks/useGameState.ts', 'utf8');

// 1. finalizeMajorDungeon
const finalizeRegex = /const finalizeMajorDungeon = useCallback\(\(id: string\) => \{[\s\S]*?\}, \[dungeons, addCoins, addXP, addRewardToHistory\]\);/g;

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

// 2. forceCompleteSubDungeon
const forceCompleteRegex = /const forceCompleteSubDungeon = useCallback\(\(dungeonId: string\) => \{[\s\S]*?setState\(s => \(\{\s*\.\.\.s,\s*lastCompletionRewards: \{\s*dungeonName: major\.name,\s*type: 'dungeon',\s*rewards: major\.rewards \|\| \[\]\s*\}\s*\}\)\);\s*\}\s*\}\s*\}\s*return prevMajors;\s*\}\);\s*\}\s*return nextDungeons;\s*\}\);\s*\}, \[\]\);/g;

// Wait, the regex might be brittle. I'll read and do simple replacements.
fs.writeFileSync('src/hooks/useGameState.ts', content);
