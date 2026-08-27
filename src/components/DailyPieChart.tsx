import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { StudySession, Dungeon, MajorDungeon, TimeSettings } from '../types';
import { format, differenceInMinutes, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { getSessionEffectiveMinutes, getSettlementDay, getSessionSettlementDate } from '../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#84cc16'];

interface Props {
  date: Date;
  sessions: StudySession[];
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
  mode: '24h' | 'compact';
  includeRestTimeInTasks?: boolean;
  timeSettings?: TimeSettings;
}

export const DailyPieChart: React.FC<Props> = ({ date, sessions, dungeons, majorDungeons, mode, includeRestTimeInTasks = true, timeSettings }) => {
  const { chartData, legendPayload } = useMemo(() => {
    const daySessions = sessions;
    
    const getDungeonName = (id: string) => {
      if (id === 'free_study') return 'Free Study';
      const d = dungeons.find(d => d.id === id);
      if (d) return d.name;
      const m = majorDungeons.find(m => m.id === id);
      if (m) return m.name;
      return 'Unknown';
    };

    let segments: { name: string; value: number; isIdle?: boolean; realName?: string; color: string }[] = [];
    const legendData: any[] = [];
    
    const uniqueNames = new Set<string>();
    const getColor = (name: string) => {
      if (!uniqueNames.has(name)) uniqueNames.add(name);
      const arr = Array.from(uniqueNames);
      return COLORS[arr.indexOf(name) % COLORS.length];
    };

    if (mode === 'compact') {
      const grouped: Record<string, number> = {};
      daySessions.forEach(s => {
        const name = getDungeonName(s.dungeonId);
        grouped[name] = (grouped[name] || 0) + getSessionEffectiveMinutes(s, includeRestTimeInTasks);
      });
      segments = Object.entries(grouped)
        .filter(d => d[1] > 0)
        .map(([name, value]) => ({ 
          name, 
          value,
          realName: name,
          color: getColor(name)
        }));
    } else {
      const ts = timeSettings || { morning: { start: 8, end: 12 }, afternoon: { start: 14, end: 18 }, night: { start: 20, end: 24 } };
      const dayStart = startOfDay(date);
      if (ts.night.start > ts.night.end) {
        dayStart.setHours(ts.night.end, 0, 0, 0);
      }
      const sorted = [...daySessions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let currentMinute = 0; 
      
      sorted.forEach(s => {
        const stDate = new Date(s.timestamp);
        const duration = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
        const endMinute = differenceInMinutes(stDate, dayStart);
        const startMinute = Math.max(0, endMinute - duration);

        if (startMinute > currentMinute) {
          segments.push({ name: 'Idle', value: startMinute - currentMinute, isIdle: true, color: '#1e293b' });
        }
        
        if (duration > 0) {
          const rName = getDungeonName(s.dungeonId);
          segments.push({ 
            name: `${rName}-${currentMinute}`, // unique key to keep slices separate in 24h mode just in case
            realName: rName,
            value: Math.min(1440 - Math.max(currentMinute, startMinute), duration),
            isIdle: false,
            color: getColor(rName)
          });
        }
        currentMinute = Math.max(currentMinute, endMinute);
      });

      if (currentMinute < 1440) {
        segments.push({ name: 'Idle', value: 1440 - currentMinute, isIdle: true, color: '#1e293b' });
      }
    }
    
    // Build Legend
    const addedToLegend = new Set<string>();
    const dungeonDurations: Record<string, number> = {};
    
    segments.forEach(seg => {
      if (seg.isIdle) return;
      const rName = seg.realName || seg.name;
      dungeonDurations[rName] = (dungeonDurations[rName] || 0) + seg.value;
    });

    segments.forEach(seg => {
      if (seg.isIdle) return;
      const rName = seg.realName || seg.name;
      if (!addedToLegend.has(rName)) {
        addedToLegend.add(rName);
        const mins = dungeonDurations[rName] || 0;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        const formattedTotal = h > 0 ? `${h}h ${m}m` : `${m}m`;
        
        legendData.push({
          value: `${rName} (${formattedTotal})`,
          type: 'circle',
          id: rName,
          color: seg.color
        });
      }
    });

    return { chartData: segments, legendPayload: legendData };
  }, [history, date, dungeons, majorDungeons, mode]);

  if (!chartData.length || (mode === 'compact' && chartData.reduce((a, b) => a + b.value, 0) === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-bold italic">
        No records this day
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={mode === '24h' ? 65 : 60}
            outerRadius={mode === '24h' ? 85 : 80}
            paddingAngle={mode === 'compact' ? 2 : 0}
            dataKey="value"
            stroke="none"
            startAngle={mode === '24h' ? 90 : 90}
            endAngle={mode === '24h' ? -270 : -270}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                opacity={mode === '24h' && entry.isIdle ? 0.2 : 1}
              />
            ))}
          </Pie>
          <Tooltip 
            trigger="click"
            formatter={(val: number, name: string, props: any) => {
              if (props?.payload?.isIdle) return ['...', 'Idle'];
              if (val < 0) return ['0min', props?.payload?.realName || name];
              const totalMin = Math.round(val);
              const h = Math.floor(totalMin / 60);
              const m = totalMin % 60;
              const formattedTime = h > 0 ? `${h}h ${m}min` : `${m}min`;
              return [formattedTime, props?.payload?.realName || name];
            }}
            contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', fontWeight: 'bold', color: '#f8fafc', zIndex: 100 }}
            cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }}
            wrapperStyle={{ zIndex: 100, pointerEvents: 'auto' }}
          />
          {legendPayload.length > 0 && (
            <Legend 
              // @ts-ignore
              payload={legendPayload}
              verticalAlign="bottom" 
              height={36} 
              iconType="circle" 
              wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', paddingTop: '10px' }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
