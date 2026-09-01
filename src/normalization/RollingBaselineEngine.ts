/**
 * Rolling Baseline & Personalization Normalization Engine
 * Grounded in Personalized Sensing (Mohr et al., 2017; Torous et al., 2018).
 * Replaces static global cutoffs with individualized EWMA and Z-score deviation tracking.
 */
export class RollingBaselineEngine {
  public static readonly DEFAULT_ALPHA = 0.14; // ~14-day effective half-life
  public static readonly EPSILON = 0.001; // Avoid division by zero
  public static readonly ANOMALY_THRESHOLD = 2.0;

  /**
   * Computes Exponentially Weighted Moving Average (EWMA) and Running Standard Deviation
   */
  static computeEWMA(
    historicalValues: number[],
    alpha = RollingBaselineEngine.DEFAULT_ALPHA
  ): { mean: number; std: number } {
    if (historicalValues.length === 0) {
      return { mean: 0, std: 1 };
    }
    if (historicalValues.length === 1) {
      return { mean: historicalValues[0], std: Math.max(0.1, Math.abs(historicalValues[0] * 0.1)) };
    }

    let mean = historicalValues[0];
    let variance = 0;

    for (let i = 1; i < historicalValues.length; i++) {
      const val = historicalValues[i];
      const delta = val - mean;
      mean = alpha * val + (1 - alpha) * mean;
      variance = (1 - alpha) * (variance + alpha * delta * delta);
    }

    const std = Math.max(0.05, Math.sqrt(variance));

    return {
      mean: Math.round(mean * 100) / 100,
      std: Math.round(std * 100) / 100,
    };
  }

  /**
   * Calculates Individualized Z-Score:
   * $$Z = \frac{X_t - \mu_{baseline}}{\sigma_{baseline} + \epsilon}$$
   */
  static calculateZScore(
    currentValue: number,
    baselineMean: number,
    baselineStd: number,
    epsilon = RollingBaselineEngine.EPSILON
  ): number {
    const denominator = baselineStd + epsilon;
    if (denominator <= 0) return 0;

    const z = (currentValue - baselineMean) / denominator;
    return Math.round(z * 100) / 100;
  }

  /**
   * Normalizes a vector of features against personal baselines into standardized Z-Scores
   */
  static normalizeFeatureVector(
    currentFeatures: Record<string, number>,
    baselines: Record<string, { mean: number; std: number }>
  ): Record<string, { zScore: number; isAnomaly: boolean; direction: 'above' | 'below' }> {
    const result: Record<string, { zScore: number; isAnomaly: boolean; direction: 'above' | 'below' }> = {};

    for (const [key, value] of Object.entries(currentFeatures)) {
      const base = baselines[key] || { mean: value, std: 1 };
      const z = RollingBaselineEngine.calculateZScore(value, base.mean, base.std);
      const isAnomaly = Math.abs(z) >= RollingBaselineEngine.ANOMALY_THRESHOLD;

      result[key] = {
        zScore: z,
        isAnomaly,
        direction: z >= 0 ? 'above' : 'below',
      };
    }

    return result;
  }
}
