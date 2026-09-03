import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle, 
  Circle, 
  Play, 
  Trash2, 
  Calendar, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  ListPlus,
  Layers,
  CalendarClock,
  RotateCcw,
  RefreshCcw,
  ArrowUpDown
} from 'lucide-react';
import { AppState, Dungeon, MajorDungeon, TodayTodo } from '../../types';
import { motion, Reorder, useDragControls } from 'motion/react';
import { cn, getSettlementDay, sortAgendaTodos } from '../../lib/utils';
import { format, addDays, subDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { DatePicker } from '../common/DatePicker';
import { ExpeditionTreePicker } from '../common/ExpeditionTreePicker';
import { playSound } from '../../lib/sound';

interface DraggableAgendaItemProps {
  todo: TodayTodo;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const DraggableAgendaItem: React.FC<DraggableAgendaItemProps> = ({
  todo,
  children,
  className,
  onClick
}) => {
  const controls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const didDragRef = React.useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }
    didDragRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    timerRef.current = setTimeout(() => {
      setIsDragging(true);
      didDragRef.current = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      controls.start(e);
    }, 300);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (timerRef.current && startPosRef.current) {
      const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
      if (dist > 8) {
        clearTimer();
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (didDragRef.current || isDragging) {
      e.stopPropagation();
      didDragRef.current = false;
      return;
    }
    onClick?.();
  };

  return (
    <Reorder.Item
      as="div"
      value={todo}
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => {
        setIsDragging(false);
        setTimeout(() => { didDragRef.current = false; }, 50);
      }}
      className={cn(className, "w-full relative touch-pan-y select-none", isDragging && "z-50 shadow-lg ring-1 ring-indigo-500/30 opacity-95")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onPointerLeave={clearTimer}
      onClick={handleClick}
    >
      {children}
    </Reorder.Item>
  );
};

interface TodayViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  dungeons: Dungeon[];
  majorDungeons?: MajorDungeon[];
  onBack: () => void;
  setActiveTab: (tab: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ 
  state, 
  setState, 
  dungeons, 
  majorDungeons = [], 
  onBack, 
  setActiveTab 
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [showExpeditionPicker, setShowExpeditionPicker] = useState(false);

  // Time settings
  const ts = state.timeSettings || {
    morning: { start: 8, end: 12 },
    afternoon: { start: 14, end: 18 },
    night: { start: 20, end: 24 }
  };
  const borderHour = ts.morning.start;

  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');

  // Derive date boundaries based strictly on the selected `viewDate` settlement day
  const settlementDateStr = getSettlementDay(viewDate, state.timeSettings);
  const baseDate = new Date(settlementDateStr);
  const startTime = new Date(baseDate);
  startTime.setHours(borderHour, 0, 0, 0);
  const endTime = new Date(startTime);
  endTime.setDate(endTime.getDate() + 1);

  // Derive the target date string for matching todos
  const currentViewDateStr = format(baseDate, 'yyyy-MM-dd');

  // Filter todos
  const allTodos = state.todayTodos || [];
  const todos = allTodos.filter(t => t.date === currentViewDateStr || (!t.date && currentViewDateStr === getSettlementDay(new Date(), state.timeSettings)));

  // Memoized O(1) Index Maps for Expeditions & Major Goals
  const dungeonMap = useMemo(() => {
    const map = new Map<string, Dungeon>();
    for (const d of dungeons) {
      map.set(d.id, d);
    }
    return map;
  }, [dungeons]);

  const majorDungeonMap = useMemo(() => {
    const map = new Map<string, MajorDungeon>();
    for (const m of majorDungeons) {
      map.set(m.id, m);
    }
    return map;
  }, [majorDungeons]);

  // Calculate sub-dungeon depth for Tier numbering in O(depth) using Map
  const getDungeonDepth = (subId: string): number => {
    let current = dungeonMap.get(subId);
    if (!current) return 1;
    let depth = 1;
    while (current && current.parentId) {
      const parent = dungeonMap.get(current.parentId);
      if (parent) {
        depth++;
        current = parent;
      } else {
        break;
      }
    }
    return depth;
  };

  // Calculate importable tasks: Yesterday's uncompleted agenda + Active expeditions with deadlines
  const importableTasks = useMemo(() => {
    const yesterdayDateStr = format(subDays(baseDate, 1), 'yyyy-MM-dd');
    const existingDungeonIds = new Set(todos.map(t => t.dungeonId).filter(Boolean));
    const existingTitles = new Set(todos.map(t => t.title.toLowerCase().trim()));

    const itemsToAdd: { title: string; dungeonId?: string; durationMinutes?: number; source: 'yesterday' | 'ddl' | 'routine' }[] = [];

    // 1. Yesterday's uncompleted agenda items
    const yesterdayTodos = allTodos.filter(t => {
      const isYesterday = t.date === yesterdayDateStr || (!t.date && yesterdayDateStr === getSettlementDay(subDays(new Date(), 1), state.timeSettings));
      return isYesterday && !t.completed;
    });

    for (const yTodo of yesterdayTodos) {
      const cleanTitle = yTodo.title.replace(/^\[Tier\s*\d+\]\s*/i, '').trim();
      if (yTodo.dungeonId) {
        const dungeon = dungeonMap.get(yTodo.dungeonId);
        if (dungeon && (dungeon.status === 'completed' || dungeon.status === 'archived')) continue;
        if (existingDungeonIds.has(yTodo.dungeonId)) continue;
        existingDungeonIds.add(yTodo.dungeonId);
        itemsToAdd.push({
          title: cleanTitle,
          dungeonId: yTodo.dungeonId,
          durationMinutes: yTodo.durationMinutes,
          source: 'yesterday'
        });
      } else {
        const normalizedTitle = cleanTitle.toLowerCase().trim();
        if (existingTitles.has(normalizedTitle)) continue;
        existingTitles.add(normalizedTitle);
        itemsToAdd.push({
          title: cleanTitle,
          durationMinutes: yTodo.durationMinutes,
          source: 'yesterday'
        });
      }
    }

    // 2. Uncompleted expeditions with a deadline (DDL) set
    const activeDungeonsWithDeadline = dungeons.filter(d => {
      if (d.status === 'completed' || d.status === 'archived') return false;
      if (d.completedSessions >= d.totalSessions && d.totalSessions > 0) return false;
      const parentMajor = d.parentId ? majorDungeonMap.get(d.parentId) : undefined;
      const hasDeadline = (d.deadline && d.deadline.trim() !== '') || (parentMajor?.deadline && parentMajor.deadline.trim() !== '');
      return Boolean(hasDeadline);
    });

    for (const d of activeDungeonsWithDeadline) {
      if (existingDungeonIds.has(d.id)) continue;
      existingDungeonIds.add(d.id);
      const cleanDungeonName = d.name.replace(/^\[Tier\s*\d+\]\s*/i, '').trim();
      itemsToAdd.push({
        title: cleanDungeonName,
        dungeonId: d.id,
        source: 'ddl'
      });
    }

    // 3. Uncompleted expeditions with routine attribute
    const activeRoutineDungeons = dungeons.filter(d => {
      if (d.status === 'completed' || d.status === 'archived') return false;
      if (d.completedSessions >= d.totalSessions && d.totalSessions > 0) return false;
      const parentMajor = d.parentId ? majorDungeonMap.get(d.parentId) : undefined;
      return Boolean(d.isRoutine || parentMajor?.isRoutine);
    });

    for (const d of activeRoutineDungeons) {
      if (existingDungeonIds.has(d.id)) continue;
      existingDungeonIds.add(d.id);
      const cleanDungeonName = d.name.replace(/^\[Tier\s*\d+\]\s*/i, '').trim();
      itemsToAdd.push({
        title: cleanDungeonName,
        dungeonId: d.id,
        source: 'routine'
      });
    }

    return itemsToAdd;
  }, [baseDate, allTodos, todos, dungeons, dungeonMap, majorDungeonMap, state.timeSettings]);

  const handleImportPendingAndDdl = () => {
    if (importableTasks.length === 0) return;

    const newTodos: TodayTodo[] = importableTasks.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      title: item.title.replace(/^\[Tier\s*\d+\]\s*/i, '').trim(),
      dungeonId: item.dungeonId,
      completed: false,
      durationMinutes: item.durationMinutes,
      date: currentViewDateStr,
      source: item.source
    }));

    setState(prev => ({
      ...prev,
      todayTodos: [...(prev.todayTodos || []), ...newTodos]
    }));
    playSound('click', state.soundVolume, state.soundEnabled);
  };

  const handleAddTodo = (e?: React.FormEvent, title?: string, dungeonId?: string) => {
    if (e) e.preventDefault();
    const t = title || newTaskTitle;
    if (!t.trim()) return;

    const cleanTitle = t.replace(/^\[Tier\s*\d+\]\s*/i, '').trim();

    const newTodo: TodayTodo = {
      id: Math.random().toString(36).substr(2, 9),
      title: cleanTitle,
      dungeonId,
      completed: false,
      date: currentViewDateStr,
      source: dungeonId ? 'expedition' : 'manual'
    };

    setState(prev => ({
      ...prev,
      todayTodos: [...(prev.todayTodos || []), newTodo]
    }));
    setNewTaskTitle('');
    setShowExpeditionPicker(false);
  };

  const handleTaskClick = (todo: TodayTodo) => {
    if (todo.dungeonId) {
      // If linked to expedition, toggle focus: cancel focus if already focused, else select it
      if (state.currentDungeonId === todo.dungeonId) {
        setState(prev => ({ ...prev, currentDungeonId: undefined }));
      } else {
        setState(prev => ({ ...prev, currentDungeonId: todo.dungeonId }));
      }
      // Navigation is handled exclusively by the Play/Focus button
    } else {
      // Regular manual todo toggles checkbox
      toggleTodo(todo.id);
    }
  };

  const handleReorderTodos = (newFilteredTodos: TodayTodo[]) => {
    const currentIds = new Set(newFilteredTodos.map(t => t.id));
    let newAllTodos: TodayTodo[] = [];
    let insertIndex = 0;
    for (const todo of allTodos) {
      if (currentIds.has(todo.id)) {
        if (insertIndex < newFilteredTodos.length) {
          newAllTodos.push(newFilteredTodos[insertIndex]);
          insertIndex++;
        }
      } else {
        newAllTodos.push(todo);
      }
    }
    while (insertIndex < newFilteredTodos.length) {
      newAllTodos.push(newFilteredTodos[insertIndex]);
      insertIndex++;
    }
    setState(prev => ({ ...prev, todayTodos: newAllTodos }));
  };

  const completedTodosCount = useMemo(() => {
    return todos.filter(t => {
      if (t.completed) return true;
      if (t.dungeonId) {
        const d = dungeonMap.get(t.dungeonId);
        return d?.status === 'completed';
      }
      return false;
    }).length;
  }, [todos, dungeonMap]);

  const pendingTodosCount = todos.length - completedTodosCount;

  const handleAutoSortTodos = () => {
    if (todos.length <= 1) return;
    const sorted = sortAgendaTodos(todos, dungeons, majorDungeons, baseDate);
    handleReorderTodos(sorted);
  };

  const toggleTodo = (id: string) => {
    setState(prev => ({
      ...prev,
      todayTodos: (prev.todayTodos || []).map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const removeTodo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setState(prev => ({
      ...prev,
      todayTodos: (prev.todayTodos || []).filter(t => t.id !== id)
    }));
  };

  const startTask = (todo: TodayTodo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.dungeonId) {
      setState(prev => ({ ...prev, currentDungeonId: todo.dungeonId }));
      setActiveTab('explore');
    } else {
      toggleTodo(todo.id);
    }
  };

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Close picker on outside click
  React.useEffect(() => {
    if (!showExpeditionPicker) return;
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.expedition-picker-container')) {
        setShowExpeditionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [showExpeditionPicker]);

  return (
    <div className="w-full px-4 py-4 sm:px-8 sm:py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black text-slate-50 tracking-tighter uppercase italic pr-1 flex items-center gap-2 sm:gap-3 min-w-0">
              <ListPlus className="text-indigo-400 w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
              <span className="truncate leading-none">Agenda</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {format(startTime, 'MMM do, HH:mm')} - {format(endTime, 'MMM do, HH:mm')}
            </p>
          </div>
            
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
            {todos.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 h-10 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 shadow-sm shrink-0">
                <span className={cn("font-bold", completedTodosCount > 0 ? "text-emerald-400" : "text-slate-400")}>
                  {completedTodosCount}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-200 font-bold">{todos.length}</span>
              </div>
            )}

            {todos.length > 0 && (
              <button
                type="button"
                onClick={handleAutoSortTodos}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0",
                  "bg-slate-900 hover:bg-indigo-500/15 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 active:scale-95"
                )}
                title="Auto-Sort: Overdue DDL → Left DDL → Yesterday → Routine → General"
              >
                <ArrowUpDown size={16} className="text-indigo-400" />
              </button>
            )}

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 h-10">
              <button 
                onClick={() => setViewDate(prev => subDays(prev, 1))}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              <DatePicker
                value={format(viewDate, 'yyyy-MM-dd')}
                onChange={(newDateStr) => setViewDate(new Date(newDateStr))}
                indicators={useMemo(() => {
                  const result: Record<string, { highlight?: boolean; star?: boolean }> = {};
                  allTodos.forEach(t => {
                    if (t.date) {
                      result[t.date] = { highlight: true };
                    }
                  });
                  return result;
                }, [allTodos])}
              >
                <div className="px-3 text-sm font-bold text-white whitespace-nowrap min-w-[120px] text-center hover:bg-slate-800 rounded-lg h-8 transition-colors flex items-center justify-center cursor-pointer">
                  {format(baseDate, 'MMMM do')}
                </div>
              </DatePicker>

              <button 
                onClick={() => setViewDate(prev => addDays(prev, 1))}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={onBack}
              className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
              title="Back to Sanctum"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6">
            <form onSubmit={(e) => handleAddTodo(e)} className="flex items-stretch gap-1.5 sm:gap-2 mb-4">
              <input
                type="text"
                placeholder="What do you want to focus on this day?"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />

              <button
                type="button"
                onClick={handleImportPendingAndDdl}
                disabled={importableTasks.length === 0}
                className={cn(
                  "relative px-3 sm:px-4 rounded-xl border flex items-center justify-center transition-all shrink-0",
                  importableTasks.length > 0
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/25 hover:border-indigo-500/60 hover:text-indigo-300 shadow-sm"
                    : "bg-slate-800/40 border-slate-800/60 text-slate-500 cursor-not-allowed opacity-40"
                )}
                title={
                  importableTasks.length > 0 
                    ? `Import ${importableTasks.length} pending task${importableTasks.length > 1 ? 's' : ''} (yesterday's unfinished, active deadlines & routines)`
                    : "No pending, deadline, or routine tasks to import"
                }
              >
                <CalendarClock size={20} />
                {importableTasks.length > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 px-1 py-0.2 bg-indigo-500 text-white text-[9px] font-black rounded-full leading-tight shadow-sm">
                    {importableTasks.length}
                  </span>
                )}
              </button>

              <div className="relative shrink-0 flex items-stretch expedition-picker-container">
                <button
                  type="button"
                  onClick={() => setShowExpeditionPicker(!showExpeditionPicker)}
                  className={cn(
                    "h-full px-3 sm:px-4 rounded-xl border flex items-center justify-center transition-all",
                    showExpeditionPicker 
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" 
                      : "bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700 hover:border-slate-600"
                  )}
                  title="Select from Expedition"
                >
                  <ListPlus size={20} />
                </button>
                
                {showExpeditionPicker && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-72 sm:w-80 shadow-2xl z-30">
                    <ExpeditionTreePicker
                      dungeons={dungeons}
                      majorDungeons={majorDungeons}
                      onSelect={(item) => {
                        handleAddTodo(undefined, item.name, item.id);
                      }}
                      onClose={() => setShowExpeditionPicker(false)}
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-bold transition-all flex items-center justify-center shrink-0"
                title="Add Task"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="space-y-2">
              {todos.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                  <Target size={32} className="text-slate-600 mb-3" />
                  <p className="text-slate-500 text-sm font-medium">Your agenda is clear.</p>
                  <p className="text-slate-600 text-xs mt-1">Add tasks above or pick from expeditions.</p>
                </div>
              ) : (
                <Reorder.Group
                  as="div"
                  axis="y"
                  values={todos}
                  onReorder={handleReorderTodos}
                  className="space-y-2 w-full"
                >
                  {todos.map(todo => {
                    const isExpeditionTask = !!todo.dungeonId;
                    const isCurrentActiveFocus = isExpeditionTask && state.currentDungeonId === todo.dungeonId;
                    const dungeonItem = isExpeditionTask ? dungeonMap.get(todo.dungeonId!) : null;
                    const isDungeonCompleted = dungeonItem?.status === 'completed';
                    const isChecked = todo.completed || isDungeonCompleted;

                    const parentMajor = dungeonItem?.parentId ? majorDungeonMap.get(dungeonItem.parentId) : undefined;
                    const effectiveDeadline = dungeonItem?.deadline?.trim() || parentMajor?.deadline?.trim();

                    let daysLeft: number | null = null;
                    if (effectiveDeadline) {
                      try {
                        const ddlDate = parseISO(effectiveDeadline);
                        daysLeft = differenceInCalendarDays(ddlDate, baseDate);
                      } catch {
                        daysLeft = null;
                      }
                    }

                    const tagInfo = (() => {
                      if (todo.source === 'yesterday') {
                        return {
                          colorClass: isDarkTheme ? "text-blue-400" : "text-blue-500",
                          barColor: "bg-blue-500",
                          label: "Yesterday",
                          extraText: null,
                          icon: RotateCcw
                        };
                      }

                      // Expedition task has a deadline that is NOT yet expired (daysLeft > 0) -> Orange
                      if (daysLeft !== null && daysLeft > 0) {
                        return {
                          colorClass: isDarkTheme ? "text-orange-400" : "text-orange-500",
                          barColor: "bg-orange-500",
                          label: "Expedition",
                          extraText: daysLeft === 1 ? "1d left" : `${daysLeft}d left`,
                          icon: CalendarClock
                        };
                      }

                      // DDL source or deadline due today / overdue -> Red
                      if (todo.source === 'ddl' || (daysLeft !== null && daysLeft <= 0)) {
                        const extra = daysLeft === null
                          ? null
                          : daysLeft === 0
                            ? "Due today"
                            : `${Math.abs(daysLeft)}d overdue`;
                        return {
                          colorClass: isDarkTheme ? "text-rose-400" : "text-rose-500",
                          barColor: "bg-rose-500",
                          label: "Deadline",
                          extraText: extra,
                          icon: CalendarClock
                        };
                      }

                      // Routine task -> Orange (matching bright orange Flame/Streak/Productive theme)
                      const isRoutine = Boolean(todo.source === 'routine' || dungeonItem?.isRoutine || parentMajor?.isRoutine);
                      if (isRoutine) {
                        const rType = dungeonItem?.routineType || parentMajor?.routineType;
                        const rTypeText = rType ? (rType.charAt(0).toUpperCase() + rType.slice(1)) : null;
                        return {
                          colorClass: isDarkTheme ? "text-orange-400" : "text-orange-500",
                          barColor: "bg-orange-500",
                          label: "Routine",
                          extraText: rTypeText,
                          icon: RefreshCcw
                        };
                      }

                      // Standard Expedition
                      if (isExpeditionTask || todo.source === 'expedition' || dungeonItem) {
                        return {
                          colorClass: isDarkTheme ? "text-indigo-400" : "text-indigo-500",
                          barColor: "bg-indigo-500",
                          label: "Expedition",
                          extraText: null,
                          icon: Layers
                        };
                      }

                      return null;
                    })();

                    const cleanTitle = (dungeonItem?.name || todo.title).replace(/^\[Tier\s*\d+\]\s*/i, '').trim();

                    return (
                      <DraggableAgendaItem 
                        key={todo.id}
                        todo={todo}
                        onClick={() => handleTaskClick(todo)}
                        className={cn(
                          "group flex items-center gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer select-none",
                          isChecked 
                            ? "bg-slate-900/30 border-slate-800/50 opacity-60" 
                            : isCurrentActiveFocus
                              ? (isDarkTheme 
                                  ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30"
                                  : "bg-indigo-500/10 border-indigo-500/40 shadow-sm ring-1 ring-indigo-500/20")
                              : "bg-slate-800/50 border-slate-700/80 hover:border-indigo-500/40 hover:bg-slate-800/80 hover:shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                        )}
                      >
                        {/* Checkbox Icon */}
                        <button 
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isExpeditionTask) {
                              handleTaskClick(todo);
                            } else {
                              toggleTodo(todo.id);
                            }
                          }}
                          className={cn(
                            "flex-shrink-0 transition-colors", 
                            isChecked ? "text-indigo-400" : isCurrentActiveFocus ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                          )}
                          title={isExpeditionTask ? (isCurrentActiveFocus ? "Active Focus Expedition" : "Click to Focus Expedition") : (isChecked ? "Completed" : "Mark as completed")}
                        >
                          {isChecked ? (
                            <CheckCircle size={22} className="fill-indigo-500/20 text-indigo-400" />
                          ) : isCurrentActiveFocus ? (
                            <div className="w-[22px] h-[22px] rounded-full border-2 border-indigo-400 flex items-center justify-center bg-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            </div>
                          ) : (
                            <Circle size={22} />
                          )}
                        </button>
                        
                        {/* Title & Info */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-semibold truncate transition-all",
                            isChecked ? "text-slate-500 line-through" : isCurrentActiveFocus ? (isDarkTheme ? "text-indigo-200 font-bold" : "text-indigo-600 font-bold") : "text-slate-200"
                          )}>
                            {cleanTitle}
                          </p>

                          {tagInfo && (
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span className={cn("flex items-center gap-1 font-medium shrink-0", tagInfo.colorClass)}>
                                <tagInfo.icon size={11} />
                                <span>{tagInfo.label}</span>
                                {tagInfo.extraText && (
                                  <span className="font-normal opacity-85 text-[10px]">
                                    · {tagInfo.extraText}
                                  </span>
                                )}
                              </span>
                              
                              {dungeonItem && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="h-1.5 w-12 sm:w-14 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50 shrink-0">
                                    <div 
                                      className={cn(
                                        "h-full transition-all", 
                                        isChecked 
                                          ? "bg-emerald-500" 
                                          : tagInfo.barColor
                                      )}
                                      style={{ width: `${Math.min(100, (dungeonItem.completedSessions / dungeonItem.totalSessions) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 tabular-nums flex items-center shrink-0 font-mono">
                                    {(() => {
                                      const timePerRoom = (state.standardSessionMinutes || 25) + (state.includeRestTimeInTasks ? (state.standardRestMinutes || 5) : 0);
                                      const formatTime = (mins: number) => {
                                        if (mins < 60) return <>{Math.floor(mins)}<span className="text-[9px] opacity-70 ml-[0.5px]">m</span></>;
                                        const h = Math.floor(mins / 60);
                                        const m = Math.floor(mins % 60);
                                        return m > 0 
                                          ? <>{h}<span className="text-[9px] opacity-70 ml-[0.5px]">h</span> {m}<span className="text-[9px] opacity-70 ml-[0.5px]">m</span></>
                                          : <>{h}<span className="text-[9px] opacity-70 ml-[0.5px]">h</span></>;
                                      };
                                      return (
                                        <>
                                          {formatTime(dungeonItem.completedSessions * timePerRoom)}
                                          <span className="opacity-50 text-[9px] mx-0.5">/</span>
                                          {formatTime(dungeonItem.totalSessions * timePerRoom)}
                                        </>
                                      );
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!isChecked && isExpeditionTask && (
                            <button 
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => startTask(todo, e)}
                              className={cn(
                                "w-8 h-8 rounded-lg transition-all flex items-center justify-center border",
                                isCurrentActiveFocus
                                  ? "bg-indigo-500 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:bg-indigo-400"
                                  : (isDarkTheme ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20" : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100")
                              )}
                              title={isCurrentActiveFocus ? "Currently Focusing (Click to open Explore)" : "Focus in Explore"}
                            >
                              <Play size={13} className={isCurrentActiveFocus ? "fill-current" : ""} />
                            </button>
                          )}
                          <button 
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => removeTodo(todo.id, e)}
                            className="w-8 h-8 rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors border border-slate-700/50 hover:border-rose-500/30"
                            title="Remove from agenda"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </DraggableAgendaItem>
                    );
                  })}
                </Reorder.Group>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};
