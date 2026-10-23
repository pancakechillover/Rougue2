import React, { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Clock, MapPin, RotateCcw, TrendingUp } from 'lucide-react';
import { AppState } from '../../../types';
import { cn, getSessionEffectiveMinutes, getSettlementDay } from '../../../lib/utils';
import { getWorkstationTotalMinutes } from '../../../lib/workstationUtils';
import { LocationIcon, resolveLocationIconOption } from '../../workstation/LocationIcon';
import { DatePicker } from '../../common/DatePicker';
import { DurationText } from '../../common/DurationText';

interface StatsWorkstationSectionProps {
  state: AppState;
  dateIndicators?: Record<string, { highlight?: boolean; star?: boolean }>;
}

const HOURS = 24;

/** Convert an interval to left/width percentages of a 24h timeline. */
function intervalToSegment(startISO: string, endISO: string) {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  let startH = start.getHours() + start.getMinutes() / 60;
  let endH = end.getHours() + end.getMinutes() / 60;
  if (endH <= startH) endH = HOURS;
  startH = Math.max(0, Math.min(HOURS, startH));
  endH = Math.max(startH + 0.02, Math.min(HOURS, endH));
  return {
    left: (startH / HOURS) * 100,
    width: ((endH - startH) / HOURS) * 100,
  };
}

/**
 * Workstation presence card for the Record page.
 *
 * NOT CURRENTLY MOUNTED — the design was rejected as not fitting the page.
 * Kept as a reference implementation; re-mount it from Stats.tsx if the
 * layout is revisited. See ROADMAP.md → "Workstation display".
 *
 * Read-only: punching happens from the top-bar chip.
 */
export const StatsWorkstationSection: React.FC<StatsWorkstationSectionProps> = ({
  state,
  dateIndicators,
}) => {
  const todayStr = getSettlementDay(new Date(), state.timeSettings);
  const [dateStr, setDateStr] = useState<string>(todayStr);

  const intervals = useMemo(() => {
    const list = state.workstationLogs?.[dateStr] || [];
    return [...list].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [state.workstationLogs, dateStr]);

  // Include a running session so the timeline shows it live
  const active = state.activeWorkstationSession;
  const segments = useMemo(() => {
    const list = intervals.map((item) => ({
      id: item.id,
      location: item.location || 'Unknown',
      startTime: item.startTime,
      endTime: item.endTime,
    }));
    if (active?.startTime) {
      const sd = getSettlementDay(parseISO(active.startTime), state.timeSettings);
      if (sd === dateStr) {
        list.push({
          id: `${active.id}-live`,
          location: active.location || 'Unknown',
          startTime: active.startTime,
          endTime: new Date().toISOString(),
        });
      }
    }
    return list;
  }, [intervals, active, state.timeSettings, dateStr]);

  const onDeskMinutes = getWorkstationTotalMinutes(dateStr, state, new Date());

  const focusMinutes = useMemo(
    () =>
      (state.history || [])
        .filter((s) => getSettlementDay(new Date(s.timestamp), state.timeSettings) === dateStr)
        .reduce(
          (acc, s) => acc + getSessionEffectiveMinutes(s, state.includeRestTimeInTasks ?? false),
          0
        ),
    [state.history, state.timeSettings, state.includeRestTimeInTasks, dateStr]
  );

  const conversion =
    onDeskMinutes > 0 ? Math.min(100, Math.round((focusMinutes / onDeskMinutes) * 100)) : 0;

  const distribution = useMemo(() => {
    const map = new Map<string, number>();
    intervals.forEach((i) => {
      const loc = i.location || 'Unknown';
      map.set(loc, (map.get(loc) || 0) + (i.durationMinutes || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [intervals]);

  const maxLocationMinutes = distribution[0]?.[1] || 1;

  const goDay = (delta: number) => {
    const d = parseISO(dateStr);
    if (Number.isNaN(d.getTime())) return;
    setDateStr(format(addDays(d, delta), 'yyyy-MM-dd'));
  };

  const locationBg = (loc: string) =>
    resolveLocationIconOption(loc, state.workstationLocationIcons).colorClass.replace('text-', 'bg-');

  return (
    <div id="workstation-section" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-2">
          <MapPin className="text-emerald-400" size={20} />
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-widest">Workstation</h3>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-slate-800/50 rounded-lg p-0.5 sm:p-1 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => goDay(-1)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            title="Previous day"
          >
            <ChevronLeft size={16} />
          </button>
          <DatePicker
            value={dateStr}
            onChange={(val) => val && setDateStr(val)}
            indicators={dateIndicators}
            className="inline-block whitespace-nowrap cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 hover:bg-slate-700/60 rounded transition-colors text-white font-bold">
              <Calendar size={13} className="text-indigo-400" />
              <span className="text-[10px] sm:text-xs">
                {dateStr === todayStr ? 'Today' : format(parseISO(dateStr), 'MMM d, yyyy')}
              </span>
            </div>
          </DatePicker>
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
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">
            On desk
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-indigo-400 min-w-0">
            <Clock size={11} className="shrink-0" />
            <span className="text-[10px] sm:text-lg font-black font-mono truncate">
              <DurationText minutes={onDeskMinutes} digitClassName="font-black" />
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">
            Focus
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 min-w-0">
            <TrendingUp size={11} className="shrink-0" />
            <span className="text-[10px] sm:text-lg font-black font-mono truncate">
              <DurationText minutes={focusMinutes} digitClassName="font-black" />
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center text-center min-w-0">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-1.5 line-clamp-1 break-all w-full truncate">
            Conversion
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-amber-400 min-w-0">
            <ArrowRight size={11} className="shrink-0" />
            <span className="text-[10px] sm:text-lg font-black font-mono truncate">
              {conversion}
              <span className="font-medium text-[0.82em] opacity-65 ml-0.5">%</span>
            </span>
          </div>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center">
          <p className="text-xs font-bold text-slate-500">No desk sessions recorded</p>
          <p className="text-[11px] text-slate-600 mt-1">
            Check in from the top-bar icon to start tracking presence
          </p>
        </div>
      ) : (
        <>
          <div>
            <div className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-3">
              Presence Timeline
            </div>
            <div className="relative">
              <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                {segments.map((item) => {
                  const seg = intervalToSegment(item.startTime, item.endTime);
                  if (!seg) return null;
                  return (
                    <div
                      key={item.id}
                      className={cn('absolute top-0 h-full rounded-full', locationBg(item.location))}
                      style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                      title={`${item.location || 'Unknown'} · ${format(parseISO(item.startTime), 'HH:mm')} – ${format(parseISO(item.endTime), 'HH:mm')}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-600 tabular-nums">
                <span>00h</span>
                <span>06h</span>
                <span>12h</span>
                <span>18h</span>
                <span>24h</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider sm:tracking-widest mb-3">
              By location
            </div>
            <div className="space-y-2.5">
              {distribution.map(([loc, minutes]) => {
                const pct = Math.max(2, Math.round((minutes / maxLocationMinutes) * 100));
                return (
                  <div key={loc} className="flex items-center gap-3">
                    <span className="w-20 sm:w-24 shrink-0 text-[11px] font-bold text-slate-300 truncate flex items-center gap-1.5">
                      <LocationIcon
                        locName={loc}
                        customIcons={state.workstationLocationIcons}
                        size={12}
                      />
                      {loc}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', locationBg(loc))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[11px] text-slate-400 tabular-nums">
                      <DurationText minutes={minutes} digitClassName="font-bold" />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
