import React, { useState } from 'react';
import { UserProfile } from '../../types/user';
import { AuthService } from '../../auth/authService';
import { GoogleAuthButton } from './GoogleAuthButton';
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AuthPanelProps {
  onSuccess: (profile: UserProfile) => void;
  initialMode?: 'login' | 'register' | 'google';
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  onSuccess,
  initialMode = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'google'>(initialMode);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const profile = await AuthService.loginWithCredentials(identifier, password);
      setSuccessMessage(`Hoş geldin, ${profile.name}!`);
      setTimeout(() => {
        onSuccess(profile);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const profile = await AuthService.registerWithCredentials(
        registerUsername,
        registerPassword,
        registerName,
        registerEmail || undefined
      );
      setSuccessMessage(`Hesabınız başarıyla oluşturuldu, ${profile.name}!`);
      setTimeout(() => {
        onSuccess(profile);
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Kayıt işlemi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setIdentifier('demo');
    setPassword('demo123');
    setErrorMessage(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Segmented Control Tabs */}
      <div className="flex p-1 bg-comus-surface rounded-2xl border border-comus-sand-light/30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('login');
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'login'
              ? 'bg-white text-comus-navy shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Giriş Yap</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('register');
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'register'
              ? 'bg-white text-comus-navy shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Kayıt Ol</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('google');
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'google'
              ? 'bg-white text-comus-navy shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
          <span>Google</span>
        </button>
      </div>

      {/* Error & Success Messages */}
      {errorMessage && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="font-semibold">{successMessage}</div>
        </div>
      )}

      {/* Tab 1: Username & Password Login */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-3.5 animate-fadeIn">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-comus-navy block">
              Kullanıcı Adı veya E-posta
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Örn: deniz veya deniz@ornek.com"
                required
                className="w-full text-xs sm:text-sm p-3 pl-10 rounded-2xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
              />
              <User className="w-4 h-4 text-comus-sand absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-comus-navy block">
                Şifre
              </label>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-[11px] text-comus-copper font-semibold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Demo Girişi Doldur</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-xs sm:text-sm p-3 pl-10 pr-10 rounded-2xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
              />
              <Lock className="w-4 h-4 text-comus-sand absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-comus-sand hover:text-comus-navy"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs sm:text-sm font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-70"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Giriş Yapılıyor...' : 'Kullanıcı Girişi Yap'}</span>
          </button>
        </form>
      )}

      {/* Tab 2: Register New Account */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-3 animate-fadeIn">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-comus-navy block">
              Ad Soyad / Nasıl Hitap Edelim?
            </label>
            <div className="relative">
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Örn: Deniz Yılmaz"
                required
                className="w-full text-xs p-2.5 pl-9 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
              />
              <User className="w-3.5 h-3.5 text-comus-sand absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-comus-navy block">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <input
                type="text"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value.toLowerCase())}
                placeholder="Örn: deniz"
                required
                className="w-full text-xs p-2.5 pl-9 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy font-mono"
              />
              <span className="text-xs text-comus-sand absolute left-3 top-2.5 font-bold">@</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-comus-navy block">
              E-posta (İsteğe bağlı)
            </label>
            <div className="relative">
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="deniz@ornek.com"
                className="w-full text-xs p-2.5 pl-9 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
              />
              <Mail className="w-3.5 h-3.5 text-comus-sand absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-comus-navy block">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="En az 4 karakter"
                required
                minLength={4}
                className="w-full text-xs p-2.5 pl-9 pr-9 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
              />
              <Lock className="w-3.5 h-3.5 text-comus-sand absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-comus-sand hover:text-comus-navy"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs sm:text-sm font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-70 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Hesap Oluşturuluyor...' : 'Yeni Hesap Oluştur'}</span>
          </button>
        </form>
      )}

      {/* Tab 3: Google Sign In */}
      {activeTab === 'google' && (
        <div className="space-y-3 animate-fadeIn py-2">
          <p className="text-xs text-comus-sand-dark leading-relaxed">
            Google hesabınız ile tek tıkla giriş yaparak profilinizi senkronize edebilirsiniz:
          </p>
          <GoogleAuthButton onSuccess={onSuccess} />
        </div>
      )}
    </div>
  );
};
