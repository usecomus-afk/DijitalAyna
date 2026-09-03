import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AuthPanel } from '../components/auth/AuthPanel';
import { UserProfile, UserGender } from '../types/user';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  Smartphone,
  Keyboard,
  Lock,
  BatteryCharging,
  Wifi,
  Mic,
  Bell,
  MapPin,
  UserCheck,
  Calendar,
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const { settings, userProfile, setUserProfile, connectGoogleProfile, toggleSensor, setNotificationsEnabled, setOnboardingCompleted } = useAppStore();

  useEffect(() => {
    if ((userProfile?.isGoogleConnected || userProfile?.isAppleConnected || userProfile?.isPasswordAccount) && step === 1) {
      setStep(2);
    }
  }, [userProfile?.isGoogleConnected, userProfile?.isAppleConnected, userProfile?.isPasswordAccount, step]);

  const [selectedAge, setSelectedAge] = useState<number>(userProfile?.age || 28);
  const [selectedGender, setSelectedGender] = useState<UserGender>(userProfile?.gender || 'prefer_not_to_say');

  const handleAuthSuccess = (profile: UserProfile) => {
    if (profile.isGoogleConnected) {
      connectGoogleProfile(profile);
    } else {
      setUserProfile(profile);
    }
    setStep(2);
  };

  const handleDemographicsSubmit = async () => {
    await setUserProfile({
      ...userProfile,
      age: selectedAge,
      gender: selectedGender,
    });
    setStep(3);
  };

  const handleFinish = async () => {
    await setOnboardingCompleted(true);
  };

  return (
    <div
      className="min-h-screen bg-comus-bg flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 24px), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)',
      }}
    >
      {/* Progress Header */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-1 border border-comus-sand-light/30 shadow-soft">
              <img src="/logo.png" alt="Dijital Ayna Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif font-bold text-comus-navy">Dijital Ayna</span>
          </div>
          <span className="text-xs font-semibold text-comus-sand-dark">
            Adım {step} / 4
          </span>
        </div>
        <div className="w-full bg-comus-sand-light/30 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-comus-copper h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Screen 1: Welcome & Real User Personalization */}
      {step === 1 && (
        <div className="my-auto py-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-3xl bg-white border border-comus-sand-light/30 flex items-center justify-center p-2 mb-6 shadow-soft">
            <img src="/logo.png" alt="Dijital Ayna Logo" className="w-full h-full object-contain" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
            Kişiselleştirilmiş Biyobelirteç Takibi
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-comus-navy mt-1 mb-3 leading-tight">
            Dijital Ayna'ya Hoş Geldin.
          </h1>

          <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed mb-6">
            Dijital Ayna tıbbi teşhis koymaz; akıllı cihazınızla etkileşiminizdeki ince ritimleri izleyerek size özel dijital baz hattınızı oluşturur. Başlamak için Google veya Apple hesabınızla giriş yapın:
          </p>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-comus-sand-light/20 shadow-soft">
            <AuthPanel onSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}

      {/* Screen 2: Demographics (Age & Gender) */}
      {step === 2 && (
        <div className="my-auto py-6 animate-fadeIn space-y-5">
          <div className="w-14 h-14 rounded-3xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper mb-2">
            <UserCheck className="w-7 h-7" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
              Biyometrik Kalibrasyon
            </span>
            <h2 className="font-serif text-2xl font-bold text-comus-navy mt-1 mb-2">
              Yaş ve Cinsiyet Bilgisi
            </h2>
            <p className="text-xs text-comus-sand-dark leading-relaxed">
              Yazım akıcılığı, motor titreme ve sirkadiyen ritim normları yaş ve biyolojik faktörlere göre değişir. Bu bilgiler baz hattınızı doğru kalibre etmek için yalnızca cihazınızda saklanır.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-comus-navy flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-comus-copper" />
                <span>Yaşınız:</span>
              </label>
              <span className="text-base font-serif font-bold text-comus-navy">
                {selectedAge} yaş
              </span>
            </div>
            <input
              type="range"
              min="16"
              max="90"
              value={selectedAge}
              onChange={(e) => setSelectedAge(parseInt(e.target.value, 10))}
              className="w-full accent-comus-copper cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-comus-sand-dark">
              <span>16</span>
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>90+</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft space-y-2.5">
            <label className="text-xs font-bold text-comus-navy block">
              Cinsiyet:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'female', label: 'Kadın' },
                { id: 'male', label: 'Erkek' },
                { id: 'other', label: 'Diğer' },
                { id: 'prefer_not_to_say', label: 'Belirtmek İstemiyorum' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGender(g.id as UserGender)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                    selectedGender === g.id
                      ? 'bg-comus-navy text-white border-comus-navy shadow-sm'
                      : 'bg-comus-surface text-comus-sand-dark border-comus-sand-light/40 hover:text-comus-navy'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Permissions */}
      {step === 3 && (
        <div className="my-auto py-6 animate-fadeIn">
          <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
            Maksimum Sensör Hassasiyeti
          </span>
          <h2 className="font-serif text-2xl font-bold text-comus-navy mt-1 mb-2">
            Cihaz Biyobelirteç İzinleri
          </h2>
          <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed mb-4">
            Uygulama tam bir mobil deneyim sağlamak için cihaz sensörlerinizden nesnel telemetri toplar. Tüm hesaplamalar %100 telefonunuzda yerel işlenir:
          </p>

          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-comus-copper">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Hareket & Titreme (İvmeölçer / Jiroskop)</div>
                  <div className="text-[11px] text-comus-sand-dark">Mikrotremor, motor stabilite ve yürüme ritmi</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.motion}
                onChange={() => toggleSensor('motion')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Yazım Akıcılığı (Keystroke Dynamics)</div>
                  <div className="text-[11px] text-comus-sand-dark">Yazım temposu ve duraklama (içerik ASLA okunmaz)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.typing}
                onChange={() => toggleSensor('typing')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Ses Ton Dinamiği & Ritim (Web Audio API)</div>
                  <div className="text-[11px] text-comus-sand-dark">Konuşma ritmi ve perde varyansı (ses kaydı yapılmaz)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.voice}
                onChange={() => toggleSensor('voice')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Sirkadiyen Mobilite & Yaşam Alanı</div>
                  <div className="text-[11px] text-comus-sand-dark">Ev-çalışma hareketlilik yarıçapı ve açık hava döngüsü</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.location}
                onChange={() => toggleSensor('location')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Pil & Şarj Alışkanlıkları (Battery Status)</div>
                  <div className="text-[11px] text-comus-sand-dark">Gece şarj düzeni ve cihaz açık kalma döngüsü</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.battery}
                onChange={() => toggleSensor('battery')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Ağ ve Çevrimdışı Durumu (Network Telemetry)</div>
                  <div className="text-[11px] text-comus-sand-dark">Bağlantı kararlılığı ve çevrimdışı çalışma doğrulaması</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sensorsEnabled.network}
                onChange={() => toggleSensor('network')}
                className="w-5 h-5 accent-comus-copper cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/50 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">iOS Bildirimleri & Yoklamalar</div>
                  <div className="text-[11px] text-comus-sand-dark">Sabah 09:00 ve akşam 21:00 durum kontrolü</div>
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

      {/* Screen 4: Legal & Ethics */}
      {step === 4 && (
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
                Dijital Ayna bir tıbbi tanı veya klinik tedavi aracı değildir. Davranışsal değişimleri istatistiksel baz hattı üzerinden ayna tutarak farkındalık sunar.
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
            className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-comus-sand-dark hover:text-comus-navy bg-white border border-comus-sand-light/30 transition-colors cursor-pointer"
          >
            Geri
          </button>
        ) : <div />}

        {step === 2 && (
          <button
            onClick={handleDemographicsSubmit}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-comus-navy text-white text-xs sm:text-sm font-semibold hover:bg-comus-navy-light shadow-soft transition-all cursor-pointer"
          >
            <span>İzinlere Geç</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={() => setStep(4)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-comus-navy text-white text-xs sm:text-sm font-semibold hover:bg-comus-navy-light shadow-soft transition-all cursor-pointer"
          >
            <span>Devam Et</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === 4 && (
          <button
            onClick={handleFinish}
            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-comus-copper text-white text-xs sm:text-sm font-semibold hover:bg-comus-copper-dark shadow-soft-lg transition-all cursor-pointer"
          >
            <span>Anladım, Aynaya Başla</span>
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
