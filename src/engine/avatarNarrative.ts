import { MoodReport } from '../types/engine';

export const MOOD_SCORE_MAP: Record<number, number> = {
  1: 20,  // Zorlu
  2: 40,  // Düşük
  3: 60,  // Normal
  4: 80,  // İyi
  5: 100, // Harika
};

export interface RecentMoodScoreResult {
  score: number | null;
  topTags: string[];
  reportCount: number;
}

/**
 * Calculates recency-weighted EMA score (last 48h = 2.0x, last 7d = 1.0x)
 * and extracts top tags.
 */
export function calculateRecentMoodScore(
  reports: MoodReport[],
  now: number = Date.now()
): RecentMoodScoreResult {
  if (!reports || reports.length === 0) {
    return { score: null, topTags: [], reportCount: 0 };
  }

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

  // Filter last 7 days; if none fall within 7 days, use the most recent reports (up to 8)
  let relevantReports = reports.filter((r) => r.timestamp >= now - SEVEN_DAYS_MS);
  if (relevantReports.length === 0) {
    relevantReports = [...reports].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
  }

  if (relevantReports.length === 0) {
    return { score: null, topTags: [], reportCount: 0 };
  }

  let totalWeight = 0;
  let weightedScoreSum = 0;
  const tagCounts: Record<string, number> = {};

  for (const report of relevantReports) {
    const ageMs = Math.max(0, now - report.timestamp);
    const weight = ageMs <= FORTY_EIGHT_HOURS_MS ? 2.0 : 1.0;

    const clampedScore = Math.max(1, Math.min(5, Math.round(report.score || 3)));
    const mappedPoint = MOOD_SCORE_MAP[clampedScore] ?? 60;

    weightedScoreSum += mappedPoint * weight;
    totalWeight += weight;

    if (Array.isArray(report.tags)) {
      for (const tag of report.tags) {
        if (tag && typeof tag === 'string') {
          const cleanTag = tag.trim();
          if (cleanTag) {
            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
          }
        }
      }
    }
  }

  const calculatedScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 60;

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  return {
    score: Math.round(calculatedScore * 10) / 10,
    topTags,
    reportCount: relevantReports.length,
  };
}

export interface BalanceIndexOptions {
  recentMoodScore: number | null;
  passiveScore: number;
  isEstablished: boolean;
}

/**
 * Calculates hybrid emotional balance index.
 * During learning (!isEstablished):
 * 75% active EMA + 25% passive score.
 * If user reported "Zorlu" (score <= 35), uncalibrated passive score is anchored
 * so the index stays strictly within the 20-30 band (never misleadingly 70).
 * Once established:
 * 50% active EMA + 50% passive score.
 */
export function calculateEmotionalBalanceIndex({
  recentMoodScore,
  passiveScore,
  isEstablished,
}: BalanceIndexOptions): number {
  if (recentMoodScore === null) {
    return Math.round(isEstablished ? passiveScore : 70);
  }

  if (!isEstablished) {
    // When baseline is not established, passive score uses uncalibrated defaults (~70-75).
    // If user EMA indicates distress, cap the passive score at (recentMoodScore + 15)
    // so that: 0.75 * 20 + 0.25 * 35 = 15 + 8.75 = 23.75 ~ 24 (strictly in 20-30 band).
    const effectivePassive =
      recentMoodScore <= 35
        ? Math.min(passiveScore, recentMoodScore + 15)
        : passiveScore;

    const hybrid = 0.75 * recentMoodScore + 0.25 * effectivePassive;
    return Math.max(1, Math.min(100, Math.round(hybrid)));
  } else {
    const hybrid = 0.5 * recentMoodScore + 0.5 * passiveScore;
    return Math.max(1, Math.min(100, Math.round(hybrid)));
  }
}

/**
 * Derives avatar discrete score (1..5) from affective balance index and recent EMA.
 */
