import { DailyMetric, BaselineState, MoodReport } from '../types/engine';
import {
  Medication,
  MedicationImpactReport,
  MedicationEffectDelta,
  MedicationMultiPeriodRow,
  TimeSlot,
} from '../types/medication';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';

const CORE_METRICS_TO_TRACK: MetricKey[] = [
  'night_usage_minutes',
  'typing_wpm',
  'mobility_index',
  'typing_backspace_rate',
  'touch_interaction_frequency',
  'screen_on_time',
  'session_duration',
  'cognitive_fatigue_score',
  'impulse_risk_index',
];

const OPTIONAL_CLINICAL_METRICS: MetricKey[] = [
  'sleep_duration',
  'sleep_efficiency',
  'sleep_sol',
  'sleep_waso',
  'typing_iki',
  'typing_hold_time',
  'typing_pause_count',
  'touch_scroll_velocity',
  'homestay_ratio',
  'mobility_radius',
  'tremor_variance',
  'light_ambient_lux',
  'night_light_violations',
];

const SLOT_LABELS_TR: Record<TimeSlot, string> = {
  morning: 'Sabah',
  noon: 'Öğle',
  evening: 'Akşam',
  night: 'Gece/Yatarken',
  as_needed: 'İhtiyaç Halinde',
};

const DEFAULT_SLOT_TIMES: Record<TimeSlot, string> = {
  morning: '09:00',
  noon: '13:00',
  evening: '19:00',
  night: '23:00',
  as_needed: '',
};

export function formatMedicationDosage(dosage: string): string {
  const trimmed = String(dosage || '').trim();
  if (!trimmed) return 'Belirtilmedi';
  if (/^\d+([.,]\d+)?$/.test(trimmed)) {
    return `${trimmed} mg`;
  }
  return trimmed;
}

export function formatMedicationSchedule(medication: Medication): string {
  const slots = medication.timeSlots || [];
  if (slots.length === 0) {
    return 'Günde 1x (Hekim talimatına göre)';
  }
  const parts = slots.map((slot, idx) => {
    const label = SLOT_LABELS_TR[slot] || slot;
    if (slot === 'as_needed') return label;
    const customTime = medication.customTimes?.[idx] || DEFAULT_SLOT_TIMES[slot];
    return customTime ? `${label} (${customTime})` : label;
  });

  const nonAsNeededCount = slots.filter((s) => s !== 'as_needed').length;
  const freqPrefix = nonAsNeededCount > 0 ? `Günde ${nonAsNeededCount}x — ` : '';
  return `${freqPrefix}${parts.join(', ')}`;
}

function shiftDateDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().split('T')[0];
}

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

