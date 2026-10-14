import React, { useState } from 'react';
import { Keyboard, Activity, Smartphone, Moon, Mic, ChevronDown, ChevronUp, Share2, Check } from 'lucide-react';
import { shareContent } from '../../services/shareService';

export const BiomarkerBridgeTable: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShare = async () => {
    const text = [
      'Dijital Biyobelirteçler Özeti',
      '• Klavye Dinamiği: Yazım hızında yavaşlama, artan hatalar -> Potansiyel Duygusal Tükenmişlik',
      '• GPS / Hareket: Evden çıkmama, daralan hareketlilik -> Potansiyel Sosyal Çekilme',
      '• Uygulama Kullanımı: Gece yarısı yoğun oyun/ekran kullanımı -> Potansiyel Dürtüsel Eğilim',
      '• Işık / Ekran: Gece 02:00-04:00 arası yoğun kullanım -> Potansiyel Uyku ve Sirkadiyen Ritim Değişimi',
      '• Ses Analizi (Onaylı): Monoton ve yavaş konuşma tonu -> Potansiyel Duygudurum Değişimi',
      '',
      '*Bu analizler teşhis amacı taşımaz, bilimsel literatürle doğrulanmış farkındalık içgörüleridir.',
    ].join('\n');

    const res = await shareContent({ title: 'Dijital Biyobelirteçler Özeti', text });
    if (res.success) {
      setShareFeedback(res.method === 'clipboard' ? 'Kopyalandı' : 'Paylaşıldı');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-lg text-comus-navy">
            Dijital Biyobelirteçler Rehberi
          </h3>
          <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
            Klavye hızınız, uyku saatleriniz, hareketliliğiniz ve ekran süreniz gibi gündelik etkileşimlerinizin duygusal ritminizle nasıl ilişkilendirildiğini özetler.
          </p>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-comus-navy text-xs font-semibold border border-stone-200/80 transition-colors cursor-pointer shrink-0"
        >
          {shareFeedback ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">{shareFeedback}</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-comus-copper" />
              <span>Paylaş</span>
            </>
          )}
        </button>
      </div>

      {/* Hızlı Görsel Özet Rozetleri */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs font-medium text-comus-navy">
          <Keyboard className="w-3.5 h-3.5 text-stone-500" /> Klavye Ritmi
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs font-medium text-comus-navy">
          <Activity className="w-3.5 h-3.5 text-emerald-500" /> Günlük Hareket
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs font-medium text-comus-navy">
          <Moon className="w-3.5 h-3.5 text-indigo-400" /> Gece Ekran &amp; Uyku
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs font-medium text-comus-navy">
          <Smartphone className="w-3.5 h-3.5 text-sky-500" /> Uygulama Akışı
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="w-full py-2.5 px-4 rounded-2xl bg-comus-navy text-white hover:bg-comus-navy/90 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
      >
        <span>
          {isExpanded ? 'Tablo Ayrıntılarını Gizle' : 'İncele (Biyobelirteç Karşılık Tablosu)'}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-comus-sand-light/20 animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-comus-sand-light/20">
                  <th className="py-3 px-2 text-xs font-semibold text-comus-navy">Veri Kaynağı</th>
                  <th className="py-3 px-2 text-xs font-semibold text-comus-navy">Gözlemlenen Örüntü</th>
                  <th className="py-3 px-2 text-xs font-semibold text-comus-navy">Potansiyel İçgörü</th>
                </tr>
              </thead>
              <tbody className="text-xs text-comus-sand-dark">
                <tr className="border-b border-comus-sand-light/10">
                  <td className="py-3 px-2 flex items-center gap-2 text-comus-navy font-medium">
                    <Keyboard className="w-4 h-4 text-stone-500" /> Klavye Dinamiği
                  </td>
                  <td className="py-3 px-2">Yazım hızında yavaşlama, artan hatalar</td>
                  <td className="py-3 px-2 text-rose-600 font-medium">Duygusal Tükenmişlik (Burnout)</td>
                </tr>
                <tr className="border-b border-comus-sand-light/10">
                  <td className="py-3 px-2 flex items-center gap-2 text-comus-navy font-medium">
                    <Activity className="w-4 h-4 text-emerald-500" /> GPS / Hareket
                  </td>
                  <td className="py-3 px-2">Evden çıkmama, amaçsız hareketlilik</td>
                  <td className="py-3 px-2 text-indigo-600 font-medium">Depresyon / Sosyal Çekilme</td>
                </tr>
                <tr className="border-b border-comus-sand-light/10">
                  <td className="py-3 px-2 flex items-center gap-2 text-comus-navy font-medium">
                    <Smartphone className="w-4 h-4 text-sky-500" /> Uygulama Kullanımı
                  </td>
                  <td className="py-3 px-2">Gece yarısı artan kumar/oyun kullanımı</td>
                  <td className="py-3 px-2 text-amber-600 font-medium">Bağımlılık Eğilimi</td>
                </tr>
                <tr className="border-b border-comus-sand-light/10">
                  <td className="py-3 px-2 flex items-center gap-2 text-comus-navy font-medium">
                    <Moon className="w-4 h-4 text-indigo-400" /> Işık / Ekran
                  </td>
                  <td className="py-3 px-2">Gece 02:00-04:00 arası yoğun kullanım</td>
                  <td className="py-3 px-2 text-orange-600 font-medium">Anksiyete / Sirkadiyen Ritim Bozukluğu</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 flex items-center gap-2 text-comus-navy font-medium">
                    <Mic className="w-4 h-4 text-purple-500" /> Ses Analizi (Onaylı)
                  </td>
                  <td className="py-3 px-2">Monoton ve yavaş konuşma tonu</td>
                  <td className="py-3 px-2 text-rose-700 font-medium">Majör Depresyon</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-stone-400 italic pt-1">
            *Bu analizler teşhis amacı taşımaz, bilimsel literatürle doğrulanmış korelasyonlara dayalı farkındalık içgörüleridir.
          </p>
        </div>
      )}
    </div>
  );
};

