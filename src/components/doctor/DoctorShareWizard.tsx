import React, { useState, useMemo } from 'react';
import { X, CheckCircle, ChevronRight, Share, Download, FileText, Pill, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { analyzeMedicationImpact } from '../../engine/medicationAnalytics';
import { buildDoctorReportText, generateRealReportAwarenessNotes, PinnedInsight, ReportMetricStat } from '../../services/reportBuilder';
import { shareContent } from '../../services/shareService';

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
  const [selectedData, setSelectedData] = useState({
    sleep: true,
    motion: true,
    typing: true,
    medication: true, // Always true (mandatory in Doctor Share)
  });

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const moods = useLiveQuery(() => db.moodReports.toArray()) || [];
  const medications = useLiveQuery(() => db.medications.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const insights = useLiveQuery(() => db.insights.toArray()) || [];
  const surveys = useLiveQuery(() => db.clinicalSurveyResults.orderBy('timestamp').reverse().toArray()) || [];
  const pinnedItem = useLiveQuery(() => db.settings.get('doctor_report_pinned'));
  const pinnedInsights: PinnedInsight[] = Array.isArray(pinnedItem?.value) ? pinnedItem.value : [];

  const medReports = useMemo(
    () => medications.map((m) => analyzeMedicationImpact(m, dailyMetrics, baselines, moods)),
    [medications, dailyMetrics, baselines, moods]
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

  const activeStats = useMemo(() => stats.filter((s) => s.hasData), [stats]);

  if (!isOpen) return null;

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 4));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const toggleSelection = (key: keyof typeof selectedData) => {
    // İlaç Etki & Zaman Serisi Bindirme Analizi kesinlikle paylaşılmalıdır (kapatılamaz)
    if (key === 'medication') return;
    setSelectedData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShareNative = async () => {
    const filteredStats = stats.filter((s) => {
      if (s.category === 'sleep' && !selectedData.sleep) return false;
      if (s.category === 'motion' && !selectedData.motion) return false;
      if (s.category === 'typing' && !selectedData.typing) return false;
      return true;
    });

    const sampleDays = new Set(dailyMetrics.map((m) => m.date)).size;
    const effectiveDayCount = Math.max(baselineDayCount, sampleDays);
    const awarenessNotes = generateRealReportAwarenessNotes({
      stats: filteredStats,
      insights,
      moods,
      surveys,
      medImpactReports: medReports, // Mandatory inclusion
      effectiveDayCount,
      rangeDays,
    });
    const clinicalNotesText = awarenessNotes
      .map((n) => `• ${n.title}: ${n.body}${n.sources && n.sources.length > 0 ? `\n  Kaynak: ${n.sources.join('; ')}` : ''}`)
      .join('\n');

    const latestSurvey = surveys[0];
    const reportText = buildDoctorReportText({
      patientName: userProfile.name || 'Danışan',
      rangeDays,
      generatedAt: new Date(),
      baselineStatus:
        effectiveDayCount >= 14
          ? `${effectiveDayCount} günlük kişisel baz hattı tamamlandı`
          : `Baz hattı öğrenme sürecinde (${effectiveDayCount}/14 gün)`,
      stats: filteredStats,
      medImpactReports: medReports, // Mandatory: includes start date, schedule, dosage, and 1m/3m/6m comparative table
      pinnedInsights,
      clinicalNotes: clinicalNotesText,
      clinicalSurveyScores: latestSurvey
        ? {
            gad7Score: latestSurvey.gad7Score,
            gad7Risk: latestSurvey.gad7Risk,
            phq9Score: latestSurvey.phq9Score,
            phq9Risk: latestSurvey.phq9Risk,
            date: latestSurvey.date,
          }
        : undefined,
    });

    const res = await shareContent({
      title: `Dijital Mental İkizim Hekim Raporu — ${userProfile.name || 'Danışan'}`,
      text: reportText,
    });
    setShareMessage(res.message);
  };

  const handlePrintPdf = () => {
    onClose();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const formatPct = (val: number | null) => {
    if (val === null) return '—';
    return `${val > 0 ? '+' : ''}${val}%`;
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">1. Adım: Veri Seçimi</h3>
            <p className="text-xs text-comus-sand-dark">
              Hekiminizle paylaşmak istediğiniz gerçek sensör ve klinik veri gruplarını seçin. İlaç Etki &amp; Zaman Serisi Bindirme Analizi ve 1, 3, 6 aylık karşılaştırmalı tablo hekim raporunda zorunlu olarak paylaşılır.
            </p>
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
                      <span>İlaç Etki &amp; Zaman Serisi Bindirme Analizi</span>
                    </div>
                    <p className="text-[10.5px] text-teal-800 mt-0.5">
                      Başlama tarihi, kullanım zamanı, dozaj bilgileri ve ilaç öncesi/sonrası 1 ay, 3 ay, 6 aylık Dijital Biyobelirteçler Tablosu rapora zorunlu olarak eklenir.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300 shrink-0">
                  <Lock className="w-3 h-3" /> Zorunlu
                </span>
              </div>

              {Object.entries({
                sleep: 'Uyku Süresi ve Sirkadiyen Ritim',
                motion: 'Fiziksel Hareketlilik Endeksi',
                typing: 'Yazım Hızı ve Dinamiği',
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

            {/* Medication Protocol Details (Start Date, Usage Time, Dosage) */}
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
            <h3 className="text-base font-bold text-comus-navy">
              3. Adım: Rapor Önizleme (1, 3, 6 Aylık Karşılaştırmalı Biyobelirteç Tablosu)
            </h3>
            <div className="p-3.5 bg-comus-surface rounded-2xl border border-comus-sand-light/50 space-y-3 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div className="font-serif font-bold text-sm text-comus-navy flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Klinik Özet &amp; İlaç Etki Raporu
                </div>
                <span className="text-[10px] text-stone-500">
                  Son {rangeDays} Gün • {new Date().toLocaleDateString('tr-TR')}
                </span>
              </div>

              {/* Mandatory Medication Impact & 1m / 3m / 6m Comparative Table Preview */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-teal-700" />
                  <span>İlaç Etki &amp; Zaman Serisi Bindirme Analizi (1A / 3A / 6A Karşılaştırmalı)</span>
                </div>

                {medReports.length > 0 ? (
                  medReports.map((ir, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-teal-200 space-y-2 text-[11px]">
                      <div className="border-b border-teal-100 pb-1.5 space-y-0.5">
                        <div className="font-bold text-teal-950">
                          {ir.medication.name} ({ir.formattedDosage})
                        </div>
                        <div className="text-[10.5px] text-teal-900">
                          • <strong>Başlama Tarihi:</strong> {ir.medication.startDate} ({ir.daysActive}. gün)
                        </div>
                        <div className="text-[10.5px] text-teal-900">
                          • <strong>Kullanım Zamanı:</strong> {ir.formattedSchedule}
                        </div>
                        <div className="text-[10.5px] text-teal-900">
                          • <strong>Dozaj Bilgisi:</strong> {ir.formattedDosage}
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
                            {ir.multiPeriodTable.map((row) => (
                              <tr key={row.metricKey}>
                                <td className="p-1.5 font-medium text-comus-navy">{row.label}</td>
                                <td className="p-1.5 text-right font-mono text-comus-sand-dark">
                                  {row.pre1Month.avg !== null ? `${row.pre1Month.avg}` : '—'}
                                </td>
                                <td className="p-1.5 text-right font-mono text-comus-sand-dark">
                                  {row.pre3Months.avg !== null ? `${row.pre3Months.avg}` : '—'}
                                </td>
                                <td className="p-1.5 text-right font-mono text-comus-sand-dark">
                                  {row.pre6Months.avg !== null ? `${row.pre6Months.avg}` : '—'}
                                </td>
                                <td className="p-1.5 text-right font-mono font-bold text-comus-navy">
                                  {row.postOverall.avg !== null ? `${row.postOverall.avg} ${row.unit}` : '—'}
                                </td>
                                <td className="p-1.5 text-right font-mono font-semibold text-teal-800">
                                  {formatPct(row.pre1Month.changePercent)} / {formatPct(row.pre3Months.changePercent)} / {formatPct(row.pre6Months.changePercent)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-teal-900 bg-teal-50/60 p-2.5 rounded-xl border border-teal-200">
                    Henüz kayıtlı ilaç bulunmuyor. Paylaşılan raporda ilaç protokolü durumu ve karşılaştırmalı biyobelirteç tablosu şablonu yer alacaktır.
                  </p>
                )}
              </div>

              {activeStats.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-comus-sand-dark pt-2 border-t border-stone-200">
                  {activeStats.slice(0, 5).map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>
                        {s.label}: <strong>{s.periodAvg} {s.unit}</strong>{' '}
                        {s.deviationPercent !== null ? `(Baz değişimi: ${s.deviationPercent > 0 ? '+' : ''}${s.deviationPercent}%)` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-comus-sand-dark pt-2 border-t border-stone-200">
                  Bu dönemde henüz aktif biyobelirteç ölçümü kaydedilmedi.
                </p>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 mb-2">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-comus-navy">Rapor Hazır</h3>
              <p className="text-xs text-comus-sand-dark">
                İlaç Etki &amp; Zaman Serisi Bindirme Analizi (başlama tarihi, kullanım zamanı, dozaj bilgileri) ve ilaç öncesi/sonrası 1, 3, 6 aylık Dijital Biyobelirteçler Tablosu rapora eklendi.
              </p>
            </div>
            {shareMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center">
                {shareMessage}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleShareNative}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
              >
                <Share className="w-5 h-5" />
                <span className="text-xs font-semibold">Uygulama ile Paylaş</span>
              </button>
              <button
                type="button"
                onClick={handlePrintPdf}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span className="text-xs font-semibold">PDF İndir / Yazdır</span>
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col min-h-[420px]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-1 mb-6 pr-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-comus-copper' : 'bg-stone-100'}`} />
          ))}
        </div>

        <div className="flex-1">{renderStepContent()}</div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="px-4 py-2 text-xs font-semibold text-stone-500 disabled:opacity-30"
          >
            Geri
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-comus-navy text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-soft hover:bg-comus-navy-light"
            >
              Devam Et <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-comus-copper text-white rounded-xl text-xs font-semibold shadow-soft hover:bg-comus-copper-dark"
            >
              Tamamla
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
