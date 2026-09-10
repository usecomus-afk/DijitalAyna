import { db } from '../db';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

class BatterySensorCollector {
  private isRunning = false;
  private batteryObj: any = null;
  private intervalTimer: any = null;

  async start(): Promise<void> {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;

    if (Capacitor.isNativePlatform()) {
      // Native iOS / Android direct battery capture
      await this.logBattery();
    } else if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        this.batteryObj = await (navigator as any).getBattery();
        await this.logBattery();

        this.batteryObj.addEventListener('levelchange', this.handleBatteryChange);
        this.batteryObj.addEventListener('chargingchange', this.handleBatteryChange);
      } catch (err) {
        console.log('[BatterySensor] Web Battery API not accessible:', err);
      }
    }
    // ZERO MOCK POLICY: If neither native nor web battery API is available, do NOT log fake 85%.

    // Periodic flush every 15 minutes
    this.intervalTimer = setInterval(() => this.logBattery(), 15 * 60000);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.batteryObj) {
      this.batteryObj.removeEventListener('levelchange', this.handleBatteryChange);
      this.batteryObj.removeEventListener('chargingchange', this.handleBatteryChange);
      this.batteryObj = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private handleBatteryChange = () => {
    this.logBattery();
  };

  private async logBattery(): Promise<void> {
    let level: number | null = null;
    let charging: number | null = null;
    let source: 'native-sensor' | 'web-api' = 'web-api';

    if (Capacitor.isNativePlatform()) {
      source = 'native-sensor';
      try {
        const info = await Device.getBatteryInfo();
        if (typeof info.batteryLevel === 'number' && !isNaN(info.batteryLevel)) {
          level = Math.round(info.batteryLevel * 100);
          charging = info.isCharging ? 1 : 0;
        }
      } catch (e) {
        console.warn('[BatterySensor] Native battery reading failed:', e);
      }
    } else if (this.batteryObj) {
      source = 'web-api';
      if (typeof this.batteryObj.level === 'number' && !isNaN(this.batteryObj.level)) {
        level = Math.round(this.batteryObj.level * 100);
        charging = this.batteryObj.charging ? 1 : 0;
      }
    }

    // ZERO MOCK POLICY: If level could not be read, do NOT write fake fallback numbers
    if (level === null) return;

    await db.logSensorEvent({
      type: 'battery',
      timestamp: Date.now(),
      payload: {
        battery_level: level,
        is_charging: charging ?? 0,
      },
      provenance: {
        source,
        confidence: 1.0,
        timestamp: Date.now(),
      },
    });
  }
}

export const batterySensor = new BatterySensorCollector();
