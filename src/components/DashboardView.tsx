import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { TeamModule } from './TeamModule';
import { 
  Sword, 
  ChevronRight, 
  ChevronDown,
  Calendar,
  BookOpen, 
  HelpCircle,
  Coins,
  Zap,
  Compass,
  Package,
  Clock,
  Target,
  Bot,
  Sparkles,
  RefreshCw,
  Send,
  X,
  Copy,
  Quote,
  Library,
  Check,
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Trash2,
  Edit2,
  Settings as SettingsIcon,
  Sun,
  ArrowRight,
  BookMarked
} from 'lucide-react';
import { format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, subDays, addDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { AppState, Dungeon } from '../types';
import { playSound } from '../lib/sound';
import { getSageAdvice } from '../services/sageService';
import { cn, getSessionEffectiveMinutes, getSettlementDay, getSessionSettlementDate } from '../lib/utils';
import { ExpeditionPlanPreview } from './ExpeditionPlanPreview';
import { ConfirmModal } from './ConfirmModal';
import { PopoverPortal } from './PopoverPortal';
import { TodayView } from './dashboard/TodayView';
import { DatePicker } from './DatePicker';

interface DashboardViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  currentDungeon: Dungeon | null;
  setActiveTab: (tab: any) => void;
  setShowDailySummary: (show: boolean) => void;
  setShowStartOfDayModal: (val: string | boolean) => void;
  openGuideBook: (chapter: number) => void;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string) => void;
  applyExpeditionPlan?: (plan: any) => void;
  navigateToSettings?: (section: any, settingId?: string) => void;
  dungeons: Dungeon[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  setState,
  currentDungeon,
  setActiveTab,
  setShowDailySummary,
  setShowStartOfDayModal,
  openGuideBook,
  saveDailyLog,
  applyExpeditionPlan,
  navigateToSettings,
  dungeons
}) => {
  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');
  const [showTodayView, setShowTodayView] = React.useState(false);
  const [showSageConsult, setShowSageConsult] = React.useState(false);
  const [selectedDateAnchor, setSelectedDateAnchor] = React.useState<{ day: Date, ddls: Dungeon[], element: HTMLElement } | null>(null);
  const [horizonMode, setHorizonMode] = React.useState<'recent' | 'week'>(() => {
    try {
      const saved = localStorage.getItem('expeditionHorizonMode');
      if (saved === 'week' || saved === 'recent') return saved;
    } catch(e) {}
    return 'recent';
  });
  const [horizonDate, setHorizonDate] = React.useState<Date>(new Date());

  React.useEffect(() => {
    try {
      localStorage.setItem('expeditionHorizonMode', horizonMode);
    } catch(e) {}
  }, [horizonMode]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedDateAnchor && selectedDateAnchor.element) {
        // Find if the click was inside the portal or the original trigger
        const isClickInsideTrigger = selectedDateAnchor.element.contains(e.target as Node);
        const popoverEl = document.getElementById('horizon-popover');
        const isClickInsidePopover = popoverEl && popoverEl.contains(e.target as Node);
        
        if (!isClickInsideTrigger && !isClickInsidePopover) {
          setSelectedDateAnchor(null);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedDateAnchor]);

  const calendarDays = useMemo(() => {
    if (horizonMode === 'week') {
      const startDate = startOfWeek(horizonDate, { weekStartsOn: 1 });
      const endDate = endOfWeek(horizonDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: startDate, end: endDate });
    }
    return eachDayOfInterval({ start: subDays(horizonDate, 3), end: addDays(horizonDate, 3) });
  }, [horizonMode, horizonDate]);

  const ddlMap = useMemo(() => {
    const map = new Map<string, Dungeon[]>();
    dungeons.forEach(d => {
      if (d.status === 'active' && d.deadline) {
        if (!map.has(d.deadline)) map.set(d.deadline, []);
        map.get(d.deadline)!.push(d);
      }
    });
    return map;
  }, [dungeons]);

  const datePickerIndicators = useMemo(() => {
    const indicators: Record<string, { highlight?: boolean; star?: boolean }> = {};
    for (const [dateStr, ddls] of ddlMap.entries()) {
      if (ddls.length > 0) {
        indicators[dateStr] = { star: true };
      }
    }
    return indicators;
  }, [ddlMap]);

  const todayEffectiveMinutes = useMemo(() => {
    const now = new Date();
    let localNow = now;
    if (state.timezone) {
      try {
        const str = now.toLocaleString('en-US', { timeZone: state.timezone });
        localNow = new Date(str);
      } catch (e) {}
    }
    const todayStr = getSettlementDay(localNow, state.timeSettings);
    
    return state.history
      .filter(s => s.timestamp && getSessionSettlementDate(s, state.timeSettings) === todayStr)
      .reduce((acc, s) => acc + getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks), 0);
  }, [state.history, state.timezone, state.timeSettings, state.includeRestTimeInTasks]);

  const ddlsCountInView = useMemo(() => {
    let count = 0;
    calendarDays.forEach(day => {
      const ddls = ddlMap.get(format(day, 'yyyy-MM-dd'));
      if (ddls) count += ddls.length;
    });
    return count;
  }, [calendarDays, ddlMap]);

  const settlementPeriod = useMemo(() => {
    const ts = state.timeSettings || {
      morning: { start: 8, end: 12 },
      afternoon: { start: 14, end: 18 },
      night: { start: 20, end: 24 }
    };

    const timezone = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    let now = new Date();
    if (state.timezone) {
      try {
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        now = tzDate;
      } catch (e) {}
    }

    const hour = now.getHours();
    let baseDate = new Date(now);

    // If night peak spans midnight and we are currently in that post-midnight block, 
    // or if we are simply before the morning peak starts, the current settlement "day" started yesterday
    if (ts.night.start > ts.night.end && hour < ts.night.end) {
      baseDate.setDate(baseDate.getDate() - 1);
    } else if (hour < ts.morning.start) {
      baseDate.setDate(baseDate.getDate() - 1);
    }
    
    // Start Date: morning.start of baseDate
    const startDate = new Date(baseDate);
    startDate.setHours(ts.morning.start, 0, 0, 0);
    
    // End Date: night.end of baseDate (might be tomorrow)
    const endDate = new Date(baseDate);
    if (ts.night.end <= ts.night.start) {
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(ts.night.end === 24 ? 0 : ts.night.end, 0, 0, 0);
    } else {
        if (ts.night.end === 24) {
             endDate.setDate(endDate.getDate() + 1);
             endDate.setHours(0, 0, 0, 0);
        } else {
             endDate.setHours(ts.night.end, 0, 0, 0);
        }
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

    return `${formatDate(startDate)} - ${formatDate(endDate, ts.night.end === 24)}`;
  }, [state.timeSettings, state.timezone]);

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {showTodayView ? (
          <motion.div
            key="today-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <TodayView 
              state={state} 
              setState={setState} 
              dungeons={dungeons} 
              onBack={() => setShowTodayView(false)} 
              setActiveTab={setActiveTab} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="w-full p-6 lg:p-8 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col space-y-6 md:h-full">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sword size={120} />
          </div>
          <h2 className="text-3xl font-bold text-slate-50 mb-2">
            {state.history.length === 0 ? "Welcome, Brave Seeker." : "Welcome back, Seeker."}
          </h2>
          <p className="text-slate-400 mb-8 max-w-md">
            {state.history.length === 0 
              ? "A new legend is about to be written. Are you ready to begin your first exploration?" 
              : "Your journey through the Scholar's Dungeon continues. Ready for the next session?"}
          </p>
          
          <div className={cn(
            "p-3 sm:p-6 rounded-2xl border mt-4 overflow-visible relative z-10 transition-colors",
            "bg-slate-950/50 border-slate-800/60 shadow-lg"
          )}>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-4">
              <span className={cn(
                "text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                "text-slate-400"
              )}>
                 <Calendar className={cn("w-3.5 h-3.5 shrink-0", "text-indigo-400")} />
                 <span className="hidden xs:inline sm:inline">Expedition Horizon</span>
                 <span className="xs:hidden sm:hidden">Horizon</span>
              </span>
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <select
                  value={horizonMode}
                  onChange={(e) => {
                    setHorizonMode(e.target.value as 'recent' | 'week');
                    setHorizonDate(new Date());
                  }}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer rounded-md px-1.5 py-0.5 border text-center appearance-none transition-colors shrink-0",
                    "bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-500"
                  )}
                >
                  <option value="recent">Recent 7</option>
                  <option value="week">This Week</option>
                </select>
                <DatePicker
                  value={format(horizonDate, 'yyyy-MM-dd')}
                  indicators={datePickerIndicators}
                  onChange={(val) => {
                    if (val) {
                       setHorizonDate(new Date(val + 'T12:00:00'));
                    }
                  }}
                  className={cn(
                    "w-auto min-w-0 bg-transparent border-transparent text-xs font-bold uppercase tracking-wider hover:border-transparent px-1 py-0.5 text-right cursor-pointer flex items-center transition-opacity hover:opacity-70 group shrink-0",
                    "text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1">
                     {ddlsCountInView > 0 && <span className={cn("text-[9px] font-black rounded px-1 hidden sm:inline-block", "bg-indigo-500/20 text-indigo-400")}>{ddlsCountInView} DDL</span>}
                     <span className="hidden sm:inline group-hover:text-indigo-500 transition-colors">{format(horizonDate, 'MMM yyyy')}</span>
                     <span className="sm:hidden group-hover:text-indigo-500 transition-colors">{format(horizonDate, 'MMM')}</span>
                     <ChevronDown size={14} className={cn("ml-0.5 transition-colors shrink-0", "text-slate-500 group-hover:text-indigo-400")} />
                  </div>
                </DatePicker>
              </div>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2 mt-2 sm:mt-0">
              {calendarDays.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isTo = isToday(day);
                const ddls = ddlMap.get(dayStr) || [];
                const hasDDL = ddls.length > 0;
                const isPast = day < new Date() && !isTo;
                
                return (
                  <div 
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDateAnchor({ day, ddls, element: e.currentTarget });
                    }}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer group relative",
                      isTo 
                        ? (isDarkTheme ? "bg-indigo-500/15 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30" : "bg-indigo-50/70 border-indigo-500 shadow shadow-indigo-500/10")
                        : ("bg-slate-900/40 border-slate-800/50 hover:bg-slate-800"),
                      hasDDL && !isTo 
                        ? ("border-indigo-500/40 bg-indigo-500/10 ring-1 ring-indigo-500/10") 
                        : "",
                      isPast && !isTo ? ("opacity-60") : ""
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors",
                      isTo ? (isDarkTheme ? "text-indigo-300 font-extrabold" : "text-indigo-600 font-extrabold") : (isPast ? ("text-slate-600 group-hover:text-slate-500") : ("text-slate-500 group-hover:text-slate-400"))
                    )}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={cn(
                      "text-lg font-black transition-colors",
                      isTo 
                        ? (isDarkTheme ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.45)]" : "text-indigo-900 font-black")
                        : (isPast ? ("text-slate-600") : ("text-white"))
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    <div className="mt-2 min-h-[16px] flex w-full justify-center">
                      {hasDDL && (
                        <div className="flex items-center justify-center relative w-full">
                          {ddls.length === 1 ? (
                            <Sword className={cn("w-4 h-4", isPast ? "text-rose-500" : ("text-indigo-400"))} />
                          ) : (
                            <div className="flex items-center gap-1">
                              <Sword className={cn("w-3 h-3", isPast ? "text-rose-500" : ("text-indigo-400"))} />
                              <span className={cn("text-[10px] font-bold", isPast ? "text-rose-500" : ("text-indigo-400"))}>x{ddls.length}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <PopoverPortal anchorElement={selectedDateAnchor?.element || null} offsetY={12}>
            {selectedDateAnchor && (
              <div 
                id="horizon-popover"
                className={cn(
                "border rounded-xl p-3 w-64 max-h-64 overflow-y-auto z-50 transition-colors shadow-2xl flex flex-col gap-3",
                "bg-slate-900 border-slate-700/80 shadow-[0_10px_40px_-5px_rgba(0,0,0,0.5)]"
              )}>
                <div className={cn("flex items-center justify-between border-b pb-2", "border-slate-800")}>
                  <span className={cn("text-xs font-bold tracking-widest uppercase", "text-slate-400")}>
                    {format(selectedDateAnchor.day, 'MMM d, yyyy')}
                  </span>
                  <button onClick={() => setSelectedDateAnchor(null)} className={cn("p-1 transition-colors rounded", "text-slate-500 hover:text-white hover:bg-slate-800")}>
                    <X size={14} />
                  </button>
                </div>
                
                {selectedDateAnchor.ddls.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDateAnchor.ddls.map((d, i) => {
                      const isPast = selectedDateAnchor.day < new Date() && !isToday(selectedDateAnchor.day);
                      return (
                        <div key={i} className={cn(
                          "border p-2 rounded-lg cursor-pointer transition-colors",
                          "bg-slate-950/50 border-slate-800 hover:border-indigo-500/50"
                        )} onClick={() => {
                            setSelectedDateAnchor(null);
                            setActiveTab('dungeons');
                          }}>
                          <div className="flex items-center gap-2 mb-1">
                            <Sword size={12} className={isPast ? "text-rose-500" : ("text-indigo-400")} />
                            <h4 className={cn("text-xs font-bold truncate pr-2", "text-white")}>{d.name}</h4>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className={"text-slate-500"}>{d.completedSessions} / {d.totalSessions} Sessions</span>
                            <span className={isPast ? "text-rose-500" : ("text-indigo-400")}>
                               {isPast ? "OVERDUE" : "EXPEDITION TIER"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 py-6 text-center">
                    <Calendar className={cn("w-8 h-8 mb-2 opacity-50", "text-slate-500")} />
                    <span className={cn("text-xs font-bold mb-1", "text-slate-400")}>No Deadlines Today</span>
                    <span className={cn("text-[10px]", "text-slate-500")}>Enjoy your peaceful day.</span>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setSelectedDateAnchor(null);
                    setActiveTab('dungeons');
                  }}
                  className={cn(
                    "w-full py-2 rounded-lg text-xs font-bold tracking-wide transition-colors flex items-center justify-center border",
                    "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/30"
                  )}
                >
                  Manage Expeditions
                </button>
              </div>
            )}
          </PopoverPortal>
        </div>

        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[140px]">
          <Bot className="absolute -bottom-6 right-8 text-indigo-500/20 w-32 h-32 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic pr-1">Oracle's Insight</h3>
              </div>
              <p className="text-sm text-slate-400 font-medium">Seek guidance from the Emerald Sage based on your journey.</p>
            </div>
            <button 
               onClick={() => setShowSageConsult(true)}
               className="py-4 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all border border-indigo-500/30 flex items-center justify-center gap-3 whitespace-nowrap"
            >
              Assemble Council
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        
        </div>

        <div className="space-y-6">
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setShowTodayView(true)}
            className="w-full text-left bg-slate-900 rounded-3xl border border-slate-800 p-6 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] hover:-translate-y-1 cursor-pointer transition-all group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-6 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ArrowRight size={16} />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">Today</h3>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-slate-50">
                {Math.floor(todayEffectiveMinutes)}min
              </span>
              {(() => {
                const timezone = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                let now = new Date();
                if (timezone) {
                  try {
                    const str = now.toLocaleString('en-US', { timeZone: timezone });
                    now = new Date(str);
                  } catch (e) {}
                }
                const ts = state.timeSettings || { morning: { start: 8, end: 12 }, afternoon: { start: 14, end: 18 }, night: { start: 20, end: 24 } };
                if (now.getHours() < ts.morning.start) {
                  now.setDate(now.getDate() - 1);
                }
                const day = now.getDay();
                
                const dailyGoal = state.useSameDailyProgressGoalEveryDay ?? true 
                  ? (state.dailyProgressGoal ?? 8) 
                  : (state.dailyProgressGoalConfig?.[day] ?? 8);

                return (
                  <span className="text-slate-500 text-xs text-right">
                    <span className="opacity-50 mx-1">/</span> {dailyGoal * (state.standardSessionMinutes || 25)}min
                  </span>
                );
              })()}
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
              {(() => {
                const timezone = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                let now = new Date();
                if (timezone) {
                  try {
                    const str = now.toLocaleString('en-US', { timeZone: timezone });
                    now = new Date(str);
                  } catch (e) {}
                }
                const ts = state.timeSettings || { morning: { start: 8, end: 12 }, afternoon: { start: 14, end: 18 }, night: { start: 20, end: 24 } };
                if (now.getHours() < ts.morning.start) {
                  now.setDate(now.getDate() - 1);
                }
                const day = now.getDay();
                
                const dailyGoal = state.useSameDailyProgressGoalEveryDay ?? true 
                  ? (state.dailyProgressGoal ?? 8) 
                  : (state.dailyProgressGoalConfig?.[day] ?? 8);
                const dailyGoalInMinutes = dailyGoal * (state.standardSessionMinutes || 25);
                return (
                  <div 
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all" 
                    style={{ width: `${dailyGoalInMinutes ? Math.min((todayEffectiveMinutes / dailyGoalInMinutes) * 100, 100) : 0}%` }}
                  />
                );
              })()}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStartOfDayModal(true);
                }}
                className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-slate-700 flex flex-row items-center justify-center gap-2 z-10 relative"
              >
                <Sun size={14} className="text-amber-400" />
                Start the Day
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDailySummary(true);
                  playSound('success', state.soundVolume, state.soundEnabled);
                }}
                className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-slate-700 flex flex-row items-center justify-center gap-2 z-10 relative"
              >
                <Calendar size={14} className="text-indigo-400" />
                End the Day
              </button>
            </div>
          </div>

          <div 
            role="button"
            tabIndex={0}
            onClick={() => openGuideBook(0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openGuideBook(0);
              }
            }}
            className="w-full text-left bg-slate-900 rounded-3xl border border-slate-800 p-6 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] hover:-translate-y-1 cursor-pointer transition-all group overflow-hidden relative"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BookMarked size={16} /> Guides
              </h3>
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-opacity shrink-0">
                <BookOpen size={16} />
              </div>
            </div>
            <div className="space-y-2 relative z-10">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openGuideBook(2);
                }} 
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 transition-colors border border-slate-800/50 text-xs text-slate-300"
              >
                  <Compass size={16} className="text-sky-400" /> Sanctum Map
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openGuideBook(3);
                }} 
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 transition-colors border border-slate-800/50 text-xs text-slate-300"
              >
                  <Package size={16} className="text-rose-400" /> Sanctum Items
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openGuideBook(5);
                }} 
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 transition-colors border border-slate-800/50 text-xs text-slate-300"
              >
                  <Coins size={16} className="text-amber-400" /> Gold Coins
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openGuideBook(6);
                }} 
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 transition-colors border border-slate-800/50 text-xs text-slate-300"
              >
                  <BookOpen size={16} className="text-indigo-400" /> XP & Leveling
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openGuideBook(7);
                }} 
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 transition-colors border border-slate-800/50 text-xs text-slate-300"
              >
                  <Zap size={16} className="text-[var(--gb-talent-color)]" /> Talent System
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <TeamModule state={state} setState={setState} />

      {showSageConsult && createPortal(
         <SageConsultModal 
           state={state} 
           setState={setState}
           onClose={() => setShowSageConsult(false)} 
           navigateToSettings={navigateToSettings}
           applyExpeditionPlan={applyExpeditionPlan}
         />,
         document.body
      )}
    </motion.div>
    )}
    </AnimatePresence>
    </>
  );
};

