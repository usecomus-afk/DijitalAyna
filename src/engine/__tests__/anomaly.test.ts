import { describe, it, expect } from 'vitest';
import { calculateZScore, assessAnomalyConfidence } from '../anomaly';
import { AnomalyResult } from '../../types/engine';

describe('Anomaly Engine - Z-Score & Confidence', () => {
  it('should calculate accurate Z-scores', () => {
    // Mean = 50, Std = 10, Value = 70 -> Z = 2.0
    expect(calculateZScore(70, 50, 10)).toBe(2);
    // Mean = 50, Std = 10, Value = 30 -> Z = -2.0
    expect(calculateZScore(30, 50, 10)).toBe(-2);
    // Value = Mean -> Z = 0
    expect(calculateZScore(50, 50, 10)).toBe(0);
  });

  it('should handle zero std without dividing by zero', () => {
    expect(calculateZScore(50, 50, 0)).toBe(0);
  });

  it('should determine multi-metric confidence properly', () => {
    const mockAnomaly = (key: any, isAnomaly: boolean): AnomalyResult => ({
      metricKey: key,
      date: '2026-08-24',
      currentValue: 10,
      baselineMean: 5,
      baselineStd: 1,
      zScore: isAnomaly ? 3.0 : 0.5,
      isAnomaly,
      deviationPercent: 100,
      direction: 'above',
    });

    expect(assessAnomalyConfidence([mockAnomaly('typing_wpm', true)])).toBe('low');
    expect(assessAnomalyConfidence([
      mockAnomaly('typing_wpm', true),
      mockAnomaly('typing_backspace_rate', true),
    ])).toBe('medium');
    expect(assessAnomalyConfidence([
      mockAnomaly('typing_wpm', true),
      mockAnomaly('typing_backspace_rate', true),
      mockAnomaly('night_usage_minutes', true),
    ])).toBe('high');
  });
});
