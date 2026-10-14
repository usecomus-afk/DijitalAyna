/**
 * Phenotype Rules Configuration
 * Centralized, ground-truth configuration for clinical phenotype rules, academic citations,
 * required raw and standardized metrics, minimum consecutive day thresholds, and clinical criteria.
 * 
 * References:
 * - Moon et al. (2025), Short et al. (2025): Keystroke dynamics & cognitive fatigue / burnout.
 * - Guth et al. (2025), Aalbers et al. (2025): GPS homestay & mobility radius in depressive isolation.
 * - Lee et al. (2025): Circadian sleep disruption, nocturnal screen awakenings & SOL.
 * - Al-Hindawi et al. (2025), Boyle et al. (2025): Keystroke pause latencies & circadian regularity (MCI).
 * - Kadirvelu et al. (2025), Ekstrom (2025): Passive social media lurking, late-night doomscrolling & affect dips.
 */

export interface PhenotypeRuleConfig {
  id: string;
  insightType:
    | 'burnout'
    | 'depressionIsolation'
    | 'anxietySleep'
    | 'neurodiversity'
    | 'cognitiveDecline'
    | 'CognitivePattern'
    | 'ptsdHypervigilance'
    | 'lowSelfEsteemPassiveSocial'
    | 'gamingAvoidance'
    | 'appearanceSensitivityCamera';
  title: string;
  academicCitations: string[];
  requiredMetrics: string[];
  requiredZMetrics: string[];
  minConsecutiveDays: number;
  severity: 'low' | 'medium' | 'high';
  personalizedDeviationStatement: string;
  ethicalDisclaimer: string;
}

