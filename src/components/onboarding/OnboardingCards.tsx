import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

interface OnboardingCardData {
  badge: string;
  title: string;
  body: string;
  example?: string;
  highlight?: string;
}

const CARDS: OnboardingCardData[] = [
  {
    badge: 'ADIM 1 / 5 • KİŞİSEL BAZ HATTI',
    title: 'Seni Başkalarıyla Kıyaslamaz, Senin Normalini Öğrenir',
    body:
      'Herkesin biyolojik saati farklıdır. Kimi için günde 6 saat uyku yeterliyken, kimi için 8 saat normaldir. Mental Dijital İkiz sabit genel kalıplar kullanmaz. İlk 14 gün boyunca senin hareket, uyku ve kullanım alışkanlıklarını sessizce izleyerek sadece sana özel bir "olağan durum" (baz hattı) oluşturur.',
    highlight:
      'Sistem, seni ortalama bir insanla değil; bugünkü seni, geçmiş 14 gündeki olağan sen ile kıyaslar.',
  },
  {
    badge: 'ADIM 2 / 5 • UYKU VE SİRKADİYEN RİTİM',
    title: 'Yatakta Geçen Sürenin Sessiz Mesajı',
    body:
      'Apple Sağlık (HealthKit) üzerinden uyku başlangıcını ve uyanıklık evrelerini takip eder. Ekstra hiçbir çaba sarf etmene gerek kalmaz.',
    example:
      'Normalde 15 dakikada uykuya dalarken son 3 gecedir yatakta 50 dakika uyanık kalıyorsan ve gece 02:00–04:00 arasında telefon kilidini açıyorsan; dijital ikizin artan huzursuzluk ve uyku gecikmesi sinyalini sana erkenden hatırlatır.',
  },
  {
    badge: 'ADIM 3 / 5 • COĞRAFİ HAREKETLİLİK',
    title: 'Adımların ve Yaşam Alanının Genişliği',
    body:
      'Nereye gittiğini değil; günlük hareket yarıçapını ve günün ne kadarını evde geçirdiğini pil tüketmeyen akıllı konum kümelemesiyle gözlemler.',
    example:
      'Hafta sonları genelde dışarı çıkıp hareket ederken, son 4 gündür vaktinin %90\'ını evde geçirdiysen ve adım sayın belirgin şekilde düştüyse; dijital ikizin sosyal içe kapanma ve enerji düşüşü eğilimini yakalar.',
  },
  {
    badge: 'ADIM 4 / 5 • BİLİŞSEL VE MOTOR RİTİM',
    title: 'Ne Yazdığına Değil, Nasıl Yazdığına Bakar',
    body:
      'Gizliliğin tamdır; yazdığın kelimeler veya harfler asla kaydedilmez. Yalnızca tuşa basılı tutma süren (milisaniye) ve silme tuşunu kullanma sıklığın ölçülür.',
    example:
      'Uygulama içine günlük notunu yazarken tuşlara basılı tutma süren olağandan belirgin şekilde uzadıysa ve sık sık silip baştan yazıyorsan; bu durum zihinsel yorgunluk ve dikkat dalgalanmasının bir yansıması olabilir.',
  },
  {
    badge: 'ADIM 5 / 5 • DİJİTAL AYNA & KLİNİK RAPOR',
    title: 'Teşhis Koymaz, Tedaviye Işık Tutar',
    body:
      "Mental Dijital İkiz bir tıbbi teşhis aracı değildir; 'depresyondasın' demez. Yaşadığın duygu durum dalgalanmalarını nesnel verilerle görünür kılar.",
    example:
      'Özellikle yeni bir psikiyatri ilacına başladığında veya doktorun doz değiştirdiğinde, bu değişimin biyobelirteçlerine nasıl yansıdığını gösteren 1 sayfalık Hekim Raporu (PDF) oluşturabilir ve seansında doktorunla paylaşabilirsin.',
  },
];

const SWIPE_THRESHOLD_PX = 50;

interface OnboardingCardsProps {
  onComplete: () => void;
}

export const OnboardingCards: React.FC<OnboardingCardsProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isLast = index === CARDS.length - 1;

  const goNext = () => setIndex((i) => Math.min(i + 1, CARDS.length - 1));
  const goBack = () => setIndex((i) => Math.max(i - 1, 0));

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch (err) {
      console.warn('[OnboardingCards] localStorage write error:', err);
    }
    onComplete();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Ignore mostly vertical gestures (scrolling)
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goBack();
  };

  return (
    <div
      className="min-h-screen bg-comus-bg text-comus-navy flex flex-col px-5 py-6 font-sans"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Progress */}
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-comus-navy/70">
            Adım {index + 1} / {CARDS.length}
          </span>
          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="text-xs font-semibold text-comus-copper hover:text-comus-copper-dark cursor-pointer"
            >
              Atla
            </button>
          )}
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={CARDS.length} aria-valuenow={index + 1}>
          {CARDS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= index ? 'bg-comus-copper' : 'bg-comus-navy/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card (swipeable) */}
      <div
        className="flex-1 flex items-center w-full max-w-md mx-auto py-5"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-full overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {CARDS.map((card, i) => (
              <article
                key={card.badge}
                aria-hidden={i !== index}
                className="w-full shrink-0 px-1"
              >
                <div className="bg-white rounded-[28px] p-6 shadow-soft border border-comus-copper/20">
                  <p className="text-[11px] font-bold tracking-wider text-comus-copper mb-3">{card.badge}</p>
                  <h1 className="font-serif text-2xl font-bold leading-snug text-comus-navy mb-3">
                    {card.title}
                  </h1>
                  <p className="text-sm leading-relaxed text-comus-navy/80">{card.body}</p>

                  {card.example && (
                    <div className="mt-4 rounded-2xl bg-comus-copper-subtle p-4 border border-comus-copper/20">
                      <p className="text-[11px] font-bold tracking-wide text-comus-copper-dark mb-1">ÖRNEK</p>
                      <p className="text-[13px] leading-relaxed italic text-comus-navy/85">"{card.example}"</p>
                    </div>
                  )}

                  {card.highlight && (
                    <div className="mt-4 rounded-2xl bg-comus-navy p-4">
                      <p className="text-[13px] leading-relaxed font-semibold text-amber-200">"{card.highlight}"</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-md mx-auto flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={index === 0}
          className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl bg-white border border-comus-navy/10 text-sm font-semibold text-comus-navy disabled:opacity-40 cursor-pointer active:scale-[0.98] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={finish}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-comus-copper hover:bg-comus-copper-dark text-white text-sm font-bold shadow-soft cursor-pointer active:scale-[0.98] transition"
          >
            <Sparkles className="w-4 h-4" />
            Mental Dijital İkiz'e Başla
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-comus-navy hover:bg-comus-navy-dark text-white text-sm font-bold shadow-soft cursor-pointer active:scale-[0.98] transition"
          >
            İleri
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingCards;
