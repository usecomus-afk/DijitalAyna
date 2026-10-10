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
  const zScores: Record<string, number> = {};
  const rawValues: Record<string, number> = {};
  const today = anomalies.length > 0 ? anomalies[0].date : new Date().toISOString().split('T')[0];

  for (const a of anomalies) {
    zScores[a.metricKey] = a.zScore;
    rawValues[a.metricKey] = a.currentValue;
  }

  const alerts = ClinicalPhenotypeClassifier.evaluateEarlyAwarenessAlerts(zScores, rawValues);
  const results: BiomarkerResult[] = [];

  for (const alert of alerts) {
    // Attempt to map back the required anomalies for the triggerAnomalies array
    const triggerAnomalies = anomalies.filter(
      a => Object.keys(alert.contributingMetrics || {}).includes(a.metricKey)
        || a.metricKey.includes(alert.insightType.toLowerCase()) // Fallback
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

