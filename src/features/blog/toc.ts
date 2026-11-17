export interface TocItem {
  level: 2 | 3;
  text: string;
  id: string;
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 与 MarkdownRenderer 的标题 id 共用同一套算法。 */
export function headingIdForText(text: string): string {
  const cleaned = stripInlineMarkdown(text);
  let hash = 0;
  for (let index = 0; index < cleaned.length; index += 1) {
    hash = (hash * 31 + cleaned.charCodeAt(index)) | 0;
  }
  return `h-${Math.abs(hash).toString(36)}`;
}

/** 从 Markdown 提取二/三级目录；跳过代码围栏内的 #。 */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const matched = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!matched) continue;

    const text = stripInlineMarkdown(matched[2]);
    if (!text) continue;

    items.push({
      level: matched[1].length as 2 | 3,
      text,
      id: headingIdForText(text),
    });
  }

  return items;
}
