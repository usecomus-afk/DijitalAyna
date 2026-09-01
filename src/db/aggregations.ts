import { db } from './index';
import { MetricKey } from '../types/sensor';

/**
 * Aggregate raw sensor events into dailyMetrics and cleanup events older than 7 days
 */
export async function runDailyAggregationAndCleanup(): Promise<void> {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // 1. Fetch unaggregated or recent events
  const events = await db.sensorEvents.toArray();
  if (events.length === 0) return;

  // Group events by day and metric
  const dailyGroups: Record<string, Record<MetricKey, number[]>> = {};

  for (const event of events) {
    const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
    if (!dailyGroups[eventDate]) {
      dailyGroups[eventDate] = {} as Record<MetricKey, number[]>;
    }

    for (const [key, val] of Object.entries(event.payload)) {
      const metricKey = key as MetricKey;
      if (!dailyGroups[eventDate][metricKey]) {
        dailyGroups[eventDate][metricKey] = [];
      }
      dailyGroups[eventDate][metricKey].push(val);
    }
  }

  // 2. Write/update daily metrics in Dexie
  for (const [date, metricMap] of Object.entries(dailyGroups)) {
    for (const [metricKey, values] of Object.entries(metricMap)) {
      if (values.length === 0) continue;
      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      const existing = await db.dailyMetrics
        .where('[metricKey+date]')
        .equals([metricKey as MetricKey, date])
        .first();

      if (existing && existing.id) {
        await db.dailyMetrics.update(existing.id, {
          value: Math.round(avg * 100) / 100,
          sampleCount: values.length,
          min,
          max,
        });
      } else {
        await db.dailyMetrics.add({
          date,
          metricKey: metricKey as MetricKey,
          value: Math.round(avg * 100) / 100,
          sampleCount: values.length,
          min,
          max,
        });
      }
    }
  }

  // 3. Purge raw sensorEvents older than 7 days (Privacy / Minimization)
  const oldEvents = await db.sensorEvents
    .where('timestamp')
    .below(sevenDaysAgo)
    .toArray();

  if (oldEvents.length > 0) {
    const idsToDelete = oldEvents.map(e => e.id!).filter(Boolean);
    await db.sensorEvents.bulkDelete(idsToDelete);
    console.log(`[Aggregation] Cleaned up ${idsToDelete.length} raw events older than 7 days.`);
  }
}
