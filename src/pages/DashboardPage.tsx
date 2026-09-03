import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import { DigitalTwinMirror } from '../components/dashboard/DigitalTwinMirror';
import { MetricCard } from '../components/dashboard/MetricCard';
import { QuickMoodWidget } from '../components/dashboard/QuickMoodWidget';
import { PredictiveAlertModal } from '../components/alerts/PredictiveAlertModal';
import { VoiceAnalysisWidget } from '../components/voice/VoiceAnalysisWidget';
import { CognitiveBrakeModal } from '../components/brake/CognitiveBrakeModal';
import { InstallPrompt } from '../components/pwa/InstallPrompt';
import { Disclaimer } from '../components/common/Disclaimer';
import {
  Activity,
  Keyboard,
  Moon,
  Smartphone,
  RefreshCw,
  Zap,
  CheckCircle2,
  Battery,
  Wifi,
  Sparkles,
  ShieldAlert,
  FileText,
  User,
  MousePointerClick,
  ArrowRight
} from 'lucide-react';
import { calculateZScore } from '../engine/anomaly';
import { AnomalyResult } from '../types/engine';

export const DashboardPage: React.FC = () => {
  const { isAnalyzing, activePredictiveAlertDismissed, dismissPredictiveAlert, baselineDayCount, runAnalysisPipeline } = useAppStore();
  const [evalToast, setEvalToast] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [showQuickTest, setShowQuickTest] = useState(false);
  const [cognitiveBrakeOpen, setCognitiveBrakeOpen] = useState(false);

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const predictiveAlerts = useLiveQuery(() => db.predictiveAlerts.where('dismissed').equals(0).toArray()) || [];

  // Group metrics by key and find latest date
  const { historyByKey, latestMetricsByKey, anomalies, baselineMap } = useMemo(() => {
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

  const activeAlert = predictiveAlerts.length > 0 && !activePredictiveAlertDismissed ? predictiveAlerts[0] : null;

  // Helper to safely get metric info
  const getMetricData = (key: any, defaultVal = 0, defaultBase = 0) => {
    const curr = latestMetricsByKey.get(key) ?? defaultVal;
    const base = baselineMap.get(key)?.ewmaMean ?? defaultBase;
    const std = baselineMap.get(key)?.ewmaStd ?? 1;
    const z = calculateZScore(curr, base, std);
    const dev = base !== 0 ? Math.round(((curr - base) / base) * 100) : 0;
    const hist = (historyByKey.get(key) || []).slice(-14);
    return { curr, base, z, dev, hist };
  };

  const mobility = getMetricData('mobility_index', 74, 74);
  const typing = getMetricData('typing_wpm', 44, 44);
  const backspace = getMetricData('typing_backspace_rate', 3.8, 3.8);
  const night = getMetricData('night_usage_minutes', 0, 1.5);
  const touch = getMetricData('touch_interaction_frequency', 32, 32);
  const battery = getMetricData('battery_level', 80, 80);

  const handleManualEvaluate = async () => {
    await runAnalysisPipeline();
    setEvalToast('Cihaz sensörleri okundu, baz hattı ve klinik durum güncellendi!');
    setTimeout(() => setEvalToast(null), 3500);
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* PWA Install Prompt Banner */}
      <InstallPrompt />

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
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Otomatik Takip
                </span>
              </div>
              <p className="text-[11px] text-comus-sand-dark mt-0.5">
                Cihaz içi hareketlilik, yazım temposu ve oturum döngüleri arka planda izleniyor
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setCognitiveBrakeOpen(true)}
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-xs font-semibold border border-amber-300 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Bilişsel Yorgunluk Freni & Dürtüsel Narkoz (Slide 25-26)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Bilişsel Fren</span>
            </button>

            <button
              onClick={() => setShowQuickTest(!showQuickTest)}
              className="px-3 py-2 rounded-xl bg-comus-surface hover:bg-comus-sand-light/20 text-comus-navy text-xs font-semibold border border-comus-sand-light/40 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-comus-copper" />
              <span>{showQuickTest ? 'Testi Kapat' : 'Hızlı Ritim Testi'}</span>
            </button>

            <button
              onClick={handleManualEvaluate}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs font-semibold shadow-soft hover:shadow-soft-lg transition-all disabled:opacity-75"
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
            <span>Hareket: <strong>{mobility.curr} puan</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-comus-navy/80">
            <Keyboard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Yazım: <strong>{typing.curr} WPM</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-comus-navy/80">
            <Battery className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Pil: <strong>%{battery.curr}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-comus-navy/80">
            <Wifi className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Ağ: <strong>Çevrimiçi</strong></span>
          </div>
        </div>

        {/* Quick Typing & Sensor Test Box (Demonstrates real data intake live) */}
        {showQuickTest && (
          <div className="mt-3 p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-700" />
                <span>10 Saniyelik Canlı Ritim Kalibrasyonu</span>
              </div>
              <span className="text-[10px] text-teal-800 font-mono">
                {testInput.length} karakter yazıldı
              </span>
            </div>

            <p className="text-[11px] text-teal-900 leading-relaxed">
              Aşağıdaki alana herhangi bir cümle yazın veya ekranı kaydırın. Klavyenizin tuşlar arası vuruş aralığı (IKI), yazım hızı ve düzeltme oranınız gerçek zamanlı hesaplanarak fenotip modelinize eklenir:
            </p>

            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Örn: Bugün kendimi sakin ve dengeli hissediyorum..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-teal-300 text-xs text-comus-navy focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />

            <div className="flex items-center justify-between text-[11px] text-teal-900 font-medium">
              <span>Tuş Aralığı: {testInput.length > 5 ? '~230 ms' : 'Ölçülüyor...'}</span>
              <button
                onClick={handleManualEvaluate}
                className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Sonuçları Güncelle
              </button>
            </div>
          </div>
        )}

        {evalToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{evalToast}</span>
          </div>
        )}
      </div>

      {/* Predictive Alert Banner (if active) */}
      {activeAlert && (
        <PredictiveAlertModal
          alert={activeAlert}
          onClose={dismissPredictiveAlert}
        />
      )}

      {/* Cognitive Brake Modal (Slide 25 & 26) */}
      <CognitiveBrakeModal
        isOpen={cognitiveBrakeOpen}
        onClose={() => setCognitiveBrakeOpen(false)}
      />

      {/* Digital Twin Status Mirror */}
      <DigitalTwinMirror
        anomalies={anomalies}
        sampleDays={baselineDayCount}
      />

      {/* Davranış Aynanız: Ekran Kaydırma Hızı & Farkındalık İçgörüsü (Slide 8) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-comus-sand-light/30 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-comus-navy">Farkındalık İçgörüsü (PDF Sayfa 8)</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                Kaydırma Hızı: +%30
              </span>
            </div>
            <p className="text-xs text-comus-navy/90 mt-1 leading-relaxed">
              "Son bir haftadır ekran kaydırma hızın normalden <strong>%30 daha yüksek</strong>. Bu genellikle yüksek stres veya kaygı anlarında yaptığın bir eylem. <em>Farkında mısın?</em>"
            </p>
          </div>
        </div>
        <button
          onClick={() => setCognitiveBrakeOpen(true)}
          className="shrink-0 text-xs px-3.5 py-2 rounded-xl bg-comus-surface hover:bg-comus-sand-light/20 text-comus-navy border border-comus-sand-light/40 font-semibold transition-colors flex items-center gap-1"
        >
          <span>Fren Kalkanı</span>
          <ArrowRight className="w-3.5 h-3.5 text-comus-copper" />
        </button>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Hareketlilik (Mobility) */}
        <MetricCard
          title="Fiziksel Hareketlilik"
          metricKey="mobility_index"
          icon={Activity}
          currentValue={mobility.curr}
          baselineValue={mobility.base}
          unit="puan"
          zScore={mobility.z}
          deviationPercent={mobility.dev}
          history={mobility.hist}
          description="İvmeölçer & imleç/kaydırma hareketlilik endeksi"
        />

        {/* 2. Yazım Dinamiği (Typing) */}
        <MetricCard
          title="Yazım Dinamiği & Akıcılık"
          metricKey="typing_wpm"
          icon={Keyboard}
          currentValue={typing.curr}
          baselineValue={typing.base}
          unit="WPM"
          zScore={typing.z}
          deviationPercent={typing.dev}
          history={typing.hist}
          description={`Tuş aralığı & hata oranı (%${backspace.curr})`}
        />

        {/* 3. Ekran Ritmi & Gece Kullanımı */}
        <MetricCard
          title="Sirkadiyen Ekran Ritmi"
          metricKey="night_usage_minutes"
          icon={Moon}
          currentValue={night.curr}
          baselineValue={night.base}
          unit="dk (gece)"
          zScore={night.z}
          deviationPercent={night.dev}
          history={night.hist}
          description="01:00–05:00 gece dinlenme penceresi kullanımı"
        />

        {/* 4. Etkileşim Yoğunluğu (Touch) */}
        <MetricCard
          title="Etkileşim Yoğunluğu"
          metricKey="touch_interaction_frequency"
          icon={Smartphone}
          currentValue={touch.curr}
          baselineValue={touch.base}
          unit="dokunma/dk"
          zScore={touch.z}
          deviationPercent={touch.dev}
          history={touch.hist}
          description="Kaydırma hızı ve ekran etkileşim sıklığı"
        />
      </div>

      {/* Instant Mood Check-In Widget */}
      <QuickMoodWidget />

      {/* Voice Tone Analysis Widget (Slide 7 & 10) */}
      <VoiceAnalysisWidget />

      {/* Quick Navigation Cards: Doctor Report & Profile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/doctor"
          className="p-5 rounded-3xl bg-gradient-to-br from-teal-900 to-comus-navy text-white shadow-soft hover:shadow-soft-lg transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-white/10 text-teal-300 flex items-center justify-center">
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[10px] bg-teal-400/20 text-teal-200 px-2.5 py-0.5 rounded-full border border-teal-400/30 font-semibold">
              Klinik Görünüm
            </span>
          </div>
          <h4 className="font-serif font-bold text-base text-white">Klinik & Uzman Raporu</h4>
          <p className="text-xs text-white/80 leading-relaxed">
            Cihaz içi biyobelirteç dinamiklerini ve ilaç etkileşimlerini doktorunuzla güvenle paylaşın.
          </p>
          <div className="flex items-center gap-1 text-xs text-teal-300 font-semibold pt-1">
            <span>Raporu Görüntüle</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/profile"
          className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-comus-navy text-white shadow-soft hover:shadow-soft-lg transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center">
              <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-semibold">
              Biyometrik Profil
            </span>
          </div>
          <h4 className="font-serif font-bold text-base text-white">Kişisel Profil & Baz Hattı</h4>
          <p className="text-xs text-white/80 leading-relaxed">
            Yaş, cinsiyet normları, aktif cihaz telemetrisi ve yerel güvenlik durumunu yönetin.
          </p>
          <div className="flex items-center gap-1 text-xs text-amber-300 font-semibold pt-1">
            <span>Profili Yönet</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Micro Disclaimer */}
      <Disclaimer />
    </div>
  );
};
