import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Check,
  Lock,
  Unlock,
  Wind,
  Sparkles,
  Smartphone,
  Clock,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';
import { FamilyControls } from 'comus-family-controls';
import {
  DigitalNarcoticModal,
  SHIELD_UNLOCK_UNTIL_KEY,
  SHIELD_SAVED_COUNT_KEY,
} from '../../components/shield/DigitalNarcoticModal';
import { shareContent } from '../../services/shareService';

interface ProtectedAppOption {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const DEFAULT_PROTECTED_OPTIONS: ProtectedAppOption[] = [
  {
    id: 'banking_finance',
    name: 'Mobil Bankacılık & Kredi',
    category: 'Finans',
    description: 'Gece yarısı ani para transferi, kredi ve kart işlemlerine 60 sn nefes molası koyar.',
  },
  {
    id: 'crypto_trading',
    name: 'Kripto & Borsa Uygulamaları',
    category: 'Yatırım',
    description: 'Uykusuz ve dürtüsel anlarda panik alım-satım işlemlerini yavaşlatır.',
  },
  {
    id: 'ecommerce_shopping',
    name: 'Online Alışveriş (Trendyol, Amazon vb.)',
    category: 'Alışveriş',
    description: 'Duygusal boşluk veya stres kaynaklı dürtüsel sepet onaylarını engeller.',
  },
  {
    id: 'fast_delivery',
    name: 'Gece Sipariş & Hızlı Market',
    category: 'Tüketim',
    description: 'Gece 02:00–05:00 arası duygusal yeme ve ani sipariş dürtüsünü dengeler.',
  },
  {
    id: 'games_betting',
    name: 'Oyun & Şans Oyunları',
    category: 'Oyun',
    description: 'Yorgunluk anlarında uygulama içi satın alma ve kayıp telafisi döngüsünü keser.',
  },
  {
    id: 'late_night_social',
    name: 'Sosyal Medya (Gece Kaydırma)',
    category: 'Sosyal',
    description: 'Sirkadiyen ritmi bozan gece boyu ekran kaydırma (doomscrolling) döngüsünü sınırlar.',
  },
];

export const STORAGE_SELECTED_KEY = 'comus_impulse_shield_apps';
export const STORAGE_ACTIVE_KEY = 'comus_impulse_shield_active';
const SHORTCUT_DEEP_LINK = 'dijitalmentalikizim://shield';

export const ImpulseShieldPage: React.FC = () => {
  const navigate = useNavigate();
  const [showNarcoticModal, setShowNarcoticModal] = useState(false);
  const [activeTargetLabel, setActiveTargetLabel] = useState<string | null>(null);
  const [showAppPickerModal, setShowAppPickerModal] = useState(false);
  const [nativeAuthorized, setNativeAuthorized] = useState(false);
  const [nativeSelectedCount, setNativeSelectedCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SELECTED_KEY);
      return saved ? JSON.parse(saved) : ['banking_finance', 'ecommerce_shopping', 'crypto_trading'];
    } catch {
      return ['banking_finance', 'ecommerce_shopping', 'crypto_trading'];
    }
  });

  const [isShieldActive, setIsShieldActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_ACTIVE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [savedImpulseCount, setSavedImpulseCount] = useState<number>(() => {
    try {
      const val = parseInt(localStorage.getItem(SHIELD_SAVED_COUNT_KEY) || '0', 10);
      return Number.isNaN(val) ? 0 : val;
    } catch {
      return 0;
    }
  });

  const [unlockRemainingSec, setUnlockRemainingSec] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showShortcutGuide, setShowShortcutGuide] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SELECTED_KEY, JSON.stringify(selectedAppIds));
    } catch {}
  }, [selectedAppIds]);

  // Check native FamilyControls status & listen for external shield triggers
  useEffect(() => {
    FamilyControls.getStatus()
      .then((res) => {
        setNativeAuthorized(Boolean(res.authorized && !res.fallback));
        setNativeSelectedCount(res.selectedCount || 0);
      })
      .catch(() => {});

    // Check if opened via deep link trigger
    try {
      if (sessionStorage.getItem('comus_trigger_shield_now') === '1') {
        sessionStorage.removeItem('comus_trigger_shield_now');
        setActiveTargetLabel('Otomatik Dürtü Yakalayıcı');
        setShowNarcoticModal(true);
      }
    } catch {}

    const handleTriggerEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ label?: string }>;
      setActiveTargetLabel(customEvent.detail?.label || 'Otomatik Dürtü Yakalayıcı');
      setShowNarcoticModal(true);
    };
    window.addEventListener('comus:trigger-impulse-shield', handleTriggerEvent);
    return () => {
      window.removeEventListener('comus:trigger-impulse-shield', handleTriggerEvent);
    };
  }, []);

  // Track 15-minute temporary unlock countdown
  useEffect(() => {
    const updateCountdown = () => {
      try {
        const raw = localStorage.getItem(SHIELD_UNLOCK_UNTIL_KEY);
        if (!raw) {
          setUnlockRemainingSec(0);
          return;
        }
        const until = parseInt(raw, 10);
        const diffSec = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        setUnlockRemainingSec(diffSec);
        if (diffSec === 0) {
          localStorage.removeItem(SHIELD_UNLOCK_UNTIL_KEY);
        }
      } catch {
        setUnlockRemainingSec(0);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleSelectApps = async () => {
    try {
      const authRes = await FamilyControls.requestAuthorization();
      if (authRes.granted && !authRes.fallback) {
        setNativeAuthorized(true);
        const pickRes = await FamilyControls.selectApps();
        if (pickRes.selectedCount !== undefined) {
          setNativeSelectedCount(pickRes.selectedCount);
        }
        showToast('iOS Ekran Süresi uygulama seçimi güncellendi.');
        return;
      }
    } catch {
      // Fallback to built-in Comus Impulse Shield selector
    }
    setShowAppPickerModal(true);
  };

  const toggleAppSelection = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleActivateShield = async (openBreathingLockImmediately = true) => {
    if (selectedAppIds.length === 0 && nativeSelectedCount === 0) {
      setShowAppPickerModal(true);
      return;
    }
    let usedNativeLock = false;
    try {
      const res = await FamilyControls.setShield();
      if (res.success && !res.fallback) {
        usedNativeLock = true;
      }
    } catch {
      // Fallback to in-app shield mode when native helper is not provisioned
    }
    setIsShieldActive(true);
    setUnlockRemainingSec(0);
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, 'true');
      localStorage.removeItem(SHIELD_UNLOCK_UNTIL_KEY);
      window.dispatchEvent(new CustomEvent('comus:shield-state-changed', { detail: { active: true } }));
    } catch {}

    if (usedNativeLock) {
      showToast('iOS Ekran Süresi Kalkanı ve Nefes Perdesi aktif edildi.');
    } else {
      showToast(`Dürtü Kalkanı kuruldu (${selectedAppIds.length} kategori kilitlendi).`);
    }

    if (openBreathingLockImmediately) {
      setActiveTargetLabel('Kalkan Kilidi Aktif');
      setShowNarcoticModal(true);
    }
  };

  const handleClearShield = async () => {
    try {
      await FamilyControls.clearShield();
    } catch {
      // Fallback to in-app shield mode
    }
    setIsShieldActive(false);
    setUnlockRemainingSec(0);
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, 'false');
      localStorage.removeItem(SHIELD_UNLOCK_UNTIL_KEY);
      window.dispatchEvent(new CustomEvent('comus:shield-state-changed', { detail: { active: false } }));
    } catch {}
    showToast('Dürtü Kalkanı devre dışı bırakıldı.');
  };

  const handleCategoryClick = (opt: ProtectedAppOption) => {
    if (!isShieldActive) {
      handleActivateShield(true);
      return;
    }
    setActiveTargetLabel(opt.name);
    setShowNarcoticModal(true);
  };

  const handleCopyDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(SHORTCUT_DEEP_LINK);
      setCopiedLink(true);
      showToast('Kalkan bağlantısı kopyalandı: dijitalmentalikizim://shield');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      showToast('Bağlantı: dijitalmentalikizim://shield');
    }
  };

  const selectedOptions = DEFAULT_PROTECTED_OPTIONS.filter((opt) =>
    selectedAppIds.includes(opt.id)
  );

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleShareShieldStatus = async () => {
    const statusLabel =
      isShieldActive && unlockRemainingSec === 0
        ? 'Kalkan Kilitli (60 sn 4-7-8 Nefes Perdesi Aktif)'
        : isShieldActive && unlockRemainingSec > 0
        ? `Geçici İzin Açık (${formatCountdown(unlockRemainingSec)})`
        : 'Pasif';

    const lines = [
      'Finansal Kontrol & Dürtü Kalkanı Özeti',
      `• Kalkan Durumu: ${statusLabel}`,
      `• Durdurulan Dürtü Dalgası: ${savedImpulseCount}`,
      `• Koruma Altındaki Kategoriler (${selectedOptions.length}): ${
        selectedOptions.map((o) => o.name).join(', ') || 'Seçilmedi'
      }`,
    ];
    const res = await shareContent({
      title: 'Finansal Kontrol & Dürtü Kalkanı',
      text: lines.join('\n'),
    });
    if (res.success) {
      setShareFeedback(res.method === 'clipboard' ? 'Kopyalandı' : 'Paylaşıldı');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/menu')}
            className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-comus-navy">Finansal Kontrol &amp; Dürtü Kalkanı</h1>
        </div>
        <button
          type="button"
          onClick={handleShareShieldStatus}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-comus-navy text-xs font-semibold border border-stone-200/80 shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          {shareFeedback ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">{shareFeedback}</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Paylaş</span>
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
                Finansal Kontrol &amp; Dürtü Kalkanı
              </h3>
              <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
                Gece uykusuz kaldığın kırılgan anlarda (02:00–05:00) veya ani harcama dürtüsü geldiğinde seçtiğin alanların önüne 60 saniyelik sakinleştirici 4-7-8 nefes perdesi koyar.
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 ${
              isShieldActive && unlockRemainingSec === 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isShieldActive && unlockRemainingSec > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {isShieldActive && unlockRemainingSec === 0 ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
            <span>
              {isShieldActive && unlockRemainingSec === 0
                ? 'Kalkan Kilitli'
                : isShieldActive && unlockRemainingSec > 0
                ? `İzin (${formatCountdown(unlockRemainingSec)})`
                : 'Pasif'}
            </span>
          </span>
        </div>

        {/* Live Shield Status & Stopped Impulses */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide">
                Durdurulan Dürtü
              </div>
              <div className="text-sm font-bold text-comus-navy">
                {savedImpulseCount} Dalga Önledi
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-stone-200/80 text-comus-navy flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-comus-sand-dark uppercase tracking-wide">
                  Koruma Modu
                </div>
                <div className="text-xs font-bold text-comus-navy">
                  {unlockRemainingSec > 0
                    ? `${formatCountdown(unlockRemainingSec)} İzin`
                    : isShieldActive
                    ? '60 sn Nefes Kilidi'
                    : 'Kapalı'}
                </div>
              </div>
            </div>
            {unlockRemainingSec > 0 && (
              <button
                type="button"
                onClick={() => handleActivateShield(false)}
                className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-semibold cursor-pointer shrink-0"
              >
                Kilitle
              </button>
            )}
          </div>
        </div>

        {/* Selected Protected Categories Summary */}
        <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-comus-navy flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Koruma Altındaki Kategoriler ({selectedOptions.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAppPickerModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer"
            >
              Düzenle
            </button>
          </div>
          {selectedOptions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {selectedOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleCategoryClick(opt)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isShieldActive && unlockRemainingSec === 0
                        ? 'bg-white border-indigo-200 hover:border-indigo-400 shadow-2xs'
                        : 'bg-white/80 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-comus-navy truncate">{opt.name}</div>
                      <div className="text-[10px] text-comus-sand-dark">
                        {isShieldActive && unlockRemainingSec === 0
                          ? 'Kilitli • Dokununca Nefes Perdesi açılır'
                          : isShieldActive && unlockRemainingSec > 0
                          ? 'Geçici izin açık'
                          : 'Kalkan pasif'}
                      </div>
                    </div>
                    <span
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isShieldActive && unlockRemainingSec === 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {isShieldActive && unlockRemainingSec === 0 ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-comus-sand-dark pt-0.5">
                Harcama, kredi veya sipariş dürtüsü hissettiğiniz anda yukarıdaki kilitli kategoriye veya <strong>Kalkanı Kur / Nefes Perdesi</strong> butonuna dokunarak 60 saniyelik 4-7-8 dürtü kilidini başlatabilirsiniz.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-comus-sand-dark">
              Henüz kategori seçilmedi. Aşağıdaki butondan korunacak uygulamaları belirleyebilirsiniz.
            </p>
          )}
        </div>

        <div className="pt-1 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSelectApps}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm text-center cursor-pointer"
          >
            1. Korunacak Uygulamaları Seç
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleActivateShield(true)}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                isShieldActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{isShieldActive ? 'Kalkan Aktif' : 'Kalkanı Kur'}</span>
            </button>
            <button
              type="button"
              onClick={handleClearShield}
              className="py-2.5 px-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700 flex items-center justify-center gap-1"
            >
              <Unlock className="w-3.5 h-3.5 shrink-0" />
              <span>Kalkanı İndir</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTargetLabel('4-7-8 Nefes Molası');
                setShowNarcoticModal(true);
              }}
              className="py-2.5 px-2 rounded-xl bg-indigo-50 text-xs font-semibold hover:bg-indigo-100 cursor-pointer text-indigo-700 flex items-center justify-center gap-1"
            >
              <Wind className="w-3.5 h-3.5 shrink-0" />
              <span>Nefes Perdesi</span>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Shortcuts / External App Interception Bridge */}
      {!nativeAuthorized && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-soft border border-indigo-100 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wide mb-1.5">
                iOS Otomatik Yakalama Köprüsü
              </span>
              <h4 className="font-serif font-bold text-sm sm:text-base text-comus-navy">
                Banka ve Alışveriş Uygulamaları Açılırken Otomatik Nefes Perdesi
              </h4>
              <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
                iPhone’da banka veya alışveriş uygulamasını açtığınız anda otomatik olarak 60 saniyelik Nefes Perdesi’nin devreye girmesi için kurulum adımlarını inceleyebilirsiniz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowShortcutGuide((prev) => !prev)}
            aria-expanded={showShortcutGuide}
            className="w-full py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>
              {showShortcutGuide
                ? 'Kurulum Adımlarını Gizle'
                : 'İncele (Otomatik Yakalama Kurulum Rehberi)'}
            </span>
            {showShortcutGuide ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showShortcutGuide && (
            <div className="space-y-3 pt-2 border-t border-indigo-100/60 animate-fadeIn">
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2">
                <code className="text-xs font-mono font-bold text-indigo-900 truncate">
                  {SHORTCUT_DEEP_LINK}
                </code>
                <button
                  type="button"
                  onClick={handleCopyDeepLink}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>

              <ol className="text-[11px] text-comus-sand-dark space-y-1.5 list-decimal list-inside pt-1">
                <li>
                  iPhone’unuzda <strong>Kestirmeler (Shortcuts)</strong> uygulamasını açıp <strong>Otomasyon</strong> sekmesinden <strong>+ Yeni Otomasyon</strong>’a dokunun.
                </li>
                <li>
                  <strong>Uygulama (App)</strong> seçeneğini seçip korunacak uygulamaları (Trendyol, Banka, Kripto vb.) ve <strong>&ldquo;Açıldığında / Hemen Çalıştır&rdquo;</strong> seçeneğini işaretleyin.
                </li>
                <li>
                  İşlem olarak <strong>URL’leri Aç (Open URLs)</strong> ekleyip <code>{SHORTCUT_DEEP_LINK}</code> adresini yapıştırın. Artık o uygulamayı her açtığınızda 60 saniyelik Nefes Perdesi otomatik açılır!
                </li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* In-App Protected Apps & Categories Selector Modal */}
      {showAppPickerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-comus-navy/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-comus-sand-light/30 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy">
                  Korunacak Uygulama ve Kategoriler
                </h3>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Gece kırılganlık penceresinde (02:00–05:00) veya yüksek dürtüsellik saptandığında nefes perdesi uygulanacak alanları seçin.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
              {DEFAULT_PROTECTED_OPTIONS.map((opt) => {
                const isSelected = selectedAppIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleAppSelection(opt.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                        : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100/70'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-stone-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-comus-navy">{opt.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-100">
                          {opt.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-comus-sand-dark mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAppPickerModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAppPickerModal(false);
                  handleActivateShield(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                Kaydet ve Kalkanı Kur ({selectedAppIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <DigitalNarcoticModal
        isOpen={showNarcoticModal}
        onClose={() => setShowNarcoticModal(false)}
        targetLabel={activeTargetLabel}
        protectedNames={selectedOptions.map((o) => o.name)}
        onSavedImpulse={() => {
          try {
            const val = parseInt(localStorage.getItem(SHIELD_SAVED_COUNT_KEY) || '0', 10);
            setSavedImpulseCount(Number.isNaN(val) ? 0 : val);
          } catch {}
          showToast('Tebrikler! Dürtü dalgasını nefesle yatıştırdınız, kalkan korundu.');
        }}
        onTemporaryUnlock={(untilMs) => {
          setUnlockRemainingSec(Math.max(0, Math.ceil((untilMs - Date.now()) / 1000)));
          showToast('15 dakikalık geçici izin başlatıldı. Süre sonunda kalkan otomatik kilitlenir.');
        }}
      />
    </div>
  );
};


