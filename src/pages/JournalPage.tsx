import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { QuickMoodWidget } from '../components/dashboard/QuickMoodWidget';
import { useViewportScrollLock } from '../hooks/useViewportScrollLock';

export const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const [isTestsExpanded, setIsTestsExpanded] = useState(false);

  // Lock vertical scrolling until "İncele" is clicked
  useViewportScrollLock(!isTestsExpanded);

  return (
    <div
      className={`max-w-2xl mx-auto animate-fadeIn ${
        isTestsExpanded ? 'space-y-4 pb-20' : 'h-viewport-main flex flex-col justify-between gap-3'
      }`}
    >
      {/* Kendini nasıl hissediyorsun? — Instant Mood Check-In Widget */}
      <QuickMoodWidget fillHeight={!isTestsExpanded} />

      {/* İncele Toggle Button */}
      <div className="flex justify-center shrink-0">
        <button
          type="button"
          onClick={() => setIsTestsExpanded((prev) => !prev)}
          aria-expanded={isTestsExpanded}
          className="w-full py-3 px-6 rounded-2xl bg-comus-navy text-white hover:bg-comus-navy-light font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-soft cursor-pointer"
        >
          <span>{isTestsExpanded ? 'Ayrıntıları Gizle' : 'İncele'}</span>
          {isTestsExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Psychological Tests — İncele ile Aşağıya Açılan Kart */}
      {isTestsExpanded && (
        <div className="bg-white rounded-3xl p-5 border border-comus-sand-light/30 shadow-soft space-y-4 animate-fadeIn">
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">Psikolojik Değerlendirme</h3>
            <p className="text-xs text-comus-sand-dark mt-0.5 leading-relaxed">
              İsterseniz klinik geçerliliği olan kısa ölçeklerle (GAD-7 ve PHQ-9) durumunuzu daha ayrıntılı inceleyebilir ve geçmiş sonuçlarınızı karşılaştırabilirsiniz.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-comus-sand-light/20">
            <button
              onClick={() => navigate('/assessment')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 hover:shadow-md transition-shadow text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">Anksiyete &amp; Depresyon Testi</h4>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">GAD-7 ve PHQ-9 Kriterleri (16 Soru)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/menu/clinical-survey')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 hover:shadow-md transition-shadow text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Geçmiş Test Sonuçları</h4>
                  <p className="text-[11px] text-indigo-700/80 mt-0.5">Trend analizi ve risk bantları</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
