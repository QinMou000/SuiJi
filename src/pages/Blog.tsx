import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpenText,
  CloudDownload,
  FolderOpen,
  Github,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { AnimatedNumber, EmptyState, Skeleton } from '../components/ui/Feedback';
import { AuroraBackground } from '../components/blog/AuroraBackground';
import { SplitTitle, SmearText } from '../components/blog/HeroType';
import { Reveal } from '../components/blog/Reveal';
import { PostCard } from '../components/blog/PostCard';
import { SyncPanel } from '../components/blog/SyncPanel';
import {
  sourceLabel,
  useBlogCategories,
  useBlogFeed,
  useBlogSync,
} from '../features/blog/useBlog';
import { formatRelativeTime } from '../features/blog/parse';
import { cn } from '../lib/utils';

const PAGE_SIZE = 12;

export function Blog() {
  const { posts, error: seedError, loading, meta } = useBlogFeed();
  const categories = useBlogCategories(posts);
  const { syncing, progress, result, error: syncError, sync, reset } = useBlogSync();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [syncOpen, setSyncOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = '汪钦的博客 · 随记';
    return () => {
      document.title = '随记 · 博客与专注';
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return (posts ?? []).filter(post => {
      if (selectedCategory && !post.categories.includes(selectedCategory)) return false;
      if (!needle) return true;
      return (
        post.title.toLowerCase().includes(needle) ||
        post.description.toLowerCase().includes(needle) ||
        post.category.toLowerCase().includes(needle) ||
        post.tags.some(tag => tag.toLowerCase().includes(needle)) ||
        post.date.includes(needle)
      );
    });
  }, [posts, deferredQuery, selectedCategory]);

  const visiblePosts = filtered.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredQuery, selectedCategory]);

  const handleSync = () => {
    setSyncOpen(true);
    if (syncing) return;
    if (result || syncError) reset();
    void sync();
  };

  const handleHeroMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    const element = heroRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    element.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };

  const handleSearchToggle = () => {
    if (searchOpen) {
      setQuery('');
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
  };

  const readingTotal = useMemo(
    () => (posts ?? []).reduce((total, post) => total + post.readingMinutes, 0),
    [posts],
  );

  return (
    <Layout>
      {/* Hero：极光、网格、聚光与跑马灯 */}
      <section
        ref={heroRef}
        onPointerMove={handleHeroMove}
        className="relative -mx-4 overflow-hidden px-5 pb-6"
        style={{
          // Hero 直接顶到屏幕最上沿，内容再按安全区下沉；
          // 这里不铺不透明底色：让页面自己的背景（含 body 顶光渐变）透上来，
          // 装饰层再用 hero-veil 遮罩往下淡出，底部就不会出现色阶断层。
          marginTop: 'calc(-1 * (env(safe-area-inset-top) + 0.75rem))',
          paddingTop: 'calc(env(safe-area-inset-top) + 1.75rem)',
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <AuroraBackground />
          <div className="spotlight absolute inset-0" />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1 top-2 select-none font-serif-cn text-[7.5rem] italic leading-none text-foreground/[0.045] dark:text-foreground/[0.06]"
        >
          BLOG
        </span>

        <div className="relative z-10">
          <div className="hero-fade flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-focus" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-focus" />
            </span>
            WANG QIN · BLOG
            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-medium tracking-normal">
              <CloudDownload className="h-3 w-3" />
              离线可读
            </span>
            <button
              type="button"
              aria-label={searchOpen ? '关闭搜索' : '搜索文章'}
              aria-expanded={searchOpen}
              onClick={handleSearchToggle}
              className="-mr-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground active:scale-90"
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          <h2
            aria-label="汪钦的博客"
            className="mt-3 font-serif-cn text-[2.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-balance"
          >
            <SplitTitle text="汪钦的博客" />
          </h2>
          <p className="mt-2 max-w-[19rem] text-xs leading-relaxed text-muted-foreground">
            <SmearText delay={430} className="block">
              记录编程、系统与日常思考。
            </SmearText>
            <SmearText delay={560} className="block">
              偶尔写代码，偶尔写自己。
            </SmearText>
          </p>

          <div
            className="hero-fade mt-5 flex items-end justify-between gap-3"
            style={{ animationDelay: '700ms' }}
          >
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber
                    value={posts?.length ?? 0}
                    className="text-xl font-semibold leading-none"
                  />
                  <span className="text-[9px] text-muted-foreground">篇</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">文章</p>
              </div>
              <span className="h-7 w-px bg-border" />
              <div>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber
                    value={categories.length}
                    className="text-xl font-semibold leading-none"
                  />
                  <span className="text-[9px] text-muted-foreground">类</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">分类</p>
              </div>
              <span className="h-7 w-px bg-border" />
              <div>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber
                    value={Math.round(readingTotal / 60)}
                    className="text-xl font-semibold leading-none"
                  />
                  <span className="text-[9px] text-muted-foreground">h</span>
                </div>
                <p className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">阅读</p>
              </div>
            </div>

            <Button
              size="sm"
              data-testid="blog-sync"
              onClick={handleSync}
              disabled={syncing}
              className="relative shrink-0 gap-1.5 overflow-hidden bg-[linear-gradient(110deg,hsl(var(--focus)),hsl(var(--long-break)))] text-white shadow-[0_12px_30px_-14px_hsl(var(--focus)/0.9)] hover:brightness-105"
            >
              <span
                aria-hidden
                className="absolute inset-0 animate-gradient-shift bg-[linear-gradient(110deg,transparent,hsl(0_0%_100%/0.28),transparent)] bg-[length:200%_100%]"
              />
              <RefreshCw className={cn('relative h-3.5 w-3.5', syncing && 'animate-spin')} />
              <span className="relative">{syncing ? '同步中' : '同步博客'}</span>
            </Button>
          </div>

          {searchOpen && (
            <div className="glass-inset relative z-10 mt-4 flex items-center gap-2 rounded-full px-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                data-testid="blog-search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="搜索标题、分类或关键词…"
                aria-label="搜索博客"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="清除搜索"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {sourceLabel(meta.source)} · {formatRelativeTime(meta.lastSyncAt)}
            </span>
            <a
              href="https://qinmou000.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              原站
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://gitee.com/wang-qin928/personal_post"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              Gitee
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/QinMou000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Github className="h-3 w-3" />
              GitHub
            </a>
          </div>
        </div>

        {/* 分类跑马灯 */}
        {categories.length > 0 && (
          <div className="mask-fade-x relative z-10 mt-6 overflow-hidden pt-1">
            <div className="flex w-max animate-marquee gap-5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70 hover:[animation-play-state:paused]">
              {[0, 1].map(copy => (
                <React.Fragment key={copy}>
                  {categories.map(category => (
                    <span key={`${copy}-${category.name}`} className="inline-flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-focus/60" />
                      {category.name}
                    </span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 分类 */}
      <section className="mt-5">
        <div
          data-testid="blog-categories"
          className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95',
              selectedCategory === null
                ? 'bg-foreground text-background shadow-sm'
                : 'glass-inset text-muted-foreground hover:text-foreground',
            )}
          >
            全部
          </button>
          {categories.map(category => (
            <button
              key={category.name}
              type="button"
              onClick={() =>
                setSelectedCategory(current => (current === category.name ? null : category.name))
              }
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95',
                selectedCategory === category.name
                  ? 'bg-foreground text-background shadow-sm'
                  : 'glass-inset text-muted-foreground hover:text-foreground',
              )}
            >
              {category.name}
              <span className="ml-1 text-[9px] opacity-60">{category.count}</span>
            </button>
          ))}
        </div>
      </section>

      {seedError && (posts?.length ?? 0) === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<BookOpenText className="h-6 w-6" />}
            title="文章还没准备好"
            description={seedError}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  重新加载
                </Button>
                <Button onClick={handleSync} className="gap-1.5">
                  <CloudDownload className="h-4 w-4" />
                  从远端同步
                </Button>
              </div>
            }
          />
        </div>
      ) : loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-[104px] w-full rounded-[22px]" />
          <Skeleton className="h-[104px] w-full rounded-[22px]" />
          <Skeleton className="h-[104px] w-full rounded-[22px]" />
          <Skeleton className="h-[104px] w-full rounded-[22px]" />
          <div className="flex items-center justify-center gap-2 py-4 text-[11px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            正在准备离线文章…
          </div>
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="没有匹配的文章"
                description="换个关键词或分类试试。"
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setSearchOpen(false);
                      setSelectedCategory(null);
                    }}
                  >
                    清除筛选
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="stack-list mt-5">
              {visiblePosts.map((post, index) => (
                <Reveal key={post.id} delay={Math.min(index, 5) * 40}>
                  <PostCard post={post} />
                </Reveal>
              ))}
            </div>
          )}

          {filtered.length > visibleCount && (
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
                className="gap-1.5"
              >
                加载更多
                <span className="text-muted-foreground">
                  {filtered.length - visibleCount}
                </span>
              </Button>
            </div>
          )}

          <p className="mt-8 pb-2 text-center text-[10px] leading-relaxed text-muted-foreground/60">
            共 {posts?.length ?? 0} 篇 · 来自 Gitee / GitHub 镜像
            <br />
            点击「同步博客」手动拉取最新文章，内容会缓存到本机。
          </p>
        </>
      )}

      <SyncPanel
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        syncing={syncing}
        progress={progress}
        result={result}
        error={syncError}
        onRetry={handleSync}
      />
    </Layout>
  );
}
