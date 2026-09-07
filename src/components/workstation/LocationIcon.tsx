import React from 'react';
import { 
  Home, 
  Building2, 
  BookOpen, 
  Coffee, 
  Laptop, 
  Briefcase, 
  GraduationCap, 
  Trees, 
  Sparkles, 
  Compass, 
  Atom,
  MapPin,
  LucideIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LocationIconOption {
  id: string;
  name: string;
  Icon: LucideIcon;
  colorClass: string;
}

export const LOCATION_ICON_OPTIONS: LocationIconOption[] = [
  { id: 'home', name: 'Home / Room', Icon: Home, colorClass: 'text-amber-500' },
  { id: 'building', name: 'Lab / Office', Icon: Building2, colorClass: 'text-indigo-400' },
  { id: 'book', name: 'Library / Study', Icon: BookOpen, colorClass: 'text-emerald-400' },
  { id: 'coffee', name: 'Cafe / Break', Icon: Coffee, colorClass: 'text-orange-400' },
  { id: 'laptop', name: 'Tech / Desk', Icon: Laptop, colorClass: 'text-sky-400' },
  { id: 'briefcase', name: 'Work / Business', Icon: Briefcase, colorClass: 'text-purple-400' },
  { id: 'graduation-cap', name: 'Campus / School', Icon: GraduationCap, colorClass: 'text-rose-400' },
  { id: 'trees', name: 'Park / Outdoor', Icon: Trees, colorClass: 'text-emerald-500' },
  { id: 'sparkles', name: 'Focus / Quiet', Icon: Sparkles, colorClass: 'text-amber-400' },
  { id: 'compass', name: 'Base / Studio', Icon: Compass, colorClass: 'text-teal-400' },
  { id: 'atom', name: 'Science / Research', Icon: Atom, colorClass: 'text-cyan-400' },
  { id: 'map-pin', name: 'General / Other', Icon: MapPin, colorClass: 'text-slate-400' },
];

export function resolveLocationIconOption(locName?: string, customIcons?: Record<string, string>): LocationIconOption {
  if (locName && customIcons && customIcons[locName]) {
    const iconId = customIcons[locName];
    const found = LOCATION_ICON_OPTIONS.find(opt => opt.id === iconId);
    if (found) return found;
  }

  const lower = (locName || '').toLowerCase().trim();
  if (lower.includes('home') || lower.includes('house') || lower.includes('dorm') || lower.includes('room')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'home')!;
  }
  if (lower.includes('lab') || lower.includes('office') || lower.includes('desk') || lower.includes('work') || lower.includes('building')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'building')!;
  }
  if (lower.includes('lib') || lower.includes('study') || lower.includes('book') || lower.includes('read')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'book')!;
  }
  if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('tea') || lower.includes('bar')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'coffee')!;
  }
  if (lower.includes('laptop') || lower.includes('code') || lower.includes('tech') || lower.includes('pc') || lower.includes('mac')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'laptop')!;
  }
  if (lower.includes('job') || lower.includes('business') || lower.includes('firm') || lower.includes('corp')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'briefcase')!;
  }
  if (lower.includes('school') || lower.includes('campus') || lower.includes('univ') || lower.includes('class') || lower.includes('acad')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'graduation-cap')!;
  }
  if (lower.includes('park') || lower.includes('tree') || lower.includes('nature') || lower.includes('garden') || lower.includes('outdoor')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'trees')!;
  }
  if (lower.includes('zen') || lower.includes('quiet') || lower.includes('star') || lower.includes('sparkle') || lower.includes('meditat')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'sparkles')!;
  }
  if (lower.includes('studio') || lower.includes('base') || lower.includes('compass')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'compass')!;
  }
  if (lower.includes('atom') || lower.includes('physic') || lower.includes('chem') || lower.includes('science') || lower.includes('research')) {
    return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'atom')!;
  }

  return LOCATION_ICON_OPTIONS.find(opt => opt.id === 'map-pin')!;
}

interface LocationIconProps {
  locName?: string;
  iconId?: string;
  customIcons?: Record<string, string>;
  size?: number;
  className?: string;
}

export const LocationIcon: React.FC<LocationIconProps> = ({
  locName,
  iconId,
  customIcons,
  size = 14,
  className
}) => {
  let option: LocationIconOption | undefined;
  if (iconId) {
    option = LOCATION_ICON_OPTIONS.find(opt => opt.id === iconId);
  }
  if (!option) {
    option = resolveLocationIconOption(locName, customIcons);
  }

  const { Icon, colorClass } = option;
  return <Icon size={size} className={cn(colorClass, 'shrink-0', className)} />;
};

interface LocationIconPickerProps {
  selectedIconId: string;
  onSelectIcon: (iconId: string) => void;
  className?: string;
}

export const LocationIconPicker: React.FC<LocationIconPickerProps> = ({
  selectedIconId,
  onSelectIcon,
  className
}) => {
  return (
    <div className={cn("grid grid-cols-6 sm:grid-cols-12 gap-1.5 p-1.5 rounded-xl border border-slate-700/60 bg-slate-950/40 justify-items-center", className)}>
      {LOCATION_ICON_OPTIONS.map(opt => {
        const isSelected = selectedIconId === opt.id;
        const { Icon, colorClass } = opt;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectIcon(opt.id)}
            title={opt.name}
            className={cn(
              "w-7.5 h-7.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer",
              isSelected
                ? "bg-slate-800 border-indigo-500 shadow-sm scale-105 ring-1 ring-indigo-500/50"
                : "bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700/80 opacity-70 hover:opacity-100"
            )}
          >
            <Icon size={14} className={cn(colorClass, "shrink-0")} />
          </button>
        );
      })}
    </div>
  );
};
