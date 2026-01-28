import React from 'react';
import { Record, Media } from '../types';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { Image, Mic, Link as LinkIcon } from 'lucide-react';

interface RecordCardProps {
  record: Record;
  onClick?: () => void;
}

export function RecordCard({ record, onClick }: RecordCardProps) {
  const mediaItems = useLiveQuery(
    () => db.media.where('recordId').equals(record.id).toArray(),
    [record.id]
  );

  const images = mediaItems?.filter(m => m.mediaType === 'photo') || [];
  const voices = mediaItems?.filter(m => m.mediaType === 'voice') || [];
  const links = mediaItems?.filter(m => m.mediaType === 'link') || [];

  // Extract first image from markdown content if no attached images
  const markdownImageMatch = !images.length && record.content 
    ? record.content.match(/!\[.*?\]\((.*?)\)/) 
    : null;
  const markdownImage = markdownImageMatch ? markdownImageMatch[1] : null;

  return (
    <div 
      onClick={onClick}
      className="bg-card text-card-foreground border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          {format(record.createdAt, 'yyyy-MM-dd HH:mm')}
        </div>
        {record.tags && record.tags.length > 0 && (
          <div className="flex gap-1">
            {record.tags.map(tag => (
              <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <p className="whitespace-pre-wrap mb-3 text-base line-clamp-4">
        {record.title ? (
            <span className="font-bold block mb-1">{record.title}</span>
        ) : null}
        {record.content}
      </p>

      {/* Media Previews */}
      <div className="flex gap-2 flex-wrap">
        {images.length > 0 && (
          <div className="flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded">
            <Image size={14} />
            <span>{images.length}</span>
          </div>
        )}
        {voices.length > 0 && (
          <div className="flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded">
            <Mic size={14} />
            <span>{voices.length}</span>
          </div>
        )}
        {links.length > 0 && (
          <div className="flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded">
            <LinkIcon size={14} />
            <span>{links.length}</span>
          </div>
        )}
      </div>
      
      {/* Image Preview Grid if just 1-3 images OR Markdown Image */}
      {(images.length > 0 || markdownImage) && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.length > 0 ? (
            images.slice(0, 3).map((img) => (
              <div key={img.id} className="aspect-square bg-muted rounded overflow-hidden">
                 <img src={img.fileData} alt="preview" className="w-full h-full object-cover" />
              </div>
            ))
          ) : (
            markdownImage && (
              <div className="aspect-square bg-muted rounded overflow-hidden">
                 <img src={markdownImage} alt="markdown preview" className="w-full h-full object-cover" />
              </div>
            )
          )}
        </div>
      )}

      {/* Link Previews */}
      {links.length > 0 && (
        <div className="mt-3 space-y-2">
          {links.map(link => (
            <a 
              key={link.id} 
              href={link.fileData} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block bg-secondary/30 rounded-lg overflow-hidden border hover:bg-secondary/50 transition-colors"
            >
              {link.linkMetadata?.image && (
                <div className="h-32 w-full overflow-hidden">
                   <img src={link.linkMetadata.image} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3">
                 <h4 className="font-medium text-sm line-clamp-1">{link.linkMetadata?.title || link.fileData}</h4>
                 {link.linkMetadata?.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.linkMetadata.description}</p>
                 )}
                 {!link.linkMetadata?.title && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <LinkIcon size={12} />
                        <span className="truncate">{(() => { try { return new URL(link.fileData).hostname } catch { return 'link' } })()}</span>
                    </div>
                 )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
