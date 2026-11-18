# τί 📚

> 把博客装进口袋，把注意力放回当下。
>
> Read offline. Focus deeply.

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.7-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38B2AC.svg?logo=tailwindcss)
![Capacitor](https://img.shields.io/badge/Capacitor-8-1192EE.svg?logo=capacitor)

</div>

## 📖 简介 / Introduction

**τί** 是一个「离线博客 + 番茄专注」的移动端应用：博客部分把 [汪钦的博客](https://qinmou000.github.io/) 完整装进 App，断网也能读；专注部分用一块 WebGL 做的唱片表盘来计时，安静、克制、不打扰。

所有数据只存在本机（IndexedDB / localStorage），没有注册登录，也没有服务端。

- 文章主源：[Gitee personal_post](https://gitee.com/wang-qin928/personal_post)
- 可跨域读取的镜像：[GitHub Pages](https://qinmou000.github.io/)

> 早期的记账、倒数日、笔记模块已全部移除，相关代码不再随仓库提供；历史表结构在 IndexedDB 中保留，不影响现有数据。

## ✨ 功能 / Features

### 📚 博客

- **离线快照**：内置 `public/blog/posts.json`（当前 201 篇），首次启动即写入 IndexedDB，装好就能读。
- **手动增量同步**：只拉新增/变更的文章，按远端 SHA-256 比对，一致就跳过；不做定时同步、不后台偷跑。
  - 清单优先走 jsDelivr，失败降级到 Gitee API；
  - 正文优先 `raw.githubusercontent.com`，哈希不匹配时换 jsDelivr CDN 复核，再不行走 Gitee API 的 base64 正文；
  - 某篇失败不影响其它篇，旧缓存保留，下次同步重试。
- **列表**：统一紧凑叠卡（封面缩到右侧 72×72 小方块），分类筛选、一次显示全部文章；从文章返回时恢复原来的滚动位置和筛选条件。
- **图片与实况**：正文图片点击全屏查看，支持双指缩放、拖动、双击放大/还原；`MVIMG_*.jpg` 实况照片显示「实况」角标，点击原位播放 JPEG 尾部内嵌的视频（可切换声音，右下角可放大静态图）；`<img data-video>` / 同名视频走全屏预览播放，`<video>` 标签直接内嵌。
- **搜索**：右上角放大镜展开搜索框，匹配标题 / 摘要 / 分类 / 标签 / 日期。
- **详情**：顶部「分类 + 大字标题 + 日期与阅读时长」，正文完整渲染（含封面图），支持 GFM 表格、代码高亮、受限 HTML、图片点击放大、阅读进度条、回到顶部、系统分享（不支持则复制原文链接）。
- **文末同分类卡集**：左右滑动切换，点最前面那张进入阅读。

### 🍅 专注

- **三盘唱片轮播**：专注 / 短休息 / 长休息三张盘，滑动或滚轮切换，Three.js 渲染（金属盘面、法线贴图、环境反射、雾化）。
- **沉浸计时**：开始后表盘放大居中，背景浮起一层柔和环境光，色相与位置随本轮进度缓慢变化（专注越往后越暖、短休息转湖蓝、长休息转紫）。
- **计时不漂移**：运行态只保存目标结束时间戳 `endsAt`，剩余时间永远由 `Date.now()` 推导，切页、切后台、重开 App 都不会累计误差；进程被杀后重开会补记已完成的周期。
- **提醒**：结束时播放 Web Audio 合成提示音，并通过本地通知提醒（Android 通知渠道分「有声 / 静默」）；可选屏幕常亮（Screen Wake Lock）。
- **震动**：专注 / 短休息 / 长休息切换时，原生闹钟在结束时间点触发震动（前台、后台、锁屏都生效），不依赖通知渠道的震动开关。
- **进行中通知**：开始计时后，下拉通知栏和锁屏常驻一条倒计时（正文显示结束时间，右侧由 Android 系统 chronometer 实时倒计时，退到后台不刷新也不掉秒）；暂停时显示剩余时间，结束或重置后自动消失。
- **统计**：今日番茄数、专注时长、中断次数、7 天趋势、历史记录，支持清空。
- **计时偏好**：三种时长、长休息间隔、自动开始休息 / 专注、提示音、通知、屏幕常亮。

### 🎨 外观与体验

- **主题**：设置页顶部可切「跟随系统 / 浅色 / 深色」，持久化到 `localStorage.theme`；`index.html` 里有一小段内联脚本，在首屏渲染前套用主题，避免深色下闪白。
- **图片代理**：设置 → 通用 → 增强图片加载，打开后外链图片统一走 `images.weserv.nl`（卡片缩略图与正文共用同一开关）。
- **动效**：Hero 标题逐字弹入 + 拖影、极光背景、叠卡列表、滚动显影、弹性 Dock；全部尊重 `prefers-reduced-motion`。
- **移动端适配**：安全区、状态栏透明叠加、底部 Dock、大圆角玻璃材质。

## 🛠️ 技术栈 / Tech Stack

| 层 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript 5 + React Router 7 |
| 构建 | Vite 6 |
| 样式 | TailwindCSS 3 + CSS 变量设计令牌 |
| 移动端 | Capacitor 8（Android） |
| 存储 | Dexie 4（IndexedDB） |
| 3D | Three.js 0.128（唱片表盘） |
| Markdown | react-markdown + remark-gfm + rehype-raw + rehype-sanitize + prism-react-renderer |
| 原生能力 | @capacitor/local-notifications / share / filesystem / status-bar / app / camera |
| 其它 | date-fns、lucide-react、gray-matter（快照脚本）、file-saver |

## 🗂️ 目录结构 / Structure

```
src/
├─ pages/                 页面
│  ├─ Pomodoro.tsx              专注（表盘 + 沉浸计时）
│  ├─ Blog.tsx                  博客列表（Hero / 分类 / 搜索 / 叠卡）
│  ├─ BlogPost.tsx              博客详情
│  ├─ FocusStats.tsx            专注统计
│  ├─ Settings.tsx              设置
│  └─ PomodoroSettings.tsx      计时偏好
├─ components/
│  ├─ ui/                       通用组件（Button / Sheet / SegmentedControl / Toast…）
│  ├─ blog/                     博客组件（卡片、缩略图、同步面板、卡片堆、Hero 文字）
│  └─ pomodoro/                 表盘封装、环境光、场景缓存
├─ features/
│  ├─ blog/                     快照播种、增量同步、Markdown 解析、分类与元数据
│  └─ pomodoro/                 计时 Provider、存储、通知、声音、统计
├─ effects/disc-carousel/       Effect Atlas 唱片轮播（vendored JS + CSS）
├─ db/index.ts                  Dexie 表结构与版本迁移
├─ hooks/useTheme.tsx           主题 Provider（全局唯一状态）
├─ lib/                         图片代理、分享、工具函数
└─ index.css                    设计令牌、材质、动效
scripts/build-blog-snapshot.mjs 生成内置博客快照
public/blog/posts.json          内置快照（201 篇）
android/                        Capacitor Android 工程
```

## 🚀 快速开始 / Quick Start

### 环境要求

- Node.js **20+**（Capacitor 8 的要求）
- npm 10+
- 构建 Android 额外需要 **JDK 21** 与 **Android SDK**（platform 36、build-tools 34+；应用 `minSdk 24` / `targetSdk 36`）

### 安装与开发

```bash
npm install

npm run dev          # http://localhost:5173
npm run check        # TypeScript 类型检查
npm run lint         # ESLint
npm run build        # 产出 dist/
npm run preview      # 预览构建结果
```

### 常用脚本

| 脚本 | 作用 |
|---|---|
| `npm run dev` | 本地开发 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run check` | 仅类型检查 |
| `npm run lint` | ESLint |
| `npm run blog:snapshot` | 重建博客快照 |
| `npm run sync` | `cap sync`（把 dist 同步进 Android 工程） |
| `npm run build:android` | 构建 Web + `cap sync` |

## 📱 构建 Android / Android Build

```bash
npm run build
npx cap sync android

cd android
./gradlew assembleDebug          # Windows: .\gradlew.bat assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

注意事项：

- `android/app/src/main/assets/public` 是 `cap sync` 生成的 Web 产物，**不进 Git**。
- 根 `.gitignore` 里有全局 `*.png` 规则，所以 `res/mipmap-*`（应用图标）和 `res/drawable-*`（启动图）也**没有入库**。全新 clone 后需要先用 `npx @capacitor/assets generate` 从 `assets/` 重新生成，否则构建出来的 APK 没有图标和启动图。
- `JAVA_HOME` 指向 JDK 21 目录即可，Gradle 使用 `android/gradle/wrapper` 里的 8.14.3。
- 调试 WebView 可以 `adb forward tcp:9222 localabstract:webview_devtools_remote_$(pidof com.suiji.app)`，然后用 Chrome 的 `chrome://inspect` 或 devtools 协议查看。

## 🔄 博客数据 / Blog Data

### 内置快照

```bash
# 从本地克隆的 Gitee 仓库生成（最快，推荐）
npm run blog:snapshot -- --source-dir ../personal_post

# 或直接从 GitHub 镜像拉取
npm run blog:snapshot

# 其它参数
--out <path>       输出路径，默认 public/blog/posts.json
--workers <n>      并发数，默认 6
--no-verify        跳过哈希校验
```

快照结构：`{ version, generatedAt, source, posts: [{ ...元数据, content }] }`，启动时由 `ensureBlogSeeded()` 写入 `blogPosts` / `blogContents` 两张表。

### App 内同步

「博客页 → 同步博客」会：

1. 取 jsDelivr 清单（失败则 Gitee API 清单）；
2. 合并只在 Gitee 出现的新文章；
3. 逐篇比对本地 `hash`，只下载新增 / 变更；
4. 正文下载三级兜底：raw.githubusercontent → jsDelivr CDN → Gitee API；
5. 写入 IndexedDB 并更新 `lastSyncAt`，同步面板显示实时进度。

Gitee API 未认证时约 60 次/小时，触发限流只会跳过 Gitee 那一路，不影响镜像同步。

## 🗃️ 数据与隐私 / Data & Privacy

本地存储（全部在本机，无服务端）：

| 位置 | 内容 |
|---|---|
| IndexedDB `SuijiDatabase` | `blogPosts`、`blogContents`、`pomodoroSessions`，以及历史遗留表 `records` / `media` / `tags` / `transactions` / `categories` / `accounts` / `countdowns`（不再有界面，数据保留） |
| `localStorage.theme` | `system` / `light` / `dark` |
| `localStorage.suiji_image_proxy_enabled` | 图片代理开关 |
| `localStorage.suiji_pomodoro_settings_v1` | 计时偏好 |
| `localStorage.suiji_pomodoro_runtime_v1` | 计时运行态（只存 `endsAt` 等时间戳） |
| `localStorage.suiji_blog_meta_v1` | 同步来源与时间 |

清除应用数据或卸载会一并删除这些内容。

## 🧠 几个实现要点 / Notes

- **计时不漂移**：`PomodoroProvider` 用 250ms 心跳刷新 `now`，但剩余时间始终由 `endsAt - now` 推导；页面隐藏时依靠 `visibilitychange` / `appStateChange` 补算。
- **表盘常驻**：唱片场景离开专注页时只「暂停 + 停放」，不销毁 WebGL 上下文；再次进入直接挂回，避免每次切换都重新生成 1024² 纹理和编译着色器（`components/pomodoro/discStageCache.ts`）。
- **主题单一来源**：`ThemeProvider` 持有一份状态，状态栏、设置页开关、代码块高亮都读同一处。
- **图片代理单一入口**：`lib/images.ts` 与 `MarkdownRenderer` 共用同一个开关，避免卡片能看、正文看不见的割裂。

## ❓ 常见问题 / FAQ

**通知不响 / 不准时？**
首次开始计时会申请通知权限，Android 13+ 需要允许；系统若限制精确闹钟，提醒可能延后，但 App 内计时以时间戳为准，重开后仍会补记。

**图片显示不出来？**
外链图床在部分网络下不可达，开启「设置 → 通用 → 增强图片加载」走代理即可；仍失败会显示占位提示。

**同步一直失败？**
先确认网络能访问 `raw.githubusercontent.com` 或 `data.jsdelivr.com`；Gitee API 限流时可稍后再试，镜像通道不受影响。

**更新 APK 后还是旧界面？**
WebView 可能缓存了旧资源。`main.tsx` 启动时会主动注销所有 Service Worker，正常覆盖安装即可刷新；仍不行就清一次应用数据。

**浅色模式下表盘偏白？**
表盘材质本身是浅色唱片，浅色主题下对比度会比深色低，这是设计取向；可在设置里切回深色。

## 📄 许可证 / License

[MIT](./LICENSE) © 2026 τί
