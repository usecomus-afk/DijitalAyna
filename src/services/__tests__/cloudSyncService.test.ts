import { describe, it, expect } from 'vitest';
import { cloudSyncService } from '../cloudSyncService';
import { UserProfile, UserSettings } from '../../types/user';

describe('CloudSyncService', () => {
  const dummyProfile: UserProfile = {
    name: 'Ayşe Kaya',
    email: 'ayse.kaya@gmail.com',
    age: 32,
    gender: 'female',
    isGoogleConnected: true,
    createdAt: Date.now(),
  };

  const dummySettings: UserSettings = {
    onboardingCompleted: true,
    cloudBackupEnabled: true,
    sensorsEnabled: {
      motion: true,
      typing: true,
      touch: true,
      voice: false,
      session: true,
      light: true,
      battery: true,
      network: true,
      location: true,
    },
    notificationsEnabled: true,
    lastAnalysisTimestamp: Date.now(),
  };

  it('should not backup if user has no email or uid', async () => {
    const emptyProfile: UserProfile = {
      name: 'Anonim',
      isGoogleConnected: false,
      createdAt: Date.now(),
    };
    const res = await cloudSyncService.backupUserDataToCloud(emptyProfile, dummySettings);
    expect(res.success).toBe(false);
    expect(res.message).toContain('bağlı bir Google veya kullanıcı hesabı');
  });

  it('should not backup if cloudBackupEnabled is false and not forced', async () => {
    const disabledSettings = { ...dummySettings, cloudBackupEnabled: false };
    const res = await cloudSyncService.backupUserDataToCloud(dummyProfile, disabledSettings, false);
    expect(res.success).toBe(false);
    expect(res.message).toContain('seçeneği kapalı');
  });

  it('should sanitize email correctly into a valid Firestore doc key', () => {
    const serviceAny = cloudSyncService as any;
    expect(serviceAny.getUserDocKey('Ayse.Kaya@Gmail.Com')).toBe('ayse_kaya_gmail_com');
    expect(serviceAny.getUserDocKey('user+tag@domain.com')).toBe('user_tag_domain_com');
  });
});
