import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import { DoctorReportPage } from '../DoctorReportPage';
import { DOCTOR_REPORT_TEMPLATE_ID } from '../../services/reportBuilder';

export const DoctorSharePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 pb-24 animate-fadeIn">
      <div className="no-print flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/menu')}
            className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors cursor-pointer"
            aria-label="Menüye Dön"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-comus-copper" />
            <h1 className="text-lg sm:text-xl font-bold text-comus-navy">
              Doktorumla Paylaş
            </h1>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-comus-navy text-white">
          {DOCTOR_REPORT_TEMPLATE_ID}
        </span>
      </div>
      <DoctorReportPage />
    </div>
  );
};
