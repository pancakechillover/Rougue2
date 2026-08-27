import { RewardCard, StudySession } from '../types';

interface GenerationContext {
  rewardPool: RewardCard[];
  activeTalents: string[];
  pendingRewardChest?: { session: StudySession; choices: RewardCard[] }[];
  standardSessionMinutes?: number;
}

export function generateRewardChoicesForSession(
  session: StudySession,
  ctx: GenerationContext,
  existingChoicesList: { session: StudySession; choices: RewardCard[] }[] = []
): { session: StudySession; choices: RewardCard[] }[] {
  const actualDur = session.focusDuration || session.duration;
  let drawCount = Math.max(1, Math.floor(actualDur / (ctx.standardSessionMinutes || 25)));

  const now = Date.now();
  const choicesList = [...existingChoicesList];
  const count = ctx.activeTalents.includes('c1') ? 4 : 3; // Extra Chance

  for (let d = 0; d < drawCount; d++) {
    const pseudoSession = d === 0 ? session : { ...session, id: `${session.id}-${d}` };
    const choices: RewardCard[] = [];
    
    // Re-evaluate pool for each chest to account for limits
    const selectedPool = (ctx.rewardPool || []).filter(card => {
      if (card.limitCount && card.limitPeriodDays) {
        const periodMs = card.limitPeriodDays * 24 * 60 * 60 * 1000;
        const claimsInPeriod = (card.claimHistory || []).filter(ts => (now - new Date(ts).getTime()) < periodMs).length;
        
        let pendingOccurrences = 0;
        if (ctx.pendingRewardChest) {
          for (const chest of ctx.pendingRewardChest) {
            // Do not count the choices from the chest we are currently generating/rerolling for
            if (chest.session.id !== pseudoSession.id) {
              if (chest.choices.some(c => c.name === card.name)) pendingOccurrences++;
            }
          }
        }
        
        let drawnOccurrences = 0;
        for (const currentChest of choicesList) {
          if (currentChest.choices.some(c => c.name === card.name)) drawnOccurrences++;
        }
        
        return (claimsInPeriod + pendingOccurrences + drawnOccurrences) < card.limitCount;
      }
      return true;
    });

    const poolSize = selectedPool.length;
    const itemsToDraw = Math.min(count, poolSize);
    for (let i = 0; i < itemsToDraw; i++) {
      const totalWeight = selectedPool.reduce((acc, r) => acc + r.weight, 0);
      let rand = Math.random() * totalWeight;
      for (let j = 0; j < selectedPool.length; j++) {
        rand -= selectedPool[j].weight;
        if (rand <= 0) {
          choices.push(selectedPool[j]);
          selectedPool.splice(j, 1);
          break;
        }
      }
    }
    choicesList.push({ session: pseudoSession, choices });
  }

  // Return the newly created choices (the ones added in this call)
  // Or just return the whole updated choices list if we pass an accumulator.
  // We'll just return the newly generated ones and the caller can append.
  return choicesList.slice(existingChoicesList.length);
}
