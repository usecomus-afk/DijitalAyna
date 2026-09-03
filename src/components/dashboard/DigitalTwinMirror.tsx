import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, Calendar, Zap, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { AnomalyResult } from '../../types/engine';
import { AVATAR_IMAGES } from '../../constants/avatars';

interface DigitalTwinMirrorProps {
  anomalies: AnomalyResult[];
  sampleDays: number;
}

export const DigitalTwinMirror: React.FC<DigitalTwinMirrorProps> = ({ anomalies, sampleDays }) => {
  const { userProfile, baselineDayCount, setEmergencyModalOpen } = useAppStore();

  const severeAnomalies = anomalies.filter((a) => a.isAnomaly);
  const isLearning = sampleDays < 7;

  // Determine current avatar based on anomalies & behavioral rhythm
  let avatarSrc = AVATAR_IMAGES.normal;
  let avatarAlt = 'Normal & Dengeli';
  let mirrorText = `${userProfile.name}, bugün cihaz kullanım ritmin ve tuş vuruş dinamiklerin genel baz hattınla dengeli bir uyum içinde akıyor.`;
  let moodPill = { text: 'Dengeli Ritim', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };

  if (isLearning) {
    avatarSrc = AVATAR_IMAGES.normal;
    avatarAlt = 'Öğrenme Dönemi';
    mirrorText = `Merhaba ${userProfile.name}! Dijital Ayna şu anda cihazındaki günlük yazım akıcılığı, hareketlilik ve ekran ritmi verilerinle kişisel baz hattını (normalini) öğreniyor.`;
    moodPill = { text: 'Öğrenme Dönemi', color: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40' };
  } else if (severeAnomalies.some((a) => a.metricKey === 'typing_wpm' && a.zScore <= -1.8)) {
    avatarSrc = AVATAR_IMAGES.zorlu;
    avatarAlt = 'Zihinsel Yorgunluk Sinyali';
    mirrorText = `${userProfile.name}, son birkaç gündür klavye yazım hızında yavaşlama ve düzeltme sıklığında artış fark ettik. Zihinsel bir yorgunluk hissediyor olabilir misin?`;
    moodPill = { text: 'Zihinsel Yorgunluk Sinyali', color: 'bg-rose-500/20 text-rose-200 border-rose-500/40' };
  } else if (severeAnomalies.some((a) => a.metricKey === 'mobility_index' && a.zScore <= -2.0)) {
    avatarSrc = AVATAR_IMAGES.dusuk;
    avatarAlt = 'Düşük Hareketlilik';
    mirrorText = `${userProfile.name}, fiziksel hareketlilik seviyen alışılmış temponun altında seyrediyor. Kendine küçük bir açık hava molası ayırmayı düşünebilirsin.`;
    moodPill = { text: 'Düşük Hareketlilik', color: 'bg-amber-500/20 text-amber-200 border-amber-500/40' };
  } else if (severeAnomalies.length === 0) {
    avatarSrc = AVATAR_IMAGES.iyi;
    avatarAlt = 'Canlı & Pozitif Ritim';
  }

  return (
    <div className="bg-gradient-to-br from-comus-navy to-comus-navy-dark text-white rounded-3xl p-5 sm:p-7 shadow-soft-lg relative overflow-hidden">
      {/* Subtle decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-comus-copper/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Top Tag & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-comus-copper-light" />
              <span>Dijital İkiz Aynası</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${moodPill.color}`}>
              {moodPill.text}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-white/80 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-comus-copper-light" />
            <span>
              {isLearning ? `Öğrenim Aşaması: ${baselineDayCount}/7 Gün` : `${sampleDays} Günlük Baz Hattı Aktif`}
            </span>
          </div>
        </div>

        {/* Learning Progress Bar */}
        {isLearning && (
          <div className="mb-4 bg-white/10 p-3 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-xs text-white/90 mb-1.5 font-medium">
              <span className="truncate mr-2">{userProfile.name} — Kişisel Baz Hattı Oluşturuluyor...</span>
              <span className="shrink-0 font-mono font-bold">%{Math.round((baselineDayCount / 7) * 100)}</span>
            </div>
            <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden">
              <div
                className="bg-comus-copper h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (baselineDayCount / 7) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Content: 3D Avatar & Mirror Statement */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 my-3">
          {/* Interactive 3D Avatar Card */}
          <button
            onClick={() => setEmergencyModalOpen(true)}
            className="group relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white/10 p-1.5 border border-white/20 hover:border-comus-copper/50 transition-all duration-300 hover:scale-105 shadow-soft text-left focus:outline-none"
            title="Mental İkiz Avatarını Genişlet"
          >
            <img
              src={avatarSrc}
              alt={avatarAlt}
              className="w-full h-full object-contain rounded-xl drop-shadow-md"
            />
            <span className="absolute bottom-1 right-1 p-1 rounded-lg bg-comus-navy/80 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight className="w-3.5 h-3.5 text-comus-copper-light" />
            </span>
          </button>

          {/* Mirror Statement Quote */}
          <div className="flex-1 text-center sm:text-left">
            <blockquote className="font-serif text-base sm:text-lg font-normal leading-relaxed text-white/95 italic">
              "{mirrorText}"
            </blockquote>
            <button
              onClick={() => setEmergencyModalOpen(true)}
              className="mt-2 text-xs text-comus-copper-light hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Dijital Mental İkiz Analizini Gör</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* User Context Footer */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Kullanıcı: <strong className="text-white font-medium">{userProfile.name}</strong></span>
          </div>
          <div className="flex items-center gap-1 text-comus-copper-light shrink-0 font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>{severeAnomalies.length > 0 ? `${severeAnomalies.length} Metrikte Sapma` : 'Tüm Sensörler Dengede'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
