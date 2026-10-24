import React, { useState } from 'react';
import { SpinnerInput } from '../common/SpinnerInput';

// Helper to convert VAPID key


export const DevResourceControl = ({ label, value, onAdd, onSub, icon, defaultAmount = 1 }: { label: string, value: number, onAdd: (amount: number) => void, onSub: (amount: number) => void, icon: React.ReactNode, defaultAmount?: number }) => {
  const [amount, setAmount] = useState(defaultAmount);

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-3xl space-y-4 transition-all hover:bg-slate-800/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
        <div className="p-3 bg-slate-900/50 rounded-xl">
          {icon}
        </div>
      </div>
      <div className="text-4xl font-black text-white tracking-tighter">
        {value.toLocaleString()}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <SpinnerInput 
          min={1}
          value={amount}
          onChange={(val) => setAmount(typeof val === 'number' ? Math.max(1, val) : 1)}
          className="w-20 px-2 py-2 text-xs text-center font-bold"
        />
        <div className="flex flex-1 gap-1">
          <button onClick={() => onSub(amount)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-black transition-colors">-</button>
          <button onClick={() => onAdd(amount)} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black shadow-lg shadow-indigo-600/20 transition-colors">+</button>
        </div>
      </div>
    </div>
  );
};

