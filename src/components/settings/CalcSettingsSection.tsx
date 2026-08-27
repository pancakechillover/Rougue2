import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, Zap, Clock, Coins, Ticket, Sparkles, Target, AlertTriangle, HelpCircle, Info, ChevronDown, Check } from 'lucide-react';
import { AppState } from '../../types';
import { cn, getXPForLevel } from '../../lib/utils';
import { AnimatePresence } from 'motion/react';

interface CalcSettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const CalcSettingsSection: React.FC<CalcSettingsProps> = ({ state, setState }) => {
  // Basic Calculator State
  const [focusInput, setFocusInput] = useState(25);
  const [restInput, setRestInput] = useState(5);
  const [sessionsPerDay, setSessionsPerDay] = useState(8);
  const [showIncomeHelp, setShowIncomeHelp] = useState(false);
  const [showProgressionHelp, setShowProgressionHelp] = useState(false);
  const [showSpendingHelp, setShowSpendingHelp] = useState(false);
  const [targetItemId, setTargetItemId] = useState<string | null>(null);

  const calculateSessionYield = () => {
    // Session Reward Settings logic
    let baseXP = 100;
    let baseCoins = 10; // average of random 5-15

    if (state.devModeEnabled) {
      if (state.devXpMode === 'random') {
        const minXP = state.devMinXP ?? 50;
        const maxXP = state.devMaxXP ?? 150;
        baseXP = Math.floor((minXP + maxXP) / 2);
      } else {
        baseXP = state.devBaseXP ?? 100;
      }
      if (state.devCoinMode === 'fixed') {
        baseCoins = state.devBaseCoins ?? 10;
      } else {
        const min = state.devMinCoins ?? 5;
        const max = state.devMaxCoins ?? 15;
        baseCoins = Math.floor((min + max) / 2);
      }
    }

    // Evaluate active talents for average baseline session
    if (state.activeTalents.includes('a1')) baseXP = Math.floor(baseXP * 1.1);
    if (state.activeTalents.includes('b1')) baseCoins *= 1.15;

    const critChance = state.devModeEnabled ? (state.devCritChance ?? 0.05) : 0.05;
    const critMult = state.devModeEnabled ? (state.devCritMultiplier ?? 5) : 5;
    
    // Calculate expected coins including crit probability
    let avgCoins = baseCoins;
    if (state.activeTalents.includes('c3')) {
      avgCoins = baseCoins * (1 - critChance) + (baseCoins * critMult) * critChance;
    }

    // Calculate daily yields based on sessionsPerDay
    let dailyXP = baseXP * sessionsPerDay;
    let dailyCoins = avgCoins * sessionsPerDay;

    // Apply strict daily occurrences (streak/16th)
    const simulatedMinutes = sessionsPerDay * (state.standardSessionMinutes || 25);
    if (simulatedMinutes >= 240) {
      // Assuming a moderate streak for simulation (e.g., streak = 2)
      if (state.activeTalents.includes('a3')) dailyXP += (20 * 2); 
      if (state.activeTalents.includes('b3')) dailyCoins += (10 * 2);
    }
    if (simulatedMinutes >= 480) {
      if (state.activeTalents.includes('a2')) dailyXP += 200;
      if (state.activeTalents.includes('b2')) dailyCoins += 50;
    }

    // Convert total daily expected session coin to single session average
    const expectedSessionCoins = sessionsPerDay > 0 ? dailyCoins / sessionsPerDay : 0;
    const expectedSessionXP = sessionsPerDay > 0 ? dailyXP / sessionsPerDay : 0;

    // Evaluate Talent point output roughly (talent shards not typically farmed from flat sessions without specific quests or rewards pool limits, but from reward pool drop rates)
    const validPool = state.rewardPool || [];
    const totalWeight = validPool.reduce((acc, r) => acc + r.weight, 0);
    const shardWeight = validPool.filter(r => r.itemType === 'talent_shard').reduce((acc, r) => acc + r.weight, 0);
    const chancePerChoice = totalWeight > 0 ? shardWeight / totalWeight : 0;
    
    // Typically 3 choices are presented. 
    // Probability of seeing at least 1 talent shard in 3 choices = 1 - (1 - chance)^3
    // Then they need 10 shards to make 1 talent point.
    const chanceToSeeShard = 1 - Math.pow(1 - chancePerChoice, 3);
    const expectedShardsPerSession = chanceToSeeShard; 
    
    let expectedDailyShards = expectedShardsPerSession * sessionsPerDay;

    return { 
      sessionXP: Math.floor(expectedSessionXP), 
      sessionCoins: Math.floor(expectedSessionCoins), 
      chanceToSeeShard,
      dailyXP: Math.floor(dailyXP), 
      dailyCoins: Math.floor(dailyCoins),
      dailyShards: expectedDailyShards
    };
  };

