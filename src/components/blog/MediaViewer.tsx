import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Play, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MediaViewerItem {
  src: string;
  alt?: string;
  /** 实况照片的伴生视频；存在时展示「播放实况」按钮。 */
  videoSrc?: string;
}

interface MediaViewerProps {
  item: MediaViewerItem | null;
  onClose: () => void;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

interface GestureState {
  mode: 'pan' | 'pinch';
  startOffset: Transform;
  startX: number;
  startY: number;
  startDistance: number;
  startMid: { x: number; y: number };
  startScale: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

/** 硬件返回键先关预览，而不是直接退出文章。 */
let activeClose: (() => void) | null = null;

export function closeActiveMediaViewer(): boolean {
  if (!activeClose) return false;
  activeClose();
  return true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function MediaViewer({ item, onClose }: MediaViewerProps) {
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [interacting, setInteracting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transformRef = useRef(transform);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<GestureState | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const startedOnImageRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const updateTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  const clampTransform = useCallback((next: Transform): Transform => {
    const container = containerRef.current;
    const image = imageRef.current;
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
    if (!container || !image) return { ...next, scale };
    const maxX = Math.max(0, (image.offsetWidth * scale - container.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * scale - container.clientHeight) / 2);
    return {
      scale,
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  }, []);

  // 每次换图 / 关闭时复位。
  useEffect(() => {
    const reset = { scale: 1, x: 0, y: 0 };
    transformRef.current = reset;
    setTransform(reset);
    setShowVideo(false);
    setVideoError(false);
    setInteracting(false);
    pointersRef.current.clear();
    gestureRef.current = null;
    lastTapRef.current = null;
    movedRef.current = false;
    startedOnImageRef.current = false;
  }, [item?.src, item?.videoSrc]);

  // 打开时锁背景滚动，并支持 Esc 关闭。
  useEffect(() => {
    if (!item) return;
    const previousBody = document.body.style.overflow;
    const previousHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousBody;
      document.documentElement.style.overflow = previousHtml;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [item]);

  // 硬件返回键：预览打开时先关闭预览。
  useEffect(() => {
    if (!item) return;
    const close = () => onCloseRef.current();
    activeClose = close;
    return () => {
      if (activeClose === close) activeClose = null;
    };
  }, [item]);

  useEffect(() => {
    if (!showVideo) {
      videoRef.current?.pause();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [showVideo]);

  const playLive = () => {
    if (!item?.videoSrc) return;
    setVideoError(false);
    setShowVideo(true);
    // 在用户手势里直接 play，避免自动播放策略拦掉声音。
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    }
  };

  const stopVideoAndShowImage = () => {
    videoRef.current?.pause();
    setShowVideo(false);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!item || showVideo) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 某些 WebView 不支持 pointer capture，忽略
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setInteracting(true);
    movedRef.current = false;
    // pointer capture 后 pointerup 的 target 可能变成容器，这里记下起点是否在图片上。
    startedOnImageRef.current = imageRef.current?.contains(event.target as Node) ?? false;

    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      const current = transformRef.current;
      gestureRef.current = {
        mode: 'pan',
        startOffset: { ...current },
        startX: event.clientX,
        startY: event.clientY,
        startDistance: 0,
        startMid: { x: event.clientX, y: event.clientY },
        startScale: current.scale,
      };
    } else if (points.length === 2) {
      const [a, b] = points;
      const current = transformRef.current;
      gestureRef.current = {
        mode: 'pinch',
        startOffset: { ...current },
        startX: 0,
        startY: 0,
        startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        startScale: current.scale,
      };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!item || showVideo || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const points = [...pointersRef.current.values()];
    const gesture = gestureRef.current;
    const container = containerRef.current;
    if (!gesture || !container) return;

    if (points.length >= 2) {
      const [a, b] = points;
      if (gesture.mode !== 'pinch') {
        const current = transformRef.current;
        gestureRef.current = {
          mode: 'pinch',
          startOffset: { ...current },
          startX: 0,
          startY: 0,
          startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          startScale: current.scale,
        };
        return;
      }

      const rect = container.getBoundingClientRect();
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const startMid = {
        x: gesture.startMid.x - rect.left,
        y: gesture.startMid.y - rect.top,
      };
      const mid = {
        x: (a.x + b.x) / 2 - rect.left,
        y: (a.y + b.y) / 2 - rect.top,
      };
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const targetScale = clamp(
        gesture.startScale * (distance / Math.max(1, gesture.startDistance)),
        MIN_SCALE,
        MAX_SCALE,
      );
      const anchor = {
        x: (startMid.x - center.x - gesture.startOffset.x) / gesture.startScale,
        y: (startMid.y - center.y - gesture.startOffset.y) / gesture.startScale,
      };
      updateTransform(
        clampTransform({
          scale: targetScale,
          x: mid.x - center.x - anchor.x * targetScale,
          y: mid.y - center.y - anchor.y * targetScale,
        }),
      );
      movedRef.current = true;
      return;
    }

    if (gesture.mode === 'pan' && transformRef.current.scale > 1.001) {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
      updateTransform(
        clampTransform({
          scale: gesture.startScale,
          x: gesture.startOffset.x + dx,
          y: gesture.startOffset.y + dy,
        }),
      );
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const wasSingle = pointersRef.current.size === 1;
    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size === 0) {
      setInteracting(false);
      const gesture = gestureRef.current;
      const container = containerRef.current;
      if (
        wasSingle &&
        gesture?.mode === 'pan' &&
        !movedRef.current &&
        !showVideo &&
        container
      ) {
        const onImage = startedOnImageRef.current;
        if (!onImage && transformRef.current.scale <= 1.001) {
          onCloseRef.current();
          gestureRef.current = null;
          return;
        }

        const now = performance.now();
        const last = lastTapRef.current;
        if (last && now - last.time < 300 && Math.hypot(event.clientX - last.x, event.clientY - last.y) < 28) {
          const rect = container.getBoundingClientRect();
          const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          const center = { x: rect.width / 2, y: rect.height / 2 };
          const current = transformRef.current;
          if (current.scale > 1.2) {
            updateTransform({ scale: 1, x: 0, y: 0 });
          } else {
            const targetScale = 2.5;
            const anchor = {
              x: (point.x - center.x - current.x) / current.scale,
              y: (point.y - center.y - current.y) / current.scale,
            };
            updateTransform(
              clampTransform({
                scale: targetScale,
                x: point.x - center.x - anchor.x * targetScale,
                y: point.y - center.y - anchor.y * targetScale,
              }),
            );
          }
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
        }
      }
      gestureRef.current = null;
      return;
    }

    if (pointersRef.current.size === 1) {
      const [, point] = [...pointersRef.current.entries()][0];
      gestureRef.current = {
        mode: 'pan',
        startOffset: { ...transformRef.current },
        startX: point.x,
        startY: point.y,
        startDistance: 0,
        startMid: { x: point.x, y: point.y },
        startScale: transformRef.current.scale,
      };
    }
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) {
      setInteracting(false);
      gestureRef.current = null;
    }
  };

  // 桌面端滚轮缩放。
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !item) return;
    const onWheel = (event: WheelEvent) => {
      if (showVideo) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const current = transformRef.current;
      const targetScale = clamp(
        current.scale * Math.exp(-event.deltaY * 0.0015),
        MIN_SCALE,
        MAX_SCALE,
      );
      const anchor = {
        x: (point.x - center.x - current.x) / current.scale,
        y: (point.y - center.y - current.y) / current.scale,
      };
      updateTransform(
        clampTransform({
          scale: targetScale,
          x: point.x - center.x - anchor.x * targetScale,
          y: point.y - center.y - anchor.y * targetScale,
        }),
      );
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [item, showVideo, clampTransform, updateTransform]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
    >
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <p className="min-w-0 truncate text-[11px] text-white/60">
          {item.alt || (item.videoSrc ? '实况照片' : '图片预览')}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭预览"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 touch-none select-none items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={event => event.preventDefault()}
      >
        {!showVideo && (
          <img
            ref={imageRef}
            src={item.src}
            alt={item.alt || ''}
            draggable={false}
            className="max-h-full max-w-full object-contain will-change-transform"
            style={{
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
              transition: interacting ? 'none' : 'transform 180ms ease-out',
              touchAction: 'none',
            }}
          />
        )}

        {item.videoSrc && (
          <video
            ref={videoRef}
            src={item.videoSrc}
            controls
            playsInline
            preload="metadata"
            onError={() => {
              setVideoError(true);
              setShowVideo(false);
            }}
            className={cn(
              'max-h-full max-w-full rounded-lg bg-black',
              showVideo ? 'block' : 'hidden',
            )}
          />
        )}
      </div>

      <div className="relative z-20 flex min-h-[4.5rem] items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {item.videoSrc && !showVideo && (
          <button
            type="button"
            onClick={playLive}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20 active:scale-95"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            播放实况
          </button>
        )}
        {showVideo && (
          <button
            type="button"
            onClick={stopVideoAndShowImage}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20 active:scale-95"
          >
            <ImageIcon className="h-4 w-4" />
            查看图片
          </button>
        )}
        {videoError && (
          <p className="absolute inset-x-0 -top-7 text-center text-[11px] text-red-300">
            实况视频加载失败
          </p>
        )}
      </div>
    </div>
  );
}
