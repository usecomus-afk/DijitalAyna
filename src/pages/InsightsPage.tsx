import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { InsightCard } from '../components/insights/InsightCard';
import { Disclaimer } from '../components/common/Disclaimer';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const insights = useLiveQuery(() => db.insights.toArray()) || [];

  const filteredInsights = insights.filter((ins) => {
    if (filter === 'all') return true;
    return ins.severity === filter;
  });

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="font-serif font-bold text-2xl text-comus-navy">
              İçgörüler Akışı
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-comus-sand-dark mt-1">
            Kişisel baz hattınızdan saptanan davranışsal değişimler ve nazik öneriler
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-comus-sand-light/30 shadow-soft text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-comus-navy text-white'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Tümü ({insights.length})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === 'high'
                ? 'bg-rose-600 text-white'
                : 'text-comus-sand-dark hover:text-rose-600'
            }`}
          >
            Öncelikli
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === 'medium'
                ? 'bg-amber-600 text-white'
                : 'text-comus-sand-dark hover:text-amber-600'
            }`}
          >
            Sinyaller
          </button>
        </div>
      </div>

      {/* Insight Cards Feed */}
      {filteredInsights.length > 0 ? (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <InsightCard key={insight.id || insight.createdAt} insight={insight} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 text-center border border-comus-sand-light/20 shadow-soft">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-comus-navy mb-1">
            Her Şey Dengede Görünüyor
          </h3>
          <p className="text-xs sm:text-sm text-comus-sand-dark max-w-sm mx-auto">
            Şu anda baz hattından belirgin bir sapma veya öncelikli anomali bulunmuyor.
          </p>
        </div>
      )}

      {/* Slide 10 & 20: Dijital Fenotipleme ile Erken Farkındalık Sağlanabilen 7 Durum */}
      <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-comus-navy">
                Erken Farkındalık Sağlanan 7 Klinik Durum & Biyobelirteçler
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Slide 10 & 20
              </span>
            </div>
            <p className="text-xs text-comus-sand-dark mt-0.5">
              Cihaz etkileşimlerinizden klinikte tanınan davranışsal örüntülere kurulan köprü
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            {
              state: 'Duygusal Tükenmişlik (Burnout)',
              source: 'Klavye Dinamiği',
              sign: 'Yazım hızında yavaşlama, artan backspace ve duraksama',
              color: 'border-amber-200 bg-amber-50/40 text-amber-900',
            },
            {
              state: 'Depresyon & Sosyal İzolasyon',
              source: 'GPS / Hareketlilik',
              sign: 'Evden çıkmama (yüksek homestay), iletişim kopması',
              color: 'border-rose-200 bg-rose-50/40 text-rose-900',
            },
            {
              state: 'Anksiyete & Uyku Bozuklukları',
              source: 'Işık / Ekran Ritmi',
              sign: 'Gece 02:00-04:00 yoğun kullanım, sirkadiyen sapma',
              color: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
            },
            {
              state: 'Nöroçeşitlilik (DEHB, Otizm)',
              source: 'Uygulama Geçişleri',
              sign: 'Tekrarlayıcı davranışlar ve dikkat dağınıklığı örüntüleri',
              color: 'border-teal-200 bg-teal-50/40 text-teal-900',
            },
            {
              state: 'Bilişsel Düşüş Riski',
              source: 'Klavye & Arama',
              sign: 'Kelime haznesinde daralma, uzayan tuş aralıkları',
              color: 'border-slate-200 bg-slate-50 text-slate-800',
            },
            {
              state: 'PTSD Belirtileri',
              source: 'Ekran Açma (Unlock)',
              sign: 'Hipervijilans (sık kontrol) ve kaçınma örüntüleri',
              color: 'border-purple-200 bg-purple-50/40 text-purple-900',
            },
            {
              state: 'Düşük Özsaygı',
              source: 'Sosyal Medya',
              sign: 'Sosyal medyada pasif izleyici modunda geçirilen aşırı zaman',
              color: 'border-stone-200 bg-stone-50 text-stone-800',
            },
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-2xl border ${item.color} space-y-1`}>
              <div className="font-bold flex items-center justify-between">
                <span>{item.state}</span>
              </div>
              <div className="text-[11px] font-semibold opacity-75">{item.source}</div>
              <p className="text-[11px] leading-relaxed opacity-90">{item.sign}</p>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-comus-sand-dark italic border-t border-comus-sand-light/20 pt-2.5">
          * Bu analizler teşhis amacı taşımaz, bilimsel literatürle doğrulanmış korelasyonlara dayalı farkındalık içgörüleridir.
        </div>
      </div>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
};
