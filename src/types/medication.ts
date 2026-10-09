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
  preAvg: number;
  postAvg: number;
  changePercent: number;
  zScoreDelta: number;
  direction: 'improved' | 'declined' | 'stable';
  interpretation: string;
}

export interface MedicationImpactReport {
  medication: Medication;
  daysActive: number;
  deltas: MedicationEffectDelta[];
  affectiveStateBefore: number; // 0-100
  affectiveStateAfter: number;  // 0-100
  overallSummary: string;
  circadianImpactSummary: string;
}
