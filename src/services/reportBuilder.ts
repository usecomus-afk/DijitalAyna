import { MetricKey } from '../types/sensor';
import { getMetricCitations } from '../engine/metricReferences';

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

  if (input.medicationSection && input.medicationSection.trim()) {
    L.push(line, '5) İLAÇ KULLANIMI VE TEDAVİ YANITI', line);
    L.push(input.medicationSection.trim(), '');
  }

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
