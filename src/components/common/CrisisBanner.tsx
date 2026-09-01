import React from 'react';
import { PhoneCall, HeartHandshake, ShieldAlert, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const CrisisBanner: React.FC = () => {
  const { emergencyModalOpen, setEmergencyModalOpen } = useAppStore();

  if (!emergencyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-soft-lg border-2 border-comus-copper/20 relative">
        <button
          onClick={() => setEmergencyModalOpen(false)}
          className="absolute top-5 right-5 p-2 text-comus-sand hover:text-comus-navy rounded-full hover:bg-comus-sand-subtle transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-comus-copper">
              Öncelikli Destek & Güvenlik
            </span>
            <h3 className="text-xl font-serif font-semibold text-comus-navy">
              Bir Uzmanla Konuşmak İyi Gelebilir
            </h3>
          </div>
        </div>

        <p className="text-sm text-comus-sand-dark leading-relaxed mb-6">
          Davranışsal göstergelerinizde yoğun bir zorlanma veya tükenmişlik dönemi gözlemleniyor. Yalnız değilsiniz; aşağıdaki ücretsiz ve resmi destek hatlarından dilediğiniz an profesyonel yardım alabilirsiniz:
        </p>

        <div className="space-y-3 mb-6">
          <a
            href="tel:112"
            className="flex items-center justify-between p-4 rounded-2xl bg-red-50 hover:bg-red-100/80 border border-red-200 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                112
              </div>
              <div>
                <div className="font-semibold text-red-950 text-sm">112 Acil Çağrı Merkezi</div>
                <div className="text-xs text-red-700">Acil sağlık ve hayati destek (7/24 Ücretsiz)</div>
              </div>
            </div>
            <PhoneCall className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
          </a>

          <a
            href="tel:182"
            className="flex items-center justify-between p-4 rounded-2xl bg-comus-navy-subtle hover:bg-comus-navy-subtle/80 border border-comus-navy/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-comus-navy text-white flex items-center justify-center font-bold text-sm">
                182
              </div>
              <div>
                <div className="font-semibold text-comus-navy text-sm">Alo 182 — MHRS Randevu Hattı</div>
                <div className="text-xs text-comus-navy/70">Psikiyatrik & ruh sağlığı hekim randevusu</div>
              </div>
            </div>
            <PhoneCall className="w-5 h-5 text-comus-navy group-hover:scale-110 transition-transform" />
          </a>

          <a
            href="tel:168"
            className="flex items-center justify-between p-4 rounded-2xl bg-comus-sand-subtle hover:bg-comus-sand-subtle/80 border border-comus-sand-light/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-comus-copper text-white flex items-center justify-center font-bold text-sm">
                168
              </div>
              <div>
                <div className="font-semibold text-comus-navy text-sm">Kızılay Sosyal Destek Hattı</div>
                <div className="text-xs text-comus-sand-dark">Psikososyal destek ve danışmanlık</div>
              </div>
            </div>
            <HeartHandshake className="w-5 h-5 text-comus-copper group-hover:scale-110 transition-transform" />
          </a>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="px-6 py-2.5 rounded-xl bg-comus-navy text-white text-sm font-medium hover:bg-comus-navy-light transition-colors"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
