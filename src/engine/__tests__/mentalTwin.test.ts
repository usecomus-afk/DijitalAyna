import { describe, it, expect } from 'vitest';
import {
  calculateRecentMoodScore,
  calculateEmotionalBalanceIndex,
  deriveAvatarScore,
  generateAvatarNarrative,
  sanitizeAgainstTranquilityWhenDistressed,
} from '../avatarNarrative';
import { MoodReport } from '../../types/engine';

describe('Digital Mental Twin - EMA Integration & Clinical Narrative Engine', () => {
  const now = new Date('2026-09-19T12:00:00Z').getTime();

  const mockZorluReports: MoodReport[] = [
    {
      id: 1,
      date: '2026-09-10',
      timestamp: new Date('2026-09-10T10:00:00Z').getTime(),
      score: 1, // Zorlu
      tags: ['İş', 'Zihinsel Yük', 'Yorgunluk'],
    },
    {
      id: 2,
      date: '2026-09-11',
      timestamp: new Date('2026-09-11T11:00:00Z').getTime(),
      score: 1,
      tags: ['İş', 'Sosyal'],
    },
    {
      id: 3,
      date: '2026-09-12',
      timestamp: new Date('2026-09-12T09:30:00Z').getTime(),
      score: 1,
      tags: ['Zihinsel Yük', 'Uyku'],
    },
    {
      id: 4,
      date: '2026-09-14',
      timestamp: new Date('2026-09-14T14:00:00Z').getTime(),
      score: 1,
      tags: ['İş', 'Yorgunluk'],
    },
    {
      id: 5,
      date: '2026-09-18', // within 48 hours
      timestamp: new Date('2026-09-18T08:00:00Z').getTime(),
      score: 1,
      tags: ['İş', 'Zihinsel Yük'],
    },
    {
      id: 6,
      date: '2026-09-18', // within 48 hours
      timestamp: new Date('2026-09-18T18:00:00Z').getTime(),
      score: 1,
      tags: ['Yorgunluk', 'Uyku'],
    },
    {
      id: 7,
      date: '2026-09-19', // within 48 hours
      timestamp: new Date('2026-09-19T09:00:00Z').getTime(),
      score: 1,
      tags: ['Zihinsel Yük', 'İş'],
    },
    {
      id: 8,
      date: '2026-09-19', // within 48 hours
      timestamp: new Date('2026-09-19T11:30:00Z').getTime(),
      score: 1,
      tags: ['İş', 'Yorgunluk', 'Sosyal'],
    },
  ];

  it('correctly maps 8 consecutive Zorlu reports to an EMA score of 20 with extracted top tags', () => {
    const result = calculateRecentMoodScore(mockZorluReports, now);

    expect(result.score).toBe(20);
    expect(result.reportCount).toBeGreaterThanOrEqual(4);
    expect(result.topTags).toContain('İş');
    expect(result.topTags).toContain('Zihinsel Yük');
    expect(result.topTags).toContain('Yorgunluk');
  });

  it('applies 2x weighting to entries within last 48 hours vs 1x for older entries', () => {
    const mixedReports: MoodReport[] = [
      {
        id: 1,
        date: '2026-09-15',
        timestamp: now - 4 * 24 * 60 * 60 * 1000, // 4 days ago -> weight 1.0
        score: 3, // 60 points
        tags: [],
      },
      {
        id: 2,
        date: '2026-09-19',
        timestamp: now - 10 * 60 * 60 * 1000, // 10h ago -> weight 2.0
        score: 1, // 20 points
        tags: [],
      },
    ];

    // (1 * 60 + 2 * 20) / (1 + 2) = 100 / 3 = 33.3
    const result = calculateRecentMoodScore(mixedReports, now);
    expect(result.score).toBe(33.3);
  });

  it('guarantees hybrid emotional balance index is in the 20-30 band during cold start with 8 Zorlu reports', () => {
    const { score: recentMoodScore } = calculateRecentMoodScore(mockZorluReports, now);
    expect(recentMoodScore).toBe(20);

    // Uncalibrated passive baseline defaults to 70 or 75
    const uncalibratedPassive = 75;
    const isEstablished = false;

    const balanceIndex = calculateEmotionalBalanceIndex({
      recentMoodScore,
      passiveScore: uncalibratedPassive,
      isEstablished,
    });

    // 0.75 * 20 + 0.25 * min(75, 35) = 15 + 8.75 = 23.75 -> 24
    expect(balanceIndex).toBe(24);
    expect(balanceIndex).toBeGreaterThanOrEqual(20);
    expect(balanceIndex).toBeLessThanOrEqual(30);
    expect(balanceIndex).not.toBe(70);
  });

  it('derives avatar score 1 (Zorlu) when balance index is in 20-30 band', () => {
    const score = deriveAvatarScore(24, 20, false);
    expect(score).toBe(1);
  });

  it('generates compassionate clinical narrative with tags, user name, and strictly NO contradictory tranquil words', () => {
    const { score: recentMoodScore, topTags } = calculateRecentMoodScore(mockZorluReports, now);
    const balanceIndex = calculateEmotionalBalanceIndex({
      recentMoodScore,
      passiveScore: 75,
      isEstablished: false,
    });
    const derivedScore = deriveAvatarScore(balanceIndex, recentMoodScore, false);

    const narrative = generateAvatarNarrative({
      userName: 'Anıl',
      score: derivedScore,
      affectiveIndex: balanceIndex,
      isEstablished: false,
      effectiveDays: 6,
      topTags,
      recentMoodScore,
    });

    expect(narrative.title).toBe('Zorlu & Yoğun Yük');
    expect(narrative.subtitle).toBe('Yüksek Zihinsel Yük • Zorlanma Eğilimi');
    expect(narrative.energyText).toBe('%24 Duygusal Denge (Düşük)');
    expect(narrative.dialogue).toContain('Anıl');
    expect(narrative.dialogue).toContain('Zorlu');
    expect(narrative.dialogue).toContain('İş');
    expect(narrative.dialogue).toContain('(6/14 Gün)');

    // Strictly forbidden words when in distress
    expect(narrative.dialogue).not.toMatch(/dingin/i);
    expect(narrative.dialogue).not.toMatch(/dengeli bir akıştayız/i);
    expect(narrative.dialogue).not.toMatch(/sakin adımlarla devam edebilirsin/i);

    // Learning card text (Kural E)
    expect(narrative.learningCardText).toBe(
      'Kişisel sensör baz hattınız oluşturuluyor (%43 tamamlandı). Ancak anlık zihin yansımanız, girdiğiniz aktif ruh hali kayıtlarına göre anında güncellenmektedir.'
    );
  });

  it('sanitizes any tranquil expressions programmatically when score is distressed (1 or 2)', () => {
    const rawContradictory = 'Şu an dingin ve dengeli bir akıştayız Anıl. Rutinine sakin adımlarla devam edebilirsin.';
    const sanitized = sanitizeAgainstTranquilityWhenDistressed(rawContradictory, 1, 24);

    expect(sanitized).not.toContain('dingin ve dengeli bir akıştayız');
    expect(sanitized).not.toContain('sakin adımlarla devam edebilirsin');
    expect(sanitized).toContain('şu an zorlu bir dönemden geçiyoruz');
  });
});
