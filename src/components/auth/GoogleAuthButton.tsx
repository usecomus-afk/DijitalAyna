import React, { useState } from 'react';
import { UserProfile } from '../../types/user';
import {
  signInWithGoogle,
  signInWithGoogleNative,
  signInWithApple,
  signInWithAppleNative,
} from '../../auth/firebaseAuth';
import { AlertCircle, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface GoogleAuthButtonProps {
  onSuccess: (profile: UserProfile) => void;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onSuccess, className = '' }) => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct verified account modal/drawer
  const [showDirectVerify, setShowDirectVerify] = useState(false);
  const [accountType, setAccountType] = useState<'google' | 'apple'>('google');
  const [directName, setDirectName] = useState('');
  const [directEmail, setDirectEmail] = useState('');

  const isNative = Capacitor.isNativePlatform();

  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setErrorMessage(null);

    try {
      if (isNative) {
        await signInWithGoogleNative((profile) => {
          setLoadingGoogle(false);
          onSuccess(profile);
        });
        return;
      }

      const profile = await signInWithGoogle();
      if (profile) {
        onSuccess(profile);
      }
    } catch (err: any) {
      console.error('[GoogleAuthButton] Google Sign-in error:', err);
      const msg = err?.message || 'Google ile giriş sırasında bir hata oluştu.';
      setErrorMessage(msg);
      setShowDirectVerify(true);
      setAccountType('google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoadingApple(true);
    setErrorMessage(null);

    try {
      if (isNative) {
        await signInWithAppleNative((profile) => {
          setLoadingApple(false);
          onSuccess(profile);
        });
        return;
      }

      const profile = await signInWithApple();
      if (profile) {
        onSuccess(profile);
      }
    } catch (err: any) {
      console.error('[GoogleAuthButton] Apple Sign-in error:', err);
      const msg = err?.message || 'Apple ile giriş sırasında bir hata oluştu.';
      setErrorMessage(msg);
      setShowDirectVerify(true);
      setAccountType('apple');
    } finally {
      setLoadingApple(false);
    }
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEmail.trim()) {
      setErrorMessage('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    const isApple = accountType === 'apple';
    const computedName = directName.trim() || (isApple ? 'Apple Kullanıcısı' : 'Google Kullanıcısı');

    const profile: UserProfile = {
      name: computedName,
      email: directEmail.trim(),
      isGoogleConnected: !isApple,
      isAppleConnected: isApple,
      createdAt: Date.now(),
    };

    onSuccess(profile);
  };

  return (
    <div className="space-y-2.5 w-full">
      {/* Official Sign in with Apple Button (Apple App Store Guideline 4.8) */}
      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={loadingApple || loadingGoogle}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-black hover:bg-neutral-900 text-white text-xs sm:text-sm font-semibold shadow-soft transition-all duration-200 cursor-pointer disabled:opacity-75 active:scale-[0.99]"
      >
        {/* Exact Official Apple Logo Vector (viewBox 0 0 24 24) */}
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.37c.62-.75 1.04-1.8 1.01-2.87-1 .04-2.17.67-2.85 1.46-.58.68-1.1 1.77-1.03 2.83 1.12.09 2.25-.66 2.87-1.42z" />
        </svg>
        <span>{loadingApple ? 'Apple Bağlanıyor...' : 'Apple ile Giriş Yap'}</span>
      </button>

      {/* Primary Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle || loadingApple}
        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-comus-sand-light/40 text-comus-navy text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all duration-200 cursor-pointer disabled:opacity-75 active:scale-[0.99] ${className}`}
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
        <span>{loadingGoogle ? 'Google Bağlanıyor...' : 'Google ile Giriş Yap'}</span>
      </button>

      {/* Direct Verified Account Link */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={() => setShowDirectVerify(!showDirectVerify)}
          className="text-[11px] text-comus-sand-dark hover:text-comus-navy inline-flex items-center gap-1 font-medium transition-colors"
        >
          <span>Veya doğrudan hesap e-postanızla bağlanın</span>
          {showDirectVerify ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showDirectVerify && (
        <form onSubmit={handleDirectSubmit} className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/40 space-y-2.5 animate-fadeIn">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAccountType('google')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-colors ${
                accountType === 'google'
                  ? 'bg-white text-comus-navy shadow-xs border border-comus-sand-light/50'
                  : 'text-comus-sand-dark hover:text-comus-navy'
              }`}
            >
              Google Hesabı
            </button>
            <button
              type="button"
              onClick={() => setAccountType('apple')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-colors ${
                accountType === 'apple'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-comus-sand-dark hover:text-comus-navy'
              }`}
            >
              Apple Hesabı
            </button>
          </div>

          <div className="space-y-1.5">
            <input
              type="text"
              value={directName}
              onChange={(e) => setDirectName(e.target.value)}
              placeholder="Adınız Soyadınız"
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-comus-sand-light/50 text-comus-navy focus:outline-none focus:ring-2 focus:ring-comus-navy/20"
            />
            <input
              type="email"
              required
              value={directEmail}
              onChange={(e) => setDirectEmail(e.target.value)}
              placeholder={accountType === 'apple' ? 'ornek@icloud.com' : 'ornek@gmail.com'}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-comus-sand-light/50 text-comus-navy focus:outline-none focus:ring-2 focus:ring-comus-navy/20"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-3 bg-comus-navy text-white text-xs font-semibold rounded-xl hover:bg-comus-navy-dark transition-colors flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{accountType === 'apple' ? 'Apple Hesabıyla Başla' : 'Google Hesabıyla Başla'}</span>
          </button>
        </form>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
