import { FileText, X, AlertTriangle } from 'lucide-react';
import { ClinicalSurveyResult } from '../../data/clinicalSurveys';

interface SurveyResultViewProps {
  result: ClinicalSurveyResult;
  onClose: () => void;
  onViewTimeline: () => void;
  onAddToReport: () => void;
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'Minimum': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Hafif': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'Orta': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'Orta-Ağır': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'Ağır': return 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200';
    default: return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
  }
};

const getBarColor = (risk: string) => {
  switch (risk) {
    case 'Minimum': return 'bg-blue-500';
    case 'Hafif': return 'bg-yellow-500';
    case 'Orta': return 'bg-orange-500';
    case 'Orta-Ağır': return 'bg-red-500';
    case 'Ağır': return 'bg-red-700';
    default: return 'bg-zinc-500';
  }
};

export function SurveyResultView({ result, onClose, onViewTimeline, onAddToReport }: SurveyResultViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Değerlendirme Sonucu</h2>
        <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        {result.crisisRisk && (
          <div className="bg-zinc-900 dark:bg-black text-white p-5 rounded-2xl border border-red-500/30 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-400 mb-2">Kritik Güvenlik Uyarısı</h3>
                <p className="text-sm text-zinc-300 mb-4">
                  Son soruya verdiğiniz yanıt, en kısa sürede bir ruh sağlığı uzmanıyla görüşmeniz gerektiğini belirtiyor.
                </p>
                <div className="flex flex-col gap-2">
                  <a href="tel:112" className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl text-center transition-colors">
                    112 / 182 Acil Arama
                  </a>
                  <a href="https://www.psikiyatri.org.tr/" target="_blank" rel="noreferrer" className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-xl text-center transition-colors">
                    Türkiye Psikiyatri Derneği
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Anksiyete Riski</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.gad7Risk)}`}>
              {result.gad7Risk}
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div className={`h-full ${getBarColor(result.gad7Risk)}`} style={{ width: `${(result.gad7Score / 21) * 100}%` }} />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Yanıtlarınız şu anda {result.gad7Risk.toLowerCase()} anksiyete belirtileri yaşıyor olabileceğinizi gösteriyor.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Depresyon Riski</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.phq9Risk)}`}>
              {result.phq9Risk}
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div className={`h-full ${getBarColor(result.phq9Risk)}`} style={{ width: `${(result.phq9Score / 27) * 100}%` }} />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Yanıtlarınız şu anda {result.phq9Risk.toLowerCase()} düzeyde depresyon belirtileri yaşıyor olabileceğinizi gösteriyor.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button 
            onClick={onAddToReport}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            <FileText className="w-5 h-5" />
            Hekim Raporuna Ekle (PDF)
          </button>
          <button 
            onClick={onViewTimeline}
            className="w-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Kapat ve Zaman Çizelgesine Bak
          </button>
        </div>
      </div>
    </div>
  );
}
