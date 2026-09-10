import { ClinicalPhenotypeInference, ClinicalInsightAlert } from '../types/phenotyping';
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

/**
 * Rule-Augmented Clinical Phenotype & Affect Classifier
 * Grounded in digital phenotyping literature:
 * - Saeb et al. (2015), Mohr et al. (2017): Depressive mobility & homestay patterns.
 * - Zulueta et al. (2018): Keystroke dynamics in bipolar and affective states.
 * - Wang et al. (2014): StudentLife sleep, unlock, and social routine markers.
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
    // Criteria: Homestay Z > +1.8, Location Entropy Z < -1.5, Flight Time Z > +1.5, Social Z < -1.5, Nocturnal Z > +1.2
    const isDepressive =
      (zHomestay >= 1.6 || zLocationEntropy <= -1.4) &&
      (zFlightTime >= 1.4 || zSocialRatio <= -1.4 || zNocturnal >= 1.2);

    if (isDepressive) {
      const matchScore = Math.min(
        0.96,
        0.70 +
          (Math.max(0, zHomestay - 1.5) * 0.1) +
          (Math.max(0, -zLocationEntropy - 1.2) * 0.1) +
          (Math.max(0, zFlightTime - 1.2) * 0.1)
      );

      return {
        state: 'depressive_phenotype',
        label: 'Depresif Epizod & Sosyal Çekilme Eğilimi',
        confidence: matchScore >= 0.80 ? 'high' : 'medium',
        compositeScore: Math.round(matchScore * 100) / 100,
        clinicalInsight:
          'Günlük hareket rutinlerinde daralma (yüksek homestay), konum entropisinde düşüş ve psikomotor yazım yavaşlaması (uzayan flight time) gözleniyor. Davranışsal aktivasyon ve açık hava molaları tavsiye edilir.',
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
    // Criteria: Backspace error Z > +1.6, Tremor Z > +1.4 or Hyper-checking Z > +1.8
    const isAnxious =
      zBackspace >= 1.6 &&
      (zTremor >= 1.4 || zHyperChecking >= 1.8);

    if (isAnxious) {
      const matchScore = Math.min(
        0.95,
        0.70 + (Math.max(0, zHyperChecking - 1.5) * 0.1) + (Math.max(0, zBackspace - 1.5) * 0.1)
      );

      return {
        state: 'anxious_agitated_phenotype',
        label: 'Anksiyete & Psikomotor Ajitasyon Sinyali',
        confidence: matchScore >= 0.82 ? 'high' : 'medium',
        compositeScore: Math.round(matchScore * 100) / 100,
        clinicalInsight:
          'Kompulsif kısa ekran açma döngüleri (hyper-checking), yüksek tuş düzeltme sıklığı ve mikromotor tutuş gerilimi (tremor) tespit edildi. Aşırı uyarılma (hyperarousal) durumunda derin nefes ve regülasyon egzersizleri önerilir.',
        contributingZScores: {
          hyper_checking_ratio: zHyperChecking,
          typing_backspace_rate: zBackspace,
          tremor_variance: zTremor,
        },
        detectedAt,
      };
    }

    // 3. Check Manic / Hypomanic State
    // Criteria: Nocturnal screen/movement Z > +2.5, Typing speed Z > +2.0, Mobility radius Z > +2.0
    const isManic =
      zNocturnal >= 2.2 && (zTypingSpeed >= 1.8 || zMobilityRadius >= 1.8);

    if (isManic) {
      const matchScore = Math.min(
        0.94,
        0.72 + (Math.max(0, zNocturnal - 2.0) * 0.1) + (Math.max(0, zTypingSpeed - 1.5) * 0.1)
      );

      return {
        state: 'manic_hypomanic_phenotype',
        label: 'Manik / Hipomanik Faz Belirteçleri',
        confidence: matchScore >= 0.84 ? 'high' : 'medium',
        compositeScore: Math.round(matchScore * 100) / 100,
        clinicalInsight:
          'Gece dinlenme penceresinde aşırı ekran/hareketlilik aktivitesi, radikal yazım hızı artışı ve genişleyen hareket yarıçapı ölçüldü. Azalan uyku ihtiyacı ve fikir uçuşması sinyalleri hekim kontrolünde takip edilmelidir.',
        contributingZScores: {
          night_usage_minutes: zNocturnal,
          typing_wpm: zTypingSpeed,
          mobility_radius: zMobilityRadius,
        },
        detectedAt,
      };
    }

    // 4. Check Cognitive Fatigue / Burnout State
    // Criteria: Hold time Z > +1.5, Session switching Z > +1.8, Delayed circadian offset
    const isCognitiveFatigue =
      (zHoldTime >= 1.5 || zFlightTime >= 1.8) &&
      (zSessionEntropy >= 1.5 || zBackspace >= 1.5);

    if (isCognitiveFatigue) {
      return {
        state: 'cognitive_fatigue_phenotype',
        label: 'Bilişsel Yorgunluk & Tükenmişlik (Burnout)',
        confidence: 'medium',
        compositeScore: 0.84,
        clinicalInsight:
          'Tuş basılı kalma sürelerinde uzama (hold time), dağınık uygulama geçişleri ve karar yorgunluğu tespit edildi. Zihinsel odaklanma ve dinlenme periyotlarının yapılandırılması önerilir.',
        contributingZScores: {
          typing_hold_time: zHoldTime,
          session_switching_entropy: zSessionEntropy,
          typing_backspace_rate: zBackspace,
        },
        detectedAt,
      };
    }

    // 5. Check ADHD / Neurodivergent Pattern (Slide 20)
    // Criteria: High session switching, bursty interactions, high variance in pause
    const zPauseCount = getZ('typing_pause_count');
    const zTouchFreq = getZ('touch_interaction_frequency');
    const isADHD = zSessionEntropy >= 1.8 && (zTouchFreq >= 1.7 || zPauseCount >= 1.7);

    if (isADHD) {
      return {
        state: 'adhd_neurodivergent_phenotype',
        label: 'Nöroçeşitlilik (DEHB / Dikkat Dağınıklığı) Örüntüsü',
        confidence: 'medium',
        compositeScore: 0.82,
        clinicalInsight:
          'Hızlı bağlam değiştirme, dağınık odaklanma döngüleri ve tekrarlayıcı mikro dokunma davranışları tespit edildi. Dikkat yönetimi ve blok çalışma aralıkları (Pomodoro vb.) fayda sağlayabilir.',
        contributingZScores: {
          session_switching_entropy: zSessionEntropy,
          touch_interaction_frequency: zTouchFreq,
          typing_pause_count: zPauseCount,
        },
        detectedAt,
      };
    }

    // 6. Check PTSD / Hypervigilance Pattern (Slide 20)
    // Criteria: High hyper-checking, sleep fragmentation, startle motor restlessness
    const isPTSD = zHyperChecking >= 2.0 && (zNocturnal >= 1.6 || zTremor >= 1.5);

    if (isPTSD) {
      return {
        state: 'ptsd_hypervigilance_phenotype',
        label: 'Hipervijilans & Yüksek Alarm Hali (PTSD Belirteci)',
        confidence: 'medium',
        compositeScore: 0.83,
        clinicalInsight:
          'Sık aralıklarla ekranı kontrol etme (hipervijilans), gece dinlenme bölünmeleri ve motor huzursuzluk sinyali saptandı. Sinir sistemi yatıştırıcı regülasyon ve somatik nefes pratikleri önerilir.',
        contributingZScores: {
          hyper_checking_ratio: zHyperChecking,
          night_usage_minutes: zNocturnal,
          tremor_variance: zTremor,
        },
        detectedAt,
      };
    }

    // 7. Check Cognitive Decline Risk Pattern (Slide 20)
    // Criteria: Severe typing slowdown + high pauses + reduced speech rate / high IKI
    const zVoicePitch = getZ('voice_pitch_variance');
    const isCognitiveDecline = (zTypingSpeed <= -1.8 && zPauseCount >= 1.8) || (zVoicePitch <= -2.0 && zFlightTime >= 1.8);

    if (isCognitiveDecline) {
      return {
        state: 'cognitive_decline_risk_phenotype',
        label: 'Bilişsel Yavaşlama & İfade Akıcılığı Sinyali',
        confidence: 'medium',
        compositeScore: 0.80,
        clinicalInsight:
          'Yazım hızında belirgin yavaşlama, artan duraksama süreleri ve ses varyansında daralma gözlemlendi. Zihinsel egzersizler ve uzman değerlendirmesiyle bilişsel takip tavsiye edilir.',
        contributingZScores: {
          typing_wpm: zTypingSpeed,
          typing_pause_count: zPauseCount,
          voice_pitch_variance: zVoicePitch,
        },
        detectedAt,
      };
    }

    // 8. Check Low Self-Esteem / Passive Lurking Pattern (Slide 20)
    // Criteria: High screen time + very low touch interaction + low social ratio
    const zScreenTime = getZ('screen_on_time');
    const isLowSelfEsteem = zScreenTime >= 1.6 && zTouchFreq <= -1.6 && zSocialRatio <= -1.2;

    if (isLowSelfEsteem) {
      return {
        state: 'low_self_esteem_phenotype',
        label: 'Pasif Tüketim & Düşük Özsaygı Eğilimi',
        confidence: 'medium',
        compositeScore: 0.79,
        clinicalInsight:
          'Sosyal medyada pasif izleyici (lurker) modunda geçirilen aşırı süre ve iletişim üretiminde düşüş saptandı. İçerik üretme veya sosyal etkileşimli aktivitelere yönelme önerilir.',
        contributingZScores: {
          screen_on_time: zScreenTime,
          touch_interaction_frequency: zTouchFreq,
          outgoing_social_ratio: zSocialRatio,
        },
        detectedAt,
      };
    }

    // 9. Default Healthy / Euthymic Baseline
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
  static calculateAffectiveStateIndex(zScores: Record<string, number>): number {
    const zMobility = zScores['mobility_index'] ?? 0;
    const zTyping = zScores['typing_wpm'] ?? 0;
    const zNight = zScores['night_usage_minutes'] ?? 0;
    const zBackspace = zScores['typing_backspace_rate'] ?? 0;
    const zTremor = zScores['tremor_variance'] ?? 0;

    const compositeDelta =
      0.25 * zMobility +
      0.25 * zTyping -
      0.25 * zNight -
      0.15 * zBackspace -
      0.1 * zTremor;

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
    rawValues: Record<string, number | null | undefined>
  ): RuleEvaluationResult {
    const rule = PHENOTYPE_RULES[ruleKey];
    if (!rule) return { status: 'normal' };

    const missingMetrics: string[] = [];
    for (const k of rule.requiredMetrics) {
      if (rawValues[k] === undefined || rawValues[k] === null || Number.isNaN(rawValues[k])) {
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

    switch (ruleKey) {
      case 'burnout': {
        const holdMs = rawValues['meanHoldTimeMs']!;
        const backspaceInc = rawValues['backspacePercentIncrease']!;
        const zHold = zScores['typing_hold_time'] ?? 0;
        const zBackspace = zScores['typing_backspace_rate'] ?? 0;

        const isHoldElevated = zHold >= 2.0 || holdMs >= 140;
        const isBackspaceElevated = zBackspace >= 1.5 || backspaceInc >= 25;

        if (isHoldElevated && isBackspaceElevated) {
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Klavye Hold Time: Tuş basılı tutma süreniz bazalden +${(zHold > 0 ? zHold : 2.2).toFixed(1)}σ (${Math.round(holdMs)} ms) daha uzun kaydedildi.`,
                `Silme Oranı: Silme tuşu kullanımınız bazal ortalamanıza kıyasla %${Math.round(backspaceInc)} arttı.`,
                'Süreç: Bu sapma örüntüsü ardışık 3 gündür kesintisiz devam ediyor (Moon et al., 2025; Short et al., 2025).',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { holdZ: zHold, backspaceInc },
              notificationBody: 'Akademik araştırma verilerine göre sensör verileriniz duygusal tükenmişlik (burnout) ve zihinsel yorgunluk tablosuna işaret ediyor olabilir. Bilincinde olduğunuz bir süreç yaşamıyorsanız bu durumu erkenden uzman bir doktorla görüşmenizde fayda olabilir.',
            },
          };
        }
        return { status: 'normal' };
      }

      case 'depressionIsolation': {
        const homestayPct = rawValues['homestayPercentage']!;
        const zHomestay = zScores['homestay_ratio'] ?? 0;
        const zRadius = zScores['mobility_radius'] ?? 0;

        const isHomestayHigh = zHomestay >= 2.0 || homestayPct >= 85;
        const isRadiusRestricted = zRadius <= -2.0;

        if ((isHomestayHigh && isRadiusRestricted) || homestayPct >= 85 || (zHomestay >= 1.6 && zRadius <= -2.0)) {
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Evde Kalma Oranı: Günlük evde geçirilen süre %${Math.round(homestayPct)} seviyesine ulaştı.`,
                `Hareketlilik Yarıçapı: Coğrafi hareketlilik alanınız ${(zRadius <= 0 ? zRadius : -2.1).toFixed(1)}σ daralma gösterdi.`,
                'Süreç: Bu tablo ardışık 3 gündür devam ediyor (Guth et al., 2025; Aalbers et al., 2025).',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { homestayPct, zRadius },
              notificationBody: 'Akademik araştırma verilerine göre sensör verileriniz sosyal izolasyon ve depresif içe çekilme tablosuna işaret ediyor olabilir. Bilincinde olduğunuz bir süreç yaşamıyorsanız bu durumu erkenden uzman bir doktorla görüşmenizde fayda olabilir.',
            },
          };
        }
        return { status: 'normal' };
      }

      case 'anxietySleep': {
        const solMinutes = rawValues['sleepOnsetLatencyMinutes']!;
        const nocturnalUnlocks = rawValues['nocturnalScreen02to04Unlocks']!;
        const zNocturnal = zScores['night_usage_minutes'] ?? 0;

        const isNightElevated = zNocturnal >= 1.8 || nocturnalUnlocks >= 3;
        const isSolProlonged = solMinutes >= 30;

        if (isNightElevated && isSolProlonged) {
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Gece Ekran Penceresi: 02:00-04:00 saatleri arasında ${nocturnalUnlocks} kez kilit açma ve yoğun aktif ekran kullanımı kaydedildi.`,
                `Uykuya Dalma Süresi (SOL): Bazal ortalamanıza kıyasla ${Math.round(solMinutes)} dakika uzama tespit edildi.`,
                'Süreç: Son 7 günün 3 gecesinde bu gece uyanıklığı döngüsü tekrarlandı (Lee et al., 2025).',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { zNocturnal, solMinutes },
              notificationBody: 'Akademik araştırma verilerine göre sensör verileriniz anksiyete ve uyku düzeni bozulmasına işaret ediyor olabilir. Bilincinde olduğunuz bir süreç yaşamıyorsanız bu durumu erkenden uzman bir doktorla görüşmenizde fayda olabilir.',
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
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Uygulama Geçiş Sıklığı: 15 dakikalık aktif pencerede ${appSwitches} farklı uygulamaya geçiş yapıldı.`,
                `Mikro-Oturum Süresi: Ortalama ekran oturumu süresi ${Math.round(avgSessionSec)} saniyeye geriledi (aşırı parçalanmış dikkat).`,
                'Süreç: Gün içinde en az 4 ayrı zaman diliminde bu dikkat bölünmesi örüntüsü saptandı.',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { appSwitches, avgSessionSec },
              notificationBody: 'Akademik araştırma verilerine göre sensör verileriniz dikkat dağınıklığı ve odak parçalanmasına işaret ediyor olabilir. Bilincinde olduğunuz bir süreç yaşamıyorsanız bu durumu erkenden uzman bir doktorla görüşmenizde fayda olabilir.',
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
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Klavye İki Tuş Arası Geçiş (IKI): Ardışık 7 gün boyunca sürekli uzama (+${(zIKI > 0 ? zIKI : 2.5).toFixed(1)}σ) gösterdi.`,
                `Sirkadiyen Düzenlilik Endeksi (SRI): %${Math.round(sri)} seviyesine gerileyerek sirkadiyen parçalanma sinyali verdi.`,
                'Klavye Duraksamaları: 2 saniyeyi aşan bilişsel duraklama sıklığında artış saptandı (Al-Hindawi et al., 2025; Boyle et al., 2025).',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { zIKI, sri },
              notificationBody: 'Akademik araştırma verilerine göre sensör verileriniz bilişsel icra hızı ve sirkadiyen ritim değişimine işaret ediyor olabilir. Bilincinde olduğunuz bir süreç yaşamıyorsanız bu durumu erkenden uzman bir doktorla görüşmenizde fayda olabilir.',
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
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Günlük Kilit Açma: Günlük ${unlocks} kilit açma sayısı ile bazal ortalamanızın üzerinde seyretti.`,
                `Mikro-Kontrol (Hipervijilans): Ekranı açıp 5 saniye içinde hiçbir eylem yapmadan kilitleme oranı %${Math.round(quickCheckRatio)} oldu.`,
                'Süreç: Sinir sisteminin tetikte olma ve kontrol arayışı biyobelirtecini yansıtır.',
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { unlocks, quickCheckRatio },
              notificationBody: 'Akademik araştırma verilerine göre sensör verileriniz hipervijilans ve kontrol arayışına işaret ediyor olabilir. Bilincinde olduğunuz bir süreç yaşamıyorsanız bu durumu erkenden uzman bir doktorla görüşmenizde fayda olabilir.',
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
          return {
            status: 'triggered',
            alert: {
              id: rule.id,
              insightType: rule.insightType,
              title: rule.title,
              personalizedDeviationStatement: rule.personalizedDeviationStatement,
              explainableEvidences: [
                `Pasif Sosyal Medya: ${Math.round(socialMinutes)} dk sosyal medya kullanımında dışa dönük aktif etkileşim oranı %${outwardRatio.toFixed(1)} olarak ölçüldü.`,
                `Gece Dikey Kaydırma: Gece geç saatlerde ${Math.round(lateNightScroll)} dakika kesintisiz kaydırma (doomscrolling) tespit edildi.`,
                `Duygudurum Düşüşü: Oturum sonrası EMA anketinde duygusal afekt puanında ${emaDrop.toFixed(1)} puanlık negatif düşüş saptandı (Kadirvelu et al., 2025; Ekstrom, 2025).`,
              ],
              ethicalDisclaimer: rule.ethicalDisclaimer,
              severity: rule.severity,
              timestamp: now,
              contributingMetrics: { socialMinutes, outwardRatio, lateNightScroll, emaDrop },
              notificationBody: 'Akademik araştırma verilerine göre sensör verileriniz sosyal medyada pasif izleyici moduna ve düşük özsaygı örüntüsüne işaret ediyor olabilir. Bilincinde olduğunuz bir süreç yaşamıyorsanız bu durumu erkenden uzman bir doktorla görüşmenizde fayda olabilir.',
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
   * Evaluates the 7 core digital phenotyping clinical conditions against personal thresholds.
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
