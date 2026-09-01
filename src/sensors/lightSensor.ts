import { db } from '../db';

class LightSensorCollector {
  private isRunning = false;
  private sensorInstance: any = null;
  private intervalTimer: any = null;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check if AmbientLightSensor is supported
    if (typeof window !== 'undefined' && 'AmbientLightSensor' in window) {
      try {
        const AmbientLight = (window as any).AmbientLightSensor;
        this.sensorInstance = new AmbientLight();
        this.sensorInstance.addEventListener('reading', () => {
          this.logLight(this.sensorInstance.illuminance);
        });
        this.sensorInstance.start();
        return;
      } catch (err) {
        console.log('[LightSensor] AmbientLightSensor API unavailable, using circadian time model');
      }
    }

    // Fallback: Circadian sun estimation based on time of day
    this.logCircadianEstimate();
    this.intervalTimer = setInterval(() => this.logCircadianEstimate(), 15 * 60000);
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
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private async logLight(lux: number): Promise<void> {
    await db.logSensorEvent({
      type: 'light',
      timestamp: Date.now(),
      payload: {
        light_ambient_lux: Math.max(1, Math.round(lux)),
      }
    });
  }

  private logCircadianEstimate(): void {
    const hour = new Date().getHours();
    let estimatedLux = 350;
    if (hour >= 23 || hour < 6) {
      estimatedLux = 15; // night darkness
    } else if (hour >= 6 && hour < 9) {
      estimatedLux = 200; // morning light
    } else if (hour >= 9 && hour < 17) {
      estimatedLux = 550; // bright daylight
    } else {
      estimatedLux = 180; // evening dim light
    }

    this.logLight(estimatedLux);
  }
}

export const lightSensor = new LightSensorCollector();
