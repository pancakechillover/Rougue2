import fs from 'fs';

let content = fs.readFileSync('src/hooks/useGameState.ts', 'utf8');

const regex = /  \}, \[dungeons, majorDungeons, setState, addXP, addXP, addCoins, [A-Za-z0-9., \n]*\]\);/;

const match = content.match(regex);
if (match) {
  const newDeps = `  }, [
    dungeons, majorDungeons, setState, addXP, addCoins, getNow,
    state.activeTalents, state.dailySessions, state.streak, state.inventory, state.rewardPool,
    state.devModeEnabled, state.devBaseXP, state.devXpMode, state.devMinXP, state.devMaxXP, 
    state.devCoinMode, state.devBaseCoins, state.devMinCoins, state.devMaxCoins,
    state.devCritChance, state.devCritMultiplier, state.timezone, state.timeSettings,
    state.teamId, state.secretCode, state.userName, state.userAvatar, state.level,
    state.includeRestTimeInTasks, state.standardSessionMinutes, state.standardRestMinutes,
    state.doubleXpActive, state.doubleGoldActive, state.userUniqueId
  ]);`;

  content = content.replace(regex, newDeps);
  fs.writeFileSync('src/hooks/useGameState.ts', content);
  console.log("Deps replaced.");
} else {
  console.log("No match found for deps.");
}
