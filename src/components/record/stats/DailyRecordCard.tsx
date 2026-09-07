import React, { useState, useMemo } from 'react';
import { 
  Star, Edit2, Save, X, BookOpen, ChevronRight, 
  Maximize2, Calculator, SlidersHorizontal, Percent 
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { DailyLog, ReflectionTemplate, AppState } from '../../../types';
import { MOOD_OPTIONS } from '../../../constants';
import { cn, getSessionEffectiveMinutes, getSettlementDay } from '../../../lib/utils';
import { getEffectiveTargetFocusMinutes } from '../../../lib/workstationUtils';
import { playSound } from '../../../lib/sound';
import { MoodSelector } from '../../common/MoodSelector';
import { ReflectionHeaderControls } from '../../common/ReflectionHeaderControls';
import { StarRating } from '../../common/StarRating';
import { MarkdownEditor } from '../../common/MarkdownEditor';
import { EfficiencyDetailsModal } from '../EfficiencyDetailsModal';
import { ImmersiveReflectionModal } from '../../journal/ImmersiveReflectionModal';
import { format } from 'date-fns';

export interface DailyRecordCardProps {
  date: Date;
  currentLog?: DailyLog;
  state: AppState;
  showReflection?: boolean;
  onSaveDailyLog: (dateStr: string, rating: number, reflection: string, mood?: string) => void;
  onUpdateTemplates?: (templates: ReflectionTemplate[]) => void;
  onOpenJournal?: () => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
}

export const DailyRecordCard: React.FC<DailyRecordCardProps> = ({
  date,
  currentLog,
  state,
  showReflection = true,
  onSaveDailyLog,
  onUpdateTemplates,
  onOpenJournal,
  onUpdateState,
}) => {
  const [isEditingLog, setIsEditingLog] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editReflection, setEditReflection] = useState('');
  const [editMood, setEditMood] = useState<string | undefined>(undefined);
  const [isFullscreenEdit, setIsFullscreenEdit] = useState(false);
  const [showEfficiencyDetails, setShowEfficiencyDetails] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [customTargetHours, setCustomTargetHours] = useState<number | null>(null);
  const [displayModeOverride, setDisplayModeOverride] = useState<'stars' | 'efficiency' | null>(null);

  const dateStr = format(date, 'yyyy-MM-dd');

  // Compute daily metrics for efficiency calculation
  const dayStats = useMemo(() => {
    const sessions = (state.history || []).filter(s => {
      if (!s.timestamp) return false;
      return getSettlementDay(new Date(s.timestamp), state.timeSettings) === dateStr;
    });

    let effectiveMinutes = 0;
    let totalDistractions = 0;

    sessions.forEach(s => {
      effectiveMinutes += getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks);
      if (s.distractions) {
        if (typeof s.distractions === 'number') {
          totalDistractions += isNaN(s.distractions) ? 0 : s.distractions;
        } else if (typeof s.distractions === 'object') {
          totalDistractions += (Number(s.distractions.internal) || 0) + (Number(s.distractions.external) || 0) + (Number(s.distractions.unavoidable) || 0);
        }
      }
    });

    const targetFocusStats = getEffectiveTargetFocusMinutes(dateStr, state, effectiveMinutes);
    const defaultTargetHours = targetFocusStats.targetHours;

    return {
      effectiveMinutes,
      totalDistractions,
      defaultTargetHours,
      targetSource: targetFocusStats.source,
      workstationMinutes: targetFocusStats.workstationMinutes,
      workstationIntervalCount: targetFocusStats.intervalCount,
      conversionRate: targetFocusStats.conversionRate,
    };
  }, [state.history, state.workstationLogs, state.activeWorkstationSession, state.includeRestTimeInTasks, state.useSameDailyProgressGoalEveryDay, state.dailyProgressGoal, state.dailyProgressGoalConfig, state.standardSessionMinutes, state.standardRestMinutes, dateStr, state.timeSettings]);

  // Auto-calculate rating formula
  const handleAutoCalculate = () => {
    setIsCalculating(true);
    const actualH = dayStats.effectiveMinutes / 60;
    const targetH = customTargetHours !== null ? customTargetHours : dayStats.defaultTargetHours;
    const maxDist = state.efficiencyRatingConfig?.maxDistractionsPerHour ?? 10;
    const compW = (state.efficiencyRatingConfig?.completionRateWeight ?? 70) / 100;
    const focusW = (state.efficiencyRatingConfig?.focusQualityWeight ?? 30) / 100;

    let calculatedRating = 0;
    if (actualH > 0) {
      const completionRate = targetH > 0 ? Math.min(1.0, actualH / targetH) : 0;
      const distractionRate = dayStats.totalDistractions / actualH;
      const focusQuality = Math.max(0.0, 1.0 - (distractionRate / (maxDist > 0 ? maxDist : 10)));
      const efficiency = (compW * completionRate) + (focusW * focusQuality);
      calculatedRating = Math.max(0, Math.min(5, efficiency * 5));
    }

    setTimeout(() => {
      setEditRating(calculatedRating);
      if (!isEditingLog) {
        onSaveDailyLog(dateStr, calculatedRating, currentLog?.reflection || '', currentLog?.mood);
      }
      setIsCalculating(false);
      playSound('calculate', state.soundVolume, state.soundEnabled);
    }, 450);
  };

  const startEditing = () => {
    setEditRating(currentLog?.rating || 0);
    setEditReflection(currentLog?.reflection || '');
    setEditMood(currentLog?.mood);
    setIsEditingLog(true);
  };

  const saveLog = () => {
    onSaveDailyLog(dateStr, editRating, editReflection, editMood);
    setIsEditingLog(false);
  };

  const effectiveDisplayMode = displayModeOverride ?? state.efficiencyRatingConfig?.ratingDisplayPreference ?? 'stars';

  const toggleDisplayMode = () => {
    const next = effectiveDisplayMode === 'efficiency' ? 'stars' : 'efficiency';
    setDisplayModeOverride(next);
  };

  const currentRating = isEditingLog ? editRating : (currentLog?.rating || 0);

  return (
    <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="text-amber-400" size={16} />
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Daily Record</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider transition-all group"
              title="Open Dedicated Journal Page"
            >
              <BookOpen size={12} className="group-hover:scale-110 transition-transform" />
              <span>Journal</span>
              <ChevronRight size={12} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {!isEditingLog ? (
            <button 
              onClick={startEditing}
              className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
              title="Edit Record"
            >
              <Edit2 size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <ReflectionHeaderControls
                reflection={editReflection}
                onSelectTemplate={setEditReflection}
                templates={state.reflectionTemplates}
                onUpdateTemplates={onUpdateTemplates}
                onOpenImmersive={() => setIsFullscreenEdit(true)}
                showCopy={true}
                showMetrics={true}
                showImportExport={true}
                onImportReflection={setEditReflection}
                exportFileName={`reflection-${dateStr}.md`}
              />
              <button 
                onClick={saveLog}
                className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                title="Save"
              >
                <Save size={14} />
              </button>
              <button 
                onClick={saveLog}
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Finish and Auto-save"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditingLog ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            {/* Efficiency Edit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5">Efficiency</span>
                  <div className="flex items-center gap-1">
                    <button
                      id="auto-calculate-rating-button"
                      onClick={handleAutoCalculate}
                      disabled={isCalculating}
                      className={cn(
                        "p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-md transition-all active:scale-95",
                        isCalculating && "opacity-80 cursor-wait"
                      )}
                      title="Auto-calculate rating using focus duration & distraction metrics"
                    >
                      <Calculator size={11} className={cn("text-indigo-400", isCalculating && "animate-spin")} />
                    </button>
                    <button
                      id="efficiency-formula-details-button"
                      onClick={() => setShowEfficiencyDetails(true)}
                      className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                      title="View formula details, metrics, and customize parameters"
                    >
                      <SlidersHorizontal size={11} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleDisplayMode}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-400 transition-colors"
                  title="Toggle Stars / Percentage display preference"
                >
                  {effectiveDisplayMode === 'efficiency' ? (
                    <>
                      <Star size={11} className="text-amber-400" />
                      <span>Stars Mode</span>
                    </>
                  ) : (
                    <>
                      <Percent size={11} className="text-indigo-400" />
                      <span>Percent Mode</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center p-2.5 bg-slate-900/80 rounded-xl border border-slate-800/80 min-h-[44px]">
                {effectiveDisplayMode === 'efficiency' ? (
                  <span className={cn(
                    "text-sm font-black font-mono px-3 py-0.5 rounded-md border",
                    editRating > 0 ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-slate-800/50 border-slate-700/50 text-slate-500"
                  )}>
                    {editRating > 0 ? `${((editRating / 5) * 100).toFixed(1).replace(/\.0$/, '')}%` : 'None'}
                  </span>
                ) : (
                  <StarRating
                    value={editRating}
                    onChange={setEditRating}
                    size="sm"
                  />
                )}
              </div>
            </div>
            
            {/* Feelings Edit */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5 mb-1">Feelings</div>
              <MoodSelector
                value={editMood}
                onChange={setEditMood}
                enabledMoods={state.enabledMoods}
                variant="chips"
              />
            </div>
          </div>

          {/* Reflection Edit Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5">Reflection</span>
              <button
                onClick={() => setIsFullscreenEdit(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-400 transition-colors"
                title="Fullscreen Immersive Edit"
              >
                <Maximize2 size={11} />
                <span>Fullscreen</span>
              </button>
            </div>

            <div className="relative min-h-[140px] max-h-[260px] bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 focus-within:border-indigo-500 transition-all flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[100px] text-sm">
                <MarkdownEditor
                  value={editReflection}
                  onChange={setEditReflection}
                  placeholder="Reflect on your day... (Markdown supported)"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            {/* Efficiency Rating Row */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5">Efficiency</span>
              <div className="flex items-center gap-2">
                {currentRating > 0 ? (
                  <div 
                    onClick={toggleDisplayMode}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to toggle between Stars and Percentage display"
                  >
                    {effectiveDisplayMode === 'efficiency' ? (
                      <div className="flex items-center px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-xs font-black font-mono text-indigo-400">
                          {`${((currentRating / 5) * 100).toFixed(1).replace(/\.0$/, '')}%`}
                        </span>
                      </div>
                    ) : (
                      <StarRating
                        value={currentRating}
                        readonly={true}
                        size="sm"
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-600 italic">No rating</span>
                )}
              </div>
            </div>
            
            {/* Daily Feeling Row */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Feelings</span>
              {currentLog?.mood ? (() => {
                const moodObj = MOOD_OPTIONS.find(m => m.id === currentLog.mood);
                if (!moodObj) return <span className="text-[10px] text-slate-600 italic uppercase">None</span>;
                const Icon = moodObj.icon;
                return (
                  <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md border", moodObj.bg, moodObj.border, moodObj.color)}>
                    <Icon size={10} />
                    <span className="text-[9px] font-black uppercase tracking-wider">{moodObj.label}</span>
                  </div>
                );
              })() : (
                <span className="text-[10px] text-slate-600 italic uppercase">None</span>
              )}
            </div>
          </div>

          {showReflection && (
            <div className="text-sm text-slate-300 leading-relaxed pt-3 border-t border-slate-900">
              {currentLog?.reflection ? (
                <div className="prose prose-invert prose-sm max-w-none text-slate-200 prose-p:text-slate-200 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-li:text-slate-200 prose-ol:text-slate-200 prose-ul:text-slate-200 marker:text-slate-200 marker:font-bold">
                  <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{currentLog.reflection}</Markdown>
                </div>
              ) : (
                <p className="italic text-xs text-slate-600">The day's reflections are yet to be chronicled.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen / Immersive Modal */}
      <ImmersiveReflectionModal
        isOpen={isFullscreenEdit}
        onClose={() => setIsFullscreenEdit(false)}
        dateString={format(date, 'MMM d, yyyy')}
        reflection={editReflection}
        setReflection={setEditReflection}
        templates={state.reflectionTemplates}
        onUpdateTemplates={onUpdateTemplates}
      />

      {/* Efficiency Details Modal */}
      {showEfficiencyDetails && (
        <EfficiencyDetailsModal
          effectiveMinutes={dayStats.effectiveMinutes}
          totalDistractions={dayStats.totalDistractions}
          defaultTargetHours={dayStats.defaultTargetHours}
          customTargetHours={customTargetHours}
          onUpdateCustomTargetHours={(hours) => setCustomTargetHours(hours)}
          config={state.efficiencyRatingConfig || {}}
          onUpdateConfig={(newConfig) => onUpdateState?.({ efficiencyRatingConfig: newConfig })}
          onApplyRating={(calculatedStars) => {
            setEditRating(calculatedStars);
            onSaveDailyLog(
              dateStr, 
              calculatedStars, 
              isEditingLog ? editReflection : (currentLog?.reflection || ''), 
              isEditingLog ? editMood : currentLog?.mood
            );
          }}
          onClose={() => setShowEfficiencyDetails(false)}
          targetSource={dayStats.targetSource}
          workstationPresenceMinutes={dayStats.workstationMinutes}
          workstationIntervalCount={dayStats.workstationIntervalCount}
          conversionRate={dayStats.conversionRate}
        />
      )}
    </div>
  );
};
