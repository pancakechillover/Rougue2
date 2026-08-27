import fs from 'fs';

let content = fs.readFileSync('src/hooks/useGameState.ts', 'utf8');

const regexMoveDungeon = /  const moveDungeonItem = useCallback\(\(itemId: string, newParentId: string \| null\) => \{[\s\S]*?    \}\);\n  \}, \[\]\);/;

if(regexMoveDungeon.test(content)){
  const repStr = `  const moveDungeonItem = useCallback((itemId: string, newParentId: string | null) => {
    let isSubMovingToRoot = false;
    let newSubAsMajor: MajorDungeon | null = null;
    let isMajorMovingToSub = false;
    let newMajorAsSub: Dungeon | null = null;
    
    const isSub = dungeons.find(d => d.id === itemId);
    
    if (newParentId === null) {
      if (isSub) {
        isSubMovingToRoot = true;
        newSubAsMajor = {
          id: isSub.id,
          name: isSub.name,
          description: isSub.description || '',
          status: isSub.status,
          rewards: isSub.rewards,
          completedAt: isSub.completedAt,
        };
        setMajorDungeons(majorDungeons.filter(m => m.id !== itemId).concat(newSubAsMajor));
        setDungeons(dungeons.filter(d => d.id !== itemId));
        return;
      }
      return;
    }
    
    // Moving to a major dungeon
    if (isSub) {
      // It's already a sub, just change parent
      setDungeons(dungeons.map(d => d.id === itemId ? { ...d, parentId: newParentId } : d));
      return;
    } else {
       // It's a major moving to sub
       const isMajor = majorDungeons.find(m => m.id === itemId);
       if (isMajor) {
          isMajorMovingToSub = true;
          newMajorAsSub = {
            id: isMajor.id,
            name: isMajor.name,
            parentId: newParentId,
            totalSessions: 1,
            completedSessions: isMajor.status === 'completed' ? 1 : 0,
            status: isMajor.status,
            rewardXP: 0,
            rewardCoins: 0,
            rewards: isMajor.rewards,
            completedAt: isMajor.completedAt,
            rewardText: '',
            isLongTerm: false
          };
          
          setMajorDungeons(majorDungeons.filter(m => m.id !== itemId));
          setDungeons([...dungeons, newMajorAsSub]);
          return;
       }
    }
  }, [dungeons, majorDungeons]);`;
  content = content.replace(regexMoveDungeon, repStr);
  fs.writeFileSync('src/hooks/useGameState.ts', content);
  console.log("Success moveDungeonItem");
} else {
  console.log("moveDungeonItem regex not found");
}
