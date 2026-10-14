import { db } from '../db';
import { runDailyAggregationAndCleanup } from '../db/aggregations';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { TelemetryPipeline } from './telemetry';

class SessionSensorCollector {
  private sessionStartTime = 0;
  private isVisible = false;
  private timer: any = null;
  private appListenerHandle: PluginListenerHandle | null = null;
  private currentDate = '';
  private completedSessionsMinutes = 0;
  private completedSessionCount = 0;
  private completedNightMinutes = 0;

  private ensureDateReset(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.currentDate !== today) {
      this.currentDate = today;
      this.completedSessionsMinutes = 0;
      this.completedSessionCount = 0;
      this.completedNightMinutes = 0;
    }
  }

  async start(): Promise<void> {
    if (typeof document === 'undefined') return;

    this.ensureDateReset();
    this.sessionStartTime = Date.now();
    this.isVisible = document.visibilityState !== 'hidden';

    // 1. Native iOS/Android lifecycle hook
    if (Capacitor.isNativePlatform()) {
      try {
        this.appListenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            this.ensureDateReset();
            this.isVisible = true;
            this.sessionStartTime = Date.now();
            TelemetryPipeline.getInstance().ingestScreenEvent('UNLOCK', this.sessionStartTime);
            this.logImmediateSession();
            runDailyAggregationAndCleanup();
          } else {
            this.isVisible = false;
            TelemetryPipeline.getInstance().ingestScreenEvent('OFF', Date.now());
            this.endSession();
          }
        });
      } catch (e) {
        console.warn('[SessionSensor] Native appStateChange listener error:', e);
      }
    }

    // 2. Web fallback (visibilitychange)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.isVisible) {
      TelemetryPipeline.getInstance().ingestScreenEvent('UNLOCK', this.sessionStartTime);
    }

    // Immediately log session activity
    await this.logImmediateSession();

    // Periodic check every 30 seconds
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
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

  async flush(): Promise<void> {
    if (typeof document === 'undefined') return;
    this.ensureDateReset();
    if (this.sessionStartTime === 0 && document.visibilityState !== 'hidden') {
      this.sessionStartTime = Date.now();
      this.isVisible = true;
    }
    await this.logImmediateSession();
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.ensureDateReset();
      this.isVisible = true;
      this.sessionStartTime = Date.now();
      TelemetryPipeline.getInstance().ingestScreenEvent('UNLOCK', this.sessionStartTime);
      this.logImmediateSession();
      runDailyAggregationAndCleanup();
    } else {
      this.isVisible = false;
      TelemetryPipeline.getInstance().ingestScreenEvent('OFF', Date.now());
      this.endSession();
    }
  };

  private async logImmediateSession(): Promise<void> {
    this.ensureDateReset();
    if (!this.isVisible && this.sessionStartTime === 0) return;

    const now = Date.now();
    const activeElapsedMinutes =
      this.sessionStartTime > 0 ? Math.max(0.1, (now - this.sessionStartTime) / 60000) : 0.1;

    const totalScreenOnMinutes = Math.round((this.completedSessionsMinutes + activeElapsedMinutes) * 10) / 10;
    const totalSessions = this.completedSessionCount + 1;
    const avgSessionDuration = Math.round((totalScreenOnMinutes / totalSessions) * 10) / 10;

    const hour = new Date(now).getHours();
    const activeNightMinutes = hour >= 2 && hour < 4 ? activeElapsedMinutes : 0;
    const totalNightMinutes = Math.round((this.completedNightMinutes + activeNightMinutes) * 10) / 10;

    await db.logSensorEvent({
      type: 'session',
      timestamp: now,
      payload: {
        session_duration: avgSessionDuration,
        screen_on_time: totalScreenOnMinutes,
        night_usage_minutes: totalNightMinutes,
      },
      provenance: {
        source: Capacitor.isNativePlatform() ? 'native-sensor' : 'web-api',
        confidence: 1.0,
        timestamp: now,
      },
    });
  }

  private async endSession(): Promise<void> {
    if (this.sessionStartTime === 0) return;
    this.ensureDateReset();
    const now = Date.now();
    const durationMinutes = Math.max(0, (now - this.sessionStartTime) / 60000);
    if (durationMinutes >= 0.05) {
      this.completedSessionsMinutes += durationMinutes;
      this.completedSessionCount += 1;
      const hour = new Date(now).getHours();
      if (hour >= 2 && hour < 4) {
        this.completedNightMinutes += durationMinutes;
      }

      const totalScreenOnMinutes = Math.round(this.completedSessionsMinutes * 10) / 10;
      const avgSessionDuration =
        Math.round((this.completedSessionsMinutes / Math.max(1, this.completedSessionCount)) * 10) / 10;
      const totalNightMinutes = Math.round(this.completedNightMinutes * 10) / 10;

      await db.logSensorEvent({
        type: 'session',
        timestamp: now,
        payload: {
          session_duration: avgSessionDuration,
          screen_on_time: totalScreenOnMinutes,
          night_usage_minutes: totalNightMinutes,
        },
        provenance: {
          source: Capacitor.isNativePlatform() ? 'native-sensor' : 'web-api',
          confidence: 1.0,
          timestamp: now,
        },
      });
    }
    this.sessionStartTime = 0;
  }
}

export const sessionSensor = new SessionSensorCollector();
