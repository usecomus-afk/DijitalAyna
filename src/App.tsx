import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { MentalTwinModal } from './components/avatar/MentalTwinModal';
import { BetaAccessGate } from './components/BetaAccessGateView';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { InsightsPage } from './pages/InsightsPage';
import { TriggersPage } from './pages/TriggersPage';
import { ProfilePage } from './pages/ProfilePage';
import { DoctorReportPage } from './pages/DoctorReportPage';
import { SettingsPage } from './pages/SettingsPage';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { handleAuthDeepLink } from './auth/firebaseAuth';

export const App: React.FC = () => {
  const { settings, initialize } = useAppStore();

  useEffect(() => {
    initialize();

    const processAuthUrl = async (urlStr: string) => {
      if (
        urlStr.startsWith('dijitalmentalikizim://auth-callback') ||
        urlStr.startsWith('dijitalmentalikizim://google-auth') ||
        urlStr.startsWith('dijitalmentalikizim://apple-auth') ||
        urlStr.includes('googleusercontent.apps')
      ) {
        try {
          await Browser.close();
        } catch (_) {}
        try {
          const profile = handleAuthDeepLink(urlStr);
          if (profile) {
            if (profile.isGoogleConnected) {
              await useAppStore.getState().connectGoogleProfile(profile);
            } else {
              await useAppStore.getState().setUserProfile(profile);
            }
          }
        } catch (e) {
          console.error('[App] Error handling deep link:', e);
        }
      }
    };

    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

      // Handle cold start launch URL
      CapApp.getLaunchUrl().then((launchUrl) => {
        if (launchUrl && launchUrl.url) {
          processAuthUrl(launchUrl.url);
        }
      });
    }

    const sub = CapApp.addListener('appUrlOpen', async (event) => {
      processAuthUrl(event.url);
    });

    return () => {
      sub.then((h) => h.remove()).catch(() => {});
    };
  }, [initialize]);

  const { userProfile } = useAppStore();
  const isAuthenticated = Boolean(
    userProfile?.isGoogleConnected ||
    userProfile?.isAppleConnected ||
    userProfile?.isPasswordAccount ||
    (userProfile?.email && userProfile.email.trim().length > 0) ||
    (userProfile?.username && userProfile.username.trim().length > 0)
  );

  return (
    <BetaAccessGate>
      {!isAuthenticated || !settings.onboardingCompleted ? (
        <OnboardingPage />
      ) : (
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
      )}
    </BetaAccessGate>
  );
};

export default App;
