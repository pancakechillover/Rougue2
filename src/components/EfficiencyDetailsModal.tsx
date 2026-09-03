import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calculator, 
  Star, 
  Sparkles, 
  Percent, 
  Check, 
  RotateCcw,
  Sliders,
  Target,
  Minus,
  Plus,
  Table
} from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { EfficiencyRatingConfig } from '../types';

interface EfficiencyDetailsModalProps {
  effectiveMinutes: number;
  totalDistractions: number;
  defaultTargetHours: number;
  customTargetHours: number | null;
  onUpdateCustomTargetHours: (hours: number | null) => void;
  config: EfficiencyRatingConfig;
  onUpdateConfig: (config: EfficiencyRatingConfig) => void;
  onApplyRating: (calculatedStars: number) => void;
  onClose: () => void;
}

export const EfficiencyDetailsModal: React.FC<EfficiencyDetailsModalProps> = ({
  effectiveMinutes,
  totalDistractions,
  defaultTargetHours,
  customTargetHours,
  onUpdateCustomTargetHours,
  config,
  onUpdateConfig,
  onApplyRating,
  onClose
}) => {
  // Local state for interactive parameter editing
  const [localTargetHours, setLocalTargetHours] = useState<number>(
    customTargetHours !== null ? customTargetHours : defaultTargetHours
  );
  const [maxDistractions, setMaxDistractions] = useState<number>(
    config.maxDistractionsPerHour ?? 10
  );
  const [completionWeight, setCompletionWeight] = useState<number>(
    config.completionRateWeight ?? 70
  );
  const [autoCalcOnOpen, setAutoCalcOnOpen] = useState<boolean>(
    config.autoCalculateOnOpen ?? true
  );
  const [ratingDisplay, setRatingDisplay] = useState<'efficiency' | 'star'>(
    config.ratingDisplayPreference ?? 'star'
  );

  // Focus quality weight is complementary to completion weight
  const focusWeight = Math.max(0, 100 - completionWeight);

  // Live calculation based on current parameters
  const actualHours = effectiveMinutes / 60;
  const completionRate = (localTargetHours > 0 && actualHours > 0)
    ? Math.min(actualHours / localTargetHours, 1.0) 
    : 0;
  const distractionsPerHour = actualHours > 0 
    ? totalDistractions / actualHours 
    : 0;
  const focusQuality = actualHours > 0
    ? Math.max(0, 1.0 - (distractionsPerHour / (maxDistractions > 0 ? maxDistractions : 10)))
    : 0;

  const wComp = completionWeight / 100;
  const wFocus = focusWeight / 100;
  const efficiency = actualHours > 0 ? (wComp * completionRate) + (wFocus * focusQuality) : 0;
  const rawStars = efficiency * 5;
  const calculatedStars = Math.min(5, Math.max(0, rawStars));
  const calculatedEfficiency = Math.round(efficiency * 1000) / 10;
  const displayStarIcon = Math.round(calculatedStars * 2) / 2;

  // Rate penalty per distraction string (e.g. "10%" when max=10)
  const penaltyPerDistractionPercent = maxDistractions > 0 
    ? (100 / maxDistractions).toFixed(1).replace(/\.0$/, '') 
    : '10';

  const handleApply = () => {
    // Save target hours (for today only)
    if (Math.abs(localTargetHours - defaultTargetHours) < 0.01) {
      onUpdateCustomTargetHours(null);
    } else {
      onUpdateCustomTargetHours(localTargetHours);
    }

    // Save global configuration
    onUpdateConfig({
      autoCalculateOnOpen: autoCalcOnOpen,
      maxDistractionsPerHour: maxDistractions,
      completionRateWeight: completionWeight,
      focusQualityWeight: focusWeight,
      ratingDisplayPreference: ratingDisplay
    });

    // Apply calculated rating
    onApplyRating(calculatedStars);
    onClose();
  };

  const handleTargetHoursInput = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) {
      setLocalTargetHours(0.5);
    } else {
      const rounded = Math.round(num * 2) / 2;
      setLocalTargetHours(Math.max(0.5, Math.min(24, rounded)));
    }
  };

  const handleMaxDistractionsInput = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setMaxDistractions(1);
    } else {
      setMaxDistractions(Math.max(1, Math.min(50, num)));
    }
  };

  const handleCompletionWeightInput = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setCompletionWeight(50);
    } else {
      setCompletionWeight(Math.max(0, Math.min(100, num)));
    }
  };

  const handleFocusWeightInput = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setCompletionWeight(50);
    } else {
      const clampedFocus = Math.max(0, Math.min(100, num));
      setCompletionWeight(100 - clampedFocus);
    }
  };

  // High-performance memoized reference matrix data
  const matrixData = useMemo(() => {
    const colRatios = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const rowRatios = [0.25, 0.5, 0.75, 1.0];

    const headers = colRatios.map((step, idx) => {
      const distVal = maxDistractions * step;
      const distFormatted = (Math.round(distVal * 10) / 10).toFixed(1).replace(/\.0$/, '');
      const label = idx === 0 
        ? '0 / hr' 
        : idx === 5 
          ? `≥ ${distFormatted} / hr` 
          : `${distFormatted} / hr`;
      return { label };
    });

    const rows = rowRatios.map((rowRatio, rowIdx) => {
      const rowHours = localTargetHours * rowRatio;
      const rowHoursFormatted = (Math.round(rowHours * 10) / 10).toFixed(1).replace(/\.0$/, '');
      const rowLabel = rowIdx === 3 
        ? `≥ ${rowHoursFormatted}h` 
        : `${rowHoursFormatted}h`;

      const comp = localTargetHours > 0 ? Math.min(rowHours / localTargetHours, 1.0) : 0;

      const cells = colRatios.map((colRatio) => {
        const colDist = maxDistractions * colRatio;
        const focus = Math.max(0, 1.0 - (colDist / (maxDistractions > 0 ? maxDistractions : 10)));
        const eff = comp * (wComp + wFocus * focus);
        const effPct = Math.round(eff * 1000) / 10;
        const effStr = effPct.toString().replace(/\.0$/, '');
        const stars = Math.min(5, Math.max(0, Math.round(eff * 5 * 2) / 2));
        const starStr = `${stars.toFixed(1).replace(/\.0$/, '')}★`;

        return {
          effStr,
          starStr
        };
      });

      return { rowLabel, cells };
    });

    return { headers, rows };
  }, [localTargetHours, maxDistractions, wComp, wFocus]);

  return createPortal(
    <AnimatePresence>
      <div 
        id="efficiency-details-overlay" 
        className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-4xl lg:max-w-5xl max-h-[94vh] shadow-2xl overflow-hidden flex flex-col relative z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Calculator size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Efficiency Rating Formula
                </h2>
                <p className="text-xs text-slate-400">
                  Dynamic calculation model & parameter configuration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 bg-slate-950/80 border border-indigo-500/20 shadow-inner px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                  <Sparkles size={12} /> Result
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-white font-mono">
                    {ratingDisplay === 'efficiency' 
                      ? (actualHours > 0 ? `${calculatedEfficiency}%` : 'None') 
                      : (actualHours > 0 ? calculatedStars.toFixed(1) : 'None')}
                  </span>
                  {ratingDisplay === 'star' && actualHours > 0 && (
                    <span className="text-sm text-amber-400 font-bold">★</span>
                  )}
                </div>
              </div>
              <button
                id="close-efficiency-details-button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar text-slate-200">
            
            {/* Formula Breakdown Card */}
            <div className="bg-slate-950/50 rounded-2xl border border-slate-800/80 p-4 sm:p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Percent size={14} className="text-indigo-400" /> Active Mathematical Formula
              </h3>
              
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="text-slate-300">
                    <span className="text-indigo-400 font-bold">Completion Rate</span> = min(Actual / Target, 100%)
                  </div>
                  <div className="text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50 whitespace-nowrap">
                    = min({actualHours.toFixed(1)}h / {localTargetHours.toFixed(1)}h) = <span className="text-indigo-400 font-bold">{Math.round(completionRate * 100)}%</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="text-slate-300">
                    <span className="text-sky-400 font-bold">Focus Degree</span> = max(0, 100% - Distractions/hr × {penaltyPerDistractionPercent}%)
                  </div>
                  <div className="text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50 whitespace-nowrap">
                    = max(0, 100% - {distractionsPerHour.toFixed(1)} × {penaltyPerDistractionPercent}%) = <span className="text-sky-400 font-bold">{Math.round(focusQuality * 100)}%</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="text-slate-300">
                    <span className="text-emerald-400 font-bold">Efficiency</span> = (<span className="text-indigo-400 font-bold">Comp</span> × {completionWeight}%) + (<span className="text-sky-400 font-bold">Focus</span> × {focusWeight}%)
                  </div>
                  <div className="text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50 whitespace-nowrap">
                    = ({Math.round(completionRate * 100)}% × {completionWeight}%) + ({Math.round(focusQuality * 100)}% × {focusWeight}%) = <span className="text-emerald-400 font-bold">{calculatedEfficiency}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Data & Step-by-Step Breakdown */}
            <div className="bg-slate-950/50 rounded-2xl border border-slate-800/80 p-4 sm:p-5 space-y-3.5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Target size={14} className="text-emerald-400" /> Today's Calculation Metrics
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Actual Focus</span>
                  <span className="text-sm font-bold text-indigo-300 mt-1">
                    {formatDuration(effectiveMinutes)}
                  </span>
                  <span className="text-[10px] text-slate-400">({actualHours.toFixed(2)}h)</span>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Focus</span>
                  <span className="text-sm font-bold text-amber-300 mt-1">
                    {localTargetHours.toFixed(1)}h
                  </span>
                  <span className="text-[10px] text-slate-400">({Math.round(localTargetHours * 60)}m)</span>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Completion</span>
                  <span className="text-sm font-bold text-emerald-300 mt-1">
                    {(completionRate * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400">Cap at 100%</span>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Focus Degree</span>
                  <span className="text-sm font-bold text-sky-300 mt-1">
                    {(focusQuality * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400">{distractionsPerHour.toFixed(1)} dist/h</span>
                </div>
              </div>

              {/* Step calculation narrative */}
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Distractions Today:</span>
                  <span className="font-semibold text-slate-200">{totalDistractions} interruptions</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Efficiency Calculation:</span>
                  <span className="font-semibold text-slate-200">
                    {(completionRate * 100).toFixed(1)}% × ({completionWeight}% + {focusWeight}% × {(focusQuality * 100).toFixed(1)}%) = <strong className="text-indigo-400">{(efficiency * 100).toFixed(1)}%</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Adjustable Parameters (自由填写与左右精准步进) */}
            <div className="bg-slate-950/50 rounded-2xl border border-slate-800/80 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={14} className="text-amber-400" /> Adjustable Parameters
                </h3>
              </div>

              {/* 0. Rating Display Preference Toggle */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <span className="text-xs font-semibold text-slate-200">
                  Global Display Format
                </span>
                <div className="flex bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setRatingDisplay('efficiency')}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors",
                      ratingDisplay === 'efficiency' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Efficiency %
                  </button>
                  <button
                    onClick={() => setRatingDisplay('star')}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors",
                      ratingDisplay === 'star' ? "bg-amber-600 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Star Rating
                  </button>
                </div>
              </div>

              {/* 1 & 2. Targets & Distractions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Target Focus Time (Today only) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Target Focus Time <span className="text-slate-500 font-normal tracking-normal">(Today)</span>
                    </span>
                    <button
                      onClick={() => setLocalTargetHours(defaultTargetHours)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                      title="Reset to Sanctum Today Goal"
                    >
                      <RotateCcw size={10} /> {defaultTargetHours.toFixed(1)}h
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLocalTargetHours(prev => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                      className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                      title="Decrease by 0.5h"
                    >
                      <Minus size={14} />
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        value={localTargetHours}
                        onChange={(e) => handleTargetHoursInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-sm font-bold text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        hours
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalTargetHours(prev => Math.min(24, Number((prev + 0.5).toFixed(1))))}
                      className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                      title="Increase by 0.5h"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Acceptable Distraction Rate (Global) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Max Distractions <span className="text-slate-500 font-normal tracking-normal">(/hr)</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      -{penaltyPerDistractionPercent}% per dist
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMaxDistractions(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                      title="Decrease by 1"
                    >
                      <Minus size={14} />
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="50"
                        value={maxDistractions}
                        onChange={(e) => handleMaxDistractionsInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-sm font-bold text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        / hr
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaxDistractions(prev => Math.min(50, prev + 1))}
                      className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                      title="Increase by 1"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Weight Preferences (Global - with Left/Right Steppers ±10%) */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Formula Weights <span className="text-slate-500 font-normal tracking-normal">(Global)</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Total: 100%
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Completion Rate Weight */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-indigo-400 block">
                      Completion Rate Weight
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCompletionWeight(prev => Math.max(0, prev - 10))}
                        className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-indigo-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                        title="Decrease by 10%"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="10"
                          min="0"
                          max="100"
                          value={completionWeight}
                          onChange={(e) => handleCompletionWeightInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-sm font-bold text-indigo-300 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompletionWeight(prev => Math.min(100, prev + 10))}
                        className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-indigo-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                        title="Increase by 10%"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Focus Degree Weight */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-sky-400 block">
                      Focus Degree Weight
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCompletionWeight(prev => Math.min(100, prev + 10))}
                        className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-sky-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                        title="Decrease focus weight by 10%"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="10"
                          min="0"
                          max="100"
                          value={focusWeight}
                          onChange={(e) => handleFocusWeightInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-sm font-bold text-sky-300 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompletionWeight(prev => Math.max(0, prev - 10))}
                        className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-sky-300 rounded-xl border border-slate-700/60 font-bold transition-colors shrink-0"
                        title="Increase focus weight by 10%"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Auto Calculate on Open Toggle */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Auto-Calculate on Open
                </span>
                <button
                  type="button"
                  onClick={() => setAutoCalcOnOpen(!autoCalcOnOpen)}
                  className={cn(
                    "w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0",
                    autoCalcOnOpen ? "bg-indigo-600" : "bg-slate-800"
                  )}
                >
                  <div
                    className={cn(
                      "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
                      autoCalcOnOpen ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

            </div>

            {/* Dynamic Rating Reference Matrix (动态效率与星级对照表 - 高性能宽屏自适应) */}
            <div className="bg-slate-950/50 rounded-2xl border border-slate-800/80 p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Table size={14} className="text-indigo-400" /> Dynamic Rating Reference Matrix
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Format: <span className="text-indigo-300 font-bold">Efficiency %</span> / <span className="text-amber-400 font-bold">Star Rating</span>
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 custom-scrollbar">
                <table className="w-full text-left text-xs font-mono border-collapse min-w-[560px]">
                  <thead>
                    <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="p-3 font-bold text-slate-300 border-r border-slate-800/80 whitespace-nowrap bg-slate-900 min-w-[110px]">
                        Actual Focus (A)
                      </th>
                      {matrixData.headers.map((h, idx) => (
                        <th key={idx} className="p-3 font-bold text-center border-r border-slate-800/60 last:border-r-0 whitespace-nowrap">
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {matrixData.rows.map((row, rowIdx) => (
                      <tr 
                        key={rowIdx} 
                        className={cn(
                          "hover:bg-slate-900/40 transition-colors",
                          rowIdx % 2 === 1 ? "bg-slate-900/20" : "bg-transparent"
                        )}
                      >
                        <td className="p-3 font-bold text-slate-300 border-r border-slate-800/80 whitespace-nowrap bg-slate-900/60">
                          {row.rowLabel}
                        </td>
                        {row.cells.map((cell, colIdx) => (
                          <td 
                            key={colIdx} 
                            className="p-3 text-center border-r border-slate-800/60 last:border-r-0 whitespace-nowrap text-slate-300"
                          >
                            <span className="font-semibold text-slate-200">{cell.effStr}%</span>
                            <span className="text-slate-500 mx-1">/</span>
                            <span className="font-bold text-amber-400">{cell.starStr}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-end gap-2.5 bg-slate-900/90 flex-shrink-0">
            <button
              id="cancel-efficiency-details-button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              id="apply-efficiency-details-button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Check size={14} />
              <span>
                Apply & Calculate ({ratingDisplay === 'efficiency' ? `${calculatedEfficiency}%` : `${calculatedStars.toFixed(1)}★`})
              </span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
