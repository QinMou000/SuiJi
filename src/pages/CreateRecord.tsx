import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Mic, Link as LinkIcon, X, Check, StopCircle, Upload, Loader2, Image as ImageIcon, Tag as TagIcon, Plus } from 'lucide-react';
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
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  
  // Tagging
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const existingTags = useLiveQuery(() => db.tags.toArray()) || [];
  
  const [pendingMedia, setPendingMedia] = useState<{
    id: string;
    type: 'photo' | 'voice' | 'link';
    data: string;
    preview: string; // For display
    duration?: number;
    linkMetadata?: {
      title?: string;
      description?: string;
      image?: string;
      url?: string;
    };
  }[]>([]);

  // Load existing data if editing
  useEffect(() => {
    if (id) {
      const loadRecord = async () => {
        const record = await db.records.get(id);
        if (record) {
          setTitle(record.title || '');
          setContent(record.content);
          if (record.tags) setSelectedTags(record.tags);
          
          const media = await db.media.where('recordId').equals(id).toArray();
          setPendingMedia(media.map(m => ({
            id: m.id,
            type: m.mediaType,
            data: m.fileData,
            preview: m.mediaType === 'photo' ? m.fileData : (m.linkMetadata?.image || ''),
            duration: m.duration,
            linkMetadata: m.linkMetadata
          })));
        }
      };
      loadRecord();
    }
  }, [id]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

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
    setShowVoiceOptions(false);
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
        setPendingMedia(prev => [...prev, {
          id: uuidv4(),
          type: 'photo',
          data: base64Data,
          preview: base64Data
        }]);
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
        setPendingMedia(prev => [...prev, {
          id: uuidv4(),
          type: 'photo',
          data: base64,
          preview: base64
        }]);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowPhotoOptions(false);
  };

  // --- Voice Handling ---
  const handleVoiceClick = () => {
      setShowVoiceOptions(!showVoiceOptions);
      setShowPhotoOptions(false);
  }

  const handleAudioImportClick = () => {
    audioInputRef.current?.click();
    setShowVoiceOptions(false);
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
             setPendingMedia(prev => [...prev, {
              id: uuidv4(),
              type: 'voice',
              data: base64,
              preview: '',
              duration: Math.round(audio.duration)
            }]);
        };
        // Fallback
        audio.onerror = () => {
             setPendingMedia(prev => [...prev, {
              id: uuidv4(),
              type: 'voice',
              data: base64,
              preview: '',
              duration: 0
            }]);
        };
      };
      reader.readAsDataURL(file);
    }
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const startRecording = async () => {
    setShowVoiceOptions(false);
    try {
      // Explicitly request permission if possible, or just rely on getUserMedia triggering it
      // Note: On Android WebView, we might need to handle permissions in the native layer
      // but getUserMedia should trigger the prompt if not granted.
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setPendingMedia(prev => [...prev, {
            id: uuidv4(),
            type: 'voice',
            data: base64,
            preview: '', // No visual preview for audio
            duration: recordingTime
          }]);
          setRecordingTime(0);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      // Fallback: Check if it's a permission issue
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
          alert('无法访问麦克风。请在系统设置中允许应用访问麦克风权限。');
      } else {
          alert('录音启动失败，请检查设备设置。');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
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
      
      setPendingMedia(prev => [...prev, {
        id: uuidv4(),
        type: 'link',
        data: finalUrl,
        preview: metadata.image || '',
        linkMetadata: metadata
      }]);
    }
  };

  // --- Remove Media ---
  const removeMedia = (id: string) => {
    setPendingMedia(prev => prev.filter(m => m.id !== id));
  };

  // --- Save ---
  const handleSave = async () => {
    if (!content.trim() && pendingMedia.length === 0) return;

    try {
      const recordId = id || uuidv4(); // Use existing ID if editing
      const now = Date.now();

      const newRecord: Record = {
        id: recordId,
        title: title.trim() || undefined,
        content,
        type: pendingMedia.length > 0 ? 'mixed' : 'text',
        tags: selectedTags,
        createdAt: id ? (await db.records.get(id))?.createdAt || now : now, // Keep original creation time
        updatedAt: now
      };

      const newMediaItems: Media[] = pendingMedia.map(pm => ({
        id: pm.id, // Keep existing ID
        recordId: recordId,
        mediaType: pm.type,
        fileData: pm.data,
        duration: pm.duration,
        linkMetadata: pm.linkMetadata,
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          disabled={!content.trim() && pendingMedia.length === 0}
          className="p-2 -mr-2 text-primary disabled:opacity-50"
        >
          <Check className="h-6 w-6" />
        </button>
      </div>

      {/* Top Toolbar - Moved from bottom */}
      <div className="border-b bg-background p-2 z-10">
        {isRecording ? (
          <div className="flex items-center justify-between px-4 py-1 bg-destructive/10 rounded-lg">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-mono text-destructive font-medium">
                  {formatTime(recordingTime)}
                </span>
             </div>
             <button 
               onClick={stopRecording}
               className="flex items-center gap-1 text-destructive font-medium px-3 py-1 rounded-full hover:bg-destructive/10 transition-colors"
             >
               <StopCircle className="h-5 w-5" />
               <span className="text-xs">停止</span>
             </button>
          </div>
        ) : (
          <div className="flex justify-around items-center relative">
            {/* Photo Button */}
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
            
            {/* Voice Button */}
            <div className="relative">
              <button 
                onClick={handleVoiceClick} 
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${showVoiceOptions ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'}`}
              >
                <Mic className="h-6 w-6" />
                <span className="text-[10px]">语音</span>
              </button>
              
              {showVoiceOptions && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-popover border shadow-xl rounded-xl p-1 flex flex-col min-w-[100px] animate-in slide-in-from-top-2 fade-in z-50">
                   <button onClick={startRecording} className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg transition-colors text-left">
                     <Mic className="h-4 w-4" />
                     <span className="text-xs">录音</span>
                   </button>
                   <button onClick={handleAudioImportClick} className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg transition-colors text-left">
                     <Upload className="h-4 w-4" />
                     <span className="text-xs">导入</span>
                   </button>
                </div>
              )}
            </div>

            {/* Link Button */}
            <button 
              onClick={handleLinkClick} 
              disabled={isFetchingLink} 
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              {isFetchingLink ? <Loader2 className="h-6 w-6 animate-spin" /> : <LinkIcon className="h-6 w-6" />}
              <span className="text-[10px]">链接</span>
            </button>
          </div>
        )}
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

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="记下此时此刻..."
          className="w-full flex-1 bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground min-h-[200px]"
          autoFocus
        />

        {/* Media Preview Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {pendingMedia.map(media => (
            <div key={media.id} className="relative aspect-square bg-secondary rounded-lg overflow-hidden flex items-center justify-center group">
              {media.type === 'photo' && (
                <img src={media.preview} alt="preview" className="w-full h-full object-cover" />
              )}
              {media.type === 'voice' && (
                <div className="flex flex-col items-center justify-center text-primary">
                  <Mic className="h-6 w-6 mb-1" />
                  <span className="text-xs">{formatTime(media.duration || 0)}</span>
                </div>
              )}
              {media.type === 'link' && (
                <div className="flex flex-col items-center justify-center text-primary p-2 text-center w-full h-full bg-secondary/50">
                  {media.preview ? (
                     <img src={media.preview} alt="link" className="w-full h-full object-cover absolute opacity-30" />
                  ) : null}
                  <div className="z-10 flex flex-col items-center">
                    <LinkIcon className="h-6 w-6 mb-1" />
                    <span className="text-[10px] line-clamp-2 font-medium">
                        {media.linkMetadata?.title || media.data}
                    </span>
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => removeMedia(media.id)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
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
