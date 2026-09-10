/**
 * Baseline Engine Bridge
 * Delegated directly to the unified BaselineEngine (lambda=0.20, 14-day Bayesian cold-start protection).
 */
export {
  BaselineEngine,
  EWMA_LAMBDA,
  EWMA_LAMBDA as EWMA_ALPHA,
  MIN_BASELINE_DAYS,
  SPC_L_FACTOR,
  calculateEWMAForMetrics,
} from './BaselineEngine';

import { BaselineEngine, EWMA_LAMBDA } from './BaselineEngine';

export function computeEWMA(values: number[], alpha = EWMA_LAMBDA): { mean: number; std: number } {
  const res = BaselineEngine.computeEWMA(values, alpha);
  return {
    mean: res.mean,
    std: res.sampleStd,
  };
}
