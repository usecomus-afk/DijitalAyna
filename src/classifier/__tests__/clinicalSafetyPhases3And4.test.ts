import { describe, it, expect, vi } from 'vitest';
import { ClinicalPhenotypeClassifier } from '../ClinicalPhenotypeClassifier';
import { evaluatePredictivePatterns } from '../../engine/prediction';
import { generateInsightsAndAlerts, saveDailyInsight } from '../../engine/insights';
import { BaselineEngine } from '../../engine/BaselineEngine';
import { generateClinicianMedicationReport } from '../../engine/medicationTracker';
import { db } from '../../db';
import { AnomalyResult, DailyMetric, BaselineState } from '../../types/engine';
import { Medication } from '../../types/medication';

describe('FAZ 3 & FAZ 4 - Clinical Safety & Definition of Done Verification', () => {
  // Definition of Done #2: Sağlıklı Kullanıcı Negatif Testi
  it('DoD 2: Healthy User Negative Test - should produce 0/7 alarms on normal baseline / synthetic healthy data', () => {
    const normalZScores = {
      typing_hold_time: 0.1,
      typing_backspace_rate: -0.2,
      homestay_ratio: 0.1,
      mobility_radius: 0.2,
      night_usage_minutes: -0.1,
      session_switching_entropy: 0.0,
      typing_iki: -0.3,
      hyper_checking_ratio: 0.2,
      screen_on_time: 0.1,
      touch_interaction_frequency: 0.3,
    };

    const normalRawValues = {
      meanHoldTimeMs: 95,
      backspacePercentIncrease: 4,
      homestayPercentage: 45,
      sleepOnsetLatencyMinutes: 14,
      nocturnalScreen02to04Unlocks: 0,
      appSwitchingIn15MinWindow: 3,
      averageSessionLengthSeconds: 110,
      sleepRegularityIndex: 88,
      dailyUnlockCount: 28,
      quickCheckRatioPercent: 12,
      dailySocialMediaMinutes: 35,
      outwardInteractionRatioPercent: 24,
      lateNightContinuousScrollMinutes: 0,
      postSessionEmaAffectDrop: 0,
    };

    const alerts = ClinicalPhenotypeClassifier.evaluateEarlyAwarenessAlerts(normalZScores, normalRawValues);

    // STRICT: Must produce 0 alerts for healthy user (no 7/7 false positive leak)
    expect(alerts.length).toBe(0);
  });

  // Definition of Done #3: Eksik Veri Testi
  it('DoD 3: Missing Data Test - should cancel prediction and return insufficient_data when 3 of 5 metrics are missing', () => {
    // Only 2 metrics present (typing_wpm and typing_backspace_rate), 3 are missing
    const anomaliesWithMissing: AnomalyResult[] = [
      {
        metricKey: 'typing_wpm',
        date: '2026-09-10',
        currentValue: 20,
        baselineMean: 40,
        baselineStd: 5,
        zScore: -2.0,
        isAnomaly: true,
        deviationPercent: -50,
        direction: 'below',
      },
      {
        metricKey: 'typing_backspace_rate',
        date: '2026-09-10',
        currentValue: 18,
        baselineMean: 8,
        baselineStd: 2,
        zScore: 2.5,
        isAnomaly: true,
        deviationPercent: 125,
        direction: 'above',
      },
      // Missing: night_usage_minutes, mobility_index, touch_interaction_frequency
    ];

    const result = evaluatePredictivePatterns(anomaliesWithMissing);

    expect(result.status).toBe('insufficient_data');
    expect(result.observedCount).toBe(2);
    expect(result.totalRequired).toBe(5);
    expect(result.missingMetrics.length).toBe(3);
    // STRICT: Must NOT produce high-confidence predictive alerts when missing > 50%
    expect(result.filter(a => a.riskLevel === 'high').length).toBe(0);
    expect(result.length).toBe(0);
  });

  it('DoD 3b: Clinical Rule Missing Data Test - should return insufficient_data when a required metric is missing', () => {
    const incompleteZScores = {
      typing_hold_time: 2.5,
      // typing_backspace_rate is missing!
    };
    const incompleteRawValues = {
      meanHoldTimeMs: 160,
      // backspacePercentIncrease is missing!
    };

    const ruleRes = ClinicalPhenotypeClassifier.evaluateRule('burnout', incompleteZScores, incompleteRawValues);
    expect(ruleRes.status).toBe('insufficient_data');
    if (ruleRes.status === 'insufficient_data') {
      expect(ruleRes.missingMetrics).toContain('backspacePercentIncrease');
    }
  });

  // Definition of Done #4: Soğuk Başlangıç Testi (Gün 1-6 ve Gün 1-13)
  it('DoD 4: Cold Start Test - should keep isEstablished = false for days 1 to 13', () => {
    // 3 days of metrics
    const shortValues = [35, 36, 37];
    const baseline = BaselineEngine.calculateEWMA('typing_wpm', shortValues, '2026-09-03');

    expect(baseline.sampleCount).toBe(3);
    expect(baseline.isEstablished).toBe(false);

    // 13 days of metrics
    const thirteenValues = Array(13).fill(40);
    const baseline13 = BaselineEngine.calculateEWMA('typing_wpm', thirteenValues, '2026-09-13');
    expect(baseline13.isEstablished).toBe(false);

    // 14 days of metrics
    const fourteenValues = Array(14).fill(40);
    const baseline14 = BaselineEngine.calculateEWMA('typing_wpm', fourteenValues, '2026-09-14');
    expect(baseline14.isEstablished).toBe(true);
  });

  // Definition of Done #5: Geçmiş Koruma Testi
  it('DoD 5: History Preservation Test - running generateInsightsAndAlerts 5 times should preserve previous days records without db.insights.clear', async () => {
    let mockInsights: any[] = [];
    let clearCalled = false;

    // Spy on db.insights methods with as any
    (vi.spyOn(db.insights as any, 'where') as any).mockImplementation((field: any) => ({
      equals: (val: any) => ({
        first: async () => mockInsights.find(i => i[field] === val),
        toArray: async () => mockInsights.filter(i => i[field] === val),
      }),
    }));

    (vi.spyOn(db.insights as any, 'add') as any).mockImplementation(async (item: any) => {
      const withId = { ...item, id: mockInsights.length + 1 };
      mockInsights.push(withId);
      return withId.id;
    });

    (vi.spyOn(db.insights as any, 'update') as any).mockImplementation(async (id: any, changes: any) => {
      const idx = mockInsights.findIndex(i => i.id === id);
      if (idx !== -1) {
        mockInsights[idx] = { ...mockInsights[idx], ...changes };
        return 1;
      }
      return 0;
    });

    (vi.spyOn(db.insights as any, 'bulkDelete') as any).mockImplementation(async (ids: any) => {
      mockInsights = mockInsights.filter(i => !ids.includes(i.id));
    });

    (vi.spyOn(db.insights as any, 'bulkAdd') as any).mockImplementation(async (items: any) => {
      for (const item of items) {
        mockInsights.push({ ...item, id: mockInsights.length + 1 });
      }
      return items.length;
    });

    (vi.spyOn(db.insights as any, 'clear') as any).mockImplementation(async () => {
      clearCalled = true;
      mockInsights = [];
    });

    // Mock db.dailyMetrics, db.baselines, db.moodReports, db.predictiveAlerts
    const mockMetrics = [
      { id: 1, date: '2026-09-09', metricKey: 'typing_wpm', value: 45, sampleCount: 1 },
    ];
    (vi.spyOn(db.dailyMetrics as any, 'orderBy') as any).mockImplementation(() => ({
      last: async () => mockMetrics[mockMetrics.length - 1],
    }));

    (vi.spyOn(db.dailyMetrics as any, 'where') as any).mockImplementation((key: any) => ({
      equals: (val: any) => ({
        sortBy: async () => mockMetrics.filter(m => (m as any)[key] === val),
        toArray: async () => mockMetrics.filter(m => (m as any)[key] === val),
      }),
    }));

    (vi.spyOn(db.baselines as any, 'get') as any).mockImplementation(async (k: any) => ({
      metricKey: k,
      ewmaMean: 45,
      ewmaStd: 5,
      sampleCount: 14,
      lastUpdated: '2026-09-09',
      isEstablished: true,
    }));

    (vi.spyOn(db.baselines as any, 'toArray') as any).mockImplementation(async () => [
      {
        metricKey: 'typing_wpm',
        ewmaMean: 45,
        ewmaStd: 5,
        sampleCount: 14,
        lastUpdated: '2026-09-09',
        isEstablished: true,
      },
    ]);

    (vi.spyOn(db.moodReports as any, 'orderBy') as any).mockImplementation(() => ({
      reverse: () => ({
        limit: () => ({
          toArray: async () => [],
        }),
      }),
    }));

    (vi.spyOn(db.predictiveAlerts as any, 'bulkAdd') as any).mockImplementation(async () => {});

    // Save yesterday's insight (2026-09-08)
    await saveDailyInsight('2026-09-08', {
      title: 'Dünün Öngörüsü',
      body: 'Dün kaydedilen stabil bazal içgörüsü.',
      severity: 'low',
      biomarkerType: 'healthy_balance',
      provisional: false,
      finalized: true,
    });

    expect(mockInsights.length).toBe(1);
    expect(mockInsights[0].date).toBe('2026-09-08');

    // Run generateInsightsAndAlerts 5 times consecutively
    for (let i = 0; i < 5; i++) {
      await generateInsightsAndAlerts(i === 4); // Last one finalized
    }

    // Verify db.insights.clear was NEVER called!
    expect(clearCalled).toBe(false);

    // Verify yesterday's insight (2026-09-08) was NEVER deleted!
    const yesterdayInsight = mockInsights.find(i => i.date === '2026-09-08');
    expect(yesterdayInsight).toBeDefined();
    expect(yesterdayInsight?.title).toBe('Dünün Öngörüsü');

    // Verify today's insight (2026-09-09) was added/updated
    const todayInsight = mockInsights.find(i => i.date === '2026-09-09');
    expect(todayInsight).toBeDefined();
    expect(todayInsight?.finalized).toBe(true);
  });

  // Medication Tracker Test
  it('should generate clinician longitudinal T_-14 vs T_+14 report', () => {
    const med: Medication = {
      id: 1,
      name: 'Escitalopram',
      dosageMg: 10,
      frequencyPerDay: 1,
      startDate: '2026-09-15',
      createdAt: Date.now(),
    };

    const dailyMetrics: DailyMetric[] = [
      // T_-14 metrics
      { date: '2026-09-10', metricKey: 'night_usage_minutes', value: 75, sampleCount: 1 },
      { date: '2026-09-12', metricKey: 'typing_wpm', value: 34, sampleCount: 1 },
      { date: '2026-09-14', metricKey: 'mobility_index', value: 40, sampleCount: 1 },
      // T_+14 metrics
      { date: '2026-09-18', metricKey: 'night_usage_minutes', value: 42, sampleCount: 1 },
      { date: '2026-09-20', metricKey: 'typing_wpm', value: 40, sampleCount: 1 },
      { date: '2026-09-22', metricKey: 'mobility_index', value: 52, sampleCount: 1 },
    ];

    const baselines: BaselineState[] = [
      { metricKey: 'night_usage_minutes', ewmaMean: 70, ewmaStd: 10, sampleCount: 14, lastUpdated: '2026-09-15', isEstablished: true },
      { metricKey: 'typing_wpm', ewmaMean: 35, ewmaStd: 4, sampleCount: 14, lastUpdated: '2026-09-15', isEstablished: true },
      { metricKey: 'mobility_index', ewmaMean: 40, ewmaStd: 6, sampleCount: 14, lastUpdated: '2026-09-15', isEstablished: true },
    ];

    const report = generateClinicianMedicationReport(med, dailyMetrics, baselines, 'start', 14);

    expect(report.intervention.t0Date).toBe('2026-09-15');
    expect(report.intervention.medicationName).toBe('Escitalopram');
    expect(report.preDaysCount).toBeGreaterThan(0);
    expect(report.postDaysCount).toBeGreaterThan(0);
    expect(report.sleepCircadianImpact.changePercent).toBeDefined();
    expect(report.clinicianSummary).toContain('Escitalopram');
  });
});
