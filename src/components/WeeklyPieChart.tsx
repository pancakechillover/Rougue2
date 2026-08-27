import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { StudySession, Dungeon, MajorDungeon, TimeSettings } from '../types';
import { format, parseISO, isSameDay, getDay } from 'date-fns';
import { getSessionEffectiveMinutes } from '../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

interface Props {
  weekSessions: StudySession[];
  mode: 'time_of_day' | 'day_of_week';
  includeRestTimeInTasks?: boolean;
  timeSettings?: TimeSettings;
}

export const WeeklyPieChart: React.FC<Props> = ({ weekSessions, mode, includeRestTimeInTasks = true, timeSettings }) => {
  const { chartData, legendPayload } = useMemo(() => {
    let rawSegments: { name: string; value: number; color: string }[] = [];
    
    if (mode === 'day_of_week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayColors: Record<string, string> = {
        'Sun': '#ef4444', // Red
        'Mon': '#6366f1', // Indigo
        'Tue': '#10b981', // Emerald
        'Wed': '#f59e0b', // Amber
        'Thu': '#06b6d4', // Cyan
        'Fri': '#ec4899', // Pink
        'Sat': '#8b5cf6'  // Purple
      };
      
      const grouped: Record<string, number> = {};
      weekSessions.forEach(s => {
        const d = (s as any).assignedDate ? new Date((s as any).assignedDate) : new Date(s.timestamp);
        const dayName = days[getDay(d)];
        grouped[dayName] = (grouped[dayName] || 0) + getSessionEffectiveMinutes(s, includeRestTimeInTasks);
      });
      
      rawSegments = days
        .map(d => ({ 
          name: d, 
          value: grouped[d] || 0,
          color: dayColors[d]
        }))
        .filter(d => d.value > 0);
    } else {
      // Time of day (Morning/Afternoon/Night/Other)
      const periodColors: Record<string, string> = {
        'Morning': '#fde047',
        'Afternoon': '#f97316',
        'Night': '#6366f1',
        'Other': '#94a3b8'
      };
      
      const grouped = {
        'Morning': 0,
        'Afternoon': 0,
        'Night': 0,
        'Other': 0
      };
      
      weekSessions.forEach(s => {
        const duration = getSessionEffectiveMinutes(s, includeRestTimeInTasks);
        if (s.period) {
          const p = s.period.toLowerCase();
          if (p.includes('morning')) grouped.Morning += duration;
          else if (p.includes('afternoon')) grouped.Afternoon += duration;
          else if (p.includes('night')) grouped.Night += duration;
          else grouped.Other += duration; 
        } else {
          const h = new Date(s.timestamp).getHours();
          if (h >= 5 && h < 12) grouped.Morning += duration;
          else if (h >= 12 && h < 18) grouped.Afternoon += duration;
          else grouped.Night += duration;
        }
      });
      
      rawSegments = Object.entries(grouped)
        .map(([name, value]) => ({ 
          name, 
          value,
          color: periodColors[name as 'Morning' | 'Afternoon' | 'Night' | 'Other']
        }))
        .filter(d => d.value > 0);
    }

    const legendData = rawSegments.map(seg => {
      const h = Math.floor(seg.value / 60);
      const m = seg.value % 60;
      const formattedTotal = h > 0 ? `${h}h ${m}m` : `${m}m`;
      return {
        value: `${seg.name} (${formattedTotal})`,
        type: 'circle',
        id: seg.name,
        color: seg.color
      };
    });

    return { chartData: rawSegments, legendPayload: legendData };
  }, [weekSessions, mode]);

  if (!chartData.length || chartData.reduce((a, b) => a + b.value, 0) === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-bold italic">
        No records this week
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
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            trigger="click"
            formatter={(val: number, name: string) => {
              if (val < 0) return ['0min', name];
              const totalMin = Math.round(val);
              const h = Math.floor(totalMin / 60);
              const m = totalMin % 60;
              const formattedTime = h > 0 ? `${h}h ${m}min` : `${m}min`;
              return [formattedTime, name];
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
