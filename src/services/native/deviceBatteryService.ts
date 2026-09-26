import { Capacitor } from '@capacitor/core';
import { Device, BatteryInfo } from '@capacitor/device';
import { db } from '../../db';

export interface BatteryTelemetryResult {
  batteryLevel: number | null;
  isCharging: boolean | null;
  source: 'native-sensor' | 'web-api' | 'missing';
  error?: string;
}

export interface NightChargingCycle {
  inNightWindow: boolean;
  nightChargingMinutes: number;
  chargingContinuityPct: number;
  firstPluggedHour: number | null;
}

class DeviceBatteryService {
  private isMonitoring = false;
  private intervalTimer: any = null;
  private nightSamples: { timestamp: number; isCharging: boolean }[] = [];

  /**
   * Get real-time battery status via Capacitor Device API or Web Battery API
   */
  async getBatteryStatus(): Promise<BatteryTelemetryResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        const info: BatteryInfo = await Device.getBatteryInfo();
        if (typeof info.batteryLevel === 'number' && !isNaN(info.batteryLevel)) {
          return {
            batteryLevel: Math.round(info.batteryLevel * 100),
            isCharging: Boolean(info.isCharging),
            source: 'native-sensor',
          };
        }
      } catch (err: any) {
        console.warn('[DeviceBatteryService] Native battery read failed:', err);
        return {
          batteryLevel: null,
          isCharging: null,
          source: 'missing',
          error: err?.message || 'iOS Device Battery API okunamadı.',
        };
      }
    }

    // Web fallback (if browser supports Battery API)
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        if (typeof battery.level === 'number' && !isNaN(battery.level)) {
          return {
            batteryLevel: Math.round(battery.level * 100),
            isCharging: Boolean(battery.charging),
            source: 'web-api',
          };
        }
      } catch (err: any) {
        console.warn('[DeviceBatteryService] Web battery read failed:', err);
      }
    }

    // ZERO MOCK POLICY: Never return fake battery numbers
    return {
      batteryLevel: null,
      isCharging: null,
      source: 'missing',
      error: 'Cihaz veya tarayıcı pil durumu erişimini engelliyor (Safari/WebKit kısıtı).',
    };
  }

  /**
   * Record a single battery telemetry sample and check night charging patterns
   */
  async recordTelemetrySample(): Promise<void> {
    const status = await this.getBatteryStatus();
    if (status.batteryLevel === null || status.source === 'missing') {
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];

    // Check night window (22:00 - 08:00)
    const isNightWindow = currentHour >= 22 || currentHour < 8;
    if (isNightWindow) {
      this.nightSamples.push({
        timestamp: Date.now(),
        isCharging: Boolean(status.isCharging),
      });

      // Keep only last 24 hours of night samples
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.nightSamples = this.nightSamples.filter((s) => s.timestamp >= dayAgo);
    }

    // Save event to IndexedDB
    await db.logSensorEvent({
      type: 'battery',
      timestamp: Date.now(),
      payload: {
        battery_level: status.batteryLevel,
        is_charging: status.isCharging ? 1 : 0,
      },
      provenance: {
        source: status.source,
        confidence: 1.0,
        timestamp: Date.now(),
      },
    });

    // Update daily metrics for battery_level and is_charging
    await this.updateDailyMetric('battery_level', today, status.batteryLevel);
    await this.updateDailyMetric('is_charging', today, status.isCharging ? 1 : 0);
  }

  /**
   * Evaluate night charging consistency between 22:00 and 08:00
   */
  getNightChargingMetrics(): NightChargingCycle {
    const now = new Date();
    const currentHour = now.getHours();
    const inNightWindow = currentHour >= 22 || currentHour < 8;

    if (this.nightSamples.length === 0) {
      return {
        inNightWindow,
        nightChargingMinutes: 0,
        chargingContinuityPct: 0,
        firstPluggedHour: null,
      };
    }

    const chargingSamples = this.nightSamples.filter((s) => s.isCharging);
    const continuityPct = Math.round((chargingSamples.length / this.nightSamples.length) * 100);

    let firstPluggedHour: number | null = null;
    const firstCharging = chargingSamples[0];
    if (firstCharging) {
      firstPluggedHour = new Date(firstCharging.timestamp).getHours();
    }

    return {
      inNightWindow,
      nightChargingMinutes: chargingSamples.length * 15, // Assuming 15-min sampling
      chargingContinuityPct: continuityPct,
      firstPluggedHour,
    };
  }

  private async updateDailyMetric(metricKey: 'battery_level' | 'is_charging', date: string, value: number): Promise<void> {
    const existing = await db.dailyMetrics
      .where('[metricKey+date]')
      .equals([metricKey, date])
      .first();

    if (existing && existing.id) {
      // Calculate running average for level, or max for charging
      const newValue = metricKey === 'battery_level'
        ? Math.round((existing.value + value) / 2)
        : Math.max(existing.value, value);

      await db.dailyMetrics.update(existing.id, {
        value: newValue,
        sampleCount: (existing.sampleCount || 1) + 1,
      });
    } else {
      await db.dailyMetrics.add({
        date,
        metricKey,
        value,
        sampleCount: 1,
      });
    }
  }

  startMonitoring(intervalMs = 15 * 60 * 1000): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.recordTelemetrySample();
    this.intervalTimer = setInterval(() => this.recordTelemetrySample(), intervalMs);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

export const deviceBatteryService = new DeviceBatteryService();
