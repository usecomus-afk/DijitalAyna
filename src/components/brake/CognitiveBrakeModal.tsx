import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Send,
  CreditCard,
  CheckCircle2,
  X,
  AlertTriangle,
  Sparkles,
  Timer,
  HeartHandshake
} from 'lucide-react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { notificationService } from '../../services/notificationService';

interface CognitiveBrakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CognitiveBrakeModal: React.FC<CognitiveBrakeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'decision_fatigue' | 'impulse_narkoz'>('decision_fatigue');

  // Scenario A (Decision Fatigue - Slide 25)
  const [emailDraft, setEmailDraft] = useState(
    'Sayın Yönetim, bugünkü toplantıda alınan kararları kabul etmiyorum ve an itibariyle projeden ayrılmak istediğimi bildiriyorum.'
  );
  const [showFatigueWarning, setShowFatigueWarning] = useState(false);
  const [decisionDelayed, setDecisionDelayed] = useState(false);

  // Scenario B (Digital Narkoz / Impulse Brake - Slide 26)
  const [impulseCountdown, setImpulseCountdown] = useState<number | null>(null);
  const purchaseAmount = '18.500';
  const [impulseCancelled, setImpulseCancelled] = useState(false);
  const [mindfulnessBreath, setMindfulnessBreath] = useState<'Nefes Al' | 'Tut' | 'Nefes Ver'>('Nefes Al');

  // Mindfulness breathing loop during pause
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (impulseCountdown !== null && impulseCountdown > 0) {
      timer = setTimeout(() => {
        setImpulseCountdown((c) => (c !== null ? c - 1 : null));
        if (impulseCountdown % 6 >= 4) {
          setMindfulnessBreath('Nefes Al');
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        } else if (impulseCountdown % 6 >= 2) {
          setMindfulnessBreath('Tut');
        } else {
          setMindfulnessBreath('Nefes Ver');
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }
      }, 1000);
    } else if (impulseCountdown === 0) {
      setImpulseCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [impulseCountdown]);

  if (!isOpen) return null;

  const triggerFatigueCheck = () => {
    Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
    notificationService.sendPredictiveAlert(
      'Bilişsel Fren Devrede',
      'Karar yorgunluğu tespit edildi. İletiyi göndermeden önce 1 saat ertelemeniz önerilir.'
    );
    setShowFatigueWarning(true);
    setDecisionDelayed(false);
  };

  const startImpulsePause = () => {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    notificationService.sendPredictiveAlert(
      'Dürtüsel Harcama Freni',
      'Yüksek tutarlı işlem için 15 saniyelik biyolojik soğuma süresi başlatıldı.'
    );
    setImpulseCountdown(15);
    setImpulseCancelled(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-soft-lg border-2 border-comus-copper/30 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-comus-sand hover:text-comus-navy rounded-full hover:bg-comus-sand-subtle transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Slide references */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-xl text-comus-navy">
                Bilişsel Koruma & Dijital Fren
              </h2>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Slide 25 & 26
              </span>
            </div>
            <p className="text-xs text-comus-sand-dark mt-0.5">
              Yorgunluk anında karar erteleme kalkanı ve dürtüsel davranış freni (Dijital Narkoz)
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-comus-surface p-1 rounded-2xl border border-comus-sand-light/40 mb-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('decision_fatigue')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'decision_fatigue'
                ? 'bg-comus-navy text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Bilişsel Fren (Yorgunluk)</span>
          </button>

          <button
            onClick={() => setActiveTab('impulse_narkoz')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'impulse_narkoz'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-amber-700'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>2. Dürtüsel Fren (Dijital Narkoz)</span>
          </button>
        </div>

        {/* TAB 1: Bilişsel Yorgunluk Freni (Slide 25) */}
        {activeTab === 'decision_fatigue' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>Nasıl Çalışır? (PDF Sayfa 25)</span>
              </div>
              <p className="leading-relaxed">
                Klavye dinamikleri (yavaşlayan vuruş hızı, artan backspace) ve ekran kullanım süresinden
                kullanıcının <strong>"bilişsel yorgunluk" (decision fatigue)</strong> seviyesini ölçer.
                Kritik bir karar/e-posta öncesi anında farkındalık freni uygular.
              </p>
            </div>

            {/* Interactive Mock Email Composer */}
            <div className="bg-comus-surface p-4 rounded-2xl border border-comus-sand-light/40 space-y-3">
              <div className="flex items-center justify-between text-xs text-comus-navy font-semibold">
                <span>Simülasyon: Kritik E-Posta Gönderme</span>
                <span className="text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Tespit Edilen Yorgunluk: %84 (Yüksek)
                </span>
              </div>

              <textarea
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-white border border-comus-sand-light/50 focus:outline-none focus:ring-2 focus:ring-comus-copper/50"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-comus-sand-dark">
                  Son 3 saattir aralıksız çalışma ve klavye duraksamaları saptandı.
                </span>
                <button
                  onClick={triggerFatigueCheck}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs font-semibold shadow-soft transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gönder (Send)</span>
                </button>
              </div>
            </div>

            {/* Fatigue Warning Banner - As described on slide 25 */}
            {showFatigueWarning && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-comus-navy text-white shadow-soft-lg space-y-3 animate-fadeIn border border-indigo-500/30">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Bilişsel Koruma Müdahalesi</span>
                </div>
                <h4 className="font-serif font-bold text-lg text-white">
                  "Şu an bilişsel kapasiten düşük görünüyor. Bu önemli kararı 2 saat sonraya veya yarına bırakmak ister misin?"
                </h4>
                <p className="text-xs text-white/80 leading-relaxed">
                  Yazım ritminizde %38 yavaşlama ve düzeltme oranında ani artış var. Stresli ve yorgun anlarda verilen tepkisel kararların önüne geçmek için ComusAI bu kararı askıya almanızı öneriyor.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setDecisionDelayed(true);
                      setShowFatigueWarning(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold transition-colors shadow-sm"
                  >
                    Evet, 2 Saat Sonraya Ertele
                  </button>
                  <button
                    onClick={() => {
                      setDecisionDelayed(true);
                      setShowFatigueWarning(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors"
                  >
                    Taslak Olarak Kaydet & Dinlen
                  </button>
                  <button
                    onClick={() => setShowFatigueWarning(false)}
                    className="px-3 py-2 rounded-xl text-white/60 hover:text-white text-xs font-medium ml-auto"
                  >
                    Yine de Gönder (Riskli)
                  </button>
                </div>
              </div>
            )}

            {decisionDelayed && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Karar güvenle askıya alındı. Saat 10:30 için sakin zihinle değerlendirme hatırlatması kuruldu.
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Dürtüsel Davranış Freni - "Dijital Narkoz" (Slide 26) */}
        {activeTab === 'impulse_narkoz' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-700" />
                <span>Temel Felsefe (PDF Sayfa 26)</span>
              </div>
              <p className="leading-relaxed">
                Gece yarısı kumar, agresif online alışveriş veya ani duygu patlamasıyla gelen eylemlerde
                sert bir yasak yerine <strong>"Kademeli Yavaşlatma ve Farkındalık Duraklaması (Mindfulness Pause)"</strong> devreye girer.
              </p>
            </div>

            {/* Interactive Impulse Simulator */}
            <div className="bg-comus-surface p-4 rounded-2xl border border-comus-sand-light/40 space-y-3">
              <div className="flex items-center justify-between text-xs text-comus-navy font-semibold">
                <span>Simülasyon: Gece 02:40 Ani Harcama / Riskli İşlem</span>
                <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Saat: 02:45 | Ritim: Yüksek Uyarılma
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-comus-sand-light/40">
                <CreditCard className="w-5 h-5 text-comus-copper" />
                <div className="flex-1">
                  <div className="text-[11px] text-comus-sand-dark">İşlem Tutarı</div>
                  <div className="font-bold text-comus-navy text-sm">₺{purchaseAmount} TL</div>
                </div>
                <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded-lg">
                  Ani Karar Riski
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-comus-sand-dark">
                  Dürtüsel döngü tespit edildiğinde tek tıkla işlem engellenir, yavaşlatma başlar.
                </span>
                <button
                  onClick={startImpulsePause}
                  disabled={impulseCountdown !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-soft transition-all disabled:opacity-50"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>İşlemi Onayla (Dürtü)</span>
                </button>
              </div>
            </div>

            {/* 15-Second Mindfulness Pause / "Dijital Narkoz" Overlay */}
            {impulseCountdown !== null && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-900 to-comus-navy text-white text-center space-y-3.5 shadow-soft-lg animate-fadeIn border border-teal-500/40">
                <span className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
                  Farkındalık Duraklaması (Mindfulness Pause)
                </span>
                <div className="text-4xl font-mono font-bold text-teal-200">
                  00:{impulseCountdown < 10 ? `0${impulseCountdown}` : impulseCountdown}
                </div>
                <div className="text-sm font-serif font-medium text-white/90">
                  "{mindfulnessBreath}... Bu kararı gerçekten şimdi mi vermek istiyorsun?"
                </div>
                <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
                  Cihaz etkileşiminiz 15 saniyeliğine yavaşlatıldı. Sert bir yasaklama değil; pişmanlıkları önleyen bir nefes ve farkındalık anı sunuyoruz.
                </p>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setImpulseCountdown(null);
                      setImpulseCancelled(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-teal-950 text-xs font-bold shadow-soft transition-colors"
                  >
                    Vazgeç, Sabah Sakin Kafayla Bak
                  </button>
                  <button
                    onClick={() => setImpulseCountdown(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  >
                    Duraklamayı Atla
                  </button>
                </div>
              </div>
            )}

            {impulseCancelled && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Tebrikler! ₺{purchaseAmount} TL tutarındaki dürtüsel gece harcaması farkındalık anı sayesinde önlendi.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-comus-sand-light/20 flex items-center justify-between text-xs text-comus-sand-dark">
          <div className="flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-comus-copper" />
            <span>Kullanıcı özerkliğine saygılı koruyucu teknoloji</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-comus-sand-light/30 hover:bg-comus-sand-light/50 text-comus-navy font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
