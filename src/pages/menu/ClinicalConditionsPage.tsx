import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Share2, Check, Sparkles } from 'lucide-react';
import { InsightsTab } from '../../components/InsightsTab';
import { shareContent } from '../../services/shareService';

const CLINICAL_CONDITIONS = [
  {
    state: '1. Potansiyel Duygusal Tükenmişlik (Burnout)',
    plainSummary: 'Yazım hızındaki yavaşlama ve artan düzeltmeler üzerinden zihinsel yorgunluğu izler.',
    source: 'Klavye Hold Time, IKI ve Silme Oranı',
    threshold: 'Hold Time 🔺 +2.0σ (>140 ms) ve silme oranı >%25 artış',
    duration: 'Ardışık 3 gün devam ettiğinde kritik eşik uyarısı (Moon et al., 2025; Short et al., 2025)',
    color: 'border-amber-200 bg-amber-50/40 text-amber-900',
  },
  {
    state: '2. Potansiyel Depresyon ve Sosyal İzolasyon',
    plainSummary: 'Evde kalış süresi ve dış dünya hareketliliğindeki daralmayı takip eder.',
    source: 'GPS Homestay %, Gyration Yarıçapı & Hareketlilik Endeksi',
    threshold: 'Homestay 🔺 %85 (veya +1.8σ) ve yarıçapta 🔻 -2.0σ daralma',
    duration: 'Ardışık 3 gün devam ettiğinde kritik eşik uyarısı (Guth et al., 2025; Aalbers et al., 2025)',
    color: 'border-rose-200 bg-rose-50/40 text-rose-900',
  },
  {
    state: '3. Potansiyel Anksiyete ve Uyku Bozuklukları',
    plainSummary: 'Gece 02:00-04:00 arası uyanıklık ve uykuya dalma süresindeki uzamayı gözlemler.',
    source: '02:00-04:00 Gece Penceresi & Apple Sağlık SOL / WASO',
    threshold: '02:00-04:00 arası >25 dk (+1.8σ) kullanım veya SOL 🔺 ≥30 dk uzama',
    duration: 'Son 7 günün en az 3 gecesinde kritik eşik uyarısı (Lee et al., 2025)',
    color: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
  },
  {
    state: '4. Potansiyel Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı)',
    plainSummary: 'Kısa oturum süreleri ile yüksek dokunma ve yazım duraksaması yoğunluğunu izler.',
    source: 'Uygulama İçi Mikro-Oturum Süresi, Dokunma Sıklığı & Duraksama',
    threshold: 'Ortalama oturum <40 sn (-1.5σ) ve dokunma/duraksama sıklığı 🔺 +1.7σ',
    duration: 'Ardışık 3 günde saptandığında kritik eşik uyarısı (Wang et al., 2024; StudentLife)',
    color: 'border-teal-200 bg-teal-50/40 text-teal-900',
  },
  {
    state: '5. Potansiyel Bilişsel İcra Hızı ve Ritim Değişimi',
    plainSummary: 'Yazım duraksamaları ve günlük sirkadiyen uyku verimliliğini takip eder.',
    source: 'Klavye IKI, Duraksamalar (>1200 ms) & Uyku Verimliliği',
    threshold: 'IKI aralığında sürekli artış (Z 🔺 +2.0σ) ve uyku verimliliği <%65',
    duration: 'Ardışık 7 gün (veya +2.3σ ile 3 gün) devam ettiğinde kritik eşik uyarısı (Boyle et al., 2025)',
    color: 'border-slate-200 bg-slate-50 text-slate-800',
  },
  {
    state: '6. Potansiyel PTSD Belirtileri (Hipervijilans)',
    plainSummary: 'Aşırı sık dokunma/kontrol yoğunluğu, gece uyanıklığı ve el titremesi örüntüsünü izler.',
    source: 'Dokunma Sıklığı, İvmeölçer Tremor Varyansı & Gece Kullanımı',
    threshold: 'Dokunma sıklığı 🔺 +2.0σ ve Tremor (+1.5σ) veya Gece Kullanımı (+1.6σ) artışı',
    duration: 'Ardışık 3 gün yüksek uyarılma hali saptandığında kritik eşik uyarısı (Torous et al., 2024)',
    color: 'border-purple-200 bg-purple-50/40 text-purple-900',
  },
  {
    state: '7. Potansiyel Düşük Özsaygı & Pasif Ekran Tüketimi',
    plainSummary: 'Uzun ekran süresine karşın düşük aktif dokunma etkileşimi ve duygu değişimini izler.',
    source: 'Günlük Ekran Süresi, Düşük Dokunma Sıklığı, Gece Kullanımı & EMA',
    threshold: 'Ekran süresi >120 dk (+1.6σ), dokunma sıklığı 🔻 -1.5σ ve gece >30 dk / düşük EMA',
    duration: 'Ardışık 3 gün devam ettiğinde kritik eşik uyarısı (Kadirvelu et al., 2025; Ekstrom, 2025)',
    color: 'border-stone-200 bg-stone-50 text-stone-800',
  },
];

