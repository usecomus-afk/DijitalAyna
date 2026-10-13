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

export interface HealthVitalsResult {
  heartRateBpm: number | null;
  activeCaloriesKcal: number | null;
  source: 'native-sensor' | 'missing';
}

export interface HealthSummarySnapshot {
  steps: number | null;
  mobilityScore: number | null;
  tstMinutes: number | null;
  wasoMinutes: number | null;
  solMinutes: number | null;
  sleepEfficiency: number | null;
  heartRateBpm: number | null;
  activeCaloriesKcal: number | null;
  syncedAt: number;
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

      // Request basic health data (steps, heartRate, calories)
      let basicGranted = false;
      try {
        const status = await Health.requestAuthorization({
          read: ['steps', 'heartRate', 'calories'],
          write: [],
        });
        basicGranted = Boolean(
          status.readAuthorized &&
            (status.readAuthorized.includes('steps') ||
              status.readAuthorized.includes('heartRate') ||
              status.readAuthorized.includes('calories'))
        );
      } catch (e) {
        console.warn('[HealthService] Basic HealthKit auth warning:', e);
      }

      // Request Sleep Analysis via custom ComusSleep plugin
      let sleepGranted = false;
      try {
        const sleepAuth = await ComusSleep.requestAuthorization();
        sleepGranted = Boolean(sleepAuth.granted);
      } catch (e) {
        console.warn('[HealthService] Sleep auth failed:', e);
      }

