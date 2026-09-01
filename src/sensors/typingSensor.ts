import { db } from '../db';

class TypingSensorCollector {
  private isRunning = false;
  private lastKeyDownTime = 0;
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
  }

  stop(): void {
    if (!this.isRunning || typeof window === 'undefined') return;
    this.isRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
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

    if (this.lastKeyDownTime > 0) {
      const iki = now - this.lastKeyDownTime;
      if (iki < 4000) { // filter out long breaks
        this.interKeyIntervals.push(iki);
        if (iki > 1200) {
          this.pauseCount++;
        }
      }
    }
    this.lastKeyDownTime = now;
    this.totalKeystrokes++;

    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.backspaceCount++;
    }

    // Debounce flush 2.5 seconds after typing stops
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 2500);
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
      }
    });

    this.reset();
  }

  private reset(): void {
    this.lastKeyDownTime = 0;
    this.interKeyIntervals = [];
    this.totalKeystrokes = 0;
    this.backspaceCount = 0;
    this.pauseCount = 0;
    this.typingSessionStart = 0;
  }
}

export const typingSensor = new TypingSensorCollector();
