import { AnomalyResult, PredictiveAlert } from '../types/engine';
import { MetricKey } from '../types/sensor';

export const CORE_DIMENSIONS: MetricKey[] = [
  'typing_wpm',
  'typing_backspace_rate',
  'night_usage_minutes',
  'mobility_index',
  'touch_interaction_frequency',
];

// Prototypical precursor vectors for 5 core dimensions:
// [typing_wpm_z, typing_backspace_z, night_usage_z, mobility_z, touch_freq_z]
const BURNOUT_PRECURSOR = [-2.0, 2.5, 2.8, -0.8, 0.6];
const WITHDRAWAL_PRECURSOR = [-0.5, 0.3, 0.6, -2.6, -2.4];

/**
 * Computes partial Cosine Similarity with missing data penalty
 * CosineSim_partial = ( sum_{i in Observed} A_i * B_i / ( sqrt(sum A_i^2) * sqrt(sum B_i^2) ) ) * (|Observed| / |TotalRequired|)
 */
export function partialCosineSimilarity(
  observedValues: number[],
  precursorIndices: number[],
  precursorFullVector: number[],
  totalRequired = CORE_DIMENSIONS.length
): number {
  if (observedValues.length === 0 || totalRequired === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < observedValues.length; i++) {
    const idx = precursorIndices[i];
    const valA = observedValues[i];
    const valB = precursorFullVector[idx];

    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  const rawSim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  const penalty = observedValues.length / totalRequired;
  return Math.round(rawSim * penalty * 100) / 100;
}

/**
 * Legacy full cosine similarity helper
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return Math.round((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) * 100) / 100;
}

export type PredictivePatternResult = PredictiveAlert[] & {
  status: 'ok' | 'insufficient_data';
  observedCount: number;
  totalRequired: number;
  missingMetrics: string[];
};

/**
 * Match current behavioral vector against known precursor patterns.
 * STRICT CLINICAL SAFETY:
 * - Eliminates getZ(k) ?? 0.
 * - Uses partial cosine similarity scaled by (|Observed| / |TotalRequired|).
 * - If observed dimensions < |TotalRequired| / 2 (e.g. < 3 out of 5), prediction is canceled (insufficient_data).
 */
export function evaluatePredictivePatterns(anomalies: AnomalyResult[]): PredictivePatternResult {
  const anomalyMap = new Map(anomalies.map(a => [a.metricKey, a]));

  const observedValues: number[] = [];
  const observedIndices: number[] = [];
  const missingMetrics: string[] = [];

  CORE_DIMENSIONS.forEach((key, index) => {
    const anom = anomalyMap.get(key);
    if (anom !== undefined && anom.zScore !== undefined && anom.zScore !== null && !Number.isNaN(anom.zScore)) {
      observedValues.push(anom.zScore);
      observedIndices.push(index);
    } else {
      missingMetrics.push(key);
    }
  });

  const totalRequired = CORE_DIMENSIONS.length;
  const minRequired = Math.ceil(totalRequired / 2); // 3 out of 5
  const isInsufficient = observedValues.length < minRequired;

  const alerts: PredictiveAlert[] = [];

  if (isInsufficient) {
    const result = alerts as PredictivePatternResult;
    result.status = 'insufficient_data';
    result.observedCount = observedValues.length;
    result.totalRequired = totalRequired;
    result.missingMetrics = missingMetrics;
    return result;
  }

  // 1. Check Burnout Precursor
  const burnoutSim = partialCosineSimilarity(
    observedValues,
    observedIndices,
    BURNOUT_PRECURSOR,
    totalRequired
  );

  if (burnoutSim >= 0.70) {
    alerts.push({
      createdAt: Date.now(),
      patternName: 'Zihinsel Yorgunluk ve Tükenmişlik Öncüsü',
      riskLevel: burnoutSim >= 0.85 ? 'high' : 'elevated',
      similarityScore: burnoutSim,
      leadDays: 3,
      title: 'Önümüzdeki Günler İçin Enerji & Dinlenme Öngörüsü',
      explanation:
        'Son 4 gündür biriken gece ekran kullanımı ve yazım akıcılığındaki yavaşlama, geçmişte benzer dönemlerde enerjinin belirgin şekilde düştüğü öncü örüntüyle %' +
        Math.round(burnoutSim * 100) +
        ' oranında benzeşiyor.',
      recommendedAction:
        'Önümüzdeki 48 saat için takviminde esneklik yaratmayı ve bu gece 23:30 sonrası ekran kullanımını sınırlamayı planlamak ister misin?',
      actionPlanned: false,
      dismissed: false,
    });
  }

  // 2. Check Social Withdrawal Precursor
  const withdrawalSim = partialCosineSimilarity(
    observedValues,
    observedIndices,
    WITHDRAWAL_PRECURSOR,
    totalRequired
  );

  if (withdrawalSim >= 0.70) {
    alerts.push({
      createdAt: Date.now(),
      patternName: 'Sosyal İçe Çekilme ve Hareketsizlik Öncüsü',
      riskLevel: withdrawalSim >= 0.85 ? 'high' : 'elevated',
      similarityScore: withdrawalSim,
      leadDays: 2,
      title: 'Sosyal Bağlantı & Hareketlilik Hatırlatması',
      explanation:
        'Fiziksel hareketlilik endeksinde ve cihaz içi iletişim sıklığında gözlenen keskin düşüş, izole olma eğilimi gösteren davranışsal öncülerle %' +
        Math.round(withdrawalSim * 100) +
        ' eşleşiyor.',
      recommendedAction:
        'Bugün sevdiğin bir yakınını 5 dakikalığına sesli aramak veya açık havada kısa bir yürüyüş planlamak nasıl hissettirir?',
      actionPlanned: false,
      dismissed: false,
    });
  }

  const result = alerts as PredictivePatternResult;
  result.status = 'ok';
  result.observedCount = observedValues.length;
  result.totalRequired = totalRequired;
  result.missingMetrics = missingMetrics;
  return result;
}