  const getShopStats = (dailyCoins: number, sessionCoins: number) => {
    // Exclude infinite stock for total calculation, just base it on bounded fixed items
    const totalShopCost = state.shopItems.filter(i => i.stock !== -1).reduce((acc, item) => acc + (item.price * (item.stock || 1)), 0);
    const shopSessions = sessionCoins > 0 ? Math.ceil(totalShopCost / sessionCoins) : 0;
    const shopDays = dailyCoins > 0 ? totalShopCost / dailyCoins : 0;

    // Targeted Item
    const targetItem = state.shopItems.find(i => i.id === targetItemId);
    const targetSessionReq = targetItem && sessionCoins > 0 ? Math.ceil(targetItem.price / sessionCoins) : 0;
    const targetDayReq = targetItem && dailyCoins > 0 ? targetItem.price / dailyCoins : 0;

    const gachaCost = state.gachaPools.find(p => p.type === 'gacha')?.cost || 0;
    const gachaSessions = sessionCoins > 0 && gachaCost > 0 ? Math.ceil(gachaCost / sessionCoins) : 0;
    const gachaPerDay = dailyCoins > 0 && gachaCost > 0 ? Math.floor(dailyCoins / gachaCost) : 0;
    
    const kujiCost = state.gachaPools.find(p => p.type === 'ichiban')?.cost || 0;
    const kujiSessions = sessionCoins > 0 && kujiCost > 0 ? Math.ceil(kujiCost / sessionCoins) : 0;
    const kujiPerDay = dailyCoins > 0 && kujiCost > 0 ? Math.floor(dailyCoins / kujiCost) : 0;

    return {
      totalShopCost, shopSessions, shopDays,
      gachaCost, gachaSessions, gachaPerDay,
      kujiCost, kujiSessions, kujiPerDay,
      targetItem, targetSessionReq, targetDayReq
    };
  };

  const getLevelStats = (sessionXP: number, dailyXP: number) => {
    const nextLevels = [];
    let currentLvl = state.level;
    let carryOverXP = state.xp || 0;
    
    for(let i = 0; i < 3; i++) {
        let xpRequired = getXPForLevel(currentLvl);
        let neededForThisLevel = xpRequired - carryOverXP;
        if (neededForThisLevel < 0) neededForThisLevel = 0;
        carryOverXP = 0; // consumed
        
        const sessions = sessionXP > 0 ? Math.ceil(neededForThisLevel / sessionXP) : 0;
        
        nextLevels.push({
           level: currentLvl + 1,
           xp: neededForThisLevel,
           sessions,
           days: dailyXP > 0 ? neededForThisLevel / dailyXP : 0
        });
        currentLvl++;
    }
    return nextLevels;
  };

  const yields = calculateSessionYield();
  const shopStats = getShopStats(yields.dailyCoins, yields.sessionCoins);
  const lvlStats = getLevelStats(yields.sessionXP, yields.dailyXP);

