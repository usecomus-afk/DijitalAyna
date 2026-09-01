import { db } from '../db';
import { Motion } from '@capacitor/motion';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

class MotionSensorCollector {
  private isRunning = false;
  private accelMagnitudes: number[] = [];
  private lastSampleTime = 0;
  private intervalTimer: any = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private nativeListenerHandle: PluginListenerHandle | null = null;

  async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return true; // Native iOS handles CoreMotion via Info.plist usage description
    }
    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        return response === 'granted';
      } catch (err) {
        console.warn('[MotionSensor] Web permission request error:', err);
        return false;
      }
    }
    return true;
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
        });
      } catch (e) {
        console.warn('[MotionSensor] Native motion listener error, falling back to web:', e);
      }
    } else {
      // 2. Web fallback (devicemotion)
      if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', this.handleMotion, { passive: true });
      }

      // Pointer / mouse movement as desktop/laptop fallback for motion index
      window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
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

    window.removeEventListener('devicemotion', this.handleMotion);
    window.removeEventListener('pointermove', this.handlePointerMove);

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
  };

  private handlePointerMove = (event: PointerEvent) => {
    const now = Date.now();
    if (now - this.lastSampleTime < 120) return;
    this.lastSampleTime = now;

    const dx = event.clientX - this.lastPointerX;
    const dy = event.clientY - this.lastPointerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;

    if (dist > 0 && dist < 1000) {
      // Map pointer pixel velocity to equivalent acceleration magnitude
      const simulatedMag = Math.min(25, Math.max(9.8, 9.8 + dist * 0.05));
      this.accelMagnitudes.push(simulatedMag);
      if (this.accelMagnitudes.length > 200) {
        this.accelMagnitudes.shift();
      }
    }
  };

  async flush(): Promise<void> {
    if (this.accelMagnitudes.length < 2) return;

    const mean = this.accelMagnitudes.reduce((a, b) => a + b, 0) / this.accelMagnitudes.length;
    const variance = this.accelMagnitudes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.accelMagnitudes.length;
    const mobilityScore = Math.min(100, Math.max(15, Math.round(variance * 15 + 45)));

    await db.logSensorEvent({
      type: 'motion',
      timestamp: Date.now(),
      payload: {
        mobility_index: mobilityScore,
        tremor_variance: Math.round(variance * 1000) / 1000,
      }
    });

    this.accelMagnitudes = [];
  }
}

export const motionSensor = new MotionSensorCollector();
