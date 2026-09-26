import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
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
   * Request Apple HealthKit read permissions for steps and sleep
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

      const status = await Health.requestAuthorization({
        read: ['steps', 'sleep', 'exerciseTime'],
        write: [],
      });

      const granted = status.readAuthorized && (status.readAuthorized.includes('steps') || status.readAuthorized.includes('sleep'));
      return {
        granted: Boolean(granted),
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
      return {
        tst: null,
        waso: null,
        sol: null,
        source: 'missing',
        error: 'Web platformunda Apple HealthKit uyku verisi bulunmamaktadır.',
      };
    }

    try {
      // Query window: yesterday 18:00 to today 14:00
      const now = new Date();
      const yesterdayEvening = new Date(now);
      yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
      yesterdayEvening.setHours(18, 0, 0, 0);

      const todayAfternoon = new Date(now);
      todayAfternoon.setHours(14, 0, 0, 0);

      const result = await Health.readSamples({
        dataType: 'sleep',
        startDate: yesterdayEvening.toISOString(),
        endDate: todayAfternoon.toISOString(),
        limit: 500,
      });

      if (!result || !result.samples || result.samples.length === 0) {
        return {
          tst: null,
          waso: null,
          sol: null,
          source: 'missing',
          error: 'Son geceye ait Apple Sağlık uyku kaydı bulunamadı.',
        };
      }

      let totalAsleepMinutes = 0;
      let totalAwakeMinutes = 0;
      let firstInBedTime: number | null = null;
      let firstAsleepTime: number | null = null;

      // Sort samples chronologically
      const sortedSamples = [...result.samples].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      for (const sample of sortedSamples) {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        const durationMin = Math.max(0, (end - start) / (1000 * 60));

        if (sample.sleepState === 'inBed') {
          if (firstInBedTime === null || start < firstInBedTime) {
            firstInBedTime = start;
          }
        } else if (
          sample.sleepState === 'asleep' ||
          sample.sleepState === 'deep' ||
          sample.sleepState === 'rem' ||
          sample.sleepState === 'light'
        ) {
          totalAsleepMinutes += durationMin;
          if (firstAsleepTime === null || start < firstAsleepTime) {
            firstAsleepTime = start;
          }
        } else if (sample.sleepState === 'awake') {
          // If awake occurs after first sleep onset, count as WASO
          if (firstAsleepTime !== null) {
            totalAwakeMinutes += durationMin;
          }
        }
      }

      let solMinutes: number | null = null;
      if (firstInBedTime !== null && firstAsleepTime !== null && firstAsleepTime >= firstInBedTime) {
        solMinutes = Math.round((firstAsleepTime - firstInBedTime) / (1000 * 60));
      }

      return {
        tst: totalAsleepMinutes > 0 ? Math.round(totalAsleepMinutes) : null,
        waso: totalAwakeMinutes > 0 ? Math.round(totalAwakeMinutes) : 0,
        sol: solMinutes,
        source: totalAsleepMinutes > 0 ? 'native-sensor' : 'missing',
      };
    } catch (err: any) {
      console.warn('[HealthService] getYesterdaySleep error:', err);
      return {
        tst: null,
        waso: null,
        sol: null,
        source: 'missing',
        error: err?.message || 'Apple Sağlık uyku verisi okunamadı.',
      };
    }
  }

  /**
   * Sync native HealthKit steps and sleep into daily metrics
   */
  async syncHealthBiomarkers(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const stepsRes = await this.getTodaySteps();

    if (stepsRes.value !== null && stepsRes.source === 'native-sensor') {
      // Mobility index derived from real step count (normalized scale 0-100)
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
  }
}

export const healthService = new HealthService();
