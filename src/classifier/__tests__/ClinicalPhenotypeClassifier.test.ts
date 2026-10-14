import { describe, it, expect } from 'vitest';
import { ClinicalPhenotypeClassifier } from '../ClinicalPhenotypeClassifier';

describe('ClinicalPhenotypeClassifier - Rule-Augmented Landmark Mental Health Phenotypes', () => {
  it('should detect Depressive Phenotype State (High Homestay, Low Entropy, Prolonged Flight Time)', () => {
    const zScores = {
      homestay_ratio: 2.1,
      location_entropy: -1.8,
      typing_iki: 1.7, // Flight time slowed
      outgoing_social_ratio: -1.6,
      night_usage_minutes: 1.4,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('depressive_phenotype');
    expect(inference.label).toContain('Depresif');
    expect(inference.confidence).toBe('high');
    expect(inference.clinicalInsight).toContain('homestay');
    expect(inference.clinicalInsight).toContain('potansiyel');
    expect(inference.clinicalInsight).toContain('olabilir');
  });

  it('should detect Anxious / Agitated State (High Hyper-checking, High Backspace Rate, High Tremor)', () => {
    const zScores = {
      hyper_checking_ratio: 2.3,
      typing_backspace_rate: 2.0,
      tremor_variance: 1.8,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('anxious_agitated_phenotype');
    expect(inference.label).toContain('Anksiyete');
    expect(inference.clinicalInsight).toContain('hyper-checking');
    expect(inference.clinicalInsight).toContain('potansiyel');
  });

  it('should detect Manic / Hypomanic State (Surging Night Screen, High Typing Speed, Expanding Mobility)', () => {
    const zScores = {
      night_usage_minutes: 2.8,
      typing_wpm: 2.3,
      mobility_radius: 2.2,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('manic_hypomanic_phenotype');
    expect(inference.label).toContain('Manik');
  });

  it('should detect Cognitive Fatigue / Burnout State (Extended Hold Time, High Switching Entropy)', () => {
    const zScores = {
      typing_hold_time: 1.9,
      session_switching_entropy: 2.0,
      typing_backspace_rate: 1.6,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('cognitive_fatigue_phenotype');
    expect(inference.label).toContain('Bilişsel Yorgunluk');
  });

  it('should detect ADHD / Neurodivergent Pattern (High session entropy, bursty interactions)', () => {
    const zScores = {
      session_switching_entropy: 2.1,
      touch_interaction_frequency: 1.9,
      typing_pause_count: 1.8,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('adhd_neurodivergent_phenotype');
    expect(inference.label).toContain('DEHB');
  });

  it('should detect PTSD / Hypervigilance Pattern (High hyper-checking, nocturnal restlessness)', () => {
    const zScores = {
      hyper_checking_ratio: 2.4,
      night_usage_minutes: 1.8,
      tremor_variance: 1.6,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('ptsd_hypervigilance_phenotype');
    expect(inference.label).toContain('Hipervijilans');
  });

  it('should detect Cognitive Decline Risk Pattern (Typing slowdown, high pauses, flat pitch)', () => {
    const zScores = {
      typing_wpm: -2.0,
      typing_pause_count: 2.1,
      voice_pitch_variance: -2.1,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('cognitive_decline_risk_phenotype');
    expect(inference.label).toContain('Bilişsel Yavaşlama');
  });

  it('should detect Low Self-Esteem / Passive Lurking Pattern (High screen time, low touch & social)', () => {
    const zScores = {
      screen_on_time: 2.0,
      touch_interaction_frequency: -1.9,
      outgoing_social_ratio: -1.5,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('low_self_esteem_phenotype');
    expect(inference.label).toContain('Pasif Tüketim');
  });

  it('should return Euthymic / Healthy Baseline when Z-Scores are balanced', () => {
    const zScores = {
      mobility_index: 0.2,
      typing_wpm: -0.1,
      night_usage_minutes: 0.1,
      typing_backspace_rate: -0.2,
    };

    const inference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores);

    expect(inference.state).toBe('euthymic_healthy_balance');
    expect(inference.compositeScore).toBeGreaterThan(0.9);
  });

  it('should calculate 0-100 Affective State Index accurately', () => {
    const balancedIndex = ClinicalPhenotypeClassifier.calculateAffectiveStateIndex({
      mobility_index: 0,
      typing_wpm: 0,
      night_usage_minutes: 0,
      typing_backspace_rate: 0,
      tremor_variance: 0,
    });
    expect(balancedIndex).toBe(75);

    const lowIndex = ClinicalPhenotypeClassifier.calculateAffectiveStateIndex({
      mobility_index: -2.5,
      typing_wpm: -2.0,
      night_usage_minutes: 3.0,
      typing_backspace_rate: 2.0,
      tremor_variance: 2.0,
    });
    expect(lowIndex).toBeLessThan(50);
  });

  describe('EarlyAwarenessEngine - 7 Clinical Insight Patterns & Longitudinal Thresholds', () => {
    it('should generate explainable alerts for Burnout, Depression, Anxiety, ADHD, Cognitive, PTSD, and Passive Social', () => {
      const zScores = {
        typing_hold_time: 2.3,
        typing_backspace_rate: 1.8,
        homestay_ratio: 2.0,
        mobility_radius: -2.2,
        night_usage_minutes: 2.1,
        session_switching_entropy: 2.2,
        typing_iki: 2.6,
        hyper_checking_ratio: 2.4,
      };

      const rawValues = {
        meanHoldTimeMs: 155,
        backspacePercentIncrease: 32,
        homestayPercentage: 89,
        sleepOnsetLatencyMinutes: 48,
        nocturnalScreen02to04Unlocks: 4,
        appSwitchingIn15MinWindow: 10,
        averageSessionLengthSeconds: 32,
        sleepRegularityIndex: 52,
        dailyUnlockCount: 92,
        quickCheckRatioPercent: 46,
        dailySocialMediaMinutes: 145,
        outwardInteractionRatioPercent: 3.2,
        lateNightContinuousScrollMinutes: 55,
        postSessionEmaAffectDrop: 2.5,
      };

      const alerts = ClinicalPhenotypeClassifier.evaluateEarlyAwarenessAlerts(zScores, rawValues);

      expect(alerts.length).toBe(7);

      const burnout = alerts.find(a => a.insightType === 'burnout');
      expect(burnout).toBeDefined();
      expect(burnout?.title).toContain('Burnout');
      expect(burnout?.explainableEvidences.length).toBeGreaterThanOrEqual(2);
      expect(burnout?.ethicalDisclaimer).toContain('tıbbi teşhis değildir');

      const depression = alerts.find(a => a.insightType === 'depressionIsolation');
      expect(depression).toBeDefined();
      expect(depression?.title).toContain('Depresyon');

      const cognitive = alerts.find(a => a.insightType === 'cognitiveDecline');
      expect(cognitive).toBeDefined();
      expect(cognitive?.title).toBe('Bilişsel İcra Hızı ve Ritim Değişimi');
      expect(cognitive?.title).not.toContain('Demans');

      const passiveSocial = alerts.find(a => a.insightType === 'lowSelfEsteemPassiveSocial');
      expect(passiveSocial).toBeDefined();
      expect(passiveSocial?.title).toContain('Düşük Özsaygı');
      expect(passiveSocial?.notificationBody).toContain('sosyal medyada pasif izleyici');
    });

    it('should evaluate longitudinal 3-day consecutive Burnout critical threshold and output non-diagnostic statistical warning', () => {
      const baselines = [
        { metricKey: 'typing_hold_time' as const, ewmaMean: 100, ewmaStd: 15, sampleCount: 14, lastUpdated: '2026-09-10', isEstablished: true },
        { metricKey: 'typing_backspace_rate' as const, ewmaMean: 4, ewmaStd: 1, sampleCount: 14, lastUpdated: '2026-09-10', isEstablished: true },
      ];

      // Only 2 consecutive days -> should NOT trigger critical 3-day threshold yet
      const twoDaysMetrics = [
        { date: '2026-09-11', metricKey: 'typing_hold_time' as const, value: 145, sampleCount: 10 },
        { date: '2026-09-11', metricKey: 'typing_backspace_rate' as const, value: 6, sampleCount: 10 },
        { date: '2026-09-12', metricKey: 'typing_hold_time' as const, value: 148, sampleCount: 10 },
        { date: '2026-09-12', metricKey: 'typing_backspace_rate' as const, value: 6.5, sampleCount: 10 },
      ];
      expect(ClinicalPhenotypeClassifier.evaluateLongitudinalClinicalAlerts(twoDaysMetrics, baselines).length).toBe(0);

      // 3 consecutive days -> reaches critical threshold!
      const threeDaysMetrics = [
        ...twoDaysMetrics,
        { date: '2026-09-13', metricKey: 'typing_hold_time' as const, value: 152, sampleCount: 10 },
        { date: '2026-09-13', metricKey: 'typing_backspace_rate' as const, value: 7, sampleCount: 10 },
      ];
      const alerts = ClinicalPhenotypeClassifier.evaluateLongitudinalClinicalAlerts(threeDaysMetrics, baselines);
      const burnout = alerts.find(a => a.insightType === 'burnout');

      expect(burnout).toBeDefined();
      expect(burnout?.isCriticalThresholdReached).toBe(true);
      expect(burnout?.consecutiveDays).toBe(3);
      expect(burnout?.potentialStateLabel).toContain('Potansiyel');
      expect(burnout?.notificationBody).toContain('potansiyel');
      expect(burnout?.notificationBody).toContain('olabilir');
      expect(burnout?.notificationBody).toContain('Kesin tıbbi teşhis değildir');
      expect(burnout?.statisticalSummary).toContain('Ardışık 3 Gün');
    });

    it('should evaluate longitudinal 3-day Depression & Social Isolation and 3-night Anxiety & Sleep critical thresholds', () => {
      const baselines = [
        { metricKey: 'homestay_ratio' as const, ewmaMean: 0.5, ewmaStd: 0.1, sampleCount: 14, lastUpdated: '2026-09-10', isEstablished: true },
        { metricKey: 'mobility_radius' as const, ewmaMean: 8, ewmaStd: 2, sampleCount: 14, lastUpdated: '2026-09-10', isEstablished: true },
        { metricKey: 'night_usage_minutes' as const, ewmaMean: 5, ewmaStd: 3, sampleCount: 14, lastUpdated: '2026-09-10', isEstablished: true },
        { metricKey: 'sleep_sol' as const, ewmaMean: 15, ewmaStd: 5, sampleCount: 14, lastUpdated: '2026-09-10', isEstablished: true },
      ];

      const metrics = [
        { date: '2026-09-11', metricKey: 'homestay_ratio' as const, value: 0.90, sampleCount: 1 },
        { date: '2026-09-11', metricKey: 'mobility_radius' as const, value: 2.0, sampleCount: 1 },
        { date: '2026-09-11', metricKey: 'night_usage_minutes' as const, value: 35, sampleCount: 1 },
        { date: '2026-09-11', metricKey: 'sleep_sol' as const, value: 40, sampleCount: 1 },

        { date: '2026-09-12', metricKey: 'homestay_ratio' as const, value: 0.92, sampleCount: 1 },
        { date: '2026-09-12', metricKey: 'mobility_radius' as const, value: 1.8, sampleCount: 1 },
        { date: '2026-09-12', metricKey: 'night_usage_minutes' as const, value: 42, sampleCount: 1 },
        { date: '2026-09-12', metricKey: 'sleep_sol' as const, value: 45, sampleCount: 1 },

        { date: '2026-09-13', metricKey: 'homestay_ratio' as const, value: 0.89, sampleCount: 1 },
        { date: '2026-09-13', metricKey: 'mobility_radius' as const, value: 1.5, sampleCount: 1 },
        { date: '2026-09-13', metricKey: 'night_usage_minutes' as const, value: 38, sampleCount: 1 },
        { date: '2026-09-13', metricKey: 'sleep_sol' as const, value: 42, sampleCount: 1 },
      ];

      const alerts = ClinicalPhenotypeClassifier.evaluateLongitudinalClinicalAlerts(metrics, baselines);
      const depAlert = alerts.find(a => a.insightType === 'depressionIsolation');
      const anxAlert = alerts.find(a => a.insightType === 'anxietySleep');

      expect(depAlert).toBeDefined();
      expect(depAlert?.consecutiveDays).toBe(3);
      expect(depAlert?.notificationBody).toContain('potansiyel');
      expect(depAlert?.notificationBody).toContain('olabilir');

      expect(anxAlert).toBeDefined();
      expect(anxAlert?.consecutiveDays).toBe(3);
      expect(anxAlert?.notificationBody).toContain('potansiyel');
      expect(anxAlert?.notificationBody).toContain('olabilir');
    });
  });
});
