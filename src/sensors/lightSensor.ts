import { db } from '../db';

class LightSensorCollector {
  private isRunning = false;
  private sensorInstance: any = null;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check if AmbientLightSensor is supported and available
    if (typeof window !== 'undefined' && 'AmbientLightSensor' in window) {
      try {
        const AmbientLight = (window as any).AmbientLightSensor;
        this.sensorInstance = new AmbientLight();
        this.sensorInstance.addEventListener('reading', () => {
          if (typeof this.sensorInstance.illuminance === 'number' && !isNaN(this.sensorInstance.illuminance)) {
            this.logLight(this.sensorInstance.illuminance);
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

    // ZERO MOCK POLICY: If AmbientLightSensor is unsupported (e.g. WebKit / Safari),
    // strictly do NOT generate circadian time-of-day estimated lux values.
    // The metric remains null/missing for honest data provenance.
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
  }

  private async logLight(lux: number): Promise<void> {
    await db.logSensorEvent({
      type: 'light',
      timestamp: Date.now(),
      payload: {
        light_ambient_lux: Math.max(0, Math.round(lux)),
      },
      provenance: {
        source: 'web-api',
        confidence: 0.95,
        timestamp: Date.now(),
      },
    });
  }
}

export const lightSensor = new LightSensorCollector();
