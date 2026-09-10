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
    | 'ptsdHypervigilance'
    | 'lowSelfEsteemPassiveSocial';
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
    personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
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
    personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
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
    personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  neurodiversity: {
    id: 'neurodiversity-alert',
    insightType: 'neurodiversity',
    title: 'Nöroçeşitlilik (DEHB, Dikkat Dağınıklığı)',
    academicCitations: ['Slide 20 Clinical Phenotypes', 'StudentLife 2024'],
    requiredMetrics: ['appSwitchingIn15MinWindow', 'averageSessionLengthSeconds'],
    requiredZMetrics: ['session_switching_entropy'],
    minConsecutiveDays: 1,
    severity: 'medium',
    personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
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
    personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
  ptsdHypervigilance: {
    id: 'ptsd-hypervigilance-alert',
    insightType: 'ptsdHypervigilance',
    title: 'PTSD Belirtileri (Hipervijilans ve Kaçınma)',
    academicCitations: ['Slide 20 Clinical Phenotypes'],
    requiredMetrics: ['dailyUnlockCount', 'quickCheckRatioPercent'],
    requiredZMetrics: ['hyper_checking_ratio'],
    minConsecutiveDays: 1,
    severity: 'medium',
    personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
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
    personalizedDeviationStatement: 'Dijital aynanızda, kişisel olağan ritminizden farklılaşan bazı eğilimler gözlemlendi.',
    ethicalDisclaimer: 'Bu bir tıbbi teşhis değildir. Bu nesnel verileri hekiminizle veya psikiyatristinizle değerlendirmeniz önerilir.',
  },
};
