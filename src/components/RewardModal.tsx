import React from 'react';
import { motion } from 'motion/react';
import { RewardCard, Rarity } from '../types';
import { cn } from '../lib/utils';
import * as LucideIcons from 'lucide-react';
import { Coins, Zap, Sparkles, Trophy, Gift } from 'lucide-react';

interface RewardModalProps {
  coins: number;
  xp: number;
  choices: RewardCard[];
  onSelect: (card: RewardCard) => void;
}

const rarityColors: Record<Rarity, string> = {
  common: 'from-slate-400 to-slate-600 border-slate-400',
  uncommon: 'from-emerald-400 to-emerald-600 border-emerald-400',
  rare: 'from-blue-400 to-blue-600 border-blue-400',
  epic: 'from-purple-400 to-purple-600 border-purple-400',
  legendary: 'from-amber-400 to-amber-600 border-amber-400',
  mythic: 'from-rose-400 to-rose-600 border-rose-400',
};

import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';

interface RewardModalProps {
  coins: number;
  xp: number;
  choices: RewardCard[];
  onSelect: (card: RewardCard) => void;
}

export const RewardModal: React.FC<RewardModalProps> = ({ coins, xp, choices, onSelect }) => {
  useScrollLock(true);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md border-0 m-0">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-4xl w-full bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative"
      >
        <div className="p-8 text-center border-b border-slate-800">
          <motion.h2 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-4xl font-bold text-white mb-2"
          >
            Victory!
          </motion.h2>
          <p className="text-slate-400">You have cleared the room. Claim your spoils.</p>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/50">
          <div className="flex items-center justify-center space-x-4 p-6 bg-slate-900 rounded-2xl border border-indigo-500/30">
            <div className="p-3 bg-amber-500/20 rounded-full">
              <Coins className="text-amber-500" size={32} />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">+{coins}</div>
              <div className="text-slate-400 text-sm">Gold Coins</div>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-4 p-6 bg-slate-900 rounded-2xl border border-indigo-500/30">
            <div className="p-3 bg-indigo-500/20 rounded-full">
              <Zap className="text-indigo-500" size={32} />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">+{xp}</div>
              <div className="text-slate-400 text-sm">Experience</div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">Choose Your Reward</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {choices.map((card, idx) => (
              <motion.button
                key={card.id}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(card)}
                className={cn(
                  "relative group flex flex-col items-center p-6 rounded-2xl border-2 transition-all text-left h-full",
                  rarityColors[card.rarity],
                  "bg-gradient-to-br hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                )}
              >
                <div className="absolute top-2 right-2 opacity-50">
                  {card.rarity === 'mythic' && <LucideIcons.Crown size={16} />}
                  {card.rarity === 'legendary' && <Trophy size={16} />}
                  {card.rarity === 'epic' && <Sparkles size={16} />}
                  {card.rarity === 'rare' && <Gift size={16} />}
                  {card.rarity === 'uncommon' && <LucideIcons.Star size={16} />}
                </div>
                
                <span className="text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">
                  {card.rarity}
                </span>

                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/10 group-hover:scale-110 transition-transform">
                  {(() => {
                    const IconComp = (card.icon && (LucideIcons as any)[card.icon]) ? (LucideIcons as any)[card.icon] : (card.type === 'coins' ? Coins : card.type === 'xp' ? Zap : Gift);
                    return <IconComp size={32} className="text-white" />;
                  })()}
                </div>
                
                <h4 className="text-lg font-bold text-white mb-2 leading-tight text-center">
                  {card.name}
                </h4>
                
                <p className="text-sm text-white/80 leading-snug">
                  {card.description}
                </p>

                <div className="mt-auto pt-4 w-full">
                  <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="h-full bg-white/60"
                    />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
