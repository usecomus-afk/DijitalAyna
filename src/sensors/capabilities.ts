import { Capacitor } from '@capacitor/core';
import { healthService } from '../services/native/healthService';
import { mobilityService } from '../services/native/mobilityService';

export type SensorCapabilityKey = 'motion' | 'microphone' | 'geolocation' | 'battery' | 'light' | 'health' | 'camera';
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
    health: 'prompt',
    camera: 'prompt',
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
        health: 'unsupported',
        camera: 'unsupported',
      };
      return;
    }

    const isNative = Capacitor.isNativePlatform();

    // 1. Motion
    if (isNative) {
      this.statuses.motion = 'granted';
    } else if (typeof (window as any).DeviceMotionEvent !== 'undefined') {
      if (typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
        this.statuses.motion = 'prompt';
      } else {
        this.statuses.motion = 'granted';
      }
    } else {
      this.statuses.motion = 'unsupported';
    }

    // 2. Microphone (Voice Dynamics)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      const persistedMic = localStorage.getItem('comus_mic_permission');
      if (persistedMic === 'granted') {
        this.statuses.microphone = 'granted';
      } else {
        this.statuses.microphone = 'prompt';
        if (navigator.permissions && typeof navigator.permissions.query === 'function') {
          navigator.permissions.query({ name: 'microphone' as any }).then((perm) => {
            this.statuses.microphone = perm.state as SensorCapabilityStatus;
            perm.onchange = () => {
              this.statuses.microphone = perm.state as SensorCapabilityStatus;
              this.notifyListeners();
            };
          }).catch(() => {});
        }
      }
    } else {
      this.statuses.microphone = 'unsupported';
    }

    // 3. Geolocation (Mobility & Homestay)
    if (isNative || (typeof navigator !== 'undefined' && 'geolocation' in navigator)) {
      this.statuses.geolocation = 'prompt';
      if (!isNative && navigator.permissions && typeof navigator.permissions.query === 'function') {
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
      this.statuses.battery = 'granted';
    } else if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      this.statuses.battery = 'granted';
    } else {
      this.statuses.battery = 'unsupported';
    }

    // 5. Ambient Light Sensor
    if (typeof window !== 'undefined' && 'AmbientLightSensor' in window) {
      this.statuses.light = 'prompt';
    } else {
      this.statuses.light = 'unsupported';
    }

    // 6. HealthKit
    if (isNative) {
      this.statuses.health = 'prompt';
    } else {
      this.statuses.health = 'unsupported';
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
   * Requests Device Motion permission.
   */
  async requestMotionPermission(): Promise<boolean> {
    // On iOS WKWebView, DeviceMotionEvent.requestPermission is still required.
    // We remove the early native return so it falls through to the Web API check.

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
      localStorage.setItem('comus_mic_permission', 'granted');
      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn('[SensorCapabilityManager] Microphone permission denied:', err);
      this.statuses.microphone = 'denied';
      localStorage.setItem('comus_mic_permission', 'denied');
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Requests Geolocation permission for circadian mobility and homestay analysis.
   */
  async requestGeolocationPermission(): Promise<boolean> {
    try {
      const res = await mobilityService.requestLocationPermissions();
      this.statuses.geolocation = res.granted ? 'granted' : 'denied';
      this.notifyListeners();
      return res.granted;
    } catch (err) {
      console.warn('[SensorCapabilityManager] Geolocation permission error:', err);
      this.statuses.geolocation = 'denied';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Requests Apple HealthKit permissions for steps and sleep tracking.
   */
  async requestHealthPermission(): Promise<boolean> {
    try {
      const res = await healthService.requestHealthPermissions();
      this.statuses.health = res.granted ? 'granted' : 'denied';
      this.notifyListeners();
      return res.granted;
    } catch (err) {
      console.warn('[SensorCapabilityManager] Health permission error:', err);
      this.statuses.health = 'denied';
      this.notifyListeners();
      return false;
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      let granted = false;
      if (Capacitor.isNativePlatform()) {
        const { Camera } = await import('@capacitor/camera');
        // Only the camera is requested; photo-library access is not needed here.
        const permissions = await Camera.requestPermissions({ permissions: ['camera'] });
        granted = permissions.camera === 'granted' || permissions.camera === 'limited';
      } else if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach((track) => track.stop());
        granted = true;
      } else {
        this.statuses.camera = 'unsupported';
        this.notifyListeners();
        return false;
      }
      this.statuses.camera = granted ? 'granted' : 'denied';
      this.notifyListeners();
      return granted;
    } catch (err) {
      console.warn('[SensorCapabilityManager] Camera permission error:', err);
      this.statuses.camera = 'denied';
      this.notifyListeners();
      return false;
    }
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

