import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, Calendar, Zap, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { AnomalyResult } from '../../types/engine';
import { useMentalTwinAvatar } from '../../hooks/useMentalTwinAvatar';
import mirrorIcon from '../../assets/digital_twin_mirror.png';

interface DigitalTwinMirrorProps {
  anomalies: AnomalyResult[];
  sampleDays: number;
}

export const DigitalTwinMirror: React.FC<DigitalTwinMirrorProps> = ({ anomalies, sampleDays }) => {
  const { userProfile, baselineDayCount, setEmergencyModalOpen } = useAppStore();
  const { mirrorText, moodPill } = useMentalTwinAvatar();

  const severeAnomalies = anomalies.filter((a) => a.isAnomaly);
  const effectiveDayCount = Math.max(baselineDayCount, sampleDays);
  const isLearning = effectiveDayCount < 14;

  return (
    <div className="bg-[#FAF9F6] text-comus-navy rounded-3xl p-5 sm:p-7 shadow-soft-lg relative overflow-hidden border border-gray-100">
      {/* Subtle decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-comus-copper/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/60 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Top Tag & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-comus-navy/5 text-comus-navy text-xs font-medium backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-comus-copper" />
              <span>Dijital İkiz Aynası</span>
            </span>
            {moodPill?.text && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs ${moodPill.color}`}>
                {moodPill.text}
              </span>
            )}
          </div>

          {!isLearning && (
            <div className="flex items-center gap-1.5 text-xs text-comus-navy/70 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-comus-copper" />
              <span>{effectiveDayCount} Günlük Baz Hattı Aktif</span>
            </div>
          )}
        </div>

        {/* Learning Progress Bar (Strict 14 Days) */}
        {isLearning && (
          <div className="mb-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs text-comus-navy mb-1.5 font-medium">
              <span className="truncate mr-2">{userProfile.name || 'Kişisel Profil'} — Kişisel Baz Hattı Oluşturuluyor...</span>
              <span className="shrink-0 font-mono font-bold text-comus-navy">%{Math.min(100, Math.round((Math.max(1, effectiveDayCount) / 14) * 100))}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-comus-copper h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (Math.max(1, effectiveDayCount) / 14) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Content: Image & Mirror Statement */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 my-3">
          {/* Static Image Replacement */}
          <div className="shrink-0 w-full max-w-[180px] flex items-center justify-center p-2">
            <img
              src={mirrorIcon}
              alt="Mental İkiz Aynası"
              className="w-full h-auto object-contain"
            />
          </div>

          {/* Mirror Statement Quote */}
          <div className="flex-1 text-center sm:text-left">
            <blockquote className="font-serif text-base sm:text-lg font-normal leading-relaxed text-comus-navy italic">
              "{mirrorText}"
            </blockquote>
            <button
              onClick={() => setEmergencyModalOpen(true)}
              className="mt-2 text-xs text-comus-copper hover:text-comus-navy font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Dijital Mental İkiz Analizini Gör</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* User Context Footer */}
        <div className="mt-4 pt-4 border-t border-comus-navy/10 flex flex-wrap items-center justify-between gap-2 text-xs text-comus-navy/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">Kullanıcı: <strong className="text-comus-navy font-medium">{userProfile.name || 'Profilim'}</strong></span>
          </div>
          <div className="flex items-center gap-1 text-comus-copper shrink-0 font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>{severeAnomalies.length > 0 ? `${severeAnomalies.length} Metrikte Sapma` : 'Tüm Sensörler Dengede'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
