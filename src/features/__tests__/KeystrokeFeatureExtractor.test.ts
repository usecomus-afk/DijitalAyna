import { describe, it, expect } from 'vitest';
import { KeystrokeFeatureExtractor } from '../KeystrokeFeatureExtractor';
import { KeystrokeMetadataEvent } from '../../types/phenotyping';

describe('KeystrokeFeatureExtractor - BiAffect Dynamics & Typing Analysis', () => {
  it('should compute Hold Time mean and variance', () => {
    const events: KeystrokeMetadataEvent[] = [
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 120, timestamp: 1000 },
      { eventType: 'KEY_DOWN', durationMs: 100, interKeyDelayMs: 140, timestamp: 1200 },
      { eventType: 'KEY_DOWN', durationMs: 90, interKeyDelayMs: 130, timestamp: 1400 },
    ];

    const stats = KeystrokeFeatureExtractor.holdTimeStats(events);
    expect(stats.mean).toBe(90);
    expect(stats.variance).toBeGreaterThan(0);
    expect(stats.std).toBeCloseTo(8.16, 1);
  });

  it('should compute Flight Time / Inter-Key Interval (IKI) stats', () => {
    const events: KeystrokeMetadataEvent[] = [
      { eventType: 'KEY_DOWN', durationMs: 70, interKeyDelayMs: 100, timestamp: 1000 },
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 200, timestamp: 1200 },
      { eventType: 'KEY_DOWN', durationMs: 75, interKeyDelayMs: 300, timestamp: 1500 },
    ];

    const stats = KeystrokeFeatureExtractor.flightTimeStats(events);
    expect(stats.mean).toBe(200);
    expect(stats.std).toBeGreaterThan(50);
  });

  it('should calculate Backspace Error Rate correctly', () => {
    const events: KeystrokeMetadataEvent[] = [
      { eventType: 'KEY_DOWN', durationMs: 70, interKeyDelayMs: 100, timestamp: 1000 },
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 120, timestamp: 1200 },
      { eventType: 'BACKSPACE', durationMs: 75, interKeyDelayMs: 90, timestamp: 1400 },
      { eventType: 'KEY_DOWN', durationMs: 85, interKeyDelayMs: 110, timestamp: 1600 },
    ];

    const rate = KeystrokeFeatureExtractor.backspaceRate(events);
    expect(rate).toBe(25); // 1 out of 4 = 25%
  });

  it('should compute Goh-Barabasi Burstiness Index ($B \\in [-1, 1]$)', () => {
    // Bursty typing (long pauses mixed with rapid key taps)
    const burstyEvents: KeystrokeMetadataEvent[] = [
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 40, timestamp: 1000 },
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 50, timestamp: 1090 },
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 1200, timestamp: 2370 },
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 45, timestamp: 2495 },
      { eventType: 'KEY_DOWN', durationMs: 80, interKeyDelayMs: 1500, timestamp: 4075 },
    ];

    const b = KeystrokeFeatureExtractor.burstinessIndex(burstyEvents);
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThanOrEqual(1.0);
  });

  it('should estimate Typing Speed in WPM correctly', () => {
    // Fast typing: total stroke ~150ms -> 400 chars/min -> ~80 WPM
    const fastEvents: KeystrokeMetadataEvent[] = Array.from({ length: 10 }, (_, i) => ({
      eventType: 'KEY_DOWN',
      durationMs: 50,
      interKeyDelayMs: 100,
      timestamp: 1000 + i * 150,
    }));

    const wpm = KeystrokeFeatureExtractor.estimateTypingSpeedWpm(fastEvents);
    expect(wpm).toBe(80);
  });
});
