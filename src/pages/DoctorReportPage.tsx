import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import {
  Calendar,
  Share2,
  Check,
  X,
  Copy,
  FileText,
} from 'lucide-react';
import { METRIC_DEFINITIONS, MetricKey } from '../types/sensor';
import { calculateZScore } from '../engine/anomaly';
import { analyzeMedicationImpact } from '../engine/medicationAnalytics';
import {
  PinnedInsight,
  generateRealReportAwarenessNotes,
  buildDoctorReportText,
  ReportMetricStat,
} from '../services/reportBuilder';
import { copyTextToClipboard } from '../services/shareService';
import { BaselineEngine } from '../engine/BaselineEngine';
import { sensorCapabilities } from '../sensors/capabilities';
import { DoctorShareWizard } from '../components/doctor/DoctorShareWizard';

export type MetricDisplayStatus =
  | 'active'
  | 'permission_required'
  | 'unsupported'
  | 'waiting_data'
  | 'self_report_required';

/** Excluded from the EWMA Baseline Deviation Table per clinical report specification */
export const EXCLUDED_EWMA_REPORT_KEYS: MetricKey[] = [
  'gaming_duration',
  'camera_interaction_count',
];

export function getMetricStatusType(key: MetricKey, hasData: boolean): MetricDisplayStatus {
  if (hasData) return 'active';
  if (
    key === 'mobility_index' ||
    key === 'sleep_efficiency' ||
    key === 'sleep_duration' ||
    key === 'sleep_sol' ||
    key === 'sleep_waso' ||
    key === 'homestay_ratio' ||
    key === 'mobility_radius' ||
    key === 'tremor_variance' ||
    key === 'voice_pitch_variance' ||
    key === 'voice_speech_rate' ||
    key === 'camera_interaction_count'
  ) {
    return 'permission_required';
  }
  if (key === 'gaming_duration') {
    return 'self_report_required';
  }
  if (
    (key === 'battery_level' || key === 'is_charging') &&
    sensorCapabilities.getCapability('battery') === 'unsupported'
  ) {
    return 'unsupported';
  }
  if (key === 'light_ambient_lux' && sensorCapabilities.getCapability('light') === 'unsupported') {
    return 'unsupported';
  }
  return 'waiting_data';
}

// Technical explanation helper for unavailable sensor telemetry (Strict Zero-Mock Policy)
function getUnavailableReason(key: MetricKey): string {
  switch (key) {
    case 'typing_wpm':
    case 'typing_iki':
    case 'typing_backspace_rate':
    case 'typing_pause_count':
    case 'typing_hold_time':
      return 'Uygulama içi klavye/metin girişi bekleniyor';
    case 'touch_scroll_velocity':
    case 'touch_interaction_frequency':
      return 'Uygulama içi dokunma/kaydırma etkileşimi bekleniyor';
    case 'session_duration':
    case 'screen_on_time':
      return 'Aktif oturum süresi hesaplanıyor';
    case 'night_usage_minutes':
      return '02:00–04:00 gece penceresinde kullanım kaydı saptanmadı';
    case 'mobility_index':
      return 'Apple Sağlık (HealthKit) / Hareket izni bekleniyor';
    case 'sleep_efficiency':
    case 'sleep_duration':
    case 'sleep_sol':
    case 'sleep_waso':
      return 'Apple Sağlık (HealthKit) uyku analizi izni veya uyku kaydı bekleniyor';
    case 'homestay_ratio':
    case 'mobility_radius':
      return 'Konum (GPS) izni veya hareketlilik kaydı bekleniyor';
    case 'tremor_variance':
      return 'Cihaz Hareket (Motion) sensör izni bekleniyor';
    case 'camera_interaction_count':
      return 'Kamera izni bekleniyor';
    case 'light_ambient_lux':
      return 'Ekran parlaklığı vekili üzerinden ortam ışığı kaydı bekleniyor (yalnızca iOS/Android native desteklenir)';
    case 'night_light_violations':
      return 'Gece ışık maruziyeti sensör kaydı bekleniyor';
    case 'battery_level':
    case 'is_charging':
      return 'Pil telemetrisi bu tarayıcı/simülatör ortamında desteklenmiyor';
    case 'network_online':
      return 'Ağ bağlantı telemetrisi kaydedilemedi';
    case 'voice_pitch_variance':
    case 'voice_speech_rate':
      return 'Mikrofon izni verilmedi veya ses kaydı yok';
    case 'gaming_duration':
      return 'iOS Sandbox kısıtı nedeniyle öz-bildirim gereklidir';
    case 'cognitive_fatigue_score':
      return 'Bilişsel yorgunluk analizi için aktif oturum/yazım/dokunma verisi bekleniyor';
    case 'impulse_risk_index':
      return 'Dürtüsel risk analizi için aktif oturum/dokunma/gece verisi bekleniyor';
    default:
      return 'Sensör verisi mevcut değil';
  }
}

