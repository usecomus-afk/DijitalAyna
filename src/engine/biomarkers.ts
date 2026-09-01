import { AnomalyResult, BiomarkerResult } from '../types/engine';
import { ClinicalPhenotypeClassifier } from '../classifier/ClinicalPhenotypeClassifier';
import { ClinicalPhenotypeInference } from '../types/phenotyping';

/**
 * Calculates the Academic Affective State Index (0-100)
 * Higher score indicates higher affective balance and circadian stability.
 */
export function calculateAffectiveStateIndex(anomalies: AnomalyResult[]): number {
  if (anomalies.length === 0) return 75; // Default healthy baseline

  const anomalyMap = new Map(anomalies.map(a => [a.metricKey, a]));
  const zScores: Record<string, number> = {};

  for (const [key, a] of anomalyMap.entries()) {
    zScores[key] = a.zScore;
  }

  return ClinicalPhenotypeClassifier.calculateAffectiveStateIndex(zScores);
}

/**
 * Academic Rule-based Biomarker synthesizer from detected anomalies
 * Grounded in digital phenotyping literature (Torous et al., Insel 2017)
 */
export function synthesizeBiomarkers(anomalies: AnomalyResult[]): BiomarkerResult[] {
  const anomalyMap = new Map(anomalies.map(a => [a.metricKey, a]));
  const results: BiomarkerResult[] = [];

  const typingWpm = anomalyMap.get('typing_wpm');
  const typingBackspace = anomalyMap.get('typing_backspace_rate');
  const typingIki = anomalyMap.get('typing_iki');
  const mobility = anomalyMap.get('mobility_index');
  const touchFreq = anomalyMap.get('touch_interaction_frequency');
  const scrollVel = anomalyMap.get('touch_scroll_velocity');
  const nightUsage = anomalyMap.get('night_usage_minutes');
  const tremor = anomalyMap.get('tremor_variance');

  const today = anomalies.length > 0 ? anomalies[0].date : new Date().toISOString().split('T')[0];

  // 1. Keystroke Dynamics & Cognitive Load (Torous et al.)
  // High IKI variance / slowdown + high error rate indicates cognitive load or psychomotor slowing
  const hasTypingSlowdown = typingWpm && typingWpm.zScore <= -1.8;
  const hasHighBackspace = typingBackspace && typingBackspace.zScore >= 1.8;
  const hasHighIki = typingIki && typingIki.zScore >= 1.8;

  if (hasTypingSlowdown && (hasHighBackspace || hasHighIki)) {
    const triggerList: AnomalyResult[] = [];
    if (typingWpm) triggerList.push(typingWpm);
    if (typingBackspace) triggerList.push(typingBackspace);
    if (typingIki) triggerList.push(typingIki);

    const confidence = triggerList.length >= 3 ? 'high' : 'medium';
    results.push({
      type: 'emotional_burnout',
      label: 'Bilişsel Yük & Psikomotor Yavaşlama Sinyali',
      confidence,
      score: 0.88,
      triggerAnomalies: triggerList,
      detectedAt: today,
    });
  }

  // 2. Motor Activity & Social Withdrawal Rule
  const hasLowMobility = mobility && mobility.zScore <= -2.0;
  const hasLowInteraction = touchFreq && touchFreq.zScore <= -1.8;

  if (hasLowMobility && hasLowInteraction) {
    const triggerList: AnomalyResult[] = [];
    if (mobility) triggerList.push(mobility);
    if (touchFreq) triggerList.push(touchFreq);

    results.push({
      type: 'social_withdrawal',
      label: 'Düşük Motor Aktivite & Sosyal İzolasyon Sinyali',
      confidence: 'high',
      score: 0.91,
      triggerAnomalies: triggerList,
      detectedAt: today,
    });
  }

  // 3. Circadian Rhythm Disruption (Sleep-Wake Proxy)
  // Night usage in 01:00-05:00 window or high night usage minutes
  const hasNightUsageAnomaly = nightUsage && (nightUsage.zScore >= 1.8 || nightUsage.currentValue >= 25);
  if (hasNightUsageAnomaly) {
    results.push({
      type: 'circadian_disruption',
      label: 'Sirkadiyen Ritim & Gece Bölünmesi Sinyali',
      confidence: 'high',
      score: 0.86,
      triggerAnomalies: [nightUsage!],
      detectedAt: today,
    });
  }

  // 4. Psychomotor Agitation & High Stress Rule
  const hasHighScroll = scrollVel && scrollVel.zScore >= 1.8;
  const hasHighTremor = tremor && tremor.zScore >= 1.8;
  if (hasHighScroll && hasHighTremor) {
    results.push({
      type: 'high_stress',
      label: 'Psikomotor Ajitasyon & Stres Sinyali',
      confidence: 'medium',
      score: 0.82,
      triggerAnomalies: [scrollVel!, tremor!],
      detectedAt: today,
    });
  }

  // 5. Cognitive Fatigue & Decision Slowdown (Slide 25)
  const cognitiveScore = anomalyMap.get('cognitive_fatigue_score');
  const typingPause = anomalyMap.get('typing_pause_count');
  if ((cognitiveScore && cognitiveScore.zScore >= 1.8) || (typingWpm && typingWpm.zScore <= -1.8 && typingPause && typingPause.zScore >= 1.8)) {
    const triggers: AnomalyResult[] = [];
    if (cognitiveScore) triggers.push(cognitiveScore);
    if (typingWpm) triggers.push(typingWpm);
    if (typingPause) triggers.push(typingPause);
    results.push({
      type: 'cognitive_fatigue',
      label: 'Bilişsel Yorgunluk & Karar Güçlüğü Sinyali',
      confidence: 'medium',
      score: 0.84,
      triggerAnomalies: triggers,
      detectedAt: today,
    });
  }

  // 6. Voice Monotone / Flattened Affect (Slide 7 & 10)
  const voicePitch = anomalyMap.get('voice_pitch_variance');
  if (voicePitch && voicePitch.zScore <= -1.8) {
    results.push({
      type: 'voice_monotone',
      label: 'Monoton Konuşma Tonu & Duygusal Düzleşme',
      confidence: 'medium',
      score: 0.85,
      triggerAnomalies: [voicePitch],
      detectedAt: today,
    });
  }

  // 7. Impulsive Behavior & Late-Night Cycle (Slide 26)
  const impulseRisk = anomalyMap.get('impulse_risk_index');
  if ((impulseRisk && impulseRisk.zScore >= 1.8) || (nightUsage && nightUsage.zScore >= 2.0 && touchFreq && touchFreq.zScore >= 1.8)) {
    const triggers: AnomalyResult[] = [];
    if (impulseRisk) triggers.push(impulseRisk);
    if (nightUsage) triggers.push(nightUsage);
    if (touchFreq) triggers.push(touchFreq);
    results.push({
      type: 'impulsive_risk',
      label: 'Gece Yarısı Dürtüsel Döngü Sinyali',
      confidence: 'medium',
      score: 0.86,
      triggerAnomalies: triggers,
      detectedAt: today,
    });
  }

  // If no negative biomarkers detected, output healthy balance indicator
  if (results.length === 0) {
    results.push({
      type: 'healthy_balance',
      label: 'Dengeli Davranışsal & Sirkadiyen Ritim',
      confidence: 'high',
      score: 0.95,
      triggerAnomalies: [],
      detectedAt: today,
    });
  }

  return results;
}

/**
 * High-level Clinical Phenotype Inference from detected daily anomalies
 */
export function inferClinicalPhenotype(anomalies: AnomalyResult[]): ClinicalPhenotypeInference {
  const zScores: Record<string, number> = {};
  for (const a of anomalies) {
    zScores[a.metricKey] = a.zScore;
  }
  const date = anomalies[0]?.date || new Date().toISOString().split('T')[0];
  return ClinicalPhenotypeClassifier.classifyPhenotype(zScores, date);
}

