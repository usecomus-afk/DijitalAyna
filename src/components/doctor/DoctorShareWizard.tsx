import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle,
  ChevronRight,
  Share,
  Download,
  FileText,
  Pill,
  Lock,
  Printer,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { analyzeMedicationImpact } from '../../engine/medicationAnalytics';
import {
  buildCanonicalDoctorReportTemplate,
  CanonicalDoctorReportInput,
  DOCTOR_REPORT_TEMPLATE_ID,
  DOCTOR_REPORT_SECTION_ORDER,
  PinnedInsight,
  ReportMetricStat,
} from '../../services/reportBuilder';
import { shareDoctorReportPdf } from '../../services/shareService';

interface DoctorShareWizardProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: ReportMetricStat[];
  rangeDays?: number;
}

export const DoctorShareWizard: React.FC<DoctorShareWizardProps> = ({
  isOpen,
  onClose,
  stats = [],
  rangeDays = 14,
}) => {
  const { userProfile, baselineDayCount } = useAppStore();
  const [step, setStep] = useState(1);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedData, setSelectedData] = useState({
    sleep: true,
    motion: true,
    typing: true,
    medication: true, // Always true (mandatory in Doctor Share)
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const moods = useLiveQuery(() => db.moodReports.toArray()) || [];
  const medications = useLiveQuery(() => db.medications.toArray()) || [];
  const todaysLogs = useLiveQuery(() => db.medicationLogs.where('date').equals(todayStr).toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const insights = useLiveQuery(() => db.insights.toArray()) || [];
  const surveys = useLiveQuery(() => db.clinicalSurveyResults.orderBy('timestamp').reverse().toArray()) || [];
  const pinnedItem = useLiveQuery(() => db.settings.get('doctor_report_pinned'));
  const pinnedInsights: PinnedInsight[] = Array.isArray(pinnedItem?.value) ? pinnedItem.value : [];

  const medReports = useMemo(
    () => medications.map((m) => analyzeMedicationImpact(m, dailyMetrics, baselines, moods)),
    [medications, dailyMetrics, baselines, moods]
  );

  const filteredStats = useMemo(
    () =>
      stats.filter((s) => {
        if (s.category === 'sleep' && !selectedData.sleep) return false;
        if (s.category === 'motion' && !selectedData.motion) return false;
        if (s.category === 'typing' && !selectedData.typing) return false;
        return true;
      }),
    [stats, selectedData]
  );

  const sampleDays = useMemo(() => new Set(dailyMetrics.map((m) => m.date)).size, [dailyMetrics]);
  const effectiveDayCount = Math.max(baselineDayCount, sampleDays);

  const canonicalInput = useMemo<CanonicalDoctorReportInput>(
    () => ({
      patientName: userProfile.name || 'Danışan',
      patientEmail: userProfile.email,
      rangeDays,
      generatedAt: new Date(),
      effectiveDayCount,
      baselineStatus:
        effectiveDayCount >= 14
          ? `${effectiveDayCount} günlük kişisel EWMA baz hattı tamamlandı`
          : `Baz hattı öğrenme sürecinde (${effectiveDayCount}/14 gün)`,
      stats: filteredStats,
      medications,
      todaysLogs,
      medImpactReports: medReports,
      moods,
      surveys,
      insights,
      pinnedInsights,
    }),
    [
      userProfile.name,
      userProfile.email,
      rangeDays,
      effectiveDayCount,
      filteredStats,
      medications,
      todaysLogs,
      medReports,
      moods,
      surveys,
      insights,
      pinnedInsights,
    ]
  );

  const canonicalModel = useMemo(
    () => buildCanonicalDoctorReportTemplate(canonicalInput),
    [canonicalInput]
  );

  const realChartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Math.max(rangeDays, 30));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const dateSet = new Set<string>();
    dailyMetrics.filter((m) => m.date >= cutoffStr).forEach((m) => dateSet.add(m.date));
    moods.filter((m) => m.date >= cutoffStr).forEach((m) => dateSet.add(m.date));
    medications.forEach((med) => {
      if (med.startDate >= cutoffStr) dateSet.add(med.startDate);
    });

    const sortedDates = Array.from(dateSet).sort().slice(-14);
    return sortedDates.map((d) => {
      const moodForDay = moods.find((m) => m.date === d);
      const sleepMin = dailyMetrics.find((m) => m.date === d && m.metricKey === 'sleep_duration')?.value;
      const nightMin = dailyMetrics.find((m) => m.date === d && m.metricKey === 'night_usage_minutes')?.value;

      return {
        day: d.slice(5),
        fullDate: d,
        moodScore: moodForDay ? moodForDay.score : undefined,
        sleepHours: sleepMin !== undefined ? Math.round((sleepMin / 60) * 10) / 10 : undefined,
        nightMinutes: nightMin !== undefined ? Math.round(nightMin) : undefined,
      };
    });
  }, [dailyMetrics, moods, medications, rangeDays]);

  if (!isOpen) return null;

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 4));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const toggleSelection = (key: keyof typeof selectedData) => {
    if (key === 'medication') return;
    setSelectedData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportPdf = async (mode: 'share' | 'download' | 'print') => {
    setIsGeneratingPdf(true);
    setShareMessage(null);
    try {
      const res = await shareDoctorReportPdf(canonicalInput, mode);
      setShareMessage(res.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-comus-navy">
                  1. Adım: Standart PDF Rapor Şablonu &amp; Veri Kapsamı
                </h3>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Her rapor paylaşıldığında hekiminizin verileri kolayca karşılaştırabilmesi için aynı standart klinik PDF şablonu (<strong>{DOCTOR_REPORT_TEMPLATE_ID}</strong>) kullanılır.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-comus-navy text-white shrink-0">
                {DOCTOR_REPORT_TEMPLATE_ID}
              </span>
            </div>

            <div className="space-y-2">
              {/* Mandatory Medication Impact & Time Series Overlay Item */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-teal-300 bg-teal-50/70">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-teal-700 mt-0.5"
                    checked={true}
                    disabled
                    readOnly
                  />
                  <div>
                    <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <span>İlaç Etki &amp; Zaman Serisi Bindirme Analizi (1A / 3A / 6A Tablosu)</span>
                    </div>
                    <p className="text-[10.5px] text-teal-800 mt-0.5">
                      Başlama tarihi (T0), kullanım zamanı, dozaj bilgileri ve ilaç öncesi/sonrası 1 ay, 3 ay, 6 aylık karşılaştırmalı Dijital Biyobelirteçler Tablosu PDF şablonuna zorunlu olarak eklenir.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300 shrink-0">
                  <Lock className="w-3 h-3" /> Zorunlu
                </span>
              </div>

              {Object.entries({
                sleep: 'Uyku Süresi ve Sirkadiyen Ritim (Apple Sağlık & Gece Penceresi)',
                motion: 'Fiziksel Hareketlilik ve Mobilite Endeksi',
                typing: 'Klavye ve Yazım Dinamiği (Psikomotor Hız & Hata Oranı)',
              }).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl border border-comus-sand-light/40 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-comus-copper"
                    checked={selectedData[key as keyof typeof selectedData]}
                    onChange={() => toggleSelection(key as keyof typeof selectedData)}
                  />
                  <span className="text-xs font-semibold text-comus-navy">{label}</span>
                </label>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-comus-surface border border-comus-sand-light/40 text-[11px] text-comus-sand-dark space-y-1">
              <div className="font-bold text-comus-navy flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-comus-copper" />
                <span>Standart PDF Şablonu İçeriği (8 Sabit Bölüm):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px]">
                {DOCTOR_REPORT_SECTION_ORDER.map((sec) => (
                  <div key={sec} className="truncate text-comus-navy/90">
                    • {sec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">
              2. Adım: İlaç Etki &amp; Zaman Serisi Bindirme Analizi
            </h3>
            <p className="text-[11px] text-comus-sand-dark">
              İlaç kullanımına başlama tarihi (T0), kullanım zamanı ve dozaj bilgileriyle ruh hali ve biyobelirteç zaman serisi bindirmesi:
            </p>

            {medReports.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {medReports.map((ir, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200 text-[11px] space-y-1"
                  >
                    <div className="font-bold text-teal-950 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-teal-700" />
                        {ir.medication.name} — Dozaj: {ir.formattedDosage}
                      </span>
                      <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-900">
                        {ir.daysActive}. Gün
                      </span>
                    </div>
                    <div className="text-teal-900 font-medium">
                      • Başlama Tarihi (T0): <strong>{ir.medication.startDate}</strong>
                    </div>
                    <div className="text-teal-900 font-medium">
                      • Kullanım Zamanı: <strong>{ir.formattedSchedule}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-200 text-[11px] text-teal-900">
                Sistemde henüz aktif ilaç kaydı bulunmuyor. İlaç eklendiğinde başlama tarihi, kullanım zamanı ve dozaj bilgileri zaman serisi üzerine bindirilir.
              </div>
            )}

            {realChartData.length > 0 ? (
              <>
                <div className="h-44 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={realChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip labelStyle={{ fontSize: '10px' }} itemStyle={{ fontSize: '10px' }} />
                      {medications.map((m, idx) => (
                        <ReferenceLine
                          key={m.id || idx}
                          x={m.startDate.slice(5)}
                          stroke="#0D9488"
                          strokeDasharray="3 3"
                          strokeWidth={2}
                          label={{
                            value: `T0: ${m.name}`,
                            position: 'insideTopLeft',
                            fill: '#0F766E',
                            fontSize: 9,
                          }}
                        />
                      ))}
                      <Line
                        type="monotone"
                        dataKey="moodScore"
                        name="Ruh Hali Skoru (1-5)"
                        stroke="#C0674F"
                        strokeWidth={2}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="sleepHours"
                        name="Gerçek Uyku (Saat)"
                        stroke="#0f172a"
                        strokeWidth={3}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 text-[10px] justify-center text-comus-sand-dark">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#C0674F]"></div> Ruh Hali (1-5)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-900"></div> Gerçek Uyku (Saat)
                  </span>
                  {medications.length > 0 && (
                    <span className="flex items-center gap-1 text-teal-800 font-semibold">
                      <div className="w-2 h-2 rounded-full bg-teal-600"></div> T0 İlaç Başlangıcı
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-comus-sand-dark text-center">
                Seçilen dönemde henüz grafik oluşturacak günlük ölçüm kaydı bulunmuyor. Sahte/tahmini veri gösterilmemektedir.
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-comus-navy">
                3. Adım: Standart PDF Şablonu Önizleme
              </h3>
              <span className="text-[10px] font-mono bg-stone-100 text-comus-navy px-2 py-0.5 rounded border border-stone-200 font-bold">
                {canonicalModel.filename}
              </span>
            </div>

            <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/50 space-y-3.5 max-h-80 overflow-y-auto">
              {/* Header Banner Preview */}
              <div className="p-3 rounded-xl bg-comus-navy text-white border-b-4 border-comus-copper flex items-start justify-between gap-2">
                <div>
                  <div className="font-serif font-bold text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-comus-copper" />
                    <span>{canonicalModel.documentTitle}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Danışan: {canonicalModel.metadata.patientName} • {canonicalModel.metadata.periodLabel}
                  </div>
                </div>
                <span className="text-[9.5px] font-mono bg-white/15 px-2 py-0.5 rounded font-semibold shrink-0">
                  {canonicalModel.templateId}
                </span>
              </div>

              {/* 1. KPI Comparison Grid Preview */}
              <div className="grid grid-cols-2 gap-2">
                {canonicalModel.kpiCards.map((card) => (
                  <div key={card.id} className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-0.5">
                    <div className="text-[9.5px] font-bold uppercase text-comus-sand-dark">{card.title}</div>
                    <div className="text-xs font-bold text-comus-navy">{card.primaryValue}</div>
                    <div className="text-[10px] font-semibold text-comus-copper">{card.comparisonLabel}</div>
                    <div className="text-[9.5px] text-comus-sand-dark leading-snug">{card.explanation}</div>
                  </div>
                ))}
              </div>

              {/* 2. Notable Deviations Comparison Table Preview */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-comus-navy flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-comus-copper" />
                  <span>Bölüm 2: Öne Çıkan EWMA Sapmaları (Kişisel Baz vs Dönem Ort.)</span>
                </div>
                {canonicalModel.notableComparisons.length > 0 ? (
                  <div className="overflow-x-auto bg-white rounded-xl border border-stone-200">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-stone-100 text-comus-navy font-bold border-b border-stone-200">
                          <th className="p-1.5">Gösterge</th>
                          <th className="p-1.5 text-right">Kişisel Baz</th>
                          <th className="p-1.5 text-right">Dönem Ort.</th>
                          <th className="p-1.5 text-right">Değişim</th>
                          <th className="p-1.5 text-right">Z-Skoru</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {canonicalModel.notableComparisons.map((row) => (
                          <tr key={row.key} className={row.severityLevel === 'high' ? 'bg-rose-50/60' : 'bg-amber-50/50'}>
                            <td className="p-1.5 font-semibold text-comus-navy">{row.label}</td>
                            <td className="p-1.5 text-right font-mono text-comus-sand-dark">{row.baselineText}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-comus-navy">{row.periodAvgText}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-amber-800">{row.deviationText}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-rose-700">{row.zScoreText}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[10.5px] text-emerald-900 font-medium">
                    Aktif biyobelirteçlerde kişisel EWMA baz hattından belirgin sapma saptanmadı.
                  </div>
                )}
              </div>

              {/* 3. Mandatory Medication Impact & 1m / 3m / 6m Comparative Table Preview */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-teal-950 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-teal-700" />
                  <span>Bölüm 4: İlaç Etki &amp; 1A / 3A / 6A Karşılaştırmalı Biyobelirteç Tablosu</span>
                </div>

                {canonicalModel.medicationImpactSections.length > 0 ? (
                  canonicalModel.medicationImpactSections.map((ms, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-teal-200 space-y-2 text-[10.5px]">
                      <div className="border-b border-teal-100 pb-1.5 space-y-0.5">
                        <div className="font-bold text-teal-950">
                          {ms.medicationName} ({ms.dosage}) • T0: {ms.startDate} ({ms.daysActive}. gün)
                        </div>
                        <div className="text-[10px] text-teal-900">
                          Kullanım Zamanı: <strong>{ms.schedule}</strong>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-teal-50 text-teal-950 font-semibold border-b border-teal-200">
                              <th className="p-1.5">Biyobelirteç</th>
                              <th className="p-1.5 text-right">Öncesi 1A</th>
                              <th className="p-1.5 text-right">Öncesi 3A</th>
                              <th className="p-1.5 text-right">Öncesi 6A</th>
                              <th className="p-1.5 text-right">Sonrası</th>
                              <th className="p-1.5 text-right">Δ (1A/3A/6A)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-teal-50">
                            {ms.rows.map((row) => (
                              <tr key={row.metricKey}>
                                <td className="p-1.5 font-medium text-comus-navy">{row.label}</td>
                                <td className="p-1.5 text-right font-mono text-comus-sand-dark">{row.pre1MonthText}</td>
                                <td className="p-1.5 text-right font-mono text-comus-sand-dark">{row.pre3MonthsText}</td>
                                <td className="p-1.5 text-right font-mono text-comus-sand-dark">{row.pre6MonthsText}</td>
                                <td className="p-1.5 text-right font-mono font-bold text-comus-navy">
                                  {row.postOverallText}
                                </td>
                                <td className="p-1.5 text-right font-mono font-semibold text-teal-800">
                                  {row.delta1MText} / {row.delta3MText} / {row.delta6MText}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10.5px] text-teal-900 bg-teal-50/60 p-2.5 rounded-xl border border-teal-200">
                    Henüz kayıtlı ilaç bulunmuyor. Paylaşılan PDF raporunda standart ilaç protokolü ve 1A/3A/6A karşılaştırmalı biyobelirteç tablosu şablonu yer alacaktır.
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 mb-1">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-comus-navy/10 text-comus-navy text-[10px] font-mono font-bold">
                Şablon: {DOCTOR_REPORT_TEMPLATE_ID}
              </div>
              <h3 className="text-lg font-bold text-comus-navy">Standart PDF Hekim Raporu Hazır</h3>
              <p className="text-xs text-comus-sand-dark max-w-md mx-auto">
                Raporunuz anlaşılır, açıklayıcı ve kolay karşılaştırılabilir 8 standart bölümden oluşan <strong>{canonicalModel.filename}</strong> PDF şablonuyla oluşturuldu.
              </p>
            </div>

            {shareMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-medium">
                {shareMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleExportPdf('share')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-comus-copper hover:bg-comus-copper-dark text-white transition-all cursor-pointer shadow-soft disabled:opacity-50"
              >
                <Share className="w-5 h-5" />
                <span className="text-xs font-bold text-center">PDF Olarak Paylaş</span>
                <span className="text-[10px] text-white/85 text-center">Hekime Gönder / Paylaş</span>
              </button>

              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleExportPdf('download')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white transition-all cursor-pointer shadow-soft disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span className="text-xs font-bold text-center">PDF Dosyasını İndir</span>
                <span className="text-[10px] text-white/80 text-center">Standart A4 (.pdf)</span>
              </button>

              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleExportPdf('print')}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-comus-navy border border-stone-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-5 h-5 text-comus-copper" />
                <span className="text-xs font-bold text-center">Yazdır / A4 Görünümü</span>
                <span className="text-[10px] text-comus-sand-dark text-center">Aynı Şablonla Yazdır</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/60 backdrop-blur-sm animate-fadeIn no-print">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative flex flex-col min-h-[440px]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-1 mb-5 pr-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-comus-copper' : 'bg-stone-100'}`} />
          ))}
        </div>

        <div className="flex-1">{renderStepContent()}</div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="px-4 py-2 text-xs font-semibold text-stone-500 disabled:opacity-30 cursor-pointer"
          >
            Geri
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-comus-navy text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-soft hover:bg-comus-navy-light cursor-pointer"
            >
              Devam Et <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-comus-copper text-white rounded-xl text-xs font-semibold shadow-soft hover:bg-comus-copper-dark cursor-pointer"
            >
              Tamamla
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
