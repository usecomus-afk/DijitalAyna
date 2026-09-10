import { db } from '../db';
import { Motion } from '@capacitor/motion';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { sensorCapabilities } from './capabilities';
import { TelemetryPipeline } from './telemetry';

class MotionSensorCollector {
  private isRunning = false;
  private accelMagnitudes: number[] = [];
  private lastSampleTime = 0;
  private intervalTimer: any = null;
  private nativeListenerHandle: PluginListenerHandle | null = null;

  async requestPermission(): Promise<boolean> {
    return await sensorCapabilities.requestMotionPermission();
  }

  async start(): Promise<void> {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;
    this.accelMagnitudes = [];

    // 1. Native iOS / Android Capacitor Motion Integration
    if (Capacitor.isNativePlatform()) {
      try {
        this.nativeListenerHandle = await Motion.addListener('accel', (event) => {
          const now = Date.now();
          if (now - this.lastSampleTime < 100) return; // 10Hz throttle
          this.lastSampleTime = now;

          const acc = event.accelerationIncludingGravity || event.acceleration;
          if (!acc) return;

          const x = acc.x || 0;
          const y = acc.y || 0;
          const z = acc.z || 0;
          const magnitude = Math.sqrt(x * x + y * y + z * z);

          this.accelMagnitudes.push(magnitude);
          if (this.accelMagnitudes.length > 200) {
            this.accelMagnitudes.shift();
          }

          // Forward to Telemetry Pipeline
          TelemetryPipeline.getInstance().ingestAccelerometer({ x, y, z, timestamp: now });
        });
      } catch (e) {
        console.warn('[MotionSensor] Native motion listener error:', e);
      }
    } else {
      // 2. Web fallback (devicemotion only - NO pointer/mouse simulation)
      if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', this.handleMotion, { passive: true });
      }
    }

    // Flush aggregated motion metric every 30 seconds
    this.intervalTimer = setInterval(() => this.flush(), 30000);
  }

  stop(): void {
    if (!this.isRunning || typeof window === 'undefined') return;
    this.isRunning = false;

    if (this.nativeListenerHandle) {
      this.nativeListenerHandle.remove();
      this.nativeListenerHandle = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotion);
    }

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.flush();
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    const now = Date.now();
    if (now - this.lastSampleTime < 100) return; // Throttle to 10Hz
    this.lastSampleTime = now;

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    this.accelMagnitudes.push(magnitude);
    if (this.accelMagnitudes.length > 200) {
      this.accelMagnitudes.shift();
    }

    // Forward to Telemetry Pipeline
    TelemetryPipeline.getInstance().ingestAccelerometer({ x, y, z, timestamp: now });
  };

  async flush(): Promise<void> {
    // STRICT ZERO MOCK POLICY: If no genuine accelerometer readings were recorded, do NOT log arbitrary numbers
    if (this.accelMagnitudes.length < 5) {
      this.accelMagnitudes = [];
      return;
    }

    const mean = this.accelMagnitudes.reduce((a, b) => a + b, 0) / this.accelMagnitudes.length;
    const variance = this.accelMagnitudes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.accelMagnitudes.length;
    const mobilityScore = Math.min(100, Math.max(15, Math.round(variance * 15 + 45)));

    await db.logSensorEvent({
      type: 'motion',
      timestamp: Date.now(),
      payload: {
        mobility_index: mobilityScore,
        tremor_variance: Math.round(variance * 1000) / 1000,
      },
      provenance: {
        source: Capacitor.isNativePlatform() ? 'native-sensor' : 'web-api',
        confidence: Math.min(1.0, this.accelMagnitudes.length / 50),
        timestamp: Date.now(),
      },
    });

    this.accelMagnitudes = [];
  }
}

export const motionSensor = new MotionSensorCollector();
