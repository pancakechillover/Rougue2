import React, { useState, useMemo } from 'react';
import { Tags, Clock, Layers, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { StudySession, Dungeon, MajorDungeon, Tag, TimeSettings } from '../../../types';
import { getSessionEffectiveMinutes, getSessionSettlementDate, getSettlementDay, cn } from '../../../lib/utils';
import { getSessionEffectiveTagIds, TAG_COLOR_STYLES } from '../../../lib/tags';
import { TagBadge } from '../../common/TagBadge';
import { DurationText } from '../../common/DurationText';
import { DatePicker } from '../../common/DatePicker';
import { parseISO, differenceInCalendarDays, format, subDays, addDays, isSameDay } from 'date-fns';

interface StatsTagAnalyticsSectionProps {
  history: StudySession[];
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  tags: Tag[];
  includeRestTimeInStats?: boolean;
  standardRestMinutes?: number;
  timeSettings?: TimeSettings;
  dateIndicators?: Record<string, { highlight?: boolean; star?: boolean }>;
  now?: Date;
}

interface TagStatRow {
  id: string;
  name: string;
  tag?: Tag;
  colorHex: string;
  minutes: number;
  percentage: number;
  sessionCount: number;
  distractionsPerHour: number;
}

export const StatsTagAnalyticsSection: React.FC<StatsTagAnalyticsSectionProps> = ({
  history,
  dungeons,
  majorDungeons,
  tags,
  includeRestTimeInStats = false,
  standardRestMinutes = 5,
  timeSettings,
  dateIndicators,
  now
}) => {
  const todayDate = useMemo(() => {
    const baseNow = now || new Date();
    const todaySettlementStr = getSettlementDay(baseNow, timeSettings);
    return parseISO(todaySettlementStr);
  }, [now, timeSettings]);

  const [range, setRange] = useState<'day' | '7d' | '30d' | 'all'>('7d');
  const [tagDate, setTagDate] = useState<Date>(() => todayDate);

  const anchorDate = useMemo(() => {
    const settlementStr = getSettlementDay(tagDate, timeSettings);
    return parseISO(settlementStr);
  }, [tagDate, timeSettings]);

  const datePickerLabel = useMemo(() => {
    if (range === 'day') {
      return isSameDay(anchorDate, todayDate) ? 'Today' : format(anchorDate, 'MMM dd, yyyy');
    }
    if (range === '7d') {
      return `${format(subDays(anchorDate, 6), 'MMM dd')} - ${format(anchorDate, 'MMM dd')}`;
    }
    if (range === '30d') {
      return `${format(subDays(anchorDate, 29), 'MMM dd')} - ${format(anchorDate, 'MMM dd')}`;
    }
    return `All Time · ${format(anchorDate, 'MMM dd')}`;
  }, [range, anchorDate, todayDate]);

  const tagStats = useMemo(() => {
    const filteredSessions = (history || []).filter(session => {
      if (range === 'all') return true;
      const sessionDateStr = getSessionSettlementDate(session, timeSettings);
      try {
        const diff = differenceInCalendarDays(anchorDate, parseISO(sessionDateStr));
        if (range === 'day') return diff === 0;
        if (range === '7d') return diff >= 0 && diff < 7;
        if (range === '30d') return diff >= 0 && diff < 30;
      } catch {
        return false;
      }
      return true;
    });

    const statsMap = new Map<string, { minutes: number; sessionCount: number; distractions: number }>();
    let uniqueTotalMinutesRaw = 0;
    let totalDistractionsRaw = 0;
    let totalSessions = 0;

    for (const session of filteredSessions) {
      const mins = getSessionEffectiveMinutes(session, includeRestTimeInStats, standardRestMinutes);
      if (mins <= 0) continue;

      const distCount = (Number(session.distractions?.internal) || 0) + (Number(session.distractions?.external) || 0);
      uniqueTotalMinutesRaw += mins;
      totalDistractionsRaw += distCount;
      totalSessions += 1;

      const effTagIds = getSessionEffectiveTagIds(session, dungeons, majorDungeons).filter(id =>
        tags.some(t => t.id === id)
      );

      if (effTagIds.length === 0) {
        const curr = statsMap.get('__untagged__') || { minutes: 0, sessionCount: 0, distractions: 0 };
        curr.minutes += mins;
        curr.sessionCount += 1;
        curr.distractions += distCount;
        statsMap.set('__untagged__', curr);
      } else {
        for (const tagId of effTagIds) {
          const curr = statsMap.get(tagId) || { minutes: 0, sessionCount: 0, distractions: 0 };
          curr.minutes += mins;
          curr.sessionCount += 1;
          curr.distractions += distCount;
          statsMap.set(tagId, curr);
        }
      }
    }

    const totalAttributedMinutes = Array.from(statsMap.values()).reduce((acc, v) => acc + v.minutes, 0);

    const rows: TagStatRow[] = [];
    statsMap.forEach((val, key) => {
      if (key === '__untagged__') {
        rows.push({
          id: '__untagged__',
          name: 'Untagged',
          colorHex: '#64748b',
          minutes: Math.round(val.minutes),
          percentage: totalAttributedMinutes > 0 ? (val.minutes / totalAttributedMinutes) * 100 : 0,
          sessionCount: val.sessionCount,
          distractionsPerHour: val.minutes > 0 ? (val.distractions / (val.minutes / 60)) : 0
        });
      } else {
        const tagObj = tags.find(t => t.id === key);
        if (!tagObj) return;
        const style = TAG_COLOR_STYLES[tagObj.color] || TAG_COLOR_STYLES.indigo;
        rows.push({
          id: tagObj.id,
          name: tagObj.name,
          tag: tagObj,
          colorHex: style.hex,
          minutes: Math.round(val.minutes),
          percentage: totalAttributedMinutes > 0 ? (val.minutes / totalAttributedMinutes) * 100 : 0,
          sessionCount: val.sessionCount,
          distractionsPerHour: val.minutes > 0 ? (val.distractions / (val.minutes / 60)) : 0
        });
      }
    });

    rows.sort((a, b) => {
      if (a.id === '__untagged__' && b.id !== '__untagged__') return 1;
      if (b.id === '__untagged__' && a.id !== '__untagged__') return -1;
      return b.minutes - a.minutes;
    });

    const uniqueTotalMinutes = Math.round(uniqueTotalMinutesRaw);
    const taggedCount = rows.filter(r => r.id !== '__untagged__').length;
    const overallDistractionsPerHour =
      uniqueTotalMinutesRaw > 0 ? totalDistractionsRaw / (uniqueTotalMinutesRaw / 60) : 0;

    return {
      rows,
      uniqueTotalMinutes,
      totalAttributedMinutes: Math.round(totalAttributedMinutes),
      taggedCount,
      totalSessions,
      overallDistractionsPerHour,
    };
  }, [history, dungeons, majorDungeons, tags, range, anchorDate, includeRestTimeInStats, standardRestMinutes, timeSettings]);

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div
      id="tag-breakdown-section"
      className="bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6 transition-all"
    >
      {/* Header & Controls (Unified with Daily / Weekly / Routine / Workstation / Heatmap) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-2">
          <Tags className="text-indigo-400" size={20} />
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest pr-1">
            Tag Breakdown
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex bg-slate-800/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            {([
              { id: 'day', label: 'Day' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All Time' }
            ] as const).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer",
                  range === opt.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-1 w-full sm:w-auto">
            <DatePicker
              value={format(anchorDate, 'yyyy-MM-dd')}
              onChange={(val) => {
                if (!val) return;
                setTagDate(parseISO(val));
                if (range === 'all') setRange('7d');
              }}
              indicators={dateIndicators}
              className="text-xs font-bold text-slate-300 w-full sm:w-36 text-center hover:text-indigo-400 transition-colors py-1 inline-block whitespace-nowrap cursor-pointer"
              nav={{
                onPrev: () => {
                  if (range === 'day') setTagDate(subDays(anchorDate, 1));
                  else if (range === '30d') setTagDate(subDays(anchorDate, 30));
                  else {
                    if (range === 'all') setRange('7d');
                    setTagDate(subDays(anchorDate, 7));
                  }
                },
                onNext: () => {
                  if (range === 'day') setTagDate(addDays(anchorDate, 1));
                  else if (range === '30d') setTagDate(addDays(anchorDate, 30));
                  else {
                    if (range === 'all') setRange('7d');
                    setTagDate(addDays(anchorDate, 7));
                  }
                },
                onToday: () => setTagDate(todayDate),
                size: 'sm',
              }}
            >
              {datePickerLabel}
            </DatePicker>
          </div>
        </div>
      </div>

      {/* Top 4 Vitals Strip (Unified with Daily/Weekly Overview & Workstation Cards) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 truncate w-full">
            Total Focus
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 min-w-0">
            <Clock size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
            <span className="text-[10px] sm:text-lg font-black font-mono truncate">
              <DurationText minutes={tagStats.uniqueTotalMinutes} digitClassName="font-black" />
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 truncate w-full">
            Active Tags
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-indigo-400 min-w-0">
            <Tags size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
            <span className="text-[10px] sm:text-lg font-black font-mono truncate">
              {tagStats.taggedCount}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 truncate w-full">
            Sessions
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-amber-400 min-w-0">
            <Layers size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
            <span className="text-[10px] sm:text-lg font-black font-mono truncate">
              {tagStats.totalSessions}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 truncate w-full">
            Distracted
          </span>
          <div className="flex items-center gap-0.5 sm:gap-1 text-rose-400 min-w-0">
            <Zap size={12} className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 hidden sm:block" />
            <span className="text-[10px] sm:text-lg font-black font-mono truncate">
              {tagStats.overallDistractionsPerHour.toFixed(1)}
            </span>
            <span className="text-[8px] sm:text-xs text-rose-400/80 font-mono -ml-0.5">/h</span>
          </div>
        </div>
      </div>

      {/* Main Content: Equal-Height 2-Column Layout matching Workstation & Sleep Tracker */}
      {tagStats.rows.length === 0 ? (
        <div className="py-10 text-center border-t border-slate-800/50">
          <p className="text-sm font-medium text-slate-500 italic pr-1">
            No focus sessions recorded in the selected period ({datePickerLabel}).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2 border-t border-slate-800/50">
          {/* Left: Donut Chart */}
          <div className="lg:col-span-5 h-full flex flex-col items-center justify-between p-1 sm:p-2 relative lg:border-r lg:border-slate-800/50 lg:pr-6">
            <div className="w-full flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Share Distribution
              </span>
              <span className="text-[10px] text-slate-500 font-medium font-mono">
                {range === 'all' ? 'All time' : datePickerLabel}
              </span>
            </div>

            <div className="relative w-full h-56 sm:h-60 my-auto flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tagStats.rows}
                    dataKey="minutes"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {tagStats.rows.map((entry) => (
                      <Cell key={entry.id} fill={entry.colorHex} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [formatDuration(value), name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Attributed
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-100 font-mono mt-0.5">
                  <DurationText minutes={tagStats.totalAttributedMinutes} digitClassName="font-black" />
                </span>
              </div>
            </div>
          </div>

          {/* Right: Tag Ranking List */}
          <div className="lg:col-span-7 h-full flex flex-col gap-3 py-1">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                By Tag ({tagStats.rows.length})
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Sessions · Distracted · Time
              </span>
            </div>

            <div className="flex-1 space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {tagStats.rows.map((row) => (
                <div
                  key={row.id}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/70 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {row.tag ? (
                        <TagBadge tag={row.tag} size="xs" />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 h-5 px-2 rounded-md border border-slate-700 bg-slate-800/60 text-slate-400 text-[10px] font-bold leading-none shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Untagged</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                        ({row.percentage.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                      <span className="flex items-center gap-1 text-slate-400" title="Sessions">
                        <Layers size={11} className="text-amber-400/80" />
                        <span>{row.sessionCount}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-400" title="Distractions per hour">
                        <Zap size={11} className="text-rose-400/80" />
                        <span>{row.distractionsPerHour.toFixed(1)}/h</span>
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-200 min-w-[52px] justify-end">
                        <DurationText minutes={row.minutes} digitClassName="font-bold" />
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(3, Math.min(100, row.percentage))}%`,
                        backgroundColor: row.colorHex
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