function meanRounded(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function calcPercentChange(preAvg: number | null, postAvg: number | null): number | null {
  if (preAvg === null || postAvg === null) return null;
  const diff = postAvg - preAvg;
  return preAvg !== 0 ? Math.round((diff / preAvg) * 100) : postAvg === 0 ? 0 : 100;
}

/**
 * Calculates pre vs post medication delta analysis & 1-Month / 3-Month / 6-Month
 * comparative digital biomarker tables strictly from real recorded device telemetry.
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
  const formattedDosage = formatMedicationDosage(medication.dosage);
  const formattedSchedule = formatMedicationSchedule(medication);

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

  // Pre-medication 1-month (30d), 3-month (90d), 6-month (180d) date cutoffs before startDate (T_0)
  const pre1mCutoff = shiftDateDays(startDate, -30);
  const pre3mCutoff = shiftDateDays(startDate, -90);
  const pre6mCutoff = shiftDateDays(startDate, -180);

  // Post-medication 1-month (30d), 3-month (90d), 6-month (180d) date cutoffs after startDate (T_0)
  const post1mEnd = shiftDateDays(startDate, 30);
  const post3mEnd = shiftDateDays(startDate, 90);
  const post6mEnd = shiftDateDays(startDate, 180);

  const pre1mMetrics = preMetrics.filter((m) => m.date >= pre1mCutoff);
  const pre3mMetrics = preMetrics.filter((m) => m.date >= pre3mCutoff);
  const pre6mMetrics = preMetrics.filter((m) => m.date >= pre6mCutoff);

  const post1mMetrics = postMetrics.filter((m) => m.date <= post1mEnd);
  const post3mMetrics = postMetrics.filter((m) => m.date <= post3mEnd);
  const post6mMetrics = postMetrics.filter((m) => m.date <= post6mEnd);

  const preSampleDays = new Set(preMetrics.map((m) => m.date)).size;
  const postSampleDays = new Set(postMetrics.map((m) => m.date)).size;
  const pre1MonthSampleDays = new Set(pre1mMetrics.map((m) => m.date)).size;
  const pre3MonthsSampleDays = new Set(pre3mMetrics.map((m) => m.date)).size;
  const pre6MonthsSampleDays = new Set(pre6mMetrics.map((m) => m.date)).size;

  // Only consider baselines that were computed from actual user samples (sampleCount > 0)
  const realBaselineMap = new Map(
    baselines.filter((b) => (b.sampleCount ?? 0) > 0).map((b) => [b.metricKey, b])
  );

  // Track core metrics + any optional clinical metrics that have real data
  const activeOptionalKeys = OPTIONAL_CLINICAL_METRICS.filter((k) =>
    sortedMetrics.some((m) => m.metricKey === k)
  );
  const keysToEvaluate: MetricKey[] = Array.from(
    new Set([...CORE_METRICS_TO_TRACK, ...activeOptionalKeys])
  );

  const deltas: MedicationEffectDelta[] = [];
  const multiPeriodTable: MedicationMultiPeriodRow[] = [];

  for (const key of keysToEvaluate) {
    const def = METRIC_DEFINITIONS[key];
    if (!def) continue;
    const base = realBaselineMap.get(key);

    const preValues = preMetrics.filter((m) => m.metricKey === key).map((m) => m.value);
    const postValues = postMetrics.filter((m) => m.metricKey === key).map((m) => m.value);

    const pre1mVals = pre1mMetrics.filter((m) => m.metricKey === key).map((m) => m.value);
    const pre3mVals = pre3mMetrics.filter((m) => m.metricKey === key).map((m) => m.value);
    const pre6mVals = pre6mMetrics.filter((m) => m.metricKey === key).map((m) => m.value);

    const post1mVals = post1mMetrics.filter((m) => m.metricKey === key).map((m) => m.value);
    const post3mVals = post3mMetrics.filter((m) => m.metricKey === key).map((m) => m.value);
    const post6mVals = post6mMetrics.filter((m) => m.metricKey === key).map((m) => m.value);

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

    const pre1mAvg = meanRounded(pre1mVals);
    const pre3mAvg = meanRounded(pre3mVals);
    const pre6mAvg = meanRounded(pre6mVals);

    const post1mAvg = meanRounded(post1mVals);
    const post3mAvg = meanRounded(post3mVals);
    const post6mAvg = meanRounded(post6mVals);

    let changePercent: number | null = null;
    let zScoreDelta: number | null = null;
    let direction: 'improved' | 'declined' | 'stable' | 'insufficient_data' = 'insufficient_data';
    let interpretation = '';

    if (hasComparisonData && rawPreAvg !== null && rawPostAvg !== null) {
      const diff = rawPostAvg - rawPreAvg;
      changePercent = rawPreAvg !== 0 ? Math.round((diff / rawPreAvg) * 100) : rawPostAvg === 0 ? 0 : 100;
      const std = computeEmpiricalStd(preValues, base?.ewmaStd);
      zScoreDelta = Math.round(((rawPostAvg - rawPreAvg) / std) * 10) / 10;
      direction = 'stable';

      if (
        key === 'night_usage_minutes' ||
        key === 'sleep_sol' ||
        key === 'sleep_waso' ||
        key === 'cognitive_fatigue_score' ||
        key === 'impulse_risk_index'
      ) {
        if (changePercent <= -15) {
          direction = 'improved';
          interpretation = `${def.label} değerinde %${Math.abs(changePercent)} azalma (${preAvg} → ${postAvg} ${def.unit}). Regülasyon ve stabilizasyon gözleniyor.`;
        } else if (changePercent >= 20) {
          direction = 'declined';
          interpretation = `${def.label} değerinde %${changePercent} artış (${preAvg} → ${postAvg} ${def.unit}). İlacın sirkadiyen/davranışsal ritim üzerindeki etkisini hekiminizle değerlendirebilirsiniz.`;
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
      } else if (key === 'typing_backspace_rate' || key === 'tremor_variance' || key === 'typing_iki') {
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

    multiPeriodTable.push({
      metricKey: key,
      label: def.label,
      unit: def.unit,
      pre1Month: {
        avg: pre1mAvg,
        sampleDays: pre1mVals.length,
        sampleCount: pre1mVals.length,
        changePercent: calcPercentChange(pre1mAvg, postAvg),
      },
      pre3Months: {
        avg: pre3mAvg,
        sampleDays: pre3mVals.length,
        sampleCount: pre3mVals.length,
        changePercent: calcPercentChange(pre3mAvg, postAvg),
      },
      pre6Months: {
        avg: pre6mAvg,
        sampleDays: pre6mVals.length,
        sampleCount: pre6mVals.length,
        changePercent: calcPercentChange(pre6mAvg, postAvg),
      },
      postOverall: {
        avg: postAvg,
        sampleDays: postValues.length,
        sampleCount: postValues.length,
      },
      post1Month: {
        avg: post1mAvg,
        sampleDays: post1mVals.length,
        sampleCount: post1mVals.length,
      },
      post3Months: {
        avg: post3mAvg,
        sampleDays: post3mVals.length,
        sampleCount: post3mVals.length,
      },
      post6Months: {
        avg: post6mAvg,
        sampleDays: post6mVals.length,
        sampleCount: post6mVals.length,
      },
      direction,
      interpretation,
    });
  }

  // Sort deltas & multiPeriodTable so metrics with real comparison data come first, then partial data, then unmeasured
  const sortScore = (d: { pre1Month?: { avg: number | null }; postOverall?: { avg: number | null }; hasComparisonData?: boolean; hasPostData?: boolean; hasPreData?: boolean }) => {
    if (d.hasComparisonData) return 2;
    if (d.hasPostData || d.hasPreData) return 1;
    if (d.pre1Month && d.postOverall) {
      if (d.pre1Month.avg !== null && d.postOverall.avg !== null) return 2;
      if (d.pre1Month.avg !== null || d.postOverall.avg !== null) return 1;
    }
    return 0;
  };
  deltas.sort((a, b) => sortScore(b) - sortScore(a));
  multiPeriodTable.sort((a, b) => {
    const scoreA = a.pre6Months.avg !== null && a.postOverall.avg !== null ? 2 : a.pre6Months.avg !== null || a.postOverall.avg !== null ? 1 : 0;
    const scoreB = b.pre6Months.avg !== null && b.postOverall.avg !== null ? 2 : b.pre6Months.avg !== null || b.postOverall.avg !== null ? 1 : 0;
    return scoreB - scoreA;
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

  let overallSummary = `${medication.name} (${formattedDosage} • ${formattedSchedule}) kullanımının ${daysActive}. günündesin (Başlangıç: ${startDate}). `;
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

  const moodOverlayPart =
    preMoodAvg !== null || postMoodAvg !== null
      ? `Öznel ruh hali ortalaması (1–5): İlaç öncesi ${preMoodAvg !== null ? preMoodAvg.toFixed(1) : 'Kayıt yok'} → İlaç sonrası ${postMoodAvg !== null ? postMoodAvg.toFixed(1) : 'Kayıt yok'}.`
      : 'Öznel ruh hali zaman serisi için henüz karşılaştırmalı kayıt bulunmuyor.';

  const timeSeriesOverlaySummary = `T₀=${startDate} tarihinde başlayan ${medication.name} (${formattedDosage}, ${formattedSchedule}) tedavisi için zaman serisi bindirme analizinde: İlaç öncesi 1 ay (${pre1MonthSampleDays}g), 3 ay (${pre3MonthsSampleDays}g), 6 ay (${pre6MonthsSampleDays}g) ve ilaç sonrası dönem (${postSampleDays}g) gerçek sensör verileri üst üste bindirilmiştir. ${moodOverlayPart}`;

  const circadianDelta = deltas.find((d) => d.metricKey === 'night_usage_minutes');
  const circadianImpactSummary = circadianDelta
    ? circadianDelta.interpretation
    : 'Sirkadiyen ritim verileri toplanıyor.';

  return {
    medication,
    formattedDosage,
    formattedSchedule,
    daysActive,
    preSampleDays,
    postSampleDays,
    pre1MonthSampleDays,
    pre3MonthsSampleDays,
    pre6MonthsSampleDays,
    hasRealComparison: comparableDeltas.length > 0,
    deltas,
    multiPeriodTable,
    timeSeriesOverlaySummary,
    affectiveStateBefore,
    affectiveStateAfter,
    overallSummary,
    circadianImpactSummary,
  };
}