export function deriveAvatarScore(
  affectiveIndex: number,
  recentMoodScore: number | null = null,
  isEstablished: boolean = false
): 1 | 2 | 3 | 4 | 5 {
  if (!isEstablished && recentMoodScore !== null) {
    if (recentMoodScore <= 30) return 1;
    if (recentMoodScore <= 50) return 2;
    if (recentMoodScore <= 70) return 3;
    if (recentMoodScore <= 88) return 4;
    return 5;
  }

  if (affectiveIndex <= 35) return 1;
  if (affectiveIndex <= 55) return 2;
  if (affectiveIndex <= 74) return 3;
  if (affectiveIndex <= 88) return 4;
  return 5;
}

/**
 * Programmatic safeguard: strictly prevents tranquil/placid phrases when user is distressed.
 */
export function sanitizeAgainstTranquilityWhenDistressed(
  text: string,
  score: number,
  index: number
): string {
  if (score <= 2 || index < 40) {
    return text
      .replace(/dingin ve dengeli bir akıştayız/gi, 'şu an zorlu bir dönemden geçiyoruz')
      .replace(/dingin/gi, 'dinlenme odaklı')
      .replace(/dengeli/gi, 'hassas')
      .replace(/sakin adımlarla devam edebilirsin/gi, 'kendine şefkat göstermeli ve dinlenmelisin')
      .replace(/rutinine sakin adımlarla/gi, 'kendini dinleyerek');
  }
  return text;
}

export interface AvatarNarrativeOptions {
  userName: string;
  score: 1 | 2 | 3 | 4 | 5;
  affectiveIndex: number;
  isEstablished: boolean;
  effectiveDays: number;
  topTags: string[];
  recentMoodScore: number | null;
}

export interface AvatarNarrativeResult {
  title: string;
  subtitle: string;
  badgeClass: string;
  auraGradient: string;
  glowColor: string;
  bgBase: string;
  dialogue: string;
  mirrorText: string;
  energyText: string;
  moodPill: { text: string; color: string };
  colorClass: string;
  learningCardText: string;
}

