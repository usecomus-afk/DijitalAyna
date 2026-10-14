import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DOCTOR_REPORT_TEMPLATE_ID,
  DOCTOR_REPORT_SECTION_ORDER,
  buildCanonicalDoctorReportTemplate,
  generateDoctorReportPdfBytes,
  generateDoctorReportPdfFile,
  renderDoctorReportTemplateHtml,
  encodePdfLiteralString,
  ReportMetricStat,
} from '../reportBuilder';
import { shareDoctorReportPdf } from '../shareService';
import { analyzeMedicationImpact } from '../../engine/medicationAnalytics';

function makeStat(overrides: Partial<ReportMetricStat>): ReportMetricStat {
  return {
    key: 'typing_wpm',
    label: 'Yazım Hızı',
    unit: 'WPM',
    category: 'typing',
    hasData: true,
    baselineMean: 42,
    periodAvg: 29,
    deviationPercent: -31,
    zScore: -2.4,
    unavailableReason: '',
    ...overrides,
  };
}

describe('Standardized Doctor Report PDF Template & Sharing Pipeline (STD-DMI-CLINICAL-PDF-V2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. builds the exact same canonical 8-section structure every time a report is generated', () => {
    const medReport = analyzeMedicationImpact(
      {
        id: 1,
        name: 'Escitalopram',
        dosage: '10',
        timeSlots: ['morning'],
        customTimes: ['09:00'],
        startDate: '2026-09-01',
        notes: 'Sabah tok karnına anksiyete ve duygudurum regülasyonu',
        createdAt: Date.now(),
      },
      [
        { date: '2026-05-10', metricKey: 'night_usage_minutes', value: 48, sampleCount: 1 },
        { date: '2026-07-15', metricKey: 'night_usage_minutes', value: 36, sampleCount: 1 },
        { date: '2026-08-20', metricKey: 'night_usage_minutes', value: 28, sampleCount: 1 },
        { date: '2026-09-10', metricKey: 'night_usage_minutes', value: 12, sampleCount: 1 },
      ],
      [],
      []
    );

    const input = {
      patientName: 'Ayşe Yılmaz',
      patientEmail: 'ayse@ornek.com',
      rangeDays: 14,
      generatedAt: new Date('2026-10-14T10:00:00Z'),
      effectiveDayCount: 16,
      stats: [
        makeStat({}),
        makeStat({
          key: 'night_usage_minutes',
          label: 'Gece Kullanımı (02:00–04:00)',
          unit: 'dk',
          category: 'session',
          baselineMean: 10,
          periodAvg: 24,
          deviationPercent: 140,
          zScore: 2.8,
        }),
        makeStat({
          key: 'sleep_duration',
          label: 'Toplam Uyku Süresi',
          unit: 'dk',
          category: 'sleep',
          hasData: false,
          baselineMean: null,
          periodAvg: null,
          deviationPercent: null,
          zScore: null,
          unavailableReason: 'Apple Sağlık (HealthKit) izni bekleniyor',
        }),
      ],
      medications: [medReport.medication],
      todaysLogs: [
        {
          id: 1,
          medicationId: 1,
          date: '2026-10-14',
          timestamp: Date.now(),
          taken: true,
        },
      ],
      medImpactReports: [medReport],
      moods: [
        { date: '2026-10-12', timestamp: 1, score: 3, energyScore: 3, tags: ['Odaklı'] },
        { date: '2026-10-13', timestamp: 2, score: 4, energyScore: 4, tags: ['Dinlenmiş'] },
      ],
      surveys: [
        {
          date: '2026-10-13',
          timestamp: 200,
          gad7Score: 8,
          gad7Risk: 'Hafif' as const,
          phq9Score: 7,
          phq9Risk: 'Hafif' as const,
          crisisRisk: false,
          responses: [1, 1, 1, 1, 1, 1, 1],
        },
        {
          date: '2026-09-25',
          timestamp: 100,
          gad7Score: 13,
          gad7Risk: 'Orta' as const,
          phq9Score: 12,
          phq9Risk: 'Orta' as const,
          crisisRisk: false,
          responses: [2, 2, 2, 2, 2, 1, 1],
        },
      ],
      pinnedInsights: [
        {
          title: 'Gece Ekran Maruziyeti Sinyali',
          body: 'Son hafta 02:00-04:00 arasında ekran kullanımında artış izlendi.',
          sources: ['Lee et al., 2025'],
          addedAt: 1,
        },
      ],
    };

    const modelA = buildCanonicalDoctorReportTemplate(input);
    const modelB = buildCanonicalDoctorReportTemplate(input);

    // Every report generated must use the exact same template ID and 8-section structure
    expect(modelA.templateId).toBe(DOCTOR_REPORT_TEMPLATE_ID);
    expect(modelB.templateId).toBe(DOCTOR_REPORT_TEMPLATE_ID);
    expect(modelA.sectionOrder).toEqual(DOCTOR_REPORT_SECTION_ORDER);
    expect(modelA.sectionOrder.length).toBe(8);
    expect(modelA.filename).toBe('Dijital_Mental_Ikizim_Hekim_Raporu_Ayşe_Yılmaz_2026-10-14.pdf');

    // KPI Cards are present and comparable
    expect(modelA.kpiCards.length).toBe(4);
    expect(modelA.kpiCards[0].primaryValue).toBe('2 / 3 Aktif');
    expect(modelA.kpiCards[1].primaryValue).toBe('2 Belirgin Sapma');

    // Notable deviations are sorted by |Z-score| and contain clinical explanations
    expect(modelA.notableComparisons.length).toBe(2);
    expect(modelA.notableComparisons[0].key).toBe('night_usage_minutes');
    expect(modelA.notableComparisons[0].baselineText).toBe('10 dk');
    expect(modelA.notableComparisons[0].periodAvgText).toBe('24 dk');
    expect(modelA.notableComparisons[0].deviationText).toBe('+140%');
    expect(modelA.notableComparisons[0].clinicalInterpretation).toContain('sirkadiyen');

    // Medication 1M / 3M / 6M comparison section is populated
    expect(modelA.medicationImpactSections.length).toBe(1);
    const medSec = modelA.medicationImpactSections[0];
    expect(medSec.medicationName).toBe('Escitalopram');
    expect(medSec.dosage).toBe('10 mg');
    const nightRow = medSec.rows.find((r) => r.metricKey === 'night_usage_minutes');
    expect(nightRow).toBeDefined();
    expect(nightRow?.pre1MonthText).toContain('28 dk');
    expect(nightRow?.postOverallText).toContain('12 dk');
    expect(nightRow?.delta1MText).toBe('-57%');

    // Survey comparison calculates delta between latest and previous assessment
    expect(modelA.moodAndSurveyComparison.surveyComparison.hasSurvey).toBe(true);
    expect(modelA.moodAndSurveyComparison.surveyComparison.gad7DeltaText).toContain('-5 puan');
    expect(modelA.moodAndSurveyComparison.surveyComparison.phq9DeltaText).toContain('-5 puan');
  });

  it('2. encodes Turkish characters (Ğ, ğ, İ, ı, Ş, ş, Ç, ç, Ö, ö, Ü, ü) accurately into PDF 1.4 octal strings', () => {
    const encoded = encodePdfLiteralString('Şablon: Ğğ İı Şş Çç Öö Üü — %50');
    expect(encoded.startsWith('(')).toBe(true);
    expect(encoded.endsWith(')')).toBe(true);
    // Ğ = 208 = \320, ğ = 240 = \360, İ = 221 = \335, ı = 253 = \375, Ş = 222 = \336, ş = 254 = \376
    expect(encoded).toContain('\\320\\360');
    expect(encoded).toContain('\\335\\375');
    expect(encoded).toContain('\\336\\376');
    // Pure 7-bit ASCII output
    for (let i = 0; i < encoded.length; i++) {
      expect(encoded.charCodeAt(i)).toBeLessThan(128);
    }
  });

  it('3. generates a valid multi-page A4 PDF 1.4 binary file and HTML print document from the canonical template', () => {
    const sampleInput = {
      patientName: 'Mehmet Özdemir',
      rangeDays: 14,
      generatedAt: new Date('2026-10-14T10:00:00Z'),
      effectiveDayCount: 14,
      stats: [
        makeStat({}),
        makeStat({
          key: 'touch_scroll_velocity',
          label: 'Kaydırma Hızı',
          unit: 'px/sn',
          category: 'touch',
          baselineMean: 400,
          periodAvg: 410,
          deviationPercent: 3,
          zScore: 0.2,
        }),
      ],
    };
    const directBytes = generateDoctorReportPdfBytes(sampleInput);
    const { file, blob, bytes, filename, model } = generateDoctorReportPdfFile(sampleInput);

    expect(directBytes.byteLength).toBe(bytes.byteLength);

    expect(model.templateId).toBe(DOCTOR_REPORT_TEMPLATE_ID);
    expect(filename).toContain('.pdf');
    expect(blob.type).toBe('application/pdf');
    expect(file.type).toBe('application/pdf');
    expect(bytes.byteLength).toBeGreaterThan(2500);

    const asciiText = new TextDecoder('latin1').decode(bytes);
    expect(asciiText.startsWith('%PDF-1.4\n')).toBe(true);
    expect(asciiText).toContain('/Type /Catalog');
    expect(asciiText).toContain('/Type /Pages');
    expect(asciiText).toContain('/Differences [ 208 /Gbreve 221 /Idotaccent 222 /Scedilla 240 /gbreve 253 /dotlessi 254 /scedilla ]');
    expect(asciiText).toContain('STD-DMI-CLINICAL-PDF-V2');
    expect(asciiText.trimEnd().endsWith('%%EOF')).toBe(true);

    // Verify HTML print template also contains all 8 canonical sections
    const html = renderDoctorReportTemplateHtml(model);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(DOCTOR_REPORT_TEMPLATE_ID);
    for (const sec of DOCTOR_REPORT_SECTION_ORDER) {
      expect(html).toContain(sec.replace(/&/g, '&amp;'));
    }
  });

  it('4. shares and downloads using the exact same canonical PDF template via shareDoctorReportPdf', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const canShareSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: shareSpy,
        canShare: canShareSpy,
      },
      configurable: true,
      writable: true,
    });

    const reportInput = {
      patientName: 'Zeynep Kaya',
      rangeDays: 30,
      generatedAt: new Date('2026-10-14T10:00:00Z'),
      stats: [makeStat({})],
    };

    const shareOutcome = await shareDoctorReportPdf(reportInput, 'share');
    expect(shareOutcome.success).toBe(true);
    expect(shareOutcome.templateId).toBe(DOCTOR_REPORT_TEMPLATE_ID);
    expect(shareOutcome.filename).toBe('Dijital_Mental_Ikizim_Hekim_Raporu_Zeynep_Kaya_2026-10-14.pdf');
    expect(shareOutcome.pdfBytes.byteLength).toBeGreaterThan(2500);

    // Verify navigator.share was called with a real PDF File attachment built from the template
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const passedArg = shareSpy.mock.calls[0][0];
    expect(passedArg.files).toBeDefined();
    expect(passedArg.files.length).toBe(1);
    expect(passedArg.files[0].name).toBe('Dijital_Mental_Ikizim_Hekim_Raporu_Zeynep_Kaya_2026-10-14.pdf');
    expect(passedArg.files[0].type).toBe('application/pdf');

    // Verify download mode produces the exact same template and PDF bytes
    const downloadOutcome = await shareDoctorReportPdf(reportInput, 'download');
    expect(downloadOutcome.templateId).toBe(DOCTOR_REPORT_TEMPLATE_ID);
    expect(downloadOutcome.filename).toBe(shareOutcome.filename);
    expect(downloadOutcome.pdfBytes.byteLength).toBe(shareOutcome.pdfBytes.byteLength);
  });
});
