import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer as TimerIcon, AlertTriangle, RefreshCw, Layers, Sunrise, Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ActivityTimeSettings = ({ state, setState }: { state: any, setState: (fn: (prev: any) => any) => void }) => {
  const timeSettings = state.timeSettings || {
    morning: { start: 8, end: 12 },
    afternoon: { start: 14, end: 18 },
    night: { start: 20, end: 24 }
  };

  const updateTime = (key: keyof typeof timeSettings, field: 'start' | 'end', val: number) => {
    setState(prev => ({
      ...prev,
      timeSettings: {
        ...timeSettings,
        [key]: { ...timeSettings[key], [field]: val }
      }
    }));
  };

  const checkOverlap = (p1: any, p2: any) => {
    if (!p1 || !p2) return false;
    const r1 = p1.start < p1.end ? [[p1.start, p1.end]] : [[p1.start, 24], [0, p1.end]];
    const r2 = p2.start < p2.end ? [[p2.start, p2.end]] : [[p2.start, 24], [0, p2.end]];
    for (const [s1, e1] of r1) {
      for (const [s2, e2] of r2) {
        if (Math.max(s1, s2) < Math.min(e1, e2)) return true;
      }
    }
    return false;
  };

  const overlaps = [
    { keys: ['morning', 'afternoon'], active: checkOverlap(timeSettings.morning, timeSettings.afternoon) },
    { keys: ['morning', 'night'], active: checkOverlap(timeSettings.morning, timeSettings.night) },
    { keys: ['afternoon', 'night'], active: checkOverlap(timeSettings.afternoon, timeSettings.night) }
  ].filter(o => o.active);

  // Determine timeline extension (the shift) to keep a 24h scale
  let maxExtension = 0;
  Object.values(timeSettings).forEach((s: any) => {
    if (s.start > s.end) maxExtension = Math.max(maxExtension, s.end);
  });

  const timelineStart = maxExtension;
  const timelineDuration = 24; 

  const getPos = (hour: number) => {
    // If hour < timelineStart, it's the "next day" part of the visualization
    const normalizedHour = hour < timelineStart ? hour + 24 : hour;
    return ((normalizedHour - timelineStart) / timelineDuration) * 100;
  };

  const TimeBlock = ({ label, icon: Icon, color, settings, periodKey }: { 
    label: string, 
    icon: any, 
    color: string, 
    settings: { start: number, end: number },
    periodKey: 'morning' | 'afternoon' | 'night'
  }) => {
    const isCrossDay = settings.start > settings.end;
    const duration = isCrossDay ? (24 - settings.start + settings.end) : (settings.end - settings.start);

    return (
      <div className="p-4 bg-slate-950 border border-slate-900 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-xl", color)}>
              <Icon size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-200">{label}</span>
          </div>
          
          <div className="flex flex-col items-end">
             {isCrossDay && (
               <span className="text-[7px] font-black uppercase tracking-widest text-rose-500/80 mt-1 flex items-center gap-1">
                 <RefreshCw size={8} /> Midnight Cross
               </span>
             )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Start</label>
            <select 
              value={settings.start}
              onChange={(e) => updateTime(periodKey, 'start', parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              {Array.from({ length: 25 }).map((_, i) => (
                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">End</label>
            <select 
              value={settings.end}
              onChange={(e) => updateTime(periodKey, 'end', parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              {Array.from({ length: 25 }).map((_, i) => (
                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-400">
          <TimerIcon size={20} />
          <h4 className="text-lg font-bold uppercase tracking-widest pr-1">Activity Time Peaks</h4>
        </div>
        <p className="text-[10px] text-slate-500 italic leading-relaxed">
          Customize peak periods for activity tracking. 
          Non-covered regions are labeled as "Other".
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TimeBlock 
          label="Morning" 
          icon={Sunrise} 
          color="bg-[#FDE047]/10 text-[#FDE047]" 
          settings={timeSettings.morning}
          periodKey="morning"
        />
        <TimeBlock 
          label="Afternoon" 
          icon={Sun} 
          color="bg-[#F97316]/10 text-[#F97316]" 
          settings={timeSettings.afternoon}
          periodKey="afternoon"
        />
        <TimeBlock 
          label="Night" 
          icon={Moon} 
          color="bg-[#6366F1]/10 text-[#6366F1]" 
          settings={timeSettings.night}
          periodKey="night"
        />
      </div>

      <div className="space-y-4 pt-2">
        {/* Global Timeline */}
        <div className="space-y-3 p-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-black uppercase tracking-widest text-slate-400">Visualization Timeline</span>
            {timelineStart > 0 && (
              <span className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                <RefreshCw size={12} /> Shifted View (+{timelineStart}h Offset)
              </span>
            )}
          </div>
          <div className="relative h-16 bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden p-1 shadow-inner shadow-black/20">
            <div className="absolute inset-y-0 inset-x-6">
              {/* Extended Day Pattern Area */}
              {timelineStart > 0 && (
                <div 
                  className="absolute top-0 bottom-0 right-0 bg-slate-900/40 border-l border-dashed border-indigo-500/20 z-0"
                  style={{ left: `${getPos(24)}%` }}
                />
              )}

              {/* Markers */}
              <div className="absolute inset-0">
                {Array.from({ length: 25 }).map((_, i) => {
                  const hour = (timelineStart + i) % 24;
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "absolute top-0 bottom-0 transition-colors", 
                        hour === 0 ? "border-l-[3px] border-indigo-500/60 z-30 -ml-[1px]" : "border-l border-slate-900/50",
                        i % 6 === 0 ? "border-slate-800/40" : ""
                      )}
                      style={{ left: `${(i / 24) * 100}%` }}
                    />
                  );
                })}
              </div>

              {/* Labels (Period start/end only) */}
              <div className="absolute inset-0 h-full flex pointer-events-none">
                {Object.values(timeSettings).map((s: any, idx) => (
                  <React.Fragment key={idx}>
                    <div 
                      className="absolute bottom-1 -translate-x-1/2 text-[9px] font-black font-mono text-slate-600 whitespace-nowrap"
                      style={{ left: `${getPos(s.start)}%` }}
                    >
                      {s.start}:00
                    </div>
                    <div 
                      className="absolute bottom-1 -translate-x-1/2 text-[9px] font-black font-mono text-slate-600 whitespace-nowrap"
                      style={{ left: `${getPos(s.start > s.end ? s.end + 24 : s.end)}%` }}
                    >
                      {s.end}:00
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Segments */}
              <div className="absolute inset-x-0 top-2.5 bottom-7">
                {Object.entries(timeSettings).map(([key, s]: [string, any]) => {
                  const colors = {
                    morning: { bg: 'bg-[#FDE047]' },
                    afternoon: { bg: 'bg-[#F97316]' },
                    night: { bg: 'bg-[#6366F1]' }
                  } as any;
                  
                  const { bg } = colors[key];
                  const start = s.start;
                  const end = s.start > s.end ? 24 + s.end : s.end;
                  const width = end - start;
                  
                  if (width <= 0) return null;

                  return (
                    <motion.div
                      key={key}
                      layoutId={`peak-${key}`}
                      className={cn("absolute h-full rounded-xl opacity-90 flex items-center justify-center overflow-hidden", bg)}
                      style={{ 
                        left: `${getPos(start)}%`, 
                        width: `${(width / 24) * 100}%` 
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Overlap Warning */}
        <AnimatePresence>
          {overlaps.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold px-4"
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span className="italic">Warning: Segment overlap detected ({overlaps.map(o => o.keys.join(' & ')).join(', ')}). This will lead to overlapping data in your charts.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-3xl mt-2">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", state.showOtherInActivityLog !== false ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
            <Layers size={20} />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Show "Other" Periods</div>
            <div className="text-[10px] text-slate-500">Include sessions outside peak hours in charts</div>
          </div>
        </div>
        <button
          onClick={() => setState(prev => ({ ...prev, showOtherInActivityLog: prev.showOtherInActivityLog === false ? true : false }))}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            state.showOtherInActivityLog !== false ? "bg-indigo-400" : "bg-slate-700"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              state.showOtherInActivityLog !== false ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
    </div>
  );
};

