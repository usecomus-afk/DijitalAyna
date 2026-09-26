/**
 * Biomarker & Extended Telemetry Type Definitions
 * Including Gaming Avoidance and Camera / Self-Worth Sensitivity
 */

export interface GamingTelemetry {
  gamingAppDurationMinutes: number; // Günlük oyun oturumları toplam süresi
  longestGamingSessionMinutes: number; // Tek seferde en uzun oyun oturumu
  sessionCount: number;
}

export interface CameraInteractionTelemetry {
  cameraAppDurationMinutes: number; // Kamera uygulamasında geçirilen süre
  cameraLaunchCount: number; // Kamera açılış sıklığı
  // Fotoğraf içeriğine ASLA bakılmaz; sadece native tarafta galeri delta adedi alınır:
  photoBurstCreationCount?: number; // Kısa sürede (30 dk) çekilen fotoğraf adedi
  photoBurstDeletionCount?: number; // Aynı oturumda silinen fotoğraf adedi
  deletionRatio?: number; // Silinen / Çekilen oranı (0.0 - 1.0)
}

/**
 * Daily digital phenotype container with multimodal telemetry groups
 */
export interface DailyDigitalPhenotype {
  date: string;
  stepCount?: number;
  sleepSOL?: number;
  homestay?: number;
  holdTime?: number;
  gamingTelemetry?: GamingTelemetry;
  cameraTelemetry?: CameraInteractionTelemetry;
}
