import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useMentalTwinAvatar } from '../../hooks/useMentalTwinAvatar';
import { getSynthesisCopy } from '../../engine/dailyState';
import {
    Sparkles,
  Keyboard,
  Moon,
  Zap,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export const MentalTwinPanel: React.FC = () => {
  const { userProfile } = useAppStore();
  const {
    avatarSrc,
    affectiveIndex,
    hasIndex,
    phenoLabel,
    clinicalInsight,
    sensorStatus,
    modalTitle,
    modalSubtitle,
    badgeClass,
    auraGradient,
    glowColor,
    bgBase,
    dialogue,
    energyText,
  } = useMentalTwinAvatar();

  

  return (
    <div className="animate-fadeIn">
      <div className="bg-white rounded-3xl w-full p-5 sm:p-7 shadow-soft-lg border-2 border-comus-copper/30 relative overflow-hidden mt-6">
        {/* Ambient Mood Glow Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${auraGradient} opacity-60 pointer-events-none transition-all duration-700`}
        />

        {/* Close Button */}
        

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

          <span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${badgeClass}`}>
            {modalTitle}
          </span>
        </div>

        {/* Avatar Display Arena (Custom 3D Avatar Image) */}
        <div className={`relative z-10 rounded-3xl p-6 border border-white/60 shadow-inner flex flex-col items-center justify-center text-center ${bgBase} backdrop-blur-sm transition-all duration-500`}>
          {/* 3D Rendered Avatar Card */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-3 flex items-center justify-center">
            {/* Glowing Aura Ring */}
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-60 transition-all duration-700 animate-pulse"
              style={{ backgroundColor: glowColor }}
            />

            {/* Custom 3D Avatar Image */}
            <img
              src={avatarSrc}
              alt={modalTitle}
              className="w-full h-full object-contain rounded-3xl relative z-10 drop-shadow-xl transition-transform duration-500 hover:scale-105"
            />
          </div>

          {/* Subtitle & Affective Balance Gauge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-comus-navy">{modalSubtitle}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/80 border border-comus-sand-light/30 text-comus-sand-dark font-bold">
              {energyText}
            </span>
          </div>

          {/* Twin Speech Bubble */}
          <div className="relative bg-white/95 rounded-2xl p-3.5 sm:p-4 border border-comus-sand-light/30 shadow-soft text-left mt-1 w-full max-w-lg">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-t border-l border-comus-sand-light/30" />
            <p className="text-xs sm:text-sm text-comus-navy leading-relaxed italic font-serif">
              "{dialogue}"
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
            {hasIndex ? getSynthesisCopy(affectiveIndex).text : clinicalInsight}
          </p>

          <div className="pt-2 border-t border-comus-sand-light/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-comus-sand-dark flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>15 mikro-biyobelirteç baz hattı ile otomatik analiz edildi.</span>
            </span>
            <span className="font-semibold text-comus-navy bg-white px-2 py-0.5 rounded-full border border-comus-sand-light/30">
              {hasIndex ? getSynthesisCopy(affectiveIndex).badge : phenoLabel}
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
        <div className="relative z-10 mt-4 pt-3 border-t border-comus-sand-light/20 flex items-center justify-end text-xs text-comus-sand-dark">
          <button
            onClick={() => null}
            className="px-4 py-2 rounded-xl bg-comus-navy text-white font-medium hover:bg-comus-navy-light transition-colors shrink-0 shadow-soft"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
