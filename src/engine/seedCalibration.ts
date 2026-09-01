import { db } from '../db';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';
import { calculateEWMAForMetrics } from './baseline';
import { generateInsightsAndAlerts } from './insights';

/**
 * Standard healthy normative behavioral values based on digital phenotyping literature (Insel 2017, Torous et al.)
 */
const NORMATIVE_DEFAULTS: Record<MetricKey, { mean: number; std: number; min: number; max: number }> = {
  mobility_index: { mean: 74, std: 6, min: 20, max: 100 },
  tremor_variance: { mean: 0.04, std: 0.015, min: 0.01, max: 0.2 },
  typing_wpm: { mean: 44, std: 4, min: 15, max: 90 },
  typing_iki: { mean: 235, std: 25, min: 100, max: 600 },
  typing_backspace_rate: { mean: 3.8, std: 1.2, min: 0.5, max: 20 },
  typing_pause_count: { mean: 2, std: 1, min: 0, max: 10 },
  touch_scroll_velocity: { mean: 290, std: 45, min: 50, max: 1200 },
  touch_interaction_frequency: { mean: 32, std: 6, min: 5, max: 90 },
  session_duration: { mean: 5.2, std: 1.5, min: 0.5, max: 60 },
  night_usage_minutes: { mean: 1.5, std: 1.2, min: 0, max: 120 },
  screen_on_time: { mean: 55, std: 15, min: 5, max: 300 },
  light_ambient_lux: { mean: 180, std: 50, min: 10, max: 1000 },
  battery_level: { mean: 78, std: 12, min: 10, max: 100 },
  is_charging: { mean: 0, std: 0.4, min: 0, max: 1 },
  network_online: { mean: 1, std: 0.1, min: 0, max: 1 },
  voice_pitch_variance: { mean: 34.5, std: 5.2, min: 5, max: 80 },
  voice_speech_rate: { mean: 130, std: 15, min: 60, max: 220 },
  cognitive_fatigue_score: { mean: 22, std: 6, min: 0, max: 100 },
  impulse_risk_index: { mean: 18, std: 5, min: 0, max: 100 },
};

/**
 * Ensure initial calibration data exists so the app can immediately calculate baselines,
 * detect anomalies, synthesize biomarkers, and generate clinical insights from day 1.
 */
export async function ensureInitialCalibration(): Promise<boolean> {
  const existingCount = await db.dailyMetrics.count();
  if (existingCount >= 7) {
    return false; // Already has sufficient calibration data
  }

  console.log('[Calibration] Seeding initial 7-day healthy baseline calibration...');

  const today = new Date();
  const keys = Object.keys(METRIC_DEFINITIONS) as MetricKey[];

  // Generate 7 days of calibration history (from 6 days ago to today)
  for (let d = 6; d >= 0; d--) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - d);
    const dateStr = targetDate.toISOString().split('T')[0];

    for (const key of keys) {
      const norm = NORMATIVE_DEFAULTS[key] || { mean: 50, std: 5, min: 0, max: 100 };

      // Gentle natural jitter for realistic longitudinal time series
      const jitter = (Math.random() - 0.5) * 2 * norm.std;
      const rawVal = norm.mean + jitter;
      const clampedVal = Math.min(norm.max, Math.max(norm.min, rawVal));
      const finalVal = Math.round(clampedVal * 100) / 100;

      const existing = await db.dailyMetrics
        .where('[metricKey+date]')
        .equals([key, dateStr])
        .first();

      if (!existing) {
        await db.dailyMetrics.add({
          date: dateStr,
          metricKey: key,
          value: finalVal,
          sampleCount: 15,
          min: Math.max(norm.min, Math.round((finalVal - norm.std) * 100) / 100),
          max: Math.min(norm.max, Math.round((finalVal + norm.std) * 100) / 100),
        });
      }
    }
  }

  // Calculate EWMA baselines and initial insights immediately
  await calculateEWMAForMetrics();
  await generateInsightsAndAlerts();

  console.log('[Calibration] Initial 7-day baseline established successfully.');
  return true;
}
