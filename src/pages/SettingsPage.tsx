import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { calculateZScore } from '../engine/anomaly';
import { AnomalyResult } from '../types/engine';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { AuthPanel } from '../components/auth/AuthPanel';
import {
  ArrowLeft,
  Sliders,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Moon,
  BatteryCharging,
  Wifi,
  LogOut,
  Edit2,
  MapPin,
  Cloud,
  CloudOff,
  RefreshCw,
  RotateCcw,
  Sun, Battery, CheckCircle2, Activity, Keyboard,
} from 'lucide-react';

// Impulse shield, HealthKit, ethics, notifications and legal sections live in
// their own pages under src/pages/menu/ (see MenuHubPage).
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    userProfile,
    runAnalysisPipeline,
    isAnalyzing,

    settings,
    setUserProfile,
    connectGoogleProfile,
    disconnectGoogleProfile,
    toggleSensor,
    setCloudBackupEnabled,
    syncCloudDataNow,
    restoreFromCloudNow,
    wipeAllData,
  } = useAppStore();

  const [evalToast, setEvalToast] = useState<string | null>(null);

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];

  // Group metrics by key and find latest date
  const { historyByKey, latestMetricsByKey, baselineMap } = useMemo(() => {
    const bMap = new Map(baselines.map(b => [b.metricKey, b]));
    const hMap = new Map<string, { date: string; value: number }[]>();
    const lMap = new Map<string, number>();

    let maxDate = '';

    // Sort metrics by date
    const sorted = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));

    for (const m of sorted) {
      if (m.date > maxDate) maxDate = m.date;
      if (!hMap.has(m.metricKey)) {
        hMap.set(m.metricKey, []);
      }
      hMap.get(m.metricKey)!.push({
        date: m.date.slice(5),
        value: m.value,
      });
      lMap.set(m.metricKey, m.value);
    }

    // Build anomalies for latest date
    const anoms: AnomalyResult[] = [];
    if (maxDate) {
      const todays = sorted.filter(m => m.date === maxDate);
      for (const t of todays) {
        const base = bMap.get(t.metricKey);
        if (base) {
          const z = calculateZScore(t.value, base.ewmaMean, base.ewmaStd);
          const dev = base.ewmaMean !== 0
            ? Math.round(((t.value - base.ewmaMean) / base.ewmaMean) * 100)
            : 0;
          anoms.push({
            metricKey: t.metricKey,
            date: maxDate,
            currentValue: t.value,
            baselineMean: base.ewmaMean,
            baselineStd: base.ewmaStd,
            zScore: z,
            isAnomaly: Math.abs(z) >= 2.0,
            deviationPercent: dev,
            direction: z > 0 ? 'above' : 'below',
          });
        }
      }
    }

    return {
      historyByKey: hMap,
      latestMetricsByKey: lMap,
      anomalies: anoms,
      baselineMap: bMap,
    };
  }, [dailyMetrics, baselines]);

  // Helper to safely get metric info without mocking
  const getMetricData = (key: any, unavailableReason = '') => {
    const hasData = latestMetricsByKey.has(key);
    const curr = hasData ? (latestMetricsByKey.get(key) ?? null) : null;
    const base = baselineMap.get(key)?.ewmaMean ?? null;
    const std = baselineMap.get(key)?.ewmaStd ?? 1;
    const z = curr !== null && base !== null ? calculateZScore(curr, base, std) : null;
    const dev = curr !== null && base !== null && base !== 0 ? Math.round(((curr - base) / base) * 100) : null;
    const hist = (historyByKey.get(key) || []).slice(-14);
    return { hasData, curr, base, z, dev, hist, unavailableReason };
  };

  const mobility = getMetricData('mobility_index', '[Veri Alınamıyor / İzin Bekleniyor]');
  const typing = getMetricData('typing_wpm', '[Kayıt Yok - Uygulama içi yazım yapılmadı]');


  const battery = getMetricData('battery_level', '[Veri Al�nam�yor / �zin Bekleniyor]');

  const handleManualEvaluate = async () => {
    await runAnalysisPipeline();
    setEvalToast('Cihaz sensörleri okundu, baz hattı ve klinik durum güncellendi!');
    setTimeout(() => setEvalToast(null), 3500);
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(userProfile.name);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wipeConfirmed, setWipeConfirmed] = useState(false);
  const [cloudActionLoading, setCloudActionLoading] = useState(false);
  const [cloudActionFeedback, setCloudActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim()) {
      await setUserProfile({ name: editedName.trim() });
      setIsEditingName(false);
    }
  };

  const handleWipeConfirm = async () => {
    await wipeAllData();
    setWipeModalOpen(false);
    setWipeConfirmed(true);
    setTimeout(() => setWipeConfirmed(false), 3000);
  };

  const handleToggleCloudBackup = async () => {
    const nextState = !settings.cloudBackupEnabled;
    setCloudActionLoading(true);
    setCloudActionFeedback(null);
    try {
      await setCloudBackupEnabled(nextState);
      setCloudActionFeedback({
        type: 'success',
        message: nextState
          ? 'Bulut yedekleme başarıyla aktif edildi ve verileriniz buluta senkronize edildi.'
          : 'Bulut yedekleme kapatıldı. Verileriniz artık yalnızca bu cihazda tutulacak.',
      });
    } catch (err: any) {
      setCloudActionFeedback({
        type: 'error',
        message: err?.message || 'Bulut yedekleme ayarı güncellenirken hata oluştu.',
      });
    } finally {
      setCloudActionLoading(false);
      setTimeout(() => setCloudActionFeedback(null), 4000);
    }
  };

  const handleSyncCloudNow = async () => {
    setCloudActionLoading(true);
    setCloudActionFeedback(null);
    try {
      const res = await syncCloudDataNow();
      if (res.success) {
        setCloudActionFeedback({
          type: 'success',
          message: 'Tüm biyobelirteçleriniz, baz hatlarınız ve ruh hali kayıtlarınız buluta başarıyla yedeklendi.',
        });
      } else {
        setCloudActionFeedback({
          type: 'error',
          message: res.message || 'Bulut yedekleme başarısız oldu.',
        });
      }
    } catch (err: any) {
      setCloudActionFeedback({
        type: 'error',
        message: err?.message || 'Buluta bağlanırken bir sorun oluştu.',
      });
    } finally {
      setCloudActionLoading(false);
      setTimeout(() => setCloudActionFeedback(null), 4000);
    }
  };

  const handleRestoreCloudNow = async () => {
    setCloudActionLoading(true);
    setCloudActionFeedback(null);
    try {
      const res = await restoreFromCloudNow();
      if (res.success && res.restored) {
        setCloudActionFeedback({
          type: 'success',
          message: res.message || 'Kayıtlı verileriniz buluttan başarıyla geri yüklendi!',
        });
      } else {
        setCloudActionFeedback({
          type: 'error',
          message: res.message || 'Bulutta kayıtlı bir yedek bulunamadı.',
        });
      }
    } catch (err: any) {
      setCloudActionFeedback({
        type: 'error',
        message: err?.message || 'Geri yükleme sırasında hata oluştu.',
      });
    } finally {
      setCloudActionLoading(false);
      setTimeout(() => setCloudActionFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-comus-navy">
            Ayarlar &amp; Kişisel Profil
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

      {/* Live Sensors & Real-Time Evaluation Control Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-comus-sand-light/30 shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
              <div className="w-3 h-3 rounded-full bg-emerald-600 relative" />
            </div>
            <div>
              <div className="text-xs font-bold text-comus-navy flex items-center gap-1.5">
                <span>Canlı Sensör Okuma & Fenotip Motoru Aktif</span>
              </div>
              <p className="text-[11px] text-comus-sand-dark mt-0.5">
                Cihaz içi hareketlilik, yazım temposu ve oturum döngüleri arka planda izleniyor
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleManualEvaluate}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs font-semibold shadow-soft hover:shadow-soft-lg transition-all disabled:opacity-75 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Değerlendiriliyor...' : 'Şimdi Değerlendir'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Hardware Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-comus-sand-light/20 text-[11px]">
          <div className="flex items-center gap-1.5 text-comus-navy/80">
            <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Hareket: <strong>{mobility.hasData ? `${mobility.curr} puan` : 'İzin Bekleniyor'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-comus-navy/80">
            <Keyboard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Yazım: <strong>{typing.hasData ? `${typing.curr} WPM` : 'Yazım Yok'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-comus-navy/80">
            <Battery className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Pil: <strong>{battery.hasData ? `%${battery.curr}` : 'API Kısıtlı'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-comus-navy/80">
            <Wifi className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Ağ: <strong>Çevrimiçi</strong></span>
          </div>
        </div>


        {evalToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{evalToast}</span>
          </div>
        )}
      </div>

      

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

      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
              settings.cloudBackupEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
            }`}>
              {settings.cloudBackupEnabled ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
                Bulut Yedekleme & Senkronizasyon
              </h3>
              <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
                Uygulama silinse bile Google hesabınızla verilerinizi 1/7 günden sıfırlamadan geri yükleyin
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
              settings.cloudBackupEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}>
              {settings.cloudBackupEnabled ? 'Aktif' : 'Kapalı'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.cloudBackupEnabled}
                onChange={handleToggleCloudBackup}
                disabled={cloudActionLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <p className="text-xs text-comus-sand-dark leading-relaxed">
          Kişisel biyobelirteçleriniz, baz hattı kalibrasyonunuz ve ruh hali yoklamalarınız Google hesabınızla şifreli olarak bulutta saklanır. Uygulamayı telefonunuzdan silseniz dahi aynı Google hesabıyla giriş yaptığınızda kaldığınız günden itibaren tanınırsınız.
        </p>

        {cloudActionFeedback && (
          <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            cloudActionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {cloudActionFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{cloudActionFeedback.message}</span>
          </div>
        )}

        <div className="p-4 bg-comus-surface rounded-2xl border border-comus-sand-light/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] text-comus-sand-dark block">Son Bulut Senkronizasyonu:</span>
            <strong className="text-xs text-comus-navy font-semibold">
              {settings.lastCloudSyncTimestamp
                ? new Date(settings.lastCloudSyncTimestamp).toLocaleString('tr-TR')
                : 'Henüz bulut eşitlemesi yapılmadı'}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSyncCloudNow}
              disabled={cloudActionLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-comus-copper-light ${cloudActionLoading ? 'animate-spin' : ''}`} />
              <span>Şimdi Yedekle</span>
            </button>

            <button
              onClick={handleRestoreCloudNow}
              disabled={cloudActionLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-comus-sand-light/40 text-comus-navy text-xs font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-comus-sand-dark" />
              <span>Buluttan Geri Yükle</span>
            </button>
          </div>
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
              Granüler Sensör Tercihleri
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
                <div className="text-xs font-semibold text-comus-navy">Pil & Şarj Durumu</div>
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
                <div className="text-xs font-semibold text-comus-navy">Ağ & Çevrimdışı</div>
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

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-600" />
              <div>
                <div className="text-xs font-semibold text-comus-navy">Ortam Işığı (Ekran Parlaklığı)</div>
                <div className="text-[11px] text-comus-sand-dark">Gece ışık maruziyeti; ekran parlaklığı üzerinden tahmin edilir</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sensorsEnabled.light}
              onChange={() => toggleSensor('light')}
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

      {/* 4. VERİ YÖNETİMİ & KALICI SIFIRLAMA */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">
              Veri Yönetimi & Kalıcı Sıfırlama
            </h3>
            <p className="text-xs text-comus-sand-dark">
              Verileriniz tamamen cihazınızdadır; dilediğiniz an tüm yerel kayıtlarınızı kalıcı olarak silebilirsiniz
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={() => setWipeModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Tüm Verilerimi Sil</span>
          </button>
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
