import {
  LocationEvent,
  AccelerometerEvent,
  ScreenInteractionEvent,
  KeystrokeMetadataEvent,
  CallLogMetadataEvent,
  DailyPhenotypeFeatures,
} from '../types/phenotyping';
import { LocationFeatureExtractor } from '../features/LocationFeatureExtractor';
import { KeystrokeFeatureExtractor } from '../features/KeystrokeFeatureExtractor';
import { CircadianFeatureExtractor } from '../features/CircadianFeatureExtractor';
import { PrivacyGuardrails } from '../privacy/PrivacyGuardrails';

/**
 * Mobile Telemetry Ingestion & Real-Time Edge Processing Pipeline
 * Enforces in-memory temporal aggregation and immediate raw buffer flushing.
 */
export class TelemetryPipeline {
  private static instance: TelemetryPipeline;

  private locationBuffer: LocationEvent[] = [];
  private accelBuffer: AccelerometerEvent[] = [];
  private screenBuffer: ScreenInteractionEvent[] = [];
  private keystrokeBuffer: KeystrokeMetadataEvent[] = [];
  private callLogBuffer: CallLogMetadataEvent[] = [];

  private userSalt = 'comus_phenotype_salt_default';

  private constructor() {}

  static getInstance(): TelemetryPipeline {
    if (!TelemetryPipeline.instance) {
      TelemetryPipeline.instance = new TelemetryPipeline();
    }
    return TelemetryPipeline.instance;
  }

  setUserSalt(salt: string) {
    this.userSalt = salt;
  }

