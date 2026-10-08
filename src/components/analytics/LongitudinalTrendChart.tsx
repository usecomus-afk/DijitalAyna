import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ClipboardEdit } from 'lucide-react';
import { ClinicalAssessmentModal } from '../survey/ClinicalAssessmentModal';
import { SurveyResultView } from '../survey/SurveyResultView';
import { ClinicalSurveyResult } from '../../data/clinicalSurveys';

type TimeFilter = 'G' | 'H' | 'A' | '6A' | 'Y';

export function LongitudinalTrendChart() {
  const [filter, setFilter] = useState<TimeFilter>('A');
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyResult, setSurveyResult] = useState<ClinicalSurveyResult | null>(null);

  const results = useLiveQuery(() => db.clinicalSurveyResults.orderBy('timestamp').toArray()) || [];

  const getFilteredData = () => {
    const now = Date.now();
    let cutoff = 0;
    
    switch (filter) {
      case 'G': cutoff = now - 24 * 60 * 60 * 1000; break;
      case 'H': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
      case 'A': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
      case '6A': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
      case 'Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
    }

    return results
      .filter(r => r.timestamp >= cutoff)
      .map(r => ({
        date: new Date(r.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        gad7: r.gad7Score,
        phq9: r.phq9Score
      }));
  };

  const chartData = getFilteredData();

  const handleSurveyComplete = (res: ClinicalSurveyResult) => {
    setShowSurvey(false);
    setSurveyResult(res);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Klinik Seyir
        </h3>
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {(['G', 'H', 'A', '6A', 'Y'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full mb-6">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" strokeOpacity={0.2} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#71717a' }}
                domain={[0, 27]}
                ticks={[0, 5, 10, 15, 20]}
                tickFormatter={(val) => {
                  if (val === 0) return 'Min';
                  if (val === 5) return 'Hafif';
                  if (val === 10) return 'Orta';
                  if (val === 15) return 'O-Ağır';
                  if (val === 20) return 'Ağır';
                  return '';
                }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: '#71717a', marginBottom: '4px' }}
              />
              <Line type="monotone" name="Anksiyete (GAD-7)" dataKey="gad7" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              <Line type="monotone" name="Depresyon (PHQ-9)" dataKey="phq9" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
            <Activity className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Henüz yeterli veri yok.</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
        <div className="flex gap-3">
          <div className="mt-1">
            <ClipboardEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Anksiyete & Depresyon Riski Anketi
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Düzenli aralıklarla bu değerlendirmeyi yapmak ruh sağlığınızın uzun vadeli seyrini hekiminizle paylaşmanın önemli bir parçasıdır.
            </p>
            <button 
              onClick={() => setShowSurvey(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors w-full sm:w-auto"
            >
              Anketi Başlat
            </button>
          </div>
        </div>
      </div>

      <ClinicalAssessmentModal 
        isOpen={showSurvey} 
        onClose={() => setShowSurvey(false)} 
        onComplete={handleSurveyComplete} 
      />

      {surveyResult && (
        <SurveyResultView 
          result={surveyResult}
          onClose={() => setSurveyResult(null)}
          onViewTimeline={() => setSurveyResult(null)}
          onAddToReport={() => {
            // Logic to handle adding to report could be implemented here
            // e.g. navigating to report generation or raising an event
            setSurveyResult(null);
          }}
        />
      )}
    </div>
  );
}
