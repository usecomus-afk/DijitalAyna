import { DailyMetric, BaselineState, MoodReport } from '../types/engine';
import { Medication, MedicationImpactReport, MedicationEffectDelta } from '../types/medication';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';

const CORE_METRICS_TO_TRACK: MetricKey[] = [
  'night_usage_minutes',
  'typing_wpm',
  'mobility_index',
  'typing_backspace_rate',
  'touch_interaction_frequency',
];

const OPTIONAL_CLINICAL_METRICS: MetricKey[] = [
  'sleep_duration',
  'sleep_efficiency',
  'sleep_sol',
  'sleep_waso',
  'screen_on_time',
  'session_duration',
  'tremor_variance',
];

function computeEmpiricalStd(values: number[], fallbackStd?: number): number {
  if (values.length >= 2) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    if (std > 0.01) return std;
  }
  if (fallbackStd && fallbackStd > 0) return fallbackStd;
  return 1;
}

/**
 * Calculates pre vs post medication delta analysis strictly from real recorded device telemetry.
 * Zero-Mock Policy: Never fabricates pre-medication or post-medication values from normative priors.
 */
export function analyzeMedicationImpact(
  medication: Medication,
  dailyMetrics: DailyMetric[],
  baselines: BaselineState[],
  moods: MoodReport[] = []
): MedicationImpactReport {
  const startDate = medication.startDate;
  const endDate = medication.endDate || new Date().toISOString().split('T')[0];

  // Calculate days active
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const daysActive = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

  // Split real recorded metrics into Pre (< startDate) and Post (>= startDate) windows
  const sortedMetrics = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
  const preMetrics = sortedMetrics.filter((m) => m.date < startDate);
  const postMetrics = sortedMetrics.filter(
    (m) => m.date >= startDate && (!medication.endDate || m.date <= medication.endDate)
  );

  const preSampleDays = new Set(preMetrics.map((m) => m.date)).size;
  const postSampleDays = new Set(postMetrics.map((m) => m.date)).size;

  // Only consider baselines that were computed from actual user samples (sampleCount > 0)
  const realBaselineMap = new Map(
    baselines.filter((b) => (b.sampleCount ?? 0) > 0).map((b) => [b.metricKey, b])
  );

  // Track core metrics + any optional clinical metrics (e.g., Apple Health sleep) that have real data
  const activeOptionalKeys = OPTIONAL_CLINICAL_METRICS.filter((k) =>
    sortedMetrics.some((m) => m.metricKey === k)
  );
  const keysToEvaluate: MetricKey[] = [...CORE_METRICS_TO_TRACK, ...activeOptionalKeys];

  const deltas: MedicationEffectDelta[] = [];

  for (const key of keysToEvaluate) {
    const def = METRIC_DEFINITIONS[key];
    if (!def) continue;
    const base = realBaselineMap.get(key);

    const preValues = preMetrics.filter((m) => m.metricKey === key).map((m) => m.value);
    const postValues = postMetrics.filter((m) => m.metricKey === key).map((m) => m.value);

    const hasPreData = preValues.length > 0;
    const hasPostData = postValues.length > 0;
    const hasComparisonData = hasPreData && hasPostData;

    const rawPreAvg = hasPreData
      ? preValues.reduce((a, b) => a + b, 0) / preValues.length
      : null;
    const rawPostAvg = hasPostData
      ? postValues.reduce((a, b) => a + b, 0) / postValues.length
      : null;

    const preAvg = rawPreAvg !== null ? Math.round(rawPreAvg * 10) / 10 : null;
    const postAvg = rawPostAvg !== null ? Math.round(rawPostAvg * 10) / 10 : null;

    let changePercent: number | null = null;
    let zScoreDelta: number | null = null;
    let direction: 'improved' | 'declined' | 'stable' | 'insufficient_data' = 'insufficient_data';
    let interpretation = '';

    if (hasComparisonData && rawPreAvg !== null && rawPostAvg !== null) {
      const diff = rawPostAvg - rawPreAvg;
      changePercent = rawPreAvg !== 0 ? Math.round((diff / rawPreAvg) * 100) : (rawPostAvg === 0 ? 0 : 100);
      const std = computeEmpiricalStd(preValues, base?.ewmaStd);
      zScoreDelta = Math.round(((rawPostAvg - rawPreAvg) / std) * 10) / 10;
      direction = 'stable';

      if (key === 'night_usage_minutes' || key === 'sleep_sol' || key === 'sleep_waso') {
        if (changePercent <= -15) {
          direction = 'improved';
          interpretation = `${def.label} değerinde %${Math.abs(changePercent)} azalma (${preAvg} → ${postAvg} ${def.unit}). Sirkadiyen uyku penceresinde stabilizasyon gözleniyor.`;
        } else if (changePercent >= 20) {
          direction = 'declined';
          interpretation = `${def.label} değerinde %${changePercent} artış (${preAvg} → ${postAvg} ${def.unit}). İlacın uyku ritmi üzerindeki etkisini hekiminizle değerlendirebilirsiniz.`;
        } else {
          interpretation = `${def.label} ilaç öncesi baz ile uyumlu ve stabil (${preAvg} → ${postAvg} ${def.unit}).`;
        }
      } else if (key === 'typing_wpm') {
        if (changePercent >= 10) {
          direction = 'improved';
          interpretation = `Yazım akıcılığında %${changePercent} artış (${preAvg} → ${postAvg} WPM); psikomotor hızlanma ve zihinsel berraklıkla korele.`;
        } else if (changePercent <= -15) {
          direction = 'declined';
          interpretation = `Yazım hızında %${Math.abs(changePercent)} yavaşlama (${preAvg} → ${postAvg} WPM; sedasyon veya bilişsel ağırlık olasılığı).`;
        } else {
          interpretation = `Yazım dinamikleri dengeli ve stabil (${preAvg} → ${postAvg} WPM).`;
        }
      } else if (key === 'mobility_index' || key === 'sleep_efficiency' || key === 'sleep_duration') {
        if (changePercent >= 10) {
          direction = 'improved';
          interpretation = `${def.label} göstergesinde %${changePercent} artış (${preAvg} → ${postAvg} ${def.unit}) kaydedildi.`;
        } else if (changePercent <= -15) {
          direction = 'declined';
          interpretation = `${def.label} seviyesinde %${Math.abs(changePercent)} azalma (${preAvg} → ${postAvg} ${def.unit}) kaydedildi.`;
        } else {
          interpretation = `${def.label} olağan aralıkta devam ediyor (${preAvg} → ${postAvg} ${def.unit}).`;
        }
      } else if (key === 'typing_backspace_rate' || key === 'tremor_variance') {
        if (changePercent <= -15) {
          direction = 'improved';
          interpretation = `${def.label} oranında %${Math.abs(changePercent)} düşüş (${preAvg} → ${postAvg} ${def.unit}); dikkat ve motor kontrol artışı.`;
        } else if (changePercent >= 20) {
          direction = 'declined';
          interpretation = `${def.label} değerinde %${changePercent} artış (${preAvg} → ${postAvg} ${def.unit}; odaklanma güçlüğü veya ajitasyon sinyali).`;
        } else {
          interpretation = `${def.label} stabil seyrediyor (${preAvg} → ${postAvg} ${def.unit}).`;
        }
      } else {
        if (Math.abs(changePercent) < 10) {
          direction = 'stable';
          interpretation = `${def.label} baz hattı seviyesinde dengeli (${preAvg} → ${postAvg} ${def.unit}).`;
        } else {
          direction = changePercent > 0 ? 'improved' : 'declined';
          interpretation = `${def.label} değerinde %${changePercent} gerçek değişim ölçüldü (${preAvg} → ${postAvg} ${def.unit}).`;
        }
      }
    } else if (!hasPreData && hasPostData && postAvg !== null) {
      if (postValues.length >= 2) {
        const firstVal = Math.round(postValues[0] * 10) / 10;
        const lastVal = Math.round(postValues[postValues.length - 1] * 10) / 10;
        interpretation = `İlaç başlangıç tarihi (${startDate}) öncesinde kayıtlı ölçüm yok. İlaç döneminde ${postValues.length} günlük gerçek ölçüm ortalaması: ${postAvg} ${def.unit} (ilk gün: ${firstVal} → son gün: ${lastVal} ${def.unit}).`;
      } else {
        interpretation = `İlaç başlangıç tarihi (${startDate}) öncesinde kayıtlı ölçüm yok. İlaç döneminde 1 günlük gerçek ölçüm (${postAvg} ${def.unit}) kaydedildi; karşılaştırmalı delta için veri birikiyor.`;
      }
    } else if (hasPreData && !hasPostData && preAvg !== null) {
      interpretation = `İlaç öncesi ${preValues.length} günlük gerçek ort. (${preAvg} ${def.unit}) mevcut; ${startDate} sonrasında henüz bu sensörden ölçüm kaydedilmedi.`;
    } else {
      interpretation = `Bu biyobelirteç için henüz gerçek sensör veya kullanım verisi kaydedilmedi.`;
    }

    deltas.push({
      metricKey: key,
      label: def.label,
      unit: def.unit,
      preAvg,
      postAvg,
      changePercent,
      zScoreDelta,
      preSampleCount: preValues.length,
      postSampleCount: postValues.length,
      hasPreData,
      hasPostData,
      hasComparisonData,
      direction,
      interpretation,
    });
  }

  // Sort deltas so metrics with real comparison data come first, then partial data, then unmeasured
  deltas.sort((a, b) => {
    const score = (d: MedicationEffectDelta) =>
      d.hasComparisonData ? 2 : d.hasPostData || d.hasPreData ? 1 : 0;
    return score(b) - score(a);
  });

  // Calculate Affective State Before vs After strictly from real MoodReports
  const preMoods = moods.filter((m) => m.date < startDate);
  const postMoods = moods.filter(
    (m) => m.date >= startDate && (!medication.endDate || m.date <= medication.endDate)
  );

  const preMoodAvg =
    preMoods.length > 0 ? preMoods.reduce((a, b) => a + b.score, 0) / preMoods.length : null;
  const postMoodAvg =
    postMoods.length > 0 ? postMoods.reduce((a, b) => a + b.score, 0) / postMoods.length : null;

  const affectiveStateBefore =
    preMoodAvg !== null ? Math.min(95, Math.max(10, Math.round(preMoodAvg * 18 + 15))) : null;
  const affectiveStateAfter =
    postMoodAvg !== null ? Math.min(95, Math.max(10, Math.round(postMoodAvg * 18 + 15))) : null;

  // Generate honest overall narrative based strictly on real data availability
  const comparableDeltas = deltas.filter((d) => d.hasComparisonData);
  const activePostDeltas = deltas.filter((d) => d.hasPostData);
  const improvedCount = comparableDeltas.filter((d) => d.direction === 'improved').length;
  const declinedCount = comparableDeltas.filter((d) => d.direction === 'declined').length;
  const cleanDosage = String(medication.dosage || '').replace(/\s*mg$/i, '').trim();
  const dosageLabel = cleanDosage ? `${cleanDosage}mg` : medication.dosage;

  let overallSummary = `${medication.name} ${dosageLabel} kullanımının ${daysActive}. günündesin. `;
  if (comparableDeltas.length > 0) {
    if (improvedCount > declinedCount) {
      overallSummary += `İlaç öncesi (${preSampleDays} gün) ve ilaç dönemi (${postSampleDays} gün) gerçek ölçümleri karşılaştırıldığında ${comparableDeltas.length} aktif biyobelirteçte olumlu regülasyon sinyalleri izleniyor.`;
    } else if (declinedCount > improvedCount) {
      overallSummary += `İlaç başlangıcından bu yana ölçülen ${comparableDeltas.length} gerçek biyobelirteçte dalgalanmalar saptandı; bu gözlemleri hekiminizle paylaşmanız önerilir.`;
    } else {
      overallSummary += `Ölçülen ${comparableDeltas.length} gerçek biyobelirteç ilaç öncesi baz hattı ile genel olarak uyumlu ve stabil seyrediyor.`;
    }
  } else if (activePostDeltas.length > 0) {
    overallSummary += `İlaç başlangıç tarihi (${startDate}) öncesine ait geçmiş sensör kaydı bulunmadığından sentetik/tahmini "İlaç Öncesi Baz" veya "Delta %" üretilmemiştir. İlaç döneminde toplanan ${activePostDeltas.length} aktif göstergenin (${postSampleDays} gün) gerçek ölçüm ortalamaları aşağıda sunulmuştur.`;
  } else {
    overallSummary += `Bu ilaç dönemi için henüz yeterli gerçek sensör ölçümü kaydedilmedi. Uygulama kullanıldıkça ve sensör izinleri aktif oldukça gerçek veriler otomatik olarak analize yansıyacaktır.`;
  }

  const circadianDelta = deltas.find((d) => d.metricKey === 'night_usage_minutes');
  const circadianImpactSummary = circadianDelta
    ? circadianDelta.interpretation
    : 'Sirkadiyen ritim verileri toplanıyor.';

  return {
    medication,
    daysActive,
    preSampleDays,
    postSampleDays,
    hasRealComparison: comparableDeltas.length > 0,
    deltas,
    affectiveStateBefore,
    affectiveStateAfter,
    overallSummary,
    circadianImpactSummary,
  };
}
