import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

class NotificationService {
  private isInitialized = false;

  /**
   * Checks if local notifications are supported in the current environment
   */
  isSupported(): boolean {
    return Capacitor.isNativePlatform() || (typeof window !== 'undefined' && 'Notification' in window);
  }

  /**
   * Initializes notification channels and listeners
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Capacitor.isNativePlatform()) {
        // Register standard notification channels
        await LocalNotifications.createChannel({
          id: 'dijital_ayna_reminders',
          name: 'Günlük Farkındalık Hatırlatıcıları',
          description: 'Sabah ve akşam ruh hali / bilişsel yoklama bildirimleri',
          importance: 4,
          visibility: 1,
          sound: 'beep.wav',
        }).catch(() => {});

        await LocalNotifications.createChannel({
          id: 'dijital_ayna_alerts',
          name: 'Bilişsel Fren & Öngörücü Uyarılar',
          description: 'Anomali ve stres kayması acil durum bildirimleri',
          importance: 5,
          visibility: 1,
          sound: 'beep.wav',
        }).catch(() => {});
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('[NotificationService] Initialization error:', err);
    }
  }

  /**
   * Checks current permission status
   */
  async checkPermissions(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) return 'unsupported';

    try {
      if (Capacitor.isNativePlatform()) {
        const status: PermissionStatus = await LocalNotifications.checkPermissions();
        if (status.display === 'granted') return 'granted';
        if (status.display === 'denied') return 'denied';
        return 'prompt';
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
        return 'prompt';
      }
      return 'unsupported';
    } catch (err) {
      console.warn('[NotificationService] checkPermissions error:', err);
      return 'prompt';
    }
  }

  /**
   * Requests permission to send notifications
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      }
      return false;
    } catch (err) {
      console.error('[NotificationService] requestPermissions error:', err);
      return false;
    }
  }

  /**
   * Sends an immediate test notification to verify sounds, banners, and delivery
   */
  async sendTestNotification(): Promise<boolean> {
    const perm = await this.checkPermissions();
    if (perm !== 'granted') {
      const granted = await this.requestPermissions();
      if (!granted) return false;
    }

    try {
      await this.init();

      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 9999,
              title: 'Duty Dijital Ayna Bildirim Sistemi 🔔',
              body: 'iOS bildirim ayarları başarıyla tamamlandı. Tüm uyarılar ve hatırlatıcılar aktif.',
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'beep.wav',
              channelId: 'dijital_ayna_alerts',
              extra: { type: 'test' },
            },
          ],
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Duty Dijital Ayna Bildirim Sistemi 🔔', {
          body: 'Bildirim ayarları başarıyla tamamlandı. Tüm uyarılar ve hatırlatıcılar aktif.',
          icon: '/logo.png',
        });
      }
      return true;
    } catch (err) {
      console.error('[NotificationService] sendTestNotification error:', err);
      return false;
    }
  }

  /**
   * Schedules recurring morning (09:00) and evening (21:00) awareness check-ins
   */
  async scheduleDailyReminders(): Promise<void> {
    const perm = await this.checkPermissions();
    if (perm !== 'granted') return;

    try {
      await this.init();

      if (Capacitor.isNativePlatform()) {
        // Cancel existing reminders first
        await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }] }).catch(() => {});

        const now = new Date();

        // 1. Morning check-in (09:00)
        const morning = new Date(now);
        morning.setHours(9, 0, 0, 0);
        if (morning.getTime() <= now.getTime()) {
          morning.setDate(morning.getDate() + 1);
        }

        // 2. Evening check-in (21:00)
        const evening = new Date(now);
        evening.setHours(21, 0, 0, 0);
        if (evening.getTime() <= now.getTime()) {
          evening.setDate(evening.getDate() + 1);
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: 1001,
              title: 'Günün İlk Duty Dijital Ayna Yansıması 🪞',
              body: 'Güne nasıl başladınız? Anlık hissiyatınızı ve sabah enerjinizi kaydetmek için dokunun.',
              schedule: {
                at: morning,
                repeats: true,
                every: 'day',
              },
              sound: 'beep.wav',
              channelId: 'dijital_ayna_reminders',
              extra: { type: 'morning_checkin' },
            },
            {
              id: 1002,
              title: 'Günün Davranışsal Özeti ✨',
              body: 'Bugünkü bilişsel ve fiziksel baz hattınız hesaplandı. Günlük ritminizi inceleyin.',
              schedule: {
                at: evening,
                repeats: true,
                every: 'day',
              },
              sound: 'beep.wav',
              channelId: 'dijital_ayna_reminders',
              extra: { type: 'evening_reflection' },
            },
          ],
        });
      }
    } catch (err) {
      console.warn('[NotificationService] scheduleDailyReminders error:', err);
    }
  }

  /**
   * Dispatches a high-priority proactive alert (e.g. Cognitive Brake trigger)
   */
  async sendPredictiveAlert(title: string, body: string): Promise<void> {
    try {
      const perm = await this.checkPermissions();
      if (perm !== 'granted') return;

      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 8000) + 2000,
              title: `⚡ ${title}`,
              body,
              schedule: { at: new Date(Date.now() + 500) },
              sound: 'beep.wav',
              channelId: 'dijital_ayna_alerts',
              extra: { type: 'predictive_alert' },
            },
          ],
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`⚡ ${title}`, {
          body,
          icon: '/logo.png',
        });
      }
    } catch (err) {
      console.warn('[NotificationService] sendPredictiveAlert error:', err);
    }
  }

  /**
   * Cancels all scheduled notifications
   */
  async cancelAll(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      }
    } catch (err) {
      console.warn('[NotificationService] cancelAll error:', err);
    }
  }
}

export const notificationService = new NotificationService();
