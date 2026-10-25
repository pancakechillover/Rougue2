import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, differenceInMinutes, format, isValid, parseISO, subMinutes } from 'date-fns';
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { AppState, Dungeon, MajorDungeon, StudySession, WorkstationInterval } from '../../../types';
import { cn, formatDuration, getSessionEffectiveMinutes, getSettlementDay } from '../../../lib/utils';
import {
  getActiveSessionDurationFormatted,
  getMaxWorkstationSessionMinutes,
  getWorkstationLocations,
  getWorkstationTotalMinutes,
} from '../../../lib/workstationUtils';
import { LocationIcon, resolveLocationIconOption } from '../../workstation/LocationIcon';
import { DatePicker } from '../../common/DatePicker';
import { DurationText } from '../../common/DurationText';
import { useWorkstation } from '../../../hooks/useWorkstation';

interface StatsWorkstationSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (forceOverwrite?: boolean, specificState?: AppState, syncMethod?: any) => void;
  dungeons?: Dungeon[];
  majorDungeons?: MajorDungeon[];
  dateIndicators?: Record<string, { highlight?: boolean; star?: boolean }>;
}

const HOURS = 24;

/** Maps Tailwind text color classes from LocationIcon to explicit SVG stroke Tailwind classes. */
function getStrokeClassForColorClass(colorClass: string): string {
  if (colorClass.includes('amber-500')) return 'stroke-amber-500';
  if (colorClass.includes('amber-400')) return 'stroke-amber-400';
  if (colorClass.includes('indigo-400')) return 'stroke-indigo-400';
  if (colorClass.includes('emerald-400')) return 'stroke-emerald-400';
  if (colorClass.includes('emerald-500')) return 'stroke-emerald-500';
  if (colorClass.includes('orange-400')) return 'stroke-orange-400';
  if (colorClass.includes('sky-400')) return 'stroke-sky-400';
  if (colorClass.includes('purple-400')) return 'stroke-purple-400';
  if (colorClass.includes('rose-400')) return 'stroke-rose-400';
  if (colorClass.includes('teal-400')) return 'stroke-teal-400';
  if (colorClass.includes('cyan-400')) return 'stroke-cyan-400';
  return 'stroke-indigo-400';
}

/** Converts polar coordinates (0 deg at 12 o'clock, clockwise) to Cartesian (x, y). */
function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

