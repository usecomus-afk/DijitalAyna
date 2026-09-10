import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../db';
import { motionSensor } from '../motionSensor';
import { lightSensor } from '../lightSensor';
import { voiceSensor } from '../voiceSensor';
import { batterySensor } from '../batterySensor';

describe('Sensors - Zero Mock & No Simulation Policy Enforcement', () => {
  let logSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    logSpy = vi.spyOn(db, 'logSensorEvent').mockResolvedValue(1);
  });

  it('motionSensor: should NOT log fake mobility or tremor when no accelerometer events are received', async () => {
    // Flush without any real accelerometer events
    await motionSensor.flush();

    // Verify db.logSensorEvent was NOT called
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('lightSensor: should NOT generate fake circadian lux estimates when AmbientLightSensor is unsupported', async () => {
    // Start lightSensor in environment where AmbientLightSensor does not exist
    await lightSensor.start();

    // Verify db.logSensorEvent was NOT called
    expect(logSpy).not.toHaveBeenCalled();

    lightSensor.stop();
  });

  it('voiceSensor: should return source: "missing" and NOT write randomized data to DB when microphone is unavailable', async () => {
    const origMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });

    const result = await voiceSensor.analyzeSpeechSample(2);

    expect(result.source).toBe('missing');
    expect(result.pitchVariance).toBeNull();
    expect(result.speechRate).toBeNull();
    expect(result.pauseRatio).toBeNull();

    // Verify db.logSensorEvent was NOT called with fake data
    expect(logSpy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'mediaDevices', { value: origMediaDevices, configurable: true });
  });

  it('batterySensor: should NOT log default 85% when battery API is unavailable', async () => {
    const origGetBattery = (navigator as any).getBattery;
    (navigator as any).getBattery = undefined;

    await batterySensor.start();

    // Verify db.logSensorEvent was NOT called
    expect(logSpy).not.toHaveBeenCalled();

    batterySensor.stop();
    (navigator as any).getBattery = origGetBattery;
  });
});
