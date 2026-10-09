import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  Edit2,
  ShieldCheck,
  Activity,
  FileText,
  LogOut,
  Check,
  ChevronRight,
  Sliders,
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  Camera,
} from 'lucide-react';
import { useMentalTwinAvatar } from '../hooks/useMentalTwinAvatar';
import { exportLocalDataAsJson, importDataFromJson } from '../services/cloudSyncService';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, settings, baselineDayCount, setUserProfile, logout, syncCloudDataNow } = useAppStore();
  const mentalTwin = useMentalTwinAvatar();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [age, setAge] = useState<number>(userProfile.age || 28);
    const [customPicture, setCustomPicture] = useState<string | undefined>(userProfile.picture);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Resolved user Google or Gravatar/Unavatar profile photo URL
  const profilePhotoUrl = useMemo(() => {
    if (userProfile.picture && !userProfile.picture.includes('default-user')) {
      return userProfile.picture;
    }
    if (userProfile.email) {
      return `https://unavatar.io/${encodeURIComponent(userProfile.email)}`;
    }
    return userProfile.picture || undefined;
  }, [userProfile.picture, userProfile.email]);

  // Real device metrics and reports
  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const reportsCount = useLiveQuery(() => db.moodReports.count()) || 0;

  // Single source of truth for baseline day count matching DigitalTwinMirror
  const distinctDays = useMemo(() => {
    const dates = new Set(dailyMetrics.map((m) => m.date));
    return Math.max(dates.size, baselineDayCount, 1);
  }, [dailyMetrics, baselineDayCount]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);

    const safetyTimer = setTimeout(() => {
      setIsSyncing(false);
      setSyncFeedback('Ä°ÅŸlem zaman aÅŸÄ±mÄ±na uÄŸradÄ±. LÃ¼tfen tekrar deneyin.');
    }, 12000);

    try {
      const res = await syncCloudDataNow();
      clearTimeout(safetyTimer);
      if (res.success) {
        setSyncFeedback('Buluta baÅŸarÄ±yla yedeklendi.');
      } else {
        setSyncFeedback(res.message || 'Yedekleme baÅŸarÄ±sÄ±z.');
      }
    } catch (err: any) {
      clearTimeout(safetyTimer);
      setSyncFeedback(err?.message || 'BaÄŸlantÄ± hatasÄ± oluÅŸtu.');
    } finally {
      clearTimeout(safetyTimer);
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const handleExportJson = async () => {
    try {
      const json = await exportLocalDataAsJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const safeName = (userProfile.name || 'Kullanici').replace(/\s+/g, '_');
      a.href = url;
      a.download = `DijitalMentalIkizim_Yedek_${safeName}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportFeedback('9 gÃ¼nlÃ¼k tÃ¼m verileriniz telefonunuza dosya olarak indirildi.');
    } catch {
      setExportFeedback('Dosya dÄ±ÅŸa aktarÄ±lamadÄ±.');
    } finally {
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importDataFromJson(text);
      setExportFeedback(`${res.restoredMetrics} metrik ve ${res.restoredReports} ruh hali kaydÄ± baÅŸarÄ±yla yÃ¼klendi.`);
    } catch (err: any) {
      setExportFeedback(err?.message || 'Yedek yÃ¼klenirken hata oluÅŸtu.');
    } finally {
      e.target.value = '';
      setTimeout(() => setExportFeedback(null), 4500);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomPicture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setUserProfile({
      name: name.trim() || 'KullanÄ±cÄ±',
      age,
            picture: customPicture,
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  
  return (
    <div className="space-y-6 pb-24 animate-fadeIn max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 relative overflow-hidden space-y-6">
        
        {/* BÃ¶lÃ¼m A: Ãœst Rozet ve DÃ¼zenleme Butonu */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {settings.cloudBackupEnabled && (
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Bulut Yedekli
            </span>
          )}
          <button
            onClick={() => {
              setName(userProfile.name);
              setAge(userProfile.age || 28);
                            setCustomPicture(userProfile.picture || profilePhotoUrl);
              setIsEditing(!isEditing);
            }}
            className="hover:bg-slate-100 rounded-full p-1.5 transition text-slate-400 hover:text-slate-700 cursor-pointer"
            title="Profili DÃ¼zenle"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* BÃ¶lÃ¼m B: Avatar ve KullanÄ±cÄ± Kimlik AlanÄ± */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#F5F2EB] to-[#EAE5DC] shadow-sm overflow-hidden flex items-center justify-center">
              <img
                src={mentalTwin.avatarSrc}
                alt={mentalTwin.avatarAlt || 'Dijital Mental Ä°kizim Profil FotoÄŸrafÄ±'}
                className="w-full h-full object-contain select-none"
              />
            </div>
            {/* Duygu Durumu Rozeti */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white rounded-full px-2.5 py-0.5 border border-slate-100 shadow-sm text-[10px] font-bold text-comus-copper whitespace-nowrap">
              {mentalTwin.stateLabel}
            </div>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-2">
            {userProfile.name || 'Profilim'}
          </h1>
          <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5 mt-1">
            {userProfile.isGoogleConnected ? 'Google HesabÄ±' : userProfile.isAppleConnected ? 'Apple HesabÄ±' : 'Yerel Hesap'}
            <span className="text-slate-300">â€¢</span>
            {userProfile.email || 'Cihaz iÃ§i ÅŸifreli profil'}
          </div>
        </div>

        {/* BÃ¶lÃ¼m C: YapÄ±landÄ±rÄ±lmÄ±ÅŸ Bilgi IzgarasÄ± (Bento Grid) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">YaÅŸ</span>
            <span className="text-xs font-bold text-slate-700">{userProfile.age || 'Belirtilmedi'}</span>
          </div>
          
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mevcut Ritim</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-100/50">{mentalTwin.stateLabel}</span>
          </div>
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Baz HattÄ±</span>
            <span className="text-xs font-bold text-slate-700">{distinctDays} GÃ¼n Aktif</span>
          </div>
        </div>

        {/* BÃ¶lÃ¼m D: Alt Buton */}
        {!isEditing && (
          <button
            onClick={() => {
              setName(userProfile.name);
              setAge(userProfile.age || 28);
                            setCustomPicture(userProfile.picture || profilePhotoUrl);
              setIsEditing(true);
            }}
            className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            Profili ve Hedefleri GÃ¼ncelle
          </button>
        )}

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profil bilgileriniz baÅŸarÄ±yla gÃ¼ncellendi.</span>
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSave} className="mt-5 pt-5 border-t border-comus-sand-light/20 space-y-4 animate-fadeIn">
            {/* Profile Photo Customization */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-comus-surface/60 border border-comus-sand-light/30">
              <label className="text-xs font-semibold text-comus-navy block">Google / Profil FotoÄŸrafÄ±:</label>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white shadow-soft bg-white shrink-0 flex items-center justify-center">
                  {customPicture ? (
                    <img
                      src={customPicture}
                      alt="Profil Ã–nizleme"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-comus-sand" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-comus-copper/10 border border-comus-sand-light/40 text-xs font-semibold text-comus-navy transition-colors shadow-soft">
                    <Camera className="w-3.5 h-3.5 text-comus-copper" />
                    <span>FotoÄŸraf SeÃ§</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                  {userProfile.email && (
                    <button
                      type="button"
                      onClick={() => setCustomPicture(`https://unavatar.io/${encodeURIComponent(userProfile.email || '')}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/70 border border-blue-200 text-xs font-semibold text-blue-800 transition-colors cursor-pointer"
                    >
                      <span>Google'dan Getir</span>
                    </button>
                  )}
                  {customPicture && (
                    <button
                      type="button"
                      onClick={() => setCustomPicture(undefined)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      KaldÄ±r
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-comus-navy block">Ad Soyad:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 pl-8 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
                  />
                  <User className="w-3.5 h-3.5 text-comus-sand absolute left-2.5 top-3" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-comus-navy block">YaÅŸ:</label>
                <div className="relative">
                  <input
                    type="number"
                    min="16"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 pl-8 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy"
                  />
                  <Calendar className="w-3.5 h-3.5 text-comus-sand absolute left-2.5 top-3" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-comus-sand-dark hover:bg-comus-surface transition-colors cursor-pointer"
              >
                Ä°ptal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Real Baseline Calibration Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-comus-navy">
                Cihaz Ä°Ã§i Baz HattÄ± Durumu
              </h2>
              <p className="text-xs text-comus-sand-dark">
                YalnÄ±zca bu cihazdan toplanan gerÃ§ek biyobelirteÃ§ telemetrisi
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20">
            <span className="text-[11px] text-comus-sand-dark block">KayÄ±tlÄ± GÃ¼n</span>
            <strong className="text-lg font-bold font-serif text-comus-navy">{distinctDays} GÃ¼n</strong>
          </div>
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20">
            <span className="text-[11px] text-comus-sand-dark block">Ruh Hali YoklamasÄ±</span>
            <strong className="text-lg font-bold font-serif text-comus-navy">{reportsCount} KayÄ±t</strong>
          </div>
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-comus-sand-dark block">Yerel Depolama</span>
            <strong className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>%100 Cihazda Åifreli</span>
            </strong>
          </div>
        </div>
      </div>

      {/* Cloud Backup & Sync Status Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-soft border border-comus-sand-light/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            settings.cloudBackupEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
          }`}>
            {settings.cloudBackupEnabled ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-comus-navy">
              {settings.cloudBackupEnabled ? 'Bulut Senkronizasyonu & Yedekleme Aktif' : 'Bulut Yedekleme KapalÄ±'}
            </h3>
            <p className="text-[11px] text-comus-sand-dark">
              {settings.cloudBackupEnabled
                ? settings.lastCloudSyncTimestamp
                  ? `Son yedekleme: ${new Date(settings.lastCloudSyncTimestamp).toLocaleString('tr-TR')}`
                  : 'Verileriniz hesabÄ±nÄ±zla gÃ¼venle yedekleniyor'
                : 'Veriler yalnÄ±zca bu telefonda saklanÄ±r. Ayarlar sayfasÄ±ndan aÃ§abilirsiniz.'}
            </p>
            {syncFeedback && (
              <span className="text-[10.5px] font-semibold text-emerald-600 mt-0.5 block animate-fadeIn">
                {syncFeedback}
              </span>
            )}
            {exportFeedback && (
              <span className="text-[10.5px] font-semibold text-blue-600 mt-0.5 block animate-fadeIn">
                {exportFeedback}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {settings.cloudBackupEnabled && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-comus-surface hover:bg-comus-copper-subtle/50 text-comus-navy text-xs font-semibold border border-comus-sand-light/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-soft"
              title="DoÄŸrudan Google Firestore bulutuna yedekle"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-comus-copper ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Yedekleniyor...' : 'Åimdi Yedekle'}</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer shrink-0 shadow-soft"
            title="9 gÃ¼nlÃ¼k verilerinizi telefonunuza JSON dosyasÄ± olarak indirin"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>YedeÄŸi Ä°ndir (.json)</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 transition-colors cursor-pointer shrink-0 shadow-soft">
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Geri YÃ¼kle</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-2.5">
        <button
          onClick={() => navigate('/doctor')}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-stone-50 rounded-2xl border border-comus-sand-light/30 shadow-soft transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-comus-navy">
                Klinik & Uzman Doktor Raporu
              </div>
              <div className="text-[11px] text-comus-sand-dark">
                BiyobelirteÃ§ deÄŸiÅŸimlerini ve ilaÃ§ etkileÅŸimlerini hekiminizle paylaÅŸÄ±n
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-comus-sand-dark" />
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-stone-50 rounded-2xl border border-comus-sand-light/30 shadow-soft transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xs sm:text-sm text-comus-navy">
                Cihaz SensÃ¶r & Bildirim AyarlarÄ±
              </div>
              <div className="text-[11px] text-comus-sand-dark">
                Ä°vmeÃ¶lÃ§er, yazÄ±m ritmi, bildirimler ve veri sÄ±fÄ±rlama
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-comus-sand-dark" />
        </button>
      </div>

      {/* Logout Button */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Oturumu Kapat</span>
        </button>
      </div>
    </div>
  );
};


