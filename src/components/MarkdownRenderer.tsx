import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '../lib/utils';
import { CodeBlock } from './blog/CodeBlock';
import { headingIdForText } from '../features/blog/toc';

/**
 * 统一的 Markdown 渲染组件（博客正文复用）。
 * GFM 语法、受限 HTML、链接新窗口、远程图片可选代理、代码块主题跟随 + 语法高亮。
 */

interface MarkdownRendererProps {
  content: string;
  onImageClick?: (src: string) => void;
  className?: string;
  imageBase?: string;
}

interface MarkdownImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageProxy: string;
  imageBase?: string;
  onZoom?: (src: string) => void;
}

function readImageProxy(): string {
  return localStorage.getItem('suiji_image_proxy_enabled') === 'true'
    ? 'https://images.weserv.nl/?url='
    : '';
}

function resolveImageSrc(src: string, imageProxy: string, imageBase?: string): string {
  let resolved = src;
  if (imageBase && /^(\.{0,2}\/)/.test(src)) {
    try {
      resolved = new URL(src, imageBase.endsWith('/') ? imageBase : `${imageBase}/`).toString();
    } catch {
      resolved = src;
    }
  }
  if (!resolved.startsWith('http')) return resolved;
  if (imageProxy && !resolved.startsWith(imageProxy)) return imageProxy + resolved;
  return resolved;
}

function MarkdownImage({ imageProxy, imageBase, onZoom, src, alt, ...rest }: MarkdownImageProps) {
  const [hasError, setHasError] = useState(false);
  const finalSrc = useMemo(
    () => (typeof src === 'string' ? resolveImageSrc(src, imageProxy, imageBase) : undefined),
    [src, imageProxy, imageBase],
  );

  if (!finalSrc) return null;

  if (hasError) {
    return (
      <span className="my-2 flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-center text-muted-foreground">
        <span className="text-[11px]">图片加载失败</span>
        <span className="line-clamp-1 max-w-full break-all text-[9px] opacity-60">{src}</span>
      </span>
    );
  }

  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt || ''}
      className="min-h-[60px] cursor-zoom-in rounded-xl bg-secondary/20 shadow-sm"
      onClick={() => onZoom?.(finalSrc)}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

function nodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/** 观察 html.dark，确保代码块跟随系统/主题切换即时变色。 */
function useDocumentIsDark(): boolean {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function MarkdownRenderer({
  content,
  onImageClick,
  className,
  imageBase,
}: MarkdownRendererProps) {
  const imageProxy = useMemo(readImageProxy, []);
  const isDark = useDocumentIsDark();

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none leading-relaxed',
        'prose-headings:font-bold prose-p:my-2 prose-pre:rounded-xl prose-pre:bg-secondary/70',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-code:rounded-md prose-code:bg-secondary/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal',
        'prose-blockquote:border-l-primary/40 prose-blockquote:not-italic',
        'prose-img:my-3 prose-hr:border-border',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          a: props => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
            />
          ),
          img: props => (
            <MarkdownImage
              {...props}
              imageProxy={imageProxy}
              imageBase={imageBase}
              onZoom={onImageClick}
            />
          ),
          h1: ({ children }) => <h1 id={headingIdForText(nodeText(children))}>{children}</h1>,
          h2: ({ children }) => <h2 id={headingIdForText(nodeText(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingIdForText(nodeText(children))}>{children}</h3>,
          pre: ({ children }) => {
            const child = React.Children.toArray(children).find(React.isValidElement) as
              | React.ReactElement<{ className?: string; children?: React.ReactNode }>
              | undefined;
            if (!child) return <pre>{children}</pre>;
            const language = /language-([\w+#.-]+)/.exec(child.props.className || '')?.[1] || 'text';
            const code = nodeText(child.props.children).replace(/\n$/, '');
            return <CodeBlock code={code} language={language} isDark={isDark} />;
          },
          code: ({ children }) => <code>{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
