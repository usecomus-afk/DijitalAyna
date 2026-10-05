import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, ShieldCheck, Sparkles, PlayCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const VALID_BETA_CODES = [
  'BETA26',
  'DEMO26',
  'ANIL01'
];

interface BetaAccessGateProps {
  children: React.ReactNode;
}

export const BetaAccessGate: React.FC<BetaAccessGateProps> = ({ children }) => {
  const [accessGranted, setAccessGranted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('beta_access_granted') === 'true';
    } catch {
      return false;
    }
  });

  const [inputCode, setInputCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('beta_access_granted');
      if (stored === 'true') {
        setAccessGranted(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const sanitized = inputCode.trim().toUpperCase();

    if (!sanitized) {
      setErrorMessage('Lütfen davet kodunuzu girin.');
      return;
    }

    if (VALID_BETA_CODES.includes(sanitized)) {
      setIsSuccess(true);
      try {
        localStorage.setItem('beta_access_granted', 'true');
      } catch (err) {
        console.warn('[BetaAccessGate] localStorage write error:', err);
      }

      setTimeout(() => {
        setAccessGranted(true);
      }, 800);
    } else {
      setErrorMessage('Geçersiz davet kodu. Lütfen geçerli bir kod girin veya geliştiriciyle iletişime geçin.');
    }
  };

  if (accessGranted) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-comus-bg flex flex-col justify-between items-center px-4 py-8 sm:p-6 font-sans select-none animate-fadeIn">
      <div className="w-full max-w-md my-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-soft-lg border border-comus-navy/10 relative overflow-hidden text-center transition-all">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-comus-copper via-comus-navy to-comus-sage" />

          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-comus-copper/10 border border-comus-copper/20 flex items-center justify-center text-comus-copper shadow-sm">
            {isSuccess ? (
              <ShieldCheck className="w-8 h-8 text-comus-sage animate-bounce" />
            ) : (
              <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" onError={(e) => {
                  // Fallback to KeyRound icon if logo doesn't load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key-round w-8 h-8"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>';
              }} />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-comus-navy/5 text-comus-navy text-xs font-semibold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-comus-copper" />
            Sınırlı Erişim
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-comus-navy mb-3 tracking-tight">
            Kapalı Beta Erişimi
          </h1>

          <p className="text-sm text-comus-sand-dark mb-8 leading-relaxed">
            Mental Dijital İkiz şu an sınırlı kullanıcı için kapalı beta aşamasındadır. Devam etmek için lütfen size iletilen davet kodunu girin.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  if (errorMessage) setErrorMessage('');
                }}
                maxLength={6}
                placeholder="Örn: BETA26"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                className="w-full px-4 py-4 text-center text-xl font-mono font-bold tracking-widest uppercase bg-comus-surface border-2 border-comus-navy/15 rounded-2xl focus:outline-none focus:border-comus-copper focus:ring-4 focus:ring-comus-copper/10 transition-all text-comus-navy placeholder:text-comus-sand/50 placeholder:font-normal placeholder:tracking-normal placeholder:text-base shadow-inner"
              />
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 text-xs text-comus-copper-dark bg-comus-copper-subtle/80 border border-comus-copper/20 rounded-xl text-left animate-fadeIn">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-comus-copper" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSuccess}
              className="w-full py-4 px-5 bg-comus-navy hover:bg-comus-navy-dark active:scale-[0.99] text-white font-semibold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer group"
            >
              <span>{isSuccess ? 'Yönlendiriliyor...' : 'Doğrula ve Devam Et'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            {/* Apple İnceleme / Demo Modu Butonu */}
            <button
              type="button"
              onClick={async () => {
                try {
                  localStorage.setItem('beta_access_granted', 'true');
                } catch (err) {}
                
                await useAppStore.getState().setUserProfile({
                  name: 'Demo Kullanıcısı',
                  email: 'demo@apple.com',
                  isPasswordAccount: true,
                  createdAt: Date.now()
                });
                
                setAccessGranted(true);
              }}
              className="w-full py-3.5 px-5 bg-white border-2 border-comus-navy/10 hover:bg-comus-surface text-comus-navy font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <PlayCircle className="w-5 h-5 opacity-70" />
              <span>Demo Modu ile İncele</span>
            </button>
          </form>

        </div>
      </div>

      <footer className="mt-4 text-center text-xs text-comus-sand-dark flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-comus-navy/70 hover:text-comus-navy underline decoration-comus-navy/30 underline-offset-2 transition-colors"
          >
            Gizlilik Politikası
          </a>
          <span className="text-comus-sand/40">•</span>
          <span className="text-comus-sand/80">Kişisel Sağlık Verisi Korunumu</span>
        </div>
        <p className="text-[11px] text-comus-sand">© 2026 Mental Dijital İkiz. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
};

export default BetaAccessGate;
