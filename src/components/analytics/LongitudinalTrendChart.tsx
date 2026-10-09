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
    <div className="bg-white rounded-3xl p-5 shadow-soft border border-comus-sand-light/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-comus-navy">
          <Activity className="w-5 h-5 text-comus-copper" />
          Klinik Seyir
        </h3>
        <div className="flex bg-stone-100/80 rounded-xl p-1 shadow-inner border border-stone-200/50">
          {(['G', 'H', 'A', '6A', 'Y'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === f
                  ? 'bg-white text-comus-navy shadow-sm border border-stone-200'
                  : 'text-stone-500 hover:text-stone-700'
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.8} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }}
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
                contentStyle={{ borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                labelStyle={{ color: '#1e293b', marginBottom: '4px', fontWeight: 'bold' }}
              />
              <Line type="monotone" name="Anksiyete (GAD-7)" dataKey="gad7" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              <Line type="monotone" name="Depresyon (PHQ-9)" dataKey="phq9" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 rounded-2xl border border-stone-100 border-dashed">
            <Activity className="w-10 h-10 mb-3 text-stone-300" />
            <p className="text-sm font-medium">Henüz yeterli veri yok.</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100/60 shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-5">
          <ClipboardEdit className="w-32 h-32 text-blue-900" />
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 shadow-sm">
            <ClipboardEdit className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-comus-navy mb-1.5">
              Anksiyete & Depresyon Riski Anketi
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed mb-4 font-medium">
              Düzenli aralıklarla bu değerlendirmeyi yapmak ruh sağlığınızın uzun vadeli seyrini hekiminizle paylaşmanın önemli bir parçasıdır.
            </p>
            <button 
              onClick={() => setShowSurvey(true)}
              className="bg-comus-navy hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors shadow-md active:scale-95 inline-flex items-center gap-2"
            >
              <span>Anketi Başlat</span>
              <Activity className="w-3.5 h-3.5 opacity-70" />
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
            setSurveyResult(null);
          }}
        />
      )}
    </div>
  );
}
