import { create } from 'zustand';
import { UserProfile, UserSettings } from '../types/user';
import { db } from '../db';
import { sensorManager } from '../sensors/SensorManager';
import { ensureInitialCalibration } from '../engine/seedCalibration';
import { signOutGoogle, subscribeToAuthState, checkRedirectAuth } from '../auth/firebaseAuth';
import { notificationService } from '../services/notificationService';

interface AppState {
  userProfile: UserProfile;
  settings: UserSettings;
  isAnalyzing: boolean;
  activePredictiveAlertDismissed: boolean;
  emergencyModalOpen: boolean;
  baselineDayCount: number;

  // Actions
  initialize: () => Promise<void>;
  setUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  connectGoogleProfile: (profile: UserProfile) => Promise<void>;
  disconnectGoogleProfile: () => Promise<void>;
  toggleSensor: (sensor: keyof UserSettings['sensorsEnabled']) => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  setEmergencyModalOpen: (open: boolean) => void;
  dismissPredictiveAlert: () => void;
  runAnalysisPipeline: () => Promise<void>;
  wipeAllData: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Kullanıcı',
  isGoogleConnected: false,
  createdAt: Date.now(),
};

const DEFAULT_SETTINGS: UserSettings = {
  onboardingCompleted: false,
  sensorsEnabled: {
    motion: true,
    typing: true,
    touch: true,
    session: true,
    light: true,
    battery: true,
    network: true,
    voice: true,
    location: true,
  },
  notificationsEnabled: true,
  lastAnalysisTimestamp: Date.now(),
};

let autoEvaluationInterval: any = null;

