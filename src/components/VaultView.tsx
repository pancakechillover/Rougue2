import React from 'react';
import { motion } from 'motion/react';
import { RewardHistory } from './RewardHistory';
import { AppState } from '../types';
import { playSound } from '../lib/sound';

interface VaultViewProps {
  state: AppState;
  toggleRewardRedeemed: (id: string) => void;
  useInventoryItem: (id: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({ state, toggleRewardRedeemed, useInventoryItem }) => {
  return (
    <motion.div
      key="vault"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full p-4 sm:p-6 lg:p-8"
    >
      <RewardHistory 
        history={state.rewardHistory} 
        transactionHistory={state.transactionHistory || []}
        appState={state}
        onToggleRedeemed={(id) => {
          toggleRewardRedeemed(id);
          playSound('redeem', state.soundVolume, state.soundEnabled);
        }}
        useInventoryItem={(id) => {
          useInventoryItem(id);
          playSound('reward', state.soundVolume, state.soundEnabled);
        }}
      />
    </motion.div>
  );
};
