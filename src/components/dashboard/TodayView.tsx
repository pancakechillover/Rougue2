import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, CheckCircle, Circle, Play, Trash2, Calendar, Target, ChevronLeft, ChevronRight, ListPlus } from 'lucide-react';
import { AppState, Dungeon, TodayTodo } from '../../types';
import { motion } from 'motion/react';
import { cn, getSettlementDay } from '../../lib/utils';
import { format, addDays, subDays } from 'date-fns';
import { DatePicker } from '../DatePicker';

interface TodayViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  dungeons: Dungeon[];
  onBack: () => void;
  setActiveTab: (tab: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ state, setState, dungeons, onBack, setActiveTab }) => {
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

  const handleAddTodo = (e?: React.FormEvent, title?: string, dungeonId?: string) => {
    if (e) e.preventDefault();
    const t = title || newTaskTitle;
    if (!t.trim()) return;

    const newTodo: TodayTodo = {
      id: Math.random().toString(36).substr(2, 9),
      title: t.trim(),
      dungeonId,
      completed: false,
      date: currentViewDateStr
    };

    setState(prev => ({
      ...prev,
      todayTodos: [...(prev.todayTodos || []), newTodo]
    }));
    setNewTaskTitle('');
    setShowExpeditionPicker(false);
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

  const startTask = (todo: TodayTodo) => {
    if (todo.dungeonId && dungeons.find(d => d.id === todo.dungeonId)) {
      setState(prev => ({ ...prev, currentDungeonId: todo.dungeonId }));
      setActiveTab('explore');
    } else {
      toggleTodo(todo.id);
    }
  };

  // Active expeditions
  const activeExpeditions = useMemo(() => {
    return dungeons.filter(d => d.status !== 'completed' && d.status !== 'archived');
  }, [dungeons]);

  return (
    <div className="w-full px-4 py-4 sm:px-8 sm:py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-black text-slate-50 tracking-tighter uppercase italic pr-4 flex items-center gap-2 sm:gap-3 min-w-0">
                <ListPlus className="text-indigo-400 w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
                <span className="truncate pr-3.5 leading-none">Agenda</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {format(startTime, 'MMM do, HH:mm')} - {format(endTime, 'MMM do, HH:mm')}
              </p>
            </div>
          </div>
            
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 self-start sm:self-auto shrink-0">
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
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-bold transition-all flex items-center justify-center shrink-0"
              >
                <Plus size={20} />
              </button>
              <div className="relative shrink-0 flex items-stretch">
                <button
                  type="button"
                  onClick={() => setShowExpeditionPicker(!showExpeditionPicker)}
                  className={cn(
                    "h-full px-3 sm:px-4 rounded-xl border flex items-center justify-center transition-all",
                    showExpeditionPicker 
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" 
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600"
                  )}
                >
                  <ListPlus size={20} />
                </button>
                
                {showExpeditionPicker && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden z-20">
                    <div className="p-3 border-b border-slate-700/50 bg-slate-800/80">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select from Expedition</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {activeExpeditions.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No active expeditions found.</p>
                      ) : (
                        activeExpeditions.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleAddTodo(undefined, d.name, d.id)}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-700/50 text-sm font-medium text-slate-200 transition-colors flex items-center gap-2 truncate"
                          >
                            <Target size={14} className="text-indigo-400 shrink-0" />
                            <span className="truncate">{d.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>

            <div className="space-y-2">
              {todos.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                  <Target size={32} className="text-slate-600 mb-3" />
                  <p className="text-slate-500 text-sm font-medium">Your agenda is clear.</p>
                  <p className="text-slate-600 text-xs mt-1">Add tasks above or pick from expeditions.</p>
                </div>
              ) : (
                todos.map(todo => (
                  <div 
                    key={todo.id}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer",
                      todo.completed ? "bg-slate-800/20 border-slate-800/50 opacity-60" : "bg-slate-800/50 border-slate-700 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                    )}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    <button className={cn("flex-shrink-0 transition-colors", todo.completed ? "text-indigo-500" : "text-slate-500 group-hover:text-slate-400")}>
                      {todo.completed ? <CheckCircle size={22} className="fill-indigo-500/20" /> : <Circle size={22} />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate transition-all",
                        todo.completed ? "text-slate-500 line-through" : "text-slate-200"
                      )}>
                        {todo.title}
                      </p>
                      {todo.dungeonId && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} /> Expedition Quest
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 transition-opacity">
                      {!todo.completed && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); startTask(todo); }}
                          className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 flex items-center justify-center transition-colors"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => removeTodo(todo.id, e)}
                        className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    </div>
  );
};
