import { db } from '../db';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';
import { BaselineState, DailyMetric } from '../types/engine';

export const EWMA_LAMBDA = 0.20; // Literature standard exponential smoothing factor (Guth et al., 2025)
export const MIN_BASELINE_DAYS = 14; // Strictly 14 days required before baseline is established
export const SPC_L_FACTOR = 2.5; // 2.5 sigma control limit factor
export const BAYESIAN_PSEUDO_M = 5; // m=5 pseudo-observations for variance shrinkage
export const EPSILON = 0.001;

/**
 * Clinical reference standard deviation priors from literature
 * (Torous et al., 2018; Zulueta et al., 2018; Wang et al., 2014)
 */
export const CLINICAL_PRIORS: Partial<Record<MetricKey, { priorMean: number; priorStd: number }>> = {
  typing_wpm: { priorMean: 45, priorStd: 12 },
  typing_iki: { priorMean: 240, priorStd: 50 },
  typing_backspace_rate: { priorMean: 12, priorStd: 6 },
  typing_pause_count: { priorMean: 3, priorStd: 2 },
  mobility_index: { priorMean: 65, priorStd: 18 },
  tremor_variance: { priorMean: 0.15, priorStd: 0.08 },
  screen_on_time: { priorMean: 180, priorStd: 50 },
  night_usage_minutes: { priorMean: 10, priorStd: 10 },
  session_duration: { priorMean: 15, priorStd: 8 },
  touch_scroll_velocity: { priorMean: 450, priorStd: 120 },
  touch_interaction_frequency: { priorMean: 30, priorStd: 12 },
  voice_pitch_variance: { priorMean: 25, priorStd: 8 },
  voice_speech_rate: { priorMean: 130, priorStd: 25 },
};

export interface BaselineComputationResult {
  mean: number;
  sampleStd: number;
  shrunkStd: number;
  sampleCount: number;
  isEstablished: boolean;
  ucl: number;
  lcl: number;
}

/**
 * BaselineEngine
 * Single source of truth for EWMA (lambda=0.20), Bayesian variance shrinkage,
 * time-varying statistical process control (SPC) limits, and cold-start protection.
 */
export class BaselineEngine {
  public static readonly DEFAULT_LAMBDA = EWMA_LAMBDA;
  public static readonly MIN_DAYS = MIN_BASELINE_DAYS;
  public static readonly L_FACTOR = SPC_L_FACTOR;
  public static readonly EPSILON = EPSILON;

  /**
   * Computes EWMA mean and sample variance across chronological values:
   * $$Z_t = \lambda X_t + (1 - \lambda) Z_{t-1}$$
   */
  static computeEWMA(
    values: number[],
    lambda = EWMA_LAMBDA
  ): { mean: number; sampleStd: number } {
    if (values.length === 0) {
      return { mean: 0, sampleStd: 1 };
    }
    if (values.length === 1) {
      return { mean: values[0], sampleStd: Math.max(0.1, Math.abs(values[0] * 0.1)) };
    }

    let mean = values[0];
    let variance = 0;

    for (let i = 1; i < values.length; i++) {
      const val = values[i];
      const delta = val - mean;
      mean = lambda * val + (1 - lambda) * mean;
      variance = (1 - lambda) * (variance + lambda * delta * delta);
    }

    const sampleStd = Math.max(0.01, Math.sqrt(variance));
    return {
      mean: Math.round(mean * 100) / 100,
      sampleStd: Math.round(sampleStd * 100) / 100,
    };
  }

  /**
   * Applies Bayesian variance shrinkage to prevent variance collapse and Z-score explosion (Z > 8.0)
   * during cold start (n < 14 days):
   * $$\sigma^2_{\text{shrunk}} = \frac{n \cdot s^2 + m \cdot \sigma^2_{\text{prior}}}{n + m}$$
   */
  static computeShrunkStd(
    sampleStd: number,
    sampleCount: number,
    metricKey?: MetricKey,
    empiricalMean = 50
  ): number {
    const priorInfo = metricKey ? CLINICAL_PRIORS[metricKey] : undefined;
    const priorStd = priorInfo?.priorStd ?? Math.max(1.0, Math.abs(empiricalMean * 0.15));

    const n = Math.max(1, sampleCount);
    const m = BAYESIAN_PSEUDO_M;
    const s2 = sampleStd * sampleStd;
    const prior2 = priorStd * priorStd;

    const shrunkVariance = (n * s2 + m * prior2) / (n + m);
    return Math.max(0.05, Math.round(Math.sqrt(shrunkVariance) * 100) / 100);
  }

