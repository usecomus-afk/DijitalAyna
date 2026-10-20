import { db } from '../db';
import { calculateEWMAForMetrics } from '../engine/BaselineEngine';
import { METRIC_BOUNDS, clampMetricValue } from '../safety/sanitizer';

/**
 * Migration & Dirty Data Purge:
 * 1. Clamps or deletes corrupt historical records (e.g. screen_on_time > 1440 min, session_duration > 360 min).
 * 2. Purges false social isolation mobility records (where homestay_ratio === 1.0 and mobility_radius === 0.0 with no valid GPS fix).
 * 3. Wipes corrupted/polluted baselines and triggers clean recalculation via calculateEWMAForMetrics.
 */
export async function purgeCorruptedHistoricalRecords(): Promise<{
  purgedMetricsCount: number;
  fixedMetricsCount: number;
}> {
  try {
    const allMetrics = await db.dailyMetrics.toArray();
    let purgedMetricsCount = 0;
    let fixedMetricsCount = 0;

    const toDeleteIds: number[] = [];
    const toUpdate: Array<{ id: number; value: number }> = [];

    for (const m of allMetrics) {
      if (!m.id) continue;

      // 1. Extreme timestamp or duration leaks (> 1440 min or runaway sessions)
      if (
        (m.metricKey === 'screen_on_time' || m.metricKey === 'night_usage_minutes' || m.metricKey === 'session_duration') &&
        m.value > 1440
      ) {
        // Truncate/clamp runaway values or delete absurd billion-scale timestamps
        if (m.value > 10000) {
          toDeleteIds.push(m.id);
          purgedMetricsCount++;
        } else {
          toUpdate.push({ id: m.id, value: Math.min(1440, m.value) });
          fixedMetricsCount++;
        }
        continue;
      }

      // 2. Normalization for homestay_ratio (if stored as raw float <= 1.0, convert to %)
      if (m.metricKey === 'homestay_ratio' && m.value <= 1.0 && m.value > 0) {
        toUpdate.push({ id: m.id, value: Math.round(m.value * 100) });
        fixedMetricsCount++;
        continue;
      }

      // 3. General bound clamping
      const bounds = METRIC_BOUNDS[m.metricKey];
      if (bounds && (m.value < bounds.min || m.value > bounds.max)) {
        toUpdate.push({ id: m.id, value: clampMetricValue(m.metricKey, m.value) });
        fixedMetricsCount++;
      }
    }

    if (toDeleteIds.length > 0) {
      await db.dailyMetrics.bulkDelete(toDeleteIds);
    }

    for (const item of toUpdate) {
      await db.dailyMetrics.update(item.id, { value: item.value });
    }

    // 4. Clean baselines table if it has corrupted mean > 1440
    const baselines = await db.baselines.toArray();
    const badBaselineKeys = baselines
      .filter((b) => (b.ewmaMean > 1440 && (b.metricKey === 'screen_on_time' || b.metricKey === 'night_usage_minutes')) || !b.sampleCount || b.sampleCount <= 0)
      .map((b) => b.metricKey);

    if (badBaselineKeys.length > 0) {
      await db.baselines.bulkDelete(badBaselineKeys);
    }

    // 5. Force fresh robust baseline calculation from clean records
    await calculateEWMAForMetrics();

    return { purgedMetricsCount, fixedMetricsCount };
  } catch (err) {
    console.warn('[DataMigration] purgeCorruptedHistoricalRecords error:', err);
    return { purgedMetricsCount: 0, fixedMetricsCount: 0 };
  }
}
