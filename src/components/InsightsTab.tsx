import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Brain, FileText, AlertCircle, BookOpen, Check } from 'lucide-react';
import { db } from '../db';
import { PinnedInsight } from '../services/reportBuilder';

const INSIGHT_TITLE = 'Bilişsel İcra ve Ritim Farkındalığı';
const INSIGHT_SUBTITLE = 'Hafıza Takibi, Dilsel Akıcılık ve Sirkadiyen Uyum';
const INSIGHT_THRESHOLD =
  'Eşzamanlı dilsel duraksama (pause >2000ms), sirkadiyen düzensizlik (SRI <%60) ve rutin atlama sapması saptandığında.';
const INSIGHT_BODY =
  'Son haftalarda hatırlatıcı takibi, yazım duraksamaları ve günlük ritim düzenliliğinde kişisel bazal ortalamanızdan farklılaşan bir eğilim tespit edildi. Modern dijital fenotipleme literatüründe bu göstergeler zihinsel yorgunluk, metabolik etkenler veya bilişsel icra yavaşlaması ihtimaline işaret edebilir. Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir.';
const INSIGHT_SOURCES = ['McKenna et al. (2025)', 'Al-Hindawi et al. (2025)', 'Boyle et al. (2025)', 'Moon et al. (2025)'];

export const InsightsTab: React.FC = () => {
  const navigate = useNavigate();
  const pinnedItem = useLiveQuery(() => db.settings.get('doctor_report_pinned'));
  const pinned: PinnedInsight[] = Array.isArray(pinnedItem?.value) ? pinnedItem.value : [];
  const alreadyPinned = pinned.some((p) => p.title === INSIGHT_TITLE);
  const [error, setError] = useState<string | null>(null);

  const handleAddToReport = async () => {
    setError(null);
    try {
      if (!alreadyPinned) {
        const entry: PinnedInsight = {
          title: INSIGHT_TITLE,
          body: INSIGHT_BODY,
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
    <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-soft relative overflow-hidden mt-4">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Brain className="w-24 h-24 text-amber-600" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">{INSIGHT_TITLE}</h3>
            <p className="text-sm font-medium text-amber-700">{INSIGHT_SUBTITLE}</p>
          </div>
        </div>

        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-2">
          <div className="text-xs font-semibold text-amber-800">Eşik Özeti:</div>
          <p className="text-xs text-amber-900 leading-relaxed">{INSIGHT_THRESHOLD}</p>
        </div>

        <p className="text-sm text-comus-sand-dark leading-relaxed">"{INSIGHT_BODY}"</p>

        <div className="flex items-start gap-2 text-xs text-comus-sand-dark italic border-t border-comus-sand-light/20 pt-3 mt-1">
          <BookOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
          <span>Kaynak: {INSIGHT_SOURCES.join('; ')}.</span>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddToReport}
            className="w-full flex items-center justify-center gap-2 bg-comus-navy text-white py-3 rounded-2xl font-medium text-sm transition-transform active:scale-95 hover:bg-comus-navy/90 cursor-pointer"
          >
            {alreadyPinned ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {alreadyPinned ? 'Rapora Eklendi — Raporu Aç' : 'Hekim Paylaşım Raporuna Ekle (PDF)'}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
