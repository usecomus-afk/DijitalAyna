import { db } from '../db';
import { MetricKey } from '../types/sensor';
import { AnomalyResult, BaselineState, DailyMetric } from '../types/engine';
import { BaselineEngine, MIN_ACTIVE_DAYS_FOR_DEVIATION } from './BaselineEngine';

export const ANOMALY_Z_THRESHOLD = 2.0;

// Hardware noise metrics excluded from clinical mental anomaly triggering
const HARDWARE_NOISE_KEYS = new Set<string>([
  'battery_level',
  'is_charging',
  'network_online',
]);

/**
 * Calculates Standard Z-Score with safe division
 */
export function calculateZScore(value: number, mean: number, std: number): number {
  if (std <= 0.0001) return 0;
  const z = (value - mean) / std;
  return Math.round(z * 100) / 100;
}

/**
 * Calculates Robust Modified Z-Score:
 * $$Modified\_Z = 0.6745 \times \frac{X - \text{Median}}{\max(MAD, \epsilon)}$$
 */
export function calculateModifiedZScore(
  value: number,
  median: number,
  mad: number,
  metricKey?: MetricKey,
  epsilon?: number
): number {
  return BaselineEngine.calculateModifiedZScore(value, median, mad, metricKey, epsilon);
}

/**
 * Evaluates anomalies for a given date against stored baseline states using robust statistics
 */
export async function detectAnomaliesForDay(date: string): Promise<AnomalyResult[]> {
  const metrics: DailyMetric[] = await db.dailyMetrics.where('date').equals(date).toArray();
  const baselines: BaselineState[] = await db.baselines.toArray();
  const baselineMap = new Map<MetricKey, BaselineState>(
    baselines.map((b) => [b.metricKey, b])
  );

  const anomalyResults: AnomalyResult[] = [];

  for (const metric of metrics) {
    // Purge hardware noise from mental biomarker anomaly detection
    if (HARDWARE_NOISE_KEYS.has(metric.metricKey)) continue;

    const base = baselineMap.get(metric.metricKey);
    if (!base) continue;

    const center = base.median ?? base.ewmaMean;
    const dispersion = base.mad ?? base.ewmaStd;

    // Use Modified Z-score with clinical epsilon
    const zScore = calculateModifiedZScore(metric.value, center, dispersion, metric.metricKey);

    // Minimum baseline requires at least 3 active days. Until then, suppress anomaly labels
    const isColdStart = (base.sampleCount ?? 0) < MIN_ACTIVE_DAYS_FOR_DEVIATION;
    const isAnomaly = !isColdStart && Math.abs(zScore) >= ANOMALY_Z_THRESHOLD && base.isEstablished;

    const deviationPercent = center !== 0
      ? Math.round(((metric.value - center) / center) * 1000) / 10
      : 0;

    anomalyResults.push({
      metricKey: metric.metricKey,
      date,
      currentValue: metric.value,
      baselineMean: center,
      baselineStd: dispersion,
      zScore,
      isAnomaly,
      deviationPercent,
      direction: zScore > 0 ? 'above' : 'below',
    });
  }

  return anomalyResults;
}

/**
 * Compute correlation confidence level based on number and types of concurrent anomalies
 */
export function assessAnomalyConfidence(anomalies: AnomalyResult[]): 'low' | 'medium' | 'high' {
  const count = anomalies.filter((a) => a.isAnomaly).length;
  if (count >= 3) return 'high';
  if (count === 2) return 'medium';
  return 'low';
}
