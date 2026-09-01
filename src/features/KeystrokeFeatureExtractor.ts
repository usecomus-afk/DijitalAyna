import { KeystrokeMetadataEvent } from '../types/phenotyping';

/**
 * Keystroke Dynamics Feature Extractor (UIC BiAffect Study)
 * Zulueta et al. (2018), Torous et al. (2018).
 * Extracts psychomotor speed, cognitive pause patterns, error corrections, and burstiness.
 */
export class KeystrokeFeatureExtractor {
  /**
   * Calculates Mean, Variance, and Standard Deviation of Hold Time (ms)
   */
  static holdTimeStats(events: KeystrokeMetadataEvent[]): { mean: number; variance: number; std: number } {
    if (events.length === 0) return { mean: 80, variance: 100, std: 10 };

    const holdTimes = events.map((e) => Math.max(10, Math.min(2000, e.durationMs)));
    const mean = holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length;

    const variance =
      holdTimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / Math.max(1, holdTimes.length);
    const std = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      std: Math.round(std * 10) / 10,
    };
  }

  /**
   * Calculates Mean, Variance, and Standard Deviation of Flight Time / Inter-Key Interval (IKI) (ms)
   * Prolonged flight time = psychomotor slowing (depression).
   * Short erratic flight time = agitation / hypomania.
   */
  static flightTimeStats(events: KeystrokeMetadataEvent[]): { mean: number; variance: number; std: number } {
    if (events.length <= 1) return { mean: 150, variance: 400, std: 20 };

    const flightTimes = events
      .map((e) => e.interKeyDelayMs)
      .filter((iki) => iki >= 10 && iki <= 4000); // Exclude long multi-minute breaks

    if (flightTimes.length === 0) return { mean: 150, variance: 400, std: 20 };

    const mean = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;
    const variance =
      flightTimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / Math.max(1, flightTimes.length);
    const std = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      std: Math.round(std * 10) / 10,
    };
  }

  /**
   * Computes Backspace & Error Correction Rate:
   * $$Rate = \frac{N_{backspace}}{N_{total}}$$
   */
  static backspaceRate(events: KeystrokeMetadataEvent[]): number {
    if (events.length === 0) return 0.04;

    const backspaceCount = events.filter((e) => e.eventType === 'BACKSPACE').length;
    const rate = (backspaceCount / events.length) * 100; // As percentage
    return Math.round(rate * 10) / 10;
  }

  /**
   * Computes Burstiness Index ($B$):
   * Grounded in Goh & Barabási (2008) burstiness parameter:
   * $$B = \frac{\sigma - \mu}{\sigma + \mu} \in [-1, 1]$$
   * - $B > 0$: Bursty typing (rapid bursts followed by long hesitate pauses - associated with cognitive load / distraction).
   * - $B \approx 0$: Poissonian memoryless typing.
   * - $B < 0$: Highly regular periodic typing.
   */
  static burstinessIndex(events: KeystrokeMetadataEvent[]): number {
    const flightTimes = events
      .map((e) => e.interKeyDelayMs)
      .filter((iki) => iki >= 10 && iki <= 4000);

    if (flightTimes.length < 3) return 0;

    const mean = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;
    const variance =
      flightTimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / flightTimes.length;
    const std = Math.sqrt(variance);

    if (std + mean <= 0.001) return 0;
    const b = (std - mean) / (std + mean);

    return Math.round(Math.max(-1, Math.min(1, b)) * 1000) / 1000;
  }

  /**
   * Estimates Typing Speed in Words Per Minute (WPM) based on keystroke frequency
   * (Assuming standard 5 characters = 1 word)
   */
  static estimateTypingSpeedWpm(events: KeystrokeMetadataEvent[]): number {
    if (events.length < 5) return 40;

    const flightStats = KeystrokeFeatureExtractor.flightTimeStats(events);
    const holdStats = KeystrokeFeatureExtractor.holdTimeStats(events);
    const totalStrokeTimeMs = Math.max(100, flightStats.mean + holdStats.mean);

    // Characters per minute = (60,000 / totalStrokeTimeMs)
    // WPM = CPM / 5
    const wpm = (60000 / totalStrokeTimeMs) / 5;
    return Math.round(Math.min(130, Math.max(10, wpm)));
  }
}
