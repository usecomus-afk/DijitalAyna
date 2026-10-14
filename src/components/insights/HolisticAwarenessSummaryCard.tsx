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
    <div
      className={`bg-white rounded-3xl p-5 sm:p-6 shadow-soft border border-comus-copper/25 transition-all ${
        isExpanded ? 'space-y-4' : 'h-viewport-main flex flex-col justify-between gap-3'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-comus-copper-dark block">
              {summary.heading}
            </span>
            <span className="text-xs text-comus-sand-dark font-medium block truncate">
              {summary.subtitle}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs text-comus-navy bg-comus-surface hover:bg-comus-sand-subtle px-3 py-1.5 rounded-xl border border-comus-sand-light/40 transition-colors cursor-pointer font-medium shrink-0"
          title="Bu farkındalık özetini paylaş"
        >
          <Share2 className="w-3.5 h-3.5 text-comus-copper" />
          <span>Paylaş</span>
        </button>
      </div>

      {shareFeedback && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 animate-fadeIn shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Middle Body — Stretches proportionally to fill screen */}
      <div className={`flex flex-col gap-3 ${isExpanded ? '' : 'flex-1 min-h-0 justify-between'}`}>
        {/* Holistic Summary Paragraph */}
        <div className="p-4 sm:p-5 rounded-2xl bg-comus-copper-subtle/35 border border-comus-copper/20 flex items-center">
          <p className="text-xs sm:text-sm text-comus-navy leading-relaxed font-medium">
            {summary.summaryText}
          </p>
        </div>

        {/* 2x2 Pillar Grid — Proportionally fills remaining height */}
        {summary.pillars.length > 0 && (
          <div className={`grid grid-cols-2 gap-2.5 ${isExpanded ? '' : 'flex-1 min-h-0 items-stretch'}`}>
            {summary.pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 flex flex-col justify-center gap-1"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-comus-copper shrink-0" />
                  <span className="text-xs font-bold text-comus-navy truncate">{pillar.label}</span>
                </div>
                <p
                  className={`text-[11px] sm:text-xs text-comus-sand-dark leading-snug ${
                    isExpanded ? '' : 'line-clamp-3'
                  }`}
                >
                  {pillar.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom "İncele" Expand Button */}
      <div className="pt-2 border-t border-comus-sand-light/20 flex items-center justify-center shrink-0">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="w-full py-3 px-6 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer"
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
