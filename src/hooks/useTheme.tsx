import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** 实际生效的主题（system 解析之后） */
  theme: Theme;
  /** 用户选择的模式 */
  themeMode: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/**
 * 主题只保留一份状态：状态栏图标、设置页的开关、代码块高亮都读同一个 context。
 * （之前是普通 hook，多处调用会各持一份 state，互相看不见对方的改动。）
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredMode);
  const [theme, setActualTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const currentTheme: Theme =
        themeMode === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themeMode;
      root.classList.remove('light', 'dark');
      root.classList.add(currentTheme);
      root.style.colorScheme = currentTheme;
      setActualTheme(currentTheme);

      // 浏览器 / PWA 的顶栏也跟随应用主题，而不是系统主题。
      // 否则浅色应用在深色系统上会顶出一条黑色系统栏。
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]')
        .forEach(item => item.remove());
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = currentTheme === 'dark' ? '#070708' : '#fcfcfc';
    };

    applyTheme();

    const handler = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handler);
    localStorage.setItem(STORAGE_KEY, themeMode);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeMode,
      isDark: theme === 'dark',
      setTheme: setThemeMode,
    }),
    [theme, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return context;
}