const EMPTY_ARRAY: any[] = [];

export const DoctorReportPage: React.FC = () => {
  const { userProfile, baselineDayCount } = useAppStore();
  const [selectedRange, setSelectedRange] = useState<7 | 14 | 30>(14);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isShareWizardOpen, setIsShareWizardOpen] = useState(false);

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) ?? EMPTY_ARRAY;
  const baselines = useLiveQuery(() => db.baselines.toArray()) ?? EMPTY_ARRAY;
  const insights = useLiveQuery(() => db.insights.toArray()) ?? EMPTY_ARRAY;
  const medications = useLiveQuery(() => db.medications.toArray()) ?? EMPTY_ARRAY;
  const moods = useLiveQuery(() => db.moodReports.toArray()) ?? EMPTY_ARRAY;
  const surveys =
    useLiveQuery(() => db.clinicalSurveyResults.orderBy('timestamp').reverse().toArray()) ??
    EMPTY_ARRAY;
  const pinnedItem = useLiveQuery(() => db.settings.get('doctor_report_pinned'));
  const pinnedInsights = useMemo<PinnedInsight[]>(
    () => (Array.isArray(pinnedItem?.value) ? pinnedItem.value : EMPTY_ARRAY),
    [pinnedItem?.value]
  );

  const removePinnedInsight = async (addedAt: number) => {
    await db.settings.put({
      key: 'doctor_report_pinned',
      value: pinnedInsights.filter((p) => p.addedAt !== addedAt),
    });
  };

  const sampleDays = useMemo(
    () => new Set(dailyMetrics.map((m) => m.date)).size,
    [dailyMetrics]
  );
  const effectiveDayCount = Math.max(baselineDayCount, sampleDays);

  // Compute summary stats for the report in a fast single pass
  const reportStats = useMemo(() => {
    const realBaselineMap = new Map(
      baselines.filter((b) => (b.sampleCount ?? 0) > 0).map((b) => [b.metricKey, b])
    );
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - selectedRange);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const periodByKey = new Map<MetricKey, number[]>();
    const allByKey = new Map<MetricKey, { date: string; value: number }[]>();

    for (const m of dailyMetrics) {
      if (m.date >= cutoffStr) {
        let arr = periodByKey.get(m.metricKey);
        if (!arr) {
          arr = [];
          periodByKey.set(m.metricKey, arr);
        }
        arr.push(m.value);
      }
      if (!realBaselineMap.has(m.metricKey)) {
        let allArr = allByKey.get(m.metricKey);
        if (!allArr) {
          allArr = [];
          allByKey.set(m.metricKey, allArr);
        }
        allArr.push({ date: m.date, value: m.value });
      }
    }

    const stats: (ReportMetricStat & { status: MetricDisplayStatus })[] = [];

    const allKeys = (Object.keys(METRIC_DEFINITIONS) as MetricKey[]).filter(
      (k) => !EXCLUDED_EWMA_REPORT_KEYS.includes(k)
    );

    for (const key of allKeys) {
      const def = METRIC_DEFINITIONS[key];
      const base = realBaselineMap.get(key);
      const values = periodByKey.get(key) ?? EMPTY_ARRAY;
      const hasData = values.length > 0;
      const statusType = getMetricStatusType(key, hasData);

      if (hasData) {
        let ewmaMean: number;
        let ewmaStd: number;
        if (base) {
          ewmaMean = base.ewmaMean;
          ewmaStd = base.ewmaStd;
        } else {
          const allKeyValues = (allByKey.get(key) ?? EMPTY_ARRAY)
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((m) => m.value);
          const computedBase = BaselineEngine.computeBaseline(allKeyValues, key);
          ewmaMean = computedBase.mean;
          ewmaStd = computedBase.shrunkStd;
        }

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const dev =
          ewmaMean !== 0 ? Math.round(((avg - ewmaMean) / ewmaMean) * 100) : 0;
        const z = calculateZScore(avg, ewmaMean, ewmaStd);

        stats.push({
          key,
          label: def.label,
          unit: def.unit,
          category: def.category,
          hasData: true,
          baselineMean: ewmaMean,
          periodAvg: Math.round(avg * 100) / 100,
          deviationPercent: dev,
          zScore: z,
          status: 'active',
          unavailableReason: '',
        });
      } else {
        stats.push({
          key,
          label: def.label,
          unit: def.unit,
          category: def.category,
          hasData: false,
          baselineMean: null,
          periodAvg: null,
          deviationPercent: null,
          zScore: null,
          status: statusType,
          unavailableReason: getUnavailableReason(key),
        });
      }
    }

    return stats;
  }, [dailyMetrics, baselines, selectedRange]);

  const activeCount = useMemo(
    () => reportStats.filter((s) => s.hasData).length,
    [reportStats]
  );
  const unavailableCount = reportStats.length - activeCount;

  const medImpactReports = useMemo(
    () => medications.map((m) => analyzeMedicationImpact(m, dailyMetrics, baselines, moods)),
    [medications, dailyMetrics, baselines, moods]
  );

  const awarenessNotes = useMemo(
    () =>
      generateRealReportAwarenessNotes({
        stats: reportStats,
        insights,
        moods,
        surveys,
        medImpactReports,
        effectiveDayCount,
        rangeDays: selectedRange,
      }),
    [
      reportStats,
      insights,
      moods,
      surveys,
      medImpactReports,
      effectiveDayCount,
      selectedRange,
    ]
  );

  const handleShareReport = () => {
    setIsShareWizardOpen(true);
  };

  const handleCopyReportSummary = async () => {
    const baselineStatus =
      effectiveDayCount >= 14
        ? `${effectiveDayCount} günlük kişisel EWMA baz hattı tamamlandı`
        : `Baz hattı öğrenme sürecinde (${effectiveDayCount}/14 gün)`;

    const clinicalNotesText = awarenessNotes
      .map(
        (n) =>
          `• ${n.title}: ${n.body}${
            n.sources && n.sources.length > 0 ? `\n  Kaynak: ${n.sources.join('; ')}` : ''
          }`
      )
      .join('\n');

    const latestSurvey = surveys.length > 0 ? surveys[0] : undefined;
    const text = buildDoctorReportText({
      patientName: userProfile.name || 'Danışan',
      rangeDays: selectedRange,
      generatedAt: new Date(),
      baselineStatus,
      stats: reportStats,
      medImpactReports,
      pinnedInsights,
      clinicalNotes: clinicalNotesText,
      clinicalSurveyScores: latestSurvey
        ? {
            gad7Score: latestSurvey.gad7Score,
            gad7Risk: latestSurvey.gad7Risk,
            phq9Score: latestSurvey.phq9Score,
            phq9Risk: latestSurvey.phq9Risk,
            date: latestSurvey.date,
          }
        : undefined,
    });

    await copyTextToClipboard(text);
    setShareFeedback(
      'Klinik hekim raporu panoya kopyalandı! Doktorunuza mesaj veya e-posta olarak gönderebilirsiniz.'
    );
    setTimeout(() => setShareFeedback(null), 5000);
  };

  return (
    <div className="space-y-6 pb-6 animate-fadeIn">
      {/* Controls Bar */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-comus-navy/10 text-comus-navy text-[10.5px] font-semibold mb-1">
              <FileText className="w-3 h-3 text-comus-copper" />
              <span>Yapılandırılmış Klinik Hekim &amp; Terapist Raporu</span>
            </div>
            <p className="text-xs sm:text-sm text-comus-sand-dark">
              Ruh sağlığı hekiminizle ve terapistinizle mesaj, e-posta veya klinik görüşme sırasında paylaşabileceğiniz karşılaştırmalı biyometrik göstergeler, ilaç protokolü ve doz takip özeti
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyReportSummary}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs sm:text-sm font-semibold shadow-soft transition-all cursor-pointer"
              title="Klinik rapor özetini panoya kopyala"
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Raporu Kopyala</span>
            </button>
            <button
              type="button"
              onClick={handleShareReport}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Doktorumla Paylaş</span>
            </button>
          </div>
        </div>

        {pinnedInsights.length > 0 && (
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-comus-copper/20 shadow-soft space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-comus-copper">
              Rapora Eklenen İçgörüler ({pinnedInsights.length})
            </div>
            {pinnedInsights.map((p) => (
              <div
                key={p.addedAt}
                className="flex items-start justify-between gap-3 bg-comus-surface rounded-2xl p-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-comus-navy">{p.title}</div>
                  <p className="text-[11px] text-comus-sand-dark leading-relaxed mt-0.5">
                    {p.body}
                  </p>
                  {p.sources && p.sources.length > 0 && (
                    <p className="text-[10.5px] italic text-comus-sand-dark mt-1">
                      Kaynak: {p.sources.join('; ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePinnedInsight(p.addedAt)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-white text-comus-sand-dark cursor-pointer"
                  aria-label="Rapordan kaldır"
                  title="Rapordan kaldır"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {shareFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Terapistler ve Doktorlar İçin: Hatırlama Yanlılığını (Recall Bias) Aşmak */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-comus-sand-light/30 shadow-soft space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-comus-copper">
                Klinik Amaç:
              </span>
              <span className="text-xs font-bold text-comus-navy">
                Hatırlama Yanlılığını (Recall Bias) Aşmak
              </span>
            </div>
            <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap self-start sm:self-auto shrink-0">
              Nesnel Dijital Veri
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <strong className="text-rose-950 block mb-1">
                Öznel Soru: "Geçen hafta nasıldın?"
              </strong>
              <p className="text-rose-900">
                Hasta o anki ruh haline göre hatalı veya eksik yanıt verebilir. "Çok az uyudum" veya "hep gergindim" öznel ve hatırlama yanlılığına açık bir beyandır.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <strong className="text-emerald-950 block mb-1">
                Dijital Mental İkizim Çözümü: Nesnel Biyobelirteçler
              </strong>
              <p className="text-emerald-900">
                Pazartesi ve Çarşamba 03:00'e kadar süren ekran aktivitesi, 4 saatlik uyku ve yazım yavaşlamasını net verilerle sunar. Hekimin doğru tanı ve tedavi planı oluşturmasını hızlandırır.
              </p>
            </div>
          </div>
        </div>

        {/* Configurations Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-comus-sand-light/20 shadow-soft flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-comus-navy flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-comus-copper" />
            <span>Rapor Analiz Penceresi:</span>
          </span>
          <div className="flex items-center gap-1 bg-comus-surface p-1 rounded-xl border border-comus-sand-light/30">
            {[7, 14, 30].map((days) => (
              <button
                type="button"
                key={days}
                onClick={() => setSelectedRange(days as 7 | 14 | 30)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedRange === days
                    ? 'bg-comus-navy text-white shadow-sm'
                    : 'text-comus-sand-dark hover:text-comus-navy'
                }`}
              >
                Son {days} Gün
              </button>
            ))}
          </div>
          <div className="text-[11px] text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {activeCount} / {reportStats.length} Gösterge Aktif ({unavailableCount} Gösterge İçin İzin veya Etkileşim Bekleniyor)
            </span>
          </div>
        </div>
      </div>

      {/* Doctor Share Wizard Modal */}
      {isShareWizardOpen && (
        <DoctorShareWizard
          isOpen={isShareWizardOpen}
          onClose={() => setIsShareWizardOpen(false)}
          stats={reportStats}
          rangeDays={selectedRange}
          medImpactReports={medImpactReports}
          moods={moods}
          surveys={surveys}
          awarenessNotes={awarenessNotes}
          pinnedInsights={pinnedInsights}
          effectiveDayCount={effectiveDayCount}
        />
      )}
    </div>
  );
};
