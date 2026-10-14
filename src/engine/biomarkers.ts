import { AnomalyResult, BiomarkerResult } from '../types/engine';
import { ClinicalPhenotypeClassifier } from '../classifier/ClinicalPhenotypeClassifier';
import { ClinicalPhenotypeInference } from '../types/phenotyping';

/**
 * Calculates the Academic Affective State Index (0-100)
 * Higher score indicates higher affective balance and circadian stability.
 */
export function calculateAffectiveStateIndex(anomalies: AnomalyResult[]): number | null {
  if (anomalies.length === 0) return null; // Default healthy baseline replaced with null if no data

  const anomalyMap = new Map(anomalies.map(a => [a.metricKey, a]));
  const zScores: Record<string, number> = {};

  for (const [key, a] of anomalyMap.entries()) {
    zScores[key] = a.zScore;
  }

  return ClinicalPhenotypeClassifier.calculateAffectiveStateIndex(zScores);
}

export function synthesizeBiomarkers(anomalies: AnomalyResult[]): BiomarkerResult[] {
  const anomalyMap = new Map(anomalies.map(a => [a.metricKey, a]));
  const zScores: Record<string, number> = {};
  const rawValues: Record<string, number> = {};
  const today = anomalies.length > 0 ? anomalies[0].date : new Date().toISOString().split('T')[0];

  for (const a of anomalies) {
    zScores[a.metricKey] = a.zScore;
    rawValues[a.metricKey] = a.currentValue;
  }

  // Map MetricKey values to PHENOTYPE_RULES raw value aliases when available
  if (rawValues['typing_hold_time'] !== undefined) {
    rawValues['meanHoldTimeMs'] = rawValues['typing_hold_time'];
  }
  const backspaceAnom = anomalyMap.get('typing_backspace_rate');
  if (backspaceAnom) {
    rawValues['backspacePercentIncrease'] = Math.max(0, backspaceAnom.deviationPercent);
  }
  if (rawValues['homestay_ratio'] !== undefined) {
    rawValues['homestayPercentage'] =
      rawValues['homestay_ratio'] <= 1 ? rawValues['homestay_ratio'] * 100 : rawValues['homestay_ratio'];
  }
  if (rawValues['sleep_sol'] !== undefined) {
    rawValues['sleepOnsetLatencyMinutes'] = rawValues['sleep_sol'];
  }

  const results: BiomarkerResult[] = [];
  const addedTypes = new Set<string>();

  const typingWpm = anomalyMap.get('typing_wpm');
  const typingBackspace = anomalyMap.get('typing_backspace_rate');
  const typingIki = anomalyMap.get('typing_iki');
  const typingHold = anomalyMap.get('typing_hold_time');
  const mobility = anomalyMap.get('mobility_index');
  const homestay = anomalyMap.get('homestay_ratio');
  const touchFreq = anomalyMap.get('touch_interaction_frequency');
  const nightUsage = anomalyMap.get('night_usage_minutes');
  const nightLight = anomalyMap.get('night_light_violations');
  const sleepEff = anomalyMap.get('sleep_efficiency');
  const sleepDur = anomalyMap.get('sleep_duration');
  const sleepSol = anomalyMap.get('sleep_sol');
  const sleepWaso = anomalyMap.get('sleep_waso');

  // 1. Keystroke Dynamics & Emotional Burnout
  const hasTypingSlowdown = (typingWpm && typingWpm.zScore <= -1.8) || (typingHold && typingHold.zScore >= 1.8);
  const hasHighBackspace = typingBackspace && typingBackspace.zScore >= 1.8;
  const hasHighIki = typingIki && typingIki.zScore >= 1.8;
  if (hasTypingSlowdown && (hasHighBackspace || hasHighIki)) {
    const triggers = [typingWpm, typingHold, typingBackspace, typingIki].filter(Boolean) as AnomalyResult[];
    results.push({
      type: 'emotional_burnout',
      label: 'Bilişsel Yük & Psikomotor Yavaşlama Sinyali',
      confidence: triggers.length >= 3 ? 'high' : 'medium',
      score: 0.88,
      triggerAnomalies: triggers,
      detectedAt: today,
    });
    addedTypes.add('emotional_burnout');
  }

  // 2. Motor Activity (Apple Health Steps / GPS) & Social Withdrawal
  const hasLowMobility = (mobility && mobility.zScore <= -2.0) || (homestay && homestay.zScore >= 1.8);
  const hasLowInteraction = touchFreq && touchFreq.zScore <= -1.8;
  if (hasLowMobility && (hasLowInteraction || (mobility && mobility.zScore <= -2.2))) {
    const triggers = [mobility, homestay, touchFreq].filter(Boolean) as AnomalyResult[];
    results.push({
      type: 'social_withdrawal',
      label: 'Düşük Motor Aktivite & Sosyal İzolasyon Sinyali',
      confidence: 'high',
      score: 0.91,
      triggerAnomalies: triggers,
      detectedAt: today,
    });
    addedTypes.add('social_withdrawal');
  }

  // 3. Circadian Rhythm & Apple Health Sleep Architecture Disruption
  const hasNightAnomaly =
    (nightUsage && (nightUsage.zScore >= 1.8 || nightUsage.currentValue >= 25)) ||
    (nightLight && nightLight.currentValue >= 1);
  const hasSleepAnomaly =
    (sleepEff && sleepEff.zScore <= -1.8) ||
    (sleepDur && sleepDur.zScore <= -1.8) ||
    (sleepSol && sleepSol.zScore >= 1.8) ||
    (sleepWaso && sleepWaso.zScore >= 1.8);

  if (hasNightAnomaly || hasSleepAnomaly) {
    const triggers = [nightUsage, nightLight, sleepEff, sleepDur, sleepSol, sleepWaso].filter(Boolean) as AnomalyResult[];
    results.push({
      type: 'circadian_disruption',
      label: 'Sirkadiyen Ritim & Uyku Mimarisi Bölünmesi Sinyali',
      confidence: 'high',
      score: 0.89,
      triggerAnomalies: triggers,
      detectedAt: today,
    });
    addedTypes.add('circadian_disruption');
  }

  // 4. Also include any additional rule alerts from PHENOTYPE_RULES
  const alerts = ClinicalPhenotypeClassifier.evaluateEarlyAwarenessAlerts(zScores, rawValues);
  for (const alert of alerts) {
    if (addedTypes.has(alert.id)) continue;
    const triggerAnomalies = anomalies.filter(
      a => Object.keys(alert.contributingMetrics || {}).includes(a.metricKey)
        || a.metricKey.includes(alert.insightType.toLowerCase())
    );
    results.push({
      type: alert.id,
      label: alert.title,
      confidence: 'high',
      score: 0.9,
      triggerAnomalies,
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

