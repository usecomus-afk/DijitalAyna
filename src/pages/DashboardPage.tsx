import React from 'react';
import { MentalTwinPanel } from '../components/avatar/MentalTwinPanel';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      <MentalTwinPanel />
    </div>
  );
};

