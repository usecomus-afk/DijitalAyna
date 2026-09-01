import { motionSensor } from './motionSensor';
import { touchSensor } from './touchSensor';
import { typingSensor } from './typingSensor';
import { sessionSensor } from './sessionSensor';
import { lightSensor } from './lightSensor';
import { batterySensor } from './batterySensor';
import { networkSensor } from './networkSensor';
import { UserSettings } from '../types/user';
import { runDailyAggregationAndCleanup } from '../db/aggregations';
import { calculateEWMAForMetrics } from '../engine/baseline';
import { generateInsightsAndAlerts } from '../engine/insights';

class SensorManager {
  syncWithSettings(settings: UserSettings): void {
    // Motion
    if (settings.sensorsEnabled.motion) {
      motionSensor.start();
    } else {
      motionSensor.stop();
    }

    // Typing
    if (settings.sensorsEnabled.typing) {
      typingSensor.start();
    } else {
      typingSensor.stop();
    }

    // Touch
    if (settings.sensorsEnabled.touch) {
      touchSensor.start();
    } else {
      touchSensor.stop();
    }

    // Session
    if (settings.sensorsEnabled.session) {
      sessionSensor.start();
    } else {
      sessionSensor.stop();
    }

    // Light
    if (settings.sensorsEnabled.light) {
      lightSensor.start();
    } else {
      lightSensor.stop();
    }

    // Battery
    if (settings.sensorsEnabled.battery) {
      batterySensor.start();
    } else {
      batterySensor.stop();
    }

    // Network
    if (settings.sensorsEnabled.network) {
      networkSensor.start();
    } else {
      networkSensor.stop();
    }
  }

  /**
   * Immediately samples and flushes all active hardware and interaction sensors
   */
  async flushAndCollectAll(): Promise<void> {
    await Promise.allSettled([
      motionSensor.flush(),
      touchSensor.flush(),
      typingSensor.flush(),
    ]);
  }

  /**
   * Full end-to-end evaluation pipeline: Flush -> Aggregate -> EWMA Baseline -> Insights & Alerts
   */
  async evaluateNow(): Promise<void> {
    await this.flushAndCollectAll();
    await runDailyAggregationAndCleanup();
    await calculateEWMAForMetrics();
    await generateInsightsAndAlerts();
  }

  stopAll(): void {
    motionSensor.stop();
    typingSensor.stop();
    touchSensor.stop();
    sessionSensor.stop();
    lightSensor.stop();
    batterySensor.stop();
    networkSensor.stop();
  }
}

export const sensorManager = new SensorManager();
