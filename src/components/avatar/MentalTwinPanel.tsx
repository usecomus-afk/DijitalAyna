import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useMentalTwinAvatar } from '../../hooks/useMentalTwinAvatar';
import { useViewportScrollLock } from '../../hooks/useViewportScrollLock';
import { getSynthesisCopy, resolveSynthesisBadge } from '../../engine/dailyState';
import { getDistinctSuggestedAction } from '../../engine/awarenessSynthesis';
import { shareContent } from '../../services/shareService';
import {
  Sparkles,
  Keyboard,
  Moon,
  Zap,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  Compass,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const MentalTwinPanel: React.FC = () => {
  const { userProfile } = useAppStore();
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false);

  // Lock vertical scrolling until "İncele" is clicked
  useViewportScrollLock(!isDetailsExpanded);

  const {
    avatarSrc,
    affectiveIndex,
    hasIndex,
    phenoState,
    phenoLabel,
    clinicalInsight,
    earlyAwarenessAlerts,
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

  const hasSingleDayPhenotypeSignal =
    earlyAwarenessAlerts.length === 0 &&
    phenoState !== 'euthymic_healthy_balance' &&
    phenoState !== 'learning_baseline';

  const synthesisCopy = getSynthesisCopy(affectiveIndex);

  const handleShareDetails = async () => {
    const res = await shareContent({
      title: `${userProfile.name || 'Kullanıcı'} — Dijital Mental İkiz Analizi`,
      text: [
        `Durum: ${modalTitle} (${energyText})`,
        `Yansıma: "${dialogue}"`,
        `Biyobelirteç Sentezi (İndeks ${affectiveIndex}/100): ${synthesisCopy.text}`,
        `Sensör Özeti: Yazım ${sensorStatus.typing ?? '—'} WPM • Hareketlilik ${sensorStatus.mobility ?? '—'} Puan • Gece Ekran ${sensorStatus.night ?? '—'} dk`,
        '',
        '— Dijital Mental İkizim',
      ].join('\n'),
    });
    setShareFeedback(res.message);
    setTimeout(() => setShareFeedback(null), 3000);
  };

  return (
    <div className={`animate-fadeIn ${isDetailsExpanded ? 'pb-16' : 'h-viewport-main flex flex-col'}`}>
      <div
        className={`bg-white rounded-3xl w-full p-5 sm:p-6 shadow-soft-lg border-2 border-comus-copper/30 relative overflow-hidden ${
          isDetailsExpanded ? '' : 'flex-1 min-h-0 flex flex-col justify-between'
        }`}
      >
        {/* Ambient Mood Glow Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${auraGradient} opacity-60 pointer-events-none transition-all duration-700`}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-comus-copper block">
                Kişisel Zihin Yansıması
              </span>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-comus-navy leading-tight truncate">
                {userProfile.name}’in Dijital Mental İkizi
              </h3>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${badgeClass}`}>
            {modalTitle}
          </span>
        </div>

        {/* Avatar Display Arena — Stretches proportionally to fill middle viewport */}
        <div
          className={`relative z-10 rounded-3xl p-4 sm:p-5 my-2.5 border border-white/60 shadow-inner flex flex-col items-center justify-between text-center ${bgBase} backdrop-blur-sm transition-all duration-500 ${
            isDetailsExpanded ? '' : 'flex-1 min-h-0'
          }`}
        >
          {/* 3D Rendered Avatar Card (Hero Enlargement) */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 max-h-[36vh] aspect-square flex items-center justify-center shrink-0 my-1">
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
          <div className="flex flex-wrap items-center justify-center gap-2 my-1 shrink-0">
            <span className="text-xs sm:text-sm font-semibold text-comus-navy">{modalSubtitle}</span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white/85 border border-comus-sand-light/30 text-comus-sand-dark font-bold">
              {energyText}
            </span>
          </div>

          {/* Twin Speech Bubble */}
          <div className="relative bg-white/95 rounded-2xl p-3.5 sm:p-4 border border-comus-sand-light/30 shadow-soft text-left w-full max-w-lg shrink-0 my-1">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rotate-45 border-t border-l border-comus-sand-light/30" />
            <p className="text-xs sm:text-sm text-comus-navy leading-relaxed italic font-serif line-clamp-3 sm:line-clamp-none">
              "{dialogue}"
            </p>
          </div>
        </div>

        {/* İncele Toggle Button */}
        <div className="relative z-10 shrink-0 flex justify-center">
          <button
            type="button"
            data-testid="mental-twin-examine-button"
            onClick={() => setIsDetailsExpanded((prev) => !prev)}
            className="w-full py-3 px-6 rounded-2xl bg-comus-navy text-white hover:bg-comus-navy-light text-xs sm:text-sm font-semibold transition-all shadow-soft flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isDetailsExpanded ? 'Ayrıntıları Gizle' : 'İncele'}</span>
            {isDetailsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {isDetailsExpanded && (
          <div className="relative z-10 mt-4 space-y-3 animate-fadeIn">
            {/* Blinking Critical Threshold Early Awareness Warning Banner */}
            {earlyAwarenessAlerts.length > 0 && (
              <div
                data-testid="early-awareness-blinking-warning"
                className="rounded-2xl border-2 border-rose-500/80 bg-rose-50/95 p-4 shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
                    </span>
                    <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse shrink-0" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 animate-pulse">
                      Erken Farkındalık & Kritik EŞik Uyarısı
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse shrink-0">
                    {earlyAwarenessAlerts.length} Potansiyel Sinyal
                  </span>
                </div>

                <div className="space-y-3">
                  {earlyAwarenessAlerts.map((alert, idx) => {
                    const cleanedBody = (alert.notificationBody || '').replace(
                      /\s*Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir\.?/gi,
                      ''
                    );
                    const distinctAction = getDistinctSuggestedAction(alert.id, {
                      variantIndex: idx,
                    });
                    return (
                      <div
                        key={alert.id}
                        className="bg-white/95 rounded-xl p-3 border border-rose-200/80 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <h4 className="font-serif font-bold text-xs sm:text-sm text-rose-950">
                            {alert.potentialStateLabel || `Potansiyel ${alert.title} Olasılığı`}
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                            {alert.insightType === 'anxietySleep'
                              ? `Son 7 Günde ${alert.consecutiveDays || alert.requiredDays || 3} Gece`
                              : `Ardışık ${alert.consecutiveDays || alert.requiredDays || 3} Gün Kritik EŞik`}
                          </span>
                        </div>

                        {alert.statisticalSummary && (
                          <div className="text-[11px] font-mono font-semibold text-rose-900 bg-rose-50/70 px-2.5 py-1 rounded-lg border border-rose-100">
                            ğŸ“Š Biyobelirteç İstatistiği: {alert.statisticalSummary}
                          </div>
                        )}

                        <p className="text-[11px] text-comus-navy leading-relaxed">
                          {cleanedBody}
                        </p>

                        <div className="p-2.5 rounded-xl bg-comus-copper-subtle/35 border border-comus-copper/20 text-[11px] text-comus-navy">
                          <span className="font-bold text-comus-copper-dark inline-flex items-center gap-1 mr-1">
                            <Compass className="w-3 h-3 text-comus-copper inline" />
                            Özel Öneri:
                          </span>
                          <span>{distinctAction}</span>
                        </div>

                        {alert.explainableEvidences && alert.explainableEvidences.length > 0 && (
                          <ul className="space-y-1 pt-1 border-t border-rose-100 text-[10px] text-comus-sand-dark list-disc list-inside">
                            {alert.explainableEvidences.map((ev, i) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2.5 pt-2 border-t border-rose-200/60 text-[10px] text-rose-900/80 italic font-medium">
                  * Bu uyarı kesin bir tıbbi teşhis değildir; biyobelirteç istatistiklerinize dayalı olarak &ldquo;potansiyel&rdquo; ve &ldquo;olabilir&rdquo; kapsamında erken farkındalık sağlamak amacıyla sunulmuştur.
                </div>
              </div>
            )}

            {/* Single-Day Probabilistic Phenotype Signal Banner */}
            {hasSingleDayPhenotypeSignal && (
              <div className="rounded-2xl border border-amber-400/80 bg-amber-50/90 p-3.5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600" />
                  </span>
                  <span className="text-[11px] font-bold text-amber-900 animate-pulse">
                    Erken Farkındalık Öngörüsü: {phenoLabel}
                  </span>
                </div>
                <p className="text-[11px] text-amber-950/90 leading-relaxed">
                  {clinicalInsight}
                </p>
              </div>
            )}

            {/* Real-time Automated Phenotype & Biometric Synthesis Card */}
            <div className="p-4 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-2.5">
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
                {hasIndex ? synthesisCopy.text : clinicalInsight}
              </p>

              <div className="pt-2 border-t border-comus-sand-light/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-comus-sand-dark flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                  <span>15 mikro-biyobelirteç baz hattı ile otomatik analiz edildi.</span>
                </span>
                <span className="font-semibold text-comus-navy bg-white px-2 py-0.5 rounded-full border border-comus-sand-light/30">
                  {resolveSynthesisBadge(
                    hasIndex ? affectiveIndex : null,
                    phenoLabel,
                    hasSingleDayPhenotypeSignal || earlyAwarenessAlerts.length > 0
                  )}
                </span>
              </div>
            </div>

            {/* Real-Time Sensor Telemetry Summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
                <div className="text-[10px] text-comus-sand-dark flex items-center justify-center gap-1 mb-0.5">
                  <Keyboard className="w-3 h-3 text-comus-copper" />
                  <span>Yazım Akışı</span>
                </div>
                <div className="font-semibold text-comus-navy font-mono text-xs">
                  {sensorStatus.typing ?? '—'} WPM
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
                <div className="text-[10px] text-comus-sand-dark flex items-center justify-center gap-1 mb-0.5">
                  <Zap className="w-3 h-3 text-comus-copper" />
                  <span>Hareketlilik</span>
                </div>
                <div className="font-semibold text-comus-navy font-mono text-xs">
                  {sensorStatus.mobility ?? '—'} Puan
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
                <div className="text-[10px] text-comus-sand-dark flex items-center justify-center gap-1 mb-0.5">
                  <Moon className="w-3 h-3 text-comus-copper" />
                  <span>Gece Uykusu</span>
                </div>
                <div className="font-semibold text-comus-navy font-mono text-xs">
                  {sensorStatus.night ?? '—'} dk ekran
                </div>
              </div>
            </div>

            {/* Footer Share Action */}
            <div className="pt-3 border-t border-comus-sand-light/20 flex items-center justify-between gap-2 text-xs text-comus-sand-dark">
              {shareFeedback ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{shareFeedback}</span>
                </span>
              ) : (
                <span>İstediğiniz zaman bu ayrıntıları doktorunuzla veya yakınınızla paylaşabilirsiniz.</span>
              )}
              <button
                type="button"
                onClick={handleShareDetails}
                className="px-4 py-2 rounded-xl bg-comus-surface hover:bg-comus-sand-subtle text-comus-navy border border-comus-sand-light/40 font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-comus-copper" />
                <span>Ayrıntıları PaylaŞ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

