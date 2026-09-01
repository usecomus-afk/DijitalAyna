import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  ShieldCheck,
  Building2,
  GraduationCap,
  Trees,
  Coffee,
  BookOpen,
  ArrowRight,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import { Disclaimer } from '../components/common/Disclaimer';

interface PlaceCalmCard {
  id: string;
  name: string;
  category: 'park' | 'cafe' | 'library' | 'coast' | 'campus';
  calmScore: number;       // 0-100
  focusScore: number;      // 0-100
  stressLevel: 'Düşük' | 'Orta' | 'Dengeli';
  distance: string;
  crowdLevel: string;
  recommendationQuote: string;
}

const PLACES_DATA: PlaceCalmCard[] = [
  {
    id: '1',
    name: 'Sahil Kordon Bandı & Yürüyüş Yolu',
    category: 'coast',
    calmScore: 89,
    focusScore: 72,
    stressLevel: 'Düşük',
    distance: '1.2 km',
    crowdLevel: 'Ferah & Sakin',
    recommendationQuote: 'Şu an sahil bandındaki kullanıcıların huzur endeksi şehir merkezinden %40 daha yüksek. Zihnini boşaltmak için en ideal duygusal durak.',
  },
  {
    id: '2',
    name: 'Merkez Kütüphane & Araştırma Salonu',
    category: 'library',
    calmScore: 92,
    focusScore: 95,
    stressLevel: 'Düşük',
    distance: '800 m',
    crowdLevel: 'Sessiz & Odaklı',
    recommendationQuote: 'Cumartesi öğleden sonraları %92 "odaklanma ve sükunet" skoruna sahip. Derin çalışma (Deep Work) için mükemmel iklim.',
  },
  {
    id: '3',
    name: 'Botanika Botanik Parkı & Koruluk',
    category: 'park',
    calmScore: 86,
    focusScore: 68,
    stressLevel: 'Düşük',
    distance: '2.4 km',
    crowdLevel: 'Doğal & Dingin',
    recommendationQuote: 'Kullanıcıların %85\'i şu an yüksek huzur ve düşük kas gerilimi (mikro-tremor stabil) seviyesinde.',
  },
  {
    id: '4',
    name: 'Akış (Flow) Kitap & Kahve Evi',
    category: 'cafe',
    calmScore: 81,
    focusScore: 88,
    stressLevel: 'Dengeli',
    distance: '450 m',
    crowdLevel: 'Hafif Arka Plan Uğultusu',
    recommendationQuote: 'Yumuşak akustik ortam ve düşük ekran stresi frekansı. Yaratıcı yazım ve düşünme molası için uygun.',
  },
];

