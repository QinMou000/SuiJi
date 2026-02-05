import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Moon, Sun, Smartphone, Download, Loader2, Database, Upload, Globe, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Layout } from '../components/Layout';
import { db } from '../db';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, themeMode } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [imageProxyEnabled, setImageProxyEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFullExporting, setIsFullExporting] = useState(false);
  const [isFullImporting, setIsFullImporting] = useState(false);
  const fullBackupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedEnabled = localStorage.getItem('suiji_image_proxy_enabled') === 'true';
    setImageProxyEnabled(savedEnabled);
  }, []);

  const handleProxyToggle = () => {
    const newState = !imageProxyEnabled;
    setImageProxyEnabled(newState);
    localStorage.setItem('suiji_image_proxy_enabled', String(newState));
  };

  const handleFullExport = async () => {
    try {
      setIsFullExporting(true);
      
      const data = {
        version: 2,
        timestamp: Date.now(),
        records: await db.records.toArray(),
        media: await db.media.toArray(),
        tags: await db.tags.toArray(),
        countdowns: await db.countdowns.toArray(),
      };

      const jsonString = JSON.stringify(data);
      const fileName = `Suiji_FullBackup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: 'utf8' as any
        });

        await Share.share({
          files: [result.uri],
          title: '随记全量备份',
        });
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        saveAs(blob, fileName);
      }

      alert('备份导出成功！');
    } catch (e) {
      console.error('Full export failed', e);
      alert('备份失败，请重试');
    } finally {
      setIsFullExporting(false);
    }
  };

  const handleFullImportClick = () => {
    if (window.confirm('恢复备份将合并现有数据，如果有相同ID的数据将被覆盖。建议先进行备份。确定要继续吗？')) {
        fullBackupInputRef.current?.click();
    }
  };

  const handleFullImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFullImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.timestamp || !Array.isArray(data.records)) {
        throw new Error('无效的备份文件格式');
      }

      await db.transaction('rw', [db.records, db.media, db.tags, db.countdowns], async () => {
        if (data.records?.length) await db.records.bulkPut(data.records);
        if (data.media?.length) await db.media.bulkPut(data.media);
        if (data.tags?.length) await db.tags.bulkPut(data.tags);
        if (data.countdowns?.length) await db.countdowns.bulkPut(data.countdowns);
      });

      alert('数据恢复成功！');
      window.location.reload(); // Reload to refresh data
    } catch (error: any) {
      console.error('Import failed', error);
      alert(`恢复失败: ${error.message}`);
    } finally {
      setIsFullImporting(false);
      if (fullBackupInputRef.current) fullBackupInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const records = await db.records.toArray();
      const zip = new JSZip();
      
      const folderName = `Suiji_Export_${format(new Date(), 'yyyyMMdd_HHmm')}`;
      const folder = zip.folder(folderName);

      if (!folder) throw new Error('Failed to create zip folder');

      // Add records
      for (const record of records) {
        const dateStr = format(record.createdAt, 'yyyy-MM-dd');
        const timeStr = format(record.createdAt, 'HH-mm-ss');
        let previewText = record.title || '';
        let exportBody = record.content;
        if (record.type === 'blocks') {
          try {
            const blocks = JSON.parse(record.content) as Array<{ kind: string; text?: string; data?: string }>;
            const textFromBlocks = blocks
              .map(b => {
                if (b.kind === 'text' && typeof b.text === 'string') return b.text;
                if (b.kind === 'link' && typeof b.data === 'string') return b.data;
                if (b.kind === 'photo') return '[照片]';
                if (b.kind === 'voice') return '[语音]';
                return '';
              })
              .filter(Boolean)
              .join('\n\n');
            exportBody = textFromBlocks;
            if (!previewText) previewText = textFromBlocks.slice(0, 20);
          } catch {
            exportBody = '';
          }
        } else if (!previewText) {
          previewText = record.content.slice(0, 20);
        }
        const title = previewText.replace(/[\\/:*?"<>|]/g, '_') || 'Untitled';
        const filename = `${dateStr}_${timeStr}_${title}.md`;

        const tagsContent = record.tags?.length 
            ? `---\ntags: [${record.tags.join(', ')}]\ndate: ${format(record.createdAt, 'yyyy-MM-dd HH:mm:ss')}\n---\n\n` 
            : `> Date: ${format(record.createdAt, 'yyyy-MM-dd HH:mm:ss')}\n\n`;

        const content = `${tagsContent}${exportBody}`;
        folder.file(filename, content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });

      if (Capacitor.isNativePlatform()) {
        // Native: Save to filesystem and Share
        const fileName = `${folderName}.zip`;
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });

        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache
        });

        await Share.share({
            files: [result.uri],
            title: '导出随记备份',
        });

      } else {
        // Web: Download
        saveAs(blob, `${folderName}.zip`);
      }

      alert('导出成功！');
    } catch (e) {
      console.error('Export failed', e);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let errorMsg = '';

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.toLowerCase().endsWith('.md') && !file.name.toLowerCase().endsWith('.markdown')) continue;

        let text = await file.text();
        // Remove BOM if present
        text = text.replace(/^\uFEFF/, '');
        
        let data: any = {};
        let content = text;

        try {
            const parsed = matter(text);
            data = parsed.data;
            content = parsed.content;
        } catch (err) {
            console.warn('Front Matter parse error, treating as plain text:', err);
            // Fallback: manual regex for basic front matter or just plain text
            // For now, just treat as plain text if matter fails
        }
        
        // Parse metadata
        let createdAt = Date.now();
        if (data.date) {
            const dateObj = new Date(data.date);
            if (!isNaN(dateObj.getTime())) {
                createdAt = dateObj.getTime();
            }
        }

        let tags: string[] = [];
        if (data.categories) {
            const cats = Array.isArray(data.categories) ? data.categories : [String(data.categories)];
            tags = [...tags, ...cats];
        }
        if (data.tags) {
            const tgs = Array.isArray(data.tags) ? data.tags : [String(data.tags)];
            tags = [...tags, ...tgs];
        }

        // Save tags to DB
        for (const tag of tags) {
            try {
                const exists = await db.tags.where('name').equals(tag).first();
                if (!exists) {
                    await db.tags.add({ name: tag });
                }
            } catch {}
        }

        // Save Record
        await db.records.add({
            id: uuidv4(),
            content: content.trim(),
            type: 'text',
            tags: tags,
            createdAt: createdAt,
            updatedAt: Date.now()
        });
        
        successCount++;
      }
      if (successCount > 0) {
        alert(`成功导入 ${successCount} 篇笔记！`);
      } else {
        alert('未找到有效的 Markdown 文件或导入失败。');
      }
    } catch (error: any) {
      console.error('Import failed', error);
      errorMsg = error.message || String(error);
      alert(`导入失败: ${errorMsg}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">数据管理</h2>
          <div className="bg-card border rounded-lg overflow-hidden divide-y">
            <button
              onClick={handleFullExport}
              disabled={isFullExporting}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <span className="font-medium">全量备份 (JSON)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">包含笔记、倒数日等所有数据</p>
                </div>
              </div>
              {isFullExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-muted-foreground" />}
            </button>

            <button
              onClick={handleFullImportClick}
              disabled={isFullImporting}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-primary" />
                 <div className="text-left">
                  <span className="font-medium">恢复备份 (JSON)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">从 JSON 备份文件恢复所有数据</p>
                </div>
              </div>
              {isFullImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs text-muted-foreground">慎用</span>}
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5" />
                <span>导出笔记 (Markdown)</span>
              </div>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-muted-foreground" />}
            </button>

            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5" />
                <span>导入 Markdown 文件</span>
              </div>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs text-muted-foreground">支持批量</span>}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            全量备份包含所有应用数据，Markdown 导出仅包含笔记内容。
          </p>
        </section>

        {/* Hidden Input for Full Backup Import */}
        <input 
            type="file" 
            ref={fullBackupInputRef} 
            onChange={handleFullImport} 
            accept=".json" 
            className="hidden" 
        />

        {/* Hidden Input for Markdown Import */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileImport} 
            accept=".md" 
            multiple 
            className="hidden" 
        />

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">网络</h2>
          <div className="bg-card border rounded-lg overflow-hidden divide-y">
            <button 
                onClick={handleProxyToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5" />
                    <div className="text-left">
                        <span>增强图片加载</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            使用公共代理加速图片。如果您已开启系统代理 (VPN/Clash)，请关闭此选项。
                        </p>
                    </div>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${imageProxyEnabled ? 'bg-primary' : 'bg-secondary'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${imageProxyEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">外观</h2>
          <div className="bg-card border rounded-lg overflow-hidden divide-y">
            <button
              onClick={() => setTheme('light')}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5" />
                <span>浅色模式</span>
              </div>
              {themeMode === 'light' && <div className="h-2 w-2 rounded-full bg-primary" />}
            </button>
            
            <button
              onClick={() => setTheme('dark')}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5" />
                <span>深色模式</span>
              </div>
              {themeMode === 'dark' && <div className="h-2 w-2 rounded-full bg-primary" />}
            </button>

            <button
              onClick={() => setTheme('system')}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5" />
                <span>跟随系统</span>
              </div>
              {themeMode === 'system' && <div className="h-2 w-2 rounded-full bg-primary" />}
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">关于</h2>
          <div className="bg-card border rounded-lg p-4 text-center">
            <h3 className="font-bold text-lg mb-1">随记</h3>
            <p className="text-xs text-muted-foreground mb-4">v1.0.0</p>
            <p className="text-sm text-muted-foreground">
              随时随地记录生活点滴
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
