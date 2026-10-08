import { describe, it, expect, vi, beforeEach } from 'vitest';

const { health, mobility, battery, startTracking, stopTracking } = vi.hoisted(() => ({
  health: vi.fn().mockResolvedValue(undefined),
  mobility: vi.fn().mockResolvedValue(undefined),
  battery: vi.fn().mockResolvedValue(undefined),
  startTracking: vi.fn().mockResolvedValue(undefined),
  stopTracking: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/native/healthService', () => ({ healthService: { syncHealthBiomarkers: health } }));
vi.mock('../../services/native/mobilityService', () => ({
  mobilityService: { syncMobilityBiomarkers: mobility, startTracking, stopTracking },
}));
vi.mock('../../services/native/deviceBatteryService', () => ({
  deviceBatteryService: { recordTelemetrySample: battery, startMonitoring: vi.fn(), stopMonitoring: vi.fn() },
}));

vi.mock('../../db', () => ({
  db: { dailyMetrics: { where: () => ({ equals: () => ({ first: async () => undefined, toArray: async () => [] }) }), update: vi.fn(), add: vi.fn() } },
}));
vi.mock('../../db/aggregations', () => ({ runDailyAggregationAndCleanup: vi.fn().mockResolvedValue(undefined) }));

import { sensorManager } from '../SensorManager';
import { UserSettings } from '../../types/user';

function settings(over: Partial<UserSettings['sensorsEnabled']>): UserSettings {
  return {
    onboardingCompleted: true,
    cloudBackupEnabled: false,
    sensorsEnabled: {
      motion: true, typing: true, touch: true, session: true, light: true,
      battery: true, network: true, voice: true, location: true,
      ...over,
    },
    notificationsEnabled: true,
    lastAnalysisTimestamp: 0,
  } as UserSettings;
}

describe('SensorManager honours user sensor toggles', () => {
  beforeEach(() => {
    health.mockClear();
    mobility.mockClear();
    battery.mockClear();
    startTracking.mockClear();
    stopTracking.mockClear();
  });

  it('location toggle controls location tracking independently of motion', () => {
    sensorManager.syncWithSettings(settings({ motion: false, location: true }));
    expect(startTracking).toHaveBeenCalled();

    startTracking.mockClear();
    sensorManager.syncWithSettings(settings({ motion: true, location: false }));
    expect(startTracking).not.toHaveBeenCalled();
    expect(stopTracking).toHaveBeenCalled();
  });

  it('does not collect health, location or battery data when those toggles are off', async () => {
    sensorManager.syncWithSettings(settings({ motion: false, location: false, battery: false }));
    await sensorManager.flushAndCollectAll();
    expect(health).not.toHaveBeenCalled();
    expect(mobility).not.toHaveBeenCalled();
    expect(battery).not.toHaveBeenCalled();
  });

  it('collects health, location and battery data when toggles are on', async () => {
    sensorManager.syncWithSettings(settings({}));
    await sensorManager.flushAndCollectAll();
    expect(health).toHaveBeenCalled();
    expect(mobility).toHaveBeenCalled();
    expect(battery).toHaveBeenCalled();
  });
});
