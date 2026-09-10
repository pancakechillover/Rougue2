import React, { useState, useMemo } from 'react';
import { 
  Target, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  CheckCircle2, 
  Flame, 
  Search,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { Dungeon, MajorDungeon } from '../../types';
import { cn, getDungeonHierarchyStats } from '../../lib/utils';

interface ExpeditionTreePickerProps {
  dungeons: Dungeon[];
  majorDungeons?: MajorDungeon[];
  onSelect: (dungeon: { id: string; name: string; parentName?: string; depth?: number }) => void;
  onClose?: () => void;
  className?: string;
  selectedId?: string;
  includeCompleted?: boolean;
  allowFreeStudy?: boolean;
}

export const ExpeditionTreePicker: React.FC<ExpeditionTreePickerProps> = ({
  dungeons,
  majorDungeons = [],
  onSelect,
  onClose,
  className,
  selectedId,
  includeCompleted = false,
  allowFreeStudy = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'active'>(includeCompleted ? 'all' : 'active');

  // Filter dungeons based on status and mode
  const activeDungeons = useMemo(() => {
    return dungeons.filter(d => {
      if (d.status === 'archived') return false;
      if (!includeCompleted || filterMode === 'active') {
        return d.status !== 'completed';
      }
      return true;
    });
  }, [dungeons, includeCompleted, filterMode]);

  const activeMajors = useMemo(() => {
    return majorDungeons.filter(m => {
      if (m.status === 'archived') return false;
      if (!includeCompleted || filterMode === 'active') {
        return m.status !== 'completed';
      }
      return true;
    });
  }, [majorDungeons, includeCompleted, filterMode]);

  // Expand all by default when loaded or searching
  React.useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    activeMajors.forEach(m => { initialExpanded[m.id] = true; });
    activeDungeons.forEach(d => { initialExpanded[d.id] = true; });
    setExpandedNodes(initialExpanded);
  }, [activeMajors, activeDungeons]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to get child dungeons recursively
  const getSubTiers = (parentId: string): Dungeon[] => {
    return activeDungeons.filter(d => d.parentId === parentId);
  };

  // Calculate sub-dungeon depth for Tier numbering
  const getDepth = (subId: string): number => {
    let current = activeDungeons.find(d => d.id === subId);
    if (!current) return 1;
    let depth = 1;
    while (current && current.parentId) {
      const parent = activeDungeons.find(d => d.id === current.parentId);
      if (parent) {
        depth++;
        current = parent;
      } else {
        break;
      }
    }
    return depth;
  };

  // Check if a node or its children matches search
  const matchesSearch = (item: { id: string; name: string; description?: string }): boolean => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (item.name.toLowerCase().includes(term) || (item.description && item.description.toLowerCase().includes(term))) {
      return true;
    }
    // Check if any descendants match
    const children = getSubTiers(item.id);
    return children.some(child => matchesSearch(child));
  };

  // Render a Sub-Dungeon (Tier) recursively
  const renderTier = (tier: Dungeon, parentName: string, depthLevel: number) => {
    const children = getSubTiers(tier.id);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedNodes[tier.id] || searchTerm.trim().length > 0;
    const isMatched = !searchTerm.trim() || tier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const tierDepth = getDepth(tier.id);

    if (searchTerm.trim() && !matchesSearch(tier)) {
      return null;
    }

    const isSelected = selectedId === tier.id;
    const isCompleted = tier.status === 'completed';

    return (
      <div key={tier.id} className="space-y-1">
        <div 
          className={cn(
            "group flex items-center justify-between gap-1.5 py-1.5 px-2 rounded-xl transition-all cursor-pointer select-none border",
            isSelected 
              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200" 
              : "hover:bg-indigo-500/15 hover:border-indigo-500/30 border-transparent text-slate-300 hover:text-white"
          )}
          style={{ paddingLeft: `${Math.max(8, depthLevel * 14)}px` }}
          onClick={() => {
            onSelect({ id: tier.id, name: tier.name, parentName, depth: tierDepth });
            if (onClose) onClose();
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button 
                type="button"
                onClick={(e) => toggleExpand(tier.id, e)}
                className="w-4 h-4 rounded hover:bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <div className="w-4 flex items-center justify-center shrink-0">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  isSelected ? "bg-indigo-400" : (isCompleted ? "bg-emerald-400" : "bg-slate-600 group-hover:bg-indigo-400")
                )} />
              </div>
            )}

            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors shrink-0 uppercase tracking-wider",
                isSelected ? "bg-indigo-500/30 text-indigo-300" : "bg-slate-800 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300"
              )}>
                Tier {tierDepth}
              </span>
              <span className="text-xs font-semibold truncate">
                {tier.name}
              </span>
              {isCompleted && (
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0 uppercase tracking-wider">
                  Completed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono pr-1">
            {isSelected && (
              <span className="text-indigo-400 flex items-center gap-0.5 font-bold mr-1">
                <Check size={12} />
              </span>
            )}
            {(() => {
              const stats = getDungeonHierarchyStats(tier.id, dungeons, 25);
              if (stats.isOpenEnded) {
                return (
                  <span className={stats.hasChildren ? "text-indigo-400/90" : "text-slate-500 group-hover:text-indigo-300"}>
                    {Math.round(stats.completedMinutes)}m
                  </span>
                );
              }
              const displayCompleted = Math.round(stats.completedSessions);
              const displayTotal = Math.round(stats.totalSessions);
              return (
                <span className={stats.hasChildren ? "text-indigo-300/90" : "text-slate-500 group-hover:text-indigo-300"}>
                  {displayCompleted}/{displayTotal}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Children tiers */}
        {hasChildren && isExpanded && (
          <div className="space-y-1 border-l border-slate-800/80 ml-3 pl-1">
            {children.map(child => renderTier(child, tier.name, depthLevel + 1))}
          </div>
        )}
      </div>
    );
  };

  // Find standalone sub-dungeons that don't belong to any major
  const standaloneDungeons = activeDungeons.filter(d => !d.parentId || !majorDungeons.some(m => m.id === d.parentId) && !dungeons.some(p => p.id === d.parentId));

  const totalItemCount = activeMajors.length + activeDungeons.length + (allowFreeStudy ? 1 : 0);

  return (
    <div className={cn("bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50", className)}>
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-indigo-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select from Expedition</span>
          </div>
          <div className="flex items-center gap-2">
            {includeCompleted && (
              <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={cn(
                    "px-2 py-0.5 rounded font-semibold transition-all",
                    filterMode === 'all' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('active')}
                  className={cn(
                    "px-2 py-0.5 rounded font-semibold transition-all",
                    filterMode === 'active' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Active
                </button>
              </div>
            )}
            <span className="text-[10px] font-mono text-slate-500 font-medium">
              {activeDungeons.length} {includeCompleted && filterMode === 'all' ? 'Tiers' : 'Active'}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-0.5"
                title="Close"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search expedition or tier..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            autoFocus
          />
        </div>
      </div>

      {/* Content List */}
      <div className="p-2 overflow-y-auto max-h-72 custom-scrollbar space-y-2">
        {/* Free Study Option */}
        {allowFreeStudy && (!searchTerm.trim() || 'free study'.includes(searchTerm.toLowerCase())) && (
          <div 
            className={cn(
              "group flex items-center justify-between gap-1.5 py-1.5 px-2 rounded-xl transition-all cursor-pointer select-none border",
              selectedId === 'free_study'
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "hover:bg-amber-500/10 hover:border-amber-500/20 border-transparent text-slate-300 hover:text-white"
            )}
            onClick={() => {
              onSelect({ id: 'free_study', name: 'Free Study', depth: 0 });
              if (onClose) onClose();
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-4 flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-amber-400" />
              </div>
              <span className="text-xs font-semibold">Free Study</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedId === 'free_study' && (
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                  <Check size={12} />
                  Current
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-mono">No Tier</span>
            </div>
          </div>
        )}

        {totalItemCount === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <Target size={24} className="text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 font-medium">No active expeditions found</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Create an expedition in the Dungeons tab</p>
          </div>
        ) : (
          <>
            {/* Major Expeditions and their tiers */}
            {activeMajors.map(major => {
              const rootTiers = activeDungeons.filter(d => d.parentId === major.id);
              const isExpanded = !!expandedNodes[major.id] || searchTerm.trim().length > 0;
              const hasTiers = rootTiers.length > 0;
              const isSelected = selectedId === major.id;
              const isCompleted = major.status === 'completed';

              if (searchTerm.trim() && !matchesSearch(major)) {
                return null;
              }

              return (
                <div key={major.id} className={cn(
                  "border rounded-xl p-1.5 space-y-1 transition-colors",
                  isSelected ? "border-indigo-500/40 bg-indigo-950/20" : "border-slate-800/80 bg-slate-950/30"
                )}>
                  <div 
                    className={cn(
                      "group flex items-center justify-between gap-1.5 py-1 px-2 rounded-lg transition-colors cursor-pointer select-none",
                      isSelected ? "bg-indigo-500/20 text-white" : "hover:bg-slate-800/80 text-slate-200"
                    )}
                    onClick={(e) => {
                      if (hasTiers) {
                        toggleExpand(major.id, e);
                      } else {
                        // Allow picking major if no tiers
                        onSelect({ id: major.id, name: major.name, depth: 0 });
                        if (onClose) onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {hasTiers ? (
                        <button 
                          type="button"
                          onClick={(e) => toggleExpand(major.id, e)}
                          className="w-4 h-4 rounded hover:bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                        >
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      ) : (
                        <Target size={13} className="text-indigo-400 shrink-0" />
                      )}
                      
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/90 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">
                        GOAL
                      </span>
                      <span className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                        {major.name}
                      </span>
                      {isCompleted && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0 uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasTiers && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect({ id: major.id, name: major.name, depth: 0 });
                            if (onClose) onClose();
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800/80 hover:bg-indigo-600 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
                          title={`Select ${major.name}`}
                        >
                          Select
                        </button>
                      )}
                      {isSelected && (
                        <span className="text-indigo-400 flex items-center">
                          <Check size={12} />
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium shrink-0">
                        {rootTiers.length} {rootTiers.length === 1 ? 'Tier' : 'Tiers'}
                      </span>
                    </div>
                  </div>

                  {/* Root Tiers list */}
                  {hasTiers && isExpanded && (
                    <div className="space-y-1 pt-1 border-t border-slate-800/50">
                      {rootTiers.map(tier => renderTier(tier, major.name, 1))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Standalone Tiers / Expeditions without major */}
            {standaloneDungeons.length > 0 && (
              <div className="border border-slate-800/80 bg-slate-950/20 rounded-xl p-1.5 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Other Tasks
                </div>
                {standaloneDungeons.map(d => renderTier(d, 'General', 0))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
