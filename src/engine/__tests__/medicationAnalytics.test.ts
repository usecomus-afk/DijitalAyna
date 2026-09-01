import { describe, it, expect } from 'vitest';
import { analyzeMedicationImpact } from '../medicationAnalytics';
import { Medication } from '../../types/medication';
import { DailyMetric, BaselineState, MoodReport } from '../../types/engine';

describe('Medication Analytics Engine', () => {
  const sampleMedication: Medication = {
    id: 1,
    name: 'Escitalopram',
    dosageMg: 10,
    frequencyPerDay: 1,
    startDate: '2026-08-10',
    createdAt: Date.now(),
  };

  const sampleBaselines: BaselineState[] = [
    {
      metricKey: 'night_usage_minutes',
      ewmaMean: 20,
      ewmaStd: 4,
      sampleCount: 14,
      lastUpdated: '2026-08-09',
      isEstablished: true,
    },
    {
      metricKey: 'typing_wpm',
      ewmaMean: 40,
      ewmaStd: 5,
      sampleCount: 14,
      lastUpdated: '2026-08-09',
      isEstablished: true,
    },
    {
      metricKey: 'mobility_index',
      ewmaMean: 70,
      ewmaStd: 10,
      sampleCount: 14,
      lastUpdated: '2026-08-09',
      isEstablished: true,
    },
  ];

  const sampleDailyMetrics: DailyMetric[] = [
    // Pre-medication (before 2026-08-10)
    { date: '2026-08-07', metricKey: 'night_usage_minutes', value: 25, sampleCount: 1 },
    { date: '2026-08-08', metricKey: 'night_usage_minutes', value: 22, sampleCount: 1 },
    { date: '2026-08-09', metricKey: 'night_usage_minutes', value: 20, sampleCount: 1 },
    { date: '2026-08-07', metricKey: 'typing_wpm', value: 38, sampleCount: 1 },
    { date: '2026-08-08', metricKey: 'typing_wpm', value: 39, sampleCount: 1 },
    { date: '2026-08-09', metricKey: 'typing_wpm', value: 40, sampleCount: 1 },

    // Post-medication (on or after 2026-08-10)
    { date: '2026-08-10', metricKey: 'night_usage_minutes', value: 10, sampleCount: 1 },
    { date: '2026-08-11', metricKey: 'night_usage_minutes', value: 8, sampleCount: 1 },
    { date: '2026-08-12', metricKey: 'night_usage_minutes', value: 6, sampleCount: 1 },
    { date: '2026-08-10', metricKey: 'typing_wpm', value: 46, sampleCount: 1 },
    { date: '2026-08-11', metricKey: 'typing_wpm', value: 48, sampleCount: 1 },
    { date: '2026-08-12', metricKey: 'typing_wpm', value: 50, sampleCount: 1 },
  ];

  const sampleMoods: MoodReport[] = [
    { date: '2026-08-07', timestamp: 1, score: 2, energyScore: 2, tags: [] },
    { date: '2026-08-08', timestamp: 2, score: 2, energyScore: 2, tags: [] },
    { date: '2026-08-10', timestamp: 3, score: 4, energyScore: 4, tags: [] },
    { date: '2026-08-11', timestamp: 4, score: 5, energyScore: 5, tags: [] },
  ];

  it('should compute pre and post medication averages and delta percentages', () => {
    const report = analyzeMedicationImpact(
      sampleMedication,
      sampleDailyMetrics,
      sampleBaselines,
      sampleMoods
    );

    expect(report.medication.name).toBe('Escitalopram');
    expect(report.deltas.length).toBeGreaterThan(0);

    const nightDelta = report.deltas.find((d) => d.metricKey === 'night_usage_minutes');
    expect(nightDelta).toBeDefined();
    expect(nightDelta?.preAvg).toBeGreaterThan(nightDelta?.postAvg!);
    expect(nightDelta?.direction).toBe('improved');

    const typingDelta = report.deltas.find((d) => d.metricKey === 'typing_wpm');
    expect(typingDelta).toBeDefined();
    expect(typingDelta?.changePercent).toBeGreaterThan(0);
    expect(typingDelta?.direction).toBe('improved');
  });

  it('should calculate affective state scores before and after medication', () => {
    const report = analyzeMedicationImpact(
      sampleMedication,
      sampleDailyMetrics,
      sampleBaselines,
      sampleMoods
    );

    expect(report.affectiveStateAfter).toBeGreaterThan(report.affectiveStateBefore);
  });

  it('should generate meaningful summary narrative', () => {
    const report = analyzeMedicationImpact(
      sampleMedication,
      sampleDailyMetrics,
      sampleBaselines,
      sampleMoods
    );

    expect(report.overallSummary).toContain('Escitalopram 10mg');
  });
});
