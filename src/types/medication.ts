import { MetricKey } from './sensor';

export interface Medication {
  id?: number;
  name: string;             // Örn: "Escitalopram", "Lityum", "Seroquel"
  dosageMg: number;         // Örn: 10
  frequencyPerDay: number;  // Örn: 1 (Günde 1 kez)
  startDate: string;        // YYYY-MM-DD
  endDate?: string;         // Opsiyonel (Devam ediyorsa boş)
  notes?: string;
  createdAt: number;
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