/** Builds an SVG path string for a circular arc from startAngle to endAngle (in degrees, clockwise). */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const clampedDiff = Math.max(1.8, Math.min(359.5, endAngle - startAngle));
  const actualEnd = startAngle + clampedDiff;
  const start = polarToCartesian(cx, cy, r, actualEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = clampedDiff <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

/** Converts a start/end ISO interval into [startDegrees, endDegrees] on a 24h clock. */
function intervalToAngles(startISO: string, endISO: string): { startDeg: number; endDeg: number } | null {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (!isValid(start) || !isValid(end)) return null;

  const startHours = start.getHours() + start.getMinutes() / 60;
  const durationMins = Math.max(2, differenceInMinutes(end, start));
  const durationHours = Math.min(HOURS, durationMins / 60);

  const startDeg = (startHours / HOURS) * 360;
  const endDeg = startDeg + (durationHours / HOURS) * 360;
  return { startDeg, endDeg };
}

type SelectedRingItem =
  | {
      type: 'presence';
      id: string;
      location: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      note?: string;
      isLive?: boolean;
      intervalRef?: WorkstationInterval;
      anchorAngle: number;
    }
  | {
      type: 'focus';
      id: string;
      questName: string;
      startTime: string;
      endTime: string;
      focusMinutes: number;
      totalMinutes: number;
      xpEarned: number;
      coinsEarned: number;
      distractionsTotal: number;
      note?: string;
      anchorAngle: number;
    };

export const StatsWorkstationSection: React.FC<StatsWorkstationSectionProps> = ({
  state,
  setState,
  syncToCloud,
  dungeons = [],
  majorDungeons = [],
  dateIndicators,
}) => {
  const todayStr = useMemo(
    () => getSettlementDay(new Date(), state.timeSettings),
    [state.timeSettings]
  );
  const [dateStr, setDateStr] = useState<string>(todayStr);
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedRingItem, setSelectedRingItem] = useState<SelectedRingItem | null>(null);

  // Modal state for Manual Add / Edit Interval
  const [isIntervalModalOpen, setIsIntervalModalOpen] = useState(false);
  const [editingIntervalId, setEditingIntervalId] = useState<string | null>(null);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formLocation, setFormLocation] = useState<string>('Home');
  const [formNote, setFormNote] = useState('');

  const locations = useMemo(() => getWorkstationLocations(state), [state.workstationLocations]);
  const defaultLoc = locations[0] || 'Home';
  const maxSessionMins = getMaxWorkstationSessionMinutes(state);

  const { active, punchOut, saveInterval, deleteInterval } = useWorkstation({
    state,
    setState,
    syncToCloud,
    defaultLocation: defaultLoc,
  });

  // Live tick while active session is running
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  // Clear popover when date changes
  useEffect(() => {
    setSelectedRingItem(null);
  }, [dateStr]);

  const intervals = useMemo(() => {
    const list = state.workstationLogs?.[dateStr] || [];
    return [...list].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [state.workstationLogs, dateStr]);

  const isActiveOnSelectedDate = Boolean(
    active?.startTime &&
      getSettlementDay(parseISO(active.startTime), state.timeSettings) === dateStr
  );

  // Outer Ring segments (Presence)
  const presenceSegments = useMemo(() => {
    const list: Array<{
      id: string;
      location: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      note?: string;
      isLive?: boolean;
      intervalRef?: WorkstationInterval;
    }> = intervals.map((item) => ({
      id: item.id,
      location: item.location || defaultLoc,
      startTime: item.startTime,
      endTime: item.endTime,
      durationMinutes: item.durationMinutes || 0,
      note: item.note,
      isLive: false,
      intervalRef: item,
    }));

    if (isActiveOnSelectedDate && active?.startTime) {
      const start = parseISO(active.startTime);
      const elapsedMins = isValid(start)
        ? Math.min(maxSessionMins, Math.max(1, differenceInMinutes(now, start)))
        : 1;
      list.push({
        id: `${active.id}-live`,
        location: active.location || defaultLoc,
        startTime: active.startTime,
        endTime: now.toISOString(),
        durationMinutes: elapsedMins,
        note: active.note,
        isLive: true,
      });
    }
    return list;
  }, [intervals, isActiveOnSelectedDate, active, now, defaultLoc, maxSessionMins]);

  // Inner Ring segments (Focus sessions for dateStr)
  const focusSegments = useMemo(() => {
    const sessions = (state.history || []).filter(
      (s: StudySession) => getSettlementDay(new Date(s.timestamp), state.timeSettings) === dateStr
    );

    return sessions
      .map((s) => {
        const end = new Date(s.timestamp);
        if (!isValid(end)) return null;
        const totalMins = Math.max(1, s.duration || s.focusDuration || 25);
        const effMins = getSessionEffectiveMinutes(s, state.includeRestTimeInTasks ?? false);
        const start = subMinutes(end, totalMins);

        const sub = dungeons.find((d) => d.id === s.dungeonId);
        const major = majorDungeons.find(
          (m) => m.id === s.dungeonId || (sub?.parentId && m.id === sub.parentId)
        );
        const questName = sub ? sub.name : major ? major.name : 'Free Focus';
        const dist = s.distractions;
        const distractionsTotal = dist
          ? (dist.internal || 0) + (dist.external || 0) + (dist.unavoidable || 0)
          : 0;

        return {
          id: s.id,
          questName,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          focusMinutes: effMins,
          totalMinutes: totalMins,
          xpEarned: s.xpEarned || 0,
          coinsEarned: s.coinsEarned || 0,
          distractionsTotal,
          note: s.note,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [state.history, state.timeSettings, state.includeRestTimeInTasks, dateStr, dungeons, majorDungeons]);

  const onDeskMinutes = getWorkstationTotalMinutes(dateStr, state, now);

  const focusMinutes = useMemo(
    () => focusSegments.reduce((acc, s) => acc + s.focusMinutes, 0),
    [focusSegments]
  );

  const conversion =
    onDeskMinutes > 0 ? Math.min(100, Math.round((focusMinutes / onDeskMinutes) * 100)) : 0;

  // Location distribution (including active session if on selected date)
  const distribution = useMemo(() => {
    const map = new Map<string, number>();
    presenceSegments.forEach((seg) => {
      const loc = seg.location || 'Unknown';
      map.set(loc, (map.get(loc) || 0) + (seg.durationMinutes || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [presenceSegments]);

  const maxLocationMinutes = distribution[0]?.[1] || 1;

  // Merge workstation indicators with passed dateIndicators for DatePicker
  const mergedDateIndicators = useMemo(() => {
    const map: Record<string, { highlight?: boolean; star?: boolean }> = {
      ...(dateIndicators || {}),
    };
    const logs = state.workstationLogs || {};
    Object.keys(logs).forEach((dKey) => {
      if (logs[dKey] && logs[dKey].length > 0) {
        map[dKey] = { ...(map[dKey] || {}), highlight: true };
      }
    });
    return map;
  }, [dateIndicators, state.workstationLogs]);

  const goDay = (delta: number) => {
    const d = parseISO(dateStr);
    if (Number.isNaN(d.getTime())) return;
    setDateStr(format(addDays(d, delta), 'yyyy-MM-dd'));
  };

  const locationBg = (loc: string) =>
    resolveLocationIconOption(loc, state.workstationLocationIcons).colorClass.replace('text-', 'bg-');

  const locationStrokeClass = (loc: string) =>
    getStrokeClassForColorClass(
      resolveLocationIconOption(loc, state.workstationLocationIcons).colorClass
    );

  const openAddIntervalModal = () => {
    setEditingIntervalId(null);
    setFormStartTime('09:00');
    setFormEndTime('12:00');
    setFormLocation(defaultLoc);
    setFormNote('');
    setIsIntervalModalOpen(true);
  };

  const openEditIntervalModal = (interval: WorkstationInterval) => {
    setEditingIntervalId(interval.id);
    if (interval.startTime) {
      try {
        setFormStartTime(format(parseISO(interval.startTime), 'HH:mm'));
      } catch {
        setFormStartTime('09:00');
      }
    }
    if (interval.endTime) {
      try {
        setFormEndTime(format(parseISO(interval.endTime), 'HH:mm'));
      } catch {
        setFormEndTime('12:00');
      }
    }
    setFormLocation(interval.location || defaultLoc);
    setFormNote(interval.note || '');
    setIsIntervalModalOpen(true);
  };

  const handleSaveIntervalForm = () => {
    const [startH, startM] = formStartTime.split(':').map(Number);
    const [endH, endM] = formEndTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return;

    const baseDate = parseISO(dateStr);
    const startDate = new Date(baseDate);
    startDate.setHours(startH, startM, 0, 0);

    const endDate = new Date(baseDate);
    endDate.setHours(endH, endM, 0, 0);

    let finalEndDate = endDate;
    if (endDate <= startDate) {
      finalEndDate = addDays(endDate, 1);
    }

    const durMins = Math.max(1, differenceInMinutes(finalEndDate, startDate));
    const finalLocation = formLocation.trim() || defaultLoc;

    saveInterval({
      dateStr,
      startTime: startDate.toISOString(),
      endTime: finalEndDate.toISOString(),
      durationMinutes: durMins,
      location: finalLocation,
      note: formNote.trim() || undefined,
      editingId: editingIntervalId,
    });

    setIsIntervalModalOpen(false);
    setEditingIntervalId(null);
    setSelectedRingItem(null);
  };

  // SVG Dual-Ring constants
  const CX = 120;
  const CY = 120;
  const OUTER_R = 92; // Outer ring: Workstation Presence
  const INNER_R = 68; // Inner ring: Focus Sessions

  // Compute floating popover anchor coordinates if a segment is selected
  const floatingAnchor = useMemo(() => {
    if (!selectedRingItem) return null;
    const r = selectedRingItem.type === 'presence' ? OUTER_R : INNER_R;
    const pt = polarToCartesian(CX, CY, r, selectedRingItem.anchorAngle);
    const pctX = (pt.x / 240) * 100;
    const pctY = (pt.y / 240) * 100;
    // Clamp horizontal center so the floating bubble never clips outside the card
    const clampedLeftPct = Math.max(24, Math.min(76, pctX));
    const placeAbove = pctY > 52;
    return {
      svgX: pt.x,
      svgY: pt.y,
      clampedLeftPct,
      placeAbove,
      pctY,
    };
  }, [selectedRingItem]);

  return (
    <div
      id="workstation-section"
      className="bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6 transition-all"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-2">
          <MapPin className="text-indigo-400" size={20} />
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest pr-1">
            Workstation
          </h3>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
          <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1 flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => goDay(-1)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
              title="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="relative flex items-center justify-center flex-1 sm:flex-none">
              <DatePicker
                value={dateStr}
                onChange={(val) => val && setDateStr(val)}
                indicators={mergedDateIndicators}
                className="text-[10px] sm:text-xs font-bold text-slate-300 w-full sm:w-auto text-center hover:text-indigo-400 transition-colors inline-block whitespace-nowrap cursor-pointer"
              >
                <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 hover:bg-slate-700/60 rounded transition-colors text-white font-bold">
                  <Calendar size={13} className="text-indigo-400" />
                  <span>
                    {dateStr === todayStr ? 'Today' : format(parseISO(dateStr), 'MMM d, yyyy')}
                  </span>
                </div>
              </DatePicker>
            </div>
            <button
              type="button"
              onClick={() => goDay(1)}
              disabled={dateStr >= todayStr}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30"
              title="Next day"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setDateStr(todayStr)}
              className="p-1 text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 rounded transition-colors"
              title="Return to Today"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={openAddIntervalModal}
            className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors ml-2 shrink-0"
            title="Add Desk Interval"
          >
            <Plus size={14} />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline">
              Add
            </span>
          </button>
        </div>
      </div>

      {/* Top 3 Vitals Strip (Unified with Daily/Weekly Overview Cards) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 truncate w-full">
            On Desk
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-amber-400 min-w-0">
            <Clock size={12} className="hidden sm:block shrink-0" />
            <span className="text-xs sm:text-lg font-black font-mono truncate">
              <DurationText minutes={onDeskMinutes} digitClassName="font-black" />
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 truncate w-full">
            Focus
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 min-w-0">
            <TrendingUp size={12} className="hidden sm:block shrink-0" />
            <span className="text-xs sm:text-lg font-black font-mono truncate">
              <DurationText minutes={focusMinutes} digitClassName="font-black" />
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 truncate w-full">
            Conversion
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-indigo-400 min-w-0">
            <ArrowRight size={12} className="hidden sm:block shrink-0" />
            <span className="text-xs sm:text-lg font-black font-mono truncate">
              {conversion}
              <span className="font-medium text-[0.82em] opacity-65 ml-0.5">%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Equal-Height 2-Column Layout on Wide Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2 border-t border-slate-800/50">
        {/* Left: 24h Interactive Dual-Ring Circular Clock */}
        <div
          className="lg:col-span-6 h-full flex flex-col items-center justify-between p-2 sm:p-3 relative lg:border-r lg:border-slate-800/50 lg:pr-6"
          onClick={() => setSelectedRingItem(null)}
        >
          <div className="w-full flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              24h Presence & Focus Ring
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Tap ring segments for details
            </span>
          </div>

          <div className="relative w-56 h-56 sm:w-64 sm:h-64 my-auto flex items-center justify-center">
            <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible select-none">
              {/* Hour ticks around the dial (theme-aware) */}
              {Array.from({ length: 24 }).map((_, hr) => {
                const deg = (hr / 24) * 360;
                const isMajor = hr % 6 === 0;
                const p1 = polarToCartesian(CX, CY, isMajor ? 104 : 105, deg);
                const p2 = polarToCartesian(CX, CY, isMajor ? 110 : 108, deg);
                return (
                  <line
                    key={hr}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    className={isMajor ? 'stroke-slate-400' : 'stroke-slate-700/75'}
                    strokeWidth={isMajor ? 1.8 : 1}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Cardinal Hour Labels (00h, 06h, 12h, 18h) */}
              {[
                { label: '00h', deg: 0, dx: 0, dy: -6 },
                { label: '06h', deg: 90, dx: 8, dy: 3 },
                { label: '12h', deg: 180, dx: 0, dy: 11 },
                { label: '18h', deg: 270, dx: -8, dy: 3 },
              ].map((tick) => {
                const pos = polarToCartesian(CX, CY, 113, tick.deg);
                return (
                  <text
                    key={tick.label}
                    x={pos.x + tick.dx}
                    y={pos.y + tick.dy}
                    textAnchor="middle"
                    className="fill-slate-500 text-[8px] font-mono font-bold"
                  >
                    {tick.label}
                  </text>
                );
              })}

              {/* Outer Track Background (Presence) - Theme-aware */}
              <circle
                cx={CX}
                cy={CY}
                r={OUTER_R}
                fill="none"
                className="stroke-slate-800/75"
                strokeWidth={13}
              />
              <circle
                cx={CX}
                cy={CY}
                r={OUTER_R}
                fill="none"
                className="stroke-indigo-500/10"
                strokeWidth={13}
              />

              {/* Inner Track Background (Focus) - Theme-aware */}
              <circle
                cx={CX}
                cy={CY}
                r={INNER_R}
                fill="none"
                className="stroke-slate-800/65"
                strokeWidth={11}
              />
              <circle
                cx={CX}
                cy={CY}
                r={INNER_R}
                fill="none"
                className="stroke-indigo-500/12"
                strokeWidth={11}
              />

              {/* Outer Ring Segments: Workstation Presence */}
              {presenceSegments.map((seg) => {
                const angles = intervalToAngles(seg.startTime, seg.endTime);
                if (!angles) return null;
                const d = describeArc(CX, CY, OUTER_R, angles.startDeg, angles.endDeg);
                const strokeClass = locationStrokeClass(seg.location);
                const isSelected =
                  selectedRingItem?.type === 'presence' && selectedRingItem.id === seg.id;
                const midAngle = (angles.startDeg + angles.endDeg) / 2;

                return (
                  <path
                    key={seg.id}
                    d={d}
                    fill="none"
                    strokeWidth={isSelected ? 16 : 13}
                    strokeLinecap="round"
                    className={cn(
                      'cursor-pointer transition-all duration-200 hover:opacity-90',
                      strokeClass,
                      seg.isLive && 'animate-pulse'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRingItem(
                        isSelected ? null : { type: 'presence', ...seg, anchorAngle: midAngle }
                      );
                    }}
                  />
                );
              })}

              {/* Inner Ring Segments: Study Focus Sessions */}
              {focusSegments.map((seg) => {
                const angles = intervalToAngles(seg.startTime, seg.endTime);
                if (!angles) return null;
                const d = describeArc(CX, CY, INNER_R, angles.startDeg, angles.endDeg);
                const isSelected =
                  selectedRingItem?.type === 'focus' && selectedRingItem.id === seg.id;
                const midAngle = (angles.startDeg + angles.endDeg) / 2;

                return (
                  <path
                    key={seg.id}
                    d={d}
                    fill="none"
                    strokeWidth={isSelected ? 14 : 11}
                    strokeLinecap="round"
                    className={cn(
                      'cursor-pointer transition-all duration-200 hover:opacity-90',
                      isSelected ? 'stroke-indigo-400' : 'stroke-indigo-500'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRingItem(
                        isSelected ? null : { type: 'focus', ...seg, anchorAngle: midAngle }
                      );
                    }}
                  />
                );
              })}

              {/* Active Selection Anchor Dot on the Ring */}
              {floatingAnchor && (
                <circle
                  cx={floatingAnchor.svgX}
                  cy={floatingAnchor.svgY}
                  r={4}
                  className="fill-white stroke-indigo-500 pointer-events-none"
                  strokeWidth={2}
                />
              )}
            </svg>

            {/* Center Hub Label */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-8"
              aria-hidden="true"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Conversion
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-100 leading-tight">
                {conversion}%
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                {formatDuration(focusMinutes)} / {formatDuration(onDeskMinutes)}
              </span>
            </div>

            {/* Floating Popover Bubble */}
            {selectedRingItem && floatingAnchor && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  left: `${floatingAnchor.clampedLeftPct}%`,
                  ...(floatingAnchor.placeAbove
                    ? { bottom: `${Math.max(12, 100 - floatingAnchor.pctY + 8)}%` }
                    : { top: `${Math.max(12, floatingAnchor.pctY + 8)}%` }),
                }}
                className="absolute z-30 -translate-x-1/2 w-64 sm:w-72 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl animate-popover-enter"
              >
                {selectedRingItem.type === 'presence' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0">
                          Presence
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-100 truncate">
                          <LocationIcon
                            locName={selectedRingItem.location}
                            customIcons={state.workstationLocationIcons}
                            size={13}
                          />
                          <span className="truncate">{selectedRingItem.location}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRingItem(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-bold">
                        {format(parseISO(selectedRingItem.startTime), 'HH:mm')} –{' '}
                        {selectedRingItem.isLive
                          ? 'Present'
                          : format(parseISO(selectedRingItem.endTime), 'HH:mm')}
                      </span>
                      <span className="text-indigo-400 font-black">
                        {formatDuration(selectedRingItem.durationMinutes)}
                      </span>
                    </div>

                    {selectedRingItem.note && (
                      <p className="text-[11px] text-slate-400 italic pr-1 line-clamp-2">
                        "{selectedRingItem.note}"
                      </p>
                    )}

                    {!selectedRingItem.isLive && selectedRingItem.intervalRef && (
                      <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => openEditIntervalModal(selectedRingItem.intervalRef!)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Edit3 size={11} className="text-indigo-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteInterval(dateStr, selectedRingItem.id);
                            setSelectedRingItem(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={11} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0">
                          Focus
                        </span>
                        <span className="text-xs font-bold text-slate-100 truncate flex items-center gap-1">
                          <Sparkles size={12} className="text-indigo-400 shrink-0" />
                          <span className="truncate">{selectedRingItem.questName}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRingItem(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-bold">
                        {format(parseISO(selectedRingItem.startTime), 'HH:mm')} –{' '}
                        {format(parseISO(selectedRingItem.endTime), 'HH:mm')}
                      </span>
                      <span className="text-indigo-400 font-black">
                        {formatDuration(selectedRingItem.focusMinutes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>
                        +{selectedRingItem.xpEarned} XP · +{selectedRingItem.coinsEarned} Gold
                      </span>
                      <span>Distractions: {selectedRingItem.distractionsTotal}</span>
                    </div>

                    {selectedRingItem.note && (
                      <p className="text-[11px] text-slate-400 italic pr-1 line-clamp-2">
                        "{selectedRingItem.note}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ring Legend */}
          <div className="flex items-center justify-center gap-5 text-[11px] font-bold text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-400 inline-block" />
              <span>Outer: Desk Presence ({presenceSegments.length})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span>Inner: Focus ({focusSegments.length})</span>
            </span>
          </div>
        </div>

        {/* Right: Location Distribution & Recorded Intervals List (Stretches to match Left column) */}
        <div className="lg:col-span-6 h-full flex flex-col gap-5 py-1">
          {/* Location Breakdown */}
          <div className="space-y-3 shrink-0 pb-4 border-b border-slate-800/50">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              By Location
            </div>
            {distribution.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No location presence recorded for this day.
              </p>
            ) : (
              <div className="space-y-2.5">
                {distribution.map(([loc, minutes]) => {
                  const pct = Math.max(4, Math.round((minutes / maxLocationMinutes) * 100));
                  const sharePct =
                    onDeskMinutes > 0 ? Math.round((minutes / onDeskMinutes) * 100) : 0;
                  return (
                    <div key={loc} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                        <LocationIcon
                          locName={loc}
                          customIcons={state.workstationLocationIcons}
                          size={13}
                        />
                        <span className="truncate">{loc}</span>
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', locationBg(loc))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-slate-300 tabular-nums font-mono">
                        <DurationText minutes={minutes} digitClassName="font-bold" />{' '}
                        <span className="text-[10px] text-slate-500">({sharePct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recorded Intervals List (with live session & manual Edit/Delete) */}
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Desk Log Intervals ({intervals.length + (isActiveOnSelectedDate ? 1 : 0)})
              </span>
            </div>

            {intervals.length === 0 && !isActiveOnSelectedDate ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800/80 px-4 py-6 text-center">
                <p className="text-xs font-bold text-slate-400">No desk sessions recorded</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Check in from the top-bar icon or click "+ Add" to log manually.
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {/* Active Running Session Row */}
                {isActiveOnSelectedDate && active?.startTime && (
                  <div className="p-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-black text-slate-100">
                            {format(parseISO(active.startTime), 'HH:mm')} – Present
                          </span>
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                            {getActiveSessionDurationFormatted(active.startTime, now, maxSessionMins).textClock}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1">
                            <LocationIcon
                              locName={active.location}
                              customIcons={state.workstationLocationIcons}
                              size={12}
                            />
                            <span>{active.location || defaultLoc}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => punchOut({ fallbackLocation: defaultLoc })}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                    >
                      <Square size={10} className="fill-current" />
                      <span>Check Out</span>
                    </button>
                  </div>
                )}

                {/* Completed Intervals */}
                {intervals.map((item, idx) => {
                  const startFormatted = item.startTime
                    ? format(parseISO(item.startTime), 'HH:mm')
                    : '--:--';
                  const endFormatted = item.endTime
                    ? format(parseISO(item.endTime), 'HH:mm')
                    : '--:--';

                  return (
                    <div
                      key={item.id || idx}
                      className="p-2.5 sm:p-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/70 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center font-mono text-[11px] font-bold text-indigo-400 shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-black text-slate-100">
                              {startFormatted} – {endFormatted}
                            </span>
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700/80">
                              {formatDuration(item.durationMinutes || 0)}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-1">
                              <LocationIcon
                                locName={item.location}
                                customIcons={state.workstationLocationIcons}
                                size={12}
                              />
                              <span className="truncate max-w-[100px]">{item.location || defaultLoc}</span>
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5 truncate pr-1">
                              "{item.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditIntervalModal(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit interval"
                        >
                          <Edit3 size={12} className="text-indigo-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteInterval(dateStr, item.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete interval"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Workstation Interval Portal Modal */}
      {isIntervalModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsIntervalModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-5 sm:p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-400" />
                  <span>
                    {editingIntervalId ? 'Edit Workstation Interval' : 'Add Workstation Record'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsIntervalModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-slate-400">
                      Start Time (24H)
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none focus:border-indigo-500 bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-slate-400">
                      End Time (24H)
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none focus:border-indigo-500 bg-slate-800 border-slate-700 text-slate-100"
                    />
                  </div>
                </div>

                {/* Real-time Calculated Duration Preview */}
                {(() => {
                  const [sH, sM] = formStartTime.split(':').map(Number);
                  const [eH, eM] = formEndTime.split(':').map(Number);
                  if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
                    let totalDiff = eH * 60 + eM - (sH * 60 + sM);
                    const isCrossDay = totalDiff <= 0;
                    if (isCrossDay) totalDiff += 24 * 60;
                    const durH = Math.floor(totalDiff / 60);
                    const durM = totalDiff % 60;
                    return (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
                        <span className="text-slate-400 font-sans font-semibold">
                          Calculated Duration:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-400">
                            {durH}h {durM}m
                          </span>
                          <span className="text-[11px] text-slate-500 font-sans">
                            ({formStartTime} → {formEndTime}
                            {isCrossDay ? ' +1 day' : ''})
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Location Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-slate-400">
                    Location
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {locations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setFormLocation(loc)}
                        className={cn(
                          'py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                          formLocation === loc
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        )}
                      >
                        <LocationIcon
                          locName={loc}
                          customIcons={state.workstationLocationIcons}
                          size={13}
                        />
                        <span className="truncate">{loc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-slate-400">
                    Note / Task Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thesis writing, Lab simulation"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-indigo-500 bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIntervalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIntervalForm}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                >
                  {editingIntervalId ? 'Save Changes' : 'Add Record'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

