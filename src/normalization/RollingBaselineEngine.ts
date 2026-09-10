/**
 * Rolling Baseline & Personalization Normalization Engine
 * Grounded in Personalized Sensing (Mohr et al., 2017; Torous et al., 2018; Guth et al., 2025).
 * Delegated directly to the unified BaselineEngine.
 */
import { BaselineEngine, EWMA_LAMBDA, SPC_L_FACTOR, EPSILON } from '../engine/BaselineEngine';

export class RollingBaselineEngine {
  public static readonly DEFAULT_ALPHA = EWMA_LAMBDA; // Literature standard lambda=0.20
  public static readonly EPSILON = EPSILON;
  public static readonly ANOMALY_THRESHOLD = SPC_L_FACTOR;

  /**
   * Computes Exponentially Weighted Moving Average (EWMA) and Running Standard Deviation
   */
  static computeEWMA(
    historicalValues: number[],
    alpha = RollingBaselineEngine.DEFAULT_ALPHA
  ): { mean: number; std: number } {
    const res = BaselineEngine.computeEWMA(historicalValues, alpha);
    return {
      mean: res.mean,
      std: res.sampleStd,
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
    return BaselineEngine.calculateZScore(currentValue, baselineMean, baselineStd, epsilon);
  }

  /**
   * Normalizes a vector of features against personal baselines into standardized Z-Scores
   */
  static normalizeFeatureVector(
    currentFeatures: Record<string, number>,
    baselines: Record<string, { mean: number; std: number }>
  ): Record<string, { zScore: number; isAnomaly: boolean; direction: 'above' | 'below' }> {
    return BaselineEngine.normalizeFeatureVector(currentFeatures, baselines);
  }
}
