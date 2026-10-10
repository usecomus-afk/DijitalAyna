import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import { InsightCard } from '../components/insights/InsightCard';
import { MetricCard } from '../components/dashboard/MetricCard';
import { calculateZScore } from '../engine/anomaly';
import { AnomalyResult } from '../types/engine';
import { healthService } from '../services/native/healthService';
import { Disclaimer } from '../components/common/Disclaimer';
import { Sparkles, CheckCircle2, Activity, Keyboard, Moon, Smartphone } from 'lucide-react';
import { useMentalTwinAvatar } from '../hooks/useMentalTwinAvatar';
import { applyDailyStateToInsight } from '../engine/dailyState';
import { TriggerAnalysisWidget } from '../components/analytics/TriggerAnalysisWidget';

export const InsightsPage: React.FC = () => {
  const { baselineDayCount } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const insights = useLiveQuery(() => db.insights.toArray()) || [];
  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];

  // Group metrics by key and find latest date
  const { historyByKey, latestMetricsByKey, baselineMap } = useMemo(() => {
    const bMap = new Map(baselines.map(b => [b.metricKey, b]));
    const hMap = new Map<string, { date: string; value: number }[]>();
    const lMap = new Map<string, number>();

    let maxDate = '';

    // Sort metrics by date
    const sorted = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));

    for (const m of sorted) {
      if (m.date > maxDate) maxDate = m.date;
      if (!hMap.has(m.metricKey)) {
        hMap.set(m.metricKey, []);
      }
      hMap.get(m.metricKey)!.push({
        date: m.date.slice(5),
        value: m.value,
      });
      lMap.set(m.metricKey, m.value);
    }

    // Build anomalies for latest date
    const anoms: AnomalyResult[] = [];
    if (maxDate) {
      const todays = sorted.filter(m => m.date === maxDate);
      for (const t of todays) {
        const base = bMap.get(t.metricKey);
        if (base) {
          const z = calculateZScore(t.value, base.ewmaMean, base.ewmaStd);
          const dev = base.ewmaMean !== 0
            ? Math.round(((t.value - base.ewmaMean) / base.ewmaMean) * 100)
            : 0;
          anoms.push({
            metricKey: t.metricKey,
            date: maxDate,
            currentValue: t.value,
            baselineMean: base.ewmaMean,
            baselineStd: base.ewmaStd,
            zScore: z,
            isAnomaly: Math.abs(z) >= 2.0,
            deviationPercent: dev,
            direction: z > 0 ? 'above' : 'below',
          });
        }
      }
    }

    return {
      historyByKey: hMap,
      latestMetricsByKey: lMap,
      anomalies: anoms,
      baselineMap: bMap,
    };
  }, [dailyMetrics, baselines]);

  // Helper to safely get metric info without mocking
  const getMetricData = (key: any, unavailableReason = '') => {
    const hasData = latestMetricsByKey.has(key);
    const curr = hasData ? (latestMetricsByKey.get(key) ?? null) : null;
    const base = baselineMap.get(key)?.ewmaMean ?? null;
    const std = baselineMap.get(key)?.ewmaStd ?? 1;
    const z = curr !== null && base !== null ? calculateZScore(curr, base, std) : null;
    const dev = curr !== null && base !== null && base !== 0 ? Math.round(((curr - base) / base) * 100) : null;
    const hist = (historyByKey.get(key) || []).slice(-14);
    return { hasData, curr, base, z, dev, hist, unavailableReason };
  };

  const mobility = getMetricData('mobility_index', '[Veri Alınamıyor / İzin Bekleniyor]');
  const typing = getMetricData('typing_wpm', '[Kayıt Yok - Uygulama içi yazım yapılmadı]');
  const backspace = getMetricData('typing_backspace_rate', '[Kayıt Yok - Uygulama içi yazım yapılmadı]');
  const night = getMetricData('night_usage_minutes', '[Kayıt Yok - Gece kullanımı yok]');
  const touch = getMetricData('touch_interaction_frequency', '[Kayıt Yok - Etkileşim yok]');


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

      <div className="pt-6">
        <h2 className="font-serif font-bold text-xl text-comus-navy mb-4">Anl�k Fenotip Verileri</h2>
{/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Hareketlilik (Mobility) */}
        <MetricCard
          title="Fiziksel Hareketlilik"
          metricKey="mobility_index"
          icon={Activity}
          currentValue={mobility.curr}
          baselineValue={mobility.base}
          unit="puan"
          zScore={mobility.z}
          deviationPercent={mobility.dev}
          history={mobility.hist}
          hasData={mobility.hasData}
          unavailableReason={mobility.unavailableReason}
          actionLabel="İzin Ver"
          onActionClick={async () => {
            const res = await healthService.requestHealthPermissions();
            if (res.granted) {
              await healthService.syncHealthBiomarkers();
            } else if (res.error) {
              alert(res.error);
            }
            
            const store = useAppStore.getState();
            const wasModalOpen = store.emergencyModalOpen;
            await store.runAnalysisPipeline();
            if (!wasModalOpen && store.emergencyModalOpen) {
              store.setEmergencyModalOpen(false); // suppress immediate modal on manual grant
            }
          }}
          description="İvmeölçer & fiziksel aktivite endeksi"
        />

        {/* 2. Yazım Dinamiği (Typing) */}
        <MetricCard
          title="Yazım Dinamiği & Akıcılık"
          metricKey="typing_wpm"
          icon={Keyboard}
          currentValue={typing.curr}
          baselineValue={typing.base}
          unit="WPM"
          zScore={typing.z}
          deviationPercent={typing.dev}
          history={typing.hist}
          hasData={typing.hasData}
          unavailableReason={typing.unavailableReason}
          description={backspace.hasData ? `Tuş aralığı & hata oranı (%${backspace.curr})` : 'Uygulama içi tuş vuruş akıcılığı'}
        />

        {/* 3. Ekran Ritmi & Gece Kullanımı */}
        <MetricCard
          title="Sirkadiyen Ekran Ritmi"
          metricKey="night_usage_minutes"
          icon={Moon}
          currentValue={night.curr}
          baselineValue={night.base}
          unit="dk (gece)"
          zScore={night.z}
          deviationPercent={night.dev}
          history={night.hist}
          hasData={night.hasData}
          unavailableReason={night.unavailableReason}
          description="02:00–04:00 gece dinlenme penceresi kullanımı"
        />

        {/* 4. Etkileşim Yoğunluğu (Touch) */}
        <MetricCard
          title="Etkileşim Yoğunluğu"
          metricKey="touch_interaction_frequency"
          icon={Smartphone}
          currentValue={touch.curr}
          baselineValue={touch.base}
          unit="dokunma/dk"
          zScore={touch.z}
          deviationPercent={touch.dev}
          history={touch.hist}
          hasData={touch.hasData}
          unavailableReason={touch.unavailableReason}
          description="Kaydırma hızı ve ekran etkileşim sıklığı"
        />
      </div>

      
      </div>

      {/* Tetikleyici Analizi (Yeni) */}
      <TriggerAnalysisWidget />

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
};


