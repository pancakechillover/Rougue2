import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays } from 'date-fns';
import { 
  X, 
  Moon, 
  Sun, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  LayoutTemplate,
  Flame,
  Search,
  File,
  FileText,
  Save,
  Eye,
  EyeOff,
  Maximize2,
  Upload,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Calendar,
  ListPlus,
  Target
} from 'lucide-react';
import Markdown from 'react-markdown';
import { TimePicker } from './TimePicker';
import { useScrollLock } from '../hooks/useScrollLock';
import { AppState, Dungeon, TodayTodo } from '../types';
import { cn } from '../lib/utils';
import { getSettlementDay } from '../lib/utils';
import { ConfirmModal } from './ConfirmModal';
import { ImmersiveReflectionModal } from './ImmersiveReflectionModal';

interface StartOfDayModalProps {
  state: AppState;
  dungeons: Dungeon[];
  onClose: () => void;
  onSave: (date: string, sleepTime: string, wakeTime: string, sleepDurationMin: number, reflection: string, mood?: string) => void;
  repairStreak?: (dateStr: string) => void;
  initialDateStr?: string;
  onUpdateState?: (update: Partial<AppState>) => void;
}

export const StartOfDayModal: React.FC<StartOfDayModalProps> = ({ state, dungeons, onClose, onSave, initialDateStr, onUpdateState, repairStreak }) => {
  useScrollLock(true);
  
  const today = useMemo(() => {
    const ts = state.timeSettings || {
      morning: { start: 8, end: 12 },
      afternoon: { start: 14, end: 18 },
      night: { start: 20, end: 24 }
    };

    const getYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let now = new Date();
    if (initialDateStr) {
       // Mock now based on initialDateStr for settlement display
       const [y, m, d] = initialDateStr.split('-').map(Number);
       now = new Date(y, m - 1, d, 23, 59, 59); // Fake it as end of that day
    } else if (state.timezone) {
      try {
        const str = now.toLocaleString('en-US', { timeZone: state.timezone });
        now = new Date(str);
      } catch (e) {
        console.error("Timezone error:", e);
      }
    }

    const currentHour = now.getHours();

    let startDate = new Date(now);
    startDate.setHours(ts.morning.start, 0, 0, 0);
    let endDate = new Date(now);
    
    let nightEndHour = ts.night.end;
    let daysToadd = 0;
    if (ts.night.end < ts.night.start) {
        nightEndHour = ts.night.end;
        daysToadd = 1;
    } else if (ts.night.end === 24) {
        nightEndHour = 0;
        daysToadd = 1;
    }
    
    endDate.setHours(nightEndHour, 0, 0, 0);
    endDate.setDate(endDate.getDate() + daysToadd);

    if (currentHour < ts.morning.start && !initialDateStr) {
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
    }

    const formatDate = (d: Date, is24: boolean = false) => {
      if (is24) {
        const prev = new Date(d);
        prev.setDate(prev.getDate() - 1);
        const mo = (prev.getMonth() + 1).toString().padStart(2, '0');
        const da = prev.getDate().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${mo}/${da} 24:${m}`;
      }
      const mo = (d.getMonth() + 1).toString().padStart(2, '0');
      const da = d.getDate().toString().padStart(2, '0');
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${mo}/${da} ${h}:${m}`;
    };

    return {
      dateString: initialDateStr || getSettlementDay(now, ts),
      settlementPeriod: `${formatDate(startDate)} - ${formatDate(endDate, ts.night.end === 24)}`
    };
  }, [state, initialDateStr]);
  
  const todayStr = today.dateString;
  
  const dailyLog = state.dailyLogs?.[todayStr];
  const [sleepTime, setSleepTime] = useState(dailyLog?.sleepTime || '23:00');
  const [wakeTime, setWakeTime] = useState(dailyLog?.wakeTime || '07:00');
  const [reflection, setReflection] = useState(dailyLog?.reflection || '');
  const [mood, setMood] = useState(dailyLog?.mood || '');

  const [isMarkdownEnabled, setIsMarkdownEnabled] = useState(state.defaultMarkdownEnabled ?? true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [templateMode, setTemplateMode] = useState<'empty' | 'example'>('empty');
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [showNoMedalAlert, setShowNoMedalAlert] = useState(false);

  // Agenda / Todo States & Handlers
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showExpeditionPicker, setShowExpeditionPicker] = useState(false);

  const allTodos = state.todayTodos || [];
  const startDayTodos = useMemo(() => {
    return allTodos.filter(t => t.date === todayStr || (!t.date && todayStr === getSettlementDay(new Date(), state.timeSettings)));
  }, [allTodos, todayStr, state.timeSettings]);

  const handleAddTodo = (titleText: string, targetDungeonId?: string) => {
    if (!titleText.trim() || !onUpdateState) return;
    const newTodo: TodayTodo = {
      id: Math.random().toString(36).substr(2, 9),
      title: titleText.trim(),
      dungeonId: targetDungeonId,
      completed: false,
      date: todayStr
    };
    onUpdateState({
      todayTodos: [...allTodos, newTodo]
    });
    setNewTodoTitle('');
    setShowExpeditionPicker(false);
  };

  const handleToggleTodo = (id: string) => {
    if (!onUpdateState) return;
    const updated = allTodos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    onUpdateState({ todayTodos: updated });
  };

  const handleRemoveTodo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateState) return;
    const updated = allTodos.filter(t => t.id !== id);
    onUpdateState({ todayTodos: updated });
  };

  const activeExpeditions = useMemo(() => {
    if (!dungeons) return [];
    return dungeons.filter(d => d.status !== 'completed' && d.status !== 'archived');
  }, [dungeons]);

  const { sleepDurationMin, isTimeValid } = useMemo(() => {
    if (!sleepTime || !wakeTime) return { sleepDurationMin: 0, isTimeValid: false };
    const [sH, sM] = sleepTime.split(':').map(Number);
    const [wH, wM] = wakeTime.split(':').map(Number);
    let s = sH + sM/60;
    let w = wH + wM/60;
    
    if (s <= w) {
        if (s <= 12) { // assumed to be post-midnight sleep e.g. 02:00 to 13:00
            s += 24;
            w += 24;
        }
    } else {
        w += 24; // fell asleep before midnight e.g. 23:00 to 07:00
    }
    
    const duration = Math.round((w - s) * 60);
    // Validate if sleep time is logically before wake time, cap at max 16h duration
    const valid = duration > 0 && duration <= 16 * 60;
    
    return { sleepDurationMin: duration, isTimeValid: valid };
  }, [sleepTime, wakeTime]);

  const durationHours = Math.floor(sleepDurationMin / 60);
  const durationMins = sleepDurationMin % 60;

  const [confirmRepairDate, setConfirmRepairDate] = useState<string | null>(null);

  const streakData = useMemo(() => {
    const dates = new Set<string>();
    state.history.forEach(session => {
      let sessionDate = new Date(session.timestamp);
      if (state.timezone) {
        try {
          sessionDate = new Date(sessionDate.toLocaleString('en-US', { timeZone: state.timezone }));
        } catch (e) {}
      }
      dates.add(getSettlementDay(sessionDate, state.timeSettings));
    });
    (state.patchedDays || []).forEach(d => dates.add(d));

    const result = [];
    let now = new Date();
    if (state.timezone) {
      try {
        now = new Date(now.toLocaleString('en-US', { timeZone: state.timezone }));
      } catch (e) {}
    }

    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const str = getSettlementDay(d, state.timeSettings);
      const isCompleted = dates.has(str);
      const isPatched = (state.patchedDays || []).includes(str);
      result.push({
        dateStr: str,
        shortDate: format(d, 'MM/dd'),
        displayLabel: format(d, 'EEEEEE'),
        isCompleted,
        isPatched,
        isToday: i === 0,
        isFuture: d > now
      });
    }
    return result;
  }, [state.history, state.patchedDays, state.timezone, state.timeSettings]);

  const availableMedals = state.deathDefyingMedals || 0;

  const renderTemplateControls = () => (
    <div className="relative flex items-center gap-0 h-[26px]">
      <button
        onClick={() => setShowTemplates(!showTemplates)}
        className={cn(
          "flex items-center justify-center gap-1.5 h-full px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
          showTemplates 
            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
            : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-white"
        )}
      >
        <LayoutTemplate size={12} />
        <span>Templates</span>
      </button>

      {/* Templates Dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex border-b border-slate-800 p-1 bg-slate-900/50 gap-1 relative z-10">
               <button
                  onClick={() => {
                    setTemplateMode('empty');
                  }}
                  className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1", templateMode === 'empty' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:bg-slate-800 hover:text-white")}
                  title="Blank Template Mode: Load templates without examples"
               >
                 <File size={12} /> Blank
               </button>
               <button
                  onClick={() => {
                    setTemplateMode('example');
                  }}
                  className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1", templateMode === 'example' ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:bg-slate-800 hover:text-white")}
                  title="Example Template Mode: Load templates with examples"
               >
                 <FileText size={12} /> Example
               </button>
            </div>
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {state.reflectionTemplates?.map((template) => (
                <div key={template.id} className="group relative">
                  {templateToDelete === template.id ? (
                    <div className="flex items-center justify-between w-full px-3 py-2 bg-rose-500/10 rounded-xl">
                      <span className="text-xs text-rose-400 font-medium">Delete {template.name}?</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (onUpdateState) {
                              onUpdateState({
                                reflectionTemplates: state.reflectionTemplates?.filter(t => t.id !== template.id)
                              });
                            }
                            setTemplateToDelete(null);
                          }}
                          className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30 text-[10px] font-bold"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setTemplateToDelete(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 text-[10px] font-bold"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (templateMode === 'example' && template.exampleContent) {
                            setReflection(template.exampleContent);
                          } else {
                            setReflection(template.content);
                          }
                          setShowTemplates(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors pr-8"
                      >
                        {template.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-all"
                        title="Delete Template"
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-slate-800 bg-slate-950/50">
              {isSavingTemplate ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Template name..."
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTemplateName.trim()) {
                        if (onUpdateState) {
                          const templates = [...(state.reflectionTemplates || [])];
                          const existingIndex = templates.findIndex(t => t.name.toLowerCase() === newTemplateName.trim().toLowerCase());
                          
                          if (existingIndex >= 0) {
                            if (templateMode === 'example') {
                              templates[existingIndex] = { ...templates[existingIndex], exampleContent: reflection };
                            } else {
                              templates[existingIndex] = { ...templates[existingIndex], content: reflection };
                            }
                          } else {
                            templates.push({
                              id: `user-${Date.now()}`,
                              name: newTemplateName.trim(),
                              content: templateMode === 'empty' ? reflection : '',
                              exampleContent: templateMode === 'example' ? reflection : ''
                            });
                          }
                          
                          onUpdateState({ reflectionTemplates: templates });
                        }
                        setNewTemplateName('');
                        setIsSavingTemplate(false);
                      } else if (e.key === 'Escape') {
                        setIsSavingTemplate(false);
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!reflection.trim()) return;
                    setIsSavingTemplate(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all"
                >
                  <Save size={12} />
                  <span>Save as {templateMode === 'example' ? 'Example' : 'Blank'} Template</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const handleSave = () => {
    onSave(todayStr, sleepTime, wakeTime, sleepDurationMin, reflection, mood);
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-6 lg:p-8 bg-slate-950/90 backdrop-blur-md m-0">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0"
           onClick={onClose}
        />
        
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="bg-slate-900 border-0 sm:border border-indigo-500/30 rounded-none sm:rounded-[2.5rem] w-[100vw] sm:w-[95vw] sm:max-w-[1400px] h-[100dvh] sm:h-[90vh] shadow-2xl overflow-hidden relative flex flex-col z-10"
        >
          <div className="py-4 px-6 sm:px-8 border-b border-slate-800 flex justify-between items-start bg-gradient-to-r from-indigo-500/10 to-transparent relative overflow-hidden flex-shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none z-0">
              <Sun size={80} />
            </div>
            
            <div className="flex justify-between items-start relative z-10 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 md:gap-5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-1 flex items-center gap-3">
                  Start of the Day <Sun className="text-amber-400" size={28} />
                </h2>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500 tracking-wider flex items-center gap-1.5 mt-1.5 sm:mt-1">
                   {(() => {
                     const parts = today.settlementPeriod.split(' - ');
                     if (parts.length !== 2) return <span>{today.settlementPeriod}</span>;
                     const [start, end] = parts;
                     const startParts = start.split(' ');
                     if (startParts.length !== 2) return <span>{today.settlementPeriod}</span>;
                     const [startDatePart, startTimePart] = startParts;
                     return (
                       <>
                         <span className="text-indigo-400 font-bold bg-indigo-500/5 px-1 rounded-sm">{startDatePart}</span>
                         <span>{startTimePart}</span>
                         <span className="mx-1 opacity-50">-</span>
                         <span>{end}</span>
                       </>
                     );
                   })()}
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-grow custom-scrollbar lg:grid lg:grid-cols-2 lg:gap-8 space-y-6 lg:space-y-0 relative">
             {/* Left Column */}
             <div className="space-y-2.5 sm:space-y-3 flex flex-col">
             {/* Sleep Tracker */}
             <div className="bg-slate-800/20 rounded-xl p-3 sm:p-4 border border-slate-700/30">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2.5">
                   <Moon className="text-indigo-400" size={16} /> Sleep Tracker 
                </h3>
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center">
                   <div className="flex-1 w-full flex items-center gap-3 bg-slate-950/50 rounded-xl p-2.5 border border-slate-800/50">
                     <Moon size={18} className="text-indigo-400" />
                     <div className="w-full">
                       <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fell Asleep</label>
                       <TimePicker 
                          value={sleepTime} 
                          onChange={setSleepTime}
                          className="w-full relative z-40"
                       />
                     </div>
                   </div>
                   
                   <div className="flex-1 w-full flex items-center gap-3 bg-slate-950/50 rounded-xl p-2.5 border border-slate-800/50">
                     <Sun size={18} className="text-amber-400" />
                     <div className="w-full">
                       <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Woke Up</label>
                       <TimePicker 
                          value={wakeTime} 
                          onChange={setWakeTime}
                          className="w-full relative z-30"
                       />
                     </div>
                   </div>

                   <div className="sm:w-32 w-full flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 rounded-xl p-2.5 border border-emerald-500/20 flex-shrink-0">
                     <Clock size={18} />
                     <span className="font-bold whitespace-nowrap">
                       {durationHours}h {durationMins}min
                     </span>
                   </div>
                </div>
             </div>

             {/* Streak */}
             <div className="bg-slate-800/20 rounded-xl p-3 sm:p-4 border border-slate-700/30">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                     <Flame className="text-orange-500" size={16} /> 7-Day Activity Record
                  </h3>
                  <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-lg">
                    {state.streak} Days
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
                  {streakData.map((day) => (
                    <div key={day.dateStr} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-medium text-slate-500 mb-0.5 tracking-wider">
                        {day.shortDate}
                      </span>
                      <span className={cn("text-[10px] font-bold uppercase", day.isToday ? "text-white" : "text-slate-400")}>
                        {day.displayLabel}
                      </span>
                      <div className="relative group mt-1">
                        {day.isCompleted ? (
                          <div className={cn(
                            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all",
                            day.isPatched 
                              ? "bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                              : "bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                          )}>
                            <Flame size={14} className={day.isPatched ? "text-amber-400" : "text-orange-400"} />
                          </div>
                        ) : (
                          <div 
                            className={cn(
                              "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border overflow-visible relative transition-all group/patch",
                              !day.isCompleted && !day.isToday && !day.isFuture && repairStreak
                                ? (availableMedals > 0 
                                  ? "bg-indigo-500/20 border-indigo-500/50 cursor-pointer hover:scale-110 shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:bg-indigo-500"
                                  : "bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-700")
                                : "bg-slate-800 border-slate-700"
                            )}
                            onClick={() => {
                              if (!day.isCompleted && !day.isToday && !day.isFuture && repairStreak) {
                                if (availableMedals > 0) {
                                  setConfirmRepairDate(day.dateStr);
                                } else {
                                  setShowNoMedalAlert(true);
                                }
                              }
                            }}
                            title={!day.isCompleted && !day.isToday && !day.isFuture && repairStreak ? "Patch missing streak" : undefined}
                          >
                            {!day.isCompleted && !day.isToday && !day.isFuture && repairStreak && availableMedals > 0 ? (
                              <Flame size={12} className="text-indigo-400 group-hover/patch:text-white transition-colors" />
                            ) : (
                              <span className="text-slate-600 font-bold text-xs">X</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Today's Agenda Card */}
             <div className="bg-slate-800/20 rounded-xl p-3 sm:p-4 border border-slate-700/30 flex flex-col flex-1 min-h-[220px]">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                     <Target className="text-indigo-400" size={16} /> Today's Agenda
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    {startDayTodos.filter(t => t.completed).length} / {startDayTodos.length}
                  </span>
                </div>

                {/* Input form */}
                <div className="flex gap-1.5 mb-3 relative">
                  <input
                    type="text"
                    placeholder="Focus target for today..."
                    value={newTodoTitle}
                    onChange={e => setNewTodoTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTodo(newTodoTitle);
                      }
                    }}
                    className="flex-grow bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  
                  <button 
                    type="button"
                    onClick={() => setShowExpeditionPicker(!showExpeditionPicker)}
                    className={cn(
                      "p-2 rounded-xl border flex items-center justify-center transition-all shrink-0",
                      showExpeditionPicker 
                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" 
                        : "bg-slate-950/30 border-slate-800 text-slate-400 hover:text-white"
                    )}
                    title="Select from active expeditions"
                  >
                    <ListPlus size={16} />
                  </button>

                  <button 
                    onClick={() => handleAddTodo(newTodoTitle)}
                    disabled={!newTodoTitle.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center justify-center shrink-0"
                  >
                    <Plus size={16} />
                  </button>

                  {showExpeditionPicker && (
                    <div className="absolute right-0 bottom-[calc(100%+8px)] w-60 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                      <div className="p-2 sm:p-2.5 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center mr-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Expedition</span>
                        <span className="text-[9px] text-slate-600">Active only</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                        {activeExpeditions.length === 0 ? (
                          <div className="text-[11px] text-slate-500 text-center py-4">No active expeditions</div>
                        ) : (
                          activeExpeditions.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                handleAddTodo(d.name, d.id);
                              }}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 truncate"
                            >
                              <Target size={12} className="text-indigo-400 shrink-0" />
                              <span className="truncate">{d.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Todos List */}
                <div className="flex-grow overflow-y-auto max-h-[160px] pr-0.5 custom-scrollbar space-y-1.5">
                  {startDayTodos.length === 0 ? (
                    <div className="h-full min-h-[100px] flex flex-col items-center justify-center border border-dashed border-slate-800/60 rounded-xl py-4 bg-slate-950/20 text-center">
                      <Target size={20} className="text-slate-600 mb-1.5" />
                      <p className="text-slate-500 text-xs font-medium mr-1">Your agenda is clear.</p>
                      <p className="text-slate-600 text-[10px] mt-0.5 w-full">Let's set goals to start strong!</p>
                    </div>
                  ) : (
                    startDayTodos.map(todo => (
                      <div 
                        key={todo.id}
                        onClick={() => handleToggleTodo(todo.id)}
                        className={cn(
                          "group flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer text-xs",
                          todo.completed 
                            ? "bg-slate-900/10 border-slate-900/30 opacity-50" 
                            : "bg-slate-950/40 border-slate-800 hover:border-indigo-500/30"
                        )}
                      >
                        <button className={cn("flex-shrink-0 transition-colors", todo.completed ? "text-indigo-500" : "text-slate-500 group-hover:text-slate-400")}>
                          {todo.completed ? <CheckCircle size={16} className="fill-indigo-500/10" /> : <Circle size={16} />}
                        </button>
                        
                        <div className="flex-grow min-w-0 pr-1">
                          <p className={cn(
                            "font-medium truncate transition-all text-slate-200",
                            todo.completed && "text-slate-500 line-through"
                          )}>
                            {todo.title}
                          </p>
                          {todo.dungeonId && (
                            <p className="text-[9px] text-slate-500 flex items-center gap-0.5 mt-0.5">
                              <Calendar size={8} /> Expedition
                            </p>
                          )}
                        </div>

                        <button 
                          onClick={(e) => handleRemoveTodo(todo.id, e)}
                          className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-all duration-200 shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
             </div>
             </div>

             {/* Right Column */}
             <div className="space-y-6 flex flex-col min-h-[500px] h-full">
             {/* Morning Reflection / Intentions */}
             <div className="bg-slate-800/20 rounded-2xl p-4 sm:p-6 border border-slate-700/30 space-y-4 flex flex-col flex-1">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <MessageSquare size={16} className="text-sky-400" /> Daily Reflection
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsMarkdownEnabled(!isMarkdownEnabled)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        isMarkdownEnabled ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-slate-300"
                      )}
                    >
                      {isMarkdownEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>MD {isMarkdownEnabled ? 'On' : 'Off'}</span>
                    </button>
                    
                    {renderTemplateControls()}

                    <button
                      onClick={() => setIsImmersiveMode(true)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20"
                    >
                      <Maximize2 size={12} />
                      <span>Immersive</span>
                    </button>

                    <div className="flex items-center gap-0.5 border-l border-slate-700 pl-2 ml-1">
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.txt,.md';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (re) => setReflection(re.target?.result as string);
                              reader.readAsText(file);
                            }
                          };
                          input.click();
                        }}
                        className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        title="Import Reflection"
                      >
                        <Upload size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([reflection], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `reflection-${today.dateString}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        title="Export Reflection"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "grid gap-4 transition-all duration-300 flex-1 h-full min-h-[300px]",
                  isMarkdownEnabled ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
                )}>
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What are your main focuses today? How are you feeling?"
                    className="w-full h-full min-h-[160px] bg-slate-950 border border-slate-800 rounded-3xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                  {isMarkdownEnabled && (
                    <div className="w-full h-full min-h-[160px] bg-slate-950/30 border border-slate-800/50 rounded-3xl p-4 overflow-y-auto custom-scrollbar">
                      {reflection ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-200 prose-li:text-slate-300">
                          <Markdown>{reflection}</Markdown>
                        </div>
                      ) : (
                        <p className="text-slate-600 text-sm italic pr-1">Preview will appear here...</p>
                      )}
                    </div>
                  )}
                </div>
             </div>

             {!isTimeValid && (
               <div className="flex items-center justify-center gap-1.5 text-rose-400 bg-rose-500/10 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex-shrink-0 mt-3">
                 <X size={14} /> Sleep must be logically before wake (max 16h)
               </div>
             )}
             <button
               onClick={handleSave}
               disabled={!isTimeValid}
               className={cn(
                 "w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-2 flex-shrink-0",
                 isTimeValid
                   ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-500/20"
                   : "bg-slate-800 text-slate-500 cursor-not-allowed"
               )}
             >
               <CheckCircle2 size={18} />
               Start My Focus
             </button>
             </div>
          </div>
        </motion.div>

        <ConfirmModal
          isOpen={!!confirmRepairDate}
          onClose={() => setConfirmRepairDate(null)}
          onConfirm={() => {
            if (confirmRepairDate && repairStreak) {
              repairStreak(confirmRepairDate);
            }
            setConfirmRepairDate(null);
          }}
          title="Repair Streak"
          message={`Use a Death Defying Gold Medal to repair your streak for ${confirmRepairDate}?`}
          confirmText="Patch Streak"
          cancelText="Cancel"
          type="info"
        />

        <ConfirmModal
          isOpen={showNoMedalAlert}
          onClose={() => setShowNoMedalAlert(false)}
          onConfirm={() => setShowNoMedalAlert(false)}
          title="Module Missing"
          message="You do not have any Death Defying Gold Medals to patch this missing day. You can acquire them from the Gacha or the standard Item Shop."
          confirmText="Understood"
          type="warning"
        />
      </div>
    </AnimatePresence>
  );

  return (
    <>
      <ImmersiveReflectionModal
        isOpen={isImmersiveMode}
        onClose={() => setIsImmersiveMode(false)}
        dateString={today.dateString}
        reflection={reflection}
        setReflection={setReflection}
        isMarkdownEnabled={isMarkdownEnabled}
        setIsMarkdownEnabled={setIsMarkdownEnabled}
        renderTemplateControls={renderTemplateControls}
      />
      {createPortal(
        modalContent, 
        document.body
      )}
    </>
  );
};