export const useAppStore = create<AppState>((set, get) => ({
  userProfile: DEFAULT_PROFILE,
  settings: DEFAULT_SETTINGS,
  isAnalyzing: false,
  activePredictiveAlertDismissed: false,
  emergencyModalOpen: false,
  baselineDayCount: 7,

  initialize: async () => {
    try {
      // 1. Load stored profile & settings
      const storedSettings = await db.settings.get('app_settings');
      const storedProfile = await db.settings.get('user_profile');

      let currentSettings = DEFAULT_SETTINGS;
      let currentProfile = DEFAULT_PROFILE;

      if (storedSettings && storedSettings.value) {
        currentSettings = { ...DEFAULT_SETTINGS, ...storedSettings.value };
      } else {
        await db.settings.put({ key: 'app_settings', value: DEFAULT_SETTINGS });
      }

      if (storedProfile && storedProfile.value) {
        currentProfile = { ...DEFAULT_PROFILE, ...storedProfile.value };
      } else {
        await db.settings.put({ key: 'user_profile', value: DEFAULT_PROFILE });
      }

      // 2. Ensure initial healthy digital phenotyping baseline exists
      await ensureInitialCalibration();

      // Count distinct dates in dailyMetrics to compute real baseline learning day
      const metrics = await db.dailyMetrics.toArray();
      const distinctDates = new Set(metrics.map(m => m.date));
      const dayCount = Math.max(1, distinctDates.size);

      set({
        settings: currentSettings,
        userProfile: currentProfile,
        baselineDayCount: dayCount,
      });

      // 3. Sync and activate sensors
      sensorManager.syncWithSettings(currentSettings);

      // 4. Initialize and sync notifications
      if (currentSettings.notificationsEnabled) {
        await notificationService.init();
        const perm = await notificationService.checkPermissions();
        if (perm === 'granted') {
          await notificationService.scheduleDailyReminders();
        }
      }

      // Check mobile redirect authentication result
      const redirectProfile = await checkRedirectAuth();
      if (redirectProfile) {
        set({ userProfile: redirectProfile });
        await db.settings.put({ key: 'user_profile', value: redirectProfile });
      }

      // Subscribe to real-time auth changes
      subscribeToAuthState(async (authUser) => {
        if (authUser && !get().userProfile.isGoogleConnected) {
          set({ userProfile: authUser });
          await db.settings.put({ key: 'user_profile', value: authUser });
        }
      });

      // Run immediate device evaluation
      await sensorManager.evaluateNow();

      // Setup recurring real-time evaluation every 30 seconds
      if (autoEvaluationInterval) clearInterval(autoEvaluationInterval);
      autoEvaluationInterval = setInterval(async () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          await sensorManager.evaluateNow();
        }
      }, 30000);

    } catch (err) {
      console.error('[AppStore] Initialization error:', err);
    }
  },

  setUserProfile: async (partial: Partial<UserProfile>) => {
    const updated = { ...get().userProfile, ...partial };
    set({ userProfile: updated });
    await db.settings.put({ key: 'user_profile', value: updated });
  },

  connectGoogleProfile: async (googleProfile: UserProfile) => {
    set({ userProfile: googleProfile });
    await db.settings.put({ key: 'user_profile', value: googleProfile });
    await sensorManager.evaluateNow();
  },

  disconnectGoogleProfile: async () => {
    await signOutGoogle();
    const current = get().userProfile;
    const updated: UserProfile = {
      name: current.name.replace(' (Google)', ''),
      isGoogleConnected: false,
      createdAt: current.createdAt,
    };
    set({ userProfile: updated });
    await db.settings.put({ key: 'user_profile', value: updated });
  },

  toggleSensor: async (sensor) => {
    const current = get().settings;
    const updated = {
      ...current,
      sensorsEnabled: {
        ...current.sensorsEnabled,
        [sensor]: !current.sensorsEnabled[sensor],
      },
    };

    set({ settings: updated });
    await db.settings.put({ key: 'app_settings', value: updated });
    sensorManager.syncWithSettings(updated);
  },

  setOnboardingCompleted: async (completed: boolean) => {
    const updated = { ...get().settings, onboardingCompleted: completed };
    set({ settings: updated });
    await db.settings.put({ key: 'app_settings', value: updated });
    await sensorManager.evaluateNow();
  },

  setNotificationsEnabled: async (enabled: boolean): Promise<boolean> => {
    const current = get().settings;
    if (enabled) {
      const granted = await notificationService.requestPermissions();
      if (granted) {
        await notificationService.scheduleDailyReminders();
        const updated = { ...current, notificationsEnabled: true };
        set({ settings: updated });
        await db.settings.put({ key: 'app_settings', value: updated });
        return true;
      } else {
        const updated = { ...current, notificationsEnabled: false };
        set({ settings: updated });
        await db.settings.put({ key: 'app_settings', value: updated });
        return false;
      }
    } else {
      await notificationService.cancelAll();
      const updated = { ...current, notificationsEnabled: false };
      set({ settings: updated });
      await db.settings.put({ key: 'app_settings', value: updated });
      return true;
    }
  },

  sendTestNotification: async (): Promise<boolean> => {
    return await notificationService.sendTestNotification();
  },

  setEmergencyModalOpen: (open: boolean) => {
    set({ emergencyModalOpen: open });
  },

  dismissPredictiveAlert: () => {
    set({ activePredictiveAlertDismissed: true });
  },

  runAnalysisPipeline: async () => {
    set({ isAnalyzing: true });
    try {
      await sensorManager.evaluateNow();
      const metrics = await db.dailyMetrics.toArray();
      const distinctDates = new Set(metrics.map(m => m.date));
      set({ baselineDayCount: Math.max(1, distinctDates.size) });
    } catch (err) {
      console.error('[AppStore] Analysis pipeline error:', err);
    } finally {
      set({ isAnalyzing: false });
    }
  },

  wipeAllData: async () => {
    await db.wipeAllData();
    sensorManager.stopAll();
    if (autoEvaluationInterval) {
      clearInterval(autoEvaluationInterval);
      autoEvaluationInterval = null;
    }
    set({
      settings: DEFAULT_SETTINGS,
      userProfile: DEFAULT_PROFILE,
      activePredictiveAlertDismissed: false,
      baselineDayCount: 1,
    });
  },
}));
