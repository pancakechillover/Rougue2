import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShopItem, GachaPool, Rarity } from '../types';
import { ShoppingBag, Sparkles, Trophy, Coins, RefreshCw, HelpCircle, Zap, Flame, Gem, Target, Star, Heart, Shield, Sword, Coffee, Pizza, Gift, Package, Camera, Music, Book, Gamepad2, Ghost, Moon, Sun, Cloud, Anchor, Compass, Map, Key, Lock, Unlock, Bell, BellOff, Eye, EyeOff, Search, Settings, Trash2, Edit2, Plus, X, Check, CheckCircle2, AlertCircle, Info, HelpCircle as HelpIcon, Ticket, Crown } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { ConfirmModal } from './ConfirmModal';
import { SlotMachine } from './icons/SlotMachine';
import { cn } from '../lib/utils';
import { getColorClass, RARITY_COLORS } from '../lib/colors';

const ICON_MAP: Record<string, any> = {
  ShoppingBag, Sparkles, Trophy, Coins, RefreshCw, HelpCircle, Zap, Flame, Gem, Target, Star, Heart, Shield, Sword, Coffee, Pizza, Gift, Package, Camera, Music, Book, Gamepad2, Ghost, Moon, Sun, Cloud, Anchor, Compass, Map, Key, Lock, Unlock, Bell, BellOff, Eye, EyeOff, Search, Settings, Trash2, Edit2, Plus, X, Check, CheckCircle2, AlertCircle, Info, HelpIcon, Ticket, SlotMachine
};

interface ShopProps {
  coins: number;
  shopItems: ShopItem[];
  gachaPools: GachaPool[];
  activeGachaPoolId?: string;
  activeIchibanPoolId?: string;
  onPurchase: (itemId: string) => void;
  onDrawGacha: (poolId: string, amount: number) => void;
  onResetIchiban: (poolId: string) => void;
  onShowCoinGuide?: () => void;
  onSetActivePool?: (type: 'gacha' | 'ichiban', poolId: string) => void;
  onOpenSettings?: () => void;
}

