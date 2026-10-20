import { db } from './index';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';
import { clampMetricValue } from '../safety/sanitizer';

const LEGACY_PAYLOAD_KEY_MAP: Record<string, MetricKey> = {
  mobility_score: 'mobility_index',
  tst_minutes: 'sleep_duration',
  waso_minutes: 'sleep_waso',
  sol_minutes: 'sleep_sol',
  sleep_score: 'sleep_efficiency',
  hold_time_ms: 'typing_hold_time',
};

const CUMULATIVE_MAX_METRICS = new Set<MetricKey>([
  'screen_on_time',
  'night_usage_minutes',
  'typing_pause_count',
]);

async function upsertDailyMetricValue(
  date: string,
  metricKey: MetricKey,
  value: number,
  sampleCount: number,
  _min = value, _max = value
): Promise<void> {
  const clampedValue = clampMetricValue(metricKey, value);
  const existing = await db.dailyMetrics
    .where('[metricKey+date]')
    .equals([metricKey, date])
    .first();

  const rounded = Math.round(clampedValue * 100) / 100;

  if (existing && existing.id) {
    await db.dailyMetrics.update(existing.id, {
      value: rounded,
      sampleCount,
      min: Math.min(existing.min ?? rounded, rounded),
      max: Math.max(existing.max ?? rounded, rounded),
    });
  } else {
    await db.dailyMetrics.add({
      date,
      metricKey,
      value: rounded,
      sampleCount,
      min: rounded,
      max: rounded,
    });
  }
}

let isAggregating = false;

/**
 * Aggregate raw sensor events into dailyMetrics and cleanup events older than 7 days
 */
export async function runDailyAggregationAndCleanup(): Promise<void> {
  if (isAggregating) return;
  isAggregating = true;

  try {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // 1. Fetch unaggregated or recent events
    const events = await db.sensorEvents.toArray();
    if (events.length === 0) return;

    // Group events by day and metric
    const dailyGroups: Record<string, Record<MetricKey, number[]>> = {};

    for (const event of events) {
      const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
      const hour = new Date(event.timestamp).getHours();

      if (!dailyGroups[eventDate]) {
        dailyGroups[eventDate] = {} as Record<MetricKey, number[]>;
      }

      for (const [key, val] of Object.entries(event.payload)) {
        const normalizedKey = (LEGACY_PAYLOAD_KEY_MAP[key] || key) as MetricKey;
        if (!METRIC_DEFINITIONS[normalizedKey]) continue;

        if (!dailyGroups[eventDate][normalizedKey]) {
          dailyGroups[eventDate][normalizedKey] = [];
        }
        dailyGroups[eventDate][normalizedKey].push(val);

        // Circadian Disruption Proxy: 23:00 - 06:00, >70% brightness (700 lux)
        if (normalizedKey === 'light_ambient_lux') {
          const isNight = hour >= 23 || hour < 6;
          if (!dailyGroups[eventDate]['night_light_violations']) {
            dailyGroups[eventDate]['night_light_violations'] = [];
          }
          dailyGroups[eventDate]['night_light_violations'].push(isNight && val > 700 ? 1 : 0);
        }
      }

      // If session telemetry was recorded on this date and no night light violation occurred, record 0 violations
      if (
        (dailyGroups[eventDate]['session_duration'] || dailyGroups[eventDate]['screen_on_time']) &&
        !dailyGroups[eventDate]['night_light_violations']
      ) {
        dailyGroups[eventDate]['night_light_violations'] = [0];
      }
    }

    // 2. Write/update daily metrics in Dexie and compute real composite indices
    for (const [date, metricMap] of Object.entries(dailyGroups)) {
      const computedForDay: Partial<Record<MetricKey, number>> = {};

      for (const [metricKeyStr, values] of Object.entries(metricMap)) {
        if (values.length === 0) continue;
        const metricKey = metricKeyStr as MetricKey;
        const sum = values.reduce((acc, v) => acc + v, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        let finalValue = avg;
        if (metricKey === 'night_light_violations') {
          finalValue = values.filter((v) => v > 0).length;
        } else if (CUMULATIVE_MAX_METRICS.has(metricKey)) {
          finalValue = max;
        }

        computedForDay[metricKey] = Math.round(finalValue * 100) / 100;
        await upsertDailyMetricValue(date, metricKey, finalValue, values.length, min, max);
      }

      // Derive deterministic composite biomarkers (cognitive_fatigue_score & impulse_risk_index)
      // strictly when real session, touch, or typing measurements exist for this date.
      const hasRealActivityData =
        computedForDay.screen_on_time !== undefined ||
        computedForDay.session_duration !== undefined ||
        computedForDay.touch_interaction_frequency !== undefined ||
        computedForDay.typing_wpm !== undefined;

      if (hasRealActivityData) {
        const screenMin = computedForDay.screen_on_time ?? 0;
        const sessionMin = computedForDay.session_duration ?? 0;
        const nightMin = computedForDay.night_usage_minutes ?? 0;
        const nightLight = computedForDay.night_light_violations ?? 0;
        const backspace = computedForDay.typing_backspace_rate ?? 0;
        const iki = computedForDay.typing_iki ?? 200;
        const pauses = computedForDay.typing_pause_count ?? 0;
        const touchFreq = computedForDay.touch_interaction_frequency ?? 0;
        const scrollVel = computedForDay.touch_scroll_velocity ?? 0;

        // 1. Cognitive Fatigue Score (0-100): Screen exposure + Night circadian strain + Keystroke psychomotor load
        const screenLoad = Math.min(40, screenMin * 0.25 + sessionMin * 0.8);
        const circadianLoad = Math.min(30, nightMin * 1.2 + nightLight * 8);
        const typingLoad = Math.min(
          30,
          backspace * 1.5 + Math.max(0, (iki - 200) * 0.08) + pauses * 2
        );
        const cognitiveFatigue = Math.min(
          100,
          Math.max(5, Math.round((5 + screenLoad + circadianLoad + typingLoad) * 10) / 10)
        );

        // 2. Impulse Risk Index (0-100): Night vulnerability + Rapid touch/scroll velocity + Typing error bursts
        const nightImpulse = Math.min(45, nightMin * 1.8 + nightLight * 10);
        const interactionImpulse = Math.min(
          35,
          touchFreq * 0.4 + Math.max(0, (scrollVel - 200) * 0.03)
        );
        const typingImpulse = Math.min(20, backspace * 1.2);
        const impulseRisk = Math.min(
          100,
          Math.max(5, Math.round((5 + nightImpulse + interactionImpulse + typingImpulse) * 10) / 10)
        );

        await upsertDailyMetricValue(date, 'cognitive_fatigue_score', cognitiveFatigue, 1);
        await upsertDailyMetricValue(date, 'impulse_risk_index', impulseRisk, 1);
      }
    }

    // 3. Purge raw sensorEvents older than 7 days (Privacy / Minimization)
    const oldEvents = await db.sensorEvents
      .where('timestamp')
      .below(sevenDaysAgo)
      .toArray();

    if (oldEvents.length > 0) {
      const idsToDelete = oldEvents.map((e) => e.id!).filter(Boolean);
      await db.sensorEvents.bulkDelete(idsToDelete);
      console.log(`[Aggregation] Cleaned up ${idsToDelete.length} raw events older than 7 days.`);
    }
  } finally {
    isAggregating = false;
  }
}
