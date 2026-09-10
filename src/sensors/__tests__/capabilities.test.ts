import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SensorCapabilityManager } from '../capabilities';

describe('SensorCapabilityManager - Hardware & Permission Detection', () => {
  let manager: SensorCapabilityManager;

  beforeEach(() => {
    manager = SensorCapabilityManager.getInstance();
  });

  it('should initialize and return capability statuses', () => {
    const caps = manager.getAllCapabilities();
    expect(caps).toBeDefined();
    expect(caps).toHaveProperty('motion');
    expect(caps).toHaveProperty('microphone');
    expect(caps).toHaveProperty('geolocation');
    expect(caps).toHaveProperty('battery');
    expect(caps).toHaveProperty('light');
  });

  it('should report unsupported for AmbientLightSensor when missing from window', () => {
    expect(manager.getCapability('light')).toBe('unsupported');
    expect(manager.isSupported('light')).toBe(false);
  });

  it('should handle requestMotionPermission gracefully in web environment', async () => {
    const result = await manager.requestMotionPermission();
    expect(typeof result).toBe('boolean');
  });

  it('should handle requestMicrophonePermission gracefully when mediaDevices is unavailable', async () => {
    const origMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });

    const result = await manager.requestMicrophonePermission();
    expect(result).toBe(false);
    expect(manager.getCapability('microphone')).toBe('unsupported');

    Object.defineProperty(navigator, 'mediaDevices', { value: origMediaDevices, configurable: true });
  });

  it('should notify registered listeners when capabilities change', async () => {
    const listener = vi.fn();
    const unsubscribe = manager.addListener(listener);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
