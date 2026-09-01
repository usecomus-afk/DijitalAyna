import { describe, it, expect } from 'vitest';
import { RollingBaselineEngine } from '../RollingBaselineEngine';

describe('RollingBaselineEngine - Personalization & Z-Score Normalization', () => {
  it('should compute EWMA and standard deviation correctly', () => {
    const historical = [50, 52, 48, 55, 53, 51, 49, 50, 54, 52];
    const { mean, std } = RollingBaselineEngine.computeEWMA(historical, 0.14);

    expect(mean).toBeGreaterThan(48);
    expect(mean).toBeLessThan(54);
    expect(std).toBeGreaterThan(0.5);
    expect(std).toBeLessThan(4.0);
  });

  it('should compute Z-Scores with epsilon smoothing ($Z = (X - \\mu) / (\\sigma + \\epsilon)$)', () => {
    const z = RollingBaselineEngine.calculateZScore(60, 50, 5, 0.001);
    expect(z).toBeCloseTo(2.0, 1);

    const zDrop = RollingBaselineEngine.calculateZScore(35, 50, 5, 0.001);
    expect(zDrop).toBeCloseTo(-3.0, 1);
  });

  it('should normalize a multi-feature vector and flag $|Z| \\ge 2.0$ anomalies', () => {
    const currentFeatures = {
      mobility_index: 25, // Baseline is 70, std is 15 -> Z = -3.0 (Anomaly)
      typing_wpm: 45,     // Baseline is 44, std is 6  -> Z = +0.17 (Normal)
      night_usage_minutes: 40, // Baseline is 2, std is 5 -> Z = +7.6 (Anomaly)
    };

    const baselines = {
      mobility_index: { mean: 70, std: 15 },
      typing_wpm: { mean: 44, std: 6 },
      night_usage_minutes: { mean: 2, std: 5 },
    };

    const normalized = RollingBaselineEngine.normalizeFeatureVector(currentFeatures, baselines);

    expect(normalized.mobility_index.isAnomaly).toBe(true);
    expect(normalized.mobility_index.direction).toBe('below');
    expect(normalized.mobility_index.zScore).toBeLessThan(-2.0);

    expect(normalized.typing_wpm.isAnomaly).toBe(false);

    expect(normalized.night_usage_minutes.isAnomaly).toBe(true);
    expect(normalized.night_usage_minutes.direction).toBe('above');
  });
});
