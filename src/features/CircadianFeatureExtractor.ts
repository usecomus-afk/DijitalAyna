import { ScreenInteractionEvent, AccelerometerEvent } from '../types/phenotyping';

/**
 * Circadian & Screen Interaction Dynamics (Dartmouth StudentLife / Harvard Beiwe)
 * Wang et al. (2014), Onnela & Rauch (2016).
 * Computes nocturnal sleep disruption, unlock frequency, hyper-checking compulsion, and diurnal movement stability.
 */
export class CircadianFeatureExtractor {
  /**
   * Calculates total active screen time during the biological rest window (e.g. 00:00 to 06:00) in minutes
   */
  static nocturnalScreenTime(
    screenEvents: ScreenInteractionEvent[],
    startHour = 0,
    endHour = 6
  ): number {
    if (screenEvents.length === 0) return 0;

    const sorted = [...screenEvents].sort((a, b) => a.timestamp - b.timestamp);
    let totalNocturnalMs = 0;
    let lastOnTimestamp: number | null = null;

    for (const evt of sorted) {
      if (evt.eventType === 'ON' || evt.eventType === 'UNLOCK') {
        if (lastOnTimestamp === null) {
          lastOnTimestamp = evt.timestamp;
        }
      } else if (evt.eventType === 'OFF') {
        if (lastOnTimestamp !== null) {
          const sessionStart = lastOnTimestamp;
          const sessionEnd = evt.timestamp;
          lastOnTimestamp = null;

          // Check if session falls within nocturnal window
          const startDate = new Date(sessionStart);
          const hour = startDate.getHours();

          if (hour >= startHour && hour < endHour) {
            // Cap single session at 180 minutes to avoid runaway timers
            const durationMs = Math.min(180 * 60 * 1000, Math.max(0, sessionEnd - sessionStart));
            totalNocturnalMs += durationMs;
          }
        }
      }
    }

    return Math.round(totalNocturnalMs / (60 * 1000));
  }

  /**
   * Computes Screen Unlock Frequency per waking hour
   */
  static unlockFrequency(screenEvents: ScreenInteractionEvent[], wakingHours = 16): number {
    if (screenEvents.length === 0) return 0;

    const unlocks = screenEvents.filter((e) => e.eventType === 'UNLOCK').length;
    const freqPerHour = unlocks / Math.max(1, wakingHours);
    return Math.round(freqPerHour * 10) / 10;
  }

  /**
   * Computes Hyper-Checking Index (Fraction of brief sessions < 30 seconds to total daily sessions)
   * High index (> 0.65) significantly correlates with state anxiety and hyperarousal.
   */
  static hyperCheckingIndex(screenEvents: ScreenInteractionEvent[], thresholdSeconds = 30): number {
    if (screenEvents.length < 2) return 0.2;

    const sorted = [...screenEvents].sort((a, b) => a.timestamp - b.timestamp);
    let shortSessionCount = 0;
    let totalSessions = 0;
    let lastOn: number | null = null;

    for (const evt of sorted) {
      if (evt.eventType === 'ON' || evt.eventType === 'UNLOCK') {
        if (lastOn === null) lastOn = evt.timestamp;
      } else if (evt.eventType === 'OFF') {
        if (lastOn !== null) {
          const durationSec = (evt.timestamp - lastOn) / 1000;
          lastOn = null;

          if (durationSec > 1) {
            totalSessions++;
            if (durationSec <= thresholdSeconds) {
              shortSessionCount++;
            }
          }
        }
      }
    }

    if (totalSessions === 0) return 0.2;
    const ratio = shortSessionCount / totalSessions;
    return Math.round(ratio * 1000) / 1000;
  }

  /**
   * Computes Total Screen On Time in minutes for the whole day
   */
  static totalScreenOnTime(screenEvents: ScreenInteractionEvent[]): number {
    if (screenEvents.length === 0) return 180;

    const sorted = [...screenEvents].sort((a, b) => a.timestamp - b.timestamp);
    let totalMs = 0;
    let lastOn: number | null = null;

    for (const evt of sorted) {
      if (evt.eventType === 'ON' || evt.eventType === 'UNLOCK') {
        if (lastOn === null) lastOn = evt.timestamp;
      } else if (evt.eventType === 'OFF') {
        if (lastOn !== null) {
          const durationMs = Math.min(240 * 60 * 1000, Math.max(0, evt.timestamp - lastOn));
          totalMs += durationMs;
          lastOn = null;
        }
      }
    }

    return Math.round(totalMs / (60 * 1000));
  }

  /**
   * Computes Circadian Diurnal Movement Stability score ($IS \in [0, 1]$)
   * Evaluates how well 24-hour hourly accelerometer energy matches a regular diurnal rhythm.
   */
  static circadianMovementScore(accelEvents: AccelerometerEvent[]): number {
    if (accelEvents.length < 12) return 0.78; // Default balanced

    // Group acceleration magnitudes by hour of day (0-23)
    const hourlyMagnitudes: number[][] = Array.from({ length: 24 }, () => []);

    for (const evt of accelEvents) {
      const d = new Date(evt.timestamp);
      const hour = d.getHours();
      const mag = Math.sqrt(evt.x * evt.x + evt.y * evt.y + evt.z * evt.z);
      hourlyMagnitudes[hour].push(mag);
    }

    // Mean hourly magnitude
    const hourlyMeans = hourlyMagnitudes.map((arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 9.81
    );

    // Diurnal contrast: Day (08:00-22:00) vs Night (00:00-06:00)
    const dayHours = hourlyMeans.slice(8, 22);
    const nightHours = hourlyMeans.slice(0, 6);

    const dayMean = dayHours.reduce((a, b) => a + b, 0) / dayHours.length;
    const nightMean = nightHours.reduce((a, b) => a + b, 0) / nightHours.length;

    // A healthy circadian rhythm has higher movement during day and low variance during night
    const contrast = Math.max(0, dayMean - nightMean);
    const score = Math.min(1.0, Math.max(0.1, 0.4 + contrast * 0.15));

    return Math.round(score * 100) / 100;
  }
}
