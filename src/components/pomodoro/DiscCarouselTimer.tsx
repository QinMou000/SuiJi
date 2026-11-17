import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  mountDiscCarousel,
  type DiscTimerState,
} from '../../effects/disc-carousel/effect';
import '../../effects/disc-carousel/effect.css';
import './disc-carousel-timer.css';
import {
  acquireDiscStage,
  parkDiscStage,
  registerDiscStage,
} from './discStageCache';
import { MODE_META, MODE_ORDER } from '../../features/pomodoro/constants';
import type {
  PomodoroMode,
  PomodoroSettings,
  TimerStatus,
} from '../../features/pomodoro/types';
import { cn } from '../../lib/utils';

interface DiscCarouselTimerProps {
  mode: PomodoroMode;
  status: TimerStatus;
  progress: number;
  timeLabel: string;
  focusCycleCount: number;
  longBreakInterval: number;
  settings: PomodoroSettings;
  /** 计时进行中：表盘放大到页面中心，隐藏外围信息 */
  immersive: boolean;
  /** 左右滑动切换模式；直接生效，不再二次确认。 */
  onSelectMode: (mode: PomodoroMode) => void;
}

const FACE_META: Record<PomodoroMode, { accent: string; ringTitle: string }> = {
  focus: { accent: '#ff5a3c', ringTitle: 'FOCUS' },
  shortBreak: { accent: '#1f9e7a', ringTitle: 'SHORT BREAK' },
  longBreak: { accent: '#4c6fff', ringTitle: 'LONG BREAK' },
};

function durationOf(settings: PomodoroSettings, mode: PomodoroMode): number {
  if (mode === 'focus') return settings.focusMinutes;
  if (mode === 'shortBreak') return settings.shortBreakMinutes;
  return settings.longBreakMinutes;
}

function isDarkDocument(): boolean {
  return document.documentElement.classList.contains('dark');
}

function stageLayout() {
  const width = Math.min(window.innerWidth, 448);
  return { height: Math.round(Math.min(420, Math.max(330, width * 1.03))) };
}

/**
 * 专注页表盘：Effect Atlas · Disc Carousel（Three.js / WebGL 版）。
 * 当前计时不再用 HTML 圆环盖在表盘上，而是直接画进活动圆盘的盘面纹理：
 * 模式、剩余时间、进度弧、状态和番茄格都是唱片表面的一部分。
 */
