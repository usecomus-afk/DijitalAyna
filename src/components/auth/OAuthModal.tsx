import React, { useState } from 'react';
import { UserProfile } from '../../types/user';
import { useAppStore } from '../../store/useAppStore';
import { db } from '../../db';
import { X, AlertCircle, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { signInWithGoogleNative, signInWithAppleNative } from '../../auth/firebaseAuth';
import { Capacitor } from '@capacitor/core';

interface OAuthModalProps {
  isOpen: boolean;
  provider: 'apple' | 'google';
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export const OAuthModal: React.FC<OAuthModalProps> = ({
  isOpen,
  provider,
  onClose,
  onSuccess,
}) => {
  const { setUserProfile } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isApple = provider === 'apple';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    setLoading(true);

    try {
      const defaultName = isApple ? 'Apple Kullanıcısı' : 'Google Kullanıcısı';
      const cleanName = name.trim() || defaultName;

      const profile: UserProfile = {
        name: cleanName,
        email: cleanEmail,
        isGoogleConnected: !isApple,
        isAppleConnected: isApple,
        createdAt: Date.now(),
      };

      // Persist to indexed database
      await db.settings.put({ key: 'user_profile', value: profile });
      await setUserProfile(profile);

      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('[OAuthModal] Authentication error:', err);
      setErrorMessage(err?.message || 'Giriş işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSafariBridge = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (Capacitor.isNativePlatform()) {
        if (isApple) {
          await signInWithAppleNative((profile) => {
            onSuccess(profile);
            onClose();
          });
        } else {
          await signInWithGoogleNative((profile) => {
            onSuccess(profile);
            onClose();
          });
        }
      } else {
        setErrorMessage('Safari kimlik doğrulama köprüsü yalnızca iOS cihazında çalışır.');
      }
    } catch (err: any) {
      console.error('[OAuthModal] Safari bridge error:', err);
      setErrorMessage('Tarayıcı köprüsü başlatılamadı. Lütfen bilgilerinizi doğrudan giriniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-comus-sand-light/40 relative space-y-5 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-comus-sand-dark hover:text-comus-navy transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Provider Logo */}
        <div className="flex items-center gap-3.5 pt-1">
          {isApple ? (
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-soft shrink-0">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.37c.62-.75 1.04-1.8 1.01-2.87-1 .04-2.17.67-2.85 1.46-.58.68-1.1 1.77-1.03 2.83 1.12.09 2.25-.66 2.87-1.42z" />
              </svg>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center shadow-soft shrink-0">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
          )}

          <div>
            <h2 className="text-base font-bold text-comus-navy font-serif">
              {isApple ? 'Apple Kimliği ile Giriş' : 'Google Hesabı ile Giriş'}
            </h2>
            <p className="text-[11px] text-comus-sand-dark flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
              <span>Gerçek Kullanıcı Profili Bağlantısı</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-comus-sand-dark leading-relaxed">
          {isApple
            ? 'Apple kimliğinizle bağlanarak biyobelirteçlerinizin size özel güvenli profille takip edilmesini sağlayın:'
            : 'Google hesabınızla bağlanarak biyobelirteçlerinizin size özel güvenli profille takip edilmesini sağlayın:'}
        </p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* Direct Account Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-comus-navy block">
              Adınız ve Soyadınız
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isApple ? 'Adınız Soyadınız' : 'Adınız Soyadınız'}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-comus-surface border border-comus-sand-light/50 text-comus-navy focus:outline-none focus:ring-2 focus:ring-comus-navy/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-comus-navy block">
              {isApple ? 'Apple Kimliği (E-posta)' : 'Google E-posta Adresi'} *
            </label>
            <input
              type="email"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isApple ? 'ornek@icloud.com' : 'ornek@gmail.com'}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-comus-surface border border-comus-sand-light/50 text-comus-navy focus:outline-none focus:ring-2 focus:ring-comus-navy/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isApple
                ? 'bg-black hover:bg-neutral-900 text-white'
                : 'bg-comus-navy hover:bg-comus-navy-dark text-white'
            }`}
          >
            <span>{isApple ? 'Apple Hesabımla Devam Et' : 'Google Hesabımla Devam Et'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Alternative Safari Bridge Option */}
        <div className="pt-2 text-center border-t border-comus-sand-light/20">
          <button
            type="button"
            onClick={handleSafariBridge}
            disabled={loading}
            className="text-[11px] text-comus-sand-dark hover:text-comus-navy inline-flex items-center gap-1 font-medium transition-colors"
          >
            <Globe className="w-3 h-3" />
            <span>Safari OAuth tarayıcı köprüsü üzerinden bağlanmayı dene →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
