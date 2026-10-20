import { db } from '../db';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';
import { BaselineState, DailyMetric } from '../types/engine';

export const EWMA_LAMBDA = 0.20; // Literature standard exponential smoothing factor (Guth et al., 2025)
export const MIN_BASELINE_DAYS = 14; // Strictly 14 days required before baseline is fully established
export const MIN_ACTIVE_DAYS_FOR_DEVIATION = 3; // Minimum 3 active days before non-learning state
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
  typing_hold_time: { priorMean: 120, priorStd: 20 },
  mobility_index: { priorMean: 65, priorStd: 18 },
  homestay_ratio: { priorMean: 60, priorStd: 20 }, // expressed as percentage [0, 100]%
  mobility_radius: { priorMean: 5, priorStd: 2 },
  tremor_variance: { priorMean: 0.15, priorStd: 0.08 },
  screen_on_time: { priorMean: 180, priorStd: 50 },
  night_usage_minutes: { priorMean: 10, priorStd: 10 },
  session_duration: { priorMean: 15, priorStd: 8 },
  touch_scroll_velocity: { priorMean: 450, priorStd: 120 },
  touch_interaction_frequency: { priorMean: 30, priorStd: 12 },
  voice_pitch_variance: { priorMean: 25, priorStd: 8 },
  voice_speech_rate: { priorMean: 130, priorStd: 25 },
  sleep_efficiency: { priorMean: 85, priorStd: 10 },
  sleep_duration: { priorMean: 420, priorStd: 60 },
  sleep_sol: { priorMean: 20, priorStd: 10 },
  sleep_waso: { priorMean: 30, priorStd: 15 },
};

/**
 * Minimum clinically meaningful variance (Epsilon floor for MAD).
 * Protects against division by zero or inflated Z-scores when user behaviour is identical across days.
 */
export const CLINICAL_MIN_VARIANCE: Partial<Record<MetricKey, number>> = {
  typing_wpm: 2.0, // Minimum 2.0 WPM variance
  typing_iki: 15.0, // 15 ms
  typing_backspace_rate: 1.5, // 1.5%
  typing_pause_count: 1.0,
  typing_hold_time: 10.0, // 10 ms
  mobility_index: 3.0,
  homestay_ratio: 3.0, // 3%
  mobility_radius: 0.5, // 0.5 km
  tremor_variance: 0.02,
  screen_on_time: 10.0, // 10 min
  night_usage_minutes: 5.0, // 5 min
  session_duration: 1.0, // 1 min
  touch_scroll_velocity: 50.0, // 50 px/s
  touch_interaction_frequency: 3.0, // 3 touches/min
  voice_pitch_variance: 2.0,
  voice_speech_rate: 5.0,
  sleep_efficiency: 2.0, // 2%
  sleep_duration: 15.0, // 15 min
  sleep_sol: 3.0, // 3 min
  sleep_waso: 5.0, // 5 min
};

export interface RobustBaselineResult {
  median: number;
  mad: number;
  effectiveMad: number;
  iqr: number;
  mean: number;
  sampleStd: number;
  shrunkStd: number;
  sampleCount: number;
  isEstablished: boolean;
  ucl: number;
  lcl: number;
}

export type BaselineComputationResult = RobustBaselineResult;

/**
 * BaselineEngine
 * Robust Statistical Baseline & Anomaly Detection Engine
 * Grounded in non-Gaussian digital phenotyping telemetry:
 * - Central tendency: Median over rolling active days
 * - Dispersion: Median Absolute Deviation (MAD) & IQR
 * - Normalized Score: Modified Z-Score with clinically meaningful epsilon protection
 */
export class BaselineEngine {
  public static readonly DEFAULT_LAMBDA = EWMA_LAMBDA;
  public static readonly MIN_DAYS = MIN_BASELINE_DAYS;
  public static readonly MIN_ACTIVE_DAYS = MIN_ACTIVE_DAYS_FOR_DEVIATION;
  public static readonly L_FACTOR = SPC_L_FACTOR;
  public static readonly EPSILON = EPSILON;

