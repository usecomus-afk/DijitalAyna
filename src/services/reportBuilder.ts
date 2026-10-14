import { MetricKey } from '../types/sensor';
import { Insight, MoodReport } from '../types/engine';
import { ClinicalSurveyResult } from '../data/clinicalSurveys';
import { getMetricCitations } from '../engine/metricReferences';
import type { MedicationImpactReport } from '../types/medication';

export interface ReportMetricStat {
  key: MetricKey;
  label: string;
  unit: string;
  category: string;
  hasData: boolean;
  baselineMean: number | null;
  periodAvg: number | null;
  deviationPercent: number | null;
  zScore: number | null;
  unavailableReason: string;
}

export interface ReportAwarenessNote {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'attention' | 'warning';
  category: 'telemetry' | 'phenotype' | 'mood' | 'survey' | 'medication';
  sources?: string[];
}

export interface PinnedInsight {
  title: string;
  body: string;
  sources?: string[];
  addedAt: number;
}

export interface DoctorReportInput {
  patientName: string;
  rangeDays: number;
  generatedAt: Date;
  baselineStatus: string;
  stats: ReportMetricStat[];
  /** Structured medication impact & 1m/3m/6m comparative reports (mandatory in doctor share). */
  medImpactReports?: MedicationImpactReport[];
  /** Pre-rendered medication section (may be empty). */
  medicationSection?: string;
  /** Insights the user explicitly added to the report. */
  pinnedInsights?: PinnedInsight[];
  /** System-generated clinical notes (may be empty). */
  clinicalNotes?: string;
  /** Clinical survey scores (GAD-7 & PHQ-9). */
  clinicalSurveyScores?: {
    gad7Score: number;
    gad7Risk: string;
    phq9Score: number;
    phq9Risk: string;
    date: string;
  };
}

const CATEGORY_TITLES: Record<string, string> = {
  motion: 'Hareket',
  typing: 'Yazım',
  touch: 'Dokunma',
  session: 'Oturum ve Gece Kullanımı',
  sleep: 'Uyku ve Sirkadiyen Ritim (Apple Sağlık)',
  light: 'Işık',
  battery: 'Pil',
  network: 'Ağ',
  voice: 'Ses',
};

/** A change is considered notable when it is statistically (|z| >= 1.5) or practically (|%| >= 20) large. */
export const NOTABLE_Z = 1.5;
export const NOTABLE_PERCENT = 20;

export function isNotable(stat: ReportMetricStat): boolean {
  if (!stat.hasData) return false;
  const z = stat.zScore != null ? Math.abs(stat.zScore) : 0;
  const pct = stat.deviationPercent != null ? Math.abs(stat.deviationPercent) : 0;
  return z >= NOTABLE_Z || pct >= NOTABLE_PERCENT;
}

function fmt(n: number | null, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '-';
  const p = Math.pow(10, digits);
  return String(Math.round(n * p) / p);
}

function signed(n: number | null, suffix = ''): string {
  if (n == null || Number.isNaN(n)) return '-';
  return `${n > 0 ? '+' : ''}${fmt(n)}${suffix}`;
}

/**
 * Formats the mandatory "İlaç Etki & Zaman Serisi Bindirme Analizi" section including:
 * - Medication start date (T_0), usage schedule/time slots, and dosage
 * - Time-series overlay summary before & after T_0
 * - Comparative Digital Biomarkers Table across Pre-Medication (Last 1 Month, 3 Months, 6 Months)
 *   and Post-Medication (1 Month, 3 Months, 6 Months, Overall) windows.
 */
