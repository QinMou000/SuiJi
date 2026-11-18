import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.suiji.app',
  appName: 'τί',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      // Android 15+ 强制 edge-to-edge，状态栏颜色在原生层已无法可靠设置。
      // 让 WebView 铺到状态栏下方，再由页面背景和安全区负责观感，
      // 状态栏保持透明，避免顶部出现一条黑色空隙。
      style: 'DEFAULT',
      overlaysWebView: true,
      backgroundColor: '#00000000'
    }
  }
};

export default config;
