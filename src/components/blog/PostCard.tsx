import { Link } from 'react-router-dom';
import type { BlogPost } from '../../features/blog/types';
import { formatBlogDate } from '../../features/blog/parse';
import { ArticleThumb } from './ArticleThumb';

interface PostCardProps {
  post: BlogPost;
}

/**
 * 博客列表卡片：整个列表只有这一种样式，不再单独给第一篇大框。
 * 封面缩成右侧一个小方块，卡片之间靠负边距互相叠住，排成一叠卡。
 */
export function PostCard({ post }: PostCardProps) {
  const href = `/blog/${encodeURIComponent(post.id)}`;

  return (
    <Link
      to={href}
      className="stack-card group relative flex items-stretch gap-3 rounded-[22px] border border-border/60 bg-card p-3 transition-transform duration-300 ease-spring active:scale-[0.995]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/15"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          <span className="rounded-full bg-secondary/90 px-2 py-0.5 text-foreground/70">
            {post.category}
          </span>
          <span>{formatBlogDate(post.date)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="whitespace-nowrap">{post.readingMinutes} min</span>
        </div>

        <h3 className="line-clamp-2 font-serif-cn text-[15px] font-semibold leading-[1.4] tracking-tight text-foreground">
          {post.title}
        </h3>

        {post.description && (
          <p className="line-clamp-1 text-[11px] leading-relaxed text-muted-foreground/80">
            {post.description}
          </p>
        )}
      </div>

      <ArticleThumb
        post={post}
        className="h-[72px] w-[72px] shrink-0 self-center rounded-[18px]"
      />
    </Link>
  );
}
