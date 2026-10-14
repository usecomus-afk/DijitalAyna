import { describe, it, expect } from 'vitest';
import {
  getDistinctSuggestedAction,
  deduplicateAndEnrichInsights,
  synthesizeHolisticAwarenessSummary,
} from '../awarenessSynthesis';
import { Insight } from '../../types/engine';
import { STRAINED_INSIGHT_TEXT, resolveDailyState } from '../dailyState';

describe('awarenessSynthesis — Tekrarsız Farkındalık Önerileri ve Bütüncül Özet', () => {
  it('farklı klinik kurallar ve aynı kuralın farklı varyantları için birebir aynı öneriyi üretmez', () => {
    const action1 = getDistinctSuggestedAction('burnout-alert', { variantIndex: 0 });
    const action2 = getDistinctSuggestedAction('depression-isolation-alert', { variantIndex: 0 });
    const action3 = getDistinctSuggestedAction('anxiety-sleep-alert', { variantIndex: 0 });
    const action4 = getDistinctSuggestedAction('burnout-alert', { variantIndex: 1 });

    expect(new Set([action1, action2, action3, action4]).size).toBe(4);
  });

  it('deduplicateAndEnrichInsights aynı suggestedAction metnine sahip kartları benzersiz önerilerle ayrıştırır', () => {
    const legacyDisclaimer =
      'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen erken farkındalık öngörüsüdür. Verilerinizi uzman bir hekimle değerlendirmeniz önerilir.';

    const rawInsights: Insight[] = [
      {
        id: 1,
        createdAt: 1000,
        date: '2026-10-14',
        biomarkerType: 'burnout-alert',
        severity: 'medium',
        title: 'Potansiyel Duygusal Tükenmişlik',
        body: 'Yazım hızında yavaşlama gözlendi.',
        suggestedAction: legacyDisclaimer,
        evidence: [],
        dismissed: false,
      },
      {
        id: 2,
        createdAt: 2000,
        date: '2026-10-13',
        biomarkerType: 'anxiety-sleep-alert',
        severity: 'medium',
        title: 'Potansiyel Anksiyete ve Uyku Bozuklukları',
        body: 'Gece uyanıklığı gözlendi.',
        suggestedAction: legacyDisclaimer,
        evidence: [],
        dismissed: false,
      },
      {
        id: 3,
        createdAt: 3000,
        date: '2026-10-12',
        biomarkerType: 'healthy_balance',
        severity: 'low',
        title: STRAINED_INSIGHT_TEXT.title,
        body: STRAINED_INSIGHT_TEXT.body,
        suggestedAction: STRAINED_INSIGHT_TEXT.suggestedAction,
        evidence: [],
        dismissed: false,
      },
      {
        id: 4,
        createdAt: 4000,
        date: '2026-10-11',
        biomarkerType: 'healthy_balance',
        severity: 'low',
        title: STRAINED_INSIGHT_TEXT.title,
        body: STRAINED_INSIGHT_TEXT.body,
        suggestedAction: STRAINED_INSIGHT_TEXT.suggestedAction,
        evidence: [],
        dismissed: false,
      },
    ];

    const strainedState = resolveDailyState({
      balanceIndex: 42,
      recentMoodScore: 30,
    });

    const deduplicated = deduplicateAndEnrichInsights(rawInsights, strainedState, false);
    const actions = deduplicated.map((c) => c.suggestedAction);
    expect(new Set(actions).size).toBe(rawInsights.length);
    // Strained healthy_balance cards across multiple days should also have distinct bodies
    expect(deduplicated[2].body).not.toBe(deduplicated[3].body);
  });

  it('synthesizeHolisticAwarenessSummary sayfadaki tüm farkındalık önerilerini tek bir KÜÇÜK BİR FARKINDALIK ÖNERİSİ özetinde birleştirir', () => {
    const insights: Insight[] = [
      {
        id: 10,
        createdAt: Date.now(),
        date: '2026-10-14',
        biomarkerType: 'burnout-alert',
        severity: 'medium',
        title: 'Potansiyel Duygusal Tükenmişlik',
        body: 'Klavye ritminde yavaşlama var.',
        suggestedAction: getDistinctSuggestedAction('burnout-alert', { variantIndex: 0 }),
        evidence: [],
        dismissed: false,
      },
      {
        id: 11,
        createdAt: Date.now() - 86400000,
        date: '2026-10-13',
        biomarkerType: 'anxiety-sleep-alert',
        severity: 'medium',
        title: 'Potansiyel Anksiyete ve Uyku Bozuklukları',
        body: 'Gece 02:00-04:00 arası ekran kullanımı arttı.',
        suggestedAction: getDistinctSuggestedAction('anxiety-sleep-alert', { variantIndex: 1 }),
        evidence: [],
        dismissed: false,
      },
    ];

    const dailyState = resolveDailyState({
      balanceIndex: 40,
      recentMoodScore: 30,
    });

    const summary = synthesizeHolisticAwarenessSummary({
      insights,
      earlyAwarenessAlerts: [],
      dailyState,
      effectiveDayCount: 15,
      topTags: ['Halsiz / Yorgun', 'Uykusuz'],
    });

    expect(summary.heading).toBe('KÜÇÜK BİR FARKINDALIK ÖNERİSİ');
    expect(summary.totalSynthesizedCount).toBe(2);
    expect(summary.summaryText).toContain('Halsiz / Yorgun');
    expect(summary.pillars.length).toBeGreaterThanOrEqual(2);
    expect(summary.shareText).toContain('KÜÇÜK BİR FARKINDALIK ÖNERİSİ');
  });
});
