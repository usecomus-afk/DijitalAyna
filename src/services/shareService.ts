import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import {
  buildCanonicalDoctorReportTemplate,
  CanonicalDoctorReportInput,
  CanonicalDoctorReportModel,
  DOCTOR_REPORT_TEMPLATE_ID,
  generateDoctorReportPdfFile,
  renderDoctorReportTemplateHtml,
} from './pdfReportTemplate';
import { buildDoctorReportText } from './reportBuilder';

export interface ShareOptions {
  title: string;
  text: string;
  url?: string;
  files?: File[];
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'download' | 'print';
  message: string;
}

export interface DoctorReportShareResult extends ShareResult {
  templateId: typeof DOCTOR_REPORT_TEMPLATE_ID;
  filename: string;
  pdfBytes: Uint8Array;
  model: CanonicalDoctorReportModel;
}

/**
 * Triggers a clean browser download for a Blob/File (such as the generated PDF report).
 */
export function triggerBrowserPdfDownload(blob: Blob, filename: string): boolean {
  if (Capacitor.isNativePlatform()) {
    return false;
  }
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false;
  }
  try {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore revoke errors
      }
    }, 3000);
    return true;
  } catch (err) {
    console.warn('[ShareService] PDF download trigger failed:', err);
    return false;
  }
}

/**
 * Prints the canonical HTML template inside an isolated hidden iframe (or falls back to window.print)
 * so every printed report strictly adheres to the STD-DMI-CLINICAL-PDF-V2 layout.
 */
export function printCanonicalDoctorReportHtml(htmlDocument: string): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return false;
  }
  try {
    const existingFrame = document.getElementById('comus-canonical-pdf-print-frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'comus-canonical-pdf-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (frameDoc && iframe.contentWindow) {
      frameDoc.open();
      frameDoc.write(htmlDocument);
      frameDoc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 150);
      return true;
    }
  } catch (err) {
    console.warn('[ShareService] Iframe print fallback to window.print:', err);
  }

  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
    return true;
  }
  return false;
}

/**
 * Copies text to clipboard using navigator.clipboard with hidden textarea fallback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (clipErr) {
      console.warn('[ShareService] navigator.clipboard failed, attempting fallback textarea:', clipErr);
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      return copied;
    } catch (fallbackErr) {
      console.error('[ShareService] Clipboard fallback textarea failed:', fallbackErr);
    }
  }
  return false;
}

/**
 * Universal Share Service with @capacitor/share, Web Share API,
 * and bulletproof Clipboard fallback.
 */
export async function shareContent(options: ShareOptions): Promise<ShareResult> {
  const { title, text, url, files } = options;

  // 1. On Native Capacitor (iOS & Android), ALWAYS use native @capacitor/share with text directly
  // (never pass in-memory File blobs to WKWebView navigator.share on capacitor://localhost, which can lock iOS WebView)
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        ...(url ? { url } : {}),
        dialogTitle: title,
      });
      return {
        success: true,
        method: 'native',
        message: 'Klinik rapor başarıyla paylaşıldı.',
      };
    } catch (err: any) {
      if (err?.message?.includes('canceled') || err?.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          message: 'Paylaşım iptal edildi.',
        };
      }
      console.warn('[ShareService] Capacitor Share error, trying clipboard fallback:', err);
    }
  }

  // 2. On Web Browsers (non-native): If File attachments are provided, try Web Share API Level 2
  if (
    !Capacitor.isNativePlatform() &&
    files &&
    files.length > 0 &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      const canShareFiles =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files }) : true;
      if (canShareFiles) {
        await navigator.share({
          title,
          text,
          files,
        });
        return {
          success: true,
          method: 'native',
          message: `Standart şablonlu PDF raporu (${files[0].name}) başarıyla paylaşıldı.`,
        };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return {
          success: false,
          method: 'native',
          message: 'Paylaşım iptal edildi.',
        };
      }
      console.warn('[ShareService] Web file share failed, falling back to text share:', err);
    }
  }

  // 3. Try Web Share API with plain text (Mobile Safari, Chrome Mobile, Chrome Desktop - non-native only)
  if (!Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && navigator.share) {
    try {
      const safeFallbackUrl =
        typeof window !== 'undefined' && /^https?:\/\//i.test(window.location.href)
          ? window.location.href
          : undefined;
      const shareData: ShareData = {
        title,
        text,
        ...(url || safeFallbackUrl ? { url: url || safeFallbackUrl } : {}),
      };

      await navigator.share(shareData);
      return {
        success: true,
        method: 'native',
        message: 'Klinik rapor başarıyla paylaşıldı.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return {
          success: false,
          method: 'native',
          message: 'Paylaşım iptal edildi.',
        };
      }
      console.warn('[ShareService] Web share failed, falling back to download/clipboard:', err);
    }
  }

  // 4. If PDF file is present on desktop browser without Web Share API, trigger PDF download automatically
  let downloadedPdf = false;
  if (files && files.length > 0 && !Capacitor.isNativePlatform()) {
    downloadedPdf = triggerBrowserPdfDownload(files[0], files[0].name);
  }

  // 5. Fallback: Copy to Clipboard
  const fullText = `${title}\n\n${text}${url ? `\n\n${url}` : ''}`;
  await copyTextToClipboard(fullText);

  if (downloadedPdf && files && files.length > 0) {
    return {
      success: true,
      method: 'download',
      message: `Standart şablonlu PDF raporu (${files[0].name}) indirildi ve rapor özeti panoya kopyalandı!`,
    };
  }

  return {
    success: true,
    method: 'clipboard',
    message: 'Rapor metni panoya kopyalandı! Doktorunuza mesaj veya e-posta olarak gönderebilirsiniz.',
  };
}

