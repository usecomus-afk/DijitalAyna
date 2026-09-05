import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AuthPanel } from '../components/auth/AuthPanel';
import { db } from '../db';
import {
  Settings,
  Sliders,
  Trash2,
  Download,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Activity,
  Smartphone,
  Moon,
  BatteryCharging,
  Wifi,
  LogOut,
  Edit2,
  CheckCircle2,
  Lock,
  MapPin,
  Keyboard,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    userProfile,
    settings,
    setUserProfile,
    connectGoogleProfile,
    disconnectGoogleProfile,
    toggleSensor,
    wipeAllData,
  } = useAppStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(userProfile.name);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wipeConfirmed, setWipeConfirmed] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim()) {
      await setUserProfile({ name: editedName.trim() });
      setIsEditingName(false);
    }
  };

  const handleExportJSON = async () => {
    const jsonStr = await db.exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duty-comus-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWipeConfirm = async () => {
    await wipeAllData();
    setWipeModalOpen(false);
    setWipeConfirmed(true);
    setTimeout(() => setWipeConfirmed(false), 3000);
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-comus-navy-subtle flex items-center justify-center text-comus-navy">
            <Settings className="w-4 h-4" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-comus-navy">
            Ayarlar & Kişisel Profil
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-comus-sand-dark mt-1">
          Kullanıcı profili, Google kimliği, sensör tercihleri ve yerel veri yönetimi
        </p>
      </div>

      {wipeConfirmed && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Tüm yerel veriler ve IndexedDB kayıtları başarıyla sıfırlandı.</span>
        </div>
      )}

      {/* 1. KULLANICI PROFİLİ & GOOGLE HESABI */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {userProfile.picture ? (
              <img
                src={userProfile.picture}
                alt={userProfile.name}
                className="w-12 h-12 rounded-2xl object-cover border border-comus-sand-light/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper text-lg font-bold">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-comus-navy">
                  {userProfile.name}
                </h3>
                {userProfile.isGoogleConnected && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Google Bağlı
                  </span>
                )}
              </div>
              <p className="text-xs text-comus-sand-dark">
                {userProfile.email || 'Yerel Cihaz Profili'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditedName(userProfile.name);
              setIsEditingName(!isEditingName);
            }}
            className="p-2 text-comus-sand-dark hover:text-comus-navy rounded-xl hover:bg-comus-surface transition-colors"
            title="İsmi Düzenle"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Edit Name Form */}
        {isEditingName ? (
          <form onSubmit={handleSaveName} className="mb-4 p-3 bg-comus-surface rounded-2xl flex items-center gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="flex-1 text-xs p-2 rounded-xl bg-white border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper"
              placeholder="Yeni isminiz"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-comus-navy text-white text-xs font-semibold rounded-xl"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="px-3 py-2 text-xs text-comus-sand-dark"
            >
              İptal
            </button>
          </form>
        ) : null}

        {/* Account Management & Login / Switch */}
        <div className="pt-4 border-t border-comus-sand-light/10 space-y-3">
          {userProfile.isGoogleConnected || userProfile.isPasswordAccount ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-comus-sand-dark">
                Aktif oturum: <strong className="font-semibold text-comus-navy">{userProfile.name}</strong> ({userProfile.username ? `@${userProfile.username}` : userProfile.email || 'Kullanıcı'})
              </div>
              <button
                onClick={async () => {
                  if (userProfile.isGoogleConnected) {
                    await disconnectGoogleProfile();
                  } else {
                    await setUserProfile({
                      name: 'Kullanıcı',
                      username: undefined,
                      email: undefined,
                      isGoogleConnected: false,
                      isPasswordAccount: false,
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Oturumu Kapat</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-comus-navy">
                  Hesap Eşleme & Giriş:
                </span>
                <span className="text-[11px] text-comus-sand-dark">
                  Kullanıcı adı, şifre veya Google ile giriş yapabilirsiniz.
                </span>
              </div>
              <div className="p-4 bg-comus-surface rounded-2xl border border-comus-sand-light/30">
                <AuthPanel
                  onSuccess={(profile) => {
                    if (profile.isGoogleConnected) {
                      connectGoogleProfile(profile);
                    } else {
                      setUserProfile(profile);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>



      {/* 3. GRANÜLER SENSÖR İZİNLERİ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-comus-surface flex items-center justify-center text-comus-navy">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">
              Granüler Sensör Tercihleri (Chrome & Web APIs)
            </h3>
            <p className="text-xs text-comus-sand-dark">
              Hangi sensörlerin arka planda veri toplayabileceğini ayrı ayrı belirleyin
            </p>
          </div>
        </div>

        <div className="space-y-3 divide-y divide-comus-sand-light/10">
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-comus-navy" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">İvmeölçer & Hareketlilik</div>
                <div className="text-[11px] text-comus-sand-dark">Fiziksel mobilite ve el titremesi</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sensorsEnabled.motion}
              onChange={() => toggleSensor('motion')}
              className="w-5 h-5 accent-comus-copper cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <Keyboard className="w-4 h-4 text-comus-navy" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">Yazım Dinamikleri</div>
                <div className="text-[11px] text-comus-sand-dark">WPM, IKI aralıkları, silme/hata oranı</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sensorsEnabled.typing}
              onChange={() => toggleSensor('typing')}
              className="w-5 h-5 accent-comus-copper cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-comus-navy" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">Dokunma & Kaydırma Hızı</div>
                <div className="text-[11px] text-comus-sand-dark">Kaydırma hızı ve dokunma sıklığı</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sensorsEnabled.touch}
              onChange={() => toggleSensor('touch')}
              className="w-5 h-5 accent-comus-copper cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <Moon className="w-4 h-4 text-comus-navy" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">Oturum & Gece Penceresi</div>
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

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <BatteryCharging className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">Pil & Şarj Durumu (Battery Status API)</div>
                <div className="text-[11px] text-comus-sand-dark">Düşük pil stresi ve gece şarj düzeni</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sensorsEnabled.battery}
              onChange={() => toggleSensor('battery')}
              className="w-5 h-5 accent-comus-copper cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-sky-600" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">Ağ & Çevrimdışı (Network Info API)</div>
                <div className="text-[11px] text-comus-sand-dark">Bağlantı ve çevrimdışı çalışma durumu</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sensorsEnabled.network}
              onChange={() => toggleSensor('network')}
              className="w-5 h-5 accent-comus-copper cursor-pointer"
            />
          </div>



          <div className="flex items-center justify-between pt-3 border-t border-comus-sand-light/20">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">Sirkadiyen Mobilite & Yaşam Alanı</div>
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
        </div>
      </div>

      {/* 4. VERİ DEMOKRASİSİ & YÖNETİMİ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">
              Google Drive / JSON Yedekleme & Sıfırlama
            </h3>
            <p className="text-xs text-comus-sand-dark">
              Verileriniz tamamen cihazınızdadır; istediğinizde dışa aktarın veya kalıcı olarak silin
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-comus-navy text-white text-xs font-semibold hover:bg-comus-navy-light shadow-soft transition-all"
          >
            <Download className="w-4 h-4" />
            <span>JSON Olarak İndir / Drive'a Aktar</span>
          </button>

          <button
            onClick={() => setWipeModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Tüm Verilerimi Sil</span>
          </button>
        </div>
      </div>

      {/* 5. ETİK VE GÜVEN TEMELLİ PLATFORM: 5 İLKE (PDF Sayfa 18) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">
              Etik ve Güven Temelli Bir Platform (PDF Sayfa 18)
            </h3>
            <p className="text-xs text-comus-sand-dark">
              Kullanıcı mahremiyeti ve veri egemenliğini koruyan 5 temel prensibimiz
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {/* 1. Şeffaflık */}
          <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1 text-xs">
            <div className="font-bold text-comus-navy flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>1. Şeffaflık</span>
            </div>
            <p className="text-comus-sand-dark leading-relaxed">
              Hangi verinin neden toplandığını her zaman bilirsiniz. Gizli arka plan telemetrisi bulunmaz.
            </p>
          </div>

          {/* 2. Kullanıcı Kontrolü */}
          <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1 text-xs">
            <div className="font-bold text-comus-navy flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>2. Kullanıcı Kontrolü</span>
            </div>
            <p className="text-comus-sand-dark leading-relaxed">
              Verilerinizin sahibi sizsiniz. İstediğiniz an silebilir, durdurabilir veya dışa aktarabilirsiniz.
            </p>
          </div>

          {/* 3. KVKK Uyumu */}
          <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1 text-xs">
            <div className="font-bold text-comus-navy flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>3. KVKK / GDPR Uyumu</span>
            </div>
            <p className="text-comus-sand-dark leading-relaxed">
              Veriler en yüksek güvenlik standartlarıyla sadece yerel IndexedDB'de korunur ve yasalara uygun işlenir.
            </p>
          </div>

          {/* 4. Tanı Koymaz Prensibi */}
          <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1 text-xs">
            <div className="font-bold text-comus-navy flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>4. 'Tanı Koymaz' Prensibi</span>
            </div>
            <p className="text-comus-sand-dark leading-relaxed">
              Amacımız tıbbi teşhis koymak değil, erken istatistiksel farkındalık sunup profesyonel yardıma yönlendirmektir.
            </p>
          </div>

          {/* 5. Gizlilik Odaklı Tasarım */}
          <div className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1 text-xs sm:col-span-2 lg:col-span-2">
            <div className="font-bold text-comus-navy flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>5. Gizlilik Odaklı Tasarım (Zero-Raw Content)</span>
            </div>
            <p className="text-comus-sand-dark leading-relaxed">
              Analizlerimiz tamamen davranışsaldır. Yazdığınız metinler, mesajlar, e-postalar veya ses kayıtları ASLA okunmaz ve kaydedilmez.
            </p>
          </div>
        </div>
      </div>

      {/* 6. ÖNEMLİ BİLGİLENDİRME VE YASAL FERAGATNAMELER */}
      <div className="bg-amber-50/70 rounded-3xl p-6 sm:p-7 shadow-soft border border-amber-200/80 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-200/80 flex items-center justify-center text-amber-900">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-amber-950">
              Önemli Bilgilendirme ve Yasal Feragatnameler
            </h3>
            <p className="text-xs text-amber-800">
              Hukuki sorumluluk sınırları, acil durum kanalları ve ilişki beyanı
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-amber-950 leading-relaxed">
          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <strong>Temel Feragatname:</strong> Duty Dijital Ayna, tıbbi tavsiye, teşhis veya tedavi sunmaz. Uygulama içindeki analizler istatistiksel verilere dayanır ve hata payı içerebilir.
          </div>

          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <div className="flex items-center justify-between">
              <strong>Acil Durumlar:</strong>
              <div className="flex items-center gap-2">
                <a href="tel:112" className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                  112 Acil
                </a>
                <a href="tel:182" className="px-2 py-0.5 rounded bg-indigo-700 text-white font-bold text-[10px]">
                  Alo 182 Ruh Sağlığı
                </a>
              </div>
            </div>
            <span>Herhangi bir ruhsal sorun veya acil durumda derhal bir uzmana başvurulmalıdır. Acil durumlar için: 112 Acil veya Alo 182 Ruh Sağlığı Hattı.</span>
          </div>

          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <strong>Sorumluluk Reddi:</strong> Uygulamanın kullanımından doğabilecek riskler kullanıcıya aittir.
          </div>

          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <strong>İlişki Beyanı:</strong> Uygulama kullanımı, Duty Dijital Ayna ile kullanıcı arasında 'doktor-hasta' veya 'terapist-danışan' ilişkisi kurmaz.
          </div>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {wipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-soft-lg border border-rose-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl text-comus-navy mb-2">
              Tüm Verileri Silmek İstediğinize Emin Misiniz?
            </h3>
            <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed mb-6">
              Bu işlem cihazınızın IndexedDB hafızasındaki tüm sensör olaylarını, baz hattı hesaplamalarını, içgörüleri ve ruh hali kayıtlarını kalıcı olarak siler. Bu işlem geri alınamaz.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setWipeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-comus-sand-dark hover:bg-comus-surface"
              >
                Vazgeç
              </button>
              <button
                onClick={handleWipeConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-soft"
              >
                Evet, Hepsini Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
