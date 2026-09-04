import { MarkdownEditor } from "../common/MarkdownEditor";
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 

  X, 
  Star, 
  StarHalf, 
  ChevronDown, 
  ChevronUp, 
  Trophy, 
  Coins, 
  Zap, 
  Sword, 
  Target, 
  ShoppingBag, 
  Package,
  Calendar,
  MessageSquare,
  ArrowRight,
  Download,
  Upload,
  Eye,
  EyeOff,
  Clock,
  LayoutTemplate,
  Save,
  Maximize2,
  Minimize2,
  File,
  FileText,
  Indent,
  Heart,
  Moon,
  Sparkles,
  SlidersHorizontal,
  Calculator
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn, getSessionSettlementDate, getSettlementDay, getSessionEffectiveMinutes, formatDuration } from '../../lib/utils';
import { playSound } from '../../lib/sound';
import { AppState, StudySession, RewardHistoryItem, Dungeon, MajorDungeon } from '../../types';
import { MOOD_OPTIONS, DEFAULT_ENABLED_MOODS } from '../../constants';

import { createPortal } from 'react-dom';
import { useScrollLock } from '../../hooks/useScrollLock';
import { ImmersiveReflectionModal } from '../journal/ImmersiveReflectionModal';
import { EfficiencyDetailsModal } from './EfficiencyDetailsModal';

interface DailySummaryModalProps {
  state: AppState;
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  onClose: () => void;
  onNavigateToStats: () => void;
  onSave: (date: string, rating: number, reflection: string, mood?: string) => void;
  onUpdateState?: (update: Partial<AppState>) => void;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({ state, dungeons, majorDungeons, onClose, onNavigateToStats, onSave, onUpdateState }) => {
  useScrollLock(true);
  const [rating, setRating] = useState(() => Number(localStorage.getItem('scholar_rating_draft')) || 0);
  const [reflection, setReflection] = useState(() => localStorage.getItem('scholar_reflection_draft') || '');
  const [mood, setMood] = useState(() => localStorage.getItem('scholar_mood_draft') || '');
  const [isStatsExpanded, setIsStatsExpanded] = useState(true);
  const [isMarkdownEnabled, setIsMarkdownEnabled] = useState(state.defaultMarkdownEnabled ?? true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [templateMode, setTemplateMode] = useState<'empty' | 'example'>('empty');
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Efficiency Calculation State
  const [customTargetHours, setCustomTargetHours] = useState<number | null>(null);
  const [showEfficiencyDetails, setShowEfficiencyDetails] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const immersiveTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const hasInitializedFromLog = useRef(false);

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

    const timezone = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    let now = new Date();
    if (state.timezone) {
      try {
        const str = now.toLocaleString('en-US', { timeZone: state.timezone });
        now = new Date(str);
      } catch (e) {
        console.error("Timezone error:", e);
      }
    }

    const currentHour = now.getHours();

    // Start with today's morning
    let startDate = new Date(now);
    startDate.setHours(ts.morning.start, 0, 0, 0);

    let endDate = new Date(now);
    
    // If the night block spans midnight, the 'end' date needs to be the next day relative to the morning start.
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

    // If we are currently before the morning start, we belong to the previous day's settlement period
    if (currentHour < ts.morning.start) {
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
      dateString: getYMD(startDate),
      settlementPeriod: `${formatDate(startDate)} - ${formatDate(endDate, ts.night.end === 24)}`
    };
  }, [state.timeSettings, state.timezone]);

  // Remove initial placeholder useEffect here as it is moved below dailyStats declarations

  // End applyFormat

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

  React.useEffect(() => {
    localStorage.setItem('scholar_reflection_draft', reflection);
  }, [reflection]);

  React.useEffect(() => {
    localStorage.setItem('scholar_rating_draft', rating.toString());
  }, [rating]);

  React.useEffect(() => {
    if (mood) localStorage.setItem('scholar_mood_draft', mood);
    else localStorage.removeItem('scholar_mood_draft');
  }, [mood]);

