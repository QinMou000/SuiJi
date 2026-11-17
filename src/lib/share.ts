import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { saveAs } from 'file-saver';

/**
 * 跨平台分享工具。
 * 原生端（Android/iOS）：写入文件系统后调起系统分享面板；
 * Web 端：优先 Web Share API，降级为浏览器下载 / 剪贴板复制。
 */

export type ShareOutcome = 'shared' | 'saved' | 'copied';

/** 申请公共存储权限，返回可写目录（拿不到权限则退回应用缓存目录） */
export async function resolveNativeDirectory(): Promise<Directory> {
  try {
    const perm = await Filesystem.requestPermissions();
    if (perm.publicStorage === 'granted') return Directory.Documents;
  } catch {
    // 权限接口不可用时静默退回缓存目录
  }
  return Directory.Cache;
}

/** Web 端尝试通过 Web Share API 分享文件，失败返回 false */
async function webShareFile(file: File, title: string): Promise<boolean> {
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch {
    // 用户取消或浏览器拒绝，交由调用方降级
    return false;
  }
}

/** 分享/导出一个 Markdown 文本文件 */
export async function shareMarkdownFile(
  fileName: string,
  content: string,
  title: string,
): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    const directory = await resolveNativeDirectory();
    const result = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory,
      encoding: Encoding.UTF8,
    });
    await Share.share({ files: [result.uri], title });
    return 'shared';
  }

  const file = new File([content], fileName, { type: 'text/markdown' });
  if (await webShareFile(file, title)) return 'shared';
  saveAs(new Blob([content], { type: 'text/markdown;charset=utf-8' }), fileName);
  return 'saved';
}

/** 分享/保存一张 PNG 长图（dataUrl 为 canvas.toDataURL 结果） */
export async function shareImage(
  fileName: string,
  dataUrl: string,
  title: string,
): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    const directory = await resolveNativeDirectory();
    const result = await Filesystem.writeFile({
      path: fileName,
      // Filesystem 二进制写入要求纯 base64，去掉 dataUrl 头
      data: dataUrl.split(',')[1] ?? dataUrl,
      directory,
    });
    await Share.share({ files: [result.uri], title });
    return 'shared';
  }

  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: 'image/png' });
  if (await webShareFile(file, title)) return 'shared';
  saveAs(blob, fileName);
  return 'saved';
}

/** 分享纯文本（无系统分享能力时降级为复制到剪贴板） */
export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title, text });
    return 'shared';
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch {
      // 用户取消则继续走复制降级
    }
  }
  await copyText(text);
  return 'copied';
}

/** 复制文本到剪贴板（带旧浏览器降级） */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}
