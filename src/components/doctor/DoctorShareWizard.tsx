import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle,
  ChevronRight,
  Share2,
  Copy,
  Mail,
  FileText,
  Pill,
  Lock,
  ShieldCheck,
  Activity,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  buildDoctorReportText,
  isNotable,
  PinnedInsight,
  ReportAwarenessNote,
  ReportMetricStat,
} from '../../services/reportBuilder';
import { copyTextToClipboard, shareContent } from '../../services/shareService';
import { Medication, MedicationImpactReport } from '../../types/medication';
import { MoodReport } from '../../types/engine';
import { ClinicalSurveyResult } from '../../data/clinicalSurveys';

export interface DoctorShareWizardProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: ReportMetricStat[];
  rangeDays?: number;
  medications?: Medication[];
  medImpactReports?: MedicationImpactReport[];
  moods?: MoodReport[];
  surveys?: ClinicalSurveyResult[];
  awarenessNotes?: ReportAwarenessNote[];
  pinnedInsights?: PinnedInsight[];
  effectiveDayCount?: number;
}

const EMPTY_ARRAY: any[] = [];

const REPORT_SECTIONS_LIST = [
  '1. Yönetici Özeti & Aktif Gösterge Kapsamı',
  '2. Öne Çıkan Biyobelirteç Sapmaları (EWMA Baz vs Dönem Ort.)',
  '3. Kategorilere Göre Ölçülen Sayısal Göstergeler',
  '4. İzin / Etkileşim Bekleyen Göstergeler (Şeffaflık Tablosu)',
  '5. İlaç Etki & 1 Ay, 3 Ay, 6 Ay Karşılaştırmalı Tablo',
  '6. Klinik Tarama Ölçekleri (GAD-7 & PHQ-9)',
  '7. Farkındalık Notları & Danışan İçgörüleri',
  '8. Akademik Kaynakça & Yöntem Notu',
] as const;

