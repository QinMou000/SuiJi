import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MediaViewerItem } from './MediaViewer';
import { loadMotionPhotoVideo } from '../../features/blog/motionPhoto';

interface MotionPhotoProps {
  /** 实况照片原始文件（含尾部视频），不能是图片代理地址。 */
  source: string;
  /** 实际显示的静态图地址（可能是图片代理）。 */
  displaySrc: string;
  alt?: string;
  onZoom?: (media: MediaViewerItem) => void;
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'error';

const SOUND_STORAGE_KEY = 'motionPhotoSoundEnabled';

function readSoundPreference(): boolean {
  try {
    const stored = sessionStorage.getItem(SOUND_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

let soundPreferred = readSoundPreference();
let activePlayer: { token: symbol; stop: () => void } | null = null;

function persistSoundPreference(enabled: boolean): void {
  soundPreferred = enabled;
  try {
    sessionStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // 隐私设置可能禁用 sessionStorage，不影响当前页面
  }
}

/**
 * 博客里的 MVIMG 实况照片播放器。
 * 点击图片播放 JPEG 尾部内嵌的视频，再点停止；播放时可切换声音。
 * 图片点击不再走全屏缩放，右下角的放大按钮保留原来的查看器。
 */
export function MotionPhoto({ source, displaySrc, alt, onZoom }: MotionPhotoProps) {
  const [state, setState] = useState<PlayerState>('idle');
  const [status, setStatus] = useState('');
  const [soundOn, setSoundOn] = useState(soundPreferred);

  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const loadVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const activeTokenRef = useRef<symbol | null>(null);
  const stopRef = useRef<(release: boolean) => void>(() => undefined);

  const releaseVideo = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.muted = true;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(
    (release: boolean) => {
      loadVersionRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      loadPromiseRef.current = null;

      const video = videoRef.current;
      if (video) {
        video.pause();
        video.muted = true;
        try {
          video.currentTime = 0;
        } catch {
          // 媒体尚未初始化时不能设置时间，静态图仍可显示
        }
      }

      if (release) releaseVideo();

      if (mountedRef.current) {
        setState('idle');
        setStatus('');
      }

      if (activeTokenRef.current && activePlayer?.token === activeTokenRef.current) {
        activePlayer = null;
      }
      activeTokenRef.current = null;
    },
    [releaseVideo],
  );

  stopRef.current = stop;

  // 组件卸载 / 换图时回收对象地址和网络请求。
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRef.current(true);
    };
  }, []);

  useEffect(() => {
    stopRef.current(true);
    setState('idle');
    setStatus('');
    setSoundOn(soundPreferred);
  }, [source, displaySrc, stop]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => stop(false);
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [stop]);

  const setVideoSound = (video: HTMLVideoElement, enabled: boolean) => {
    video.muted = !enabled;
    setSoundOn(enabled);
  };

  const ensureVideo = useCallback(
    async (version: number): Promise<void> => {
      if (objectUrlRef.current) return;
      if (loadPromiseRef.current) return loadPromiseRef.current;

      const controller = new AbortController();
      abortRef.current = controller;

      const promise = (async () => {
        const { blob } = await loadMotionPhotoVideo(source, controller.signal);
        if (!mountedRef.current || version !== loadVersionRef.current) return;

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        const video = videoRef.current;
        if (!video) {
          URL.revokeObjectURL(objectUrl);
          objectUrlRef.current = null;
          return;
        }
        video.src = objectUrl;
        video.load();
      })().finally(() => {
        if (loadPromiseRef.current === promise) loadPromiseRef.current = null;
        if (abortRef.current === controller) abortRef.current = null;
      });

      loadPromiseRef.current = promise;
      return promise;
    },
    [source],
  );

  const toggle = async () => {
    if (state === 'loading' || state === 'playing') {
      stop(false);
      return;
    }

    const token = Symbol('motion-photo');
    activePlayer?.stop();
    activePlayer = { token, stop: () => stopRef.current(true) };
    activeTokenRef.current = token;

    const version = loadVersionRef.current + 1;
    loadVersionRef.current = version;
    setState('loading');
    setStatus('正在载入动态画面…');

    try {
      await ensureVideo(version);
      if (!mountedRef.current || version !== loadVersionRef.current) return;

      const video = videoRef.current;
      if (!video || !objectUrlRef.current) throw new Error('动态画面尚未准备好');

      video.currentTime = 0;
      const preferred = soundPreferred;
      setVideoSound(video, preferred);

      try {
        await video.play();
        if (!mountedRef.current || version !== loadVersionRef.current) return;
        if (video.paused) throw new Error('动态画面没有开始播放');
        setState('playing');
        setStatus('');
      } catch (error) {
        if (!mountedRef.current || version !== loadVersionRef.current) return;
        const policyBlocked =
          preferred &&
          typeof DOMException !== 'undefined' &&
          error instanceof DOMException &&
          error.name === 'NotAllowedError';

        if (!policyBlocked) throw error;

        setVideoSound(video, false);
        await video.play();
        if (!mountedRef.current || version !== loadVersionRef.current) return;
        setState('playing');
        setStatus('浏览器要求再次点击「声音：关」才能开启声音。');
      }
    } catch (error) {
      if (!mountedRef.current || version !== loadVersionRef.current) return;
      if (
        typeof DOMException !== 'undefined' &&
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      console.warn('实况照片播放失败：', error);
      releaseVideo();
      setState('error');
      setStatus('动态画面无法播放，已保留静态图片。');
      if (activeTokenRef.current === token) {
        activePlayer = null;
        activeTokenRef.current = null;
      }
    }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video || state !== 'playing') return;
    const next = !soundOn;
    video.muted = !next;
    setSoundOn(next);
    persistSoundPreference(next);
    setStatus('');
  };

  const handleExpand = () => {
    stop(false);
    onZoom?.({ src: displaySrc, alt: alt || undefined });
  };

  const description = alt || '未命名照片';
  const triggerLabel =
    state === 'playing'
      ? `暂停实况照片：${description}`
      : state === 'loading'
        ? `取消加载实况照片：${description}`
        : state === 'error'
          ? `重试播放实况照片：${description}`
          : `播放实况照片：${description}`;

  return (
    <span className="not-prose my-3 block w-full">
      <span className="relative block w-full">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-label={triggerLabel}
          aria-busy={state === 'loading'}
          aria-pressed={state === 'playing'}
          className={cn(
            'relative block min-h-[60px] w-full overflow-hidden rounded-xl border p-1.5 text-left transition-colors',
            state === 'error'
              ? 'border-red-400/70'
              : 'border-border/70 hover:border-foreground/30',
            'bg-black/[0.03] dark:bg-black/30',
          )}
        >
          <img
            src={displaySrc}
            alt={alt || ''}
            draggable={false}
            className={cn(
              'block h-auto w-full rounded-lg bg-secondary/20',
              state === 'playing' && 'opacity-0',
            )}
          />
          <video
            ref={videoRef}
            muted
            playsInline
            preload="none"
            aria-hidden="true"
            className={cn(
              'absolute inset-1.5 h-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)] rounded-lg bg-black object-contain',
              state === 'playing' ? 'visible opacity-100' : 'invisible opacity-0',
            )}
          />
          <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/70 px-2.5 py-1 text-[11px] font-semibold leading-none tracking-wide text-white">
            {state === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
            实况
          </span>
        </button>

        {state === 'playing' && (
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className={cn(
              'absolute left-3 top-3 z-20 inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold leading-none backdrop-blur transition-colors',
              soundOn
                ? 'border-cyan-300/60 bg-cyan-950/90 text-cyan-100'
                : 'border-white/40 bg-black/80 text-white hover:bg-black/90',
            )}
          >
            声音：{soundOn ? '开' : '关'}
          </button>
        )}

        <button
          type="button"
          onClick={handleExpand}
          aria-label="放大查看实况照片"
          className="absolute bottom-3 right-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 active:scale-90"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </span>

      {status && (
        <span
          role="status"
          className={cn(
            'mt-2 block text-center text-[11px] leading-relaxed',
            state === 'error' ? 'text-red-500' : 'text-muted-foreground',
          )}
        >
          {status}
        </span>
      )}
    </span>
  );
}
