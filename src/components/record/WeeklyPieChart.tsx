import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, Layers } from 'lucide-react';
import { StudySession, TimeSettings, Tag, Dungeon, MajorDungeon } from '../../types';
import { getDay } from 'date-fns';
import { cn, getSessionEffectiveMinutes } from '../../lib/utils';
import { getSessionEffectiveTagIds, TAG_COLOR_STYLES } from '../../lib/tags';
import { TagBadge } from '../common/TagBadge';
import { DurationText } from '../common/DurationText';

interface Props {
  weekSessions: StudySession[];
  mode: 'time_of_day' | 'day_of_week' | 'tags';
  onChangeMode?: (mode: 'time_of_day' | 'day_of_week' | 'tags') => void;
  tags?: Tag[];
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  includeRestTimeInTasks?: boolean;
  _timeSettings?: TimeSettings;
}

interface WeeklyPieSegment {
  id: string;
  name: string;
  value: number;
  color: string;
  sessionCount: number;
  percentage: number;
  tag?: Tag;
}

const formatDurationLabel = (mins: number) => {
  const totalMin = Math.max(0, Math.round(mins));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const isHourInPeriod = (hour: number, start: number, end: number) => {
  if (start <= end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
};

const CustomWeeklyPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: WeeklyPieSegment = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-slate-900 border border-slate-700/80 px-3 py-2.5 rounded-xl shadow-xl text-xs space-y-1 z-50 min-w-[145px]">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: item.color }}
        />
        <span className="font-bold text-slate-100 truncate">{item.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-slate-800/80">
        <span className="text-slate-400 font-medium">Duration</span>
        <span className="font-mono font-bold text-indigo-400">
          {formatDurationLabel(item.value)} ({item.percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-[10px]">
        <span className="text-slate-500">Sessions</span>
        <span className="font-mono font-bold text-amber-400">{item.sessionCount}</span>
      </div>
    </div>
  );
};

export const WeeklyPieChart: React.FC<Props> = ({
  weekSessions,
  mode,
  onChangeMode,
  tags = [],
  dungeons = [],
  majorDungeons = [],
  includeRestTimeInTasks = true,
  _timeSettings,
}) => {
  const [localMode, setLocalMode] = useState<'time_of_day' | 'day_of_week' | 'tags'>(
    mode || 'time_of_day'
  );

  useEffect(() => {
    if (mode) setLocalMode(mode);
  }, [mode]);

  const activeMode = onChangeMode ? mode : localMode;

  const handleSelectMode = (nextMode: 'time_of_day' | 'day_of_week' | 'tags') => {
    setLocalMode(nextMode);
    onChangeMode?.(nextMode);
  };

  const { chartData, totalFocusMinutes, totalAttributedMinutes, activeSessionCount } = useMemo(() => {
    const sessions = weekSessions || [];

    let uniqueFocusMinsRaw = 0;
    let validSessions = 0;
    sessions.forEach((s) => {
      const mins = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
      if (mins > 0) {
        uniqueFocusMinsRaw += mins;
        validSessions += 1;
      }
    });

    let rawSegments: Array<{
      id: string;
      name: string;
      value: number;
      color: string;
      sessionCount: number;
      tag?: Tag;
    }> = [];

    if (activeMode === 'tags') {
      const grouped = new Map<
        string,
        { id: string; name: string; value: number; sessionCount: number; color: string; tag?: Tag }
      >();

      sessions.forEach((s) => {
        const mins = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
        if (mins <= 0) return;
        const effTagIds = getSessionEffectiveTagIds(s, dungeons, majorDungeons).filter((id) =>
          tags.some((t) => t.id === id)
        );
        if (effTagIds.length === 0) {
          const prev = grouped.get('__untagged__') || {
            id: '__untagged__',
            name: 'Untagged',
            value: 0,
            sessionCount: 0,
            color: '#64748b',
          };
          prev.value += mins;
          prev.sessionCount += 1;
          grouped.set('__untagged__', prev);
        } else {
          effTagIds.forEach((tId) => {
            const tagObj = tags.find((t) => t.id === tId);
            if (!tagObj) return;
            const style = TAG_COLOR_STYLES[tagObj.color] || TAG_COLOR_STYLES.indigo;
            const prev = grouped.get(tagObj.id) || {
              id: tagObj.id,
              name: tagObj.name,
              value: 0,
              sessionCount: 0,
              color: style.hex,
              tag: tagObj,
            };
            prev.value += mins;
            prev.sessionCount += 1;
            grouped.set(tagObj.id, prev);
          });
        }
      });

      rawSegments = Array.from(grouped.values())
        .filter((d) => d.value > 0)
        .sort((a, b) => {
          if (a.id === '__untagged__' && b.id !== '__untagged__') return 1;
          if (b.id === '__untagged__' && a.id !== '__untagged__') return -1;
          return b.value - a.value;
        });
    } else if (activeMode === 'day_of_week') {
      // Monday-first order matching Weekly Bar Chart and Heatmap
      const orderedDays: Array<{ key: string; dayIndex: number; color: string }> = [
        { key: 'Mon', dayIndex: 1, color: '#6366f1' },
        { key: 'Tue', dayIndex: 2, color: '#10b981' },
        { key: 'Wed', dayIndex: 3, color: '#f59e0b' },
        { key: 'Thu', dayIndex: 4, color: '#06b6d4' },
        { key: 'Fri', dayIndex: 5, color: '#ec4899' },
        { key: 'Sat', dayIndex: 6, color: '#8b5cf6' },
        { key: 'Sun', dayIndex: 0, color: '#ef4444' },
      ];

      const grouped = new Map<number, { value: number; sessionCount: number }>();
      sessions.forEach((s) => {
        const mins = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
        if (mins <= 0) return;
        const d = (s as any).assignedDate ? new Date((s as any).assignedDate) : new Date(s.timestamp);
        const dayIdx = getDay(d);
        const prev = grouped.get(dayIdx) || { value: 0, sessionCount: 0 };
        prev.value += mins;
        prev.sessionCount += 1;
        grouped.set(dayIdx, prev);
      });

      rawSegments = orderedDays
        .map((day) => {
          const stat = grouped.get(day.dayIndex);
          return {
            id: day.key,
            name: day.key,
            value: stat?.value || 0,
            sessionCount: stat?.sessionCount || 0,
            color: day.color,
          };
        })
        .filter((d) => d.value > 0);
    } else {
      // 'time_of_day' (Morning / Afternoon / Night / Other) matching Weekly Bar Chart
      const ts = _timeSettings || {
        morning: { start: 8, end: 12 },
        afternoon: { start: 14, end: 18 },
        night: { start: 20, end: 24 },
      };

      const periodMeta: Array<{
        key: 'Morning' | 'Afternoon' | 'Night' | 'Other';
        color: string;
      }> = [
        { key: 'Morning', color: '#fbbf24' },
        { key: 'Afternoon', color: '#fb923c' },
        { key: 'Night', color: '#818cf8' },
        { key: 'Other', color: '#94a3b8' },
      ];

      const grouped: Record<
        'Morning' | 'Afternoon' | 'Night' | 'Other',
        { value: number; sessionCount: number }
      > = {
        Morning: { value: 0, sessionCount: 0 },
        Afternoon: { value: 0, sessionCount: 0 },
        Night: { value: 0, sessionCount: 0 },
        Other: { value: 0, sessionCount: 0 },
      };

      sessions.forEach((s) => {
        const duration = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
        if (duration <= 0) return;

        let bucket: 'Morning' | 'Afternoon' | 'Night' | 'Other' = 'Other';
        if (s.period) {
          const p = s.period.toLowerCase();
          if (p.includes('morning')) bucket = 'Morning';
          else if (p.includes('afternoon')) bucket = 'Afternoon';
          else if (p.includes('night')) bucket = 'Night';
          else bucket = 'Other';
        } else {
          const h = new Date(s.timestamp).getHours();
          if (isHourInPeriod(h, ts.morning.start, ts.morning.end)) bucket = 'Morning';
          else if (isHourInPeriod(h, ts.afternoon.start, ts.afternoon.end)) bucket = 'Afternoon';
          else if (isHourInPeriod(h, ts.night.start, ts.night.end)) bucket = 'Night';
          else bucket = 'Other';
        }

        grouped[bucket].value += duration;
        grouped[bucket].sessionCount += 1;
      });

      rawSegments = periodMeta
        .map((p) => ({
          id: p.key,
          name: p.key,
          value: grouped[p.key].value,
          sessionCount: grouped[p.key].sessionCount,
          color: p.color,
        }))
        .filter((d) => d.value > 0);
    }

    const totalAttrRaw = rawSegments.reduce((sum, item) => sum + item.value, 0);

    const formattedSegments: WeeklyPieSegment[] = rawSegments.map((seg) => ({
      id: seg.id,
      name: seg.name,
      value: Math.round(seg.value),
      color: seg.color,
      sessionCount: seg.sessionCount,
      percentage: totalAttrRaw > 0 ? (seg.value / totalAttrRaw) * 100 : 0,
      tag: seg.tag,
    }));

    return {
      chartData: formattedSegments,
      totalFocusMinutes: Math.round(uniqueFocusMinsRaw),
      totalAttributedMinutes: Math.round(totalAttrRaw),
      activeSessionCount: validSessions,
    };
  }, [weekSessions, activeMode, tags, dungeons, majorDungeons, includeRestTimeInTasks, _timeSettings]);

  const hasRecords = totalFocusMinutes > 0 && chartData.length > 0;

  return (
    <div className="pt-4 border-t border-slate-800/50 space-y-4">
      {/* Header & Inline Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <PieChartIcon className="text-indigo-400" size={16} />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Weekly Breakdown
          </span>
        </div>

        <div className="flex bg-slate-800/60 p-1 rounded-lg self-start sm:self-auto">
          {([
            { id: 'time_of_day', label: 'Period' },
            { id: 'day_of_week', label: 'Weekday' },
            { id: 'tags', label: 'By Tag' },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectMode(opt.id)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer whitespace-nowrap',
                activeMode === opt.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!hasRecords ? (
        <div className="h-48 rounded-2xl bg-slate-950/30 border border-slate-800/50 flex items-center justify-center text-slate-500 text-sm font-medium italic pr-1">
          No focus records this week.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center bg-slate-950/30 border border-slate-800/50 rounded-2xl p-3 sm:p-4">
          {/* Left: Donut Chart with Center Summary */}
          <div className="md:col-span-5 relative h-52 sm:h-56 flex items-center justify-center md:border-r md:border-slate-800/50 md:pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomWeeklyPieTooltip />}
                  wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Hole Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {activeMode === 'tags' ? 'Attributed' : 'Weekly Focus'}
              </span>
              <span className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                <DurationText
                  minutes={activeMode === 'tags' ? totalAttributedMinutes : totalFocusMinutes}
                  digitClassName="font-black"
                />
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                {activeSessionCount} {activeSessionCount === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          </div>

          {/* Right: Breakdown Ranking List */}
          <div className="md:col-span-7 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
              <span>
                {activeMode === 'tags'
                  ? `Tags (${chartData.length})`
                  : activeMode === 'day_of_week'
                  ? `Active Days (${chartData.length})`
                  : `Periods (${chartData.length})`}
              </span>
              <span>Sessions · Share · Time</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {chartData.map((row) => (
                <div
                  key={row.id}
                  className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/60 hover:border-slate-700/70 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {row.tag ? (
                        <TagBadge tag={row.tag} size="xs" />
                      ) : activeMode === 'tags' && row.id === '__untagged__' ? (
                        <span className="inline-flex items-center gap-1.5 h-5 px-2 rounded-md border border-slate-700 bg-slate-800/60 text-slate-400 text-[10px] font-bold leading-none shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Untagged</span>
                        </span>
                      ) : (
                        <>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.color }}
                          />
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {row.name}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono shrink-0">
                      <span
                        className="flex items-center gap-1 text-slate-400 text-[11px]"
                        title="Sessions"
                      >
                        <Layers size={11} className="text-amber-400/80" />
                        <span>{row.sessionCount}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold w-11 text-right">
                        {row.percentage.toFixed(1)}%
                      </span>
                      <span className="font-bold text-slate-100 min-w-[48px] text-right">
                        <DurationText minutes={row.value} digitClassName="font-bold" />
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(3, Math.min(100, row.percentage))}%`,
                        backgroundColor: row.color,
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
