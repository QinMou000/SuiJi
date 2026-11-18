/**
 * 博客列表的会话内快照：从列表点进文章时记下滚动位置与筛选条件，
 * 返回 /blog 时由 Blog 在列表渲染完成后恢复。
 *
 * 只存在内存里：重启 App 或直接冷启动到 /blog 不应恢复旧位置。
 */
export interface BlogViewSnapshot {
  scrollY: number;
  query: string;
  selectedCategory: string | null;
}

let snapshot: BlogViewSnapshot | null = null;

export function saveBlogView(next: BlogViewSnapshot): void {
  snapshot = { ...next };
}

export function peekBlogView(): BlogViewSnapshot | null {
  return snapshot;
}

export function clearBlogView(): void {
  snapshot = null;
}
