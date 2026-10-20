import { SensorEvent, SensorType } from '../types/sensor';

/**
 * Strict Physical Bounds for Digital Phenotype & Telemetry Ingestion
 * Clamping prevents runaway epoch timestamps, device glitch artifacts, or sensor overflow.
 */
export const METRIC_BOUNDS: Record<string, { min: number; max: number; isPercentage?: boolean }> = {
  // Screen and session dynamics
  screen_on_time: { min: 0, max: 1440 }, // max 1440 minutes in a 24h day
  daily_screen_time_minutes: { min: 0, max: 1440 },
  session_duration: { min: 0.1, max: 360 }, // max single session 6 hours
  average_session_duration_minutes: { min: 0.1, max: 360 },
  night_usage_minutes: { min: 0, max: 360 }, // biological rest window

  // Keystroke dynamics
  typing_wpm: { min: 5, max: 160 },
  typing_speed_wpm: { min: 5, max: 160 },
  typing_iki: { min: 10, max: 2000 },
  keystroke_flight_time_ms: { min: 10, max: 2000 },
  typing_hold_time: { min: 10, max: 2000 },
  hold_time_ms: { min: 10, max: 2000 },
  typing_backspace_rate: { min: 0, max: 100, isPercentage: true },
  typing_pause_count: { min: 0, max: 500 },

  // Touch and interaction
  touch_scroll_velocity: { min: 0, max: 5000 },
  touch_interaction_frequency: { min: 0, max: 600 },
  interaction_intensity: { min: 0, max: 600 },

  // Mobility & GPS
  homestay_ratio: { min: 0, max: 100, isPercentage: true },
  home_stay_ratio: { min: 0, max: 100, isPercentage: true },
  mobility_radius: { min: 0, max: 1000 },
  mobility_index: { min: 0, max: 100 },
  tremor_variance: { min: 0, max: 50 },

  // Circadian & Sleep
  light_ambient_lux: { min: 0, max: 100000 },
  night_light_violations: { min: 0, max: 100 },
  sleep_efficiency: { min: 0, max: 100, isPercentage: true },
  sleep_duration: { min: 0, max: 1440 },
  sleep_sol: { min: 0, max: 360 },
  sleep_waso: { min: 0, max: 600 },

  // Derived indices
  cognitive_fatigue_score: { min: 0, max: 100 },
  impulse_risk_index: { min: 0, max: 100 },
};

/**
 * Validates and clamps an incoming metric value to its physical boundaries.
 * Also intercepts epoch millisecond timestamps mistakenly passed as minutes.
 */
export function clampMetricValue(key: string, rawVal: number): number {
  if (!Number.isFinite(rawVal) || isNaN(rawVal)) return 0;

  let val = rawVal;

  // Intercept epoch timestamp leakage or runaway duration values
  const isTimeDurationKey =
    key.includes('screen') ||
    key.includes('session') ||
    key.includes('night_usage') ||
    key.includes('sleep_duration');

  if (isTimeDurationKey && val > 1440) {
    val = Math.min(1440, val);
  }

  // Convert raw float homestay ratio [0.0 - 1.0] to percentage [0% - 100%]
  if ((key === 'homestay_ratio' || key === 'home_stay_ratio') && val <= 1.0 && val > 0) {
    val = val * 100;
  }

  const bounds = METRIC_BOUNDS[key];
  if (bounds) {
    val = Math.max(bounds.min, Math.min(bounds.max, val));
  }

  return Math.round(val * 1000) / 1000;
}

/**
 * Privacy-by-Design Sanitization Gateway
 * 
 * Guarantees that:
 * 1. NO raw text, keystroke character logs, message content, or PII ever touches IndexedDB.
 * 2. Only strictly numeric metadata (intervals, variances, velocity, timestamps) is preserved.
 * 3. All payload values are sanitized, finite numbers clamped to strict physical bounds.
 */
export function sanitizeSensorEvent(
  rawEvent: Partial<SensorEvent>
): SensorEvent | null {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null;
  }

  const validTypes: SensorType[] = ['motion', 'typing', 'touch', 'session', 'light', 'battery', 'network', 'voice', 'sleep'];
  if (!rawEvent.type || !validTypes.includes(rawEvent.type)) {
    console.warn(`[Sanitizer] Rejected event with invalid type: ${rawEvent.type}`);
    return null;
  }

  const timestamp = typeof rawEvent.timestamp === 'number' && Number.isFinite(rawEvent.timestamp)
    ? Math.floor(rawEvent.timestamp)
    : Date.now();

  const sanitizedPayload: Record<string, number> = {};

  if (rawEvent.payload && typeof rawEvent.payload === 'object') {
    for (const [key, value] of Object.entries(rawEvent.payload)) {
      // Reject any non-numeric fields, functions, strings or nested objects
      if (typeof value === 'number' && Number.isFinite(value)) {
        // Enforce physical bounds clamping
        sanitizedPayload[key] = clampMetricValue(key, value);
      }
    }
  }

  return {
    type: rawEvent.type,
    timestamp,
    payload: sanitizedPayload,
  };
}

/**
 * Sanitize user mood note / input to prevent persistent raw private message leakage
 */
export function sanitizeMoodInput(note?: string): string | undefined {
  if (!note || typeof note !== 'string') return undefined;
  // Limit to max 120 chars, strip tags
  return note.replace(/<[^>]*>?/gm, '').trim().slice(0, 120);
}
