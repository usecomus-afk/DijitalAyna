import { db } from '../db';
import { MetricKey } from '../types/sensor';
import { AnomalyResult, BaselineState, DailyMetric } from '../types/engine';

export const ANOMALY_Z_THRESHOLD = 2.0;

/**
 * Calculates Z-Score with safe division
 */
export function calculateZScore(value: number, mean: number, std: number): number {
  if (std <= 0.0001) return 0;
  const z = (value - mean) / std;
  return Math.round(z * 100) / 100;
}

/**
 * Evaluates anomalies for a given date against stored baseline states
 */
export async function detectAnomaliesForDay(date: string): Promise<AnomalyResult[]> {
  const metrics: DailyMetric[] = await db.dailyMetrics.where('date').equals(date).toArray();
  const baselines: BaselineState[] = await db.baselines.toArray();
  const baselineMap = new Map<MetricKey, BaselineState>(
    baselines.map(b => [b.metricKey, b])
  );

  const anomalyResults: AnomalyResult[] = [];

  for (const metric of metrics) {
    const base = baselineMap.get(metric.metricKey);
    if (!base || !base.isEstablished) continue;

    const zScore = calculateZScore(metric.value, base.ewmaMean, base.ewmaStd);
    const isAnomaly = Math.abs(zScore) >= ANOMALY_Z_THRESHOLD;
    const deviationPercent = base.ewmaMean !== 0
      ? Math.round(((metric.value - base.ewmaMean) / base.ewmaMean) * 1000) / 10
      : 0;

    anomalyResults.push({
      metricKey: metric.metricKey,
      date,
      currentValue: metric.value,
      baselineMean: base.ewmaMean,
      baselineStd: base.ewmaStd,
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
  const count = anomalies.filter(a => a.isAnomaly).length;
  if (count >= 3) return 'high';
  if (count === 2) return 'medium';
  return 'low';
}
