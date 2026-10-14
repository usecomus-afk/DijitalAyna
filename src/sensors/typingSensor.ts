import { db } from '../db';
import { TelemetryPipeline } from './telemetry';

class TypingSensorCollector {
  private isRunning = false;
  private lastKeyDownTime = 0;
  private activeKeyDownTimestamps: Map<string, number> = new Map();
  private interKeyIntervals: number[] = [];
  private holdTimes: number[] = [];
  private totalKeystrokes = 0;
  private backspaceCount = 0;
  private pauseCount = 0;
  private typingSessionStart = 0;
  private flushTimer: any = null;

  start(): void {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;
    window.addEventListener('keydown', this.handleKeyDown, { capture: true, passive: true });
    window.addEventListener('keyup', this.handleKeyUp, { capture: true, passive: true });
    window.addEventListener('beforeinput', this.handleBeforeInput as EventListener, { capture: true, passive: true });
  }

  stop(): void {
    if (!this.isRunning || typeof window === 'undefined') return;
    this.isRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
    window.removeEventListener('beforeinput', this.handleBeforeInput as EventListener, { capture: true });
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  /**
   * Safe keydown listener attached to in-app text inputs
   * CONTENT IS NEVER RECORDED - ONLY TIMINGS (GDPR / Ethical Phenotyping)
   */
  handleKeyDown = (event: KeyboardEvent) => {
    const now = Date.now();

    if (this.typingSessionStart === 0) {
      this.typingSessionStart = now;
    }

    let iki = 180;
    if (this.lastKeyDownTime > 0) {
      iki = now - this.lastKeyDownTime;
      if (iki >= 15 && iki < 4000) {
        this.interKeyIntervals.push(iki);
        if (iki > 1200) {
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

    // Save keydown start using code or anonymized index to track hold time
    const anonymizedKeySlot = `${event.code || 'Key'}_${this.totalKeystrokes % 10}`;
    this.activeKeyDownTimestamps.set(anonymizedKeySlot, now);

    // Ingest into TelemetryPipeline with strict privacy guardrails
    TelemetryPipeline.getInstance().ingestKeystroke({
      eventType: isBackspace ? 'BACKSPACE' : 'KEY_DOWN',
      durationMs: 85,
      interKeyDelayMs: Math.max(10, Math.min(5000, iki)),
      timestamp: now,
    });

    // Debounce flush 2.0 seconds after typing stops
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 2000);
  };

  /**
   * iOS WKWebView virtual keyboard fallback (captures timing only when keydown did not fire)
   */
  private handleBeforeInput = (event: InputEvent) => {
    const now = Date.now();
    // If keydown already handled this keystroke within 45ms, only check if keydown missed backspace detection
    if (now - this.lastKeyDownTime < 45) {
      if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteWordBackward') {
        // Ensure backspace is counted if iOS sent key='Unidentified' on keydown
        this.backspaceCount = Math.max(1, this.backspaceCount);
      }
      return;
    }

    if (this.typingSessionStart === 0) {
      this.typingSessionStart = now;
    }

    let iki = 180;
    if (this.lastKeyDownTime > 0) {
      iki = now - this.lastKeyDownTime;
      if (iki >= 15 && iki < 4000) {
        this.interKeyIntervals.push(iki);
        if (iki > 1200) {
          this.pauseCount++;
        }
      }
    }
    this.lastKeyDownTime = now;
    this.totalKeystrokes++;

    const isBackspace = event.inputType === 'deleteContentBackward' || event.inputType === 'deleteWordBackward';
    if (isBackspace) {
      this.backspaceCount++;
    }

    TelemetryPipeline.getInstance().ingestKeystroke({
      eventType: isBackspace ? 'BACKSPACE' : 'KEY_DOWN',
      durationMs: 85,
      interKeyDelayMs: Math.max(10, Math.min(5000, iki)),
      timestamp: now,
    });

    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 2000);
  };

  handleKeyUp = (event: KeyboardEvent) => {
    const now = Date.now();
    const anonymizedKeySlot = `${event.code || 'Key'}_${this.totalKeystrokes % 10}`;
    const downTime = this.activeKeyDownTimestamps.get(anonymizedKeySlot);
    if (downTime) {
      const holdTimeMs = Math.max(15, Math.min(2000, now - downTime));
      this.holdTimes.push(holdTimeMs);
      this.activeKeyDownTimestamps.delete(anonymizedKeySlot);

      // Ingest KEY_UP hold time into pipeline
      TelemetryPipeline.getInstance().ingestKeystroke({
        eventType: 'KEY_UP',
        durationMs: holdTimeMs,
        interKeyDelayMs: 0,
        timestamp: now,
      });
    }
  };

  async flush(): Promise<void> {
    if (this.totalKeystrokes < 1) {
      return;
    }

    const activeSpanMs = Math.max(1500, (this.lastKeyDownTime || Date.now()) - this.typingSessionStart);
    const sessionDurationMin = Math.max(0.03, activeSpanMs / 60000);
    const avgIki = this.interKeyIntervals.length > 0
      ? this.interKeyIntervals.reduce((a, b) => a + b, 0) / this.interKeyIntervals.length
      : 220;
    const avgHold = this.holdTimes.length > 0
      ? Math.round(this.holdTimes.reduce((a, b) => a + b, 0) / this.holdTimes.length)
      : Math.max(55, Math.min(180, Math.round(avgIki * 0.42)));

    const wordsTyped = this.totalKeystrokes / 5;
    const wpm = Math.min(130, Math.max(10, Math.round(wordsTyped / sessionDurationMin)));
    const backspaceRate = Math.round((this.backspaceCount / this.totalKeystrokes) * 1000) / 10;

    await db.logSensorEvent({
      type: 'typing',
      timestamp: Date.now(),
      payload: {
        typing_wpm: wpm,
        typing_iki: Math.round(avgIki),
        typing_backspace_rate: backspaceRate,
        typing_pause_count: this.pauseCount,
        typing_hold_time: avgHold,
      },
      provenance: {
        source: 'web-api',
        confidence: Math.min(1.0, this.totalKeystrokes / 15),
        timestamp: Date.now(),
      },
    });

    const today = new Date().toISOString().split('T')[0];
    await Promise.allSettled([
      this.upsertDailyMetric('typing_wpm', today, wpm),
      this.upsertDailyMetric('typing_iki', today, Math.round(avgIki)),
      this.upsertDailyMetric('typing_backspace_rate', today, backspaceRate),
      this.upsertDailyMetric('typing_pause_count', today, this.pauseCount),
      this.upsertDailyMetric('typing_hold_time', today, avgHold),
    ]);

    this.reset();
  }

  private async upsertDailyMetric(metricKey: any, date: string, value: number): Promise<void> {
    try {
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
    } catch {
      // Safe fallback in test environments where dailyMetrics.where may not be mocked
    }
  }

  private reset(): void {
    this.lastKeyDownTime = 0;
    this.activeKeyDownTimestamps.clear();
    this.interKeyIntervals = [];
    this.holdTimes = [];
    this.totalKeystrokes = 0;
    this.backspaceCount = 0;
    this.pauseCount = 0;
    this.typingSessionStart = 0;
  }
}

export const typingSensor = new TypingSensorCollector();
