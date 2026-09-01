import { AnomalyResult, MoodReport } from '../types/engine';

export interface CrisisState {
  isCrisisTriggered: boolean;
  reason?: string;
  emergencyContacts: {
    name: string;
    phone: string;
    description: string;
  }[];
}

export function evaluateCrisisStatus(
  anomalies: AnomalyResult[],
  recentMoods: MoodReport[]
): CrisisState {
  const severeAnomalies = anomalies.filter(a => a.isAnomaly && Math.abs(a.zScore) >= 3.5);
  const veryLowRecentMoods = recentMoods.slice(0, 3).filter(m => m.score === 1);

  // Trigger crisis banner if multiple extreme deviations (>= 3) or consecutive very low mood reports
  const isExtremeDeviation = severeAnomalies.length >= 3;
  const isSevereMoodDip = veryLowRecentMoods.length >= 2;

  const isCrisisTriggered = isExtremeDeviation || isSevereMoodDip;

  return {
    isCrisisTriggered,
    reason: isCrisisTriggered
      ? 'Davranışsal göstergelerde ve ruh halinde yoğun bir zorlanma dönemi gözlemlenmektedir.'
      : undefined,
    emergencyContacts: [
      {
        name: '112 Acil Çağrı Merkezi',
        phone: '112',
        description: 'Hayati tehlike veya acil destek durumlarında 7/24 ücretsiz ulaşılabilir.',
      },
      {
        name: 'Alo 182 — Merkezi Hekim Randevu Sistemi',
        phone: '182',
        description: 'Ruh sağlığı uzmanı veya psikiyatrik destek randevusu almak için.',
      },
      {
        name: 'Kızılay / Sosyal Destek Hattı',
        phone: '168',
        description: 'Psikososyal destek ve danışmanlık hizmeti.',
      }
    ]
  };
}
