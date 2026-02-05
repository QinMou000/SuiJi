import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Mic, Link as LinkIcon, X, Check, Upload, Loader2, Image as ImageIcon, Plus, ChevronUp, ChevronDown, Trash2, Type } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Record, Media } from '../types';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

export function CreateRecord() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Check if editing
  const [title, setTitle] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  
  // Tagging
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const existingTags = useLiveQuery(() => db.tags.toArray()) || [];
  
  type Block =
    | { id: string; kind: 'text'; text: string }
    | { id: string; kind: 'photo'; data: string }
    | { id: string; kind: 'voice'; data: string; duration?: number }
    | { id: string; kind: 'link'; data: string; linkMetadata?: { title?: string; description?: string; image?: string; url?: string } };

  const [blocks, setBlocks] = useState<Block[]>([{ id: uuidv4(), kind: 'text', text: '' }]);

  // Load existing data if editing
  useEffect(() => {
    if (id) {
      const loadRecord = async () => {
        const record = await db.records.get(id);
        if (record) {
          setTitle(record.title || '');
          try {
            const parsed = JSON.parse(record.content) as Block[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setBlocks(parsed);
            } else {
              setBlocks([{ id: uuidv4(), kind: 'text', text: record.content }]);
            }
          } catch {
            setBlocks([{ id: uuidv4(), kind: 'text', text: record.content }]);
          }
          if (record.tags) setSelectedTags(record.tags);
          
          const media = await db.media.where('recordId').equals(id).toArray();
          if (media.length > 0) {
            setBlocks(prev => {
              const existingIds = new Set(prev.map(b => b.id));
              const extraBlocks: Block[] = media
                .filter(m => !existingIds.has(m.id))
                .map(m => {
                  if (m.mediaType === 'photo') return { id: m.id, kind: 'photo', data: m.fileData };
                  if (m.mediaType === 'voice') return { id: m.id, kind: 'voice', data: m.fileData, duration: m.duration };
                  return { id: m.id, kind: 'link', data: m.fileData, linkMetadata: m.linkMetadata };
                });
              const withText = prev.length > 0 ? prev : [{ id: uuidv4(), kind: 'text' as const, text: '' }];
              return [...withText, ...extraBlocks];
            });
          }
        }
      };
      loadRecord();
    }
  }, [id]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // --- Tag Handling ---
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(prev => prev.filter(t => t !== tagName));
    } else {
      setSelectedTags(prev => [...prev, tagName]);
    }
  };

  const handleAddTag = async () => {
    if (newTag.trim()) {
      const tagName = newTag.trim();
      // Add to local selection
      if (!selectedTags.includes(tagName)) {
        setSelectedTags(prev => [...prev, tagName]);
      }
      // Save to DB if not exists
      try {
        const exists = await db.tags.where('name').equals(tagName).first();
        if (!exists) {
          await db.tags.add({ name: tagName });
        }
      } catch (e) {
        console.error("Failed to add tag", e);
      }
      setNewTag('');
      setShowTagInput(false);
    }
  };

  // --- Photo Handling ---
  const handlePhotoClick = () => {
    setShowPhotoOptions(!showPhotoOptions);
  };

  const takePhoto = async (source: CameraSource) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source
      });

      if (image.base64String) {
        const base64Data = `data:image/${image.format};base64,${image.base64String}`;
        setBlocks(prev => [...prev, { id: uuidv4(), kind: 'photo', data: base64Data }]);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
    setShowPhotoOptions(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setBlocks(prev => [...prev, { id: uuidv4(), kind: 'photo', data: base64 }]);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowPhotoOptions(false);
  };

  // --- Voice Handling ---
  const handleAudioImportClick = () => {
    audioInputRef.current?.click();
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        // Try to get duration
        const audio = new Audio(base64);
        audio.onloadedmetadata = () => {
             setBlocks(prev => [...prev, { id: uuidv4(), kind: 'voice', data: base64, duration: Math.round(audio.duration) }]);
        };
        // Fallback
        audio.onerror = () => {
             setBlocks(prev => [...prev, { id: uuidv4(), kind: 'voice', data: base64, duration: 0 }]);
        };
      };
      reader.readAsDataURL(file);
    }
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // --- Link Handling (Enhanced) ---
  const fetchLinkPreview = async (url: string) => {
    setIsFetchingLink(true);
    try {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            return {
                title: data.data.title,
                description: data.data.description,
                image: data.data.image?.url,
                url: data.data.url
            };
        }
    } catch (error) {
        console.error("Failed to fetch link preview", error);
    } finally {
        setIsFetchingLink(false);
    }
    return { url };
  };

  const handleLinkClick = async () => {
    const url = prompt('请输入链接 URL:');
    if (url) {
      let finalUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
          finalUrl = 'https://' + url;
      }
      
      // Optimistically add placeholder or wait? 
      // Let's wait but show global loading if needed. 
      // Since prompt is blocking, we just start async.
      
      const metadata = await fetchLinkPreview(finalUrl);
      
      setBlocks(prev => [...prev, { id: uuidv4(), kind: 'link', data: finalUrl, linkMetadata: metadata }]);
    }
  };

  // --- Remove Media ---
  const removeBlock = (blockId: string) => {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== blockId);
      if (next.length === 0) return [{ id: uuidv4(), kind: 'text', text: '' }];
      if (!next.some(b => b.kind === 'text')) return [{ id: uuidv4(), kind: 'text', text: '' }, ...next];
      return next;
    });
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const addTextBlock = () => {
    setBlocks(prev => [...prev, { id: uuidv4(), kind: 'text', text: '' }]);
  };

  // --- Save ---
  const handleSave = async () => {
    const hasAnyText = blocks.some(b => b.kind === 'text' && b.text.trim());
    const hasAnyMedia = blocks.some(b => b.kind !== 'text');
    if (!title.trim() && !hasAnyText && !hasAnyMedia) return;

    try {
      const recordId = id || uuidv4(); // Use existing ID if editing
      const now = Date.now();

      const newRecord: Record = {
        id: recordId,
        title: title.trim() || undefined,
        content: JSON.stringify(blocks),
        type: 'blocks',
        tags: selectedTags,
        createdAt: id ? (await db.records.get(id))?.createdAt || now : now, // Keep original creation time
        updatedAt: now
      };

      const newMediaItems: Media[] = blocks
        .filter((b): b is Exclude<Block, { kind: 'text' }> => b.kind !== 'text')
        .map(b => ({
          id: b.id,
          recordId,
          mediaType: b.kind,
          fileData: b.data,
          duration: b.kind === 'voice' ? b.duration : undefined,
          linkMetadata: b.kind === 'link' ? b.linkMetadata : undefined,
          createdAt: now
        }));

      await db.transaction('rw', db.records, db.media, async () => {
        await db.records.put(newRecord); // put() handles both add and update
        // For media, simplest is to delete old and add new (to handle removals)
        if (id) {
            await db.media.where('recordId').equals(id).delete();
        }
        if (newMediaItems.length > 0) {
          await db.media.bulkAdd(newMediaItems);
        }
      });

      navigate(-1); // Go back
    } catch (err) {
      console.error('Failed to save record:', err);
      alert('保存失败，请重试');
    }
  };

  const handleBack = () => {
    navigate('/', { replace: true });
  };

  const canSave = Boolean(
    title.trim() ||
      blocks.some(b => (b.kind === 'text' ? b.text.trim() : true))
  );

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto relative pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0 bg-background z-20">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="font-semibold">新随记</span>
        <button 
          onClick={handleSave}
          disabled={!canSave}
          className="p-2 -mr-2 text-primary disabled:opacity-50"
        >
          <Check className="h-6 w-6" />
        </button>
      </div>

      {/* Top Toolbar - Moved from bottom */}
      <div className="border-b bg-background p-2 z-10">
        <div className="flex justify-around items-center relative">
          <button
            onClick={addTextBlock}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
          >
            <Type className="h-6 w-6" />
            <span className="text-[10px]">文本</span>
          </button>

          <div className="relative">
            <button 
              onClick={handlePhotoClick} 
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${showPhotoOptions ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'}`}
            >
              <Camera className="h-6 w-6" />
              <span className="text-[10px]">照片</span>
            </button>
            
            {showPhotoOptions && (
              <div className="absolute top-full left-0 mt-2 bg-popover border shadow-xl rounded-xl p-1 flex flex-col min-w-[100px] animate-in slide-in-from-top-2 fade-in z-50">
                 <button onClick={() => takePhoto(CameraSource.Camera)} className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg transition-colors text-left">
                   <Camera className="h-4 w-4" />
                   <span className="text-xs">拍照</span>
                 </button>
                 <button onClick={() => takePhoto(CameraSource.Photos)} className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg transition-colors text-left">
                   <ImageIcon className="h-4 w-4" />
                   <span className="text-xs">相册</span>
                 </button>
              </div>
            )}
          </div>

          <button
            onClick={handleAudioImportClick}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
          >
            <Mic className="h-6 w-6" />
            <span className="text-[10px]">语音</span>
          </button>

          <button 
            onClick={handleLinkClick} 
            disabled={isFetchingLink} 
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors disabled:opacity-50"
          >
            {isFetchingLink ? <Loader2 className="h-6 w-6 animate-spin" /> : <LinkIcon className="h-6 w-6" />}
            <span className="text-[10px]">链接</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {/* Tags Selection Area */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium animate-in zoom-in">
              {tag}
              <button onClick={() => toggleTag(tag)}><X size={12} /></button>
            </span>
          ))}
          <button 
            onClick={() => setShowTagInput(true)} 
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary transition-colors ${showTagInput ? 'hidden' : ''}`}
          >
            <Plus size={12} />
            标签
          </button>
          
          {showTagInput && (
            <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                onBlur={() => { if (!newTag) setShowTagInput(false) }}
                className="h-6 w-24 rounded-md border bg-transparent px-2 text-xs outline-none focus:border-primary"
                placeholder="新标签..."
                autoFocus
              />
              <button onClick={handleAddTag} disabled={!newTag} className="text-primary disabled:opacity-50"><Check size={14} /></button>
            </div>
          )}
        </div>
        
        {/* Quick Select Existing Tags */}
        {(existingTags.length > 0 && (showTagInput || selectedTags.length === 0)) && (
           <div className="flex flex-wrap gap-2 mb-4 p-2 bg-secondary/30 rounded-lg">
             <span className="text-[10px] text-muted-foreground w-full">推荐标签:</span>
             {existingTags.filter(t => !selectedTags.includes(t.name)).map(tag => (
               <button 
                 key={tag.id} 
                 onClick={() => toggleTag(tag.name)}
                 className="px-2 py-1 rounded-md bg-background border text-[10px] text-muted-foreground hover:text-primary transition-colors"
               >
                 {tag.name}
               </button>
             ))}
           </div>
        )}

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题 (可选)"
          className="w-full bg-transparent text-xl font-bold placeholder:text-muted-foreground/50 border-none outline-none mb-2"
        />

        <div className="space-y-3">
          {blocks.map((block, idx) => (
            <div key={block.id} className="border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 border-b bg-secondary/20">
                <div className="text-[10px] text-muted-foreground">
                  {block.kind === 'text' ? '文本' : block.kind === 'photo' ? '照片' : block.kind === 'voice' ? '语音' : '链接'}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveBlock(block.id, -1)}
                    disabled={idx === 0}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveBlock(block.id, 1)}
                    disabled={idx === blocks.length - 1}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeBlock(block.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {block.kind === 'text' && (
                <textarea
                  value={block.text}
                  onChange={(e) =>
                    setBlocks(prev =>
                      prev.map(b => (b.id === block.id && b.kind === 'text' ? { ...b, text: e.target.value } : b))
                    )
                  }
                  placeholder="记下此时此刻..."
                  className="w-full min-h-[120px] bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground p-3"
                  autoFocus={idx === 0}
                />
              )}

              {block.kind === 'photo' && (
                <img src={block.data} alt="photo" className="w-full max-h-[420px] object-cover" />
              )}

              {block.kind === 'voice' && (
                <div className="p-3">
                  <audio controls src={block.data} className="w-full" />
                </div>
              )}

              {block.kind === 'link' && (
                <a
                  href={block.data}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    {block.linkMetadata?.image && (
                      <div className="w-full h-32 overflow-hidden rounded-lg bg-secondary/20">
                        <img src={block.linkMetadata.image} alt="link" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{block.linkMetadata?.title || block.data}</p>
                        <p className="text-xs text-muted-foreground truncate">{block.linkMetadata?.description || block.data}</p>
                      </div>
                    </div>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileChange}
      />
    </div>
  );
}
