import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { db } from '../../db';

export const TriggerAnalysisWidget: React.FC = () => {
  const [data, setData] = useState<{ time: string; mood: number; trigger: string | null; isHigh?: boolean; isLow?: boolean }[]>([]);
  const [boosters, setBoosters] = useState<string[]>([]);
  const [drainers, setDrainers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        const recentReports = await db.moodReports
          .where('timestamp')
          .above(fourteenDaysAgo.getTime())
          .toArray();

        if (recentReports.length < 3) {
          setLoading(false);
          return;
        }

        // Calculate tag averages
        const tagScores: Record<string, { total: number; count: number }> = {};
        recentReports.forEach((report: any) => {
          report.tags.forEach((tag: string) => {
            if (!tagScores[tag]) tagScores[tag] = { total: 0, count: 0 };
            tagScores[tag].total += report.score;
            tagScores[tag].count += 1;
          });
        });

        const newBoosters: string[] = [];
        const newDrainers: string[] = [];
        
        for (const [tag, stats] of Object.entries(tagScores)) {
          const avg = stats.total / stats.count;
          if (avg >= 3.5) newBoosters.push(tag);
          else if (avg <= 2.5) newDrainers.push(tag);
        }

        setBoosters(newBoosters);
        setDrainers(newDrainers);

        // Map recent 10 reports to chart data
        const chartData = recentReports
          .sort((a: any, b: any) => a.timestamp - b.timestamp)
          .slice(-10)
          .map((report: any) => {
            const date = new Date(report.timestamp);
            const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            // map score 1-5 to 20-100
            const mood = report.score * 20; 
            const trigger = report.tags.length > 0 ? report.tags[0] : null;
            return {
              time,
              mood,
              trigger,
              isHigh: report.score >= 4,
              isLow: report.score <= 2
            };
          });

        setData(chartData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadRealData();
  }, []);

  if (loading) return null;

  if (data.length < 3) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-comus-navy-subtle flex items-center justify-center text-comus-navy">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="font-serif font-bold text-lg text-comus-navy">
            Tetikleyici Analizi
          </h3>
        </div>
        <div className="h-32 flex items-center justify-center text-sm text-comus-sand-dark text-center">
          Tetikleyici analizi için yeterli veri toplanıyor.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-comus-navy-subtle flex items-center justify-center text-comus-navy">
          <Activity className="w-4 h-4" />
        </div>
        <h3 className="font-serif font-bold text-lg text-comus-navy">
          Tetikleyici Analizi
        </h3>
      </div>
      <p className="text-xs text-comus-sand-dark">
        Gün içi duygu durumunuzu hangi olayların yükseltip düşürdüğünü inceleyin.
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(val) => {
                if (val === 80) return 'Yüksek';
                if (val === 20) return 'Düşük';
                return '';
              }}
              tick={{ fontSize: 10, fill: '#6B7280' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              labelStyle={{ fontWeight: 'bold', color: '#1F2937', marginBottom: '4px' }}
              formatter={(value: number, _name: string, props: any) => {
                const trigger = props.payload.trigger;
                return [trigger ? `Tetikleyici: ${trigger}` : `Mod: ${value}`, ''];
              }}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="#0f172a" 
              strokeWidth={3}
              dot={{ r: 3, fill: '#0f172a', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#D97757', stroke: '#fff', strokeWidth: 2 }}
            />
            {data.map((entry, index) => {
              if (entry.isHigh) return <ReferenceDot key={index} x={entry.time} y={entry.mood} r={6} fill="#10B981" stroke="#fff" strokeWidth={2} />;
              if (entry.isLow) return <ReferenceDot key={index} x={entry.time} y={entry.mood} r={6} fill="#EF4444" stroke="#fff" strokeWidth={2} />;
              return null;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
            <TrendingUp className="w-4 h-4" /> Modu Yükseltenler
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            {boosters.length > 0 ? boosters.join(', ') : 'Yeterli veri yok'}
          </p>
        </div>
        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
            <TrendingDown className="w-4 h-4" /> Modu Düşürenler
          </div>
          <p className="text-[11px] text-rose-800 leading-relaxed">
            {drainers.length > 0 ? drainers.join(', ') : 'Yeterli veri yok'}
          </p>
        </div>
      </div>
    </div>
  );
};