export const DoctorShareWizard: React.FC<DoctorShareWizardProps> = ({
  isOpen,
  onClose,
  stats = EMPTY_ARRAY,
  rangeDays = 14,
  medImpactReports = EMPTY_ARRAY,
  moods = EMPTY_ARRAY,
  surveys = EMPTY_ARRAY,
  awarenessNotes = EMPTY_ARRAY,
  pinnedInsights = EMPTY_ARRAY,
  effectiveDayCount: propEffectiveDayCount,
}) => {
  const { userProfile, baselineDayCount } = useAppStore();
  const [step, setStep] = useState(1);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedData, setSelectedData] = useState({
    sleep: true,
    motion: true,
    typing: true,
    medication: true, // Mandatory in Doctor Share
  });

  const effectiveDayCount = propEffectiveDayCount ?? baselineDayCount;

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

  const activeStats = useMemo(() => filteredStats.filter((s) => s.hasData), [filteredStats]);
  const notableStats = useMemo(
    () =>
      activeStats
        .filter(isNotable)
        .sort((a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0)),
    [activeStats]
  );

  const baselineStatusText = useMemo(
    () =>
      effectiveDayCount >= 14
        ? `${effectiveDayCount} günlük kişisel EWMA baz hattı tamamlandı`
        : `Baz hattı öğrenme sürecinde (${effectiveDayCount}/14 gün)`,
    [effectiveDayCount]
  );

  const latestSurvey = surveys.length > 0 ? surveys[0] : undefined;

  const moodSummary = useMemo(() => {
    if (!moods || moods.length === 0) return null;
    const recent = moods.slice(-rangeDays);
    if (recent.length === 0) return null;
    const avgMood =
      Math.round((recent.reduce((acc, m) => acc + m.score, 0) / recent.length) * 10) / 10;
    const avgEnergy =
      Math.round(
        (recent.reduce((acc, m) => acc + (m.energyScore ?? m.score), 0) / recent.length) * 10
      ) / 10;
    return {
      count: recent.length,
      avgMood,
      avgEnergy,
    };
  }, [moods, rangeDays]);

  const reportTitle = useMemo(
    () => `Dijital Mental İkizim Hekim Raporu — ${userProfile.name || 'Danışan'} (Son ${rangeDays} Gün)`,
    [userProfile.name, rangeDays]
  );

  const reportText = useMemo(() => {
    const clinicalNotesText = awarenessNotes
      .map(
        (n) =>
          `• ${n.title}: ${n.body}${
            n.sources && n.sources.length > 0 ? `\n  Kaynak: ${n.sources.join('; ')}` : ''
          }`
      )
      .join('\n');

    return buildDoctorReportText({
      patientName: userProfile.name || 'Danışan',
      rangeDays,
      generatedAt: new Date(),
      baselineStatus: baselineStatusText,
      stats: filteredStats,
      medImpactReports,
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
  }, [
    userProfile.name,
    rangeDays,
    baselineStatusText,
    filteredStats,
    medImpactReports,
    pinnedInsights,
    awarenessNotes,
    latestSurvey,
  ]);

  if (!isOpen) return null;

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 4));
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));

  const toggleSelection = (key: keyof typeof selectedData) => {
    if (key === 'medication') return;
    setSelectedData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNativeTextShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    setShareMessage(null);
    try {
      const res = await shareContent({
        title: reportTitle,
        text: reportText,
      });
      setShareMessage(res.message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyReport = async () => {
    const fullText = `${reportTitle}\n\n${reportText}`;
    await copyTextToClipboard(fullText);
    setCopied(true);
    setShareMessage(
      'Klinik rapor metni panoya kopyalandı! Doktorunuza WhatsApp, SMS veya e-posta üzerinden doğrudan yapıştırabilirsiniz.'
    );
    setTimeout(() => setCopied(false), 3000);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(reportTitle);
    const body = encodeURIComponent(reportText);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    setShareMessage('E-posta uygulaması klinik rapor özetiyle birlikte açılıyor.');
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-comus-navy">
                  1. Adım: Klinik Rapor Veri Kapsamı
                </h3>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Hekiminizin verileri hızlı ve net biçimde inceleyebilmesi için yapılandırılmış klinik özet raporu oluşturulur.
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-comus-navy text-white shrink-0">
                Son {rangeDays} Gün
              </span>
            </div>

            <div className="space-y-2">
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
                      <span>İlaç Etki &amp; Zaman Serisi Analizi (1A / 3A / 6A Tablosu)</span>
                    </div>
                    <p className="text-[10.5px] text-teal-800 mt-0.5">
                      Başlama tarihi (T0), kullanım zamanı, dozaj bilgileri ve ilaç öncesi/sonrası 1 ay, 3 ay, 6 aylık karşılaştırmalı Dijital Biyobelirteçler özeti rapora zorunlu olarak eklenir.
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
                <span>Yapılandırılmış Klinik Rapor İçeriği (8 Bölüm):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px]">
                {REPORT_SECTIONS_LIST.map((sec) => (
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
              2. Adım: İlaç Etki &amp; Dönem Özeti
            </h3>
            <p className="text-[11px] text-comus-sand-dark">
              İlaç kullanımına başlama tarihi (T0), kullanım zamanı, dozaj bilgileri ve dönem içi duygudurum/biyobelirteç özeti:
            </p>

            {medImpactReports.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {medImpactReports.map((ir, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-[11px] space-y-1"
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
                    <p className="text-[10.5px] text-teal-800 pt-0.5 leading-snug">
                      {ir.overallSummary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 text-[11px] text-teal-900">
                Sistemde henüz aktif ilaç kaydı bulunmuyor. İlaç eklendiğinde başlama tarihi (T0), kullanım zamanı ve dozaj bilgileriyle 1A/3A/6A karşılaştırması rapora eklenir.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-comus-surface border border-comus-sand-light/40 space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-comus-sand-dark">
                  Aktif Biyobelirteçler
                </div>
                <div className="text-sm font-bold text-comus-navy">
                  {activeStats.length} / {filteredStats.length} Gösterge
                </div>
                <div className="text-[10.5px] text-comus-copper font-medium">
                  {notableStats.length > 0
                    ? `${notableStats.length} belirgin EWMA sapması`
                    : 'Belirgin sapma saptanmadı'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-comus-surface border border-comus-sand-light/40 space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-comus-sand-dark">
                  Duygudurum &amp; Ölçekler
                </div>
                <div className="text-sm font-bold text-comus-navy">
                  {moodSummary ? `Ort. ${moodSummary.avgMood}/5` : 'Kayıt Bekleniyor'}
                </div>
                <div className="text-[10.5px] text-comus-sand-dark">
                  {latestSurvey
                    ? `GAD-7: ${latestSurvey.gad7Score} • PHQ-9: ${latestSurvey.phq9Score}`
                    : moodSummary
                    ? `${moodSummary.count} günlük bildirim`
                    : 'Ölçek kaydı yok'}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-comus-navy">
                3. Adım: Klinik Rapor Önizleme
              </h3>
              <span className="text-[10px] font-semibold bg-stone-100 text-comus-navy px-2.5 py-0.5 rounded-lg border border-stone-200">
                Hekim Özeti
              </span>
            </div>

            <div className="p-3 bg-comus-surface rounded-2xl border border-comus-sand-light/50 space-y-3 max-h-72 overflow-y-auto">
              <div className="p-3 rounded-xl bg-comus-navy text-white border-b-4 border-comus-copper flex items-start justify-between gap-2">
                <div>
                  <div className="font-serif font-bold text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-comus-copper" />
                    <span>DİJİTAL MENTAL İKİZİM — HEKİM RAPORU</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Danışan: {userProfile.name || 'Danışan'} • Son {rangeDays} Gün • {baselineStatusText}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-comus-navy flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-comus-copper" />
                  <span>Öne Çıkan EWMA Sapmaları ({notableStats.length} Gösterge)</span>
                </div>
                {notableStats.length > 0 ? (
                  <div className="space-y-1.5">
                    {notableStats.slice(0, 5).map((row) => (
                      <div
                        key={row.key}
                        className="p-2 rounded-xl bg-white border border-amber-200/80 flex items-center justify-between gap-2 text-[10.5px]"
                      >
                        <span className="font-semibold text-comus-navy truncate">{row.label}</span>
                        <span className="font-mono text-comus-sand-dark shrink-0">
                          Baz: {row.baselineMean} → <strong>{row.periodAvg} {row.unit}</strong> (
                          <span className="text-amber-800 font-bold">
                            {row.deviationPercent && row.deviationPercent > 0 ? `+${row.deviationPercent}%` : `${row.deviationPercent ?? 0}%`}
                          </span>
                          )
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[10.5px] text-emerald-900 font-medium">
                    Aktif biyobelirteçlerde kişisel EWMA baz hattından belirgin sapma saptanmadı.
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-[10.5px] font-bold text-comus-navy">
                  Paylaşılacak Tam Rapor Metni:
                </div>
                <pre className="p-2.5 rounded-xl bg-white border border-stone-200 text-[10px] text-comus-navy font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {reportText}
                </pre>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-comus-navy">
                Klinik Hekim Raporunuz Hazır
              </h3>
              <p className="text-xs text-comus-sand-dark max-w-md mx-auto">
                Raporunuzu mesajlaşma uygulamalarıyla doğrudan doktorunuza gönderebilir, e-posta olarak iletebilir veya panoya kopyalayabilirsiniz.
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
                disabled={isSharing}
                onClick={handleNativeTextShare}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl bg-comus-copper hover:bg-comus-copper-dark text-white transition-all cursor-pointer shadow-soft disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-xs font-bold text-center">Hekimle Paylaş</span>
                <span className="text-[10px] text-white/85 text-center">WhatsApp / Mesaj / Notlar</span>
              </button>

              <button
                type="button"
                onClick={handleCopyReport}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white transition-all cursor-pointer shadow-soft"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
                <span className="text-xs font-bold text-center">
                  {copied ? 'Panoya Kopyalandı' : 'Rapor Metnini Kopyala'}
                </span>
                <span className="text-[10px] text-white/80 text-center">Tek Tıkla Panoya Al</span>
              </button>

              <button
                type="button"
                onClick={handleEmailShare}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-comus-navy border border-stone-200 transition-all cursor-pointer"
              >
                <Mail className="w-5 h-5 text-comus-copper" />
                <span className="text-xs font-bold text-center">E-posta ile Gönder</span>
                <span className="text-[10px] text-comus-sand-dark text-center">Doktora E-posta Aç</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-3 sm:px-4 bg-comus-navy/60 backdrop-blur-sm animate-fadeIn no-print"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-xl w-full max-h-[calc(100dvh-48px)] p-4 sm:p-6 shadow-2xl relative flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="flex gap-1.5 flex-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  step >= s ? 'bg-comus-copper' : 'bg-stone-100'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors cursor-pointer shrink-0"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-0.5">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className="px-4 py-2 text-xs font-semibold text-stone-500 disabled:opacity-30 cursor-pointer"
          >
            Geri
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-comus-navy text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-soft hover:bg-comus-navy-light cursor-pointer"
            >
              Devam Et <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
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
