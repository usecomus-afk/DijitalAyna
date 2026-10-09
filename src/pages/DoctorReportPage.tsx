import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import {
  Calendar,
  ShieldCheck,
  Share2,
  Check,
  Pill,
  ClipboardList,
  Info,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { METRIC_DEFINITIONS, MetricKey } from '../types/sensor';
import { calculateZScore } from '../engine/anomaly';
import { analyzeMedicationImpact } from '../engine/medicationAnalytics';
import { PinnedInsight } from '../services/reportBuilder';
import { NORMATIVE_DEFAULTS } from '../engine/seedCalibration';
import { sensorCapabilities } from '../sensors/capabilities';
import { sensorManager } from '../sensors/SensorManager';
import { healthService } from '../services/native/healthService';
import { DoctorShareWizard } from '../components/doctor/DoctorShareWizard';

export type MetricDisplayStatus = 'active' | 'permission_required' | 'unsupported' | 'waiting_data' | 'self_report_required';

export function getMetricStatusType(key: MetricKey, hasData: boolean): MetricDisplayStatus {
  if (hasData) return 'active';
  if (key === 'mobility_index' || key === 'tremor_variance' || key === 'voice_pitch_variance' || key === 'voice_speech_rate' || key === 'camera_interaction_count') {
    return 'permission_required';
  }
  if (key === 'gaming_duration') {
    return 'self_report_required';
  }
  return 'waiting_data';
}

// Technical explanation helper for unavailable sensor telemetry (Strict Zero-Mock Policy)
function getUnavailableReason(key: MetricKey): string {
  switch (key) {
    case 'typing_wpm':
    case 'typing_iki':
    case 'typing_backspace_rate':
    case 'typing_pause_count':
      return 'Uygulama içi yazım kaydı bekleniyor';
    case 'touch_scroll_velocity':
    case 'touch_interaction_frequency':
      return 'Uygulama içi dokunma/kaydırma kaydı bekleniyor';
    case 'session_duration':
    case 'screen_on_time':
      return 'Aktif oturum süresi henüz kaydedilmedi';
    case 'night_usage_minutes':
      return '02:00–04:00 gece penceresinde kullanım kaydı saptanmadı';
    case 'mobility_index':
      return 'Apple Sağlık (HealthKit) / Hareket izni bekleniyor';
    case 'tremor_variance':
      return 'Cihaz Hareket (Motion) sensör izni bekleniyor';
    case 'camera_interaction_count':
      return 'Kamera izni bekleniyor';
    case 'light_ambient_lux':
      return 'Ekran parlaklığı vekili üzerinden ortam ışığı kaydı bekleniyor';
    case 'battery_level':
    case 'is_charging':
      return 'Pil telemetrisi kaydedilemedi (iOS WebKit kısıtı)';
    case 'network_online':
      return 'Ağ bağlantı telemetrisi kaydedilemedi';
    case 'voice_pitch_variance':
    case 'voice_speech_rate':
      return 'Mikrofon izni verilmedi veya ses kaydı yok';
    case 'gaming_duration':
      return 'iOS Sandbox kısıtı nedeniyle öz-bildirim gereklidir';
    case 'cognitive_fatigue_score':
      return 'Bilişsel yorgunluk analizi için 14 günlük baz hattı bekleniyor';
    case 'impulse_risk_index':
      return 'Gece kullanım ve agresif dokunma verisi yetersiz';
    default:
      return 'Sensör verisi mevcut değil';
  }
}

export const DoctorReportPage: React.FC = () => {
  const { userProfile, baselineDayCount } = useAppStore();
  const [selectedRange, setSelectedRange] = useState<7 | 14 | 30>(14);
  const [shareFeedback] = useState<string | null>(null);

  // Medication modal state
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState<string>('10');
  const [medFreq, setMedFreq] = useState<number>(1);
  const [medStartDate, setMedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [medNotes, setMedNotes] = useState('');
  const [medError, setMedError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const insights = useLiveQuery(() => db.insights.toArray()) || [];
  const medications = useLiveQuery(() => db.medications.toArray()) || [];
  const todaysLogs = useLiveQuery(() => db.medicationLogs.where('date').equals(todayStr).toArray()) || [];
  const moods = useLiveQuery(() => db.moodReports.toArray()) || [];
  const pinnedItem = useLiveQuery(() => db.settings.get('doctor_report_pinned'));
  const pinnedInsights: PinnedInsight[] = Array.isArray(pinnedItem?.value) ? pinnedItem.value : [];

  const removePinnedInsight = async (addedAt: number) => {
    await db.settings.put({
      key: 'doctor_report_pinned',
      value: pinnedInsights.filter((p) => p.addedAt !== addedAt),
    });
  };

  const sampleDays = useMemo(() => new Set(dailyMetrics.map((m) => m.date)).size, [dailyMetrics]);
  const effectiveDayCount = Math.max(baselineDayCount, sampleDays);
  const isLearning = effectiveDayCount < 14;

  const [capStatuses, setCapStatuses] = useState(() => sensorCapabilities.getAllCapabilities());
  useEffect(() => sensorCapabilities.addListener((c) => setCapStatuses({ ...c })), []);

  const isPermissionGranted = (key: MetricKey): boolean => {
    if (key === 'mobility_index') return capStatuses.health === 'granted';
    if (key === 'tremor_variance') return capStatuses.motion === 'granted';
    if (key === 'voice_pitch_variance' || key === 'voice_speech_rate') return capStatuses.microphone === 'granted';
    if (key === 'camera_interaction_count') return capStatuses.camera === 'granted';
    return false;
  };

  const unavailableText = (st: { key: MetricKey; status: MetricDisplayStatus; unavailableReason: string }): string => {
    if (st.status === 'waiting_data') {
      return 'Sensör Aktif, İzin Gerekmez. Bu sensör aktiftir. Kişisel bazal çizginizin hesaplanabilmesi için günlük kullanım verileri toplanmaktadır.';
    }
    if (st.status === 'permission_required' && isPermissionGranted(st.key)) {
      return 'İzin verildi. Veri, kullanımınıza göre birikmeye başlayacak.';
    }
    return st.unavailableReason;
  };

  const handleRequestPermission = async (key: MetricKey) => {
    try {
      if (key === 'mobility_index') {
        const granted = await sensorCapabilities.requestHealthPermission();
        if (granted) await healthService.syncHealthBiomarkers();
      } else if (key === 'tremor_variance') {
        await sensorCapabilities.requestMotionPermission();
      } else if (key === 'voice_pitch_variance' || key === 'voice_speech_rate') {
        await sensorCapabilities.requestMicrophonePermission();
      } else if (key === 'camera_interaction_count') {
        await sensorCapabilities.requestCameraPermission();
      }
      await sensorManager.flushAndCollectAll();
      await sensorManager.evaluateNow();
    } catch (e) {
      console.warn('[DoctorReport] Permission request error:', e);
    }
  };

  // Compute summary stats for the report - all 21 indicators with strict Zero-Mock transparency
  const reportStats = useMemo(() => {
    const baselineMap = new Map(baselines.map((b) => [b.metricKey, b]));
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - selectedRange);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const periodMetrics = dailyMetrics.filter((m) => m.date >= cutoffStr);

    const stats: {
      key: MetricKey;
      label: string;
      unit: string;
      category: string;
      hasData: boolean;
      baselineMean: number | null;
      periodAvg: number | null;
      deviationPercent: number | null;
      zScore: number | null;
      status: MetricDisplayStatus;
      unavailableReason: string;
    }[] = [];

    const allKeys = Object.keys(METRIC_DEFINITIONS) as MetricKey[];

    for (const key of allKeys) {
      const def = METRIC_DEFINITIONS[key];
      const base = baselineMap.get(key);
      const norm = NORMATIVE_DEFAULTS[key] || { mean: 50, std: 5, min: 0, max: 100 };
      const ewmaMean = base ? base.ewmaMean : norm.mean;
      const ewmaStd = base ? base.ewmaStd : norm.std;

      const values = periodMetrics
        .filter((m) => m.metricKey === key)
        .map((m) => m.value);

      const hasData = values.length > 0;
      const statusType = getMetricStatusType(key, hasData);

      if (hasData) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const dev =
          ewmaMean !== 0
            ? Math.round(((avg - ewmaMean) / ewmaMean) * 100)
            : 0;
        const z = calculateZScore(avg, ewmaMean, ewmaStd);

        stats.push({
          key,
          label: def.label,
          unit: def.unit,
          category: def.category,
          hasData: true,
          baselineMean: ewmaMean,
          periodAvg: Math.round(avg * 100) / 100,
          deviationPercent: dev,
          zScore: z,
          status: 'active',
          unavailableReason: '',
        });
      } else {
        // Zero-Mock Transparency: NEVER fabricate or fallback to default numbers!
        stats.push({
          key,
          label: def.label,
          unit: def.unit,
          category: def.category,
          hasData: false,
          baselineMean: null,
          periodAvg: null,
          deviationPercent: null,
          zScore: null,
          status: statusType,
          unavailableReason: getUnavailableReason(key),
        });
      }
    }

    return stats;
  }, [dailyMetrics, baselines, selectedRange]);

  const activeCount = useMemo(() => reportStats.filter(s => s.hasData).length, [reportStats]);
  const unavailableCount = reportStats.length - activeCount;

  // Compute medication impact reports
  const medImpactReports = useMemo(() => {
    return medications.map((m) => analyzeMedicationImpact(m, dailyMetrics, baselines, moods));
  }, [medications, dailyMetrics, baselines, moods]);

  const toggleTakeDose = async (medId: number) => {
    const existing = todaysLogs.find((l) => l.medicationId === medId);
    if (existing && existing.id) {
      await db.medicationLogs.delete(existing.id);
    } else {
      await db.medicationLogs.add({
        medicationId: medId,
        date: todayStr,
        timestamp: Date.now(),
        taken: true,
      });
    }
  };

  const handleDeleteMedication = async (medId: number) => {
    if (window.confirm('Bu ilacı takip listenizden silmek istediğinize emin misiniz?')) {
      await db.medications.delete(medId);
      const logs = await db.medicationLogs.where('medicationId').equals(medId).toArray();
      for (const log of logs) {
        if (log.id) await db.medicationLogs.delete(log.id);
      }
    }
  };

  const handleSaveNewMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      setMedError('Lütfen ilaç adını giriniz.');
      return;
    }

    await db.medications.add({
      name: medName.trim(),
      dosage: medDosage,
      timeSlots: medFreq === 1 ? ["morning"] : medFreq === 2 ? ["morning", "evening"] : ["morning", "noon", "evening"],
      startDate: medStartDate || todayStr,
      notes: medNotes.trim() || 'Hekim tedavi protokolü',
      createdAt: Date.now(),
    });

    setMedName('');
    setMedDosage('10');
    setMedFreq(1);
    setMedNotes('');
    setMedError(null);
    setIsAddMedModalOpen(false);
  };

  const [isShareWizardOpen, setIsShareWizardOpen] = useState(false);

  const handleShareReport = async () => {
    setIsShareWizardOpen(true);
  };

  return (
    <div className="space-y-6 pb-6 animate-fadeIn">
      {/* Controls Bar (Hidden during Print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm text-comus-sand-dark">
              Ruh sağlığı hekiminizle ve terapistinizle paylaşabileceğiniz tüm biyometrik göstergeler, ilaç kullanım talimatları ve günlük doz takip çizelgesi
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShareReport}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Doktorumla Paylaş</span>
            </button>
          </div>
        </div>

        {pinnedInsights.length > 0 && (
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-comus-copper/20 shadow-soft space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-comus-copper">
              Rapora Eklenen İçgörüler ({pinnedInsights.length})
            </div>
            {pinnedInsights.map((p) => (
              <div key={p.addedAt} className="flex items-start justify-between gap-3 bg-comus-surface rounded-2xl p-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-comus-navy">{p.title}</div>
                  <p className="text-[11px] text-comus-sand-dark leading-relaxed mt-0.5">{p.body}</p>
                  {p.sources && p.sources.length > 0 && (
                    <p className="text-[10.5px] italic text-comus-sand-dark mt-1">Kaynak: {p.sources.join('; ')}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePinnedInsight(p.addedAt)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-white text-comus-sand-dark cursor-pointer"
                  aria-label="Rapordan kaldır"
                  title="Rapordan kaldır"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {shareFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Terapistler ve Doktorlar İçin: Hatırlama Yanlılığını (Recall Bias) Aşmak */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-comus-sand-light/30 shadow-soft space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-comus-copper">
                Klinik Amaç:
              </span>
              <span className="text-xs font-bold text-comus-navy">
                Hatırlama Yanlılığını (Recall Bias) Aşmak
              </span>
            </div>
            <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap self-start sm:self-auto shrink-0">
              Nesnel Dijital Veri
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <strong className="text-rose-950 block mb-1">Öznel Soru: "Geçen hafta nasıldın-</strong>
              <p className="text-rose-900">
                Hasta o anki ruh haline göre hatalı veya eksik yanıt verebilir. "Çok az uyudum" veya "hep gergindim" öznel ve hatırlama yanlılığına açık bir beyandır.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <strong className="text-emerald-950 block mb-1">Dijital Mental İİkizim Çözümü: Nesnel Biyobelirteçler</strong>
              <p className="text-emerald-900">
                Pazartesi ve Çarşamba 03:00'e kadar süren ekran aktivitesi, 4 saatlik uyku ve yazım yavaşlamasını net verilerle sunar. Hekimin doğru tanı ve tedavi planı oluşturmasını hızlandırır.
              </p>
            </div>
          </div>
        </div>

        {/* Configurations Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-comus-sand-light/20 shadow-soft flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-comus-navy flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-comus-copper" />
            <span>Rapor Analiz Penceresi:</span>
          </span>
          <div className="flex items-center gap-1 bg-comus-surface p-1 rounded-xl border border-comus-sand-light/30">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedRange(days as any)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedRange === days
                    ? 'bg-comus-navy text-white shadow-sm'
                    : 'text-comus-sand-dark hover:text-comus-navy'
                }`}
              >
                Son {days} Gün
              </button>
            ))}
          </div>
          <div className="text-[11px] text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{activeCount} / 21 Gösterge Aktif ({unavailableCount} Gösterge İçin İzin veya Donanım Desteği Gerekli)</span>
          </div>
        </div>
      </div>

      {/* Printable Report Sheet Document */}
      <div className="bg-white rounded-3xl p-5 sm:p-9 border border-comus-sand-light/30 shadow-soft-lg print:border-none print:shadow-none print:p-0 space-y-7">
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-comus-navy pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-serif font-bold text-2xl text-comus-navy">Dijital Mental İİkizim</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-comus-copper border border-comus-copper/30 px-2 py-0.5 rounded">
                Davranışsal Fenotip, İlaç Talimatı & Doz Takip Raporu
              </span>
            </div>
            <p className="text-xs text-comus-sand-dark">
              Dijital Fenotipleme (Torous et al.) & EWMA İstatistiksel Baz Hattı Analiz Çıktısı
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-comus-sand-dark space-y-0.5">
            <div><strong>Rapor Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')}</div>
            <div><strong>Danışan / Kullanıcı:</strong> {userProfile.name}</div>
            {userProfile.email && <div><strong>E-posta:</strong> {userProfile.email}</div>}
            <div><strong>İncelenen Pencere:</strong> Son {selectedRange} Gün ({activeCount}/21 Gösterge Aktif)</div>
          </div>
        </div>

        {/* 1. Summary Narrative */}
        <div className="p-4 sm:p-5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
          <h4 className="text-xs font-bold uppercase tracking-wider text-comus-navy mb-1.5 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-comus-copper" />
            <span>1. Genel Özet & Fenotipik Eğilim</span>
          </h4>
          <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed">
            {userProfile.name} adlı kullanıcının son {selectedRange} günlük cihaz içi etkileşimleri, yazım temposu, hata düzeltme oranları, fiziksel hareketlilik ve sirkadiyen dinlenme pencereleri EWMA kişisel baz hattı ile boylamsal olarak karşılaştırılmıştır. Sistemde ölçümlenen {activeCount} aktif biyobelirteç analize dahil edilmiştir ({unavailableCount} gösterge donanım/izin kısıtı nedeniyle veri toplayamamaktadır). Bu veriler klinik tanı içermemekte olup uzman hekim ve terapist değerlendirmesine destek amacıyla sunulmuştur.
          </p>
        </div>

        {/* 2. Medication Usage Instructions (İlaç Kullanım Talimatı) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/60 border border-teal-200/90 space-y-3">
          <div className="flex items-center gap-2 border-b border-teal-200/60 pb-2">
            <div className="w-7 h-7 rounded-xl bg-teal-700 text-white flex items-center justify-center text-xs font-bold">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-teal-950">
                2. İlaç Kullanım Talimatı & Klinik Protokol İlkeleri
              </h4>
              <span className="text-[11px] text-teal-800">
                Psikiyatri ve nöroloji tedavi güvenliği için danışanın uyması gereken temel kurallar
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/90 rounded-xl border border-teal-200/60 space-y-1">
              <div className="font-bold text-teal-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700" />
                <span>1. Dozaj & Zaman Disiplini</span>
              </div>
              <p className="text-teal-900/90 leading-relaxed text-[11.5px]">
                İlaçlarınızı her gün hekiminiz tarafından belirlenen <strong>aynı saat diliminde</strong> alınız. Unutulan bir dozu telafi etmek amacıyla kesinlikle <strong>çift doz almayınız</strong>.
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-teal-200/60 space-y-1">
              <div className="font-bold text-teal-950 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-700" />
                <span>2. Açlık/Tokluk & Sıvı Tüketimi</span>
              </div>
              <p className="text-teal-900/90 leading-relaxed text-[11.5px]">
                Mide hassasiyetini önlemek ve biyoyararlanımı artırmak için ilaçları <strong>tok karnına ve 1 tam bardak su ile</strong> yutunuz. Çay, kahve veya greyfurt suyu ile almayınız.
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-teal-200/60 space-y-1">
              <div className="font-bold text-teal-950 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                <span>3. Tedaviyi Aniden Kesmeme</span>
              </div>
              <p className="text-teal-900/90 leading-relaxed text-[11.5px]">
                Kendinizi iyi hissetseniz dahi hekiminize danışmadan ilacı aniden kesmeyiniz veya doz azaltmayınız. Doz değişiklikleri yalnızca hekim kontrolünde kademeli yapılmalıdır.
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-teal-200/60 space-y-1">
              <div className="font-bold text-teal-950 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                <span>4. Sirkadiyen Uyum & Etkileşim</span>
              </div>
              <p className="text-teal-900/90 leading-relaxed text-[11.5px]">
                Sedatif etkili ilaçları gece dinlenme penceresinden 30-45 dk önce alınız. Alkol kullanımından kaçınınız; kafein miktarını sınırlayınız.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Daily Medication Schedule & Tracking Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-comus-navy flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-comus-copper" />
              <span>3. Günlük İlaç Kullanım Tablosu & Takip Çizelgesi</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-comus-sand-dark">
                Bugün: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
              </span>
              <button
                onClick={() => setIsAddMedModalOpen(true)}
                className="no-print inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-soft transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni İlaç Ekle</span>
              </button>
            </div>
          </div>

          {/* Mobile View: Responsive Cards (No Horizontal Scroll) */}
          <div className="block sm:hidden space-y-2.5">
            {medications.length > 0 ? (
              medications.map((med) => {
                const isTakenToday = todaysLogs.some((l) => l.medicationId === med.id);
                return (
                  <div
                    key={med.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isTakenToday
                        ? 'bg-teal-50/40 border-teal-200'
                        : 'bg-white border-comus-sand-light/30 shadow-soft'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-100/80 text-teal-800 flex items-center justify-center">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-comus-navy flex items-center gap-1.5">
                            <span>{med.name}</span>
                            <span className="font-mono text-[10.5px] px-1.5 py-0.2 bg-teal-100 text-teal-900 rounded font-bold">
                              {med.dosage}
                            </span>
                          </div>
                          <span className="text-[10px] text-comus-sand-dark">
                            Başlangıç: {med.startDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => med.id && toggleTakeDose(med.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                            isTakenToday
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {isTakenToday ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Alındı</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Bekliyor</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => med.id && handleDeleteMedication(med.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors no-print cursor-pointer"
                          title="İlacı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-comus-sand-light/20 text-[11px] space-y-1">
                      <div className="text-comus-navy font-medium">
                        {med.timeSlots?.length === 1
                          ? 'Günde 1x (Sabah 09:00)'
                          : med.timeSlots?.length === 2
                          ? 'Günde 2x (Sabah / Akşam)'
                          : 'Günde 3x (Sabah / Öğle / Akşam)'}
                        {' • '}Tok karnına, bol su ile
                      </div>
                      <p className="text-[10.5px] text-comus-sand-dark italic">
                        {med.notes || 'Duygudurum ve sirkadiyen ritim regülasyonu'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-5 text-center rounded-2xl bg-comus-surface border border-comus-sand-light/30">
                <p className="text-xs text-comus-sand-dark">
                  Henüz kayıtlı ilaç bulunmuyor. Takip listenize ilaç eklemek için yukarıdaki <strong className="text-teal-900">"Yeni İlaç Ekle"</strong> butonunu kullanabilirsiniz.
                </p>
              </div>
            )}
          </div>

          {/* Desktop & Print Table */}
          <div className="hidden sm:block rounded-2xl border border-comus-sand-light/30 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-comus-sand-subtle text-comus-navy font-semibold border-b border-comus-sand-light/30">
                  <th className="p-3">İlaç Adı & Dozajı</th>
                  <th className="p-3">Kullanım Vakti</th>
                  <th className="p-3">Alım Şekli & Koşulu</th>
                  <th className="p-3">Terapötik Amaç / Hekim Talimatı</th>
                  <th className="p-3 text-center">Bugünkü Durum</th>
                  <th className="p-3 text-center no-print">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-comus-sand-light/20 text-[11.5px]">
                {medications.length > 0 ? (
                  medications.map((med) => {
                    const isTakenToday = todaysLogs.some((l) => l.medicationId === med.id);
                    return (
                      <tr key={med.id} className={isTakenToday ? 'bg-teal-50/40' : 'hover:bg-comus-surface/50'}>
                        <td className="p-3 font-semibold text-comus-navy">
                          <div className="flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                            <span>{med.name}</span>
                            <span className="font-mono text-[10.5px] px-1.5 py-0.2 bg-teal-100/80 text-teal-900 rounded font-bold">
                              {med.dosage}
                            </span>
                          </div>
                          <div className="text-[10px] text-comus-sand-dark mt-0.5">
                            Başlangıç: {med.startDate}
                          </div>
                        </td>
                        <td className="p-3 text-comus-navy font-medium">
                          {med.timeSlots?.length === 1
                            ? 'Günde 1x (Sabah 09:00)'
                            : med.timeSlots?.length === 2
                            ? 'Günde 2x (Sabah / Akşam)'
                            : 'Günde 3x (Sabah / Öğle / Akşam)'}
                        </td>
                        <td className="p-3 text-comus-sand-dark">
                          Tok karnına, bol su ile
                        </td>
                        <td className="p-3 text-comus-navy">
                          {med.notes || 'Duygudurum ve sirkadiyen ritim regülasyonu'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => med.id && toggleTakeDose(med.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                              isTakenToday
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                            }`}
                            title="Tıklayarak durumu değiştirin"
                          >
                            {isTakenToday ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Alındı</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Bekliyor</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-center no-print">
                          <button
                            onClick={() => med.id && handleDeleteMedication(med.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="İlacı Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-comus-sand-dark">
                      <p>Henüz kayıtlı ilaç bulunmuyor. Takip listenize ilaç eklemek için yukarıdaki <strong className="text-teal-900">"Yeni İlaç Ekle"</strong> butonunu kullanabilirsiniz.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Medications & Treatment Response Section (Delta Analizi) */}
        {medications.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-700" />
              <span>4. Psikiyatri Tedavi & İlaç Yanıtı (Delta Analizi)</span>
            </h4>

            {medImpactReports.map((ir, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 shadow-soft space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-sm text-teal-950">
                      {ir.medication.name} ({ir.medication.dosage})
                    </span>
                    <span className="text-[11px] text-teal-800">
                      • Günde {(ir.medication.timeSlots?.length || 1)}x • Başlangıç: {ir.medication.startDate}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900">
                    {ir.daysActive}. Günlük Tedavi Seyri
                  </span>
                </div>

                <p className="text-xs text-teal-900 leading-relaxed font-medium">
                  {ir.overallSummary}
                </p>

                {/* Mobile Responsive Delta Display */}
                <div className="block sm:hidden space-y-2">
                  {ir.deltas.map((d) => (
                    <div key={d.metricKey} className="p-2.5 rounded-xl bg-white border border-teal-200/50 text-xs">
                      <div className="flex items-center justify-between font-semibold text-comus-navy mb-1">
                        <span>{d.label}</span>
                        <span className={`font-mono font-bold ${d.changePercent < 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
                          {d.changePercent > 0 ? `+${d.changePercent}%` : `${d.changePercent}%`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-comus-sand-dark mb-1">
                        <span>Öncesi: {d.preAvg} {d.unit}</span>
                        <span>Sonrası: {d.postAvg} {d.unit}</span>
                      </div>
                      <p className="text-[10.5px] text-comus-navy/80">{d.interpretation}</p>
                    </div>
                  ))}
                </div>

                {/* Desktop Delta Table */}
                <div className="hidden sm:block rounded-xl border border-teal-200/60 bg-white overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-teal-100/50 text-teal-950 font-semibold border-b border-teal-200/60">
                        <th className="p-2.5">Biyobelirteç / Metrik</th>
                        <th className="p-2.5 text-right">İlaç Öncesi Baz</th>
                        <th className="p-2.5 text-right">İlaç Dönemi Ort.</th>
                        <th className="p-2.5 text-right">Değişim (Delta %)</th>
                        <th className="p-2.5">Klinik Yansıma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100 text-[11px]">
                      {ir.deltas.map((d) => (
                        <tr key={d.metricKey}>
                          <td className="p-2.5 font-medium text-comus-navy">{d.label}</td>
                          <td className="p-2.5 text-right font-mono tabular-nums text-comus-sand-dark">
                            {d.preAvg} {d.unit}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-comus-navy">
                            {d.postAvg} {d.unit}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums font-bold">
                            <span className={d.changePercent < 0 ? 'text-indigo-700' : 'text-amber-700'}>
                              {d.changePercent > 0 ? `+${d.changePercent}%` : `${d.changePercent}%`}
                            </span>
                          </td>
                          <td className="p-2.5 text-comus-sand-dark">{d.interpretation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. Complete Metrics Table (All 21 Indicators with Strict Zero-Mock Transparency) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-comus-navy">
              {medications.length > 0 ? '5.' : '4.'} Sayısal Göstergeler & EWMA Baz Hattı Sapma Tablosu ({reportStats.length} Gösterge)
            </h4>
            <span className="text-[11px] text-comus-sand-dark font-medium">
              <strong className="text-emerald-700 font-bold">{activeCount}</strong> / 21 Gösterge Aktif • <span className="text-amber-800 font-bold">{unavailableCount}</span> İzin/Sensör Bekleniyor
            </span>
          </div>

          {/* MOBILE VIEW: Clean Cards - No Horizontal Scrolling Required */}
          <div className="block sm:hidden space-y-2">
            {reportStats.map((st) => {
              const isAnomaly = st.hasData && st.zScore !== null && Math.abs(st.zScore) >= 2.0;
              return (
                <div
                  key={st.key}
                  className={`p-3 rounded-2xl border transition-all ${
                    !st.hasData
                      ? 'bg-stone-50/60 border-stone-200/80'
                      : isAnomaly
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-white border-comus-sand-light/30 shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1">
                      <div className="font-semibold text-xs text-comus-navy">{st.label}</div>
                      <div className="text-[10px] text-comus-sand-dark capitalize">{st.category} sensörü</div>
                      {!st.hasData && (
                        <p className="text-[10px] text-stone-500 italic mt-0.5">{unavailableText(st)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.hasData
                          ? isAnomaly
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : st.status === 'permission_required'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                          : st.status === 'self_report_required'
                          ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold'
                          : st.status === 'unsupported'
                          ? 'bg-stone-100 text-stone-600 border border-stone-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}>
                        {st.hasData
                          ? isAnomaly ? 'Sapma Var' : (st.key === 'light_ambient_lux' ? 'Aktif / Vekil Donanım' : 'Aktif / Native')
                          : st.status === 'permission_required'
                          ? (isPermissionGranted(st.key) ? '🟢 Aktif / İzin Verildi' : 'İzin Bekleniyor')
                          : st.status === 'self_report_required'
                          ? 'Öz-Bildirim Gerekli'
                          : st.status === 'unsupported'
                          ? 'Desteklenmiyor'
                          : isLearning ? `Öğrenme Sürecinde (${effectiveDayCount}/14 Gün)` : 'Veri Bekleniyor'}
                      </span>
                      {!st.hasData && st.status === 'permission_required' && !isPermissionGranted(st.key) && (
                        <button
                          onClick={() => handleRequestPermission(st.key)}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-comus-navy text-white hover:bg-comus-navy-dark active:scale-95 transition-all shadow-xs"
                        >
                          {st.key === 'mobility_index' ? 'İzin Ver / Sağlığı Bağla' : st.key === 'camera_interaction_count' ? 'Kamera İzni İste' : 'İzin Ver'}
                        </button>
                      )}
                      {!st.hasData && st.status === 'self_report_required' && (
                        <NavLink
                          to="/journal"
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-comus-copper text-white hover:bg-comus-copper-dark active:scale-95 transition-all shadow-xs inline-flex items-center gap-1"
                        >
                          Günlük'te Doldur
                        </NavLink>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-comus-sand-light/20 text-center">
                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Kişisel Baz</span>
                      <strong className="font-mono text-[11px] text-comus-navy font-semibold">
                        {st.hasData && st.baselineMean !== null ? `${st.baselineMean} ${st.unit}` : '—'}
                      </strong>
                    </div>

                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Dönem Ort.</span>
                      <strong className="font-mono text-[11px] text-comus-navy font-semibold">
                        {st.hasData && st.periodAvg !== null ? `${st.periodAvg} ${st.unit}` : '—'}
                      </strong>
                    </div>

                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Değişim</span>
                      <strong className={`font-mono text-[11px] font-bold ${
                        !st.hasData
                          ? 'text-stone-400'
                          : (st.deviationPercent || 0) > 0
                          ? 'text-amber-700'
                          : (st.deviationPercent || 0) < 0
                          ? 'text-indigo-700'
                          : 'text-comus-sand-dark'
                      }`}>
                        {st.hasData && st.deviationPercent !== null
                          ? `${st.deviationPercent > 0 ? '+' : ''}${st.deviationPercent}%`
                          : '—'}
                      </strong>
                    </div>

                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Z-Skoru</span>
                      <strong className={`font-mono text-[11px] font-bold ${
                        !st.hasData
                          ? 'text-stone-400'
                          : isAnomaly
                          ? 'text-rose-600'
                          : 'text-comus-sand-dark'
                      }`}>
                        {st.hasData && st.zScore !== null
                          ? `${st.zScore > 0 ? '+' : ''}${st.zScore}`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP & PRINT VIEW: Full Table */}
          <div className="hidden sm:block rounded-2xl border border-comus-sand-light/30 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-comus-sand-subtle text-comus-navy font-semibold border-b border-comus-sand-light/30">
                  <th className="p-3 w-[34%]">Gösterge / Biyobelirteç</th>
                  <th className="p-3 text-right w-[14%]">Kişisel Baz</th>
                  <th className="p-3 text-right w-[15%]">Dönem Ort.</th>
                  <th className="p-3 text-right w-[11%]">Değişim</th>
                  <th className="p-3 text-right w-[9%]">Z-Skoru</th>
                  <th className="p-3 text-center w-[17%]">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-comus-sand-light/20">
                {reportStats.map((st) => {
                  const isAnomaly = st.hasData && st.zScore !== null && Math.abs(st.zScore) >= 2.0;
                  return (
                    <tr key={st.key} className={!st.hasData ? 'bg-stone-50/40 text-stone-500' : isAnomaly ? 'bg-rose-50/40' : 'hover:bg-comus-surface/50'}>
                      <td className="p-3 font-medium text-comus-navy">
                        <div className="font-semibold">{st.label}</div>
                        <div className="text-[10px] text-comus-sand-dark capitalize">{st.category} sensörü</div>
                        {!st.hasData && (
                          <div className="text-[10px] text-stone-500 italic mt-0.5">{unavailableText(st)}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-comus-sand-dark whitespace-nowrap">
                        {st.hasData && st.baselineMean !== null ? `${st.baselineMean} ${st.unit}` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-semibold text-comus-navy whitespace-nowrap">
                        {st.hasData && st.periodAvg !== null ? `${st.periodAvg} ${st.unit}` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-medium whitespace-nowrap">
                        {st.hasData && st.deviationPercent !== null ? (
                          <span className={st.deviationPercent > 0 ? 'text-amber-700' : st.deviationPercent < 0 ? 'text-indigo-700' : 'text-comus-sand-dark'}>
                            {st.deviationPercent > 0 ? `+${st.deviationPercent}%` : `${st.deviationPercent}%`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        {st.hasData && st.zScore !== null ? (
                          <span className={isAnomaly ? 'text-rose-600' : 'text-comus-sand-dark'}>
                            {st.zScore > 0 ? `+${st.zScore}` : st.zScore}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.hasData
                              ? isAnomaly
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                              : st.status === 'permission_required'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : st.status === 'self_report_required'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : st.status === 'unsupported'
                              ? 'bg-stone-100 text-stone-600 border border-stone-200'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}>
                            {st.hasData
                              ? isAnomaly ? 'Sapma Var' : (st.key === 'light_ambient_lux' ? 'Aktif / Vekil Donanım' : 'Aktif / Native')
                              : st.status === 'permission_required'
                              ? (isPermissionGranted(st.key) ? '🟢 Aktif / İzin Verildi' : 'İzin Bekleniyor')
                              : st.status === 'self_report_required'
                              ? 'Öz-Bildirim Gerekli'
                              : st.status === 'unsupported'
                              ? 'Desteklenmiyor'
                              : isLearning ? `Öğrenme Sürecinde (${effectiveDayCount}/14 Gün)` : 'Veri Bekleniyor'}
                          </span>
                          {!st.hasData && st.status === 'permission_required' && !isPermissionGranted(st.key) && (
                            <button
                              onClick={() => handleRequestPermission(st.key)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-comus-navy text-white hover:bg-comus-navy-dark active:scale-95 transition-all shadow-xs"
                            >
                              {st.key === 'mobility_index' ? 'İzin Ver / Sağlığı Bağla' : st.key === 'camera_interaction_count' ? 'Kamera İzni İste' : 'İzin Ver'}
                            </button>
                          )}
                          {!st.hasData && st.status === 'self_report_required' && (
                            <NavLink
                              to="/journal"
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-comus-copper text-white hover:bg-comus-copper-dark active:scale-95 transition-all shadow-xs inline-flex items-center gap-1"
                            >
                              Günlük'te Doldur
                            </NavLink>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Insights Summary */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-comus-navy mb-2">
            {medications.length > 0 ? '6.' : '5.'} Sistem Tarafından Üretilen Farkındalık Notları
          </h4>
          <div className="space-y-2">
            {isLearning ? (
              <div className="p-3.5 rounded-xl bg-comus-surface border border-comus-sand-light/20 text-xs text-comus-sand-dark">
                Henüz baz hattı öğrenme aşamasında ({effectiveDayCount}/14 Gün). 14 günlük stabil baz hattı tamamlandıktan sonra kişisel farkındalık notları oluşturulacaktır.
              </div>
            ) : insights.length > 0 ? (
              insights.slice(0, 4).map((ins, i) => (
                <div key={i} className="p-3 rounded-xl bg-comus-surface border border-comus-sand-light/20 text-xs">
                  <div className="font-semibold text-comus-navy mb-0.5">{ins.title}</div>
                  <div className="text-comus-sand-dark leading-relaxed">{ins.body}</div>
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-xl bg-comus-surface border border-comus-sand-light/20 text-xs text-comus-sand-dark">
                Henüz kritik sapma veya içgörü notu kaydedilmedi. Tüm sensörler dengeli aralıkta seyrediyor.
              </div>
            )}
          </div>
        </div>

        {/* Legal & Medical Notice */}
        <div className="pt-4 border-t border-comus-sand-light/30 text-[11px] text-comus-sand-dark leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-comus-navy/70 shrink-0 mt-0.5" />
          <div>
            <strong>Yasal Uyarı:</strong> Bu rapor bir tanı belgesi değildir. Kullanıcının cihaz kullanım alışkanlıklarına, sensör biyobelirteçlerine ve beyan ettiği ilaç takvimine ilişkin istatistiksel göstergeleri içerir. Teşhis, tedavi ve reçete düzenleme süreçleri yalnızca yetkili uzman hekimler tarafından yürütülür.
          </div>
        </div>
      </div>

      {/* Add Medication Modal */}
      {isAddMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-soft-lg border border-teal-200 space-y-4">
            <div className="flex items-center justify-between border-b border-comus-sand-light/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-comus-navy">
                  Yeni İlaç ve Reçete Ekle
                </h3>
              </div>
              <button
                onClick={() => setIsAddMedModalOpen(false)}
                className="p-1 rounded-lg text-comus-sand-dark hover:text-comus-navy transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMedication} className="space-y-3.5 text-xs">
              {medError && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                  {medError}
                </div>
              )}

              <div>
                <label className="font-semibold text-comus-navy block mb-1">
                  İlaç Adı *
                </label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="Örn: Concerta, Lustral, Cipralex..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-comus-surface border border-comus-sand-light/40 text-comus-navy focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-comus-navy block mb-1">
                    Dozaj (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-comus-surface border border-comus-sand-light/40 text-comus-navy focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-comus-navy block mb-1">
                    Günlük Sıklık
                  </label>
                  <select
                    value={medFreq}
                    onChange={(e) => setMedFreq(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-comus-surface border border-comus-sand-light/40 text-comus-navy focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value={1}>Günde 1x (Sabah)</option>
                    <option value={2}>Günde 2x (Sabah/Akşam)</option>
                    <option value={3}>Günde 3x (3 Öğün)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-comus-navy block mb-1">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={medStartDate}
                  onChange={(e) => setMedStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-comus-surface border border-comus-sand-light/40 text-comus-navy focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-comus-navy block mb-1">
                  Terapötik Amaç / Hekim Talimatı
                </label>
                <textarea
                  rows={2}
                  value={medNotes}
                  onChange={(e) => setMedNotes(e.target.value)}
                  placeholder="Örn: Sabah tok karnına, odaklanma ve dikkat regülasyonu..."
                  className="w-full px-3.5 py-2 rounded-xl bg-comus-surface border border-comus-sand-light/40 text-comus-navy focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-comus-sand-light/30">
                <button
                  type="button"
                  onClick={() => setIsAddMedModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-comus-sand-dark hover:bg-comus-sand-light/20 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors cursor-pointer shadow-soft"
                >
                  İlacı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Share Wizard Modal */}
      <DoctorShareWizard 
        isOpen={isShareWizardOpen} 
        onClose={() => setIsShareWizardOpen(false)} 
      />
    </div>
  );
};
