import { db } from '../db';
import { Capacitor } from '@capacitor/core';

class TouchSensorCollector {
  private isRunning = false;
  private sessionStartTime = 0;
  private lastScrollPos = 0;
  private lastScrollTime = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private lastTouchMoveTime = 0;
  private lastTouchEventTime = 0;
  private scrollVelocities: number[] = [];
  private touchCount = 0;
  private cumulativeTouches = 0;
  private lastMeasuredScrollVelocity: number | null = null;
  private flushTimer: any = null;
  private debounceFlushTimer: any = null;

  start(): void {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;
    if (this.sessionStartTime === 0) {
      this.sessionStartTime = Date.now();
    }

    window.addEventListener('scroll', this.handleScroll, { capture: true, passive: true });
    window.addEventListener('touchstart', this.handleTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { capture: true, passive: true });
    window.addEventListener('pointerdown', this.handlePointerDown, { capture: true, passive: true });
    window.addEventListener('wheel', this.handleWheel, { capture: true, passive: true });

    this.flushTimer = setInterval(() => this.flush(), 30000);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    window.removeEventListener('scroll', this.handleScroll, { capture: true });
    window.removeEventListener('touchstart', this.handleTouchStart, { capture: true });
    window.removeEventListener('touchmove', this.handleTouchMove, { capture: true });
    window.removeEventListener('pointerdown', this.handlePointerDown, { capture: true });
    window.removeEventListener('wheel', this.handleWheel, { capture: true });
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.debounceFlushTimer) {
      clearTimeout(this.debounceFlushTimer);
      this.debounceFlushTimer = null;
    }
    this.flush();
  }

  private scheduleDebouncedFlush(): void {
    if (this.debounceFlushTimer) clearTimeout(this.debounceFlushTimer);
    this.debounceFlushTimer = setTimeout(() => {
      this.debounceFlushTimer = null;
      this.flush();
    }, 1200);
  }

  private handleScroll = (event?: Event) => {
    const now = Date.now();
    let currentPos = window.scrollY || document.documentElement?.scrollTop || 0;
    const target = event?.target;
    if (target && typeof (target as HTMLElement).scrollTop === 'number' && (target as HTMLElement).scrollTop > 0) {
      currentPos = (target as HTMLElement).scrollTop;
    }

    if (this.lastScrollTime > 0) {
      const dt = (now - this.lastScrollTime) / 1000;
      const dy = Math.abs(currentPos - this.lastScrollPos);
      if (dt > 0.008 && dt < 1.0 && dy > 1) {
        const velocity = dy / dt;
        if (velocity >= 10 && velocity < 6000) {
          this.scrollVelocities.push(velocity);
        }
      }
    }

    this.lastScrollPos = currentPos;
    this.lastScrollTime = now;
    this.scheduleDebouncedFlush();
  };

  private handleTouchStart = (event: TouchEvent) => {
    const now = Date.now();
    this.lastTouchEventTime = now;
    this.touchCount++;
    if (event.touches && event.touches.length > 0) {
      this.lastTouchX = event.touches[0].clientX;
      this.lastTouchY = event.touches[0].clientY;
      this.lastTouchMoveTime = now;
    }
    this.scheduleDebouncedFlush();
  };

  private handleTouchMove = (event: TouchEvent) => {
    if (!event.touches || event.touches.length === 0) return;
    const now = Date.now();
    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;

    if (this.lastTouchMoveTime > 0) {
      const dt = (now - this.lastTouchMoveTime) / 1000;
      const dist = Math.hypot(x - this.lastTouchX, y - this.lastTouchY);
      if (dt > 0.008 && dt < 1.0 && dist > 1) {
        const velocity = dist / dt;
        if (velocity >= 10 && velocity < 6000) {
          this.scrollVelocities.push(velocity);
        }
      }
    }

    this.lastTouchX = x;
    this.lastTouchY = y;
    this.lastTouchMoveTime = now;
    this.scheduleDebouncedFlush();
  };

  private handlePointerDown = (event: PointerEvent) => {
    const now = Date.now();
    // Prevent double-counting when touchstart already fired for the same tap
    if (now - this.lastTouchEventTime < 60) return;
    this.touchCount++;
    this.lastTouchX = event.clientX || 0;
    this.lastTouchY = event.clientY || 0;
    this.lastTouchMoveTime = now;
    this.scheduleDebouncedFlush();
  };

  private handleWheel = (event: WheelEvent) => {
    const delta = Math.hypot(event.deltaX || 0, event.deltaY || 0);
    if (delta > 1) {
      const velocity = Math.min(5000, Math.max(20, Math.round(delta * 8)));
      this.scrollVelocities.push(velocity);
      this.scheduleDebouncedFlush();
    }
  };

  async flush(): Promise<void> {
    if (this.scrollVelocities.length === 0 && this.touchCount === 0) return;

    if (this.sessionStartTime === 0) {
      this.sessionStartTime = Date.now();
    }

    this.cumulativeTouches += this.touchCount;
    const elapsedMinutes = Math.max(0.25, (Date.now() - this.sessionStartTime) / 60000);
    const freqPerMin = Math.max(1, Math.round(this.cumulativeTouches / elapsedMinutes));

    if (this.scrollVelocities.length > 0) {
      const avg = this.scrollVelocities.reduce((a, b) => a + b, 0) / this.scrollVelocities.length;
      this.lastMeasuredScrollVelocity = Math.round(avg);
    }

    const payload: Record<string, number> = {
      touch_interaction_frequency: freqPerMin,
      touch_scroll_velocity: this.lastMeasuredScrollVelocity ?? 0,
    };

    await db.logSensorEvent({
      type: 'touch',
      timestamp: Date.now(),
      payload,
      provenance: {
        source: Capacitor.isNativePlatform() ? 'native-sensor' : 'web-api',
        confidence: 1.0,
        timestamp: Date.now(),
      },
    });

    this.scrollVelocities = [];
    this.touchCount = 0;
  }
}

export const touchSensor = new TouchSensorCollector();
