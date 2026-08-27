import fs from 'fs';

let content = fs.readFileSync('src/hooks/useGameState.ts', 'utf8');

const regexCompleteSessionBody = /    if \(dungeonId\) \{\s*setDungeons\([^]*?return session;\s*\}, \[/g;

content = content.replace(regexCompleteSessionBody, (match) => {
  return `    if (dungeonId) {
      let justCompletedDungeon: any = null;
      let justCompletedMajorDungeon: any = null;

      const nextDungeons = dungeons.map(d => {
        if (d.id === dungeonId) {
          const actualDuration = sessionDurationVal;
          const newCompleted = d.completedSessions + addedProgress;
          const newTotalFocusTime = (d.totalFocusTime || 0) + actualDuration;

          if (!d.isOpenEnded && newCompleted >= d.totalSessions && d.status !== 'completed') {
            const updatedDungeon = { 
              ...d, 
              completedSessions: newCompleted, 
              totalFocusTime: newTotalFocusTime, 
              status: 'completed' as const, 
              completedAt: getNow().toISOString() 
            };
            justCompletedDungeon = updatedDungeon;
            return updatedDungeon;
          }
          return { ...d, completedSessions: newCompleted, totalFocusTime: newTotalFocusTime };
        }
        return d;
      });

      if (justCompletedDungeon) {
        const d = justCompletedDungeon;
        
        // Dungeon completed rewards
        const allRewards: DungeonReward[] = [];
        if (d.rewardXP > 0) allRewards.push({ type: 'xp', amount: d.rewardXP });
        if (d.rewardCoins > 0) allRewards.push({ type: 'coins', amount: d.rewardCoins });
        if (d.rewards) allRewards.push(...d.rewards);

        let addedTalentPoints = 0;
        
        // Process rewards outside setState
        allRewards.forEach((reward: DungeonReward) => {
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

        // Check for Major Dungeon completion
        if (d.parentId) {
          const major = majorDungeons.find(m => m.id === d.parentId);
          const otherSubs = nextDungeons.filter(sd => sd.parentId === d.parentId && sd.id !== d.id);
          const allOtherCompleted = otherSubs.every(sd => sd.status === 'completed');
          
          if (allOtherCompleted && major?.isFinalized && major.status !== 'completed') {
            justCompletedMajorDungeon = major;
          }
          
          if (justCompletedMajorDungeon) {
             const nextMajors = majorDungeons.map(m => m.id === d.parentId ? { ...m, status: 'completed' as const, completedAt: getNow().toISOString() } : m);
             setMajorDungeons(nextMajors);
             
             let majorAddedTalentPoints = 0;
             if (justCompletedMajorDungeon.rewards) {
               justCompletedMajorDungeon.rewards.forEach((reward: DungeonReward) => {
                 if (reward.type === 'talentPoint') majorAddedTalentPoints += (reward.amount || 0);
                 
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
                 talentPoints: s.talentPoints + majorAddedTalentPoints,
                 lastCompletionRewards: {
                   dungeonName: justCompletedMajorDungeon.name,
                   type: 'dungeon',
                   rewards: justCompletedMajorDungeon.rewards || []
                 }
               }));
             }
          }
        }
      }
      setDungeons(nextDungeons);
    }

    // Broadcast focus session to Guild Team
    if (state.teamId && state.secretCode) {
      const finalDuration = Math.max(1, Math.round(sessionDurationVal));
      fetch('/api/teams?action=event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-code': state.secretCode || '',
          'x-user-name': encodeURIComponent(state.userName || 'Scholar'),
          'x-user-avatar': state.userAvatar || 'User',
          'x-user-level': String(state.level || 1),
          'x-user-unique-id': state.userUniqueId || ''
        },
        body: JSON.stringify({
          teamId: state.teamId,
          type: 'focus',
          duration: finalDuration,
          userUniqueId: state.userUniqueId,
          content: \`\${state.userName || 'Scholar'} just finished a \${finalDuration}m focus session.\`
        })
      }).catch(console.error);
    }

    return session;
  }, [dungeons, majorDungeons, setState, addXP, `;
});

const regexForceComplete = /const forceCompleteSubDungeon = useCallback\(\(dungeonId: string\) => \{[^]*?setState\(s => \(\{\s*\.\.\.s,\s*lastCompletionRewards:[^]*?\}\)\);\s*\}\s*\}\s*\}\s*return prevMajors;\s*\}\);\s*\}\s*return nextDungeons;\s*\}\);\s*\}, \[\]\);/g;

content = content.replace(regexForceComplete, `const forceCompleteSubDungeon = useCallback((dungeonId: string) => {
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
          major.rewards.forEach(reward => {
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
  }, [dungeons, majorDungeons, setState, addRewardToHistory, getNow]);`);

fs.writeFileSync('src/hooks/useGameState.ts', content);
