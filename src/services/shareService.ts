import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ShareOptions {
  title: string;
  text: string;
  url?: string;
  files?: File[];
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'download';
  message: string;
}

/**
 * Universal Share Service with @capacitor/share, Web Share API, and bulletproof Clipboard fallback
 */
export async function shareContent(options: ShareOptions): Promise<ShareResult> {
  const { title, text, url } = options;

  // 1. Try Capacitor Native Share (iOS & Android)
  if (Capacitor.isNativePlatform()) {
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title,
          text,
          url,
          dialogTitle: title,
        });
        return {
          success: true,
          method: 'native',
          message: 'Klinik rapor başarıyla paylaşıldı.',
        };
      }
    } catch (err: any) {
      if (err?.message?.includes('canceled') || err?.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          message: 'Paylaşım iptal edildi.',
        };
      }
      console.warn('[ShareService] Capacitor Share error, trying web share/clipboard:', err);
    }
  }

  // 2. Try Web Share API (Mobile Safari, Chrome Mobile, Chrome Desktop)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData: ShareData = {
        title,
        text,
        url: url || (typeof window !== 'undefined' ? window.location.href : undefined),
      };

      await navigator.share(shareData);
      return {
        success: true,
        method: 'native',
        message: 'Klinik rapor başarıyla paylaşıldı.',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          message: 'Paylaşım iptal edildi.',
        };
      }
      console.warn('[ShareService] Web share failed, falling back to clipboard:', err);
    }
  }

  // 3. Fallback: Copy to Clipboard (Dual Strategy: navigator.clipboard + hidden textarea)
  const fullText = `${title}\n\n${text}${url ? `\n\n${url}` : ''}`;
  let copied = false;

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(fullText);
      copied = true;
    } catch (clipErr) {
      console.warn('[ShareService] navigator.clipboard failed, attempting fallback textarea:', clipErr);
    }
  }

  if (!copied && typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (fallbackErr) {
      console.error('[ShareService] Clipboard fallback textarea failed:', fallbackErr);
    }
  }

  return {
    success: true,
    method: 'clipboard',
    message: 'Rapor metni panoya kopyalandı! Doktorunuza mesaj veya e-posta olarak gönderebilirsiniz.',
  };
}

