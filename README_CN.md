# 随记 (SuiJi) 📝

> 随时随地，记录生活点滴。

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38B2AC.svg?logo=tailwindcss)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-1192EE.svg?logo=capacitor)

[English](./README.md) | [中文文档](./README_CN.md)

</div>

## 📖 项目简介

**随记 (SuiJi)** 是一款极简主义的个人生活记录应用，旨在为您提供一个纯净、无广告、数据完全私有的数字空间。我们将**Markdown 笔记**与**便捷记账**功能完美融合，无论是记录灵感瞬间，还是管理日常开销，都能得心应手。

项目基于现代 Web 技术栈（React + Vite）构建，并通过 Capacitor 封装为原生 Android 应用，兼具 Web 的开发效率与 Native 的流畅体验。

## ✨ 核心特性

### 📝 灵感笔记
*   **全功能 Markdown**：支持标题、列表、代码块、引用等标准语法，渲染精美。
*   **多媒体支持**：
    *   📷 **图片**：支持插入本地图片或网络图片，支持点击放大全屏预览。
    *   🔗 **链接**：自动解析链接元数据，展示精美卡片。
    *   🎙️ **录音**：内置录音机，随时捕捉语音备忘。
*   **长图分享**：独创的 DOM 截图技术，无论笔记多长，都能一键生成高清长图分享给好友。
*   **数据自由**：支持批量导入 `.md` 文件，或一键导出所有数据为 ZIP 包，您的数据永远属于您。

### 💰 极速记账
*   **3秒记一笔**：专为移动端优化的数字键盘，大按钮、触感反馈，记账快人一步。
*   **资产管家**：首页直观展示本月收支概览与结余，资金状况一目了然。
*   **分类管理**：预置餐饮、交通、购物等常用分类，支持自定义支出/收入类型。
*   **智能网络**：内置图片代理开关（Weserv），一键解决 Markdown 中 GitHub/Unsplash 等外网图片加载失败的问题。

### 🎨 极致体验
*   **深色模式**：精心调配的深色/浅色主题，跟随系统自动切换，护眼更舒适。
*   **隐私优先**：采用 IndexedDB 本地存储方案，无云端同步，无账号体系，确保数据绝对安全。
*   **流畅交互**：使用 Framer Motion 打造丝滑的转场动画与手势操作。

## 📸 应用截图

*(此处建议上传 3-4 张应用运行截图，如首页、笔记详情、记账页、深色模式等)*

## 🛠️ 技术栈

*   **前端框架**: [React 18](https://react.dev/) + TypeScript
*   **构建工具**: [Vite](https://vitejs.dev/)
*   **样式方案**: [TailwindCSS](https://tailwindcss.com/) + clsx
*   **移动端运行时**: [Capacitor 6](https://capacitorjs.com/)
*   **本地数据库**: [Dexie.js](https://dexie.org/) (IndexedDB)
*   **图标库**: [Lucide React](https://lucide.dev/)
*   **路由管理**: React Router v6

## 🚀 快速开始

### 环境准备
*   Node.js 18.0 或更高版本
*   Android Studio (用于打包 APK)
*   Java Development Kit (JDK) 17+

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/yourusername/suiji.git
    cd suiji
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    此时可以通过浏览器访问 `http://localhost:5173` 进行预览。

### 构建 Android 应用

1.  **构建 Web 资源**
    ```bash
    npm run build
    ```

2.  **同步到 Android 项目**
    ```bash
    npx cap sync
    ```

3.  **打开 Android Studio**
    ```bash
    npx cap open android
    ```
    在 Android Studio 中等待 Gradle 同步完成后，连接手机或模拟器点击 "Run" 即可。

## 🤝 参与贡献

我们非常欢迎社区贡献！如果您发现了 Bug 或有新的功能建议：

1.  欢迎提交 [Issue](https://github.com/yourusername/suiji/issues) 反馈问题。
2.  Fork 本仓库，创建您的特性分支 (`git checkout -b feature/AmazingFeature`)。
3.  提交您的修改 (`git commit -m 'Add some AmazingFeature'`)。
4.  推送到分支 (`git push origin feature/AmazingFeature`)。
5.  提交 Pull Request。

## 📄 开源协议

本项目采用 [MIT](./LICENSE) 协议开源。