interface ClinicalConditionsPageProps {
  embedded?: boolean;
}

export const ClinicalConditionsPage: React.FC<ClinicalConditionsPageProps> = ({
  embedded = false,
}) => {
  const navigate = useNavigate();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShareDetails = async () => {
    const lines = [
      'Erken Farkındalık Sağlanan 7 Klinik Durum & Biyobelirteç Rehberi',
      '',
      ...CLINICAL_CONDITIONS.map(
        (c) => `${c.state}\n• Özet: ${c.plainSummary}\n• Kaynak: ${c.source}\n• Eşik: ${c.threshold} (${c.duration})`
      ),
      '',
      '* Bu analizler kesinlikle tıbbi teşhis amacı taşımaz; erken farkındalık öngörüleridir.',
    ];
    const res = await shareContent({
      title: '7 Klinik Durum ve Biyobelirteç Rehberi',
      text: lines.join('\n'),
    });
    if (res.success) {
      setShareFeedback(res.method === 'clipboard' ? 'Panoya Kopyalandı' : 'Paylaşıldı');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6 pb-20'}>
      {!embedded ? (
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/menu')}
              className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-comus-navy">7 Klinik Durum</h1>
          </div>
          <button
            type="button"
            onClick={handleShareDetails}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-comus-navy text-xs font-semibold border border-stone-200/80 shadow-2xs transition-colors cursor-pointer"
          >
            {shareFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">{shareFeedback}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-comus-copper" />
                <span>Ayrıntıları Paylaş</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleShareDetails}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-comus-navy text-xs font-semibold border border-stone-200/80 shadow-2xs transition-colors cursor-pointer"
          >
            {shareFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">{shareFeedback}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-comus-copper" />
                <span>Ayrıntıları Paylaş</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Sadeleştirilmiş Özet Kartı */}
      <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-comus-copper/15 text-comus-copper flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-comus-navy">
              Erken Farkındalık Sağlanan 7 Davranışsal Örüntü
            </h3>
            <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
              Uygulama; uyku, hareket, klavye ritmi ve ekran alışkanlıklarınızdaki değişimleri 7 temel alanda gerçek sensör verileriyle izler. Herhangi bir alanda kişisel ortalamanızdan birkaç gün süren belirgin bir sapma olduğunda teşhis koymadan nazik bir farkındalık önerisi sunar.
            </p>
          </div>
        </div>

        {/* Sade özet rozetleri */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {CLINICAL_CONDITIONS.slice(0, 3).map((item, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1">
              <div className="font-bold text-comus-navy text-xs">{item.state}</div>
              <p className="text-[11px] text-comus-sand-dark leading-relaxed">{item.plainSummary}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsDetailsExpanded((prev) => !prev)}
          aria-expanded={isDetailsExpanded}
          className="w-full py-3 px-4 rounded-2xl bg-comus-navy text-white hover:bg-comus-navy/90 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <span>
            {isDetailsExpanded
              ? 'Teknik Eşikleri ve Ayrıntıları Gizle'
              : 'İncele (7 Klinik Durum ve Teknik Eşikler)'}
          </span>
          {isDetailsExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* İncele Tıklandığında Aşağıya Doğru Açılan Tam Görünüm */}
      {isDetailsExpanded && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-comus-navy">
                  Erken Farkındalık Sağlanan 7 Klinik Durum &amp; Biyobelirteçler
                </h3>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Cihaz etkileşimlerinizden klinikte tanınan davranışsal örüntülere kurulan köprü. İlgili biyobelirteçler kritik gün eşiğine ulaştığında kesinlik belirtmeden (&ldquo;potansiyel&rdquo; / &ldquo;olabilir&rdquo;) erken farkındalık bildirimi gönderilir ve Kişisel Zihin Yansıması&rsquo;nda yanıp sönen uyarı olarak gösterilir.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {CLINICAL_CONDITIONS.map((item, idx) => (
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
              * Bu analizler kesinlikle tıbbi teşhis amacı taşımaz; biyobelirteç istatistik verilerine dayalı olarak &ldquo;potansiyel&rdquo; ve &ldquo;olabilir&rdquo; kapsamında sunulan erken farkındalık öngörüleridir.
            </div>
          </div>

          {/* Erken Bilişsel Değişim Kriterleri İçgörü Kartı (MCI) */}
          <InsightsTab />
        </div>
      )}
    </div>
  );
};

