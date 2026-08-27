import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, HelpCircle, Zap, Star, Coins, Scroll } from 'lucide-react';
import { AppState } from '../types';

import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';

interface LevelUpModalProps {
  levels: number[] | null;
  onClose: () => void;
  state: AppState;
  openGuideBook: (chapter: number) => void;
  isTalentLevel: (lvl: number) => boolean;
  getNextTalentLevel: (lvl: number, rewards?: any[]) => number;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  levels,
  onClose,
  state,
  openGuideBook,
  isTalentLevel,
  getNextTalentLevel
}) => {
  useScrollLock(!!levels && levels.length > 0);
  const currentLevelUp = levels?.[0];

  if (!levels || !currentLevelUp) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm border-0 m-0">
        <motion.div
          key={currentLevelUp}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          className="bg-slate-900 w-full max-w-md rounded-3xl border border-indigo-500/30 overflow-hidden text-center relative"
        >
          <div className="p-8 bg-gradient-to-b from-indigo-500/10 to-transparent">
            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="text-indigo-400 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-50 mb-2">Level Up!</h2>
            <p className="text-indigo-400 font-bold text-xl mb-6">You reached Level {currentLevelUp}</p>
            
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Rewards</h3>
                <button 
                  onClick={() => { onClose(); openGuideBook(6); }}
                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 flex items-center gap-1 uppercase tracking-widest transition-colors"
                >
                  <HelpCircle size={12} />
                  How to get XP
                </button>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 text-lg font-bold text-white">
                {state.levelRewards?.find(r => r.level === currentLevelUp) ? (
                  <div className="w-full space-y-3">
                    {(() => {
                      const reward = state.levelRewards.find(r => r.level === currentLevelUp);
                      const subRewards = reward.rewards && reward.rewards.length > 0
                        ? reward.rewards
                        : [{ type: reward.type, amount: reward.amount, rewardText: reward.rewardText }];

                      return (
                        <div className="space-y-4">
                          {subRewards.map((sub: any, idx: number) => {
                            if (sub.type === 'text') {
                              return (
                                <div key={idx} className="flex flex-col items-center gap-2 py-1">
                                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                    <Scroll className="text-emerald-400" size={20} />
                                  </div>
                                  <span className="text-base font-black text-slate-50 text-center leading-tight">
                                    {sub.rewardText}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div key={idx} className="flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center justify-center gap-2 text-base font-bold text-white">
                                  {sub.type === 'talentPoint' && <Scroll size={20} className="text-emerald-400" />}
                                  {sub.type === 'coins' && <Coins size={20} className="text-amber-400" />}
                                  <span>+{sub.amount} {sub.type === 'talentPoint' ? 'Talent Scroll' : 'Gold'}</span>
                                </div>
                                {sub.type === 'talentPoint' && (
                                  <p className="text-[10px] text-slate-500">Check the Talents tab to spend it!</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    {isTalentLevel(currentLevelUp) ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Scroll size={20} className="text-emerald-400" />
                          <span>+1 Talent Scroll</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Check the Talents tab to spend it!</p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-slate-500 text-sm">No specific reward for this level</span>
                        <span className="text-indigo-400/80 text-xs font-medium">
                          Next Talent Scroll in {getNextTalentLevel(currentLevelUp, state.levelRewards) - currentLevelUp} level(s)
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all"
            >
              {levels.length > 1 ? `Next Level (${levels.length - 1} more)` : 'Claim Rewards'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
