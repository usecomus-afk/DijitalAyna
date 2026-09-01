/**
 * Smartphone Digital Phenotyping Engine - Type Definitions & Interfaces
 * Grounded in Harvard Beiwe (Onnela 2016), Northwestern Purple Robot (Saeb 2015),
 * UIC BiAffect (Zulueta 2018), and Dartmouth StudentLife (Wang 2014).
 */

export interface LocationEvent {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  timestamp: number; // ms
}

export interface AccelerometerEvent {
  x: number;
  y: number;
  z: number;
  timestamp: number; // ms
}

export type ScreenEventType = 'ON' | 'OFF' | 'UNLOCK';

export interface ScreenInteractionEvent {
  eventType: ScreenEventType;
  timestamp: number; // ms
}

export type KeystrokeEventType = 'KEY_DOWN' | 'KEY_UP' | 'BACKSPACE' | 'AUTOCORRECT';

export interface KeystrokeMetadataEvent {
  eventType: KeystrokeEventType;
  durationMs: number;       // Hold time (keydown to keyup)
  interKeyDelayMs: number;  // Flight time / Inter-key interval (IKI)
  timestamp: number;        // ms
  // STRICT: Key values, ASCII codes, or text contents are NEVER recorded.
}

export type CallDirection = 'INCOMING' | 'OUTGOING' | 'MISSED';

export interface CallLogMetadataEvent {
  direction: CallDirection;
  durationSeconds: number;
  timestamp: number; // ms
  hashedContactId: string; // SHA-256 hashed with user-specific salt
}

/**
 * Aggregated Phenotype Features for a Temporal Window (e.g. 24 Hours)
 */
export interface DailyPhenotypeFeatures {
  date: string; // YYYY-MM-DD
  // Mobility Features (Beiwe / Purple Robot)
  radiusOfGyrationMeters: number;
  locationEntropy: number;
  normalizedLocationEntropy: number;
  homestayRatio: number;
  totalDistanceMeters: number;
  stationaryClustersCount: number;

  // Keystroke Dynamics (BiAffect)
  meanHoldTimeMs: number;
  varHoldTimeMs: number;
  meanFlightTimeMs: number; // IKI
  varFlightTimeMs: number;
  backspaceRate: number;
  burstinessIndex: number;
  typingSpeedWpm: number;

  // Circadian & Screen Dynamics (StudentLife)
  nocturnalScreenMinutes: number; // 00:00-06:00
  unlockFrequencyPerWakingHour: number;
  hyperCheckingRatio: number; // Sessions < 30s / total sessions
  totalScreenOnMinutes: number;
  circadianMovementStability: number; // 0 to 1

  // Social Proxy
  outgoingCallRatio: number;
  totalSocialInteractions: number;

  // Accelerometer Movement
  tremorVariance: number;
  activityIntensityScore: number;
}

/**
 * Clinical Phenotype Classification Result
 */
export type ClinicalPhenotypeState =
  | 'depressive_phenotype'
  | 'anxious_agitated_phenotype'
  | 'manic_hypomanic_phenotype'
  | 'cognitive_fatigue_phenotype'
  | 'adhd_neurodivergent_phenotype'
  | 'cognitive_decline_risk_phenotype'
  | 'ptsd_hypervigilance_phenotype'
  | 'low_self_esteem_phenotype'
  | 'euthymic_healthy_balance';

export interface ClinicalPhenotypeInference {
  state: ClinicalPhenotypeState;
  label: string;
  confidence: 'low' | 'medium' | 'high';
  compositeScore: number; // 0 to 1
  clinicalInsight: string;
  contributingZScores: Record<string, number>;
  detectedAt: string;
}
