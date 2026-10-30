import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShopItem } from '../../types';
import { ShoppingBag, Coins } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/utils';
import { SpinnerInput } from '../common/SpinnerInput';
import { ConfirmModal } from '../modals/ConfirmModal';

/**
 * The shop-item editor.
 *
 * It lives in its own file because two places open it: the merchant settings
 * page, and the "+ Stock" button on an empty shelf slot out in the shop. The
 * shelf button used to send you to Settings → Merchant and leave you to find
 * the right page; now it opens this directly, so both entry points must render
 * the same dialog.
 */
interface ShopItemEditorModalProps {
  /** The draft being edited. The caller owns it so Cancel can just drop it. */
  item: ShopItem;
  /** Drives the title: "Add New Item" versus "Edit Shop Item". */
  isNew?: boolean;
  onChange: (item: ShopItem) => void;
  onSave: (item: ShopItem) => void;
  onClose: () => void;
}

const ICON_CHOICES = [
  // Essentials
  'ShoppingBag', 'Gift', 'Package', 'Ticket', 'Key', 'Coins', 'Gem', 'Trophy', 'Medal', 'Award', 'Target', 'Star', 'Heart',
  // Food & Drink
  'Apple', 'Citrus', 'Pizza', 'Cookie', 'IceCream', 'Cake', 'Coffee', 'Beer', 'Wine', 'GlassWater',
  // Nature
  'Flame', 'Zap', 'Sparkles', 'Flower', 'Flower2', 'Sprout', 'Leaf', 'Trees', 'Sun', 'Moon', 'Cloud', 'Sunrise',
  // Travel & Adventure
  'Car', 'Bike', 'Plane', 'Rocket', 'Ship', 'Compass', 'Map', 'Anchor',
  // Hobbies & Tech
  'Gamepad2', 'Headphones', 'Camera', 'Music', 'Monitor', 'Smartphone', 'Tv', 'Dumbbell', 'Palette', 'Sword', 'Book', 'BookOpen', 'Library', 'History',
];

export const ShopItemEditorModal: React.FC<ShopItemEditorModalProps> = ({
  item,
  isNew = false,
  onChange,
  onSave,
  onClose,
}) => {
  const [showPriceWarning, setShowPriceWarning] = useState(false);

  const handleSave = () => {
    if (item.price === '' as unknown || isNaN(Number(item.price)) || Number(item.price) < 0) {
      setShowPriceWarning(true);
      return;
    }
    onSave(item);
  };

  return createPortal(
    <AnimatePresence>
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
                {isNew ? 'Add New Item' : 'Edit Shop Item'}
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
                    <input type="text" placeholder="e.g. Ancient Relic" value={item.name || ''} onChange={e => onChange({ ...item, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Price</label>
                      <div className="relative">
                        <SpinnerInput
                          placeholder="Price"
                          value={item.price === undefined || item.price === null ? '' : item.price}
                          onChange={(val) => onChange({ ...item, price: typeof val === 'number' ? val : ('' as any) })}
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
                        value={item.stock === undefined ? -1 : item.stock}
                        onChange={(val) => onChange({ ...item, stock: typeof val === 'number' ? val : -1 })}
                        className="focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                    <textarea placeholder="What does this item do?..." value={item.description || ''} onChange={e => onChange({ ...item, description: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm flex-1 min-h-[160px] resize-none focus:border-amber-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col h-full">
                <div className="space-y-2 flex flex-col flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center justify-between shrink-0">
                    <span>Visual Identifier (Icon)</span>
                    <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">{item.icon || 'ShoppingBag'}</span>
                  </label>
                  <div className="flex-1 grid grid-cols-6 gap-3 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 min-h-[200px]">
                    {ICON_CHOICES.map(iconName => {
                      const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.ShoppingBag;
                      const isSelected = (item.icon || 'ShoppingBag') === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => onChange({ ...item, icon: iconName })}
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
            <button onClick={onClose} className="px-5 py-2.5 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95">Save Item</button>
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={showPriceWarning}
        onClose={() => setShowPriceWarning(false)}
        onConfirm={() => setShowPriceWarning(false)}
        title="Invalid Input"
        message="Please enter a valid price."
        confirmText="Understood"
        type="warning"
        isAlert
      />
    </AnimatePresence>,
    document.body
  );
};
