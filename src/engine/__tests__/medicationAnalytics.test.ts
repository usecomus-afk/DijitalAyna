import { describe, it, expect } from 'vitest';
import { analyzeMedicationImpact } from '../medicationAnalytics';
import { generateClinicianMedicationReport } from '../medicationTracker';
import { Medication } from '../../types/medication';
import { DailyMetric, BaselineState, MoodReport } from '../../types/engine';

describe('Medication Analytics Engine (Zero Fabrication & Real Telemetry)', () => {
  const sampleMedication: Medication = {
    id: 1,
    name: 'Escitalopram',
    dosage: '10 mg',
    timeSlots: ['morning'],
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
    { date: '2026-08-07', metricKey: 'night_usage_minutes', value: 25, sampleCount: 12 },
    { date: '2026-08-08', metricKey: 'night_usage_minutes', value: 22, sampleCount: 10 },
    { date: '2026-08-09', metricKey: 'night_usage_minutes', value: 20, sampleCount: 15 },
    { date: '2026-08-07', metricKey: 'typing_wpm', value: 38, sampleCount: 8 },
    { date: '2026-08-08', metricKey: 'typing_wpm', value: 39, sampleCount: 9 },
    { date: '2026-08-09', metricKey: 'typing_wpm', value: 40, sampleCount: 11 },

    // Post-medication (on or after 2026-08-10)
    { date: '2026-08-10', metricKey: 'night_usage_minutes', value: 10, sampleCount: 8 },
    { date: '2026-08-11', metricKey: 'night_usage_minutes', value: 8, sampleCount: 7 },
    { date: '2026-08-12', metricKey: 'night_usage_minutes', value: 6, sampleCount: 9 },
    { date: '2026-08-10', metricKey: 'typing_wpm', value: 46, sampleCount: 14 },
    { date: '2026-08-11', metricKey: 'typing_wpm', value: 48, sampleCount: 12 },
    { date: '2026-08-12', metricKey: 'typing_wpm', value: 50, sampleCount: 16 },
  ];

  const sampleMoods: MoodReport[] = [
    { date: '2026-08-07', timestamp: 1, score: 2, energyScore: 2, tags: [] },
    { date: '2026-08-08', timestamp: 2, score: 2, energyScore: 2, tags: [] },
    { date: '2026-08-10', timestamp: 3, score: 4, energyScore: 4, tags: [] },
    { date: '2026-08-11', timestamp: 4, score: 5, energyScore: 5, tags: [] },
  ];

  it('should compute exact pre and post medication averages and delta percentages from real data', () => {
    const report = analyzeMedicationImpact(
      sampleMedication,
      sampleDailyMetrics,
      sampleBaselines,
      sampleMoods
    );

    expect(report.medication.name).toBe('Escitalopram');
    expect(report.hasRealComparison).toBe(true);
    expect(report.preSampleDays).toBe(3);
    expect(report.postSampleDays).toBe(3);

    const nightDelta = report.deltas.find((d) => d.metricKey === 'night_usage_minutes');
    expect(nightDelta).toBeDefined();
    expect(nightDelta?.preAvg).toBe(22.3);
    expect(nightDelta?.postAvg).toBe(8);
    expect(nightDelta?.changePercent).toBe(-64);
    expect(nightDelta?.direction).toBe('improved');
    expect(nightDelta?.hasComparisonData).toBe(true);
    expect(nightDelta?.preSampleCount).toBe(3);
    expect(nightDelta?.postSampleCount).toBe(3);

    const typingDelta = report.deltas.find((d) => d.metricKey === 'typing_wpm');
    expect(typingDelta).toBeDefined();
    expect(typingDelta?.preAvg).toBe(39);
    expect(typingDelta?.postAvg).toBe(48);
    expect(typingDelta?.changePercent).toBe(23);
    expect(typingDelta?.direction).toBe('improved');
    expect(typingDelta?.hasComparisonData).toBe(true);

    // Mobility index has a baseline in sampleBaselines, but ZERO real dailyMetrics rows!
    // It MUST NOT fabricate preAvg=70 / postAvg=70 from sampleBaselines!
    const mobilityDelta = report.deltas.find((d) => d.metricKey === 'mobility_index');
    expect(mobilityDelta).toBeDefined();
    expect(mobilityDelta?.preAvg).toBeNull();
    expect(mobilityDelta?.postAvg).toBeNull();
    expect(mobilityDelta?.changePercent).toBeNull();
    expect(mobilityDelta?.direction).toBe('insufficient_data');
    expect(mobilityDelta?.hasComparisonData).toBe(false);
  });

  it('should NEVER fabricate values when dailyMetrics and moods are empty (even if baselines exist)', () => {
    const report = analyzeMedicationImpact(
      sampleMedication,
      [],
      sampleBaselines,
      []
    );

    expect(report.hasRealComparison).toBe(false);
    expect(report.preSampleDays).toBe(0);
    expect(report.postSampleDays).toBe(0);
    expect(report.affectiveStateBefore).toBeNull();
    expect(report.affectiveStateAfter).toBeNull();

    for (const d of report.deltas) {
      expect(d.preAvg).toBeNull();
      expect(d.postAvg).toBeNull();
      expect(d.changePercent).toBeNull();
      expect(d.zScoreDelta).toBeNull();
      expect(d.direction).toBe('insufficient_data');
      expect(d.hasPreData).toBe(false);
      expect(d.hasPostData).toBe(false);
      expect(d.hasComparisonData).toBe(false);
    }

    expect(report.overallSummary).toContain('henüz yeterli gerçek sensör ölçümü kaydedilmedi');
  });

  it('should report only post-medication averages without fabricating preAvg or changePercent when pre-medication data is missing', () => {
    const postOnlyMetrics: DailyMetric[] = [
      { date: '2026-08-10', metricKey: 'typing_wpm', value: 45, sampleCount: 5 },
      { date: '2026-08-11', metricKey: 'typing_wpm', value: 49, sampleCount: 7 },
    ];

    const report = analyzeMedicationImpact(
      sampleMedication,
      postOnlyMetrics,
      sampleBaselines,
      []
    );

    expect(report.hasRealComparison).toBe(false);
    expect(report.preSampleDays).toBe(0);
    expect(report.postSampleDays).toBe(2);

    const typingDelta = report.deltas.find((d) => d.metricKey === 'typing_wpm');
    expect(typingDelta?.preAvg).toBeNull();
    expect(typingDelta?.postAvg).toBe(47);
    expect(typingDelta?.changePercent).toBeNull();
    expect(typingDelta?.direction).toBe('insufficient_data');
    expect(typingDelta?.hasPreData).toBe(false);
    expect(typingDelta?.hasPostData).toBe(true);
    expect(typingDelta?.hasComparisonData).toBe(false);
  });

  it('should dynamically include real Apple Health sleep metrics when present in dailyMetrics', () => {
    const sleepMetrics: DailyMetric[] = [
      { date: '2026-08-08', metricKey: 'sleep_duration', value: 360, sampleCount: 1 },
      { date: '2026-08-09', metricKey: 'sleep_duration', value: 380, sampleCount: 1 },
      { date: '2026-08-10', metricKey: 'sleep_duration', value: 440, sampleCount: 1 },
      { date: '2026-08-11', metricKey: 'sleep_duration', value: 460, sampleCount: 1 },
    ];

    const report = analyzeMedicationImpact(
      sampleMedication,
      sleepMetrics,
      [],
      []
    );

    const sleepDelta = report.deltas.find((d) => d.metricKey === 'sleep_duration');
    expect(sleepDelta).toBeDefined();
    expect(sleepDelta?.preAvg).toBe(370);
    expect(sleepDelta?.postAvg).toBe(450);
    expect(sleepDelta?.changePercent).toBe(22);
    expect(sleepDelta?.direction).toBe('improved');
  });

  it('should calculate affective state scores before and after medication only when real mood reports exist', () => {
    const report = analyzeMedicationImpact(
      sampleMedication,
      sampleDailyMetrics,
      sampleBaselines,
      sampleMoods
    );

    expect(report.affectiveStateBefore).not.toBeNull();
    expect(report.affectiveStateAfter).not.toBeNull();
    expect(report.affectiveStateAfter!).toBeGreaterThan(report.affectiveStateBefore!);
  });

  it('should generate meaningful summary narrative with real medication dosage, schedule, and start date', () => {
    const report = analyzeMedicationImpact(
      sampleMedication,
      sampleDailyMetrics,
      sampleBaselines,
      sampleMoods
    );

    expect(report.overallSummary).toContain('Escitalopram');
    expect(report.overallSummary).toContain('10 mg');
    expect(report.overallSummary).toContain('2026-08-10');
    expect(report.formattedDosage).toBe('10 mg');
    expect(report.formattedSchedule).toContain('Sabah');
  });

  it('should compute 1-month, 3-month, and 6-month pre-medication vs post-medication comparative table accurately from real dailyMetrics', () => {
    const multiWindowMetrics: DailyMetric[] = [
      // 5 months before startDate (2026-08-10) -> inside 6m window, outside 3m & 1m
      { date: '2026-03-15', metricKey: 'night_usage_minutes', value: 40, sampleCount: 1 },
      // 2 months before startDate (2026-08-10) -> inside 6m & 3m windows, outside 1m
      { date: '2026-06-15', metricKey: 'night_usage_minutes', value: 30, sampleCount: 1 },
      // 5 days before startDate (2026-08-10) -> inside 1m, 3m, and 6m windows
      { date: '2026-08-05', metricKey: 'night_usage_minutes', value: 20, sampleCount: 1 },
      // Post-medication (on or after 2026-08-10)
      { date: '2026-08-12', metricKey: 'night_usage_minutes', value: 10, sampleCount: 1 },
    ];

    const report = analyzeMedicationImpact(
      sampleMedication,
      multiWindowMetrics,
      [],
      []
    );

    expect(report.pre1MonthSampleDays).toBe(1);
    expect(report.pre3MonthsSampleDays).toBe(2);
    expect(report.pre6MonthsSampleDays).toBe(3);

    const nightRow = report.multiPeriodTable.find((r) => r.metricKey === 'night_usage_minutes');
    expect(nightRow).toBeDefined();
    // 1 month pre: only 2026-08-05 (value=20) -> post=10 (-50%)
    expect(nightRow?.pre1Month.avg).toBe(20);
    expect(nightRow?.pre1Month.sampleCount).toBe(1);
    expect(nightRow?.pre1Month.changePercent).toBe(-50);

    // 3 months pre: 2026-06-15 (30) and 2026-08-05 (20) -> avg=25 -> post=10 (-60%)
    expect(nightRow?.pre3Months.avg).toBe(25);
    expect(nightRow?.pre3Months.sampleCount).toBe(2);
    expect(nightRow?.pre3Months.changePercent).toBe(-60);

    // 6 months pre: 40, 30, 20 -> avg=30 -> post=10 (-67%)
    expect(nightRow?.pre6Months.avg).toBe(30);
    expect(nightRow?.pre6Months.sampleCount).toBe(3);
    expect(nightRow?.pre6Months.changePercent).toBe(-67);

    expect(nightRow?.postOverall.avg).toBe(10);
    expect(nightRow?.post1Month.avg).toBe(10);
  });

  it('generateClinicianMedicationReport should also never fabricate deltas from baselines', () => {
    const reportNoPre = generateClinicianMedicationReport(
      sampleMedication,
      [{ date: '2026-08-10', metricKey: 'typing_wpm', value: 44, sampleCount: 4 }],
      sampleBaselines
    );

    const typing = reportNoPre.biomarkerDeltas.find((m) => m.metricKey === 'typing_wpm');
    expect(typing?.preAvg).toBeNull();
    expect(typing?.postAvg).toBe(44);
    expect(typing?.changePercent).toBeNull();
    expect(typing?.direction).toBe('insufficient_data');
  });
});

