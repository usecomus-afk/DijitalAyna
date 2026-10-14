import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Brain, FileText, AlertCircle, BookOpen, Check, CheckCircle2 } from 'lucide-react';
import { db } from '../db';
import { calculateZScore } from '../engine/anomaly';
import { PinnedInsight } from '../services/reportBuilder';

const INSIGHT_TITLE = 'Bilişsel İcra ve Ritim Farkındalığı';
const INSIGHT_SUBTITLE = 'Hafıza Takibi, Dilsel Akıcılık ve Sirkadiyen Uyum';
const INSIGHT_THRESHOLD =
  'Eşzamanlı dilsel duraksama (pause >1200ms), tuş geçiş süresinde uzama (IKI Z ≥ +2.0σ) ve sirkadiyen uyku verimliliği (<%65) sapması saptandığında.';
const INSIGHT_SOURCES = ['McKenna et al. (2025)', 'Al-Hindawi et al. (2025)', 'Boyle et al. (2025)', 'Moon et al. (2025)'];

export const InsightsTab: React.FC = () => {
  const navigate = useNavigate();
  const pinnedItem = useLiveQuery(() => db.settings.get('doctor_report_pinned'));
  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const insights = useLiveQuery(() => db.insights.toArray()) || [];

  const pinned: PinnedInsight[] = Array.isArray(pinnedItem?.value) ? pinnedItem.value : [];
  const alreadyPinned = pinned.some((p) => p.title === INSIGHT_TITLE);
  const [error, setError] = useState<string | null>(null);

  const evaluation = useMemo(() => {
    const baselineMap = new Map(
      baselines.filter((b) => (b.sampleCount ?? 0) > 0).map((b) => [b.metricKey, b])
    );

    // Check if an active cognitive insight already exists in db.insights
    const activeCognitiveInsight = insights.find(
      (i) =>
        i.biomarkerType === 'cognitive-decline-alert' ||
        i.biomarkerType.startsWith('cognitive-pattern')
    );

    // Find latest typing_iki, typing_pause_count, and sleep_efficiency values
    let latestDate = '';
    for (const m of dailyMetrics) {
      if (m.date > latestDate) latestDate = m.date;
    }

    const latestMetrics = new Map(
      dailyMetrics.filter((m) => m.date === latestDate).map((m) => [m.metricKey, m.value])
    );

    const ikiVal = latestMetrics.get('typing_iki');
    const pauseVal = latestMetrics.get('typing_pause_count');
    const sleepEffVal = latestMetrics.get('sleep_efficiency');

    const ikiBase = baselineMap.get('typing_iki');
    const pauseBase = baselineMap.get('typing_pause_count');

    const zIki =
      ikiVal !== undefined && ikiBase ? calculateZScore(ikiVal, ikiBase.ewmaMean, ikiBase.ewmaStd) : null;
    const zPause =
      pauseVal !== undefined && pauseBase
        ? calculateZScore(pauseVal, pauseBase.ewmaMean, pauseBase.ewmaStd)
        : null;

    const isTriggered =
      Boolean(activeCognitiveInsight) ||
      ((zIki !== null && zIki >= 2.0) &&
        ((zPause !== null && zPause >= 1.6) || (sleepEffVal !== undefined && sleepEffVal < 65)));

    const distinctDays = new Set(dailyMetrics.map((m) => m.date)).size;

    const measuredParts: string[] = [];
    if (ikiVal !== undefined) {
      measuredParts.push(`IKI: ${Math.round(ikiVal)} ms${zIki !== null ? ` (Z: ${zIki >= 0 ? '+' : ''}${zIki.toFixed(1)}σ)` : ''}`);
    }
    if (pauseVal !== undefined) {
      measuredParts.push(`Duraksama: ${Math.round(pauseVal)} adet`);
    }
    if (sleepEffVal !== undefined) {
      measuredParts.push(`Uyku Verimliliği: %${Math.round(sleepEffVal)}`);
    }

    const bodyText = isTriggered
      ? activeCognitiveInsight?.body ||
        `Gerçek cihaz ölçümlerinize göre yazım duraksamaları ve günlük ritim göstergelerinizde kişisel bazal ortalamanızdan farklılaşan bir eğilim tespit edildi (${measuredParts.join(' • ')}). Modern dijital fenotipleme literatüründe bu göstergeler zihinsel yorgunluk veya bilişsel icra yavaşlaması ihtimaline işaret edebilir. Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir.`
      : distinctDays === 0
      ? 'Henüz bu alanda sapma analizi için yeterli klavye ve sirkadiyen ritim verisi toplanmadı. Uygulamayı kullandıkça tuş geçiş süreleriniz (IKI), duraksamalarınız ve uyku verimliliğiniz gerçek verilerle değerlendirilir.'
      : `Mevcut gerçek sensör ölçümlerinizde (${distinctDays} gün${measuredParts.length > 0 ? ` • ${measuredParts.join(' • ')}` : ''}) kritik bilişsel icra veya sirkadiyen ritim sapması saptanmadı. Göstergeleriniz kişisel bazal aralığınızla uyumlu seyrediyor.`;

    return {
      isTriggered,
      distinctDays,
      bodyText,
    };
  }, [dailyMetrics, baselines, insights]);

  const handleAddToReport = async () => {
    setError(null);
    try {
      if (!alreadyPinned) {
        const entry: PinnedInsight = {
          title: INSIGHT_TITLE,
          body: evaluation.bodyText,
          sources: INSIGHT_SOURCES,
          addedAt: Date.now(),
        };
        await db.settings.put({ key: 'doctor_report_pinned', value: [...pinned, entry] });
      }
      navigate('/doctor');
    } catch (err) {
      console.error('[InsightsTab] Add to doctor report failed:', err);
      setError('İçgörü rapora eklenemedi. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl p-5 border shadow-soft relative overflow-hidden mt-4 ${
        evaluation.isTriggered ? 'border-amber-200' : 'border-stone-200/80'
      }`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Brain className={`w-24 h-24 ${evaluation.isTriggered ? 'text-amber-600' : 'text-emerald-600'}`} />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              evaluation.isTriggered
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {evaluation.isTriggered ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">{INSIGHT_TITLE}</h3>
            <p className={`text-sm font-medium ${evaluation.isTriggered ? 'text-amber-700' : 'text-emerald-700'}`}>
              {INSIGHT_SUBTITLE} • {evaluation.isTriggered ? 'Kritik Eşik Uyarısı' : 'Dengeli / İzleniyor'}
            </p>
          </div>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
          <div className="text-xs font-semibold text-comus-navy">Eşik Özeti:</div>
          <p className="text-xs text-comus-sand-dark leading-relaxed">{INSIGHT_THRESHOLD}</p>
        </div>

        <p className="text-sm text-comus-sand-dark leading-relaxed">{evaluation.bodyText}</p>

        <div className="flex items-start gap-2 text-xs text-comus-sand-dark italic border-t border-comus-sand-light/20 pt-3 mt-1">
          <BookOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
          <span>Kaynak: {INSIGHT_SOURCES.join('; ')}.</span>
        </div>

        {(evaluation.isTriggered || alreadyPinned) && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddToReport}
              className="w-full flex items-center justify-center gap-2 bg-comus-navy text-white py-3 rounded-2xl font-medium text-sm transition-transform active:scale-95 hover:bg-comus-navy/90 cursor-pointer"
            >
              {alreadyPinned ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              {alreadyPinned ? 'Rapora Eklendi — Raporu Aç' : 'Hekim Paylaşım Raporuna Ekle'}
            </button>
            {error && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