  return (
    <motion.div
      id="setting-calculator"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black uppercase tracking-widest text-white">Calculators</h3>
          <button 
            onClick={() => setShowIncomeHelp(!showIncomeHelp)}
            className={cn(
              "p-2 rounded-xl transition-all flex items-center gap-2",
              showIncomeHelp ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            )}
          >
            <HelpCircle size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Detailed Metrics</span>
          </button>
        </div>
        <p className="text-sm text-slate-400">Balance checking and optimization guides to help you tune your personal journey.</p>
      </div>

      <div className="bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors border border-indigo-500/20 p-6 rounded-3xl text-sm text-indigo-300">
        <div className="flex items-center gap-2 mb-3">
           <AlertTriangle className="text-indigo-400 w-5 h-5" />
           <strong className="text-indigo-400 font-black uppercase tracking-widest text-sm">General Advice</strong>
        </div>
        <ul className="list-disc pl-5 space-y-2 opacity-90 font-medium leading-relaxed">
          <li>Your session time (e.g. <span className="text-white font-mono bg-slate-950 px-1.5 py-0.5 rounded">25+5</span>) does <span className="text-indigo-400 font-bold">not</span> scale your base XP or Gold naturally. A flat base is given per session.</li>
          <li>Longer focus sessions require deliberate tuning of Developer Settings to remain balanced. If you prefer 50-minute sessions over 25-minute ones, you should double your Base XP and Base Coins.</li>
          <li>Streak bonuses from Talents (A3/B3) trigger extremely powerful rewards on exactly your <span className="text-indigo-400 font-bold">8th session</span> of the day once you reach a streak of 2 days or more.</li>
          <li>Talent scrolls are obtained by collecting <span className="text-indigo-400 font-bold">3 Talent Shards</span>. Adjust your Reward Pool weights if they feel too rare.</li>
        </ul>
      </div>

      {/* Input Config */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl relative">
        <div className="flex items-center justify-between mb-6">
          <h4 className="flex items-center gap-2 font-black text-white uppercase tracking-widest text-sm">
            <Clock className="text-indigo-400" size={18} />
            Your Routine Profile
          </h4>
          <button 
            onClick={() => setShowProgressionHelp(!showProgressionHelp)}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              showProgressionHelp ? "bg-indigo-500/20 text-indigo-400" : "text-slate-600 hover:text-slate-400"
            )}
          >
            <HelpCircle size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative group">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Focus Time (Min)</label>
            <div className="relative">
              <input
                type="number"
                value={focusInput}
                onChange={(e) => setFocusInput(Number(e.target.value))}
                className="w-full bg-slate-950/80 border-2 border-slate-800 text-indigo-400 px-4 py-4 rounded-2xl focus:border-indigo-500 transition-all font-mono text-2xl font-black text-center shadow-inner"
              />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-b-2xl" />
            </div>
          </div>
          <div className="relative group">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rest Time (Min)</label>
            <div className="relative">
              <input
                type="number"
                value={restInput}
                onChange={(e) => setRestInput(Number(e.target.value))}
                className="w-full bg-slate-950/80 border-2 border-slate-800 text-emerald-400 px-4 py-4 rounded-2xl focus:border-emerald-500 transition-all font-mono text-2xl font-black text-center shadow-inner"
              />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-b-2xl" />
            </div>
          </div>
          <div className="relative group">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sessions / Day</label>
            <div className="relative">
              <input
                type="number"
                value={sessionsPerDay}
                onChange={(e) => setSessionsPerDay(Number(e.target.value))}
                className="w-full bg-slate-950/80 border-2 border-slate-800 text-amber-400 px-4 py-4 rounded-2xl focus:border-amber-500 transition-all font-mono text-2xl font-black text-center shadow-inner"
              />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-b-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Calc 1: Yields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center justify-between mb-6">
            <h4 className="flex items-center gap-2 font-black text-white uppercase tracking-widest text-sm">
              <Zap className="text-emerald-400" size={18} />
              Calculated Income
            </h4>
            <button 
              onClick={() => setShowIncomeHelp(!showIncomeHelp)}
              className={cn(
                "p-2 rounded-xl transition-all",
                showIncomeHelp ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              )}
              title="Show calculation parameters"
            >
              <HelpCircle size={16} />
            </button>
          </div>

