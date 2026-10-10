import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import { InsightCard } from '../components/insights/InsightCard';
import { Disclaimer } from '../components/common/Disclaimer';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useMentalTwinAvatar } from '../hooks/useMentalTwinAvatar';
import { applyDailyStateToInsight } from '../engine/dailyState';
import { TriggerAnalysisWidget } from '../components/analytics/TriggerAnalysisWidget';

export const InsightsPage: React.FC = () => {
  const { baselineDayCount } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const insights = useLiveQuery(() => db.insights.toArray()) || [];
  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];

  const sampleDays = useMemo(() => new Set(dailyMetrics.map((m) => m.date)).size, [dailyMetrics]);
  const effectiveDayCount = Math.max(baselineDayCount, sampleDays);
  const isLearning = effectiveDayCount < 14;

  const { dailyState } = useMentalTwinAvatar();
  const syncedInsights = insights.map((ins) => applyDailyStateToInsight(ins, dailyState));

  const filteredInsights = syncedInsights.filter((ins) => {
    if (isLearning && ins.biomarkerType === 'healthy_balance' && !ins.badgeLabel) return false;
    if (filter === 'all') return true;
    return ins.severity === filter;
  });

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="font-serif font-bold text-2xl text-comus-navy">
              İçgörüler Akışı
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-comus-sand-dark mt-1">
            Kişisel baz hattınızdan saptanan davranışsal değişimler ve nazik öneriler
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-comus-sand-light/30 shadow-soft text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-comus-navy text-white'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            Tümü ({filteredInsights.length})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === 'high'
                ? 'bg-rose-600 text-white'
                : 'text-comus-sand-dark hover:text-rose-600'
            }`}
          >
            Öncelikli
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === 'medium'
                ? 'bg-amber-600 text-white'
                : 'text-comus-sand-dark hover:text-amber-600'
            }`}
          >
            Sinyaller
          </button>
        </div>
      </div>

      {/* Insight Cards Feed */}
      {filteredInsights.length > 0 ? (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <InsightCard key={insight.id || insight.createdAt} insight={insight} />
          ))}
        </div>
      ) : isLearning ? (
        <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-comus-sand-light/20 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-comus-navy">
            Kişisel Ritim Öğreniliyor ({effectiveDayCount}/14 Gün)
          </h3>
          <p className="text-xs sm:text-sm text-comus-sand-dark max-w-md mx-auto leading-relaxed">
            Kişiselleştirilmiş davranışsal içgörüler ve anomali uyarıları, 14 günlük stabil baz hattınız tamamlandıktan sonra aktif hale gelecektir.
          </p>
          <div className="max-w-xs mx-auto pt-2">
            <div className="flex justify-between text-xs text-comus-sand-dark mb-1 font-medium">
              <span>Öğrenim İlerlemesi</span>
              <span className="font-mono font-bold">%{Math.min(100, Math.round((Math.max(1, effectiveDayCount) / 14) * 100))}</span>
            </div>
            <div className="w-full bg-comus-sand-light/30 h-2 rounded-full overflow-hidden">
              <div
                className="bg-comus-copper h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (Math.max(1, effectiveDayCount) / 14) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 text-center border border-comus-sand-light/20 shadow-soft">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-comus-navy mb-1">
            {dailyState.isStrained ? 'Hassas Bir Gün' : 'Her Şey Dengede Görünüyor'}
          </h3>
          <p className="text-xs sm:text-sm text-comus-sand-dark max-w-sm mx-auto">
            {dailyState.isStrained
              ? 'Pasif sensörlerde öncelikli bir anomali yok; ancak aktif bildirimin zihinsel yük gösteriyor. Bugün kendine nazik davranabilirsin.'
              : 'Şu anda baz hattından belirgin bir sapma veya öncelikli anomali bulunmuyor.'}
          </p>
        </div>
      )}

      {/* Tetikleyici Analizi (Yeni) */}
      <TriggerAnalysisWidget />

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
};


