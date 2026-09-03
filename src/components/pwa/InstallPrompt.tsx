import React, { useState, useEffect } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Listen for beforeinstallprompt on Chromium / Android / Desktop
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show prompt on iOS if not standalone after 3 seconds
    if (ios && !standalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="mb-4 bg-gradient-to-r from-comus-navy to-comus-navy-light text-white p-3.5 sm:p-4 rounded-2xl shadow-soft flex items-center justify-between gap-3 animate-fadeIn border border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-comus-copper flex items-center justify-center text-white shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-semibold truncate">
            Dijital Ayna'yı Cihazına Yükle
          </div>
          <div className="text-[11px] text-white/80 truncate">
            {isIOS ? (
              <span className="flex items-center gap-1">
                Safari Paylaş <Share className="w-3 h-3 inline" /> &gt; 'Ana Ekrana Ekle'
              </span>
            ) : (
              'Çevrimdışı ve tam ekran uygulama deneyimi'
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Yükle</span>
          </button>
        )}

        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 text-white/60 hover:text-white rounded-lg transition-colors"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
