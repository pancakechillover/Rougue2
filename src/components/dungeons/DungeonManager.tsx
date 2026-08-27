import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Dungeon, MajorDungeon, DungeonReward } from '../../types';
import { Plus, Target, Sword, CheckCircle2, ChevronRight, Trash2, FolderPlus, Folder, ChevronDown, ChevronUp, Gift, X, Edit2, Coins, Zap, Trophy, HelpCircle, Square, CheckSquare, EyeOff, Eye, Archive, Search, Filter, Calendar, GripVertical, Scroll, RefreshCcw } from 'lucide-react';
import { PageHeader } from '../PageHeader';
import { cn } from '../../lib/utils';
import { SpinnerInput } from '../SpinnerInput';
import { ConfirmModal } from '../ConfirmModal';
import { PresetControl, getAutoLoadedPreset } from '../PresetControl';
import { DatePicker } from '../DatePicker';
import { format } from 'date-fns';

const DraggableItem = ({ item, isEditMode, children, className, handleClassName, onMove, onDragStart }: any) => {
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
            className={cn("cursor-grab active:cursor-grabbing touch-none p-1.5 flex items-center justify-center shrink-0 text-slate-500 hover:text-white transition-colors z-20 pointer-events-auto mt-1", handleClassName)}
            onPointerDown={(e) => {
              // Prevent default to help with mobile scrolling spikes
              if (e.pointerType === 'touch') {
                e.preventDefault(); 
              }
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

interface DungeonManagerProps {
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  currentDungeonId: string | null;
  standardSessionMinutes?: number;
  standardRestMinutes?: number;
  includeRestTimeInTasks?: boolean;
  isAddingMajor: boolean;
  setIsAddingMajor: (val: boolean) => void;
  onSelect: (id: string) => void;
  onCreateMajor: (name: string, description: string, rewards?: DungeonReward[], isRoutine?: boolean, routineType?: 'daily' | 'weekly' | 'monthly', deadline?: string) => void;
  onCreateSub: (dungeon: Omit<Dungeon, 'id' | 'completedSessions' | 'status'>) => void;
  onUpdateMajor: (id: string, updates: Partial<MajorDungeon>) => void;
  onUpdateSub: (id: string, updates: Partial<Dungeon>) => void;
  onDeleteMajor: (id: string) => void;
  onDeleteSub: (id: string) => void;
  onReorderMajor: (id: string, direction: 'up' | 'down') => void;
  onReorderSub: (id: string, direction: 'up' | 'down') => void;
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
  onReorderMajor,
  onReorderSub,
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
    deadline: undefined as string | undefined
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
    deadline: undefined as string | undefined
  });

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
        deadline: undefined
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
          deadline: undefined
        });
        return;
      }

      setNewMajor({
        name: '',
        description: '',
        rewards: [{ type: 'coins', amount: 100 }],
        isRoutine: false,
        routineType: 'daily',
        deadline: undefined
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
          deadline: undefined
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
        deadline: undefined
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
          <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/50 border border-slate-800 text-[10px] font-bold text-slate-400 shrink-0 max-w-[120px] truncate">
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
              const itemsToReorder = currentSubsInParent.filter(d => reorderedIds.includes(d.id));
              
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
        className={cn(
        "space-y-0.5 min-h-[10px]",
        "ml-3 border-l border-slate-800 pl-3"
      )}>
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
              className="space-y-0.5 relative z-10"
            >
              <div
                id={`dungeon-${sub.id}`}
                data-id={sub.id}
                data-drop-target="true"
                className={cn(
                  "p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 transition-colors group/sub rounded-lg relative bg-slate-900/40",
                  currentDungeonId === sub.id ? "bg-indigo-500/10" : "hover:bg-slate-800/40",
                  "before:content-[''] before:absolute before:left-[-12px] before:top-1/2 before:w-[12px] before:h-[1px] before:bg-slate-800"
                )}
                onClick={() => onSelect(sub.id)}
              >
                <div className="min-w-0 flex-1 flex items-start md:items-center gap-1.5">
                  <div className="flex items-center shrink-0 mt-[2px] md:mt-0 gap-1">
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
                        {sub.name || <span className="italic opacity-50">Unnamed Task</span>}
                      </span>
                      
                      {sub.deadline && sub.status !== 'completed' && (
                        <div className={cn("flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-black uppercase shadow-sm",
                          sub.deadline < format(new Date(), 'yyyy-MM-dd') ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        )}>
                          <Calendar size={10} />
                          <span>{sub.deadline}</span>
                        </div>
                      )}
                      
                      {sub.isRoutine && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase shadow-sm shrink-0" title="Refreshes progress on reset">
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

                      {renderRewards(sub)}
                    </div>
                    {sub.description && (
                      <div className="text-[11px] text-slate-400 italic truncate font-medium mt-0.5 max-w-full pr-1">{sub.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 md:gap-3 pl-7 md:pl-0 shrink-0 w-full md:w-auto mt-1 md:mt-0">
                  <div className="hidden sm:flex items-center gap-2 opacity-60">
                    {sub.isOpenEnded ? (
                      <span className="text-[10px] font-bold text-slate-400 tabular-nums inline-block w-24 text-right whitespace-nowrap overflow-hidden text-ellipsis mr-auto">
                        {sub.totalFocusTime || 0} min focused
                      </span>
                    ) : (
                      <>
                        <div className="h-1.5 w-16 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                          <div 
                            className={cn("h-full transition-all", sub.status === 'completed' ? "bg-emerald-500" : "bg-indigo-500")}
                            style={{ width: `${Math.min(100, (sub.completedSessions/sub.totalSessions)*100)}%` }}
                          />
                        </div>
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums flex items-center justify-end w-20">
                            {(() => {
                              const timePerRoom = standardSessionMinutes + (includeRestTimeInTasks ? standardRestMinutes : 0);
                              
                              const formatTime = (mins: number) => {
                                if (mins < 60) return <>{Math.floor(mins)}<span className="text-[9px] opacity-70 ml-[1px]">m</span></>;
                                const h = Math.floor(mins / 60);
                                const m = Math.floor(mins % 60);
                                return m > 0 
                                  ? <>{h}<span className="text-[9px] opacity-70 ml-[1px]">h</span> {m}<span className="text-[9px] opacity-70 ml-[1px]">m</span></>
                                  : <>{h}<span className="text-[9px] opacity-70 ml-[1px]">h</span></>;
                              };

                              return (
                                <>
                                  {formatTime(sub.completedSessions * timePerRoom)}
                                  <span className="opacity-50 text-[9px] mx-1">/</span>
                                  {formatTime(sub.totalSessions * timePerRoom)}
                                </>
                              );
                            })()}
                          </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-1 md:flex-none justify-end items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1.5 shrink-0 transition-opacity",
                      isEditMode ? "opacity-100" : "opacity-0 group-hover/sub:opacity-100 md:opacity-0 md:group-hover/sub:opacity-100 opacity-100"
                    )}>
                      {isEditMode && (
                        <>
                          {currentDepth < 3 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsAddingSub({ parentId: sub.id }); }}
                              className="p-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded transition-all"
                              title={`ADD TIER ${currentDepth + 1}`}
                            >
                              <Plus size={11} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSub(sub); }}
                            className={cn(
                              "p-1 rounded transition-all",
                              (sub.status === 'completed' || majorDungeons.find(m => m.id === (typeof sub.parentId === 'string' && sub.parentId.length > 10 ? dungeons.find(d => d.id === sub.parentId)?.parentId : sub.parentId))?.isFinalized)
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-slate-800/50 text-slate-500 hover:text-white"
                            )}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setModalConfig({
                                isOpen: true,
                                title: `Delete ${getSubDungeonDepth(sub.id) > 1 ? 'Tier' : 'Sub-Dungeon'}`,
                                message: `Are you sure you want to delete "${sub.name}"? This action cannot be undone.`,
                                confirmText: "Delete",
                                type: "danger",
                                onConfirm: () => onDeleteSub(sub.id)
                              });
                            }}
                            className="p-1 bg-slate-800/50 text-slate-500 hover:text-red-400 rounded transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center ml-1">
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

  const activeDungeon = dungeons.find(d => d.id === currentDungeonId);

  const filteredMajors = React.useMemo(() => {
    if (activeTab === 'active') {
      return majorDungeons.filter(m => m.status !== 'archived');
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
  }, [majorDungeons, activeTab, archiveSearch, dateFilter]);

  return (
    <div className="space-y-8">
      {/* Active Dungeon moved to Top Bar */}

      <AnimatePresence>
        {(editingMajor || editingSub || isAddingMajor || isAddingSub) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                  {isAddingMajor ? 'CREATE EXPEDITION GOAL' : isAddingSub ? `CREATE TIER ${getSubDungeonDepth(isAddingSub.parentId) + 1}` : `EDIT ${editingMajor ? 'DUNGEON GOAL' : 'TIER ' + getSubDungeonDepth(editingSub?.id || '')}`}
                </h3>
                <div className="flex items-center gap-3">
                  {(isAddingMajor || isAddingSub) && (
                    <PresetControl
                      type={isAddingMajor ? 'dungeon_major' : 'dungeon_sub'}
                      currentData={isAddingMajor ? newMajor : newSub}
                      defaultData={(isAddingMajor ? {
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
                  <button onClick={() => { setEditingMajor(null); setEditingSub(null); setIsAddingMajor(false); setIsAddingSub(null); }} className="text-slate-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={cn("space-y-1", (editingSub || isAddingSub) && !(isAddingSub ? newSub.isOpenEnded : editingSub?.isOpenEnded) ? "sm:col-span-1" : "sm:col-span-2")}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Name</label>
                    <input
                      type="text"
                      value={isAddingMajor ? newMajor.name : isAddingSub ? newSub.name : (editingMajor ? editingMajor.name : editingSub?.name || '')}
                      onChange={e => {
                        if (isAddingMajor) setNewMajor({ ...newMajor, name: e.target.value });
                        else if (isAddingSub) setNewSub({ ...newSub, name: e.target.value });
                        else if (editingMajor) setEditingMajor({ ...editingMajor, name: e.target.value });
                        else if (editingSub) setEditingSub({ ...editingSub, name: e.target.value });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder={isAddingMajor || isAddingSub ? "Goal Name" : ""}
                    />
                  </div>
                  {(editingSub || isAddingSub) && !(isAddingSub ? newSub.isOpenEnded : editingSub?.isOpenEnded) && (
                    <div className="space-y-1 sm:col-span-1">
                      <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Rooms</label>
                          <div className="text-[10px] text-indigo-400 font-bold tabular-nums">
                            {(() => {
                              const rooms = isAddingSub ? (newSub.totalSessions || 0) : (editingSub?.totalSessions || 0);
                              if (!rooms) return null;
                              const timePerRoom = standardSessionMinutes + (includeRestTimeInTasks ? standardRestMinutes : 0);
                              const totalMinutes = rooms * timePerRoom;
                              if (totalMinutes < 60) return `${totalMinutes} min`;
                              const h = Math.floor(totalMinutes / 60);
                              const m = totalMinutes % 60;
                              return m > 0 ? `${h} h ${m} min` : `${h} h`;
                            })()}
                          </div>
                      </div>
                      <SpinnerInput
                        min={1}
                        value={isAddingSub ? (newSub.totalSessions === undefined ? '' : newSub.totalSessions) : (editingSub?.totalSessions === undefined ? '' : editingSub.totalSessions)}
                        onChange={(val) => {
                          if (isAddingSub) setNewSub({ ...newSub, totalSessions: typeof val === 'number' ? Math.max(1, val) : '' as any });
                          else if (editingSub) setEditingSub({ ...editingSub, totalSessions: typeof val === 'number' ? Math.max(1, val) : '' as any });
                        }}
                        className="w-full text-sm focus:border-indigo-500"
                      />
                    </div>
                  )}
                  {(editingMajor || isAddingMajor || editingSub || isAddingSub) && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                        <span>Deadline (Optional)</span>
                        {Boolean(isAddingMajor ? newMajor.deadline : isAddingSub ? newSub.deadline : editingMajor ? editingMajor.deadline : editingSub?.deadline) && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              if (isAddingMajor) setNewMajor({ ...newMajor, deadline: undefined });
                              else if (isAddingSub) setNewSub({ ...newSub, deadline: undefined });
                              else if (editingMajor) setEditingMajor({ ...editingMajor, deadline: undefined });
                              else if (editingSub) setEditingSub({ ...editingSub, deadline: undefined });
                            }}
                            className="text-[10px] underline text-slate-500 hover:text-slate-300"
                          >Clear</button>
                        )}
                      </label>
                      <DatePicker
                        value={isAddingMajor ? newMajor.deadline || '' : isAddingSub ? newSub.deadline || '' : editingMajor ? editingMajor.deadline || '' : editingSub?.deadline || ''}
                        onChange={(val) => {
                          if (isAddingMajor) setNewMajor({ ...newMajor, deadline: val });
                          else if (isAddingSub) setNewSub({ ...newSub, deadline: val });
                          else if (editingMajor) setEditingMajor({ ...editingMajor, deadline: val });
                          else if (editingSub) setEditingSub({ ...editingSub, deadline: val });
                        }}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  )}
                  {(editingMajor || isAddingMajor || editingSub || isAddingSub) && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                      <input
                        type="text"
                        value={isAddingMajor ? newMajor.description : isAddingSub ? newSub.description : (editingMajor ? editingMajor.description : editingSub?.description || '') || ''}
                        onChange={e => {
                          if (isAddingMajor) setNewMajor({ ...newMajor, description: e.target.value });
                          else if (isAddingSub) setNewSub({ ...newSub, description: e.target.value });
                          else if (editingMajor) setEditingMajor({ ...editingMajor, description: e.target.value });
                          else if (editingSub) setEditingSub({ ...editingSub, description: e.target.value });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        placeholder={isAddingMajor || isAddingSub ? "Description" : "Optional description"}
                      />
                    </div>
                  )}

                  {(editingSub || isAddingSub) && (
                    <div className="sm:col-span-2 pt-1 pb-1">
                       <label className="flex items-center gap-3 text-white cursor-pointer border border-slate-700/50 bg-slate-800/30 px-4 py-3 rounded-xl hover:border-indigo-500/50 transition-colors">
                         <div className="shrink-0 flex items-center justify-center">
                           <input
                             type="checkbox"
                             checked={
                               isAddingSub ? newSub.isOpenEnded :
                               editingSub ? editingSub.isOpenEnded : false
                             }
                             onChange={e => {
                               if (isAddingSub) setNewSub({ ...newSub, isOpenEnded: e.target.checked });
                               else if (editingSub) setEditingSub({ ...editingSub, isOpenEnded: e.target.checked });
                             }}
                             className="w-4 h-4 rounded bg-slate-900 border-slate-600 focus:ring-indigo-500 text-indigo-500 cursor-pointer"
                           />
                         </div>
                         <div className="flex-1 flex items-center justify-between min-w-0">
                           <span className="font-semibold text-slate-200 text-sm">Open-Ended Task</span>
                           <span className="text-[11px] text-slate-500 truncate ml-2">Track time endlessly without session goals</span>
                         </div>
                       </label>
                    </div>
                  )}

                  {(editingMajor || isAddingMajor || editingSub || isAddingSub) && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="flex items-center gap-2 text-white text-sm cursor-pointer border border-slate-700 bg-slate-800 p-3 rounded-xl hover:border-indigo-500 transition-colors">
                        <input
                          type="checkbox"
                          checked={
                            isAddingMajor ? newMajor.isRoutine : 
                            isAddingSub ? newSub.isRoutine :
                            editingMajor ? editingMajor.isRoutine :
                            editingSub ? editingSub.isRoutine : false
                          }
                          onChange={e => {
                            if (isAddingMajor) setNewMajor({ ...newMajor, isRoutine: e.target.checked });
                            else if (isAddingSub) setNewSub({ ...newSub, isRoutine: e.target.checked });
                            else if (editingMajor) setEditingMajor({ ...editingMajor, isRoutine: e.target.checked });
                            else if (editingSub) setEditingSub({ ...editingSub, isRoutine: e.target.checked });
                          }}
                          className="w-4 h-4 rounded bg-slate-900 border-indigo-500 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="font-bold">Routine {isAddingMajor || editingMajor ? 'Expedition' : 'Tier'}</span>
                        <span className="text-xs text-slate-400 font-normal ml-auto">Resets progress periodically</span>
                      </label>
                      
                      {(
                        isAddingMajor ? newMajor.isRoutine : 
                        isAddingSub ? newSub.isRoutine :
                        editingMajor ? editingMajor.isRoutine : 
                        editingSub ? editingSub.isRoutine : false
                      ) && (
                        <div className="flex gap-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest my-auto mr-2">Interval</span>
                          {(['daily', 'weekly', 'monthly'] as const).map(t => (
                            <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white">
                              <input
                                type="radio"
                                name="routineType"
                                value={t}
                                checked={(
                                  isAddingMajor ? newMajor.routineType :
                                  isAddingSub ? newSub.routineType :
                                  editingMajor ? editingMajor.routineType :
                                  editingSub ? editingSub.routineType : 'daily'
                                ) === t}
                                onChange={e => {
                                  if (isAddingMajor) setNewMajor({ ...newMajor, routineType: e.target.value as any });
                                  else if (isAddingSub) setNewSub({ ...newSub, routineType: e.target.value as any });
                                  else if (editingMajor) setEditingMajor({ ...editingMajor, routineType: e.target.value as any });
                                  else if (editingSub) setEditingSub({ ...editingSub, routineType: e.target.value as any });
                                }}
                                className="w-4 h-4 text-indigo-500 border-slate-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                              <span className="capitalize font-medium">{t}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {editingMajor && !editingMajor.isFinalized && editingMajor.status !== 'completed' && dungeons.some(d => d.parentId === editingMajor.id) && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Target size={18} />
                        <span className="text-sm font-bold uppercase tracking-wider">Finalization Check</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Once finalized, you cannot add more tiers or edit rewards. 
                        Major rewards are only granted if the goal is finalized before completion.
                      </p>
                      <button
                        onClick={() => {
                          onFinalizeMajor(editingMajor.id);
                          setEditingMajor(null);
                        }}
                        className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-bold uppercase transition-all border border-amber-500/30"
                      >
                        Finalize Now
                      </button>
                    </div>
                  )}

                  {(() => {
                    const isRewardLocked = editingMajor 
                      ? (editingMajor.isFinalized || editingMajor.status === 'completed')
                      : editingSub
                      ? (editingSub.status === 'completed' || majorDungeons.find(m => m.id === editingSub.parentId)?.isFinalized)
                      : isAddingSub
                      ? (majorDungeons.find(m => m.id === isAddingSub.parentId)?.isFinalized)
                      : false;

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            Completion Rewards {isRewardLocked && <span className="text-amber-500 text-[10px] lowercase italic pr-1">(Locked)</span>}
                          </h5>
                          {!isRewardLocked && (
                            <button 
                              onClick={() => addReward(isAddingMajor || !!editingMajor)}
                              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              <Plus size={14} /> Add Reward
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {(isAddingMajor ? newMajor.rewards : isAddingSub ? newSub.rewards : (editingMajor?.rewards || editingSub?.rewards || [])).map((reward, idx) => (
                            <div key={idx} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-3 relative">
                              <div className="flex items-center gap-2">
                                <select 
                                  value={reward.type}
                                  disabled={isRewardLocked}
                                  onChange={e => updateReward(idx, 'type', e.target.value, !!isAddingMajor || !!editingMajor)}
                                  className={cn(
                                    "flex-grow bg-slate-900 text-sm border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500",
                                    isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                  )}
                                >
                                  <option value="coins">Coins</option>
                                  <option value="xp">XP</option>
                                  <option value="talentPoint">Talent Scrolls</option>
                                  <option value="item">Item</option>
                                  <option value="text">Custom Text</option>
                                </select>
                                <SpinnerInput 
                                  disabled={isRewardLocked}
                                  value={reward.amount === undefined || reward.amount === null ? '' : reward.amount}
                                  onChange={(val) => {
                                    updateReward(idx, 'amount', typeof val === 'number' ? val : ('' as any), !!isAddingMajor || !!editingMajor);
                                  }}
                                  className={cn(
                                    "w-24 text-sm px-2",
                                    isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                  )}
                                  placeholder="Amt"
                                />
                                {!isRewardLocked && (
                                  <button onClick={() => removeReward(idx, !!isAddingMajor || !!editingMajor)} className="p-1.5 text-slate-500 hover:text-red-400">
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                              {reward.type === 'item' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <select 
                                    disabled={isRewardLocked}
                                    value={reward.itemType}
                                    onChange={e => updateReward(idx, 'itemType', e.target.value, !!isAddingMajor || !!editingMajor)}
                                    className={cn(
                                      "bg-slate-900 text-xs border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500",
                                      isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                    )}
                                  >
                                    <option value="talent_shard">Talent Shard</option>
                                    <option value="death_defying_medal">Medal</option>
                                    <option value="double_xp">Double XP</option>
                                    <option value="double_coin">Double Coin</option>
                                  </select>
                                  <input 
                                    type="text"
                                    disabled={isRewardLocked}
                                    placeholder="Item Name"
                                    value={reward.itemName || ''}
                                    onChange={e => updateReward(idx, 'itemName', e.target.value, !!isAddingMajor || !!editingMajor)}
                                    className={cn(
                                      "bg-slate-900 text-xs border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500",
                                      isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                    )}
                                  />
                                </div>
                              )}
                              {reward.type === 'text' && (
                                <input 
                                  type="text"
                                  disabled={isRewardLocked}
                                  placeholder="Reward Message"
                                  value={reward.rewardText || ''}
                                  onChange={e => updateReward(idx, 'rewardText', e.target.value, !!isAddingMajor || !!editingMajor)}
                                  className={cn(
                                    "w-full bg-slate-900 text-xs border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500",
                                    isRewardLocked ? "text-slate-500 cursor-not-allowed opacity-70" : "text-white"
                                  )}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </>
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
                      onCreateMajor(newMajor.name, newMajor.description, newMajor.rewards, newMajor.isRoutine, newMajor.routineType, newMajor.deadline);
                      setIsAddingMajor(false);
                    } else if (isAddingSub) {
                      onCreateSub({ ...newSub, parentId: isAddingSub.parentId });
                      setIsAddingSub(null);
                    } else if (editingMajor) {
                      onUpdateMajor(editingMajor.id, { 
                        name: editingMajor.name, 
                        description: editingMajor.description, 
                        rewards: editingMajor.rewards,
                        isRoutine: editingMajor.isRoutine,
                        routineType: editingMajor.routineType,
                        deadline: editingMajor.deadline
                      });
                      setEditingMajor(null);
                    } else if (editingSub) {
                      onUpdateSub(editingSub.id, { 
                        name: editingSub.name, 
                        description: editingSub.description, 
                        totalSessions: editingSub.totalSessions, 
                        isOpenEnded: editingSub.isOpenEnded,
                        rewards: editingSub.rewards,
                        isRoutine: editingSub.isRoutine,
                        routineType: editingSub.routineType,
                        deadline: editingSub.deadline
                      });
                      setEditingSub(null);
                    }
                  }}
                  className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  {isAddingMajor ? 'CREATE EXPEDITION GOAL' : isAddingSub ? 'CREATE TIER' : 'SAVE CHANGES'}
                </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}


      </AnimatePresence>

      {/* Tab Switcher Removed */}

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
            {filteredMajors.map(major => (
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
                        <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-black uppercase shadow-sm shrink-0", 
                          major.deadline < format(new Date(), 'yyyy-MM-dd') ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                        )}>
                          <Calendar size={10} />
                          <span>{major.deadline}</span>
                        </div>
                      )}
                      {major.description && (
                         <p className="text-xs text-slate-400 font-medium italic mt-0.5 line-clamp-1 w-full pr-1">{major.description}</p>
                      )}
                      
                      {major.isRoutine && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase shadow-sm" title="Refreshes progress on reset">
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
                
                <div className="flex items-center gap-1.5 shrink-0">
                  
                  {isEditMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingMajor(major); }}
                        className={cn(
                          "p-1 rounded-md transition-all",
                          (major.status === 'completed' || major.isFinalized)
                            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                            : "bg-slate-800 text-slate-500 hover:text-white"
                        )}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (major.isFinalized) return;
                          setModalConfig({
                            isOpen: true,
                            title: "Delete Dungeon Goal",
                            message: `Are you sure you want to delete "${major.name}"? This action cannot be undone.`,
                            confirmText: "Delete",
                            type: "danger",
                            onConfirm: () => onDeleteMajor(major.id)
                          });
                        }}
                        className={cn(
                          "p-1 rounded-md transition-all",
                          major.isFinalized 
                            ? "bg-slate-800/30 text-slate-600 cursor-not-allowed" 
                            : "bg-slate-800 text-slate-500 hover:text-red-400"
                        )}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {major.status === 'completed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onArchiveMajor(major.id); }}
                      className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-md transition-all"
                    >
                      <Archive size={14} />
                    </button>
                  )}
                  
                  <div className="p-1 text-slate-700 group-hover:text-indigo-400/50 transition-colors">
                    <ChevronDown size={14} className={cn("transition-transform duration-300", expandedMajors.includes(major.id) ? "rotate-180" : "")} />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedMajors.includes(major.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-950/20 px-3 pb-3 space-y-0.5 rounded-b-xl"
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
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 bg-slate-900/50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest italic pr-1">
                        <div className="flex items-center gap-2">
                          <Archive size={14} className="text-slate-600" />
                          <span>Dungeon Goal</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest italic pr-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-600" />
                          <span>Completion Date</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest italic pr-1">
                        <div className="flex items-center gap-2">
                          <Trophy size={14} className="text-slate-600" />
                          <span>Rewards</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest italic pr-1 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredMajors.sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()).map(major => {
                      const associatedSubDungeons = dungeons.filter(d => d.parentId === major.id);
                      return (
                        <tr key={major.id} className="group hover:bg-slate-800/10 transition-colors">
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                              {major.completedAt ? new Date(major.completedAt).toLocaleDateString() : '—'}
                            </span>
                          </td>
                        <td className="px-6 py-4">
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
                          <td className="px-6 py-5 text-right">
                            <button 
                              onClick={() => onUpdateMajor(major.id, { status: 'completed' })}
                              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold rounded-lg transition-all border border-slate-700 uppercase tracking-widest"
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
