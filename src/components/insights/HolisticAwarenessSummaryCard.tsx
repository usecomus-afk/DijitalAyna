import React, { useState } from 'react';
import { Compass, ChevronDown, ChevronUp, Share2, Check, Sparkles } from 'lucide-react';
import { HolisticAwarenessSummary } from '../../engine/awarenessSynthesis';
import { shareContent } from '../../services/shareService';

interface HolisticAwarenessSummaryCardProps {
  summary: HolisticAwarenessSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  expandLabel?: string;
  collapseLabel?: string;
}

export const HolisticAwarenessSummaryCard: React.FC<HolisticAwarenessSummaryCardProps> = ({
  summary,
  isExpanded,
  onToggleExpand,
  expandLabel = 'İncele',
  collapseLabel = 'Ayrıntıları Gizle',
}) => {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShare = async () => {
    const res = await shareContent({
      title: `Dijital Mental İkizim — ${summary.heading}`,
      text: summary.shareText,
    });
    setShareFeedback(res.message);
    setTimeout(() => setShareFeedback(null), 3000);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-soft border border-comus-copper/25 space-y-3.5 transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-comus-copper-dark block">
              {summary.heading}
            </span>
            <span className="text-[11px] sm:text-xs text-comus-sand-dark font-medium block truncate">
              {summary.subtitle}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs text-comus-navy bg-comus-surface hover:bg-comus-sand-subtle px-2.5 py-1.5 rounded-xl border border-comus-sand-light/40 transition-colors cursor-pointer font-medium shrink-0"
          title="Bu farkındalık özetini paylaş"
        >
          <Share2 className="w-3.5 h-3.5 text-comus-copper" />
          <span>Paylaş</span>
        </button>
      </div>

      {shareFeedback && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Holistic Summary Paragraph */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-comus-copper-subtle/35 border border-comus-copper/20">
        <p className="text-xs sm:text-sm text-comus-navy leading-relaxed font-medium">
          {summary.summaryText}
        </p>
      </div>

      {/* Concise 2x2 Pillar Preview (compact so the whole card fits on one screen) */}
      {summary.pillars.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {summary.pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 flex items-start gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-comus-copper shrink-0 mt-0.5" />
              <div className="text-[11px] min-w-0">
                <div className="font-bold text-comus-navy truncate">{pillar.label}</div>
                <p
                  className={`text-comus-sand-dark leading-snug mt-0.5 ${
                    isExpanded ? '' : 'line-clamp-2'
                  }`}
                >
                  {pillar.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom "İncele" Expand Button */}
      <div className="pt-2 border-t border-comus-sand-light/20 flex items-center justify-center">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="w-full sm:w-auto min-w-[180px] px-5 py-2.5 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs font-semibold shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>{isExpanded ? collapseLabel : expandLabel}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
