import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suiji.app',
  appName: '随记',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlay: false,
      backgroundColor: '#00000000' // Transparent
    }
  }
};

export default config;
