import { describe, it, expect } from 'vitest';
import { CircadianFeatureExtractor } from '../CircadianFeatureExtractor';
import { ScreenInteractionEvent, AccelerometerEvent } from '../../types/phenotyping';

describe('CircadianFeatureExtractor - StudentLife & Circadian Rhythm Analysis', () => {
  it('should compute Nocturnal Screen Time (00:00 to 06:00)', () => {
    // Create night session: 03:00 to 03:20 (20 minutes local time)
    const nightDate = new Date(2026, 7, 25, 3, 0, 0);
    const nightStart = nightDate.getTime();
    const nightEnd = nightStart + 20 * 60 * 1000;

    const events: ScreenInteractionEvent[] = [
      { eventType: 'UNLOCK', timestamp: nightStart },
      { eventType: 'OFF', timestamp: nightEnd },
    ];

    const mins = CircadianFeatureExtractor.nocturnalScreenTime(events, 0, 6);
    expect(mins).toBe(20);
  });

  it('should compute Screen Unlock Frequency per waking hour', () => {
    const events: ScreenInteractionEvent[] = [
      { eventType: 'UNLOCK', timestamp: 1000 },
      { eventType: 'UNLOCK', timestamp: 2000 },
      { eventType: 'UNLOCK', timestamp: 3000 },
      { eventType: 'UNLOCK', timestamp: 4000 },
    ];

    // 4 unlocks over 16 waking hours = 0.25 / hr = 0.3 rounded
    const freq = CircadianFeatureExtractor.unlockFrequency(events, 16);
    expect(freq).toBe(0.3);
  });

  it('should compute Hyper-Checking Index (compulsive short sessions)', () => {
    const baseTime = 100000;
    const events: ScreenInteractionEvent[] = [
      // Session 1: 15s (short)
      { eventType: 'UNLOCK', timestamp: baseTime },
      { eventType: 'OFF', timestamp: baseTime + 15000 },
      // Session 2: 10s (short)
      { eventType: 'UNLOCK', timestamp: baseTime + 30000 },
      { eventType: 'OFF', timestamp: baseTime + 40000 },
      // Session 3: 120s (long)
      { eventType: 'UNLOCK', timestamp: baseTime + 60000 },
      { eventType: 'OFF', timestamp: baseTime + 180000 },
    ];

    // 2 out of 3 sessions < 30s -> ~0.667
    const hyperIndex = CircadianFeatureExtractor.hyperCheckingIndex(events, 30);
    expect(hyperIndex).toBeCloseTo(0.667, 2);
  });

  it('should compute Circadian Movement Score for diurnal acceleration rhythm', () => {
    const accelEvents: AccelerometerEvent[] = [];
    const baseDate = new Date('2026-08-25T00:00:00Z').getTime();

    // 24 hours of simulated acceleration
    for (let h = 0; h < 24; h++) {
      const isDay = h >= 8 && h <= 20;
      // Day has higher movement intensity (12.0 m/s^2), night has resting gravity (~9.81 m/s^2)
      const magnitude = isDay ? 12.5 : 9.81;
      accelEvents.push({
        x: 0,
        y: magnitude,
        z: 0,
        timestamp: baseDate + h * 3600 * 1000,
      });
    }

    const score = CircadianFeatureExtractor.circadianMovementScore(accelEvents);
    expect(score).toBeGreaterThan(0.6);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});
