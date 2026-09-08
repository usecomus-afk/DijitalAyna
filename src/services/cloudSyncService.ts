import { getFirestore, doc, getDoc, setDoc, deleteDoc, Firestore } from 'firebase/firestore';
import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from '../auth/firebaseAuth';
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

class CloudSyncService {
  private firestoreInstance: Firestore | null = null;

  private getFirestore(): Firestore {
    if (!this.firestoreInstance) {
      const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      this.firestoreInstance = getFirestore(app);
    }
    return this.firestoreInstance;
  }

  private getUserDocKey(identifier: string): string {
    return identifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  /**
   * Checks whether a cloud backup exists in Firestore for the given email or UID
   */
  async checkCloudBackupExists(emailOrUid: string): Promise<boolean> {
    if (!emailOrUid) return false;
    try {
      const firestore = this.getFirestore();
      const docKey = this.getUserDocKey(emailOrUid);
      const docRef = doc(firestore, 'users', docKey);
      const snap = await getDoc(docRef);
      return snap.exists();
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
      const firestore = this.getFirestore();
      const docKey = this.getUserDocKey(identifier);

      const [dailyMetrics, baselines, moodReports, medications, medicationLogs] = await Promise.all([
        db.dailyMetrics.toArray(),
        db.baselines.toArray(),
        db.moodReports.toArray(),
        db.medications.toArray(),
        db.medicationLogs.toArray(),
      ]);

      const now = Date.now();
      const backupPayload: CloudBackupData = {
        version: '1.0.0',
        email: userProfile.email || '',
        uid: userProfile.uid,
        updatedAt: now,
        userProfile: {
          name: userProfile.name,
          email: userProfile.email,
          picture: userProfile.picture,
          age: userProfile.age,
          gender: userProfile.gender,
          isGoogleConnected: userProfile.isGoogleConnected,
          isAppleConnected: userProfile.isAppleConnected,
        },
        settings: {
          onboardingCompleted: settings.onboardingCompleted,
          cloudBackupEnabled: true,
          sensorsEnabled: settings.sensorsEnabled,
          notificationsEnabled: settings.notificationsEnabled,
        },
        dailyMetrics: dailyMetrics.map(({ id, ...rest }) => rest as DailyMetric),
        baselines: baselines.map(({ ...rest }) => rest as BaselineState),
        moodReports: moodReports.map(({ id, ...rest }) => rest as MoodReport),
        medications: medications.map(({ id, ...rest }) => rest as Medication),
        medicationLogs: medicationLogs.map(({ id, ...rest }) => rest as MedicationLog),
      };

      const docRef = doc(firestore, 'users', docKey);
      await setDoc(docRef, backupPayload, { merge: true });

      // Record last sync timestamp in local settings
      const updatedSettings = { ...settings, lastCloudSyncTimestamp: now };
      await db.settings.put({ key: 'app_settings', value: updatedSettings });

      console.log(`[CloudSync] Backup successfully uploaded to Firestore for ${identifier}. Metrics: ${dailyMetrics.length}, Baselines: ${baselines.length}`);
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
      const firestore = this.getFirestore();
      const docKey = this.getUserDocKey(emailOrUid);
      const docRef = doc(firestore, 'users', docKey);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        return { success: true, restored: false, message: 'Bu hesaba ait daha önce kaydedilmiş bir bulut yedeği bulunamadı.' };
      }

      const backup = snap.data() as CloudBackupData;

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
      const firestore = this.getFirestore();
      const docKey = this.getUserDocKey(emailOrUid);
      const docRef = doc(firestore, 'users', docKey);
      await deleteDoc(docRef);
      console.log(`[CloudSync] Cloud backup deleted for ${emailOrUid}`);
      return true;
    } catch (err) {
      console.warn('[CloudSync] Delete backup error:', err);
      return false;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
