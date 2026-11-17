import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Tag,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState, Skeleton } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { SectionHeading } from '../components/ui/List';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ReadingProgress } from '../components/blog/ReadingProgress';
import { BackToTop } from '../components/blog/BackToTop';
import { ArticleHeader } from '../components/blog/ArticleHeader';
import { CascadeStack } from '../components/blog/CascadeStack';
import { useBlogFeed, useBlogPost } from '../features/blog/useBlog';
import { formatBlogDateLong } from '../features/blog/parse';
import { copyText } from '../lib/share';

export function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { post, error: seedError } = useBlogPost(id);
  const { posts } = useBlogFeed();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 正文原样渲染：卡片里的封面就是正文的第一张图，
  // 文章头已经不铺封面了，再把它从正文里剔掉就等于图片凭空消失。
  const content = post?.content ?? '';

  const related = useMemo(() => {
    if (!post || !posts) return [];
    const sameCategory = posts.filter(
      item =>
        item.id !== post.id &&
        (item.category === post.category ||
          item.categories.some(category => post.categories.includes(category))),
    );
    return sameCategory.slice(0, 3);
  }, [post, posts]);

  const isLoading = !post && !seedError && posts === undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [id]);

  useEffect(() => {
    if (post) document.title = `${post.title} · 汪钦的博客`;
    return () => {
      document.title = '随记 · 博客与专注';
    };
  }, [post]);

  // 正文滚动显影
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        '.blog-prose h2, .blog-prose h3, .blog-prose img, .blog-prose .code-block, .blog-prose blockquote, .blog-prose table',
      ),
    );
    if (nodes.length === 0) return;
    nodes.forEach(node => node.classList.add('article-reveal'));

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach(node => node.classList.add('article-reveal-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('article-reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -36px 0px' },
    );
    nodes.forEach(node => observer.observe(node));

    return () => {
      observer.disconnect();
      nodes.forEach(node => {
        node.classList.remove('article-reveal', 'article-reveal-visible');
      });
    };
  }, [post?.id, content]);

  // 目录已移除，保留正文滚动显影。

  const handleShare = async () => {
    if (!post) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description,
          url: post.sourceUrl,
        });
        return;
      } catch {
        // 用户取消或浏览器不支持，降级复制链接
      }
    }
    const copied = await copyText(post.sourceUrl);
    toast({
      title: copied ? '原文链接已复制' : '复制失败',
      description: copied ? '可以粘贴到浏览器打开。' : '请长按地址栏复制。',
      variant: copied ? 'success' : 'error',
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto min-h-screen max-w-md">
        <PageHeader title="文章" backTo="/blog" />
        <div className="space-y-4 px-4 py-5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto min-h-screen max-w-md">
        <PageHeader title="文章" backTo="/blog" />
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={seedError ? '文章数据加载失败' : '没有找到这篇文章'}
          description={seedError || '它可能已被移除，或链接不完整。'}
          action={
            <Button onClick={() => navigate('/blog')} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              返回博客
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md">
      <ReadingProgress />
      <ArticleHeader
        title={post.title}
        category={post.category}
        onBack={() => navigate('/blog')}
        onShare={() => void handleShare()}
      />

      <article className="page-slide pb-16">
        {/* 文章头：题目 + 分类，正文紧随其后，不再垫一张装饰卡片 */}
        <header className="px-4 pb-1 pt-6">
          <span className="inline-flex items-center rounded-full bg-focus/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-focus">
            {post.category}
          </span>
          <h1 className="mt-3 font-serif-cn text-[1.85rem] font-semibold leading-[1.28] tracking-[-0.02em] text-balance">
            {post.title}
          </h1>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatBlogDateLong(post.date)}
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {post.readingMinutes} 分钟
            </span>
          </div>
        </header>

        <div className="px-4 pt-2">
          <div ref={contentRef} className="mt-1">
            <MarkdownRenderer
              content={content}
              imageBase="https://qinmou000.github.io"
              onImageClick={setPreviewImage}
              className="blog-prose article-body"
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
            <span>写于 {formatBlogDateLong(post.date)}</span>
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              在 Gitee 查看原文
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <section className="mt-9">
              <SectionHeading title="同分类文章" hint="左右滑动切换 · 点击正面卡片阅读" />
              <CascadeStack
                posts={related}
                onOpen={item => navigate(`/blog/${encodeURIComponent(item.id)}`)}
              />
            </section>
          )}

          <div className="mt-7 flex justify-center">
            <Button variant="secondary" onClick={() => navigate('/blog')} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              返回博客
            </Button>
          </div>
        </div>
      </article>

      <BackToTop />

      {previewImage && (
        <div
          className="fixed inset-0 z-[140] flex animate-fade-in items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            aria-label="关闭预览"
            className="absolute right-4 top-[max(env(safe-area-inset-top),1rem)] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewImage}
            alt="文章插图"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={event => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
