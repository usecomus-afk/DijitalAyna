/**
 * Biomarker & Extended Telemetry Type Definitions
 */

/**
 * Daily digital phenotype container with multimodal telemetry groups
 */
export interface DailyDigitalPhenotype {
  date: string;
  stepCount?: number;
  sleepSOL?: number;
  homestay?: number;
  holdTime?: number;
}
