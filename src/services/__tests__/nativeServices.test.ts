import { describe, it, expect } from 'vitest';
import { healthService } from '../native/healthService';
import { deviceBatteryService } from '../native/deviceBatteryService';
import { mobilityService } from '../native/mobilityService';
import { keystrokeTracker } from '../keystrokeTracker';

describe('Native Biomarker Services (Zero-Mock & Fallback Guardrails)', () => {
  describe('HealthService', () => {
    it('should return missing status with transparent error when executed in non-native test environment', async () => {
      const steps = await healthService.getTodaySteps();
      expect(steps.value).toBeNull();
      expect(steps.source).toBe('missing');
      expect(steps.error).toContain('Apple HealthKit');

      const sleep = await healthService.getYesterdaySleep();
      expect(sleep.tst).toBeNull();
      expect(sleep.source).toBe('missing');
    });

    it('should reject permissions gracefully on unsupported web/node environment', async () => {
      const perm = await healthService.requestHealthPermissions();
      expect(perm.granted).toBe(false);
      expect(perm.error).toBeDefined();
    });
  });

  describe('DeviceBatteryService', () => {
    it('should calculate night charging metrics safely when empty', () => {
      const night = deviceBatteryService.getNightChargingMetrics();
      expect(night).toBeDefined();
      expect(night.nightChargingMinutes).toBe(0);
      expect(night.chargingContinuityPct).toBe(0);
    });
  });

  describe('MobilityService', () => {
    it('should compute radius of gyration and homestay with DBSCAN clusters correctly', () => {
      const samplePoints = [
        { latitude: 41.0082, longitude: 28.9784, accuracy: 5, timestamp: 1000 },
        { latitude: 41.0083, longitude: 28.9785, accuracy: 5, timestamp: 2000 },
        { latitude: 41.0081, longitude: 28.9783, accuracy: 5, timestamp: 3000 },
        { latitude: 41.0150, longitude: 28.9850, accuracy: 5, timestamp: 4000 },
      ];

      const res = mobilityService.calculateMobilityMetrics(samplePoints);
      expect(res.source).toBe('native-sensor');
      expect(res.radiusOfGyrationKm).toBeGreaterThan(0);
      expect(res.homestayPercentage).toBeGreaterThan(0);
      expect(res.significantLocationsCount).toBeGreaterThanOrEqual(1);
    });

    it('should return missing status when fewer than 2 points are recorded', () => {
      const res = mobilityService.calculateMobilityMetrics([]);
      expect(res.source).toBe('missing');
      expect(res.radiusOfGyrationKm).toBeNull();
    });
  });

  describe('KeystrokeTracker', () => {
    it('should return null metrics when keystrokes are fewer than minimum threshold', () => {
      const summary = keystrokeTracker.getRecentMetrics();
      expect(summary).toBeNull();
    });
  });
});
