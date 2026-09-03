import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AuthPanel } from '../components/auth/AuthPanel';
import { UserProfile } from '../types/user';
import {
  ShieldCheck,
  Activity,
  Check,
  ArrowRight,
  Smartphone,
  Keyboard,
  Moon,
  Lock,
  BatteryCharging,
  Wifi,
  Mic,
  Bell,
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { settings, setUserProfile, connectGoogleProfile, toggleSensor, setNotificationsEnabled, setOnboardingCompleted } = useAppStore();

  const handleAuthSuccess = (profile: UserProfile) => {
    if (profile.isGoogleConnected) {
      connectGoogleProfile(profile);
    } else {
      setUserProfile(profile);
    }
    setStep(2);
  };

  const handleFinish = async () => {
    await setOnboardingCompleted(true);
  };

  return (
    <div className="min-h-screen bg-comus-bg flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto">
      {/* Progress Header */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1 border border-comus-sand-light/30 shadow-soft">
              <img src="/logo.png" alt="ComusAI Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif font-bold text-comus-navy">ComusAI</span>
          </div>
          <span className="text-xs font-semibold text-comus-sand-dark">
            Adım {step} / 3
          </span>
        </div>
        <div className="w-full bg-comus-sand-light/30 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-comus-copper h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Screen 1: Welcome & Real User Personalization */}
      {step === 1 && (
        <div className="my-auto py-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-3xl bg-white border border-comus-sand-light/30 flex items-center justify-center p-2 mb-6 shadow-soft">
            <img src="/logo.png" alt="ComusAI Logo" className="w-full h-full object-contain" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
            Kişiselleştirilmiş Farkındalık
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-comus-navy mt-1 mb-3 leading-tight">
            ComusAI'ya Hoş Geldin.
          </h1>

          <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed mb-6">
            ComusAI bir tıbbi teşhis koymaz; akıllı cihazınızla etkileşiminizdeki ince ritimleri izleyerek size özel dijital baz hattınızı oluşturur. Başlamak için giriş yapın veya yeni hesap oluşturun:
          </p>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-comus-sand-light/20 shadow-soft">
            <AuthPanel onSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}

      {/* Screen 2: Granular Permissions (Chrome & Web APIs) */}
      {step === 2 && (
        <div className="my-auto py-6 animate-fadeIn">
          <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
            Şeffaflık İlkesi
          </span>
          <h2 className="font-serif text-2xl font-bold text-comus-navy mt-1 mb-2">
            Hangi sensörler çalışacak?
          </h2>
          <p className="text-xs sm:text-sm text-comus-sand-dark mb-4 leading-relaxed">
            Dijital ikizinizin hesaplanması için kullanılacak web ve cihaz sensörlerini dilediğiniz gibi kontrol edebilirsiniz:
          </p>

          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {/* Motion */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-comus-navy-subtle flex items-center justify-center text-comus-navy">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Hareketlilik & Jiroskop</div>
                  <div className="text-[11px] text-comus-sand-dark">Gün içi mobilite ve el mikro-titremesi</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.motion}
                onChange={() => toggleSensor('motion')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>

            {/* Typing */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Yazım Dinamikleri</div>
                  <div className="text-[11px] text-comus-sand-dark">WPM ve hata sıklığı (İçerik ASLA kaydedilmez)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.typing}
                onChange={() => toggleSensor('typing')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>

            {/* Touch */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Dokunma & Kaydırma Hızı</div>
                  <div className="text-[11px] text-comus-sand-dark">Ekran gezinme ivmesi ve etkileşim sıklığı</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.touch}
                onChange={() => toggleSensor('touch')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>

            {/* Session */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Oturum & Gece Penceresi</div>
                  <div className="text-[11px] text-comus-sand-dark">02:00–04:00 gece kullanımı ve oturum süresi</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.session}
                onChange={() => toggleSensor('session')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>

            {/* Battery */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Pil & Şarj Durumu (Battery Status API)</div>
                  <div className="text-[11px] text-comus-sand-dark">Şarj seviyesi ve gece şarj alışkanlıkları</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.battery}
                onChange={() => toggleSensor('battery')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>

            {/* Network */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Ağ & Çevrimdışı (Network Info API)</div>
                  <div className="text-[11px] text-comus-sand-dark">Bağlantı istikrarı ve çevrimdışı çalışma durumu</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.network}
                onChange={() => toggleSensor('network')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>

            {/* Voice */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Ses Ton Dinamiği & Ritim (Web Audio API)</div>
                  <div className="text-[11px] text-comus-sand-dark">Konuşma tonu varyansı ve monotonluk takibi (ses kaydı yapılmaz)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.voice}
                onChange={() => toggleSensor('voice')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/50 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">iOS Farkındalık Bildirimleri</div>
                  <div className="text-[11px] text-comus-sand-dark">Sabah/akşam ruh hali yoklamaları & bilişsel fren alarmları</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={() => setNotificationsEnabled(!settings.notificationsEnabled)}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Legal & Ethics */}
      {step === 3 && (
        <div className="my-auto py-6 animate-fadeIn">
          <div className="w-14 h-14 rounded-3xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper mb-4">
            <Lock className="w-7 h-7" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
            Gizlilik ve Sorumluluk
          </span>
          <h2 className="font-serif text-2xl font-bold text-comus-navy mt-1 mb-3">
            Güvenliğin & Tam Yerel Depolama
          </h2>

          <div className="space-y-3.5 text-xs sm:text-sm text-comus-sand-dark leading-relaxed">
            <div className="p-4 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <h4 className="font-semibold text-comus-navy mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Tıbbi Teşhis Değildir
              </h4>
              <p>
                ComusAI bir tıbbi tanı veya klinik tedavi aracı değildir. Davranışsal değişimleri istatistiksel baz hattı üzerinden ayna tutarak farkındalık sunar.
              </p>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <h4 className="font-semibold text-rose-900 mb-1">
                Acil Durum ve Kriz Desteği
              </h4>
              <p className="text-rose-800">
                Aşırı zorlanma, kriz veya tehlike anında lütfen vakit kaybetmeden <strong>112 Acil</strong> veya <strong>Alo 182</strong> hatlarını arayarak hekim ve uzman desteğine başvurun.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="pb-4 pt-2 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            onClick={() => setStep((s) => (s - 1) as any)}
            className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-comus-sand-dark hover:text-comus-navy bg-white border border-comus-sand-light/30 transition-colors"
          >
            Geri
          </button>
        ) : <div />}

        {step === 2 && (
          <button
            onClick={() => setStep(3)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-comus-navy text-white text-xs sm:text-sm font-semibold hover:bg-comus-navy-light shadow-soft transition-all"
          >
            <span>Devam Et</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={handleFinish}
            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-comus-copper text-white text-xs sm:text-sm font-semibold hover:bg-comus-copper-dark shadow-soft-lg transition-all"
          >
            <span>Anladım, Başla</span>
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
