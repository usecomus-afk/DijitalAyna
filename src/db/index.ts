import Dexie, { Table } from 'dexie';
import { SensorEvent } from '../types/sensor';
import { DailyMetric, BaselineState, Insight, PredictiveAlert, MoodReport } from '../types/engine';
import { Medication, MedicationLog } from '../types/medication';
import { UserAccountRecord } from '../types/user';
import { sanitizeSensorEvent } from '../safety/sanitizer';

export interface SettingItem {
  key: string;
  value: any;
}

export class ComusDatabase extends Dexie {
  sensorEvents!: Table<SensorEvent, number>;
  dailyMetrics!: Table<DailyMetric, number>;
  baselines!: Table<BaselineState, string>;
  insights!: Table<Insight, number>;
  predictiveAlerts!: Table<PredictiveAlert, number>;
  moodReports!: Table<MoodReport, number>;
  settings!: Table<SettingItem, string>;
  medications!: Table<Medication, number>;
  medicationLogs!: Table<MedicationLog, number>;
  users!: Table<UserAccountRecord, number>;

  constructor() {
    super('ComusAIDatabase');
    this.version(1).stores({
      sensorEvents: '++id, type, timestamp',
      dailyMetrics: '++id, date, metricKey, [metricKey+date]',
      baselines: 'metricKey, lastUpdated',
      insights: '++id, createdAt, date, severity, dismissed',
      predictiveAlerts: '++id, createdAt, dismissed',
      moodReports: '++id, timestamp, date',
      settings: 'key',
    });

    this.version(2).stores({
      medications: '++id, name, startDate, endDate, createdAt',
      medicationLogs: '++id, medicationId, date, timestamp, taken',
    });

    this.version(3).stores({
      users: '++id, username, email, createdAt',
    });
  }

  /**
   * Safe event logging with automatic sanitization
   */
  async logSensorEvent(rawEvent: Partial<SensorEvent>): Promise<number | undefined> {
    const sanitized = sanitizeSensorEvent(rawEvent);
    if (!sanitized) return undefined;
    return await this.sensorEvents.add(sanitized);
  }

  /**
   * Completely wipes all IndexedDB tables for privacy compliance / data democracy
   */
  async wipeAllData(): Promise<void> {
    await this.transaction('rw', [
      this.sensorEvents,
      this.dailyMetrics,
      this.baselines,
      this.insights,
      this.predictiveAlerts,
      this.moodReports,
      this.settings,
      this.medications,
      this.medicationLogs,
    ], async () => {
      await this.sensorEvents.clear();
      await this.dailyMetrics.clear();
      await this.baselines.clear();
      await this.insights.clear();
      await this.predictiveAlerts.clear();
      await this.moodReports.clear();
      await this.settings.clear();
      await this.medications.clear();
      await this.medicationLogs.clear();
    });
  }

  /**
   * Export all database records to clean sanitized JSON
   */
  async exportDataJSON(): Promise<string> {
    const daily = await this.dailyMetrics.toArray();
    const base = await this.baselines.toArray();
    const ins = await this.insights.toArray();
    const alerts = await this.predictiveAlerts.toArray();
    const moods = await this.moodReports.toArray();
    const meds = await this.medications.toArray();
    const medLogs = await this.medicationLogs.toArray();

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: '0.2.0',
      dailyMetrics: daily,
      baselines: base,
      insights: ins,
      predictiveAlerts: alerts,
      moodReports: moods,
      medications: meds,
      medicationLogs: medLogs,
    }, null, 2);
  }
}

export const db = new ComusDatabase();
