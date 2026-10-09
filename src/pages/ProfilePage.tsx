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
  const [gender, setGender] = useState<string>(userProfile.gender || 'Belirtilmedi');
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
      setSyncFeedback('İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.');
    }, 12000);

    try {
      const res = await syncCloudDataNow();
      clearTimeout(safetyTimer);
      if (res.success) {
        setSyncFeedback('Buluta başarıyla yedeklendi.');
      } else {
        setSyncFeedback(res.message || 'Yedekleme başarısız.');
      }
    } catch (err: any) {
      clearTimeout(safetyTimer);
      setSyncFeedback(err?.message || 'Bağlantı hatası oluştu.');
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
      a.download = `DijitalMentalIİkizim_Yedek_${safeName}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportFeedback('9 günlük tüm verileriniz telefonunuza dosya olarak indirildi.');
    } catch {
      setExportFeedback('Dosya dışa aktarılamadı.');
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
      setExportFeedback(`${res.restoredMetrics} metrik ve ${res.restoredReports} ruh hali kaydı başarıyla yüklendi.`);
    } catch (err: any) {
      setExportFeedback(err?.message || 'Yedek yüklenirken hata oluştu.');
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
      name: name.trim() || 'Kullanıcı',
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
        
        {/* Bölüm A: Üst Rozet ve Düzenleme Butonu */}
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
              setGender(userProfile.gender || 'Belirtilmedi');
                            setCustomPicture(userProfile.picture || profilePhotoUrl);
              setIsEditing(!isEditing);
            }}
            className="hover:bg-slate-100 rounded-full p-1.5 transition text-slate-400 hover:text-slate-700 cursor-pointer"
            title="Profili Düzenle"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bölüm B: Avatar ve Kullanıcı Kimlik Alanı */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#F5F2EB] to-[#EAE5DC] shadow-sm overflow-hidden flex items-center justify-center">
              <img
                src={mentalTwin.avatarSrc}
                alt={mentalTwin.avatarAlt || 'Dijital Mental İkizim Profil Fotoğrafı'}
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
            {userProfile.isGoogleConnected ? 'Google Hesabı' : userProfile.isAppleConnected ? 'Apple Hesabı' : 'Yerel Hesap'}
            <span className="text-slate-300">•</span>
            {userProfile.email || 'Cihaz içi şifreli profil'}
          </div>
        </div>

        {/* Bölüm C: Yapılandırılmış Bilgi Izgarası (Bento Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {/* Yaş & Cinsiyet (1x1) */}
          <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-1 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Yaş</span>
            <span className="text-sm font-bold text-slate-700">{userProfile.age || 'Belirtilmedi'}</span>
          </div>

          <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center gap-1 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cinsiyet</span>
            <span className="text-sm font-bold text-slate-700">{userProfile.gender || 'Belirtilmedi'}</span>
          </div>

          {/* Mevcut Ritim (Col Span 2) */}
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-4 border border-amber-100/50 flex flex-col items-center justify-center text-center gap-1 shadow-sm">
            <span className="text-[10px] font-semibold text-amber-600/70 uppercase tracking-wider">Mevcut Ritim</span>
            <span className="text-sm font-bold text-amber-700">{mentalTwin.stateLabel}</span>
          </div>

          {/* Baz Hattı Aktifliği (Col Span 2) */}
          <div className="col-span-2 bg-comus-surface rounded-3xl p-4 border border-comus-sand-light/30 flex flex-row items-center justify-between shadow-sm">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Baz Hattı</span>
              <span className="text-sm font-bold text-slate-700">{distinctDays} Gün Aktif Telemetri</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-comus-copper">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          {/* GAD-7 & PHQ-9 (Col Span 2 or 1 depending on screen) */}
          <button 
            onClick={() => navigate('/assessment')}
            className="col-span-2 md:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-3xl p-4 border border-blue-100/50 flex flex-row items-center justify-between transition-colors shadow-sm text-left cursor-pointer"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-indigo-900">Klinik Anket (GAD-7 & PHQ-9)</span>
              <span className="text-[10px] font-medium text-indigo-700/70">16 soruluk ruh sağlığı taraması</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Bölüm D: Alt Buton */}
        {!isEditing && (
          <button
            onClick={() => {
              setName(userProfile.name);
              setAge(userProfile.age || 28);
              setGender(userProfile.gender || 'Belirtilmedi');
                            setCustomPicture(userProfile.picture || profilePhotoUrl);
              setIsEditing(true);
            }}
            className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            Profili ve Hedefleri Güncelle
          </button>
        )}

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profil bilgileriniz başarıyla güncellendi.</span>
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSave} className="mt-5 pt-5 border-t border-comus-sand-light/20 space-y-4 animate-fadeIn">
            {/* Profile Photo Customization */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-comus-surface/60 border border-comus-sand-light/30">
              <label className="text-xs font-semibold text-comus-navy block">Google / Profil Fotoğrafı:</label>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white shadow-soft bg-white shrink-0 flex items-center justify-center">
                  {customPicture ? (
                    <img
                      src={customPicture}
                      alt="Profil Önizleme"
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
                    <span>Fotoğraf Seç</span>
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
                      Kaldır
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
                <label className="text-xs font-semibold text-comus-navy block">Yaş:</label>
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-comus-navy block">Cinsiyet:</label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full text-xs p-2.5 pl-8 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper text-comus-navy appearance-none"
                    >
                      <option value="Belirtilmedi">Belirtilmedi</option>
                      <option value="Erkek">Erkek</option>
                      <option value="Kadın">Kadın</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                    <User className="w-3.5 h-3.5 text-comus-sand absolute left-2.5 top-3" />
                  </div>
                </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-comus-sand-dark hover:bg-comus-surface transition-colors cursor-pointer"
              >
                İptal
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
                Cihaz İçi Baz Hattı Durumu
              </h2>
              <p className="text-xs text-comus-sand-dark">
                Yalnızca bu cihazdan toplanan gerçek biyobelirteç telemetrisi
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20">
            <span className="text-[11px] text-comus-sand-dark block">Kayıtlı Gün</span>
            <strong className="text-lg font-bold font-serif text-comus-navy">{distinctDays} Gün</strong>
          </div>
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20">
            <span className="text-[11px] text-comus-sand-dark block">Ruh Hali Yoklaması</span>
            <strong className="text-lg font-bold font-serif text-comus-navy">{reportsCount} Kayıt</strong>
          </div>
          <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/20 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-comus-sand-dark block">Yerel Depolama</span>
            <strong className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>%100 Cihazda Şifreli</span>
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
              {settings.cloudBackupEnabled ? 'Bulut Senkronizasyonu & Yedekleme Aktif' : 'Bulut Yedekleme Kapalı'}
            </h3>
            <p className="text-[11px] text-comus-sand-dark">
              {settings.cloudBackupEnabled
                ? settings.lastCloudSyncTimestamp
                  ? `Son yedekleme: ${new Date(settings.lastCloudSyncTimestamp).toLocaleString('tr-TR')}`
                  : 'Verileriniz hesabınızla güvenle yedekleniyor'
                : 'Veriler yalnızca bu telefonda saklanır. Ayarlar sayfasından açabilirsiniz.'}
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
              title="Doğrudan Google Firestore bulutuna yedekle"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-comus-copper ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Yedekleniyor...' : 'Şimdi Yedekle'}</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer shrink-0 shadow-soft"
            title="9 günlük verilerinizi telefonunuza JSON dosyası olarak indirin"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Yedeği İndir (.json)</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 transition-colors cursor-pointer shrink-0 shadow-soft">
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Geri Yükle</span>
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
                Biyobelirteç değişimlerini ve ilaç etkileşimlerini hekiminizle paylaşın
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
                Cihaz Sensör & Bildirim Ayarları
              </div>
              <div className="text-[11px] text-comus-sand-dark">
                İvmeölçer, yazım ritmi, bildirimler ve veri sıfırlama
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


