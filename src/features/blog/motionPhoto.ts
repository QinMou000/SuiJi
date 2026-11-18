/**
 * 实况照片（Motion Photo）读取。
 *
 * 博客里的 MVIMG_*.jpg 不是普通静态图：JPEG 尾部嵌了一段 MP4/MOV，
 * XMP 里记录了视频长度。这里按博客主题的实现移植：
 * - 先 Range 读取文件头 128KB，解析 XMP 里的视频长度；
 * - 再 Range 读取文件尾部，取出视频并校验 ftyp；
 * - 原始 GitHub 地址优先换成 gcore.jsdelivr，避免 WebView 直连 raw.githubusercontent 的跨域/网络问题。
 */

const METADATA_BYTES = 128 * 1024;
const MAX_VIDEO_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_BYTES = 128 * 1024 * 1024;

export class MotionPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MotionPhotoError';
  }
}

export interface MotionPhotoVideo {
  blob: Blob;
  mimeType: string;
}

interface MotionPhotoMetadata {
  videoLength: number;
  mimeType: string;
  fileLength?: number;
  fullFileBuffer?: ArrayBuffer;
  source: string;
}

/** 文件名是博客现有文章的声明方式；显式属性留给以后的内容。 */
export function isMotionPhotoSource(src: string, explicit = false): boolean {
  return explicit || /(?:^|\/)MVIMG_[^/?#]+/i.test(src);
}

/** 实况照片的直链不能用图片代理，否则会丢掉尾部视频。 */
export function resolveMotionPhotoSource(src: string, imageBase?: string): string {
  if (imageBase && /^(\.{0,2}\/)/.test(src)) {
    try {
      return new URL(src, imageBase.endsWith('/') ? imageBase : `${imageBase}/`).toString();
    } catch {
      return src;
    }
  }
  return src;
}

function rawGithubToJsDelivr(source: string): string | null {
  try {
    const url = new URL(source);
    if (url.hostname === 'raw.githubusercontent.com') {
      const [owner, repo, branch, ...rest] = url.pathname.split('/').filter(Boolean);
      if (owner && repo && branch && rest.length > 0) {
        return `https://gcore.jsdelivr.net/gh/${owner}/${repo}@${branch}/${rest.join('/')}`;
      }
    }
    if (url.hostname === 'github.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 4 && parts[2] === 'raw') {
        const [owner, repo, , branch, ...rest] = parts;
        if (owner && repo && branch) {
          return `https://gcore.jsdelivr.net/gh/${owner}/${repo}@${branch}/${rest.join('/')}`;
        }
      }
    }
  } catch {
    // 相对地址或非法 URL 直接走原地址
  }
  return null;
}

function candidateSources(source: string): string[] {
  const sources = new Set<string>();
  const jsdelivr = rawGithubToJsDelivr(source);
  if (jsdelivr) {
    sources.add(jsdelivr);
    sources.add(jsdelivr.replace('https://gcore.jsdelivr.net', 'https://cdn.jsdelivr.net'));
    sources.add(jsdelivr.replace('https://gcore.jsdelivr.net', 'https://fastly.jsdelivr.net'));
  }
  sources.add(source);
  return [...sources];
}

function decodeMetadata(buffer: ArrayBuffer): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(buffer);
  }
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (let index = 0; index < bytes.length; index += 1) {
    text += String.fromCharCode(bytes[index]);
  }
  return text;
}

