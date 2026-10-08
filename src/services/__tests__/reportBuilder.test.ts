import { describe, it, expect } from 'vitest';
import { buildDoctorReportText, isNotable, ReportMetricStat } from '../reportBuilder';
import { METRIC_REFERENCES, getKnownCitations, getMetricCitations } from '../../engine/metricReferences';

function stat(over: Partial<ReportMetricStat>): ReportMetricStat {
  return {
    key: 'typing_wpm',
    label: 'Yazım Hızı',
    unit: 'WPM',
    category: 'typing',
    hasData: true,
    baselineMean: 40,
    periodAvg: 52,
    deviationPercent: 30,
    zScore: 2.1,
    unavailableReason: '',
    ...over,
  };
}

const base = {
  patientName: 'Test Kişi',
  rangeDays: 14,
  generatedAt: new Date('2026-10-08T10:00:00Z'),
  baselineStatus: 'Stabil baz hattı aktif (16 gün)',
};

describe('metric references', () => {
  it('only uses citations that exist in the phenotype rule config', () => {
    const known = getKnownCitations();
    for (const [key, ref] of Object.entries(METRIC_REFERENCES)) {
      for (const c of ref!.citations) {
        expect(known.has(c), `${key} -> ${c}`).toBe(true);
      }
    }
  });

  it('returns no citations for metrics without a matching rule', () => {
    expect(getMetricCitations('battery_level')).toEqual([]);
  });
});

describe('buildDoctorReportText', () => {
  it('flags notable changes and numbers references in the bibliography', () => {
    const text = buildDoctorReportText({
      ...base,
      stats: [
        stat({}),
        stat({ key: 'night_usage_minutes', label: 'Gece Kullanımı', unit: 'dk', category: 'session', baselineMean: 5, periodAvg: 5.2, deviationPercent: 4, zScore: 0.1 }),
        stat({ key: 'battery_level', label: 'Pil', unit: '%', category: 'battery', hasData: false, baselineMean: null, periodAvg: null, deviationPercent: null, zScore: null, unavailableReason: 'Pil telemetrisi yok' }),
      ],
    });

    expect(text).toContain('2) ÖNE ÇIKAN DEĞİŞİMLER');
    // notable section lists only the large change
    const notableSection = text.split('2) ÖNE ÇIKAN DEĞİŞİMLER')[1].split('3) ÖLÇÜMLER')[0];
    expect(notableSection).toContain('Yazım Hızı');
    expect(notableSection).not.toContain('Gece Kullanımı');
    // references resolve
    expect(text).toContain('[1] Moon et al., 2025');
    expect(text).toContain('[2] Short et al., 2025');
    expect(text).toContain('[3] Lee et al., 2025');
    // missing metric is explained, not invented
    expect(text).toContain('4) VERİ ALINAMAYAN GÖSTERGELER');
    expect(text).toContain('Pil telemetrisi yok');
    expect(text).toContain('YÖNTEM VE YASAL UYARI');
  });

  it('states clearly when no metric has an academic reference', () => {
    const text = buildDoctorReportText({
      ...base,
      stats: [stat({ key: 'battery_level', label: 'Pil', unit: '%', category: 'battery' })],
    });
    expect(text).toContain('hiçbiri için sistemde tanımlı bir akademik kaynak eşlemesi yok');
  });

  it('includes pinned insights with their sources', () => {
    const text = buildDoctorReportText({
      ...base,
      stats: [stat({})],
      pinnedInsights: [{ title: 'Bilişsel İcra', body: 'Gövde', sources: ['Boyle et al. (2025)'], addedAt: 1 }],
    });
    expect(text).toContain('6) NOTLAR VE EKLENEN İÇGÖRÜLER');
    expect(text).toContain('Bilişsel İcra: Gövde');
    expect(text).toContain('Kaynak: Boyle et al. (2025)');
  });

  it('isNotable respects both z-score and percent thresholds', () => {
    expect(isNotable(stat({ zScore: 1.6, deviationPercent: 5 }))).toBe(true);
    expect(isNotable(stat({ zScore: 0.2, deviationPercent: 25 }))).toBe(true);
    expect(isNotable(stat({ zScore: 0.2, deviationPercent: 5 }))).toBe(false);
    expect(isNotable(stat({ hasData: false }))).toBe(false);
  });
});
