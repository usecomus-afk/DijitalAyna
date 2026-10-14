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

export interface MedicationImpactReport {
  medication: Medication;
  daysActive: number;
  preSampleDays?: number;
  postSampleDays?: number;
  hasRealComparison?: boolean;
  deltas: MedicationEffectDelta[];
  affectiveStateBefore: number | null; // 0-100 or null if no pre-medication mood logs
  affectiveStateAfter: number | null;  // 0-100 or null if no post-medication mood logs
  overallSummary: string;
  circadianImpactSummary: string;
}
