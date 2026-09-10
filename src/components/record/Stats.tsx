import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  format, subDays, addDays, 
  startOfWeek, endOfWeek,
  startOfDay, endOfDay,
  parseISO, isWithinInterval,
  eachDayOfInterval, isSameDay
} from 'date-fns';
import { StudySession, AppState, Dungeon, MajorDungeon, RewardHistoryItem, ChartLayerSelection } from '../../types';
import { cn, getSessionEffectiveMinutes } from '../../lib/utils';
import { MOOD_OPTIONS } from '../../constants';
import { 
  BarChart2, Share2, LayoutTemplate
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { DailySessionsModal } from './DailySessionsModal';
import { RoutineTracker } from '../journal/RoutineTracker';
import { RoutineCellEditor } from '../journal/RoutineCellEditor';
import { ShareRecordModal } from './ShareRecordModal';
import { ViewSettingsModal } from '../settings/ViewSettingsModal';
import { BulkSleepModal } from '../modals/BulkSleepModal';
import { StatsActivityHeatmap } from './stats/StatsActivityHeatmap';
import { StatsDailySection } from './stats/StatsDailySection';
import { StatsWeeklySection } from './stats/StatsWeeklySection';
import { StatsSleepTrackerSection } from './stats/StatsSleepTrackerSection';
import { SharedPopoverContent } from './stats/SharedPopoverContent';
import { DEFAULT_CHART_LAYERS } from './stats/ChartLayerFilterDropdown';

export interface ShareConfig {
  showDaily: boolean;
  showWeekly: boolean;
  showRoutine: boolean;
  showHeatmap: boolean;
  showReflection: boolean;
  showSleep: boolean;
  aspectRatio: 'auto' | '1:1' | '4:3' | '16:9';
}

interface StatsProps {
  state: AppState;
  saveDailyLog: (date: string, rating: number, reflection: string, mood?: string, title?: string) => void;
  onUpdateState?: (updates: Partial<AppState>) => void;
  updateSession?: (id: string, updates: Partial<StudySession>) => void;
  deleteSession?: (id: string) => void;
  completeSession?: (dungeonId: string | null, duration: number, focusDuration?: number, restDuration?: number, customTimestamp?: number) => void;
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  setShowStartOfDayModal?: (val: string | boolean) => void;
  onOpenJournal?: () => void;
}

const formatDuration = (val: number) => {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val) || val < 0) return '0min';
  const totalMin = Math.round(val);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const formatTimeTick = (val: number) => {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return '0';
  if (val >= 60) {
    const h = val / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
  }
  return `${val}m`;
};

const computeTimeYAxis = (maxMinutes: number, isFixed: boolean, defaultFixedMax: number = 240) => {
  if (isFixed) {
    const targetMax = Math.max(defaultFixedMax, Math.ceil(maxMinutes / 60) * 60);
    const step = targetMax <= 240 ? 60 : 120;
    const ticks: number[] = [];
    for (let t = 0; t <= targetMax; t += step) {
      ticks.push(t);
    }
    return { domain: [0, targetMax] as [number, number], ticks };
  }

  // Dynamic mode: when 0 recorded minutes, fallback to standard reference scale (0, 30m, 1h or 0, 1h, 2h)
  if (maxMinutes <= 0) {
    const fallbackMax = defaultFixedMax === 240 ? 60 : 120;
    const step = defaultFixedMax === 240 ? 30 : 60;
    const ticks: number[] = [];
    for (let t = 0; t <= fallbackMax; t += step) {
      ticks.push(t);
    }
    return { domain: [0, fallbackMax] as [number, number], ticks };
  }
  
  if (maxMinutes <= 30) {
    return { domain: [0, 30] as [number, number], ticks: [0, 15, 30] };
  }
  if (maxMinutes <= 60) {
    return { domain: [0, 60] as [number, number], ticks: [0, 30, 60] };
  }
  if (maxMinutes <= 120) {
    return { domain: [0, 120] as [number, number], ticks: [0, 60, 120] };
  }
  if (maxMinutes <= 240) {
    return { domain: [0, 240] as [number, number], ticks: [0, 60, 120, 180, 240] };
  }
  if (maxMinutes <= 480) {
    const targetMax = Math.ceil(maxMinutes / 120) * 120;
    const ticks: number[] = [];
    for (let t = 0; t <= targetMax; t += 120) {
      ticks.push(t);
    }
    return { domain: [0, targetMax] as [number, number], ticks };
  }
  const targetMax = Math.ceil(maxMinutes / 180) * 180;
  const ticks: number[] = [];
  for (let t = 0; t <= targetMax; t += 180) {
    ticks.push(t);
  }
  return { domain: [0, targetMax] as [number, number], ticks };
};

const getSessionDistractionCount = (distractions: any): number => {
  if (!distractions) return 0;
  if (typeof distractions === 'number') {
    return isNaN(distractions) ? 0 : distractions;
  }
  if (typeof distractions === 'object') {
    const internal = Number(distractions.internal) || 0;
    const external = Number(distractions.external) || 0;
    const unavoidable = Number(distractions.unavoidable) || 0;
    return internal + external + unavoidable;
  }
  return 0;
};

