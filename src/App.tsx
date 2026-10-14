import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { MentalTwinModal } from './components/avatar/MentalTwinModal';
import { SplashIntroVideo } from './components/common/SplashIntroVideo';
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
import { BreathingExercisePage } from './pages/BreathingExercisePage';

// Menu Pages
import { MenuHubPage } from './pages/menu/MenuHubPage';
import { DigitalBiomarkersPage } from './pages/menu/DigitalBiomarkersPage';
import { EssentialsPage } from './pages/menu/EssentialsPage';
import { NotificationsHubPage } from './pages/menu/NotificationsHubPage';
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
import { LocalNotifications } from '@capacitor/local-notifications';
import { handleAuthDeepLink } from './auth/firebaseAuth';

export const App: React.FC = () => {
  const { settings, initialize } = useAppStore();

  useEffect(() => {
    initialize();

    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const { notification } = notificationAction;
        const extra = notification.extra || {};
        const type = extra.type;
        
        if (type === 'morning_checkin' || type === 'evening_reflection' || type === 'inspiration_morning' || type === 'inspiration_noon' || type === 'inspiration_evening') {
          window.location.hash = '#/nasil-hissediyorsun';
        } else if (type === 'predictive_alert') {
          window.location.hash = '#/icgoru';
        } else {
          window.location.hash = '#/ayna';
        }
      });
    }

    const processAuthUrl = async (urlStr: string) => {
      if (
        urlStr.startsWith('dijitalmentalikizim://shield') ||
        urlStr.startsWith('dijitalmentalikizim://impulse-shield')
      ) {
        try {
          sessionStorage.setItem('comus_trigger_shield_now', '1');
        } catch (_) {}
        window.location.hash = '#/menu/impulse-shield';
        window.dispatchEvent(
          new CustomEvent('comus:trigger-impulse-shield', {
            detail: { label: 'Dürtü Kalkanı' },
          })
        );
        return;
      }

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
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

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

    const stateSub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      try {
        const shieldActive = localStorage.getItem('comus_impulse_shield_active') === 'true';
        if (!shieldActive) return;
        const unlockUntil = parseInt(localStorage.getItem('comus_impulse_shield_unlock_until') || '0', 10);
        if (unlockUntil > Date.now()) return;
        const hour = new Date().getHours();
        // Automatically trigger breathing shield during fragile night hours (00:00 - 06:00)
        if (hour >= 0 && hour < 6) {
          window.dispatchEvent(
            new CustomEvent('comus:trigger-impulse-shield', {
              detail: { label: 'Gece Kırılganlık Kalkanı' },
            })
          );
        }
      } catch (_) {}
    });

    return () => {
      sub.then((h) => h.remove()).catch(() => {});
      stateSub.then((h) => h.remove()).catch(() => {});
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
    <>
      <SplashIntroVideo triggerKey={alreadyOnboarded} />
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
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-3 sm:px-6 pb-20 sm:pb-24">
              <Routes>
                {/* Main Navigation Routes */}
                <Route path="/" element={<Navigate to="/ayna" replace />} />
                <Route path="/ayna" element={<DashboardPage />} />
                <Route path="/icgoru" element={<InsightsPage />} />
                <Route path="/nefes-egzersizi" element={<BreathingExercisePage />} />
                <Route path="/nasil-hissediyorsun" element={<JournalPage />} />
                <Route path="/menu" element={<MenuHubPage />} />

                {/* Legacy / Direct Routes */}
                <Route path="/triggers" element={<TriggersPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/doctor" element={<DoctorReportPage />} />
                <Route path="/journal/edit" element={<JournalEditPage />} />
                <Route path="/assessment" element={<AssessmentPage />} />

                {/* Menu Sub-Pages */}
                <Route path="/menu/digital-biomarkers" element={<DigitalBiomarkersPage />} />
                <Route path="/menu/essentials" element={<EssentialsPage />} />
                <Route path="/menu/notifications" element={<NotificationsHubPage />} />
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
    </>
  );
};

export default App;


