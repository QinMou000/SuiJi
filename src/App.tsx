import { useEffect, useLayoutEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { SettingsPage } from './pages/Settings';
import { Pomodoro } from './pages/Pomodoro';
import { PomodoroSettings } from './pages/PomodoroSettings';
import { FocusStats } from './pages/FocusStats';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from './hooks/useTheme';
import { ToastProvider } from './components/ui/Toast';
import { PomodoroProvider } from './features/pomodoro/PomodoroProvider';
import { ensureBlogSeeded } from './features/blog/seed';
import { peekBlogView } from './features/blog/viewState';
import { closeActiveMediaViewer } from './components/blog/MediaViewer';

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    const unlockScroll = () => {
      // 路由切换时兜底解除沉浸锁定，避免从计时页离开后整页仍不可滚动
      document.body.classList.remove('is-immersive');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };

    // 从文章返回博客：保留当前滚动位置，交给 Blog 在列表渲染后恢复。
    if (location.pathname === '/blog' && peekBlogView() !== null) {
      unlockScroll();
      return;
    }

    // 等新页面完成布局后再回到顶部，避免二级页/标签页继承上一页的滚动位置
    const reset = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      unlockScroll();
    };
    reset();
    const frame = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    let handle: PluginListenerHandle | null = null;
    CapacitorApp.addListener('backButton', () => {
      // 图片/实况预览打开时，返回键先关预览，不离开文章。
      if (closeActiveMediaViewer()) return;
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
      <Route path="/" element={<Pomodoro />} />
      <Route path="/pomodoro" element={<Pomodoro />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:id" element={<BlogPost />} />
      <Route path="/pomodoro/settings" element={<PomodoroSettings />} />
      <Route path="/stats" element={<FocusStats />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const { isDark } = useTheme();

  useEffect(() => {
    // 首屏播种博客快照；失败时由博客页给出明确的重试入口
    void ensureBlogSeeded().catch(() => undefined);
  }, []);

  useEffect(() => {
    // 状态栏始终透明并铺在 WebView 之上：页面背景会一直画到屏幕顶部，
    // 不会在状态栏区域留下黑色或白色的硬边。图标明暗跟随应用主题。
    const updateStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setBackgroundColor({ color: '#00000000' });
        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light,
        });
      } catch {
        // 浏览器环境无状态栏插件，忽略
      }
    };
    void updateStatusBar();
  }, [isDark]);

  useEffect(() => {
    // 顶部不滚动时保持全透明（Hero/氛围光顶到屏幕边）；
    // 一旦滚动，再用磨砂状态栏遮住从图标下面穿过的内容。
    const update = () => {
      document.body.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <Router>
      <ToastProvider>
        <PomodoroProvider>
          <AppRoutes />
        </PomodoroProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
