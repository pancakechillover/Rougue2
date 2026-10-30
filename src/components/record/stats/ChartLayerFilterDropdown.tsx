import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { rafThrottle } from '../../../lib/timing';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Zap, 
  Brain, 
  Wind, 
  Check, 
  Activity,
  Sparkles,
  SlidersHorizontal,
  CalendarRange,
  Tags
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ChartLayerSelection, Tag } from '../../../types';
import { TagBadge } from '../../common/TagBadge';

interface ChartLayerFilterDropdownProps {
  layers: ChartLayerSelection;
  onChange: (newLayers: ChartLayerSelection) => void;
  weekMode?: 'calendar' | 'rolling';
  onWeekModeChange?: (mode: 'calendar' | 'rolling') => void;
  tags?: Tag[];
  selectedTagIds?: string[];
  onSelectedTagIdsChange?: (ids: string[]) => void;
  title?: string;
  className?: string;
}

export const DEFAULT_CHART_LAYERS: ChartLayerSelection = {
  time: true,
  totalDistractions: false,
  internal: true,
  external: true,
  unavoidable: true,
};

export const ChartLayerFilterDropdown: React.FC<ChartLayerFilterDropdownProps> = ({
  layers,
  onChange,
  weekMode,
  onWeekModeChange,
  tags = [],
  selectedTagIds = [],
  onSelectedTagIdsChange,
  title = "Display Layers",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(280, document.documentElement.clientWidth - 24);

    // Initial left alignment with button
    let left = rect.left;

    // Check right viewport boundary
    if (left + popoverWidth > document.documentElement.clientWidth - 12) {
      left = document.documentElement.clientWidth - 12 - popoverWidth;
    }
    // Check left viewport boundary (e.g. adjacent to sidebar)
    if (left < 12) {
      left = 12;
    }

    // Vertical positioning: default below button
    let top = rect.bottom + 6;
    const estimatedHeight = weekMode && onWeekModeChange ? 410 : 350;
    // Flip upward if overflowing bottom viewport and enough space on top
    if (top + estimatedHeight > document.documentElement.clientHeight - 12 && rect.top > estimatedHeight + 12) {
      top = rect.top - estimatedHeight - 6;
    }

    setPopoverPos({ top, left });
  }, [weekMode, onWeekModeChange]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close when clicking outside and update position on window scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Coalesce a scroll/resize burst into one measure per frame.
    const handleScrollOrResize = rafThrottle(() => {
      calculatePosition();
    });

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      handleScrollOrResize.cancel();
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, calculatePosition]);

  const toggleLayer = (key: keyof ChartLayerSelection) => {
    const next = { ...layers, [key]: !layers[key] };
    // Ensure at least one item remains selected
    const hasAny = Object.values(next).some(Boolean);
    if (!hasAny) {
      next[key] = true;
    }
    onChange(next);
  };

  const setPreset = (preset: 'all' | 'timeOnly' | 'totalOnly' | 'breakdownOnly' | 'both') => {
    switch (preset) {
      case 'all':
        onChange({ time: true, totalDistractions: true, internal: true, external: true, unavoidable: true });
        break;
      case 'timeOnly':
        onChange({ time: true, totalDistractions: false, internal: false, external: false, unavoidable: false });
        break;
      case 'totalOnly':
        onChange({ time: false, totalDistractions: true, internal: false, external: false, unavoidable: false });
        break;
      case 'breakdownOnly':
        onChange({ time: false, totalDistractions: false, internal: true, external: true, unavoidable: true });
        break;
      case 'both':
        onChange({ time: true, totalDistractions: false, internal: true, external: true, unavoidable: true });
        break;
    }
  };

  // Compute readable badge summary
  const getButtonLabel = () => {
    const { time, totalDistractions, internal, external, unavoidable } = layers;
    const breakdownCount = (internal ? 1 : 0) + (external ? 1 : 0) + (unavoidable ? 1 : 0);
    const hasBreakdownAll = internal && external && unavoidable;
    
    if (time && totalDistractions && hasBreakdownAll) return 'All';
    if (time && hasBreakdownAll && !totalDistractions) return 'Both';
    if (time && !totalDistractions && breakdownCount === 0) return 'Time';
    if (!time && totalDistractions && breakdownCount === 0) return 'Total Dist.';
    if (!time && !totalDistractions && hasBreakdownAll) return 'Breakdown';
    if (time && totalDistractions && breakdownCount === 0) return 'Time + Total';
    if (time && breakdownCount === 1 && !totalDistractions) {
      if (internal) return 'Time + Int.';
      if (external) return 'Time + Ext.';
      if (unavoidable) return 'Time + Unav.';
    }
    if (!time && breakdownCount === 1 && !totalDistractions) {
      if (internal) return 'Internal';
      if (external) return 'External';
      if (unavoidable) return 'Unavoidable';
    }

    const activeTotal = (time ? 1 : 0) + (totalDistractions ? 1 : 0) + breakdownCount;
    return `Custom (${activeTotal})`;
  };

  const options: {
    key: keyof ChartLayerSelection;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }[] = [
    {
      key: 'time',
      label: 'Focus Time',
      sublabel: 'Time duration bar chart',
      icon: Clock,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/30'
    },
    {
      key: 'totalDistractions',
      label: 'Total Distractions',
      sublabel: 'Aggregate distraction line',
      icon: Activity,
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-500/10',
      borderClass: 'border-rose-500/30'
    },
    {
      key: 'internal',
      label: 'Internal Distraction',
      sublabel: 'Mind wandering, daydreaming',
      icon: Brain,
      colorClass: 'text-indigo-400',
      bgClass: 'bg-indigo-500/10',
      borderClass: 'border-indigo-500/30'
    },
    {
      key: 'external',
      label: 'External Distraction',
      sublabel: 'Noise, notifications, social',
      icon: Wind,
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/10',
      borderClass: 'border-orange-500/30'
    },
    {
      key: 'unavoidable',
      label: 'Unavoidable Distraction',
      sublabel: 'Emergencies, urgent calls',
      icon: Zap,
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/30'
    }
  ];

  const modePrefix = weekMode
    ? weekMode === 'calendar'
      ? 'Natural · '
      : 'Last 7d · '
    : '';

  return (
    <div className={cn("relative inline-block text-left", className)}>
      {/* Custom Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        className={cn(
          "p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center cursor-pointer group select-none relative",
          (isOpen || selectedTagIds.length > 0) && "bg-slate-700 text-indigo-400"
        )}
        title={`${title}: ${modePrefix}${getButtonLabel()}${selectedTagIds.length > 0 ? ` (${selectedTagIds.length} tag filter)` : ''}`}
        aria-label={title}
        aria-expanded={isOpen}
      >
        <SlidersHorizontal
          size={14}
          className="shrink-0 transition-colors"
        />
        {selectedTagIds.length > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500 border border-slate-900" />
        )}
      </button>

      {/* Portaled Custom Dropdown Popover */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && popoverPos && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                zIndex: 99999,
              }}
              className="w-[260px] sm:w-[280px] max-w-[calc(100vw-24px)] bg-slate-900/95 backdrop-blur-md border border-slate-700/70 shadow-2xl shadow-indigo-950/50 rounded-xl p-3 flex flex-col gap-2.5 box-border"
            >
              {/* Optional Week Mode Section */}
              {weekMode && onWeekModeChange && (
                <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <CalendarRange size={12} className="text-indigo-400" />
                      <span>Week Mode</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tight">
                      Window
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onWeekModeChange('calendar')}
                      className={cn(
                        "py-1 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                        weekMode === 'calendar'
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      )}
                    >
                      Natural Week
                    </button>
                    <button
                      type="button"
                      onClick={() => onWeekModeChange('rolling')}
                      className={cn(
                        "py-1 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                        weekMode === 'rolling'
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      )}
                    >
                      Last 7 Days
                    </button>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-indigo-400" />
                  <span>Display Layers</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tight">
                  Multi-Select
                </span>
              </div>

              {/* Presets Row */}
              <div className="grid grid-cols-4 gap-1 pb-1">
                <button
                  type="button"
                  onClick={() => setPreset('both')}
                  className="px-1.5 py-1 text-[9px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-center truncate cursor-pointer"
                  title="Time + Distraction Breakdown"
                >
                  Both
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('timeOnly')}
                  className="px-1.5 py-1 text-[9px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-center truncate cursor-pointer"
                  title="Focus Time Bar Only"
                >
                  Time
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('totalOnly')}
                  className="px-1.5 py-1 text-[9px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-center truncate cursor-pointer"
                  title="Total Distraction Line Only"
                >
                  Total
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('all')}
                  className="px-1.5 py-1 text-[9px] font-bold rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors text-center truncate border border-indigo-500/30 cursor-pointer"
                  title="Select All Layers"
                >
                  All
                </button>
              </div>

              {/* Checkbox Items */}
              <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-0.5 custom-scrollbar">
                {options.map((opt) => {
                  const isSelected = !!layers[opt.key];
                  const Icon = opt.icon;

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleLayer(opt.key)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left cursor-pointer group select-none",
                        isSelected 
                          ? "bg-slate-800/90 border-slate-600/80 shadow-sm" 
                          : "bg-slate-900/40 hover:bg-slate-800/50 border-slate-800 text-slate-400"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors",
                          opt.bgClass,
                          opt.borderClass
                        )}>
                          <Icon size={13} className={opt.colorClass} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-xs font-bold leading-snug truncate",
                            isSelected ? "text-slate-100" : "text-slate-400 group-hover:text-slate-300"
                          )}>
                            {opt.label}
                          </span>
                          <span className="text-[9px] text-slate-500 leading-none truncate">
                            {opt.sublabel}
                          </span>
                        </div>
                      </div>

                      {/* Checkbox indicator */}
                      <div className={cn(
                        "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ml-2",
                        isSelected 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : "border-slate-700 bg-slate-800/60 group-hover:border-slate-600"
                      )}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optional Tag Filter Section */}
              {onSelectedTagIdsChange && tags.filter(t => !t.archived).length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Tags size={12} className="text-indigo-400" />
                      <span>Filter by Tag</span>
                    </span>
                    {selectedTagIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onSelectedTagIdsChange([])}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase"
                      >
                        Reset ({selectedTagIds.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-0.5">
                    {tags.filter(t => !t.archived).map(tag => {
                      const isTagSelected = selectedTagIds.includes(tag.id);
                      return (
                        <TagBadge
                          key={tag.id}
                          tag={tag}
                          size="xs"
                          selected={isTagSelected}
                          onClick={() => {
                            const next = isTagSelected
                              ? selectedTagIds.filter(id => id !== tag.id)
                              : [...selectedTagIds, tag.id];
                            onSelectedTagIdsChange(next);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Tip */}
              <div className="text-[9px] text-slate-500 text-center pt-1 border-t border-slate-800/60">
                Toggle any layers to customize chart view
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
