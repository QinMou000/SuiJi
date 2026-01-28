import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

import { Buffer } from 'buffer';
// Polyfill Buffer for browser environment (required by gray-matter)
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// 强制注销所有 Service Worker，解决 APK 更新后页面仍显示旧版本的问题
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
