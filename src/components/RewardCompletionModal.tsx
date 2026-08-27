import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Coins, Zap, Star, Gift, MessageSquare, Scroll } from 'lucide-react';
import { DungeonReward } from '../types';

interface RewardCompletionModalProps {
  rewardData: {
    dungeonName: string;
    type: 'dungeon' | 'quest' | 'achievement';
    rewards: DungeonReward[];
  } | null;
  onClose: () => void;
  onNavigate: (tab: string, subTab?: 'list' | 'quests' | 'achievements') => void;
}

export const RewardCompletionModal: React.FC<RewardCompletionModalProps> = ({ rewardData, onClose, onNavigate }) => {
  if (!rewardData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="bg-slate-900 w-full max-w-md rounded-[40px] border-2 border-indigo-500/50 overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)] relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="p-8 text-center relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="w-24 h-24 bg-indigo-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-12">
                <Trophy size={48} className="text-white -rotate-12" />
              </div>
              <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">
                {rewardData.type === 'dungeon' ? 'Dungeon Cleared!' : 
                 rewardData.type === 'quest' ? 'Quest Completed!' : 
                 'Achievement Unlocked!'}
              </h2>
              <h3 className="text-3xl font-bold text-white tracking-tighter mb-8 italic pr-1">{rewardData.dungeonName}</h3>
            </motion.div>
            
            {rewardData.rewards.length > 0 ? (
              <div className="space-y-3 mb-10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rewards Acquired</p>
                <div className="grid grid-cols-1 gap-2">
                  {rewardData.rewards.map((reward, idx) => (
                    <motion.div key={idx} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 + idx * 0.1 }} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                          {reward.type === 'coins' ? <Coins size={16} /> : reward.type === 'xp' ? <Zap size={16} /> : reward.type === 'talentPoint' ? <Scroll size={16} className="text-emerald-400" /> : reward.type === 'text' ? <MessageSquare size={16} /> : <Gift size={16} />}
                        </div>
                        <span className="text-sm font-bold text-white">
                          {reward.type === 'text' ? reward.rewardText : reward.type === 'talentPoint' ? 'Talent Scrolls' : reward.type === 'coins' ? 'Gold Coins' : reward.type === 'xp' ? 'Experience' : (reward.itemName || 'Item')}
                        </span>
                      </div>
                      {reward.type !== 'text' && (
                        <span className="text-lg font-black text-indigo-400">+{reward.amount}</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-0">Spacer</p>
                <div className="py-4"></div>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button onClick={onClose} className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-400 transition-colors shadow-xl">
                {rewardData.type === 'dungeon' ? 'Claim Dungeon Rewards' : 
                 rewardData.type === 'quest' ? 'Claim Quest Rewards' : 
                 'Claim Achievement Rewards'}
              </button>
              <button 
                onClick={() => {
                  const subTab = rewardData.type === 'quest' ? 'quests' : (rewardData.type === 'achievement' ? 'achievements' : undefined);
                  onNavigate('dungeons', subTab);
                }} 
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
              >
                {rewardData.type === 'dungeon' ? 'Back to Dungeon' : 
                 rewardData.type === 'quest' ? 'View Quests' : 
                 'View Achievements'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
