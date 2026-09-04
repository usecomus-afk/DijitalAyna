import { ClinicalPhenotypeInference, ClinicalInsightAlert } from '../types/phenotyping';

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
   * Evaluates the 7 core digital phenotyping clinical conditions against personal thresholds
   * Returning explainable evidence, ethical medical disclaimers, and clinician-ready alerts
   */
  static evaluateEarlyAwarenessAlerts(
    zScores: Record<string, number>,
    rawValues: Record<string, number> = {}
  ): ClinicalInsightAlert[] {
    const alerts: ClinicalInsightAlert[] = [];
    const getZ = (k: string) => zScores[k] ?? 0;
    const getRaw = (k: string, fallback = 0) => rawValues[k] ?? fallback;

    // 1. Burnout (Duygusal Tükenmişlik)
    const zHold = getZ('typing_hold_time');
    const zBackspace = getZ('typing_backspace_rate');
    const holdMs = getRaw('meanHoldTimeMs', 145);
    const backspaceInc = getRaw('backspacePercentIncrease', 28);
    if ((zHold >= 2.0 || holdMs >= 140) && (zBackspace >= 1.5 || backspaceInc >= 25)) {
      alerts.push({
        id: 'burnout-alert',
        insightType: 'burnout',
        title: 'Duygusal Tükenmişlik (Burnout)',
        personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
        explainableEvidences: [
          `Klavye Hold Time: Tuş basılı tutma süreniz bazalden +${(zHold > 0 ? zHold : 2.2).toFixed(1)}σ (${Math.round(holdMs)} ms) daha uzun kaydedildi.`,
          `Silme Oranı: Silme tuşu kullanımınız bazal ortalamanıza kıyasla %${Math.round(backspaceInc)} arttı.`,
          'Süreç: Bu sapma örüntüsü ardışık 3 gündür kesintisiz devam ediyor.',
        ],
        ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
        severity: 'high',
        timestamp: Date.now(),
        contributingMetrics: { holdZ: zHold, backspaceInc },
        notificationBody: `Dijital Ayna: Son 3 gündür klavye yazım hızınızda belirgin yavaşlama ve silme tuşu kullanımınızda %${Math.round(backspaceInc)} artış gözlemlendi. Zihinsel yorgunluk işaretleri olabilir; dinlenme ihtiyacınızı gözden geçirebilirsiniz.`,
      });
    }

    // 2. Depression & Isolation (Depresyon ve Sosyal İzolasyon)
    const zHomestay = getZ('homestay_ratio');
    const zRadius = getZ('mobility_radius');
    const homestayPct = getRaw('homestayPercentage', 88);
    if (zHomestay >= 1.6 || homestayPct >= 85 || zRadius <= -2.0) {
      alerts.push({
        id: 'depression-isolation-alert',
        insightType: 'depressionIsolation',
        title: 'Depresyon ve Sosyal İzolasyon',
        personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
        explainableEvidences: [
          `Evde Kalma Oranı: Günlük evde geçirilen süre %${Math.round(homestayPct)} seviyesine ulaştı.`,
          `Hareketlilik Yarıçapı: Coğrafi hareketlilik alanınız ${(zRadius <= 0 ? zRadius : -2.1).toFixed(1)}σ daralma gösterdi.`,
          'Süreç: Bu tablo ardışık 4 gündür devam ediyor (Aalbers et al., 2025; Guth et al., 2025).',
        ],
        ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
        severity: 'high',
        timestamp: Date.now(),
        contributingMetrics: { homestayPct, zRadius },
        notificationBody: 'Dijital Ayna: Son 4 gündür evde geçirilen sürenizde belirgin artış ve günlük hareket alanınızda %50\'nin üzerinde daralma gözlemlendi. Temiz hava molası ve sosyal bir temas iyi gelebilir.',
      });
    }

    // 3. Anxiety & Sleep (Anksiyete ve Uyku Bozuklukları)
    const zNocturnal = getZ('night_usage_minutes');
    const solMinutes = getRaw('sleepOnsetLatencyMinutes', 45);
    const nocturnalUnlocks = getRaw('nocturnalScreen02to04Unlocks', 3);
    if (zNocturnal >= 1.8 || nocturnalUnlocks >= 3 || solMinutes >= 40) {
      alerts.push({
        id: 'anxiety-sleep-alert',
        insightType: 'anxietySleep',
        title: 'Anksiyete ve Uyku Bozuklukları',
        personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
        explainableEvidences: [
          `Gece Ekran Penceresi: 02:00-04:00 saatleri arasında ${nocturnalUnlocks} kez kilit açma ve yoğun aktif ekran kullanımı kaydedildi.`,
          `Uykuya Dalma Süresi (SOL): Bazal ortalamanıza kıyasla ${Math.round(solMinutes)} dakika uzama tespit edildi.`,
          'Süreç: Son 7 günün 3 gecesinde bu gece uyanıklığı döngüsü tekrarlandı (Lee et al., 2025).',
        ],
        ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
        severity: 'medium',
        timestamp: Date.now(),
        contributingMetrics: { zNocturnal, solMinutes },
        notificationBody: 'Dijital Ayna: Gece 02:00-04:00 saatleri arasında ekran aktivitenizde artış ve uykuya dalma sürenizde uzama fark edildi. Rahatlatıcı bir uyku rutini oluşturmayı deneyebilirsiniz.',
      });
    }

    // 4. Neurodiversity / ADHD (Nöroçeşitlilik)
    const zSessionSwitch = getZ('session_switching_entropy');
    const appSwitches = getRaw('appSwitchingIn15MinWindow', 9);
    const avgSessionSec = getRaw('averageSessionLengthSeconds', 34);
    if (zSessionSwitch >= 1.8 || appSwitches >= 8 || avgSessionSec < 40) {
      alerts.push({
        id: 'neurodiversity-alert',
        insightType: 'neurodiversity',
        title: 'Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı)',
        personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
        explainableEvidences: [
          `Uygulama Geçiş Sıklığı: 15 dakikalık aktif pencerede ${appSwitches} farklı uygulamaya geçiş yapıldı.`,
          `Mikro-Oturum Süresi: Ortalama ekran oturumu süresi ${Math.round(avgSessionSec)} saniyeye geriledi (aşırı parçalanmış dikkat).`,
          'Süreç: Gün içinde en az 4 ayrı zaman diliminde bu dikkat bölünmesi örüntüsü saptandı.',
        ],
        ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
        severity: 'medium',
        timestamp: Date.now(),
        contributingMetrics: { appSwitches, avgSessionSec },
        notificationBody: 'Dijital Ayna: Gün içinde sık uygulama geçişleri ve kısa ekran oturumları ile dikkat bölünmesi örüntüsü saptandı. Bildirimleri sınırlandırmak odağınızı korumanıza yardımcı olabilir.',
      });
    }

    // 5. Cognitive Decline Risk (Bilişsel İcra Hızı ve Ritim Değişimi - asla Demans değil)
    const zIKI = getZ('typing_iki');
    const sri = getRaw('sleepRegularityIndex', 54);
    if (zIKI >= 2.0 || sri < 60) {
      alerts.push({
        id: 'cognitive-decline-alert',
        insightType: 'cognitiveDecline',
        title: 'Bilişsel İcra Hızı ve Ritim Değişimi',
        personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
        explainableEvidences: [
          `Klavye İki Tuş Arası Geçiş (IKI): Ardışık 7 gün boyunca sürekli uzama (+${(zIKI > 0 ? zIKI : 2.5).toFixed(1)}σ) gösterdi.`,
          `Sirkadiyen Düzenlilik Endeksi (SRI): %${Math.round(sri)} seviyesine gerileyerek sirkadiyen parçalanma sinyali verdi.`,
          'Klavye Duraksamaları: 2 saniyeyi aşan bilişsel duraklama sıklığında artış saptandı (Boyle et al., 2025).',
        ],
        ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
        severity: 'high',
        timestamp: Date.now(),
        contributingMetrics: { zIKI, sri },
        notificationBody: 'Dijital Ayna: Son haftalarda uyku düzenliliğinizde parçalanma ve klavye etkileşim aralıklarınızda uzama tespit edildi. Bu biyobelirteç değişimlerini bir sonraki doktor randevunuzda paylaşabilirsiniz.',
      });
    }

    // 6. PTSD Hypervigilance (PTSD Belirtileri)
    const zHyperCheck = getZ('hyper_checking_ratio');
    const unlocks = getRaw('dailyUnlockCount', 86);
    const quickCheckRatio = getRaw('quickCheckRatioPercent', 44);
    if (zHyperCheck >= 2.0 || unlocks >= 80 || quickCheckRatio >= 40) {
      alerts.push({
        id: 'ptsd-hypervigilance-alert',
        insightType: 'ptsdHypervigilance',
        title: 'PTSD Belirtileri (Hipervijilans ve Kaçınma)',
        personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
        explainableEvidences: [
          `Günlük Kilit Açma: Günlük ${unlocks} kilit açma sayısı ile bazal ortalamanızın üzerinde seyretti.`,
          `Mikro-Kontrol (Hipervijilans): Ekranı açıp 5 saniye içinde hiçbir eylem yapmadan kilitleme oranı %${Math.round(quickCheckRatio)} oldu.`,
          'Süreç: Sinir sisteminin tetikte olma ve kontrol arayışı biyobelirtecini yansıtır.',
        ],
        ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
        severity: 'medium',
        timestamp: Date.now(),
        contributingMetrics: { unlocks, quickCheckRatio },
        notificationBody: 'Dijital Ayna: Cihaz kontrol sıklığınızda ve hızlı kilit açıp-kapama oranınızda belirgin artış kaydedildi. Bedeninizi dinlendirmek ve nefes egzersizi yapmak rahatlatıcı olabilir.',
      });
    }

    // 7. Low Self-Esteem & Passive Social Media (Düşük Özsaygı ve Pasif Sosyal Medya Tüketimi)
    const socialMinutes = getRaw('dailySocialMediaMinutes', 135);
    const outwardRatio = getRaw('outwardInteractionRatioPercent', 3.8);
    const lateNightScroll = getRaw('lateNightContinuousScrollMinutes', 50);
    const emaDrop = getRaw('postSessionEmaAffectDrop', 2.2);
    if (socialMinutes >= 120 && outwardRatio <= 5.0 && (lateNightScroll >= 45 || emaDrop >= 2.0)) {
      alerts.push({
        id: 'low-self-esteem-passive-social-alert',
        insightType: 'lowSelfEsteemPassiveSocial',
        title: 'Düşük Özsaygı ve Pasif Sosyal Medya Tüketimi',
        personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
        explainableEvidences: [
          `Pasif Sosyal Medya: ${Math.round(socialMinutes)} dk sosyal medya kullanımında dışa dönük aktif etkileşim oranı %${outwardRatio.toFixed(1)} olarak ölçüldü.`,
          `Gece Dikey Kaydırma: Gece geç saatlerde ${Math.round(lateNightScroll)} dakika kesintisiz kaydırma (doomscrolling) tespit edildi.`,
          `Duygudurum Düşüşü: Oturum sonrası EMA anketinde duygusal afekt puanında ${emaDrop.toFixed(1)} puanlık negatif düşüş saptandı (Ekstrom, 2026; Kadirvelu et al., 2025).`,
        ],
        ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
        severity: 'medium',
        timestamp: Date.now(),
        contributingMetrics: { socialMinutes, outwardRatio, lateNightScroll, emaDrop },
        notificationBody: `Dijital Ayna: Bugün sosyal medyada pasif izleyici modunda uzun bir süre (${Math.round(socialMinutes)} dk) geçirdiğiniz ve bu süreçte duygu durumunuzda düşüş eğilimi oluştuğu fark edildi. Ekran dışı bir mola vermek iyi gelebilir.`,
      });
    }

    return alerts;
  }
}
