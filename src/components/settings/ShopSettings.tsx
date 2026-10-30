import { useState } from 'react';
import { ShopItem } from '../../types';
import { Plus, Trash2, Edit2, Coins, ShoppingBag } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ShopItemEditorModal } from '../shop/ShopItemEditorModal';

// Helper to convert VAPID key


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

      {items.length === 0 ? (
        <div className="p-8 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-400">No Shop Items Configured</h4>
            <p className="text-xs text-slate-500 mt-1">Click &quot;Add Item&quot; above to stock your merchant shop with custom rewards.</p>
          </div>
        </div>
      ) : (
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
                  <h4 className={cn("font-bold tracking-tight", item.name?.trim() ? "text-white" : "text-slate-500 italic pr-1")}>
                    {item.name?.trim() || 'Unnamed Item'}
                  </h4>
                  <p className={cn("text-xs mt-1 line-clamp-1", item.description?.trim() ? "text-slate-500" : "text-slate-600 italic pr-1")}>
                    {item.description?.trim() || 'No description provided.'}
                  </p>
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
                      message: `Are you sure you want to delete item "${item.name || 'Unnamed Item'}"?`,
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
      )}

      {editing && (
        <ShopItemEditorModal
          item={editing}
          isNew={!items.some(i => i.id === editing.id)}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            onUpdate(items.some(i => i.id === next.id) ? items.map(i => i.id === next.id ? next : i) : [...items, next]);
            setEditing(null);
          }}
        />
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


