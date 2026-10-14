import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { mindfulnessQuotes } from '../data/mindfulnessQuotes';

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
          id: 'dijital_mental_iİkizim_reminders',
          name: 'Günlük Farkındalık Hatırlatıcıları',
          description: 'Sabah ve akşam ruh hali / bilişsel yoklama bildirimleri',
          importance: 4,
          visibility: 1,
          sound: 'beep.wav',
        }).catch(() => {});

        await LocalNotifications.createChannel({
          id: 'dijital_mental_iİkizim_alerts',
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
              title: 'Dijital Mental İkizim Bildirim Sistemi 🔔',
              body: 'iOS bildirim ayarları başarıyla tamamlandı. Tüm uyarılar ve hatırlatıcılar aktif.',
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'beep.wav',
              channelId: 'dijital_mental_iİkizim_alerts',
              extra: { type: 'test' },
            },
          ],
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Dijital Mental İkizim Bildirim Sistemi 🔔', {
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



        await LocalNotifications.schedule({
          notifications: [
            {
              id: 1001,
              title: 'Günün İlk Dijital Mental İkizim Yansıması 🪞',
              body: 'Güne nasıl başladınız? Anlık hissiyatınızı ve sabah enerjinizi kaydetmek için dokunun.',
              schedule: {
                repeats: true,
                on: { hour: 9, minute: 0 },
              },
              sound: 'beep.wav',
              channelId: 'dijital_mental_iİkizim_reminders',
              extra: { type: 'morning_checkin' },
            },
            {
              id: 1002,
              title: 'Günün Davranışsal Özeti ✨',
              body: 'Bugünkü bilişsel ve fiziksel baz hattınız hesaplandı. Günlük ritminizi inceleyin.',
              schedule: {
                repeats: true,
                on: { hour: 21, minute: 0 },
              },
              sound: 'beep.wav',
              channelId: 'dijital_mental_iİkizim_reminders',
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
              channelId: 'dijital_mental_iİkizim_alerts',
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
   * Dispatches a non-diagnostic, probabilistic Early Awareness notification when one of the
   * 9 Clinical Conditions reaches its multi-day critical threshold.
   * Deduplicated per day per condition ID to avoid repeated notifications on the same day.
   */
  async sendClinicalEarlyAwarenessAlert(alert: {
    id: string;
    title: string;
    notificationTitle?: string;
    notificationBody: string;
    statisticalSummary?: string;
  }): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dedupKey = `comus_early_alert_${today}_${alert.id}`;
      if (typeof localStorage !== 'undefined' && localStorage.getItem(dedupKey) === 'sent') {
        return false;
      }

      const perm = await this.checkPermissions();
      if (perm !== 'granted') return false;

      const title =
        alert.notificationTitle ||
        `Erken Farkındalık: Potansiyel ${alert.title} Olasılığı`;
      const body = alert.notificationBody;

      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 5000) + 12000,
              title: `⚠️ ${title}`,
              body,
              schedule: { at: new Date(Date.now() + 600) },
              sound: 'beep.wav',
              channelId: 'dijital_mental_iİkizim_alerts',
              extra: { type: 'clinical_early_awareness', alertId: alert.id },
            },
          ],
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`⚠️ ${title}`, {
          body,
          icon: '/logo.png',
        });
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(dedupKey, 'sent');
      }
      return true;
    } catch (err) {
      console.warn('[NotificationService] sendClinicalEarlyAwarenessAlert error:', err);
      return false;
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
  async requestNotificationPermission(): Promise<boolean> {
    return this.requestPermissions();
  }

  /**
   * Schedules recurring daily mindfulness inspirations
   * @param frequency Number of notifications per day (1, 2, or 3)
   */
  async scheduleDailyInspirations(frequency: number): Promise<void> {
    const perm = await this.checkPermissions();
    if (perm !== 'granted') return;

    try {
      await this.init();

      if (Capacitor.isNativePlatform()) {
        // Cancel existing inspiration notifications (including any legacy interval-based requests)
        await LocalNotifications.cancel({
          notifications: [{ id: 2001 }, { id: 2002 }, { id: 2003 }],
        }).catch(() => {});

        // If currently daytime (05:00 - 17:59), clear any stale delivered evening notification (ID 2003)
        const currentHour = new Date().getHours();
        if (currentHour >= 5 && currentHour < 18) {
          await LocalNotifications.removeDeliveredNotifications({
            notifications: [{ id: 2003, title: '', body: '' }],
          }).catch(() => {});
        }

        if (frequency === 0) return;

        const notifications: any[] = [];
        const getRandomQuote = (quotes: string[]) => quotes[Math.floor(Math.random() * quotes.length)];

        // 1. Morning check-in (09:00)
        if (frequency >= 1) {
          notifications.push({
            id: 2001,
            title: 'Huzur ve İlham 🌅',
            body: getRandomQuote(mindfulnessQuotes.morning),
            schedule: { repeats: true, on: { hour: 9, minute: 0, second: 0 } },
            sound: 'beep.wav',
            channelId: 'dijital_mental_iİkizim_reminders',
            extra: { type: 'inspiration_morning' },
          });
        }

        // 2. Noon check-in (14:00)
        if (frequency >= 3) {
          notifications.push({
            id: 2002,
            title: 'Kısa Bir Mola 🌿',
            body: getRandomQuote(mindfulnessQuotes.noon),
            schedule: { repeats: true, on: { hour: 14, minute: 0, second: 0 } },
            sound: 'beep.wav',
            channelId: 'dijital_mental_iİkizim_reminders',
            extra: { type: 'inspiration_noon' },
          });
        }

        // 3. Evening check-in (21:30 - strictly evening hours only)
        if (frequency >= 2) {
          notifications.push({
            id: 2003,
            title: 'Günü Geride Bırakırken 🌙',
            body: getRandomQuote(mindfulnessQuotes.evening),
            schedule: { repeats: true, on: { hour: 21, minute: 30, second: 0 } },
            sound: 'beep.wav',
            channelId: 'dijital_mental_iİkizim_reminders',
            extra: { type: 'inspiration_evening' },
          });
        }

        if (notifications.length > 0) {
          await LocalNotifications.schedule({ notifications });
        }
      }
    } catch (err) {
      console.warn('[NotificationService] scheduleDailyInspirations error:', err);
    }
  }
  /**
   * Cancels only daily awareness reminders (1001, 1002)
   */
  async cancelDailyReminders(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.cancel({
          notifications: [{ id: 1001 }, { id: 1002 }],
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[NotificationService] cancelDailyReminders error:', err);
    }
  }

  /**
   * Schedules medication reminders
   */
  async scheduleMedicationReminder(medId: number, name: string, time: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const parts = time.split(':');
        if (parts.length !== 2) return;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);

        await LocalNotifications.schedule({
          notifications: [
            {
              id: 30000 + medId * 10 + hours,
              title: 'İlaç Vakti 💊',
              body: `${name} ilacınızı alma saatiniz geldi.`,
              schedule: { repeats: true, on: { hour: hours, minute: minutes } },
              sound: 'beep.wav',
              channelId: 'dijital_mental_iİkizim_reminders',
            }
          ]
        });
      }
    } catch(err) {}
  }

  /**
   * Cancels all scheduled medication reminders (IDs >= 30000)
   */
  async cancelMedicationReminders(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const pending = await LocalNotifications.getPending();
        const medNotifs = pending.notifications.filter((n) => n.id >= 30000);
        if (medNotifs.length > 0) {
          await LocalNotifications.cancel({ notifications: medNotifs });
        }
      }
    } catch (err) {
      console.warn('[NotificationService] cancelMedicationReminders error:', err);
    }
  }
}

export const notificationService = new NotificationService();


