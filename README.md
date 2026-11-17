# 随记 (SuiJi) 📚

> 读博客，专注，记录生活。
>
> Read, focus, and keep the good things.

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38B2AC.svg?logo=tailwindcss)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-1192EE.svg?logo=capacitor)

</div>

## 📖 简介 / Introduction

**随记 (SuiJi)** 是一个 personal blog + 番茄专注 的移动端应用：把汪钦的博客装进口袋，离线阅读；再用番茄工作法把注意力放回当下。

博客内容来自 [Gitee personal_post](https://gitee.com/wang-qin928/personal_post) 与 [GitHub Pages 镜像](https://qinmou000.github.io/)。应用内置完整文章快照，首次打开即可离线阅读；之后通过「同步博客」按钮手动增量更新，不做定时同步。

> 随记笔记入口已移除；历史随记、媒体和标签数据仍保留在本地 IndexedDB 中，并继续随全量备份导出/恢复。

## ✨ 特性 / Features

### 📚 博客 / Blog
- **离线快照**：内置 201 篇 Markdown 文章与封面元数据，首次启动即可阅读。
- **手动增量同步**：点击「同步博客」时比对远端 SHA-256，只下载新增/变更文章；内置快照与远端一致时通常 1 秒内完成。
- **阅读体验**：Markdown / GFM、代码块、表格、引用、图片预览、原始 HTML（受限渲染）、阅读进度条、上一篇/下一篇。
- **找文章**：标题、摘要、分类、关键词搜索；15 个分类筛选；分页加载。
- **数据来源**：Gitee 仓库为主，GitHub 镜像提供可跨域读取的 raw 原文；任一端更新后手动同步即可。

### 🍅 番茄时钟 / Pomodoro
- **三种模式**：专注 25 分钟、短休息 5 分钟、长休息 15 分钟，均可自定义；每完成 4 个专注自动进入长休息。
- **不会走偏的计时**：运行态只保存目标结束时间戳，切页、切后台、重开 App 都能准确恢复；进程被系统回收后，重新打开会自动补记已完成的周期。
- **原生提醒**：倒计时结束播放合成提示音，并通过 Android 本地通知 / 浏览器通知提醒；即使 App 在后台也会准时提醒。
- **专注统计**：记录每日完成的番茄数、累计专注时长、7 天趋势、历史记录，以及中断/放弃的周期。
- **移动端交互**：圆形进度环、三种模式视觉标识、开始/暂停/继续/重置/跳过、手动切换模式、底部弹层与安全区适配。

### 🎨 体验 / UX
- **深色模式**：适配系统深色/浅色主题，博客正文与代码块单独调校。
- **隐私优先**：所有数据存储在本地 IndexedDB，无需注册登录。
- **动效语言**：极光背景、渐变标题、弹性 Dock、卡片 3D 倾斜、滚动显影、跑马灯、同步进度环、阅读进度条；尊重 `prefers-reduced-motion`。

## 🔄 博客同步 / Blog Sync

- App 内首页 →「同步博客」：读取 jsDelivr 文件清单 → 比对本地 SHA-256 → 仅拉取新增/变更的 Markdown。
- 内置快照通过 `public/blog/posts.json` 播种；快照生成脚本：

```bash
# 从本地 Gitee 仓库克隆生成（推荐，速度快）
npm run blog:snapshot -- --source-dir ../personal_post

# 或直接从 GitHub 镜像拉取（无需本地仓库）
npm run blog:snapshot
```

- 同步源说明：
  - Gitee 仓库是文章主源；Gitee raw 没有 CORS，API 限制约 60 次/小时，因此不作为浏览器端逐篇下载主通道。
  - GitHub 镜像（`QinMou000/QinMou000.github.io`）包含同一份 `source/_posts`，raw 支持 CORS，适合移动端直接下载。
  - 每次同步会额外请求一次 Gitee 清单，用于发现只在 Gitee 上出现的新文章；限流时自动跳过，不影响 GitHub 镜像同步。
  - 当 jsDelivr 清单不可用时，会降级到 Gitee 清单 + GitHub raw；失败文章保留旧缓存，下次同步重试。

## 🛠️ 技术栈 / Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Build Tool**: Vite
- **Mobile Runtime**: Capacitor 8 (Android)
- **Database**: Dexie.js (IndexedDB)
- **Markdown**: react-markdown, remark-gfm, rehype-raw, rehype-sanitize
- **Icons**: Lucide React
- **Notifications**: @capacitor/local-notifications
- **Utils**: date-fns, clsx, gray-matter

## 🚀 快速开始 / Quick Start

### 环境要求 / Prerequisites
- Node.js 18+
- Android Studio（构建 APK 需要）

### 安装 / Installation

```bash
git clone https://github.com/yourusername/suiji.git
cd suiji
npm install
```

### 开发 / Development

```bash
# Web 开发
npm run dev

# 同步博客快照（可选，public/blog/posts.json 已包含当前 201 篇）
npm run blog:snapshot

# 同步 Android 工程
npx cap sync

# 打开 Android Studio
npx cap open android
```

> 番茄时钟首次开始计时时会请求通知权限；Android 13+ 需允许「随记」发送通知。若系统限制精确闹钟，提醒可能略有延迟，但重新打开 App 后仍会补记完成的周期。

### 构建 / Build

```bash
npm run check   # TypeScript
npm run lint    # ESLint
npm run build   # Web 构建

# 同步并更新 Android 工程
npx cap sync
```

## 🗂️ 数据与备份 / Data

- 博客正文与元数据：`blogPosts` / `blogContents` 表，离线缓存。
- 历史随记、媒体、标签、专注记录仍保留；「设置 → 历史数据」可全量备份/恢复（包含博客文章与专注记录）。
- 备份 JSON 的 `version` 仍为 2，旧备份可正常导入；新备份额外包含 `blogPosts` / `blogContents` 字段。

## 📄 许可证 / License

[MIT](./LICENSE) © 2026 SuiJi
