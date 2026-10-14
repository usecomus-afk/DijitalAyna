import React, { useState, useMemo } from 'react';
import { X, CheckCircle, ChevronRight, Share, Download, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { analyzeMedicationImpact } from '../../engine/medicationAnalytics';
import { buildDoctorReportText, ReportMetricStat } from '../../services/reportBuilder';
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
    medication: true,
  });

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const moods = useLiveQuery(() => db.moodReports.toArray()) || [];
  const medications = useLiveQuery(() => db.medications.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const surveys = useLiveQuery(() => db.clinicalSurveyResults.orderBy('timestamp').reverse().toArray()) || [];

  const realChartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const dateSet = new Set<string>();
    dailyMetrics.filter((m) => m.date >= cutoffStr).forEach((m) => dateSet.add(m.date));
    moods.filter((m) => m.date >= cutoffStr).forEach((m) => dateSet.add(m.date));

    const sortedDates = Array.from(dateSet).sort().slice(-7);
    return sortedDates.map((d) => {
      const moodForDay = moods.find((m) => m.date === d);
      const sleepMin = dailyMetrics.find((m) => m.date === d && m.metricKey === 'sleep_duration')?.value;
      const nightMin = dailyMetrics.find((m) => m.date === d && m.metricKey === 'night_usage_minutes')?.value;

      return {
        day: d.slice(5),
        moodScore: moodForDay ? moodForDay.score : undefined,
        sleepHours: sleepMin !== undefined ? Math.round((sleepMin / 60) * 10) / 10 : undefined,
        nightMinutes: nightMin !== undefined ? Math.round(nightMin) : undefined,
      };
    });
  }, [dailyMetrics, moods, rangeDays]);

  const medReports = useMemo(
    () => medications.map((m) => analyzeMedicationImpact(m, dailyMetrics, baselines, moods)),
    [medications, dailyMetrics, baselines, moods]
  );

  const activeStats = useMemo(() => stats.filter((s) => s.hasData), [stats]);

  if (!isOpen) return null;

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 4));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const toggleSelection = (key: keyof typeof selectedData) => {
    setSelectedData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShareNative = async () => {
    const filteredStats = stats.filter((s) => {
      if (s.category === 'sleep' && !selectedData.sleep) return false;
      if (s.category === 'motion' && !selectedData.motion) return false;
      if (s.category === 'typing' && !selectedData.typing) return false;
      return true;
    });

    const medSection =
      selectedData.medication && medReports.length > 0
        ? medReports
            .map((ir) => {
              const lines = [
                `• ${ir.medication.name} (${ir.medication.dosage}) — Başlangıç: ${ir.medication.startDate} (${ir.daysActive}. gün)`,
                `  Özet: ${ir.overallSummary}`,
              ];
              ir.deltas
                .filter((d) => d.hasPreData || d.hasPostData)
                .forEach((d) => {
                  const preStr = d.preAvg !== null ? `${d.preAvg} ${d.unit}` : 'Kayıt yok';
                  const postStr = d.postAvg !== null ? `${d.postAvg} ${d.unit}` : 'Kayıt yok';
                  const pctStr =
                    d.changePercent !== null
                      ? `${d.changePercent > 0 ? '+' : ''}${d.changePercent}%`
                      : 'Veri bekleniyor';
                  lines.push(`  - ${d.label}: Öncesi ${preStr} → Sonrası ${postStr} (${pctStr})`);
                });
              return lines.join('\n');
            })
            .join('\n\n')
        : undefined;

    const latestSurvey = surveys[0];
    const reportText = buildDoctorReportText({
      patientName: userProfile.name || 'Danışan',
      rangeDays,
      generatedAt: new Date(),
      baselineStatus:
        baselineDayCount >= 14
          ? `${baselineDayCount} günlük kişisel baz hattı tamamlandı`
          : `Baz hattı öğrenme sürecinde (${baselineDayCount}/14 gün)`,
      stats: filteredStats,
      medicationSection: medSection,
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

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">1. Adım: Veri Seçimi</h3>
            <p className="text-xs text-comus-sand-dark">
              Hekiminizle paylaşmak istediğiniz gerçek sensör ve klinik veri gruplarını seçin.
            </p>
            <div className="space-y-2">
              {Object.entries({
                sleep: 'Uyku Süresi ve Sirkadiyen Ritim',
                motion: 'Fiziksel Hareketlilik Endeksi',
                typing: 'Yazım Hızı ve Dinamiği',
                medication: 'İlaç Kullanım & Gerçek Delta Analizi',
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
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">2. Adım: Nesnel Zaman Serisi Özeti</h3>
            <p className="text-[11px] text-comus-sand-dark">
              Son {rangeDays} günde cihazınızda gerçek olarak kaydedilen ruh hali ve uyku/gece ölçümleri:
            </p>
            {realChartData.length > 0 ? (
              <>
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={realChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip labelStyle={{ fontSize: '10px' }} itemStyle={{ fontSize: '10px' }} />
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
                <div className="flex gap-4 text-[10px] justify-center text-comus-sand-dark">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#C0674F]"></div> Ruh Hali (1-5)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-900"></div> Gerçek Uyku (Saat)
                  </span>
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
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">3. Adım: Rapor Önizleme (Gerçek Veriler)</h3>
            <div className="p-4 bg-comus-surface rounded-2xl border border-comus-sand-light/50 space-y-3 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div className="font-serif font-bold text-sm text-comus-navy flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Klinik Özet Raporu
                </div>
                <span className="text-[10px] text-stone-500">
                  Son {rangeDays} Gün • {new Date().toLocaleDateString('tr-TR')}
                </span>
              </div>
              {activeStats.length > 0 ? (
                <ul className="space-y-2 text-xs text-comus-sand-dark">
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
                <p className="text-xs text-comus-sand-dark">
                  Bu dönemde henüz aktif biyobelirteç ölçümü kaydedilmedi.
                </p>
              )}

              {selectedData.medication && medReports.length > 0 && (
                <div className="pt-2 border-t border-stone-200 space-y-1 text-xs">
                  <div className="font-semibold text-teal-900">İlaç Yanıtı (Gerçek Delta):</div>
                  {medReports.map((ir, idx) => (
                    <p key={idx} className="text-[11px] text-comus-sand-dark leading-relaxed">
                      • <strong>{ir.medication.name}:</strong> {ir.overallSummary}
                    </p>
                  ))}
                </div>
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
                Raporunuz yalnızca gerçek cihaz ölçümlerinizle hazırlandı. Hekiminizle paylaşabilir veya yazdırabilirsiniz.
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
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-col min-h-[400px]">
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