export function buildMedicationOverlayReportSection(medImpactReports: MedicationImpactReport[]): string {
  if (!medImpactReports || medImpactReports.length === 0) {
    return (
      'Sistemde henüz tanımlanmış aktif bir ilaç kaydı bulunmamaktadır. ' +
      'İlaç eklendiğinde kullanıma başlama tarihi (T₀), kullanım zamanı, dozaj bilgileri ve ilaç kullanılmaya başladıktan sonra ile ' +
      'kullanmadan önceki son 1 ay, 3 ay, 6 aylık Dijital Biyobelirteçler Tablosu karşılaştırmalı olarak bu bölümde paylaşılır.'
    );
  }

  const blocks: string[] = [];
  for (const ir of medImpactReports) {
    const lines: string[] = [];
    lines.push(`■ İLAÇ KİMLİK & KULLANIM PROTOKOLÜ: ${ir.medication.name}`);
    lines.push(`  • İlaç Adı: ${ir.medication.name}`);
    lines.push(`  • Dozaj Bilgisi: ${ir.formattedDosage}`);
    lines.push(`  • Kullanıma Başlama Tarihi (T₀): ${ir.medication.startDate} (${ir.daysActive}. gün)`);
    lines.push(`  • Kullanım Zamanı / Vakti: ${ir.formattedSchedule}`);
    if (ir.medication.notes) {
      lines.push(`  • Terapötik Amaç / Hekim Talimatı: ${ir.medication.notes}`);
    }
    lines.push('');
    lines.push('  [A] İLAÇ ETKİ & ZAMAN SERİSİ BİNDİRME ANALİZİ');
    lines.push(`  • ${ir.timeSeriesOverlaySummary}`);
    lines.push(`  • Klinik Değerlendirme: ${ir.overallSummary}`);
    if (ir.affectiveStateBefore !== null || ir.affectiveStateAfter !== null) {
      lines.push(
        `  • Öznel Duygudurum Endeksi (0-100): İlaç Öncesi ${
          ir.affectiveStateBefore !== null ? `${ir.affectiveStateBefore}/100` : 'Kayıt yok (—)'
        } → İlaç Başladıktan Sonra ${
          ir.affectiveStateAfter !== null ? `${ir.affectiveStateAfter}/100` : 'Kayıt yok (—)'
        }`
      );
    }
    lines.push('');
    lines.push(
      '  [B] KARŞILAŞTIRMALI DİJİTAL BİYOBELİRTEÇLER TABLOSU (İLAÇ KULLANMADAN ÖNCEKİ SON 1 AY, 3 AY, 6 AY vs İLAÇ KULLANILMAYA BAŞLADIKTAN SONRA)'
    );
    lines.push(
      '  Biçim: Biyobelirteç | Önceki Son 1 Ay (T-30G) | Önceki Son 3 Ay (T-90G) | Önceki Son 6 Ay (T-180G) | İlaç Başladıktan Sonra (T+ Dönem: Genel [1 Ay / 3 Ay / 6 Ay]) | Karşılaştırmalı Değişim (Delta %)'
    );

    for (const row of ir.multiPeriodTable) {
      const p1 =
        row.pre1Month.avg !== null
          ? `${row.pre1Month.avg} ${row.unit} (${row.pre1Month.sampleDays}g)`
          : 'Kayıt yok (—)';
      const p3 =
        row.pre3Months.avg !== null
          ? `${row.pre3Months.avg} ${row.unit} (${row.pre3Months.sampleDays}g)`
          : 'Kayıt yok (—)';
      const p6 =
        row.pre6Months.avg !== null
          ? `${row.pre6Months.avg} ${row.unit} (${row.pre6Months.sampleDays}g)`
          : 'Kayıt yok (—)';
      const postAll =
        row.postOverall.avg !== null
          ? `${row.postOverall.avg} ${row.unit} (${row.postOverall.sampleDays}g) [1A: ${
              row.post1Month.avg !== null ? `${row.post1Month.avg}` : '—'
            }, 3A: ${
              row.post3Months.avg !== null ? `${row.post3Months.avg}` : '—'
            }, 6A: ${
              row.post6Months.avg !== null ? `${row.post6Months.avg}` : '—'
            }]`
          : 'Kayıt yok (—)';

      const d1 =
        row.pre1Month.changePercent !== null
          ? `${row.pre1Month.changePercent > 0 ? '+' : ''}${row.pre1Month.changePercent}%`
          : '—';
      const d3 =
        row.pre3Months.changePercent !== null
          ? `${row.pre3Months.changePercent > 0 ? '+' : ''}${row.pre3Months.changePercent}%`
          : '—';
      const d6 =
        row.pre6Months.changePercent !== null
          ? `${row.pre6Months.changePercent > 0 ? '+' : ''}${row.pre6Months.changePercent}%`
          : '—';

      lines.push(
        `  - ${row.label}: Önceki 1 Ay: ${p1} | Önceki 3 Ay: ${p3} | Önceki 6 Ay: ${p6} → İlaç Sonrası: ${postAll} | Delta (1A: ${d1}, 3A: ${d3}, 6A: ${d6})`
      );
    }

    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}

/**
 * Builds a plain-text clinician report that is readable in Mail/Messages:
 * summary first, notable changes next, then grouped measurements. Every measured value carries
 * reference numbers that resolve in the bibliography at the end.
 */
export function buildDoctorReportText(input: DoctorReportInput): string {
  const { stats } = input;
  const active = stats.filter((s) => s.hasData);
  const missing = stats.filter((s) => !s.hasData);
  const notable = active.filter(isNotable).sort((a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0));

  // Number citations in order of first use so the bibliography is compact.
  const refIndex = new Map<string, number>();
  const refsFor = (key: MetricKey): string => {
    const cites = getMetricCitations(key);
    if (cites.length === 0) return '';
    const nums = cites.map((c) => {
      if (!refIndex.has(c)) refIndex.set(c, refIndex.size + 1);
      return refIndex.get(c)!;
    });
    return ` [${nums.join(',')}]`;
  };

  const L: string[] = [];
  const line = '────────────────────────';
  const dateStr = input.generatedAt.toLocaleDateString('tr-TR');

  L.push('DİJİTAL MENTAL İKİZİM — HEKİM RAPORU');
  L.push(`Kişi: ${input.patientName}`);
  L.push(`Dönem: Son ${input.rangeDays} gün | Oluşturulma: ${dateStr}`);
  L.push(`Baz hattı: ${input.baselineStatus}`);
  L.push('');

  L.push(line, '1) ÖZET', line);
  L.push(`• ${stats.length} göstergeden ${active.length} tanesi için bu dönemde veri var.`);
  L.push(
    notable.length > 0
      ? `• ${notable.length} gösterge kişinin kendi olağan düzeyinden belirgin sapmış (|z| ≥ ${NOTABLE_Z} veya |değişim| ≥ %${NOTABLE_PERCENT}).`
      : '• Kişinin kendi olağan düzeyinden belirgin sapma saptanmadı.'
  );
  if (missing.length > 0) {
    L.push(`• ${missing.length} gösterge için veri alınamadı (aşağıda gerekçeleriyle listelenmiştir).`);
  }
  L.push('');

  L.push(line, '2) ÖNE ÇIKAN DEĞİŞİMLER', line);
  if (notable.length === 0) {
    L.push('Bu dönemde öne çıkan değişim yok.');
  } else {
    for (const s of notable) {
      L.push(
        `• ${s.label}: baz ${fmt(s.baselineMean)} → dönem ${fmt(s.periodAvg)} ${s.unit} ` +
          `(${signed(s.deviationPercent, '%')}, z=${signed(s.zScore)})${refsFor(s.key)}`
      );
    }
  }
  L.push('');

  L.push(line, '3) ÖLÇÜMLER (kategorilere göre)', line);
  L.push('Biçim: Gösterge: baz → dönem ortalaması birim (değişim %, z) [kaynak no]');
  const categories = Array.from(new Set(active.map((s) => s.category)));
  for (const cat of categories) {
    L.push('', `${CATEGORY_TITLES[cat] ?? cat}`);
    for (const s of active.filter((x) => x.category === cat)) {
      L.push(
        `  - ${s.label}: ${fmt(s.baselineMean)} → ${fmt(s.periodAvg)} ${s.unit} ` +
          `(${signed(s.deviationPercent, '%')}, z=${signed(s.zScore)})${refsFor(s.key)}`
      );
    }
  }
  if (active.length === 0) L.push('Bu dönemde ölçüm verisi yok.');
  L.push('');

  if (missing.length > 0) {
    L.push(line, '4) VERİ ALINAMAYAN GÖSTERGELER', line);
    for (const s of missing) {
      L.push(`  - ${s.label}: ${s.unavailableReason}`);
    }
    L.push('');
  }

  // 5) İlaç Etki & Zaman Serisi Bindirme Analizi (Always included in Doctor Share Report)
  const renderedMedSection =
    input.medicationSection && input.medicationSection.trim()
      ? input.medicationSection.trim()
      : buildMedicationOverlayReportSection(input.medImpactReports ?? []);

  L.push(
    line,
    '5) İLAÇ ETKİ & ZAMAN SERİSİ BİNDİRME ANALİZİ (1 AY, 3 AY, 6 AY KARŞILAŞTIRMALI DİJİTAL BİYOBELİRTEÇLER TABLOSU)',
    line
  );
  L.push(renderedMedSection, '');

  const pinned = input.pinnedInsights ?? [];
  if (pinned.length > 0 || (input.clinicalNotes && input.clinicalNotes.trim())) {
    L.push(line, '6) NOTLAR VE EKLENEN İÇGÖRÜLER', line);
    for (const p of pinned) {
      L.push(`• ${p.title}: ${p.body}`);
      if (p.sources && p.sources.length > 0) L.push(`  Kaynak: ${p.sources.join('; ')}`);
    }
    if (input.clinicalNotes && input.clinicalNotes.trim()) L.push(input.clinicalNotes.trim());
    L.push('');
  }

  if (input.clinicalSurveyScores) {
    const scores = input.clinicalSurveyScores;
    L.push(line, '7) KLİNİK TARAMA SKORLARI', line);
    L.push(`Klinik Tarama Skorları: GAD-7 Anksiyete: ${scores.gad7Score}/21 (${scores.gad7Risk}) | PHQ-9 Depresyon: ${scores.phq9Score}/27 (${scores.phq9Risk}). Değerlendirme Tarihi: ${scores.date}.`);
    L.push('');
  }

  L.push(line, 'KAYNAKÇA', line);
  if (refIndex.size === 0) {
    L.push('Bu raporda yer alan göstergelerin hiçbiri için sistemde tanımlı bir akademik kaynak eşlemesi yok.');
  } else {
    for (const [citation, n] of Array.from(refIndex.entries()).sort((a, b) => a[1] - b[1])) {
      L.push(`[${n}] ${citation}`);
    }
    L.push(
      'Not: Kaynaklar, ilgili göstergenin kullanıldığı davranışsal örüntü kuralına karşılık gelen yazar-yıl künyeleridir. Tam bibliyografik bilgiler uygulama dokümantasyonunda doğrulanmalıdır.'
    );
  }
  const noRef = active.filter((s) => getMetricCitations(s.key).length === 0);
  if (noRef.length > 0) {
    L.push(`Akademik kaynak eşlemesi olmayan göstergeler (teknik ölçüm): ${noRef.map((s) => s.label).join(', ')}.`);
  }
  L.push('');

  L.push(line, 'YÖNTEM VE YASAL UYARI', line);
  L.push(
    '• Baz hattı: kişinin kendi geçmiş verisinden hesaplanan üstel ağırlıklı hareketli ortalama (EWMA). ' +
      'z = (dönem ortalaması − baz ortalaması) / baz standart sapması. Kişi başkalarıyla değil, kendi olağan düzeyiyle kıyaslanır.'
  );
  L.push(
    '• Bu rapor tıbbi teşhis veya tanı belgesi değildir. Cihaz kullanım alışkanlıklarına ilişkin istatistiksel karar-destek verisidir; yorum ve karar hekime aittir.'
  );

  return L.join('\n');
}

export interface AwarenessNotesInput {
  stats: ReportMetricStat[];
  insights?: Insight[];
  moods?: MoodReport[];
  surveys?: ClinicalSurveyResult[];
  medImpactReports?: MedicationImpactReport[];
  effectiveDayCount: number;
  rangeDays: number;
}

/**
 * Generates real, data-grounded awareness notes ("Sistem Tarafından Üretilen Farkındalık Notları")
 * directly from actual recorded sensor metrics, EWMA baselines, Z-scores, longitudinal phenotype alerts,
 * user mood reports, clinical surveys (GAD-7/PHQ-9), and medication delta analytics.
 * Strictly Zero-Mock: never fabricates numbers; reports exact measured values.
 */
export function generateRealReportAwarenessNotes(input: AwarenessNotesInput): ReportAwarenessNote[] {
  const {
    stats,
    insights = [],
    moods = [],
    surveys = [],
    medImpactReports = [],
    effectiveDayCount,
    rangeDays,
  } = input;

  const notes: ReportAwarenessNote[] = [];
  const activeStats = stats.filter((s) => s.hasData && s.periodAvg !== null);
  const notableStats = activeStats
    .filter(isNotable)
    .sort((a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0));

  // 1. Real Phenotype & Longitudinal Early Awareness Alerts from Insights Engine
  const realPhenotypeInsights = insights.filter(
    (ins) =>
      ins.biomarkerType !== 'healthy_balance' &&
      ins.biomarkerType !== 'learning_phase'
  );

  for (const ins of realPhenotypeInsights.slice(0, 3)) {
    const citeSet = new Set<string>();
    for (const ev of ins.evidence || []) {
      for (const c of getMetricCitations(ev.metricKey)) citeSet.add(c);
    }
    notes.push({
      id: `insight-${ins.id ?? ins.biomarkerType}-${ins.date}`,
      title: ins.title,
      body: ins.body,
      severity: ins.severity === 'high' ? 'warning' : 'attention',
      category: 'phenotype',
      sources: citeSet.size > 0 ? Array.from(citeSet) : undefined,
    });
  }

  // 2. Notable EWMA Deviations (|z| >= 1.5 or |%| >= 20) from Real Sensor Telemetry
  if (notableStats.length > 0) {
    const details = notableStats
      .slice(0, 5)
      .map((s) => {
        const zStr = s.zScore !== null ? `, Z=${signed(s.zScore)}σ` : '';
        const pctStr = s.deviationPercent !== null ? ` (${signed(s.deviationPercent, '%')}${zStr})` : '';
        return `${s.label}: dönem ort. ${fmt(s.periodAvg)} ${s.unit} vs kişisel baz ${fmt(s.baselineMean)} ${s.unit}${pctStr}`;
      })
      .join(' • ');

    notes.push({
      id: 'ewma-notable-deviations',
      title: `Ölçülen Biyobelirteç Sapmaları (${notableStats.length} Gösterge)`,
      body: `Son ${rangeDays} günlük gerçek sensör telemetrisinde kişinin kendi EWMA baz hattına kıyasla istatistiksel sapma gösteren biyobelirteçler: ${details}. Bu bulgular kesin tanı koymaz; potansiyel davranışsal örüntü değişimine işaret edebilir.`,
      severity: notableStats.some((s) => Math.abs(s.zScore ?? 0) >= 2.0) ? 'warning' : 'attention',
      category: 'telemetry',
    });
  }

  // 3. Active Sensor & Biomarker Measurement Synthesis (always grounded in real recorded values)
  if (activeStats.length > 0) {
    const priorityOrder: MetricKey[] = [
      'screen_on_time',
      'session_duration',
      'night_usage_minutes',
      'cognitive_fatigue_score',
      'impulse_risk_index',
      'touch_interaction_frequency',
      'touch_scroll_velocity',
      'typing_wpm',
      'typing_iki',
      'typing_backspace_rate',
      'typing_hold_time',
      'sleep_duration',
      'sleep_efficiency',
      'mobility_index',
      'light_ambient_lux',
      'night_light_violations',
      'battery_level',
    ];

    const statMap = new Map(activeStats.map((s) => [s.key, s]));
    const picked: ReportMetricStat[] = [];
    for (const k of priorityOrder) {
      const found = statMap.get(k);
      if (found) picked.push(found);
      if (picked.length >= 6) break;
    }
    if (picked.length < 6) {
      for (const s of activeStats) {
        if (!picked.some((p) => p.key === s.key)) picked.push(s);
        if (picked.length >= 6) break;
      }
    }

    const summaryItems = picked
      .map((s) => `${s.label}: ${fmt(s.periodAvg)} ${s.unit}`)
      .join(', ');

    const baselineContext =
      effectiveDayCount < 14
        ? `Kişisel EWMA baz hattı öğrenme süreci devam etmektedir (${effectiveDayCount}/14 gün). `
        : `14 günlük kişisel EWMA baz hattı referans alınmıştır (${effectiveDayCount} gün veri). `;

    notes.push({
      id: 'active-telemetry-summary',
      title: `Gerçek Cihaz Telemetrisi & Aktif Biyobelirteç Özeti (${activeStats.length}/${stats.length} Aktif)`,
      body: `${baselineContext}Son ${rangeDays} günde cihaz sensörlerinden doğrulanan gerçek ölçüm ortalamaları: ${summaryItems}.`,
      severity: 'info',
      category: 'telemetry',
    });
  }

  // 4. Real Self-Reported Mood, Energy & Subjective Anxiety Summary
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const periodMoods = moods.filter((m) => m.date >= cutoffStr);

  if (periodMoods.length > 0) {
    const avgMood =
      Math.round((periodMoods.reduce((acc, m) => acc + m.score, 0) / periodMoods.length) * 10) / 10;
    const energyVals = periodMoods
      .filter((m) => typeof m.energyScore === 'number')
      .map((m) => m.energyScore as number);

    const avgEnergy =
      energyVals.length > 0
        ? Math.round((energyVals.reduce((a, b) => a + b, 0) / energyVals.length) * 10) / 10
        : null;

    const tagCounts = new Map<string, number>();
    for (const m of periodMoods) {
      for (const t of m.tags || []) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => `${tag} (${count}x)`);

    const subMetrics = [
      `ortalama ruh hali ${avgMood}/5`,
      avgEnergy !== null ? `enerji düzeyi ${avgEnergy}/5` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const tagSuffix = topTags.length > 0 ? ` Öne çıkan bağlam etiketleri: ${topTags.join(', ')}.` : '';
    const isLowMood = avgMood <= 2.4;

    notes.push({
      id: 'real-mood-summary',
      title: `Öz-Bildirim Duygudurum & Enerji Analizi (${periodMoods.length} Kayıt)`,
      body: `Son ${rangeDays} günde kullanıcı tarafından girilen ${periodMoods.length} gerçek duygudurum kaydında ${subMetrics} olarak hesaplanmıştır.${tagSuffix}`,
      severity: isLowMood ? 'attention' : 'info',
      category: 'mood',
    });
  }

  // 5. Real Clinical Survey Results (GAD-7 & PHQ-9)
  if (surveys.length > 0) {
    const sortedSurveys = [...surveys].sort((a, b) => b.timestamp - a.timestamp);
    const latest = sortedSurveys[0];
    const prev = sortedSurveys[1];

    let deltaText = '';
    if (prev) {
      const gadDiff = latest.gad7Score - prev.gad7Score;
      const phqDiff = latest.phq9Score - prev.phq9Score;
      deltaText = ` Önceki değerlendirmeye (${prev.date}) göre GAD-7 değişimi ${gadDiff > 0 ? '+' : ''}${gadDiff} puan, PHQ-9 değişimi ${phqDiff > 0 ? '+' : ''}${phqDiff} puandır.`;
    }

    const isElevated = latest.gad7Score >= 10 || latest.phq9Score >= 10;
    notes.push({
      id: 'real-clinical-survey',
      title: `Klinik Tarama Ölçek Bulguları (GAD-7 & PHQ-9 — ${latest.date})`,
      body: `Kaydedilen son öz-değerlendirme ölçeklerinde GAD-7 Anksiyete skoru ${latest.gad7Score}/21 (${latest.gad7Risk}) ve PHQ-9 Depresyon skoru ${latest.phq9Score}/27 (${latest.phq9Risk}) olarak ölçülmüştür.${deltaText} Bu skorlar ön tarama amaçlıdır; klinik tanı yerine geçmez.`,
      severity: isElevated ? 'attention' : 'info',
      category: 'survey',
    });
  }

  // 6. Real Medication Pre/Post Delta Summary
  if (medImpactReports.length > 0) {
    for (const ir of medImpactReports.slice(0, 2)) {
      const activeDeltas = ir.deltas.filter((d) => d.changePercent !== null);
      const deltaStr =
        activeDeltas.length > 0
          ? ` Ölçülen öncesi/sonrası değişimler: ${activeDeltas
              .slice(0, 3)
              .map((d) => `${d.label} (${d.changePercent! > 0 ? '+' : ''}${d.changePercent}%)`)
              .join(', ')}.`
          : '';
      notes.push({
        id: `med-impact-${ir.medication.id ?? ir.medication.name}`,
        title: `Tedavi & İlaç Yanıtı Delta Özeti: ${ir.medication.name} (${ir.medication.dosage} mg)`,
        body: `${ir.overallSummary}${deltaStr}`,
        severity: 'info',
        category: 'medication',
      });
    }
  }

  // 7. If zero data has been collected yet across all sources
  if (notes.length === 0) {
    notes.push({
      id: 'awaiting-first-real-telemetry',
      title: 'Gerçek Zamanlı Sensör Telemetrisi Başlatıldı',
      body: 'Cihaz içi izin gerektirmeyen aktif sensörler (oturum süresi, dokunma dinamiği, yazım ritmi, ortam ışığı vekili ve ağ durumu) dinlemededir. İlk kullanım oturumu ve etkileşim verileri kaydedildiğinde bu bölümde gerçek ölçümlere dayalı farkındalık notları yer alacaktır.',
      severity: 'info',
      category: 'telemetry',
    });
  }

  return notes;
}

export {
  DOCTOR_REPORT_TEMPLATE_ID,
  DOCTOR_REPORT_TEMPLATE_VERSION,
  DOCTOR_REPORT_TEMPLATE_TITLE,
  DOCTOR_REPORT_TEMPLATE_SUBTITLE,
  DOCTOR_REPORT_SECTION_ORDER,
  CATEGORY_LABELS_TR,
  buildCanonicalDoctorReportTemplate,
  generateDoctorReportPdfBytes,
  generateDoctorReportPdfFile,
  renderDoctorReportTemplateHtml,
  normalizeTextForPdf,
  encodePdfLiteralString,
} from './pdfReportTemplate';
export type {
  CanonicalDoctorReportInput,
  CanonicalDoctorReportModel,
  ReportKpiComparisonCard,
  NotableComparisonRow,
  DailyMedicationProtocolRow,
  MedicationMultiPeriodTemplateRow,
  MedicationImpactTemplateSection,
  CategorizedMetricTemplateRow,
  CategorizedMetricsGroup,
} from './pdfReportTemplate';

