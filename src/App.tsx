import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { MentalTwinModal } from './components/avatar/MentalTwinModal';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalmRoutePage } from './pages/CalmRoutePage';
import { InsightsPage } from './pages/InsightsPage';
import { TriggersPage } from './pages/TriggersPage';
import { EcosystemPage } from './pages/EcosystemPage';
import { DoctorReportPage } from './pages/DoctorReportPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const { settings, initialize } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!settings.onboardingCompleted) {
    return <OnboardingPage />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-comus-bg text-comus-navy flex flex-col font-sans selection:bg-comus-copper/20 selection:text-comus-copper-dark">
        {/* Global Digital Mental Twin Avatar Modal */}
        <MentalTwinModal />

        {/* Top Header */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 sm:px-6 pb-28 sm:pb-32">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/calm-route" element={<CalmRoutePage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/triggers" element={<TriggersPage />} />
            <Route path="/ecosystem" element={<EcosystemPage />} />
            <Route path="/doctor" element={<DoctorReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <Navbar />
      </div>
    </BrowserRouter>
  );
};

export default App;
