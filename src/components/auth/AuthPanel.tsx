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
} from 'lucide-react';

interface AuthPanelProps {
  onSuccess: (profile: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ onSuccess, initialMode = 'login' }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Lütfen kullanıcı adı/e-posta ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      const profile = await AuthService.loginWithCredentials(identifier.trim(), password);
      setSuccessMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
      setTimeout(() => onSuccess(profile), 400);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regUsername.trim() || !regPassword.trim()) {
      setErrorMessage('Lütfen kullanıcı adı ve en az 6 haneli şifre belirleyin.');
      return;
    }

    setLoading(true);
    try {
      const profile = await AuthService.registerWithCredentials(
        regUsername.trim(),
        regPassword,
        regName.trim() || regUsername.trim(),
        regEmail.trim() || undefined
      );
      setSuccessMessage('Hesabınız başarıyla oluşturuldu!');
      setTimeout(() => onSuccess(profile), 400);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Kayıt işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Primary Apple and Google Sign-In Buttons */}
      <div className="space-y-2">
        <GoogleAuthButton onSuccess={onSuccess} />
      </div>

      {/* Divider */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-comus-sand-light/40"></div>
        <span className="flex-shrink mx-3 text-[11px] text-comus-sand-dark font-medium">
          veya kullanıcı bilgileri ile devam edin
        </span>
        <div className="flex-grow border-t border-comus-sand-light/40"></div>
      </div>

      {/* Segmented Control Tabs (Login / Register) */}
      <div className="flex p-1 bg-comus-surface rounded-2xl border border-comus-sand-light/30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('login');
            setErrorMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'register'
              ? 'bg-white text-comus-navy shadow-sm'
              : 'text-comus-sand-dark hover:text-comus-navy'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Kayıt Ol</span>
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
                placeholder="ornek_kullanici"
                autoCapitalize="none"
                className="w-full pl-9 pr-3.5 py-2.5 bg-comus-surface border border-comus-sand-light/40 rounded-2xl text-xs text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:ring-2 focus:ring-comus-navy/20 focus:border-comus-navy transition-all"
              />
              <User className="w-4 h-4 text-comus-sand-dark absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-comus-navy block">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-comus-surface border border-comus-sand-light/40 rounded-2xl text-xs text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:ring-2 focus:ring-comus-navy/20 focus:border-comus-navy transition-all"
              />
              <Lock className="w-4 h-4 text-comus-sand-dark absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-comus-sand-dark hover:text-comus-navy p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-comus-navy text-white text-xs font-semibold shadow-soft hover:bg-comus-navy-dark transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
          </button>
        </form>
      )}

      {/* Tab 2: New User Registration */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-3.5 animate-fadeIn">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-comus-navy block">
              Ad Soyad <span className="text-comus-sand-dark text-[10px] font-normal">(İsteğe bağlı)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full pl-9 pr-3.5 py-2.5 bg-comus-surface border border-comus-sand-light/40 rounded-2xl text-xs text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:ring-2 focus:ring-comus-navy/20 focus:border-comus-navy transition-all"
              />
              <User className="w-4 h-4 text-comus-sand-dark absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-comus-navy block">
              Kullanıcı Adı *
            </label>
            <div className="relative">
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="kullanici_adi"
                autoCapitalize="none"
                className="w-full pl-9 pr-3.5 py-2.5 bg-comus-surface border border-comus-sand-light/40 rounded-2xl text-xs text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:ring-2 focus:ring-comus-navy/20 focus:border-comus-navy transition-all"
              />
              <User className="w-4 h-4 text-comus-sand-dark absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-comus-navy block">
              E-posta <span className="text-comus-sand-dark text-[10px] font-normal">(Şifre kurtarma için)</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="ornek@domain.com"
                autoCapitalize="none"
                className="w-full pl-9 pr-3.5 py-2.5 bg-comus-surface border border-comus-sand-light/40 rounded-2xl text-xs text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:ring-2 focus:ring-comus-navy/20 focus:border-comus-navy transition-all"
              />
              <Mail className="w-4 h-4 text-comus-sand-dark absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-comus-navy block">
              Şifre * <span className="text-comus-sand-dark text-[10px] font-normal">(En az 6 karakter)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-comus-surface border border-comus-sand-light/40 rounded-2xl text-xs text-comus-navy placeholder:text-comus-sand-dark/60 focus:outline-none focus:ring-2 focus:ring-comus-navy/20 focus:border-comus-navy transition-all"
              />
              <Lock className="w-4 h-4 text-comus-sand-dark absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-comus-sand-dark hover:text-comus-navy p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-comus-navy text-white text-xs font-semibold shadow-soft hover:bg-comus-navy-dark transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Hesap Oluşturuluyor...' : 'Yeni Hesap Oluştur'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
