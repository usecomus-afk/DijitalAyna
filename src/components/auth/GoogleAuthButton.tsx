import React, { useState } from 'react';
import { UserProfile } from '../../types/user';
import {
  signInWithGoogle,
  signInWithGoogleNative,
  signInWithApple,
  signInWithAppleNative,
} from '../../auth/firebaseAuth';
import { AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface GoogleAuthButtonProps {
  onSuccess: (profile: UserProfile) => void;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onSuccess, className = '' }) => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      // Web flow
      const profile = await signInWithGoogle();
      if (profile) {
        onSuccess(profile);
      }
    } catch (err: any) {
      console.error('[GoogleAuthButton] Google Sign-in error:', err);
      const msg = err?.message || 'Google ile giriş sırasında bir hata oluştu.';
      setErrorMessage(msg);
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

      // Web flow
      const profile = await signInWithApple();
      if (profile) {
        onSuccess(profile);
      }
    } catch (err: any) {
      console.error('[GoogleAuthButton] Apple Sign-in error:', err);
      const msg = err?.message || 'Apple ile giriş sırasında bir hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setLoadingApple(false);
    }
  };

  return (
    <div className="space-y-2.5 w-full">
      {/* Official Sign in with Apple Button (Apple App Store Guideline 4.8) */}
      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={loadingApple || loadingGoogle}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-black hover:bg-neutral-900 text-white text-xs sm:text-sm font-semibold shadow-soft transition-all duration-200 cursor-pointer disabled:opacity-75"
      >
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 170 170">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.77-8.91-10.42-19.16-13.94-30.75-3.52-11.59-5.28-22.9-5.28-33.93 0-14.65 3.73-26.79 11.19-36.42 7.46-9.63 17.02-14.54 28.68-14.73 4.13 0 9.07 1.05 14.82 3.16 5.75 2.11 9.38 3.23 10.9 3.35 2.05-.12 5.86-1.29 11.43-3.5 5.57-2.22 10.15-3.23 13.74-3.03 11.83.65 21.32 4.96 28.47 12.94-10.37 6.29-15.42 15.11-15.16 26.47.26 8.78 3.55 16.14 9.87 22.08 6.32 5.94 13.99 9.53 23.01 10.77-2.24 6.75-4.8 13.57-7.68 20.47zm-32.61-105.1c0 6.64-2.45 12.87-7.35 17.7-4.9 4.83-10.9 7.78-18.01 7.78-.35-1.05-.53-2.1-.53-3.15 0-6.42 2.61-12.75 7.83-17.88 5.22-5.13 11.39-8.1 18.06-8.1z" />
        </svg>
        <span>{loadingApple ? 'Apple Bağlanıyor...' : 'Apple ile Giriş Yap'}</span>
      </button>

      {/* Primary Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle || loadingApple}
        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-comus-sand-light/40 text-comus-navy text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all duration-200 cursor-pointer disabled:opacity-75 ${className}`}
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
