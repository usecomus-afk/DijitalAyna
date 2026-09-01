import { db } from '../db';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';
import { BaselineState, DailyMetric } from '../types/engine';

export const EWMA_ALPHA = 0.18; // Exponential smoothing factor
export const MIN_BASELINE_DAYS = 7; // 7-day initial learning period

/**
 * Calculates EWMA (Exponential Weighted Moving Average) and Rolling Standard Deviation
 */
export function computeEWMA(values: number[], alpha = EWMA_ALPHA): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 1 };
  if (values.length === 1) return { mean: values[0], std: Math.max(0.1, values[0] * 0.1) };

  let ewmaMean = values[0];
  let ewmaVariance = 0;

  for (let i = 1; i < values.length; i++) {
    const val = values[i];
    const diff = val - ewmaMean;
    ewmaMean = alpha * val + (1 - alpha) * ewmaMean;
    // Exponentially weighted moving variance
    ewmaVariance = (1 - alpha) * (ewmaVariance + alpha * diff * diff);
  }

  const std = Math.max(0.01, Math.sqrt(ewmaVariance));
  return {
    mean: Math.round(ewmaMean * 100) / 100,
    std: Math.round(std * 100) / 100,
  };
}

/**
 * Recalculate baseline states for all metrics in the database
 */
export async function calculateEWMAForMetrics(): Promise<Record<MetricKey, BaselineState>> {
  const metricKeys = Object.keys(METRIC_DEFINITIONS) as MetricKey[];
  const results: Partial<Record<MetricKey, BaselineState>> = {};

  for (const key of metricKeys) {
    const metrics: DailyMetric[] = await db.dailyMetrics
      .where('metricKey')
      .equals(key)
      .sortBy('date');

    if (metrics.length === 0) continue;

    // Use established baseline period (e.g. days 0 to length-4 if >= 10 days, to avoid contaminating baseline with current anomaly)
    const baselineSeries = metrics.length >= 10
      ? metrics.slice(0, metrics.length - 3)
      : metrics;

    const values = baselineSeries.map(m => m.value);
    const { mean, std } = computeEWMA(values, EWMA_ALPHA);
    const latestDate = metrics[metrics.length - 1].date;

    const baselineState: BaselineState = {
      metricKey: key,
      ewmaMean: mean,
      ewmaStd: std,
      sampleCount: metrics.length,
      lastUpdated: latestDate,
      isEstablished: metrics.length >= MIN_BASELINE_DAYS,
    };

    await db.baselines.put(baselineState);
    results[key] = baselineState;
  }

  return results as Record<MetricKey, BaselineState>;
}
