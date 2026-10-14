import { db } from '../db';
import { Capacitor } from '@capacitor/core';

class LightSensorCollector {
  private isRunning = false;
  private sensorInstance: any = null;
  private proxyInterval: any = null;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Try Native Web AmbientLightSensor (Android Chrome / flags enabled)
    if (typeof window !== 'undefined' && 'AmbientLightSensor' in window) {
      try {
        const AmbientLight = (window as any).AmbientLightSensor;
        this.sensorInstance = new AmbientLight();
        this.sensorInstance.addEventListener('reading', () => {
          if (typeof this.sensorInstance.illuminance === 'number' && !isNaN(this.sensorInstance.illuminance)) {
            this.logLight(this.sensorInstance.illuminance, 'web-api');
          }
        });
        this.sensorInstance.addEventListener('error', (event: any) => {
          console.warn('[LightSensor] AmbientLightSensor error:', event.error);
        });
        this.sensorInstance.start();
        return;
      } catch (err) {
        console.warn('[LightSensor] AmbientLightSensor API unavailable:', err);
      }
    }

    // 2. Proxy: Use ScreenBrightness on iOS/Android as a hardware proxy for ambient light
    if (Capacitor.isNativePlatform()) {
      try {
        const { ScreenBrightness } = await import('@capacitor-community/screen-brightness');
        
        // Poll brightness every 30 seconds since we don't have event listeners for brightness changes
        this.proxyInterval = setInterval(async () => {
          try {
            const { brightness } = await ScreenBrightness.getBrightness();
            // brightness is 0.0 to 1.0. Let's map it pseudo-lux 0 to 1000
            const proxyLux = brightness * 1000;
            this.logLight(proxyLux, 'screen-brightness-proxy');
          } catch (e) {
            // ignore
          }
        }, 30000);

        // Run once immediately
        const { brightness } = await ScreenBrightness.getBrightness();
        this.logLight(brightness * 1000, 'screen-brightness-proxy');
        return;
      } catch (e) {
        console.warn('[LightSensor] ScreenBrightness plugin not available or error:', e);
      }
    }

    // ZERO MOCK POLICY: If both are unsupported, strictly do NOT generate fabricated values.
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.sensorInstance) {
      try {
        this.sensorInstance.stop();
      } catch (e) {}
      this.sensorInstance = null;
    }
    
    if (this.proxyInterval) {
      clearInterval(this.proxyInterval);
      this.proxyInterval = null;
    }
  }

  async flush(): Promise<void> {
    if (this.sensorInstance && typeof this.sensorInstance.illuminance === 'number' && !isNaN(this.sensorInstance.illuminance)) {
      await this.logLight(this.sensorInstance.illuminance, 'web-api');
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const { ScreenBrightness } = await import('@capacitor-community/screen-brightness');
        const { brightness } = await ScreenBrightness.getBrightness();
        if (typeof brightness === 'number' && !isNaN(brightness) && brightness >= 0) {
          await this.logLight(brightness * 1000, 'screen-brightness-proxy');
        }
      } catch (e) {
        // ignore if unavailable
      }
    }
  }

  private async logLight(lux: number, source: 'web-api' | 'screen-brightness-proxy' = 'web-api'): Promise<void> {
    const cleanLux = Math.max(0, Math.round(lux));
    const hour = new Date().getHours();
    const isNight = hour >= 23 || hour < 6;
    const violation = isNight && cleanLux > 700 ? 1 : 0;

    await db.logSensorEvent({
      type: 'light',
      timestamp: Date.now(),
      payload: {
        light_ambient_lux: cleanLux,
        night_light_violations: violation,
      },
      provenance: {
        source,
        confidence: source === 'screen-brightness-proxy' ? 0.70 : 0.95,
        timestamp: Date.now(),
      },
    });
  }
}

export const lightSensor = new LightSensorCollector();
