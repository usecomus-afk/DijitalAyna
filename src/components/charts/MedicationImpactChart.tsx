import React, { useState, useMemo } from 'react';
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
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { DailyMetric, MoodReport, BaselineState } from '../../types/engine';
import { Medication } from '../../types/medication';
import { MetricKey, METRIC_DEFINITIONS } from '../../types/sensor';
import { analyzeMedicationImpact } from '../../engine/medicationAnalytics';
import { Pill, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MedicationImpactChartProps {
  medications: Medication[];
  metrics: DailyMetric[];
  baselines: BaselineState[];
  moods: MoodReport[];
}

export const MedicationImpactChart: React.FC<MedicationImpactChartProps> = ({
  medications,
  metrics,
  baselines,
  moods,
}) => {
  const [selectedOverlay, setSelectedOverlay] = useState<MetricKey>('night_usage_minutes');
  const [selectedRange, setSelectedRange] = useState<30 | 60 | 90>(30);
  const [activeMedIndex, setActiveMedIndex] = useState<number>(0);

  const activeMed = medications[activeMedIndex] || medications[0];

  // Calculate pre vs post impact report for selected medication
  const impactReport = useMemo(() => {
    if (!activeMed) return null;
    return analyzeMedicationImpact(activeMed, metrics, baselines, moods);
  }, [activeMed, metrics, baselines, moods]);

  // Unified time series
  const { chartData, latestDate } = useMemo(() => {
    const dateMap = new Map<string, { date: string; fullDate: string; moodScore?: number; metricValue?: number }>();
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - selectedRange);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const uniqueDates = Array.from(
      new Set([
        ...metrics.filter((m) => m.date >= cutoffStr).map((m) => m.date),
        ...moods.filter((m) => m.date >= cutoffStr).map((m) => m.date),
        ...(activeMed && activeMed.startDate >= cutoffStr ? [activeMed.startDate] : []),
      ])
    ).sort();

    for (const d of uniqueDates) {
      dateMap.set(d, {
        date: d.slice(5), // MM-DD
        fullDate: d,
      });
    }

    // Populate active mood
    for (const m of moods) {
      if (m.date >= cutoffStr) {
        const entry = dateMap.get(m.date);
        if (entry) entry.moodScore = m.score;
      }
    }

    // Populate metric
    const filteredMetrics = metrics.filter((m) => m.metricKey === selectedOverlay && m.date >= cutoffStr);
    for (const fm of filteredMetrics) {
      const entry = dateMap.get(fm.date);
      if (entry) entry.metricValue = fm.value;
    }

    const data = Array.from(dateMap.values());
    return {
      chartData: data,
      earliestDate: data[0]?.date || '',
      latestDate: data[data.length - 1]?.date || '',
    };
  }, [metrics, moods, selectedOverlay, selectedRange, activeMed]);

  const activeDef = METRIC_DEFINITIONS[selectedOverlay];
  const medStartDateFormatted = activeMed ? activeMed.startDate.slice(5) : '';

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-lg text-comus-navy leading-tight">
              İlaç Etki & Zaman Serisi Bindirme Analizi
            </h3>
          </div>
          <p className="text-xs text-comus-sand-dark mt-0.5">
            İlaç başlama tarihlerinin pasif davranışsal göstergeler ve ruh hali üzerindeki seyrini karşılaştırın
          </p>
        </div>

        {/* Range & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Medication Selector (if multiple) */}
          {medications.length > 1 && (
            <select
              value={activeMedIndex}
              onChange={(e) => setActiveMedIndex(Number(e.target.value))}
              className="text-xs p-1.5 px-2.5 rounded-xl bg-comus-surface border border-comus-sand-light/40 font-semibold text-comus-navy focus:outline-none"
            >
              {medications.map((m, idx) => (
                <option key={m.id || idx} value={idx}>
                  {m.name} ({m.dosageMg}mg)
                </option>
              ))}
            </select>
          )}

          {/* Metric Selector */}
          <div className="flex items-center gap-1 bg-comus-surface p-1 rounded-2xl border border-comus-sand-light/30 text-xs overflow-x-auto">
            <button
              onClick={() => setSelectedOverlay('night_usage_minutes')}
              className={`px-2.5 py-1 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedOverlay === 'night_usage_minutes'
                  ? 'bg-comus-navy text-white shadow-sm'
                  : 'text-comus-sand-dark hover:text-comus-navy'
              }`}
            >
              Gece Kullanımı
            </button>
            <button
              onClick={() => setSelectedOverlay('typing_wpm')}
              className={`px-2.5 py-1 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedOverlay === 'typing_wpm'
                  ? 'bg-comus-navy text-white shadow-sm'
                  : 'text-comus-sand-dark hover:text-comus-navy'
              }`}
            >
              Yazım Hızı
            </button>
            <button
              onClick={() => setSelectedOverlay('mobility_index')}
              className={`px-2.5 py-1 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedOverlay === 'mobility_index'
                  ? 'bg-comus-navy text-white shadow-sm'
                  : 'text-comus-sand-dark hover:text-comus-navy'
              }`}
            >
              Hareketlilik
            </button>
          </div>

          {/* Range Buttons */}
          <div className="flex items-center gap-1 bg-comus-surface p-1 rounded-2xl border border-comus-sand-light/30 text-xs">
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedRange(days as any)}
                className={`px-2.5 py-1 rounded-xl font-medium transition-all ${
                  selectedRange === days
                    ? 'bg-comus-copper text-white shadow-sm'
                    : 'text-comus-sand-dark hover:text-comus-navy'
                }`}
              >
                {days}G
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recharts Composed Chart with Medication Overlay */}
      <div className="h-72 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
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

            {/* Right Y Axis: Passive Phenotype Metric */}
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
                  const isPostMed = activeMed && data.fullDate >= activeMed.startDate;
                  return (
                    <div className="bg-comus-navy text-white text-xs p-3 rounded-2xl shadow-soft-lg space-y-1">
                      <div className="font-bold border-b border-white/20 pb-1 flex items-center justify-between gap-2">
                        <span>{data.fullDate}</span>
                        {activeMed && (
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                            isPostMed ? 'bg-teal-500 text-white' : 'bg-white/20 text-white/80'
                          }`}>
                            {isPostMed ? `${activeMed.name} Dönemi` : 'İlaç Öncesi'}
                          </span>
                        )}
                      </div>
                      <div className="text-comus-copper-light">
                        Ruh Hali: <strong className="font-bold">{data.moodScore ? `${data.moodScore} / 5` : 'Girilmedi'}</strong>
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

            {/* Medication Period Shading (ReferenceArea) */}
            {activeMed && medStartDateFormatted && (
              <ReferenceArea
                yAxisId="left"
                x1={medStartDateFormatted}
                x2={latestDate}
                fill="#0D9488"
                fillOpacity={0.06}
              />
            )}

            {/* Vertical Marker Line for Medication Start */}
            {activeMed && medStartDateFormatted && (
              <ReferenceLine
                yAxisId="left"
                x={medStartDateFormatted}
                stroke="#0D9488"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `💊 ${activeMed.name} (${activeMed.dosageMg}mg)`,
                  position: 'insideTopLeft',
                  fill: '#0F766E',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Passive Metric (Bars) */}
            <Bar
              yAxisId="right"
              name={`${activeDef.label} (${activeDef.unit})`}
              dataKey="metricValue"
              fill="#1E3A5F"
              opacity={0.35}
              radius={[6, 6, 0, 0]}
              barSize={16}
            />

            {/* Active Mood (Line) */}
            <Line
              yAxisId="left"
              name="Ruh Hali Skoru"
              type="monotone"
              dataKey="moodScore"
              stroke="#C0674F"
              strokeWidth={3}
              dot={{ r: 4, fill: '#C0674F', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pre vs Post Delta Analytics Report Card */}
      {impactReport && (
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-700 shrink-0" />
              <h4 className="font-serif font-bold text-sm text-teal-950">
                {impactReport.medication.name} ({impactReport.medication.dosageMg}mg) Tedavi Etki Değerlendirmesi
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
              Kullanım Süresi: {impactReport.daysActive}. Gün
            </span>
          </div>

          <p className="text-xs sm:text-sm text-teal-900 leading-relaxed font-medium">
            "{impactReport.overallSummary}"
          </p>

          {/* Delta Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
            {impactReport.deltas.map((d) => {
              let Icon = Minus;
              let color = 'text-stone-700 bg-white/70 border-stone-200';

              if (d.direction === 'improved') {
                Icon = ArrowUpRight;
                color = 'text-emerald-800 bg-emerald-50 border-emerald-200';
              } else if (d.direction === 'declined') {
                Icon = ArrowDownRight;
                color = 'text-rose-800 bg-rose-50 border-rose-200';
              }

              return (
                <div key={d.metricKey} className={`p-2.5 rounded-xl border text-xs ${color}`}>
                  <div className="font-semibold truncate text-[11px] text-comus-navy mb-0.5">{d.label}</div>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{d.changePercent > 0 ? `+${d.changePercent}%` : `${d.changePercent}%`}</span>
                  </div>
                  <div className="text-[10px] text-comus-sand-dark mt-0.5 tabular-nums">
                    Öncesi: {d.preAvg} → {d.postAvg}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
