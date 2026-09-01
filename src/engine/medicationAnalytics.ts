import { DailyMetric, BaselineState, MoodReport } from '../types/engine';
import { Medication, MedicationImpactReport, MedicationEffectDelta } from '../types/medication';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';

const KEY_METRICS_TO_TRACK: MetricKey[] = [
  'night_usage_minutes',
  'typing_wpm',
  'mobility_index',
  'typing_backspace_rate',
  'touch_interaction_frequency',
];

/**
 * Calculates pre vs post medication delta analysis
 * Grounded in longitudinal psychiatric time-series analysis
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

  // Split metrics into Pre and Post windows
  const preMetrics = dailyMetrics.filter((m) => m.date < startDate);
  const postMetrics = dailyMetrics.filter((m) => m.date >= startDate && (!medication.endDate || m.date <= medication.endDate));

  const baselineMap = new Map(baselines.map((b) => [b.metricKey, b]));
  const deltas: MedicationEffectDelta[] = [];

  for (const key of KEY_METRICS_TO_TRACK) {
    const def = METRIC_DEFINITIONS[key];
    const base = baselineMap.get(key);

    const preValues = preMetrics.filter((m) => m.metricKey === key).map((m) => m.value);
    const postValues = postMetrics.filter((m) => m.metricKey === key).map((m) => m.value);

    const preAvg = preValues.length > 0
      ? preValues.reduce((a, b) => a + b, 0) / preValues.length
      : (base?.ewmaMean ?? 0);

    const postAvg = postValues.length > 0
      ? postValues.reduce((a, b) => a + b, 0) / postValues.length
      : preAvg;

    const diff = postAvg - preAvg;
    const changePercent = preAvg !== 0 ? Math.round((diff / preAvg) * 100) : 0;
    const std = base?.ewmaStd || 1;
    const zScoreDelta = Math.round(((postAvg - preAvg) / std) * 10) / 10;

    // Determine clinical improvement based on metric directionality
    let direction: 'improved' | 'declined' | 'stable' = 'stable';
    let interpretation = '';

    if (key === 'night_usage_minutes') {
      if (changePercent <= -15) {
        direction = 'improved';
        interpretation = `Gece ekran kullanımında %${Math.abs(changePercent)} azalma tespit edildi. Sirkadiyen uyku penceresinde stabilizasyon gözleniyor.`;
      } else if (changePercent >= 20) {
        direction = 'declined';
        interpretation = `Gece bölünmelerinde %${changePercent} artış gözlendi. İlacın uyku ritmi üzerindeki etkisini hekiminizle değerlendirebilirsiniz.`;
      } else {
        interpretation = `Gece oturum süresi stabil seyrediyor.`;
      }
    } else if (key === 'typing_wpm') {
      if (changePercent >= 10) {
        direction = 'improved';
        interpretation = `Yazım akıcılığında %${changePercent} artış psikomotor hızlanma ve zihinsel berraklıkla korele.`;
      } else if (changePercent <= -15) {
        direction = 'declined';
        interpretation = `Yazım hızında %${Math.abs(changePercent)} yavaşlama (sedasyon veya bilişsel ağırlık olasılığı).`;
      } else {
        interpretation = `Yazım dinamikleri dengeli ve stabil.`;
      }
    } else if (key === 'mobility_index') {
      if (changePercent >= 12) {
        direction = 'improved';
        interpretation = `Günlük fiziksel mobilite indeksinde %${changePercent} artış gözlendi.`;
      } else if (changePercent <= -15) {
        direction = 'declined';
        interpretation = `Fiziksel hareketlilik seviyesinde %${Math.abs(changePercent)} azalma kaydedildi.`;
      } else {
        interpretation = `Fiziksel hareketlilik olağan aralıkta devam ediyor.`;
      }
    } else if (key === 'typing_backspace_rate') {
      if (changePercent <= -15) {
        direction = 'improved';
        interpretation = `Düzeltme/hata oranında %${Math.abs(changePercent)} düşüş; dikkat ve odaklanma artışı.`;
      } else if (changePercent >= 20) {
        direction = 'declined';
        interpretation = `Silme tuşu kullanımında %${changePercent} artış (odaklanma güçlüğü veya ajitasyon sinyali).`;
      } else {
        interpretation = `Tuş vuruş hata oranı stabil.`;
      }
    } else {
      if (Math.abs(changePercent) < 10) {
        direction = 'stable';
        interpretation = `${def.label} baz hattı seviyesinde dengeli.`;
      } else {
        direction = changePercent > 0 ? 'improved' : 'declined';
        interpretation = `${def.label} değerinde %${changePercent} değişim ölçüldü.`;
      }
    }

    deltas.push({
      metricKey: key,
      label: def.label,
      unit: def.unit,
      preAvg: Math.round(preAvg * 10) / 10,
      postAvg: Math.round(postAvg * 10) / 10,
      changePercent,
      zScoreDelta,
      direction,
      interpretation,
    });
  }

  // Calculate Affective State Before vs After
  const preMoods = moods.filter((m) => m.date < startDate);
  const postMoods = moods.filter((m) => m.date >= startDate);

  const preMoodAvg = preMoods.length > 0
    ? preMoods.reduce((a, b) => a + b.score, 0) / preMoods.length
    : 3.0;
  const postMoodAvg = postMoods.length > 0
    ? postMoods.reduce((a, b) => a + b.score, 0) / postMoods.length
    : preMoodAvg;

  const affectiveStateBefore = Math.min(95, Math.max(10, Math.round(preMoodAvg * 18 + 15)));
  const affectiveStateAfter = Math.min(95, Math.max(10, Math.round(postMoodAvg * 18 + 15)));

  // Generate overall narrative
  const improvedCount = deltas.filter((d) => d.direction === 'improved').length;
  const declinedCount = deltas.filter((d) => d.direction === 'declined').length;

  let overallSummary = `${medication.name} ${medication.dosageMg}mg kullanımının ${daysActive}. günündesin. `;
  if (improvedCount > declinedCount) {
    overallSummary += `İlaç öncesi döneme kıyasla davranışsal ritimde ve sirkadiyen göstergelerde olumlu regülasyon sinyalleri izleniyor.`;
  } else if (declinedCount > improvedCount) {
    overallSummary += `İlaç başlangıcından bu yana bazı biyobelirteçlerde dalgalanmalar ölçüldü; bu gözlemleri doktorunuzla paylaşmanız önerilir.`;
  } else {
    overallSummary += `Davranışsal göstergeler ilaç öncesi baz hattı ile genel olarak uyumlu ve stabil seyrediyor.`;
  }

  const circadianDelta = deltas.find((d) => d.metricKey === 'night_usage_minutes');
  const circadianImpactSummary = circadianDelta
    ? circadianDelta.interpretation
    : 'Sirkadiyen ritim verileri toplanıyor.';

  return {
    medication,
    daysActive,
    deltas,
    affectiveStateBefore,
    affectiveStateAfter,
    overallSummary,
    circadianImpactSummary,
  };
}
