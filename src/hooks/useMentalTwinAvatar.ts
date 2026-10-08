import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ClinicalPhenotypeClassifier } from '../classifier/ClinicalPhenotypeClassifier';
import { BaselineEngine, MIN_BASELINE_DAYS } from '../engine/BaselineEngine';
import { getAvatarByScore } from '../constants/avatars';
import { useAppStore } from '../store/useAppStore';
import {
  calculateRecentMoodScore,
  calculateEmotionalBalanceIndex,
  deriveAvatarScore,
  generateAvatarNarrative,
} from '../engine/avatarNarrative';
import { resolveDailyState, DailyState } from '../engine/dailyState';

export interface MentalTwinAvatarState {
  score: 1 | 2 | 3 | 4 | 5;
  avatarSrc: string;
  avatarAlt: string;
  stateLabel: string;
  affectiveIndex: number;
  /** False when no index could be computed (index above is a neutral placeholder). */
  hasIndex: boolean;
  dailyState: DailyState;
  phenoState: string;
  phenoLabel: string;
  clinicalInsight: string;
  colorClass: string;
  mirrorText: string;
  moodPill: { text: string; color: string };
  sensorStatus: {
    typing: number | null;
    night: number | null;
    mobility: number | null;
    tremor: number | null;
  };
  modalTitle: string;
  modalSubtitle: string;
  badgeClass: string;
  auraGradient: string;
  glowColor: string;
  bgBase: string;
  dialogue: string;
  energyText: string;
  learningCardText: string;
  recentMoodScore: number | null;
  topTags: string[];
}