export const Stats = React.memo<StatsProps>(({ state, saveDailyLog, onUpdateState, updateSession, deleteSession, completeSession, dungeons = [], majorDungeons = [], setShowStartOfDayModal, onOpenJournal }) => {
  const history = state.history;
  const dailyLogs = state.dailyLogs || {};
  const [showDailySessionsDate, setShowDailySessionsDate] = useState<Date | null>(null);
  const [showDailySessionsPeriod, setShowDailySessionsPeriod] = useState<string | undefined>();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [shareConfig, setShareConfig] = useState<ShareConfig>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_share_config');
      if (saved) return JSON.parse(saved);
    } catch(e){}
    return {
      showDaily: true,
      showWeekly: true,
      showRoutine: true,
      showHeatmap: true,
      showReflection: true,
      showSleep: true,
      aspectRatio: 'auto'
    };
  });

  useEffect(() => {
    localStorage.setItem('scholar_dungeon_share_config', JSON.stringify(shareConfig));
  }, [shareConfig]);
  const statsContainerRef = useRef<HTMLDivElement>(null);
  
  const viewOpts: NonNullable<AppState['statsViewOpts']> = state.statsViewOpts || {
    showDailyBar: true,
    showDailyDonut: false,
    showWeeklyBar: true,
    showWeeklyDonut: false,
    showRoutineTracker: true,
    showSleepTracker: true,
    showHeatmap: true,
    dailyDonutMode: 'compact' as const,
    weeklyDonutMode: 'time_of_day' as const,
    averageCalculationBase: 'total_days' as const,
    yAxisMaxMode: 'dynamic' as const,
  };
  
  const getInitialPeakDate = () => {
    const ts = state.timeSettings || {
      morning: { start: 8, end: 12 },
      afternoon: { start: 14, end: 18 },
      night: { start: 20, end: 24 }
    };
    
    let now = new Date();
    if (state.timezone) {
      try {
        const str = now.toLocaleString('en-US', { timeZone: state.timezone });
        now = new Date(str);
      } catch (e) {
        console.error("Timezone error:", e);
      }
    }
    
    const hour = now.getHours();
    
    if (ts.night.start > ts.night.end && hour < ts.night.end) {
      return subDays(now, 1);
    } else if (hour < ts.morning.start) {
      return subDays(now, 1);
    }
    return now;
  };

  const [dailyDate, setDailyDate] = useState(getInitialPeakDate());
  const [weeklyDate, setWeeklyDate] = useState(getInitialPeakDate());
  const [weeklyMode, setWeeklyMode] = useState<'calendar' | 'rolling'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_weeklyMode');
      if (saved === 'calendar' || saved === 'rolling') return saved;
    } catch(e){}
    return 'calendar';
  });
  const [sleepDate, setSleepDate] = useState(getInitialPeakDate());
  const [sleepMode, setSleepMode] = useState<'calendar' | 'rolling'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_sleepMode');
      if (saved === 'calendar' || saved === 'rolling') return saved;
    } catch(e){}
    return 'calendar';
  });
  const [showBulkSleepModal, setShowBulkSleepModal] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<'30days' | 'month' | 'year'>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_heatmapMode');
      if (saved === '30days' || saved === 'month' || saved === 'year') return saved;
    } catch(e){}
    return '30days';
  });
  const [showHeatmapMood, setShowHeatmapMood] = useState(() => {
    try {
      return localStorage.getItem('scholar_dungeon_stats_heatmapMood') === 'true';
    } catch(e){}
    return false;
  });
  const [dailyChartLayers, setDailyChartLayers] = useState<ChartLayerSelection>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_dailyChartLayers');
      if (saved) return JSON.parse(saved);
      const oldMode = localStorage.getItem('scholar_dungeon_stats_dailyLayerMode');
      if (oldMode === 'bars') return { time: true, totalDistractions: false, internal: false, external: false, unavoidable: false };
      if (oldMode === 'lines') return { time: false, totalDistractions: false, internal: true, external: true, unavoidable: true };
    } catch(e){}
    return DEFAULT_CHART_LAYERS;
  });
  const [weeklyChartLayers, setWeeklyChartLayers] = useState<ChartLayerSelection>(() => {
    try {
      const saved = localStorage.getItem('scholar_dungeon_stats_weeklyChartLayers');
      if (saved) return JSON.parse(saved);
      const oldMode = localStorage.getItem('scholar_dungeon_stats_weeklyLayerMode');
      if (oldMode === 'bars') return { time: true, totalDistractions: false, internal: false, external: false, unavoidable: false };
      if (oldMode === 'lines') return { time: false, totalDistractions: false, internal: true, external: true, unavoidable: true };
    } catch(e){}
    return DEFAULT_CHART_LAYERS;
  });

  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_weeklyMode', weeklyMode);
  }, [weeklyMode]);
  
  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_sleepMode', sleepMode);
  }, [sleepMode]);
  
  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_heatmapMode', heatmapMode);
  }, [heatmapMode]);
  
  useEffect(() => {
    localStorage.setItem('scholar_dungeon_stats_heatmapMood', String(showHeatmapMood));
  }, [showHeatmapMood]);

  useEffect(() => {
    try {
      localStorage.setItem('scholar_dungeon_stats_dailyChartLayers', JSON.stringify(dailyChartLayers));
    } catch(e){}
  }, [dailyChartLayers]);

  useEffect(() => {
    try {
      localStorage.setItem('scholar_dungeon_stats_weeklyChartLayers', JSON.stringify(weeklyChartLayers));
    } catch(e){}
  }, [weeklyChartLayers]);
  const [heatmapMetric, setHeatmapMetric] = useState<'time' | 'efficiency'>('time');
  const [heatmapPopoverAnchor, setHeatmapPopoverAnchor] = useState<{ date: number, element: HTMLElement | null } | null>(null);

  const [chartKeys, setChartKeys] = useState({
    daily: Date.now(),
    weeklyBar: Date.now() + 1,
    weeklyLine: Date.now() + 2,
    sleep: Date.now() + 3
  });
  const [activeChart, setActiveChart] = useState<'daily' | 'weeklyBar' | 'weeklyLine' | 'sleep' | null>(null);

  const dateIndicators = React.useMemo(() => {
    const res: Record<string, { highlight?: boolean; star?: boolean }> = {};
    if (state.history) {
      for (const session of state.history) {
        if (!session.timestamp) continue;
        const d = session.timestamp.substring(0, 10);
        if (!res[d]) res[d] = {};
        res[d].highlight = true;
      }
    }
    if (state.dailyLogs) {
      for (const [dateStr, log] of Object.entries(state.dailyLogs)) {
        if (log && log.reflection) {
          if (!res[dateStr]) res[dateStr] = {};
          res[dateStr].star = true;
        }
      }
    }
    return res;
  }, [state.history, state.dailyLogs]);

  const handleChartClick = (chartState: any, chart: 'daily' | 'weeklyBar' | 'weeklyLine' | 'sleep') => {
    const hasTarget = chartState && (
      chartState.activeTooltipIndex !== undefined || 
      chartState.activeLabel !== undefined ||
      (chartState.activePayload && chartState.activePayload.length > 0)
    );

    if (!hasTarget) {
      setActiveChart(null);
      setChartKeys({
        daily: Date.now() + Math.random(),
        weeklyBar: Date.now() + Math.random(),
        weeklyLine: Date.now() + Math.random(),
        sleep: Date.now() + Math.random()
      });
    } else {
      setActiveChart(chart);
      // Keep only the clicked chart active; force-reset all other charts to close their popovers
      setChartKeys(prev => ({
        daily: chart === 'daily' ? prev.daily : Date.now() + Math.random(),
        weeklyBar: chart === 'weeklyBar' ? prev.weeklyBar : Date.now() + Math.random(),
        weeklyLine: chart === 'weeklyLine' ? prev.weeklyLine : Date.now() + Math.random(),
        sleep: chart === 'sleep' ? prev.sleep : Date.now() + Math.random()
      }));
    }
  };

  useEffect(() => {
    let dismissalTimeout: any = null;

    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element;
      
      const inHeatmap = !!target.closest('.heatmap-cell-container');
      const inTooltip = !!target.closest('.recharts-tooltip-wrapper') || !!target.closest('.recharts-tooltip-portal') || !!target.closest('.shared-popover-content');
      const inChart = !!target.closest('.recharts-responsive-container') || !!target.closest('.recharts-wrapper');
      
      if (dismissalTimeout) clearTimeout(dismissalTimeout);

      dismissalTimeout = setTimeout(() => {
        if (!inHeatmap && !target.closest('.shared-popover-content')) {
          setHeatmapPopoverAnchor(prev => prev !== null ? null : prev);
        }
        
        if (!inTooltip && !inChart) {
          setActiveChart(null);
          setChartKeys({
            daily: Date.now() + Math.random(),
            weeklyBar: Date.now() + Math.random(),
            weeklyLine: Date.now() + Math.random(),
            sleep: Date.now() + Math.random()
          });
        }
      }, 30);
    };

    const handleScrollOrResize = () => {
      // Dismiss popovers on scroll or resize to prevent floating detachments
      setHeatmapPopoverAnchor(prev => prev !== null ? null : prev);
    };

    document.addEventListener('click', handleOutsideInteraction, { capture: true });
    document.addEventListener('touchstart', handleOutsideInteraction, { passive: true, capture: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    const handleJump = (e: any) => {
      setDailyDate(new Date(e.detail));
      setWeeklyDate(new Date(e.detail));
      setHeatmapPopoverAnchor(null);
      setChartKeys({
        daily: Date.now() + Math.random(),
        weeklyBar: Date.now() + Math.random(),
        weeklyLine: Date.now() + Math.random(),
        sleep: Date.now() + Math.random()
      });
      document.getElementById('daily-activity-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleShowSessions = (e: any) => {
      const { timestamp, period } = typeof e.detail === 'object' ? e.detail : { timestamp: e.detail, period: undefined };
      setShowDailySessionsDate(new Date(timestamp));
      setShowDailySessionsPeriod(period);
    };

    window.addEventListener('statsNavJump', handleJump);
    window.addEventListener('statsShowDailySessionsModal', handleShowSessions);

    return () => {
      if (dismissalTimeout) clearTimeout(dismissalTimeout);
      document.removeEventListener('click', handleOutsideInteraction, { capture: true });
      document.removeEventListener('touchstart', handleOutsideInteraction, { capture: true });
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('statsNavJump', handleJump);
      window.removeEventListener('statsShowDailySessionsModal', handleShowSessions);
    };
  }, []);

  const renderHeatmapPopover = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = dailyLogs[dateStr];
    const daySessions = getSessionsForDate(date);
    const dayRewards = getRewardsForDate(date);
    const coins = daySessions.reduce((acc, s) => acc + s.coinsEarned, 0) + 
                  dayRewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (r.amount || 0), 0);
    const xp = daySessions.reduce((acc, s) => acc + s.xpEarned, 0) + 
               dayRewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (r.amount || 0), 0);
    
    const counts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
    let dayInternal = 0;
    let dayExternal = 0;
    let dayUnavoidable = 0;
    let dayTotalDistractions = 0;

    daySessions.forEach(s => {
      const p = s.period || getPeriod(new Date(s.timestamp));
      const amount = Math.max(1, getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks));
      if (p in counts) {
        counts[p as keyof typeof counts] += amount;
      } else {
        counts.Other += amount;
      }

      if (s.distractions) {
        const intCount = typeof s.distractions === 'number' ? (isNaN(s.distractions) ? 0 : s.distractions) : (Number(s.distractions.internal) || 0);
        const extCount = typeof s.distractions === 'object' ? (Number(s.distractions.external) || 0) : 0;
        const unavCount = typeof s.distractions === 'object' ? (Number(s.distractions.unavoidable) || 0) : 0;
        dayInternal += intCount;
        dayExternal += extCount;
        dayUnavoidable += unavCount;
        dayTotalDistractions += (intCount + extCount + unavCount);
      }
    });

    if (true) {
      counts.Morning = Math.floor(counts.Morning);
      counts.Afternoon = Math.floor(counts.Afternoon);
      counts.Night = Math.floor(counts.Night);
      counts.Other = Math.floor(counts.Other);
    }
    
    const totalCount = counts.Morning + counts.Afternoon + counts.Night + counts.Other;

    return (
      <SharedPopoverContent 
          label={format(date, 'EEE, MMM d, yyyy')}
          totalSessions={totalCount}
          morning={counts.Morning}
          afternoon={counts.Afternoon}
          night={counts.Night}
          other={counts.Other}
          coins={coins}
          xp={xp}
          distractions={dayTotalDistractions}
          internal={dayInternal}
          external={dayExternal}
          unavoidable={dayUnavoidable}
          efficiency={log?.rating}
          mood={log?.mood}
          dateTimestamp={date.getTime()}
      />
    );
  };
  const [heatmapDate, setHeatmapDate] = useState(getInitialPeakDate());

  const handleDailyDateChange = (newDate: Date) => {
    setDailyDate(newDate);
  };

  const dailyDateStr = format(dailyDate, 'yyyy-MM-dd');
  const currentLog = dailyLogs[dailyDateStr];

  const dailyInputRef = useRef<HTMLInputElement>(null);
  const weeklyInputRef = useRef<HTMLInputElement>(null);
  const heatmapInputRef = useRef<HTMLInputElement>(null);

  // --- Date Range Calculations ---
  const weekStart = weeklyMode === 'calendar' 
    ? startOfWeek(weeklyDate, { weekStartsOn: 1 })
    : subDays(weeklyDate, 6);
  const weekEnd = weeklyMode === 'calendar'
    ? endOfWeek(weeklyDate, { weekStartsOn: 1 })
    : weeklyDate;

  const sleepStart = sleepMode === 'calendar' 
    ? startOfWeek(sleepDate, { weekStartsOn: 1 })
    : subDays(sleepDate, 6);
  const sleepEnd = sleepMode === 'calendar'
    ? endOfWeek(sleepDate, { weekStartsOn: 1 })
    : sleepDate;

  const ts = state.timeSettings || {
    morning: { start: 8, end: 12 },
    afternoon: { start: 14, end: 18 },
    night: { start: 20, end: 24 }
  };

  const getPeriodInfo = useCallback((date: Date) => {
    let localDate = new Date(date);
    if (!date || isNaN(localDate.getTime())) {
      localDate = new Date();
    }
    if (state.timezone) {
      try {
        const str = localDate.toLocaleString('en-US', { timeZone: state.timezone });
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          localDate = parsed;
        }
      } catch (e) {}
    }
    const hour = localDate.getHours();
    
    // Morning
    if (ts.morning.start > ts.morning.end) {
      if (hour >= ts.morning.start) return { period: 'Morning', assignedDate: localDate };
      if (hour < ts.morning.end) return { period: 'Morning', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.morning.start && hour < ts.morning.end) {
      return { period: 'Morning', assignedDate: localDate };
    }
    
    // Afternoon
    if (ts.afternoon.start > ts.afternoon.end) {
      if (hour >= ts.afternoon.start) return { period: 'Afternoon', assignedDate: localDate };
      if (hour < ts.afternoon.end) return { period: 'Afternoon', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.afternoon.start && hour < ts.afternoon.end) {
      return { period: 'Afternoon', assignedDate: localDate };
    }

    // Night
    if (ts.night.start > ts.night.end) {
      if (hour >= ts.night.start) return { period: 'Night', assignedDate: localDate };
      if (hour < ts.night.end) return { period: 'Night', assignedDate: subDays(localDate, 1) };
    } else if (hour >= ts.night.start && hour < ts.night.end) {
      return { period: 'Night', assignedDate: localDate };
    }

    // Other (fallback based on day-reset hour)
    const resetHour = ts.night.end;
    if (hour < resetHour) {
      return { period: 'Other', assignedDate: subDays(localDate, 1) };
    }
    
    return { period: 'Other', assignedDate: localDate };
  }, [state.timezone, ts]);

  const processedHistory = useMemo(() => {
    return (history || []).map(s => {
      const validDate = s.timestamp && !isNaN(new Date(s.timestamp).getTime()) ? new Date(s.timestamp) : new Date();
      const info = getPeriodInfo(validDate);
      return {
        ...s,
        assignedDate: info.assignedDate,
        assignedDateStr: format(info.assignedDate, 'yyyy-MM-dd'),
        period: info.period
      };
    });
  }, [history, getPeriodInfo]);

  const processedRewards = useMemo(() => {
    return (state.rewardHistory || []).map(r => {
      const validDate = r.timestamp && !isNaN(new Date(r.timestamp).getTime()) ? new Date(r.timestamp) : new Date();
      const info = getPeriodInfo(validDate);
      return {
        ...r,
        assignedDate: info.assignedDate,
        assignedDateStr: format(info.assignedDate, 'yyyy-MM-dd'),
      };
    });
  }, [state.rewardHistory, getPeriodInfo]);

  const sessionsByDateStr = useMemo(() => {
    const map: Record<string, typeof processedHistory> = {};
    processedHistory.forEach(s => {
      if (!map[s.assignedDateStr]) map[s.assignedDateStr] = [];
      map[s.assignedDateStr].push(s);
    });
    return map;
  }, [processedHistory]);

  const rewardsByDateStr = useMemo(() => {
    const map: Record<string, typeof processedRewards> = {};
    processedRewards.forEach(r => {
      if (!map[r.assignedDateStr]) map[r.assignedDateStr] = [];
      map[r.assignedDateStr].push(r);
    });
    return map;
  }, [processedRewards]);

  const getSessionsForDate = useCallback((date: Date) => {
    if (!date || isNaN(date.getTime())) return [];
    return sessionsByDateStr[format(date, 'yyyy-MM-dd')] || [];
  }, [sessionsByDateStr]);

  const getRewardsForDate = useCallback((date: Date) => {
    if (!date || isNaN(date.getTime())) return [];
    return rewardsByDateStr[format(date, 'yyyy-MM-dd')] || [];
  }, [rewardsByDateStr]);

  const isSamePeakDay = (sessionDate: Date, targetDate: Date) => {
    const info = getPeriodInfo(sessionDate);
    return isSameDay(info.assignedDate, targetDate);
  };

  const calculateDistractionCount = (distractions: any) => {
    if (!distractions) return 0;
    if (typeof distractions === 'number') return isNaN(distractions) ? 0 : distractions;
    return (Number(distractions.internal) || 0) + (Number(distractions.external) || 0) + (Number(distractions.unavoidable) || 0);
  };

  // --- Aggregate Helpers ---
  const getGainsForPeriod = (sessions: StudySession[], rewards: RewardHistoryItem[], dateRange?: { start: Date, end: Date }) => {
    const rangeInterval = dateRange 
      ? { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) }
      : undefined;

    const periodSessions = rangeInterval 
      ? processedHistory.filter(s => isWithinInterval(s.assignedDate, rangeInterval))
      : processedHistory;
    const periodRewards = rangeInterval
      ? processedRewards.filter(r => isWithinInterval(r.assignedDate, rangeInterval))
      : processedRewards;

    const coins = periodSessions.reduce((acc, s) => acc + (Number(s.coinsEarned) || 0), 0) + 
                  periodRewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const xp = periodSessions.reduce((acc, s) => acc + (Number(s.xpEarned) || 0), 0) + 
               periodRewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    
    const tasks = Math.floor(periodSessions.reduce((acc, s) => acc + getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks), 0));
    const distractions = periodSessions.reduce((acc, s) => acc + calculateDistractionCount(s.distractions), 0);

    return { coins, xp, tasks, distractions };
  };

  const dailyGains = useMemo(() => {
    const sessions = getSessionsForDate(dailyDate);
    const rewards = getRewardsForDate(dailyDate);
    
    const coins = sessions.reduce((acc, s) => acc + (Number(s.coinsEarned) || 0), 0) + 
                  rewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const xp = sessions.reduce((acc, s) => acc + (Number(s.xpEarned) || 0), 0) + 
               rewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    
    const tasks = Math.floor(sessions.reduce((acc, s) => acc + getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks), 0));
    const distractions = sessions.reduce((acc, s) => acc + calculateDistractionCount(s.distractions), 0);

    return { coins, xp, tasks, distractions };
  }, [getSessionsForDate, getRewardsForDate, dailyDate, state.includeRestTimeInTasks]);

  const weeklyGains = useMemo(() => {
    const interval = { start: weekStart, end: weekEnd };
    return getGainsForPeriod(history, state.rewardHistory || [], interval);
  }, [history, state.rewardHistory, weekStart, weekEnd, processedHistory, processedRewards, state.includeRestTimeInTasks]);

  const getPeriod = (date: Date) => {
    return getPeriodInfo(date).period;
  };

  const dailyData = useMemo(() => {
    const currentDailySessions = getSessionsForDate(dailyDate);
    const dailyCounts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
    const dailyDistractions = {
      Morning: { internal: 0, external: 0, unavoidable: 0, total: 0 },
      Afternoon: { internal: 0, external: 0, unavoidable: 0, total: 0 },
      Night: { internal: 0, external: 0, unavoidable: 0, total: 0 },
      Other: { internal: 0, external: 0, unavoidable: 0, total: 0 },
    };

    currentDailySessions.forEach(s => {
      const p = s.period || getPeriod(new Date(s.timestamp));
      const amount = Math.max(0, getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks));
      if (p in dailyCounts) {
        dailyCounts[p as keyof typeof dailyCounts] += amount;
      } else {
        dailyCounts.Other += amount;
      }

      const targetPeriod = (p in dailyDistractions ? p : 'Other') as keyof typeof dailyDistractions;
      if (s.distractions) {
        const intCount = typeof s.distractions === 'number' ? (isNaN(s.distractions) ? 0 : s.distractions) : (Number(s.distractions.internal) || 0);
        const extCount = typeof s.distractions === 'object' ? (Number(s.distractions.external) || 0) : 0;
        const unavCount = typeof s.distractions === 'object' ? (Number(s.distractions.unavoidable) || 0) : 0;
        dailyDistractions[targetPeriod].internal += intCount;
        dailyDistractions[targetPeriod].external += extCount;
        dailyDistractions[targetPeriod].unavoidable += unavCount;
        dailyDistractions[targetPeriod].total += (intCount + extCount + unavCount);
      }
    });

    dailyCounts.Morning = Math.floor(dailyCounts.Morning);
    dailyCounts.Afternoon = Math.floor(dailyCounts.Afternoon);
    dailyCounts.Night = Math.floor(dailyCounts.Night);
    dailyCounts.Other = Math.floor(dailyCounts.Other);

    return [
      { 
        name: `Morning (${ts.morning.start}-${ts.morning.end})`, 
        sessions: dailyCounts.Morning, 
        fill: '#fde047', 
        periodKey: 'Morning',
        internal: dailyDistractions.Morning.internal,
        external: dailyDistractions.Morning.external,
        unavoidable: dailyDistractions.Morning.unavoidable,
        distractions: dailyDistractions.Morning.total,
      },
      { 
        name: `Afternoon (${ts.afternoon.start}-${ts.afternoon.end})`, 
        sessions: dailyCounts.Afternoon, 
        fill: '#f97316', 
        periodKey: 'Afternoon',
        internal: dailyDistractions.Afternoon.internal,
        external: dailyDistractions.Afternoon.external,
        unavoidable: dailyDistractions.Afternoon.unavoidable,
        distractions: dailyDistractions.Afternoon.total,
      },
      { 
        name: `Night (${ts.night.start}-${ts.night.end})`, 
        sessions: dailyCounts.Night, 
        fill: '#6366f1', 
        periodKey: 'Night',
        internal: dailyDistractions.Night.internal,
        external: dailyDistractions.Night.external,
        unavoidable: dailyDistractions.Night.unavoidable,
        distractions: dailyDistractions.Night.total,
      },
      ...(state.showOtherInActivityLog !== false ? [{ 
        name: 'Other', 
        sessions: dailyCounts.Other, 
        fill: '#64748b', 
        periodKey: 'Other',
        internal: dailyDistractions.Other.internal,
        external: dailyDistractions.Other.external,
        unavoidable: dailyDistractions.Other.unavoidable,
        distractions: dailyDistractions.Other.total,
      }] : [])
    ];
  }, [dailyDate, getSessionsForDate, ts, state.showOtherInActivityLog, state.includeRestTimeInTasks, getPeriodInfo]);

  const dailySessions = getSessionsForDate(dailyDate);
  const dailyCounts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
  dailySessions.forEach(s => {
    const p = s.period || getPeriod(new Date(s.timestamp));
    if (p in dailyCounts) {
      dailyCounts[p as keyof typeof dailyCounts]++;
    } else {
      dailyCounts.Other++;
    }
  });

  let maxPeriod = 'Morning';
  let maxCount = dailyCounts.Morning;
  ['Afternoon', 'Night'].forEach(p => {
    if (dailyCounts[p as keyof typeof dailyCounts] > maxCount) {
      maxCount = dailyCounts[p as keyof typeof dailyCounts];
      maxPeriod = p;
    }
  });
  const highestEnergyPrompt = dailySessions.length > 0 
    ? (maxCount > 0 
        ? `Your highest energy period today is ${maxPeriod}!` 
        : "No sessions recorded during main periods today.")
    : "The archives are silent for today. Embark on a new journey to begin your record.";

  const weeklyDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyActiveDaysCount = useMemo(() => {
    const count = weeklyDays.filter(date => {
      const hasSessions = getSessionsForDate(date).length > 0;
      const hasRewards = getRewardsForDate(date).length > 0;
      return hasSessions || hasRewards;
    }).length;
    return count > 0 ? count : 1;
  }, [weeklyDays, sessionsByDateStr, rewardsByDateStr]);

  const sleepDays = eachDayOfInterval({ start: sleepStart, end: sleepEnd });

  const sleepData = useMemo(() => {
    return sleepDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const log = dailyLogs[dateStr] || ({} as any);
      const durationHours = (log.sleepDurationMin || 0) / 60;
      
      let sleepTimeNum: number | null = null;
      let wakeTimeNum: number | null = null;
      if (log.sleepTime && log.wakeTime) {
         const [sh, sm] = log.sleepTime.split(':').map(Number);
         const [wh, wm] = log.wakeTime.split(':').map(Number);
         
         let s = sh + sm/60;
         let w = wh + wm/60;
         
         if (s <= w) {
             if (s <= 12) {
                 s += 24;
                 w += 24;
             }
         } else {
             w += 24;
         }
         sleepTimeNum = s;
         wakeTimeNum = w;
      } else if (log.sleepTime) {
         const [h, m] = log.sleepTime.split(':').map(Number);
         sleepTimeNum = h < 12 ? h + 24 + m/60 : h + m/60;
      } else if (log.wakeTime) {
         const [h, m] = log.wakeTime.split(':').map(Number);
         wakeTimeNum = h + 24 + m/60;
      }

      return {
        name: format(date, 'EEE'),
        fullName: format(date, 'eeee, MMM do'),
        dateStr,
        duration: Number(durationHours.toFixed(1)),
        sleepTime: sleepTimeNum !== null ? Number(sleepTimeNum.toFixed(2)) : null,
        wakeTime: wakeTimeNum !== null ? Number(wakeTimeNum.toFixed(2)) : null,
        hasRecord: !!log.sleepDurationMin
      };
    });
  }, [sleepDays, dailyLogs]);

  const weeklyData = useMemo(() => {
    return weeklyDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const log = dailyLogs[dateStr];
      const daySessions = getSessionsForDate(date);
      const dayRewards = getRewardsForDate(date);
      const coins = daySessions.reduce((acc, s) => acc + s.coinsEarned, 0) + 
                    dayRewards.filter(r => r.type === 'coins').reduce((acc, r) => acc + (r.amount || 0), 0);
      const xp = daySessions.reduce((acc, s) => acc + s.xpEarned, 0) + 
                 dayRewards.filter(r => r.type === 'xp').reduce((acc, r) => acc + (r.amount || 0), 0);
      const counts = { Morning: 0, Afternoon: 0, Night: 0, Other: 0 };
      
      let dayInternal = 0;
      let dayExternal = 0;
      let dayUnavoidable = 0;
      let dayTotalDistractions = 0;

      daySessions.forEach(s => {
        const p = s.period || getPeriod(new Date(s.timestamp));
        const amount = Math.max(1, getSessionEffectiveMinutes(s, !!state.includeRestTimeInTasks));
        if (p in counts) {
          counts[p as keyof typeof counts] += amount;
        } else {
          counts.Other += amount;
        }

        if (s.distractions) {
          const intCount = typeof s.distractions === 'number' ? (isNaN(s.distractions) ? 0 : s.distractions) : (Number(s.distractions.internal) || 0);
          const extCount = typeof s.distractions === 'object' ? (Number(s.distractions.external) || 0) : 0;
          const unavCount = typeof s.distractions === 'object' ? (Number(s.distractions.unavoidable) || 0) : 0;
          dayInternal += intCount;
          dayExternal += extCount;
          dayUnavoidable += unavCount;
          dayTotalDistractions += (intCount + extCount + unavCount);
        }
      });
      counts.Morning = Math.floor(counts.Morning);
      counts.Afternoon = Math.floor(counts.Afternoon);
      counts.Night = Math.floor(counts.Night);
      counts.Other = Math.floor(counts.Other);
      const total = counts.Morning + counts.Afternoon + counts.Night + counts.Other;
      const hours = total > 0 ? (total / 60) : 0;
      const distractionsRate = hours > 0 ? Number((dayTotalDistractions / hours).toFixed(1)) : 0;
      const internalRate = hours > 0 ? Number((dayInternal / hours).toFixed(1)) : 0;
      const externalRate = hours > 0 ? Number((dayExternal / hours).toFixed(1)) : 0;
      const unavoidableRate = hours > 0 ? Number((dayUnavoidable / hours).toFixed(1)) : 0;
      const efficiencyVal = log?.rating || 0;
      const efficiencyDisplay = state.efficiencyRatingConfig?.ratingDisplayPreference === 'efficiency'
        ? Math.round(efficiencyVal * 20)
        : efficiencyVal;

      return {
        name: format(date, 'EEE').toUpperCase(),
        fullDate: format(date, 'EEE, MMM d, yyyy'),
        Morning: counts.Morning,
        Afternoon: counts.Afternoon,
        Night: counts.Night,
        Other: counts.Other,
        total,
        xp,
        coins,
        internal: dayInternal,
        external: dayExternal,
        unavoidable: dayUnavoidable,
        distractions: dayTotalDistractions,
        internalRate,
        externalRate,
        unavoidableRate,
        distractionsRate,
        moodHeight: 0,
        mood: log?.mood,
        efficiency: log?.rating || null,
        efficiencyDisplay,
        timestamp: date.getTime(),
      };
    });
  }, [weeklyDays, dailyLogs, getSessionsForDate, getRewardsForDate, state.includeRestTimeInTasks, state.efficiencyRatingConfig?.ratingDisplayPreference, getPeriodInfo]);

  const isFixedYAxis = viewOpts.yAxisMaxMode === 'fixed';

  const dailyTimeAxis = useMemo(() => {
    const maxMins = Math.max(...dailyData.map(d => d.sessions || 0), 0);
    return computeTimeYAxis(maxMins, isFixedYAxis, 240);
  }, [dailyData, isFixedYAxis]);

  const weeklyTimeAxis = useMemo(() => {
    const maxMins = Math.max(
      ...weeklyData.map(d => 
        (d.Morning || 0) + 
        (d.Afternoon || 0) + 
        (d.Night || 0) + 
        (state.showOtherInActivityLog !== false ? (d.Other || 0) : 0)
      ),
      0
    );
    return computeTimeYAxis(maxMins, isFixedYAxis, 480);
  }, [weeklyData, state.showOtherInActivityLog, isFixedYAxis]);

  const renderMoodIcon = (props: any) => {
    const { x, y, width, payload, value } = props;
    // Extract actual payload whether stacked or not
    const actualPayload = payload?.payload || payload;
    if (!actualPayload) return null;

    const moodId = actualPayload.mood;
    const total = actualPayload.total;
    const moodObj = moodId ? MOOD_OPTIONS.find((m) => m.id === moodId) : null;
    const Icon = moodObj ? moodObj.icon : null;

    return (
      <g transform={`translate(${x + width / 2}, ${y - 10})`}>
        {/* Render total value */}
        <text
          x={0}
          y={Icon ? -16 : 0}
          fill="#94a3b8"
          fontSize={10}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {total > 0 ? total : ''}
        </text>
        {/* Render mood icon if available */}
        {Icon && (
          <g transform={`translate(-7, -7)`}>
            <Icon size={14} className={moodObj.color} />
          </g>
        )}
      </g>
    );
  };

  return (
    <div ref={statsContainerRef} className="w-full space-y-6 sm:space-y-8" onClick={() => {}} style={{ cursor: 'auto' }}>
      <PageHeader 
        title="Record"
        description="Your journey through the dungeon"
        icon={BarChart2}
        action={
          <div id="stats-header-actions" className="flex gap-2">
            <button
              onClick={() => setShowViewSettings(true)}
              className="p-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <LayoutTemplate size={18} />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Layout</span>
            </button>
            <button 
              id="share-button"
              onClick={() => setShowShareModal(true)}
              className="p-2 sm:px-4 sm:py-2.5 bg-indigo-600/10 hover:bg-indigo-600 rounded-xl border border-indigo-500/20 text-indigo-400 hover:text-white transition-all flex items-center justify-center gap-2 group shrink-0"
            >
              <Share2 size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">Share</span>
            </button>
          </div>
        }
      />

      <div id="charts-grid" className={cn(
        "grid gap-8 transition-all",
        (shareConfig.showDaily && shareConfig.showWeekly) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        
        {/* Daily */}
        {shareConfig.showDaily && (
          <StatsDailySection
            dailyChartLayers={dailyChartLayers}
            setDailyChartLayers={setDailyChartLayers}
            dailyDate={dailyDate}
            handleDailyDateChange={handleDailyDateChange}
            dateIndicators={dateIndicators}
            dailyGains={dailyGains}
            formatDuration={formatDuration}
            viewOpts={viewOpts}
            chartKey={chartKeys.daily}
            dailyData={dailyData}
            handleChartClick={handleChartClick}
            activeChart={activeChart}
            dailyTimeAxis={dailyTimeAxis}
            formatTimeTick={formatTimeTick}
            dailySessions={getSessionsForDate(dailyDate)}
            dungeons={dungeons}
            majorDungeons={majorDungeons}
            state={state}
            currentLog={currentLog}
            showReflection={shareConfig.showReflection}
            saveDailyLog={saveDailyLog}
            onUpdateState={onUpdateState}
            onOpenJournal={onOpenJournal}
          />
        )}

        {/* Weekly */}
        {shareConfig.showWeekly && (
          <StatsWeeklySection
            weeklyMode={weeklyMode}
            setWeeklyMode={setWeeklyMode}
            weeklyChartLayers={weeklyChartLayers}
            setWeeklyChartLayers={setWeeklyChartLayers}
            weeklyDate={weeklyDate}
            setWeeklyDate={setWeeklyDate}
            weekStart={weekStart}
            weekEnd={weekEnd}
            dateIndicators={dateIndicators}
            viewOpts={viewOpts}
            weeklyActiveDaysCount={weeklyActiveDaysCount}
            weeklyDays={weeklyDays}
            weeklyGains={weeklyGains}
            weeklyData={weeklyData}
            chartKey={chartKeys.weeklyBar}
            lineChartKey={chartKeys.weeklyLine}
            handleChartClick={handleChartClick}
            activeChart={activeChart}
            weeklyTimeAxis={weeklyTimeAxis}
            formatTimeTick={formatTimeTick}
            formatDuration={formatDuration}
            state={state}
            dungeons={dungeons}
            majorDungeons={majorDungeons}
            weeklySessions={processedHistory.filter(s => {
              return isWithinInterval(s.assignedDate, {
                start: weekStart,
                end: weekEnd
              });
            })}
          />
        )}
      </div>

      {(shareConfig.showRoutine && (viewOpts.showRoutineTracker ?? true)) && (
        <div id="routine-tracker-section" className="w-full">
          <RoutineTracker 
            history={state.history} 
            dungeons={dungeons} 
            majorDungeons={majorDungeons} 
            timeSettings={state.timeSettings}
            timezone={state.timezone}
            hiddenRoutines={viewOpts.hiddenRoutines || []}
            onUpdateHiddenRoutines={onUpdateState ? (ids) => onUpdateState({ statsViewOpts: { ...viewOpts, hiddenRoutines: ids } }) : undefined}
            renderPopover={(date, routineId, onClose) => (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-auto z-[100]">
                <RoutineCellEditor 
                  date={date} 
                  routineId={routineId} 
                  history={state.history} 
                  dungeons={dungeons} 
                  majorDungeons={majorDungeons} 
                  onUpdateState={onUpdateState} 
                  deleteSession={deleteSession} 
                  completeSession={completeSession}
                  timezone={state.timezone}
                  timeSettings={state.timeSettings}
                  onClose={onClose}
                />
              </div>
            )}
          />
        </div>
      )}

      {(viewOpts.showSleepTracker ?? true) && (
        <StatsSleepTrackerSection
          sleepMode={sleepMode}
          setSleepMode={setSleepMode}
          sleepDate={sleepDate}
          setSleepDate={setSleepDate}
          sleepStart={sleepStart}
          sleepEnd={sleepEnd}
          dateIndicators={dateIndicators}
          setShowBulkSleepModal={setShowBulkSleepModal}
          sleepData={sleepData}
          chartKey={chartKeys.sleep}
          handleChartClick={handleChartClick}
          activeChart={activeChart}
        />
      )}

      {/* Study Heatmap */}
      {(shareConfig.showHeatmap && (viewOpts.showHeatmap ?? true)) && (
        <StatsActivityHeatmap
          state={state}
          history={history}
          dailyLogs={dailyLogs}
          dateIndicators={dateIndicators}
          getSessionsForDate={getSessionsForDate}
          renderHeatmapPopover={renderHeatmapPopover}
          heatmapDate={heatmapDate}
          setHeatmapDate={setHeatmapDate}
          heatmapMode={heatmapMode}
          setHeatmapMode={setHeatmapMode}
          heatmapMetric={heatmapMetric}
          setHeatmapMetric={setHeatmapMetric}
          showHeatmapMood={showHeatmapMood}
          setShowHeatmapMood={setShowHeatmapMood}
          heatmapPopoverAnchor={heatmapPopoverAnchor}
          setHeatmapPopoverAnchor={setHeatmapPopoverAnchor}
          formatDuration={formatDuration}
          viewOpts={viewOpts}
        />
      )}

      {showBulkSleepModal && (
        <BulkSleepModal
          state={state}
          onClose={() => setShowBulkSleepModal(false)}
          onSave={(dateStr, sleepTime, wakeTime, sleepDurationMin) => {
             const existing = state.dailyLogs?.[dateStr] || {};
             if (onUpdateState) {
               onUpdateState({
                 dailyLogs: {
                   ...(state.dailyLogs || {}),
                   [dateStr]: {
                     rating: 0,
                     reflection: '',
                     ...existing,
                     sleepTime,
                     wakeTime,
                     sleepDurationMin
                   }
                 }
               });
             }
          }}
        />
      )}

      {showShareModal && (
        <ShareRecordModal 
          onClose={() => {
            setShowShareModal(false);
            setShareConfig({
              showDaily: true,
              showWeekly: true,
              showRoutine: true,
              showHeatmap: true,
              showReflection: true,
              showSleep: true,
              aspectRatio: 'auto'
            });
          }} 
          containerRef={statsContainerRef} 
          config={shareConfig}
          setConfig={setShareConfig}
          dailyLogs={state.dailyLogs || {}}
          indicators={dateIndicators}
        />
      )}

      <ViewSettingsModal 
        isOpen={showViewSettings}
        onClose={() => setShowViewSettings(false)}
        opts={viewOpts}
        onUpdate={(updates) => onUpdateState?.({ statsViewOpts: { ...viewOpts, ...updates } })}
      />

      {showDailySessionsDate && (
        <DailySessionsModal 
          isOpen={!!showDailySessionsDate}
          onClose={() => {
            setShowDailySessionsDate(null);
            setShowDailySessionsPeriod(undefined);
          }}
          date={showDailySessionsDate}
          history={processedHistory}
          dungeons={dungeons}
          majorDungeons={majorDungeons}
          updateSession={updateSession || (() => {})}
          deleteSession={deleteSession || (() => {})}
          rewardPool={state.rewardPool || []}
          timeSettings={state.timeSettings}
          period={showDailySessionsPeriod}
          includeRestTimeInTasks={state.includeRestTimeInTasks}
        />
      )}
    </div>
  );
});
