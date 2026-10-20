import { METRIC_DEFINITIONS, MetricKey } from '../types/sensor';
import { Insight, MoodReport } from '../types/engine';
import { ClinicalSurveyResult } from '../data/clinicalSurveys';
import { Medication, MedicationImpactReport, MedicationLog } from '../types/medication';
import { formatMedicationDosage, formatMedicationSchedule } from '../engine/medicationAnalytics';
import { getMetricCitations } from '../engine/metricReferences';
import {
  isNotable,
  NOTABLE_PERCENT,
  NOTABLE_Z,
  PinnedInsight,
  ReportAwarenessNote,
  ReportMetricStat,
  generateRealReportAwarenessNotes,
} from './reportBuilder';

/**
 * Single Source of Truth Template Identifier & Version.
 * Every doctor report shared or downloaded in the app MUST use this template.
 */
export const DOCTOR_REPORT_TEMPLATE_ID = 'STD-DMI-CLINICAL-PDF-V2' as const;
export const DOCTOR_REPORT_TEMPLATE_VERSION = '2.0' as const;
export const DOCTOR_REPORT_TEMPLATE_TITLE =
  'DİJİTAL MENTAL İKİZİM — STANDART HEKİM & TERAPİST RAPORU';
export const DOCTOR_REPORT_TEMPLATE_SUBTITLE =
  'Dijital Fenotipleme, EWMA Kişisel Baz Hattı ve 1/3/6 Aylık İlaç Etki Karşılaştırma Raporu';

export const DOCTOR_REPORT_SECTION_ORDER = [
  '1. YÖNETİCİ ÖZETİ & TEMEL KLİNİK GÖSTERGELER (HIZLI KIYASLAMA)',
  '2. ÖNE ÇIKAN BİYOBELİRTEÇ SAPMALARI (KİŞİSEL EWMA BAZ vs DÖNEM ORTALAMASI)',
  '3. GÜNLÜK İLAÇ KULLANIM PROTOKOLÜ, DOZ TAKİBİ & KLİNİK İLKELER',
  '4. İLAÇ ETKİ & ZAMAN SERİSİ BİNDİRME ANALİZİ (1 AY, 3 AY, 6 AY KARŞILAŞTIRMALI TABLO)',
  '5. KATEGORİLERE GÖRE TÜM SAYISAL GÖSTERGELER & EWMA BAZ HATTI KARŞILAŞTIRMA TABLOSU',
  '6. ÖZ-BİLDİRİM DUYGUDURUM, ENERJİ VE KLİNİK TARAMA ÖLÇEKLERİ (GAD-7 & PHQ-9)',
  '7. SİSTEM TARAFINDAN ÜRETİLEN FARKINDALIK NOTLARI & DANIŞAN İÇGÖRÜLERİ',
  '8. AKADEMİK KAYNAKÇA, METODOLOJİ REHBERİ VE YASAL UYARI',
] as const;

export const CATEGORY_LABELS_TR: Record<string, string> = {
  session: 'Oturum, Ekran ve Gece Kullanımı',
  typing: 'Klavye ve Yazım Dinamiği (Psikomotor)',
  touch: 'Dokunma ve Kaydırma Etkileşimi',
  sleep: 'Uyku ve Sirkadiyen Ritim (Apple Sağlık)',
  motion: 'Fiziksel Hareketlilik ve Mobilite',
  light: 'Ortam Işığı ve Gece Işık Maruziyeti',
  battery: 'Cihaz Pil ve Şarj Telemetrisi',
  network: 'Ağ ve Bağlantı Sürekliliği',
  voice: 'Ses Tonu ve Konuşma Akıcılığı',
};

const HEALTHY_TREND_LABELS_TR: Record<'higher' | 'lower' | 'balanced', string> = {
  higher: 'Yüksek değer olumlu',
  lower: 'Düşük değer olumlu',
  balanced: 'Kişisel baz dengesi önemli',
};

export interface CanonicalDoctorReportInput {
  patientName: string;
  patientEmail?: string;
  rangeDays: number;
  generatedAt?: Date;
  effectiveDayCount?: number;
  baselineStatus?: string;
  stats: ReportMetricStat[];
  medications?: Medication[];
  todaysLogs?: MedicationLog[];
  medImpactReports?: MedicationImpactReport[];
  moods?: MoodReport[];
  surveys?: ClinicalSurveyResult[];
  awarenessNotes?: ReportAwarenessNote[];
  pinnedInsights?: PinnedInsight[];
  insights?: Insight[];
}

export interface ReportKpiComparisonCard {
  id: string;
  title: string;
  primaryValue: string;
  comparisonLabel: string;
  statusTone: 'emerald' | 'amber' | 'rose' | 'navy' | 'teal';
  explanation: string;
}

export interface NotableComparisonRow {
  key: MetricKey;
  label: string;
  categoryLabel: string;
  unit: string;
  description: string;
  healthyTrendLabel: string;
  baselineText: string;
  periodAvgText: string;
  deviationPercent: number;
  deviationText: string;
  zScore: number;
  zScoreText: string;
  severityLevel: 'high' | 'moderate' | 'normal';
  directionLabel: string;
  clinicalInterpretation: string;
  comparisonBarRatio: number; // -100 to +100
  citationsText: string;
}

export interface DailyMedicationProtocolRow {
  id: number | string;
  name: string;
  dosage: string;
  startDate: string;
  daysActive: number;
  schedule: string;
  administrationRule: string;
  clinicalPurpose: string;
  todayStatusLabel: string;
  isTakenToday: boolean;
}

export interface MedicationMultiPeriodTemplateRow {
  metricKey: MetricKey;
  label: string;
  unit: string;
  pre1MonthText: string;
  pre3MonthsText: string;
  pre6MonthsText: string;
  postOverallText: string;
  postWindowsDetailText: string;
  delta1MText: string;
  delta3MText: string;
  delta6MText: string;
  combinedDeltaText: string;
  direction: 'improved' | 'declined' | 'stable' | 'insufficient_data';
  directionBadge: string;
  interpretation: string;
}

export interface MedicationImpactTemplateSection {
  medicationName: string;
  dosage: string;
  startDate: string;
  daysActive: number;
  schedule: string;
  notes: string;
  sampleWindowSummary: string;
  timeSeriesOverlaySummary: string;
  overallClinicalSummary: string;
  affectiveComparisonText: string | null;
  rows: MedicationMultiPeriodTemplateRow[];
}

export interface CategorizedMetricTemplateRow {
  key: MetricKey;
  label: string;
  category: string;
  categoryLabel: string;
  unit: string;
  description: string;
  healthyTrendLabel: string;
  hasData: boolean;
  baselineText: string;
  periodAvgText: string;
  deviationText: string;
  zScoreText: string;
  statusBadge: string;
  statusTone: 'emerald' | 'amber' | 'rose' | 'slate';
  clinicalMeaning: string;
  citationsText: string;
}

export interface CategorizedMetricsGroup {
  categoryKey: string;
  categoryTitle: string;
  activeCount: number;
  totalCount: number;
  rows: CategorizedMetricTemplateRow[];
}

export interface UnavailableMetricRow {
  key: MetricKey;
  label: string;
  categoryLabel: string;
  reason: string;
}

export interface MoodAndSurveyComparisonSection {
  moodSummary: {
    hasMoodData: boolean;
    sampleCount: number;
    avgMoodText: string;
    avgEnergyText: string;
    minMaxMoodText: string;
    topTagsText: string;
    clinicalInterpretation: string;
  };
  surveyComparison: {
    hasSurvey: boolean;
    latestDate: string;
    previousDate: string | null;
    gad7CurrentText: string;
    gad7PreviousText: string;
    gad7DeltaText: string;
    gad7Risk: string;
    phq9CurrentText: string;
    phq9PreviousText: string;
    phq9DeltaText: string;
    phq9Risk: string;
    clinicalInterpretation: string;
  };
}

export interface CanonicalDoctorReportModel {
  templateId: typeof DOCTOR_REPORT_TEMPLATE_ID;
  templateVersion: typeof DOCTOR_REPORT_TEMPLATE_VERSION;
  documentTitle: string;
  documentSubtitle: string;
  sectionOrder: readonly string[];
  filename: string;
  metadata: {
    patientName: string;
    patientEmail: string;
    reportDateStr: string;
    reportIsoDate: string;
    periodLabel: string;
    rangeDays: number;
    effectiveDayCount: number;
    baselineStatus: string;
    activeMetricsCount: number;
    totalMetricsCount: number;
    unavailableMetricsCount: number;
    notableDeviationsCount: number;
  };
  kpiCards: ReportKpiComparisonCard[];
  executiveSummary: {
    narrative: string;
    clinicianReadingGuide: string[];
  };
  notableComparisons: NotableComparisonRow[];
  dailyMedications: {
    protocols: DailyMedicationProtocolRow[];
    safetyPrinciples: { title: string; body: string }[];
  };
  medicationImpactSections: MedicationImpactTemplateSection[];
  categorizedMetrics: CategorizedMetricsGroup[];
  allMetricRows: CategorizedMetricTemplateRow[];
  unavailableMetrics: UnavailableMetricRow[];
  moodAndSurveyComparison: MoodAndSurveyComparisonSection;
  awarenessNotes: ReportAwarenessNote[];
  pinnedInsights: PinnedInsight[];
  bibliographyAndMethodology: {
    references: { index: number; citation: string }[];
    unreferencedMetricsText: string;
    methodologyPoints: string[];
    legalDisclaimer: string;
  };
}

function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const factor = Math.pow(10, digits);
  return String(Math.round(n * factor) / factor);
}

