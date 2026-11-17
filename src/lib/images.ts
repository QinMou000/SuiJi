/** 外链图片代理设置：对正文、封面、卡片缩略图统一生效。 */
export function imageProxyPrefix(): string {
  return localStorage.getItem('suiji_image_proxy_enabled') === 'true'
    ? 'https://images.weserv.nl/?url='
    : '';
}

export function resolveImageUrl(src?: string, base?: string): string | undefined {
  if (!src) return undefined;
  let resolved = src;

  if (base && /^(\.{0,2}\/)/.test(src)) {
    try {
      resolved = new URL(src, base.endsWith('/') ? base : `${base}/`).toString();
    } catch {
      resolved = src;
    }
  }

  const proxy = imageProxyPrefix();
  if (proxy && resolved.startsWith('http') && !resolved.startsWith(proxy)) {
    return proxy + resolved;
  }
  return resolved;
}
