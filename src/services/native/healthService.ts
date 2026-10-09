import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import { ComusSleep } from 'comus-sleep-plugin';
import { db } from '../../db';

export interface HealthStepsResult {
  value: number | null;
  source: 'native-sensor' | 'missing';
  error?: string;
}

export interface HealthSleepResult {
  tst: number | null; // Total Sleep Time (minutes)
  waso: number | null; // Wake After Sleep Onset (minutes)
  sol: number | null; // Sleep Onset Latency (minutes)
  source: 'native-sensor' | 'missing';
  error?: string;
}

export interface HealthPermissionResult {
  granted: boolean;
  error?: string;
}

class HealthService {
  /**
   * Request Apple HealthKit read permissions for steps, heartRate, calories, and sleep
   */
  async requestHealthPermissions(): Promise<HealthPermissionResult> {
    if (!Capacitor.isNativePlatform()) {
      return {
        granted: false,
        error: 'Web platformunda Apple HealthKit donanımı desteklenmemektedir.',
      };
    }

    try {
      const avail = await Health.isAvailable();
      if (!avail.available) {
        return {
          granted: false,
          error: avail.reason || 'Apple HealthKit bu cihazda kullanılabilir değil.',
        };
      }

      // Request basic health data
      const status = await Health.requestAuthorization({
        read: ['steps', 'heartRate', 'calories'],
        write: [],
      });

      // Request Sleep Analysis via custom plugin
      let sleepGranted = false;
      try {
        const sleepAuth = await ComusSleep.requestAuthorization();
        sleepGranted = sleepAuth.granted;
      } catch (e) {
        console.warn('Sleep auth failed:', e);
      }

      const granted = status.readAuthorized && status.readAuthorized.includes('steps');
      return {
        granted: Boolean(granted || sleepGranted),
        error: granted ? undefined : 'Apple Sağlık izni kullanıcı tarafından reddedildi.',
      };
    } catch (err: any) {
      console.warn('[HealthService] requestHealthPermissions error:', err);
      return {
        granted: false,
        error: err?.message || 'Apple Sağlık izin isteği sırasında hata oluştu.',
      };
    }
  }