/**
 * Unified Doctor Report PDF Sharing & Export Pipeline.
 * Guarantees that EVERY time a doctor report is shared, downloaded, or printed,
 * the exact same canonical template (`STD-DMI-CLINICAL-PDF-V2`) is used.
 */
export async function shareDoctorReportPdf(
  input: CanonicalDoctorReportInput,
  mode: 'share' | 'download' | 'print' = 'share'
): Promise<DoctorReportShareResult> {
  const model = buildCanonicalDoctorReportTemplate(input);
  const { file, blob, bytes, filename } = generateDoctorReportPdfFile(model);

  const clinicalNotesText = model.awarenessNotes
    .map(
      (n) =>
        `• ${n.title}: ${n.body}${
          n.sources && n.sources.length > 0 ? `\n  Kaynak: ${n.sources.join('; ')}` : ''
        }`
    )
    .join('\n');

  const latestSurvey = input.surveys && input.surveys.length > 0 ? input.surveys[0] : undefined;
  const companionText = buildDoctorReportText({
    patientName: model.metadata.patientName,
    rangeDays: model.metadata.rangeDays,
    generatedAt: input.generatedAt ?? new Date(),
    baselineStatus: model.metadata.baselineStatus,
    stats: input.stats,
    medImpactReports: input.medImpactReports,
    pinnedInsights: input.pinnedInsights,
    clinicalNotes: clinicalNotesText,
    clinicalSurveyScores: latestSurvey
      ? {
          gad7Score: latestSurvey.gad7Score,
          gad7Risk: latestSurvey.gad7Risk,
          phq9Score: latestSurvey.phq9Score,
          phq9Risk: latestSurvey.phq9Risk,
          date: latestSurvey.date,
        }
      : undefined,
  });

  if (mode === 'download') {
    if (Capacitor.isNativePlatform()) {
      const shareRes = await shareContent({
        title: `Dijital Mental İkizim Hekim Raporu (${DOCTOR_REPORT_TEMPLATE_ID}) — ${model.metadata.patientName}`,
        text: companionText,
        files: [file],
      });
      return {
        ...shareRes,
        templateId: DOCTOR_REPORT_TEMPLATE_ID,
        filename,
        pdfBytes: bytes,
        model,
      };
    }
    const ok = triggerBrowserPdfDownload(blob, filename);
    return {
      success: true,
      method: 'download',
      message: ok
        ? `Standart şablonlu PDF raporu (${filename}) cihazınıza indirildi.`
        : `Standart PDF raporu (${filename}) oluşturuldu.`,
      templateId: DOCTOR_REPORT_TEMPLATE_ID,
      filename,
      pdfBytes: bytes,
      model,
    };
  }

  if (mode === 'print') {
    if (!Capacitor.isNativePlatform()) {
      triggerBrowserPdfDownload(blob, filename);
    }
    const html = renderDoctorReportTemplateHtml(model);
    printCanonicalDoctorReportHtml(html);
    return {
      success: true,
      method: 'print',
      message: `Standart PDF raporu (${filename}) yazdırma görünümü açıldı.`,
      templateId: DOCTOR_REPORT_TEMPLATE_ID,
      filename,
      pdfBytes: bytes,
      model,
    };
  }

  // Default mode === 'share': Share the generated PDF file using the canonical template
  const shareRes = await shareContent({
    title: `Dijital Mental İkizim Hekim Raporu (${DOCTOR_REPORT_TEMPLATE_ID}) — ${model.metadata.patientName}`,
    text: companionText,
    files: [file],
  });

  return {
    ...shareRes,
    templateId: DOCTOR_REPORT_TEMPLATE_ID,
    filename,
    pdfBytes: bytes,
    model,
  };
}
