import React, { useState, useMemo, useCallback } from 'react';
import { 
  Star, Edit2, X, BookOpen, ChevronRight,
  Calculator, SlidersHorizontal, Percent, Check, MessageSquare
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { DailyLog, ReflectionTemplate, AppState } from '../../../types';
import { MOOD_OPTIONS } from '../../../constants';
import { cn, getSessionEffectiveMinutes, getSettlementDay } from '../../../lib/utils';
import { getEffectiveTargetFocusMinutes } from '../../../lib/workstationUtils';
import { playSound } from '../../../lib/sound';
import { MoodSelector } from '../../common/MoodSelector';
import { StarRating } from '../../common/StarRating';
import { MarkdownEditor } from '../../common/MarkdownEditor';
import { ReflectionHeaderControls } from '../../common/ReflectionHeaderControls';
import { EfficiencyDetailsModal } from '../EfficiencyDetailsModal';

export interface DailyRecordCardProps {
  date: Date;
  currentLog?: DailyLog;
  state: AppState;
  showReflection?: boolean;
  onSaveDailyLog: (dateStr: string, rating: number, reflection: string, mood?: string, title?: string) => void;
  onUpdateTemplates?: (templates: ReflectionTemplate[]) => void;
  onOpenJournal?: (dateStr?: string) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editReflection, setEditReflection] = useState('');
  const [editMood, setEditMood] = useState<string | undefined>(undefined);
  const [editTitle, setEditTitle] = useState<string>('');
  const [displayModeOverride, setDisplayModeOverride] = useState<'stars' | 'efficiency' | null>(null);

  // Efficiency calculation & details modal state
  const [showEfficiencyDetails, setShowEfficiencyDetails] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [customTargetHours, setCustomTargetHours] = useState<number | null>(null);

  const dateStr = format(date, 'yyyy-MM-dd');

  const startInlineEditing = () => {
    let initialReflection = currentLog?.reflection || '';
    if (!initialReflection.trim() && state.autoLoadTemplateId && state.reflectionTemplates) {
      const tpl = state.reflectionTemplates.find(t => t.id === state.autoLoadTemplateId);
      if (tpl) {
        const tplText =
          state.autoLoadTemplateMode === 'example' && tpl.exampleContent
            ? tpl.exampleContent
            : tpl.content;
        if (tplText) initialReflection = tplText;
      }
    }
    setEditRating(currentLog?.rating || 0);
    setEditReflection(initialReflection);
    setEditMood(currentLog?.mood);
    setEditTitle(currentLog?.title || '');
    setIsEditing(true);
  };

  const handleSaveInline = () => {
    onSaveDailyLog(dateStr, editRating, editReflection, editMood, editTitle);
    setIsEditing(false);
    playSound('success', state.soundVolume, state.soundEnabled);
  };

  const handleOpenJournal = () => {
    if (isEditing) {
      onSaveDailyLog(dateStr, editRating, editReflection, editMood, editTitle);
      setIsEditing(false);
    }
    onOpenJournal?.(dateStr);
  };

  // Compute day stats (Focus time, distractions, target hours) for dateStr
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
          totalDistractions +=
            (Number(s.distractions.internal) || 0) +
            (Number(s.distractions.external) || 0) +
            (Number(s.distractions.unavoidable) || 0);
        }
      }
    });

    const targetFocusStats = getEffectiveTargetFocusMinutes(dateStr, state, effectiveMinutes);
    return {
      effectiveMinutes,
      totalDistractions,
      defaultTargetHours: targetFocusStats.targetHours,
      targetSource: targetFocusStats.source,
      workstationMinutes: targetFocusStats.workstationMinutes,
      workstationIntervalCount: targetFocusStats.intervalCount,
      conversionRate: targetFocusStats.conversionRate,
    };
  }, [state, dateStr]);

  const handleAutoCalculate = useCallback(() => {
    setIsCalculating(true);
    const actualH = dayStats.effectiveMinutes / 60;
    const targetH = customTargetHours !== null ? customTargetHours : dayStats.defaultTargetHours;
    const maxDist = state.efficiencyRatingConfig?.maxDistractionsPerHour ?? 10;
    const compW = (state.efficiencyRatingConfig?.completionRateWeight ?? 70) / 100;
    const focusW = (state.efficiencyRatingConfig?.focusQualityWeight ?? 30) / 100;
    const isCapped = state.efficiencyRatingConfig?.capMetrics !== false;

    let calculatedRating = 0;
    if (actualH > 0) {
      const completionRate =
        targetH > 0 ? (isCapped ? Math.min(1.0, actualH / targetH) : actualH / targetH) : 0;
      const distractionRate = dayStats.totalDistractions / actualH;
      const rawFocusQuality = 1.0 - distractionRate / (maxDist > 0 ? maxDist : 10);
      const focusQuality = isCapped ? Math.max(0.0, rawFocusQuality) : rawFocusQuality;
      const efficiency = compW * completionRate + focusW * focusQuality;
      calculatedRating = isCapped ? Math.max(0, Math.min(5, efficiency * 5)) : efficiency * 5;
    }

    setTimeout(() => {
      setEditRating(calculatedRating);
      setIsCalculating(false);
      playSound('calculate', state.soundVolume, state.soundEnabled);
    }, 400);
  }, [dayStats, customTargetHours, state.efficiencyRatingConfig, state.soundVolume, state.soundEnabled]);

  const effectiveDisplayMode =
    displayModeOverride ?? state.efficiencyRatingConfig?.ratingDisplayPreference ?? 'stars';

  const toggleDisplayMode = () => {
    const next = effectiveDisplayMode === 'efficiency' ? 'stars' : 'efficiency';
    setDisplayModeOverride(next);
  };

  const currentRating = currentLog?.rating || 0;

  return (
    <div className="pt-3 border-t border-slate-800/50 space-y-2.5">
      <div className="flex items-center justify-between h-6">
        <div className="flex items-center gap-2">
          <Star className="text-amber-400" size={16} />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Daily Record
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenJournal && (
            <button
              type="button"
              onClick={handleOpenJournal}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider transition-all group"
              title="Open Fullscreen Journal (/journal)"
            >
              <BookOpen size={12} className="group-hover:scale-110 transition-transform" />
              <span>Journal</span>
              <ChevronRight size={12} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {!isEditing ? (
            <button
              type="button"
              onClick={startInlineEditing}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl border border-slate-700/50 hover:border-indigo-500 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
              title="Edit Daily Record"
            >
              <Edit2 size={12} />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700/50 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <X size={12} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveInline}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl border border-indigo-500 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
              >
                <Check size={12} />
                <span>Save</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="space-y-2.5">
          {/* Efficiency & Feelings on the Same Row */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 min-h-[24px]">
            {/* Efficiency Rating */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5">
                Efficiency
              </span>
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
                      <StarRating value={currentRating} readonly={true} size="sm" />
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startInlineEditing}
                    className="text-[10px] text-slate-500 hover:text-indigo-400 italic pr-1 transition-colors"
                  >
                    No rating
                  </button>
                )}
              </div>
            </div>

            {/* Daily Feeling */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Feelings
              </span>
              {currentLog?.mood ? (
                (() => {
                  const moodObj = MOOD_OPTIONS.find(m => m.id === currentLog.mood);
                  if (!moodObj)
                    return <span className="text-[10px] text-slate-600 italic pr-1 uppercase">None</span>;
                  const Icon = moodObj.icon;
                  return (
                    <div
                      onClick={startInlineEditing}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-0.5 rounded-md border cursor-pointer hover:opacity-90 transition-opacity',
                        moodObj.bg,
                        moodObj.border,
                        moodObj.color
                      )}
                    >
                      <Icon size={10} />
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {moodObj.label}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <button
                  type="button"
                  onClick={startInlineEditing}
                  className="text-[10px] text-slate-600 hover:text-indigo-400 italic pr-1 uppercase transition-colors"
                >
                  None
                </button>
              )}
            </div>
          </div>

          {showReflection && (
            <div
              onClick={startInlineEditing}
              className="text-sm text-slate-300 leading-relaxed pt-2.5 border-t border-slate-800/50 cursor-pointer group rounded-xl hover:bg-slate-800/30 px-2 pb-1 -mx-2 transition-colors h-[84px] max-h-[84px] overflow-y-auto custom-scrollbar"
              title="Click to edit Daily Reflection"
            >
              {currentLog?.title?.trim() && (
                <div className="text-xs font-bold text-slate-200 mb-1">
                  {currentLog.title}
                </div>
              )}
              {currentLog?.reflection ? (
                <div className="prose prose-invert prose-sm max-w-none text-slate-200 prose-p:text-slate-200 prose-p:my-1 prose-headings:text-slate-100 prose-headings:my-1 prose-headings:text-xs prose-strong:text-slate-100 prose-li:text-slate-200 prose-li:my-0.5 prose-ol:text-slate-200 prose-ol:my-1 prose-ul:text-slate-200 prose-ul:my-1 marker:text-slate-200 marker:font-bold text-xs">
                  <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {currentLog.reflection}
                  </Markdown>
                </div>
              ) : (
                <p className="italic pr-1 text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
                  The day&apos;s reflections are yet to be chronicled. Click to write...
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            {/* Efficiency Rating Editor Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5">
                  Efficiency
                </span>
                <button
                  type="button"
                  onClick={handleAutoCalculate}
                  disabled={isCalculating}
                  className={cn(
                    'px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all active:scale-95',
                    isCalculating && 'opacity-75 cursor-wait'
                  )}
                  title="Auto-calculate rating from focus & distraction metrics"
                >
                  <Calculator size={11} className={cn('text-indigo-400', isCalculating && 'animate-spin')} />
                  <span>Calculate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEfficiencyDetails(true)}
                  className="p-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                  title="Formula details & parameters"
                >
                  <SlidersHorizontal size={11} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {effectiveDisplayMode === 'efficiency' ? (
                  <button
                    type="button"
                    onClick={toggleDisplayMode}
                    className="flex items-center gap-1 text-xs font-mono font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                    title="Click to switch to Star Rating"
                  >
                    <Percent size={10} />
                    <span>
                      {editRating > 0
                        ? `${((editRating / 5) * 100).toFixed(1).replace(/\.0$/, '')}%`
                        : '0%'}
                    </span>
                  </button>
                ) : (
                  <StarRating value={editRating} onChange={setEditRating} size="sm" />
                )}
              </div>
            </div>

            {/* Feelings Editor Row */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Feelings
              </span>
              <MoodSelector
                value={editMood}
                onChange={setEditMood}
                enabledMoods={state.enabledMoods}
                variant="chips"
              />
            </div>
          </div>

          {/* Daily Reflection Editor */}
          {showReflection && (
            <div className="space-y-2.5 pt-3 border-t border-slate-800/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare size={14} className="text-sky-400 shrink-0" />
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder={format(date, 'MMM dd')}
                      className="w-full bg-transparent text-xs font-bold text-slate-200 placeholder:text-slate-300 placeholder:font-bold outline-none hover:bg-slate-800/40 focus:bg-slate-800/60 px-2 py-0.5 rounded-md border border-transparent focus:border-indigo-500/40 transition-all truncate"
                      title="Journal Title (Click to customize)"
                    />
                    {editTitle && (
                      <button
                        type="button"
                        onClick={() => setEditTitle('')}
                        className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors shrink-0"
                        title="Reset to default date title"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <ReflectionHeaderControls
                  reflection={editReflection}
                  onSelectTemplate={setEditReflection}
                  templates={state.reflectionTemplates}
                  onUpdateTemplates={onUpdateTemplates}
                  autoLoadTemplateId={state.autoLoadTemplateId}
                  autoLoadTemplateMode={state.autoLoadTemplateMode}
                  onSetAutoLoadTemplate={(templateId, mode) => {
                    onUpdateState?.({
                      autoLoadTemplateId: templateId,
                      autoLoadTemplateMode: mode || 'empty',
                    });
                  }}
                  onOpenImmersive={onOpenJournal ? handleOpenJournal : undefined}
                  showCopy={true}
                  showImportExport={true}
                  onImportReflection={setEditReflection}
                  exportFileName={`reflection-${dateStr}.md`}
                />
              </div>

              <MarkdownEditor
                value={editReflection}
                onChange={setEditReflection}
                placeholder={`Write your reflection for ${dateStr}...`}
                minHeight="200px"
              />
            </div>
          )}
        </div>
      )}

      {showEfficiencyDetails && (
        <EfficiencyDetailsModal
          effectiveMinutes={dayStats.effectiveMinutes}
          totalDistractions={dayStats.totalDistractions}
          defaultTargetHours={dayStats.defaultTargetHours}
          customTargetHours={customTargetHours}
          onUpdateCustomTargetHours={setCustomTargetHours}
          config={state.efficiencyRatingConfig || {}}
          targetSource={dayStats.targetSource}
          workstationPresenceMinutes={dayStats.workstationMinutes}
          workstationIntervalCount={dayStats.workstationIntervalCount}
          _conversionRate={dayStats.conversionRate}
          onUpdateConfig={newConfig => {
            onUpdateState?.({
              efficiencyRatingConfig: {
                ...(state.efficiencyRatingConfig || {}),
                ...newConfig,
              },
            });
          }}
          onApplyRating={calcRating => {
            setEditRating(calcRating);
            setIsCalculating(true);
            playSound('calculate', state.soundVolume, state.soundEnabled);
            setTimeout(() => setIsCalculating(false), 600);
          }}
          onClose={() => setShowEfficiencyDetails(false)}
          state={state}
          onUpdateState={onUpdateState}
        />
      )}
    </div>
  );
};