export function DiscCarouselTimer({
  mode,
  status,
  progress,
  timeLabel,
  focusCycleCount,
  longBreakInterval,
  settings,
  immersive,
  onSelectMode,
}: DiscCarouselTimerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const fxRef = useRef<ReturnType<typeof mountDiscCarousel> | null>(null);
  const modeRef = useRef(mode);
  const onSelectRef = useRef(onSelectMode);
  const timerStateRef = useRef<DiscTimerState | null>(null);
  const [isDark, setIsDark] = useState(isDarkDocument);
  const [layout, setLayout] = useState(stageLayout);
  const [zoom, setZoom] = useState<{ x: number; y: number; scale: number } | null>(null);

  const meta = MODE_META[mode];
  const statusLine =
    status === 'idle'
      ? meta.hint
      : status === 'paused'
        ? `已暂停 · 剩余 ${timeLabel}`
        : `进行中 · ${Math.round((1 - progress) * 100)}%`;

  const timerState: DiscTimerState = {
    index: MODE_ORDER.indexOf(mode),
    mode,
    label: meta.label,
    accent: FACE_META[mode].accent,
    timeLabel,
    progress,
    statusLine,
    cycleCount: focusCycleCount,
    cycleTotal: longBreakInterval,
  };
  timerStateRef.current = timerState;

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    onSelectRef.current = onSelectMode;
  }, [onSelectMode]);

  useEffect(() => {
    const update = () => setLayout(stageLayout());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(isDarkDocument()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    (window as unknown as { THREE?: typeof THREE }).THREE = THREE;

    // 主题与时长会被烘焙进盘面纹理，变化时必须重建场景；其余情况一律复用常驻场景
    // （见 discStageCache.ts：离开页面只暂停 + 摘节点，不销毁 WebGL 上下文）。
    const signature = [
      isDark ? 'dark' : 'light',
      settings.focusMinutes,
      settings.shortBreakMinutes,
      settings.longBreakMinutes,
    ].join('|');

    const lease = acquireDiscStage(signature);
    const host = lease.host;
    host.style.setProperty('--surface', isDark ? '#070708' : '#fcfcfc');
    // 先入文档再 mount：mount 里要读 getComputedStyle 的主题令牌，脱离文档会全部落回默认值。
    container.appendChild(host);

    const fx =
      lease.fx ??
      mountDiscCarousel(host, {
        params: { glide: 620, gap: 115, lean: 100, trail: 100 },
        modeMeta: MODE_ORDER.map(item => ({
          key: item,
          label: MODE_META[item].label,
          accent: FACE_META[item].accent,
          ringTitle: FACE_META[item].ringTitle,
          minutes: durationOf(settings, item),
        })),
      });
    if (!lease.fx) registerDiscStage(host, fx, signature);
    fxRef.current = fx;

    const board = host.querySelector<HTMLElement>('.fx-board');
    boardRef.current = board;

    // 滑动 / 滚轮切盘后把新下标同步回 React 状态
    const observer = new MutationObserver(() => {
      if (!board) return;
      const index = Number(board.dataset.index || 0);
      const nextMode = MODE_ORDER[index];
      if (!nextMode || nextMode === modeRef.current) return;
      onSelectRef.current(nextMode);
    });
    observer.observe(board ?? host, {
      attributes: true,
      attributeFilter: ['data-index'],
    });

    let frame = 0;
    if (lease.reused) {
      // 复用：直接恢复渲染。画布上还留着离场前那一帧（先顶着，不会白），
      // 下一帧再按当前时间重画盘面，顺便确保尺寸已经就位。
      fx.setPaused(false);
      frame = requestAnimationFrame(() => {
        if (fxRef.current !== fx) return;
        if (timerStateRef.current) fx.setTimerState(timerStateRef.current);
        fx.setImmersiveView(immersive);
      });
    } else {
      if (timerStateRef.current) fx.setTimerState(timerStateRef.current);
      fx.setImmersiveView(immersive);

      const initial = MODE_ORDER.indexOf(modeRef.current);
      if (initial > 0) fx.goTo(initial);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      fxRef.current = null;
      boardRef.current = null;
      parkDiscStage(host);
    };
    // 主题 / 时长变化时重建圆盘，保证雾色和盘面文字同步。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDark,
    settings.focusMinutes,
    settings.shortBreakMinutes,
    settings.longBreakMinutes,
  ]);

  useEffect(() => {
    modeRef.current = mode;
    const fx = fxRef.current;
    const board = boardRef.current;
    if (!fx || !board) return;
    const index = MODE_ORDER.indexOf(mode);
    if (index >= 0 && Number(board.dataset.index) !== index) {
      fx.goTo(index);
    }
  }, [mode]);

  useEffect(() => {
    fxRef.current?.setTimerState(timerState);
    // 计时每秒变化时只重绘盘面纹理，不重建 WebGL 场景。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, meta.label, timeLabel, progress, statusLine, focusCycleCount, longBreakInterval]);

  useEffect(() => {
    fxRef.current?.setImmersiveView(immersive);
  }, [immersive]);

  useEffect(() => {
    if (!immersive) {
      setZoom(null);
      return;
    }
    const element = stageRef.current;
    if (!element) return;

    const apply = () => {
      const rect = element.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(1.45, Math.max(1.2, (vh * 0.64) / rect.height));
      setZoom({
        x: vw / 2 - (rect.left + rect.width / 2),
        y: vh * 0.43 - (rect.top + rect.height / 2),
        scale,
      });
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [immersive, layout.height]);

  useEffect(() => {
    if (!immersive) return;
    const html = document.documentElement;
    const body = document.body;
    body.classList.remove('is-scrolled');
    body.classList.add('is-immersive');
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousOverscroll = body.style.overscrollBehavior;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      body.classList.remove('is-immersive');
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousOverscroll;
    };
  }, [immersive]);

  return (
    <div className="relative -mx-4 mt-2 w-[calc(100%+2rem)]">
      <div
        ref={stageRef}
        className="relative w-full transition-transform duration-700 ease-spring will-change-transform"
        style={{
          height: layout.height,
          transform: zoom
            ? `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`
            : undefined,
          zIndex: zoom ? 60 : undefined,
        }}
      >
        {/* 常驻舞台挂载点：WebGL 场景跨页面复用，只在这里“搬家” */}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      <p
        className={cn(
          'mt-1 text-center text-[10px] text-muted-foreground/70 transition-opacity duration-300',
          immersive && 'pointer-events-none opacity-0',
        )}
      >
        左右滑动或滚轮切换模式
      </p>
    </div>
  );
}
