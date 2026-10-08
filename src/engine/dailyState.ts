import { Insight } from '../types/engine';

/**
 * Unified Daily State — the single source of truth shared by the
 * Mental Twin mirror (modal) and the Insights feed, so the two never
 * give contradictory messages for the same day.
 */
export type DailyStateKind = 'balanced' | 'low_energy' | 'mental_strain';

export interface DailyState {
  kind: DailyStateKind;
  /** True whenever the day must NOT be described as balanced. */
  isStrained: boolean;
  badge: string;
}

export const BALANCED_INDEX_THRESHOLD = 50;
export const STRAIN_INDEX_THRESHOLD = 35;

export interface DailyStateInput {
  /** Hybrid Emotional Balance Index (0-100), null if not computable. */
  balanceIndex: number | null;
  /** Active EMA mood score mapped to 0-100 (Zorlu=20, Düşük=40, ...), null if none. */
  recentMoodScore: number | null;
}

export function resolveDailyState({ balanceIndex, recentMoodScore }: DailyStateInput): DailyState {
  const values = [balanceIndex, recentMoodScore].filter((v): v is number => v !== null && v !== undefined);
  const lowest = values.length > 0 ? Math.min(...values) : null;

  if (lowest !== null && lowest <= STRAIN_INDEX_THRESHOLD) {
    return { kind: 'mental_strain', isStrained: true, badge: 'Zihinsel Yük' };
  }
  if (lowest !== null && lowest < BALANCED_INDEX_THRESHOLD) {
    return { kind: 'low_energy', isStrained: true, badge: 'Hassas Ritim' };
  }
  return { kind: 'balanced', isStrained: false, badge: 'Denge Durumu' };
}

export const STRAINED_INSIGHT_TEXT = {
  title: 'Hassas Ritim & Dinlenme İhtiyacı',
  body:
    'Aktif bildiriminde zihinsel yük ve içe çekilme hissettiğini belirttin. Pasif hareket sensörlerin olağan seyrinde olsa da, duygu durumundaki bu dalgalanma zihninin yavaşlamaya ihtiyaç duyduğunu gösteriyor.',
  suggestedAction:
    'Bugün performans baskısı hissetmeden kendine şefkatli bir mola alanı açabilir, rutinlerini sadeleştirebilirsin.',
} as const;

/**
 * A "balanced" insight can never be shown on a day the unified state is strained.
 * Replaces it with the strained card; every other insight is returned untouched.
 */
export function applyDailyStateToInsight(insight: Insight, state: DailyState): Insight {
  if (!state.isStrained || insight.biomarkerType !== 'healthy_balance') return insight;
  return {
    ...insight,
    severity: 'medium',
    title: STRAINED_INSIGHT_TEXT.title,
    body: STRAINED_INSIGHT_TEXT.body,
    suggestedAction: STRAINED_INSIGHT_TEXT.suggestedAction,
    badgeLabel: state.badge,
  };
}

/** Text + badge for the "Biyobelirteç & Sensör Sentezi" card of the mirror modal. */
export function getSynthesisCopy(balanceIndex: number): { text: string; badge: string } {
  if (balanceIndex >= 60) {
    return {
      text: 'Tüm pasif biyobelirteçler ve sirkadiyen göstergeler kişiselleştirilmiş EWMA baz hattınızla dengeli bir uyum sergiliyor.',
      badge: 'Dengeli Davranışsal & Sirkadiyen Ritim',
    };
  }
  return {
    text: 'Aktif hissiyat bildiriminiz ve etkileşim sinyalleriniz zihinsel yük artışına ve içe çekilme eğilimine işaret ediyor.',
    badge: balanceIndex <= STRAIN_INDEX_THRESHOLD ? 'Zihinsel Yük • Belirgin Sapma' : 'Düşük Ritim • Hafif Sapma',
  };
}