  const dailyStats = useMemo(() => {
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

    const getAssignedDate = (date: Date) => {
      const hour = date.getHours();
      
      const peaks = [ts.morning, ts.afternoon, ts.night];
      
      // Night span midnight check
      if (ts.night.start > ts.night.end && hour < ts.night.end) {
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        return getYMD(yesterday);
      }
      
      // Before morning start check
      if (hour < ts.morning.start) {
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        return getYMD(yesterday);
      }

      return getYMD(date);
    };

    const sessionsToday = state.history.filter(s => getAssignedDate(new Date(s.timestamp)) === today.dateString);
    const rewardsToday = state.rewardHistory.filter(r => getAssignedDate(new Date(r.timestamp)) === today.dateString);
    
    const goldEarned = sessionsToday.reduce((sum, s) => sum + s.coinsEarned, 0);
    const xpEarned = sessionsToday.reduce((sum, s) => sum + s.xpEarned, 0);
    const effectiveMinutes = sessionsToday.reduce((sum, s) => sum + getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks), 0);
    
    const levelsGained = rewardsToday.filter(r => r.source === 'LevelUp').length;
    
    const highTierItems = rewardsToday.filter(r => 
      r.type === 'item' && (r.rarity === 'epic' || r.rarity === 'legendary')
    );

    const completedDungeonsCount = dungeons.filter(d => d.status === 'completed' && d.completedAt && getAssignedDate(new Date(d.completedAt)) === today.dateString).length;
    const completedMajorsCount = majorDungeons.filter(m => m.status === 'completed' && m.completedAt && getAssignedDate(new Date(m.completedAt)) === today.dateString).length;
    
    const questsCompletedToday = state.quests.filter(q => q.completed && !q.isAchievement && q.lastReset && getAssignedDate(new Date(q.lastReset)) === today.dateString).length;
    const achievementsCompletedToday = state.quests.filter(q => q.completed && q.isAchievement && q.lastReset && getAssignedDate(new Date(q.lastReset)) === today.dateString).length;

    const itemsBought = rewardsToday.filter(r => r.source === 'Shop');
    const itemsGacha = rewardsToday.filter(r => r.source === 'Gacha');

    const timezone = state.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dateStr = new Date().toLocaleString("en-US", { weekday: 'long', timeZone: timezone });
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days.indexOf(dateStr);
    
    const dailyGoal = state.useSameDailyProgressGoalEveryDay ?? true 
      ? (state.dailyProgressGoal ?? 8) 
      : (state.dailyProgressGoalConfig?.[day] ?? 8);

    const getSessionDistractionCount = (distractions?: any): number => {
      if (!distractions) return 0;
      if (typeof distractions === 'number') return isNaN(distractions) ? 0 : distractions;
      return (Number(distractions.internal) || 0) + (Number(distractions.external) || 0) + (Number(distractions.unavoidable) || 0);
    };

    const totalDistractions = sessionsToday.reduce((sum, s) => sum + getSessionDistractionCount(s.distractions), 0);

    return {
      sessions: state.dailySessions,
      effectiveMinutes,
      totalDistractions,
      gold: goldEarned,
      xp: xpEarned,
      levels: levelsGained,
      highTier: highTierItems,
      streak: state.streak,
      dungeons: completedDungeonsCount + completedMajorsCount,
      quests: questsCompletedToday,
      achievements: achievementsCompletedToday,
      bought: itemsBought,
      gacha: itemsGacha,
      dailyGoal
    };
  }, [state, today.dateString, dungeons, majorDungeons]);

  // Default target hours based on Sanctum daily goal & pomodoro duration
  const defaultTargetHours = useMemo(() => {
    const pomodoroDuration = (state.standardSessionMinutes || 25) + (state.standardRestMinutes || 5);
    return Math.max(0.1, Number(((dailyStats.dailyGoal * pomodoroDuration) / 60).toFixed(2)));
  }, [dailyStats.dailyGoal, state.standardSessionMinutes, state.standardRestMinutes]);

  // Efficiency calculation logic
  const calculateEfficiencyRating = useCallback((
    effectiveMinutes: number,
    totalDistractions: number,
    targetH: number,
    maxDist: number,
    compWeight: number,
    focusWeight: number
  ) => {
    const actualH = effectiveMinutes / 60;
    if (actualH <= 0) {
      return {
        actualH: 0,
        targetH,
        completionRate: 0,
        totalDistractions: 0,
        distractionsPerHour: 0,
        focusQuality: 0,
        efficiency: 0,
        rawStars: 0,
        calculatedStars: 0
      };
    }
    const completionRate = targetH > 0 ? Math.min(actualH / targetH, 1.0) : 0;
    const distractionsPerHour = totalDistractions / actualH;
    const focusQuality = Math.max(0, 1.0 - (distractionsPerHour / (maxDist > 0 ? maxDist : 10)));
    const wComp = compWeight / 100;
    const wFocus = focusWeight / 100;
    const efficiency = (wComp * completionRate) + (wFocus * focusQuality);
    const rawStars = efficiency * 5;
    const calculatedStars = Math.min(5, Math.max(0, rawStars));

    return {
      actualH,
      targetH,
      completionRate,
      totalDistractions,
      distractionsPerHour,
      focusQuality,
      efficiency,
      rawStars,
      calculatedStars
    };
  }, []);

  const handleAutoCalculate = () => {
    setIsCalculating(true);

    const tHours = customTargetHours !== null ? customTargetHours : defaultTargetHours;
    const maxDist = state.efficiencyRatingConfig?.maxDistractionsPerHour ?? 10;
    const compW = state.efficiencyRatingConfig?.completionRateWeight ?? 70;
    const focusW = state.efficiencyRatingConfig?.focusQualityWeight ?? 30;

    const res = calculateEfficiencyRating(
      dailyStats.effectiveMinutes,
      dailyStats.totalDistractions,
      tHours,
      maxDist,
      compW,
      focusW
    );

    setTimeout(() => {
      setRating(res.calculatedStars);
      setIsCalculating(false);
      playSound('calculate', 0.4);
    }, 450);
  };

  // Load existing log if one exists for today, or auto-calculate rating if enabled
  React.useEffect(() => {
    if (!hasInitializedFromLog.current && today.dateString) {
      const existingLog = state.dailyLogs?.[today.dateString];
      if (existingLog) {
        setRating(existingLog.rating);
        setReflection(existingLog.reflection);
        if (existingLog.mood) setMood(existingLog.mood);
      } else {
        // Auto-calculate rating on modal open if enabled (default: true)
        if (state.efficiencyRatingConfig?.autoCalculateOnOpen !== false) {
          const tHours = customTargetHours !== null ? customTargetHours : defaultTargetHours;
          const maxDist = state.efficiencyRatingConfig?.maxDistractionsPerHour ?? 10;
          const compW = state.efficiencyRatingConfig?.completionRateWeight ?? 70;
          const focusW = state.efficiencyRatingConfig?.focusQualityWeight ?? 30;

          const res = calculateEfficiencyRating(
            dailyStats.effectiveMinutes,
            dailyStats.totalDistractions,
            tHours,
            maxDist,
            compW,
            focusW
          );
          setRating(res.calculatedStars);
        }
      }
      hasInitializedFromLog.current = true;
    }
  }, [state.dailyLogs, today.dateString, state.efficiencyRatingConfig, dailyStats, defaultTargetHours, customTargetHours, calculateEfficiencyRating]);

  const renderStars = () => {
    const displayRating = Math.round(rating * 2) / 2;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = displayRating >= i;
      const isHalf = displayRating >= i - 0.5 && displayRating < i;
      
      stars.push(
        <button
          key={i}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) {
              setRating(i - 0.5);
            } else {
              setRating(i);
            }
          }}
          className="text-amber-400 hover:scale-110 transition-transform"
        >
          {isFull ? <Star className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" /> : isHalf ? <StarHalf className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" /> : <Star className="w-8 h-8 sm:w-10 sm:h-10" />}
        </button>
      );
    }
    return stars;
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md m-0 p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.98, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 10 }}
        className="bg-slate-900 border-0 rounded-none w-screen h-screen h-[100dvh] shadow-2xl overflow-hidden relative flex flex-col z-10"
      >
        {/* Header */}
        <div className="py-4 px-6 sm:px-8 border-b border-slate-800 flex justify-between items-start bg-gradient-to-r from-indigo-500/10 to-transparent relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none z-0">
            <Moon size={80} />
          </div>
          <div className="flex justify-between items-start relative z-10 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 md:gap-5">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-1 flex items-center gap-3">
                End of the Day <Moon className="text-indigo-400" size={28} />
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
                       <span className="text-slate-400">{startTimePart}</span>
                       <span className="opacity-40">→</span>
                       <span className="text-slate-500">{end}</span>
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

        <div className="p-5 sm:p-8 overflow-y-auto flex-grow custom-scrollbar lg:flex lg:flex-row lg:items-stretch lg:gap-8 space-y-6 lg:space-y-0 relative h-full">
          {/* Left Column */}
          <div className="space-y-2.5 sm:space-y-3 flex flex-col lg:w-1/2 lg:flex-1 lg:h-full">
          {/* Daily Progress */}
          <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-3.5 sm:p-4">
            {(() => {
              const pomodoroDuration = (state.standardSessionMinutes || 25) + (state.standardRestMinutes || 5);
              const dailyGoalInMinutes = dailyStats.dailyGoal * pomodoroDuration;
              return (
                <>
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <Target size={16} className="text-indigo-400" /> Daily Progress
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {formatDuration(dailyStats.effectiveMinutes)} <span className="text-slate-600">/</span> {formatDuration(dailyGoalInMinutes)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all" 
                      style={{ width: `${dailyGoalInMinutes > 0 ? Math.min((dailyStats.effectiveMinutes / dailyGoalInMinutes) * 100, 100) : 0}%` }}
                    />
                  </div>
                </>
              );
            })()}
          </div>

          {/* Summary Stats */}
          <div className="space-y-2">
            <button 
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              className="w-full flex items-center justify-between hover:text-white transition-colors group"
            >
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 group-hover:text-white transition-colors">
                <Calendar size={16} className="text-emerald-400" /> Today's Record
              </h3>
              <div className="text-slate-500 group-hover:text-white transition-colors">
                {isStatsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            <AnimatePresence>
              {isStatsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                      <StatCard icon={Sword} label={"Time"} value={formatDuration(dailyStats.effectiveMinutes)} color="text-indigo-400" />
                      <StatCard icon={Coins} label="Gold" value={dailyStats.gold} color="text-amber-400" />
                      <StatCard icon={Zap} label="XP" value={dailyStats.xp} color="text-emerald-400" />
                      <StatCard icon={Calendar} label="Streak" value={`${dailyStats.streak} Days`} color="text-orange-400" />
                    </div>

                    {(dailyStats.levels > 0 || dailyStats.quests > 0 || dailyStats.achievements > 0 || dailyStats.dungeons > 0) && (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {dailyStats.levels > 0 && <StatCard icon={Trophy} label="Levels" value={`+${dailyStats.levels}`} color="text-rose-400" />}
                        {(dailyStats.quests > 0 || dailyStats.achievements > 0 || dailyStats.dungeons > 0) && (
                          <StatCard 
                            icon={Target} 
                            label="Completed" 
                            value={`${dailyStats.quests + dailyStats.achievements + dailyStats.dungeons}`} 
                            color="text-blue-400" 
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* High Tier Items & Purchases */}
                  <div className="mt-4 space-y-2">
                    {dailyStats.highTier.length > 0 && (
                      <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center gap-3">
                        <Package className="text-purple-400" size={18} />
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Legendary Finds</p>
                          <p className="text-sm text-white font-medium">{dailyStats.highTier.map(i => i.name).join(', ')}</p>
                        </div>
                      </div>
                    )}
                    {(dailyStats.bought.length > 0 || dailyStats.gacha.length > 0) && (
                      <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center gap-3">
                        <ShoppingBag className="text-amber-400" size={18} />
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acquisitions</p>
                          <p className="text-sm text-white font-medium">
                            {[...dailyStats.bought, ...dailyStats.gacha].map(i => i.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        {/* Mood Selection */}
          <div className="bg-slate-800/20 rounded-xl p-3 sm:p-4 border border-slate-700/30 space-y-2.5">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Heart size={16} className="text-rose-400" /> Feelings
            </h3>
            <div className="flex flex-wrap justify-center gap-2.5 py-1.5 overflow-y-visible">
              {MOOD_OPTIONS.filter(m => (state.enabledMoods || DEFAULT_ENABLED_MOODS).includes(m.id)).map((m) => {
                const isSelected = mood === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMood(isSelected ? "" : m.id)}
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[48px] sm:min-w-[64px] p-2 rounded-xl border transition-all pointer-events-auto",
                      isSelected 
                        ? `${m.bg} ${m.border} ${m.color} scale-125 shadow-xl z-10` 
                        : "bg-slate-950/50 border-slate-800 text-slate-500 hover:bg-slate-800 hover:border-slate-700 hover:scale-110"
                    )}
                    title={`Select ${m.label}`}
                  >
                    <Icon size={20} className="sm:mb-1.5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:block">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bg-slate-800/20 rounded-xl p-3 sm:p-4 border border-slate-700/30 space-y-2.5 lg:flex-1 lg:flex lg:flex-col lg:justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Star size={16} className="text-amber-400" /> Efficiency
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  id="auto-calculate-rating-button"
                  onClick={handleAutoCalculate}
                  disabled={isCalculating}
                  className={cn(
                    "px-2.5 py-1 bg-slate-800 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm group",
                    isCalculating && "opacity-80 cursor-wait"
                  )}
                  title="Auto-calculate rating using focus duration & distraction metrics"
                >
                  <Calculator size={13} className={cn("text-indigo-400 group-hover:text-indigo-300", isCalculating && "animate-spin")} />
                  <span>Calculate</span>
                </button>
                <button
                  id="efficiency-formula-details-button"
                  onClick={() => setShowEfficiencyDetails(true)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                  title="View formula details, today's metrics, and customize parameters"
                >
                  <SlidersHorizontal size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800 lg:flex-1 relative overflow-hidden">
              <motion.div 
                className="flex justify-center gap-1 sm:gap-1.5"
                animate={isCalculating ? { scale: [1, 1.2, 1], rotate: [0, -3, 3, 0] } : {}}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {state.efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency' ? (
                  <span className={cn(
                    "text-3xl font-black font-mono",
                    rating > 0 ? "text-indigo-400" : "text-slate-500"
                  )}>
                    {rating > 0 ? `${((rating / 5) * 100).toFixed(1).replace(/\.0$/, '')}%` : 'None'}
                  </span>
                ) : (
                  renderStars()
                )}
              </motion.div>
            </div>
          </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 flex flex-col lg:w-1/2 lg:flex-1 min-h-[500px] lg:h-full">
          {/* Daily Reflection */}
          <div className="bg-slate-800/20 rounded-2xl p-4 sm:p-6 border border-slate-700/30 space-y-4 flex flex-col flex-1">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 shrink-0">
                <MessageSquare size={16} className="text-sky-400" /> Daily Reflection
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center gap-0 h-[26px]">
                  {renderTemplateControls()}
                </div>

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
            
            {/* Single Markdown Editor Pane (Regular Modal View) */}
            <div className="flex flex-col flex-1 h-full min-h-[300px] bg-slate-950 border border-slate-800 rounded-3xl p-4 focus-within:border-indigo-500 transition-all overflow-hidden">
              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <MarkdownEditor 
                  value={reflection}
                  onChange={setReflection}
                  placeholder="Write down your thoughts, achievements, or what you learned today... (Markdown shortcuts supported)"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('scholar_reflection_draft');
              localStorage.removeItem('scholar_rating_draft');
              localStorage.removeItem('scholar_mood_draft');
              localStorage.removeItem('scholar_mood_score_draft');
              onSave(today.dateString, rating, reflection, mood);
              onNavigateToStats();
            }}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0"
          >
            <span>Save & Rest</span>
            <ArrowRight size={20} />
          </button>
          </div>
        </div>
      </motion.div>
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
      {showEfficiencyDetails && (
        <EfficiencyDetailsModal
          effectiveMinutes={dailyStats.effectiveMinutes}
          totalDistractions={dailyStats.totalDistractions}
          defaultTargetHours={defaultTargetHours}
          customTargetHours={customTargetHours}
          onUpdateCustomTargetHours={setCustomTargetHours}
          config={state.efficiencyRatingConfig || {}}
          onUpdateConfig={(newConfig) => {
            onUpdateState?.({
              efficiencyRatingConfig: {
                ...(state.efficiencyRatingConfig || {}),
                ...newConfig
              }
            });
          }}
          onApplyRating={(calcRating) => {
            setRating(calcRating);
            setIsCalculating(true);
            playSound('calculate', 0.4);
            setTimeout(() => setIsCalculating(false), 600);
          }}
          onClose={() => setShowEfficiencyDetails(false)}
        />
      )}
      {createPortal(
        modalContent, 
        document.body
      )}
    </>
  );
};

const StatCard: React.FC<{ icon: any, label: string, value: string | number, color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-slate-800/50 p-2.5 sm:p-3 rounded-xl border border-slate-700 flex items-center gap-2.5 min-w-0">
    <div className={cn("p-1.5 rounded-lg bg-slate-900 flex-shrink-0", color)}>
      <Icon size={16} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
      <p className="text-base sm:text-lg font-black text-white leading-none truncate mt-0.5">{value}</p>
    </div>
  </div>
);
