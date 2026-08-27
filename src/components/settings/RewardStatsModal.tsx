import React from 'react';
import { motion } from 'motion/react';
import { X, Calculator, Coins, Zap } from 'lucide-react';
import { RewardCard } from '../../types';

export const RewardStatsModal = ({ pool, appState, onClose }: { pool: RewardCard[], appState: any, onClose: () => void }) => {
  const b1Active = appState?.activeTalents?.includes('b1'); // Alchemy
  const c3Active = appState?.activeTalents?.includes('c3'); // Critical Intuition
  const a1Active = appState?.activeTalents?.includes('a1'); // Mind Lubrication
  const c1Active = appState?.activeTalents?.includes('c1'); // Extra Chance
  const drawCount = c1Active ? 4 : 3;

  const critChance = appState?.devCritChance ?? 0.05;
  const critMult = appState?.devCritMultiplier ?? 5;

  const isRandomCoins = appState?.devCoinMode === 'random';
  const minBaseCoinsRaw = isRandomCoins ? (appState?.devMinCoins ?? 5) : (appState?.devBaseCoins ?? 10);
  const maxBaseCoinsRaw = isRandomCoins ? (appState?.devMaxCoins ?? 15) : (appState?.devBaseCoins ?? 10);
  const avgBaseCoinsRaw = (minBaseCoinsRaw + maxBaseCoinsRaw) / 2;

  const baseCoinsMin = Math.ceil(minBaseCoinsRaw * (b1Active ? 1.15 : 1));
  const baseCoinsMaxRaw = Math.ceil(maxBaseCoinsRaw * (b1Active ? 1.15 : 1));
  const baseCoinsMax = c3Active ? (baseCoinsMaxRaw * critMult) : baseCoinsMaxRaw;

  // Expected Value calculation combining base range, alchemy (*1.15), and critical intuition expected mult
  const expectedCritMult = c3Active ? (1 - critChance + critChance * critMult) : 1;
  const expectedBaseCoins = Math.ceil(avgBaseCoinsRaw * (b1Active ? 1.15 : 1)) * expectedCritMult;

  const totalWeight = pool.reduce((s, c) => s + (c.weight || 0), 0) || 1;
  let directCoinsAvg = 0;
  let bonusCoinsAvg = 0;
  let maxPoolDirectCoins = 0;
  let directXPAvg = 0;
  let bonusXPAvg = 0;

  // XP Calc
  const isRandomXP = appState?.devXpMode === 'random';
  const minBaseXPRaw = isRandomXP ? (appState?.devMinXP ?? 50) : (appState?.devBaseXP ?? 100);
  const maxBaseXPRaw = isRandomXP ? (appState?.devMaxXP ?? 150) : (appState?.devBaseXP ?? 100);
  const avgBaseXPRaw = (minBaseXPRaw + maxBaseXPRaw) / 2;
  const expectedBaseXP = avgBaseXPRaw * (a1Active ? 1.1 : 1);

  pool.forEach(c => {
    // 抽奖时实际上是不放回的连续抽奖3次或者4次（c1天赋）
    // 用 1 - (1 - w/W)^k 来估算该物品至少出现1次的概率 
    // 模型假定：由于玩家每次开箱只能选1个物品，如果遇到高价值物品玩家会优先选择它 (Auto-Pick Best logic)
    const exactDropRate = (c.weight || 0) / totalWeight;
    const appearProb = 1 - Math.pow(1 - exactDropRate, drawCount);

    if (c.type === 'coins' && c.amount) {
      directCoinsAvg += appearProb * c.amount;
      maxPoolDirectCoins = Math.max(maxPoolDirectCoins, c.amount);
    } else if (c.type === 'xp' && c.amount) {
      directXPAvg += appearProb * c.amount;
    } else if (c.type === 'item') {
      if (c.itemType === 'double_coin') {
        bonusCoinsAvg += appearProb * expectedBaseCoins;
      } else if (c.itemType === 'coin_bonus_percent' && c.amount) {
        bonusCoinsAvg += appearProb * (c.amount / 100) * expectedBaseCoins;
      } else if (c.itemType === 'double_xp') {
        bonusXPAvg += appearProb * expectedBaseXP;
      } else if (c.itemType === 'xp_bonus_percent' && c.amount) {
        bonusXPAvg += appearProb * (c.amount / 100) * expectedBaseXP;
      }
    }
  });

  const totalExpectedCoins = expectedBaseCoins + directCoinsAvg + bonusCoinsAvg;
  const totalExpectedXP = expectedBaseXP + directXPAvg + bonusXPAvg;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2 text-indigo-400">
            <Calculator size={18} />
            <h3 className="font-bold uppercase tracking-widest text-sm">Economy Expectation (Per Session)</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* Coins Expectation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Coins size={16} />
              <h4 className="font-black text-xs uppercase tracking-widest">Gold Coins Model</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Theoretical Range</div>
                <div className="text-xl font-mono text-white font-black">{baseCoinsMin} <span className="text-slate-500">~</span> {Math.floor(baseCoinsMax + maxPoolDirectCoins)}</div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="text-[10px] text-amber-500/70 font-bold uppercase mb-1">Average Expectation</div>
                <div className="text-xl font-mono text-amber-400 font-black">{totalExpectedCoins.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-3 text-xs font-mono text-slate-400 space-y-1">
              <div className="flex justify-between"><span>Base Calculation {b1Active?'(+15% Alchemy)':''} {c3Active?'(Crit Mode)':''}:</span> <span className="text-white">{expectedBaseCoins.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Pool Direct Drops:</span> <span className="text-white">+{directCoinsAvg.toFixed(2)}</span></div>
              <div className="flex justify-between border-b border-slate-800 pb-1 mb-1"><span>Pool Item Multipliers:</span> <span className="text-white">+{bonusCoinsAvg.toFixed(2)}</span></div>
              <div className="flex justify-between text-amber-400 font-bold pt-1"><span>Total Expected = </span> <span>{totalExpectedCoins.toFixed(2)}</span></div>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-2">
              * The chest drops {drawCount} items per session ({c1Active ? 'c1 Extra Chance Talent active' : 'base'}).
              <br/>
              * Probability of appearing: <span className="font-mono">1 - (1 - Weight/TotalWeight)^{drawCount}</span>. The expected value assumes optimal selection (Auto-Pick Best) when a high-value item appears.
            </p>
          </div>

          {/* XP Expectation */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <Zap size={16} />
              <h4 className="font-black text-xs uppercase tracking-widest">Experience (XP) Model</h4>
            </div>
            
            <div className="flex bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden text-center divide-x divide-slate-700/50">
              <div className="flex-1 p-3">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Base Expectation</div>
                <div className="text-lg font-mono text-white font-black">{expectedBaseXP.toFixed(1)}</div>
              </div>
              <div className="flex-1 p-3 bg-emerald-500/10 border-emerald-500/20">
                <div className="text-[10px] text-emerald-500/70 font-bold uppercase mb-1">Total Expectation</div>
                <div className="text-lg font-mono text-emerald-400 font-black">{totalExpectedXP.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-3 text-xs font-mono text-slate-400 space-y-1">
              <div className="flex justify-between"><span>Base Engine {a1Active?'+10% (Mind Lubrication)':''}:</span> <span className="text-white">{expectedBaseXP.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Pool Direct Drops:</span> <span className="text-white">+{directXPAvg.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Pool Item Multipliers:</span> <span className="text-white">+{bonusXPAvg.toFixed(2)}</span></div>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-2">Expected total XP per session incorporating the {drawCount}-draw appearance probability and the mathematical value of double XP / percentage bonus scrolls.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
