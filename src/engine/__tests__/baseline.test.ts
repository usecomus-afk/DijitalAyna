import { describe, it, expect } from 'vitest';
import { computeEWMA } from '../baseline';

describe('Baseline Engine - computeEWMA', () => {
  it('should return 0 mean and 1 std for empty values', () => {
    const result = computeEWMA([]);
    expect(result.mean).toBe(0);
    expect(result.std).toBe(1);
  });

  it('should compute EWMA accurately for a stable series', () => {
    const stableSeries = [50, 50, 50, 50, 50];
    const result = computeEWMA(stableSeries);
    expect(result.mean).toBe(50);
    expect(result.std).toBeLessThanOrEqual(0.1);
  });

  it('should respond to recent shifts compared to constant baseline', () => {
    const flatSeries = [10, 10, 10, 10];
    const shiftedSeries = [10, 10, 10, 100];
    const flatResult = computeEWMA(flatSeries, 0.2);
    const shiftedResult = computeEWMA(shiftedSeries, 0.2);

    expect(shiftedResult.mean).toBeGreaterThan(flatResult.mean);
  });
});
