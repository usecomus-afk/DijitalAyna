import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { QuickMoodWidget } from '../components/dashboard/QuickMoodWidget';
import { db } from '../db';
import { shareContent } from '../services/shareService';

export const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const [isTestsExpanded, setIsTestsExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const latestMood = useLiveQuery(async () => {
    const entries = await db.moodReports.orderBy('timestamp').reverse().limit(1).toArray();
    return entries[0] ?? null;
  });

  const latestSurvey = useLiveQuery(async () => {
    const surveys = await db.clinicalSurveyResults.orderBy('timestamp').reverse().limit(1).toArray();
    return surveys[0] ?? null;
  });

  const handleShareSummary = async () => {
    const lines = [
      'Nasıl Hissediyorsun? — Duygu ve Değerlendirme Özeti',
      latestMood
        ? `• Son Duygu Kaydı (${latestMood.date}): Duygu Puanı ${latestMood.score}/5${
            latestMood.tags?.length ? ` (${latestMood.tags.join(', ')})` : ''
          }`
        : '• Son Duygu Kaydı: Henüz kayıt girilmedi',
      latestSurvey
        ? `• Son Klinik Ölçek (${latestSurvey.date}): GAD-7=${latestSurvey.gad7Score}/21 (${latestSurvey.gad7Risk}), PHQ-9=${latestSurvey.phq9Score}/27 (${latestSurvey.phq9Risk})`
        : '• Son Klinik Ölçek: Henüz test tamamlanmadı',
    ];
    const res = await shareContent({
      title: 'Duygu ve Değerlendirme Özeti',
      text: lines.join('\n'),
    });
    if (res.success) {
      setShareFeedback(res.method === 'clipboard' ? 'Kopyalandı' : 'Paylaşıldı');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-comus-navy pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-comus-sand-light/30 shadow-sm safe-top">
        <div className="px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold font-serif text-comus-navy flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-comus-copper" />
            Nasıl Hissediyorsun?
          </h1>
          <button
            type="button"
            onClick={handleShareSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-comus-navy text-xs font-semibold border border-stone-200/80 transition-colors cursor-pointer"
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
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Kendini nasıl hissediyorsun? — Instant Mood Check-In Widget */}
        <QuickMoodWidget />

        {/* Psychological Tests — Sadeleştirilmiş & İncele ile Aşağıya Açılan Kart */}
        <div className="bg-white rounded-3xl p-5 border border-comus-sand-light/30 shadow-soft space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-comus-navy">Psikolojik Değerlendirme</h3>
              <p className="text-xs text-comus-sand-dark mt-0.5 leading-relaxed">
                İsterseniz klinik geçerliliği olan kısa ölçeklerle (GAD-7 ve PHQ-9) durumunuzu daha ayrıntılı inceleyebilir ve geçmiş sonuçlarınızı karşılaştırabilirsiniz.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTestsExpanded((prev) => !prev)}
            aria-expanded={isTestsExpanded}
            className="w-full py-2.5 px-4 rounded-2xl bg-comus-navy text-white hover:bg-comus-navy/90 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <span>
              {isTestsExpanded
                ? 'Değerlendirme Seçeneklerini Gizle'
                : 'İncele (Klinik Testler ve Geçmiş Sonuçlar)'}
            </span>
            {isTestsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isTestsExpanded && (
            <div className="space-y-3 pt-2 border-t border-comus-sand-light/20 animate-fadeIn">
              <button
                onClick={() => navigate('/assessment')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 hover:shadow-md transition-shadow text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">Anksiyete &amp; Depresyon Testi</h4>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">GAD-7 ve PHQ-9 Kriterleri (16 Soru)</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/menu/clinical-survey')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 hover:shadow-md transition-shadow text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Geçmiş Test Sonuçları</h4>
                    <p className="text-[11px] text-indigo-700/80 mt-0.5">Trend analizi ve risk bantları</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

