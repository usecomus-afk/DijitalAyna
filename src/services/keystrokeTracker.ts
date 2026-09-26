import { db } from '../db';
import { TelemetryPipeline } from '../sensors/telemetry';

export interface KeystrokeMetricsSummary {
  wpm: number;
  holdTimeMs: number;
  ikiMs: number;
  backspaceRate: number;
  pauseCount: number;
  totalKeystrokes: number;
}

class KeystrokeTracker {
  private isListening = false;
  private sessionStartTime = 0;
  private lastKeyDownTime = 0;
  private totalKeystrokes = 0;
  private backspaceCount = 0;
  private pauseCount = 0;
  private ikiList: number[] = [];
  private holdTimes: number[] = [];
  private pendingKeydownMap: Map<string, number> = new Map();
  private flushTimer: any = null;

  start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown, { capture: true, passive: true });
    window.addEventListener('keyup', this.handleKeyUp, { capture: true, passive: true });
  }

  stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  attachToElement(element: HTMLElement): () => void {
    const onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    const onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);

    element.addEventListener('keydown', onKeyDown, { passive: true });
    element.addEventListener('keyup', onKeyUp, { passive: true });

    return () => {
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('keyup', onKeyUp);
    };
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const now = Date.now();

    if (this.sessionStartTime === 0) {
      this.sessionStartTime = now;
    }

    if (this.lastKeyDownTime > 0) {
      const iki = now - this.lastKeyDownTime;
      if (iki < 5000) {
        this.ikiList.push(iki);
        if (iki > 1500) {
          this.pauseCount++;
        }
      }
    }
    this.lastKeyDownTime = now;
    this.totalKeystrokes++;

    const isBackspace = event.key === 'Backspace' || event.key === 'Delete';
    if (isBackspace) {
      this.backspaceCount++;
    }

    const keySlot = `${event.code || event.key}_${this.totalKeystrokes % 16}`;
    this.pendingKeydownMap.set(keySlot, now);

    // Ingest into TelemetryPipeline with zero raw text logging (Strict Privacy-by-Design)
    TelemetryPipeline.getInstance().ingestKeystroke({
      eventType: isBackspace ? 'BACKSPACE' : 'KEY_DOWN',
      durationMs: 80,
      interKeyDelayMs: this.ikiList.length > 0 ? this.ikiList[this.ikiList.length - 1] : 120,
      timestamp: now,
    });

    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 3000);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    const now = Date.now();
    const keySlot = `${event.code || event.key}_${this.totalKeystrokes % 16}`;
    const downTime = this.pendingKeydownMap.get(keySlot);

    if (downTime) {
      const holdTime = Math.max(10, Math.min(2500, now - downTime));
      this.holdTimes.push(holdTime);
      this.pendingKeydownMap.delete(keySlot);

      TelemetryPipeline.getInstance().ingestKeystroke({
        eventType: 'KEY_UP',
        durationMs: holdTime,
        interKeyDelayMs: 0,
        timestamp: now,
      });
    }
  };

  getRecentMetrics(): KeystrokeMetricsSummary | null {
    if (this.totalKeystrokes < 3) return null;

    const sessionDurationMin = Math.max(0.05, (Date.now() - this.sessionStartTime) / 60000);
    const avgIki = this.ikiList.length > 0
      ? this.ikiList.reduce((a, b) => a + b, 0) / this.ikiList.length
      : 220;
    const avgHold = this.holdTimes.length > 0
      ? this.holdTimes.reduce((a, b) => a + b, 0) / this.holdTimes.length
      : 85;

    const wordsTyped = this.totalKeystrokes / 5;
    const wpm = Math.min(140, Math.max(10, Math.round(wordsTyped / sessionDurationMin)));
    const backspaceRate = Math.round((this.backspaceCount / this.totalKeystrokes) * 1000) / 10;

    return {
      wpm,
      holdTimeMs: Math.round(avgHold),
      ikiMs: Math.round(avgIki),
      backspaceRate,
      pauseCount: this.pauseCount,
      totalKeystrokes: this.totalKeystrokes,
    };
  }

  async flush(): Promise<void> {
    const metrics = this.getRecentMetrics();
    if (!metrics) {
      this.reset();
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Save typing telemetry event
    await db.logSensorEvent({
      type: 'typing',
      timestamp: Date.now(),
      payload: {
        typing_wpm: metrics.wpm,
        typing_iki: metrics.ikiMs,
        typing_backspace_rate: metrics.backspaceRate,
        typing_pause_count: metrics.pauseCount,
        hold_time_ms: metrics.holdTimeMs,
      },
      provenance: {
        source: 'web-api',
        confidence: Math.min(1.0, metrics.totalKeystrokes / 20),
        timestamp: Date.now(),
      },
    });

    // Update dailyMetrics directly
    await this.updateDailyMetric('typing_wpm', today, metrics.wpm);
    await this.updateDailyMetric('typing_iki', today, metrics.ikiMs);
    await this.updateDailyMetric('typing_backspace_rate', today, metrics.backspaceRate);
    await this.updateDailyMetric('typing_pause_count', today, metrics.pauseCount);

    this.reset();
  }

  private async updateDailyMetric(metricKey: any, date: string, value: number): Promise<void> {
    const existing = await db.dailyMetrics
      .where('[metricKey+date]')
      .equals([metricKey, date])
      .first();

    if (existing && existing.id) {
      await db.dailyMetrics.update(existing.id, {
        value,
        sampleCount: (existing.sampleCount || 1) + 1,
      });
    } else {
      await db.dailyMetrics.add({
        date,
        metricKey,
        value,
        sampleCount: 1,
      });
    }
  }

  private reset(): void {
    this.sessionStartTime = 0;
    this.lastKeyDownTime = 0;
    this.totalKeystrokes = 0;
    this.backspaceCount = 0;
    this.pauseCount = 0;
    this.ikiList = [];
    this.holdTimes = [];
    this.pendingKeydownMap.clear();
  }
}

export const keystrokeTracker = new KeystrokeTracker();
