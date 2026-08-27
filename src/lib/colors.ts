export interface RarityColor {
  id: string;
  name: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  value?: number;
}

export const RARITY_COLORS: RarityColor[] = [
  { id: 'slate', name: 'Common', textClass: 'text-slate-400', borderClass: 'border-slate-400/20', bgClass: 'bg-slate-400/10', value: 1 },
  { id: 'emerald', name: 'Uncommon', textClass: 'text-emerald-400', borderClass: 'border-emerald-400/20', bgClass: 'bg-emerald-400/10', value: 2 },
  { id: 'blue', name: 'Rare', textClass: 'text-blue-400', borderClass: 'border-blue-400/20', bgClass: 'bg-blue-400/10', value: 3 },
  { id: 'purple', name: 'Epic', textClass: 'text-purple-400', borderClass: 'border-purple-400/20', bgClass: 'bg-purple-400/10', value: 4 },
  { id: 'amber', name: 'Legendary', textClass: 'text-amber-400', borderClass: 'border-amber-400/20', bgClass: 'bg-amber-400/10', value: 5 },
  { id: 'rose', name: 'Mythic', textClass: 'text-rose-400', borderClass: 'border-rose-400/20', bgClass: 'bg-rose-400/10', value: 6 },
];

export const getColorClass = (colorId?: string) => {
  const color = RARITY_COLORS.find(c => c.id === colorId);
  if (color) return { textClass: color.textClass, borderClass: color.borderClass, bgClass: color.bgClass };
  return { textClass: 'text-slate-400', borderClass: 'border-slate-400/20', bgClass: 'bg-slate-400/10' };
};
