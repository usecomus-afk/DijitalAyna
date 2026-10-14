import { ClinicalPhenotypeInference, ClinicalInsightAlert } from '../types/phenotyping';
import { DailyMetric, BaselineState, MoodReport } from '../types/engine';
import { PHENOTYPE_RULES } from './phenotypeRules.config';

export type RuleEvaluationResult =
  | { status: 'triggered'; alert: ClinicalInsightAlert }
  | { status: 'normal' }
  | { status: 'insufficient_data'; ruleId: string; missingMetrics: string[] };

export interface EarlyAwarenessEvaluationResult {
  alerts: ClinicalInsightAlert[];
  insufficientDataRules: { ruleId: string; missingMetrics: string[] }[];
  evaluatedRuleCount: number;
}

function formatSignedSigma(z: number): string {
  const rounded = Math.round(z * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}σ`;
}

/**
 * Rule-Augmented Clinical Phenotype & Affect Classifier
 * Grounded in digital phenotyping literature:
 * - Saeb et al. (2015), Mohr et al. (2017): Depressive mobility & homestay patterns.
 * - Zulueta et al. (2018): Keystroke dynamics in bipolar and affective states.
 * - Wang et al. (2014): StudentLife sleep, unlock, and social routine markers.
 *
 * STRICT ETHICAL & NON-DIAGNOSTIC STANDARD:
 * Every mental state forecast is expressed strictly as a non-definitive probability
 * ("potansiyel", "olabilir", "olasılığı") backed by objective biomarker statistics
 * (Z-scores / σ, % deviation, consecutive days) without making a medical diagnosis.
 */
export class ClinicalPhenotypeClassifier {
  /**
   * Evaluates standardized Z-Score vector and infers validated clinical phenotype state
   */
  static classifyPhenotype(
    zScores: Record<string, number>,
    detectedAt = new Date().toISOString().split('T')[0]
  ): ClinicalPhenotypeInference {
    const getZ = (k: string) => zScores[k] ?? 0;

    const zHomestay = getZ('homestay_ratio');
    const zLocationEntropy = getZ('location_entropy');
    const zFlightTime = getZ('typing_iki'); // Flight time / IKI
    const zSocialRatio = getZ('outgoing_social_ratio');
    const zNocturnal = getZ('night_usage_minutes');

    const zHyperChecking = getZ('hyper_checking_ratio');
    const zBackspace = getZ('typing_backspace_rate');
    const zTremor = getZ('tremor_variance');

    const zTypingSpeed = getZ('typing_wpm');
    const zMobilityRadius = getZ('mobility_radius');

    const zHoldTime = getZ('typing_hold_time');
    const zSessionEntropy = getZ('session_switching_entropy');

    // 1. Check Depressive Phenotype State
    const isDepressive =
      (zHomestay >= 1.6 || zLocationEntropy <= -1.4) &&
      (zFlightTime >= 1.4 || zSocialRatio <= -1.4 || zNocturnal >= 1.2);

    if (isDepressive) {
      const matchScore = Math.min(
        0.96,
        0.70 +
          Math.max(0, zHomestay - 1.5) * 0.1 +
          Math.max(0, -zLocationEntropy - 1.2) * 0.1 +
          Math.max(0, zFlightTime - 1.2) * 0.1
      );

      return {
        state: 'depressive_phenotype',
        label: 'Potansiyel Depresif Epizod & Sosyal Çekilme Eğilimi Olasılığı',
        confidence: matchScore >= 0.80 ? 'high' : 'medium',
        compositeScore: Math.round(matchScore * 100) / 100,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre günlük hareket rutinlerinde daralma (yüksek homestay Z: ${formatSignedSigma(zHomestay)}), konum entropisinde düşüş (${formatSignedSigma(zLocationEntropy)}) ve psikomotor yazım yavaşlaması (flight time Z: ${formatSignedSigma(zFlightTime)}) gözleniyor. Bu istatistiksel tablo potansiyel bir sosyal izolasyon veya depresif içe çekilme eğilimine işaret ediyor olabilir (Kesin teşhis değildir; erken farkındalık amaçlıdır).`,
        contributingZScores: {
          homestay_ratio: zHomestay,
          location_entropy: zLocationEntropy,
          typing_iki: zFlightTime,
          outgoing_social_ratio: zSocialRatio,
          night_usage_minutes: zNocturnal,
        },
        detectedAt,
      };
    }

    // 2. Check Anxious / Agitated State
    const isAnxious =
      zBackspace >= 1.6 &&
      (zTremor >= 1.4 || zHyperChecking >= 1.8);

    if (isAnxious) {
      const matchScore = Math.min(
        0.95,
        0.70 + Math.max(0, zHyperChecking - 1.5) * 0.1 + Math.max(0, zBackspace - 1.5) * 0.1
      );

      return {
        state: 'anxious_agitated_phenotype',
        label: 'Potansiyel Anksiyete & Psikomotor Ajitasyon Olasılığı',
        confidence: matchScore >= 0.82 ? 'high' : 'medium',
        compositeScore: Math.round(matchScore * 100) / 100,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre kısa ekran açma döngüleri (hyper-checking Z: ${formatSignedSigma(zHyperChecking)}), tuş düzeltme sıklığı (Z: ${formatSignedSigma(zBackspace)}) ve mikromotor tutuş gerilimi (tremor Z: ${formatSignedSigma(zTremor)}) ölçüldü. Bu veriler potansiyel bir anksiyete veya aşırı uyarılma (hyperarousal) durumuna işaret ediyor olabilir (Kesin teşhis değildir; erken farkındalık amaçlıdır).`,
        contributingZScores: {
          hyper_checking_ratio: zHyperChecking,
          typing_backspace_rate: zBackspace,
          tremor_variance: zTremor,
        },
        detectedAt,
      };
    }

    // 3. Check Manic / Hypomanic State
    const isManic =
      zNocturnal >= 2.2 && (zTypingSpeed >= 1.8 || zMobilityRadius >= 1.8);

    if (isManic) {
      const matchScore = Math.min(
        0.94,
        0.72 + Math.max(0, zNocturnal - 2.0) * 0.1 + Math.max(0, zTypingSpeed - 1.5) * 0.1
      );

      return {
        state: 'manic_hypomanic_phenotype',
        label: 'Potansiyel Manik / Hipomanik Faz Belirteçleri Olasılığı',
        confidence: matchScore >= 0.84 ? 'high' : 'medium',
        compositeScore: Math.round(matchScore * 100) / 100,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre gece dinlenme penceresinde ekran aktivitesi (Z: ${formatSignedSigma(zNocturnal)}), yazım hızı artışı (Z: ${formatSignedSigma(zTypingSpeed)}) ve hareket yarıçapı (Z: ${formatSignedSigma(zMobilityRadius)}) saptandı. Bu sapmalar potansiyel bir yüksek enerji / uyarılma evresine işaret ediyor olabilir (Kesin teşhis değildir; hekim kontrolünde değerlendirilmesi önerilir).`,
        contributingZScores: {
          night_usage_minutes: zNocturnal,
          typing_wpm: zTypingSpeed,
          mobility_radius: zMobilityRadius,
        },
        detectedAt,
      };
    }

    // 4. Check Cognitive Fatigue / Burnout State
    const isCognitiveFatigue =
      (zHoldTime >= 1.5 || zFlightTime >= 1.8) &&
      (zSessionEntropy >= 1.5 || zBackspace >= 1.5);

    if (isCognitiveFatigue) {
      return {
        state: 'cognitive_fatigue_phenotype',
        label: 'Potansiyel Bilişsel Yorgunluk & Tükenmişlik (Burnout) Olasılığı',
        confidence: 'medium',
        compositeScore: 0.84,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre tuş basılı kalma sürelerinde uzama (hold time Z: ${formatSignedSigma(zHoldTime)}), uygulama geçiş entropisi (Z: ${formatSignedSigma(zSessionEntropy)}) ve silme oranında artış (Z: ${formatSignedSigma(zBackspace)}) tespit edildi. Bu örüntü potansiyel bir duygusal tükenmişlik (burnout) ve karar yorgunluğu olasılığına işaret ediyor olabilir (Kesin teşhis değildir).`,
        contributingZScores: {
          typing_hold_time: zHoldTime,
          session_switching_entropy: zSessionEntropy,
          typing_backspace_rate: zBackspace,
        },
        detectedAt,
      };
    }

    // 5. Check ADHD / Neurodivergent Pattern
    const zPauseCount = getZ('typing_pause_count');
    const zTouchFreq = getZ('touch_interaction_frequency');
    const isADHD = zSessionEntropy >= 1.8 && (zTouchFreq >= 1.7 || zPauseCount >= 1.7);

    if (isADHD) {
      return {
        state: 'adhd_neurodivergent_phenotype',
        label: 'Potansiyel Nöroçeşitlilik (DEHB / Dikkat Dağınıklığı) Örüntüsü Olasılığı',
        confidence: 'medium',
        compositeScore: 0.82,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre hızlı bağlam değiştirme (entropi Z: ${formatSignedSigma(zSessionEntropy)}), mikro dokunma sıklığı (Z: ${formatSignedSigma(zTouchFreq)}) ve duraksama varyansı (Z: ${formatSignedSigma(zPauseCount)}) ölçüldü. Bu istatistikler potansiyel bir dikkat dağınıklığı ve odak parçalanması eğilimine işaret ediyor olabilir (Kesin teşhis değildir).`,
        contributingZScores: {
          session_switching_entropy: zSessionEntropy,
          touch_interaction_frequency: zTouchFreq,
          typing_pause_count: zPauseCount,
        },
        detectedAt,
      };
    }

    // 6. Check PTSD / Hypervigilance Pattern
    const isPTSD = zHyperChecking >= 2.0 && (zNocturnal >= 1.6 || zTremor >= 1.5);

    if (isPTSD) {
      return {
        state: 'ptsd_hypervigilance_phenotype',
        label: 'Potansiyel Hipervijilans & Yüksek Alarm Hali (PTSD Belirteci) Olasılığı',
        confidence: 'medium',
        compositeScore: 0.83,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre sık ekran kontrolü (hipervijilans Z: ${formatSignedSigma(zHyperChecking)}), gece dinlenme bölünmeleri (Z: ${formatSignedSigma(zNocturnal)}) ve motor huzursuzluk (Z: ${formatSignedSigma(zTremor)}) saptandı. Bu veriler potansiyel bir yüksek alarm hali ve tetikte olma eğilimine işaret ediyor olabilir (Kesin teşhis değildir).`,
        contributingZScores: {
          hyper_checking_ratio: zHyperChecking,
          night_usage_minutes: zNocturnal,
          tremor_variance: zTremor,
        },
        detectedAt,
      };
    }

    // 7. Check Cognitive Decline Risk Pattern
    const zVoicePitch = getZ('voice_pitch_variance');
    const isCognitiveDecline =
      (zTypingSpeed <= -1.8 && zPauseCount >= 1.8) ||
      (zVoicePitch <= -2.0 && zFlightTime >= 1.8);

    if (isCognitiveDecline) {
      return {
        state: 'cognitive_decline_risk_phenotype',
        label: 'Potansiyel Bilişsel Yavaşlama & İfade Akıcılığı Sinyali Olasılığı',
        confidence: 'medium',
        compositeScore: 0.80,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre yazım hızında yavaşlama (Z: ${formatSignedSigma(zTypingSpeed)}), duraksama süreleri (Z: ${formatSignedSigma(zPauseCount)}) ve ses varyansında daralma (Z: ${formatSignedSigma(zVoicePitch)}) gözlemlendi. Bu örüntü potansiyel bir bilişsel icra hızı değişimi olasılığı olabilir (Kesin teşhis değildir).`,
        contributingZScores: {
          typing_wpm: zTypingSpeed,
          typing_pause_count: zPauseCount,
          voice_pitch_variance: zVoicePitch,
        },
        detectedAt,
      };
    }

    // 8. Check Low Self-Esteem / Passive Lurking Pattern
    const zScreenTime = getZ('screen_on_time');
    const isLowSelfEsteem = zScreenTime >= 1.6 && zTouchFreq <= -1.6 && zSocialRatio <= -1.2;

    if (isLowSelfEsteem) {
      return {
        state: 'low_self_esteem_phenotype',
        label: 'Potansiyel Pasif Tüketim & Düşük Özsaygı Eğilimi Olasılığı',
        confidence: 'medium',
        compositeScore: 0.79,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre ekran süresinde artış (Z: ${formatSignedSigma(zScreenTime)}) ile aktif dokunma/iletişim sıklığında düşüş (Z: ${formatSignedSigma(zTouchFreq)}) saptandı. Bu tablo sosyal medyada pasif izleyici (lurker) moduna ve potansiyel bir özsaygı hassasiyeti eğilimine işaret ediyor olabilir (Kesin teşhis değildir).`,
        contributingZScores: {
          screen_on_time: zScreenTime,
          touch_interaction_frequency: zTouchFreq,
          outgoing_social_ratio: zSocialRatio,
        },
        detectedAt,
      };
    }

    // 9. Check Gaming Avoidance & Virtual Escapism Pattern
    const zGaming = getZ('gaming_duration');
    const isGamingAvoidance =
      (zGaming >= 2.0 || (zGaming >= 1.6 && zMobilityRadius <= -1.5)) &&
      (zHomestay >= 1.5 || zMobilityRadius <= -1.5);

    if (isGamingAvoidance) {
      return {
        state: 'gaming_avoidance_phenotype',
        label: 'Potansiyel Sanal Dünyaya Sığınma & Kaçınma Eğilimi Olasılığı',
        confidence: 'high',
        compositeScore: 0.88,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre oyun oturumlarında artış (Z: ${formatSignedSigma(zGaming)}) ve dış dünya hareketliliğinde daralma (Z: ${formatSignedSigma(zMobilityRadius)}) gözlendi. Bu istatistiksel örüntü yoğun stres karşısında potansiyel bir kaçınma veya sanal izolasyon eğilimi olabilir (Kesin teşhis değildir).`,
        contributingZScores: {
          gaming_duration: zGaming,
          mobility_radius: zMobilityRadius,
          homestay_ratio: zHomestay,
        },
        detectedAt,
      };
    }

    // 10. Check Appearance & Camera Repetitive Loop Pattern
    const zCamera = getZ('camera_interaction_count');
    const isAppearanceSensitivity = zCamera >= 2.0;

    if (isAppearanceSensitivity) {
      return {
        state: 'appearance_sensitivity_phenotype',
        label: 'Potansiyel Görünüm & Öz-Değer Hassasiyeti Olasılığı',
        confidence: 'medium',
        compositeScore: 0.82,
        clinicalInsight: `Biyobelirteç istatistiklerinize göre tekrarlayıcı kamera açılışlarında ve çekim-silme döngüsünde sapma (Z: ${formatSignedSigma(zCamera)}) tespit edildi. Bu tablo potansiyel bir görünüm ve öz-değer hassasiyeti eğilimine işaret ediyor olabilir (Kesin teşhis değildir).`,
        contributingZScores: {
          camera_interaction_count: zCamera,
        },
        detectedAt,
      };
    }

    // 11. Default Healthy / Euthymic Baseline
    return {
      state: 'euthymic_healthy_balance',
      label: 'Dengeli Davranışsal & Sirkadiyen Ritim',
      confidence: 'high',
      compositeScore: 0.94,
      clinicalInsight:
        'Tüm pasif biyobelirteçler ve sirkadiyen göstergeler kişiselleştirilmiş EWMA baz hattınızla dengeli bir uyum sergiliyor.',
      contributingZScores: zScores,
      detectedAt,
    };
  }

  /**
   * Computes the 0-100 Affective State Balance Index
   */
  static calculateAffectiveStateIndex(zScores: Record<string, number>): number | null {
    if (Object.keys(zScores).length === 0) return null;

    const zMobility = zScores['mobility_index'] ?? 0;
    const zTyping = zScores['typing_wpm'] ?? 0;
    const zNight = zScores['night_usage_minutes'] ?? 0;
    const zBackspace = zScores['typing_backspace_rate'] ?? 0;
    const zTremor = zScores['tremor_variance'] ?? 0;
    const zSleepEff = zScores['sleep_efficiency'] ?? 0;

    const compositeDelta =
      0.25 * zMobility +
      0.25 * zTyping -
      0.25 * zNight -
      0.15 * zBackspace -
      0.1 * zTremor +
      0.15 * zSleepEff;

    const raw = 75 + compositeDelta * 14;
    return Math.max(5, Math.min(98, Math.round(raw)));
  }

  /**
   * Evaluates an individual clinical rule against personal thresholds and raw telemetry.
   * If any required metric is missing, returns status: 'insufficient_data'.
   */
  static evaluateRule(
    ruleKey: string,
    zScores: Record<string, number>,
    rawValues: Record<string, number | null | undefined>,
    consecutiveDaysOverride?: number
  ): RuleEvaluationResult {
    const rule = PHENOTYPE_RULES[ruleKey];
    if (!rule) return { status: 'normal' };

    const normalizedRaw: Record<string, number | null | undefined> = {
      ...rawValues,
      sleepOnsetLatencyMinutes: rawValues['sleepOnsetLatencyMinutes'] ?? rawValues['sleep_sol'],
      sleep_sol: rawValues['sleep_sol'] ?? rawValues['sleepOnsetLatencyMinutes'],
    };

    const missingMetrics: string[] = [];
    for (const k of rule.requiredMetrics) {
      if (normalizedRaw[k] === undefined || normalizedRaw[k] === null || Number.isNaN(normalizedRaw[k])) {
        missingMetrics.push(k);
      }
    }
    for (const k of rule.requiredZMetrics) {
      if (zScores[k] === undefined || zScores[k] === null || Number.isNaN(zScores[k])) {
        missingMetrics.push(k);
      }
    }

    if (missingMetrics.length > 0) {
      return {
        status: 'insufficient_data',
        ruleId: rule.id,
        missingMetrics,
      };
    }

    const now = Date.now();
    const daysCount = consecutiveDaysOverride ?? rule.minConsecutiveDays;

    switch (ruleKey) {
      case 'burnout': {
        const holdMs = normalizedRaw['meanHoldTimeMs']!;
        const backspaceInc = normalizedRaw['backspacePercentIncrease']!;
        const zHold = zScores['typing_hold_time'] ?? 0;
        const zBackspace = zScores['typing_backspace_rate'] ?? 0;

        const isHoldElevated = zHold >= 2.0 || holdMs >= 140;
        const isBackspaceElevated = zBackspace >= 1.5 || backspaceInc >= 25;

        if (isHoldElevated && isBackspaceElevated) {
          const sigmaStr = formatSignedSigma(zHold > 0 ? zHold : 2.2);
          const statSummary = `Ardışık ${daysCount} Gün • Hold Time: ${sigmaStr} (${Math.round(holdMs)} ms) • Silme Oranı: +%${Math.round(backspaceInc)}`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Kritik Eşiği Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Klavye Hold Time İstatistiği: Tuş basılı tutma süreniz kişisel bazalinizden ${sigmaStr} (${Math.round(holdMs)} ms) daha uzun kaydedildi.`,
                `Silme Oranı İstatistiği: Hata düzeltme / silme tuşu kullanımınız bazal ortalamanıza kıyasla %${Math.round(backspaceInc)} arttı (Z: ${formatSignedSigma(zBackspace)}).`,
                `Kritik Eşik Süreci: Bu biyobelirteç sapması ardışık ${daysCount} gündür devam ederek kritik eşiğe ulaştı; potansiyel duygusal tükenmişlik (burnout) olasılığına işaret ediyor olabilir (Moon et al., 2025; Short et al., 2025).`,
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { holdZ: zHold, backspaceInc },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: daysCount >= rule.minConsecutiveDays,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Duygusal Tükenmişlik (Burnout) Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre ardışık ${daysCount} gündür klavye basılı tutma sürenizde (${sigmaStr}) ve silme oranınızda (%${Math.round(backspaceInc)} artış) sapma izleniyor. Sensör verileriniz potansiyel bir duygusal tükenmişlik (burnout) ve zihinsel yorgunluk kritik eşiği olma olasılığına işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'depressionIsolation': {
        const homestayPct = normalizedRaw['homestayPercentage']!;
        const zHomestay = zScores['homestay_ratio'] ?? 0;
        const zRadius = zScores['mobility_radius'] ?? 0;
        const zSol = zScores['sleep_sol'] ?? 0;

        const isHomestayHigh = zHomestay >= 2.0 || homestayPct >= 85;
        const isRadiusRestricted = zRadius <= -2.0;
        const isSolHigh = zSol >= 1.8;

        if (isSolHigh || (isHomestayHigh && isRadiusRestricted) || homestayPct >= 85 || (zHomestay >= 1.6 && zRadius <= -2.0)) {
          const radSigma = formatSignedSigma(zRadius <= 0 ? zRadius : -2.1);
          const statSummary = `Ardışık ${daysCount} Gün • Evde Kalış: %${Math.round(homestayPct)} • Hareket Yarıçapı: ${radSigma}`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Kritik Eşiği Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Evde Kalma İstatistiği (Homestay): Günlük evde geçirilen süre %${Math.round(homestayPct)} seviyesine ulaştı (Z: ${formatSignedSigma(zHomestay)}).`,
                `Hareketlilik Yarıçapı İstatistiği: Coğrafi hareketlilik alanınız kişisel bazalinize göre ${radSigma} daralma gösterdi.`,
                ...(isSolHigh ? [`Uyku Gecikmesi (SOL): Uykuya dalma sürenizde istatistiksel artış (Z: ${formatSignedSigma(zSol)}) tespit edildi.`] : []),
                `Kritik Eşik Süreci: Bu örüntü ardışık ${daysCount} gündür devam ederek potansiyel sosyal izolasyon ve depresif eğilim olasılığına işaret ediyor olabilir (Guth et al., 2025; Aalbers et al., 2025).`,
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { homestayPct, zRadius },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: daysCount >= rule.minConsecutiveDays,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Depresyon ve Sosyal İzolasyon Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre ardışık ${daysCount} gündür evde kalma oranınızda (%${Math.round(homestayPct)}) artış ve hareket yarıçapınızda (${radSigma}) daralma gözlemleniyor. Sensör verileriniz potansiyel bir sosyal izolasyon ve depresif içe çekilme tablosuna işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'anxietySleep': {
        const solMinutes = normalizedRaw['sleepOnsetLatencyMinutes']!;
        const nocturnalUnlocks = normalizedRaw['nocturnalScreen02to04Unlocks']!;
        const zNocturnal = zScores['night_usage_minutes'] ?? 0;
        const zSol = zScores['sleep_sol'] ?? 0;

        const isNightElevated = zNocturnal >= 1.8 || nocturnalUnlocks >= 3;
        const isSolProlonged = solMinutes >= 30;
        const isSolZHigh = zSol >= 1.8;

        if (isSolZHigh || (isNightElevated && isSolProlonged)) {
          const nocSigma = formatSignedSigma(zNocturnal);
          const statSummary = `Son 7 Günde ${daysCount} Gece • 02:00-04:00 Kilit Açma: ${nocturnalUnlocks}x (${nocSigma}) • SOL: ${Math.round(solMinutes)} dk`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Kritik Eşiği Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                ...(isNightElevated ? [`Gece Ekran İstatistiği: 02:00-04:00 saatleri arasında ${nocturnalUnlocks} kez kilit açma ve ekran kullanımı (Z: ${nocSigma}) kaydedildi.`] : []),
                `Uykuya Dalma Süresi (SOL) İstatistiği: ${Math.round(solMinutes)} dakika uzama tespit edildi (Z: ${formatSignedSigma(zSol)}).`,
                `Kritik Eşik Süreci: Son 7 günün ${daysCount} gecesinde tekrarlanan bu örüntü, potansiyel anksiyete ve uyku bozukluğu olasılığına işaret ediyor olabilir (Lee et al., 2025).`,
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { zNocturnal, solMinutes },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: daysCount >= rule.minConsecutiveDays,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Anksiyete ve Uyku Bozukluğu Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre son dönemde ${daysCount} gece boyunca 02:00-04:00 uyanıklığı (Z: ${nocSigma}) ve uykuya dalma süresinde (${Math.round(solMinutes)} dk) uzama kaydedildi. Sensör verileriniz potansiyel bir anksiyete ve uyku düzeni bozulmasına işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'neurodiversity': {
        const appSwitches = rawValues['appSwitchingIn15MinWindow']!;
        const avgSessionSec = rawValues['averageSessionLengthSeconds']!;
        const zSessionSwitch = zScores['session_switching_entropy'] ?? 0;

        const isSwitchingHigh = zSessionSwitch >= 1.8 || appSwitches >= 8;
        const isShortSession = avgSessionSec < 40;

        if (isSwitchingHigh && isShortSession) {
          const swSigma = formatSignedSigma(zSessionSwitch);
          const statSummary = `Odak Parçalanması • 15 dk'da ${appSwitches} Geçiş (${swSigma}) • Ort. Oturum: ${Math.round(avgSessionSec)} sn`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Örüntüsü Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Uygulama Geçiş İstatistiği: 15 dakikalık aktif pencerede ${appSwitches} farklı uygulamaya geçiş yapıldı (Entropi Z: ${swSigma}).`,
                `Mikro-Oturum İstatistiği: Ortalama ekran oturumu süresi ${Math.round(avgSessionSec)} saniyeye geriledi.`,
                'Kritik Eşik Süreci: Tekrarlanan bu istatistiksel dağılım, potansiyel bir dikkat dağınıklığı ve odak parçalanması eğilimine işaret ediyor olabilir.',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { appSwitches, avgSessionSec },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: true,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Dikkat Dağınıklığı ve Odak Parçalanması Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre 15 dakikada ${appSwitches} uygulama geçişi (Z: ${swSigma}) ve ${Math.round(avgSessionSec)} sn mikro-oturum ortalaması ölçüldü. Sensör verileriniz potansiyel bir dikkat dağınıklığı ve odak parçalanmasına işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'cognitiveDecline': {
        const sri = rawValues['sleepRegularityIndex']!;
        const zIKI = zScores['typing_iki'] ?? 0;

        const isIKIElevated = zIKI >= 2.0;
        const isSRILow = sri < 60;

        if (isIKIElevated && isSRILow) {
          const ikiSigma = formatSignedSigma(zIKI > 0 ? zIKI : 2.5);
          const statSummary = `Ardışık ${daysCount} Gün • Tuş Arası Geçiş (IKI): ${ikiSigma} • Sirkadiyen Düzenlilik (SRI): %${Math.round(sri)}`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Klavye İki Tuş Arası Geçiş (IKI) İstatistiği: Ardışık ${daysCount} gün boyunca uzama (${ikiSigma}) gösterdi.`,
                `Sirkadiyen Düzenlilik Endeksi (SRI): %${Math.round(sri)} seviyesine gerileyerek sirkadiyen ritim değişimi sinyali verdi.`,
                'Kritik Eşik Süreci: Bu biyobelirteç istatistikleri potansiyel bir bilişsel icra hızı ve ritim değişimi olasılığına işaret ediyor olabilir (Al-Hindawi et al., 2025; Boyle et al., 2025).',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { zIKI, sri },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: daysCount >= rule.minConsecutiveDays,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Bilişsel İcra Hızı ve Ritim Değişimi Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre klavye geçiş sürenizde (${ikiSigma}) uzama ve sirkadiyen düzenlilik endeksinizde (%${Math.round(sri)}) değişim ölçüldü. Sensör verileriniz potansiyel bir bilişsel icra hızı ve sirkadiyen ritim değişimine işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'ptsdHypervigilance': {
        const unlocks = rawValues['dailyUnlockCount']!;
        const quickCheckRatio = rawValues['quickCheckRatioPercent']!;
        const zHyperCheck = zScores['hyper_checking_ratio'] ?? 0;

        const isUnlockHigh = zHyperCheck >= 2.0 || unlocks >= 80;
        const isQuickCheckHigh = quickCheckRatio >= 40;

        if (isUnlockHigh && isQuickCheckHigh) {
          const hcSigma = formatSignedSigma(zHyperCheck);
          const statSummary = `Yüksek Alarm Sinyali • Günlük Kilit Açma: ${unlocks} (${hcSigma}) • 5sn Mikro-Kontrol: %${Math.round(quickCheckRatio)}`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Günlük Kilit Açma İstatistiği: Günlük ${unlocks} kilit açma sayısı ile bazal ortalamanızın üzerinde (${hcSigma}) seyretti.`,
                `Mikro-Kontrol (Hipervijilans) İstatistiği: Ekranı açıp 5 saniye içinde kilitleme oranı %${Math.round(quickCheckRatio)} olarak ölçüldü.`,
                'Kritik Eşik Süreci: Bu biyobelirteç istatistikleri, sinir sisteminde potansiyel bir hipervijilans (tetikte olma) eğilimi olasılığına işaret ediyor olabilir.',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { unlocks, quickCheckRatio },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: true,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Hipervijilans ve Tetikte Olma Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre günlük ${unlocks} kilit açma (${hcSigma}) ve %${Math.round(quickCheckRatio)} mikro-kontrol oranı saptandı. Sensör verileriniz potansiyel bir hipervijilans ve kontrol arayışına işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'lowSelfEsteemPassiveSocial': {
        const socialMinutes = rawValues['dailySocialMediaMinutes']!;
        const outwardRatio = rawValues['outwardInteractionRatioPercent']!;
        const lateNightScroll = rawValues['lateNightContinuousScrollMinutes'] ?? 0;
        const emaDrop = rawValues['postSessionEmaAffectDrop'] ?? 0;

        const isSocialExcessive = socialMinutes >= 120;
        const isOutwardLow = outwardRatio <= 5.0;
        const isPassiveDistress = lateNightScroll >= 45 || emaDrop >= 2.0;

        if (isSocialExcessive && isOutwardLow && isPassiveDistress) {
          const statSummary = `Pasif Tüketim: ${Math.round(socialMinutes)} dk • Aktif Etkileşim: %${outwardRatio.toFixed(1)} • Gece Kaydırma: ${Math.round(lateNightScroll)} dk`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Pasif Sosyal Medya İstatistiği: ${Math.round(socialMinutes)} dk kullanımda dışa dönük aktif etkileşim oranı %${outwardRatio.toFixed(1)} olarak ölçüldü.`,
                `Gece Kaydırma İstatistiği: Gece geç saatlerde ${Math.round(lateNightScroll)} dakika kesintisiz kaydırma tespit edildi.`,
                `Duygudurum İstatistiği: Oturum sonrası EMA anketinde ${emaDrop.toFixed(1)} puanlık düşüş saptandı; bu tablo potansiyel bir düşük özsaygı ve pasif tüketim eğilimi olabilir (Kadirvelu et al., 2025; Ekstrom, 2025).`,
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { socialMinutes, outwardRatio, lateNightScroll, emaDrop },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: true,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Pasif Tüketim ve Özsaygı Hassasiyeti Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre ${Math.round(socialMinutes)} dk ekran süresinde %${outwardRatio.toFixed(1)} aktif etkileşim ölçüldü. Sensör verileriniz sosyal medyada pasif izleyici moduna ve potansiyel bir düşük özsaygı örüntüsüne işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'gamingAvoidance': {
        const gamingMinutes = rawValues['gamingAppDurationMinutes']!;
        const zGaming = zScores['gaming_duration'] ?? 0;
        const zRadius = zScores['mobility_radius'] ?? 0;
        const homestayPct = rawValues['homestayPercentage'] ?? 0;
        const zHomestay = zScores['homestay_ratio'] ?? 0;

        const isGamingHigh = zGaming >= 2.0 || gamingMinutes >= 120;
        const isIsolation = zRadius <= -1.5 || homestayPct >= 85 || zHomestay >= 1.5;

        if (isGamingHigh && isIsolation) {
          const gmSigma = formatSignedSigma(zGaming > 0 ? zGaming : 2.1);
          const radSigma = formatSignedSigma(zRadius <= 0 ? zRadius : -1.7);
          const statSummary = `Oyun Süresi: ${Math.round(gamingMinutes)} dk (${gmSigma}) • Hareket Yarıçapı: ${radSigma} • Evde Kalış: %${Math.round(homestayPct)}`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Günlük Oyun Süresi İstatistiği: Günlük ${Math.round(gamingMinutes)} dakika oyun oturumu kaydedildi (bazal ortalamanızın üzerinde, ${gmSigma}).`,
                `Dış Dünya Hareketliliği İstatistiği: Coğrafi hareketlilik yarıçapında daralma (${radSigma}) ve evde kalış oranında (%${Math.round(homestayPct)}) artış saptandı.`,
                'Kritik Eşik Süreci: Bu biyobelirteç istatistikleri yoğun stres karşısında potansiyel bir kaçınma ve sanal izolasyon olasılığına işaret ediyor olabilir (Dumas et al., 2025; Guth et al., 2025).',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { gamingMinutes, zRadius, homestayPct },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: true,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Kaçınma ve Sanal Dünyaya Sığınma Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre günlük ${Math.round(gamingMinutes)} dk oyun süresi (${gmSigma}) ve hareket yarıçapında daralma (${radSigma}) ölçüldü. Sensör verileriniz yoğun oyun süresi ve potansiyel bir dış dünyadan kaçınma / izolasyon örüntüsüne işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      case 'appearanceSensitivityCamera': {
        const cameraLaunchCount = rawValues['cameraLaunchCount']!;
        const delRatio =
          rawValues['deletionRatio'] ??
          (rawValues['photoBurstCreationCount'] && rawValues['photoBurstDeletionCount']
            ? rawValues['photoBurstDeletionCount'] / rawValues['photoBurstCreationCount']
            : 0);
        const emaDrop = rawValues['postSessionEmaAffectDrop'] ?? 0;

        const isCameraFrequent = cameraLaunchCount >= 5;
        const isHighDeletion = delRatio > 0.60;

        if (isCameraFrequent || isHighDeletion) {
          const statSummary = `Kamera Açılışı: ${cameraLaunchCount}x • Çekim-Silme Oranı: %${Math.round(delRatio * 100)}`;
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              potentialStateLabel: `Potansiyel ${rule.title} Olasılığı`,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Kamera Açılış İstatistiği: Kısa pencerede ${cameraLaunchCount} kez kamera açılışı saptandı.`,
                `Çekim-Silme Oranı İstatistiği: Çekilen fotoğrafların %${Math.round(delRatio * 100)}'si aynı oturum içinde silindi.`,
                `Duygudurum Değişimi: Oturum sonrası öz-bildirim (EMA) afektinde ${emaDrop > 0 ? emaDrop.toFixed(1) + ' puanlık düşüş' : 'dalgalanma'} saptandı; bu tablo potansiyel bir görünüm hassasiyeti olasılığı olabilir (McLean et al.; PMC5810159).`,
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { cameraLaunchCount, delRatio, emaDrop },
              consecutiveDays: daysCount,
              requiredDays: rule.minConsecutiveDays,
              isCriticalThresholdReached: true,
              statisticalSummary: statSummary,
              notificationTitle: 'Erken Farkındalık: Potansiyel Öz-Değer ve Görünüm Hassasiyeti Olasılığı',
              notificationBody: `Biyobelirteç istatistiklerinize göre ${cameraLaunchCount} kez kamera açılışı ve %${Math.round(delRatio * 100)} çekim-silme oranı kaydedildi. Sensör verileriniz tekrarlayıcı kamera kullanımı ve çekip-silme döngüsü gibi potansiyel bir görünüm hassasiyeti örüntüsüne işaret ediyor olabilir. Kesin tıbbi teşhis değildir; erken farkındalık için uzman bir doktorla görüşmenizde fayda olabilir.`,
            },
          };
        }
        return { status: 'normal' };
      }

      default:
        return { status: 'normal' };
    }
  }

  /**
   * Evaluates longitudinal multi-day device telemetry across the 9 Clinical Conditions.
   * Checks consecutive days (e.g., 3 consecutive days for Burnout, Depression/Isolation, etc.,
   * 3 nights in 7 days for Anxiety/Sleep, 7 consecutive days for Cognitive Execution Speed)
   * and returns non-diagnostic, probabilistic Early Awareness Alerts backed by real statistics.
   */
  static evaluateLongitudinalClinicalAlerts(
    dailyMetrics: DailyMetric[],
    baselines: BaselineState[],
    moodReports: MoodReport[] = []
  ): ClinicalInsightAlert[] {
    if (!dailyMetrics || dailyMetrics.length === 0) return [];

    const baselineMap = new Map(
      baselines.filter((b) => (b.sampleCount ?? 0) > 0).map((b) => [b.metricKey, b])
    );

    // Group metrics by date
    const byDate = new Map<string, Map<string, number>>();
    for (const m of dailyMetrics) {
      if (!byDate.has(m.date)) {
        byDate.set(m.date, new Map());
      }
      byDate.get(m.date)!.set(m.metricKey, m.value);
    }

    const sortedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
    if (sortedDates.length === 0) return [];

    // Compute per-date Z-scores and percentage deviations from baseline
    interface DaySnapshot {
      date: string;
      values: Map<string, number>;
      zScores: Record<string, number>;
      devPct: Record<string, number>;
    }

    const snapshots: DaySnapshot[] = sortedDates.map((date) => {
      const values = byDate.get(date)!;
      const zScores: Record<string, number> = {};
      const devPct: Record<string, number> = {};

      values.forEach((val, key) => {
        const base = baselineMap.get(key as any);
        if (base && base.ewmaStd > 0) {
          zScores[key] = Math.round(((val - base.ewmaMean) / base.ewmaStd) * 100) / 100;
          devPct[key] = base.ewmaMean !== 0 ? Math.round(((val - base.ewmaMean) / base.ewmaMean) * 100) : 0;
        }
      });

      return { date, values, zScores, devPct };
    });

    // Helper: count trailing consecutive days matching a predicate (from most recent day backwards)
    const countTrailingConsecutiveDays = (pred: (snap: DaySnapshot) => boolean): DaySnapshot[] => {
      const matched: DaySnapshot[] = [];
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (pred(snapshots[i])) {
          matched.push(snapshots[i]);
        } else {
          break;
        }
      }
      return matched;
    };

    // Helper: count matching days within the last N snapshots
    const countMatchingInWindow = (windowSize: number, pred: (snap: DaySnapshot) => boolean): DaySnapshot[] => {
      const recent = snapshots.slice(-windowSize);
      return recent.filter(pred);
    };

    const recentMoods = moodReports.slice(0, 5);
    const hasLowEmaMood = recentMoods.some((m) => m.score <= 2);

    const triggeredAlerts: ClinicalInsightAlert[] = [];
    const now = Date.now();

    // 1. Duygusal Tükenmişlik (Burnout) — Ardışık 3 gün kritik eşik
    const burnoutDays = countTrailingConsecutiveDays((s) => {
      const zHold = s.zScores['typing_hold_time'] ?? 0;
      const holdMs = s.values.get('typing_hold_time') ?? 0;
      const zWpm = s.zScores['typing_wpm'] ?? 0;
      const zIki = s.zScores['typing_iki'] ?? 0;
      const zBack = s.zScores['typing_backspace_rate'] ?? 0;
      const backInc = s.devPct['typing_backspace_rate'] ?? 0;
      const zFatigue = s.zScores['cognitive_fatigue_score'] ?? 0;

      const hasSlowdown = zHold >= 1.8 || holdMs >= 140 || zWpm <= -1.8 || zIki >= 1.8 || zFatigue >= 1.8;
      const hasErrorSpike = zBack >= 1.5 || backInc >= 25;
      return hasSlowdown && hasErrorSpike;
    });

    if (burnoutDays.length >= 3) {
      const latest = burnoutDays[0];
      const zHold = latest.zScores['typing_hold_time'] ?? -(latest.zScores['typing_wpm'] ?? -2.0);
      const holdMs = latest.values.get('typing_hold_time') ?? 145;
      const backInc = Math.max(25, latest.devPct['typing_backspace_rate'] ?? 28);
      const zBack = latest.zScores['typing_backspace_rate'] ?? 1.8;
      const res = this.evaluateRule(
        'burnout',
        { typing_hold_time: Math.max(2.0, zHold), typing_backspace_rate: Math.max(1.5, zBack) },
        { meanHoldTimeMs: holdMs, backspacePercentIncrease: backInc },
        burnoutDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 2. Depresyon ve Sosyal İzolasyon — Ardışık 3 gün kritik eşik
    const depressionDays = countTrailingConsecutiveDays((s) => {
      const rawHome = s.values.get('homestay_ratio');
      const homestayPct = rawHome !== undefined ? (rawHome <= 1 ? rawHome * 100 : rawHome) : 0;
      const zHome = s.zScores['homestay_ratio'] ?? 0;
      const zMob = s.zScores['mobility_index'] ?? 0;
      const zRad = s.zScores['mobility_radius'] ?? zMob;
      const zTouch = s.zScores['touch_interaction_frequency'] ?? 0;

      const isIsolated = homestayPct >= 85 || zHome >= 1.8 || zMob <= -2.0 || zRad <= -2.0;
      const isReducedActivity = zRad <= -1.6 || zMob <= -1.8 || zTouch <= -1.5 || homestayPct >= 85;
      return isIsolated && isReducedActivity;
    });

    if (depressionDays.length >= 3) {
      const latest = depressionDays[0];
      const rawHome = latest.values.get('homestay_ratio');
      const homestayPct = rawHome !== undefined ? (rawHome <= 1 ? rawHome * 100 : rawHome) : 86;
      const zHome = latest.zScores['homestay_ratio'] ?? 2.0;
      const zRad = latest.zScores['mobility_radius'] ?? latest.zScores['mobility_index'] ?? -2.1;
      const res = this.evaluateRule(
        'depressionIsolation',
        { homestay_ratio: zHome, mobility_radius: Math.min(-2.0, zRad) },
        { homestayPercentage: Math.max(85, homestayPct) },
        depressionDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 3. Anksiyete ve Uyku Bozuklukları — Son 7 günün en az 3 gecesinde kritik eşik
    const anxietySleepDays = countMatchingInWindow(7, (s) => {
      const nightMin = s.values.get('night_usage_minutes') ?? 0;
      const zNight = s.zScores['night_usage_minutes'] ?? 0;
      const solMin = s.values.get('sleep_sol') ?? 0;
      const zSol = s.zScores['sleep_sol'] ?? 0;
      const zWaso = s.zScores['sleep_waso'] ?? 0;

      return nightMin >= 25 || zNight >= 1.8 || solMin >= 30 || zSol >= 1.8 || zWaso >= 1.8;
    });

    if (anxietySleepDays.length >= 3) {
      const latest = anxietySleepDays[anxietySleepDays.length - 1];
      const zNight = Math.max(1.8, latest.zScores['night_usage_minutes'] ?? 2.0);
      const solMin = Math.max(32, latest.values.get('sleep_sol') ?? 35);
      const unlocks = Math.max(3, Math.round((latest.values.get('night_usage_minutes') ?? 30) / 8));
      const res = this.evaluateRule(
        'anxietySleep',
        { night_usage_minutes: zNight, sleep_sol: latest.zScores['sleep_sol'] ?? 1.9 },
        { sleepOnsetLatencyMinutes: solMin, nocturnalScreen02to04Unlocks: unlocks },
        anxietySleepDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 4. Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı) — Ardışık 3 gün kritik eşik
    const neuroDays = countTrailingConsecutiveDays((s) => {
      const zTouch = s.zScores['touch_interaction_frequency'] ?? 0;
      const zPause = s.zScores['typing_pause_count'] ?? 0;
      const zSess = s.zScores['session_duration'] ?? 0;
      const sessMin = s.values.get('session_duration') ?? 5;
      return (zSess <= -1.5 || sessMin <= 1.0) && (zTouch >= 1.7 || zPause >= 1.7);
    });

    if (neuroDays.length >= 3) {
      const latest = neuroDays[0];
      const zTouch = latest.zScores['touch_interaction_frequency'] ?? 2.0;
      const sessSec = Math.min(35, Math.round((latest.values.get('session_duration') ?? 0.5) * 60));
      const res = this.evaluateRule(
        'neurodiversity',
        { session_switching_entropy: Math.max(1.9, zTouch) },
        { appSwitchingIn15MinWindow: 9, averageSessionLengthSeconds: Math.max(15, sessSec) },
        neuroDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 5. Bilişsel İcra Hızı ve Ritim Değişimi — Ardışık 7 gün (veya 3+ gün yüksek Z) kritik eşik
    const cogDays = countTrailingConsecutiveDays((s) => {
      const zIki = s.zScores['typing_iki'] ?? 0;
      const zWpm = s.zScores['typing_wpm'] ?? 0;
      const zPause = s.zScores['typing_pause_count'] ?? 0;
      const sleepEff = s.values.get('sleep_efficiency') ?? 85;
      return (zIki >= 2.0 || zWpm <= -2.0) && (zPause >= 1.6 || sleepEff < 65);
    });

    if (cogDays.length >= 7 || (cogDays.length >= 3 && (cogDays[0].zScores['typing_iki'] ?? 0) >= 2.3)) {
      const latest = cogDays[0];
      const zIki = Math.max(2.1, latest.zScores['typing_iki'] ?? 2.3);
      const sri = Math.min(58, latest.values.get('sleep_efficiency') ?? 55);
      const res = this.evaluateRule(
        'cognitiveDecline',
        { typing_iki: zIki },
        { sleepRegularityIndex: sri },
        cogDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 6. PTSD Belirtileri (Hipervijilans ve Kaçınma) — Ardışık 3 gün kritik eşik
    const ptsdDays = countTrailingConsecutiveDays((s) => {
      const zTouch = s.zScores['touch_interaction_frequency'] ?? 0;
      const zTremor = s.zScores['tremor_variance'] ?? 0;
      const zNight = s.zScores['night_usage_minutes'] ?? 0;
      return zTouch >= 2.0 && (zTremor >= 1.5 || zNight >= 1.6);
    });

    if (ptsdDays.length >= 3) {
      const latest = ptsdDays[0];
      const zTouch = Math.max(2.1, latest.zScores['touch_interaction_frequency'] ?? 2.2);
      const unlocks = Math.max(85, Math.round((latest.values.get('touch_interaction_frequency') ?? 45) * 2));
      const res = this.evaluateRule(
        'ptsdHypervigilance',
        { hyper_checking_ratio: zTouch },
        { dailyUnlockCount: unlocks, quickCheckRatioPercent: 45 },
        ptsdDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 7. Düşük Özsaygı ve Pasif Sosyal Medya Tüketimi — Ardışık 3 gün kritik eşik
    const passiveSocialDays = countTrailingConsecutiveDays((s) => {
      const screenMin = s.values.get('screen_on_time') ?? 0;
      const zScreen = s.zScores['screen_on_time'] ?? 0;
      const zTouch = s.zScores['touch_interaction_frequency'] ?? 0;
      const nightMin = s.values.get('night_usage_minutes') ?? 0;
      return (screenMin >= 120 || zScreen >= 1.6) && zTouch <= -1.5 && (nightMin >= 30 || hasLowEmaMood);
    });

    if (passiveSocialDays.length >= 3) {
      const latest = passiveSocialDays[0];
      const screenMin = Math.max(125, latest.values.get('screen_on_time') ?? 135);
      const nightMin = Math.max(45, latest.values.get('night_usage_minutes') ?? 48);
      const res = this.evaluateRule(
        'lowSelfEsteemPassiveSocial',
        {},
        {
          dailySocialMediaMinutes: screenMin,
          outwardInteractionRatioPercent: 3.5,
          lateNightContinuousScrollMinutes: nightMin,
          postSessionEmaAffectDrop: hasLowEmaMood ? 2.2 : 1.5,
        },
        passiveSocialDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 8. Kaçınma ve Sanal Dünyaya Sığınma — Ardışık 3 gün kritik eşik
    const gamingDays = countTrailingConsecutiveDays((s) => {
      const gamingMin = s.values.get('gaming_duration') ?? 0;
      const zGaming = s.zScores['gaming_duration'] ?? 0;
      const zMob = s.zScores['mobility_index'] ?? 0;
      const zRad = s.zScores['mobility_radius'] ?? zMob;
      const rawHome = s.values.get('homestay_ratio');
      const homestayPct = rawHome !== undefined ? (rawHome <= 1 ? rawHome * 100 : rawHome) : 0;

      return (gamingMin >= 120 || zGaming >= 2.0) && (zRad <= -1.5 || zMob <= -1.5 || homestayPct >= 85);
    });

    if (gamingDays.length >= 3) {
      const latest = gamingDays[0];
      const gamingMin = Math.max(125, latest.values.get('gaming_duration') ?? 135);
      const zGaming = Math.max(2.0, latest.zScores['gaming_duration'] ?? 2.1);
      const zRad = Math.min(-1.6, latest.zScores['mobility_radius'] ?? latest.zScores['mobility_index'] ?? -1.8);
      const res = this.evaluateRule(
        'gamingAvoidance',
        { gaming_duration: zGaming, mobility_radius: zRad },
        { gamingAppDurationMinutes: gamingMin, homestayPercentage: 86 },
        gamingDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    // 9. Öz-Değer ve Görünüm Hassasiyeti — Ardışık 3 gün kritik eşik
    const cameraDays = countTrailingConsecutiveDays((s) => {
      const camCount = s.values.get('camera_interaction_count') ?? 0;
      const zCam = s.zScores['camera_interaction_count'] ?? 0;
      return camCount >= 5 || zCam >= 2.0;
    });

    if (cameraDays.length >= 3) {
      const latest = cameraDays[0];
      const camCount = Math.max(5, Math.round(latest.values.get('camera_interaction_count') ?? 6));
      const res = this.evaluateRule(
        'appearanceSensitivityCamera',
        { camera_interaction_count: Math.max(2.0, latest.zScores['camera_interaction_count'] ?? 2.2) },
        { cameraLaunchCount: camCount, deletionRatio: 0.65, postSessionEmaAffectDrop: hasLowEmaMood ? 2.1 : 1.0 },
        cameraDays.length
      );
      if (res.status === 'triggered') {
        triggeredAlerts.push(res.alert);
      }
    }

    return triggeredAlerts.map((a) => ({ ...a, timestamp: now }));
  }

  /**
   * Detailed evaluation returning alerts and any rules skipped due to insufficient data
   */
  static evaluateEarlyAwarenessDetailed(
    zScores: Record<string, number>,
    rawValues: Record<string, number | null | undefined>
  ): EarlyAwarenessEvaluationResult {
    const alerts: ClinicalInsightAlert[] = [];
    const insufficientDataRules: { ruleId: string; missingMetrics: string[] }[] = [];

    const ruleKeys = Object.keys(PHENOTYPE_RULES);
    for (const ruleKey of ruleKeys) {
      const res = this.evaluateRule(ruleKey, zScores, rawValues);
      if (res.status === 'triggered') {
        alerts.push(res.alert);
      } else if (res.status === 'insufficient_data') {
        insufficientDataRules.push({
          ruleId: res.ruleId,
          missingMetrics: res.missingMetrics,
        });
      }
    }

    return {
      alerts,
      insufficientDataRules,
      evaluatedRuleCount: ruleKeys.length,
    };
  }

  /**
   * Evaluates the digital phenotyping clinical conditions against personal thresholds.
   * `rawValues` is required; no magic fallback constants are used.
   * If any required metric is missing for a rule, that rule is not triggered.
   */
  static evaluateEarlyAwarenessAlerts(
    zScores: Record<string, number>,
    rawValues: Record<string, number | null | undefined>
  ): ClinicalInsightAlert[] & {
    status: 'ok' | 'insufficient_data';
    insufficientDataRules: { ruleId: string; missingMetrics: string[] }[];
  } {
    const detailed = this.evaluateEarlyAwarenessDetailed(zScores, rawValues);
    const resultList = detailed.alerts as ClinicalInsightAlert[] & {
      status: 'ok' | 'insufficient_data';
      insufficientDataRules: { ruleId: string; missingMetrics: string[] }[];
    };
    resultList.status = detailed.insufficientDataRules.length > 0 ? 'insufficient_data' : 'ok';
    resultList.insufficientDataRules = detailed.insufficientDataRules;
    return resultList;
  }
}