export const PHENOTYPE_RULES: Record<string, PhenotypeRuleConfig> = {
  burnout: {
    id: 'burnout-alert',
    insightType: 'burnout',
    title: 'Duygusal Tükenmişlik (Burnout)',
    academicCitations: ['Moon et al., 2025', 'Short et al., 2025'],
    requiredMetrics: ['meanHoldTimeMs', 'backspacePercentIncrease'],
    requiredZMetrics: ['typing_hold_time', 'typing_backspace_rate'],
    minConsecutiveDays: 3,
    severity: 'high',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre klavye basılı tutma süresi ve hata düzeltme oranınızda ardışık 3 gündür kritik eşiği aşan sapmalar gözlemlendi; bu tablo potansiyel bir duygusal tükenmişlik (burnout) eğilimi olabilir.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen, biyobelirteç istatistiklerine dayalı erken farkındalık öngörüsüdür. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  depressionIsolation: {
    id: 'depression-isolation-alert',
    insightType: 'depressionIsolation',
    title: 'Depresyon ve Sosyal İzolasyon',
    academicCitations: ['Guth et al., 2025', 'Aalbers et al., 2025'],
    requiredMetrics: ['homestayPercentage'],
    requiredZMetrics: ['homestay_ratio', 'mobility_radius'],
    minConsecutiveDays: 3,
    severity: 'high',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre evde kalma oranınızda artış ve coğrafi hareketlilik yarıçapınızda daralma kritik eşiğe ulaştı; bu örüntü potansiyel bir sosyal izolasyon veya depresif içe çekilme olasılığına işaret ediyor olabilir.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen, biyobelirteç istatistiklerine dayalı erken farkındalık öngörüsüdür. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  anxietySleep: {
    id: 'anxiety-sleep-alert',
    insightType: 'anxietySleep',
    title: 'Anksiyete ve Uyku Bozuklukları',
    academicCitations: ['Lee et al., 2025'],
    requiredMetrics: ['sleepOnsetLatencyMinutes', 'nocturnalScreen02to04Unlocks'],
    requiredZMetrics: ['night_usage_minutes'],
    minConsecutiveDays: 3,
    severity: 'medium',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre 02:00-04:00 gece uyanıklığı ve uykuya dalma sürenizdeki (SOL) uzama kritik eşiğe ulaştı; bu durum potansiyel bir anksiyete ve sirkadiyen uyku bozukluğu olasılığı olabilir.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen, biyobelirteç istatistiklerine dayalı erken farkındalık öngörüsüdür. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  neurodiversity: {
    id: 'neurodiversity-alert',
    insightType: 'neurodiversity',
    title: 'Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı)',
    academicCitations: ['Wang et al., 2024', 'StudentLife 2024'],
    requiredMetrics: ['appSwitchingIn15MinWindow', 'averageSessionLengthSeconds'],
    requiredZMetrics: ['session_switching_entropy'],
    minConsecutiveDays: 1,
    severity: 'medium',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre uygulama geçiş entropisi ve mikro-oturum sürelerinizde kritik eşiği aşan parçalanma gözlemlendi; bu örüntü potansiyel bir dikkat dağınıklığı ve odak bölünmesi eğilimi olabilir.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen, biyobelirteç istatistiklerine dayalı erken farkındalık öngörüsüdür. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  cognitiveDecline: {
    id: 'cognitive-decline-alert',
    insightType: 'cognitiveDecline',
    title: 'Bilişsel İcra Hızı ve Ritim Değişimi', // STRICT: Asla 'Demans' denmez
    academicCitations: ['Al-Hindawi et al., 2025', 'Boyle et al., 2025'],
    requiredMetrics: ['sleepRegularityIndex'],
    requiredZMetrics: ['typing_iki'],
    minConsecutiveDays: 7,
    severity: 'high',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre tuşlar arası geçiş sürenizde (IKI) uzama ve sirkadiyen düzenlilik endeksinizde (SRI) azalma kritik eşiğe ulaştı; bu tablo potansiyel bir bilişsel icra hızı ve ritim değişimi olasılığı olabilir.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen, biyobelirteç istatistiklerine dayalı erken farkındalık öngörüsüdür. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  ptsdHypervigilance: {
    id: 'ptsd-hypervigilance-alert',
    insightType: 'ptsdHypervigilance',
    title: 'PTSD Belirtileri (Hipervijilans ve Kaçınma)',
    academicCitations: ['Torous et al., 2024'],
    requiredMetrics: ['dailyUnlockCount', 'quickCheckRatioPercent'],
    requiredZMetrics: ['hyper_checking_ratio'],
    minConsecutiveDays: 1,
    severity: 'medium',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre sık ekran kilit açma ve mikro-kontrol oranınız kritik eşiği aştı; bu örüntü potansiyel bir hipervijilans (tetikte olma) ve yüksek alarm hali olasılığına işaret ediyor olabilir.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen, biyobelirteç istatistiklerine dayalı erken farkındalık öngörüsüdür. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  lowSelfEsteemPassiveSocial: {
    id: 'low-self-esteem-passive-social-alert',
    insightType: 'lowSelfEsteemPassiveSocial',
    title: 'Düşük Özsaygı ve Pasif Sosyal Medya Tüketimi',
    academicCitations: ['Kadirvelu et al., 2025', 'Ekstrom, 2025'],
    requiredMetrics: ['dailySocialMediaMinutes', 'outwardInteractionRatioPercent'],
    requiredZMetrics: [],
    minConsecutiveDays: 1,
    severity: 'medium',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre yüksek ekran süresine karşın düşük aktif etkileşim ve gece kaydırma örüntüsü kritik eşiğe ulaştı; bu durum potansiyel bir pasif tüketim ve özsaygı hassasiyeti olasılığı olabilir.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir; kesinlik belirtmeyen, biyobelirteç istatistiklerine dayalı erken farkındalık öngörüsüdür. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  gamingAvoidance: {
    id: 'gaming-avoidance-alert',
    insightType: 'gamingAvoidance',
    title: 'Kaçınma ve Sanal Dünyaya Sığınma',
    academicCitations: ['Dumas et al., 2025', 'Guth et al., 2025'],
    requiredMetrics: ['gamingAppDurationMinutes'],
    requiredZMetrics: [],
    minConsecutiveDays: 1,
    severity: 'high',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre oyun oturumu süresindeki artış ve dış dünya hareketliliğindeki daralma kritik eşiğe ulaştı; bu örüntü potansiyel bir kaçınma ve sanal dünyaya sığınma olasılığı olabilir.',
    ethicalDisclaimer: 'Bu veriler kesin bir teşhis değildir; yoğun stres veya içsel baskı anlarında görülebilen potansiyel ve geçici tepkiler olabilir. Durumu hekiminizle/uzmanınızla paylaşmanız tavsiye edilir.',
  },
  appearanceSensitivityCamera: {
    id: 'appearance-sensitivity-camera-alert',
    insightType: 'appearanceSensitivityCamera',
    title: 'Öz-Değer ve Görünüm Hassasiyeti',
    academicCitations: ['McLean et al., 2024', 'PMC5810159'],
    requiredMetrics: ['cameraLaunchCount'],
    requiredZMetrics: [],
    minConsecutiveDays: 1,
    severity: 'medium',
    personalizedDeviationStatement: 'Biyobelirteç istatistiklerinize göre tekrarlayıcı kamera açılışları ve çekim-silme döngüsü kritik eşiğe ulaştı; bu tablo potansiyel bir öz-değer ve görünüm hassasiyeti olasılığına işaret ediyor olabilir.',
    ethicalDisclaimer: 'Bu veriler kesin bir teşhis değildir; yoğun stres veya içsel baskı anlarında görülebilen potansiyel ve geçici tepkiler olabilir. Durumu hekiminizle/uzmanınızla paylaşmanız tavsiye edilir.',
  },
  cognitivePattern1: {
    id: 'cognitive-pattern-memory-executive',
    insightType: 'CognitivePattern',
    title: 'Hatırlatıcı Uyumsuzluğu ve İcra Takibi (Memory & Executive Function)',
    academicCitations: ['McKenna et al., 2025'],
    requiredMetrics: ['medicationAdherenceRate', 'scheduledTaskSkipCount'],
    requiredZMetrics: [],
    minConsecutiveDays: 14,
    severity: 'medium',
    personalizedDeviationStatement: 'Son 14 günde düzenli rutin görev/ilaç atlama oranında bazal çizgiye göre >= +2.0σ artış veya %40\'ın üzerinde ihmal gözlendi.',
    ethicalDisclaimer: 'Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir.',
  },
  cognitivePattern2: {
    id: 'cognitive-pattern-spatial-circadian',
    insightType: 'CognitivePattern',
    title: 'Mekansal Entropi ve Sirkadiyen Yönelim (Spatial Disorientation & Circadian Inversion)',
    academicCitations: ['Al-Hindawi et al., 2025', 'Boyle et al., 2025'],
    requiredMetrics: ['mobilityEntropy', 'sleepRegularityIndex'],
    requiredZMetrics: [],
    minConsecutiveDays: 14,
    severity: 'high',
    personalizedDeviationStatement: 'Sirkadiyen düzenlilik indeksinin < %60 seviyesine inmesi, alışılmış rotalardan ani sapmalar veya gece amaçsız cihaz etkileşimi gözlendi.',
    ethicalDisclaimer: 'Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir.',
  },
  cognitivePattern3: {
    id: 'cognitive-pattern-rest-activity',
    insightType: 'CognitivePattern',
    title: 'Günlük Rutin Parçalanması ve İcra Yavaşlaması (Rest-Activity Fragmentation)',
    academicCitations: ['Boyle et al., 2025'],
    requiredMetrics: ['sedentaryFragmentationIndex', 'taskCompletionDuration'],
    requiredZMetrics: [],
    minConsecutiveDays: 14,
    severity: 'medium',
    personalizedDeviationStatement: 'Uygulama içi temel etkileşimleri tamamlama süresinde 2 kat uzama ve sedanter süre bloklarında aşırı parçalanma saptandı.',
    ethicalDisclaimer: 'Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir.',
  },
  cognitivePattern4: {
    id: 'cognitive-pattern-lexical-latency',
    insightType: 'CognitivePattern',
    title: 'Dilsel Akıcılık ve Kelime Bulma Duraksaması (Lexical Latency & Anomia)',
    academicCitations: ['Moon et al., 2025'],
    requiredMetrics: ['meanPauseLatencyMs', 'backspaceRate'],
    requiredZMetrics: [],
    minConsecutiveDays: 14,
    severity: 'high',
    personalizedDeviationStatement: 'Klavye yazımı esnasında sözcük içi/arası duraksama sıklığında kişisel bazale göre >= +2.5σ artış saptandı.',
    ethicalDisclaimer: 'Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir.',
  },
  cognitivePattern5: {
    id: 'cognitive-pattern-apathy-withdrawal',
    insightType: 'CognitivePattern',
    title: 'Sosyal Geri Çekilme ve Apati (Apathy & Behavioral Withdrawal)',
    academicCitations: ['Aalbers et al., 2025'],
    requiredMetrics: ['homestayPercentage', 'outboundInteractionCount'],
    requiredZMetrics: [],
    minConsecutiveDays: 14,
    severity: 'medium',
    personalizedDeviationStatement: 'Evde geçirilen sürenin >= %85 olması ve dışa dönük iletişim sıklığında belirgin düşüş gözlendi.',
    ethicalDisclaimer: 'Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir.',
  },
};
