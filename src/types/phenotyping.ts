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
  radiusOfGyrationMeters: number | null;
  locationEntropy: number | null;
  normalizedLocationEntropy: number | null;
  homestayRatio: number | null;
  totalDistanceMeters: number | null;
  stationaryClustersCount: number;

  // Keystroke Dynamics (BiAffect)
  meanHoldTimeMs: number | null;
  varHoldTimeMs: number | null;
  meanFlightTimeMs: number | null; // IKI
  varFlightTimeMs: number | null;
  backspaceRate: number | null;
  burstinessIndex: number | null;
  typingSpeedWpm: number | null;

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
  tremorVariance: number | null;
  activityIntensityScore: number;
}

/**
 * Clinical Phenotype Classification Result
 */
export type ClinicalPhenotypeState =
  | 'burnout_phenotype'
  | 'depressive_phenotype'
  | 'anxious_agitated_phenotype'
  | 'anxiety_sleep_phenotype'
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

export interface ClinicalInsightAlert {
  id: string;
  insightType:
    | 'burnout'
    | 'depressionIsolation'
    | 'anxietySleep'
    | 'neurodiversity'
    | 'cognitiveDecline'
    | 'CognitivePattern'
    | 'ptsdHypervigilance'
    | 'lowSelfEsteemPassiveSocial';
  title: string;
  potentialStateLabel?: string;
  personalizedDeviationStatement: string;
  explainableEvidences: string[];
  ethicalDisclaimer: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  contributingMetrics: Record<string, number>;
  notificationTitle?: string;
  notificationBody: string;
  consecutiveDays?: number;
  requiredDays?: number;
  isCriticalThresholdReached?: boolean;
  statisticalSummary?: string;
  isAddedToDoctorReport?: boolean;
}

export * from './biomarkers';
