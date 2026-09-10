import { Capacitor } from '@capacitor/core';

export type SensorCapabilityKey = 'motion' | 'microphone' | 'geolocation' | 'battery' | 'light';
export type SensorCapabilityStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

type CapabilityChangeListener = (capabilities: Record<SensorCapabilityKey, SensorCapabilityStatus>) => void;

/**
 * SensorCapabilityManager
 * Centralized hardware and sensor capability detection & permission orchestrator.
 * Adheres strictly to the "Zero Mock / No Simulation" policy.
 */
export class SensorCapabilityManager {
  private static instance: SensorCapabilityManager;
  private statuses: Record<SensorCapabilityKey, SensorCapabilityStatus> = {
    motion: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt',
    battery: 'prompt',
    light: 'prompt',
  };
  private listeners: Set<CapabilityChangeListener> = new Set();

  private constructor() {
    this.detectInitialCapabilities();
  }

  static getInstance(): SensorCapabilityManager {
    if (!SensorCapabilityManager.instance) {
      SensorCapabilityManager.instance = new SensorCapabilityManager();
    }
    return SensorCapabilityManager.instance;
  }

  /**
   * Evaluates platform hardware presence and initial permission state
   */
  private detectInitialCapabilities(): void {
    if (typeof window === 'undefined') {
      this.statuses = {
        motion: 'unsupported',
        microphone: 'unsupported',
        geolocation: 'unsupported',
        battery: 'unsupported',
        light: 'unsupported',
      };
      return;
    }

    const isNative = Capacitor.isNativePlatform();

    // 1. Motion
    if (isNative) {
      // Native iOS / Android has CoreMotion / accelerometer hardware
      this.statuses.motion = 'granted';
    } else if (typeof (window as any).DeviceMotionEvent !== 'undefined') {
      if (typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
        this.statuses.motion = 'prompt'; // iOS Safari requires user gesture permission
      } else {
        this.statuses.motion = 'granted'; // Modern browsers with motion sensor
      }
    } else {
      this.statuses.motion = 'unsupported';
    }

    // 2. Microphone (Voice Dynamics)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      this.statuses.microphone = 'prompt';
      // Query permissions API if available
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'microphone' as any }).then((perm) => {
          this.statuses.microphone = perm.state as SensorCapabilityStatus;
          perm.onchange = () => {
            this.statuses.microphone = perm.state as SensorCapabilityStatus;
            this.notifyListeners();
          };
        }).catch(() => {});
      }
    } else {
      this.statuses.microphone = 'unsupported';
    }

    // 3. Geolocation (Mobility & Homestay)
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      this.statuses.geolocation = 'prompt';
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'geolocation' }).then((perm) => {
          this.statuses.geolocation = perm.state as SensorCapabilityStatus;
          perm.onchange = () => {
            this.statuses.geolocation = perm.state as SensorCapabilityStatus;
            this.notifyListeners();
          };
        }).catch(() => {});
      }
    } else {
      this.statuses.geolocation = 'unsupported';
    }

    // 4. Battery
    if (isNative) {
      this.statuses.battery = 'granted'; // Handled via @capacitor/device
    } else if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      this.statuses.battery = 'granted';
    } else {
      this.statuses.battery = 'unsupported'; // E.g. iOS Safari WebKit does not expose Battery API
    }

    // 5. Ambient Light Sensor
    if (typeof window !== 'undefined' && 'AmbientLightSensor' in window) {
      this.statuses.light = 'prompt';
    } else {
      this.statuses.light = 'unsupported'; // WebKit/Safari strictly does not support Generic Sensor Light API
    }
  }

  getCapability(sensor: SensorCapabilityKey): SensorCapabilityStatus {
    return this.statuses[sensor];
  }

  getAllCapabilities(): Record<SensorCapabilityKey, SensorCapabilityStatus> {
    return { ...this.statuses };
  }

  isSupported(sensor: SensorCapabilityKey): boolean {
    return this.statuses[sensor] !== 'unsupported';
  }

  /**
   * Requests Device Motion permission. Must be triggered by a direct user gesture on iOS Safari.
   */
  async requestMotionPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      this.statuses.motion = 'granted';
      this.notifyListeners();
      return true;
    }

    if (
      typeof window !== 'undefined' &&
      typeof (window as any).DeviceMotionEvent !== 'undefined' &&
      typeof (window as any).DeviceMotionEvent?.requestPermission === 'function'
    ) {
      try {
        const res = await (window as any).DeviceMotionEvent.requestPermission();
        const granted = res === 'granted';
        this.statuses.motion = granted ? 'granted' : 'denied';
        this.notifyListeners();
        return granted;
      } catch (err) {
        console.warn('[SensorCapabilityManager] Motion permission request rejected:', err);
        this.statuses.motion = 'denied';
        this.notifyListeners();
        return false;
      }
    }

    // Standard Android / Desktop with devicemotion
    const supported = typeof window !== 'undefined' && typeof (window as any).DeviceMotionEvent !== 'undefined';
    this.statuses.motion = supported ? 'granted' : 'unsupported';
    this.notifyListeners();
    return supported;
  }

  /**
   * Requests Microphone permission for acoustic cadence analysis.
   */
  async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.statuses.microphone = 'unsupported';
      this.notifyListeners();
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      this.statuses.microphone = 'granted';
      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn('[SensorCapabilityManager] Microphone permission denied:', err);
      this.statuses.microphone = 'denied';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Requests Geolocation permission for circadian mobility and homestay analysis.
   */
  async requestGeolocationPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.statuses.geolocation = 'unsupported';
      this.notifyListeners();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.statuses.geolocation = 'granted';
          this.notifyListeners();
          resolve(true);
        },
        (err) => {
          console.warn('[SensorCapabilityManager] Geolocation permission error:', err);
          this.statuses.geolocation = err.code === 1 ? 'denied' : 'unsupported';
          this.notifyListeners();
          resolve(false);
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  addListener(callback: CapabilityChangeListener): () => void {
    this.listeners.add(callback);
    callback(this.getAllCapabilities());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const current = this.getAllCapabilities();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('[SensorCapabilityManager] Listener error:', err);
      }
    });
  }
}

export const sensorCapabilities = SensorCapabilityManager.getInstance();
