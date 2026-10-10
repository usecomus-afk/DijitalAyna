import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import { DigitalTwinMirror } from '../components/dashboard/DigitalTwinMirror';
import { MentalTwinPanel } from '../components/avatar/MentalTwinPanel';
import { PredictiveAlertModal } from '../components/alerts/PredictiveAlertModal';
import { ProactivePredictionModal } from '../components/alerts/ProactivePredictionModal';
import { checkProactivePrediction } from '../engine/proactiveAdvisor';
import { Disclaimer } from '../components/common/Disclaimer';
import {
} from 'lucide-react';
import { calculateZScore } from '../engine/anomaly';
import { AnomalyResult } from '../types/engine';

export const DashboardPage: React.FC = () => {
  const { activePredictiveAlertDismissed, dismissPredictiveAlert, baselineDayCount } = useAppStore();
  const [isProactiveModalOpen, setIsProactiveModalOpen] = useState(false);

  useEffect(() => {
    checkProactivePrediction().then(res => {
      if (res) {
        setIsProactiveModalOpen(true);
      }
    });
  }, []);

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const predictiveAlerts = useLiveQuery(() => db.predictiveAlerts.where('dismissed').equals(0).toArray()) || [];

  // Group metrics by key and find latest date
  const { anomalies } = useMemo(() => {
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

  const activeAlert = predictiveAlerts.length > 0 && !activePredictiveAlertDismissed ? predictiveAlerts[0] : null;



  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Predictive Alert Banner (if active) */}
      {activeAlert && (
        <PredictiveAlertModal
          alert={activeAlert}
          onClose={dismissPredictiveAlert}
        />
      )}

      {/* Proactive Prediction Modal */}
      <ProactivePredictionModal 
        isOpen={isProactiveModalOpen}
        onClose={() => setIsProactiveModalOpen(false)}
      />

      {/* Digital Twin Status Mirror */}
      <DigitalTwinMirror
        anomalies={anomalies}
        sampleDays={baselineDayCount}
      />

      <MentalTwinPanel />

      {/* Micro Disclaimer */}
      <Disclaimer />
    </div>
  );
};



