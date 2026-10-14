import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../db';
import { runDailyAggregationAndCleanup } from '../../db/aggregations';
import { EXCLUDED_EWMA_REPORT_KEYS, getMetricStatusType } from '../../pages/DoctorReportPage';
import { generateRealReportAwarenessNotes, ReportMetricStat } from '../reportBuilder';
import { generateInsightsAndAlerts } from '../../engine/insights';
import { METRIC_DEFINITIONS, MetricKey, SensorEvent } from '../../types/sensor';
import { DailyMetric, BaselineState, Insight } from '../../types/engine';
import { ClinicalSurveyResult } from '../../data/clinicalSurveys';

describe('Real Active Sensors, EWMA Exclusions & Data-Driven Awareness Notes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. excludes gaming_duration and camera_interaction_count from EWMA table keys', () => {
    expect(EXCLUDED_EWMA_REPORT_KEYS).toContain('gaming_duration');
    expect(EXCLUDED_EWMA_REPORT_KEYS).toContain('camera_interaction_count');

    const remainingKeys = (Object.keys(METRIC_DEFINITIONS) as MetricKey[]).filter(
      (k) => !EXCLUDED_EWMA_REPORT_KEYS.includes(k)
    );
    expect(remainingKeys).not.toContain('gaming_duration');
    expect(remainingKeys).not.toContain('camera_interaction_count');
    expect(remainingKeys.length).toBe(27);
  });

  it('2. aggregates all permission-free active sensors and computes cognitive_fatigue_score & impulse_risk_index from real events', async () => {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().split('T')[0];

    const mockEvents: SensorEvent[] = [
      {
        id: 1,
        timestamp: now - 5000,
        type: 'session',
        payload: {
          session_duration: 12.5,
          screen_on_time: 48.0,
          night_usage_minutes: 0,
        },
      },
      {
        id: 2,
        timestamp: now - 4000,
        type: 'network',
        payload: {
          network_online: 1,
        },
      },
      {
        id: 3,
        timestamp: now - 3500,
        type: 'light',
        payload: {
          light_ambient_lux: 260,
          night_light_violations: 0,
        },
      },
      {
        id: 4,
        timestamp: now - 3000,
        type: 'touch',
        payload: {
          touch_scroll_velocity: 420,
          touch_interaction_frequency: 18,
        },
      },
      {
        id: 5,
        timestamp: now - 2000,
        type: 'typing',
        payload: {
          typing_wpm: 38,
          typing_iki: 210,
          typing_backspace_rate: 6.5,
          typing_pause_count: 2,
          typing_hold_time: 95,
        },
      },
    ];

    const mockDailyMetrics: DailyMetric[] = [];
    const mockBaselines = new Map<MetricKey, BaselineState>();

    (vi.spyOn(db.sensorEvents as any, 'toArray') as any).mockImplementation(async () => mockEvents);

    (vi.spyOn(db.sensorEvents as any, 'where') as any).mockImplementation(() => ({
      aboveOrEqual: () => ({
        toArray: async () => mockEvents,
      }),
      below: () => ({
        toArray: async () => [],
        delete: async () => 0,
      }),
    }));

    (vi.spyOn(db.sensorEvents as any, 'bulkDelete') as any).mockImplementation(async () => {});

    (vi.spyOn(db.dailyMetrics as any, 'where') as any).mockImplementation((key: string) => ({
      equals: (val: any) => ({
        first: async () => {
          if (key === '[metricKey+date]') {
            return mockDailyMetrics.find((m) => m.metricKey === val[0] && m.date === val[1]);
          }
          return mockDailyMetrics.find((m) => (m as any)[key] === val);
        },
        toArray: async () => mockDailyMetrics.filter((m) => (m as any)[key] === val),
      }),
    }));

    (vi.spyOn(db.dailyMetrics as any, 'add') as any).mockImplementation(async (item: DailyMetric) => {
      mockDailyMetrics.push({ ...item, id: mockDailyMetrics.length + 1 });
      return mockDailyMetrics.length;
    });

    (vi.spyOn(db.dailyMetrics as any, 'update') as any).mockImplementation(async (id: number, changes: Partial<DailyMetric>) => {
      const idx = mockDailyMetrics.findIndex((m) => m.id === id);
      if (idx >= 0) {
        mockDailyMetrics[idx] = { ...mockDailyMetrics[idx], ...changes };
      }
      return 1;
    });

    (vi.spyOn(db.baselines as any, 'get') as any).mockImplementation(async (k: MetricKey) => mockBaselines.get(k));
    (vi.spyOn(db.baselines as any, 'put') as any).mockImplementation(async (b: BaselineState) => {
      mockBaselines.set(b.metricKey, b);
      return b.metricKey;
    });

    await runDailyAggregationAndCleanup();

    const todayMetrics = mockDailyMetrics.filter((m) => m.date === todayStr);
    const metricMap = new Map(todayMetrics.map((m) => [m.metricKey, m.value]));

    // Verify every permission-free active sensor produced real dailyMetrics records
    expect(metricMap.get('session_duration')).toBe(12.5);
    expect(metricMap.get('screen_on_time')).toBe(48);
    expect(metricMap.get('night_usage_minutes')).toBe(0);
    expect(metricMap.get('network_online')).toBe(1);
    expect(metricMap.get('light_ambient_lux')).toBe(260);
    expect(metricMap.get('night_light_violations')).toBe(0);
    expect(metricMap.get('touch_scroll_velocity')).toBe(420);
    expect(metricMap.get('touch_interaction_frequency')).toBe(18);
    expect(metricMap.get('typing_wpm')).toBe(38);
    expect(metricMap.get('typing_iki')).toBe(210);
    expect(metricMap.get('typing_backspace_rate')).toBe(6.5);
    expect(metricMap.get('typing_pause_count')).toBe(2);
    expect(metricMap.get('typing_hold_time')).toBe(95);

    // Verify composite indices are deterministically computed from real metrics
    expect(metricMap.has('cognitive_fatigue_score')).toBe(true);
    expect(metricMap.get('cognitive_fatigue_score')).toBeGreaterThanOrEqual(0);
    expect(metricMap.get('cognitive_fatigue_score')).toBeLessThanOrEqual(100);

    expect(metricMap.has('impulse_risk_index')).toBe(true);
    expect(metricMap.get('impulse_risk_index')).toBeGreaterThanOrEqual(0);
    expect(metricMap.get('impulse_risk_index')).toBeLessThanOrEqual(100);

    // Verify status is 'active' once data is recorded
    expect(getMetricStatusType('cognitive_fatigue_score', true)).toBe('active');
    expect(getMetricStatusType('impulse_risk_index', true)).toBe('active');
    expect(getMetricStatusType('typing_hold_time', true)).toBe('active');
    expect(getMetricStatusType('night_usage_minutes', true)).toBe('active');
  });

  it('3. generates awareness notes strictly grounded in real measured metrics, EWMA deviations, mood logs, and clinical surveys', async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const mockBaselines: BaselineState[] = [
      {
        metricKey: 'typing_iki',
        ewmaMean: 180,
        ewmaStd: 20,
        sampleCount: 14,
        isEstablished: true,
        lastUpdated: todayStr,
      },
      {
        metricKey: 'typing_wpm',
        ewmaMean: 42,
        ewmaStd: 4,
        sampleCount: 14,
        isEstablished: true,
        lastUpdated: todayStr,
      },
      {
        metricKey: 'session_duration',
        ewmaMean: 8,
        ewmaStd: 2,
        sampleCount: 14,
        isEstablished: true,
        lastUpdated: todayStr,
      },
    ];

    const todayMetrics: DailyMetric[] = [
      { id: 1, date: todayStr, metricKey: 'typing_iki', value: 260, sampleCount: 5 },
      { id: 2, date: todayStr, metricKey: 'typing_wpm', value: 26, sampleCount: 5 },
      { id: 3, date: todayStr, metricKey: 'session_duration', value: 18, sampleCount: 4 },
    ];

    const storedInsights: Insight[] = [];

    (vi.spyOn(db.dailyMetrics as any, 'orderBy') as any).mockImplementation(() => ({
      last: async () => todayMetrics[todayMetrics.length - 1],
    }));

    (vi.spyOn(db.dailyMetrics as any, 'toArray') as any).mockImplementation(async () => todayMetrics);

    (vi.spyOn(db.dailyMetrics as any, 'where') as any).mockImplementation((key: string) => ({
      equals: (val: any) => ({
        sortBy: async () => todayMetrics.filter((m) => (m as any)[key] === val),
        toArray: async () => todayMetrics.filter((m) => (m as any)[key] === val),
      }),
    }));

    (vi.spyOn(db.baselines as any, 'get') as any).mockImplementation(async (k: MetricKey) =>
      mockBaselines.find((b) => b.metricKey === k)
    );
    (vi.spyOn(db.baselines as any, 'toArray') as any).mockImplementation(async () => mockBaselines);

    (vi.spyOn(db.moodReports as any, 'orderBy') as any).mockImplementation(() => ({
      reverse: () => ({
        toArray: async () => [],
        limit: () => ({
          toArray: async () => [],
        }),
      }),
    }));

    (vi.spyOn(db.insights as any, 'where') as any).mockImplementation((key: string) => ({
      equals: (val: any) => ({
        first: async () => storedInsights.find((i) => (i as any)[key] === val),
        toArray: async () => storedInsights.filter((i) => (i as any)[key] === val),
      }),
    }));

    (vi.spyOn(db.insights as any, 'add') as any).mockImplementation(async (item: Insight) => {
      storedInsights.push({ ...item, id: storedInsights.length + 1 });
      return storedInsights.length;
    });

    (vi.spyOn(db.insights as any, 'bulkAdd') as any).mockImplementation(async (items: Insight[]) => {
      for (const item of items) {
        storedInsights.push({ ...item, id: storedInsights.length + 1 });
      }
      return items.length;
    });

    (vi.spyOn(db.insights as any, 'update') as any).mockImplementation(async (id: number, changes: Partial<Insight>) => {
      const idx = storedInsights.findIndex((i) => i.id === id);
      if (idx >= 0) storedInsights[idx] = { ...storedInsights[idx], ...changes };
      return 1;
    });

    (vi.spyOn(db.insights as any, 'bulkDelete') as any).mockImplementation(async () => {});
    (vi.spyOn(db.predictiveAlerts as any, 'bulkAdd') as any).mockImplementation(async () => {});
    (vi.spyOn(db.settings as any, 'get') as any).mockImplementation(async () => undefined);
    (vi.spyOn(db.settings as any, 'put') as any).mockImplementation(async () => {});

    // Run insights engine and verify real measured values are embedded in generated insight body
    await generateInsightsAndAlerts(true);
    expect(storedInsights.length).toBeGreaterThan(0);

    const burnoutInsight = storedInsights.find((i) => i.biomarkerType === 'burnout-alert');
    expect(burnoutInsight).toBeDefined();
    expect(burnoutInsight?.body).toContain('Gerçek Ölçüm Kanıtı:');
    expect(burnoutInsight?.body).toContain('260 ms');

    // Build ReportMetricStat array from real data
    const stats: ReportMetricStat[] = [
      {
        key: 'typing_iki',
        label: 'Tuşlar Arası Geçiş Süresi (IKI)',
        unit: 'ms',
        category: 'typing',
        hasData: true,
        baselineMean: 180,
        periodAvg: 260,
        deviationPercent: 44,
        zScore: 4.0,
        unavailableReason: '',
      },
      {
        key: 'typing_wpm',
        label: 'Yazım Hızı (Dakika Başına Kelime)',
        unit: 'kelime/dk',
        category: 'typing',
        hasData: true,
        baselineMean: 42,
        periodAvg: 26,
        deviationPercent: -38,
        zScore: -4.0,
        unavailableReason: '',
      },
      {
        key: 'session_duration',
        label: 'Ortalama Oturum Süresi',
        unit: 'dk',
        category: 'session',
        hasData: true,
        baselineMean: 8,
        periodAvg: 18,
        deviationPercent: 125,
        zScore: 5.0,
        unavailableReason: '',
      },
    ];

    const moods = [
      {
        date: todayStr,
        timestamp: Date.now(),
        score: 2,
        energyScore: 2,
        tags: ['Yorgun', 'Stresli'],
        note: 'Yoğun iş temposu',
      },
    ];

    const surveys: ClinicalSurveyResult[] = [
      {
        date: todayStr,
        timestamp: Date.now(),
        gad7Score: 12,
        gad7Risk: 'Orta',
        phq9Score: 11,
        phq9Risk: 'Orta',
        crisisRisk: false,
        responses: [2, 2, 2, 2, 2, 1, 1],
      },
    ];

    const awarenessNotes = generateRealReportAwarenessNotes({
      stats,
      insights: storedInsights,
      moods,
      surveys,
      medImpactReports: [],
      effectiveDayCount: 14,
      rangeDays: 14,
    });

    // Should contain phenotype note, EWMA deviation note, active telemetry note, mood note, and survey note
    expect(awarenessNotes.some((n) => n.category === 'phenotype')).toBe(true);
    expect(awarenessNotes.some((n) => n.id === 'ewma-notable-deviations')).toBe(true);
    expect(awarenessNotes.some((n) => n.id === 'active-telemetry-summary')).toBe(true);
    expect(awarenessNotes.some((n) => n.id === 'real-mood-summary')).toBe(true);
    expect(awarenessNotes.some((n) => n.id === 'real-clinical-survey')).toBe(true);

    const ewmaNote = awarenessNotes.find((n) => n.id === 'ewma-notable-deviations')!;
    expect(ewmaNote.body).toContain('260 ms');
    expect(ewmaNote.body).toContain('180 ms');
    expect(ewmaNote.body).toContain('+44%');

    const moodNote = awarenessNotes.find((n) => n.id === 'real-mood-summary')!;
    expect(moodNote.body).toContain('2/5');
    expect(moodNote.body).toContain('Yorgun');

    const surveyNote = awarenessNotes.find((n) => n.id === 'real-clinical-survey')!;
    expect(surveyNote.body).toContain('12/21');
    expect(surveyNote.body).toContain('11/27');
  });
});
