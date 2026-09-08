import { format, parseISO, isValid, subDays, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { AppState, DailyLog, EfficiencyRatingConfig, StudySession } from '../types';
import { getSettlementDay, getSessionEffectiveMinutes } from './utils';
import { getEffectiveTargetFocusMinutes } from './workstationUtils';

export interface RecalculationProgress {
  current: number;
  total: number;
  currentDate: string;
}

export interface RecalculateResult {
  updatedLogs: Record<string, DailyLog>;
  updatedCount: number;
  datesProcessed: string[];
}

/**
 * Calculates raw and clamped efficiency rating for given inputs.
 */
export function calculateEfficiencyValue(
  effectiveMinutes: number,
  totalDistractions: number,
  targetHours: number,
  config: EfficiencyRatingConfig
) {
  const actualH = effectiveMinutes / 60;
  if (actualH <= 0) {
    return {
      actualHours: 0,
      completionRate: 0,
      distractionsPerHour: 0,
      focusQuality: 0,
      efficiency: 0,
      calculatedStars: 0,
    };
  }

  const isCapped = config.capMetrics !== false;
  const completionRate = targetHours > 0
    ? (isCapped ? Math.min(1.0, actualH / targetHours) : (actualH / targetHours))
    : 0;
  const distractionsPerHour = totalDistractions / actualH;
  const maxDist = config.maxDistractionsPerHour ?? 10;
  const rawFocusQuality = 1.0 - (distractionsPerHour / (maxDist > 0 ? maxDist : 10));
  const focusQuality = isCapped ? Math.max(0, rawFocusQuality) : rawFocusQuality;
  const compW = (config.completionRateWeight ?? 70) / 100;
  const focusW = (config.focusQualityWeight ?? 30) / 100;
  const efficiency = (compW * completionRate) + (focusW * focusQuality);
  const calculatedStars = isCapped
    ? Math.min(5, Math.max(0, efficiency * 5))
    : (efficiency * 5);

  return {
    actualHours: actualH,
    completionRate,
    distractionsPerHour,
    focusQuality,
    efficiency,
    calculatedStars,
  };
}

/**
 * Scans state history and logs to find all dates with activity and the recorded date range bounds.
 */
export function getRecordedDateRangeInfo(state: AppState): {
  earliestDate: string;
  latestDate: string;
  allRecordedDates: string[];
} {
  const dateSet = new Set<string>();
  const todayStr = getSettlementDay(new Date(), state.timeSettings);
  dateSet.add(todayStr);

  // Collect from study sessions
  if (Array.isArray(state.history)) {
    state.history.forEach((s) => {
      if (s?.timestamp) {
        try {
          const dKey = getSettlementDay(new Date(s.timestamp), state.timeSettings);
          if (dKey) dateSet.add(dKey);
        } catch {
          // ignore invalid timestamp
        }
      }
    });
  }

  // Collect from daily logs
  if (state.dailyLogs) {
    Object.keys(state.dailyLogs).forEach((dKey) => {
      if (dKey && /^\d{4}-\d{2}-\d{2}$/.test(dKey)) {
        dateSet.add(dKey);
      }
    });
  }

  // Collect from workstation logs
  if (state.workstationLogs) {
    Object.keys(state.workstationLogs).forEach((dKey) => {
      if (dKey && /^\d{4}-\d{2}-\d{2}$/.test(dKey)) {
        dateSet.add(dKey);
      }
    });
  }

  const sortedDates = Array.from(dateSet).sort();
  const earliestDate = sortedDates[0] || todayStr;
  const latestDate = sortedDates[sortedDates.length - 1] || todayStr;

  return {
    earliestDate,
    latestDate,
    allRecordedDates: sortedDates,
  };
}

/**
 * Filter recorded dates that fall within [startDateStr, endDateStr].
 */
export function filterDatesInRange(
  allDates: string[],
  startDateStr: string,
  endDateStr: string
): string[] {
  const start = startOfDay(parseISO(startDateStr));
  const end = endOfDay(parseISO(endDateStr));

  if (!isValid(start) || !isValid(end)) return allDates;

  return allDates.filter((dateStr) => {
    try {
      const parsed = parseISO(dateStr);
      if (!isValid(parsed)) return false;
      return isWithinInterval(parsed, { start, end });
    } catch {
      return false;
    }
  });
}

/**
 * Recalculates historical daily efficiency ratings for all matching dates within [startDateStr, endDateStr].
 */
export function recalculateEfficiencyHistory(
  state: AppState,
  startDateStr: string,
  endDateStr: string,
  newConfig: EfficiencyRatingConfig
): RecalculateResult {
  const rangeInfo = getRecordedDateRangeInfo(state);
  const targetDates = filterDatesInRange(rangeInfo.allRecordedDates, startDateStr, endDateStr);

  // Group sessions by settlement date
  const sessionsByDate: Record<string, StudySession[]> = {};
  if (Array.isArray(state.history)) {
    state.history.forEach((s) => {
      if (!s?.timestamp) return;
      try {
        const dKey = getSettlementDay(new Date(s.timestamp), state.timeSettings);
        if (!sessionsByDate[dKey]) sessionsByDate[dKey] = [];
        sessionsByDate[dKey].push(s);
      } catch {
        // ignore
      }
    });
  }

  const updatedLogs: Record<string, DailyLog> = { ...(state.dailyLogs || {}) };
  const datesProcessed: string[] = [];

  const tempState: AppState = {
    ...state,
    efficiencyRatingConfig: newConfig,
  };

  for (const dateStr of targetDates) {
    const sessions = sessionsByDate[dateStr] || [];
    const existingLog = updatedLogs[dateStr];

    // Compute effective minutes and distractions
    let effectiveMinutes = 0;
    let totalDistractions = 0;

    sessions.forEach((s) => {
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

    // Determine target focus hours using new targetTimeMode from newConfig
    const targetFocusStats = getEffectiveTargetFocusMinutes(dateStr, tempState, effectiveMinutes);
    const targetHours = targetFocusStats.targetHours;

    const { calculatedStars } = calculateEfficiencyValue(
      effectiveMinutes,
      totalDistractions,
      targetHours,
      newConfig
    );

    // Update log
    updatedLogs[dateStr] = {
      ...(existingLog || { reflection: '' }),
      rating: calculatedStars,
    };

    datesProcessed.push(dateStr);
  }

  return {
    updatedLogs,
    updatedCount: datesProcessed.length,
    datesProcessed,
  };
}
