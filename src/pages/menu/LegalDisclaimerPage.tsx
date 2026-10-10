import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const LegalDisclaimerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-semibold text-comus-navy">LegalDisclaimerPage</h1>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-comus-sand-light/30">
        <p className="text-comus-sand-dark">Bu sayfa yapım aşamasındadır.</p>
      </div>
    </div>
  );
};
