/**
 * Biomarker & Extended Telemetry Type Definitions
 * Grouped into Validated Phenotypic Domains (Academic Psychiatric Phenotyping)
 */
import { MetricKey } from './sensor';

export type PhenotypicDomain =
  | 'cognitive_motor'
  | 'circadian_sleep'
  | 'socio_spatial';

export interface PhenotypicDomainGroup {
  id: PhenotypicDomain;
  title: string;
  shortTitle: string;
  description: string;
  metricKeys: MetricKey[];
}

export const PHENOTYPIC_DOMAINS: Record<PhenotypicDomain, PhenotypicDomainGroup> = {
  cognitive_motor: {
    id: 'cognitive_motor',
    title: 'Bilişsel & Motor Dinamikler (Keystroke & Touch)',
    shortTitle: 'Bilişsel & Motor',
    description: 'Yazım hızı (WPM), tuş aralığı (ms), düzeltme/hata oranı (%), basılı tutma ve kaydırma hızı (px/sn).',
    metricKeys: [
      'typing_wpm',
      'typing_iki',
      'typing_backspace_rate',
      'typing_hold_time',
      'touch_scroll_velocity',
      'touch_interaction_frequency',
    ],
  },
  circadian_sleep: {
    id: 'circadian_sleep',
    title: 'Sirkadiyen & Uyku Öncülleri',
    shortTitle: 'Sirkadiyen & Uyku',
    description: 'Gece ekran kullanımı (02:00–05:00), gece yüksek ışık maruziyeti ve uyku pencereleri.',
    metricKeys: [
      'night_usage_minutes',
      'night_light_violations',
      'screen_on_time',
      'sleep_duration',
      'sleep_efficiency',
      'sleep_sol',
      'sleep_waso',
    ],
  },
  socio_spatial: {
    id: 'socio_spatial',
    title: 'Sosyo-Mekânsal Hareketlilik',
    shortTitle: 'Sosyo-Mekânsal',
    description: 'Evde kalma oranı (%), hareketlilik yarıçapı (km) ve günlük fiziksel hareketlilik endeksi.',
    metricKeys: [
      'homestay_ratio',
      'mobility_radius',
      'mobility_index',
    ],
  },
};

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
