import { AnomalyResult, PredictiveAlert } from '../types/engine';

/**
 * Computes Cosine Similarity between two numeric vectors
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

// Prototypical precursor vectors for 5 core dimensions:
// [typing_wpm_z, typing_backspace_z, night_usage_z, mobility_z, touch_freq_z]
const BURNOUT_PRECURSOR = [-2.0, 2.5, 2.8, -0.8, 0.6];
const WITHDRAWAL_PRECURSOR = [-0.5, 0.3, 0.6, -2.6, -2.4];

/**
 * Match current behavioral vector against known precursor patterns
 */
export function evaluatePredictivePatterns(anomalies: AnomalyResult[]): PredictiveAlert[] {
  const anomalyMap = new Map(anomalies.map(a => [a.metricKey, a]));

  const currentVector = [
    anomalyMap.get('typing_wpm')?.zScore || 0,
    anomalyMap.get('typing_backspace_rate')?.zScore || 0,
    anomalyMap.get('night_usage_minutes')?.zScore || 0,
    anomalyMap.get('mobility_index')?.zScore || 0,
    anomalyMap.get('touch_interaction_frequency')?.zScore || 0,
  ];

  const alerts: PredictiveAlert[] = [];

  // 1. Check Burnout Precursor
  const burnoutSim = cosineSimilarity(currentVector, BURNOUT_PRECURSOR);
  if (burnoutSim >= 0.70) {
    alerts.push({
      createdAt: Date.now(),
      patternName: 'Zihinsel Yorgunluk ve Tükenmişlik Öncüsü',
      riskLevel: burnoutSim >= 0.85 ? 'high' : 'elevated',
      similarityScore: burnoutSim,
      leadDays: 3,
      title: 'Önümüzdeki Günler İçin Enerji & Dinlenme Öngörüsü',
      explanation: 'Son 4 gündür biriken gece ekran kullanımı ve yazım akıcılığındaki yavaşlama, geçmişte benzer dönemlerde enerjinin belirgin şekilde düştüğü öncü örüntüyle %' + Math.round(burnoutSim * 100) + ' oranında benzeşiyor.',
      recommendedAction: 'Önümüzdeki 48 saat için takviminde esneklik yaratmayı ve bu gece 23:30 sonrası ekran kullanımını sınırlamayı planlamak ister misin?',
      actionPlanned: false,
      dismissed: false,
    });
  }

  // 2. Check Social Withdrawal Precursor
  const withdrawalSim = cosineSimilarity(currentVector, WITHDRAWAL_PRECURSOR);
  if (withdrawalSim >= 0.70) {
    alerts.push({
      createdAt: Date.now(),
      patternName: 'Sosyal İçe Çekilme ve Hareketsizlik Öncüsü',
      riskLevel: withdrawalSim >= 0.85 ? 'high' : 'elevated',
      similarityScore: withdrawalSim,
      leadDays: 2,
      title: 'Sosyal Bağlantı & Hareketlilik Hatırlatması',
      explanation: 'Fiziksel hareketlilik endeksinde ve cihaz içi iletişim sıklığında gözlenen keskin düşüş, izole olma eğilimi gösteren davranışsal öncülerle %' + Math.round(withdrawalSim * 100) + ' eşleşiyor.',
      recommendedAction: 'Bugün sevdiğin bir yakınını 5 dakikalığına sesli aramak veya açık havada kısa bir yürüyüş planlamak nasıl hissettirir?',
      actionPlanned: false,
      dismissed: false,
    });
  }

  return alerts;
}
