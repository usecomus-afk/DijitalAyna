import { db } from '../db';
import { TelemetryPipeline } from './telemetry';

class TypingSensorCollector {
  private isRunning = false;
  private lastKeyDownTime = 0;
  private activeKeyDownTimestamps: Map<string, number> = new Map();
  private interKeyIntervals: number[] = [];
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
  }

  stop(): void {
    if (!this.isRunning || typeof window === 'undefined') return;
    this.isRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
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

    let iki = 120;
    if (this.lastKeyDownTime > 0) {
      iki = now - this.lastKeyDownTime;
      if (iki < 4000) { // filter out long breaks
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
      durationMs: 80, // Updated accurately on keyup if captured
      interKeyDelayMs: Math.max(10, Math.min(5000, iki)),
      timestamp: now,
    });

    // Debounce flush 2.5 seconds after typing stops
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 2500);
  };

  handleKeyUp = (event: KeyboardEvent) => {
    const now = Date.now();
    const anonymizedKeySlot = `${event.code || 'Key'}_${this.totalKeystrokes % 10}`;
    const downTime = this.activeKeyDownTimestamps.get(anonymizedKeySlot);
    if (downTime) {
      const holdTimeMs = Math.max(10, Math.min(2000, now - downTime));
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
    if (this.totalKeystrokes < 3) {
      this.reset();
      return;
    }

    const sessionDurationMin = Math.max(0.05, (Date.now() - this.typingSessionStart) / 60000);
    const avgIki = this.interKeyIntervals.length > 0
      ? this.interKeyIntervals.reduce((a, b) => a + b, 0) / this.interKeyIntervals.length
      : 240;

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
      },
      provenance: {
        source: 'web-api',
        confidence: Math.min(1.0, this.totalKeystrokes / 15),
        timestamp: Date.now(),
      },
    });

    this.reset();
  }

  private reset(): void {
    this.lastKeyDownTime = 0;
    this.activeKeyDownTimestamps.clear();
    this.interKeyIntervals = [];
    this.totalKeystrokes = 0;
    this.backspaceCount = 0;
    this.pauseCount = 0;
    this.typingSessionStart = 0;
  }
}

export const typingSensor = new TypingSensorCollector();
