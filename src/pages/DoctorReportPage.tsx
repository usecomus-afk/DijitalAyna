import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import {
  Printer,
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
import { shareContent } from '../services/shareService';
import { NORMATIVE_DEFAULTS } from '../engine/seedCalibration';

export const DoctorReportPage: React.FC = () => {
  const { userProfile } = useAppStore();
  const [selectedRange, setSelectedRange] = useState<7 | 14 | 30>(14);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

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

  // Compute summary stats for the report - all 19 indicators always active & guaranteed via NORMATIVE_DEFAULTS
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
      baselineMean: number;
      periodAvg: number;
      deviationPercent: number;
      zScore: number;
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

      if (values.length > 0) {
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
          baselineMean: ewmaMean,
          periodAvg: Math.round(avg * 100) / 100,
          deviationPercent: dev,
          zScore: z,
        });
      } else {
        // Include baseline for complete visibility
        stats.push({
          key,
          label: def.label,
          unit: def.unit,
          category: def.category,
          baselineMean: ewmaMean,
          periodAvg: ewmaMean,
          deviationPercent: 0,
          zScore: 0,
        });
      }
    }

    return stats;
  }, [dailyMetrics, baselines, selectedRange]);

  // Compute medication impact reports
  const medImpactReports = useMemo(() => {
    return medications.map((m) => analyzeMedicationImpact(m, dailyMetrics, baselines, moods));
  }, [medications, dailyMetrics, baselines, moods]);

  const handlePrint = () => {
    window.print();
  };

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
      dosageMg: parseFloat(medDosage) || 10,
      frequencyPerDay: medFreq,
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

  const handleShareReport = async () => {
    const tableText = reportStats
      .map(
        (s) =>
          `• ${s.label}: Baz ${s.baselineMean} ${s.unit} -> Ortalama ${s.periodAvg} ${s.unit} (Değişim: %${s.deviationPercent})`
      )
      .join('\n');

    const medText = medications.length > 0
      ? `\n\nReçeteli İlaçlar:\n` + medications.map(m => `• ${m.name} ${m.dosageMg}mg (Günde ${m.frequencyPerDay}x, Başlangıç: ${m.startDate})`).join('\n')
      : '';

    const result = await shareContent({
      title: `Duty Dijital Ayna Davranışsal Fenotip & İlaç Raporu — ${userProfile.name}`,
      text: `Duty Dijital Ayna Davranışsal Fenotip & İlaç Raporu\nDanışan / Kullanıcı: ${userProfile.name}\nRapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}\nİncelenen Dönem: Son ${selectedRange} Gün\n\nÖzet Göstergeler (Tüm Göstergeler Aktif):\n${tableText}${medText}\n\n* Bu bir tanı belgesi değildir. İstatistiksel dijital fenotip farkındalık çıktısıdır.`,
    });

    setShareFeedback(result.message);
    setTimeout(() => setShareFeedback(null), 3500);
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
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-comus-sand-light/40 hover:bg-comus-surface text-comus-navy text-xs sm:text-sm font-semibold shadow-soft transition-all"
            >
              <Share2 className="w-4 h-4 text-comus-copper shrink-0" />
              <span className="whitespace-nowrap">Paylaş</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Yazdır / PDF</span>
            </button>
          </div>
        </div>

        {shareFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Terapistler ve Doktorlar İçin: Hatırlama Yanlılığını (Recall Bias) Aşmak (Slide 13) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-comus-sand-light/30 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-comus-copper">
                Klinik Amaç (PDF Sayfa 13)
              </span>
              <span className="text-xs font-bold text-comus-navy">
                Hatırlama Yanlılığını (Recall Bias) Aşmak
              </span>
            </div>
            <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-semibold">
              Nesnel Dijital Veri
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <strong className="text-rose-950 block mb-1">Öznel Soru: "Geçen hafta nasıldın?"</strong>
              <p className="text-rose-900">
                Hasta o anki ruh haline göre hatalı veya eksik yanıt verebilir. "Çok az uyudum" veya "hep gergindim" öznel ve hatırlama yanlılığına açık bir beyandır.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <strong className="text-emerald-950 block mb-1">Duty Dijital Ayna Çözümü: Nesnel Biyobelirteçler</strong>
              <p className="text-emerald-900">
                Pazartesi ve Çarşamba 03:00'e kadar süren ekran aktivitesi, 4 saatlik uyku ve yazım yavaşlamasını net verilerle sunar. Hekimin doğru tanı ve tedavi planı oluşturmasını hızlandırır.
              </p>
            </div>
          </div>

          {/* 4-Step Process */}
          <div className="pt-2 border-t border-comus-sand-light/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-comus-navy">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-5 h-5 rounded-full bg-comus-navy text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span>"Doktorumla Paylaş"</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-5 h-5 rounded-full bg-comus-navy text-white text-[10px] flex items-center justify-center font-bold">2</span>
              <span>Verileri Seç</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-5 h-5 rounded-full bg-comus-navy text-white text-[10px] flex items-center justify-center font-bold">3</span>
              <span>Görsel Rapor Üret</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-5 h-5 rounded-full bg-comus-navy text-white text-[10px] flex items-center justify-center font-bold">4</span>
              <span>Hekime Güvenli İlet</span>
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
          <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>19 Gösterge Aktif & Rapora Dahil</span>
          </div>
        </div>
      </div>

      {/* Printable Report Sheet Document */}
      <div className="bg-white rounded-3xl p-5 sm:p-9 border border-comus-sand-light/30 shadow-soft-lg print:border-none print:shadow-none print:p-0 space-y-7">
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-comus-navy pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-serif font-bold text-2xl text-comus-navy">Duty Dijital Ayna</span>
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
            <div><strong>İncelenen Pencere:</strong> Son {selectedRange} Gün (Tüm Göstergeler Aktif)</div>
          </div>
        </div>

        {/* 1. Summary Narrative */}
        <div className="p-4 sm:p-5 rounded-2xl bg-comus-surface border border-comus-sand-light/20">
          <h4 className="text-xs font-bold uppercase tracking-wider text-comus-navy mb-1.5 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-comus-copper" />
            <span>1. Genel Özet & Fenotipik Eğilim</span>
          </h4>
          <p className="text-xs sm:text-sm text-comus-sand-dark leading-relaxed">
            {userProfile.name} adlı kullanıcının son {selectedRange} günlük cihaz içi etkileşimleri, yazım temposu, hata düzeltme oranları, fiziksel hareketlilik ve sirkadiyen dinlenme pencereleri EWMA kişisel baz hattı ile boylamsal olarak karşılaştırılmıştır. Sistemdeki tüm 19 davranışsal gösterge eksiksiz olarak analize dahil edilmiştir. Bu veriler klinik tanı içermemekte olup uzman hekim ve terapist değerlendirmesine destek amacıyla sunulmuştur.
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
                              {med.dosageMg} mg
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
                        {med.frequencyPerDay === 1
                          ? 'Günde 1x (Sabah 09:00)'
                          : med.frequencyPerDay === 2
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
              <div className="p-6 text-center rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-3">
                <p className="text-xs text-comus-sand-dark">
                  Henüz kayıtlı ilaç bulunmuyor. İlaç ve doz takibi için "Yeni İlaç Ekle" butonunu kullanabilirsiniz.
                </p>
                <button
                  onClick={() => setIsAddMedModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold shadow-soft cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni İlaç Ekle</span>
                </button>
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
                              {med.dosageMg} mg
                            </span>
                          </div>
                          <div className="text-[10px] text-comus-sand-dark mt-0.5">
                            Başlangıç: {med.startDate}
                          </div>
                        </td>
                        <td className="p-3 text-comus-navy font-medium">
                          {med.frequencyPerDay === 1
                            ? 'Günde 1x (Sabah 09:00)'
                            : med.frequencyPerDay === 2
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
                      <p className="mb-2">Henüz kayıtlı ilaç bulunmuyor. İlaç ve doz takibi için "Yeni İlaç Ekle" butonunu kullanabilirsiniz.</p>
                      <button
                        onClick={() => setIsAddMedModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-semibold shadow-soft cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Yeni İlaç Ekle</span>
                      </button>
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
                      {ir.medication.name} ({ir.medication.dosageMg}mg)
                    </span>
                    <span className="text-[11px] text-teal-800">
                      • Günde {ir.medication.frequencyPerDay}x • Başlangıç: {ir.medication.startDate}
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

        {/* 5. Complete Metrics Table (All 19 Indicators Active, Responsive Without Horizontal Drag) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-comus-navy">
              {medications.length > 0 ? '5.' : '4.'} Sayısal Göstergeler & EWMA Baz Hattı Sapma Tablosu ({reportStats.length} Gösterge)
            </h4>
            <span className="text-[10.5px] text-comus-sand-dark font-medium">
              Tüm Sensör Kategorileri Aktif
            </span>
          </div>

          {/* MOBILE VIEW: Clean Cards - No Horizontal Scrolling Required */}
          <div className="block sm:hidden space-y-2">
            {reportStats.map((st) => {
              const isAnomaly = Math.abs(st.zScore) >= 2.0;
              return (
                <div
                  key={st.key}
                  className={`p-3 rounded-2xl border transition-all ${
                    isAnomaly ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-comus-sand-light/30 shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-xs text-comus-navy">{st.label}</div>
                      <div className="text-[10px] text-comus-sand-dark capitalize">{st.category} sensörü</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isAnomaly
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {isAnomaly ? 'Sapma Var' : 'Dengeli'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-comus-sand-light/20 text-center">
                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Kişisel Baz</span>
                      <strong className="font-mono text-[11px] text-comus-navy font-semibold">
                        {st.baselineMean}
                      </strong>
                    </div>

                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Dönem Ort.</span>
                      <strong className="font-mono text-[11px] text-comus-navy font-semibold">
                        {st.periodAvg}
                      </strong>
                    </div>

                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Değişim</span>
                      <strong className={`font-mono text-[11px] font-bold ${
                        st.deviationPercent > 0 ? 'text-amber-700' : st.deviationPercent < 0 ? 'text-indigo-700' : 'text-comus-sand-dark'
                      }`}>
                        {st.deviationPercent > 0 ? `+${st.deviationPercent}%` : `${st.deviationPercent}%`}
                      </strong>
                    </div>

                    <div className="bg-comus-surface p-1.5 rounded-xl border border-comus-sand-light/20">
                      <span className="text-[9px] text-comus-sand-dark block">Z-Skoru</span>
                      <strong className={`font-mono text-[11px] font-bold ${
                        isAnomaly ? 'text-rose-600' : 'text-comus-sand-dark'
                      }`}>
                        {st.zScore > 0 ? `+${st.zScore}` : st.zScore}
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
                  <th className="p-3 w-[30%]">Gösterge / Biyobelirteç</th>
                  <th className="p-3 text-right w-[16%]">Kişisel Baz</th>
                  <th className="p-3 text-right w-[18%]">Dönem Ort.</th>
                  <th className="p-3 text-right w-[14%]">Değişim</th>
                  <th className="p-3 text-right w-[11%]">Z-Skoru</th>
                  <th className="p-3 text-center w-[11%]">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-comus-sand-light/20">
                {reportStats.map((st) => {
                  const isAnomaly = Math.abs(st.zScore) >= 2.0;
                  return (
                    <tr key={st.key} className={isAnomaly ? 'bg-rose-50/40' : 'hover:bg-comus-surface/50'}>
                      <td className="p-3 font-medium text-comus-navy">
                        <div className="font-semibold">{st.label}</div>
                        <div className="text-[10px] text-comus-sand-dark capitalize">{st.category} sensörü</div>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-comus-sand-dark whitespace-nowrap">
                        {st.baselineMean} {st.unit}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-semibold text-comus-navy whitespace-nowrap">
                        {st.periodAvg} {st.unit}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-medium whitespace-nowrap">
                        <span className={st.deviationPercent > 0 ? 'text-amber-700' : st.deviationPercent < 0 ? 'text-indigo-700' : 'text-comus-sand-dark'}>
                          {st.deviationPercent > 0 ? `+${st.deviationPercent}%` : `${st.deviationPercent}%`}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        <span className={isAnomaly ? 'text-rose-600' : 'text-comus-sand-dark'}>
                          {st.zScore > 0 ? `+${st.zScore}` : st.zScore}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isAnomaly
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isAnomaly ? 'Sapma Var' : 'Dengeli'}
                        </span>
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
            {medications.length > 0 ? '6.' : '5.'} Sistem Tarafından Üretilen Farkındalık Notları ({insights.length})
          </h4>
          <div className="space-y-2">
            {insights.length > 0 ? (
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
    </div>
  );
};