export function generateAvatarNarrative({
  userName,
  score,
  affectiveIndex,
  isEstablished,
  effectiveDays,
  topTags,
  recentMoodScore: _recentMoodScore,
}: AvatarNarrativeOptions): AvatarNarrativeResult {
  const safeName = userName || 'Kullanıcı';
  const tagListText = topTags.length > 0 ? topTags.join(', ') : '';
  const percentComplete = Math.min(100, Math.round((effectiveDays / 14) * 100));

  const learningCardText = isEstablished
    ? 'Kişisel sensör baz hattınız aktif; 15 mikro-biyobelirteç baz hattı ile otomatik analiz edildi.'
    : `Kişisel sensör baz hattınız oluşturuluyor (%${percentComplete} tamamlandı). Ancak anlık zihin yansımanız, girdiğiniz aktif ruh hali kayıtlarına göre anında güncellenmektedir.`;

  let title = 'Normal & Dengeli';
  let subtitle = 'Normal Durum • Ritim Stabil';
  let badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-300';
  let auraGradient = 'from-cyan-500/20 via-indigo-500/15 to-blue-900/20';
  let glowColor = '#6366f1';
  let bgBase = 'bg-gradient-to-b from-indigo-950/20 to-slate-900/30';
  let dialogue = '';
  let mirrorText = '';
  let energyText = `%${affectiveIndex} Duygusal Denge`;
  let moodPill = {
    text: `Öğrenme Dönemi (${effectiveDays}/14 Gün)`,
    color: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40',
  };
  let colorClass = 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]';

  switch (score) {
    case 1: {
      title = 'Zorlu & Yoğun Yük';
      subtitle = 'Yüksek Zihinsel Yük • Zorlanma Eğilimi';
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      auraGradient = 'from-rose-500/25 via-purple-600/20 to-slate-900/30';
      glowColor = '#f43f5e';
      bgBase = 'bg-gradient-to-b from-rose-950/20 to-purple-950/30';
      colorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]';
      energyText = `%${affectiveIndex} Duygusal Denge (Düşük)`;
      moodPill = {
        text: 'Zorlu Ritim • Yüksek Yük',
        color: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
      };

      if (!isEstablished) {
        const tagClause = tagListText
          ? ` Özellikle ${tagListText} etiketleri yoğun bir baskıya işaret ediyor.`
          : '';
        dialogue = `Son dönemdeki bildirimlerinde kendini sıklıkla 'Zorlu' hissettiğini belirttin ${safeName}.${tagClause} Sensör baz hattın henüz öğrenme aşamasında (${effectiveDays}/14 Gün) olsa da, dijital aynan şu an zihninin ve bedeninin dinlenmeye ihtiyaç duyduğunu yansıtıyor. Kendini zorlama; bir fincan su alıp derin bir nefesle duraklamaya ne dersin?`;
        mirrorText = `${safeName}, aktif ruh hali kayıtların son günlerde yüksek bir zihinsel yük altında olduğunu gösteriyor. Dijital ikizin bu sinyali doğrulayarak dinlenmeni öneriyor.`;
      } else {
        const tagClause = tagListText
          ? ` Özellikle ${tagListText} ve sensör hareketlilik sinyallerin`
          : ' Sensör ve hareketlilik sinyallerin';
        dialogue = `${safeName}, zihnim bugün oldukça ağır ve yorgun.${tagClause} yoğun bir zihinsel yük altında olduğunu gösteriyor. Kendini zorlama; bir fincan su alıp derin bir nefesle duraklamaya ne dersin?`;
        mirrorText = `${safeName}, son günlerde bilişsel tepki süresi ve sirkadiyen dinlenme ritminde belirgin dalgalanmalar saptandı. Zihinsel bir yorgunluk hissediyor olabilir misin?`;
      }
      break;
    }

    case 2: {
      title = 'Düşük & Dalgalı Ritim';
      subtitle = 'Düşük Ritim • Hafif Sapma';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      auraGradient = 'from-amber-500/20 via-orange-600/15 to-slate-800/30';
      glowColor = '#f59e0b';
      bgBase = 'bg-gradient-to-b from-amber-950/20 to-slate-900/30';
      colorClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]';
      energyText = `%${affectiveIndex} Duygusal Denge (Hassas)`;
      moodPill = {
        text: 'Düşük Hareketlilik & Ritim',
        color: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
      };

      const tagClause = tagListText ? ` (${tagListText})` : '';
      if (!isEstablished) {
        dialogue = `Bugün tempomuz biraz düşük ${safeName}${tagClause}. Sensör baz hattın öğrenilmeye devam ederken (${effectiveDays}/14 Gün), bildirdiğin hissiyatlar enerjinin azaldığını gösteriyor. Kendine küçük bir mola ayırabilirsin.`;
        mirrorText = `${safeName}, son günlerdeki hissiyat bildirimlerin ve düşük hareketlilik hafif bir durgunluğa işaret ediyor.`;
      } else {
        dialogue = `Bugün tempomuz biraz düşük ${safeName}${tagClause}. Klavyedeki yazım akışın ve hareketliliğin içe çekildiğimizi hissettiriyor. Her gün yüzde yüz performansla koşmak zorunda değiliz; bugün dinlenme günü olsun.`;
        mirrorText = `${safeName}, hareketlilik ve etkileşim frekansın olağan baz hattının altında seyrediyor. Kendine küçük bir mola ayırmayı düşünebilirsin.`;
      }
      break;
    }

    case 3: {
      title = 'Normal & Dengeli';
      subtitle = 'Normal Durum • Ritim Stabil';
      badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-300';
      auraGradient = 'from-cyan-500/20 via-indigo-500/15 to-blue-900/20';
      glowColor = '#6366f1';
      bgBase = 'bg-gradient-to-b from-indigo-950/20 to-slate-900/30';
      colorClass = 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]';
      energyText = `%${affectiveIndex} Duygusal Denge (Dengeli)`;
      moodPill = isEstablished
        ? { text: 'Dengeli Ritim', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
        : { text: `Öğrenme Dönemi (${effectiveDays}/14 Gün)`, color: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40' };

      if (!isEstablished) {
        dialogue = `Merhaba ${safeName}! Kişisel baz hattın oluşturulurken (${effectiveDays}/14 Gün) hissiyatın ve sensör verilerin dengeli bir akışta seyrediyor.`;
        mirrorText = `Merhaba ${safeName}! DutyDijitalAyna şu anda cihazındaki günlük yazım akıcılığı, hareketlilik ve ekran ritmi verilerinle kişisel baz hattını öğreniyor (${effectiveDays}/14 Gün).`;
      } else {
        dialogue = `Şu an dingin ve dengeli bir akıştayız ${safeName}. Sensör dinamiklerin standart kişisel baz hattınla uyumlu. Rutinine sakin adımlarla devam edebilirsin.`;
        mirrorText = `${safeName}, cihaz içi biyobelirteçlerin referans aralığında. Dijital ikizin stabil durumda.`;
      }
      break;
    }

    case 4: {
      title = 'İyi & Canlı';
      subtitle = 'İyi Durum • Akıcı Ritim';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      auraGradient = 'from-emerald-500/25 via-teal-500/20 to-cyan-900/20';
      glowColor = '#10b981';
      bgBase = 'bg-gradient-to-b from-emerald-950/20 to-slate-900/30';
      colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]';
      energyText = `%${affectiveIndex} Duygusal Denge (Pozitif)`;
      moodPill = { text: 'Canlı & Pozitif', color: 'bg-teal-500/20 text-teal-200 border-teal-500/40' };

      dialogue = `Yüzüm gülüyor ${safeName}! Yazım tempon akıcı, günlük hareketliliğin canlı. Zihinsel enerjimizin bu pozitif dalgasını güzel hedeflere dönüştürebilirsin.`;
      mirrorText = `${safeName}, tuş akıcılığın ve sirkadiyen düzenin güçlü bir denge gösteriyor.`;
      break;
    }

    case 5:
    default: {
      title = 'Harika & Işıltılı';
      subtitle = 'Harika Durum • Zirve Enerji';
      badgeClass = 'bg-amber-100 text-amber-900 border-amber-400';
      auraGradient = 'from-amber-400/30 via-comus-copper/25 to-rose-500/20';
      glowColor = '#f59e0b';
      bgBase = 'bg-gradient-to-b from-amber-950/25 to-comus-navy/40';
      colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]';
      energyText = `%${affectiveIndex} Duygusal Denge (Yüksek)`;
      moodPill = { text: 'Yüksek Enerji', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };

      dialogue = `Işıl ışıl bir zihin durumundayız ${safeName}! Zihinsel berraklığımız ve motivasyonumuz zirvede. Bu neşeli ve ilham verici enerjinin tadını çıkar!`;
      mirrorText = `${safeName}, tüm biyobelirteçler en yüksek dengede. Zihinsel akış ve etkileşim hızın mükemmel.`;
      break;
    }
  }

  // Safety filter against calm words when distressed
  dialogue = sanitizeAgainstTranquilityWhenDistressed(dialogue, score, affectiveIndex);
  mirrorText = sanitizeAgainstTranquilityWhenDistressed(mirrorText, score, affectiveIndex);

  return {
    title,
    subtitle,
    badgeClass,
    auraGradient,
    glowColor,
    bgBase,
    dialogue,
    mirrorText,
    energyText,
    moodPill,
    colorClass,
    learningCardText,
  };
}
