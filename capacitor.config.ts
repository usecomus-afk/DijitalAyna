import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dijitalmentalikizim.app',
  appName: 'duty',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#F5F2EA'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 250,
      launchAutoHide: true,
      backgroundColor: '#F5F2EA',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F5F2EA',
      overlaysWebView: true
    },
    FirebaseAuthentication: {
      authDomain: 'comus-ai-duty.firebaseapp.com',
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#C0674F',
      sound: 'beep.wav'
    }
  }
};

export default config;
