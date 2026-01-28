import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'system';
  });

  const [theme, setActualTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let currentTheme: Theme;
      if (themeMode === 'system') {
        currentTheme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        currentTheme = themeMode;
      }
      
      root.classList.remove('light', 'dark');
      root.classList.add(currentTheme);
      setActualTheme(currentTheme);
    };

    applyTheme();

    const handler = () => {
        if (themeMode === 'system') {
            applyTheme();
        }
    };

    mediaQuery.addEventListener('change', handler);
    localStorage.setItem('theme', themeMode);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode]);

  return {
    theme,
    themeMode,
    setTheme: setThemeMode,
    isDark: theme === 'dark'
  };
} 