  /**
   * Ingest Location Event with validation
   */
  ingestLocation(event: LocationEvent): boolean {
    if (
      typeof event.latitude !== 'number' ||
      typeof event.longitude !== 'number' ||
      isNaN(event.latitude) ||
      isNaN(event.longitude)
    ) {
      return false;
    }
    this.locationBuffer.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });
    return true;
  }

  /**
   * Ingest Accelerometer Event with validation
   */
  ingestAccelerometer(event: AccelerometerEvent): boolean {
    if (typeof event.x !== 'number' || isNaN(event.x)) return false;
    this.accelBuffer.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });
    // Keep max 2000 points in memory to avoid memory bloat
    if (this.accelBuffer.length > 2000) {
      this.accelBuffer = this.accelBuffer.slice(-1500);
    }
    return true;
  }

  /**
   * Ingest Screen Interaction Event
   */
  ingestScreenEvent(eventType: 'ON' | 'OFF' | 'UNLOCK', timestamp = Date.now()): boolean {
    this.screenBuffer.push({
      eventType,
      timestamp,
    });
    return true;
  }

  /**
   * Ingest Keystroke Dynamics Metadata (Strictly sanitized)
   */
  ingestKeystroke(rawEvent: any): boolean {
    const sanitized = PrivacyGuardrails.sanitizeKeystroke(rawEvent);
    if (!sanitized) return false;

    this.keystrokeBuffer.push(sanitized);
    // Keep max 1000 keystroke metadata entries in buffer
    if (this.keystrokeBuffer.length > 1000) {
      this.keystrokeBuffer = this.keystrokeBuffer.slice(-800);
    }
    return true;
  }

  /**
   * Ingest Call Log Metadata with salted contact hash
   */
  async ingestCallLog(rawEvent: {
    direction: string;
    durationSeconds: number;
    contactId?: string;
    timestamp?: number;
  }): Promise<boolean> {
    const sanitized = await PrivacyGuardrails.sanitizeCallLog(rawEvent, this.userSalt);
    this.callLogBuffer.push(sanitized);
    return true;
  }

  /**
   * Aggregates all current in-memory sensor buffers into validated daily features
   * and immediately flushes the raw buffers for privacy compliance.
   */
  aggregateAndFlush(date = new Date().toISOString().split('T')[0]): DailyPhenotypeFeatures {
    // 1. Mobility Features
    const rg = LocationFeatureExtractor.radiusOfGyration(this.locationBuffer);
    const entropyStats = LocationFeatureExtractor.locationEntropy(this.locationBuffer);
    const homestay = LocationFeatureExtractor.homestayRatio(this.locationBuffer);
    const totalDist = LocationFeatureExtractor.totalDistanceTraveled(this.locationBuffer);

    // 2. Keystroke Dynamics
    const holdStats = KeystrokeFeatureExtractor.holdTimeStats(this.keystrokeBuffer);
    const flightStats = KeystrokeFeatureExtractor.flightTimeStats(this.keystrokeBuffer);
    const backspace = KeystrokeFeatureExtractor.backspaceRate(this.keystrokeBuffer);
    const burstiness = KeystrokeFeatureExtractor.burstinessIndex(this.keystrokeBuffer);
    const wpm = KeystrokeFeatureExtractor.estimateTypingSpeedWpm(this.keystrokeBuffer);

    // 3. Circadian & Screen Dynamics
    const nocturnalMins = CircadianFeatureExtractor.nocturnalScreenTime(this.screenBuffer, 0, 6);
    const unlockFreq = CircadianFeatureExtractor.unlockFrequency(this.screenBuffer, 16);
    const hyperCheck = CircadianFeatureExtractor.hyperCheckingIndex(this.screenBuffer, 30);
    const totalScreenMins = CircadianFeatureExtractor.totalScreenOnTime(this.screenBuffer);
    const circadianMov = CircadianFeatureExtractor.circadianMovementScore(this.accelBuffer);

    // 4. Social Proxy
    const outgoingCount = this.callLogBuffer.filter((c) => c.direction === 'OUTGOING').length;
    const totalCalls = this.callLogBuffer.length;
    const outgoingRatio = totalCalls > 0 ? outgoingCount / totalCalls : 0.5;

    // 5. Accelerometer Tremor Variance
    const tremors = this.accelBuffer.map((a) => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z));
    const meanTremor = tremors.length > 0 ? tremors.reduce((a, b) => a + b, 0) / tremors.length : 9.81;
    const tremorVar =
      tremors.length > 1
        ? tremors.reduce((acc, v) => acc + Math.pow(v - meanTremor, 2), 0) / tremors.length
        : 0.15;

    const features: DailyPhenotypeFeatures = {
      date,
      radiusOfGyrationMeters: rg,
      locationEntropy: entropyStats.entropy,
      normalizedLocationEntropy: entropyStats.normalizedEntropy,
      homestayRatio: homestay,
      totalDistanceMeters: totalDist,
      stationaryClustersCount: entropyStats.clusterCount,

      meanHoldTimeMs: holdStats.mean,
      varHoldTimeMs: holdStats.variance,
      meanFlightTimeMs: flightStats.mean,
      varFlightTimeMs: flightStats.variance,
      backspaceRate: backspace,
      burstinessIndex: burstiness,
      typingSpeedWpm: wpm,

      nocturnalScreenMinutes: nocturnalMins,
      unlockFrequencyPerWakingHour: unlockFreq,
      hyperCheckingRatio: hyperCheck,
      totalScreenOnMinutes: totalScreenMins,
      circadianMovementStability: circadianMov,

      outgoingCallRatio: outgoingRatio,
      totalSocialInteractions: totalCalls,

      tremorVariance: Math.round(tremorVar * 100) / 100,
      activityIntensityScore: Math.round(Math.min(100, (totalDist / 100) + (rg / 50))),
    };

    // PRIVACY POLICY ENFORCEMENT: FLUSH RAW BUFFERS
    this.flushRawBuffers();

    return features;
  }

  /**
   * Explicitly clears all in-memory raw sensor event buffers
   */
  flushRawBuffers() {
    this.locationBuffer = [];
    this.accelBuffer = [];
    this.screenBuffer = [];
    this.keystrokeBuffer = [];
    this.callLogBuffer = [];
  }
}
