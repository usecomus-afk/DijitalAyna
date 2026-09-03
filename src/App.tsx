import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { MentalTwinModal } from './components/avatar/MentalTwinModal';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { InsightsPage } from './pages/InsightsPage';
import { TriggersPage } from './pages/TriggersPage';
import { ProfilePage } from './pages/ProfilePage';
import { DoctorReportPage } from './pages/DoctorReportPage';
import { SettingsPage } from './pages/SettingsPage';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

export const App: React.FC = () => {
  const { settings, initialize } = useAppStore();

  useEffect(() => {
    initialize();

    const sub = CapApp.addListener('appUrlOpen', async (event) => {
      if (event.url.startsWith('dijitalayna://google-auth')) {
        try {
          await Browser.close();
        } catch (_) {}
        try {
          const parsed = new URL(event.url);
          const name = decodeURIComponent(parsed.searchParams.get('name') || 'Google Kullanıcısı');
          const email = decodeURIComponent(parsed.searchParams.get('email') || '');
          const picture = decodeURIComponent(parsed.searchParams.get('picture') || '');
          useAppStore.getState().connectGoogleProfile({
            name,
            email: email || undefined,
            picture: picture || undefined,
            isGoogleConnected: true,
            createdAt: Date.now(),
          });
        } catch (e) {
          console.error('[App] Error handling deep link:', e);
        }
      }
    });

    return () => {
      sub.then((h) => h.remove()).catch(() => {});
    };
  }, [initialize]);

  if (!settings.onboardingCompleted) {
    return <OnboardingPage />;
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-comus-bg text-comus-navy flex flex-col font-sans selection:bg-comus-copper/20 selection:text-comus-copper-dark">
        {/* Global Digital Mental Twin Avatar Modal */}
        <MentalTwinModal />

        {/* Top Header */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 sm:px-6 pb-28 sm:pb-32">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/triggers" element={<TriggersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/doctor" element={<DoctorReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <Navbar />
      </div>
    </HashRouter>
  );
};

export default App;
