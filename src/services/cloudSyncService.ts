import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getFirebaseAuth } from '../auth/firebaseAuth';
import { db } from '../db';
import { UserProfile, UserSettings } from '../types/user';
import { DailyMetric, BaselineState, MoodReport } from '../types/engine';
import { Medication, MedicationLog } from '../types/medication';

export interface CloudBackupData {
  version: string;
  email: string;
  uid?: string;
  updatedAt: number;
  userProfile: Partial<UserProfile>;
  settings: Partial<UserSettings>;
  dailyMetrics: DailyMetric[];
  baselines: BaselineState[];
  moodReports: MoodReport[];
  medications?: Medication[];
  medicationLogs?: MedicationLog[];
}

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/comus-ai-duty/databases/(default)/documents/users';

interface AuthContext {
  uid: string;
  token: string;
}

class CloudSyncService {
  /**
   * Returns the signed-in Firebase user's uid and ID token. Backups are bound to the Firebase
   * Auth uid (enforced by firestore.rules). Local-only accounts (username/password, demo) have
   * no Firebase identity and therefore cannot use cloud backup.
   */
  private async getAuthContext(): Promise<AuthContext | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        const { user } = await FirebaseAuthentication.getCurrentUser();
        if (!user?.uid) return null;
        const { token } = await FirebaseAuthentication.getIdToken();
        return token ? { uid: user.uid, token } : null;
      }
      const current = getFirebaseAuth().currentUser;
      if (!current) return null;
      return { uid: current.uid, token: await current.getIdToken() };
    } catch (err) {
      console.warn('[CloudSync] Auth context unavailable:', err);
      return null;
    }
  }

  private async request(ctx: AuthContext, method: 'GET' | 'PATCH' | 'DELETE', body?: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      return await fetch(`${FIRESTORE_BASE}/${encodeURIComponent(ctx.uid)}`, {
        method,
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getUserDocKey(identifier: string): string {
    return identifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  /**
   * Checks whether a cloud backup exists in Firestore for the given email or UID
   */
  async checkCloudBackupExists(emailOrUid: string): Promise<boolean> {
    if (!emailOrUid) return false;
    try {
      const ctx = await this.getAuthContext();
      if (!ctx) return false;
      const res = await this.request(ctx, 'GET');
      return res.ok;
    } catch (err) {
      console.warn('[CloudSync] Check backup error:', err);
      return false;
    }
  }

  /**
   * Backs up all user digital phenotyping data, baselines, and profile to Firestore
   */
  async backupUserDataToCloud(
    userProfile: UserProfile,
    settings: UserSettings,
    force = false
  ): Promise<{ success: boolean; message?: string; timestamp?: number }> {
    const identifier = userProfile.email || userProfile.uid;
    if (!identifier) {
      return { success: false, message: 'Yedekleme için bağlı bir Google veya kullanıcı hesabı gereklidir.' };
    }

    if (!force && !settings.cloudBackupEnabled) {
      return { success: false, message: 'Bulut yedekleme seçeneği kapalı.' };
    }

    try {
      const ctx = await this.getAuthContext();
      if (!ctx) {
        return {
          success: false,
          message: 'Bulut yedekleme için Google veya Apple hesabıyla giriş yapmanız gerekir.',
        };
      }

      const [dailyMetrics, baselines, moodReports, medications, medicationLogs] = await Promise.all([
        db.dailyMetrics.toArray(),
        db.baselines.toArray(),
        db.moodReports.toArray(),
        db.medications.toArray(),
        db.medicationLogs.toArray(),
      ]);

      const now = Date.now();
      const rawPayload = {
        version: '1.0.0',
        email: userProfile.email || '',
        uid: userProfile.uid || '',
        updatedAt: now,
        userProfile: {
          name: userProfile.name || '',
          email: userProfile.email || '',
          picture: userProfile.picture || '',
          age: userProfile.age ?? null,
          gender: userProfile.gender || 'neutral',
          isGoogleConnected: Boolean(userProfile.isGoogleConnected),
          isAppleConnected: Boolean(userProfile.isAppleConnected),
        },
        settings: {
          onboardingCompleted: Boolean(settings.onboardingCompleted),
          cloudBackupEnabled: true,
          sensorsEnabled: settings.sensorsEnabled || {},
          notificationsEnabled: Boolean(settings.notificationsEnabled),
        },
        dailyMetrics: dailyMetrics.map(({ id, ...rest }) => rest as DailyMetric),
        baselines: baselines.map(({ ...rest }) => rest as BaselineState),
        moodReports: moodReports.map(({ id, ...rest }) => rest as MoodReport),
        medications: medications.map(({ id, ...rest }) => rest as Medication),
        medicationLogs: medicationLogs.map(({ id, ...rest }) => rest as MedicationLog),
      };

      const sanitizeForFirestore = (data: any): any => {
        if (data === null || data === undefined) return null;
        if (typeof data !== 'object') return data;
        if (Array.isArray(data)) {
          return data.filter((item) => item !== undefined).map(sanitizeForFirestore);
        }
        const clean: any = {};
        for (const [key, val] of Object.entries(data)) {
          if (val !== undefined) {
            clean[key] = sanitizeForFirestore(val);
          }
        }
        return clean;
      };

      const backupPayload = sanitizeForFirestore(rawPayload);
      const payloadJson = JSON.stringify(backupPayload);
      const res = await this.request(ctx, 'PATCH', {
        fields: {
          email: { stringValue: userProfile.email || '' },
          uid: { stringValue: ctx.uid },
          name: { stringValue: userProfile.name || '' },
          updatedAt: { integerValue: now.toString() },
          metricsCount: { integerValue: dailyMetrics.length.toString() },
          reportsCount: { integerValue: moodReports.length.toString() },
          payloadJson: { stringValue: payloadJson },
        },
      });
      if (!res.ok) {
        throw new Error(`Bulut yedekleme başarısız (HTTP ${res.status}).`);
      }

      // Record last sync timestamp in local settings
      const updatedSettings = { ...settings, lastCloudSyncTimestamp: now };
      await db.settings.put({ key: 'app_settings', value: updatedSettings });

      console.log(`[CloudSync] Backup successfully saved to Firestore for ${identifier}. Metrics: ${dailyMetrics.length}, Baselines: ${baselines.length}`);
      return { success: true, timestamp: now };
    } catch (err: any) {
      console.error('[CloudSync] Backup failed:', err);
      return { success: false, message: err?.message || 'Bulut yedekleme işlemi sırasında bir hata oluştu.' };
    }
  }

  /**
   * Restores user's digital mirror, baseline history, and settings from Firestore
   */
  async restoreUserDataFromCloud(
    emailOrUid: string
  ): Promise<{ success: boolean; restored: boolean; data?: CloudBackupData; baselineDayCount?: number; message?: string }> {
    if (!emailOrUid) {
      return { success: false, restored: false, message: 'Geçersiz hesap kimliği.' };
    }

    try {
      const ctx = await this.getAuthContext();
      if (!ctx) {
        return {
          success: false,
          restored: false,
          message: 'Geri yükleme için Google veya Apple hesabıyla giriş yapmanız gerekir.',
        };
      }

      const res = await this.request(ctx, 'GET');
      if (res.status === 404) {
        return { success: true, restored: false, message: 'Bu hesaba ait daha önce kaydedilmiş bir bulut yedeği bulunamadı.' };
      }
      if (!res.ok) {
        throw new Error(`Bulut yedeği okunamadı (HTTP ${res.status}).`);
      }
      const docData = await res.json();
      const payload = docData.fields?.payloadJson?.stringValue;
      if (!payload) {
        return { success: true, restored: false, message: 'Bu hesaba ait daha önce kaydedilmiş bir bulut yedeği bulunamadı.' };
      }
      const backup: CloudBackupData = JSON.parse(payload);

      // 1. Restore Daily Metrics
      if (backup.dailyMetrics && backup.dailyMetrics.length > 0) {
        for (const metric of backup.dailyMetrics) {
          const existing = await db.dailyMetrics
            .where('[metricKey+date]')
            .equals([metric.metricKey, metric.date])
            .first();

          if (existing && existing.id) {
            await db.dailyMetrics.update(existing.id, metric);
          } else {
            await db.dailyMetrics.add(metric);
          }
        }
      }

      // 2. Restore Baselines
      if (backup.baselines && backup.baselines.length > 0) {
        for (const base of backup.baselines) {
          await db.baselines.put(base);
        }
      }

      // 3. Restore Mood Reports
      if (backup.moodReports && backup.moodReports.length > 0) {
        for (const mood of backup.moodReports) {
          const exists = await db.moodReports
            .where('timestamp')
            .equals(mood.timestamp)
            .first();
          if (!exists) {
            await db.moodReports.add(mood);
          }
        }
      }

      // 4. Restore Medications
      if (backup.medications && backup.medications.length > 0) {
        for (const med of backup.medications) {
          const exists = await db.medications
            .where('name')
            .equals(med.name)
            .first();
          if (!exists) {
            await db.medications.add(med);
          }
        }
      }

      // 5. Restore Medication Logs
      if (backup.medicationLogs && backup.medicationLogs.length > 0) {
        for (const log of backup.medicationLogs) {
          const exists = await db.medicationLogs
            .where('timestamp')
            .equals(log.timestamp)
            .first();
          if (!exists) {
            await db.medicationLogs.add(log);
          }
        }
      }

      // 6. Calculate real baseline day count from restored dates
      const allMetrics = await db.dailyMetrics.toArray();
      const distinctDates = new Set(allMetrics.map((m) => m.date));
      const calculatedDayCount = Math.max(1, distinctDates.size);

      console.log(`[CloudSync] Data successfully restored for ${emailOrUid}. Restored ${backup.dailyMetrics?.length || 0} metrics across ${calculatedDayCount} days.`);

      return {
        success: true,
        restored: true,
        data: backup,
        baselineDayCount: calculatedDayCount,
      };
    } catch (err: any) {
      console.error('[CloudSync] Restore error:', err);
      return { success: false, restored: false, message: err?.message || 'Buluttan veri geri yükleme başarısız oldu.' };
    }
  }

  /**
   * Deletes the cloud backup document from Firestore upon user request
   */
  async deleteCloudBackup(emailOrUid: string): Promise<boolean> {
    if (!emailOrUid) return false;
    try {
      const ctx = await this.getAuthContext();
      if (!ctx) return false;
      const res = await this.request(ctx, 'DELETE');
      if (!res.ok && res.status !== 404) return false;
      console.log(`[CloudSync] Cloud backup deleted for ${emailOrUid}`);
      return true;
    } catch (err) {
      console.warn('[CloudSync] Delete backup error:', err);
      return false;
    }
  }
}

export const cloudSyncService = new CloudSyncService();

/**
 * Exports all local device metrics, mood reports, and baselines as a standalone JSON backup
 */
export async function exportLocalDataAsJson(): Promise<string> {
  const [profileItem, settingsItem, dailyMetrics, baselines, moodReports, medications, medicationLogs] =
    await Promise.all([
      db.settings.get('user_profile'),
      db.settings.get('app_settings'),
      db.dailyMetrics.toArray(),
      db.baselines.toArray(),
      db.moodReports.toArray(),
      db.medications.toArray(),
      db.medicationLogs.toArray(),
    ]);

  const exportObj = {
    app: 'Dijital Mental İİkizim',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    userProfile: profileItem?.value,
    settings: settingsItem?.value,
    dailyMetrics,
    baselines,
    moodReports,
    medications,
    medicationLogs,
  };

  return JSON.stringify(exportObj, null, 2);
}

/**
 * Imports and restores records from a local JSON backup file
 */
export async function importDataFromJson(
  jsonString: string
): Promise<{ success: boolean; restoredMetrics: number; restoredReports: number }> {
  const data = JSON.parse(jsonString);
  if (
    !data ||
    (data.app !== 'Dijital Mental İİkizim' &&
      data.app !== 'DijitalMentalIİkizim' &&
      data.app !== 'MentalDijitalAyna' &&
      data.app !== 'DijitalMentalIİkizim')
  ) {
    throw new Error('Geçersiz Dijital Mental İİkizim yedek dosyası.');
  }

  let restoredMetrics = 0;
  let restoredReports = 0;

  if (Array.isArray(data.dailyMetrics)) {
    for (const m of data.dailyMetrics) {
      const existing = await db.dailyMetrics
        .where('[metricKey+date]')
        .equals([m.metricKey, m.date])
        .first();
      if (existing && existing.id) {
        await db.dailyMetrics.update(existing.id, m);
      } else {
        await db.dailyMetrics.add(m);
      }
      restoredMetrics++;
    }
  }

  if (Array.isArray(data.moodReports)) {
    for (const r of data.moodReports) {
      const existing = await db.moodReports
        .where('timestamp')
        .equals(r.timestamp)
        .first();
      if (!existing) {
        await db.moodReports.add(r);
        restoredReports++;
      }
    }
  }

  if (Array.isArray(data.baselines)) {
    for (const b of data.baselines) {
      await db.baselines.put(b);
    }
  }

  return { success: true, restoredMetrics, restoredReports };
}
