import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Compass, Share2, Check } from 'lucide-react';
import { Insight } from '../../types/engine';
import { EvidenceChart } from './EvidenceChart';
import { db } from '../../db';
import { shareContent } from '../../services/shareService';

interface InsightCardProps {
  insight: Insight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | undefined>(insight.feedback);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleFeedback = async (val: 'helpful' | 'not_helpful') => {
    setFeedback(val);
    if (insight.id) {
      await db.insights.update(insight.id, { feedback: val });
    }
  };

  const [isAddedToReport, setIsAddedToReport] = useState<boolean>(false);

  const handleToggleReport = () => {
    setIsAddedToReport(!isAddedToReport);
  };

  const handleShare = async () => {
    const result = await shareContent({
      title: `Duty-Comus Farkındalık Notu: ${insight.title}`,
      text: `${insight.title}\n\n${insight.body}\n\nÖneri: ${insight.suggestedAction}\n\n* Bu bir teşhis değil, istatistiksel bir farkındalık içgörüsüdür.`,
    });

    setShareFeedback(result.message);
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const severityStyles = {
    high: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      label: 'Yüksek Öncelikli İçgörü',
    },
    medium: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Farkındalık Sinyali',
    },
    low: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Denge Durumu',
    },
  };

  const currentStyle = severityStyles[insight.severity] || severityStyles.medium;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20 hover:shadow-soft-lg transition-all duration-300">
      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle.badge}`}>
            {currentStyle.label}
          </span>
          <span className="text-xs text-comus-sand-dark">
            {insight.date}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleReport}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl transition-all font-medium ${
              isAddedToReport
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-comus-surface hover:bg-comus-sand-subtle text-comus-navy border border-comus-sand-light/30'
            }`}
            title="Bu içgörüyü hekim raporuna ekle"
          >
            <Check className={`w-3.5 h-3.5 ${isAddedToReport ? 'text-white' : 'text-comus-sand-dark'}`} />
            <span>{isAddedToReport ? 'Rapora Eklendi' : 'Hekim Raporuna Ekle'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs text-comus-sand-dark hover:text-comus-navy bg-comus-surface hover:bg-comus-sand-subtle px-2.5 py-1 rounded-xl transition-colors"
            title="Google Drive / Gmail / Paylaş"
          >
            <Share2 className="w-3.5 h-3.5 text-comus-copper" />
            <span className="hidden sm:inline">Paylaş</span>
          </button>
        </div>
      </div>

      {shareFeedback && (
        <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-serif font-bold text-lg sm:text-xl text-comus-navy mb-3 leading-snug">
        {insight.title}
      </h3>

      {/* Gentle Body */}
      <p className="text-sm sm:text-base text-comus-sand-dark leading-relaxed mb-5">
        {insight.body}
      </p>

      {/* Action Suggestion Box */}
      {insight.suggestedAction && (
        <div className="p-4 rounded-2xl bg-comus-copper-subtle/40 border border-comus-copper/20 mb-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-comus-copper-dark mb-1">
            <Compass className="w-4 h-4 text-comus-copper" />
            <span>Küçük Bir Farkındalık Önerisi</span>
          </div>
          <p className="text-sm text-comus-navy font-medium leading-relaxed">
            {insight.suggestedAction}
          </p>
        </div>
      )}

      {/* Evidence Graphs Collapsible */}
      {insight.evidence && insight.evidence.length > 0 && (
        <div className="mt-4 pt-4 border-t border-comus-sand-light/20">
          <button
            onClick={() => setEvidenceOpen(!evidenceOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-comus-navy hover:text-comus-copper transition-colors py-1"
          >
            <span>Veri & Kanıt Grafikleri ({insight.evidence.length} Metrik)</span>
            {evidenceOpen ? (
              <ChevronUp className="w-4 h-4 text-comus-sand" />
            ) : (
              <ChevronDown className="w-4 h-4 text-comus-sand" />
            )}
          </button>

          {evidenceOpen && (
            <div className="mt-3 space-y-3 animate-fadeIn">
              {insight.evidence.map((ev, idx) => (
                <EvidenceChart key={idx} evidence={ev} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer: Micro-disclaimer & Feedback */}
      <div className="mt-5 pt-4 border-t border-comus-sand-light/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-[11px] text-comus-sand-dark italic">
          * Bu bir teşhis değil, istatistiksel bir farkındalık içgörüsüdür.
        </div>

        {/* Feedback Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-comus-sand mr-1">Bu içgörü faydalı mıydı?</span>
          <button
            onClick={() => handleFeedback('helpful')}
            className={`p-1.5 px-2.5 rounded-xl border flex items-center gap-1 transition-colors ${
              feedback === 'helpful'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                : 'bg-comus-surface hover:bg-emerald-50/50 text-comus-sand-dark border-comus-sand-light/30'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="text-[11px]">Faydalı</span>
          </button>
          <button
            onClick={() => handleFeedback('not_helpful')}
            className={`p-1.5 px-2.5 rounded-xl border flex items-center gap-1 transition-colors ${
              feedback === 'not_helpful'
                ? 'bg-rose-50 text-rose-700 border-rose-300 font-semibold'
                : 'bg-comus-surface hover:bg-rose-50/50 text-comus-sand-dark border-comus-sand-light/30'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span className="text-[11px]">Değil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