  /**
   * Fetch today's total steps (from 00:00:00 to now)
   */
  async getTodaySteps(): Promise<HealthStepsResult> {
    if (!Capacitor.isNativePlatform()) {
      return {
        value: null,
        source: 'missing',
        error: 'Web platformunda Apple HealthKit adımları okunamamaktadır.',
      };
    }

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      const result = await Health.readSamples({
        dataType: 'steps',
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        limit: 1000,
      });

      if (!result || !result.samples || result.samples.length === 0) {
        return {
          value: null,
          source: 'missing',
          error: 'Günün adım telemetrisi henüz HealthKit üzerinde kaydedilmemiş.',
        };
      }

      const totalSteps = result.samples.reduce((sum: number, s: any) => sum + (Number(s.value) || 0), 0);
      return {
        value: Math.round(totalSteps),
        source: 'native-sensor',
      };
    } catch (err: any) {
      console.warn('[HealthService] getTodaySteps error:', err);
      return {
        value: null,
        source: 'missing',
        error: err?.message || 'Apple Sağlık izni verilmedi veya veri okunamadı.',
      };
    }
  }

  /**
   * Fetch yesterday's sleep stages: TST, WASO, and SOL in minutes
   */
  async getYesterdaySleep(): Promise<HealthSleepResult> {
    if (!Capacitor.isNativePlatform()) {
      return { tst: null, waso: null, sol: null, source: 'missing', error: 'Web unsupported' };
    }

    try {
      const now = new Date();
      // Look back 24 hours to capture the latest sleep session
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const result = await ComusSleep.getSleepData({
        startDate: start.toISOString(),
        endDate: now.toISOString()
      });

      if (!result || !result.samples || result.samples.length === 0) {
        return { tst: null, waso: null, sol: null, source: 'missing', error: 'No sleep data found' };
      }

      let totalAsleepMinutes = 0;
      let totalAwakeMinutesAfterOnset = 0;

      // Filter and calculate sleep durations
      // HKCategoryValueSleepAnalysisInBed = 0
      // HKCategoryValueSleepAnalysisAsleep = 1 (or specific stages in newer iOS)
      // HKCategoryValueSleepAnalysisAwake = 2
      let firstSleepOnset: Date | null = null;
      let lastSleepOffset: Date | null = null;

      for (const sample of result.samples) {
        const sDate = new Date(sample.startDate);
        const eDate = new Date(sample.endDate);
        const durationMinutes = (eDate.getTime() - sDate.getTime()) / (1000 * 60);

        if (sample.value === 1) { // Asleep (or REM/Deep/Core which are >=1 in iOS 16+)
          totalAsleepMinutes += durationMinutes;
          
          if (!firstSleepOnset || sDate < firstSleepOnset) {
            firstSleepOnset = sDate;
          }
          if (!lastSleepOffset || eDate > lastSleepOffset) {
            lastSleepOffset = eDate;
          }
        }
      }

      // Calculate WASO (Wake After Sleep Onset)
      if (firstSleepOnset && lastSleepOffset) {
        for (const sample of result.samples) {
          const sDate = new Date(sample.startDate);
          const eDate = new Date(sample.endDate);
          const durationMinutes = (eDate.getTime() - sDate.getTime()) / (1000 * 60);

          if (sample.value === 2) { // Awake
            // If awake period falls between first sleep onset and last sleep offset
            if (sDate >= firstSleepOnset && eDate <= lastSleepOffset) {
              totalAwakeMinutesAfterOnset += durationMinutes;
            }
          }
        }
      }

      return {
        tst: totalAsleepMinutes > 0 ? Math.round(totalAsleepMinutes) : null,
        waso: totalAwakeMinutesAfterOnset > 0 ? Math.round(totalAwakeMinutesAfterOnset) : null,
        sol: null, // SOL is complex to derive without full in-bed vs asleep bounds reliably
        source: 'native-sensor'
      };

    } catch (err: any) {
      console.warn('[HealthService] getYesterdaySleep error:', err);
      return { tst: null, waso: null, sol: null, source: 'missing', error: err.message };
    }
  }

  /**
   * Sync native HealthKit steps and sleep into daily metrics
   */
  async syncHealthBiomarkers(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Sync Steps
    const stepsRes = await this.getTodaySteps();
    if (stepsRes.value !== null && stepsRes.source === 'native-sensor') {
      const mobilityScore = Math.min(100, Math.round((stepsRes.value / 10000) * 100));

      const existing = await db.dailyMetrics
        .where('[metricKey+date]')
        .equals(['mobility_index', today])
        .first();

      if (existing && existing.id) {
        await db.dailyMetrics.update(existing.id, {
          value: mobilityScore,
          sampleCount: (existing.sampleCount || 1) + 1,
        });
      } else {
        await db.dailyMetrics.add({
          date: today,
          metricKey: 'mobility_index',
          value: mobilityScore,
          sampleCount: 1,
        });
      }

      await db.logSensorEvent({
        type: 'motion',
        timestamp: Date.now(),
        payload: {
          step_count: stepsRes.value,
          mobility_score: mobilityScore,
        },
        provenance: {
          source: 'native-sensor',
          confidence: 1.0,
          timestamp: Date.now(),
        },
      });
    }

    // Sync Sleep
    const sleepRes = await this.getYesterdaySleep();
    if (sleepRes.tst !== null && sleepRes.source === 'native-sensor') {
      // Base ideal sleep: 480 mins (8 hours). Score 0-100.
      let sleepScore = Math.min(100, Math.round((sleepRes.tst / 480) * 100));
      
      // Penalize for heavy WASO (Wake After Sleep Onset > 60 mins)
      if (sleepRes.waso && sleepRes.waso > 60) {
        sleepScore = Math.max(0, sleepScore - Math.round(sleepRes.waso / 10));
      }

      const existing = await db.dailyMetrics
        .where('[metricKey+date]')
        .equals(['sleep_efficiency', today])
        .first();

      if (existing && existing.id) {
        await db.dailyMetrics.update(existing.id, {
          value: sleepScore,
          sampleCount: (existing.sampleCount || 1) + 1,
        });
      } else {
        await db.dailyMetrics.add({
          date: today,
          metricKey: 'sleep_efficiency',
          value: sleepScore,
          sampleCount: 1,
        });
      }

      await db.logSensorEvent({
        type: 'sleep',
        timestamp: Date.now(),
        payload: {
          tst_minutes: sleepRes.tst || 0,
          waso_minutes: sleepRes.waso || 0,
          sleep_score: sleepScore
        },
        provenance: {
          source: 'native-sensor',
          confidence: 1.0,
          timestamp: Date.now(),
        },
      });
    }
  }
}

export const healthService = new HealthService();
