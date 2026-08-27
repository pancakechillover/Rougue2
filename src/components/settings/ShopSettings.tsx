import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RewardCard, ShopItem, GachaPool, Rarity } from '../../types';
import { INITIAL_GACHA } from '../../constants';
import { Plus, Trash2, Save, Edit2, X, ChevronRight, ChevronUp, ChevronDown, Coins, Zap, Sparkles, Trophy, Timer as TimerIcon, Package, Flame, AlertTriangle, Scroll, Volume2, VolumeX, Sun, Moon, Settings as SettingsIcon, ShoppingBag, Trees, Waves, Database, Download, Upload, Target, Gift, User, Sword, Eye, Palette, Check, Bell, RefreshCw, Key, Layers, Sunrise, Cloud, CloudSun, Lollipop, Wrench, History, Ticket, Apple, Citrus, Cookie, IceCream, Cake, Beer, Wine, GlassWater, Flower, Flower2, Sprout, Leaf, Car, Bike, Plane, Rocket, Ship, Gamepad2, Headphones, Monitor, Smartphone, Tv, Library, Dumbbell, Award, Medal, Compass, Map, Camera, Music, Book, BookOpen } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { APP_VERSION, LAST_UPDATE_DATE, RELEASE_HISTORY } from '../../version';
import { cn, getXPForLevel, getDefaultRewardForLevel } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { SpinnerInput } from '../SpinnerInput';
import { ConfirmModal } from '../ConfirmModal';

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


export const ShopSettings = ({ items, onUpdate }: { items: ShopItem[], onUpdate: (i: ShopItem[]) => void }) => {
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [modalConfig, setModalConfig] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm?: () => void; 
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
  }>({ isOpen: false, title: '', message: '' });

  return (
    <div id="setting-shop" className="space-y-6">
      <div className="flex justify-between items-center pb-4 mb-6">
        <div className="flex items-center gap-2.5 text-amber-400">
          <ShoppingBag size={20} />
          <h3 className="text-lg font-bold uppercase tracking-widest pr-1">Fixed Shop Items</h3>
        </div>
        <button onClick={() => setEditing({ id: Math.random().toString(36).substr(2, 9), name: '', price: 100, description: '' })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => {
          const IconComp = (item.icon && (LucideIcons as any)[item.icon]) ? (LucideIcons as any)[item.icon] : LucideIcons.ShoppingBag;
          return (
          <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <IconComp size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white tracking-tight">{item.name}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                <div className="flex items-center gap-1.5 text-amber-500 font-bold mt-2 text-xs bg-amber-500/10 w-fit px-2 py-0.5 rounded border border-amber-500/20">
                  <Coins size={12} /> {item.price.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0 ml-4">
              <button onClick={() => setEditing(item)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"><Edit2 size={16} /></button>
              <button 
                onClick={() => {
                  setModalConfig({
                    isOpen: true,
                    title: "Delete Shop Item?",
                    message: `Are you sure you want to delete item "${item.name}"?`,
                    confirmText: "Delete",
                    type: "danger",
                    onConfirm: () => onUpdate(items.filter(i => i.id !== item.id))
                  });
                }} 
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )})}
      </div>

      {createPortal(
        <AnimatePresence>
          {editing && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 p-8 rounded-[2rem] border border-slate-700 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl">
                      <ShoppingBag size={20} />
                    </div>
                    <h4 className="text-xl font-bold text-white tracking-tight">
                      {items.some(i => i.id === editing.id) ? 'Edit Shop Item' : 'Add New Item'}
                    </h4>
                  </div>
                  <div className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-700">Market</div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2 pb-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    {/* Left Column */}
                    <div className="flex flex-col h-full">
                      <div className="space-y-4 flex flex-col flex-1">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Item Name</label>
                          <input type="text" placeholder="e.g. Ancient Relic" value={editing.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-500 transition-colors" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Price</label>
                            <div className="relative">
                              <SpinnerInput 
                                placeholder="Price" 
                                value={editing.price === undefined || editing.price === null ? '' : editing.price} 
                                onChange={(val) => setEditing({...editing, price: typeof val === 'number' ? val : ('' as any)})} 
                                className="pl-10 focus:border-amber-500" 
                              />
                              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={16} />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                              Stock
                            </label>
                            <SpinnerInput 
                              allowInfinity
                              placeholder="Stock" 
                              value={editing.stock === undefined ? -1 : editing.stock} 
                              onChange={(val) => setEditing({...editing, stock: typeof val === 'number' ? val : -1})} 
                              className="focus:border-amber-500" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 flex-1 flex flex-col">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                          <textarea placeholder="What does this item do?..." value={editing.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm flex-1 min-h-[160px] resize-none focus:border-amber-500 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col h-full">
                      <div className="space-y-2 flex flex-col flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center justify-between shrink-0">
                          <span>Visual Identifier (Icon)</span>
                          <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">{editing.icon || 'ShoppingBag'}</span>
                        </label>
                        <div className="flex-1 grid grid-cols-6 gap-3 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 min-h-[200px]">
                          {[
                            // Essentials
                            'ShoppingBag', 'Gift', 'Package', 'Ticket', 'Key', 'Coins', 'Gem', 'Trophy', 'Medal', 'Award', 'Target', 'Star', 'Heart', 
                            // Food & Drink
                            'Apple', 'Citrus', 'Pizza', 'Cookie', 'IceCream', 'Cake', 'Coffee', 'Beer', 'Wine', 'GlassWater',
                            // Nature
                            'Flame', 'Zap', 'Sparkles', 'Flower', 'Flower2', 'Sprout', 'Leaf', 'Trees', 'Sun', 'Moon', 'Cloud', 'Sunrise',
                            // Travel & Adventure
                            'Car', 'Bike', 'Plane', 'Rocket', 'Ship', 'Compass', 'Map', 'Anchor',
                            // Hobbies & Tech
                            'Gamepad2', 'Headphones', 'Camera', 'Music', 'Monitor', 'Smartphone', 'Tv', 'Dumbbell', 'Palette', 'Sword', 'Book', 'BookOpen', 'Library', 'History'
                          ].map(iconName => {
                            const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.ShoppingBag;
                            const isSelected = (editing.icon || 'ShoppingBag') === iconName;
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => setEditing({...editing, icon: iconName})}
                                className={cn(
                                  "aspect-square flex items-center justify-center rounded-xl transition-all border",
                                  isSelected 
                                    ? "bg-amber-500 border-amber-400 text-slate-900 shadow-lg shadow-amber-500/20 scale-110 z-10" 
                                    : "bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                                )}
                                title={iconName}
                              >
                                <IconComponent size={20} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 shrink-0">
                  <button onClick={() => setEditing(null)} className="px-5 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
                  <button onClick={() => { 
                    if (editing.price === '' as any || isNaN(editing.price) || editing.price < 0) {
                      setModalConfig({
                        isOpen: true,
                        title: "Invalid Input",
                        message: "Please enter a valid price.",
                        confirmText: "Understood",
                        type: "warning",
                        isAlert: true
                      });
                      return;
                    }
                    onUpdate(items.some(i => i.id === editing.id) ? items.map(i => i.id === editing.id ? editing : i) : [...items, editing]); 
                    setEditing(null); 
                  }} className="px-8 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95">Save Item</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
        isAlert={modalConfig.isAlert}
      />
    </div>
  );
};


