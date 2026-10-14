import { MetricKey } from './sensor';

export type TimeSlot = 'morning' | 'noon' | 'evening' | 'night' | 'as_needed';

export interface Medication {
  id?: number;
  name: string;             // Örn: "Escitalopram", "Lityum", "Seroquel"
  dosage: string;           // Örn: 5 mg veya 1 Tablet
  timeSlots: TimeSlot[];    // ['morning', 'evening', 'night'] vb.
  customTimes?: string[];   // ['09:00', '19:00', '23:00']
  startDate: string;        // YYYY-MM-DD
  endDate?: string;         // Opsiyonel
  notes?: string;
  createdAt: number;
  isActive?: boolean;
}

export interface MedicationLog {
  id?: number;
  medicationId: number;
  date: string;             // YYYY-MM-DD
  timestamp: number;
  taken: boolean;           // İlaç alındı mı?
}

export interface MedicationEffectDelta {
  metricKey: MetricKey;
  label: string;
  unit: string;
  preAvg: number | null;
  postAvg: number | null;
  changePercent: number | null;
  zScoreDelta: number | null;
  preSampleCount?: number;
  postSampleCount?: number;
  hasPreData?: boolean;
  hasPostData?: boolean;
  hasComparisonData?: boolean;
  direction: 'improved' | 'declined' | 'stable' | 'insufficient_data';
  interpretation: string;
}

export interface PeriodWindowStat {
  avg: number | null;
  sampleDays: number;
  sampleCount: number;
  changePercent: number | null;
}

export interface MedicationMultiPeriodRow {
  metricKey: MetricKey;
  label: string;
  unit: string;
  pre1Month: PeriodWindowStat;   // Kullanmadan önceki son 1 ay (30 gün)
  pre3Months: PeriodWindowStat;  // Kullanmadan önceki son 3 ay (90 gün)
  pre6Months: PeriodWindowStat;  // Kullanmadan önceki son 6 ay (180 gün)
  postOverall: {
    avg: number | null;
    sampleDays: number;
    sampleCount: number;
  };
  post1Month: {
    avg: number | null;
    sampleDays: number;
    sampleCount: number;
  };
  post3Months: {
    avg: number | null;
    sampleDays: number;
    sampleCount: number;
  };
  post6Months: {
    avg: number | null;
    sampleDays: number;
    sampleCount: number;
  };
  direction: 'improved' | 'declined' | 'stable' | 'insufficient_data';
  interpretation: string;
}

export interface MedicationImpactReport {
  medication: Medication;
  formattedDosage: string;
  formattedSchedule: string;
  daysActive: number;
  preSampleDays?: number;
  postSampleDays?: number;
  pre1MonthSampleDays: number;
  pre3MonthsSampleDays: number;
  pre6MonthsSampleDays: number;
  hasRealComparison?: boolean;
  deltas: MedicationEffectDelta[];
  multiPeriodTable: MedicationMultiPeriodRow[];
  timeSeriesOverlaySummary: string;
  affectiveStateBefore: number | null; // 0-100 or null if no pre-medication mood logs
  affectiveStateAfter: number | null;  // 0-100 or null if no post-medication mood logs
  overallSummary: string;
  circadianImpactSummary: string;
}
