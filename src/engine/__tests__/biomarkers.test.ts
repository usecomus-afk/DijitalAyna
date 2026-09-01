import { describe, it, expect } from 'vitest';
import { synthesizeBiomarkers, calculateAffectiveStateIndex } from '../biomarkers';
import { AnomalyResult } from '../../types/engine';

describe('Biomarker Synthesis Rules & Academic Phenotyping', () => {
  const createMock = (metricKey: any, zScore: number): AnomalyResult => ({
    metricKey,
    date: '2026-08-24',
    currentValue: 10,
    baselineMean: 5,
    baselineStd: 1,
    zScore,
    isAnomaly: Math.abs(zScore) >= 2.0,
    deviationPercent: zScore * 20,
    direction: zScore > 0 ? 'above' : 'below',
  });

  it('should trigger Cognitive Load / Emotional Burnout on typing slowdown and backspace spike', () => {
    const anomalies: AnomalyResult[] = [
      createMock('typing_wpm', -2.5),
      createMock('typing_backspace_rate', 2.8),
    ];

    const biomarkers = synthesizeBiomarkers(anomalies);
    const burnout = biomarkers.find(b => b.type === 'emotional_burnout');
    expect(burnout).toBeDefined();
    expect(burnout?.confidence).toBe('medium');
  });

  it('should trigger Social Withdrawal on low mobility and low touch frequency', () => {
    const anomalies: AnomalyResult[] = [
      createMock('mobility_index', -2.8),
      createMock('touch_interaction_frequency', -2.2),
    ];

    const biomarkers = synthesizeBiomarkers(anomalies);
    const withdrawal = biomarkers.find(b => b.type === 'social_withdrawal');
    expect(withdrawal).toBeDefined();
    expect(withdrawal?.confidence).toBe('high');
  });

  it('should trigger Circadian Disruption on night usage anomaly', () => {
    const anomalies: AnomalyResult[] = [
      createMock('night_usage_minutes', 3.4),
    ];

    const biomarkers = synthesizeBiomarkers(anomalies);
    const circadian = biomarkers.find(b => b.type === 'circadian_disruption');
    expect(circadian).toBeDefined();
  });

  it('should return Healthy Balance when no severe anomalies exist', () => {
    const anomalies: AnomalyResult[] = [
      createMock('typing_wpm', 0.2),
      createMock('mobility_index', -0.3),
    ];

    const biomarkers = synthesizeBiomarkers(anomalies);
    expect(biomarkers[0].type).toBe('healthy_balance');
  });

  it('should calculate Affective State Index accurately from weighted Z-scores', () => {
    const balancedAnomalies: AnomalyResult[] = [
      createMock('mobility_index', 0.5),
      createMock('typing_wpm', 0.5),
      createMock('night_usage_minutes', 0.0),
    ];
    const balancedScore = calculateAffectiveStateIndex(balancedAnomalies);
    expect(balancedScore).toBeGreaterThanOrEqual(70);

    const distressedAnomalies: AnomalyResult[] = [
      createMock('mobility_index', -2.5),
      createMock('typing_wpm', -2.5),
      createMock('night_usage_minutes', 3.0),
      createMock('typing_backspace_rate', 2.5),
    ];
    const distressedScore = calculateAffectiveStateIndex(distressedAnomalies);
    expect(distressedScore).toBeLessThan(45);
  });
});