          <AnimatePresence>
            {showIncomeHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 border-b border-indigo-500/10 pb-2">
                    <Info size={12} />
                    Current Multipliers & Constants
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Base XP</span>
                      <span className="text-white font-mono">{state.devModeEnabled ? (state.devBaseXP ?? 100) : 100}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Base Gold</span>
                      <span className="text-white font-mono">{state.devModeEnabled ? (state.devBaseCoins ?? 10) : 10}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Talent XP (A1)</span>
                      <span className={cn("font-mono", state.activeTalents.includes('a1') ? "text-emerald-400" : "text-slate-600")}>
                        {state.activeTalents.includes('a1') ? "x1.1" : "x1.0"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Talent Gold (B1)</span>
                      <span className={cn("font-mono", state.activeTalents.includes('b1') ? "text-emerald-400" : "text-slate-600")}>
                        {state.activeTalents.includes('b1') ? "+15%" : "+0"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Crit Chance</span>
                      <span className="text-white font-mono">{(state.devModeEnabled ? (state.devCritChance ?? 0.05) : 0.05) * 100}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Crit Multi</span>
                      <span className="text-white font-mono">x{state.devModeEnabled ? (state.devCritMultiplier ?? 5) : 5}</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-indigo-300/40 italic mt-2">Values gathered from Developer Settings and Active Talents.</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors group">
              <span className="text-sm font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">XP Gain</span>
              <div className="text-right">
                <div className="text-emerald-400 font-black font-mono text-lg">+{yields.sessionXP} <span className="text-xs text-slate-500 font-sans opacity-60">/ session</span></div>
                <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">~{yields.dailyXP} / DAY</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors group">
              <span className="text-sm font-bold text-slate-300 group-hover:text-amber-400 transition-colors">Gold Gain</span>
              <div className="text-right">
                <div className="text-amber-400 font-black font-mono text-lg">+{yields.sessionCoins} <span className="text-xs text-slate-500 font-sans opacity-60">/ session</span></div>
                <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">~{yields.dailyCoins} / DAY</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-fuchsia-500/5 rounded-2xl border border-fuchsia-500/10 relative overflow-hidden group hover:border-fuchsia-500/20 transition-colors">
              <span className="text-sm font-bold text-fuchsia-300 relative z-10 group-hover:text-fuchsia-200 transition-colors">Talent Shards</span>
              <div className="text-right relative z-10">
                <div className="text-fuchsia-400 font-black font-mono text-lg">{(yields.chanceToSeeShard * 100).toFixed(1)}% <span className="text-[10px] text-fuchsia-300/50 font-sans uppercase">chance/chest</span></div>
                <div className="text-[10px] text-fuchsia-400/80 font-bold tracking-widest uppercase mt-0.5">~{yields.dailyShards.toFixed(1)} / DAY</div>
              </div>
              <Sparkles className="absolute -left-2 -bottom-2 text-fuchsia-500/10 w-16 h-16 pointer-events-none group-hover:text-fuchsia-500/20 transition-colors duration-500" />
            </div>
          </div>
        </div>

        {/* Calc 2: Level Progression */}
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center justify-between mb-6">
            <h4 className="flex items-center gap-2 font-black text-rose-400 uppercase tracking-widest text-sm">
              <Target size={18} />
              Level Progression
            </h4>
            <button 
              onClick={() => setShowProgressionHelp(!showProgressionHelp)}
              className={cn(
                "p-2 rounded-xl transition-all",
                showProgressionHelp ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              )}
              title="Show estimation details"
            >
              <HelpCircle size={16} />
            </button>
          </div>

          <AnimatePresence>
            {showProgressionHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-400 border-b border-rose-500/10 pb-2">
                    <Info size={12} />
                    Progression Estimates
                  </div>
                  <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                    <p>• <strong className="text-slate-200">Session XP:</strong> Calculated based on your <span className="text-indigo-400 font-bold">Base XP</span> and active <span className="text-emerald-400 font-bold">Talents</span>.</p>
                    <p>• <strong className="text-slate-200">Remaining XP:</strong> Shows how much more you need to reach the next milestone, minus your current carry-over.</p>
                    <p>• <strong className="text-slate-200">Daily Average:</strong> Based on your profile’s <span className="text-amber-400 font-bold">{sessionsPerDay}</span> sessions per day routine.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-3">
            {lvlStats.map((lvl, index) => (
              <div key={index} className="flex flex-col p-4 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all hover:-translate-y-0.5">
                <div className="flex justify-between items-center mb-2 border-b border-slate-800/50 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Next Level {lvl.level}</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">{lvl.xp} XP</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Takes roughly</span>
                     <span className="text-slate-300 font-mono text-lg"><strong className="text-white font-black">{lvl.sessions}</strong> <span className="text-xs font-sans text-slate-500">sessions</span></span>
                  </div>
                  <div className="bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                    <span className="text-indigo-300 font-mono font-bold"><strong className="text-indigo-400 font-black">{lvl.days.toFixed(1)}</strong> <span className="text-[10px] font-sans uppercase">days</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calc 3: Economy & Spending */}
      <div className="bg-slate-900/40 p-0 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <h4 className="flex items-center gap-2 font-black text-white uppercase tracking-widest text-sm">
            <Coins className="text-amber-400" size={18} />
            Economy & Purchasing Power
          </h4>
          <button 
            onClick={() => setShowSpendingHelp(!showSpendingHelp)}
            className={cn(
              "p-2 rounded-xl transition-all",
              showSpendingHelp ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            )}
            title="Show economic breakdown"
          >
            <HelpCircle size={16} />
          </button>
        </div>

        <AnimatePresence>
          {showSpendingHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-b border-slate-800"
            >
              <div className="p-6 bg-amber-500/5 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 border-b border-amber-500/10 pb-2">
                  <Info size={12} />
                  Shopping & Gacha Logic
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                    <p><strong className="text-slate-200 underline decoration-amber-500/30">Fixed Shop:</strong> Calculates cost of all items with finite stock. Infinite items are excluded from "Total Buy" estimates.</p>
                    <p><strong className="text-slate-200 underline decoration-amber-500/30">Target Goal:</strong> When a goal is set, all calculations in the Fixed Shop module switch to focus only on that specific item.</p>
                  </div>
                  <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                    <p><strong className="text-slate-200 underline decoration-indigo-500/30">Gacha/Kuji:</strong> Uses the current pool costs to estimate how many sessions you need to farm per single pull.</p>
                    <p><strong className="text-slate-200 underline decoration-indigo-500/30">Rate:</strong> The number of pulls you can afford daily based on your <span className="text-white font-mono">{yields.dailyCoins}G</span> income.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
           {/* Fixed Shop */}
           <div className="p-6 bg-slate-800/10 hover:bg-slate-800/20 transition-colors">
             <div className="flex items-center justify-between gap-2 text-slate-300 font-black uppercase tracking-widest text-xs mb-6">
               <div className="flex items-center gap-2">
                 <Coins className="text-amber-500" size={16} /> Fixed Shop
               </div>
               {targetItemId && (
                 <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30">Goal Active</span>
               )}
             </div>
             
             <div className="mb-6">
               <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">
                 {shopStats.targetItem ? `Target: ${shopStats.targetItem.name}` : 'Total Shop Cost'}
               </p>
               <div className={cn(
                 "text-2xl font-mono font-black",
                 shopStats.targetItem ? "text-rose-400" : "text-amber-400"
               )}>
                 {shopStats.targetItem ? shopStats.targetItem.price : shopStats.totalShopCost}
               </div>
             </div>

             <div>
               <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-2">
                 {shopStats.targetItem ? 'Required to reach goal' : 'To Buy Everything (No restocks)'}
               </p>
               <div className={cn(
                 "flex justify-between items-center rounded-xl p-3 border",
                 shopStats.targetItem ? "bg-rose-500/5 border-rose-500/20" : "bg-slate-950/50 border-slate-800"
               )}>
                 <div className="text-white font-mono text-sm">
                   {shopStats.targetItem ? shopStats.targetSessionReq : shopStats.shopSessions} <span className="text-[10px] font-sans text-slate-500 uppercase">sessions</span>
                 </div>
                 <div className={cn(
                   "font-mono font-bold text-sm px-2 py-1 rounded border",
                   shopStats.targetItem 
                     ? "text-rose-400 bg-rose-500/10 border-rose-500/20" 
                     : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                 )}>
                   {(shopStats.targetItem ? shopStats.targetDayReq : shopStats.shopDays) < 1 ? '< 1' : (shopStats.targetItem ? shopStats.targetDayReq : shopStats.shopDays).toFixed(1)} <span className="text-[10px] font-sans uppercase">days</span>
                 </div>
               </div>
             </div>
           </div>

           {/* Gacha */}
           <div className="p-6 bg-slate-800/10 hover:bg-slate-800/20 transition-colors relative overflow-hidden">
             <div className="flex items-center gap-2 text-slate-300 font-black uppercase tracking-widest text-xs mb-6 relative z-10">
               <Ticket className="text-indigo-400 bg-indigo-500/20 p-1 rounded border border-indigo-500/30" size={24} /> Gacha Pool
             </div>
             
             <div className="mb-6 relative z-10">
               <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Cost per pull</p>
               <div className="text-2xl font-mono font-black text-indigo-400">{shopStats.gachaCost}</div>
             </div>

             <div className="relative z-10">
               <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-2">Pull Frequency</p>
               <div className="flex justify-between items-center bg-slate-950/50 rounded-xl p-3 border border-slate-800 mb-2">
                 <span className="text-[10px] text-slate-400 font-bold uppercase">Reqs</span>
                 <div className="text-white font-mono text-sm">{shopStats.gachaSessions} <span className="text-[10px] font-sans text-slate-500 uppercase">sessions</span></div>
               </div>
               <div className="flex justify-between items-center bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/20">
                 <span className="text-[10px] text-indigo-300 font-bold uppercase">Rate</span>
                 <div className="text-indigo-400 font-mono font-black text-lg">{shopStats.gachaPerDay}x <span className="text-[10px] font-sans text-indigo-300/50 uppercase">/ day</span></div>
               </div>
             </div>
           </div>

           {/* Ichiban Kuji */}
           <div className="p-6 bg-slate-800/10 hover:bg-slate-800/20 transition-colors relative overflow-hidden">
             <div className="flex items-center gap-2 text-slate-300 font-black uppercase tracking-widest text-xs mb-6 relative z-10">
               <Sparkles className="text-emerald-400 bg-emerald-500/20 p-1 rounded border border-emerald-500/30" size={24} /> Ichiban Kuji
             </div>
             
             {shopStats.kujiCost > 0 ? (
               <>
                 <div className="mb-6 relative z-10">
                   <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Cost per pull</p>
                   <div className="text-2xl font-mono font-black text-emerald-400">{shopStats.kujiCost}</div>
                 </div>

                 <div className="relative z-10">
                   <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-2">Pull Frequency</p>
                   <div className="flex justify-between items-center bg-slate-950/50 rounded-xl p-3 border border-slate-800 mb-2">
                     <span className="text-[10px] text-slate-400 font-bold uppercase">Reqs</span>
                     <div className="text-white font-mono text-sm">{shopStats.kujiSessions} <span className="text-[10px] font-sans text-slate-500 uppercase">sessions</span></div>
                   </div>
                   <div className="flex justify-between items-center bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                     <span className="text-[10px] text-emerald-300 font-bold uppercase">Rate</span>
                     <div className="text-emerald-400 font-mono font-black text-lg">{shopStats.kujiPerDay}x <span className="text-[10px] font-sans text-emerald-300/50 uppercase">/ day</span></div>
                   </div>
                 </div>
               </>
             ) : (
               <div className="h-full flex flex-col items-center justify-center opacity-50 pb-8">
                 <Sparkles strokeWidth={1} className="w-12 h-12 text-slate-600 mb-3" />
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No Pool Configured</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Targeted Item Selector */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
        <div className="flex items-center justify-between mb-6">
          <h4 className="flex items-center gap-2 font-black text-white uppercase tracking-widest text-sm">
            <Target className="text-rose-400" size={18} />
            Set Current Goal
          </h4>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Optional target</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Product</label>
            <div className="relative">
              <select 
                value={targetItemId || ''}
                onChange={(e) => setTargetItemId(e.target.value || null)}
                className="w-full bg-slate-950/80 border border-slate-700 text-slate-300 px-4 py-3 rounded-2xl focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">None (Total Shop)</option>
                <optgroup label="Shop Items">
                  {state.shopItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.price}G)</option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {targetItemId ? (
            <div className="flex items-center gap-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
              <div className="flex-1">
                <div className="text-[10px] text-rose-400/60 font-black uppercase tracking-widest mb-1">Goal: {state.shopItems.find(i => i.id === targetItemId)?.name}</div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-mono text-lg font-black">{shopStats.targetItem && yields.sessionCoins > 0 ? Math.ceil(state.shopItems.find(i => i.id === targetItemId)!.price / yields.sessionCoins) : 0} <span className="text-xs font-sans text-slate-500 font-bold">Sessions</span></span>
                  <span className="text-rose-400 font-mono font-bold text-sm bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">{(shopStats.targetItem && yields.dailyCoins > 0 ? state.shopItems.find(i => i.id === targetItemId)!.price / yields.dailyCoins : 0).toFixed(1)} Days</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-4 opacity-50 grayscale">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select an item to see specific targets</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
