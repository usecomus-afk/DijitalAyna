import { MetricKey } from '../types/sensor';
import { PHENOTYPE_RULES } from '../classifier/phenotypeRules.config';

/**
 * Metric -> academic reference mapping used in the doctor report.
 *
 * IMPORTANT: references are NOT invented here. Every entry is one of the citation strings already
 * defined in PHENOTYPE_RULES (phenotypeRules.config.ts), and a metric is linked to a citation only
 * when the phenotype rule that carries that citation actually uses the same signal
 * (see `basis`). Metrics without a matching rule intentionally have no academic reference and the
 * report says so explicitly.
 */
export interface MetricReference {
  /** Citation strings exactly as defined in the phenotype rule config. */
  citations: string[];
  /** Phenotype rule(s) the link is based on (traceability). */
  basis: string;
}

export const METRIC_REFERENCES: Partial<Record<MetricKey, MetricReference>> = {
  typing_wpm: { citations: ['Moon et al., 2025', 'Short et al., 2025'], basis: 'burnout / cognitivePattern4' },
  typing_backspace_rate: { citations: ['Moon et al., 2025', 'Short et al., 2025'], basis: 'burnout / cognitivePattern4' },
  typing_iki: { citations: ['Al-Hindawi et al., 2025', 'Boyle et al., 2025'], basis: 'cognitiveDecline' },
  typing_pause_count: { citations: ['Moon et al., 2025', 'Al-Hindawi et al., 2025'], basis: 'cognitivePattern4 / cognitiveDecline' },
  mobility_index: { citations: ['Guth et al., 2025', 'Aalbers et al., 2025'], basis: 'depressionIsolation / cognitivePattern5' },
  night_usage_minutes: { citations: ['Lee et al., 2025'], basis: 'anxietySleep' },
  session_duration: { citations: ['Wang et al., 2024', 'StudentLife 2024'], basis: 'neurodiversity' },
  gaming_duration: { citations: ['Dumas et al., 2025', 'Guth et al., 2025'], basis: 'gamingAvoidance' },
  camera_interaction_count: { citations: ['McLean et al., 2024', 'PMC5810159'], basis: 'appearanceSensitivityCamera' },
};

/** All citations known to the phenotype rule config (used to validate METRIC_REFERENCES). */
export function getKnownCitations(): Set<string> {
  const known = new Set<string>();
  for (const rule of Object.values(PHENOTYPE_RULES)) {
    for (const c of rule.academicCitations) known.add(c);
  }
  return known;
}

export function getMetricCitations(key: MetricKey): string[] {
  return METRIC_REFERENCES[key]?.citations ?? [];
}
