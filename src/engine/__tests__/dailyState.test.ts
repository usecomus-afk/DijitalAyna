import { describe, it, expect } from 'vitest';
import { resolveDailyState, applyDailyStateToInsight, getSynthesisCopy } from '../dailyState';
import { Insight } from '../../types/engine';

const balancedInsight: Insight = {
  createdAt: 1, date: '2026-01-01', severity: 'low', biomarkerType: 'healthy_balance',
  title: 'Dengeli ve Kararlı Davranışsal Ritim', body: 'dengeli', suggestedAction: 'günün keyfini çıkarabilirsin',
  evidence: [], dismissed: false,
};

describe('unified daily state', () => {
  it('index 46 is never balanced', () => {
    const s = resolveDailyState({ balanceIndex: 46, recentMoodScore: 40 });
    expect(s.kind).toBe('low_energy');
    expect(s.isStrained).toBe(true);
  });
  it('Zorlu mood is mental_strain even with a good passive index', () => {
    expect(resolveDailyState({ balanceIndex: 60, recentMoodScore: 20 }).kind).toBe('mental_strain');
  });
  it('good index and mood stays balanced; no data stays balanced', () => {
    expect(resolveDailyState({ balanceIndex: 72, recentMoodScore: 80 }).kind).toBe('balanced');
    expect(resolveDailyState({ balanceIndex: null, recentMoodScore: null }).kind).toBe('balanced');
  });
  it('replaces the balanced insight on a strained day only', () => {
    const strained = applyDailyStateToInsight(balancedInsight, resolveDailyState({ balanceIndex: 46, recentMoodScore: 40 }));
    expect(strained.title).toBe('Hassas Ritim & Dinlenme İhtiyacı');
    expect(strained.badgeLabel).toBe('Hassas Ritim');
    expect(strained.suggestedAction).not.toMatch(/keyfini/);
    const calm = applyDailyStateToInsight(balancedInsight, resolveDailyState({ balanceIndex: 70, recentMoodScore: 70 }));
    expect(calm).toBe(balancedInsight);
  });
  it('synthesis copy follows the index', () => {
    expect(getSynthesisCopy(46).badge).toBe('Düşük Ritim • Hafif Sapma');
    expect(getSynthesisCopy(64).badge).toBe('Dengeli Davranışsal & Sirkadiyen Ritim');
    expect(getSynthesisCopy(46).text).not.toMatch(/dengeli bir uyum/);
  });
});
