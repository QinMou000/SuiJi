# 随记 (SuiJi) 📝

> 随时随地，记录生活点滴。
> 
> Record life anytime, anywhere.

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38B2AC.svg?logo=tailwindcss)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-1192EE.svg?logo=capacitor)

[中文文档](./README_CN.md) | [English](./README.md)

</div>


## 📖 简介 / Introduction

**随记 (SuiJi)** 是一款极简主义的个人生活记录应用，集成了**Markdown 笔记**与**便捷记账**功能。它基于 React + Vite + Capacitor 构建，专为 Android 平台优化，提供流畅的原生体验。

**SuiJi** is a minimalist personal life logging application that integrates **Markdown notes** and **convenient bookkeeping**. Built with React, Vite, and Capacitor, it is optimized for the Android platform to deliver a smooth native experience.

## ✨ 特性 / Features

### 📝 笔记 / Notes
- **Markdown 支持**：完整支持 Markdown 语法，包括表格、代码块、引用等。
- **多媒体混排**：支持插入图片（支持点击预览）、录音和链接。
- **沉浸式体验**：简洁的编辑器，支持深色模式。
- **长图分享**：一键生成精美长图，方便分享到社交平台。
- **导入导出**：支持批量导入 .md 文件，或将所有数据导出为 ZIP 备份。

### 💰 记账 / Finance
- **极速记账**：仿计算器风格的数字键盘，3秒完成一笔记录。
- **资产概览**：清晰展示本月收支与结余。
- **分类管理**：内置常用分类（餐饮、交通、工资等），支持自定义。
- **网络代理**：内置图片代理开关，解决部分 Markdown 外网图片加载问题。

### 🎨 体验 / UX
- **深色模式**：完美适配系统的深色/浅色主题。
- **隐私优先**：所有数据存储在本地（IndexedDB），无需注册登录。
- **流畅动画**：精心打磨的过渡动画和交互反馈。

## 📸 截图 / Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/QinMou000/pic/main/2da7e3996986df25cc6f964b5f887e88.jpg" width="30%" />
  <img src="https://raw.githubusercontent.com/QinMou000/pic/main/36d3d120cf478a1f78a19095cdc3af5e.jpg" width="30%" />
  <img src="https://raw.githubusercontent.com/QinMou000/pic/main/3af83dae6332dba3c0a8f3d25eb0c03f.jpg" width="30%" />
</p>


## 🛠️ 技术栈 / Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Build Tool**: Vite
- **Mobile Runtime**: Capacitor 6 (Android)
- **Database**: Dexie.js (IndexedDB wrapper)
- **Icons**: Lucide React
- **Utils**: date-fns, uuid, clsx

## 🚀 快速开始 / Quick Start

### 环境要求 / Prerequisites
- Node.js 18+
- Android Studio (for APK build)

### 安装 / Installation

```bash
# Clone repository
git clone https://github.com/yourusername/suiji.git
cd suiji

# Install dependencies
npm install
```

### 开发 / Development

```bash
# Start web dev server
npm run dev

# Sync with Android project
npx cap sync

# Open Android Studio
npx cap open android
```

### 构建 / Build

```bash
# Build web assets
npm run build

# Sync and update Android project
npx cap sync
```

## 🤝 贡献 / Contributing

欢迎提交 Issue 和 Pull Request！

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 许可证 / License

[MIT](./LICENSE) © 2026 SuiJi
