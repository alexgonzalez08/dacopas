import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.dacopas.app',
  appName: 'Dacopas',
  // Apunta a la app en producción — sin necesidad de export estático
  server: {
    url: 'https://dacopas.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#facc15',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0f1e',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0f1e',
    },
  },
}

export default config
