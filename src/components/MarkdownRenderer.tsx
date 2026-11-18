import React, { useContext, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { CodeBlock } from './blog/CodeBlock';
import { headingIdForText } from '../features/blog/toc';
import type { MediaViewerItem } from './blog/MediaViewer';
import { MotionPhoto } from './blog/MotionPhoto';
import { isMotionPhotoSource, resolveMotionPhotoSource } from '../features/blog/motionPhoto';

/**
 * 统一的 Markdown 渲染组件（博客正文复用）。
 * GFM 语法、受限 HTML、链接新窗口、远程图片可选代理、代码块主题跟随 + 语法高亮。
 * 图片点击交给上层放大；实况照片通过 data-video 或同名视频自动配对。
 */

interface MarkdownRendererProps {
  content: string;
  onImageClick?: (media: MediaViewerItem) => void;
  className?: string;
  imageBase?: string;
}

interface MarkdownImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageProxy: string;
  imageBase?: string;
  videoSources: string[];
  onZoom?: (media: MediaViewerItem) => void;
  node?: unknown;
}

const VIDEO_EXT_RE = /\.(?:mp4|mov|m4v|webm)(?:[?#]|$)/i;
const VIDEO_URL_RE = /(?:https?:\/\/|\/\/|\.{0,2}\/)[^\s"'<>()]+?\.(?:mp4|mov|m4v|webm)(?:\?[^\s"'<>()]*)?/gi;

/** 链接里的图片不包装交互控件，保留链接原有的跳转语义。 */
const InsideLinkContext = React.createContext(false);

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'video', 'source'],
  attributes: {
    ...defaultSchema.attributes,
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'dataVideo',
      'data-video',
      'dataLiveVideo',
      'data-live-video',
      'dataLive',
      'data-live',
      'dataMotionPhoto',
      'data-motion-photo',
    ],
    video: [
      'src',
      'poster',
      'controls',
      'playsInline',
      'playsinline',
      'preload',
      'loop',
      'muted',
      'autoPlay',
      'autoplay',
      'width',
      'height',
      'className',
      'title',
    ],
    source: ['src', 'type', 'media'],
  },
};

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

/** 视频不走图片代理。 */
function resolveMediaSrc(src: string, imageBase?: string): string {
  return resolveImageSrc(src, '', imageBase);
}

function mediaBasename(url: string): string {
  try {
    const pathname = new URL(url, 'https://local.invalid/').pathname;
    const file = decodeURIComponent(pathname.split('/').pop() || '');
    return file.replace(/\.[^.]+$/, '').toLowerCase();
  } catch {
    return '';
  }
}

function findCompanionVideo(imageSrc: string, videoSources: string[]): string | undefined {
  const imageName = mediaBasename(imageSrc);
  if (!imageName) return undefined;
  return videoSources.find(video => {
    const videoName = mediaBasename(video);
    return (
      videoName === imageName ||
      videoName === `${imageName}-live` ||
      videoName === `${imageName}_live`
    );
  });
}

function extractVideoSources(content: string): string[] {
  const found = new Set<string>();
  const urlPattern = new RegExp(VIDEO_URL_RE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = urlPattern.exec(content))) {
    found.add(match[0]);
  }
  const tagPattern = /<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["']/gi;
  while ((match = tagPattern.exec(content))) {
    found.add(match[1]);
  }
  return [...found];
}

function InlineVideo({
  className,
  ...props
}: React.VideoHTMLAttributes<HTMLVideoElement>) {
  return (
    <video
      {...props}
      controls
      playsInline
      preload="metadata"
      className={cn('my-3 max-h-[70vh] w-full rounded-xl bg-black shadow-sm', className)}
    />
  );
}

