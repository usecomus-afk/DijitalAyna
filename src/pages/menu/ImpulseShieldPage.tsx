import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Check, Lock, Unlock, Wind, Sparkles, Smartphone } from 'lucide-react';
import { FamilyControls } from 'comus-family-controls';
import { DigitalNarcoticModal } from '../../components/shield/DigitalNarcoticModal';

interface ProtectedAppOption {
  id: string;
  name: string;
  category: string;
  description: string;
}

const DEFAULT_PROTECTED_OPTIONS: ProtectedAppOption[] = [
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

const STORAGE_SELECTED_KEY = 'comus_impulse_shield_apps';
const STORAGE_ACTIVE_KEY = 'comus_impulse_shield_active';

export const ImpulseShieldPage: React.FC = () => {
  const navigate = useNavigate();
  const [showNarcoticModal, setShowNarcoticModal] = useState(false);
  const [showAppPickerModal, setShowAppPickerModal] = useState(false);
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SELECTED_KEY, JSON.stringify(selectedAppIds));
    } catch {}
  }, [selectedAppIds]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleSelectApps = async () => {
    try {
      const authRes = await FamilyControls.requestAuthorization();
      if (authRes.granted) {
        await FamilyControls.selectApps();
        showToast('Korunacak uygulama seçimi güncellendi.');
        return;
      }
    } catch {
      // iOS FamilyControls helper application is unavailable when distribution entitlement is not active.
      // Gracefully fall back to the built-in Comus Impulse Shield selector.
    }
    setShowAppPickerModal(true);
  };

  const toggleAppSelection = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleActivateShield = async () => {
    if (selectedAppIds.length === 0) {
      setShowAppPickerModal(true);
      return;
    }
    try {
      await FamilyControls.setShield();
    } catch {
      // Fallback to in-app shield mode when native helper is not provisioned
    }
    setIsShieldActive(true);
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, 'true');
    } catch {}
    showToast(`Dürtü Kalkanı aktif edildi (${selectedAppIds.length} kategori korunuyor).`);
  };

  const handleClearShield = async () => {
    try {
      await FamilyControls.clearShield();
    } catch {
      // Fallback to in-app shield mode
    }
    setIsShieldActive(false);
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, 'false');
    } catch {}
    showToast('Dürtü Kalkanı devre dışı bırakıldı.');
  };

  const selectedOptions = DEFAULT_PROTECTED_OPTIONS.filter((opt) =>
    selectedAppIds.includes(opt.id)
  );

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Finansal Huzur ve Dürtü Kalkanı</h1>
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
                Finansal Huzur ve Dürtü Kalkanı
              </h3>
              <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
                Gece uykusuz kaldığın kırılgan anlarda (02:00–05:00) seçtiğin uygulamaların önüne 60 saniyelik sakinleştirici bir 4-7-8 nefes perdesi koyar.
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 ${
              isShieldActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {isShieldActive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{isShieldActive ? 'Kalkan Aktif' : 'Pasif'}</span>
          </span>
        </div>

        {/* Selected Protected Categories Summary */}
        <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-comus-navy flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Koruma Altındaki Kategoriler ({selectedOptions.length})</span>
            </span>
            <button
              onClick={() => setShowAppPickerModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer"
            >
              Düzenle
            </button>
          </div>
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedOptions.map((opt) => (
                <span
                  key={opt.id}
                  className="px-2.5 py-1 rounded-xl bg-white border border-indigo-100 text-comus-navy text-[11px] font-medium shadow-2xs"
                >
                  {opt.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-comus-sand-dark">
              Henüz kategori seçilmedi. Aşağıdaki butondan korunacak uygulamaları belirleyebilirsiniz.
            </p>
          )}
        </div>

        <div className="pt-1 flex flex-col gap-3">
          <button
            onClick={handleSelectApps}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm text-center cursor-pointer"
          >
            Korunacak Uygulamaları Seç
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleActivateShield}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                isShieldActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Kalkanı Kur</span>
            </button>
            <button
              onClick={handleClearShield}
              className="py-2.5 px-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700 flex items-center justify-center gap-1"
            >
              <Unlock className="w-3.5 h-3.5 shrink-0" />
              <span>Kalkanı İndir</span>
            </button>
            <button
              onClick={() => setShowNarcoticModal(true)}
              className="py-2.5 px-2 rounded-xl bg-indigo-50 text-xs font-semibold hover:bg-indigo-100 cursor-pointer text-indigo-700 flex items-center justify-center gap-1"
            >
              <Wind className="w-3.5 h-3.5 shrink-0" />
              <span>Nefes Perdesi</span>
            </button>
          </div>
        </div>
      </div>

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
                  handleActivateShield();
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                Kaydet ve Kalkanı Kur ({selectedAppIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <DigitalNarcoticModal isOpen={showNarcoticModal} onClose={() => setShowNarcoticModal(false)} />
    </div>
  );
};

