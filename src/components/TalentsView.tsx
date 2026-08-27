import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TalentTree } from './TalentTree';
import { AppState } from '../types';
import { TALENTS } from '../constants';

interface TalentsViewProps {
  state: AppState;
  unlockTalent: (id: string, cost: number) => void;
  toggleTalent: (id: string) => void;
  openGuideBook?: (chapter: number) => void;
}

export const TalentsView: React.FC<TalentsViewProps> = ({ state, unlockTalent, toggleTalent, openGuideBook }) => {
  const dynamicTalents = useMemo(() => {
    return TALENTS.map(t => {
      if (t.id === 'c3') {
        const chance = state.devModeEnabled ? (state.devCritChance ?? 0.05) : 0.05;
        const mult = state.devModeEnabled ? (state.devCritMultiplier ?? 5) : 5;
        
        // Format chance: 5% or 5.5%
        const chancePercent = chance * 100;
        const chanceStr = chancePercent % 1 === 0 ? chancePercent.toString() : chancePercent.toFixed(1);
        
        // Format multiplier: 5x or 5.5x
        const multStr = mult % 1 === 0 ? mult.toString() : mult.toFixed(1);

        return {
          ...t,
          description: `${chanceStr}% chance for ${multStr}x coins`
        };
      }
      return t;
    });
  }, [state.devModeEnabled, state.devCritChance, state.devCritMultiplier]);

  return (
    <motion.div
      key="talents"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full p-4 sm:p-6 lg:p-8"
    >
      <TalentTree 
        points={state.talentPoints}
        shards={state.talentShards}
        unlockedIds={state.unlockedTalents}
        activeIds={state.activeTalents}
        onUnlock={unlockTalent}
        onToggle={toggleTalent}
        talents={dynamicTalents}
        openGuideBook={openGuideBook}
      />
    </motion.div>
  );
};
