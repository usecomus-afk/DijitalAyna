import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DailyMetric, MoodReport } from '../../types/engine';
import { MetricKey, METRIC_DEFINITIONS } from '../../types/sensor';

interface MoodTimelineChartProps {
  metrics: DailyMetric[];
  moods: MoodReport[];
}

export const MoodTimelineChart: React.FC<MoodTimelineChartProps> = ({ metrics, moods }) => {
  const [selectedOverlay, setSelectedOverlay] = useState<MetricKey>('typing_wpm');

  // Align dates into a unified series (last 14 days)
  const dateMap = new Map<string, { date: string; moodScore?: number; metricValue?: number }>();

  // Extract all unique dates from recent entries
  const allDates = Array.from(new Set([
    ...metrics.map(m => m.date),
    ...moods.map(m => m.date),
  ])).sort().slice(-14);

  for (const d of allDates) {
    dateMap.set(d, { date: d.slice(5) }); // MM-DD
  }

  // Populate mood data
  for (const m of moods) {
    const entry = dateMap.get(m.date);
    if (entry) {
      entry.moodScore = m.score;
    }
  }

  // Populate selected passive metric
  const filteredMetrics = metrics.filter(m => m.metricKey === selectedOverlay);
  for (const fm of filteredMetrics) {
    const entry = dateMap.get(fm.date);
    if (entry) {
      entry.metricValue = fm.value;
    }
  }

  const timelineData = Array.from(dateMap.values());
  const activeDef = METRIC_DEFINITIONS[selectedOverlay];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-serif font-bold text-lg text-comus-navy leading-tight">
            Ruh Hali & Pasif Davranış Zaman Çizelgesi
          </h3>
          <p className="text-xs text-comus-sand-dark mt-0.5">
            Öznel hissiyatın ile nesnel dijital fenotip göstergelerini birlikte incele
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-comus-surface p-1 rounded-2xl border border-comus-sand-light/30 text-xs overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedOverlay('typing_wpm')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedOverlay === 'typing_wpm'
                ? 'bg-comus-navy text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Yazım Hızı
          </button>
          <button
            onClick={() => setSelectedOverlay('night_usage_minutes')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedOverlay === 'night_usage_minutes'
                ? 'bg-comus-navy text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Gece Ekranı
          </button>
          <button
            onClick={() => setSelectedOverlay('mobility_index')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedOverlay === 'mobility_index'
                ? 'bg-comus-navy text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Hareketlilik
          </button>
          <button
            onClick={() => setSelectedOverlay('typing_backspace_rate')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedOverlay === 'typing_backspace_rate'
                ? 'bg-comus-navy text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Hata/Silme
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EEF5" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C827A' }} />
            {/* Left Y Axis: Mood 1-5 */}
            <YAxis
              yAxisId="left"
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: '#C0674F' }}
              label={{ value: 'Ruh Hali (1-5)', angle: -90, position: 'insideLeft', fill: '#C0674F', fontSize: 10 }}
            />
            {/* Right Y Axis: Passive Metric */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: '#1E3A5F' }}
              label={{ value: `${activeDef.label} (${activeDef.unit})`, angle: 90, position: 'insideRight', fill: '#1E3A5F', fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-comus-navy text-white text-xs p-3 rounded-2xl shadow-soft-lg space-y-1">
                      <div className="font-bold border-b border-white/20 pb-1">{data.date}</div>
                      <div className="text-comus-copper-light">
                        Ruh Hali Puanı: <strong className="font-bold">{data.moodScore ? `${data.moodScore} / 5` : 'Girilmedi'}</strong>
                      </div>
                      <div className="text-white">
                        {activeDef.label}: <strong className="font-bold">{data.metricValue !== undefined ? `${data.metricValue} ${activeDef.unit}` : 'Kayıt yok'}</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs font-semibold text-comus-navy">{value}</span>
              )}
            />
            {/* Passive Metric (Bars or Area) */}
            <Bar
              yAxisId="right"
              name={`${activeDef.label} (${activeDef.unit})`}
              dataKey="metricValue"
              fill="#1E3A5F"
              opacity={0.35}
              radius={[6, 6, 0, 0]}
              barSize={18}
            />
            {/* Active Mood Line */}
            <Line
              yAxisId="left"
              name="Ruh Hali Skoru"
              type="monotone"
              dataKey="moodScore"
              stroke="#C0674F"
              strokeWidth={3}
              dot={{ r: 5, fill: '#C0674F', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-comus-sand-light/10 text-xs text-comus-sand-dark leading-relaxed">
        💡 <strong>İpucu:</strong> Ruh halinin düştüğü günlerde veya hemen öncesinde {activeDef.label.toLowerCase()} değerindeki dalgalanmaları izleyerek kişisel erken uyarı sinyallerini keşfedebilirsin.
      </div>
    </div>
  );
};
