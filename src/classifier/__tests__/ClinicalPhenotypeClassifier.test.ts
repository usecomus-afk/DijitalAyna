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
    // Balanced state
    const balancedIndex = ClinicalPhenotypeClassifier.calculateAffectiveStateIndex({
      mobility_index: 0,
      typing_wpm: 0,
      night_usage_minutes: 0,
      typing_backspace_rate: 0,
      tremor_variance: 0,
    });
    expect(balancedIndex).toBe(75);

    // Distressed state (high night usage, high tremor, low mobility)
    const lowIndex = ClinicalPhenotypeClassifier.calculateAffectiveStateIndex({
      mobility_index: -2.5,
      typing_wpm: -2.0,
      night_usage_minutes: 3.0,
      typing_backspace_rate: 2.0,
      tremor_variance: 2.0,
    });
    expect(lowIndex).toBeLessThan(50);
  });
});
