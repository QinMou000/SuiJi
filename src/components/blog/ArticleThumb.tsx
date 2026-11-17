import { useState } from 'react';
import type { BlogPost } from '../../features/blog/types';
import { resolveImageUrl } from '../../lib/images';
import { cn } from '../../lib/utils';

interface ArticleThumbProps {
  post: BlogPost;
  className?: string;
}

/**
 * 文章缩略图：优先使用文章正文里的第一张图片（盘点时已写入 post.cover）。
 * 列表里只占一个小方块；没有图片或加载失败时退化成分类字符块。
 */
export function ArticleThumb({ post, className }: ArticleThumbProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(post.cover);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-focus/20 via-secondary to-long/20',
          className,
        )}
      >
        <span
          aria-hidden
          className="font-serif-cn text-[1.3rem] font-semibold leading-none text-foreground/35"
        >
          {post.category.slice(0, 1)}
        </span>
        <span className="mt-1 max-w-full truncate px-1 text-[8px] tracking-[0.08em] text-muted-foreground/70">
          {post.category}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-secondary', className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
      />
    </div>
  );
}
