import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, ShopItem, GachaPool, Rarity } from '../../types';
import { INITIAL_GACHA } from '../../constants';
import { Plus, Trash2, Save, Edit2, X, ChevronRight, Coins, Zap, Sparkles, Trophy, Timer as TimerIcon, Package, Flame, AlertTriangle, Scroll, Volume2, VolumeX, Sun, Moon, Settings as SettingsIcon, ShoppingBag, Trees, Waves, Database, Download, Upload, Target, Gift, User, Sword, Eye, Palette, Check, Bell, BellOff, RefreshCw, Key, Layers, Sunrise, Cloud, CloudSun, Lollipop, Wrench, History, Ticket } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../../version';
import { cn, getXPForLevel, getDefaultRewardForLevel } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { SpinnerInput } from '../SpinnerInput';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


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

