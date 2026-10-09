import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

// GAD-7 (Yaygın Anksiyete Bozukluğu - 7 Soru)
const GAD7_QUESTIONS = [
  "Sinirli, endişeli veya çok gergin hissetmek",
  "Endişelerinizi durduramamak veya kontrol edememek",
  "Farklı şeyler hakkında çok fazla endişelenmek",
  "Rahatlamakta zorluk çekmek",
  "O kadar huzursuz hissetmek ki sabit oturamamak",
  "Kolayca sinirlenmek veya kızmak",
  "Sanki korkunç bir şey olacakmış gibi korkmak",
];

// PHQ-9 (Hasta Sağlık Anketi - Depresyon - 9 Soru)
const PHQ9_QUESTIONS = [
  "Bir şeyler yapmaya karşı ilgi veya zevk kaybı",
  "Kendini çökkün, depresif veya umutsuz hissetmek",
  "Uykuya dalmakta/uykuda kalmakta zorluk veya çok uyumak",
  "Yorgun hissetmek veya az enerjisi olmak",
  "İştahsızlık veya aşırı yemek yeme",
  "Kendini kötü hissetmek, başarısız hissetmek veya kendini/ailesini hayal kırıklığına uğrattığını düşünmek",
  "Gazete okumak veya televizyon izlemek gibi şeylere odaklanmakta zorluk",
  "Başkalarının fark edeceği kadar yavaş hareket etmek veya konuşmak, ya da tam tersine çok huzursuz olup eskisinden fazla hareket etmek",
  "Ölmenin daha iyi olacağı veya kendine zarar verme düşünceleri",
];

const OPTIONS = [
  { value: 0, label: "Hiç" },
  { value: 1, label: "Birkaç gün" },
  { value: 2, label: "Günlerin yarısından fazla" },
  { value: 3, label: "Hemen her gün" },
];

export const AssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  // 16 answers combined (0 to 15 index)
  // Indices 0-6: GAD-7
  // Indices 7-15: PHQ-9
  const [answers, setAnswers] = useState<number[]>(Array(16).fill(-1));
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isComplete = answers.every(a => a !== -1);

  const calculateScores = () => {
    const gad7Score = answers.slice(0, 7).reduce((acc, curr) => acc + (curr > -1 ? curr : 0), 0);
    const phq9Score = answers.slice(7, 16).reduce((acc, curr) => acc + (curr > -1 ? curr : 0), 0);
    return { gad7Score, phq9Score };
  };

  const handleAnswer = (index: number, val: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = val;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    // In a real app, you would save these scores to user profile/store
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isSubmitted) {
    const { gad7Score, phq9Score } = calculateScores();
    return (
      <div className="space-y-6 pb-24 animate-fadeIn max-w-2xl mx-auto mt-4">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1.5 text-comus-sand-dark hover:text-comus-navy transition-colors text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Profile Dön</span>
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-soft border border-emerald-100 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-comus-navy font-serif">Değerlendirme Tamamlandı</h1>
          <p className="text-sm text-slate-500">
            Sonuçlarınız profilinize ve klinik raporunuza başarıyla eklendi. (Bu veriler sadece sizin cihazınızda şifreli kalır).
          </p>

          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GAD-7 (Anksiyete)</span>
              <span className="text-2xl font-bold text-indigo-700">{gad7Score} <span className="text-sm text-slate-400 font-normal">/ 21</span></span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PHQ-9 (Depresyon)</span>
              <span className="text-2xl font-bold text-rose-700">{phq9Score} <span className="text-sm text-slate-400 font-normal">/ 27</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-fadeIn max-w-2xl mx-auto mt-4">
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-1.5 text-comus-sand-dark hover:text-comus-navy transition-colors text-sm font-medium mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Profile Dön</span>
      </button>

      <div className="bg-white rounded-3xl p-6 shadow-soft border border-comus-sand-light/20 space-y-2">
        <h1 className="text-xl font-bold text-comus-navy font-serif">Klinik Değerlendirme</h1>
        <p className="text-sm text-slate-500">
          Son 2 haftayı göz önünde bulundurarak aşağıdaki ifadelerin sizi ne sıklıkla rahatsız ettiğini seçin. Bu bilgiler Apple Sağlık ile senkronize edilebilir.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
          <h2 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            GAD-7 (Anksiyete Tarama)
          </h2>
          <div className="space-y-6">
            {GAD7_QUESTIONS.map((q, idx) => (
              <div key={`gad-${idx}`} className="space-y-3">
                <p className="text-sm font-medium text-slate-700">{idx + 1}. {q}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OPTIONS.map(opt => {
                    const isSelected = answers[idx] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleAnswer(idx, opt.value)}
                        className={`p-2 rounded-xl text-xs font-medium border transition-colors ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100">
          <h2 className="text-sm font-bold text-rose-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            PHQ-9 (Depresyon Tarama)
          </h2>
          <div className="space-y-6">
            {PHQ9_QUESTIONS.map((q, i) => {
              const idx = i + 7;
              return (
                <div key={`phq-${idx}`} className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {OPTIONS.map(opt => {
                      const isSelected = answers[idx] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(idx, opt.value)}
                          className={`p-2 rounded-xl text-xs font-medium border transition-colors ${
                            isSelected 
                              ? 'bg-rose-600 text-white border-rose-600' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          disabled={!isComplete}
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl bg-comus-navy text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors shadow-sm"
        >
          {isComplete ? 'Sonuçları Kaydet' : 'Lütfen tüm soruları yanıtlayın'}
        </button>
      </div>
    </div>
  );
};

export default AssessmentPage;