import { SageLoadingTimer } from './dashboard/SageLoadingTimer';

interface SageConsultModalProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onClose: () => void;
  navigateToSettings?: (section: any, settingId?: string) => void;
  applyExpeditionPlan?: (plan: any) => void;
}

const SageConsultModal: React.FC<SageConsultModalProps> = ({ state, setState, onClose, navigateToSettings, applyExpeditionPlan }) => {
  const isDarkTheme = ['night', 'forest', 'ocean'].includes(state.theme || '');
  const loading = !!state.sageIsLoading;
  const loadingStartTime = state.sageLoadingStartTime || Date.now();
  const [userInput, setUserInput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [showPromptSelector, setShowPromptSelector] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = React.useState(() => window.innerWidth >= 768);
  const [editingConvoId, setEditingConvoId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean; title: string; message: string; type?: 'danger'|'warning'|'info'; isAlert?: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const customAlert = (message: string, title = 'Notification') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: true, type: 'info' });
  };

  const customConfirm = (message: string, onConfirm: () => void, title = 'Confirm', type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, isAlert: false, type, onConfirm });
  };

  // Initialize conversations if empty, using legacy history if it exists
  React.useEffect(() => {
    if (!state.sageConversations || state.sageConversations.length === 0) {
      const initialHistory = state.sageChatHistory || [];
      const defaultConvo = {
        id: Date.now().toString(),
        title: initialHistory.length > 0 ? 'Previous Counsel' : 'New Consultation',
        updatedAt: Date.now(),
        messages: initialHistory
      };
      setState(prev => ({
        ...prev,
        sageConversations: [defaultConvo],
        activeSageConversationId: defaultConvo.id
      }));
    } else if (!state.activeSageConversationId) {
       setState(prev => ({
        ...prev,
        activeSageConversationId: prev.sageConversations?.[0]?.id
      }));
    }
  }, []);

  const conversations = state.sageConversations || [];
  const activeConversationId = state.activeSageConversationId || conversations[0]?.id;
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const history = activeConversation?.messages || [];

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelConsult = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleSend = async (customPrompt?: string) => {
    const prompt = customPrompt || userInput;
    if (!prompt.trim() && !customPrompt) return;

    setError(null);
    setUserInput('');

    // Add user message to state and start loading
    const userMsg = { role: 'user' as const, content: prompt, timestamp: Date.now() };
    
    // Auto-generate title if it's the first message
    let newTitle = activeConversation?.title;
    if (history.length === 0) {
      newTitle = prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '');
    }

    setState(prev => {
      const convos = prev.sageConversations || [];
      return {
        ...prev,
        sageConversations: convos.map(c => 
          c.id === activeConversationId 
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now(), title: newTitle || c.title } 
            : c
        ),
        sageIsLoading: true,
        sageLoadingStartTime: Date.now()
      };
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const getAdvicePromise = getSageAdvice({ 
        state, 
        prompt, 
        history: history.map(h => ({ role: h.role, content: h.content })),
        signal: abortController.signal
      });

      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 180 * 1000);
      });

      const res = await Promise.race([getAdvicePromise, timeoutPromise]);
      
      const assistantMsg = { 
        role: 'assistant' as const, 
        content: res.content, 
        reasoningContent: res.reasoningContent,
        timestamp: Date.now() 
      };
      
      setState(prev => {
        const convos = prev.sageConversations || [];
        return {
          ...prev,
          sageConversations: convos.map(c => 
            c.id === activeConversationId 
              ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() } 
              : c
          ),
          sageIsLoading: false,
          sageLoadingStartTime: null
        };
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          sageIsLoading: false,
          sageLoadingStartTime: null
        }));
        return;
      }
      if (e.message === 'TIMEOUT_ERROR') {
        const assistantMsg = { role: 'assistant' as const, content: "*(The Sage pondered deeply for too long and lost the connection. Please try again.)*", timestamp: Date.now() };
        setState(prev => {
          const convos = prev.sageConversations || [];
          return {
            ...prev,
            sageConversations: convos.map(c => 
              c.id === activeConversationId 
                ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() } 
                : c
            ),
            sageIsLoading: false,
            sageLoadingStartTime: null
          };
        });
      } else {
        setError(e.message);
        setState(prev => ({
          ...prev,
          sageIsLoading: false,
          sageLoadingStartTime: null
        }));
      }
    }
  };

  const handleExport = () => {
    if (!activeConversation) return;
    const blob = new Blob([JSON.stringify(activeConversation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sage_export_${activeConversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewConversation = () => {
    const newConvo = {
      id: Date.now().toString(),
      title: 'New Consultation',
      updatedAt: Date.now(),
      messages: []
    };
    setState(prev => ({
      ...prev,
      sageConversations: [newConvo, ...(prev.sageConversations || [])],
      activeSageConversationId: newConvo.id
    }));
    // On mobile, auto close sidebar if creating new
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleRenameConversation = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvoId(id);
    setEditingTitle(currentTitle);
  };

  const saveConversationTitle = (id: string) => {
    if (editingTitle.trim()) {
      setState(prev => {
        const convos = prev.sageConversations || [];
        return {
          ...prev,
          sageConversations: convos.map(c => 
            c.id === id ? { ...c, title: editingTitle.trim() } : c
          )
        };
      });
    }
    setEditingConvoId(null);
    setEditingTitle('');
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setState(prev => {
      const remaining = (prev.sageConversations || []).filter(c => c.id !== id);
      if (remaining.length === 0) {
        const defaultConvo = {
          id: Date.now().toString(),
          title: 'New Consultation',
          updatedAt: Date.now(),
          messages: []
        };
        return {
          ...prev,
          sageConversations: [defaultConvo],
          activeSageConversationId: defaultConvo.id
        };
      }
      return {
        ...prev,
        sageConversations: remaining,
        activeSageConversationId: id === prev.activeSageConversationId ? remaining[0].id : prev.activeSageConversationId
      };
    });
  };

  const clearHistory = () => {
    customConfirm("Are you sure you want to clear this entire conversation?", () => {
      setState(prev => {
        const convos = prev.sageConversations || [];
        return {
          ...prev,
          sageConversations: convos.map(c => 
            c.id === activeConversationId ? { ...c, messages: [] } : c
          )
        };
      });
    }, "Clear Conversation", "danger");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuote = (text: string) => {
    const lines = text.split('\n').map(l => `> ${l}`).join('\n');
    setUserInput(lines + '\n\n' + userInput);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          "w-full max-w-4xl rounded-none md:rounded-[2.25rem] border-0 md:border overflow-hidden shadow-2xl flex h-full md:h-[85vh] relative",
          "bg-slate-900 border-slate-800 shadow-[0_0_50px_rgba(30,41,59,0.5)]"
        )}
      >
        {/* Sidebar Mobile Backdrop */}
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-25 bg-slate-950/60 backdrop-blur-xs md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              key="sage-sidebar"
              initial={isMobile ? { x: -285, opacity: 1 } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { width: 280, opacity: 1 }}
              exit={isMobile ? { x: -285, opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={cn(
                "h-full border-r flex flex-col flex-shrink-0 z-30 shadow-2xl md:shadow-none w-[280px]",
                isMobile ? "absolute left-0 top-0" : "relative",
                "border-slate-800 bg-slate-950"
              )}
            >
              <div className={cn("p-4 border-b flex items-center justify-between", "border-slate-800")}>
                <span className={cn("text-xs font-black uppercase tracking-widest pl-2", "text-slate-400")}>Consultations</span>
                <button
                  onClick={handleNewConversation}
                  className={cn("p-1.5 rounded-lg transition-colors", "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20")}
                  title="New Consultation"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {conversations.map(convo => (
                  <div
                    key={convo.id}
                    onClick={() => {
                      if (editingConvoId !== convo.id) {
                        setState(prev => ({ ...prev, activeSageConversationId: convo.id }));
                      }
                      if (isMobile) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-2xl transition-all group flex items-start gap-3",
                      editingConvoId !== convo.id ? "cursor-pointer" : "",
                      activeConversationId === convo.id
                        ? "bg-indigo-500/15 border border-indigo-500/30"
                        : ("bg-slate-900 border border-transparent hover:border-slate-800")
                    )}
                  >
                    <MessageSquare size={16} className={cn("mt-0.5 flex-shrink-0", activeConversationId === convo.id ? "text-indigo-500" : ("text-slate-500 group-hover:text-slate-400"))} />
                    <div className="flex-1 overflow-hidden">
                      {editingConvoId === convo.id ? (
                         <input
                          autoFocus
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => saveConversationTitle(convo.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveConversationTitle(convo.id);
                            if (e.key === 'Escape') setEditingConvoId(null);
                          }}
                          className={cn("text-xs font-bold w-full bg-transparent outline-none border-b border-dashed", "text-slate-200 border-indigo-500/50")}
                        />
                      ) : (
                        <div className={cn("text-xs font-bold line-clamp-1 break-all", activeConversationId === convo.id ? ("text-slate-200") : ("text-slate-300 group-hover:text-slate-200"))}>
                          {convo.title}
                        </div>
                      )}
                      <div className={cn("text-[10px] mt-1", "text-slate-600")}>
                        {new Date(convo.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {editingConvoId !== convo.id && (
                      <div className="flex flex-col gap-2 flex-shrink-0 transition-opacity">
                        <button
                          onClick={(e) => handleRenameConversation(convo.id, convo.title, e)}
                          className={cn("p-1", "text-slate-500 hover:text-indigo-400")}
                          title="Rename"
                        >
                          <Edit2 size={12} />
                        </button>
                        {conversations.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteConversation(convo.id, e)}
                            className={cn("p-1 hover:text-red-400", "text-slate-500")}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className={cn("flex-1 flex flex-col min-w-0 transition-colors", "")}>
          <div className={cn("p-3.5 md:p-5 border-b flex justify-between items-center transition-colors", "border-slate-800 bg-slate-900/40")}>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={cn("p-2 transition-colors rounded-xl", "text-slate-400 hover:text-white bg-slate-800/50")}
                title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              >
                {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
              <div className={cn("p-1.5 rounded-lg hidden xs:block", "bg-indigo-500/20")}>
                 <Bot className={cn("text-indigo-400")} size={16} />
              </div>
              <div className="min-w-0">
                 <h3 className={cn("text-sm md:text-lg font-black uppercase tracking-widest leading-none mb-1 truncate", "text-white")}>Sage's Council</h3>
                 <span className={cn("text-[9px] md:text-[10px] font-bold uppercase tracking-tighter line-clamp-1 max-w-[120px] xs:max-w-[180px] md:max-w-none transition-colors", "text-indigo-400/60")}>{activeConversation?.title || 'Illuminating the Path'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button 
                onClick={handleExport}
                title="Export Conversation"
                className={cn("p-2 transition-colors", "text-slate-400 hover:text-indigo-400")}
                disabled={!activeConversation || activeConversation.messages.length === 0}
              >
                <Download size={18} />
              </button>
              <button 
                onClick={() => {
                  if (navigateToSettings) {
                    onClose();
                    navigateToSettings('sage', 'setting-sage');
                  }
                }}
                title="Settings"
                className={cn("p-2 transition-colors", "text-slate-400 hover:text-indigo-400")}
              >
                <SettingsIcon size={18} />
              </button>
              <button onClick={onClose} className={cn("p-2 transition-colors", "text-slate-400 hover:text-white")}>
                <X size={20} />
              </button>
            </div>
          </div>

        <div ref={scrollRef} className={cn(
          "flex-1 overflow-y-auto p-3.5 md:p-8 custom-scrollbar space-y-4 md:space-y-6 transition-colors",
          ""
        )}>
          {history.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 md:space-y-8 py-6 md:py-10">
               <div className="relative">
                 <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 animate-pulse" />
                 <Bot className="absolute inset-0 m-auto text-indigo-500/40" size={32} />
               </div>
               <div>
                 <h4 className={cn("font-black uppercase tracking-widest text-xs md:text-base mb-2 md:mb-3", "text-white")}>Begin the Consultation</h4>
                 <p className={cn("text-xs md:text-sm max-w-xs leading-relaxed px-4", "text-slate-400")}>The Oracle is ready to evaluate your scrolls. Speak, and the path shall be revealed.</p>
               </div>
               <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center max-w-lg px-4">
                 {state.sagePrompts?.map(p => (
                   <button key={p.id} onClick={() => handleSend(p.prompt)} className={cn(
                     "py-1.5 px-2.5 md:py-2 md:px-3.5 border rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap",
                     "bg-slate-900 border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-500/10 text-indigo-300 hover:text-white"
                   )}>{p.title}</button>
                 ))}
               </div>
            </div>
          )}

          {history.map((msg, idx) => (
            <div key={idx} className={cn("flex flex-col group", msg.role === 'user' ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[92%] sm:max-w-[82%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-lg relative",
                msg.role === 'user' 
                  ? "bg-indigo-600 border border-indigo-500 text-white rounded-tr-none" 
                  : cn(
                      "rounded-tl-none font-serif shadow-sm",
                      "bg-slate-900/80 border border-slate-800 text-slate-300"
                    )
              )}>
                {msg.role === 'assistant' ? (
                  <div className={cn("prose prose-sm max-w-none", "prose-sage")}>
                    {msg.reasoningContent && (
                      <details className={cn("mb-4 rounded-xl border group overflow-hidden bg-transparent", "border-indigo-500/20 hover:bg-indigo-500/5")}>
                        <summary className={cn("px-3 py-2 text-xs font-bold cursor-pointer select-none transition-colors outline-none", "text-indigo-400")}>
                          Thought Process
                        </summary>
                        <div className={cn("px-3 pb-3 pt-1 text-[11px] opacity-80 border-t", "border-indigo-500/20")}>
                          <ReactMarkdown>{msg.reasoningContent}</ReactMarkdown>
                        </div>
                      </details>
                    )}
                    {(() => {
                      let parsedPlan = null;
                      let parsedSettings = null;
                      let textToRender = msg.content;
                      let hasMarkdownBlock = false;
                      const canModify = !!state.sageAllowGameModifiers;

                      if (canModify) {
                        try {
                          // Try to find a JSON object in the text
                          const startObj = msg.content.indexOf('{');
                          const endObj = msg.content.lastIndexOf('}');
                          if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
                            const possibleJson = msg.content.substring(startObj, endObj + 1);
                            const parsed = JSON.parse(possibleJson);
                            
                            if (parsed.tiers && parsed.title) {
                              parsedPlan = parsed;
                            } else if (parsed.devBaseXP !== undefined || parsed.devBaseCoins !== undefined) {
                              parsedSettings = parsed;
                            }

                            if (parsedPlan || parsedSettings) {
                              // Try to strip the json block, including any markdown formatting around it
                              const blockRegex = /```(?:json)?\s*\{[\s\S]*\}\s*```/;
                              if (blockRegex.test(textToRender)) {
                                textToRender = textToRender.replace(blockRegex, '');
                              } else {
                                textToRender = textToRender.replace(possibleJson, '');
                              }
                            }
                          }
                        } catch (e) {
                          // Ignore parse error
                        }
                      }

                      return (
                        <>
                          {(textToRender.trim().length > 0) && (
                            <ReactMarkdown
                              components={{
                                code({node, inline, className, children, ...props}: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isJson = match && match[1] === 'json';
                                  const content = String(children).replace(/\n$/, '');
                                  
                                  // We already extracted top-level JSON above. 
                                  // If there are other code blocks, just render them as normal.
                                  return (
                                    <code className={cn("px-1 py-0.5 rounded text-xs select-auto font-mono", "bg-slate-900/50 text-indigo-300", className)} {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {textToRender}
                            </ReactMarkdown>
                          )}
                          
                          {parsedPlan && applyExpeditionPlan && (
                            <div className="my-4">
                              <ExpeditionPlanPreview 
                                plan={parsedPlan} 
                                onApply={applyExpeditionPlan} 
                                isDarkTheme={isDarkTheme} 
                              />
                            </div>
                          )}
                          
                          {parsedSettings && setState && (
                            <div className={cn("my-4 p-4 border rounded-2xl flex flex-col items-start gap-3", "bg-slate-900 border-indigo-500/30")}>
                              <h4 className={cn("font-black tracking-wide flex items-center gap-2", "text-indigo-400")}>
                                <SettingsIcon size={16} /> Balance Settings Update
                              </h4>
                              <div className="flex gap-4 items-center">
                                {parsedSettings.devBaseXP !== undefined && (
                                  <div className={cn("px-3 py-1.5 rounded-lg border", "bg-slate-800 border-slate-700")}>
                                    <span className="text-xs font-bold text-indigo-500">XP: {parsedSettings.devBaseXP}</span>
                                  </div>
                                )}
                                {parsedSettings.devBaseCoins !== undefined && (
                                  <div className={cn("px-3 py-1.5 rounded-lg border", "bg-slate-800 border-slate-700")}>
                                    <span className="text-xs font-bold text-amber-500">Gold: {parsedSettings.devBaseCoins}</span>
                                  </div>
                                )}
                              </div>
                              <button 
                                onClick={() => {
                                  setState(prev => ({
                                    ...prev,
                                    ...(parsedSettings.devBaseXP !== undefined && { devBaseXP: parsedSettings.devBaseXP }),
                                    ...(parsedSettings.devBaseCoins !== undefined && { devBaseCoins: parsedSettings.devBaseCoins })
                                  }));
                                  customAlert("Balance settings updated!", "Success");
                                }}
                                className="px-4 py-2 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                              >
                                Apply Settings
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              
              <div className={cn(
                "flex items-center gap-3 mt-1.5 px-2",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest shrink-0">
                  {msg.role === 'user' ? 'Scholar' : 'Emerald Sage'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopy(msg.content, `${idx}`)}
                    className="p-1 hover:text-indigo-400 text-slate-500 transition-colors flex items-center justify-center"
                    title="Copy"
                  >
                    {copiedId === `${idx}` ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  <button 
                    onClick={() => handleQuote(msg.content)}
                    className="p-1 hover:text-indigo-400 text-slate-500 transition-colors flex items-center justify-center"
                    title="Quote"
                  >
                    <Quote size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start pr-1">
              <SageLoadingTimer startTime={loadingStartTime} isDarkTheme={isDarkTheme} onCancel={handleCancelConsult} />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold font-mono">
              {error}
            </div>
          )}
        </div>

        <div className={cn(
          "p-3.5 md:p-6 border-t relative transition-colors duration-200",
          "bg-slate-900 border-slate-800"
        )}>
           <AnimatePresence>
            {showPromptSelector && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn("absolute bottom-full left-4 md:left-6 mb-4 w-[280px] sm:w-72 rounded-2xl md:rounded-3xl shadow-2xl p-2 z-50 overflow-hidden",
                  "bg-slate-900 border border-slate-800"
                )}
              >
                <div className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-3 border-b mb-1 flex justify-between items-center",
                  "text-indigo-500/50 border-slate-800/50"
                )}>
                  <span>Prompt Library</span>
                  {(!state.sagePrompts || state.sagePrompts.length === 0) && (
                    <button 
                      onClick={() => {
                        import('../constants').then(({ DEFAULT_SAGE_PROMPTS }) => {
                          setState(prev => ({ ...prev, sagePrompts: DEFAULT_SAGE_PROMPTS }));
                        });
                      }}
                      className={cn("text-[9px] font-bold transition-colors",
                        "text-indigo-400 hover:text-indigo-300"
                      )}
                    >
                      Load Defaults
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {state.sagePrompts && state.sagePrompts.length > 0 ? (
                    state.sagePrompts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setUserInput(p.prompt + (userInput ? '\n\n' + userInput : ''));
                          setShowPromptSelector(false);
                          inputRef.current?.focus();
                        }}
                        className={cn("w-full text-left p-4 rounded-[1.25rem] transition-colors group",
                          "hover:bg-indigo-500/10"
                        )}
                      >
                        <div className={cn("text-xs font-bold",
                          "text-slate-200 group-hover:text-indigo-400"
                        )}>{p.title}</div>
                        <div className={cn("text-[10px] line-clamp-2 mt-1",
                          "text-slate-500"
                        )}>{p.prompt}</div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest",
                        "text-slate-600"
                       )}>Library is empty</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
           </AnimatePresence>

           <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 pl-1">
              <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                <span className={cn("text-[8px] sm:text-[9.5px] font-black uppercase tracking-widest mr-1", "text-slate-500")}>Persona:</span>
                {(['sage', 'friend', 'master'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setState(prev => ({ ...prev, sagePersonality: p }))}
                    className={cn("text-[8px] sm:text-[9.5px] font-bold uppercase tracking-widest px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition-colors border",
                      (state.sagePersonality || 'sage') === p 
                        ? ("bg-indigo-600 border-indigo-500 text-white")
                        : ("bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600")
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className={cn("w-px h-3 mx-1", "bg-slate-800")}></div>
              <button
                onClick={() => setState(prev => ({ ...prev, sageAllowGameModifiers: !prev.sageAllowGameModifiers }))}
                className={cn("flex items-center gap-1 text-[8px] sm:text-[9.5px] font-bold uppercase tracking-widest px-2 py-0.5 sm:py-1 rounded-lg border transition-all",
                  state.sageAllowGameModifiers 
                    ? ("bg-rose-500/10 border-rose-500/30 text-rose-400")
                    : ("bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600")
                )}
                title="Allow AI to propose game modifications (quests, settings)"
              >
                <Edit2 size={8} className="sm:w-2.5 sm:h-2.5" />
                Modify Mode
              </button>
           </div>

           <div className="flex gap-2 sm:gap-3">
              <button 
                onClick={() => setShowPromptSelector(!showPromptSelector)}
                className={cn(
                  "flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl border-2 transition-all flex items-center justify-center",
                  showPromptSelector 
                    ? "bg-indigo-600 border-indigo-500 text-white" 
                    : ("bg-slate-950 border-slate-800 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400")
                )}
                title="Select Prompt"
              >
                <Library size={18} className="sm:w-[22px] sm:h-[22px]" />
              </button>
              <div className="relative flex-1 group">
                <input 
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask the Sage..."
                  className={cn("w-full h-11 sm:h-14 border-2 rounded-xl sm:rounded-2xl px-4 sm:px-6 pr-12 sm:pr-16 outline-none transition-all font-medium text-xs sm:text-sm",
                    "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500 placeholder:text-slate-600"
                  )}
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={loading || !userInput.trim()}
                  className={cn("absolute right-1 sm:right-2 top-1 sm:top-2 bottom-1 sm:bottom-2 w-9 sm:w-12 text-white rounded-lg sm:rounded-xl transition-all flex items-center justify-center p-0",
                    "bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600"
                  )}
                >
                  <Send size={15} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
           </div>
        </div>
        </div>
      </motion.div>
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(d => ({ ...d, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        isAlert={confirmDialog.isAlert}
      />
    </div>
  );
};
