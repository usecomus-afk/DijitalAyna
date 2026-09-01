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
 * Web Share API Service with fallback to Clipboard / Download
 */
export async function shareContent(options: ShareOptions): Promise<ShareResult> {
  const { title, text, url, files } = options;

  // 1. Try Web Share API (Chrome Android, iOS Safari, Chrome Desktop)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData: ShareData = {
        title,
        text,
        url: url || window.location.href,
      };

      if (files && files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files;
      }

      await navigator.share(shareData);
      return {
        success: true,
        method: 'native',
        message: 'Başarıyla paylaşıldı (Google Drive, Gmail, Mesajlar vb.).',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          message: 'Paylaşım iptal edildi.',
        };
      }
      console.warn('[ShareService] Native share failed, falling back to clipboard:', err);
    }
  }

  // 2. Fallback: Copy to Clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      const fullText = `${title}\n\n${text}${url ? `\n\n${url}` : ''}`;
      await navigator.clipboard.writeText(fullText);
      return {
        success: true,
        method: 'clipboard',
        message: 'Rapor metni panoya kopyalandı! Dilediğiniz uygulamaya yapıştırabilirsiniz.',
      };
    } catch (err) {
      console.error('[ShareService] Clipboard copy failed:', err);
    }
  }

  return {
    success: false,
    method: 'clipboard',
    message: 'Paylaşım desteklenmiyor.',
  };
}
