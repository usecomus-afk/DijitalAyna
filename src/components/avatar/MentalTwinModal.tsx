import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { ClinicalPhenotypeClassifier } from '../../classifier/ClinicalPhenotypeClassifier';
import { RollingBaselineEngine } from '../../normalization/RollingBaselineEngine';
import { AVATAR_IMAGES } from '../../constants/avatars';
import {
  X,
  Sparkles,
  Keyboard,
  Moon,
  Zap,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export const MentalTwinModal: React.FC = () => {
  const { emergencyModalOpen, setEmergencyModalOpen, userProfile } = useAppStore();

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];

  // Compute real-time emotional state & phenotype inference exclusively from passive sensors
  const {
    effectiveMoodScore,
    affectiveIndex,
    inference,
    sensorStatus,
  } = useMemo(() => {
    // 1. Find latest available date
    const latestDate = dailyMetrics.reduce((max, m) => (m.date > max ? m.date : max), '');
    const todays = dailyMetrics.filter((m) => m.date === latestDate);

    // 2. Build baseline lookup
    const baselineMap = new Map(baselines.map((b) => [b.metricKey, b]));

    // 3. Compute Z-Scores for all 15 indicators
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

    // 4. Clinical phenotype classification & Affective Balance Index (0-100)
    const phenoInference = ClinicalPhenotypeClassifier.classifyPhenotype(zScores, latestDate);
    const balanceIndex = ClinicalPhenotypeClassifier.calculateAffectiveStateIndex(zScores);

    // 5. Derive avatar state (1 to 5) strictly from telemetry & phenotype
    let derivedScore = 3; // Default neutral

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

    // Telemetry summary values
    const typing = todays.find((m) => m.metricKey === 'typing_wpm')?.value || 42;
    const night = todays.find((m) => m.metricKey === 'night_usage_minutes')?.value || 0;
    const mobility = todays.find((m) => m.metricKey === 'mobility_index')?.value || 70;
    const tremor = todays.find((m) => m.metricKey === 'tremor_variance')?.value || 0.15;

    return {
      effectiveMoodScore: derivedScore,
      affectiveIndex: balanceIndex,
      inference: phenoInference,
      sensorStatus: {
        typing,
        night,
        mobility,
        tremor,
      },
    };
  }, [dailyMetrics, baselines]);

  if (!emergencyModalOpen) return null;

  // Avatar state configuration according to emotional balance score
  // 1: Zorlu (44.png)
  // 2: Düşük (45.png)
  // 3: Normal (46.png)
  // 4: İyi (47.png)
  // 5: Harika (48.png)
  const getAvatarConfig = (score: number) => {
    switch (score) {
      case 1:
        return {
          title: 'Zorlayıcı & Yorgun',
          subtitle: 'Zorlu Durum • Zihinsel Yük & Stres Sinyali',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
          auraGradient: 'from-rose-500/25 via-purple-600/20 to-slate-900/30',
          glowColor: '#f43f5e',
          bgBase: 'bg-gradient-to-b from-rose-950/20 to-purple-950/30',
          avatarSrc: AVATAR_IMAGES.zorlu,
          dialogue: `${userProfile.name}, zihnim bugün oldukça ağır ve yorgun. Sensör ve hareketlilik sinyallerin yoğun bir zihinsel yük altında olduğunu gösteriyor. Kendini zorlama; bir fincan su alıp derin bir nefesle duraklamaya ne dersin?`,
          energyText: `%${affectiveIndex} Duygusal Denge`,
        };
      case 2:
        return {
          title: 'Düşük & Melankolik',
          subtitle: 'Düşük Durum • Düşük Motivasyon',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
          auraGradient: 'from-amber-500/20 via-orange-600/15 to-slate-800/30',
          glowColor: '#f59e0b',
          bgBase: 'bg-gradient-to-b from-amber-950/20 to-slate-900/30',
          avatarSrc: AVATAR_IMAGES.dusuk,
          dialogue: `Bugün tempomuz biraz düşük ${userProfile.name}. Klavyedeki yazım akışın ve hareketliliğin içe çekildiğimizi hissettiriyor. Her gün yüzde yüz performansla koşmak zorunda değiliz; bugün dinlenme günü olsun.`,
          energyText: `%${affectiveIndex} Duygusal Denge`,
        };
      case 3:
        return {
          title: 'Normal & Dengeli',
          subtitle: 'Normal Durum • Ritim Stabil',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          auraGradient: 'from-cyan-500/20 via-indigo-500/15 to-blue-900/20',
          glowColor: '#6366f1',
          bgBase: 'bg-gradient-to-b from-indigo-950/20 to-slate-900/30',
          avatarSrc: AVATAR_IMAGES.normal,
          dialogue: `Şu an dingin ve dengeli bir akıştayız ${userProfile.name}. Sensör dinamiklerin standart kişisel baz hattınla uyumlu. Rutinine sakin adımlarla devam edebilirsin.`,
          energyText: `%${affectiveIndex} Duygusal Denge`,
        };
      case 4:
        return {
          title: 'İyi & Canlı',
          subtitle: 'İyi Durum • Akıcı Ritim',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          auraGradient: 'from-emerald-500/25 via-teal-500/20 to-cyan-900/20',
          glowColor: '#10b981',
          bgBase: 'bg-gradient-to-b from-emerald-950/20 to-slate-900/30',
          avatarSrc: AVATAR_IMAGES.iyi,
          dialogue: `Yüzüm gülüyor ${userProfile.name}! Yazım tempon akıcı, günlük hareketliliğin canlı. Zihinsel enerjimizin bu pozitif dalgasını güzel hedeflere dönüştürebilirsin.`,
          energyText: `%${affectiveIndex} Duygusal Denge`,
        };
      case 5:
      default:
        return {
          title: 'Harika & Işıltılı',
          subtitle: 'Harika Durum • Zirve Enerji',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-400',
          auraGradient: 'from-amber-400/30 via-comus-copper/25 to-rose-500/20',
          glowColor: '#f59e0b',
          bgBase: 'bg-gradient-to-b from-amber-950/25 to-comus-navy/40',
          avatarSrc: AVATAR_IMAGES.harika,
          dialogue: `Işıl ışıl bir zihin durumundayız ${userProfile.name}! Zihinsel berraklığımız ve motivasyonumuz zirvede. Bu neşeli ve ilham verici enerjinin tadını çıkar!`,
          energyText: `%${affectiveIndex} Duygusal Denge`,
        };
    }
  };

  const avatar = getAvatarConfig(effectiveMoodScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-comus-navy/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-soft-lg border-2 border-comus-copper/30 relative my-auto overflow-hidden">
        {/* Ambient Mood Glow Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${avatar.auraGradient} opacity-60 pointer-events-none transition-all duration-700`}
        />

        {/* Close Button */}
        <button
          onClick={() => setEmergencyModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-comus-sand-dark hover:text-comus-navy rounded-full bg-white/80 backdrop-blur-sm border border-comus-sand-light/40 hover:bg-white shadow-soft transition-all z-20"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-comus-copper block">
                Kişisel Zihin Yansıması
              </span>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-comus-navy leading-tight">
                {userProfile.name}’in Dijital Mental İkizi
              </h3>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${avatar.badgeClass}`}>
            {avatar.title}
          </span>
        </div>

        {/* Avatar Display Arena (Custom 3D Avatar Image) */}
        <div className={`relative z-10 rounded-3xl p-6 border border-white/60 shadow-inner flex flex-col items-center justify-center text-center ${avatar.bgBase} backdrop-blur-sm transition-all duration-500`}>
          {/* 3D Rendered Avatar Card */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-3 flex items-center justify-center">
            {/* Glowing Aura Ring */}
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-60 transition-all duration-700 animate-pulse"
              style={{ backgroundColor: avatar.glowColor }}
            />

            {/* Custom 3D Avatar Image */}
            <img
              src={avatar.avatarSrc}
              alt={avatar.title}
              className="w-full h-full object-contain rounded-3xl relative z-10 drop-shadow-xl transition-transform duration-500 hover:scale-105"
            />
          </div>

          {/* Subtitle & Affective Balance Gauge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-comus-navy">{avatar.subtitle}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/80 border border-comus-sand-light/30 text-comus-sand-dark font-bold">
              {avatar.energyText}
            </span>
          </div>

          {/* Twin Speech Bubble */}
          <div className="relative bg-white/95 rounded-2xl p-3.5 sm:p-4 border border-comus-sand-light/30 shadow-soft text-left mt-1 w-full max-w-lg">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-t border-l border-comus-sand-light/30" />
            <p className="text-xs sm:text-sm text-comus-navy leading-relaxed italic font-serif">
              "{avatar.dialogue}"
            </p>
          </div>
        </div>

        {/* Real-time Automated Phenotype & Biometric Synthesis Card */}
        <div className="relative z-10 mt-4 p-4 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-comus-navy">
              <Cpu className="w-4 h-4 text-comus-copper shrink-0" />
              <span>Biyobelirteç & Sensör Sentezi (Duygusal Denge İndeksi)</span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-white border border-comus-sand-light/40 text-comus-navy">
              İndeks: {affectiveIndex}/100
            </span>
          </div>

          <p className="text-[11px] text-comus-sand-dark leading-relaxed">
            {inference.clinicalInsight}
          </p>

          <div className="pt-2 border-t border-comus-sand-light/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-comus-sand-dark flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>15 mikro-biyobelirteç baz hattı ile otomatik analiz edildi.</span>
            </span>
            <span className="font-semibold text-comus-navy bg-white px-2 py-0.5 rounded-full border border-comus-sand-light/30">
              {inference.label}
            </span>
          </div>
        </div>

        {/* Real-Time Sensor Telemetry Summary */}
        <div className="relative z-10 mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
            <div className="text-[10px] text-comus-sand-dark flex items-center justify-center gap-1 mb-0.5">
              <Keyboard className="w-3 h-3 text-comus-copper" />
              <span>Yazım Akışı</span>
            </div>
            <div className="font-semibold text-comus-navy font-mono text-xs">
              {sensorStatus.typing} WPM
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
            <div className="text-[10px] text-comus-sand-dark flex items-center justify-center gap-1 mb-0.5">
              <Zap className="w-3 h-3 text-comus-copper" />
              <span>Hareketlilik</span>
            </div>
            <div className="font-semibold text-comus-navy font-mono text-xs">
              {sensorStatus.mobility} Puan
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
            <div className="text-[10px] text-comus-sand-dark flex items-center justify-center gap-1 mb-0.5">
              <Moon className="w-3 h-3 text-comus-copper" />
              <span>Gece Uykusu</span>
            </div>
            <div className="font-semibold text-comus-navy font-mono text-xs">
              {sensorStatus.night} dk ekran
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="relative z-10 mt-4 pt-3 border-t border-comus-sand-light/20 flex items-center justify-between text-xs text-comus-sand-dark">
          <span className="text-[11px] truncate mr-2">
            Dijital Mental İkiz, cihaz içi sensörler ve biyobelirteçlerinizle anlık senkronizedir.
          </span>
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-comus-navy text-white font-medium hover:bg-comus-navy-light transition-colors shrink-0 shadow-soft"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
