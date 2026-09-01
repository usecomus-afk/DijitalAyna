import { db } from '../db';
import { runDailyAggregationAndCleanup } from '../db/aggregations';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

class SessionSensorCollector {
  private sessionStartTime = 0;
  private isVisible = false;
  private timer: any = null;
  private appListenerHandle: PluginListenerHandle | null = null;

  async start(): Promise<void> {
    if (typeof document === 'undefined') return;

    this.sessionStartTime = Date.now();
    this.isVisible = document.visibilityState === 'visible';

    // 1. Native iOS/Android lifecycle hook
    if (Capacitor.isNativePlatform()) {
      try {
        this.appListenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            this.isVisible = true;
            this.sessionStartTime = Date.now();
            this.checkNightUsage();
            this.logImmediateSession();
            runDailyAggregationAndCleanup();
          } else {
            this.isVisible = false;
            this.endSession();
          }
        });
      } catch (e) {
        console.warn('[SessionSensor] Native appStateChange listener error:', e);
      }
    }

    // 2. Web fallback (visibilitychange)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Immediately log session activity
    await this.logImmediateSession();

    // Periodic check every 30 seconds
    this.timer = setInterval(() => {
      this.checkNightUsage();
      this.logImmediateSession();
      runDailyAggregationAndCleanup();
    }, 30000);
  }

  stop(): void {
    if (typeof document === 'undefined') return;

    if (this.appListenerHandle) {
      this.appListenerHandle.remove();
      this.appListenerHandle = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.endSession();
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.isVisible = true;
      this.sessionStartTime = Date.now();
      this.checkNightUsage();
      this.logImmediateSession();
      runDailyAggregationAndCleanup();
    } else {
      this.isVisible = false;
      this.endSession();
    }
  };

  private async logImmediateSession(): Promise<void> {
    if (!this.isVisible) return;
    const elapsedMinutes = Math.max(0.2, (Date.now() - this.sessionStartTime) / 60000);
    await db.logSensorEvent({
      type: 'session',
      timestamp: Date.now(),
      payload: {
        session_duration: Math.round(elapsedMinutes * 10) / 10,
        screen_on_time: Math.round(elapsedMinutes * 10) / 10,
      }
    });
  }

  private async endSession(): Promise<void> {
    if (this.sessionStartTime === 0) return;
    const durationMinutes = (Date.now() - this.sessionStartTime) / 60000;
    if (durationMinutes >= 0.05) {
      await db.logSensorEvent({
        type: 'session',
        timestamp: Date.now(),
        payload: {
          session_duration: Math.round(durationMinutes * 10) / 10,
          screen_on_time: Math.round(durationMinutes * 10) / 10,
        }
      });
    }
    this.sessionStartTime = 0;
  }

  private async checkNightUsage(): Promise<void> {
    if (!this.isVisible) return;
    const hour = new Date().getHours();
    // 01:00 - 05:00 circadian night vulnerability window
    if (hour >= 1 && hour < 5) {
      await db.logSensorEvent({
        type: 'session',
        timestamp: Date.now(),
        payload: {
          night_usage_minutes: 0.5,
        }
      });
    }
  }
}

export const sessionSensor = new SessionSensorCollector();
