import { db } from '../db';

class TouchSensorCollector {
  private isRunning = false;
  private lastScrollPos = 0;
  private lastScrollTime = 0;
  private scrollVelocities: number[] = [];
  private touchCount = 0;
  private flushTimer: any = null;

  start(): void {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;

    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('touchstart', this.handleTouch, { passive: true });
    window.addEventListener('pointerdown', this.handleTouch, { passive: true });

    this.flushTimer = setInterval(() => this.flush(), 30000);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('touchstart', this.handleTouch);
    window.removeEventListener('pointerdown', this.handleTouch);
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  private handleScroll = () => {
    const now = Date.now();
    const currentPos = window.scrollY || document.documentElement.scrollTop;

    if (this.lastScrollTime > 0) {
      const dt = (now - this.lastScrollTime) / 1000;
      const dy = Math.abs(currentPos - this.lastScrollPos);
      if (dt > 0.02 && dt < 1.0) {
        const velocity = dy / dt;
        if (velocity < 5000) {
          this.scrollVelocities.push(velocity);
        }
      }
    }

    this.lastScrollPos = currentPos;
    this.lastScrollTime = now;
  };

  private handleTouch = () => {
    this.touchCount++;
  };

  async flush(): Promise<void> {
    if (this.scrollVelocities.length === 0 && this.touchCount === 0) return;

    const avgScrollVelocity = this.scrollVelocities.length > 0
      ? this.scrollVelocities.reduce((a, b) => a + b, 0) / this.scrollVelocities.length
      : 280;

    await db.logSensorEvent({
      type: 'touch',
      timestamp: Date.now(),
      payload: {
        touch_scroll_velocity: Math.round(avgScrollVelocity),
        touch_interaction_frequency: Math.max(1, this.touchCount),
      }
    });

    this.scrollVelocities = [];
    this.touchCount = 0;
  }
}

export const touchSensor = new TouchSensorCollector();
