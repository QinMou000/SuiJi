import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { BlogPost } from '../../features/blog/types';
import { formatBlogDate } from '../../features/blog/parse';
import { cn } from '../../lib/utils';
import { ArticleThumb } from './ArticleThumb';

interface CascadeStackProps {
  posts: BlogPost[];
  onOpen: (post: BlogPost) => void;
}

/** 横向拖过这个距离才算一次切换，避免轻点抖动误触 */
const SWIPE_DISTANCE = 36;
const DRAG_LIMIT = 90;

/**
 * Focus Cascade 风格的同分类卡片堆：左右滑动切换前一张/后一张，
 * 点最前面那张进入阅读。竖向手势继续交给页面滚动。
 */
export function CascadeStack({ posts, onOpen }: CascadeStackProps) {
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const gesture = useRef<{ id: number; x: number; y: number; dx: number; moved: boolean } | null>(
    null,
  );
  const swallowClick = useRef(false);

  useEffect(() => {
    setActive(0);
  }, [posts]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = gesture.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved) {
      // 竖向滑动留给页面滚动，只有明显的横向拖动才接管
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      state.moved = true;
    }
    state.dx = Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, dx));
    setDrag(state.dx);
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = gesture.current;
    if (!state || state.id !== event.pointerId) return;
    gesture.current = null;
    if (state.moved) {
      swallowClick.current = true;
      if (state.dx <= -SWIPE_DISTANCE) {
        setActive(current => Math.min(posts.length - 1, current + 1));
      } else if (state.dx >= SWIPE_DISTANCE) {
        setActive(current => Math.max(0, current - 1));
      }
    }
    setDrag(0);
  };

  if (posts.length === 0) return null;

  return (
    <div className="relative">
      <div
        className="relative h-[270px] w-full touch-pan-y select-none"
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translateX(${drag * 0.6}px)`,
            transition:
              drag === 0 ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          }}
        >
          {posts.map((post, index) => {
            const offset = index - active;
            const distance = Math.abs(offset);
            const isActive = offset === 0;
            const x = offset * 18;
            const y = distance * 9;
            const rotate = offset * 4;
            const scale = Math.max(0.88, 1 - distance * 0.035);

            return (
              <button
                key={post.id}
                type="button"
                tabIndex={isActive ? 0 : -1}
                aria-hidden={!isActive}
                onClick={() => {
                  if (swallowClick.current) {
                    swallowClick.current = false;
                    return;
                  }
                  if (isActive) onOpen(post);
                }}
                aria-label={isActive ? `阅读 ${post.title}` : undefined}
                className={cn(
                  'absolute left-1/2 top-1/2 h-[218px] w-[calc(100%-3rem)] max-w-[320px] overflow-hidden rounded-card border border-border/70 bg-card text-left shadow-[0_24px_60px_-32px_hsl(var(--glass-shadow)/0.7)]',
                  !isActive && 'pointer-events-none',
                )}
                style={{
                  transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
                  zIndex: 20 - distance,
                  opacity: distance > 2 ? 0 : 1,
                  transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease',
                }}
              >
                <div className="relative h-[112px] overflow-hidden">
                  <ArticleThumb post={post} className="h-full w-full" />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent"
                  />
                </div>
                <div className="px-4 pt-2.5">
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2 py-0.5">{post.category}</span>
                    <span>{formatBlogDate(post.date)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 font-serif-cn text-[15px] font-semibold leading-snug">
                    {post.title}
                  </p>
                  {isActive && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-focus">
                      阅读
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {posts.map((post, index) => (
          <span
            key={post.id}
            aria-hidden
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              index === active ? 'w-4 bg-focus' : 'w-1 bg-border',
            )}
          />
        ))}
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
        左右滑动切换，点击正面卡片阅读
      </p>
    </div>
  );
}
