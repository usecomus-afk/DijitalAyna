import React from 'react';
import { Keyboard, Activity, Smartphone, Moon, Mic } from 'lucide-react';

export const BiomarkerBridgeTable: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-4">
      <h3 className="font-serif font-bold text-lg text-comus-navy">
        Dijital Biyobelirteçler Tablosu
      </h3>
      <p className="text-xs text-comus-sand-dark">
        Gündelik cihaz etkileşimlerinizin potansiyel duygusal yansımaları.
      </p>

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

      <p className="text-[10px] text-stone-400 italic pt-2">
        *Bu analizler teşhis amacı taşımaz, bilimsel literatürle doğrulanmış korelasyonlara dayalı farkındalık içgörüleridir.
      </p>
    </div>
  );
};
