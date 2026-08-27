import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppState, MajorDungeon, Dungeon, DungeonReward } from '../types';
import { Check, Edit2, Plus, Save, Trash2, X, Sword, Target, Coins, Zap, Map, Maximize, Minimize } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ExpeditionPlan {
  title: string;
  description: string;
  reward: {
    amount: number;
    xp: number;
    shards: number;
  };
  tiers: {
    name: string;
    requirement: string;
    reward: {
      amount: number;
      xp: number;
      shards: number;
    };
    sessions?: number;
    deadline?: string;
  }[];
}

interface Props {
  plan: ExpeditionPlan;
  onApply: (plan: ExpeditionPlan) => void;
  isDarkTheme: boolean;
}

export const ExpeditionPlanPreview: React.FC<Props> = ({ plan: initialPlan, onApply, isDarkTheme }) => {
  const [plan, setPlan] = useState<ExpeditionPlan>(initialPlan);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleApply = () => {
    onApply(plan);
  };

  const updateTier = (idx: number, field: keyof typeof plan.tiers[0], value: any) => {
    const newTiers = [...plan.tiers];
    if (field === 'reward') {
      newTiers[idx].reward = { ...newTiers[idx].reward, ...value };
    } else {
      newTiers[idx] = { ...newTiers[idx], [field]: value };
    }
    setPlan({ ...plan, tiers: newTiers });
  };

  const addTier = () => {
    setPlan({
      ...plan,
      tiers: [...plan.tiers, { name: 'New Tier', requirement: '10 sessions', sessions: 10, reward: { amount: 50, xp: 200, shards: 0 } }]
    });
  };

  const removeTier = (idx: number) => {
    const newTiers = [...plan.tiers];
    newTiers.splice(idx, 1);
    setPlan({ ...plan, tiers: newTiers });
  };

  const containerClasses = isFullscreen 
    ? cn("w-full max-w-2xl mx-auto shadow-2xl relative rounded-2xl overflow-hidden border max-h-[90vh] overflow-y-auto", isDarkTheme ? "bg-slate-900 border-indigo-500/30" : "bg-white border-slate-200")
    : cn("mt-4 mb-2 rounded-2xl overflow-hidden border", isDarkTheme ? "bg-slate-900 border-indigo-500/30" : "bg-white border-slate-200 shadow-sm");

  const renderContent = (
    <div className={containerClasses} onClick={e => e.stopPropagation()}>
      <div className={cn("p-4 border-b flex items-center justify-center relative", isDarkTheme ? "bg-slate-800/80 border-indigo-500/30" : "bg-slate-50 border-slate-200")}>
        <div className="flex items-center justify-center gap-2 min-w-0 max-w-[70%]">
          <Map className={cn("shrink-0", isDarkTheme ? "text-indigo-400" : "text-indigo-600")} size={20} />
          <h4 className={cn("font-black tracking-wide truncate text-center", isDarkTheme ? "text-slate-100" : "text-slate-900")}>
            Expedition Blueprint
          </h4>
        </div>
        <div className="absolute right-4 flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={cn("p-1.5 rounded-lg transition-colors", isDarkTheme ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600")}
            title={isFullscreen ? "Minimize" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn("p-1.5 rounded-lg transition-colors", isDarkTheme ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600")}
            title={isEditing ? "Save Edits" : "Edit Blueprint"}
          >
            {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Header fields */}
        <div className="space-y-3">
          <div>
            <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1", isDarkTheme ? "text-indigo-300/70" : "text-slate-500")}>Expedition Title</label>
            {isEditing ? (
              <input
                type="text"
                value={plan.title}
                onChange={e => setPlan({ ...plan, title: e.target.value })}
                className={cn("w-full px-3 py-2 rounded-xl text-sm font-bold border outline-none", isDarkTheme ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900")}
              />
            ) : (
              <h5 className={cn("text-lg font-black", isDarkTheme ? "text-white" : "text-slate-900")}>{plan.title}</h5>
            )}
          </div>
          <div>
            <label className={cn("block text-[10px] font-bold uppercase tracking-widest mb-1", isDarkTheme ? "text-indigo-300/70" : "text-slate-500")}>Description</label>
            {isEditing ? (
              <input
                type="text"
                value={plan.description}
                onChange={e => setPlan({ ...plan, description: e.target.value })}
                className={cn("w-full px-3 py-2 rounded-xl text-xs border outline-none", isDarkTheme ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-300 text-slate-700")}
              />
            ) : (
              <p className={cn("text-xs leading-relaxed", isDarkTheme ? "text-slate-300" : "text-slate-700")}>{plan.description}</p>
            )}
          </div>
        </div>

        {/* Total Reward */}
        <div className={cn("p-3 flex items-center justify-between rounded-xl", isDarkTheme ? "bg-indigo-950/30" : "bg-indigo-50/50 border border-slate-100")}>
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkTheme ? "text-indigo-300" : "text-indigo-700")}>Goal Reward</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><Coins size={12} className="text-amber-400" /><span className="text-xs font-mono font-bold text-amber-500">{plan.reward.amount}</span></div>
            <div className="flex items-center gap-1"><Zap size={12} className="text-indigo-400" /><span className="text-xs font-mono font-bold text-indigo-500">{plan.reward.xp}</span></div>
          </div>
        </div>

        {/* Tiers */}
        <div className="space-y-3 pt-2 border-t border-dashed border-slate-500/30">
          <label className={cn("block text-[10px] font-bold uppercase tracking-widest -mb-1", isDarkTheme ? "text-slate-400" : "text-slate-500")}>Tiers / Stages</label>
          {plan.tiers.map((tier, idx) => (
            <div key={idx} className={cn("p-3 rounded-xl border relative group", isDarkTheme ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200")}>
              {isEditing && (
                <button
                  onClick={() => removeTier(idx)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full transition-opacity transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tier.name}
                    onChange={e => updateTier(idx, 'name', e.target.value)}
                    className={cn("w-full px-2 py-1 rounded text-xs font-bold border outline-none", isDarkTheme ? "bg-slate-900 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-800")}
                    placeholder="Tier Name"
                  />
                  <input
                    type="text"
                    value={tier.requirement}
                    onChange={e => updateTier(idx, 'requirement', e.target.value)}
                    className={cn("w-full px-2 py-1 rounded text-[11px] border outline-none", isDarkTheme ? "bg-slate-900 border-slate-600 text-slate-300" : "bg-slate-50 border-slate-300 text-slate-600")}
                    placeholder="E.g. Complete 10 sessions"
                  />
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-2">
                    <div className="flex items-center gap-1" title="Sessions Required">
                      <Target size={12} className="text-slate-400 shrink-0" />
                      <input 
                        type="number" 
                        value={tier.sessions || 1} 
                        onChange={e => updateTier(idx, 'sessions', Number(e.target.value))}
                        className={cn("w-14 px-1 py-0.5 rounded text-[11px] sm:text-xs font-mono border outline-none text-center", isDarkTheme ? "bg-slate-900 border-slate-600 text-rose-400" : "bg-slate-50 border-slate-300 text-rose-600")}
                        min="1"
                      />
                    </div>
                    <div className="flex items-center gap-1" title="Gold Reward">
                      <Coins size={12} className="text-slate-400 shrink-0" />
                      <input 
                        type="number" 
                        value={tier.reward.amount} 
                        onChange={e => updateTier(idx, 'reward', { amount: Number(e.target.value) })}
                        className={cn("w-14 px-1 py-0.5 rounded text-[11px] sm:text-xs font-mono border outline-none text-center", isDarkTheme ? "bg-slate-900 border-slate-600 text-amber-400" : "bg-slate-50 border-slate-300 text-amber-600")}
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-1" title="XP Reward">
                      <Zap size={12} className="text-slate-400 shrink-0" />
                      <input 
                        type="number" 
                        value={tier.reward.xp} 
                        onChange={e => updateTier(idx, 'reward', { xp: Number(e.target.value) })}
                        className={cn("w-14 px-1 py-0.5 rounded text-[11px] sm:text-xs font-mono border outline-none text-center", isDarkTheme ? "bg-slate-900 border-slate-600 text-indigo-400" : "bg-slate-50 border-slate-300 text-indigo-600")}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h6 className={cn("text-xs font-bold", isDarkTheme ? "text-slate-200" : "text-slate-800")}>{tier.name}</h6>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {(tier.sessions !== undefined) && (
                        <div className="flex items-center gap-1.5" title="Sessions Required"><Target size={10} className="text-rose-400" /><span className="text-[10px] font-mono text-rose-500 font-bold">{tier.sessions || 1}</span></div>
                      )}
                      <div className="flex items-center gap-1.5" title="Gold Reward"><Coins size={10} className="text-amber-400" /><span className="text-[10px] font-mono text-amber-500">{tier.reward.amount}</span></div>
                      <div className="flex items-center gap-1.5" title="XP Reward"><Zap size={10} className="text-indigo-400" /><span className="text-[10px] font-mono text-indigo-500">{tier.reward.xp}</span></div>
                    </div>
                  </div>
                  <p className={cn("text-[10px] mt-1 line-clamp-2", isDarkTheme ? "text-slate-400" : "text-slate-500")}>
                    {tier.requirement}
                  </p>
                </>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              onClick={addTier}
              className={cn("w-full py-2 rounded-xl flex items-center justify-center gap-1 hover:brightness-110 transition-all border border-dashed", isDarkTheme ? "bg-slate-800/50 border-slate-600 text-slate-300" : "bg-slate-50 border-slate-300 text-slate-600")}
            >
              <Plus size={14} /> <span className="text-xs font-bold">Add Tier</span>
            </button>
          )}
        </div>

        {!isEditing && (
          <button
            onClick={handleApply}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            <Check size={16} />
            Accept & Create Expedition
          </button>
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return createPortal(
      <div 
        className={cn("fixed inset-0 z-[100] flex justify-center items-center overflow-y-auto p-4 sm:p-6 backdrop-blur-sm", isDarkTheme ? "bg-slate-950/80" : "bg-slate-900/50")}
        onClick={() => setIsFullscreen(false)}
      >
        {renderContent}
      </div>,
      document.body
    );
  }

  return renderContent;
};
