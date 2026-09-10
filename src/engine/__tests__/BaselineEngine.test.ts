import { describe, it, expect } from 'vitest';
import { BaselineEngine, EWMA_LAMBDA, MIN_BASELINE_DAYS, SPC_L_FACTOR } from '../BaselineEngine';

describe('BaselineEngine - EWMA (lambda=0.20), Bayesian Shrinkage & Cold Start Protection', () => {
  it('should compute EWMA accurately with lambda = 0.20', () => {
    expect(EWMA_LAMBDA).toBe(0.20);

    const stableValues = [50, 50, 50, 50];
    const res = BaselineEngine.computeEWMA(stableValues, 0.20);
    expect(res.mean).toBe(50);
    expect(res.sampleStd).toBeLessThanOrEqual(0.1);
  });

  it('should react appropriately to shifts according to lambda=0.20 weight', () => {
    const values = [50, 50, 50, 100];
    const res = BaselineEngine.computeEWMA(values, 0.20);
    // After shift: mean should be 0.2*100 + 0.8*50 = 60
    expect(res.mean).toBeCloseTo(60, 1);
  });

  it('Bayesian Shrinkage: should prevent variance collapse and Z-score explosion (Z > 8.0) when n is small', () => {
    // Scenario: User has 2 days with nearly identical typing speed [45, 45.1]
    // Without Bayesian shrinkage, sampleStd is 0.05, and on day 3 a normal 52 wpm would produce Z = (52 - 45)/0.05 = 140.0!
    const sampleStdNearZero = 0.05;
    const sampleCount = 2;

    const shrunkStd = BaselineEngine.computeShrunkStd(sampleStdNearZero, sampleCount, 'typing_wpm', 45);

    // Prior std for typing_wpm is 12. With m=5 and n=2:
    // shrunkVariance = (2*(0.05^2) + 5*(12^2)) / (2 + 5) = (0.005 + 720)/7 = 102.85 -> std ≈ 10.14
    expect(shrunkStd).toBeGreaterThan(8.0);
    expect(shrunkStd).toBeLessThan(14.0);

    // On day 3, a mild deviation (52 WPM) produces a realistic, stable Z-score (around 0.69, NOT > 8.0!)
    const zScore = BaselineEngine.calculateZScore(52, 45, shrunkStd);
    expect(zScore).toBeLessThan(1.5);
    expect(zScore).toBeGreaterThan(0.4);
  });

  it('Time-Varying SPC Limits: should compute tighter limits for early t and expand to steady state', () => {
    const mean = 50;
    const std = 10;

    const limitsDay1 = BaselineEngine.computeTimeVaryingLimits(mean, std, 1, 0.20, SPC_L_FACTOR);
    const limitsDay14 = BaselineEngine.computeTimeVaryingLimits(mean, std, 14, 0.20, SPC_L_FACTOR);

    // Day 1 limit margin should be narrower than Day 14 limit margin
    const marginDay1 = limitsDay1.ucl - mean;
    const marginDay14 = limitsDay14.ucl - mean;

    expect(marginDay1).toBeLessThan(marginDay14);
    expect(limitsDay1.lcl).toBeGreaterThan(limitsDay14.lcl);
  });

  it('Cold Start: isEstablished MUST be false for n < 14, and true for n >= 14', () => {
    expect(MIN_BASELINE_DAYS).toBe(14);

    const day7Values = [50, 52, 48, 51, 49, 53, 50];
    const baseline7 = BaselineEngine.computeBaseline(day7Values, 'typing_wpm');
    expect(baseline7.sampleCount).toBe(7);
    expect(baseline7.isEstablished).toBe(false);

    const day14Values = Array(14).fill(50);
    const baseline14 = BaselineEngine.computeBaseline(day14Values, 'typing_wpm');
    expect(baseline14.sampleCount).toBe(14);
    expect(baseline14.isEstablished).toBe(true);
  });
});
