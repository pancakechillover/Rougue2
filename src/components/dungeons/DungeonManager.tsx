import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Dungeon, MajorDungeon, DungeonReward, Tag, TagColor } from '../../types';
import { Plus, Target, Sword, CheckCircle2, ChevronRight, Trash2, ChevronDown, Gift, X, Edit2, Coins, Zap, Trophy, Square, CheckSquare, Archive, Search, Calendar, GripVertical, Scroll, RefreshCcw, ArrowUp, ArrowDown, ArrowUpToLine, Tags, FolderInput } from 'lucide-react';
import { RowActionsMenu } from './RowActionsMenu';
import { cn, getDungeonHierarchyStats, getTierProgressColor } from '../../lib/utils';
import { SpinnerInput } from '../common/SpinnerInput';
import { ConfirmModal } from '../modals/ConfirmModal';
import { PresetControl, getAutoLoadedPreset } from '../dashboard/PresetControl';
import { DatePicker } from '../common/DatePicker';
import { TagBadge, TagPicker } from '../common/TagBadge';
import { getInheritedTagIds, getEffectiveDungeonTagIds, canMoveSubDungeonToParent, generateTagId } from '../../lib/tags';
import { format } from 'date-fns';

const DraggableItem = ({ item, isEditMode, children, className, handleClassName, _onMove: __onMove, onDragStart }: any) => {
  const controls = useDragControls();
  return (
    <Reorder.Item 
      value={item} 
      dragListener={false} 
      dragControls={controls} 
      className={className}
      layout
      whileDrag={{ 
        scale: 1.02, 
        backgroundColor: "rgba(30, 41, 59, 0.4)",
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        zIndex: 100
      }}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={() => {
        // Parent/child transfer functionality has been disabled
      }}
    >
      <div className="flex items-start w-full gap-2">
        {isEditMode && (
          <div 
            className={cn("cursor-grab active:cursor-grabbing touch-none select-none p-1.5 flex items-center justify-center shrink-0 text-slate-500 hover:text-white transition-colors z-20 pointer-events-auto mt-1", handleClassName)}
            onPointerDown={(e) => {
              // Unconditionally — with a mouse, the browser's default action on
              // pointerdown is to start a text selection, which is what made
              // dragging feel broken. Touch needs it blocked for a different
              // reason: otherwise the page scrolls instead of dragging.
              e.preventDefault();
              onDragStart?.();
              controls.start(e);
            }}
          >
            <GripVertical size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </Reorder.Item>
  );
};

interface ParentHierarchyOption {
  id: string;
  name: string;
  parentType: 'Goal' | 'Tier 1' | 'Tier 2';
  resultingTier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  depth: number;
  label: string;
}

const HierarchyParentPicker: React.FC<{
  value: string;
  options: ParentHierarchyOption[];
  onChange: (parentId: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, options, onChange, placeholder = 'Select destination Goal or Tier...', className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => o.id === value);
  const filteredOptions = search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  // The tint carries the level, the glyphs stay neutral. Coloured text at the
  // 300/400 step only reads against a dark background: indigo-300 on a 20%
  // indigo wash is fine in the dark themes and nearly invisible in daylight,
  // where the wash lands on a near-white page. slate-200 is inverted by the
  // theme, so it is the one value that stays legible in both.
  const getBadgeStyle = (depth: number) => {
    if (depth === 0) return 'bg-indigo-500/15 text-slate-200 border-indigo-500/40';
    if (depth === 1) return 'bg-sky-500/15 text-slate-200 border-sky-500/40';
    return 'bg-amber-500/15 text-slate-200 border-amber-500/40';
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) setSearch('');
        }}
        className={cn(
          "w-full bg-slate-800/90 hover:bg-slate-800 border rounded-xl px-3 h-[38px] text-left flex items-center justify-between gap-2 transition-all cursor-pointer",
          isOpen ? "border-indigo-500 ring-1 ring-indigo-500/30" : "border-slate-700 hover:border-slate-600"
        )}
      >
        {selectedOption ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={cn(
              "px-1.5 h-5 inline-flex items-center rounded text-[10px] font-black uppercase border shrink-0",
              getBadgeStyle(selectedOption.depth)
            )}>
              {selectedOption.parentType}
            </span>
            <span className="text-xs font-bold text-white truncate">
              {selectedOption.name || 'Unnamed'}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 truncate">{placeholder}</span>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption && (
            <span className="text-[10px] font-bold text-slate-200 bg-indigo-500/15 border border-indigo-500/40 px-1.5 h-5 inline-flex items-center rounded">
              → {selectedOption.resultingTier}
            </span>
          )}
          <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180 text-indigo-400")} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            {options.length > 5 && (
              <div className="p-2 border-b border-slate-800 bg-slate-950/50">
                <div className="relative flex items-center">
                  <Search size={12} className="absolute left-2.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter goals or tiers..."
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500 italic pr-1">
                  No matching destination found
                </div>
              ) : (
                filteredOptions.map(opt => {
                  const isSelected = opt.id === value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer group",
                        opt.depth === 1 && !search.trim() && "pl-6",
                        opt.depth === 2 && !search.trim() && "pl-10",
                        isSelected
                          ? "bg-indigo-500/20 text-white border border-indigo-500/40"
                          : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {opt.depth > 0 && !search.trim() && (
                          <span className="text-slate-600 font-mono text-xs shrink-0 select-none">└</span>
                        )}
                        <span className={cn(
                          "px-1.5 h-5 inline-flex items-center rounded text-[9px] font-black uppercase border shrink-0",
                          getBadgeStyle(opt.depth)
                        )}>
                          {opt.parentType}
                        </span>
                        <span className={cn(
                          "text-xs truncate",
                          isSelected ? "font-bold text-white" : "font-medium text-slate-200 group-hover:text-white"
                        )}>
                          {opt.name || 'Unnamed'}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold shrink-0 px-1.5 h-5 inline-flex items-center rounded",
                        isSelected ? "text-slate-200 bg-indigo-500/20" : "text-slate-500 group-hover:text-slate-400"
                      )}>
                        → {opt.resultingTier}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface DungeonManagerProps {
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  tags?: Tag[];
  onUpdateTags?: (tags: Tag[]) => void;
  onOpenTagManager?: () => void;
  currentDungeonId: string | null;
  standardSessionMinutes?: number;
  standardRestMinutes?: number;
  includeRestTimeInTasks?: boolean;
  isAddingMajor: boolean;
  setIsAddingMajor: (val: boolean) => void;
  onSelect: (id: string) => void;
  onCreateMajor: (name: string, description: string, rewards?: DungeonReward[], isRoutine?: boolean, routineType?: 'daily' | 'weekly' | 'monthly', deadline?: string, tags?: string[]) => void;
  onCreateSub: (dungeon: Omit<Dungeon, 'id' | 'completedSessions' | 'status'>) => void;
  onUpdateMajor: (id: string, updates: Partial<MajorDungeon>) => void;
  onUpdateSub: (id: string, updates: Partial<Dungeon>) => void;
  onDeleteMajor: (id: string) => void;
  onDeleteSub: (id: string) => void;
  _onReorderMajor: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  _onReorderSub: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onMoveItem: (itemId: string, newParentId: string | null) => void;
  onDragStart?: () => void;
  onFinalizeMajor: (id: string) => void;
  onArchiveMajor: (id: string) => void;
  onForceCompleteSub?: (id: string) => void;
  setMajorDungeons?: React.Dispatch<React.SetStateAction<MajorDungeon[]>>;
  setDungeons?: React.Dispatch<React.SetStateAction<Dungeon[]>>;
  isEditMode?: boolean;
  activeTab: 'active' | 'archive';
  timeSettings?: any;
  defaultOpenEndedDungeon?: boolean;
}

export const DungeonManager = React.memo<DungeonManagerProps>(({
  dungeons,
  majorDungeons,
  tags = [],
  onUpdateTags,
  onOpenTagManager,
  currentDungeonId,
  standardSessionMinutes = 25,
  standardRestMinutes = 5,
  includeRestTimeInTasks = false,
  defaultOpenEndedDungeon,
  isAddingMajor,
  setIsAddingMajor,
  onSelect,
  onCreateMajor,
  onCreateSub,
  onUpdateMajor,
  onUpdateSub,
  onDeleteMajor,
  onDeleteSub,
  _onReorderMajor,
  _onReorderSub,
  onMoveItem,
  onDragStart,
  setMajorDungeons,
  setDungeons,
  onFinalizeMajor,
  onArchiveMajor,
  onForceCompleteSub,
  isEditMode = false,
  activeTab,
  timeSettings
}) => {
  const [isAddingSub, setIsAddingSub] = useState<{ parentId: string } | null>(null);
  const [editingMajor, setEditingMajor] = useState<MajorDungeon | null>(null);
  const [editingSub, setEditingSub] = useState<Dungeon | null>(null);
  const [expandedMajors, setExpandedMajors] = useState<string[]>([]);
  const [expandedSubDungeons, setExpandedSubDungeons] = useState<string[]>([]);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionMode, setBatchActionMode] = useState<'none' | 'tag' | 'move'>('none');
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
  }>({ isOpen: false, title: '', message: '' });

  const [archiveSearch, setArchiveSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');

  const [newMajor, setNewMajor] = useState({ 
    name: '', 
    description: '', 
    rewards: [{ type: 'coins', amount: 100 }] as DungeonReward[],
    isRoutine: false,
    routineType: 'daily' as 'daily' | 'weekly' | 'monthly',
    deadline: undefined as string | undefined,
    tags: [] as string[]
  });
  const [newSub, setNewSub] = useState({
    name: '',
    description: '',
    totalSessions: 10,
    isOpenEnded: defaultOpenEndedDungeon || false,
    rewardCoins: 0,
    rewardXP: 0,
    rewardText: '',
    rewards: [{ type: 'coins', amount: 100 }] as DungeonReward[],
    isLongTerm: false,
    isRoutine: false,
    routineType: 'daily' as 'daily' | 'weekly' | 'monthly',
    deadline: undefined as string | undefined,
    tags: [] as string[]
  });

  React.useEffect(() => {
    if (!isEditMode) {
      setSelectedIds([]);
      setBatchActionMode('none');
    }
  }, [isEditMode]);

  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const validTags = React.useMemo(
    () => (Array.isArray(tags) ? tags : []).filter((t): t is Tag => Boolean(t && typeof t === 'object' && typeof t.id === 'string' && typeof t.name === 'string')),
    [tags]
  );

  const handleCreateNewTag = (nameOrTag: string | Tag, color: TagColor = 'indigo'): Tag => {
    const newTag: Tag =
      typeof nameOrTag === 'string'
        ? { id: generateTagId(), name: nameOrTag, color }
        : nameOrTag;
    onUpdateTags?.([...validTags, newTag]);
    return newTag;
  };

  React.useEffect(() => {
    const handleExpandMode = (e: CustomEvent<string>) => {
      const targetId = e.detail;
      if (majorDungeons.some(m => m.id === targetId)) {
        setExpandedMajors(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
      } else if (dungeons.some(d => d.id === targetId)) {
        setExpandedSubDungeons(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
      }
    };
    window.addEventListener('expandDungeon', handleExpandMode as EventListener);
    return () => window.removeEventListener('expandDungeon', handleExpandMode as EventListener);
  }, [majorDungeons, dungeons]);

  React.useEffect(() => {
    if (activeTab === 'active') {
      if (majorDungeons.length > 0) {
        setExpandedMajors(prev => {
          const allIds = majorDungeons.map(m => m.id);
          const needsUpdate = allIds.some(id => !prev.includes(id));
          if (needsUpdate) {
            return Array.from(new Set([...prev, ...allIds]));
          }
          return prev;
        });
      }
      
      if (dungeons.length > 0) {
        setExpandedSubDungeons(prev => {
          const allSubIds = dungeons.map(d => d.id);
          const needsUpdate = allSubIds.some(id => !prev.includes(id));
          if (needsUpdate) {
            return Array.from(new Set([...prev, ...allSubIds]));
          }
          return prev;
        });
      }
    }
  }, [majorDungeons, dungeons, activeTab]);

  React.useEffect(() => {
    if (isAddingMajor && !editingMajor) {
      setNewMajor({ 
        name: '', 
        description: '', 
        rewards: [{ type: 'coins', amount: 100 }],
        isRoutine: false,
        routineType: 'daily',
        deadline: undefined,
        tags: []
      });
    }
  }, [isAddingMajor, editingMajor]);

  React.useEffect(() => {
    if (isAddingMajor) {
      const preset = getAutoLoadedPreset<any>('dungeon_major');
      if (preset) {
        setNewMajor({
          name: '',
          description: preset.description || '',
          rewards: preset.rewards || [{ type: 'coins', amount: 100 }],
          isRoutine: preset.isRoutine || false,
          routineType: preset.routineType || 'daily',
          deadline: undefined,
          tags: preset.tags || []
        });
        return;
      }

      setNewMajor({
        name: '',
        description: '',
        rewards: [{ type: 'coins', amount: 100 }],
        isRoutine: false,
        routineType: 'daily',
        deadline: undefined,
        tags: []
      });
    }
  }, [isAddingMajor]);

  React.useEffect(() => {
    if (isAddingSub) {
      const preset = getAutoLoadedPreset<any>('dungeon_sub');
      if (preset) {
        setNewSub({
          name: '',
          description: preset.description || '',
          totalSessions: preset.totalSessions || 10,
          isOpenEnded: defaultOpenEndedDungeon || false,
          rewardCoins: preset.rewardCoins || 0,
          rewardXP: preset.rewardXP || 0,
          rewardText: preset.rewardText || '',
          rewards: preset.rewards || [{ type: 'coins', amount: 100 }],
          isLongTerm: preset.isLongTerm || false,
          isRoutine: preset.isRoutine || false,
          routineType: preset.routineType || 'daily',
          deadline: undefined,
          tags: preset.tags || []
        });
        return;
      }
      
      setNewSub({
        name: '',
        description: '',
        totalSessions: 10,
        isOpenEnded: defaultOpenEndedDungeon || false,
        rewardCoins: 0,
        rewardXP: 0,
        rewardText: '',
        rewards: [{ type: 'coins', amount: 100 }],
        isLongTerm: false,
        isRoutine: false,
        routineType: 'daily',
        deadline: undefined,
        tags: []
      });
    }
  }, [isAddingSub]);

  const addReward = (isMajor: boolean = false) => {
    if (isMajor) {
      if (editingMajor) {
        setEditingMajor({ ...editingMajor, rewards: [...(editingMajor.rewards || []), { type: 'coins', amount: 1 }] });
      } else {
        setNewMajor({ ...newMajor, rewards: [...newMajor.rewards, { type: 'coins', amount: 1 }] });
      }
    } else {
      if (editingSub) {
        setEditingSub({ ...editingSub, rewards: [...(editingSub.rewards || []), { type: 'coins', amount: 1 }] });
      } else {
        setNewSub({ ...newSub, rewards: [...newSub.rewards, { type: 'coins', amount: 1 }] });
      }
    }
  };

  const removeReward = (index: number, isMajor: boolean = false) => {
    if (isMajor) {
      if (editingMajor) {
        setEditingMajor({ ...editingMajor, rewards: editingMajor.rewards?.filter((_, i) => i !== index) });
      } else {
        setNewMajor({ ...newMajor, rewards: newMajor.rewards.filter((_, i) => i !== index) });
      }
    } else {
      if (editingSub) {
        setEditingSub({ ...editingSub, rewards: editingSub.rewards?.filter((_, i) => i !== index) });
      } else {
        setNewSub({ ...newSub, rewards: newSub.rewards.filter((_, i) => i !== index) });
      }
    }
  };

  const updateReward = (index: number, field: keyof DungeonReward, value: any, isMajor: boolean = false) => {
    if (isMajor) {
      if (editingMajor) {
        const updated = [...(editingMajor.rewards || [])];
        updated[index] = { ...updated[index], [field]: value };
        setEditingMajor({ ...editingMajor, rewards: updated });
      } else {
        const updated = [...newMajor.rewards];
        updated[index] = { ...updated[index], [field]: value };
        setNewMajor({ ...newMajor, rewards: updated });
      }
    } else {
      if (editingSub) {
        const updated = [...(editingSub.rewards || [])];
        updated[index] = { ...updated[index], [field]: value };
        setEditingSub({ ...editingSub, rewards: updated });
      } else {
        const updated = [...newSub.rewards];
        updated[index] = { ...updated[index], [field]: value };
        setNewSub({ ...newSub, rewards: updated });
      }
    }
  };

  const toggleMajor = (id: string) => {
    setExpandedMajors(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleSubDungeon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubDungeons(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getSubDungeonDepth = (subId: string): number => {
    let current = dungeons.find(d => d.id === subId);
    if (!current) return 0;

    let depth = 1;
    while (current && current.parentId) {
      const parent = dungeons.find(d => d.id === current.parentId);
      if (parent) {
        depth++;
        current = parent;
      } else {
        break; // Root is Major Dungeon
      }
    }
    return depth;
  };

  const renderRewards = (sub: Dungeon | MajorDungeon) => {
    const rewards = sub.rewards || [];
    if (rewards.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        {rewards.slice(0, 3).map((r, i) => (
          <div key={i} className="flex items-center gap-1 px-1.5 h-5 rounded bg-slate-900/50 border border-slate-800 text-[10px] font-bold text-slate-400 shrink-0 max-w-[120px] truncate">
            {r.type === 'coins' && <Coins size={10} className="text-amber-500 min-w-[10px]" />}
            {r.type === 'xp' && <Zap size={10} className="text-indigo-400 min-w-[10px]" />}
            {r.type === 'talentPoint' && <Scroll size={10} className="text-emerald-400 min-w-[10px]" />}
            {r.type === 'item' && <Gift size={10} className="text-pink-400 min-w-[10px]" />}
            {r.type === 'text' && <CheckCircle2 size={10} className="text-cyan-400 min-w-[10px]" />}
            <span className="truncate">
              {r.type === 'item' ? `${r.amount} ${r.itemName || 'Item'}` : 
               r.type === 'text' ? (r.rewardText || 'Reward') : 
               r.amount}
            </span>
          </div>
        ))}
        {rewards.length > 3 && <span className="text-[9px] text-slate-600 font-bold shrink-0">+{rewards.length - 3}</span>}
      </div>
    );
  };

  const renderSubDungeons = (parentId: string, level: number = 1) => {
    const parentSubs = dungeons.filter(d => d.parentId === parentId);
    if (parentSubs.length === 0 && level > 1) return null;

    return (
      <Reorder.Group 
        axis="y" 
        values={parentSubs} 
        onReorder={(newSubs) => {
          if (setDungeons) {
            setDungeons(prev => {
              // 1. Identify all items that belong to THIS parent in the latest state
              const currentSubsInParent = prev.filter(d => d.parentId === parentId);
              const otherDungeons = prev.filter(d => d.parentId !== parentId);
              
              // 2. Identify the intended order based on newSubs (which comes from the group)
              // We only want to reorder items that ARE still in this parent
              const reorderedIds = newSubs.map(s => s.id);
              
              // If we have items in newSubs that aren't in currentSubsInParent, it means they were 
              // just moved IN. If we have items in currentSubsInParent NOT in newSubs, they were 
              // just moved OUT or are being reordered.
              
              // Trust the newSubs order ONLY for items that still belong to this parent in the latest state
              const finalReordered = newSubs
                .map(ns => currentSubsInParent.find(p => p.id === ns.id))
                .filter((d): d is Dungeon => !!d);

              // 3. Keep any items that are in THIS parent but WERE NOT in the reorder list 
              // (e.g. they were just moved in from another parent and Reorder.Group hasn't seen them yet)
              const missingOurs = currentSubsInParent.filter(
                curr => !reorderedIds.includes(curr.id)
              );

              return [...otherDungeons, ...finalReordered, ...missingOurs];
            });
          }
        }}
        data-id={parentId}
        data-drop-target="true"
        className="space-y-1 min-h-[10px] w-full"
      >
        {parentSubs.map((sub, idx) => {
          const hasChildren = dungeons.some(d => d.parentId === sub.id);
          const isExpanded = expandedSubDungeons.includes(sub.id);
          const currentDepth = getSubDungeonDepth(sub.id);

          return (
            <DraggableItem 
              key={sub.id} 
              item={sub}
              isEditMode={isEditMode}
              onMove={onMoveItem}
              onDragStart={onDragStart}
              handleClassName="w-6 h-6 p-0 hover:bg-slate-800 rounded-sm mt-[6px]"
              className="space-y-1 relative z-10 w-full"
            >
              <div
                id={`dungeon-${sub.id}`}
                data-id={sub.id}
                data-drop-target="true"
                className={cn(
                  "p-2.5 sm:px-2.5 flex items-center justify-between gap-2.5 transition-colors group/sub rounded-lg relative bg-slate-900/40 select-none",
                  currentDungeonId === sub.id ? "bg-indigo-500/10" : "hover:bg-slate-800/40"
                )}
                onClick={() => onSelect(sub.id)}
              >
                <div 
                  className="min-w-0 flex-1 flex items-center gap-1.5"
                  style={{ paddingLeft: `${(level - 1) * 18}px` }}
                >
                  <div className="flex items-center shrink-0 gap-1">
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={(e) => toggleSelectId(sub.id, e)}
                        className={cn(
                          "p-0.5 rounded transition-colors shrink-0",
                          selectedIds.includes(sub.id) ? "text-indigo-400" : "text-slate-600 hover:text-slate-300"
                        )}
                        title={selectedIds.includes(sub.id) ? "Deselect task" : "Select task for batch action"}
                      >
                        {selectedIds.includes(sub.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    )}
                    {level > 1 && (
                      <span className="text-slate-600/80 font-mono text-[11px] select-none shrink-0 -ml-1 mr-0.5">└</span>
                    )}
                    <span className="text-[10px] font-mono text-slate-500 w-4 text-center">{idx + 1}.</span>
                    {hasChildren && (
                      <button 
                        onClick={(e) => toggleSubDungeon(sub.id, e)}
                        className="p-0.5 hover:bg-slate-800 rounded transition-colors text-slate-600 hover:text-indigo-400"
                      >
                        <ChevronRight size={12} className={cn("transition-transform", isExpanded && "rotate-90")} />
                      </button>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className={cn(
                        "font-bold text-[13px] sm:text-xs transition-all max-w-full truncate",
                        sub.status === 'completed' ? "text-slate-500 line-through font-medium" : currentDungeonId === sub.id ? "text-indigo-400" : "text-slate-200"
                      )}>
                        {sub.name || <span className="italic pr-1 opacity-50">Unnamed Task</span>}
                      </span>
                      
                      {sub.deadline && sub.status !== 'completed' && (
                        <div className={cn("flex items-center gap-1 shrink-0 px-1.5 h-5 rounded border text-[10px] font-black uppercase shadow-sm",
                          sub.deadline < format(new Date(), 'yyyy-MM-dd') ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        )}>
                          <Calendar size={10} />
                          <span>{sub.deadline}</span>
                        </div>
                      )}
                      
                      {sub.isRoutine && (
                        <div className="flex items-center gap-1 px-1.5 h-5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase shadow-sm shrink-0" title="Refreshes progress on reset">
                          <RefreshCcw size={8} />
                          <span>{sub.routineType}</span>
                          {sub.lastRoutineReset && (
                            <span className="opacity-75 font-normal ml-0.5 border-l border-indigo-500/30 pl-1 py-[1px]">
                              {(() => {
                                const lastReset = new Date(sub.lastRoutineReset!);
                                const next = new Date(lastReset);
                                if (sub.routineType === 'daily') {
                                  next.setDate(next.getDate() + 1);
                                } else if (sub.routineType === 'weekly') {
                                  next.setDate(next.getDate() + 7);
                                } else if (sub.routineType === 'monthly') {
                                  next.setMonth(next.getMonth() + 1);
                                  next.setDate(1);
                                }
                                return `${next.getMonth() + 1}/${next.getDate()}`;
                              })()}
                            </span>
                          )}
                        </div>
                      )}

                      {(() => {
                        const ownTagIds = sub.tags || [];
                        const inheritedIds = getInheritedTagIds(sub.parentId, dungeons, majorDungeons).filter(id => !ownTagIds.includes(id));
                        if (ownTagIds.length === 0 && inheritedIds.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1">
                            {ownTagIds.map(tId => {
                              const tagObj = validTags.find(t => t.id === tId);
                              if (!tagObj) return null;
                              return <TagBadge key={tId} tag={tagObj} size="xs" />;
                            })}
                            {inheritedIds.map(tId => {
                              const tagObj = validTags.find(t => t.id === tId);
                              if (!tagObj) return null;
                              return <TagBadge key={tId} tag={tagObj} size="xs" inherited />;
                            })}
                          </div>
                        );
                      })()}

                      {renderRewards(sub)}
                    </div>
                    {sub.description && (
                      <div className="text-[11px] text-slate-400 italic truncate font-medium mt-0.5 max-w-full pr-1">{sub.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2 opacity-85">
                    {(() => {
                      const timePerRoom = standardSessionMinutes + (includeRestTimeInTasks ? standardRestMinutes : 0);
                      const stats = getDungeonHierarchyStats(sub.id, dungeons, timePerRoom);

                      const formatTime = (mins: number) => {
                        if (mins < 60) return <>{Math.floor(mins)}<span className="text-[9px] opacity-70 ml-[1px]">m</span></>;
                        const h = Math.floor(mins / 60);
                        const m = Math.floor(mins % 60);
                        return m > 0 
                          ? <>{h}<span className="text-[9px] opacity-70 ml-[1px]">h</span> {m}<span className="text-[9px] opacity-70 ml-[1px]">m</span></>
                          : <>{h}<span className="text-[9px] opacity-70 ml-[1px]">h</span></>;
                      };

                      if (stats.isOpenEnded) {
                        return (
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums flex items-center justify-start w-20 font-mono whitespace-nowrap overflow-hidden text-ellipsis mr-auto">
                            {Math.round(stats.completedMinutes)}m focused
                          </span>
                        );
                      }

                      const isParent = stats.hasChildren;
                      const isCompleted = sub.status === 'completed' || stats.isAllCompleted;

                      return (
                        <>
                          <div 
                            className={cn(
                              "h-1.5 w-16 rounded-full overflow-hidden border shrink-0 flex",
                              isCompleted
                                ? "bg-slate-900/90 border-emerald-500/30"
                                : isParent ? "bg-slate-900/90 border-slate-800/80" : "bg-slate-900 border-slate-800/50"
                            )}
                            title={
                              stats.tierSegments.length > 0
                                ? `Total: ${stats.completedMinutes}m (${stats.tierSegments.map(s => `${s.label}: ${s.minutes}m`).join(', ')})`
                                : undefined
                            }
                          >
                            {stats.tierSegments.map((seg, idx) => (
                              <div 
                                key={idx}
                                className={cn(
                                  "h-full transition-all duration-300",
                                  getTierProgressColor(seg.level, isCompleted, 'indigo')
                                )}
                                style={{ width: `${seg.percent}%` }}
                              />
                            ))}
                          </div>
                          <span className={cn(
                            "text-[10px] tabular-nums flex items-center justify-start w-20 font-mono",
                            isCompleted ? "font-bold text-emerald-400" : isParent ? "font-semibold text-slate-300" : "font-bold text-slate-300"
                          )}>
                            {formatTime(stats.completedMinutes)}
                            <span className={cn("text-[9px] mx-0.5", isCompleted ? "opacity-60 text-emerald-400" : "opacity-50")}>/</span>
                            {formatTime(stats.targetMinutes)}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center justify-end shrink-0 gap-1">
                    <RowActionsMenu
                      actions={[
                        {
                          key: 'edit',
                          label: 'Edit',
                          icon: Edit2,
                          onClick: () => setEditingSub(sub),
                        },
                        {
                          key: 'add',
                          label: 'Add sub-task',
                          icon: Plus,
                          hidden: currentDepth >= 3,
                          onClick: () => setIsAddingSub({ parentId: sub.id }),
                        },
                        {
                          key: 'top',
                          label: 'Move to top',
                          icon: ArrowUpToLine,
                          hidden: idx === 0,
                          separatorBefore: true,
                          onClick: () => { onDragStart?.(); _onReorderSub(sub.id, 'top'); },
                        },
                        {
                          key: 'up',
                          label: 'Move up',
                          icon: ArrowUp,
                          hidden: idx === 0,
                          onClick: () => { onDragStart?.(); _onReorderSub(sub.id, 'up'); },
                        },
                        {
                          key: 'down',
                          label: 'Move down',
                          icon: ArrowDown,
                          hidden: idx >= parentSubs.length - 1,
                          onClick: () => { onDragStart?.(); _onReorderSub(sub.id, 'down'); },
                        },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: Trash2,
                          danger: true,
                          separatorBefore: true,
                          onClick: () => setModalConfig({
                            isOpen: true,
                            title: `Delete ${getSubDungeonDepth(sub.id) > 1 ? 'Tier' : 'Sub-Dungeon'}`,
                            message: `Are you sure you want to delete "${sub.name}"? This action cannot be undone.`,
                            confirmText: 'Delete',
                            type: 'danger',
                            onConfirm: () => onDeleteSub(sub.id),
                          }),
                        },
                      ]}
                    />


                    <div className="shrink-0 flex items-center justify-center w-6 h-6">
                      <div className={currentDungeonId === sub.id ? "text-indigo-500" : "text-slate-800"}>
                        {sub.status === 'completed' ? (
                          <CheckSquare size={16} className="text-emerald-500" />
                        ) : (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (sub.isOpenEnded) {
                                setModalConfig({
                                  isOpen: true,
                                  title: "Complete Task",
                                  message: `Are you sure you have finished "${sub.name}"? This will complete the task and grant rewards based on your progress.`,
                                  confirmText: "Complete",
                                  type: "info",
                                  onConfirm: () => onForceCompleteSub?.(sub.id)
                                });
                              } else {
                                setModalConfig({
                                  isOpen: true,
                                  title: "Force Complete Task",
                                  message: `Are you sure you want to magically force complete "${sub.name}"? This will grant the remaining rewards immediately without completing the required sessions.`,
                                  confirmText: "Force Complete",
                                  type: "warning",
                                  onConfirm: () => onForceCompleteSub?.(sub.id)
                                });
                              }
                            }}
                            className="hover:text-amber-400 transition-colors flex items-center justify-center p-0.5 rounded cursor-pointer"
                            title={sub.isOpenEnded ? "Complete Task" : "Force Complete Task"}
                          >
                            <Square size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {isExpanded && renderSubDungeons(sub.id, level + 1)}
            </DraggableItem>
          );
        })}
      </Reorder.Group>
    );
  };


  const filteredMajors = React.useMemo(() => {
    if (activeTab === 'active') {
      const activeList = majorDungeons.filter(m => m.status !== 'archived');
      if (!filterTagId) return activeList;
      return activeList.filter(m => {
        if (m.tags?.includes(filterTagId)) return true;
        // Check if any sub-dungeon under this major has the tag
        return dungeons.some(d => {
          const eff = getEffectiveDungeonTagIds(d.id, dungeons, majorDungeons);
          if (!eff.includes(filterTagId)) return false;
          // Walk up to root major
          let curr: Dungeon | undefined = d;
          while (curr?.parentId) {
            if (curr.parentId === m.id) return true;
            curr = dungeons.find(p => p.id === curr?.parentId);
          }
          return false;
        });
      });
    }
    const filtered = majorDungeons.filter(m => m.status === 'archived');
    
    return filtered.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(archiveSearch.toLowerCase()) || 
                           m.description.toLowerCase().includes(archiveSearch.toLowerCase());
      
      if (dateFilter === 'all') return matchesSearch;
      
      if (!m.completedAt) return false;
      const completedDate = new Date(m.completedAt);
      const now = new Date();
      const diffDays = (now.getTime() - completedDate.getTime()) / (1000 * 3600 * 24);
      
      if (dateFilter === 'week') return matchesSearch && diffDays <= 7;
      if (dateFilter === 'month') return matchesSearch && diffDays <= 30;
      
      return matchesSearch;
    });
  }, [majorDungeons, dungeons, activeTab, archiveSearch, dateFilter, filterTagId]);

  const validParentOptionsForSub = React.useMemo<ParentHierarchyOption[]>(() => {
    const activeMajors = majorDungeons.filter(m => m.status !== 'archived' && !m.isFinalized);
    const options: ParentHierarchyOption[] = [];

    for (const major of activeMajors) {
      options.push({
        id: major.id,
        name: major.name,
        parentType: 'Goal',
        resultingTier: 'Tier 1',
        label: `[Expedition Goal] ${major.name} (→ Tier 1)`,
        depth: 0
      });

      const tier1Subs = dungeons.filter(d => d.parentId === major.id);
      for (const t1 of tier1Subs) {
        if (editingSub && !canMoveSubDungeonToParent(editingSub.id, t1.id, dungeons, majorDungeons)) continue;
        options.push({
          id: t1.id,
          name: t1.name,
          parentType: 'Tier 1',
          resultingTier: 'Tier 2',
          label: `  └ [Tier 1] ${t1.name} (→ Tier 2)`,
          depth: 1
        });

        const tier2Subs = dungeons.filter(d => d.parentId === t1.id);
        for (const t2 of tier2Subs) {
          if (editingSub && !canMoveSubDungeonToParent(editingSub.id, t2.id, dungeons, majorDungeons)) continue;
          options.push({
            id: t2.id,
            name: t2.name,
            parentType: 'Tier 2',
            resultingTier: 'Tier 3',
            label: `    └ [Tier 2] ${t2.name} (→ Tier 3)`,
            depth: 2
          });
        }
      }
    }
    return options;
  }, [majorDungeons, dungeons, editingSub]);

  return (
    <div className="space-y-6">
      {(editingMajor || editingSub || isAddingMajor || isAddingSub) && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm isolate"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight italic pr-1">
                  {isAddingMajor ? 'CREATE EXPEDITION GOAL' : isAddingSub ? `CREATE TIER ${getSubDungeonDepth(isAddingSub.parentId) + 1}` : `EDIT ${editingMajor ? 'DUNGEON GOAL' : 'TIER ' + getSubDungeonDepth(editingSub?.id || '')}`}
                </h3>
                <div className="flex items-center gap-2.5">
                  {(isAddingMajor || isAddingSub) && (
                    <PresetControl
                      type={isAddingMajor ? 'dungeon_major' : 'dungeon_sub'}
                      currentData={isAddingMajor ? newMajor : newSub}
                      _defaultData={(isAddingMajor ? {
                        name: '',
                        description: '',
                        rewards: [{ type: 'coins', amount: 100 }],
                        isRoutine: false,
                        routineType: 'daily'
                      } : {
                        name: '',
                        description: '',
                        totalSessions: 10,
                        rewardCoins: 0,
                        rewardXP: 0,
                        rewardText: '',
                        rewards: [{ type: 'coins', amount: 100 }],
                        isLongTerm: false,
                        isRoutine: false,
                        routineType: 'daily'
                      }) as any}
                      onLoad={(data) => {
                        if (isAddingMajor) setNewMajor(prev => ({ ...prev, ...data }));
                        else setNewSub(prev => ({ ...prev, ...data }));
                      }}
                    />
                  )}
                  <button
                    onClick={() => { setEditingMajor(null); setEditingSub(null); setIsAddingMajor(false); setIsAddingSub(null); }}
                    className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Row 1: Name + Parent Hierarchy (Sub) or Deadline (Major) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sword size={12} className="text-indigo-400 shrink-0" />
                      <span>{isAddingMajor || editingMajor ? 'Goal Name' : 'Tier Name'}</span>
                    </label>
                    <input
                      type="text"
                      value={isAddingMajor ? newMajor.name : isAddingSub ? newSub.name : (editingMajor ? editingMajor.name : editingSub?.name || '')}
                      onChange={e => {
                        if (isAddingMajor) setNewMajor({ ...newMajor, name: e.target.value });
                        else if (isAddingSub) setNewSub({ ...newSub, name: e.target.value });
                        else if (editingMajor) setEditingMajor({ ...editingMajor, name: e.target.value });
                        else if (editingSub) setEditingSub({ ...editingSub, name: e.target.value });
                      }}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 h-[38px] text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder={isAddingMajor || editingMajor ? "e.g. Master Calculus" : "e.g. Chapter 1 Exercises"}
                    />
                  </div>

                  {(editingSub || isAddingSub) ? (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FolderInput size={12} className="text-indigo-400 shrink-0" />
                        <span>Parent Goal / Tier</span>
                      </label>
                      <HierarchyParentPicker
                        value={isAddingSub ? isAddingSub.parentId : (editingSub?.parentId || '')}
                        options={validParentOptionsForSub}
                        onChange={(targetParentId) => {
                          if (!targetParentId) return;
                          if (isAddingSub) {
                            setIsAddingSub({ parentId: targetParentId });
                          } else if (editingSub) {
                            setEditingSub({ ...editingSub, parentId: targetParentId });
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-indigo-400 shrink-0" />
                          <span>Deadline <span className="text-slate-600 font-normal lowercase">(optional)</span></span>
                        </span>
                        {Boolean(isAddingMajor ? newMajor.deadline : editingMajor?.deadline) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (isAddingMajor) setNewMajor({ ...newMajor, deadline: undefined });
                              else if (editingMajor) setEditingMajor({ ...editingMajor, deadline: undefined });
                            }}
                            className="text-[10px] underline text-slate-500 hover:text-slate-300"
                          >
                            Clear
                          </button>
                        )}
                      </label>
                      <DatePicker
                        value={isAddingMajor ? newMajor.deadline || '' : editingMajor?.deadline || ''}
                        onChange={(val) => {
                          if (isAddingMajor) setNewMajor({ ...newMajor, deadline: val });
                          else if (editingMajor) setEditingMajor({ ...editingMajor, deadline: val });
                        }}
                        className="bg-slate-800/90 border-slate-700 rounded-xl px-3.5 h-[38px] text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Row 2: Description + Deadline (for Sub-Tiers) */}
                <div className={cn("grid grid-cols-1 gap-3.5", (editingSub || isAddingSub) && "sm:grid-cols-2")}>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit2 size={12} className="text-indigo-400 shrink-0" />
                      <span>Note / Description <span className="text-slate-600 font-normal lowercase">(optional)</span></span>
                    </label>
                    <input
                      type="text"
                      value={isAddingMajor ? newMajor.description : isAddingSub ? newSub.description : (editingMajor ? editingMajor.description : editingSub?.description || '') || ''}
                      onChange={e => {
                        if (isAddingMajor) setNewMajor({ ...newMajor, description: e.target.value });
                        else if (isAddingSub) setNewSub({ ...newSub, description: e.target.value });
                        else if (editingMajor) setEditingMajor({ ...editingMajor, description: e.target.value });
                        else if (editingSub) setEditingSub({ ...editingSub, description: e.target.value });
                      }}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 h-[38px] text-white text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="Add a brief description or note..."
                    />
                  </div>

                  {(editingSub || isAddingSub) && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-indigo-400 shrink-0" />
                          <span>Deadline <span className="text-slate-600 font-normal lowercase">(optional)</span></span>
                        </span>
                        {Boolean(isAddingSub ? newSub.deadline : editingSub?.deadline) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (isAddingSub) setNewSub({ ...newSub, deadline: undefined });
                              else if (editingSub) setEditingSub({ ...editingSub, deadline: undefined });
                            }}
                            className="text-[10px] underline text-slate-500 hover:text-slate-300"
                          >
                            Clear
                          </button>
                        )}
                      </label>
                      <DatePicker
                        value={isAddingSub ? newSub.deadline || '' : editingSub?.deadline || ''}
                        onChange={(val) => {
                          if (isAddingSub) setNewSub({ ...newSub, deadline: val });
                          else if (editingSub) setEditingSub({ ...editingSub, deadline: val });
                        }}
                        className="bg-slate-800/90 border-slate-700 rounded-xl px-3.5 h-[38px] text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Row 3: Target Sessions & Repeat Cycle */}
                <div className={cn("grid grid-cols-1 gap-3.5", (editingSub || isAddingSub) && "sm:grid-cols-2")}>
                  {(editingSub || isAddingSub) && (() => {
                    const isOpenEnded = isAddingSub ? !!newSub.isOpenEnded : !!editingSub?.isOpenEnded;
                    const hasChildren = editingSub ? dungeons.some(d => d.parentId === editingSub.id) : false;
                    const timePerRoom = standardSessionMinutes + (includeRestTimeInTasks ? standardRestMinutes : 0);
                    const hierStats = (hasChildren && editingSub) ? getDungeonHierarchyStats(editingSub.id, dungeons, timePerRoom) : null;

                    const durationText = (() => {
                      if (isOpenEnded) return 'Unlimited duration';
                      const rooms = hasChildren
                        ? hierStats?.totalSessions
                        : isAddingSub ? (newSub.totalSessions || 0) : (editingSub?.totalSessions || 0);
                      if (!rooms) return null;
                      const totalMinutes = hasChildren ? (hierStats?.targetMinutes || 0) : rooms * timePerRoom;
                      if (totalMinutes < 60) return `${totalMinutes} min`;
                      const h = Math.floor(totalMinutes / 60);
                      const m = totalMinutes % 60;
                      return m > 0 ? `${h}h ${m}m` : `${h}h`;
                    })();

                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Target size={12} className="text-indigo-400 shrink-0" />
                            <span>Target Sessions</span>
                          </label>
                          {durationText && (
                            <span className="text-[10px] font-bold text-indigo-400 tabular-nums">
                              {durationText}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center shrink-0 h-[38px]">
                            <button
                              type="button"
                              onClick={() => {
                                if (isAddingSub) setNewSub({ ...newSub, isOpenEnded: false });
                                else if (editingSub) setEditingSub({ ...editingSub, isOpenEnded: false });
                              }}
                              className={cn(
                                "px-2.5 h-full rounded-lg text-xs font-bold transition-all cursor-pointer",
                                !isOpenEnded ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                              )}
                            >
                              Rooms
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isAddingSub) setNewSub({ ...newSub, isOpenEnded: true });
                                else if (editingSub) setEditingSub({ ...editingSub, isOpenEnded: true });
                              }}
                              className={cn(
                                "px-2.5 h-full rounded-lg text-xs font-bold transition-all cursor-pointer",
                                isOpenEnded ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                              )}
                            >
                              ∞ Endless
                            </button>
                          </div>

                          {!isOpenEnded ? (
                            hasChildren && hierStats ? (
                              <div className="flex-1 min-w-0 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 h-[38px] flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-white">{hierStats.totalSessions}</span>
                                <span className="text-[10px] text-indigo-400 italic pr-1 truncate ml-1">From children</span>
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0">
                                <SpinnerInput
                                  min={1}
                                  value={isAddingSub ? (newSub.totalSessions === undefined ? '' : newSub.totalSessions) : (editingSub?.totalSessions === undefined ? '' : editingSub.totalSessions)}
                                  onChange={(val) => {
                                    if (isAddingSub) setNewSub({ ...newSub, totalSessions: typeof val === 'number' ? Math.max(1, val) : '' as any });
                                    else if (editingSub) setEditingSub({ ...editingSub, totalSessions: typeof val === 'number' ? Math.max(1, val) : '' as any });
                                  }}
                                  className="text-sm focus:border-indigo-500 h-[38px]"
                                />
                              </div>
                            )
                          ) : (
                            <div className="flex-1 min-w-0 bg-slate-800/40 border border-slate-800 rounded-xl px-3 h-[38px] flex items-center">
                              <span className="text-[11px] text-slate-400 italic pr-1 truncate">Track time freely</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Repeat Cycle */}
                  {(() => {
                    const isRoutine = isAddingMajor ? newMajor.isRoutine : isAddingSub ? newSub.isRoutine : editingMajor ? editingMajor.isRoutine : !!editingSub?.isRoutine;
                    const routineType = (isAddingMajor ? newMajor.routineType : isAddingSub ? newSub.routineType : editingMajor ? editingMajor.routineType : editingSub?.routineType) || 'daily';

                    const setCycle = (nextRoutine: boolean, nextType?: 'daily' | 'weekly' | 'monthly') => {
                      const typeToUse = nextType || routineType;
                      if (isAddingMajor) setNewMajor({ ...newMajor, isRoutine: nextRoutine, routineType: typeToUse });
                      else if (isAddingSub) setNewSub({ ...newSub, isRoutine: nextRoutine, routineType: typeToUse });
                      else if (editingMajor) setEditingMajor({ ...editingMajor, isRoutine: nextRoutine, routineType: typeToUse });
                      else if (editingSub) setEditingSub({ ...editingSub, isRoutine: nextRoutine, routineType: typeToUse });
                    };

                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <RefreshCcw size={12} className="text-indigo-400 shrink-0" />
                            <span>Repeat Cycle</span>
                          </label>
                          <span className="text-[10px] text-slate-500">
                            {isRoutine ? `Resets ${routineType}` : 'One-time goal'}
                          </span>
                        </div>
                        <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 grid grid-cols-4 gap-1 h-[38px]">
                          <button
                            type="button"
                            onClick={() => setCycle(false)}
                            className={cn(
                              "rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                              !isRoutine ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            Once
                          </button>
                          {(['daily', 'weekly', 'monthly'] as const).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setCycle(true, t)}
                              className={cn(
                                "rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer",
                                isRoutine && routineType === t
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Row 4: Tags */}
                <div className="pt-1">
                  <TagPicker
                    compact
                    tags={validTags}
                    selectedTagIds={
                      isAddingMajor ? (newMajor.tags || []) :
                      isAddingSub ? (newSub.tags || []) :
                      editingMajor ? (editingMajor.tags || []) :
                      (editingSub?.tags || [])
                    }
                    inheritedTagIds={
                      isAddingSub ? getInheritedTagIds(isAddingSub.parentId, dungeons, majorDungeons) :
                      editingSub ? getInheritedTagIds(editingSub.parentId, dungeons, majorDungeons) :
                      []
                    }
                    onChange={(nextTagIds) => {
                      if (isAddingMajor) setNewMajor({ ...newMajor, tags: nextTagIds });
                      else if (isAddingSub) setNewSub({ ...newSub, tags: nextTagIds });
                      else if (editingMajor) setEditingMajor({ ...editingMajor, tags: nextTagIds });
                      else if (editingSub) setEditingSub({ ...editingSub, tags: nextTagIds });
                    }}
                    onCreateTag={handleCreateNewTag}
                  />
                </div>

                {/* Row 5: Finalization Check & Completion Rewards */}
                <div className="space-y-3 pt-1">
                  {editingMajor && !editingMajor.isFinalized && editingMajor.status !== 'completed' && dungeons.some(d => d.parentId === editingMajor.id) && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Target size={14} />
                          <span className="text-xs font-bold uppercase tracking-wider">Finalization Check</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Lock tiers & rewards to enable Major Goal completion bonus.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onFinalizeMajor(editingMajor.id);
                          setEditingMajor(null);
                        }}
                        className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold uppercase transition-all border border-amber-500/30 shrink-0"
                      >
                        Finalize
                      </button>
                    </div>
                  )}

                  {(() => {
                    const isMajorModal = !!isAddingMajor || !!editingMajor;
                    const isRewardLocked = editingMajor 
                      ? (editingMajor.isFinalized || editingMajor.status === 'completed')
                      : editingSub
                      ? (editingSub.status === 'completed' || majorDungeons.find(m => m.id === editingSub.parentId)?.isFinalized)
                      : isAddingSub
                      ? (majorDungeons.find(m => m.id === isAddingSub.parentId)?.isFinalized)
                      : false;

                    const rewardList = isAddingMajor ? newMajor.rewards : isAddingSub ? newSub.rewards : (editingMajor?.rewards || editingSub?.rewards || []);

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Trophy size={12} className="text-indigo-400 shrink-0" />
                            <span>Completion Rewards {isRewardLocked && <span className="text-amber-500 text-[10px] lowercase italic pr-1">(Locked)</span>}</span>
                          </h5>
                          {!isRewardLocked && (
                            <button
                              type="button"
                              onClick={() => addReward(isMajorModal)}
                              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              <Plus size={14} /> Add Reward
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {rewardList.map((reward, idx) => (
                            <div key={idx} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-3">
                              <div className="flex items-center gap-2">
                                <select
                                  disabled={isRewardLocked}
                                  value={reward.type}
                                  onChange={e => updateReward(idx, 'type', e.target.value as any, isMajorModal)}
                                  className={cn(
                                    "flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500",
                                    isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                  )}
                                >
                                  <option value="coins">Coins</option>
                                  <option value="xp">XP</option>
                                  <option value="talentPoint">Talent Scrolls</option>
                                  <option value="item">Item</option>
                                  <option value="text">Custom Text</option>
                                </select>
                                {reward.type !== 'text' && (
                                  <div className="w-24 shrink-0">
                                    <SpinnerInput
                                      disabled={isRewardLocked}
                                      value={reward.amount === undefined || reward.amount === null ? '' : reward.amount}
                                      onChange={(val) => {
                                        updateReward(idx, 'amount', typeof val === 'number' ? val : ('' as any), isMajorModal);
                                      }}
                                      className={cn(
                                        "text-xs py-1.5 px-3",
                                        isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                      )}
                                      placeholder="Amount"
                                    />
                                  </div>
                                )}
                                {!isRewardLocked && (
                                  <button type="button" onClick={() => removeReward(idx, isMajorModal)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg">
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                              {reward.type === 'item' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    disabled={isRewardLocked}
                                    value={reward.itemType || 'talent_shard'}
                                    onChange={e => updateReward(idx, 'itemType', e.target.value as any, isMajorModal)}
                                    className={cn(
                                      "bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500",
                                      isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                    )}
                                  >
                                    <option value="talent_shard">Talent Shard</option>
                                    <option value="death_defying_medal">Death Defying Medal</option>
                                    <option value="double_xp">2x XP Potion</option>
                                    <option value="double_coin">2x Coin Potion</option>
                                  </select>
                                  <input
                                    type="text"
                                    disabled={isRewardLocked}
                                    placeholder="Item Name..."
                                    value={reward.itemName || ''}
                                    onChange={e => updateReward(idx, 'itemName', e.target.value, isMajorModal)}
                                    className={cn(
                                      "bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500",
                                      isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                    )}
                                  />
                                </div>
                              )}
                              {reward.type === 'text' && (
                                <input
                                  type="text"
                                  disabled={isRewardLocked}
                                  placeholder="Enter custom reward message..."
                                  value={reward.rewardText || ''}
                                  onChange={e => updateReward(idx, 'rewardText', e.target.value, isMajorModal)}
                                  className={cn(
                                    "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500",
                                    isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                  )}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-800">
                <div className="flex space-x-3">
                  <button onClick={() => { setEditingMajor(null); setEditingSub(null); setIsAddingMajor(false); setIsAddingSub(null); }} className="px-4 py-2 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
                  <button 
                    onClick={() => {
                    const validateRewards = (rewards: DungeonReward[]) => {
                      for (const r of rewards) {
                        if (r.type !== 'item' && r.type !== 'text') {
                          if (r.amount === '' as any || isNaN(r.amount as number) || (r.amount as number) < 0) {
                            return false;
                          }
                        }
                      }
                      return true;
                    };

                    if (isAddingSub || editingSub) {
                      const totalSessions = isAddingSub ? newSub.totalSessions : editingSub?.totalSessions;
                      const isOpenEnded = isAddingSub ? newSub.isOpenEnded : editingSub?.isOpenEnded;
                      if (!isOpenEnded && (totalSessions === '' as any || isNaN(totalSessions as number) || (totalSessions as number) <= 0)) {
                        setModalConfig({
                          isOpen: true,
                          title: "Invalid Input",
                          message: "Please enter a valid number for Total Rooms.",
                          confirmText: "Got it",
                          type: "warning",
                          isAlert: true
                        });
                        return;
                      }
                      const rewards = isAddingSub ? newSub.rewards : editingSub?.rewards;
                      if (rewards && !validateRewards(rewards)) {
                        setModalConfig({
                          isOpen: true,
                          title: "Invalid Rewards",
                          message: "Please enter a valid reward amount for all rewards.",
                          confirmText: "Got it",
                          type: "warning",
                          isAlert: true
                        });
                        return;
                      }
                    }

                    if (isAddingMajor || editingMajor) {
                      const rewards = isAddingMajor ? newMajor.rewards : editingMajor?.rewards;
                      if (rewards && !validateRewards(rewards)) {
                        setModalConfig({
                          isOpen: true,
                          title: "Invalid Rewards",
                          message: "Please enter a valid reward amount for all rewards.",
                          confirmText: "Got it",
                          type: "warning",
                          isAlert: true
                        });
                        return;
                      }
                    }

                    if (isAddingMajor) {
                      onCreateMajor(newMajor.name, newMajor.description, newMajor.rewards, newMajor.isRoutine, newMajor.routineType, newMajor.deadline, newMajor.tags);
                      setIsAddingMajor(false);
                    } else if (isAddingSub) {
                      onCreateSub({ ...newSub, parentId: isAddingSub.parentId, tags: newSub.tags });
                      setIsAddingSub(null);
                    } else if (editingMajor) {
                      onUpdateMajor(editingMajor.id, { 
                        name: editingMajor.name, 
                        description: editingMajor.description, 
                        rewards: editingMajor.rewards,
                        isRoutine: editingMajor.isRoutine,
                        routineType: editingMajor.routineType,
                        deadline: editingMajor.deadline,
                        tags: editingMajor.tags
                      });
                      setEditingMajor(null);
                    } else if (editingSub) {
                      const origSub = dungeons.find(d => d.id === editingSub.id);
                      if (origSub && editingSub.parentId && origSub.parentId !== editingSub.parentId) {
                        onMoveItem(editingSub.id, editingSub.parentId);
                      }
                      onUpdateSub(editingSub.id, { 
                        name: editingSub.name, 
                        description: editingSub.description, 
                        totalSessions: editingSub.totalSessions, 
                        isOpenEnded: editingSub.isOpenEnded,
                        rewards: editingSub.rewards,
                        isRoutine: editingSub.isRoutine,
                        routineType: editingSub.routineType,
                        deadline: editingSub.deadline,
                        tags: editingSub.tags,
                        parentId: editingSub.parentId
                      });
                      setEditingSub(null);
                    }
                  }}
                  className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors"
                >
                  {isAddingMajor ? 'CREATE EXPEDITION GOAL' : isAddingSub ? 'CREATE TIER' : 'SAVE CHANGES'}
                </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Tag Filter Bar */}
      {activeTab === 'active' && (validTags.filter(t => !t.archived).length > 0 || isEditMode) && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/40 border border-slate-800/60 rounded-2xl px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1 flex items-center gap-1">
              <Tags size={12} className="text-indigo-400" />
              Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterTagId(null)}
              className={cn(
                "h-[26px] px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center shrink-0",
                filterTagId === null
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              All
            </button>
            {validTags.filter(t => !t.archived).map(tag => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="sm"
                selected={filterTagId === tag.id}
                onClick={() => setFilterTagId(prev => prev === tag.id ? null : tag.id)}
              />
            ))}
          </div>
          {onOpenTagManager && (
            <button
              type="button"
              onClick={onOpenTagManager}
              className="h-[26px] flex items-center text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 px-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 transition-all shrink-0"
            >
              Manage Tags
            </button>
          )}
        </div>
      )}

      {/* Multi-Select Batch Operations Bar */}
      {isEditMode && selectedIds.length > 0 && (
        <div className="sticky top-2 z-40 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              {selectedIds.length} Selected
            </span>
            <button
              type="button"
              onClick={() => { setSelectedIds([]); setBatchActionMode('none'); }}
              className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBatchActionMode(prev => prev === 'tag' ? 'none' : 'tag')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all",
                batchActionMode === 'tag'
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-800 text-slate-200 border-slate-700 hover:border-indigo-500/50"
              )}
            >
              <Tags size={13} />
              Batch Tag
            </button>

            {selectedIds.some(id => dungeons.some(d => d.id === id)) && (
              <button
                type="button"
                onClick={() => setBatchActionMode(prev => prev === 'move' ? 'none' : 'move')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all",
                  batchActionMode === 'move'
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-800 text-slate-200 border-slate-700 hover:border-indigo-500/50"
                )}
              >
                <FolderInput size={13} />
                Move Selected Tiers
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setModalConfig({
                  isOpen: true,
                  title: "Batch Delete Tasks",
                  message: `Are you sure you want to delete ${selectedIds.length} selected item(s)? This cannot be undone.`,
                  confirmText: "Delete All",
                  type: "danger",
                  onConfirm: () => {
                    onDragStart?.();
                    selectedIds.forEach(id => {
                      if (majorDungeons.some(m => m.id === id)) {
                        onDeleteMajor(id);
                      } else if (dungeons.some(d => d.id === id)) {
                        onDeleteSub(id);
                      }
                    });
                    setSelectedIds([]);
                    setBatchActionMode('none');
                  }
                });
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
            >
              <Trash2 size={13} />
              Delete ({selectedIds.length})
            </button>
          </div>

          {batchActionMode === 'tag' && (
            <div className="w-full pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">
                Toggle Tag on Selected:
              </span>
              {validTags.filter(t => !t.archived).map(tag => {
                const allHaveTag = selectedIds.every(id => {
                  const m = majorDungeons.find(maj => maj.id === id);
                  if (m) return m.tags?.includes(tag.id);
                  const s = dungeons.find(sub => sub.id === id);
                  return s ? s.tags?.includes(tag.id) : false;
                });
                return (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    selected={allHaveTag}
                    onClick={() => {
                      selectedIds.forEach(id => {
                        const m = majorDungeons.find(maj => maj.id === id);
                        if (m) {
                          const curr = m.tags || [];
                          const next = allHaveTag ? curr.filter(tId => tId !== tag.id) : Array.from(new Set([...curr, tag.id]));
                          onUpdateMajor(m.id, { tags: next });
                        }
                        const s = dungeons.find(sub => sub.id === id);
                        if (s) {
                          const curr = s.tags || [];
                          const next = allHaveTag ? curr.filter(tId => tId !== tag.id) : Array.from(new Set([...curr, tag.id]));
                          onUpdateSub(s.id, { tags: next });
                        }
                      });
                    }}
                  />
                );
              })}
              {validTags.filter(t => !t.archived).length === 0 && (
                <span className="text-xs text-slate-500 italic pr-1">No tags available. Create one in Manage Tags first.</span>
              )}
            </div>
          )}

          {batchActionMode === 'move' && (
            <div className="w-full pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                Target Parent for Selected Tiers:
              </span>
              <HierarchyParentPicker
                value=""
                options={validParentOptionsForSub}
                placeholder="Select destination Goal or Tier..."
                className="flex-1 min-w-[240px] max-w-md"
                onChange={(targetParentId) => {
                  if (!targetParentId || !setDungeons) return;
                  onDragStart?.();
                  setDungeons(prev => prev.map(d => {
                    if (!selectedIds.includes(d.id)) return d;
                    if (!canMoveSubDungeonToParent(d.id, targetParentId, prev, majorDungeons)) return d;
                    return { ...d, parentId: targetParentId };
                  }));
                  setBatchActionMode('none');
                  setSelectedIds([]);
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {activeTab === 'active' ? (
          filteredMajors.length === 0 && dungeons.filter(d => !d.parentId).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 bg-slate-900/30 rounded-[3rem] border border-slate-800 border-dashed">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 text-slate-700 border border-slate-800">
              <Sword size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 italic pr-1 tracking-tight">No Dungeons Found</h3>
            <p className="text-slate-500 text-center max-w-xs text-sm font-medium">Your journey is just beginning. Create your first dungeon goal to start tracking your progress!</p>
          </div>
        ) : (
          <>
            <Reorder.Group 
              axis="y" 
              values={filteredMajors} 
              onReorder={(newMajors) => {
                if (setMajorDungeons) {
                  setMajorDungeons(prev => {
                    const currentMajorsInPrev = prev.filter(m => m.status !== 'archived');
                    const archiveMajors = prev.filter(m => m.status === 'archived');
                    
                    const reorderedIds = newMajors.map(m => m.id);
                    
                    const finalReordered = newMajors.map(nm => {
                      return currentMajorsInPrev.find(p => p.id === nm.id);
                    }).filter((m): m is MajorDungeon => !!m);

                    const missingOurs = currentMajorsInPrev.filter(
                      curr => !reorderedIds.includes(curr.id)
                    );

                    return [...finalReordered, ...archiveMajors, ...missingOurs];
                  });
                }
              }}
              data-id="root"
              data-drop-target="true"
              className="space-y-1 bg-slate-900/10 rounded-2xl border border-slate-800/30 p-1 min-h-[100px]"
            >
            {filteredMajors.map((major, majorIdx) => (
            <DraggableItem 
              key={major.id} 
              item={major} 
              isEditMode={isEditMode}
              onMove={onMoveItem}
              onDragStart={onDragStart}
              handleClassName="w-6 h-6 p-0 hover:bg-slate-800 rounded-sm mt-[14px]"
              className="group transition-colors relative"
            >
              <div 
                data-id={major.id}
                data-drop-target="true"
                className={cn(
                  "p-3.5 flex items-center justify-between gap-3 cursor-pointer rounded-xl transition-colors",
                  expandedMajors.includes(major.id) ? "bg-slate-800/20 shadow-inner" : "hover:bg-slate-800/10"
                )}
                onClick={() => toggleMajor(major.id)}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => toggleSelectId(major.id, e)}
                      className={cn(
                        "p-0.5 rounded transition-colors shrink-0",
                        selectedIds.includes(major.id) ? "text-indigo-400" : "text-slate-600 hover:text-slate-300"
                      )}
                      title={selectedIds.includes(major.id) ? "Deselect goal" : "Select goal for batch action"}
                    >
                      {selectedIds.includes(major.id) ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                  )}
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 border-b-2 border-slate-700/50">
                    {major.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Sword size={16} className="text-slate-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cn(
                        "text-sm font-bold truncate max-w-full",
                        major.status === 'completed' ? "text-slate-500 line-through opacity-50" : "text-white"
                      )}>{major.name}</h3>
                      {major.deadline && major.status !== 'completed' && (
                        <div className={cn("flex items-center gap-1 px-1.5 h-5 rounded border text-[10px] font-black uppercase shadow-sm shrink-0", 
                          major.deadline < format(new Date(), 'yyyy-MM-dd') ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                        )}>
                          <Calendar size={10} />
                          <span>{major.deadline}</span>
                        </div>
                      )}
                      {(major.tags || []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {(major.tags || []).map(tId => {
                            const tagObj = validTags.find(t => t.id === tId);
                            if (!tagObj) return null;
                            return <TagBadge key={tId} tag={tagObj} size="xs" />;
                          })}
                        </div>
                      )}
                      {major.description && (
                         <p className="text-xs text-slate-400 font-medium italic mt-0.5 line-clamp-1 w-full pr-1">{major.description}</p>
                      )}
                      
                      {major.isRoutine && (
                        <div className="flex items-center gap-1 px-1.5 h-5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase shadow-sm" title="Refreshes progress on reset">
                          <RefreshCcw size={10} />
                          <span>{major.routineType}</span>
                          {major.lastRoutineReset && (
                            <span className="opacity-75 font-normal ml-0.5 border-l border-indigo-500/30 pl-1">
                              Resets {(() => {
                                const lastReset = new Date(major.lastRoutineReset!);
                                const resetHour = timeSettings?.night?.end || 0;
                                const logicalLastReset = new Date(lastReset);
                                if (logicalLastReset.getHours() < resetHour) {
                                  logicalLastReset.setDate(logicalLastReset.getDate() - 1);
                                }
                                
                                const next = new Date(logicalLastReset);
                                if (major.routineType === 'daily') {
                                  next.setDate(next.getDate() + 1);
                                } else if (major.routineType === 'weekly') {
                                  next.setDate(next.getDate() + 7);
                                } else if (major.routineType === 'monthly') {
                                  next.setDate(1);
                                  next.setMonth(next.getMonth() + 1);
                                }
                                return `${next.getMonth() + 1}/${next.getDate()}`;
                              })()}
                            </span>
                          )}
                        </div>
                      )}

                      {renderRewards(major)}
                      {(() => {
                        const majorSubs = dungeons.filter(d => d.parentId === major.id);
                        const isReadyToFinalize = majorSubs.length > 0 && 
                                               majorSubs.every(s => s.status === 'completed') && 
                                               !major.isFinalized && 
                                               major.status !== 'completed';
                        
                        if (isReadyToFinalize) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onFinalizeMajor(major.id);
                              }}
                              className="text-[8px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 py-0.5 rounded uppercase tracking-widest shrink-0 transition-colors flex items-center gap-1 shadow-sm border border-amber-400/50"
                            >
                              <Target size={10} />
                              Ready for Finalization
                            </button>
                          );
                        }
                        return null;
                      })()}
                      {major.isFinalized && !major.status && (
                        <span className="text-[7px] font-bold bg-amber-500 text-slate-950 px-1 rounded uppercase tracking-tighter shrink-0">
                          Finalized
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2 opacity-85">
                    {(() => {
                      const timePerRoom = standardSessionMinutes + (includeRestTimeInTasks ? standardRestMinutes : 0);
                      const stats = getDungeonHierarchyStats(major.id, dungeons, timePerRoom);

                      if (!stats.hasChildren) return null;

                      const formatTime = (mins: number) => {
                        if (mins < 60) return <>{Math.floor(mins)}<span className="text-[9px] opacity-70 ml-[1px]">m</span></>;
                        const h = Math.floor(mins / 60);
                        const m = Math.floor(mins % 60);
                        return m > 0 
                          ? <>{h}<span className="text-[9px] opacity-70 ml-[1px]">h</span> {m}<span className="text-[9px] opacity-70 ml-[1px]">m</span></>
                          : <>{h}<span className="text-[9px] opacity-70 ml-[1px]">h</span></>;
                      };

                      if (stats.isOpenEnded) {
                        return (
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums flex items-center justify-start w-20 font-mono whitespace-nowrap overflow-hidden text-ellipsis mr-auto">
                            {Math.round(stats.completedMinutes)}m focused
                          </span>
                        );
                      }

                      const isCompleted = major.status === 'completed' || stats.isAllCompleted;

                      return (
                        <>
                          <div 
                            className={cn(
                              "h-1.5 w-16 bg-slate-900/90 rounded-full overflow-hidden border shrink-0 flex",
                              isCompleted ? "border-emerald-500/30" : "border-amber-500/25"
                            )}
                            title={
                              stats.tierSegments.length > 0
                                ? `Total: ${stats.completedMinutes}m (${stats.tierSegments.map(s => `${s.label}: ${s.minutes}m`).join(', ')})`
                                : undefined
                            }
                          >
                            {stats.tierSegments.map((seg, idx) => (
                              <div 
                                key={idx}
                                className={cn(
                                  "h-full transition-all duration-300",
                                  getTierProgressColor(seg.level, isCompleted, 'amber')
                                )}
                                style={{ width: `${seg.percent}%` }}
                              />
                            ))}
                          </div>
                          <span className={cn(
                            "text-[10px] tabular-nums flex items-center justify-start w-20 font-mono",
                            isCompleted ? "font-bold text-emerald-400" : "font-semibold text-amber-400"
                          )}>
                            {formatTime(stats.completedMinutes)}
                            <span className={cn("text-[9px] mx-0.5", isCompleted ? "opacity-60 text-emerald-400" : "opacity-60 text-amber-500/80")}>/</span>
                            {formatTime(stats.targetMinutes)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-center justify-end shrink-0 gap-1">
                    <RowActionsMenu
                      actions={[
                        {
                          key: 'edit',
                          label: 'Edit',
                          icon: Edit2,
                          onClick: () => setEditingMajor(major),
                        },
                        {
                          key: 'top',
                          label: 'Move to top',
                          icon: ArrowUpToLine,
                          hidden: majorIdx === 0,
                          separatorBefore: true,
                          onClick: () => { onDragStart?.(); _onReorderMajor(major.id, 'top'); },
                        },
                        {
                          key: 'up',
                          label: 'Move up',
                          icon: ArrowUp,
                          hidden: majorIdx === 0,
                          onClick: () => { onDragStart?.(); _onReorderMajor(major.id, 'up'); },
                        },
                        {
                          key: 'down',
                          label: 'Move down',
                          icon: ArrowDown,
                          hidden: majorIdx >= filteredMajors.length - 1,
                          onClick: () => { onDragStart?.(); _onReorderMajor(major.id, 'down'); },
                        },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: Trash2,
                          danger: true,
                          hidden: !!major.isFinalized,
                          separatorBefore: true,
                          onClick: () => setModalConfig({
                            isOpen: true,
                            title: 'Delete Dungeon Goal',
                            message: `Are you sure you want to delete "${major.name}"? This action cannot be undone.`,
                            confirmText: 'Delete',
                            type: 'danger',
                            onConfirm: () => onDeleteMajor(major.id),
                          }),
                        },
                      ]}
                    />


                    {major.status === 'completed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onArchiveMajor(major.id); }}
                        className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-md transition-all"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                    
                    <div className="shrink-0 flex items-center justify-center w-6 h-6 text-slate-700 group-hover:text-indigo-400/50 transition-colors">
                      <ChevronDown size={14} className={cn("transition-transform duration-300", expandedMajors.includes(major.id) ? "rotate-180" : "")} />
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedMajors.includes(major.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-950/20 px-1.5 sm:px-1.5 pb-2.5 pt-1 space-y-1 rounded-b-xl"
                  >
                    {renderSubDungeons(major.id)}
                    
                        {major.status !== 'completed' && !major.isFinalized && (
                          <button 
                            onClick={() => setIsAddingSub({ parentId: major.id })}
                            className="w-full py-2 flex items-center justify-center gap-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all border border-dashed border-slate-800/50 mt-1"
                          >
                            <Plus size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">CREATE TIER 1</span>
                          </button>
                        )}
                  </motion.div>
                )}
              </AnimatePresence>
            </DraggableItem>
            ))}
            </Reorder.Group>
            
            {/* Add Major Dungeon Button at Bottom */}
            <button 
              onClick={() => setIsAddingMajor(true)}
              className="w-full py-4 mt-2 flex flex-col items-center justify-center gap-2 bg-slate-900/30 hover:bg-indigo-500/5 text-slate-500 hover:text-indigo-400 rounded-3xl border border-dashed border-slate-800/50 transition-all hover:border-indigo-500/30 group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-indigo-500/30 transition-all">
                <Plus size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em]">CREATE EXPEDITION GOAL</span>
            </button>
          </>
        )) : (
          <div className="space-y-6">
            {/* Archive Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text"
                  placeholder="Search archived dungeons..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    onClick={() => setDateFilter('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                      dateFilter === 'all' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-400"
                    )}
                  >All Time</button>
                  <button
                    onClick={() => setDateFilter('week')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                      dateFilter === 'week' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-400"
                    )}
                  >Last 7d</button>
                  <button
                    onClick={() => setDateFilter('month')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                      dateFilter === 'month' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-400"
                    )}
                  >Last 30d</button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Archive size={14} className="text-slate-600" />
                          <span>Dungeon Goal</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-600" />
                          <span>Completion Date</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Trophy size={14} className="text-slate-600" />
                          <span>Rewards</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredMajors.sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()).map(major => {
                      const associatedSubDungeons = dungeons.filter(d => d.parentId === major.id);
                      return (
                        <tr key={major.id} className="group hover:bg-slate-800/10 transition-colors">
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                                <p className="font-bold text-slate-200 text-sm tracking-tight">{major.name}</p>
                                {associatedSubDungeons.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1 opacity-60">
                                    {associatedSubDungeons.map(sub => (
                                      <span key={sub.id} className="text-[9px] text-slate-500 font-medium">
                                        • {sub.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                              {major.completedAt ? new Date(major.completedAt).toLocaleDateString() : '—'}
                            </span>
                          </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {major.rewards?.map((r, i) => (
                              <div key={i} className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter tabular-nums whitespace-nowrap">
                                {r.type === 'text' ? r.rewardText : 
                                 r.type === 'talentPoint' ? `${r.amount} PT` :
                                 `${r.amount} ${r.type === 'item' ? (r.itemName || 'Item') : r.type}`}
                                {i < (major.rewards?.length || 0) - 1 ? ',' : ''}
                              </div>
                            ))}
                            {(!major.rewards || major.rewards.length === 0) && (
                              <span className="text-[10px] text-slate-700 italic pr-1">—</span>
                            )}
                          </div>
                        </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => onUpdateMajor(major.id, { status: 'completed' })}
                              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors"
                            >
                              Unarchive
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMajors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-slate-800/50 rounded-full text-slate-600">
                              <Archive size={32} />
                            </div>
                            <p className="text-slate-500 italic pr-1 text-sm">No archived dungeons found.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
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
});