export function useMentalTwinAvatar(): MentalTwinAvatarState {
  const { userProfile, baselineDayCount } = useAppStore();

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const moodReports = useLiveQuery(() => db.moodReports.orderBy('timestamp').reverse().toArray()) || [];

  return useMemo(() => {
    // 1. Process active EMA mood reports (last 7 days, 48h weighted 2x)
    const { score: recentMoodScore, topTags } = calculateRecentMoodScore(moodReports);

    // 2. Determine effective days of baseline data
    const distinctDates = new Set(dailyMetrics.map((m) => m.date));
    const effectiveDays = Math.max(baselineDayCount, distinctDates.size, 1);

    // Baseline is established only when at least one core metric has >= 14 days or effectiveDays >= 14
    const isEstablished = baselines.some((b) => b.isEstablished) || effectiveDays >= MIN_BASELINE_DAYS;

    const latestDate = dailyMetrics.reduce((max, m) => (m.date > max ? m.date : max), '');
    const todays = dailyMetrics.filter((m) => m.date === latestDate);

    const baselineMap = new Map(baselines.map((b) => [b.metricKey, b]));
    const zScores: Record<string, number> = {};

    for (const metric of todays) {
      const base = baselineMap.get(metric.metricKey);
      if (base && base.ewmaStd > 0) {
        zScores[metric.metricKey] = BaselineEngine.calculateZScore(
          metric.value,
          base.ewmaMean,
          base.ewmaStd
        );
      }
    }

    const phenoInference = isEstablished
      ? ClinicalPhenotypeClassifier.classifyPhenotype(zScores, latestDate)
      : {
          state: 'learning_baseline' as any,
          label: 'Öğrenme Aşaması',
          confidence: 'medium' as const,
          compositeScore: 0,
          clinicalInsight: 'Kişisel baz hattınız oluşturuluyor; 14 günlük stabil veri toplandıktan sonra klinik farkındalık içgörüleri aktifleşecektir.',
          contributingZScores: {},
          detectedAt: latestDate,
        };

    const rawPassiveScore = isEstablished
      ? ClinicalPhenotypeClassifier.calculateAffectiveStateIndex(zScores)
      : null;

    // 3. Hybrid Emotional Balance Index
    const balanceIndex = calculateEmotionalBalanceIndex({
      recentMoodScore,
      passiveScore: rawPassiveScore,
      isEstablished,
    });

    // Telemetry summary values (zero mock data)
    const typing = todays.find((m) => m.metricKey === 'typing_wpm')?.value ?? null;
    const night = todays.find((m) => m.metricKey === 'night_usage_minutes')?.value ?? null;
    const mobility = todays.find((m) => m.metricKey === 'mobility_index')?.value ?? null;
    const tremor = todays.find((m) => m.metricKey === 'tremor_variance')?.value ?? null;

    // 4. Derive discrete avatar score (1..5)
    let derivedScore: 1 | 2 | 3 | 4 | 5 = 3;

    if (!isEstablished) {
      if (recentMoodScore !== null) {
        // If user submitted journal but baseline is not established, react to journal strictly!
        derivedScore = deriveAvatarScore(balanceIndex ?? 70, recentMoodScore, false);
      } else {
        derivedScore = 3; // Keep neutral avatar for "Veri Toplanıyor" phase if no journal exists
      }
    } else {
      // BASELINE ESTABLISHED (>= 14 days)
      if (balanceIndex === null) {
        derivedScore = 3;
      } else if (todays.length > 0) {
        if (phenoInference.state === 'depressive_phenotype' || balanceIndex <= 35) {
          derivedScore = 1; // Zorlu
        } else if (
          phenoInference.state === 'anxious_agitated_phenotype' ||
          phenoInference.state === 'cognitive_fatigue_phenotype' ||
          phenoInference.state === 'cognitive_decline_risk_phenotype' ||
          phenoInference.state === 'ptsd_hypervigilance_phenotype' ||
          phenoInference.state === 'adhd_neurodivergent_phenotype' ||
          phenoInference.state === 'low_self_esteem_phenotype' ||
          balanceIndex <= 50
        ) {
          derivedScore = 2; // Düşük
        } else if (balanceIndex <= 74) {
          derivedScore = 3; // Normal
        } else if (balanceIndex <= 87) {
          derivedScore = 4; // İyi
        } else {
          derivedScore = 5; // Harika
        }
      } else {
        derivedScore = deriveAvatarScore(balanceIndex ?? 75, recentMoodScore, true);
      }
    }

    // 5. Generate clinical and safe avatar narrative
    const narrative = generateAvatarNarrative({
      userName: userProfile.name,
      score: derivedScore,
      affectiveIndex: balanceIndex,
      isEstablished,
      effectiveDays,
      topTags,
      recentMoodScore,
    });

    const finalClinicalInsight = !isEstablished
      ? narrative.learningCardText
      : phenoInference.clinicalInsight;

    const avatarSrc = getAvatarByScore(derivedScore, userProfile.gender);

    return {
      score: derivedScore,
      avatarSrc,
      avatarAlt: narrative.title,
      stateLabel: narrative.subtitle,
      affectiveIndex: balanceIndex ?? 75,
      hasIndex: balanceIndex !== null,
      dailyState: resolveDailyState({ balanceIndex, recentMoodScore }),
      phenoState: phenoInference.state,
      phenoLabel: phenoInference.label,
      clinicalInsight: finalClinicalInsight,
      colorClass: narrative.colorClass,
      mirrorText: narrative.mirrorText,
      moodPill: narrative.moodPill,
      sensorStatus: {
        typing,
        night,
        mobility,
        tremor,
      },
      modalTitle: narrative.title,
      modalSubtitle: narrative.subtitle,
      badgeClass: narrative.badgeClass,
      auraGradient: narrative.auraGradient,
      glowColor: narrative.glowColor,
      bgBase: narrative.bgBase,
      dialogue: narrative.dialogue,
      energyText: narrative.energyText,
      learningCardText: narrative.learningCardText,
      recentMoodScore,
      topTags,
    };
  }, [dailyMetrics, baselines, moodReports, baselineDayCount, userProfile.name, userProfile.gender]);
}
