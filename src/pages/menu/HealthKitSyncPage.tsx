import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Activity, Moon, Footprints, HeartPulse, Flame, RefreshCw, CheckCircle2 } from 'lucide-react';
import { healthService, HealthSummarySnapshot } from '../../services/native/healthService';
import { sensorManager } from '../../sensors/SensorManager';
import { db } from '../../db';

export const HealthKitSyncPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const savedSummaryRow = useLiveQuery(() => db.settings.get('healthkit_last_summary'));
  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];

  const summary: HealthSummarySnapshot | null = savedSummaryRow?.value ?? null;

  const latestByKey = React.useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
    for (const m of sorted) {
      map.set(m.metricKey, m.value);
    }
    return map;
  }, [dailyMetrics]);

  useEffect(() => {
    // Attempt a silent background sync when opening the page
    healthService.syncHealthBiomarkers().catch(() => {});
  }, []);

  const handleRequestAndSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await healthService.requestHealthPermissions();
      if (res.granted) {
        await healthService.syncHealthBiomarkers();
        await sensorManager.evaluateNow();
        setStatusMessage(
          'Apple Sağlık izinleri doğrulandı ve güncel uyku, adım, nabız ve kalori verileriniz Dijital Mental İkizinizle eşitlendi.'
        );
      } else {
        setErrorMessage(res.error || 'İzin reddedildi veya donanım desteklemiyor.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Eşitleme sırasında bir hata oluştu.');
    } finally {
      setIsSyncing(false);
    }
  };

  const tstMinutes = summary?.tstMinutes ?? latestByKey.get('sleep_duration') ?? null;
  const sleepEfficiency = summary?.sleepEfficiency ?? latestByKey.get('sleep_efficiency') ?? null;
  const sleepWaso = summary?.wasoMinutes ?? latestByKey.get('sleep_waso') ?? null;
  const sleepSol = summary?.solMinutes ?? latestByKey.get('sleep_sol') ?? null;
  const steps = summary?.steps ?? null;
  const mobilityIndex = summary?.mobilityScore ?? latestByKey.get('mobility_index') ?? null;
  const heartRate = summary?.heartRateBpm ?? null;
  const activeCalories = summary?.activeCaloriesKcal ?? null;

  const formatDuration = (mins: number | null) => {
    if (mins === null || mins === undefined) return 'Veri bekleniyor';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Apple Sağlık (HealthKit)</h1>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium animate-fadeIn">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
              Apple Sağlık &amp; Uyku Mimarisi Eşitlemesi
            </h3>
            <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
              Apple Watch ve iPhone üzerinden uyku evreleri (TST, WASO, SOL, Uyku Verimliliği), günlük adım, kalp atış hızı ve aktif kalori verilerini cihaz içinde analiz eder.
            </p>
          </div>
        </div>

        {/* Live HealthKit Telemetry Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-900">
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Toplam Uyku (TST)</span>
            </div>
            <div className="text-sm font-bold text-comus-navy">
              {formatDuration(tstMinutes)}
            </div>
            <div className="text-[10px] text-comus-sand-dark">
              Verimlilik: {sleepEfficiency !== null ? `%${sleepEfficiency}` : '—'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-900">
              <Moon className="w-3.5 h-3.5 text-sky-600" />
              <span>WASO &amp; SOL</span>
            </div>
            <div className="text-sm font-bold text-comus-navy">
              {sleepWaso !== null ? `${sleepWaso} dk uyanıklık` : 'Veri bekleniyor'}
            </div>
            <div className="text-[10px] text-comus-sand-dark">
              Uykuya dalma (SOL): {sleepSol !== null ? `${sleepSol} dk` : '—'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
              <Footprints className="w-3.5 h-3.5 text-emerald-600" />
              <span>Adım &amp; Hareket</span>
            </div>
            <div className="text-sm font-bold text-comus-navy">
              {steps !== null ? `${steps.toLocaleString('tr-TR')} adım` : mobilityIndex !== null ? `${mobilityIndex} puan` : 'Veri bekleniyor'}
            </div>
            <div className="text-[10px] text-comus-sand-dark">
              Hareketlilik Endeksi: {mobilityIndex !== null ? `${mobilityIndex}/100` : '—'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-900">
              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
              <span>Nabız &amp; Kalori</span>
            </div>
            <div className="text-sm font-bold text-comus-navy">
              {heartRate !== null ? `${heartRate} BPM` : 'Veri bekleniyor'}
            </div>
            <div className="text-[10px] text-comus-sand-dark flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Aktif: {activeCalories !== null ? `${activeCalories} kcal` : '—'}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-comus-sand-dark leading-relaxed">
          Dijital Mental İkizim'in Apple Sağlık veri kaynakları (<strong>Ayarlar &rarr; Sağlık &rarr; Veri Erişimi ve Aygıtlar</strong>) listesinde görünebilmesi ve uyku/hareket analizlerini baz hattınıza dahil edebilmesi için aşağıdaki butona tıklayın.
        </p>

        <button
          onClick={handleRequestAndSync}
          disabled={isSyncing}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Apple Sağlık Verileri Eşitleniyor...' : 'Sağlık İzinlerini İste ve Şimdi Eşitle'}</span>
        </button>
      </div>
    </div>
  );
};

