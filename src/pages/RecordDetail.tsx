import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, Trash2, Calendar, Mic, Link as LinkIcon, Share2, Download, X, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';

export function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageProxy, setImageProxy] = useState('');

  useEffect(() => {
    // Check if proxy feature is enabled
    const enabled = localStorage.getItem('suiji_image_proxy_enabled') === 'true';
    if (enabled) {
        setImageProxy('https://images.weserv.nl/?url=');
    } else {
        setImageProxy('');
    }
  }, []);

  const record = useLiveQuery(
    () => db.records.get(id || ''),
    [id]
  );

  const mediaItems = useLiveQuery(
    () => db.media.where('recordId').equals(id || '').toArray(),
    [id]
  );

  const handleDelete = async () => {
    if (confirm('确定要删除这条随记吗？')) {
      await db.transaction('rw', db.records, db.media, async () => {
        await db.records.delete(id!);
        await db.media.where('recordId').equals(id!).delete();
      });
      navigate('/');
    }
  };

  const generateShareCard = async () => {
    if (!contentRef.current) return;
    
    try {
      // Create a clone of the content to capture full height
      const clone = contentRef.current.cloneNode(true) as HTMLElement;
      
      // Setup wrapper to hide the clone from view but keep it rendered
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.top = '0';
      wrapper.style.left = '-9999px';
      wrapper.style.width = `${contentRef.current.offsetWidth}px`;
      // Ensure dark mode class is applied if active
      if (document.documentElement.classList.contains('dark')) {
        wrapper.classList.add('dark');
        clone.classList.add('dark', 'bg-background', 'text-foreground');
      } else {
        clone.classList.add('bg-background', 'text-foreground');
      }
      
      // Force full height and remove overflow constraints
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.classList.remove('overflow-y-auto', 'flex-1', 'h-screen');
      
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Force branding footer to be visible in clone
      const footer = clone.querySelector('.share-card-footer');
      if (footer) {
          footer.classList.remove('hidden');
          footer.classList.add('block');
      }

      const canvas = await html2canvas(clone, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#000000' : '#ffffff',
        scale: 2, // High resolution
        useCORS: true, // Allow cross-origin images
        scrollY: 0,
        windowHeight: clone.scrollHeight
      });
      
      // Cleanup
      document.body.removeChild(wrapper);
      
      const base64 = canvas.toDataURL('image/png');
      const fileName = `share_${Date.now()}.png`;

      // Save to filesystem to get a shareable URI
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache
      });

      await Share.share({
        files: [result.uri],
      });
      
    } catch (e) {
      console.error('Failed to generate share card', e);
      alert('生成卡片失败');
    }
  };

  if (!record) return null;

  const images = mediaItems?.filter(m => m.mediaType === 'photo') || [];
  const voices = mediaItems?.filter(m => m.mediaType === 'voice') || [];
  const links = mediaItems?.filter(m => m.mediaType === 'link') || [];

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto relative pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="font-semibold">详情</span>
        <div className="flex gap-1 -mr-2">
            <button onClick={() => navigate(`/edit/${id}`)} className="p-2 text-primary" title="编辑">
                <Pencil className="h-5 w-5" />
            </button>
            <button onClick={generateShareCard} className="p-2 text-primary" title="分享长图">
                <Share2 className="h-5 w-5" />
            </button>
            <button onClick={handleDelete} className="p-2 text-destructive">
                <Trash2 className="h-5 w-5" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={contentRef}>
        {/* Meta */}
        <div className="flex items-center justify-between">
            <div className="flex items-center text-muted-foreground text-sm gap-2">
              <Calendar size={14} />
              <span>{format(record.createdAt, 'yyyy年MM月dd日 HH:mm')}</span>
            </div>
            {record.tags && record.tags.length > 0 && (
                <div className="flex gap-1">
                    {record.tags.map(tag => (
                        <span key={tag} className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">#{tag}</span>
                    ))}
                </div>
            )}
        </div>

        {/* Title */}
        {record.title && (
          <h1 className="text-2xl font-bold">{record.title}</h1>
        )}

        {/* Text Content (Markdown) */}
        {record.content && (
          <div className="prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    img: ({node, ...props}) => {
                        const [imgSrc, setImgSrc] = useState(props.src);
                        const [hasError, setHasError] = useState(false);

                        // Update src when props or proxy changes
                        React.useEffect(() => {
                            if (!props.src) return;
                            // If local file or base64, don't proxy
                            if (props.src.startsWith('data:') || props.src.startsWith('blob:') || props.src.startsWith('file:') || !props.src.startsWith('http')) {
                                setImgSrc(props.src);
                            } else if (imageProxy && !props.src.startsWith(imageProxy)) {
                                setImgSrc(imageProxy + props.src);
                            } else {
                                setImgSrc(props.src);
                            }
                        }, [props.src, imageProxy]);

                        if (hasError) {
                            return (
                                <div className="w-full h-32 bg-secondary rounded-lg flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center border border-dashed">
                                    <span className="text-xs">图片加载失败</span>
                                    <span className="text-[10px] opacity-70 break-all">{props.src}</span>
                                </div>
                            );
                        }

                        return (
                            <img 
                                {...props} 
                                src={imgSrc}
                                className="rounded-lg shadow-sm cursor-zoom-in bg-secondary/20 min-h-[100px]" 
                                onClick={() => imgSrc && setPreviewImage(imgSrc)}
                                onError={() => setHasError(true)}
                                loading="lazy"
                            />
                        );
                    }
                }}
            >
                {record.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Images */}
        {images.length > 0 && (
          <div className="space-y-4">
            {images.map(img => (
              <img 
                key={img.id} 
                src={img.fileData} 
                alt="detail" 
                className="w-full rounded-lg shadow-sm cursor-zoom-in"
                onClick={() => setPreviewImage(img.fileData)}
              />
            ))}
          </div>
        )}

        {/* Voices */}
        {voices.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">语音</h3>
            {voices.map(voice => (
              <audio 
                key={voice.id} 
                src={voice.fileData} 
                controls 
                className="w-full"
              />
            ))}
          </div>
        )}

        {/* Links */}
        {links.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">链接</h3>
            {links.map(link => (
              <a 
                key={link.id} 
                href={link.fileData} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col gap-2 p-3 bg-secondary rounded-lg text-primary hover:bg-secondary/80 transition-colors border"
              >
                {link.linkMetadata?.image && (
                    <div className="w-full h-32 overflow-hidden rounded-md">
                        <img src={link.linkMetadata.image} alt="link preview" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <LinkIcon size={16} className="shrink-0" />
                    <div className="overflow-hidden min-w-0">
                        <p className="font-medium truncate">{link.linkMetadata?.title || link.fileData}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.linkMetadata?.description || link.fileData}</p>
                    </div>
                </div>
              </a>
            ))}
          </div>
        )}
        
        {/* Branding Footer for Share Card */}
        <div className="pt-8 pb-4 text-center hidden print:block share-card-footer">
            <p className="text-xs text-muted-foreground">—— 随记 (SuiJi)</p>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
        >
            <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
            >
                <X size={24} />
            </button>
            <img 
                src={previewImage} 
                alt="preview" 
                className="max-w-full max-h-full object-contain rounded-md"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
        </div>
      )}
    </div>
  );
}
