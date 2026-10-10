import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../db';
import { MedicationTracker } from '../../components/medication/MedicationTracker';
import { MedicationImpactChart } from '../../components/charts/MedicationImpactChart';
import { Disclaimer } from '../../components/common/Disclaimer';

export const MedicationTrackerPage: React.FC = () => {
  const navigate = useNavigate();

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const moodReports = useLiveQuery(() => db.moodReports.orderBy('timestamp').reverse().toArray()) || [];
  const medications = useLiveQuery(() => db.medications.toArray()) || [];

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Günlük İlaç Kullanım Tablosu</h1>
      </div>

      <MedicationTracker />

      {medications.length > 0 && (
        <MedicationImpactChart
          medications={medications}
          metrics={dailyMetrics}
          baselines={baselines}
          moods={moodReports}
        />
      )}

      <Disclaimer />
    </div>
  );
};
