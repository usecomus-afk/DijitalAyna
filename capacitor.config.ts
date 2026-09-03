import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dijitalayna.app',
  appName: 'Dijital Ayna',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://comus-ai-duty.web.app',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: '#F2F0EB',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F2F0EB'
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#C0674F',
      sound: 'beep.wav'
    }
  }
};

export default config;
