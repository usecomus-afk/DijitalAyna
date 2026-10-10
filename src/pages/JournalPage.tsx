import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Plus, ChevronRight, ClipboardList, ShieldCheck } from 'lucide-react';
import { QuickMoodWidget } from '../components/dashboard/QuickMoodWidget';

export const JournalPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 text-comus-navy pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-comus-sand-light/30 shadow-sm safe-top">
        <div className="px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold font-serif text-comus-navy flex items-center gap-2">
            <Book className="w-5 h-5 text-comus-copper" />
            Nasýl Hissediyorsun?
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Instant Mood Check-In Widget */}
        <QuickMoodWidget />

        {/* Psychological Tests */}
        <div className="bg-white rounded-3xl p-5 border border-comus-sand-light/30 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-comus-navy">Psikolojik Deðerlendirme</h3>
              <p className="text-xs text-comus-sand-dark mt-0.5">Klinik geçerliliði olan testlerle durumunuzu analiz edin</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => navigate('/assessment')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">Anksiyete & Depresyon Testi</h4>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">GAD-7 ve PHQ-9 Kriterleri (16 Soru)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => navigate('/menu/clinical-survey')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Geçmiþ Test Sonuçlarý</h4>
                  <p className="text-[11px] text-indigo-700/80 mt-0.5">Trend analizi ve risk bantlarý</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