function parseMotionPhotoVideoTag(tag: string): { videoLength: number; mimeType: string } | null {
  const lengthMatch = tag.match(/(?:Item|GContainerItem):Length=["'](\d+)["']/i);
  const mimeMatch = tag.match(/(?:Item|GContainerItem):Mime=["'](video\/(?:mp4|quicktime))["']/i);
  if (!lengthMatch) return null;
  return {
    videoLength: Number(lengthMatch[1]),
    mimeType: mimeMatch ? mimeMatch[1].toLowerCase() : 'video/mp4',
  };
}

function parseMotionPhotoMetadata(buffer: ArrayBuffer): Omit<MotionPhotoMetadata, 'source'> {
  const metadataText = decodeMetadata(buffer);
  const hasMotionFlag = /(?:GCamera|Camera):(?:MotionPhoto|MicroVideo)=["']1["']/i.test(metadataText);
  if (!hasMotionFlag) throw new MotionPhotoError('文件中没有可用的动态照片标记');

  const tags = metadataText.match(/<[^>]+>/g) ?? [];
  let metadata: { videoLength: number; mimeType: string } | null = null;

  for (const tag of tags) {
    const isVideoItem =
      /(?:Item|GContainerItem):Semantic=["']MotionPhoto["']/i.test(tag) ||
      /(?:Item|GContainerItem):Mime=["']video\/(?:mp4|quicktime)["']/i.test(tag);
    if (isVideoItem) {
      metadata = parseMotionPhotoVideoTag(tag);
      if (metadata) break;
    }
  }

  if (!metadata) {
    const legacyOffset = metadataText.match(/(?:GCamera|Camera):MicroVideoOffset=["'](\d+)["']/i);
    if (legacyOffset) {
      metadata = { videoLength: Number(legacyOffset[1]), mimeType: 'video/mp4' };
    }
  }

  if (
    !metadata ||
    !Number.isSafeInteger(metadata.videoLength) ||
    metadata.videoLength <= 8 ||
    metadata.videoLength > MAX_VIDEO_BYTES
  ) {
    throw new MotionPhotoError('动态照片中的视频长度无效');
  }

  return metadata;
}

function takeVideoTail(buffer: ArrayBuffer, videoLength: number): ArrayBuffer {
  if (buffer.byteLength < videoLength) {
    throw new MotionPhotoError('动态照片的视频数据不完整');
  }
  return buffer.slice(buffer.byteLength - videoLength);
}

function hasMotionPhotoVideoSignature(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 32));
  for (let index = 0; index <= bytes.length - 4; index += 1) {
    if (
      bytes[index] === 0x66 &&
      bytes[index + 1] === 0x74 &&
      bytes[index + 2] === 0x79 &&
      bytes[index + 3] === 0x70
    ) {
      return true;
    }
  }
  return false;
}

async function readBoundedResponse(response: Response, maxBytes: number): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get('Content-Length'));
  if (Number.isSafeInteger(declaredLength) && declaredLength >= 0 && declaredLength > maxBytes) {
    throw new MotionPhotoError('动态照片资源超过允许大小');
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new MotionPhotoError('动态照片资源超过允许大小');
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      const chunk =
        result.value instanceof Uint8Array ? result.value : new Uint8Array(result.value);
      if (chunk.byteLength > maxBytes - totalBytes) {
        await reader.cancel().catch(() => undefined);
        throw new MotionPhotoError('动态照片资源超过允许大小');
      }
      chunks.push(chunk);
      totalBytes += chunk.byteLength;
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // 已取消的流可能自动释放锁
    }
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

async function fetchMetadata(source: string, signal: AbortSignal): Promise<MotionPhotoMetadata> {
  const response = await fetch(source, {
    headers: { Range: `bytes=0-${METADATA_BYTES - 1}` },
    signal,
  });
  if (!response.ok) {
    throw new MotionPhotoError(`动态照片资源请求失败，状态码：${response.status}`);
  }

  const responseLimit = response.status === 206 ? METADATA_BYTES : MAX_SOURCE_BYTES;
  const buffer = await readBoundedResponse(response, responseLimit);
  const metadataBuffer =
    buffer.byteLength > METADATA_BYTES ? buffer.slice(0, METADATA_BYTES) : buffer;
  const metadata = parseMotionPhotoMetadata(metadataBuffer);

  const contentRange = response.headers.get('Content-Range');
  const totalMatch = contentRange ? contentRange.match(/\/(\d+)$/) : null;
  if (totalMatch) {
    const reportedFileLength = Number(totalMatch[1]);
    if (
      Number.isSafeInteger(reportedFileLength) &&
      reportedFileLength >= metadata.videoLength &&
      reportedFileLength <= MAX_SOURCE_BYTES
    ) {
      metadata.fileLength = reportedFileLength;
    }
  }

  if (response.status === 200) {
    metadata.fullFileBuffer = buffer;
  }

  return { ...metadata, source };
}

async function fetchFileLength(source: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(source, { method: 'HEAD', signal });
  if (!response.ok) {
    throw new MotionPhotoError(`动态照片长度请求失败，状态码：${response.status}`);
  }
  const fileLength = Number(response.headers.get('Content-Length'));
  if (
    !Number.isSafeInteger(fileLength) ||
    fileLength <= 8 ||
    fileLength > MAX_SOURCE_BYTES
  ) {
    throw new MotionPhotoError('动态照片文件长度无效');
  }
  return fileLength;
}

async function fetchVideo(metadata: MotionPhotoMetadata, signal: AbortSignal): Promise<ArrayBuffer> {
  if (metadata.fullFileBuffer) {
    return takeVideoTail(metadata.fullFileBuffer, metadata.videoLength);
  }

  const fileLength =
    metadata.fileLength ??
    (await fetchFileLength(metadata.source, signal).catch(() => null));

  if (fileLength) {
    const videoStart = fileLength - metadata.videoLength;
    if (videoStart < 0) throw new MotionPhotoError('动态照片的视频起始位置无效');

    const response = await fetch(metadata.source, {
      headers: { Range: `bytes=${videoStart}-${fileLength - 1}` },
      signal,
    });
    if (!response.ok) {
      throw new MotionPhotoError(`动态画面请求失败，状态码：${response.status}`);
    }
    const responseLimit = response.status === 206 ? metadata.videoLength : MAX_SOURCE_BYTES;
    const buffer = await readBoundedResponse(response, responseLimit);
    return takeVideoTail(buffer, metadata.videoLength);
  }

  const response = await fetch(metadata.source, { signal });
  if (!response.ok) {
    throw new MotionPhotoError(`动态画面请求失败，状态码：${response.status}`);
  }
  const buffer = await readBoundedResponse(response, MAX_SOURCE_BYTES);
  return takeVideoTail(buffer, metadata.videoLength);
}

/** 读取一张实况照片里的视频；失败会抛错，调用方保留静态图。 */
export async function loadMotionPhotoVideo(
  source: string,
  signal: AbortSignal,
): Promise<MotionPhotoVideo> {
  let lastError: unknown = null;

  for (const candidate of candidateSources(source)) {
    try {
      const metadata = await fetchMetadata(candidate, signal);
      const videoBuffer = await fetchVideo(metadata, signal);
      if (!hasMotionPhotoVideoSignature(videoBuffer)) {
        throw new MotionPhotoError('动态照片尾部不是可识别的视频容器');
      }
      return {
        blob: new Blob([videoBuffer], { type: metadata.mimeType }),
        mimeType: metadata.mimeType,
      };
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }

  throw lastError ?? new MotionPhotoError('无法读取实况照片');
}
