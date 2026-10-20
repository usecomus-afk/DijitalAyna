import { describe, it, expect } from 'vitest';
import {
  clampMetricValue,
  sanitizeSensorEvent,
} from '../../safety/sanitizer';
import {
  BaselineEngine,
  CLINICAL_MIN_VARIANCE,
} from '../BaselineEngine';
import {
  resolveDailyState,
  getSynthesisCopy,
  resolveSynthesisBadge,
} from '../dailyState';
import {
  getMetricTrendPresentation,
  formatModifiedZScorePlain,
} from '../../utils/metricPresentation';
import { CircadianFeatureExtractor } from '../../features/CircadianFeatureExtractor';
import { KeystrokeFeatureExtractor } from '../../features/KeystrokeFeatureExtractor';
import { PHENOTYPIC_DOMAINS } from '../../types/biomarkers';
import { METRIC_DEFINITIONS, isPrimaryMentalBiomarker } from '../../types/sensor';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

describe('DUTY PIPELINE REFACTOR - Comprehensive Module Verification', () => {
  // =========================================================================
  // MODULE 1: INGESTION, BOUNDS CLAMPING & UNIT NORMALIZATION
  // =========================================================================
  describe('Module 1: Ingestion, Bounds Clamping & Unit Normalization', () => {
    it('1.1 Hard clamp: daily screen time must never exceed 1440 min/day', () => {
      expect(clampMetricValue('screen_on_time', 1500)).toBe(1440);
      expect(clampMetricValue('daily_screen_time_minutes', 99999)).toBe(1440);
      expect(clampMetricValue('screen_on_time', -10)).toBe(0);
      expect(clampMetricValue('screen_on_time', 300)).toBe(300);

      // CircadianFeatureExtractor guarantee
      const capped = CircadianFeatureExtractor.totalScreenOnTime([]);
      expect(capped).toBeLessThanOrEqual(1440);
    });

    it('1.2 Timestamp & epoch millisecond conversion bug interception', () => {
      // Millisecond timestamp or epoch leakage (e.g. 180,000 ms or 1,700,000,000,000)
      const clampedMs = clampMetricValue('screen_on_time', 180000);
      expect(clampedMs).toBe(1440);

      const epochLeak = clampMetricValue('screen_on_time', 1700000000000);
      expect(epochLeak).toBe(1440); // Hard clamped to max day limit
    });

    it('1.3 Hard clamp: average session duration [0.1, 360] min', () => {
      expect(clampMetricValue('session_duration', 0.01)).toBe(0.1);
      expect(clampMetricValue('session_duration', 500)).toBe(360);
      expect(clampMetricValue('average_session_duration_minutes', 25.5)).toBe(25.5);
    });

    it('1.4 Hard clamp: typing speed [5, 160] WPM', () => {
      expect(clampMetricValue('typing_wpm', 2)).toBe(5);
      expect(clampMetricValue('typing_wpm', 220)).toBe(160);
      expect(clampMetricValue('typing_speed_wpm', 48)).toBe(48);

      // KeystrokeFeatureExtractor physical speed clamp
      const dummyEvents: any[] = Array(10).fill({
        eventType: 'KEY_DOWN',
        durationMs: 20,
        interKeyDelayMs: 20,
        timestamp: Date.now(),
      });
      const estimatedWpm = KeystrokeFeatureExtractor.estimateTypingSpeedWpm(dummyEvents);
      expect(estimatedWpm).toBeLessThanOrEqual(160);
      expect(estimatedWpm).toBeGreaterThanOrEqual(5);
    });

    it('1.5 Hard clamp: flight time & hold time [10, 2000] ms', () => {
      expect(clampMetricValue('typing_iki', 2)).toBe(10);
      expect(clampMetricValue('typing_iki', 5000)).toBe(2000);
      expect(clampMetricValue('keystroke_flight_time_ms', 180)).toBe(180);

      expect(clampMetricValue('typing_hold_time', 4)).toBe(10);
      expect(clampMetricValue('hold_time_ms', 9000)).toBe(2000);
    });

    it('1.6 Homestay ratio: strictly expressed as percentage [0%, 100%], never raw float 1.0 oran', () => {
      // Float input 0.85 -> 85%
      expect(clampMetricValue('homestay_ratio', 0.85)).toBe(85);
      // Float input 1.0 -> 100%
      expect(clampMetricValue('homestay_ratio', 1.0)).toBe(100);
      // Pre-percentage 78% -> 78%
      expect(clampMetricValue('homestay_ratio', 78)).toBe(78);
      // Over 100% -> clamped to 100%
      expect(clampMetricValue('homestay_ratio', 120)).toBe(100);

      // Verify definition unit is '%'
      expect(METRIC_DEFINITIONS.homestay_ratio.unit).toBe('%');
    });

    it('1.7 Interaction intensity clamped to realistic interactions per minute', () => {
      expect(clampMetricValue('touch_interaction_frequency', 1200)).toBe(600);
      expect(clampMetricValue('interaction_intensity', -5)).toBe(0);
      expect(clampMetricValue('touch_scroll_velocity', 15000)).toBe(5000);
    });

    it('1.8 Sanitizer gateway cleanses and bounds full event payloads', () => {
      const sanitized = sanitizeSensorEvent({
        type: 'session',
        timestamp: Date.now(),
        payload: {
          screen_on_time: 9999999,
          session_duration: 500,
        },
      });
      expect(sanitized).toBeDefined();
      expect(sanitized?.payload.screen_on_time).toBe(1440);
      expect(sanitized?.payload.session_duration).toBe(360);
    });
  });

  // =========================================================================
  // MODULE 2: ROBUST STATISTICAL BASELINE & ANOMALY DETECTION ENGINE
  // =========================================================================
  describe('Module 2: Robust Statistical Baseline & Anomaly Detection Engine', () => {
    it('2.1 Computes robust Median & MAD on skewed distributions', () => {
      // Heavily skewed smartphone screen time (e.g. mostly ~120 min with a 600 min spike)
      const skewedData = [110, 115, 120, 120, 125, 130, 600];
      const median = BaselineEngine.computeMedian(skewedData);
      expect(median).toBe(120); // Resistant to the 600 outlier

      const mad = BaselineEngine.computeMAD(skewedData, median);
      // Deviations: |110-120|=10, |115-120|=5, 0, 0, 5, 10, 480 -> sorted: [0, 0, 5, 5, 10, 10, 480] -> median is 5
      expect(mad).toBe(5);

      const iqr = BaselineEngine.computeIQR(skewedData);
      expect(iqr.iqr).toBeGreaterThan(0);
    });

    it('2.2 Modified Z-Score: 0.6745 * (X - Median) / MAD', () => {
      const median = 50;
      const mad = 10;
      // Value 70 -> Modified_Z = 0.6745 * (70 - 50) / 10 = 1.35
      const modZ = BaselineEngine.calculateModifiedZScore(70, median, mad, 'typing_wpm');
      expect(modZ).toBeCloseTo(1.35, 2);

      // Value 50 -> Modified_Z = 0
      expect(BaselineEngine.calculateModifiedZScore(50, median, mad)).toBe(0);
    });

    it('2.3 Protects against division by zero (MAD == 0) with clinical epsilon', () => {
      // User typed at exactly 40 WPM every day: MAD = 0
      const identicalDays = [40, 40, 40, 40];
      const median = BaselineEngine.computeMedian(identicalDays);
      const mad = BaselineEngine.computeMAD(identicalDays, median);
      expect(mad).toBe(0);

      // Clinical min variance for typing_wpm is 2.0 WPM
      const eps = CLINICAL_MIN_VARIANCE.typing_wpm ?? 2.0;
      expect(eps).toBe(2.0);

      // Slightly higher value (44 WPM) must not divide by zero or explode
      const modZ = BaselineEngine.calculateModifiedZScore(44, median, mad, 'typing_wpm');
      // 0.6745 * (44 - 40) / 2.0 = 1.35
      expect(modZ).toBeCloseTo(1.35, 2);
      expect(Number.isFinite(modZ)).toBe(true);
    });

    it('2.4 Cold Start & Data Completeness: sampleCount < 3 renders Baseline_Learning and disables anomaly alarms', () => {
      const trendDay1 = getMetricTrendPresentation('typing_wpm', 30, 2.5, 1);
      expect(trendDay1.deviationLabel).toBe('Öğreniliyor');
      expect(trendDay1.plainDeviationText).toContain('öğreniliyor');

      const trendDay2 = getMetricTrendPresentation('screen_on_time', -20, -1.8, 2);
      expect(trendDay2.deviationLabel).toBe('Öğreniliyor');

      // On day 3+ (non-cold-start), deviation labels activate
      const trendDay3 = getMetricTrendPresentation('typing_wpm', 30, 2.5, 3);
      expect(trendDay3.deviationLabel).toBe('+30%');
    });
  });

  // =========================================================================
  // MODULE 3: BIOMARKER HIERARCHY & NOISE ELIMINATION
  // =========================================================================
  describe('Module 3: Biomarker Hierarchy & Noise Elimination', () => {
    it('3.1 Purges hardware noise (Battery, Charging, Network) from primary mental biomarkers', () => {
      expect(isPrimaryMentalBiomarker('battery_level')).toBe(false);
      expect(isPrimaryMentalBiomarker('is_charging')).toBe(false);
      expect(isPrimaryMentalBiomarker('network_online')).toBe(false);

      expect(isPrimaryMentalBiomarker('typing_wpm')).toBe(true);
      expect(isPrimaryMentalBiomarker('night_usage_minutes')).toBe(true);
      expect(isPrimaryMentalBiomarker('homestay_ratio')).toBe(true);
    });

    it('3.2 Groups validated phenotypic domains correctly', () => {
      const cog = PHENOTYPIC_DOMAINS.cognitive_motor;
      expect(cog.metricKeys).toContain('typing_wpm');
      expect(cog.metricKeys).toContain('typing_iki');
      expect(cog.metricKeys).toContain('typing_backspace_rate');
      expect(cog.metricKeys).toContain('touch_scroll_velocity');

      const circ = PHENOTYPIC_DOMAINS.circadian_sleep;
      expect(circ.metricKeys).toContain('night_usage_minutes');
      expect(circ.metricKeys).toContain('night_light_violations');

      const socio = PHENOTYPIC_DOMAINS.socio_spatial;
      expect(socio.metricKeys).toContain('homestay_ratio');
      expect(socio.metricKeys).toContain('mobility_radius');
    });
  });

  // =========================================================================
  // MODULE 4: SYNTHESIS BADGE & CONTRADICTION AUDIT
  // =========================================================================
  describe('Module 4: Synthesis Badge & Contradiction Audit', () => {
    it('4.1 Deterministic State Resolution: index < 50 NEVER resolves to "Dengeli"', () => {
      // Scenario from image_7.png: Index = 48/100
      const synthesis = getSynthesisCopy(48);
      expect(synthesis.badge).not.toContain('Dengeli');
      expect(synthesis.badge).toBe('Düşük Ritim • Hafif Sapma');
      expect(synthesis.text).toContain('zihinsel yük artışına');

      const badgeResolved = resolveSynthesisBadge(48, 'Dengeli Davranışsal & Sirkadiyen Ritim', false);
      expect(badgeResolved).not.toContain('Dengeli');
      expect(badgeResolved).toBe('Dikkat Gerektiren Sirkadiyen Sapma');

      // Severely strained (index = 28)
      const severeBadge = resolveSynthesisBadge(28, 'Dengeli Davranışsal & Sirkadiyen Ritim', false);
      expect(severeBadge).toBe('Yüksek Bilişsel Yük');

      // Healthy balance (index = 75)
      const healthyBadge = resolveSynthesisBadge(75, 'Dengeli Davranışsal & Sirkadiyen Ritim', false);
      expect(healthyBadge).toBe('Dengeli Davranışsal & Sirkadiyen Ritim');
    });

    it('4.2 Label Disambiguation: Night screen minutes vs sleep window', () => {
      // DailyState ensures text and badge reflect same state tier
      const state48 = resolveDailyState({ balanceIndex: 48, recentMoodScore: 40 });
      expect(state48.isStrained).toBe(true);
      expect(state48.badge).not.toContain('Denge');
    });
  });

  // =========================================================================
  // MODULE 5: UI/UX & DIRECTIONAL LOGIC REFACTOR
  // =========================================================================
  describe('Module 5: UI/UX & Directional Logic Refactor', () => {
    it('5.1 Mathematical Arrow Direction: strictly UP for Delta > 0, DOWN for Delta < 0', () => {
      const up = getMetricTrendPresentation('typing_wpm', 15, 1.2);
      expect(up.arrowDirection).toBe('up');
      expect(up.arrowSymbol).toBe('↑');
      expect(up.TrendIcon).toBe(TrendingUp);

      const down = getMetricTrendPresentation('typing_wpm', -15, -1.2);
      expect(down.arrowDirection).toBe('down');
      expect(down.arrowSymbol).toBe('↓');
      expect(down.TrendIcon).toBe(TrendingDown);

      const flat = getMetricTrendPresentation('typing_wpm', 0, 0);
      expect(flat.arrowDirection).toBe('flat');
      expect(flat.arrowSymbol).toBe('—');
      expect(flat.TrendIcon).toBe(Minus);
    });

    it('5.2 Decouples Arrow Direction from Sentiment Color (Beneficial vs Risk Metrics)', () => {
      // BENEFICIAL METRIC: Physical Mobility (mobility_index: healthyTrend = higher)
      // When mobility increases: Arrow is UP, sentiment is POSITIVE (Green)
      const mobilityUp = getMetricTrendPresentation('mobility_index', 20, 1.5);
      expect(mobilityUp.arrowDirection).toBe('up');
      expect(mobilityUp.sentiment).toBe('positive');
      expect(mobilityUp.badgeColorClass).toContain('emerald');

      // When mobility decreases: Arrow is DOWN, sentiment is NEGATIVE/WARNING (Red/Orange)
      const mobilityDown = getMetricTrendPresentation('mobility_index', -25, -2.1);
      expect(mobilityDown.arrowDirection).toBe('down');
      expect(mobilityDown.sentiment).toBe('negative');
      expect(mobilityDown.badgeColorClass).toContain('rose');

      // RISK METRIC: Night Usage (night_usage_minutes: healthyTrend = lower)
      // When night usage increases: Arrow MUST POINT UP, but sentiment is NEGATIVE (Red/Orange)!
      const nightUp = getMetricTrendPresentation('night_usage_minutes', 30, 2.2);
      expect(nightUp.arrowDirection).toBe('up'); // MUST BE UP, NOT INVERTED!
      expect(nightUp.sentiment).toBe('negative'); // RED/ORANGE
      expect(nightUp.badgeColorClass).toContain('rose');

      // When night usage decreases: Arrow MUST POINT DOWN, but sentiment is POSITIVE (Green)!
      const nightDown = getMetricTrendPresentation('night_usage_minutes', -40, -1.9);
      expect(nightDown.arrowDirection).toBe('down'); // MUST BE DOWN, NOT INVERTED!
      expect(nightDown.sentiment).toBe('positive'); // GREEN
      expect(nightDown.badgeColorClass).toContain('emerald');
    });

    it('5.3 Human-Centric Translation Layer: formats sigma to plain language', () => {
      expect(formatModifiedZScorePlain(0.4)).toBe('Olağan seyrinde');
      expect(formatModifiedZScorePlain(1.4)).toBe('Belirgin artış');
      expect(formatModifiedZScorePlain(-1.5)).toBe('Belirgin azalış');
      expect(formatModifiedZScorePlain(2.4)).toBe('Önemli sapma');

      // Contextual insight generation
      const fastScroll = getMetricTrendPresentation('touch_scroll_velocity', 55, 2.1);
      expect(fastScroll.contextualInsight).toContain('daha hızlı kaydırma');
      expect(fastScroll.contextualInsight).toContain('Huzursuzluk');
    });
  });
});
