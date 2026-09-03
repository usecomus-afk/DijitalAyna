import React, { useState } from 'react';
import { UserProfile } from '../../types/user';
import { OAuthModal } from './OAuthModal';

interface GoogleAuthButtonProps {
  onSuccess: (profile: UserProfile) => void;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onSuccess, className = '' }) => {
  const [modalProvider, setModalProvider] = useState<'apple' | 'google' | null>(null);

  return (
    <div className="space-y-2.5 w-full">
      {/* Official Sign in with Apple Button (Apple App Store Guideline 4.8) */}
      <button
        type="button"
        onClick={() => setModalProvider('apple')}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 text-white text-xs sm:text-sm font-semibold shadow-soft transition-all duration-200 cursor-pointer active:scale-[0.99]"
      >
        {/* Exact Official Apple Logo Vector (viewBox 0 0 24 24) */}
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.37c.62-.75 1.04-1.8 1.01-2.87-1 .04-2.17.67-2.85 1.46-.58.68-1.1 1.77-1.03 2.83 1.12.09 2.25-.66 2.87-1.42z" />
        </svg>
        <span>Apple ile Giriş Yap</span>
      </button>

      {/* Primary Google Sign In Button */}
      <button
        type="button"
        onClick={() => setModalProvider('google')}
        className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-comus-sand-light/50 text-comus-navy text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all duration-200 cursor-pointer active:scale-[0.99] ${className}`}
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
        <span>Google ile Giriş Yap</span>
      </button>

      {/* Interactive In-App Account Sheet Modal */}
      {modalProvider && (
        <OAuthModal
          isOpen={true}
          provider={modalProvider}
          onClose={() => setModalProvider(null)}
          onSuccess={(profile) => {
            setModalProvider(null);
            onSuccess(profile);
          }}
        />
      )}
    </div>
  );
};
