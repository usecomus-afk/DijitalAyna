import { motionSensor } from './motionSensor';
import { touchSensor } from './touchSensor';
import { typingSensor } from './typingSensor';
import { sessionSensor } from './sessionSensor';
import { lightSensor } from './lightSensor';
import { batterySensor } from './batterySensor';
import { networkSensor } from './networkSensor';
import { UserSettings } from '../types/user';
import { runDailyAggregationAndCleanup } from '../db/aggregations';
import { calculateEWMAForMetrics } from '../engine/BaselineEngine';
import { generateInsightsAndAlerts } from '../engine/insights';
import { TelemetryPipeline } from './telemetry';
import { db } from '../db';
import { MetricKey } from '../types/sensor';
import { DailyPhenotypeFeatures } from '../types/phenotyping';

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
   * and runs the TelemetryPipeline aggregation.
   */
  async flushAndCollectAll(): Promise<void> {
    await Promise.allSettled([
      motionSensor.flush(),
      touchSensor.flush(),
      typingSensor.flush(),
    ]);

    // Aggregate in-memory telemetry buffers into phenotype features
    const today = new Date().toISOString().split('T')[0];
    const phenotypeFeatures = TelemetryPipeline.getInstance().aggregateAndFlush(today);
    await this.persistTelemetryFeatures(phenotypeFeatures);
  }

  /**
   * Persists aggregated daily phenotype features into Dexie dailyMetrics
   */
  private async persistTelemetryFeatures(features: DailyPhenotypeFeatures): Promise<void> {
    const metricMapping: Partial<Record<MetricKey, number>> = {};

    if (features.typingSpeedWpm > 0) metricMapping.typing_wpm = features.typingSpeedWpm;
    if (features.meanFlightTimeMs > 0) metricMapping.typing_iki = Math.round(features.meanFlightTimeMs);
    if (features.backspaceRate > 0) metricMapping.typing_backspace_rate = Math.round(features.backspaceRate * 10) / 10;
    if (features.nocturnalScreenMinutes > 0) metricMapping.night_usage_minutes = features.nocturnalScreenMinutes;
    if (features.totalScreenOnMinutes > 0) metricMapping.screen_on_time = features.totalScreenOnMinutes;
    if (features.tremorVariance > 0) metricMapping.tremor_variance = features.tremorVariance;
    if (features.activityIntensityScore > 0) metricMapping.mobility_index = features.activityIntensityScore;

    for (const [key, val] of Object.entries(metricMapping)) {
      if (val === undefined || isNaN(val)) continue;
      const metricKey = key as MetricKey;
      const existing = await db.dailyMetrics
        .where('[metricKey+date]')
        .equals([metricKey, features.date])
        .first();

      if (existing && existing.id) {
        await db.dailyMetrics.update(existing.id, {
          value: val,
          sampleCount: (existing.sampleCount || 1) + 1,
        });
      } else {
        await db.dailyMetrics.add({
          date: features.date,
          metricKey,
          value: val,
          sampleCount: 1,
        });
      }
    }
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