function MarkdownImage({
  imageProxy,
  imageBase,
  videoSources,
  onZoom,
  src,
  alt,
  node,
  ...rest
}: MarkdownImageProps) {
  void node;
  const insideLink = useContext(InsideLinkContext);
  const [hasError, setHasError] = useState(false);
  const finalSrc = useMemo(
    () => (typeof src === 'string' ? resolveImageSrc(src, imageProxy, imageBase) : undefined),
    [src, imageProxy, imageBase],
  );

  const attributes = rest as Record<string, unknown>;
  const motionPhotoAttr =
    attributes['data-motion-photo'] ?? attributes['dataMotionPhoto'];

  const isVideo = typeof src === 'string' && VIDEO_EXT_RE.test(src);
  const resolvedVideo = useMemo(() => {
    if (isVideo && typeof src === 'string') return resolveMediaSrc(src, imageBase);

    const explicitCandidate =
      attributes['data-video'] ??
      attributes['dataVideo'] ??
      attributes['data-live-video'] ??
      attributes['dataLiveVideo'] ??
      attributes['data-live'] ??
      attributes['dataLive'];
    const explicit = typeof explicitCandidate === 'string' && explicitCandidate ? explicitCandidate : undefined;
    if (explicit) return resolveMediaSrc(explicit, imageBase);

    if (typeof src === 'string') {
      const companion = findCompanionVideo(src, videoSources);
      if (companion) return resolveMediaSrc(companion, imageBase);
    }
    return undefined;
  }, [isVideo, src, imageBase, videoSources, attributes]);

  const isMotionPhoto =
    !insideLink &&
    isMotionPhotoSource(typeof src === 'string' ? src : '', Boolean(motionPhotoAttr));

  if (isMotionPhoto && finalSrc && typeof src === 'string') {
    return (
      <MotionPhoto
        source={resolveMotionPhotoSource(src, imageBase)}
        displaySrc={finalSrc}
        alt={alt || undefined}
        onZoom={onZoom}
      />
    );
  }

  if (typeof src === 'string' && isVideo) {
    return <InlineVideo src={resolveMediaSrc(src, imageBase)} />;
  }

  if (!finalSrc) return null;

  if (hasError) {
    return (
      <span className="my-2 flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-center text-muted-foreground">
        <span className="text-[11px]">图片加载失败</span>
        <span className="line-clamp-1 max-w-full break-all text-[9px] opacity-60">{src}</span>
      </span>
    );
  }

  const imageProps = { ...rest } as Record<string, unknown>;
  delete imageProps['data-video'];
  delete imageProps.dataVideo;
  delete imageProps['data-live-video'];
  delete imageProps.dataLiveVideo;
  delete imageProps['data-live'];
  delete imageProps.dataLive;
  delete imageProps['data-motion-photo'];
  delete imageProps.dataMotionPhoto;

  const image = (
    <img
      {...imageProps}
      src={finalSrc}
      alt={alt || ''}
      className={cn(
        'min-h-[60px] rounded-xl bg-secondary/20 shadow-sm',
        !insideLink && 'cursor-zoom-in',
      )}
      onClick={event => {
        if (insideLink) return;
        event.preventDefault();
        event.stopPropagation();
        onZoom?.({
          src: finalSrc,
          alt: alt || undefined,
          videoSrc: resolvedVideo,
        });
      }}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );

  if (!resolvedVideo || insideLink) return image;

  return (
    <span className="relative inline-block max-w-full">
      {image}
      <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur">
        <Play className="h-2.5 w-2.5" fill="currentColor" />
        实况
      </span>
    </span>
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
  const videoSources = useMemo(
    () => extractVideoSources(content).map(src => resolveMediaSrc(src, imageBase)),
    [content, imageBase],
  );

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
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          a: ({ children, node, ...props }) => {
            void node;
            return (
              <InsideLinkContext.Provider value={true}>
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
                >
                  {children}
                </a>
              </InsideLinkContext.Provider>
            );
          },
          img: props => (
            <MarkdownImage
              {...props}
              imageProxy={imageProxy}
              imageBase={imageBase}
              videoSources={videoSources}
              onZoom={onImageClick}
            />
          ),
          video: ({ src, poster, className, children, node, ...rest }) => {
            void node;
            return (
              <InlineVideo
                {...rest}
                src={typeof src === 'string' ? resolveMediaSrc(src, imageBase) : undefined}
                poster={
                  typeof poster === 'string'
                    ? resolveImageSrc(poster, imageProxy, imageBase)
                    : undefined
                }
                className={className}
              >
                {children}
              </InlineVideo>
            );
          },
          source: ({ src, node, ...rest }) => {
            void node;
            return (
              <source
                {...rest}
                src={typeof src === 'string' ? resolveMediaSrc(src, imageBase) : undefined}
              />
            );
          },
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