function fmtSigned(n: number | null | undefined, suffix = '', digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const rounded = Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits);
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`;
}

function interpretMetricDeviation(stat: ReportMetricStat): {
  directionLabel: string;
  clinicalInterpretation: string;
  severityLevel: 'high' | 'moderate' | 'normal';
} {
  const def = METRIC_DEFINITIONS[stat.key];
  const desc = def?.description || 'Cihaz içi dijital biyobelirteç ölçümü.';
  if (!stat.hasData || stat.periodAvg === null || stat.baselineMean === null) {
    return {
      directionLabel: 'Veri Bekleniyor',
      clinicalInterpretation: stat.unavailableReason || desc,
      severityLevel: 'normal',
    };
  }

  const z = stat.zScore ?? 0;
  const absZ = Math.abs(z);
  const pct = stat.deviationPercent ?? 0;
  const absPct = Math.abs(pct);

  const severityLevel: 'high' | 'moderate' | 'normal' =
    absZ >= 2.0 || absPct >= 35
      ? 'high'
      : absZ >= NOTABLE_Z || absPct >= NOTABLE_PERCENT
      ? 'moderate'
      : 'normal';

  const dirWord = pct > 3 ? 'Artış' : pct < -3 ? 'Azalma' : 'Stabil';
  const directionLabel =
    severityLevel === 'high'
      ? `Belirgin ${dirWord} (Anomali)`
      : severityLevel === 'moderate'
      ? `Orta Düzey ${dirWord} (İzlem)`
      : 'Kişisel Baz İle Uyumlu';

  let clinicalContext = '';
  if (stat.key === 'night_usage_minutes' || stat.key === 'night_light_violations' || stat.key === 'sleep_waso' || stat.key === 'sleep_sol') {
    clinicalContext =
      pct > 15
        ? 'Gece dinlenme penceresinde bölünme veya uyanıklık artışı; sirkadiyen ritim açısından izlenmelidir.'
        : pct < -15
        ? 'Gece uyanıklık/maruziyet süresinde azalma; sirkadiyen regülasyon açısından olumlu yönelim.'
        : 'Sirkadiyen dinlenme penceresi kişisel baz düzeyinde dengeli.';
  } else if (stat.key === 'typing_wpm' || stat.key === 'typing_iki' || stat.key === 'typing_backspace_rate' || stat.key === 'typing_hold_time' || stat.key === 'typing_pause_count') {
    clinicalContext =
      stat.key === 'typing_wpm'
        ? pct < -15
          ? 'Yazım temposunda yavaşlama; psikomotor retardasyon, sedasyon veya bilişsel yorgunlukla ilişkili olabilir.'
          : pct > 15
          ? 'Yazım temposunda hızlanma; psikomotor aktivasyon artışı.'
          : 'Psikomotor yazım akıcılığı kişisel baz ile uyumlu.'
        : pct > 15
        ? 'Yazım gecikmesi/düzeltme oranında artış; dikkat dağınıklığı veya bilişsel yük sinyali olabilir.'
        : pct < -15
        ? 'Hata/gecikme oranında azalma; dikkat ve yürütücü işlev regülasyonu.'
        : 'Psikomotor tuş vuruş dinamikleri olağan aralıkta.';
  } else if (stat.key === 'mobility_index' || stat.key === 'mobility_radius' || stat.key === 'sleep_duration' || stat.key === 'sleep_efficiency') {
    clinicalContext =
      pct < -15
        ? 'Kişisel baza göre düşüş; davranışsal geri çekilme, enerji azalması veya uyku süresi kısalması yönünden değerlendirilebilir.'
        : pct > 15
        ? 'Kişisel baza göre artış; davranışsal aktivasyon ve toparlanma eğilimi.'
        : 'Kişisel baz çizgisiyle uyumlu, dengeli seyir.';
  } else if (stat.key === 'cognitive_fatigue_score' || stat.key === 'impulse_risk_index') {
    clinicalContext =
      pct > 15
        ? 'Kişisel baza kıyasla yükselme; bilişsel yük veya dürtüsel kırılganlık penceresine işaret edebilir.'
        : pct < -15
        ? 'Kişisel baza kıyasla gerileme; öz-denetim ve zihinsel dinlenme dengesinde iyileşme.'
        : 'Kişisel baz aralığında dengeli.';
  } else {
    clinicalContext =
      severityLevel === 'normal'
        ? `${desc} Kişisel EWMA baz hattı ile uyumlu seyretmektedir.`
        : `${desc} Kişisel EWMA baz hattına kıyasla ${fmtSigned(pct, '%')} (${fmtSigned(z, ' SD')}) değişim saptanmıştır.`;
  }

  return {
    directionLabel,
    clinicalInterpretation: clinicalContext,
    severityLevel,
  };
}

/**
 * Builds the canonical, deterministic Doctor Report model used across ALL PDF exports,
 * native shares, web shares, and print views.
 */
export function buildCanonicalDoctorReportTemplate(
  input: CanonicalDoctorReportInput
): CanonicalDoctorReportModel {
  const generatedAt = input.generatedAt ?? new Date();
  const reportIsoDate = generatedAt.toISOString().split('T')[0];
  const reportDateStr = generatedAt.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const patientName = (input.patientName || 'Danışan').trim() || 'Danışan';
  const patientEmail = (input.patientEmail || '').trim();
  const rangeDays = input.rangeDays || 14;
  const effectiveDayCount = input.effectiveDayCount ?? rangeDays;

  const baselineStatus =
    input.baselineStatus ||
    (effectiveDayCount >= 14
      ? `14 Günlük Kişisel EWMA Baz Hattı Tamamlandı (${effectiveDayCount} gün veri)`
      : `Kişisel EWMA Baz Hattı Öğrenme Sürecinde (${effectiveDayCount}/14 gün)`);

  const stats = input.stats || [];
  const activeStats = stats.filter((s) => s.hasData && s.periodAvg !== null);
  const unavailableStats = stats.filter((s) => !s.hasData || s.periodAvg === null);
  const notableStats = activeStats
    .filter(isNotable)
    .sort((a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0));

  // Build academic reference numbering in order of appearance
  const refIndex = new Map<string, number>();
  const resolveRefs = (key: MetricKey): string => {
    const cites = getMetricCitations(key);
    if (cites.length === 0) return 'Teknik Ölçüm';
    const nums = cites.map((c) => {
      if (!refIndex.has(c)) refIndex.set(c, refIndex.size + 1);
      return refIndex.get(c)!;
    });
    return `[${nums.join(', ')}]`;
  };

  // Notable comparisons table
  const notableComparisons: NotableComparisonRow[] = notableStats.map((st) => {
    const def = METRIC_DEFINITIONS[st.key];
    const interp = interpretMetricDeviation(st);
    const pct = st.deviationPercent ?? 0;
    const clampedBar = Math.max(-100, Math.min(100, pct));
    return {
      key: st.key,
      label: st.label,
      categoryLabel: CATEGORY_LABELS_TR[st.category] || st.category,
      unit: st.unit,
      description: def?.description || '',
      healthyTrendLabel: def ? HEALTHY_TREND_LABELS_TR[def.healthyTrend] : '',
      baselineText: `${fmtNum(st.baselineMean)} ${st.unit}`,
      periodAvgText: `${fmtNum(st.periodAvg)} ${st.unit}`,
      deviationPercent: pct,
      deviationText: fmtSigned(pct, '%', 0),
      zScore: st.zScore ?? 0,
      zScoreText: `${fmtSigned(st.zScore, 'σ', 1)}`,
      severityLevel: interp.severityLevel,
      directionLabel: interp.directionLabel,
      clinicalInterpretation: interp.clinicalInterpretation,
      comparisonBarRatio: clampedBar,
      citationsText: resolveRefs(st.key),
    };
  });

  // Categorized metrics table (all metrics)
  const categoryOrder = ['session', 'typing', 'touch', 'sleep', 'motion', 'light', 'battery', 'network', 'voice'];
  const allMetricRows: CategorizedMetricTemplateRow[] = stats.map((st) => {
    const def = METRIC_DEFINITIONS[st.key];
    const interp = interpretMetricDeviation(st);
    const cites = st.hasData ? resolveRefs(st.key) : '—';

    let statusBadge = 'Veri Bekleniyor';
    let statusTone: 'emerald' | 'amber' | 'rose' | 'slate' = 'slate';
    if (st.hasData) {
      if (interp.severityLevel === 'high') {
        statusBadge = 'Belirgin Sapma (|Z|≥2.0)';
        statusTone = 'rose';
      } else if (interp.severityLevel === 'moderate') {
        statusBadge = 'Sapma / İzlem (|Z|≥1.5)';
        statusTone = 'amber';
      } else {
        statusBadge = 'Dengeli / Normal';
        statusTone = 'emerald';
      }
    }

    return {
      key: st.key,
      label: st.label,
      category: st.category,
      categoryLabel: CATEGORY_LABELS_TR[st.category] || st.category,
      unit: st.unit,
      description: def?.description || '',
      healthyTrendLabel: def ? HEALTHY_TREND_LABELS_TR[def.healthyTrend] : '',
      hasData: st.hasData,
      baselineText: st.hasData && st.baselineMean !== null ? `${fmtNum(st.baselineMean)} ${st.unit}` : '—',
      periodAvgText: st.hasData && st.periodAvg !== null ? `${fmtNum(st.periodAvg)} ${st.unit}` : '—',
      deviationText:
        st.hasData && st.deviationPercent !== null ? fmtSigned(st.deviationPercent, '%', 0) : '—',
      zScoreText: st.hasData && st.zScore !== null ? fmtSigned(st.zScore, 'σ', 1) : '—',
      statusBadge,
      statusTone,
      clinicalMeaning: st.hasData
        ? `${interp.clinicalInterpretation}${cites !== 'Teknik Ölçüm' ? ` (Kaynak: ${cites})` : ''}`
        : st.unavailableReason || 'Sensör verisi bekleniyor',
      citationsText: cites,
    };
  });

  const categorizedMetrics: CategorizedMetricsGroup[] = [];
  for (const catKey of categoryOrder) {
    const rows = allMetricRows.filter((r) => r.category === catKey);
    if (rows.length === 0) continue;
    categorizedMetrics.push({
      categoryKey: catKey,
      categoryTitle: CATEGORY_LABELS_TR[catKey] || catKey,
      activeCount: rows.filter((r) => r.hasData).length,
      totalCount: rows.length,
      rows,
    });
  }

  const unavailableMetrics: UnavailableMetricRow[] = unavailableStats.map((st) => ({
    key: st.key,
    label: st.label,
    categoryLabel: CATEGORY_LABELS_TR[st.category] || st.category,
    reason: st.unavailableReason || 'Sensör izni veya kullanım etkileşimi bekleniyor.',
  }));

  // Daily Medication Protocols & Dose Tracking
  const medications = input.medications || [];
  const todaysLogs = input.todaysLogs || [];
  const medImpactReports = input.medImpactReports || [];

  // If medications weren't passed directly but medImpactReports were, derive medications from medImpactReports
  const effectiveMedications: Medication[] =
    medications.length > 0 ? medications : medImpactReports.map((ir) => ir.medication);

  const dailyProtocols: DailyMedicationProtocolRow[] = effectiveMedications.map((med, idx) => {
    const isTakenToday = med.id ? todaysLogs.some((l) => l.medicationId === med.id && l.taken) : false;
    const matchedImpact = medImpactReports.find(
      (ir) => (med.id && ir.medication.id === med.id) || ir.medication.name === med.name
    );
    const startMs = new Date(med.startDate).getTime();
    const nowMs = generatedAt.getTime();
    const daysActive =
      matchedImpact?.daysActive ?? Math.max(1, Math.round((nowMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

    return {
      id: med.id ?? `${med.name}-${idx}`,
      name: med.name,
      dosage: formatMedicationDosage(med.dosage),
      startDate: med.startDate,
      daysActive,
      schedule: formatMedicationSchedule(med),
      administrationRule: 'Tok karnına, 1 tam bardak su ile',
      clinicalPurpose: med.notes || 'Duygudurum ve sirkadiyen ritim regülasyonu',
      todayStatusLabel: isTakenToday ? 'Alındı (Tamamlandı)' : 'Bekliyor / Kayıt Yok',
      isTakenToday,
    };
  });

  const safetyPrinciples = [
    {
      title: '1. Dozaj ve Zaman Disiplini',
      body: 'İlaçlar her gün hekim tarafından belirlenen aynı saat diliminde alınmalıdır. Unutulan dozu telafi etmek için çift doz alınmamalıdır.',
    },
    {
      title: '2. Açlık/Tokluk ve Biyoyararlanım',
      body: 'Mide hassasiyetini önlemek için tok karnına ve 1 tam bardak su ile yutulmalıdır. Greyfurt suyu, alkol ve aşırı kafeinle birlikte alınmamalıdır.',
    },
    {
      title: '3. Tedaviyi Aniden Kesmeme İlkesi',
      body: 'Öznel iyileşme hissedilse dahi hekim onayı olmadan ilaç aniden bırakılmamalı veya doz azaltılmamalıdır.',
    },
    {
      title: '4. Sirkadiyen Uyum ve İzlem',
      body: 'Sedatif etkili ilaçlar gece dinlenme penceresinden 30-45 dk önce alınmalı; uyku ve psikomotor etkileri bu rapordaki T0 bindirme tablosundan izlenmelidir.',
    },
  ];

  // Medication Impact 1M / 3M / 6M Comparative Sections
  const medicationImpactSections: MedicationImpactTemplateSection[] = medImpactReports.map((ir) => {
    const rows: MedicationMultiPeriodTemplateRow[] = ir.multiPeriodTable.map((row) => {
      const pre1Text =
        row.pre1Month.avg !== null
          ? `${row.pre1Month.avg} ${row.unit} (${row.pre1Month.sampleDays}g)`
          : 'Kayıt yok (—)';
      const pre3Text =
        row.pre3Months.avg !== null
          ? `${row.pre3Months.avg} ${row.unit} (${row.pre3Months.sampleDays}g)`
          : 'Kayıt yok (—)';
      const pre6Text =
        row.pre6Months.avg !== null
          ? `${row.pre6Months.avg} ${row.unit} (${row.pre6Months.sampleDays}g)`
          : 'Kayıt yok (—)';
      const postOverallText =
        row.postOverall.avg !== null
          ? `${row.postOverall.avg} ${row.unit} (${row.postOverall.sampleDays}g)`
          : 'Kayıt yok (—)';
      const postWindowsDetailText =
        row.postOverall.avg !== null
          ? `1A: ${row.post1Month.avg ?? '—'} | 3A: ${row.post3Months.avg ?? '—'} | 6A: ${row.post6Months.avg ?? '—'}`
          : '—';

      const d1 = fmtSigned(row.pre1Month.changePercent, '%', 0);
      const d3 = fmtSigned(row.pre3Months.changePercent, '%', 0);
      const d6 = fmtSigned(row.pre6Months.changePercent, '%', 0);

      const directionBadge =
        row.direction === 'improved'
          ? 'Olumlu Regülasyon'
          : row.direction === 'declined'
          ? 'Dalgalanma / İzlem'
          : row.direction === 'stable'
          ? 'Stabil Seyir'
          : 'Veri Birikiyor';

      return {
        metricKey: row.metricKey,
        label: row.label,
        unit: row.unit,
        pre1MonthText: pre1Text,
        pre3MonthsText: pre3Text,
        pre6MonthsText: pre6Text,
        postOverallText,
        postWindowsDetailText,
        delta1MText: d1,
        delta3MText: d3,
        delta6MText: d6,
        combinedDeltaText: `1A: ${d1} | 3A: ${d3} | 6A: ${d6}`,
        direction: row.direction,
        directionBadge,
        interpretation: row.interpretation,
      };
    });

    const affectiveComparisonText =
      ir.affectiveStateBefore !== null || ir.affectiveStateAfter !== null
        ? `Öznel Duygudurum Endeksi (0-100): İlaç Öncesi ${
            ir.affectiveStateBefore !== null ? `${ir.affectiveStateBefore}/100` : 'Kayıt yok (—)'
          } -> İlaç Başladıktan Sonra ${
            ir.affectiveStateAfter !== null ? `${ir.affectiveStateAfter}/100` : 'Kayıt yok (—)'
          }`
        : null;

    return {
      medicationName: ir.medication.name,
      dosage: ir.formattedDosage,
      startDate: ir.medication.startDate,
      daysActive: ir.daysActive,
      schedule: ir.formattedSchedule,
      notes: ir.medication.notes || 'Hekim tedavi protokolü',
      sampleWindowSummary: `İlaç Öncesi Kayıtlı Gün: 1 Ay (${ir.pre1MonthSampleDays}g) / 3 Ay (${ir.pre3MonthsSampleDays}g) / 6 Ay (${ir.pre6MonthsSampleDays}g) • İlaç Sonrası: ${ir.postSampleDays ?? 0}g`,
      timeSeriesOverlaySummary: ir.timeSeriesOverlaySummary,
      overallClinicalSummary: ir.overallSummary,
      affectiveComparisonText,
      rows,
    };
  });

  // Mood & Clinical Survey Comparison Section
  const moods = input.moods || [];
  const cutoffDate = new Date(generatedAt);
  cutoffDate.setDate(cutoffDate.getDate() - rangeDays);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  const periodMoods = moods.filter((m) => m.date >= cutoffStr);

  let moodSummary: MoodAndSurveyComparisonSection['moodSummary'];
  if (periodMoods.length > 0) {
    const scores = periodMoods.map((m) => m.score);
    const avgMood = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const minMood = Math.min(...scores);
    const maxMood = Math.max(...scores);
    const energies = periodMoods
      .filter((m) => typeof m.energyScore === 'number')
      .map((m) => m.energyScore as number);
    const avgEnergy =
      energies.length > 0
        ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
        : null;

    const tagCounts = new Map<string, number>();
    for (const m of periodMoods) {
      for (const t of m.tags || []) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag, count]) => `${tag} (${count}x)`);

    moodSummary = {
      hasMoodData: true,
      sampleCount: periodMoods.length,
      avgMoodText: `${avgMood} / 5.0`,
      avgEnergyText: avgEnergy !== null ? `${avgEnergy} / 5.0` : 'Kayıt yok',
      minMaxMoodText: `En düşük: ${minMood}/5 • En yüksek: ${maxMood}/5`,
      topTagsText: topTags.length > 0 ? topTags.join(', ') : 'Etiket seçilmedi',
      clinicalInterpretation:
        avgMood <= 2.4
          ? 'Dönem içi öznel duygudurum ortalaması düşük seyretmektedir; pasif sensör sapmaları ile birlikte değerlendirilmesi önerilir.'
          : avgMood >= 3.8
          ? 'Dönem içi öznel duygudurum ve enerji algısı dengeli/olumlu düzeydedir.'
          : 'Öznel duygudurum orta/dalgalı aralıkta seyretmektedir.',
    };
  } else {
    moodSummary = {
      hasMoodData: false,
      sampleCount: 0,
      avgMoodText: 'Kayıt yok (—)',
      avgEnergyText: 'Kayıt yok (—)',
      minMaxMoodText: '—',
      topTagsText: 'Bu dönemde günlük duygudurum kaydı girilmedi',
      clinicalInterpretation:
        'Kullanıcı bu analiz penceresinde öz-bildirim duygudurum girişi yapmamıştır; değerlendirme pasif biyobelirteçler üzerinden yürütülmüştür.',
    };
  }

  const surveys = [...(input.surveys || [])].sort((a, b) => b.timestamp - a.timestamp);
  let surveyComparison: MoodAndSurveyComparisonSection['surveyComparison'];
  if (surveys.length > 0) {
    const latest = surveys[0];
    const prev = surveys[1] || null;
    const gadDelta = prev ? latest.gad7Score - prev.gad7Score : null;
    const phqDelta = prev ? latest.phq9Score - prev.phq9Score : null;

    surveyComparison = {
      hasSurvey: true,
      latestDate: latest.date,
      previousDate: prev ? prev.date : null,
      gad7CurrentText: `${latest.gad7Score} / 21`,
      gad7PreviousText: prev ? `${prev.gad7Score} / 21 (${prev.date})` : 'Önceki kayıt yok',
      gad7DeltaText:
        gadDelta !== null
          ? `${gadDelta > 0 ? `+${gadDelta}` : gadDelta} puan (${
              gadDelta < 0 ? 'Gerileme/İyileşme' : gadDelta > 0 ? 'Artış' : 'Değişim yok'
            })`
          : 'İlk ölçüm (Baz)',
      gad7Risk: latest.gad7Risk,
      phq9CurrentText: `${latest.phq9Score} / 27`,
      phq9PreviousText: prev ? `${prev.phq9Score} / 27 (${prev.date})` : 'Önceki kayıt yok',
      phq9DeltaText:
        phqDelta !== null
          ? `${phqDelta > 0 ? `+${phqDelta}` : phqDelta} puan (${
              phqDelta < 0 ? 'Gerileme/İyileşme' : phqDelta > 0 ? 'Artış' : 'Değişim yok'
            })`
          : 'İlk ölçüm (Baz)',
      phq9Risk: latest.phq9Risk,
      clinicalInterpretation:
        latest.gad7Score >= 10 || latest.phq9Score >= 10
          ? `Son klinik tarama ölçeklerinde orta/üzeri belirti düzeyi (GAD-7: ${latest.gad7Risk}, PHQ-9: ${latest.phq9Risk}) kaydedilmiştir. Klinik görüşmede öncelikli ele alınması önerilir.`
          : `Son klinik tarama ölçekleri hafif/minimal aralıktadır (GAD-7: ${latest.gad7Risk}, PHQ-9: ${latest.phq9Risk}).`,
    };
  } else {
    surveyComparison = {
      hasSurvey: false,
      latestDate: '—',
      previousDate: null,
      gad7CurrentText: 'Uygulanmadı (—)',
      gad7PreviousText: '—',
      gad7DeltaText: '—',
      gad7Risk: 'Kayıt yok',
      phq9CurrentText: 'Uygulanmadı (—)',
      phq9PreviousText: '—',
      phq9DeltaText: '—',
      phq9Risk: 'Kayıt yok',
      clinicalInterpretation:
        'Sistemde henüz tamamlanmış GAD-7 veya PHQ-9 klinik tarama ölçeği kaydı bulunmamaktadır.',
    };
  }

  // Awareness notes
  const awarenessNotes =
    input.awarenessNotes ??
    generateRealReportAwarenessNotes({
      stats,
      insights: input.insights,
      moods,
      surveys,
      medImpactReports,
      effectiveDayCount,
      rangeDays,
    });

  // Also register any citations from awareness notes and pinned insights into bibliography
  for (const note of awarenessNotes) {
    for (const c of note.sources || []) {
      if (!refIndex.has(c)) refIndex.set(c, refIndex.size + 1);
    }
  }
  const pinnedInsights = input.pinnedInsights || [];
  for (const p of pinnedInsights) {
    for (const c of p.sources || []) {
      if (!refIndex.has(c)) refIndex.set(c, refIndex.size + 1);
    }
  }

  // Executive KPI Comparison Cards
  const takenMedCount = dailyProtocols.filter((d) => d.isTakenToday).length;
  const kpiCards: ReportKpiComparisonCard[] = [
    {
      id: 'kpi-coverage',
      title: 'Biyobelirteç Kapsamı',
      primaryValue: `${activeStats.length} / ${stats.length} Aktif`,
      comparisonLabel: `Son ${rangeDays} Gün • Baz: ${effectiveDayCount}/14g`,
      statusTone: activeStats.length >= 8 ? 'emerald' : 'teal',
      explanation: `${activeStats.length} gösterge gerçek sensör verisiyle ölçüldü, ${unavailableStats.length} gösterge izin/etkileşim bekliyor.`,
    },
    {
      id: 'kpi-deviations',
      title: 'EWMA Baz Hattı Kıyaslaması',
      primaryValue:
        notableComparisons.length > 0 ? `${notableComparisons.length} Belirgin Sapma` : 'Sapma Saptanmadı',
      comparisonLabel: `Eşik: |Z| >= ${NOTABLE_Z} veya |%| >= %${NOTABLE_PERCENT}`,
      statusTone:
        notableComparisons.some((n) => n.severityLevel === 'high')
          ? 'rose'
          : notableComparisons.length > 0
          ? 'amber'
          : 'emerald',
      explanation:
        notableComparisons.length > 0
          ? `${notableComparisons.slice(0, 2).map((n) => `${n.label} (${n.deviationText})`).join(', ')} öne çıkıyor.`
          : 'Aktif göstergelerin tamamı kişinin kendi olağan baz aralığında seyrediyor.',
    },
    {
      id: 'kpi-mood-survey',
      title: 'Öznel Ruh Hali & Ölçekler',
      primaryValue: moodSummary.hasMoodData ? `Ruh Hali: ${moodSummary.avgMoodText}` : 'Öz-Bildirim Yok',
      comparisonLabel: surveyComparison.hasSurvey
        ? `GAD-7: ${surveyComparison.gad7CurrentText} | PHQ-9: ${surveyComparison.phq9CurrentText}`
        : `Enerji: ${moodSummary.avgEnergyText}`,
      statusTone:
        surveyComparison.hasSurvey && (surveys[0].gad7Score >= 10 || surveys[0].phq9Score >= 10)
          ? 'amber'
          : 'navy',
      explanation: moodSummary.hasMoodData
        ? `${moodSummary.sampleCount} günlük öz-bildirim kaydı mevcuttur.`
        : 'Değerlendirme nesnel sensör telemetrisiyle yapılmıştır.',
    },
    {
      id: 'kpi-medication',
      title: 'Tedavi & İlaç Protokolü',
      primaryValue:
        dailyProtocols.length > 0 ? `${dailyProtocols.length} Aktif İlaç` : 'Kayıtlı İlaç Yok',
      comparisonLabel:
        dailyProtocols.length > 0
          ? `Bugünkü Doz: ${takenMedCount}/${dailyProtocols.length} Alındı`
          : '1A/3A/6A Tablo Şablonu Hazır',
      statusTone: 'teal',
      explanation:
        dailyProtocols.length > 0
          ? `${dailyProtocols.map((p) => `${p.name} (${p.dosage})`).join(', ')} takip ediliyor.`
          : 'İlaç eklendiğinde T0 öncesi/sonrası 1, 3 ve 6 aylık değişimler otomatik hesaplanır.',
    },
  ];

  const references = Array.from(refIndex.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([citation, index]) => ({ index, citation }));

  const noRefMetrics = activeStats.filter((s) => getMetricCitations(s.key).length === 0);
  const unreferencedMetricsText =
    noRefMetrics.length > 0
      ? `Teknik/yardımcı ölçüm göstergeleri (doğrudan klinik fenotip kuralı dışındaki donanım telemetrisi): ${noRefMetrics
          .map((s) => s.label)
          .join(', ')}.`
      : 'Rapordaki tüm aktif biyobelirteçlerin akademik literatür eşlemesi mevcuttur.';

  const safePatientSlug = patientName
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Danisan';

  return {
    templateId: DOCTOR_REPORT_TEMPLATE_ID,
    templateVersion: DOCTOR_REPORT_TEMPLATE_VERSION,
    documentTitle: DOCTOR_REPORT_TEMPLATE_TITLE,
    documentSubtitle: DOCTOR_REPORT_TEMPLATE_SUBTITLE,
    sectionOrder: DOCTOR_REPORT_SECTION_ORDER,
    filename: `Dijital_Mental_Ikizim_Hekim_Raporu_${safePatientSlug}_${reportIsoDate}.pdf`,
    metadata: {
      patientName,
      patientEmail,
      reportDateStr,
      reportIsoDate,
      periodLabel: `Son ${rangeDays} Gün`,
      rangeDays,
      effectiveDayCount,
      baselineStatus,
      activeMetricsCount: activeStats.length,
      totalMetricsCount: stats.length,
      unavailableMetricsCount: unavailableStats.length,
      notableDeviationsCount: notableComparisons.length,
    },
    kpiCards,
    executiveSummary: {
      narrative: `${patientName} adlı danışanın son ${rangeDays} günlük cihaz içi pasif biyobelirteçleri (yazım ritmi, hata düzeltme oranı, dokunma dinamiği, gece ekran maruziyeti, hareketlilik ve uyku göstergeleri), kişinin kendi geçmiş verisinden hesaplanan Üstel Ağırlıklı Hareketli Ortalama (EWMA) kişisel baz hattı ile boylamsal olarak karşılaştırılmıştır. Toplam ${stats.length} göstergeden ${activeStats.length} tanesi aktif ölçüm üretmiş olup ${notableComparisons.length} göstergede istatistiksel olarak dikkate değer değişim (|Z| >= ${NOTABLE_Z} veya |Değişim| >= %${NOTABLE_PERCENT}) gözlenmiştir.`,
      clinicianReadingGuide: [
        'Kişisel EWMA Baz vs Dönem Ortalaması: Danışan nüfus ortalamasıyla değil, kendi 14 günlük olağan baz çizgisiyle kıyaslanır (Hatırlama Yanlılığını / Recall Bias aşmak için).',
        'Değişim (%) ve Z-Skoru (SD): |Z| < 1.5 olağan dalgalanmayı, 1.5 <= |Z| < 2.0 orta düzey sapmayı (izlem), |Z| >= 2.0 ise belirgin istatistiksel anomaliyi temsil eder.',
        'İlaç T0 Bindirme Analizi (1A / 3A / 6A): İlaç başlama tarihi (T0) öncesindeki 1, 3 ve 6 aylık ortalamalar ile ilaç sonrası dönem yan yana kıyaslanarak tedavi yanıtı ve sedasyon/sirkadiyen etkiler nesnel olarak izlenir.',
      ],
    },
    notableComparisons,
    dailyMedications: {
      protocols: dailyProtocols,
      safetyPrinciples,
    },
    medicationImpactSections,
    categorizedMetrics,
    allMetricRows,
    unavailableMetrics,
    moodAndSurveyComparison: {
      moodSummary,
      surveyComparison,
    },
    awarenessNotes,
    pinnedInsights,
    bibliographyAndMethodology: {
      references,
      unreferencedMetricsText,
      methodologyPoints: [
        'EWMA Kişisel Baz Hattı: Her biyobelirteç için kişinin kendi geçmiş günlük ölçümlerinden üstel ağırlıklı hareketli ortalama (EWMA) ve büzülmüş standart sapma hesaplanır.',
        'Z-Skoru Hesaplaması: Z = (Dönem Ortalaması - Kişisel EWMA Baz) / Baz Standart Sapması formülüyle kişinin kendi normuna göre kaç standart sapma uzaklaştığı ölçülür.',
        'Sıfır-Kurgu (Zero-Mock) İlkesi: İzin verilmeyen veya ölçüm alınamayan hiçbir sensör için tahmini/sentetik sayı üretilmez; veri durumu şeffaf biçimde raporlanır.',
      ],
      legalDisclaimer:
        'YASAL VE TIBBİ UYARI: Bu rapor standart klinik karar-destek şablonu (STD-DMI-CLINICAL-PDF-V2) ile otomatik üretilmiştir ve tıbbi teşhis/tanı belgesi değildir. Yorumlama, tanı ve tedavi planlaması münhasıran yetkili hekim ve terapistlere aittir.',
    },
  };
}

// ============================================================================
// TRUE VECTOR A4 PDF 1.4 GENERATOR (WITH FULL TURKISH GLYPH ENCODING)
// ============================================================================

/**
 * Maps Unicode characters (including Turkish Ğ, ğ, İ, ı, Ş, ş, Ç, ç, Ö, ö, Ü, ü)
 * to our PDF Type1 Font Encoding (WinAnsiEncoding + Turkish Differences at 208, 221, 222, 240, 253, 254).
 */
const TURKISH_PDF_CHAR_MAP: Record<string, number> = {
  'Ç': 199,
  'ç': 231,
  'Ö': 214,
  'ö': 246,
  'Ü': 220,
  'ü': 252,
  '': 194,
  'â': 226,
  'Î': 206,
  'î': 238,
  'Û': 219,
  'û': 251,
  'Ğ': 208, // /Gbreve in Differences
  'İ': 221, // /Idotaccent in Differences
  'Ş': 222, // /Scedilla in Differences
  'ğ': 240, // /gbreve in Differences
  'ı': 253, // /dotlessi in Differences
  'ş': 254, // /scedilla in Differences
  '•': 149, // /bullet
  '–': 150, // /endash
  '—': 151, // /emdash
  '“': 147,
  '”': 148,
  '‘': 145,
  '’': 146,
  '±': 177,
  '°': 176,
};

/**
 * Normalizes math/special symbols into clean clinical ASCII/Turkish tokens before PDF encoding
 * so no missing glyph box ever renders in any PDF viewer.
 */
export function normalizeTextForPdf(input: string): string {
  if (!input) return '';
  return input
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/²/g, '^2')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~')
    .replace(/Δ/g, 'Delta ')
    .replace(/σ/g, ' SD')
    .replace(/\u00A0/g, ' ')
    // Strip emoji characters cleanly
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim();
}

/**
 * Encodes a UTF-8 string into a PDF 1.4 literal string `(...)` using octal `\ddd` escapes
 * for bytes >= 128 so the resulting PDF stream is 100% pure 7-bit ASCII and renders
 * all Turkish characters accurately in every PDF reader.
 */
export function encodePdfLiteralString(raw: string): string {
  const normalized = normalizeTextForPdf(raw);
  let out = '(';
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const code = normalized.charCodeAt(i);

    if (ch === '\\') {
      out += '\\\\';
    } else if (ch === '(') {
      out += '\\(';
    } else if (ch === ')') {
      out += '\\)';
    } else if (code >= 32 && code <= 126) {
      out += ch;
    } else if (TURKISH_PDF_CHAR_MAP[ch] !== undefined) {
      const byteVal = TURKISH_PDF_CHAR_MAP[ch];
      out += '\\' + byteVal.toString(8).padStart(3, '0');
    } else if (code >= 160 && code <= 255) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      out += ' ';
    }
  }
  out += ')';
  return out;
}

type RgbColor = [number, number, number]; // 0..1 components

const COLORS = {
  navy: [0.118, 0.227, 0.373] as RgbColor, // #1E3A5F
  navyDark: [0.075, 0.149, 0.251] as RgbColor,
  copper: [0.753, 0.404, 0.310] as RgbColor, // #C0674F
  teal: [0.059, 0.463, 0.431] as RgbColor, // #0F766E
  tealLight: [0.941, 0.992, 0.980] as RgbColor, // #F0FDFA
  tealBorder: [0.600, 0.902, 0.851] as RgbColor,
  emerald: [0.024, 0.471, 0.341] as RgbColor, // #067857
  emeraldLight: [0.925, 0.992, 0.961] as RgbColor,
  amber: [0.706, 0.325, 0.035] as RgbColor, // #B45309
  amberLight: [1.0, 0.984, 0.922] as RgbColor,
  rose: [0.745, 0.071, 0.235] as RgbColor, // #BE123C
  roseLight: [1.0, 0.945, 0.949] as RgbColor,
  slateDark: [0.15, 0.2, 0.28] as RgbColor,
  slateMuted: [0.39, 0.45, 0.54] as RgbColor,
  zebraRow: [0.973, 0.980, 0.988] as RgbColor, // #F8FAFC
  surfaceBox: [0.961, 0.957, 0.941] as RgbColor, // #F5F4F0
  borderGray: [0.85, 0.88, 0.91] as RgbColor,
  white: [1, 1, 1] as RgbColor,
};

function estimateTextWidth(text: string, fontSize: number, isBold = false): number {
  const norm = normalizeTextForPdf(text);
  const avgFactor = isBold ? 0.54 : 0.50;
  return norm.length * fontSize * avgFactor;
}

function wrapTextToLines(text: string, maxWidthPt: number, fontSize: number, isBold = false): string[] {
  const cleaned = normalizeTextForPdf(text);
  if (!cleaned) return ['-'];

  const paragraphs = cleaned.split(/\n+/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (estimateTextWidth(candidate, fontSize, isBold) <= maxWidthPt) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines.length > 0 ? lines : ['-'];
}

interface PdfTableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  bold?: boolean;
}

interface PdfTableRow {
  cells: string[];
  tone?: 'normal' | 'emerald' | 'amber' | 'rose' | 'teal';
}

/**
 * Generates a complete, multi-page, A4 clinical PDF 1.4 binary document (`Uint8Array`)
 * using the canonical Doctor Report template (`STD-DMI-CLINICAL-PDF-V2`).
 */
export function generateDoctorReportPdfBytes(
  inputOrModel: CanonicalDoctorReportInput | CanonicalDoctorReportModel
): Uint8Array {
  const model: CanonicalDoctorReportModel =
    'templateId' in inputOrModel && inputOrModel.templateId === DOCTOR_REPORT_TEMPLATE_ID
      ? inputOrModel
      : buildCanonicalDoctorReportTemplate(inputOrModel as CanonicalDoctorReportInput);

  const PAGE_W = 595.28; // A4 width pt
  const PAGE_H = 841.89; // A4 height pt
  const MARGIN_X = 32;
  const CONTENT_W = PAGE_W - MARGIN_X * 2; // ~531.28 pt
  const TOP_START_PAGE1 = 30;
  const TOP_START_NEXT = 52;
  const BOTTOM_LIMIT = PAGE_H - 42;

  const pageStreams: string[][] = [[]];
  let currentPage = 0;
  let y = TOP_START_PAGE1; // Distance from top of page

  const pdfY = (topY: number) => Number((PAGE_H - topY).toFixed(2));
  const emit = (cmd: string) => pageStreams[currentPage].push(cmd);

  const setFill = ([r, g, b]: RgbColor) =>
    emit(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  const setStroke = ([r, g, b]: RgbColor) =>
    emit(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);

  const drawRect = (
    x: number,
    topY: number,
    w: number,
    h: number,
    fill?: RgbColor,
    stroke?: RgbColor,
    lineWidth = 0.6
  ) => {
    const bottomY = pdfY(topY + h);
    if (fill) setFill(fill);
    if (stroke) {
      setStroke(stroke);
      emit(`${lineWidth.toFixed(2)} w`);
    }
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
    emit(`${x.toFixed(2)} ${bottomY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
  };

  const drawLine = (
    x1: number,
    topY1: number,
    x2: number,
    topY2: number,
    stroke: RgbColor = COLORS.borderGray,
    lineWidth = 0.6
  ) => {
    setStroke(stroke);
    emit(`${lineWidth.toFixed(2)} w`);
    emit(`${x1.toFixed(2)} ${pdfY(topY1).toFixed(2)} m ${x2.toFixed(2)} ${pdfY(topY2).toFixed(2)} l S`);
  };

  const drawTextLine = (
    text: string,
    x: number,
    topBaselineY: number,
    options?: {
      font?: 'F1' | 'F2' | 'F3';
      size?: number;
      color?: RgbColor;
      align?: 'left' | 'right' | 'center';
      width?: number;
    }
  ) => {
    const font = options?.font ?? 'F1';
    const size = options?.size ?? 8.5;
    const color = options?.color ?? COLORS.slateDark;
    const align = options?.align ?? 'left';
    const width = options?.width ?? 0;

    let drawX = x;
    if (align !== 'left' && width > 0) {
      const estW = estimateTextWidth(text, size, font === 'F2');
      if (align === 'right') {
        drawX = x + Math.max(0, width - estW);
      } else if (align === 'center') {
        drawX = x + Math.max(0, (width - estW) / 2);
      }
    }

    setFill(color);
    emit(
      `BT /${font} ${size.toFixed(1)} Tf ${drawX.toFixed(2)} ${pdfY(topBaselineY).toFixed(2)} Td ${encodePdfLiteralString(
        text
      )} Tj ET`
    );
  };

  const newPage = () => {
    pageStreams.push([]);
    currentPage = pageStreams.length - 1;
    y = TOP_START_NEXT;
  };

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > BOTTOM_LIMIT) {
      newPage();
      return true;
    }
    return false;
  };

  // --- 1. PAGE 1 TOP BANNER ---
  drawRect(MARGIN_X, y, CONTENT_W, 54, COLORS.navy);
  drawRect(MARGIN_X, y + 50, CONTENT_W, 4, COLORS.copper);

  drawTextLine(model.documentTitle, MARGIN_X + 12, y + 18, {
    font: 'F2',
    size: 11.5,
    color: COLORS.white,
  });
  drawTextLine(model.documentSubtitle, MARGIN_X + 12, y + 32, {
    font: 'F1',
    size: 8.0,
    color: [0.85, 0.9, 0.96],
  });
  drawTextLine(
    `Standart Rapor Şablonu: ${model.templateId} (v${model.templateVersion})  |  Tarih: ${model.metadata.reportDateStr}`,
    MARGIN_X + 12,
    y + 44,
    {
      font: 'F2',
      size: 7.5,
      color: [0.98, 0.82, 0.76],
    }
  );
  y += 62;

  // --- PATIENT & REPORT METADATA BAR ---
  drawRect(MARGIN_X, y, CONTENT_W, 38, COLORS.surfaceBox, COLORS.borderGray, 0.6);
  const metaColW = CONTENT_W / 4;
  const metaItems = [
    {
      label: 'DANIŞAN / KULLANICI',
      val: model.metadata.patientName + (model.metadata.patientEmail ? ` (${model.metadata.patientEmail})` : ''),
    },
    {
      label: 'ANALİZ PENCERESİ',
      val: `${model.metadata.periodLabel} (${model.metadata.reportIsoDate})`,
    },
    {
      label: 'KİŞİSEL BAZ HATTI (EWMA)',
      val: `${model.metadata.effectiveDayCount}/14 Gün (${model.metadata.effectiveDayCount >= 14 ? 'Tamamlandı' : 'Öğreniliyor'})`,
    },
    {
      label: 'VERİ KAPSAMA ORANI',
      val: `${model.metadata.activeMetricsCount} / ${model.metadata.totalMetricsCount} Gösterge Aktif`,
    },
  ];
  metaItems.forEach((item, idx) => {
    const cx = MARGIN_X + idx * metaColW + 8;
    if (idx > 0) {
      drawLine(MARGIN_X + idx * metaColW, y + 5, MARGIN_X + idx * metaColW, y + 33, COLORS.borderGray, 0.5);
    }
    drawTextLine(item.label, cx, y + 13, { font: 'F2', size: 6.8, color: COLORS.copper });
    const lines = wrapTextToLines(item.val, metaColW - 14, 7.6, true);
    drawTextLine(lines[0], cx, y + 25, { font: 'F2', size: 7.6, color: COLORS.navy });
    if (lines[1]) {
      drawTextLine(lines[1], cx, y + 34, { font: 'F1', size: 6.8, color: COLORS.slateMuted });
    }
  });
  y += 46;

  // Helper for Section Headers
  const drawSectionHeader = (title: string, subtitle?: string, accent: RgbColor = COLORS.navy) => {
    ensureSpace(subtitle ? 36 : 24);
    drawRect(MARGIN_X, y, CONTENT_W, 18, accent);
    drawRect(MARGIN_X, y, 4, 18, COLORS.copper);
    drawTextLine(title, MARGIN_X + 10, y + 12.5, {
      font: 'F2',
      size: 8.6,
      color: COLORS.white,
    });
    y += 21;
    if (subtitle) {
      const subLines = wrapTextToLines(subtitle, CONTENT_W - 8, 7.3, false);
      for (const line of subLines) {
        drawTextLine(line, MARGIN_X + 4, y + 8, {
          font: 'F3',
          size: 7.3,
          color: COLORS.slateMuted,
        });
        y += 10;
      }
      y += 2;
    }
  };

  // Helper for Multi-Page Aligned Tables
  const drawTable = (
    columns: PdfTableColumn[],
    rows: PdfTableRow[],
    headerFill: RgbColor = [0.91, 0.94, 0.97]
  ) => {
    const fontSize = 7.2;
    const lineHeight = 9.2;
    const cellPadX = 4;
    const cellPadY = 4;

    const renderHeaderRow = () => {
      let maxHeaderLines = 1;
      const wrappedHeaders = columns.map((col) => {
        const lns = wrapTextToLines(col.header, col.width - cellPadX * 2, 7.2, true);
        if (lns.length > maxHeaderLines) maxHeaderLines = lns.length;
        return lns;
      });
      const headerH = maxHeaderLines * 9 + 6;
      drawRect(MARGIN_X, y, CONTENT_W, headerH, headerFill, COLORS.borderGray, 0.6);

      let curX = MARGIN_X;
      columns.forEach((col, cIdx) => {
        if (cIdx > 0) {
          drawLine(curX, y, curX, y + headerH, COLORS.borderGray, 0.4);
        }
        wrappedHeaders[cIdx].forEach((ln, lIdx) => {
          drawTextLine(ln, curX + cellPadX, y + 9 + lIdx * 8.5, {
            font: 'F2',
            size: 7.1,
            color: COLORS.navy,
            align: col.align ?? 'left',
            width: col.width - cellPadX * 2,
          });
        });
        curX += col.width;
      });
      y += headerH;
    };

    ensureSpace(32);
    renderHeaderRow();

    rows.forEach((row, rIdx) => {
      let maxLines = 1;
      const wrappedCells = columns.map((col, cIdx) => {
        const rawCell = row.cells[cIdx] ?? '—';
        const lns = wrapTextToLines(rawCell, col.width - cellPadX * 2, fontSize, Boolean(col.bold));
        if (lns.length > maxLines) maxLines = lns.length;
        return lns;
      });

      const rowH = maxLines * lineHeight + cellPadY * 2;
      if (y + rowH > BOTTOM_LIMIT) {
        newPage();
        renderHeaderRow();
      }

      let rowFill: RgbColor = rIdx % 2 === 0 ? COLORS.white : COLORS.zebraRow;
      if (row.tone === 'rose') rowFill = COLORS.roseLight;
      else if (row.tone === 'amber') rowFill = COLORS.amberLight;
      else if (row.tone === 'emerald') rowFill = COLORS.emeraldLight;
      else if (row.tone === 'teal') rowFill = COLORS.tealLight;

      drawRect(MARGIN_X, y, CONTENT_W, rowH, rowFill, COLORS.borderGray, 0.4);

      let curX = MARGIN_X;
      columns.forEach((col, cIdx) => {
        if (cIdx > 0) {
          drawLine(curX, y, curX, y + rowH, COLORS.borderGray, 0.35);
        }
        const cellLines = wrappedCells[cIdx];
        cellLines.forEach((ln, lIdx) => {
          let textColor: RgbColor = COLORS.slateDark;
          if (row.tone === 'rose' && cIdx >= 3) textColor = COLORS.rose;
          else if (row.tone === 'amber' && cIdx >= 3) textColor = COLORS.amber;
          else if (row.tone === 'emerald' && cIdx >= 3) textColor = COLORS.emerald;
          else if (col.bold) textColor = COLORS.navy;

          drawTextLine(ln, curX + cellPadX, y + cellPadY + 7 + lIdx * lineHeight, {
            font: col.bold ? 'F2' : 'F1',
            size: fontSize,
            color: textColor,
            align: col.align ?? 'left',
            width: col.width - cellPadX * 2,
          });
        });
        curX += col.width;
      });

      y += rowH;
    });

    y += 8;
  };

  // --- SECTION 1: EXECUTIVE SUMMARY & KPI COMPARISON CARDS ---
  drawSectionHeader(
    model.sectionOrder[0],
    'Danışanın son analiz penceresindeki biyometrik, duygudurum, klinik ölçek ve ilaç uyumu göstergelerinin tek bakışta özeti:'
  );

  // Draw 4 KPI Cards side by side
  ensureSpace(56);
  const cardGap = 6;
  const cardW = (CONTENT_W - cardGap * 3) / 4;
  const cardH = 50;
  model.kpiCards.forEach((card, idx) => {
    const cx = MARGIN_X + idx * (cardW + cardGap);
    const fill: RgbColor =
      card.statusTone === 'rose'
        ? COLORS.roseLight
        : card.statusTone === 'amber'
        ? COLORS.amberLight
        : card.statusTone === 'emerald'
        ? COLORS.emeraldLight
        : card.statusTone === 'teal'
        ? COLORS.tealLight
        : COLORS.zebraRow;
    drawRect(cx, y, cardW, cardH, fill, COLORS.borderGray, 0.6);
    drawTextLine(card.title.toUpperCase(), cx + 6, y + 11, {
      font: 'F2',
      size: 6.5,
      color: COLORS.slateMuted,
    });
    drawTextLine(card.primaryValue, cx + 6, y + 23, {
      font: 'F2',
      size: 8.6,
      color: COLORS.navy,
    });
    const compLines = wrapTextToLines(card.comparisonLabel, cardW - 12, 6.6, false);
    drawTextLine(compLines[0], cx + 6, y + 33, {
      font: 'F2',
      size: 6.6,
      color: COLORS.copper,
    });
    const expLines = wrapTextToLines(card.explanation, cardW - 12, 6.3, false);
    drawTextLine(expLines[0], cx + 6, y + 43, {
      font: 'F1',
      size: 6.3,
      color: COLORS.slateDark,
    });
  });
  y += cardH + 7;

  // Executive Narrative & Reading Guide Box
  const narrativeLines = wrapTextToLines(model.executiveSummary.narrative, CONTENT_W - 16, 7.5, false);
  const guideLines: string[] = [];
  for (const g of model.executiveSummary.clinicianReadingGuide) {
    const wrapped = wrapTextToLines(`• ${g}`, CONTENT_W - 20, 7.1, false);
    guideLines.push(...wrapped);
  }
  const summaryBoxH = narrativeLines.length * 9.5 + guideLines.length * 9 + 22;
  ensureSpace(summaryBoxH + 6);
  drawRect(MARGIN_X, y, CONTENT_W, summaryBoxH, COLORS.surfaceBox, COLORS.borderGray, 0.5);
  let sy = y + 11;
  for (const nl of narrativeLines) {
    drawTextLine(nl, MARGIN_X + 8, sy, { font: 'F1', size: 7.5, color: COLORS.slateDark });
    sy += 9.5;
  }
  sy += 3;
  drawTextLine('HEKİM İÇİN HIZLI OKUMA VE KARŞILAŞTIRMA REHBERİ:', MARGIN_X + 8, sy, {
    font: 'F2',
    size: 7.2,
    color: COLORS.navy,
  });
  sy += 9.5;
  for (const gl of guideLines) {
    drawTextLine(gl, MARGIN_X + 10, sy, { font: 'F1', size: 7.0, color: COLORS.slateMuted });
    sy += 8.8;
  }
  y += summaryBoxH + 8;

  // --- SECTION 2: NOTABLE DEVIATIONS COMPARISON TABLE ---
  drawSectionHeader(
    model.sectionOrder[1],
    `Kişisel EWMA baz hattından istatistiksel olarak belirgin sapma gösteren (|Z| >= ${NOTABLE_Z} SD veya |Değişim| >= %${NOTABLE_PERCENT}) göstergelerin karşılaştırmalı analizi:`
  );

  if (model.notableComparisons.length > 0) {
    drawTable(
      [
        { header: 'Biyobelirteç & Kategori', width: 118, bold: true },
        { header: 'Kişisel EWMA Baz', width: 64, align: 'right' },
        { header: `Dönem Ort. (${model.metadata.rangeDays}G)`, width: 66, align: 'right', bold: true },
        { header: 'Değişim (%)', width: 52, align: 'right', bold: true },
        { header: 'Z-Skoru', width: 46, align: 'right', bold: true },
        { header: 'Sapma Düzeyi', width: 75, align: 'center', bold: true },
        { header: 'Klinik Açıklama & Kaynak', width: CONTENT_W - 421 },
      ],
      model.notableComparisons.map((n) => ({
        tone: n.severityLevel === 'high' ? 'rose' : 'amber',
        cells: [
          `${n.label} (${n.categoryLabel})`,
          n.baselineText,
          n.periodAvgText,
          n.deviationText,
          n.zScoreText,
          n.directionLabel,
          `${n.clinicalInterpretation} ${n.citationsText}`,
        ],
      }))
    );
  } else {
    ensureSpace(24);
    drawRect(MARGIN_X, y, CONTENT_W, 20, COLORS.emeraldLight, COLORS.borderGray, 0.5);
    drawTextLine(
      'Bu analiz penceresinde kişinin kendi EWMA baz hattından belirgin sapma gösteren (|Z| >= 1.5 SD veya |%| >= %20) bir biyobelirteç saptanmamıştır.',
      MARGIN_X + 8,
      y + 13,
      { font: 'F2', size: 7.4, color: COLORS.emerald }
    );
    y += 26;
  }

  // --- SECTION 3: DAILY MEDICATION SCHEDULE & CLINICAL SAFETY PRINCIPLES ---
  drawSectionHeader(
    model.sectionOrder[2],
    'Danışanın beyan ettiği günlük ilaç protokolü, kullanım vakitleri, bugünkü doz uyum durumu ve klinik güvenlik kuralları:',
    COLORS.teal
  );

  if (model.dailyMedications.protocols.length > 0) {
    drawTable(
      [
        { header: 'İlaç Adı & Dozaj', width: 95, bold: true },
        { header: 'Başlangıç (T0) & Süre', width: 82 },
        { header: 'Kullanım Zamanı / Vakti', width: 105 },
        { header: 'Alım Şekli', width: 78 },
        { header: 'Terapötik Amaç / Hekim Notu', width: 96 },
        { header: 'Bugünkü Durum', width: CONTENT_W - 456, align: 'center', bold: true },
      ],
      model.dailyMedications.protocols.map((p) => ({
        tone: p.isTakenToday ? 'emerald' : 'amber',
        cells: [
          `${p.name} (${p.dosage})`,
          `${p.startDate} (${p.daysActive}. gün)`,
          p.schedule,
          p.administrationRule,
          p.clinicalPurpose,
          p.todayStatusLabel,
        ],
      })),
      COLORS.tealLight
    );
  } else {
    ensureSpace(22);
    drawRect(MARGIN_X, y, CONTENT_W, 18, COLORS.tealLight, COLORS.tealBorder, 0.5);
    drawTextLine(
      'Sistemde henüz kayıtlı aktif ilaç protokolü bulunmamaktadır. İlaç eklendiğinde günlük doz çizelgesi bu tabloda standart olarak yer alır.',
      MARGIN_X + 8,
      y + 12,
      { font: 'F1', size: 7.4, color: COLORS.teal }
    );
    y += 24;
  }

  // --- SECTION 4: MANDATORY MEDICATION IMPACT & 1M / 3M / 6M COMPARATIVE TABLE ---
  drawSectionHeader(
    model.sectionOrder[3],
    'İlaç başlama tarihi (T0) öncesindeki son 1 ay (30G), 3 ay (90G) ve 6 ay (180G) ortalamaları ile ilaç sonrası dönemin karşılaştırmalı dijital biyobelirteç analizi:',
    COLORS.teal
  );

  if (model.medicationImpactSections.length > 0) {
    for (const medSec of model.medicationImpactSections) {
      const headerSummaryLines = wrapTextToLines(
        `${medSec.timeSeriesOverlaySummary} ${medSec.overallClinicalSummary}`,
        CONTENT_W - 16,
        7.2,
        false
      );
      const boxH = 26 + headerSummaryLines.length * 9 + (medSec.affectiveComparisonText ? 11 : 0);
      ensureSpace(boxH + 35);
      drawRect(MARGIN_X, y, CONTENT_W, boxH, COLORS.tealLight, COLORS.tealBorder, 0.6);
      drawTextLine(
        `İLAÇ PROTOKOLÜ: ${medSec.medicationName} (${medSec.dosage})  |  Başlangıç (T0): ${medSec.startDate} (${medSec.daysActive}. Gün)  |  Vakit: ${medSec.schedule}`,
        MARGIN_X + 8,
        y + 11,
        { font: 'F2', size: 7.8, color: COLORS.teal }
      );
      drawTextLine(medSec.sampleWindowSummary, MARGIN_X + 8, y + 21, {
        font: 'F2',
        size: 7.0,
        color: COLORS.navy,
      });
      let my = y + 31;
      for (const hl of headerSummaryLines) {
        drawTextLine(hl, MARGIN_X + 8, my, { font: 'F1', size: 7.1, color: COLORS.slateDark });
        my += 8.8;
      }
      if (medSec.affectiveComparisonText) {
        drawTextLine(medSec.affectiveComparisonText, MARGIN_X + 8, my + 1, {
          font: 'F2',
          size: 7.1,
          color: COLORS.copper,
        });
      }
      y += boxH + 4;

      drawTable(
        [
          { header: 'Dijital Biyobelirteç', width: 92, bold: true },
          { header: 'Öncesi 1 Ay (T-30G)', width: 62, align: 'right' },
          { header: 'Öncesi 3 Ay (T-90G)', width: 62, align: 'right' },
          { header: 'Öncesi 6 Ay (T-180G)', width: 62, align: 'right' },
          { header: 'İlaç Sonrası (Genel & 1A/3A/6A)', width: 88, align: 'right', bold: true },
          { header: 'Karşılaştırmalı Delta % (1A / 3A / 6A)', width: 78, align: 'right', bold: true },
          { header: 'Klinik Yansıma', width: CONTENT_W - 444 },
        ],
        medSec.rows.map((r) => ({
          tone:
            r.direction === 'improved'
              ? 'emerald'
              : r.direction === 'declined'
              ? 'rose'
              : 'normal',
          cells: [
            `${r.label} (${r.unit})`,
            r.pre1MonthText,
            r.pre3MonthsText,
            r.pre6MonthsText,
            `${r.postOverallText}\n[${r.postWindowsDetailText}]`,
            `${r.combinedDeltaText}\n(${r.directionBadge})`,
            r.interpretation,
          ],
        })),
        COLORS.tealLight
      );
    }
  } else {
    ensureSpace(26);
    drawRect(MARGIN_X, y, CONTENT_W, 22, COLORS.tealLight, COLORS.tealBorder, 0.5);
    drawTextLine(
      'Henüz aktif ilaç kaydı bulunmadığından T0 öncesi/sonrası (1 Ay, 3 Ay, 6 Ay) karşılaştırmalı ilaç biyobelirteç tablosu veri beklemektedir.',
      MARGIN_X + 8,
      y + 14,
      { font: 'F1', size: 7.3, color: COLORS.teal }
    );
    y += 28;
  }

  // --- SECTION 5: COMPLETE CATEGORIZED EWMA BIOMARKERS TABLE ---
  drawSectionHeader(
    model.sectionOrder[4],
    'Sistemde izlenen tüm dijital biyobelirteçlerin sensör kategorilerine göre Kişisel EWMA Baz Hattı ve Dönem Ortalaması karşılaştırması:'
  );

  for (const group of model.categorizedMetrics) {
    ensureSpace(42);
    drawRect(MARGIN_X, y, CONTENT_W, 15, [0.93, 0.95, 0.98], COLORS.borderGray, 0.5);
    drawTextLine(
      `${group.categoryTitle.toUpperCase()} (${group.activeCount}/${group.totalCount} Aktif Gösterge)`,
      MARGIN_X + 8,
      y + 10.5,
      { font: 'F2', size: 7.5, color: COLORS.navy }
    );
    y += 17;

    drawTable(
      [
        { header: 'Gösterge / Biyobelirteç', width: 112, bold: true },
        { header: 'Kişisel EWMA Baz', width: 66, align: 'right' },
        { header: 'Dönem Ortalaması', width: 66, align: 'right', bold: true },
        { header: 'Değişim (%)', width: 52, align: 'right', bold: true },
        { header: 'Z-Skoru', width: 46, align: 'right', bold: true },
        { header: 'Durum', width: 72, align: 'center', bold: true },
        { header: 'Klinik Anlamı & Kaynak', width: CONTENT_W - 414 },
      ],
      group.rows.map((r) => ({
        tone:
          r.statusTone === 'rose'
            ? 'rose'
            : r.statusTone === 'amber'
            ? 'amber'
            : r.statusTone === 'emerald'
            ? 'emerald'
            : 'normal',
        cells: [
          r.label,
          r.baselineText,
          r.periodAvgText,
          r.deviationText,
          r.zScoreText,
          r.statusBadge,
          r.clinicalMeaning,
        ],
      }))
    );
  }

  // --- SECTION 6: MOOD & CLINICAL SURVEYS (GAD-7 & PHQ-9) ---
  drawSectionHeader(
    model.sectionOrder[5],
    'Danışanın öz-bildirim duygudurum/enerji kayıtları ile standart klinik tarama ölçeklerinin (GAD-7 ve PHQ-9) önceki ölçümlerle karşılaştırması:'
  );

  const ms = model.moodAndSurveyComparison.moodSummary;
  const sc = model.moodAndSurveyComparison.surveyComparison;
  drawTable(
    [
      { header: 'Değerlendirme Alanı', width: 115, bold: true },
      { header: 'Mevcut Dönem Ölçümü', width: 95, bold: true },
      { header: 'Önceki / Referans Ölçüm', width: 95 },
      { header: 'Karşılaştırmalı Değişim / Bağlam', width: 95, bold: true },
      { header: 'Klinik Yorum & Değerlendirme', width: CONTENT_W - 400 },
    ],
    [
      {
        tone: ms.hasMoodData ? 'teal' : 'normal',
        cells: [
          `Öz-Bildirim Duygudurum & Enerji (${ms.sampleCount} Kayıt)`,
          `Ruh Hali: ${ms.avgMoodText}\nEnerji: ${ms.avgEnergyText}`,
          ms.minMaxMoodText,
          `Etiketler: ${ms.topTagsText}`,
          ms.clinicalInterpretation,
        ],
      },
      {
        tone: sc.hasSurvey ? 'amber' : 'normal',
        cells: [
          `GAD-7 Anksiyete Tarama Ölçeği (${sc.latestDate})`,
          `${sc.gad7CurrentText} (${sc.gad7Risk})`,
          sc.gad7PreviousText,
          sc.gad7DeltaText,
          sc.clinicalInterpretation,
        ],
      },
      {
        tone: sc.hasSurvey ? 'amber' : 'normal',
        cells: [
          `PHQ-9 Depresyon Tarama Ölçeği (${sc.latestDate})`,
          `${sc.phq9CurrentText} (${sc.phq9Risk})`,
          sc.phq9PreviousText,
          sc.phq9DeltaText,
          sc.clinicalInterpretation,
        ],
      },
    ]
  );

  // --- SECTION 7: SYSTEM-GENERATED AWARENESS NOTES & PINNED INSIGHTS ---
  drawSectionHeader(
    model.sectionOrder[6],
    'Gerçek sensör telemetrisi, EWMA sapmaları, klinik ölçekler ve danışanın rapora eklediği farkındalık içgörüleri:'
  );

  const noteRows: PdfTableRow[] = model.awarenessNotes.map((n) => ({
    tone: n.severity === 'warning' ? 'rose' : n.severity === 'attention' ? 'amber' : 'normal',
    cells: [
      n.title,
      n.severity === 'warning' ? 'Yüksek Öncelik' : n.severity === 'attention' ? 'Dikkat / İzlem' : 'Bilgi / Özet',
      `${n.body}${n.sources && n.sources.length > 0 ? ` (Kaynak: ${n.sources.join('; ')})` : ''}`,
    ],
  }));

  for (const p of model.pinnedInsights) {
    noteRows.push({
      tone: 'teal',
      cells: [
        `[Danışan Notu] ${p.title}`,
        'Danışan Ekledi',
        `${p.body}${p.sources && p.sources.length > 0 ? ` (Kaynak: ${p.sources.join('; ')})` : ''}`,
      ],
    });
  }

  drawTable(
    [
      { header: 'Farkındalık Başlığı / Sinyal Türü', width: 135, bold: true },
      { header: 'Öncelik Düzeyi', width: 75, align: 'center', bold: true },
      { header: 'Detaylı Klinik Açıklama & Kanıt Özeti', width: CONTENT_W - 210 },
    ],
    noteRows
  );

  // --- SECTION 8: BIBLIOGRAPHY, METHODOLOGY & LEGAL DISCLAIMER ---
  drawSectionHeader(
    model.sectionOrder[7],
    'Rapordaki dijital biyobelirteçlerin dayandığı akademik literatür, istatistiksel yöntem ve yasal çerçeve:'
  );

  const bibLines: string[] = [];
  if (model.bibliographyAndMethodology.references.length > 0) {
    const refJoined = model.bibliographyAndMethodology.references
      .map((r) => `[${r.index}] ${r.citation}`)
      .join('   •   ');
    bibLines.push(...wrapTextToLines(`Akademik Kaynaklar: ${refJoined}`, CONTENT_W - 16, 7.1, false));
  } else {
    bibLines.push(
      ...wrapTextToLines(
        'Akademik Kaynaklar: Bu raporda yer alan göstergeler için tanımlı akademik kaynak eşlemesi bulunmamaktadır.',
        CONTENT_W - 16,
        7.1,
        false
      )
    );
  }
  bibLines.push(
    ...wrapTextToLines(model.bibliographyAndMethodology.unreferencedMetricsText, CONTENT_W - 16, 7.0, false)
  );
  for (const mp of model.bibliographyAndMethodology.methodologyPoints) {
    bibLines.push(...wrapTextToLines(`• ${mp}`, CONTENT_W - 16, 7.0, false));
  }
  const legalLines = wrapTextToLines(
    model.bibliographyAndMethodology.legalDisclaimer,
    CONTENT_W - 16,
    7.2,
    true
  );

  const bibBoxH = (bibLines.length + legalLines.length) * 8.8 + 18;
  ensureSpace(bibBoxH + 8);
  drawRect(MARGIN_X, y, CONTENT_W, bibBoxH, COLORS.surfaceBox, COLORS.borderGray, 0.6);
  let by = y + 11;
  for (const bl of bibLines) {
    drawTextLine(bl, MARGIN_X + 8, by, { font: 'F1', size: 7.0, color: COLORS.slateDark });
    by += 8.6;
  }
  by += 3;
  for (const ll of legalLines) {
    drawTextLine(ll, MARGIN_X + 8, by, { font: 'F2', size: 7.1, color: COLORS.navy });
    by += 8.6;
  }
  y += bibBoxH + 6;

  // --- RUNNING HEADERS & FOOTERS ON ALL PAGES ---
  const totalPages = pageStreams.length;
  for (let p = 0; p < totalPages; p++) {
    currentPage = p;
    if (p > 0) {
      // Running top header on page 2+
      drawRect(MARGIN_X, 18, CONTENT_W, 22, COLORS.navy);
      drawRect(MARGIN_X, 38, CONTENT_W, 2, COLORS.copper);
      drawTextLine(
        `DİJİTAL MENTAL İKİZİM — STANDART HEKİM RAPORU (${model.templateId})`,
        MARGIN_X + 8,
        32,
        { font: 'F2', size: 7.5, color: COLORS.white }
      );
      drawTextLine(
        `Danışan: ${model.metadata.patientName}  |  ${model.metadata.periodLabel}  |  Sayfa ${p + 1}/${totalPages}`,
        MARGIN_X + 8,
        32,
        { font: 'F1', size: 7.2, color: [0.9, 0.94, 0.98], align: 'right', width: CONTENT_W - 16 }
      );
    }

    // Running bottom footer on every page
    const footerTopY = PAGE_H - 30;
    drawLine(MARGIN_X, footerTopY, MARGIN_X + CONTENT_W, footerTopY, COLORS.borderGray, 0.6);
    drawTextLine(
      `Standart Klinik PDF Rapor Şablonu: ${model.templateId} • Dijital Mental İkizim Karar Destek Sistemi`,
      MARGIN_X,
      footerTopY + 11,
      { font: 'F1', size: 6.8, color: COLORS.slateMuted }
    );
    drawTextLine(`Sayfa ${p + 1} / ${totalPages}`, MARGIN_X, footerTopY + 11, {
      font: 'F2',
      size: 7.2,
      color: COLORS.navy,
      align: 'right',
      width: CONTENT_W,
    });
  }

  // --- ASSEMBLE VALID PDF 1.4 OBJECT STREAM ---
  // Object IDs:
  // 1: Catalog
  // 2: Pages
  // 3: Encoding (WinAnsi + Turkish Differences)
  // 4: Font F1 (Helvetica)
  // 5: Font F2 (Helvetica-Bold)
  // 6: Font F3 (Helvetica-Oblique)
  // 7 .. 7 + totalPages*2 - 1: Page & Content Stream objects
  const objects: string[] = [];
  const addObject = (body: string): number => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  addObject('<< /Type /Catalog /Pages 2 0 R >>'); // 1
  addObject(''); // 2: placeholder for Pages, filled after page objects are created
  addObject(
    '<< /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [ 208 /Gbreve 221 /Idotaccent 222 /Scedilla 240 /gbreve 253 /dotlessi 254 /scedilla ] >>'
  ); // 3
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding 3 0 R >>'); // 4 (/F1)
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding 3 0 R >>'); // 5 (/F2)
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding 3 0 R >>'); // 6 (/F3)

  const pageObjNums: number[] = [];
  for (let p = 0; p < totalPages; p++) {
    const streamContent = pageStreams[p].join('\n');
    const contentObjNum = addObject(
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`
    );
    const pageObjNum = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(
        2
      )}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    );
    pageObjNums.push(pageObjNum);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${totalPages} >>`;

  // Info Dictionary
  const infoObjNum = addObject(
    `<< /Title ${encodePdfLiteralString(model.documentTitle)} /Author ${encodePdfLiteralString(
      'Dijital Mental İkizim'
    )} /Subject ${encodePdfLiteralString(
      `Standart Hekim Raporu (${model.templateId})`
    )} /Creator ${encodePdfLiteralString(model.templateId)} >>`
  );

  let pdfText = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdfText.length);
    pdfText += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = pdfText.length;
  pdfText += `xref\n0 ${objects.length + 1}\n`;
  pdfText += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdfText += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdfText += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoObjNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const bytes = new Uint8Array(pdfText.length);
  for (let i = 0; i < pdfText.length; i++) {
    bytes[i] = pdfText.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Generates the standard `.pdf` File and Blob objects from the canonical report template.
 */
export function generateDoctorReportPdfFile(
  inputOrModel: CanonicalDoctorReportInput | CanonicalDoctorReportModel
): {
  model: CanonicalDoctorReportModel;
  bytes: Uint8Array;
  blob: Blob;
  file: File;
  filename: string;
} {
  const model: CanonicalDoctorReportModel =
    'templateId' in inputOrModel && inputOrModel.templateId === DOCTOR_REPORT_TEMPLATE_ID
      ? inputOrModel
      : buildCanonicalDoctorReportTemplate(inputOrModel as CanonicalDoctorReportInput);

  const bytes = generateDoctorReportPdfBytes(model);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const file = new File([blob], model.filename, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  return {
    model,
    bytes,
    blob,
    file,
    filename: model.filename,
  };
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders a standalone, print-ready A4 HTML document with the exact same
 * canonical template (`STD-DMI-CLINICAL-PDF-V2`) for browser print / preview.
 */
export function renderDoctorReportTemplateHtml(
  inputOrModel: CanonicalDoctorReportInput | CanonicalDoctorReportModel
): string {
  const model: CanonicalDoctorReportModel =
    'templateId' in inputOrModel && inputOrModel.templateId === DOCTOR_REPORT_TEMPLATE_ID
      ? inputOrModel
      : buildCanonicalDoctorReportTemplate(inputOrModel as CanonicalDoctorReportInput);

  const kpiHtml = model.kpiCards
    .map(
      (c) => `
      <div class="kpi-card tone-${c.statusTone}">
        <div class="kpi-title">${escapeHtml(c.title)}</div>
        <div class="kpi-value">${escapeHtml(c.primaryValue)}</div>
        <div class="kpi-sub">${escapeHtml(c.comparisonLabel)}</div>
        <div class="kpi-exp">${escapeHtml(c.explanation)}</div>
      </div>`
    )
    .join('');

  const notableRowsHtml =
    model.notableComparisons.length > 0
      ? `<table>
          <thead>
            <tr>
              <th>Biyobelirteç &amp; Kategori</th>
              <th class="num">Kişisel EWMA Baz</th>
              <th class="num">Dönem Ort. (${model.metadata.rangeDays}G)</th>
              <th class="num">Değişim (%)</th>
              <th class="num">Z-Skoru</th>
              <th>Sapma Düzeyi</th>
              <th>Klinik Açıklama &amp; Kaynak</th>
            </tr>
          </thead>
          <tbody>
            ${model.notableComparisons
              .map(
                (n) => `
              <tr class="row-${n.severityLevel === 'high' ? 'rose' : 'amber'}">
                <td><strong>${escapeHtml(n.label)}</strong><div class="muted">${escapeHtml(n.categoryLabel)}</div></td>
                <td class="num">${escapeHtml(n.baselineText)}</td>
                <td class="num"><strong>${escapeHtml(n.periodAvgText)}</strong></td>
                <td class="num"><strong>${escapeHtml(n.deviationText)}</strong></td>
                <td class="num"><strong>${escapeHtml(n.zScoreText)}</strong></td>
                <td><span class="badge">${escapeHtml(n.directionLabel)}</span></td>
                <td>${escapeHtml(n.clinicalInterpretation)} <span class="muted">${escapeHtml(n.citationsText)}</span></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : `<div class="notice-emerald">Bu analiz penceresinde kişinin kendi EWMA baz hattından belirgin sapma gösteren (|Z| &ge; 1.5 SD veya |%| &ge; %20) bir biyobelirteç saptanmamıştır.</div>`;

  const medProtocolHtml =
    model.dailyMedications.protocols.length > 0
      ? `<table>
          <thead>
            <tr>
              <th>İlaç Adı &amp; Dozaj</th>
              <th>Başlangıç (T0) &amp; Süre</th>
              <th>Kullanım Zamanı / Vakti</th>
              <th>Alım Şekli</th>
              <th>Terapötik Amaç / Hekim Notu</th>
              <th>Bugünkü Durum</th>
            </tr>
          </thead>
          <tbody>
            ${model.dailyMedications.protocols
              .map(
                (p) => `
              <tr class="${p.isTakenToday ? 'row-emerald' : 'row-amber'}">
                <td><strong>${escapeHtml(p.name)} (${escapeHtml(p.dosage)})</strong></td>
                <td>${escapeHtml(p.startDate)} (${p.daysActive}. gün)</td>
                <td>${escapeHtml(p.schedule)}</td>
                <td>${escapeHtml(p.administrationRule)}</td>
                <td>${escapeHtml(p.clinicalPurpose)}</td>
                <td><strong>${escapeHtml(p.todayStatusLabel)}</strong></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : `<div class="notice-teal">Sistemde henüz kayıtlı aktif ilaç protokolü bulunmamaktadır.</div>`;

  const medImpactHtml =
    model.medicationImpactSections.length > 0
      ? model.medicationImpactSections
          .map(
            (ms) => `
          <div class="med-block">
            <div class="med-header">
              <strong>${escapeHtml(ms.medicationName)} (${escapeHtml(ms.dosage)})</strong> • Başlangıç (T0): ${escapeHtml(
              ms.startDate
            )} (${ms.daysActive}. Gün) • ${escapeHtml(ms.schedule)}
              <div class="muted">${escapeHtml(ms.sampleWindowSummary)}</div>
            </div>
            <p class="med-summary">${escapeHtml(ms.timeSeriesOverlaySummary)} ${escapeHtml(
              ms.overallClinicalSummary
            )}</p>
            ${
              ms.affectiveComparisonText
                ? `<div class="med-affective">${escapeHtml(ms.affectiveComparisonText)}</div>`
                : ''
            }
            <table>
              <thead>
                <tr>
                  <th>Dijital Biyobelirteç</th>
                  <th class="num">Öncesi 1 Ay (T-30G)</th>
                  <th class="num">Öncesi 3 Ay (T-90G)</th>
                  <th class="num">Öncesi 6 Ay (T-180G)</th>
                  <th class="num">İlaç Sonrası (Genel &amp; 1A/3A/6A)</th>
                  <th class="num">Değişim (Delta % 1A/3A/6A)</th>
                  <th>Klinik Yansıma</th>
                </tr>
              </thead>
              <tbody>
                ${ms.rows
                  .map(
                    (r) => `
                  <tr class="${
                    r.direction === 'improved' ? 'row-emerald' : r.direction === 'declined' ? 'row-rose' : ''
                  }">
                    <td><strong>${escapeHtml(r.label)}</strong> (${escapeHtml(r.unit)})</td>
                    <td class="num">${escapeHtml(r.pre1MonthText)}</td>
                    <td class="num">${escapeHtml(r.pre3MonthsText)}</td>
                    <td class="num">${escapeHtml(r.pre6MonthsText)}</td>
                    <td class="num"><strong>${escapeHtml(r.postOverallText)}</strong><div class="muted">${escapeHtml(
                      r.postWindowsDetailText
                    )}</div></td>
                    <td class="num"><strong>${escapeHtml(r.combinedDeltaText)}</strong><div class="muted">${escapeHtml(
                      r.directionBadge
                    )}</div></td>
                    <td>${escapeHtml(r.interpretation)}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>`
          )
          .join('')
      : `<div class="notice-teal">Henüz aktif ilaç kaydı bulunmadığından 1A/3A/6A karşılaştırmalı ilaç biyobelirteç tablosu veri beklemektedir.</div>`;

  const catHtml = model.categorizedMetrics
    .map(
      (g) => `
      <div class="cat-block">
        <div class="cat-title">${escapeHtml(g.categoryTitle)} (${g.activeCount}/${g.totalCount} Aktif Gösterge)</div>
        <table>
          <thead>
            <tr>
              <th>Gösterge / Biyobelirteç</th>
              <th class="num">Kişisel EWMA Baz</th>
              <th class="num">Dönem Ortalaması</th>
              <th class="num">Değişim (%)</th>
              <th class="num">Z-Skoru</th>
              <th>Durum</th>
              <th>Klinik Anlamı &amp; Kaynak</th>
            </tr>
          </thead>
          <tbody>
            ${g.rows
              .map(
                (r) => `
              <tr class="${r.statusTone === 'rose' ? 'row-rose' : r.statusTone === 'amber' ? 'row-amber' : ''}">
                <td><strong>${escapeHtml(r.label)}</strong></td>
                <td class="num">${escapeHtml(r.baselineText)}</td>
                <td class="num"><strong>${escapeHtml(r.periodAvgText)}</strong></td>
                <td class="num"><strong>${escapeHtml(r.deviationText)}</strong></td>
                <td class="num"><strong>${escapeHtml(r.zScoreText)}</strong></td>
                <td>${escapeHtml(r.statusBadge)}</td>
                <td>${escapeHtml(r.clinicalMeaning)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
    )
    .join('');

  const ms = model.moodAndSurveyComparison.moodSummary;
  const sc = model.moodAndSurveyComparison.surveyComparison;

  const notesHtml = [
    ...model.awarenessNotes.map(
      (n) => `
      <div class="note-box">
        <div><strong>${escapeHtml(n.title)}</strong></div>
        <div>${escapeHtml(n.body)}</div>
        ${n.sources && n.sources.length > 0 ? `<div class="muted">Bilimsel Dayanak: ${escapeHtml(n.sources.join('; '))}</div>` : ''}
      </div>`
    ),
    ...model.pinnedInsights.map(
      (p) => `
      <div class="note-box">
        <div><strong>[Danışan İçgörüsü] ${escapeHtml(p.title)}</strong></div>
        <div>${escapeHtml(p.body)}</div>
        ${p.sources && p.sources.length > 0 ? `<div class="muted">Kaynak: ${escapeHtml(p.sources.join('; '))}</div>` : ''}
      </div>`
    ),
  ].join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(model.documentTitle)} — ${escapeHtml(model.metadata.patientName)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; background: #FFFFFF; font-size: 10.5px; line-height: 1.45; margin: 0; padding: 0; }
    .banner { background: #1E3A5F; color: #FFFFFF; padding: 14px 18px; border-bottom: 4px solid #C0674F; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
    .banner h1 { margin: 0 0 4px 0; font-size: 16px; letter-spacing: 0.3px; }
    .banner p { margin: 0; font-size: 10px; color: #CBD5E1; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); background: #F5F4F0; border: 1px solid #CBD5E1; border-top: none; border-radius: 0 0 8px 8px; padding: 8px 12px; gap: 10px; margin-bottom: 12px; }
    .meta-item .label { font-size: 8.5px; font-weight: 700; color: #C0674F; text-transform: uppercase; }
    .meta-item .val { font-size: 10px; font-weight: 700; color: #1E3A5F; margin-top: 2px; }
    .section-title { background: #1E3A5F; color: #FFFFFF; padding: 6px 10px; font-size: 10.5px; font-weight: 700; border-left: 4px solid #C0674F; margin: 14px 0 6px 0; border-radius: 4px; }
    .section-title.teal { background: #0F766E; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    .kpi-card { border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px; background: #F8FAFC; }
    .kpi-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #64748B; }
    .kpi-value { font-size: 12px; font-weight: 800; color: #1E3A5F; margin: 2px 0; }
    .kpi-sub { font-size: 9px; font-weight: 700; color: #C0674F; }
    .kpi-exp { font-size: 8.5px; color: #475569; margin-top: 3px; }
    .summary-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5px; }
    th, td { border: 1px solid #CBD5E1; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #E2E8F0; color: #1E3A5F; font-weight: 700; }
    .num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .muted { font-size: 8.5px; color: #64748B; }
    .row-rose { background: #FFF1F2; }
    .row-amber { background: #FFFBEB; }
    .row-emerald { background: #ECFDF5; }
    .notice-emerald { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 8px 10px; border-radius: 6px; font-weight: 600; }
    .notice-teal { background: #F0FDFA; border: 1px solid #99F6E4; color: #0F766E; padding: 8px 10px; border-radius: 6px; }
    .med-block { border: 1px solid #99F6E4; background: #F0FDFA; border-radius: 6px; padding: 8px; margin-bottom: 10px; }
    .med-header { font-size: 10.5px; color: #0F766E; border-bottom: 1px solid #99F6E4; padding-bottom: 4px; margin-bottom: 6px; }
    .med-summary { margin: 4px 0; }
    .med-affective { font-weight: 700; color: #1E3A5F; margin-bottom: 6px; }
    .cat-title { font-weight: 700; color: #1E3A5F; background: #F1F5F9; padding: 4px 8px; border: 1px solid #CBD5E1; border-bottom: none; margin-top: 6px; }
    .note-box { border: 1px solid #CBD5E1; background: #F8FAFC; border-radius: 6px; padding: 7px 9px; margin-bottom: 6px; }
    .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #CBD5E1; font-size: 8.5px; color: #64748B; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="banner">
    <div>
      <h1>${escapeHtml(model.documentTitle)}</h1>
      <p>${escapeHtml(model.documentSubtitle)}</p>
    </div>
    <div style="text-align:right; font-size:9.5px;">
      <div><strong>Şablon:</strong> ${escapeHtml(model.templateId)}</div>
      <div><strong>Tarih:</strong> ${escapeHtml(model.metadata.reportDateStr)}</div>
    </div>
  </div>
  <div class="meta-grid">
    <div class="meta-item"><div class="label">Danışan / Kullanıcı</div><div class="val">${escapeHtml(
      model.metadata.patientName
    )}</div></div>
    <div class="meta-item"><div class="label">Analiz Penceresi</div><div class="val">${escapeHtml(
      model.metadata.periodLabel
    )}</div></div>
    <div class="meta-item"><div class="label">EWMA Baz Hattı</div><div class="val">${escapeHtml(
      model.metadata.baselineStatus
    )}</div></div>
    <div class="meta-item"><div class="label">Veri Kapsamı</div><div class="val">${
      model.metadata.activeMetricsCount
    } / ${model.metadata.totalMetricsCount} Aktif</div></div>
  </div>

  <div class="section-title">${escapeHtml(model.sectionOrder[0])}</div>
  <div class="kpi-grid">${kpiHtml}</div>
  <div class="summary-box">
    <div>${escapeHtml(model.executiveSummary.narrative)}</div>
    <ul style="margin:6px 0 0 16px; padding:0;">
      ${model.executiveSummary.clinicianReadingGuide.map((g) => `<li>${escapeHtml(g)}</li>`).join('')}
    </ul>
  </div>

  <div class="section-title">${escapeHtml(model.sectionOrder[1])}</div>
  ${notableRowsHtml}

  <div class="section-title teal">${escapeHtml(model.sectionOrder[2])}</div>
  ${medProtocolHtml}

  <div class="section-title teal">${escapeHtml(model.sectionOrder[3])}</div>
  ${medImpactHtml}

  <div class="section-title">${escapeHtml(model.sectionOrder[4])}</div>
  ${catHtml}

  <div class="section-title">${escapeHtml(model.sectionOrder[5])}</div>
  <table>
    <thead>
      <tr>
        <th>Değerlendirme Alanı</th>
        <th>Mevcut Dönem Ölçümü</th>
        <th>Önceki / Referans Ölçüm</th>
        <th>Karşılaştırmalı Değişim</th>
        <th>Klinik Yorum</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Öz-Bildirim Duygudurum (${ms.sampleCount} Kayıt)</strong></td>
        <td>Ruh Hali: ${escapeHtml(ms.avgMoodText)} • Enerji: ${escapeHtml(ms.avgEnergyText)}</td>
        <td>${escapeHtml(ms.minMaxMoodText)}</td>
        <td>${escapeHtml(ms.topTagsText)}</td>
        <td>${escapeHtml(ms.clinicalInterpretation)}</td>
      </tr>
      <tr>
        <td><strong>GAD-7 Anksiyete Ölçeği</strong></td>
        <td>${escapeHtml(sc.gad7CurrentText)} (${escapeHtml(sc.gad7Risk)})</td>
        <td>${escapeHtml(sc.gad7PreviousText)}</td>
        <td>${escapeHtml(sc.gad7DeltaText)}</td>
        <td>${escapeHtml(sc.clinicalInterpretation)}</td>
      </tr>
      <tr>
        <td><strong>PHQ-9 Depresyon Ölçeği</strong></td>
        <td>${escapeHtml(sc.phq9CurrentText)} (${escapeHtml(sc.phq9Risk)})</td>
        <td>${escapeHtml(sc.phq9PreviousText)}</td>
        <td>${escapeHtml(sc.phq9DeltaText)}</td>
        <td>${escapeHtml(sc.clinicalInterpretation)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">${escapeHtml(model.sectionOrder[6])}</div>
  ${notesHtml}

  <div class="section-title">${escapeHtml(model.sectionOrder[7])}</div>
  <div class="summary-box">
    <div><strong>Akademik Kaynakça:</strong> ${
      model.bibliographyAndMethodology.references.length > 0
        ? model.bibliographyAndMethodology.references
            .map((r) => `[${r.index}] ${escapeHtml(r.citation)}`)
            .join(' • ')
        : 'Akademik kaynak eşlemesi bulunmamaktadır.'
    }</div>
    <div style="margin-top:4px;">${escapeHtml(model.bibliographyAndMethodology.unreferencedMetricsText)}</div>
    <div style="margin-top:6px;"><strong>Yasal Uyarı:</strong> ${escapeHtml(
      model.bibliographyAndMethodology.legalDisclaimer
    )}</div>
  </div>
  <div class="footer">
    <span>Standart Klinik PDF Rapor Şablonu: ${escapeHtml(model.templateId)} (v${escapeHtml(
    model.templateVersion
  )})</span>
    <span>Oluşturulma Tarihi: ${escapeHtml(model.metadata.reportDateStr)}</span>
  </div>
</body>
</html>`;
}
