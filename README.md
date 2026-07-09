# OpenBox — 基于插件架构的可扩展桌面工具箱

[![Electron](https://img.shields.io/badge/Electron-34-blue)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows_x64-0078D6)](https://www.microsoft.com/windows)

**是什么**：OpenBox 是一个轻量级、可扩展的桌面工具箱，通过插件系统允许用户动态安装、管理和运行各类功能插件，将多个工具整合到一个统一的桌面应用中。

**为什么**：日常工作中我们经常需要同时使用多种小工具——时钟、计时器、随机数生成器、抽奖转盘等。传统方案是在桌面堆满独立应用或依赖在线服务。OpenBox 提供一个统一的插件化平台：只需安装一个宿主应用，就能按需扩展各种功能，且所有插件遵循同一套开发规范，易于社区贡献。

**给谁用**：普通用户可直接下载发行版使用预置插件；开发者可参考插件 API 和示例源码编写自己的插件，也可直接修改宿主源码进行二次开发。

---

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
  - [直接运行（推荐）](#直接运行推荐)
  - [从源码构建](#从源码构建)
- [插件系统](#插件系统)
  - [插件生命周期](#插件生命周期)
  - [插件清单规范](#插件清单规范)
  - [插件 API](#插件-api)
  - [权限系统](#权限系统)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [内置插件](#内置插件)
- [开发指南](#开发指南)
  - [创建新插件](#创建新插件)
  - [开发模式](#开发模式)
- [常见问题](#常见问题)
- [许可证](#许可证)

---

## 功能特性

- **插件化架构** — 宿主应用与插件完全解耦，插件可按需安装、启用、停用、卸载，无需修改宿主代码
- **双进程模型** — 每个插件拥有独立的 Node.js 主进程逻辑和 React 渲染进程 UI，通过 IPC 通信
- **安全沙箱** — 渲染进程通过 `contextBridge` 限制 API 访问，plugins 使用 `PermissionGuard` 做权限校验
- **可视化插件管理** — 图形化界面管理插件，支持拖拽导入 .zip 插件包
- **动态配置** — 插件可声明配置项（字符串/数值/布尔/选择/多选），宿主自动生成配置表单
- **开箱即用** — Windows x64 便携版，解压即用，无需安装或额外运行时
- **CLI 工具链** — 提供脚手架命令快速创建插件项目，支持源码变更自动重构建

---

## 快速开始

### 直接运行（推荐）

1. 完整解压整个交付包，保持目录结构完整
2. 进入 `OpenBox-Portable` 文件夹
3. 双击 `OpenBox.exe`
4. （首次启动时，若 Windows SmartScreen 提示"未知发布者"，点击"更多信息"→"仍要运行"）

**安装插件**：

1. 在 OpenBox 中进入左侧菜单"插件管理"→点击"导入插件"
2. 将 `Plugins/` 文件夹中的 `.zip` 插件包拖入导入区域（或点击选择文件）
3. 导入成功后插件自动激活，返回首页即可使用

> 应用数据和已安装插件保存在 `%APPDATA%/OpenBox/` 目录中。若需重新安装插件，请先在插件管理中卸载旧版本。

### 从源码构建

#### 环境要求

- [Node.js](https://nodejs.org/) >= 20
- npm（随 Node.js 安装）

#### 步骤

```bash
# 1. 进入源码目录
cd Source\OpenBox

# 2. 安装依赖
npm install

# 3. 开发模式运行（带热重载）
npm run dev

# 4. 类型检查（可选）
npm run typecheck

# 5. 生产构建
npm run build

# 6. 打包为可分发安装包
npm run package
```

构建产物位于 `release/` 目录。打包配置见 `electron-builder.yml`。

---

## 插件系统

OpenBox 的核心设计围绕插件展开。宿主应用负责插件的全生命周期管理和 UI 集成，插件负责提供具体的功能逻辑。

### 插件生命周期

```
注册（安装）
  │
  ▼
激活 ──→ 运行中 ──→ 停用
  │                    │
  ▼                    ▼
错误状态              已停用
  │
  ▼
卸载（删除）
```

| 阶段 | 说明 |
|------|------|
| **安装** | 从 .zip 文件或目录读取 `plugin.json` 清单，验证合法性，复制文件到插件目录，写入数据库记录 |
| **激活** | 创建 `PluginSandbox` 沙箱实例，加载主进程模块并调用 `activate()`，将插件标记为"已启用" |
| **运行中** | 插件主进程可响应来自渲染进程的消息；渲染进程 UI 呈现给用户操作 |
| **停用** | 调用 `deactivate()` 清理资源，关闭沙箱，标记为"已停用"（仅保留启用状态，不丢失数据） |
| **卸载** | 停用后删除插件文件目录和数据库记录 |

### 插件清单规范

每个插件根目录必须包含 `plugin.json`：

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "displayName": "我的插件",
  "description": "插件的功能描述",
  "author": "作者名",
  "icon": "icon.png",
  "main": "dist/main.js",
  "renderer": "dist/renderer.js",
  "permissions": ["notification"],
  "config": {
    "themeColor": {
      "type": "string",
      "label": "主题颜色",
      "default": "#1677ff"
    },
    "autoStart": {
      "type": "boolean",
      "label": "自动启动",
      "default": true
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 插件唯一标识，小写字母、数字、下划线、连字符 |
| `version` | string | 是 | 语义化版本号 |
| `displayName` | string | 是 | 用户可见的显示名称 |
| `description` | string | 否 | 插件功能描述 |
| `author` | string | 否 | 作者 |
| `icon` | string | 否 | 图标路径（相对插件根目录） |
| `main` | string | 是 | 主进程入口 JS 文件 |
| `renderer` | string | 是 | 渲染进程入口 JS 文件 |
| `permissions` | string[] | 是 | 权限声明列表 |
| `config` | object | 否 | 配置项 schema |

### 插件 API

插件主进程通过 `activate(ctx)` 接收的 `PluginContext` 包含以下能力：

| API | 说明 |
|-----|------|
| `ctx.logger.info/warn/error/debug` | 日志记录 |
| `ctx.database.query(sql, params)` | 数据库查询 |
| `ctx.database.execute(sql, params)` | 数据库写入 |
| `ctx.api.notify(title, body)` | 系统通知 |
| `ctx.api.fetch(url, opts)` | HTTP 请求 |
| `ctx.api.readFile/writeFile` | 文件读写 |
| `ctx.api.registerShortcut` | 全局快捷键 |
| `ctx.api.emitEvent/onEvent` | 事件总线 |

插件渲染进程通过 `PluginRenderProps` 接收：

| API | 说明 |
|-----|------|
| `props.config` | 当前配置 |
| `props.onConfigChange` | 更新配置 |
| `props.api.sendToBackend(msg)` | 向主进程发送消息 |
| `props.api.notify(title, body)` | 浏览器通知 |
| `props.api.onBackendMessage(h)` | 监听主进程消息 |

### 权限系统

| 权限 | 说明 |
|------|------|
| `database:read` | 读取数据库 |
| `database:write` | 写入数据库 |
| `shell:exec` | 执行系统命令 |
| `network:fetch` | 发起 HTTP 请求 |
| `notification` | 发送系统通知 |
| `clipboard` | 访问剪贴板 |
| `dialog` | 调用原生对话框 |
| `shortcut` | 注册全局快捷键 |

---

## 项目结构

```
OpenBox-Complete-v0.5.1/
├── OpenBox-Portable/            # Windows x64 便携版（双击即用）
│   ├── OpenBox.exe
│   └── resources/app.asar       # 打包后的应用
│
├── Plugins/                     # 预编译插件包
│   ├── Turntable-0.1.2.zip
│   └── DiceRoller-0.1.0.zip
│
├── Source/                      # 完整源码
│   ├── OpenBox/                 # 宿主应用源码
│   │   ├── electron/            # Electron 主进程
│   │   │   ├── main.ts          # 应用入口（窗口创建、协议注册、启动流程）
│   │   │   ├── menu.ts          # 原生菜单
│   │   │   ├── preload.ts       # contextBridge 预加载
│   │   │   └── ipc/             # IPC 通信处理
│   │   ├── src/                 # React 渲染进程
│   │   │   ├── pages/           # 页面（首页/插件管理/设置）
│   │   │   ├── components/      # UI 组件
│   │   │   ├── hooks/           # 自定义 Hooks
│   │   │   ├── store/           # Zustand 状态管理
│   │   │   ├── api/             # 前端 IPC 调用封装
│   │   │   └── styles/          # 全局样式
│   │   ├── plugin-system/       # ★ 插件引擎核心
│   │   │   ├── PluginManager.ts     # 统筹：安装/激活/停用/卸载
│   │   │   ├── PluginSandbox.ts     # 沙箱：隔离执行插件主进程代码
│   │   │   ├── PluginProcessEntry.ts # 子进程入口（预留）
│   │   │   ├── PluginProtocol.ts    # plugin:// 协议处理器
│   │   │   ├── PermissionGuard.ts   # 权限检查
│   │   │   └── EventBus.ts          # 事件总线
│   │   ├── database/            # SQLite 持久层
│   │   ├── shared/types/        # TypeScript 类型定义
│   │   ├── templates/           # 插件脚手架模板
│   │   ├── cli/                 # CLI 工具
│   │   └── electron.vite.config.ts
│   │
│   ├── Turntable/               # 转盘抽奖插件（TypeScript）
│   ├── DiceRoller/              # 骰子插件（JavaScript）
│   └── Time/                    # 时钟工具箱插件（TypeScript）
│
├── README.md                    # 本文档
├── README-请先看.txt             # 简体中文使用说明（精简版）
├── SHA256SUMS.txt               # 文件完整性校验
└── 使用方法.jpg                  # 操作示意图
```

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 桌面框架 | Electron 34 | 跨平台桌面应用容器 |
| UI 框架 | React 19 + Ant Design 5.23 | 组件化 UI 开发 |
| 类型系统 | TypeScript 5.7 | 全栈类型安全 |
| 状态管理 | Zustand 5 | 轻量级状态管理 |
| 数据库 | sql.js (SQLite WASM) | 嵌入式本地存储 |
| 构建工具 | electron-vite 3 | 快速构建与热重载 |
| 打包分发 | electron-builder 25 | NSIS 安装包制作 |
| 压缩解压 | adm-zip | 插件 .zip 包处理 |

---

## 内置插件

### Turntable（转盘抽奖）

Canvas 绘制的抽奖转盘，支持自定义奖项、权重和颜色，每次旋转显示中奖结果。

- **技术**：TypeScript + Canvas API
- **权限**：`database:read`, `database:write`
- **配置**：主题颜色、旋转时长

### DiceRoller（骰子与随机数）

支持设置骰子数量（1-20）和面数（2-100），投掷后显示每个骰子值和总和，保留历史记录。

- **技术**：JavaScript（无编译步骤）
- **权限**：无
- **配置**：默认骰子面数

### Time（时钟工具箱）

三合一时间工具：世界时钟（多时区切换）、秒表计时器、倒计时（结束时发送通知）。

- **技术**：TypeScript + React
- **权限**：`notification`
- **配置**：显示秒数、24 小时制

---

## 开发指南

### 创建新插件

使用 CLI 脚手架快速创建：

```bash
# 方式一：使用 CLI 工具
node Source\OpenBox\cli\bin\openbox create-plugin my-plugin

# 方式二：手动复制模板
cp -r Source\OpenBox\templates\plugin-template my-plugin
```

模板插件包含完整的 `plugin.json` 清单、TypeScript 源码和构建配置。修改 `{{pluginName}}` 和 `{{displayName}}` 占位符后即可开始开发。

### 插件开发规范

1. **主进程**（`src/main.ts`）：导出 `PluginMain` 对象，实现 `activate(ctx)` / `deactivate()` / `onMessage()`
2. **渲染进程**（`src/renderer.tsx`）：导出默认 React 组件，接收 `PluginRenderProps`
3. **构建**：使用 `tsc` 编译 TypeScript 到 `dist/` 目录
4. **打包**：将 `plugin.json` + `dist/` 目录打包为 `.zip` 文件

### 关键设计要点

- 渲染进程代码通过 `plugin://` 协议加载，由 `PluginProtocol` 处理文件请求
- 插件主进程在 `PluginSandbox` 中以 `import()` 方式动态加载，传入沙箱化的 `PluginContext`
- 渲染进程中插件 UI 通过 `PluginHost` 组件的 `new Function()` 沙箱执行，仅暴露 `react` 和 `react/jsx-runtime`
- 插件导入时自动复制到 `%APPDATA%/OpenBox/plugins/{name}/`，即使源码目录被删除也不影响运行

---

## 常见问题

**Q: Windows SmartScreen 阻止运行怎么办？**

A: 应用未购买代码签名证书，属正常提醒。点击"更多信息"→"仍要运行"即可。

**Q: 插件导入后在哪里查看？**

A: 导入成功自动激活，返回"首页"即可看到已安装的插件卡片。

**Q: 如何卸载插件？**

A: 在"插件管理"页面点击插件卡片上的删除按钮，确认后即可卸载。

**Q: 插件数据存储在哪里？**

A: 插件数据（配置、运行记录）存储在 `%APPDATA%/OpenBox/data/openbox.db`（SQLite 数据库）和 `%APPDATA%/OpenBox/plugins/` 目录中。

**Q: 开发插件时如何调试？**

A: 在开发模式（`npm run dev`）下按 `F12` 打开 DevTools，主进程日志可通过 `ctx.logger` 输出到 `plugin_logs` 表。

**Q: 为什么插件导入后显示"未激活"？**

A: 首次导入的插件会自动激活。如果插件代码抛出异常，激活会失败，查看日志排查错误。

**Q: 能否在 macOS 或 Linux 上运行？**

A: 当前版本仅面向 Windows x64 构建。由于依赖 Electron 和 sql.js 等跨平台技术，理论上可移植，但未经过充分测试。

---

## 许可证

[MIT](LICENSE)

Copyright (c) 2025 openbox

本软件为开源教学项目，欢迎 fork、issue 和 pull request。
