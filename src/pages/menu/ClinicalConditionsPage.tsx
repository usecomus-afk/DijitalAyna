import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { InsightsTab } from '../../components/InsightsTab';

export const ClinicalConditionsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">9 Klinik Durum</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-comus-navy">
                Erken Farkındalık Sağlanan 9 Klinik Durum & Biyobelirteçler
              </h3>
            </div>
            <p className="text-xs text-comus-sand-dark mt-0.5">
              Cihaz etkileşimlerinizden klinikte tanınan davranışsal örüntülere kurulan köprü
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            {
              state: '1. Duygusal Tükenmişlik (Burnout)',
              source: 'Klavye Hold Time, IKI ve Silme Oranı',
              threshold: 'Hold Time 🔺 +2.0σ (>35 ms) ve silme oranı >%25 artış',
              duration: 'Ardışık 3 gün devam ettiğinde',
              color: 'border-amber-200 bg-amber-50/40 text-amber-900',
            },
            {
              state: '2. Depresyon ve Sosyal İzolasyon',
              source: 'GPS Homestay %, Gyration Yarıçapı & Sosyal Log',
              threshold: 'Homestay 🔺 %85 (veya %30 artış) ve yarıçapta 🔻 -2.0σ (%50 daralma)',
              duration: 'Ardışık 4 gün devam ettiğinde (Aalbers et al., 2025)',
              color: 'border-rose-200 bg-rose-50/40 text-rose-900',
            },
            {
              state: '3. Anksiyete ve Uyku Bozuklukları',
              source: '02:00-04:00 Gece Penceresi & SOL / WASO',
              threshold: '02:00-04:00 arası 🔺 3 kilit açma / >35 dk ve SOL 🔺 30 dk uzama',
              duration: 'Son 7 günün en az 3 gecesinde (Lee et al., 2025)',
              color: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
            },
            {
              state: '4. Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı)',
              source: 'Uygulama Geçiş Sıklığı & Mikro-Oturumlar',
              threshold: '15 dk pencerede 🔺 8 geçiş ve ortalama oturum <40 saniye',
              duration: 'Günde en az 4 ayrı zaman diliminde saptandığında',
              color: 'border-teal-200 bg-teal-50/40 text-teal-900',
            },
            {
              state: '5. Bilişsel İcra Hızı ve Ritim Değişimi',
              source: 'Klavye IKI, Duraksamalar (>2000 ms) & SRI',
              threshold: 'IKI aralığında sürekli artış (Z 🔺 +2.5σ) ve SRI <%60 sirkadiyen parçalanma',
              duration: 'Ardışık 7 gün devam ettiğinde (Boyle et al., 2025)',
              color: 'border-slate-200 bg-slate-50 text-slate-800',
            },
            {
              state: '6. PTSD Belirtileri (Hipervijilans)',
              source: 'Günlük Kilit Açma Sıklığı & Mikro-Kontrol',
              threshold: 'Günlük kilit açma 🔺 +2.5σ (>80/gün) ve 5 sn içi eylemsiz kilitleme >%40',
              duration: 'Sinir sistemi yüksek alarm hali saptandığında',
              color: 'border-purple-200 bg-purple-50/40 text-purple-900',
            },
            {
              state: '7. Düşük Özsaygı & Pasif Sosyal Medya',
              source: 'Sosyal Medya Süresi, Pasif Kaydırma & EMA',
              threshold: 'Sosyal medya >120 dk & dışa dönük etkileşim <%5, gece scroll >45 dk',
              duration: 'Oturum sonrası EMA afektinde 🔻 2 puan düşüş (Ekstrom, 2026)',
              color: 'border-stone-200 bg-stone-50 text-stone-800',
            },
            {
              state: '8. Kaçınma ve Sanal Dünyaya Sığınma',
              source: 'Oyun Oturumu Süresi & Dış Dünya Hareketliliği',
              threshold: 'Günlük oyun süresi 🔺 +2.0σ (>120 dk) ve Hareket Yarıçapı Rg 🔻 -1.5σ (veya evde kalış >%85)',
              duration: 'Yoğun duygusal baskı karşısında gerçeklikten kaçış ve izolasyon örüntüsü saptandığında (Dumas et al., 2025; Guth et al., 2025)',
              color: 'border-blue-200 bg-blue-50/40 text-blue-900',
            },
            {
              state: '9. Öz-Değer ve Görünüm Hassasiyeti',
              source: 'Kamera Kullanım Sıklığı, Galeri Çekim-Silme Döngüsü & EMA',
              threshold: '30 dk içinde kamera açılışı 🔺 5 kez veya çekim-silme oranı >%60 (hızlı silme patlaması)',
              duration: 'Beden dismorfisi/onay arama döngüsü ve oturum sonrası EMA afektinde 🔻 2 puan düşüş (McLean et al.; PMC5810159)',
              color: 'border-rose-200 bg-rose-50/40 text-rose-900',
            },
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-2xl border ${item.color} space-y-1.5`}>
              <div className="font-bold flex items-center justify-between text-xs sm:text-[13px]">
                <span>{item.state}</span>
              </div>
              <div className="text-[11px] font-semibold opacity-80">{item.source}</div>
              <p className="text-[11px] leading-relaxed font-medium">
                <strong>Eşik:</strong> {item.threshold}
              </p>
              <div className="text-[10px] opacity-75 italic">
                {item.duration}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-comus-sand-dark italic border-t border-comus-sand-light/20 pt-2.5">
          * Bu analizler teşhis amacı taşımaz, bilimsel literatürle doğrulanmış korelasyonlara dayalı farkındalık içgörüleridir.
        </div>
      </div>
      
      {/* Erken Bilişsel Değişim Kriterleri İçgörü Kartı (MCI) */}
      <InsightsTab />
    </div>
  );
};
