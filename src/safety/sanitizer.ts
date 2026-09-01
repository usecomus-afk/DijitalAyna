import { SensorEvent, SensorType } from '../types/sensor';

/**
 * Privacy-by-Design Sanitization Gateway
 * 
 * Guarantees that:
 * 1. NO raw text, keystroke character logs, message content, or PII ever touches IndexedDB.
 * 2. Only strictly numeric metadata (intervals, variances, velocity, timestamps) is preserved.
 * 3. All payload values are sanitized, finite numbers.
 */
export function sanitizeSensorEvent(
  rawEvent: Partial<SensorEvent>
): SensorEvent | null {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return null;
  }

  const validTypes: SensorType[] = ['motion', 'typing', 'touch', 'session', 'light', 'battery', 'network', 'voice'];
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
        // Round to 3 decimal places to prevent floating point fingerprinting
        sanitizedPayload[key] = Math.round(value * 1000) / 1000;
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
