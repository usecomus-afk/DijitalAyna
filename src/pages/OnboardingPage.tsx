import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AuthPanel } from '../components/auth/AuthPanel';
import { UserProfile } from '../types/user';
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
  Cloud,
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const {
    settings,
    userProfile,
    setUserProfile,
    connectGoogleProfile,
    toggleSensor,
    setNotificationsEnabled,
    setCloudBackupEnabled,
    setOnboardingCompleted,
  } = useAppStore();

  const [userWentBack, setUserWentBack] = useState(false);

  useEffect(() => {
    const storeSettings = useAppStore.getState().settings;
    if (storeSettings.onboardingCompleted) {
      return;
    }
    if (
      !userWentBack &&
      (userProfile?.isGoogleConnected ||
        userProfile?.isAppleConnected ||
        userProfile?.isPasswordAccount ||
        (userProfile?.email && userProfile.email.trim().length > 0)) &&
      step === 1
    ) {
      setStep(2);
    }
  }, [userProfile?.isGoogleConnected, userProfile?.isAppleConnected, userProfile?.isPasswordAccount, userProfile?.email, step, userWentBack]);

  const [selectedAge, setSelectedAge] = useState<number>(userProfile?.age || 28);

  const handleAuthSuccess = async (profile: UserProfile) => {
    if (profile.isGoogleConnected) {
      await connectGoogleProfile(profile);
    } else {
      await setUserProfile(profile);
    }
    const storeSettings = useAppStore.getState().settings;
    if (storeSettings.onboardingCompleted) {
      return;
    }
    setStep(2);
  };

  const handleDemographicsSubmit = async () => {
    await setUserProfile({
      ...userProfile,
      age: selectedAge,
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
              <img src={logoImg} alt="Dijital Mental Ä°kizim Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif font-bold text-comus-navy">Dijital Mental Ä°kizim</span>
          </div>
          <span className="text-xs font-semibold text-comus-sand-dark">
            AdÄ±m {step} / 4
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
            <img src={logoImg} alt="Dijital Mental Ä°kizim Logo" className="w-full h-full object-contain" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
            KiÅŸiselleÅŸtirilmiÅŸ BiyobelirteÃ§ Takibi
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-comus-navy mt-1 mb-3 leading-tight">
            Dijital Mental Ä°kizim'e HoÅŸ Geldin.
          </h1>

          <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed mb-6">
            Dijital Mental Ä°kizim tÄ±bbi teÅŸhis koymaz; akÄ±llÄ± cihazÄ±nÄ±zla etkileÅŸiminizdeki ince ritimleri izleyerek size Ã¶zel dijital baz hattÄ±nÄ±zÄ± oluÅŸturur. BaÅŸlamak iÃ§in Google veya Apple hesabÄ±nÄ±zla giriÅŸ yapÄ±n:
          </p>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-comus-sand-light/20 shadow-soft">
            <AuthPanel onSuccess={handleAuthSuccess} />
            
            <div className="mt-4 pt-4 border-t border-comus-sand-light/40">
              <button
                type="button"
                onClick={async () => {
                  await setUserProfile({
                    name: 'Demo KullanÄ±cÄ±sÄ±',
                    email: 'demo@apple.com',
                    isPasswordAccount: true,
                    createdAt: Date.now()
                  });
                  setStep(2);
                }}
                className="w-full py-3 px-4 bg-comus-surface text-comus-navy border-2 border-comus-navy/10 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-comus-sand-light/20 transition-colors"
              >
                <span>GiriÅŸ Yapmadan Ä°ncele (Demo Modu)</span>
              </button>
            </div>
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
              YaÅŸ ve Cinsiyet Bilgisi
            </h2>
            <p className="text-xs text-comus-sand-dark leading-relaxed">
              YazÄ±m akÄ±cÄ±lÄ±ÄŸÄ±, motor titreme ve sirkadiyen ritim normlarÄ± yaÅŸ ve biyolojik faktÃ¶rlere gÃ¶re deÄŸiÅŸir. Bu bilgiler baz hattÄ±nÄ±zÄ± doÄŸru kalibre etmek iÃ§in yalnÄ±zca cihazÄ±nÄ±zda saklanÄ±r.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-comus-navy flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-comus-copper" />
                <span>YaÅŸÄ±nÄ±z:</span>
              </label>
              <span className="text-base font-serif font-bold text-comus-navy">
                {selectedAge} yaÅŸ
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

          </div>)}

      {/* Screen 3: Permissions */}
      {step === 3 && (
        <div className="my-auto py-6 animate-fadeIn">
          <span className="text-xs font-bold uppercase tracking-widest text-comus-copper">
            Maksimum SensÃ¶r Hassasiyeti
          </span>
          <h2 className="font-serif text-2xl font-bold text-comus-navy mt-1 mb-2">
            Cihaz BiyobelirteÃ§ Ä°zinleri
          </h2>
          <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed mb-4">
            Uygulama tam bir mobil deneyim saÄŸlamak iÃ§in cihaz sensÃ¶rlerinizden nesnel telemetri toplar. TÃ¼m hesaplamalar %100 telefonunuzda yerel iÅŸlenir:
          </p>

          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
            {/* Cloud Backup & Restore Protection Choice */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-comus-surface border-2 border-emerald-300/80 shadow-soft space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <Cloud className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-comus-navy">
                      Bulut Yedekleme & SÄ±fÄ±rlanmama KorumasÄ± (Ä°steÄŸe BaÄŸlÄ±)
                    </div>
                    <div className="text-[10.5px] text-emerald-800 font-semibold">
                      UygulamayÄ± silseniz bile baz hattÄ±nÄ±z (1/7 gÃ¼n) kaybolmaz
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.cloudBackupEnabled}
                  onChange={() => setCloudBackupEnabled(!settings.cloudBackupEnabled)}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-comus-sand-dark leading-relaxed pl-10.5">
                KiÅŸisel biyobelirteÃ§leriniz Google hesabÄ±nÄ±zla ÅŸifreli olarak bulutta saklanÄ±r. UygulamayÄ± kaldÄ±rsanÄ±z dahi aynÄ± hesapla girdiÄŸinizde kaldÄ±ÄŸÄ±nÄ±z gÃ¼nden itibaren otomatik tanÄ±nÄ±rsÄ±nÄ±z.
              </p>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-comus-copper">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-comus-navy">Hareket & Titreme (Ä°vmeÃ¶lÃ§er / Jiroskop)</div>
                  <div className="text-[11px] text-comus-sand-dark">Mikrotremor, motor stabilite ve yÃ¼rÃ¼me ritmi</div>
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
                  <div className="font-semibold text-xs text-comus-navy">YazÄ±m AkÄ±cÄ±lÄ±ÄŸÄ± (Keystroke Dynamics)</div>
                  <div className="text-[11px] text-comus-sand-dark">YazÄ±m temposu ve duraklama (iÃ§erik ASLA okunmaz)</div>
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
                  <div className="font-semibold text-xs text-comus-navy">Ses Ton DinamiÄŸi & Ritim (Web Audio API)</div>
                  <div className="text-[11px] text-comus-sand-dark">KonuÅŸma ritmi ve perde varyansÄ± (ses kaydÄ± yapÄ±lmaz)</div>
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
                  <div className="font-semibold text-xs text-comus-navy">Sirkadiyen Mobilite & YaÅŸam AlanÄ±</div>
                  <div className="text-[11px] text-comus-sand-dark">Ev-Ã§alÄ±ÅŸma hareketlilik yarÄ±Ã§apÄ± ve aÃ§Ä±k hava dÃ¶ngÃ¼sÃ¼</div>
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
                  <div className="font-semibold text-xs text-comus-navy">Pil & Åarj AlÄ±ÅŸkanlÄ±klarÄ± (Battery Status)</div>
                  <div className="text-[11px] text-comus-sand-dark">Gece ÅŸarj dÃ¼zeni ve cihaz aÃ§Ä±k kalma dÃ¶ngÃ¼sÃ¼</div>
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
                  <div className="font-semibold text-xs text-comus-navy">AÄŸ ve Ã‡evrimdÄ±ÅŸÄ± Durumu (Network Telemetry)</div>
                  <div className="text-[11px] text-comus-sand-dark">BaÄŸlantÄ± kararlÄ±lÄ±ÄŸÄ± ve Ã§evrimdÄ±ÅŸÄ± Ã§alÄ±ÅŸma doÄŸrulamasÄ±</div>
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
                  <div className="text-[11px] text-comus-sand-dark">Sabah 09:00 ve akÅŸam 21:00 durum kontrolÃ¼</div>
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
            GÃ¼venliÄŸin & Tam Yerel Depolama
          </h2>

          <div className="space-y-3.5 text-xs sm:text-sm text-comus-sand-dark leading-relaxed">
            <div className="p-4 bg-white rounded-2xl border border-comus-sand-light/30 shadow-soft">
              <h4 className="font-semibold text-comus-navy mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                TÄ±bbi TeÅŸhis DeÄŸildir
              </h4>
              <p>
                Dijital Mental Ä°kizim bir tÄ±bbi tanÄ± veya klinik tedavi aracÄ± deÄŸildir. DavranÄ±ÅŸsal deÄŸiÅŸimleri istatistiksel baz hattÄ± Ã¼zerinden ayna tutarak farkÄ±ndalÄ±k sunar.
              </p>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <h4 className="font-semibold text-rose-900 mb-1">
                Acil Durum ve Kriz DesteÄŸi
              </h4>
              <p className="text-rose-800">
                AÅŸÄ±rÄ± zorlanma, kriz veya tehlike anÄ±nda lÃ¼tfen vakit kaybetmeden <strong>112 Acil</strong> veya <strong>Alo 182</strong> hatlarÄ±nÄ± arayarak hekim ve uzman desteÄŸine baÅŸvurun.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="pb-4 pt-2 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            onClick={() => {
              setUserWentBack(true);
              setStep((s) => (s - 1) as any);
            }}
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
            <span>Ä°zinlere GeÃ§</span>
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
            <span>AnladÄ±m, Aynaya BaÅŸla</span>
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};


