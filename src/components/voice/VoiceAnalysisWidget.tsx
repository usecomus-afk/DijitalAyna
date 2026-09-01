import React, { useState } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { voiceSensor, VoiceAnalysisResult } from '../../sensors/voiceSensor';
import { useAppStore } from '../../store/useAppStore';

export const VoiceAnalysisWidget: React.FC = () => {
  const { runAnalysisPipeline } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<VoiceAnalysisResult | null>(null);
  const [countdown, setCountdown] = useState(4);

  const handleStartRecording = async () => {
    setIsRecording(true);
    setResult(null);
    setCountdown(4);

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    try {
      const res = await voiceSensor.analyzeSpeechSample(4);
      clearInterval(interval);
      setResult(res);
      await runAnalysisPipeline();
    } catch (err) {
      console.error('Ses analizi hatası:', err);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-comus-navy">
                Ses Analizi (Kullanıcı Onaylı Biyobelirteç)
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Slide 7 & 10
              </span>
            </div>
            <p className="text-xs text-comus-sand-dark mt-0.5">
              Konuşma tonu, perde dalgalanması (pitch variance) ve duraksama ritmi
            </p>
          </div>
        </div>

        <button
          onClick={handleStartRecording}
          disabled={isRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-soft transition-all ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-comus-navy hover:bg-comus-navy-light text-white'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4 animate-spin" />
              <span>Dinleniyor ({countdown}s)...</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>4 Sn Ses Testi Yap</span>
            </>
          )}
        </button>
      </div>

      {isRecording && (
        <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex flex-col items-center justify-center space-y-2 animate-fadeIn text-center">
          <div className="flex items-center gap-1.5 h-8">
            <span className="w-1.5 h-4 bg-teal-600 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-8 bg-teal-700 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-6 bg-teal-600 rounded-full animate-bounce [animation-delay:300ms]" />
            <span className="w-1.5 h-7 bg-teal-800 rounded-full animate-bounce [animation-delay:200ms]" />
            <span className="w-1.5 h-3 bg-teal-500 rounded-full animate-bounce [animation-delay:100ms]" />
          </div>
          <p className="text-xs text-teal-950 font-medium">
            Lütfen mikrofonunuza doğru normal hızda bir cümle söyleyin...
          </p>
          <p className="text-[11px] text-teal-800 italic">
            "Örn: Bugün zihnim açık ve haftalık görevlerime odaklanıyorum."
          </p>
        </div>
      )}

      {result && (
        <div className="p-4 rounded-2xl bg-comus-surface border border-comus-sand-light/40 space-y-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-comus-sand-light/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-comus-copper" />
              <span className="text-xs font-bold text-comus-navy">Akustik Dinamik Sonucu:</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  result.isMonotone
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {result.isMonotone ? 'Düşük Ses Varyansı (Monoton Ton)' : 'Dinamik & Dengeli Ses Perdesi'}
              </span>
            </div>
            <span className="text-[11px] text-comus-sand-dark">4 sn analiz penceresi</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-comus-sand-light/30">
              <div className="text-comus-sand-dark text-[10px]">Perde Varyansı</div>
              <div className="font-bold text-comus-navy text-sm mt-0.5">
                {result.pitchVariance} <span className="text-[10px] font-normal">Hz²</span>
              </div>
              <div className="text-[10px] text-comus-sand-dark mt-0.5">Normal: &gt;25 Hz²</div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-comus-sand-light/30">
              <div className="text-comus-sand-dark text-[10px]">Konuşma Temposu</div>
              <div className="font-bold text-comus-navy text-sm mt-0.5">
                {result.speechRate} <span className="text-[10px] font-normal">WPM</span>
              </div>
              <div className="text-[10px] text-comus-sand-dark mt-0.5">Normal: 110–160</div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-comus-sand-light/30">
              <div className="text-comus-sand-dark text-[10px]">Duraksama Oranı</div>
              <div className="font-bold text-comus-navy text-sm mt-0.5">
                %{result.pauseRatio}
              </div>
              <div className="text-[10px] text-comus-sand-dark mt-0.5">Normal: %15–30</div>
            </div>
          </div>

          <p className="text-xs text-comus-navy/80 leading-relaxed bg-white p-3 rounded-xl border border-comus-sand-light/30">
            {result.isMonotone ? (
              <span className="flex items-start gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Farkındalık Gözlemi:</strong> Konuşma tonunuzda daralma ve monotonlaşma saptandı. Literatürde monoton konuşma temposu duygusal yorgunluk veya depresif çekilme sinyali olabilir.
                </span>
              </span>
            ) : (
              <span className="flex items-start gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Dengeli Ritim:</strong> Konuşma frekansınızdaki perde zenginliği ve hece akıcılığınız sağlıklı baz hattı normlarıyla uyumlu seyrediyor.
                </span>
              </span>
            )}
          </p>
        </div>
      )}

      {/* Privacy guarantee note */}
      <div className="text-[11px] text-comus-sand-dark flex items-center gap-1.5 pt-1">
        <Volume2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>
          <strong>Tam Gizlilik Garantisi:</strong> Cihazınızda ses kaydı asla tutulmaz, dinlenmez veya internete yüklenmez. Yalnızca perde titreşim matematiği yerel olarak hesaplanır.
        </span>
      </div>
    </div>
  );
};
