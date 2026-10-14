import { db } from '../db';
import { MetricKey } from '../types/sensor';

/**
 * Standard healthy normative behavioral values based on digital phenotyping literature (Insel 2017, Torous et al.)
 */
export const NORMATIVE_DEFAULTS: Record<MetricKey, { mean: number; std: number; min: number; max: number }> = {
  mobility_index: { mean: 74, std: 6, min: 20, max: 100 },
  tremor_variance: { mean: 0.04, std: 0.015, min: 0.01, max: 0.2 },
  typing_wpm: { mean: 44, std: 4, min: 15, max: 90 },
  typing_iki: { mean: 235, std: 25, min: 100, max: 600 },
  typing_backspace_rate: { mean: 3.8, std: 1.2, min: 0.5, max: 20 },
  typing_pause_count: { mean: 2, std: 1, min: 0, max: 10 },
  typing_hold_time: { mean: 120, std: 20, min: 40, max: 300 },
  touch_scroll_velocity: { mean: 290, std: 45, min: 50, max: 1200 },
  touch_interaction_frequency: { mean: 32, std: 6, min: 5, max: 90 },
  session_duration: { mean: 5.2, std: 1.5, min: 0.5, max: 60 },
  night_usage_minutes: { mean: 1.5, std: 1.2, min: 0, max: 120 },
  screen_on_time: { mean: 210, std: 35, min: 30, max: 480 },
  light_ambient_lux: { mean: 450, std: 100, min: 10, max: 2000 },
  night_light_violations: { mean: 0.1, std: 0.3, min: 0, max: 3 },
  battery_level: { mean: 65, std: 20, min: 5, max: 100 },
  is_charging: { mean: 0, std: 0.4, min: 0, max: 1 },
  network_online: { mean: 1, std: 0.1, min: 0, max: 1 },
  voice_pitch_variance: { mean: 34.5, std: 5.2, min: 5, max: 80 },
  voice_speech_rate: { mean: 130, std: 15, min: 60, max: 220 },
  cognitive_fatigue_score: { mean: 22, std: 6, min: 0, max: 100 },
  impulse_risk_index: { mean: 18, std: 5, min: 0, max: 100 },
  gaming_duration: { mean: 20, std: 15, min: 0, max: 360 },
  camera_interaction_count: { mean: 1.5, std: 1.0, min: 0, max: 20 },
  sleep_efficiency: { mean: 85, std: 10, min: 0, max: 100 },
  homestay_ratio: { mean: 0.6, std: 0.2, min: 0, max: 1 },
  mobility_radius: { mean: 5, std: 2, min: 0, max: 50 },
  sleep_duration: { mean: 420, std: 60, min: 120, max: 720 },
  sleep_sol: { mean: 20, std: 10, min: 5, max: 120 },
  sleep_waso: { mean: 30, std: 15, min: 0, max: 180 },
};

import { calculateEWMAForMetrics } from './BaselineEngine';

/**
 * Cleans up any legacy synthetic (sampleCount === 0) baseline priors from IndexedDB
 * and ensures db.baselines only contains EWMA baselines computed from real device telemetry.
 */
export async function ensureInitialCalibration(): Promise<boolean> {
  try {
    const allBaselines = await db.baselines.toArray();
    const syntheticKeys = allBaselines
      .filter((b) => !b.sampleCount || b.sampleCount <= 0)
      .map((b) => b.metricKey);

    if (syntheticKeys.length > 0) {
      await db.baselines.bulkDelete(syntheticKeys);
    }

    await calculateEWMAForMetrics();
    return syntheticKeys.length > 0;
  } catch (err) {
    console.warn('[Calibration] Baseline cleanup error:', err);
    return false;
  }
}
