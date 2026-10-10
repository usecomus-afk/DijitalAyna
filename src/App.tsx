import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { MentalTwinModal } from './components/avatar/MentalTwinModal';
import { BetaAccessGate } from './components/BetaAccessGateView';
import { OnboardingPage } from './pages/OnboardingPage';
import { OnboardingCards, ONBOARDING_COMPLETED_KEY } from './components/onboarding/OnboardingCards';
import { DashboardPage } from './pages/DashboardPage';
import { InsightsPage } from './pages/InsightsPage';
import { TriggersPage } from './pages/TriggersPage';
import { ProfilePage } from './pages/ProfilePage';
import { DoctorReportPage } from './pages/DoctorReportPage';
import { SettingsPage } from './pages/SettingsPage';
import { JournalPage } from './pages/JournalPage';
import { JournalEditPage } from './pages/JournalEditPage';
import { AssessmentPage } from './pages/AssessmentPage';

// Menu Pages
import { MenuHubPage } from './pages/menu/MenuHubPage';
import { ClinicalConditionsPage } from './pages/menu/ClinicalConditionsPage';
import { ClinicalSurveyPage } from './pages/menu/ClinicalSurveyPage';
import { BiomarkerBridgePage } from './pages/menu/BiomarkerBridgePage';
import { JournalHistoryPage } from './pages/menu/JournalHistoryPage';
import { DoctorSharePage } from './pages/menu/DoctorSharePage';
import { MedicationTrackerPage } from './pages/menu/MedicationTrackerPage';
import { EWMADeviationsPage } from './pages/menu/EWMADeviationsPage';
import { EthicsAndSciencePage } from './pages/menu/EthicsAndSciencePage';
import { LegalDisclaimerPage } from './pages/menu/LegalDisclaimerPage';
import { InspirationNotificationsPage } from './pages/menu/InspirationNotificationsPage';
import { HealthKitSyncPage } from './pages/menu/HealthKitSyncPage';
import { ImpulseShieldPage } from './pages/menu/ImpulseShieldPage';

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

  const [cardsCompleted, setCardsCompleted] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const alreadyOnboarded = isAuthenticated && settings.onboardingCompleted;

  return (
    <BetaAccessGate>
      {!cardsCompleted && !alreadyOnboarded ? (
        <OnboardingCards onComplete={() => setCardsCompleted(true)} />
      ) : !isAuthenticated || !settings.onboardingCompleted ? (
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
                {/* Main Navigation Routes */}
                <Route path="/" element={<Navigate to="/ayna" replace />} />
                <Route path="/ayna" element={<DashboardPage />} />
                <Route path="/icgoru" element={<InsightsPage />} />
                <Route path="/nasil-hissediyorsun" element={<JournalPage />} />
                <Route path="/menu" element={<MenuHubPage />} />

                {/* Legacy / Direct Routes */}
                <Route path="/triggers" element={<TriggersPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/doctor" element={<DoctorReportPage />} />
                <Route path="/journal/edit" element={<JournalEditPage />} />
                <Route path="/assessment" element={<AssessmentPage />} />

                {/* 13 Menu Sub-Pages */}
                <Route path="/menu/clinical-conditions" element={<ClinicalConditionsPage />} />
                <Route path="/menu/clinical-survey" element={<ClinicalSurveyPage />} />
                <Route path="/menu/biomarker-bridge" element={<BiomarkerBridgePage />} />
                <Route path="/menu/journal-history" element={<JournalHistoryPage />} />
                <Route path="/menu/doctor-share" element={<DoctorSharePage />} />
                <Route path="/menu/medication-tracker" element={<MedicationTrackerPage />} />
                <Route path="/menu/ewma-deviations" element={<EWMADeviationsPage />} />
                <Route path="/menu/ethics-and-science" element={<EthicsAndSciencePage />} />
                <Route path="/menu/legal-disclaimers" element={<LegalDisclaimerPage />} />
                <Route path="/menu/inspiration-notifications" element={<InspirationNotificationsPage />} />
                <Route path="/menu/healthkit-sync" element={<HealthKitSyncPage />} />
                <Route path="/menu/impulse-shield" element={<ImpulseShieldPage />} />
                <Route path="/menu/settings" element={<SettingsPage />} />

                <Route path="*" element={<Navigate to="/ayna" replace />} />
              </Routes>
            </main>

            {/* Bottom Navigation */}
            <BottomNav />
          </div>
        </HashRouter>
      )}
    </BetaAccessGate>
  );
};

export default App;
