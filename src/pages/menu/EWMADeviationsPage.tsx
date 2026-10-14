import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ActivitySquare,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
} from 'lucide-react';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { calculateZScore, ANOMALY_Z_THRESHOLD } from '../../engine/anomaly';
import { METRIC_DEFINITIONS, MetricKey } from '../../types/sensor';
import { Disclaimer } from '../../components/common/Disclaimer';
import { shareContent } from '../../services/shareService';

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

const EXCLUDED_EWMA_KEYS: MetricKey[] = ['gaming_duration', 'camera_interaction_count'];

interface EWMADeviationsPageProps {
  embedded?: boolean;
}

export const EWMADeviationsPage: React.FC<EWMADeviationsPageProps> = ({
  embedded = false,
}) => {
  const navigate = useNavigate();
  const { baselineDayCount } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];

  const rows = useMemo<Row[]>(() => {
    const latest = new Map<string, { value: number; date: string }>();
    for (const m of dailyMetrics) {
      if (EXCLUDED_EWMA_KEYS.includes(m.metricKey)) continue;
      const prev = latest.get(m.metricKey);
      if (!prev || m.date > prev.date) latest.set(m.metricKey, { value: m.value, date: m.date });
    }

    return baselines
      .filter((b) => !EXCLUDED_EWMA_KEYS.includes(b.metricKey))
      .map((b) => {
        const def = METRIC_DEFINITIONS[b.metricKey];
        const l = latest.get(b.metricKey);
        const current = l ? l.value : null;
        const z = current !== null ? calculateZScore(current, b.ewmaMean, b.ewmaStd) : null;
        const dev =
          current !== null && b.ewmaMean !== 0
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
  const anomalyCount = rows.filter(
    (r) => r.z !== null && Math.abs(r.z) >= ANOMALY_Z_THRESHOLD
  ).length;
  const balancedCount = Math.max(0, rows.length - anomalyCount);

  const handleShareSummary = async () => {
    const lines = [
      `Sayısal Göstergeler & EWMA Özeti (${learnedDays}/${BASELINE_TARGET_DAYS} gün)`,
      `Toplam İzlenen Gösterge: ${rows.length} (${balancedCount} dengede, ${anomalyCount} belirgin sapma)`,
      '',
      ...rows.slice(0, 8).map((r) => {
        const zStr = r.z !== null ? `${r.z > 0 ? '+' : ''}${r.z.toFixed(2)}σ` : '—';
        return `• ${r.label}: Son ${r.current !== null ? `${fmt(r.current)} ${r.unit}` : 'Veri yok'} | Baz: ${fmt(r.mean)} ${r.unit} (${zStr})`;
      }),
      '',
      '— Dijital Mental İkizim',
    ];
    const res = await shareContent({
      title: 'Dijital Mental İkizim — EWMA Göstergeler Özeti',
      text: lines.join('\n'),
    });
    setShareFeedback(res.message);
    setTimeout(() => setShareFeedback(null), 3000);
  };

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6 pb-24 animate-fadeIn'}>
      {!embedded ? (
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/menu')}
              className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-comus-navy">
              Sayısal Göstergeler &amp; EWMA
            </h1>
          </div>

          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleShareSummary}
              className="flex items-center gap-1.5 text-xs text-comus-navy bg-white hover:bg-comus-surface px-3 py-1.5 rounded-xl border border-comus-sand-light/40 shadow-2xs transition-colors cursor-pointer font-medium"
            >
              <Share2 className="w-3.5 h-3.5 text-comus-copper" />
              <span>Ayrıntıları Paylaş</span>
            </button>
          )}
        </div>
      ) : (
        rows.length > 0 && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleShareSummary}
              className="flex items-center gap-1.5 text-xs text-comus-navy bg-white hover:bg-comus-surface px-3 py-1.5 rounded-xl border border-comus-sand-light/40 shadow-2xs transition-colors cursor-pointer font-medium"
            >
              <Share2 className="w-3.5 h-3.5 text-comus-copper" />
              <span>Ayrıntıları Paylaş</span>
            </button>
          </div>
        )
      )}

      {shareFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-1.5 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Simplified Summary Card + "İncele" Button */}
      <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper">
            <ActivitySquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">
              Kişisel Ritim Özeti
            </h3>
            <p className="text-xs text-comus-sand-dark">
              Cihaz içi ölçümleriniz kendi kişisel ortalamanızla (EWMA) karşılaştırılır
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 rounded-2xl bg-comus-surface border border-comus-sand-light/30">
            <div className="text-[11px] text-comus-sand-dark">Öğrenilen Gün</div>
            <div className="text-sm font-bold text-comus-navy mt-0.5">
              {learnedDays}/{BASELINE_TARGET_DAYS}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div className="text-[11px] text-emerald-800">Dengede</div>
            <div className="text-sm font-bold text-emerald-900 mt-0.5">
              {balancedCount} Gösterge
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
            <div className="text-[11px] text-amber-800">Belirgin Fark</div>
            <div className="text-sm font-bold text-amber-900 mt-0.5">
              {anomalyCount} Gösterge
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-comus-navy font-semibold">Kalibrasyon İlerlemesi</span>
            <span className="text-comus-sand-dark">%{progress}</span>
          </div>
          <div className="w-full bg-comus-sand-light/30 rounded-full h-2.5">
            <div
              className="bg-comus-copper h-2.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-comus-sand-dark leading-relaxed pt-1">
            {rows.length === 0
              ? 'Henüz hesaplanmış bir baz hattı yok. Uygulamayı birkaç gün kullandıkça göstergeler burada özetlenecektir.'
              : learnedDays >= BASELINE_TARGET_DAYS
              ? anomalyCount > 0
                ? `Baz hattınız aktif. Bugün kişisel ortalamanızdan belirgin farklılık gösteren ${anomalyCount} gösterge saptandı; diğer ${balancedCount} gösterge olağan seyrinde.`
                : `Baz hattınız aktif ve izlenen tüm (${rows.length}) davranışsal göstergeler kişisel referans aralığınızla uyumlu.`
              : `Kişisel baz hattınız öğrenilmeye devam ediyor (${learnedDays}/${BASELINE_TARGET_DAYS} gün). Tüm teknik metrikleri ve standart sapma değerlerini görmek için aşağıdan inceleyebilirsiniz.`}
          </p>
        </div>

        {rows.length > 0 && (
          <div className="pt-2 border-t border-comus-sand-light/20 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              className="w-full sm:w-auto min-w-[200px] px-6 py-2.5 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{isExpanded ? 'Ayrıntıları Gizle' : 'İncele'}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Expandable Full Metric Deviations List */}
      {isExpanded && rows.length > 0 && (
        <div className="space-y-3 animate-fadeIn">
          {rows.map((r) => {
            const isAnomaly = r.z !== null && Math.abs(r.z) >= ANOMALY_Z_THRESHOLD;
            const Icon =
              r.z === null || r.z === 0 ? Minus : r.z > 0 ? TrendingUp : TrendingDown;
            return (
              <div
                key={r.key}
                className={`bg-white rounded-2xl p-4 shadow-soft border ${
                  isAnomaly ? 'border-amber-300' : 'border-comus-sand-light/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-comus-navy">{r.label}</div>
                    <div className="text-[11px] text-comus-sand-dark mt-0.5">
                      Baz: {fmt(r.mean)} ± {fmt(r.std)} {r.unit} · {r.sampleCount} gün
                      {!r.isEstablished && ' · öğreniliyor'}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                      isAnomaly
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-comus-surface text-comus-navy'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>
                      {r.z === null ? '—' : `${r.z > 0 ? '+' : ''}${r.z.toFixed(2)}σ`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-comus-sand-light/20">
                  <span className="text-comus-sand-dark">
                    Son değer{r.date ? ` (${r.date.slice(5)})` : ''}:{' '}
                    <strong className="text-comus-navy">
                      {r.current === null ? 'Veri yok' : `${fmt(r.current)} ${r.unit}`}
                    </strong>
                  </span>
                  {r.dev !== null && (
                    <span
                      className={
                        isAnomaly
                          ? 'text-amber-800 font-semibold'
                          : 'text-comus-sand-dark'
                      }
                    >
                      {r.dev > 0 ? '+' : ''}
                      {r.dev}%
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