export const CalmRoutePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'coast' | 'library' | 'park' | 'cafe'>('all');
  const [activeTab, setActiveTab] = useState<'city' | 'workplace' | 'campus'>('city');
  const [selectedPlace, setSelectedPlace] = useState<PlaceCalmCard>(PLACES_DATA[0]);

  const filteredPlaces = selectedCategory === 'all'
    ? PLACES_DATA
    : PLACES_DATA.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h1 className="font-serif font-bold text-2xl text-comus-navy">
              Huzur Rotası & Duygusal Hava Durumu
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-comus-sand-dark mt-1">
            Google Maps'in trafik yoğunluğu yerine "toplumsal esenlik ve sükunet" haritası sunması
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-comus-surface p-1 rounded-2xl border border-comus-sand-light/40 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('city')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'city'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Şehir Röntgeni
          </button>
          <button
            onClick={() => setActiveTab('workplace')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'workplace'
                ? 'bg-comus-navy text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Ofis İklimi
          </button>
          <button
            onClick={() => setActiveTab('campus')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'campus'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Kampüs Almanak
          </button>
        </div>
      </div>

      {activeTab === 'city' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Recommendation Banner (From Slide 23) */}
          <div className="bg-gradient-to-r from-teal-900 to-comus-navy text-white rounded-3xl p-5 sm:p-6 shadow-soft-lg relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-teal-300 flex items-center justify-center shrink-0">
                <Navigation className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                    Anlık Rota Tavsiyesi (PDF Sayfa 23)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-400/30 font-semibold">
                    Huzur Endeksi: +%40
                  </span>
                </div>
                <blockquote className="font-serif text-base sm:text-lg leading-relaxed text-white/95 italic">
                  "{selectedPlace.recommendationQuote}"
                </blockquote>
                <div className="flex items-center gap-3 text-xs text-white/70 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <strong>{selectedPlace.name}</strong> ({selectedPlace.distance})
                  </span>
                  <span>•</span>
                  <span>Sükunet Skoru: %{selectedPlace.calmScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Map Visual (Stylized Canvas/SVG heatmap representing Slide 22) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-comus-navy flex items-center gap-2">
                  <span>Şehrin Psikolojik Röntgeni (Duygusal Isı Haritası)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-normal">
                    Canlı Agregasyon
                  </span>
                </h3>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Biyobelirteçler (stres, odaklanma, huzur endeksleri) coğrafi katmanlarla birleştirildi
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {(['all', 'coast', 'library', 'park', 'cafe'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-teal-700 text-white'
                        : 'bg-comus-surface text-comus-sand-dark hover:text-comus-navy border border-comus-sand-light/40'
                    }`}
                  >
                    {cat === 'all' && 'Tümü'}
                    {cat === 'coast' && 'Sahil'}
                    {cat === 'library' && 'Kütüphane'}
                    {cat === 'park' && 'Park'}
                    {cat === 'cafe' && 'Sakin Kafe'}
                  </button>
                ))}
              </div>
            </div>

            {/* Stylized Emotional Map Container */}
            <div className="relative w-full h-64 sm:h-72 rounded-2xl bg-[#f4f7f6] overflow-hidden border border-teal-900/10 flex items-center justify-center select-none shadow-inner">
              {/* Map grid streets simulation */}
              <svg className="absolute inset-0 w-full h-full stroke-slate-200" strokeWidth="1">
                <line x1="15%" y1="0" x2="15%" y2="100%" />
                <line x1="45%" y1="0" x2="45%" y2="100%" />
                <line x1="75%" y1="0" x2="75%" y2="100%" />
                <line x1="0" y1="30%" x2="100%" y2="30%" />
                <line x1="0" y1="65%" x2="100%" y2="65%" />
                <line x1="0" y1="85%" x2="100%" y2="85%" />
              </svg>

              {/* Water Coastline on the right/bottom */}
              <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-sky-100/60 border-l border-sky-200 flex items-center justify-center">
                <span className="text-[11px] text-sky-700 font-semibold tracking-wider -rotate-90">
                  Sahil Şeridi (Mavi Alan)
                </span>
              </div>

              {/* Calm Heat Glows (Slide 22 visual reproduction) */}
              <div className="absolute left-[20%] top-[40%] w-40 h-40 rounded-full bg-emerald-400/25 blur-2xl pointer-events-none animate-pulse" />
              <div className="absolute right-[28%] top-[25%] w-36 h-36 rounded-full bg-teal-400/30 blur-2xl pointer-events-none" />
              <div className="absolute left-[40%] top-[70%] w-32 h-32 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

              {/* Map Pins */}
              {PLACES_DATA.map((p, idx) => {
                const positions = [
                  { left: '78%', top: '35%' }, // Coast
                  { left: '42%', top: '32%' }, // Library
                  { left: '22%', top: '48%' }, // Park
                  { left: '46%', top: '68%' }, // Cafe
                ];
                const pos = positions[idx];
                const isSelected = selectedPlace.id === p.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlace(p)}
                    style={{ left: pos.left, top: pos.top }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 ${
                      isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                    }`}
                  >
                    <div
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold shadow-soft-lg flex items-center gap-1.5 border transition-all ${
                        isSelected
                          ? 'bg-teal-800 text-white border-white ring-2 ring-teal-500'
                          : 'bg-white text-comus-navy border-teal-200/80 hover:bg-teal-50'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="whitespace-nowrap">{p.name.split(' ')[0]}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        %{p.calmScore}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-comus-sand-light/40 text-[10px] space-y-1 shadow-sm">
                <div className="font-bold text-comus-navy">Duygusal Yoğunluk Lejantı</div>
                <div className="flex items-center gap-2 text-comus-sand-dark">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Yüksek Sükunet (%80+)</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ml-1" />
                  <span>Derin Odak (%85+)</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-1" />
                  <span>Şehir Temposu</span>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Banner from Slide 22 */}
            <div className="p-3.5 rounded-2xl bg-comus-sand-subtle/80 border border-comus-sand-light/30 flex items-start gap-2.5 text-xs text-comus-sand-dark">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-comus-navy">Veri Gizliliği Garantisi (PDF Sayfa 22):</strong> Sistem asla
                "Ahmet şu an burada ve mutsuz" demez. Bunun yerine, "Bu parkta bulunan kullanıcıların %85'i şu an yüksek
                huzur seviyesinde" gibi <strong>tamamen anonim ve toplu</strong> veriler sunar.
              </div>
            </div>
          </div>

          {/* Place Cards Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-soft hover:shadow-soft-lg space-y-3 ${
                  selectedPlace.id === place.id
                    ? 'border-teal-600 ring-1 ring-teal-600/30'
                    : 'border-comus-sand-light/30 hover:border-teal-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      {place.category === 'coast' && <Trees className="w-4 h-4 text-sky-600" />}
                      {place.category === 'library' && <BookOpen className="w-4 h-4 text-indigo-600" />}
                      {place.category === 'park' && <Trees className="w-4 h-4 text-emerald-600" />}
                      {place.category === 'cafe' && <Coffee className="w-4 h-4 text-amber-700" />}
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-comus-navy">{place.name}</h4>
                      <div className="text-[11px] text-comus-sand-dark flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-comus-copper" />
                        <span>{place.distance} uzaklıkta</span>
                        <span>•</span>
                        <span>{place.crowdLevel}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    %{place.calmScore} Huzur
                  </span>
                </div>

                <p className="text-xs text-comus-navy/80 italic bg-comus-surface p-2.5 rounded-xl border border-comus-sand-light/20">
                  "{place.recommendationQuote}"
                </p>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-comus-sand-light/20">
                  <span className="text-comus-sand-dark">
                    Odaklanma Skoru: <strong className="text-comus-navy">%{place.focusScore}</strong>
                  </span>
                  <button className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1">
                    <span>Rotayı Seç</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Duygusal Ofis İklimi (Slide 24) */}
      {activeTab === 'workplace' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-comus-navy">
                  Duygusal Ofis İklimi (PDF Sayfa 24)
                </h3>
                <p className="text-xs text-comus-sand-dark">
                  Kurumsal İK raporlaması ve çalışan odaklı akış (flow) optimizasyonu
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* IK Report Card */}
              <div className="p-4 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-comus-copper">
                  Kurumsal İK Öngörüsü
                </span>
                <p className="text-xs text-comus-navy leading-relaxed">
                  "Ofisin B blok toplantı odaları bölgesinde bugün genel gerginlik seviyesi yüksek. Yaratıcı ve stratejik işler için bugün A blok dinlenme alanları ve teras daha verimli."
                </p>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Veriye dayalı dinamik alan yönetimi</span>
                </div>
              </div>

              {/* Employee Flow Experience Card */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  Çalışan Deneyimi Bildirimi
                </span>
                <p className="text-xs text-teal-950 leading-relaxed">
                  "Şu an çalıştığın masada çevresel stres faktörleri artmış görünüyor. Ofisin teras katında 'akış' (flow) hali yaşayanların oranı %88. Yerini değiştirmek ister misin?"
                </p>
                <button className="text-xs text-white bg-teal-700 hover:bg-teal-800 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                  Teras Masası Ayır
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Kampüs Duygusal Almanak (Slide 24) */}
      {activeTab === 'campus' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-comus-navy">
                  Duygusal Almanak (Dönemsel Raporlar - PDF Sayfa 24)
                </h3>
                <p className="text-xs text-comus-sand-dark">
                  Sınav haftası kaygı takibi ve gayrimenkul/şehir planlama analizleri
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-950 font-bold">
                <span>Üniversite Kampüsü Sınav Haftası Örneği</span>
                <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Kaygı: +%60</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                "Üniversite kampüsü çevresinde kaygı seviyesi bu hafta %60 arttı. Kampüs içindeki <strong>'Sessiz Bahçe'</strong> şu an bölgenin en düşük stresli noktası. Rehberlik birimi için açık hava nefes atölyesi önerilir."
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-2 text-xs text-comus-navy leading-relaxed">
              <span className="text-[10px] font-bold uppercase tracking-wider text-comus-copper">
                Gayrimenkul ve Şehir Planlama İçgörüsü
              </span>
              <p>
                "X mahallesinde akşam saatlerinde 'yalnızlık ve kaygı' biyobelirteçleri artıyor. Yerel yönetimler buraya daha fazla aydınlatma, güvenli yürüyüş parkuru ve sosyal alan ekleme kararlarını DutyAI anonim verileriyle alabilir."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
};
