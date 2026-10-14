import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import { DigitalTwinMirror } from '../components/dashboard/DigitalTwinMirror';
import { MentalTwinPanel } from '../components/avatar/MentalTwinPanel';
import { InsightCard } from '../components/insights/InsightCard';
import { HolisticAwarenessSummaryCard } from '../components/insights/HolisticAwarenessSummaryCard';
import { calculateZScore } from '../engine/anomaly';
import { AnomalyResult } from '../types/engine';
import { useMentalTwinAvatar } from '../hooks/useMentalTwinAvatar';
import {
  deduplicateAndEnrichInsights,
  synthesizeHolisticAwarenessSummary,
} from '../engine/awarenessSynthesis';

export const DashboardPage: React.FC = () => {
  const { baselineDayCount, userProfile } = useAppStore();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const rawInsights = useLiveQuery(() => db.insights.toArray()) || [];

  const {
    dailyState,
    affectiveIndex,
    hasIndex,
    earlyAwarenessAlerts,
    topTags,
  } = useMentalTwinAvatar();

  // Group metrics by key and find latest date
  const { anomalies, sampleDays } = useMemo(() => {
    const bMap = new Map(baselines.map(b => [b.metricKey, b]));
    const distinctDates = new Set<string>();
    let maxDate = '';

    const sorted = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));

    for (const m of sorted) {
      distinctDates.add(m.date);
      if (m.date > maxDate) maxDate = m.date;
    }

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
      anomalies: anoms,
      sampleDays: distinctDates.size,
    };
  }, [dailyMetrics, baselines]);

  const effectiveDayCount = Math.max(baselineDayCount, sampleDays);
  const isLearning = effectiveDayCount < 14;

  const uniqueInsights = useMemo(
    () => deduplicateAndEnrichInsights(rawInsights, dailyState, isLearning),
    [rawInsights, dailyState, isLearning]
  );

  const holisticSummary = useMemo(
    () =>
      synthesizeHolisticAwarenessSummary({
        insights: uniqueInsights,
        anomalies,
        earlyAwarenessAlerts,
        dailyState,
        affectiveIndex,
        hasIndex,
        effectiveDayCount,
        userName: userProfile.name,
        topTags,
      }),
    [
      uniqueInsights,
      anomalies,
      earlyAwarenessAlerts,
      dailyState,
      affectiveIndex,
      hasIndex,
      effectiveDayCount,
      userProfile.name,
      topTags,
    ]
  );

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      <DigitalTwinMirror anomalies={anomalies} sampleDays={baselineDayCount} />

      <HolisticAwarenessSummaryCard
        summary={holisticSummary}
        isExpanded={isDetailsExpanded}
        onToggleExpand={() => setIsDetailsExpanded((prev) => !prev)}
      />

      {isDetailsExpanded && (
        <div className="space-y-6 animate-fadeIn">
          <MentalTwinPanel />

          {uniqueInsights.length > 0 && (
            <div className="space-y-4">
              {uniqueInsights.map((insight) => (
                <InsightCard key={insight.id || `${insight.date}-${insight.biomarkerType}`} insight={insight} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
