import { AnomalyResult, MoodReport } from '../types/engine';
import { useAppStore } from '../store/useAppStore';

export interface CrisisContact {
  name: string;
  phone: string;
  description: string;
}

export interface CrisisState {
  isCrisisTriggered: boolean;
  reason?: string;
  emergencyContacts: CrisisContact[];
}

export const CRISIS_EMERGENCY_CONTACTS: CrisisContact[] = [
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
    name: 'YEDAM — Yeşilay Danışmanlık Merkezi',
    phone: '115',
    description: 'Bağımlılık ve kompulsif davranışlar için ücretsiz psikolojik destek.',
  },
  {
    name: 'Kızılay / Sosyal Destek Hattı',
    phone: '168',
    description: 'Psikososyal destek ve danışmanlık hizmeti.',
  },
];

/**
 * Evaluates crisis state based on extreme deviations (Z >= 3.5) and severe mood drops (EMA score = 1).
 */
export function evaluateCrisisStatus(
  anomalies: AnomalyResult[],
  recentMoods: MoodReport[]
): CrisisState {
  const severeAnomalies = anomalies.filter(a => a.isAnomaly && Math.abs(a.zScore) >= 3.5);
  const veryLowRecentMoods = recentMoods.slice(0, 3).filter(m => m.score === 1);

  // Trigger crisis if multiple extreme deviations (>= 3) or consecutive very low mood reports (>= 2)
  const isExtremeDeviation = severeAnomalies.length >= 3;
  const isSevereMoodDip = veryLowRecentMoods.length >= 2;

  const isCrisisTriggered = isExtremeDeviation || isSevereMoodDip;

  return {
    isCrisisTriggered,
    reason: isCrisisTriggered
      ? 'Davranışsal göstergelerde ve ruh halinde yoğun bir zorlanma dönemi gözlemlenmektedir.'
      : undefined,
    emergencyContacts: CRISIS_EMERGENCY_CONTACTS,
  };
}

/**
 * Automated crisis check connected to daily aggregation and EMA flow.
 * When high-risk anomaly combinations occur, automatically activates emergency interface.
 */
export function checkAndTriggerCrisisIfNeeded(
  anomalies: AnomalyResult[],
  recentMoods: MoodReport[]
): CrisisState {
  const state = evaluateCrisisStatus(anomalies, recentMoods);
  if (state.isCrisisTriggered) {
    try {
      useAppStore.getState().setEmergencyModalOpen(true);
    } catch {
      // In isolated test environments
    }
  }
  return state;
}
