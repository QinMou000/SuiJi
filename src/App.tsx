import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Home } from './pages/Home';
import { CreateRecord } from './pages/CreateRecord';
import { RecordDetail } from './pages/RecordDetail';
import { SettingsPage } from './pages/Settings';
// import { CalendarPage } from './pages/Calendar'; // Removed
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from './hooks/useTheme';

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let handle: PluginListenerHandle | null = null;
    CapacitorApp.addListener('backButton', () => {
      if (location.pathname === '/') {
        CapacitorApp.exitApp();
        return;
      }
      navigate(-1);
    }).then(h => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* <Route path="/calendar" element={<CalendarPage />} /> */}
      <Route path="/create" element={<CreateRecord />} />
      <Route path="/edit/:id" element={<CreateRecord />} />
      <Route path="/record/:id" element={<RecordDetail />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

function App() {
  const { isDark } = useTheme();

  useEffect(() => {
    // Sync Capacitor Status Bar with Theme
    const updateStatusBar = async () => {
      try {
        if (isDark) {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#000000' });
        } else {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      } catch (e) {
        // Ignore errors (e.g. running in browser)
      }
    };
    updateStatusBar();
  }, [isDark]);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
