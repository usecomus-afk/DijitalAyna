import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { JournalPage } from '../JournalPage';

export const JournalHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-2 pb-24 animate-fadeIn">
      <div className="flex items-center">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>
      <JournalPage />
    </div>
  );
};