  /**
   * Computes time-varying Statistical Process Control (SPC) limits for EWMA:
   * $$UCL_t / LCL_t = \mu_0 \pm L \cdot \sigma_{\text{shrunk}} \sqrt{\frac{\lambda}{2-\lambda} \left[ 1 - (1-\lambda)^{2t} \right]}$$
   */
  static computeTimeVaryingLimits(
    baselineMean: number,
    shrunkStd: number,
    t: number,
    lambda = EWMA_LAMBDA,
    L = SPC_L_FACTOR
  ): { ucl: number; lcl: number } {
    const timeFactor = Math.sqrt(
      (lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * Math.max(1, t)))
    );
    const margin = L * shrunkStd * timeFactor;

    return {
      ucl: Math.round((baselineMean + margin) * 100) / 100,
      lcl: Math.round((baselineMean - margin) * 100) / 100,
    };
  }

  /**
   * Comprehensive baseline computation for a metric history
   */
  static computeBaseline(
    values: number[],
    metricKey?: MetricKey
  ): BaselineComputationResult {
    const n = values.length;
    const isEstablished = n >= MIN_BASELINE_DAYS;
    const { mean, sampleStd } = this.computeEWMA(values, EWMA_LAMBDA);
    const shrunkStd = this.computeShrunkStd(sampleStd, n, metricKey, mean);
    const limits = this.computeTimeVaryingLimits(mean, shrunkStd, n, EWMA_LAMBDA, SPC_L_FACTOR);

    return {
      mean,
      sampleStd,
      shrunkStd,
      sampleCount: n,
      isEstablished,
      ucl: limits.ucl,
      lcl: limits.lcl,
    };
  }

  /**
   * Convenience helper returning a BaselineState
   */
  static calculateEWMA(
    metricKey: MetricKey,
    values: number[],
    lastUpdated = new Date().toISOString().split('T')[0]
  ): BaselineState {
    const res = this.computeBaseline(values, metricKey);
    return {
      metricKey,
      ewmaMean: res.mean,
      ewmaStd: res.shrunkStd,
      sampleCount: res.sampleCount,
      lastUpdated,
      isEstablished: res.isEstablished,
    };
  }

  /**
   * Calculates Individualized Z-Score using shrunk standard deviation:
   * $$Z = \frac{X_t - \mu_{baseline}}{\sigma_{\text{shrunk}} + \epsilon}$$
   */
  static calculateZScore(
    currentValue: number,
    baselineMean: number,
    baselineStd: number,
    epsilon = EPSILON
  ): number {
    const denominator = baselineStd + epsilon;
    if (denominator <= 0) return 0;
    const z = (currentValue - baselineMean) / denominator;
    return Math.round(z * 100) / 100;
  }

  /**
   * Normalizes a feature vector against established or shrunk baselines
   */
  static normalizeFeatureVector(
    currentFeatures: Record<string, number>,
    baselines: Record<string, { mean: number; std: number }>
  ): Record<string, { zScore: number; isAnomaly: boolean; direction: 'above' | 'below' }> {
    const result: Record<string, { zScore: number; isAnomaly: boolean; direction: 'above' | 'below' }> = {};

    for (const [key, value] of Object.entries(currentFeatures)) {
      const base = baselines[key] || { mean: value, std: 1 };
      const z = BaselineEngine.calculateZScore(value, base.mean, base.std);
      const isAnomaly = Math.abs(z) >= SPC_L_FACTOR;

      result[key] = {
        zScore: z,
        isAnomaly,
        direction: z >= 0 ? 'above' : 'below',
      };
    }

    return result;
  }
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

    // Use established baseline period (slice recent if >= 14 days to prevent anomaly pollution)
    const baselineSeries = metrics.length >= 14
      ? metrics.slice(0, metrics.length - 3)
      : metrics;

    const values = baselineSeries.map((m) => m.value);
    const baselineResult = BaselineEngine.computeBaseline(values, key);
    const latestDate = metrics[metrics.length - 1].date;

    const baselineState: BaselineState = {
      metricKey: key,
      ewmaMean: baselineResult.mean,
      ewmaStd: baselineResult.shrunkStd, // Shrunk standard deviation prevents cold start collapse
      sampleCount: metrics.length,
      lastUpdated: latestDate,
      isEstablished: metrics.length >= MIN_BASELINE_DAYS,
    };

    await db.baselines.put(baselineState);
    results[key] = baselineState;
  }

  return results as Record<MetricKey, BaselineState>;
}
