import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BiomarkerBridgeTable } from '../../components/biomarkers/BiomarkerBridgeTable';

export const BiomarkerBridgePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Dijital Biyobelirteçler</h1>
      </div>

      <BiomarkerBridgeTable />
    </div>
  );
};
