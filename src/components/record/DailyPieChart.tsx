import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, Layers } from 'lucide-react';
import { StudySession, Dungeon, MajorDungeon, TimeSettings, Tag } from '../../types';
import { addMinutes, differenceInMinutes, format, startOfDay } from 'date-fns';
import { cn, getSessionEffectiveMinutes } from '../../lib/utils';
import { getSessionEffectiveTagIds, TAG_COLOR_STYLES } from '../../lib/tags';
import { TagBadge } from '../common/TagBadge';
import { DurationText } from '../common/DurationText';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#84cc16'];

interface Props {
  date: Date;
  sessions: StudySession[];
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  tags?: Tag[];
  mode: '24h' | 'compact' | 'tags';
  onChangeMode?: (mode: '24h' | 'compact' | 'tags') => void;
  includeRestTimeInTasks?: boolean;
  timeSettings?: TimeSettings;
}

interface PieSegment {
  name: string;
  realName: string;
  value: number;
  color: string;
  isIdle?: boolean;
  sessionCount?: number;
  clockRange?: string;
  percentage?: number;
}

interface BreakdownRow {
  id: string;
  name: string;
  color: string;
  minutes: number;
  percentage: number;
  sessionCount: number;
  tag?: Tag;
}

const formatDurationLabel = (mins: number) => {
  const totalMin = Math.max(0, Math.round(mins));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const CustomDailyPieTooltip = ({ active, payload, activeMode }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: PieSegment = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-slate-900 border border-slate-700/80 px-3 py-2.5 rounded-xl shadow-xl text-xs space-y-1 z-50 min-w-[145px]">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: item.isIdle ? '#475569' : item.color }}
        />
        <span className="font-bold text-slate-100 truncate">
          {item.isIdle ? 'Idle / Unscheduled' : item.realName || item.name}
        </span>
      </div>
      {item.clockRange && (
        <div className="text-[10px] font-mono text-slate-400">
          Window: <span className="text-slate-200 font-bold">{item.clockRange}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-slate-800/80">
        <span className="text-slate-400 font-medium">Duration</span>
        <span className="font-mono font-bold text-indigo-400">
          {formatDurationLabel(item.value)}
          {typeof item.percentage === 'number' && !item.isIdle
            ? ` (${item.percentage.toFixed(1)}%)`
            : activeMode === '24h'
            ? ` (${((item.value / 1440) * 100).toFixed(1)}%)`
            : ''}
        </span>
      </div>
      {!item.isIdle && typeof item.sessionCount === 'number' && item.sessionCount > 0 && (
        <div className="flex items-center justify-between gap-4 text-[10px]">
          <span className="text-slate-500">Sessions</span>
          <span className="font-mono font-bold text-amber-400">{item.sessionCount}</span>
        </div>
      )}
    </div>
  );
};

export const DailyPieChart: React.FC<Props> = ({
  date,
  sessions,
  dungeons,
  majorDungeons,
  tags = [],
  mode,
  onChangeMode,
  includeRestTimeInTasks = true,
  timeSettings,
}) => {
  const [localMode, setLocalMode] = useState<'24h' | 'compact' | 'tags'>(mode || 'compact');

  useEffect(() => {
    if (mode) setLocalMode(mode);
  }, [mode]);

  const activeMode = onChangeMode ? mode : localMode;

  const handleSelectMode = (nextMode: '24h' | 'compact' | 'tags') => {
    setLocalMode(nextMode);
    onChangeMode?.(nextMode);
  };

  const {
    chartData,
    breakdownRows,
    totalFocusMinutes,
    totalAttributedMinutes,
    activeSessionCount,
  } = useMemo(() => {
    const daySessions = sessions || [];

    const getDungeonName = (id: string) => {
      if (id === 'free_study') return 'Free Study';
      const d = dungeons.find((item) => item.id === id);
      if (d) return d.name;
      const m = majorDungeons.find((item) => item.id === id);
      if (m) return m.name;
      return 'Free Study';
    };

    const uniqueNames = new Set<string>();
    const getColor = (name: string) => {
      if (!uniqueNames.has(name)) uniqueNames.add(name);
      const arr = Array.from(uniqueNames);
      return COLORS[arr.indexOf(name) % COLORS.length];
    };

    let uniqueFocusMinsRaw = 0;
    let validSessionCount = 0;
    daySessions.forEach((s) => {
      const mins = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
      if (mins > 0) {
        uniqueFocusMinsRaw += mins;
        validSessionCount += 1;
      }
    });

    const segments: PieSegment[] = [];
    const rows: BreakdownRow[] = [];

    if (activeMode === 'tags') {
      const grouped = new Map<
        string,
        { id: string; name: string; value: number; sessionCount: number; color: string; tag?: Tag }
      >();

      daySessions.forEach((s) => {
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

      const sortedEntries = Array.from(grouped.values())
        .filter((d) => d.value > 0)
        .sort((a, b) => {
          if (a.id === '__untagged__' && b.id !== '__untagged__') return 1;
          if (b.id === '__untagged__' && a.id !== '__untagged__') return -1;
          return b.value - a.value;
        });

      const totalAttr = sortedEntries.reduce((sum, item) => sum + item.value, 0);

      sortedEntries.forEach((entry) => {
        const pct = totalAttr > 0 ? (entry.value / totalAttr) * 100 : 0;
        segments.push({
          name: entry.name,
          realName: entry.name,
          value: Math.round(entry.value),
          color: entry.color,
          sessionCount: entry.sessionCount,
          percentage: pct,
        });
        rows.push({
          id: entry.id,
          name: entry.name,
          color: entry.color,
          minutes: Math.round(entry.value),
          percentage: pct,
          sessionCount: entry.sessionCount,
          tag: entry.tag,
        });
      });

      return {
        chartData: segments,
        breakdownRows: rows,
        totalFocusMinutes: Math.round(uniqueFocusMinsRaw),
        totalAttributedMinutes: Math.round(totalAttr),
        activeSessionCount: validSessionCount,
      };
    }

    // Build task breakdown (used by both 'compact' and '24h' modes)
    const taskGrouped = new Map<string, { value: number; sessionCount: number; color: string }>();
    daySessions.forEach((s) => {
      const mins = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
      if (mins <= 0) return;
      const rName = getDungeonName(s.dungeonId);
      const color = getColor(rName);
      const prev = taskGrouped.get(rName) || { value: 0, sessionCount: 0, color };
      prev.value += mins;
      prev.sessionCount += 1;
      taskGrouped.set(rName, prev);
    });

    const sortedTasks = Array.from(taskGrouped.entries())
      .filter(([, info]) => info.value > 0)
      .sort((a, b) => b[1].value - a[1].value);

    const taskTotalMins = sortedTasks.reduce((sum, [, info]) => sum + info.value, 0);

    sortedTasks.forEach(([name, info]) => {
      const pct = taskTotalMins > 0 ? (info.value / taskTotalMins) * 100 : 0;
      rows.push({
        id: name,
        name,
        color: info.color,
        minutes: Math.round(info.value),
        percentage: pct,
        sessionCount: info.sessionCount,
      });
    });

    if (activeMode === 'compact') {
      sortedTasks.forEach(([name, info]) => {
        const pct = taskTotalMins > 0 ? (info.value / taskTotalMins) * 100 : 0;
        segments.push({
          name,
          realName: name,
          value: Math.round(info.value),
          color: info.color,
          sessionCount: info.sessionCount,
          percentage: pct,
        });
      });
    } else {
      // '24h' Clock Distribution mode
      const ts = timeSettings || {
        morning: { start: 8, end: 12 },
        afternoon: { start: 14, end: 18 },
        night: { start: 20, end: 24 },
      };
      const dayStart = startOfDay(date);
      if (ts.night.start > ts.night.end) {
        dayStart.setHours(ts.night.end, 0, 0, 0);
      }

      const sortedSessions = [...daySessions].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let currentMinute = 0;

      sortedSessions.forEach((s, idx) => {
        const duration = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
        if (duration <= 0) return;

        const stDate = new Date(s.timestamp);
        let rawEndMin = differenceInMinutes(stDate, dayStart);
        // Handle sessions whose timestamp falls on the same time-of-day window if date offset occurred
        if (rawEndMin < 0) {
          rawEndMin = ((rawEndMin % 1440) + 1440) % 1440;
        }
        const rawStartMin = rawEndMin - duration;

        const clampedStart = Math.max(currentMinute, Math.min(1440, rawStartMin));
        const clampedEnd = Math.max(clampedStart, Math.min(1440, rawEndMin));

        if (clampedStart > currentMinute) {
          const idleStartClock = format(addMinutes(dayStart, currentMinute), 'HH:mm');
          const idleEndClock = format(addMinutes(dayStart, clampedStart), 'HH:mm');
          segments.push({
            name: `Idle-${currentMinute}`,
            realName: 'Idle',
            value: clampedStart - currentMinute,
            isIdle: true,
            color: '#1e293b',
            clockRange: `${idleStartClock} - ${idleEndClock}`,
          });
        }

        const activeSliceMins = clampedEnd - clampedStart;
        if (activeSliceMins > 0) {
          const rName = getDungeonName(s.dungeonId);
          const sliceStartClock = format(addMinutes(dayStart, clampedStart), 'HH:mm');
          const sliceEndClock = format(addMinutes(dayStart, clampedEnd), 'HH:mm');
          segments.push({
            name: `${rName}-${idx}-${clampedStart}`,
            realName: rName,
            value: activeSliceMins,
            isIdle: false,
            color: getColor(rName),
            sessionCount: 1,
            clockRange: `${sliceStartClock} - ${sliceEndClock}`,
            percentage: (activeSliceMins / 1440) * 100,
          });
          currentMinute = clampedEnd;
        }
      });

      if (currentMinute < 1440) {
        const idleStartClock = format(addMinutes(dayStart, currentMinute), 'HH:mm');
        const idleEndClock = format(addMinutes(dayStart, 1440), 'HH:mm');
        segments.push({
          name: `Idle-${currentMinute}`,
          realName: 'Idle',
          value: 1440 - currentMinute,
          isIdle: true,
          color: '#1e293b',
          clockRange: `${idleStartClock} - ${idleEndClock}`,
        });
      }
    }

    return {
      chartData: segments,
      breakdownRows: rows,
      totalFocusMinutes: Math.round(uniqueFocusMinsRaw),
      totalAttributedMinutes: Math.round(taskTotalMins),
      activeSessionCount: validSessionCount,
    };
  }, [sessions, dungeons, majorDungeons, tags, activeMode, includeRestTimeInTasks, timeSettings, date]);

  const hasRecords = totalFocusMinutes > 0 && breakdownRows.length > 0;
  const focusCoveragePct = Math.min(100, (totalFocusMinutes / 1440) * 100);

  return (
    <div className="pt-4 border-t border-slate-800/50 space-y-4">
      {/* Header & Inline Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <PieChartIcon className="text-indigo-400" size={16} />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Daily Breakdown
          </span>
        </div>

        <div className="flex bg-slate-800/60 p-1 rounded-lg self-start sm:self-auto">
          {([
            { id: 'compact', label: 'Tasks' },
            { id: '24h', label: '24h Clock' },
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
          No focus records on this day.
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
                  innerRadius={activeMode === '24h' ? 62 : 58}
                  outerRadius={activeMode === '24h' ? 84 : 82}
                  paddingAngle={activeMode !== '24h' ? 2 : 0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={activeMode === '24h' && entry.isIdle ? 0.22 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomDailyPieTooltip activeMode={activeMode} />}
                  wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Hole Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {activeMode === '24h'
                  ? '24h Active'
                  : activeMode === 'tags'
                  ? 'Attributed'
                  : 'Total Focus'}
              </span>
              <span className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {activeMode === '24h' ? (
                  `${focusCoveragePct.toFixed(1)}%`
                ) : (
                  <DurationText
                    minutes={
                      activeMode === 'tags' ? totalAttributedMinutes : totalFocusMinutes
                    }
                    digitClassName="font-black"
                  />
                )}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                {activeMode === '24h' ? (
                  <DurationText minutes={totalFocusMinutes} />
                ) : (
                  `${activeSessionCount} ${activeSessionCount === 1 ? 'session' : 'sessions'}`
                )}
              </span>
            </div>
          </div>

          {/* Right: Breakdown Ranking List */}
          <div className="md:col-span-7 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
              <span>
                {activeMode === 'tags'
                  ? `Tags (${breakdownRows.length})`
                  : `Tasks (${breakdownRows.length})`}
              </span>
              <span>Sessions · Share · Time</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {breakdownRows.map((row) => (
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
                        <DurationText minutes={row.minutes} digitClassName="font-bold" />
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
