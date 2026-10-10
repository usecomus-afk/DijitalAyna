import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LongitudinalTrendChart } from '../../components/analytics/LongitudinalTrendChart';

export const ClinicalSurveyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Anksiyete & Depresyon Anketi</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-comus-sand-light/30">
        <p className="text-sm text-comus-sand-dark mb-4">
          Apple Sağlık uyumlu 16 soruluk GAD-7 ve PHQ-9 klinik tarama anketi, anket sonuçları, risk bantları ve G / H / A / 6A / Y zaman çizelgesi grafiği.
        </p>
        <LongitudinalTrendChart />
      </div>
    </div>
  );
};
