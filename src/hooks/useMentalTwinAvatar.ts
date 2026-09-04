import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ClinicalPhenotypeClassifier } from '../classifier/ClinicalPhenotypeClassifier';
import { RollingBaselineEngine } from '../normalization/RollingBaselineEngine';
import { getAvatarByScore } from '../constants/avatars';
import { useAppStore } from '../store/useAppStore';

export interface MentalTwinAvatarState {
  score: 1 | 2 | 3 | 4 | 5;
  avatarSrc: string;
  avatarAlt: string;
  stateLabel: string;
  affectiveIndex: number;
  phenoState: string;
  phenoLabel: string;
  clinicalInsight: string;
  colorClass: string;
  mirrorText: string;
  moodPill: { text: string; color: string };
  sensorStatus: {
    typing: number;
    night: number;
    mobility: number;
    tremor: number;
  };
}

export function useMentalTwinAvatar(): MentalTwinAvatarState {
  const { userProfile, baselineDayCount } = useAppStore();

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const latestMood = useLiveQuery(() => db.moodReports.orderBy('timestamp').reverse().first());

  return useMemo(() => {
    const isLearning = baselineDayCount < 7;
    const latestDate = dailyMetrics.reduce((max, m) => (m.date > max ? m.date : max), '');
    const todays = dailyMetrics.filter((m) => m.date === latestDate);

    const baselineMap = new Map(baselines.map((b) => [b.metricKey, b]));
    const zScores: Record<string, number> = {};

    for (const metric of todays) {
      const base = baselineMap.get(metric.metricKey);
      if (base && base.ewmaStd > 0) {
        zScores[metric.metricKey] = RollingBaselineEngine.calculateZScore(
          metric.value,
          base.ewmaMean,
          base.ewmaStd
        );
      }
    }

    const phenoInference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores, latestDate);
    const balanceIndex = ClinicalPhenotypeClassifier.calculateAffectiveStateIndex(zScores);

    // Derive score (1 to 5)
    let derivedScore: 1 | 2 | 3 | 4 | 5 = 3;

    if (todays.length > 0) {
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
    } else if (latestMood && latestMood.score >= 1 && latestMood.score <= 5) {
      derivedScore = latestMood.score as 1 | 2 | 3 | 4 | 5;
    }

    const avatarSrc = getAvatarByScore(derivedScore);

    // Telemetry summary values
    const typing = todays.find((m) => m.metricKey === 'typing_wpm')?.value || 42;
    const night = todays.find((m) => m.metricKey === 'night_usage_minutes')?.value || 0;
    const mobility = todays.find((m) => m.metricKey === 'mobility_index')?.value || 70;
    const tremor = todays.find((m) => m.metricKey === 'tremor_variance')?.value || 0.15;

    let avatarAlt = 'Normal & Dengeli';
    let stateLabel = 'Dengeli & Stabil';
    let mirrorText = `${userProfile.name}, bugün cihaz kullanım ritmin ve tuş vuruş dinamiklerin genel baz hattınla dengeli bir uyum içinde akıyor.`;
    let moodPill = { text: 'Dengeli Ritim', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    let colorClass = 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]';

    if (isLearning && todays.length === 0) {
      avatarAlt = 'Öğrenme Dönemi';
      stateLabel = 'Öğrenme Aşaması';
      mirrorText = `Merhaba ${userProfile.name}! Duty-Comus şu anda cihazındaki günlük yazım akıcılığı, hareketlilik ve ekran ritmi verilerinle kişisel baz hattını (normalini) öğreniyor.`;
      moodPill = { text: 'Öğrenme Dönemi', color: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40' };
      colorClass = 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]';
    } else if (derivedScore === 1) {
      avatarAlt = 'Zorlayıcı & Yorgun';
      stateLabel = 'Zorlu Durum • Stres Sinyali';
      mirrorText = `${userProfile.name}, son günlerde bilişsel tepki süresi ve sirkadiyen dinlenme ritminde belirgin dalgalanmalar saptandı. Zihinsel bir yorgunluk hissediyor olabilir misin?`;
      moodPill = { text: 'Zihinsel Yorgunluk Sinyali', color: 'bg-rose-500/20 text-rose-200 border-rose-500/40' };
      colorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]';
    } else if (derivedScore === 2) {
      avatarAlt = 'Düşük & Dalgalı Ritim';
      stateLabel = 'Düşük Ritim • Hafif Sapma';
      mirrorText = `${userProfile.name}, hareketlilik ve etkileşim frekansın olağan baz hattının altında seyrediyor. Kendine küçük bir mola ayırmayı düşünebilirsin.`;
      moodPill = { text: 'Düşük Hareketlilik', color: 'bg-amber-500/20 text-amber-200 border-amber-500/40' };
      colorClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]';
    } else if (derivedScore === 3) {
      avatarAlt = 'Normal & Dengeli';
      stateLabel = 'Dengeli & Stabil';
      mirrorText = `${userProfile.name}, cihaz içi biyobelirteçlerin referans aralığında. Dijital ikizin stabil durumda.`;
      moodPill = { text: 'Dengeli Ritim', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      colorClass = 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]';
    } else if (derivedScore === 4) {
      avatarAlt = 'İyi & Canlı';
      stateLabel = 'Pozitif & Akıcı Ritim';
      mirrorText = `${userProfile.name}, tuş akıcılığın ve sirkadiyen düzenin güçlü bir denge gösteriyor.`;
      moodPill = { text: 'Canlı & Pozitif', color: 'bg-teal-500/20 text-teal-200 border-teal-500/40' };
      colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]';
    } else {
      avatarAlt = 'Harika & Yüksek Enerji';
      stateLabel = 'Yüksek Odak & Canlılık';
      mirrorText = `${userProfile.name}, tüm biyobelirteçler en yüksek dengede. Zihinsel akış ve etkileşim hızın mükemmel.`;
      moodPill = { text: 'Yüksek Enerji', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]';
    }

    return {
      score: derivedScore,
      avatarSrc,
      avatarAlt,
      stateLabel,
      affectiveIndex: balanceIndex,
      phenoState: phenoInference.state,
      phenoLabel: phenoInference.label,
      clinicalInsight: phenoInference.clinicalInsight,
      colorClass,
      mirrorText,
      moodPill,
      sensorStatus: {
        typing,
        night,
        mobility,
        tremor,
      },
    };
  }, [dailyMetrics, baselines, latestMood, baselineDayCount, userProfile.name]);
}