export const Shop = React.memo<ShopProps>(({ 
  coins, 
  shopItems, 
  gachaPools, 
  activeGachaPoolId,
  activeIchibanPoolId,
  onPurchase, 
  onDrawGacha, 
  onResetIchiban, 
  onShowCoinGuide,
  onSetActivePool,
  onOpenSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'gacha' | 'ichiban'>('shop');
  const [showProbabilities, setShowProbabilities] = useState(false);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);
  
  const gachaPoolsList = gachaPools.filter(p => p.type === 'gacha');
  const ichibanPoolsList = gachaPools.filter(p => p.type === 'ichiban');

  const gachaPool = gachaPoolsList.find(p => p.id === activeGachaPoolId) || gachaPoolsList[0] || gachaPools[0];
  const ichibanPool = ichibanPoolsList.find(p => p.id === activeIchibanPoolId) || ichibanPoolsList[0] || gachaPools[1];

  const remainingIchibanItems = ichibanPool?.items
    ?.filter(i => i.rarity.toUpperCase() !== 'LASTONE')
    ?.reduce((acc, i) => acc + (i.count || 0), 0) || 0;

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <PageHeader 
        title="Merchant's Outpost"
        description="Exchange your hard-earned gold"
        icon={ShoppingBag}
        action={
          onOpenSettings ? (
            <button
              onClick={onOpenSettings}
              className="p-2 sm:p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Merchant Settings"
            >
              <Settings size={20} />
            </button>
          ) : undefined
        }
      >
        <div className="flex items-center gap-4 mt-4">
          <button 
            onClick={onShowCoinGuide}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 hover:text-indigo-400 transition-colors text-sm font-bold uppercase tracking-widest"
          >
            <HelpCircle size={18} />
            How to get coins
          </button>
        </div>
      </PageHeader>

      <div className="flex space-x-1 p-1 bg-slate-900 rounded-xl w-full">
        {(['shop', 'gacha', 'ichiban'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-2 py-2 rounded-lg text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all",
              activeTab === tab ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === 'gacha' ? 'Gacha' : tab === 'ichiban' ? 'ICHIBAN' : tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full border-[8px] border-slate-800 rounded-3xl overflow-hidden bg-slate-800"
          >
            <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {shopItems.map(item => {
              const IconComponent = (item.icon && ICON_MAP[item.icon]) || ShoppingBag;
              const isOutOfStock = item.stock !== undefined && item.stock === 0;

              return (
                <div key={item.id} className={cn(
                  "relative flex flex-col group transition-all bg-slate-950",
                  isOutOfStock ? "opacity-50 grayscale" : ""
                )}>
                  {/* Item Display on Shelf */}
                  <div className="w-full relative pt-8 pb-3 border-b-[4px] border-slate-800 group-hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-end z-10">
                    <div className="relative z-10 p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:-translate-y-2 transition-transform duration-300">
                      <IconComponent size={32} />
                    </div>
                  </div>
                  
                  {/* Details as Hanging Sign */}
                  <div className="w-full flex-grow relative bg-slate-900/50 pt-3 pb-6 flex flex-col">
                    <div className="w-[85%] mx-auto relative pt-4 flex flex-col flex-grow text-center px-2 sm:px-3 pb-3 bg-slate-800 border-2 border-slate-700/50 rounded-b-xl group-hover:border-indigo-500/50 transition-colors">
                      {/* Hanging Chains */}
                      <div className="absolute -top-[14px] left-3 sm:left-4 w-[2px] h-[14px] bg-slate-600 group-hover:bg-indigo-500/50 transition-colors"></div>
                      <div className="absolute -top-[14px] right-3 sm:right-4 w-[2px] h-[14px] bg-slate-600 group-hover:bg-indigo-500/50 transition-colors"></div>

                      <h3 className="text-sm font-bold text-slate-100 mb-1 truncate mt-1">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 mb-4 flex-grow line-clamp-2 leading-relaxed">{item.description}</p>
                      
                      <div className="flex items-center gap-1 mt-auto">
                        <div className="flex-none px-1.5 sm:px-2 py-1.5 bg-slate-900 border border-slate-700/50 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                          {item.stock !== undefined && item.stock !== -1 ? `Lmt ${item.stock}` : '∞'} 
                        </div>
                        <button
                          onClick={() => onPurchase(item.id)}
                          disabled={coins < item.price || isOutOfStock}
                          className={cn(
                            "flex-1 py-1.5 px-1.5 sm:px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 min-w-0 border",
                            (coins >= item.price && !isOutOfStock)
                              ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 group-hover:bg-indigo-500 group-hover:scale-105" 
                              : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          )}
                        >
                          <Coins size={12} className={cn("opacity-90 shrink-0", (coins >= item.price && !isOutOfStock) && "text-amber-300 group-hover:text-amber-200")} />
                          <span className="truncate">{isOutOfStock ? 'Sold' : item.price}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </motion.div>
        )}

        {activeTab === 'gacha' && (
          <motion.div
            key="gacha"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full flex flex-col items-center space-y-8"
          >
            {gachaPoolsList.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-900 rounded-xl overflow-x-auto max-w-full">
                {gachaPoolsList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSetActivePool?.('gacha', p.id)}
                    className={cn(
                      "px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      gachaPool?.id === p.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {gachaPool && (
              <div key={gachaPool.id} className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
                
                {/* Visual Area (Left) */}
                <div className="flex-1 p-8 sm:p-12 flex flex-col items-center justify-center relative min-h-[400px]">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                  </div>

                  <div className="relative mb-8 group perspective-1000">
                    <div className="w-40 h-40 bg-slate-800/80 rounded-3xl border border-slate-700/50 shadow-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative z-10 backdrop-blur-sm">
                      <SlotMachine size={80} className="text-indigo-400 group-hover:text-amber-400 transition-colors duration-500" />
                      <div className="absolute inset-0 rounded-3xl border-[3px] border-indigo-500/20 group-hover:border-amber-400/50 animate-pulse transition-colors duration-500 p-2"></div>
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-slate-50 mb-3 text-center">{gachaPool.name}</h3>
                  <p className="text-slate-400 text-sm text-center mb-10 max-w-xs leading-relaxed">
                    Test your luck and win fabulous rewards. Will fortune favor you today?
                  </p>

                  <div className="flex w-full gap-5 max-w-md mt-auto z-10 relative pb-2">
                    <button
                      onClick={() => onDrawGacha(gachaPool.id, 1)}
                      disabled={coins < gachaPool.cost}
                      className={cn(
                        "flex-1 py-5 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1.5",
                        coins >= gachaPool.cost 
                          ? "bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-600 text-slate-200" 
                          : "bg-slate-900 border-2 border-slate-800 text-slate-600 cursor-not-allowed"
                      )}
                    >
                      <span className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest">Draw 1x</span>
                      <span className="text-base sm:text-lg font-black flex items-center gap-1.5">
                         <Coins size={16} className={coins >= gachaPool.cost ? "text-amber-400" : ""} />
                         {gachaPool.cost.toLocaleString()}
                      </span>
                    </button>
                    <button
                      onClick={() => onDrawGacha(gachaPool.id, 10)}
                      disabled={coins < gachaPool.cost * 10}
                      className={cn(
                        "flex-1 py-5 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1.5",
                        coins >= gachaPool.cost * 10
                          ? "bg-indigo-600 hover:bg-indigo-500 border-2 border-indigo-500 shadow-xl shadow-indigo-600/30 text-white" 
                          : "bg-slate-900 border-2 border-slate-800 text-slate-600 cursor-not-allowed"
                      )}
                    >
                       <span className="text-xs sm:text-sm text-indigo-200 uppercase tracking-widest opacity-90">Draw 10x</span>
                       <span className="text-base sm:text-lg font-black flex items-center gap-1.5">
                         <Coins size={16} className={coins >= gachaPool.cost * 10 ? "text-amber-300" : ""} />
                         {(gachaPool.cost * 10).toLocaleString()}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Probability Details (Right) */}
                <div className="w-full md:w-80 lg:w-96 bg-slate-950/50 border-t md:border-t-0 md:border-l border-slate-800/80 p-6 sm:p-8 flex flex-col">
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                    <HelpCircle size={18} className="text-indigo-400" />
                    <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest">Rates & Contents</h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                     <div className="space-y-2">
                       {(() => {
                          const rarities = gachaPool.rarities || [];
                         const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
                         
                         return rarities.map(rarity => {
                           const prob = totalWeight > 0 ? ((rarity.weight / totalWeight) * 100).toFixed(1) : '0';
                           const colors = getColorClass(rarity.color);
                           return (
                             <div key={rarity.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/50 bg-slate-900/50">
                               <span className={cn("text-xs font-black uppercase tracking-wider", colors.textClass)}>{rarity.name}</span>
                               <span className="text-xs font-bold text-slate-400">{prob}%</span>
                             </div>
                           );
                         });
                       })()}
                     </div>

                     <div>
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Pool Contents</h5>
                        <div className="space-y-4">
                           {(gachaPool.rarities || []).map(rarity => {
                             const items = gachaPool.items.filter(i => i.rarity === rarity.id);
                             if (items.length === 0) return null;
                             const colors = getColorClass(rarity.color);
                             const vibrantMapping: Record<string, string> = {
                               'rose': 'bg-rose-600 border-rose-500',
                               'amber': 'bg-amber-500 border-amber-400',
                               'purple': 'bg-purple-600 border-purple-500',
                               'blue': 'bg-blue-600 border-blue-500',
                               'emerald': 'bg-emerald-600 border-emerald-500',
                               'slate': 'bg-slate-700 border-slate-600'
                             };
                             const badgeBg = rarity.color && vibrantMapping[rarity.color] ? vibrantMapping[rarity.color] : colors.bgClass;

                             return (
                               <div key={rarity.id} className="bg-slate-900 rounded-xl p-3 border border-slate-800/50">
                                 <div className="flex items-center gap-2 mb-2">
                                     <div className={cn("w-2 h-2 rounded-full", colors.bgClass)}></div>
                                     <span className={cn(
                                       "text-[10px] font-black uppercase tracking-widest",
                                       colors.textClass
                                     )}>
                                       {rarity.name}
                                     </span>
                                 </div>
                                 <div className="flex flex-wrap gap-1">
                                    {items.map(i => (
                                       <span key={i.name} className="text-[11px] font-medium text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                          {i.name}
                                       </span>
                                    ))}
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                     </div>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'ichiban' && (
          <motion.div
            key="ichiban"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full flex flex-col space-y-12"
          >
            {ichibanPoolsList.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-slate-900 rounded-xl overflow-x-auto max-w-full self-center">
                {ichibanPoolsList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSetActivePool?.('ichiban', p.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      ichibanPool?.id === p.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {ichibanPool && (
              <div key={ichibanPool.id} className="w-full max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
                
                {/* Visual Area (Left) */}
                <div className="flex-1 p-8 sm:p-12 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-800/80 min-h-[400px]">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                  </div>

                  <div className="relative mb-8 group perspective-1000">
                    <div className="w-40 h-40 bg-slate-800/80 rounded-3xl border border-slate-700/50 shadow-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative z-10 backdrop-blur-sm">
                      <Gift size={80} className="text-indigo-400 group-hover:text-amber-400 transition-colors duration-500" />
                      <div className="absolute inset-0 rounded-3xl border-[3px] border-indigo-500/20 group-hover:border-amber-400/50 animate-pulse transition-colors duration-500 p-2"></div>
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-slate-50 mb-3 text-center">{ichibanPool.name}</h3>
                  <p className="text-slate-400 text-sm text-center mb-10 max-w-xs leading-relaxed">
                    Box Gacha pool. Draw all items to claim the exclusive Last One prize!
                  </p>
                  
                  <div className="flex flex-col w-full gap-3 max-w-md mt-auto z-10 relative">
                    {remainingIchibanItems > 0 ? (
                      <div className="flex gap-4 w-full pb-2">
                        <button
                          onClick={() => onDrawGacha(ichibanPool.id, 1)}
                          disabled={coins < ichibanPool.cost}
                          className={cn(
                            "flex-1 py-5 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1.5",
                            coins >= ichibanPool.cost 
                              ? "bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-600 text-slate-200" 
                              : "bg-slate-900 border-2 border-slate-800 text-slate-600 cursor-not-allowed"
                          )}
                        >
                          <span className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest">Draw 1x</span>
                          <span className="text-base sm:text-lg font-black flex items-center gap-1.5">
                             <Coins size={16} className={coins >= ichibanPool.cost ? "text-amber-400" : ""} />
                             {ichibanPool.cost.toLocaleString()}
                          </span>
                        </button>
                        <button
                          onClick={() => onDrawGacha(ichibanPool.id, remainingIchibanItems < 10 ? remainingIchibanItems : 10)}
                          disabled={coins < ichibanPool.cost * (remainingIchibanItems < 10 ? remainingIchibanItems : 10)}
                          className={cn(
                            "flex-1 py-5 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1.5",
                            coins >= ichibanPool.cost * (remainingIchibanItems < 10 ? remainingIchibanItems : 10)
                              ? remainingIchibanItems < 10 
                                 ? "bg-amber-600 hover:bg-amber-500 border-2 border-amber-500 text-amber-50 shadow-xl shadow-amber-600/30" 
                                 : "bg-indigo-600 hover:bg-indigo-500 border-2 border-indigo-500 text-white shadow-xl shadow-indigo-600/30" 
                              : "bg-slate-900 border-2 border-slate-800 text-slate-600 cursor-not-allowed"
                          )}
                        >
                          {remainingIchibanItems < 10 ? (
                             <>
                                <span className="text-xs sm:text-sm text-amber-200 uppercase tracking-widest opacity-90">Take All</span>
                                <span className="text-base sm:text-lg font-black flex items-center gap-1.5">
                                   <Coins size={16} className={coins >= ichibanPool.cost * remainingIchibanItems ? "text-amber-300" : ""} />
                                   {(ichibanPool.cost * remainingIchibanItems).toLocaleString()}
                                </span>
                             </>
                          ) : (
                             <>
                                <span className="text-xs sm:text-sm text-indigo-200 uppercase tracking-widest opacity-90">Draw 10x</span>
                                <span className="text-base sm:text-lg font-black flex items-center gap-1.5">
                                   <Coins size={16} className={coins >= ichibanPool.cost * 10 ? "text-amber-300" : ""} />
                                   {(ichibanPool.cost * 10).toLocaleString()}
                                </span>
                             </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmResetId(ichibanPool.id)}
                        className="w-full py-5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-500 border-2 border-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition-all flex flex-col items-center justify-center gap-1.5"
                      >
                         <span className="text-sm font-black flex items-center gap-2">
                           <RefreshCw size={18} />
                           RESET POOL
                         </span>
                         <span className="text-xs text-indigo-200 uppercase tracking-widest opacity-90">New Box Available</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Area: List of Rewards */}
                <div className="w-full lg:w-[500px] xl:w-[600px] bg-slate-950/50 p-6 sm:p-8 flex flex-col relative max-h-[1000px] lg:max-h-[800px]">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800 relative z-10 shrink-0">
                    <div className="flex items-center gap-2">
                       <Package size={18} className="text-indigo-400" />
                       <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest">Prize Lineup</h4>
                    </div>
                    <div className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                      Remaining: <span className={cn("font-black ml-1 text-sm leading-none", remainingIchibanItems > 0 ? "text-indigo-400" : "text-amber-400")}>{remainingIchibanItems}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 relative z-10">
                    {[...ichibanPool.items].sort((a, b) => {
                      if (a.rarity === 'LastOne') return -1;
                      if (b.rarity === 'LastOne') return 1;
                      return 0;
                    }).map(item => {
                      const subItems = item.name.split('/').map(s => s.trim()).filter(s => s.length > 0);
                      const isExhausted = item.count === 0;
                      const isLastOne = item.rarity.toUpperCase() === 'LASTONE';
                      
                      return (
                        <div 
                          key={item.rarity + item.name} 
                          className={cn(
                            "p-3 sm:p-4 bg-slate-900 rounded-2xl border transition-all relative overflow-hidden",
                            isExhausted ? "opacity-50 grayscale border-slate-800" : isLastOne ? "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]" : "border-slate-700 hover:border-slate-600 shadow-lg shadow-black/20"
                          )}
                        >
                          {isExhausted && (
                             <div className="absolute inset-0 bg-slate-950/40 z-20 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="text-3xl font-black text-rose-500/70 border-4 border-rose-500/70 py-2 px-6 rounded-xl transform -rotate-12 uppercase tracking-widest bg-slate-950/50">Empty</div>
                             </div>
                          )}
                          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10", isExhausted ? "opacity-30" : "")}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className={cn(
                                "text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shrink-0 shadow-lg border",
                                (() => {
                                  let colorId = item.color;
                                  if (!colorId) {
                                    if (isLastOne) colorId = 'rose';
                                    else if (item.rarityValue) {
                                      const mapped = RARITY_COLORS.find(c => c.value === item.rarityValue);
                                      if (mapped) colorId = mapped.id;
                                    }
                                  }
                                  
                                  const { bgClass, textClass, borderClass } = getColorClass(colorId || 'slate');
                                  
                                  const vibrantMapping: Record<string, string> = {
                                    'rose': 'bg-rose-600 text-white border-rose-500',
                                    'amber': 'bg-amber-500 text-slate-900 border-amber-400',
                                    'purple': 'bg-purple-600 text-white border-purple-500',
                                    'blue': 'bg-blue-600 text-white border-blue-500',
                                    'emerald': 'bg-emerald-600 text-white border-emerald-500',
                                    'slate': 'bg-slate-600 text-white border-slate-500'
                                  };
                                  
                                  const vibrantBg = colorId && vibrantMapping[colorId] ? vibrantMapping[colorId] : bgClass;
                                  const vibrantText = colorId === 'amber' ? 'text-slate-900' : 'text-white font-black';
                                  
                                  return cn(vibrantBg, vibrantText, borderClass);
                                })()
                              )}>
                                {item.rarity}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {subItems.map((sub, sIdx) => (
                                  <span key={sIdx} className="text-[11px] sm:text-xs text-slate-100 font-bold bg-slate-950 px-2.5 py-1 rounded-md border border-slate-700/50 shadow-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {!isLastOne && (
                               <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-end sm:self-auto shrink-0">
                                 <div className="text-right">
                                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter leading-none">Left</div>
                                   <div className="text-lg font-black text-slate-100 leading-none mt-1">{item.count}</div>
                                 </div>
                                 {item.initialCount !== undefined && (
                                   <div className="h-6 w-px bg-slate-800 mt-1" />
                                 )}
                                 {item.initialCount !== undefined && (
                                   <div className="text-left">
                                     <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter leading-none">Total</div>
                                     <div className="text-sm font-bold text-slate-500 leading-none mt-1">{item.initialCount}</div>
                                   </div>
                                 )}
                               </div>
                            )}
                            {isLastOne && (
                               <div className="flex items-center justify-center shrink-0 w-[4.5rem]">
                                  <Crown size={24} className={cn("drop-shadow-lg", isExhausted ? "text-slate-600" : "text-rose-500 animate-pulse")} />
                               </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={!!confirmResetId}
        onClose={() => setConfirmResetId(null)}
        onConfirm={() => {
          if (confirmResetId) onResetIchiban(confirmResetId);
        }}
        title="Reset Ichiban Pool?"
        message="Are you sure you want to reset this pool? All remaining items will be restored to their initial quantities."
        confirmText="Confirm Reset"
        type="warning"
      />
    </div>
  );
});
