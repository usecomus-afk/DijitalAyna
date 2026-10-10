import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ActivitySquare, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { calculateZScore, ANOMALY_Z_THRESHOLD } from '../../engine/anomaly';
import { METRIC_DEFINITIONS, MetricKey } from '../../types/sensor';
import { Disclaimer } from '../../components/common/Disclaimer';

const BASELINE_TARGET_DAYS = 14;

interface Row {
  key: MetricKey;
  label: string;
  unit: string;
  current: number | null;
  date: string | null;
  mean: number;
  std: number;
  z: number | null;
  dev: number | null;
  sampleCount: number;
  isEstablished: boolean;
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

export const EWMADeviationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { baselineDayCount } = useAppStore();

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];

  const rows = useMemo<Row[]>(() => {
    const latest = new Map<string, { value: number; date: string }>();
    for (const m of dailyMetrics) {
      const prev = latest.get(m.metricKey);
      if (!prev || m.date > prev.date) latest.set(m.metricKey, { value: m.value, date: m.date });
    }

    return baselines
      .map((b) => {
        const def = METRIC_DEFINITIONS[b.metricKey];
        const l = latest.get(b.metricKey);
        const current = l ? l.value : null;
        const z = current !== null ? calculateZScore(current, b.ewmaMean, b.ewmaStd) : null;
        const dev = current !== null && b.ewmaMean !== 0
          ? Math.round(((current - b.ewmaMean) / b.ewmaMean) * 100)
          : null;
        return {
          key: b.metricKey,
          label: def?.label ?? b.metricKey,
          unit: def?.unit ?? '',
          current,
          date: l?.date ?? null,
          mean: b.ewmaMean,
          std: b.ewmaStd,
          z,
          dev,
          sampleCount: b.sampleCount,
          isEstablished: b.isEstablished,
        };
      })
      .sort((a, b) => Math.abs(b.z ?? 0) - Math.abs(a.z ?? 0));
  }, [dailyMetrics, baselines]);

  const learnedDays = Math.min(baselineDayCount ?? 0, BASELINE_TARGET_DAYS);
  const progress = Math.round((learnedDays / BASELINE_TARGET_DAYS) * 100);
  const anomalyCount = rows.filter((r) => r.z !== null && Math.abs(r.z) >= ANOMALY_Z_THRESHOLD).length;

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Sayısal Göstergeler &amp; EWMA</h1>
      </div>

      {/* Baseline learning progress */}
      <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper">
            <ActivitySquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">Cihaz İçi Baz Hattı</h3>
            <p className="text-xs text-comus-sand-dark">
              Her metrik için kişisel ortalamanız üstel ağırlıklı hareketli ortalama (EWMA) ile öğrenilir
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-comus-navy font-semibold">Öğrenme İlerlemesi</span>
          <span className="text-comus-sand-dark">{learnedDays}/{BASELINE_TARGET_DAYS} gün</span>
        </div>
        <div className="w-full bg-comus-sand-light/30 rounded-full h-2.5">
          <div className="bg-comus-copper h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] text-comus-sand-dark">
          {learnedDays >= BASELINE_TARGET_DAYS
            ? `Baz hattı oluştu. Bugün ±${ANOMALY_Z_THRESHOLD}σ eşiğini aşan ${anomalyCount} gösterge var.`
            : 'Baz hattı hâlâ öğreniliyor; sapma değerleri bu süreçte daha az güvenilirdir.'}
        </p>
      </div>

      {/* Metric deviations */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 shadow-soft border border-comus-sand-light/20 text-center text-xs text-comus-sand-dark">
          Henüz hesaplanmış bir baz hattı yok. Uygulamayı birkaç gün kullandıkça göstergeler burada görünecek.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const isAnomaly = r.z !== null && Math.abs(r.z) >= ANOMALY_Z_THRESHOLD;
            const Icon = r.z === null || r.z === 0 ? Minus : r.z > 0 ? TrendingUp : TrendingDown;
            return (
              <div
                key={r.key}
                className={`bg-white rounded-2xl p-4 shadow-soft border ${isAnomaly ? 'border-amber-300' : 'border-comus-sand-light/20'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-comus-navy">{r.label}</div>
                    <div className="text-[11px] text-comus-sand-dark mt-0.5">
                      Baz: {fmt(r.mean)} ± {fmt(r.std)} {r.unit} · {r.sampleCount} gün
                      {!r.isEstablished && ' · öğreniliyor'}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                    isAnomaly ? 'bg-amber-50 text-amber-800' : 'bg-comus-surface text-comus-navy'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.z === null ? '—' : `${r.z > 0 ? '+' : ''}${r.z.toFixed(2)}σ`}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-comus-sand-light/20">
                  <span className="text-comus-sand-dark">
                    Son değer{r.date ? ` (${r.date.slice(5)})` : ''}:{' '}
                    <strong className="text-comus-navy">{r.current === null ? 'Veri yok' : `${fmt(r.current)} ${r.unit}`}</strong>
                  </span>
                  {r.dev !== null && (
                    <span className={isAnomaly ? 'text-amber-800 font-semibold' : 'text-comus-sand-dark'}>
                      {r.dev > 0 ? '+' : ''}{r.dev}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Disclaimer />
    </div>
  );
};