      const granted = Boolean(basicGranted || sleepGranted);
      return {
        granted,
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
   * Fetch today's average heart rate (BPM) and active calories burned (kcal) from Apple HealthKit
   */
  async getTodayVitals(): Promise<HealthVitalsResult> {
    if (!Capacitor.isNativePlatform()) {
      return { heartRateBpm: null, activeCaloriesKcal: null, source: 'missing' };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();

    let heartRateBpm: number | null = null;
    let activeCaloriesKcal: number | null = null;

    try {
      const hrRes = await Health.readSamples({
        dataType: 'heartRate',
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        limit: 500,
      });
      if (hrRes?.samples && hrRes.samples.length > 0) {
        const validHr = hrRes.samples
          .map((s: any) => Number(s.value))
          .filter((v: number) => !Number.isNaN(v) && v > 30 && v < 240);
        if (validHr.length > 0) {
          heartRateBpm = Math.round(validHr.reduce((a: number, b: number) => a + b, 0) / validHr.length);
        }
      }
    } catch (e) {
      console.warn('[HealthService] getTodayVitals heartRate error:', e);
    }

    try {
      const calRes = await Health.readSamples({
        dataType: 'calories',
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        limit: 500,
      });
      if (calRes?.samples && calRes.samples.length > 0) {
        const totalCal = calRes.samples.reduce((sum: number, s: any) => sum + (Number(s.value) || 0), 0);
        if (totalCal > 0) {
          activeCaloriesKcal = Math.round(totalCal);
        }
      }
    } catch (e) {
      console.warn('[HealthService] getTodayVitals calories error:', e);
    }

    return {
      heartRateBpm,
      activeCaloriesKcal,
      source: heartRateBpm !== null || activeCaloriesKcal !== null ? 'native-sensor' : 'missing',
    };
  }

  /**
   * Fetch latest sleep stages: TST, WASO, and SOL in minutes (36-hour lookback window to capture full previous night)
   */
  async getYesterdaySleep(): Promise<HealthSleepResult> {
    if (!Capacitor.isNativePlatform()) {
      return { tst: null, waso: null, sol: null, source: 'missing', error: 'Web unsupported' };
    }

    try {
      const now = new Date();
      // Look back 36 hours so evening checks still capture the full previous night's sleep onset
      const start = new Date(now.getTime() - 36 * 60 * 60 * 1000);

      const result = await ComusSleep.getSleepData({
        startDate: start.toISOString(),
        endDate: now.toISOString(),
      });

      if (!result || !result.samples || result.samples.length === 0) {
        return { tst: null, waso: null, sol: null, source: 'missing', error: 'No sleep data found' };
      }

      // Sort chronologically by startDate
      const sortedSamples = [...result.samples].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      // HKCategoryValueSleepAnalysis:
      // 0 = InBed, 1 = AsleepUnspecified, 2 = Awake, 3 = AsleepCore, 4 = AsleepDeep, 5 = AsleepREM
      const asleepIntervals: [number, number][] = [];
      const awakeIntervals: [number, number][] = [];
      let firstSleepOnset: Date | null = null;
      let lastSleepOffset: Date | null = null;
      let firstInBed: Date | null = null;

      for (const sample of sortedSamples) {
        const sDate = new Date(sample.startDate);
        const eDate = new Date(sample.endDate);
        const sMs = sDate.getTime();
        const eMs = eDate.getTime();
        if (Number.isNaN(sMs) || Number.isNaN(eMs) || eMs <= sMs) continue;

        if (sample.value === 0) {
          if (!firstInBed || sDate < firstInBed) {
            firstInBed = sDate;
          }
        }

        if (sample.value === 1 || sample.value === 3 || sample.value === 4 || sample.value === 5) {
          asleepIntervals.push([sMs, eMs]);
          if (!firstSleepOnset || sDate < firstSleepOnset) {
            firstSleepOnset = sDate;
          }
          if (!lastSleepOffset || eDate > lastSleepOffset) {
            lastSleepOffset = eDate;
          }
        } else if (sample.value === 2) {
          awakeIntervals.push([sMs, eMs]);
        }
      }

      // Merge overlapping intervals (prevents double-counting when both iPhone and Apple Watch write samples)
      const mergeIntervals = (intervals: [number, number][]): number => {
        if (intervals.length === 0) return 0;
        const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
        const merged: [number, number][] = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
          const prev = merged[merged.length - 1];
          const curr = sorted[i];
          if (curr[0] <= prev[1]) {
            prev[1] = Math.max(prev[1], curr[1]);
          } else {
            merged.push([...curr]);
          }
        }
        return merged.reduce((sum, [s, e]) => sum + (e - s) / (1000 * 60), 0);
      };

      let totalAsleepMinutes = mergeIntervals(asleepIntervals);
      // Fallback: if the user's device only recorded InBed (0) without stage breakdown
      if (totalAsleepMinutes === 0) {
        const inBedIntervals: [number, number][] = sortedSamples
          .filter((s) => s.value === 0)
          .map((s) => [new Date(s.startDate).getTime(), new Date(s.endDate).getTime()]);
        totalAsleepMinutes = mergeIntervals(inBedIntervals);
      }

      if (totalAsleepMinutes <= 0) {
        return { tst: null, waso: null, sol: null, source: 'missing', error: 'No asleep intervals found' };
      }

      // Calculate WASO (Wake After Sleep Onset)
      let totalAwakeMinutesAfterOnset = 0;
      if (firstSleepOnset && lastSleepOffset) {
        const onsetMs = firstSleepOnset.getTime();
        const offsetMs = lastSleepOffset.getTime();
        const clippedAwake = awakeIntervals
          .filter(([s, e]) => e > onsetMs && s < offsetMs)
          .map(([s, e]) => [Math.max(s, onsetMs), Math.min(e, offsetMs)] as [number, number]);
        totalAwakeMinutesAfterOnset = mergeIntervals(clippedAwake);
      }

      // Calculate SOL (Sleep Onset Latency)
      let sol = 0;
      if (firstInBed && firstSleepOnset && firstSleepOnset > firstInBed) {
        const diffMin = (firstSleepOnset.getTime() - firstInBed.getTime()) / (1000 * 60);
        // Cap within realistic single-session bounds (0 - 180 min)
        if (diffMin <= 180) {
          sol = diffMin;
        }
      }

      return {
        tst: Math.round(totalAsleepMinutes),
        waso: Math.round(totalAwakeMinutesAfterOnset),
        sol: Math.round(sol),
        source: 'native-sensor',
      };
    } catch (err: any) {
      console.warn('[HealthService] getYesterdaySleep error:', err);
      return { tst: null, waso: null, sol: null, source: 'missing', error: err.message };
    }
  }

  /**
   * Sync native HealthKit steps, sleep, heart rate, and calories into daily metrics
   */
  async syncHealthBiomarkers(): Promise<HealthSummarySnapshot> {
    const today = new Date().toISOString().split('T')[0];

    const [stepsRes, sleepRes, vitalsRes] = await Promise.all([
      this.getTodaySteps(),
      this.getYesterdaySleep(),
      this.getTodayVitals(),
    ]);

    let mobilityScore: number | null = null;
    let sleepScore: number | null = null;

    // 1. Sync Steps -> mobility_index
    if (stepsRes.value !== null && stepsRes.source === 'native-sensor') {
      mobilityScore = Math.min(100, Math.round((stepsRes.value / 10000) * 100));

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
          mobility_index: mobilityScore,
        },
        provenance: {
          source: 'native-sensor',
          confidence: 1.0,
          timestamp: Date.now(),
        },
      });
    }

    // 2. Sync Sleep -> sleep_efficiency, sleep_duration, sleep_waso, sleep_sol
    if (sleepRes.tst !== null && sleepRes.source === 'native-sensor') {
      const totalInBed = sleepRes.tst + (sleepRes.waso || 0) + (sleepRes.sol || 0);
      const rawEfficiency = totalInBed > 0 ? (sleepRes.tst / totalInBed) * 100 : 85;
      const durationFactor = Math.min(100, (sleepRes.tst / 450) * 100);
      sleepScore = Math.min(100, Math.max(0, Math.round(0.6 * rawEfficiency + 0.4 * durationFactor)));

      const metricsToSave: { key: 'sleep_efficiency' | 'sleep_duration' | 'sleep_waso' | 'sleep_sol'; val: number }[] = [
        { key: 'sleep_efficiency', val: sleepScore },
        { key: 'sleep_duration', val: sleepRes.tst },
        ...(sleepRes.waso !== null ? [{ key: 'sleep_waso' as const, val: sleepRes.waso }] : []),
        ...(sleepRes.sol !== null ? [{ key: 'sleep_sol' as const, val: sleepRes.sol }] : []),
      ];

      for (const m of metricsToSave) {
        const existing = await db.dailyMetrics
          .where('[metricKey+date]')
          .equals([m.key, today])
          .first();

        if (existing && existing.id) {
          await db.dailyMetrics.update(existing.id, {
            value: m.val,
            sampleCount: (existing.sampleCount || 1) + 1,
          });
        } else {
          await db.dailyMetrics.add({
            date: today,
            metricKey: m.key,
            value: m.val,
            sampleCount: 1,
          });
        }
      }

      await db.logSensorEvent({
        type: 'sleep',
        timestamp: Date.now(),
        payload: {
          sleep_duration: sleepRes.tst,
          sleep_waso: sleepRes.waso ?? 0,
          sleep_sol: sleepRes.sol ?? 0,
          sleep_efficiency: sleepScore,
        },
        provenance: {
          source: 'native-sensor',
          confidence: 1.0,
          timestamp: Date.now(),
        },
      });
    }

    const summary: HealthSummarySnapshot = {
      steps: stepsRes.value,
      mobilityScore,
      tstMinutes: sleepRes.tst,
      wasoMinutes: sleepRes.waso,
      solMinutes: sleepRes.sol,
      sleepEfficiency: sleepScore,
      heartRateBpm: vitalsRes.heartRateBpm,
      activeCaloriesKcal: vitalsRes.activeCaloriesKcal,
      syncedAt: Date.now(),
    };

    try {
      await db.settings.put({ key: 'healthkit_last_summary', value: summary });
    } catch {}

    return summary;
  }
}

export const healthService = new HealthService();

