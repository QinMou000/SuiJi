import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { CreateRecord } from './pages/CreateRecord';
import { RecordDetail } from './pages/RecordDetail';
import { SettingsPage } from './pages/Settings';
// import { CalendarPage } from './pages/Calendar'; // Removed
import { FinancePage } from './pages/Finance';
import { AddTransaction } from './pages/AddTransaction';
import { CountdownPage } from './pages/CountdownPage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from './hooks/useTheme';

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
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route path="/calendar" element={<CalendarPage />} /> */}
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/finance/add" element={<AddTransaction />} />
        <Route path="/finance/edit/:id" element={<AddTransaction />} />
        <Route path="/countdowns" element={<CountdownPage />} />
        <Route path="/create" element={<CreateRecord />} />
        <Route path="/edit/:id" element={<CreateRecord />} />
        <Route path="/record/:id" element={<RecordDetail />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