  /**
   * Computes the statistical median of a numeric array
   */
  static computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  }

  /**
   * Computes Median Absolute Deviation (MAD):
   * $$MAD = \text{Median}(|X_i - \text{Median}(X)|)$$
   */
  static computeMAD(values: number[], medianVal?: number): number {
    if (values.length <= 1) return 0;
    const m = medianVal ?? this.computeMedian(values);
    const deviations = values.map((v) => Math.abs(v - m));
    return this.computeMedian(deviations);
  }

  /**
   * Computes Interquartile Range (IQR):
   * $$IQR = Q3 - Q1$$
   */
  static computeIQR(values: number[]): { q1: number; q3: number; iqr: number } {
    if (values.length === 0) return { q1: 0, q3: 0, iqr: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const getPercentile = (p: number) => {
      const idx = (n - 1) * p;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    const q1 = Math.round(getPercentile(0.25) * 100) / 100;
    const q3 = Math.round(getPercentile(0.75) * 100) / 100;
    const iqr = Math.round(Math.max(0, q3 - q1) * 100) / 100;

    return { q1, q3, iqr };
  }

  /**
   * Calculates Modified Z-score using Boris Iglewicz and David Hoaglin (1993) standard:
   * $$Modified\_Z = 0.6745 \times \frac{X - \text{Median}}{\max(MAD, \epsilon)}$$
   *
   * @param value The observed daily telemetry measurement
   * @param median Baseline median
   * @param mad Baseline Median Absolute Deviation
   * @param metricKey Optional metric key to look up clinically meaningful epsilon
   * @param customEpsilon Optional custom epsilon override
   */
  static calculateModifiedZScore(
    value: number,
    median: number,
    mad: number,
    metricKey?: MetricKey,
    customEpsilon?: number
  ): number {
    const defaultEpsilon = metricKey ? (CLINICAL_MIN_VARIANCE[metricKey] ?? 0.5) : 0.5;
    const eps = customEpsilon ?? defaultEpsilon;
    const effectiveMad = Math.max(mad, eps);

    if (effectiveMad <= 0) return 0;
    const modZ = (0.6745 * (value - median)) / effectiveMad;
    return Math.round(modZ * 100) / 100;
  }

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
   * Comprehensive robust baseline computation over rolling active days
   */
  static computeBaseline(
    values: number[],
    metricKey?: MetricKey
  ): RobustBaselineResult {
    const n = values.length;
    const isEstablished = n >= MIN_BASELINE_DAYS;

    // Rolling window: use up to 28 most recent active days
    const windowValues = values.slice(-28);

    const median = this.computeMedian(windowValues);
    const mad = this.computeMAD(windowValues, median);
    const eps = metricKey ? (CLINICAL_MIN_VARIANCE[metricKey] ?? 0.5) : 0.5;
    const effectiveMad = Math.max(mad, eps);
    const { iqr } = this.computeIQR(windowValues);

    const { sampleStd } = this.computeEWMA(windowValues, EWMA_LAMBDA);
    // const shrunkStd = this.computeShrunkStd(sampleStd, n, metricKey, mean);
    const limits = this.computeTimeVaryingLimits(median, effectiveMad, n, EWMA_LAMBDA, SPC_L_FACTOR);

    return {
      median,
      mad,
      effectiveMad,
      iqr,
      mean: median, // Stored as robust median in mean field for seamless compatibility
      sampleStd,
      shrunkStd: effectiveMad, // Stored as robust effectiveMad
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
      ewmaMean: res.median,
      ewmaStd: res.effectiveMad,
      median: res.median,
      mad: res.effectiveMad,
      sampleCount: res.sampleCount,
      lastUpdated,
      isEstablished: res.isEstablished,
    };
  }

  /**
   * Standard and backwards-compatible Z-Score calculator
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
   * Normalizes a feature vector against established or robust baselines
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

    // Use established baseline period (slice recent if >= 14 days to prevent current anomaly pollution)
    const baselineSeries = metrics.length >= 14
      ? metrics.slice(0, metrics.length - 3)
      : metrics;

    const values = baselineSeries.map((m) => m.value);
    const baselineResult = BaselineEngine.computeBaseline(values, key);
    const latestDate = metrics[metrics.length - 1].date;

    const baselineState: BaselineState = {
      metricKey: key,
      ewmaMean: baselineResult.median,
      ewmaStd: baselineResult.effectiveMad,
      median: baselineResult.median,
      mad: baselineResult.effectiveMad,
      sampleCount: metrics.length,
      lastUpdated: latestDate,
      isEstablished: metrics.length >= MIN_BASELINE_DAYS,
    };

    await db.baselines.put(baselineState);
    results[key] = baselineState;
  }

  return results as Record<MetricKey, BaselineState>;
}
