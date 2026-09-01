import { MetricKey } from './sensor';

export interface DailyMetric {
  id?: number;
  date: string; // YYYY-MM-DD
  metricKey: MetricKey;
  value: number;
  sampleCount: number;
  min?: number;
  max?: number;
}

export interface BaselineState {
  metricKey: MetricKey;
  ewmaMean: number;
  ewmaStd: number;
  sampleCount: number;
  lastUpdated: string; // YYYY-MM-DD
  isEstablished: boolean; // true if >= 7 days of data
}

export interface AnomalyResult {
  metricKey: MetricKey;
  date: string;
  currentValue: number;
  baselineMean: number;
  baselineStd: number;
  zScore: number;
  isAnomaly: boolean;
  deviationPercent: number; // e.g., +35% or -20%
  direction: 'above' | 'below';
}

export type BiomarkerType =
  | 'emotional_burnout'
  | 'social_withdrawal'
  | 'circadian_disruption'
  | 'high_stress'
  | 'cognitive_fatigue'
  | 'neurodivergent_pattern'
  | 'impulsive_risk'
  | 'voice_monotone'
  | 'healthy_balance';

export interface BiomarkerResult {
  type: BiomarkerType;
  label: string;
  confidence: 'low' | 'medium' | 'high';
  score: number; // 0 to 1
  triggerAnomalies: AnomalyResult[];
  detectedAt: string;
}

export interface EvidenceItem {
  metricKey: MetricKey;
  metricLabel: string;
  unit: string;
  currentValue: number;
  baselineValue: number;
  changePercent: number;
  zScore: number;
  history: { date: string; value: number; baseline: number }[];
}

export interface Insight {
  id?: number;
  createdAt: number; // ms
  date: string; // YYYY-MM-DD
  severity: 'low' | 'medium' | 'high';
  biomarkerType: BiomarkerType;
  title: string;
  body: string;
  suggestedAction: string;
  evidence: EvidenceItem[];
  dismissed: boolean;
  feedback?: 'helpful' | 'not_helpful';
}

export interface PredictiveAlert {
  id?: number;
  createdAt: number;
  patternName: string;
  riskLevel: 'moderate' | 'elevated' | 'high';
  similarityScore: number; // 0 to 1
  leadDays: number;
  title: string;
  explanation: string;
  recommendedAction: string;
  actionPlanned: boolean;
  planNotes?: string;
  dismissed: boolean;
}

export interface MoodReport {
  id?: number;
  timestamp: number; // ms
  date: string; // YYYY-MM-DD
  score: number; // 1 (Very Low), 2 (Low), 3 (Neutral), 4 (Good), 5 (Great)
  energyScore?: number; // 1-5
  tags: string[]; // e.g., ['İş', 'Uyku', 'Sosyal', 'Kaygı']
  note?: string;
}
