# 为 OpenBox 做贡献

首先，感谢你愿意花时间为 OpenBox 贡献力量！无论是报告问题、改进文档、提交代码，还是其他形式的帮助，我们都非常欢迎。参与开源不仅是代码贡献，更是社区共建，所以我们期待你的加入。

请务必阅读并遵守我们的[行为准则](CODE_OF_CONDUCT.md)，共同维护一个友好、尊重、专业的社区环境。

---

## 目录

1. [如何报告问题](#如何报告问题)
2. [如何提交功能请求](#如何提交功能请求)
3. [如何提交代码](#如何提交代码)
4. [开发环境搭建](#开发环境搭建)
5. [项目结构说明](#项目结构说明)
6. [代码规范](#代码规范)
7. [插件开发指南](#插件开发指南)
8. [社区交流](#社区交流)

---

## 如何报告问题

在提交 Issue 之前，请先搜索[已有 Issues](https://github.com/Bistu-OSSDT-2026/OpenBox/issues) 确认是否已有人报告过相同问题。

报告 Bug 时请包含以下信息：

- **问题描述**：清晰简洁地描述发生了什么问题
- **复现步骤**：详细描述如何复现该问题（操作路径、输入数据等）
- **预期行为**：你认为应该发生什么
- **实际行为**：实际发生了什么
- **截图/录屏**：如有，请附上
- **环境信息**：
  - 操作系统（Windows/Mac/Linux）及版本
  - OpenBox 版本号
  - Node.js 版本（如适用）
- **日志信息**：如果有错误日志，请一并附上

```markdown
### 问题描述
[清晰简洁的描述]

### 复现步骤
1. [第一步]
2. [第二步]
3. [...]

### 预期行为
[你期望发生什么]

### 实际行为
[实际发生了什么]

### 环境信息
- 操作系统：[Windows 11]
- OpenBox 版本：[v0.5.1]
- Node.js 版本：[v18.17.0]

### 补充信息
[截图、日志等]
```

---

## 如何提交功能请求

如果你有一个好想法，欢迎提交功能请求。提交时请说明：

- **这个功能解决了什么问题**：说明你的使用场景和痛点
- **你期望的方案**：描述你希望看到的功能实现方式
- **替代方案**：如果还有其他思路，可以一并列出

我们会根据社区反馈和项目规划来评估是否采纳。

---

## 如何提交代码

我们欢迎任何形式的代码贡献！无论是修复 Bug、改进文档、还是新增功能。

### 工作流程

1. **Fork 本仓库**：点击 GitHub 页面右上角的 Fork 按钮
2. **Clone 你的 Fork**：
   ```bash
   git clone https://github.com/你的用户名/OpenBox.git
   cd OpenBox
   ```
3. **创建功能分支**：
   ```bash
   git checkout -b feature/你的功能名称
   # 或
   git checkout -b fix/你要修复的问题
   ```
4. **进行开发并提交**：
   ```bash
   git add .
   git commit -m "feat: 简洁明了地描述你的改动"
   ```
5. **推送到你的 Fork**：
   ```bash
   git push origin feature/你的功能名称
   ```
6. **提交 Pull Request**：在 GitHub 上创建 Pull Request 到本仓库的 `main` 分支

### Pull Request 规范

- PR 标题请使用简洁的英文或中文描述改动内容
- PR 描述中请关联相关的 Issue（如 `Closes #123`）
- 确保所有 CI 检查通过（ESLint、TypeScript 类型检查等）
- 保持 PR 范围聚焦，一个 PR 只做一件事
- 如果 PR 涉及 UI 改动，请附上截图

### Commit Message 规范

请使用以下格式：

```
<type>: <简短描述>

<详细说明（可选）>
```

type 取值：

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 代码重构（既不修复 Bug 也不新增功能） |
| `test` | 测试相关 |
| `chore` | 构建过程或辅助工具的变动 |

示例：
```
feat: 添加插件配置弹窗中的多选支持

- 新增 multiselect 类型的配置项渲染
- 支持从 plugin.json 中声明的 options 动态生成选项
```

---

## 开发环境搭建

### 前置要求

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Git**

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Bistu-OSSDT-2026/OpenBox.git
cd OpenBox

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 运行 lint 检查
npm run lint

# 运行类型检查
npm run typecheck

# 构建生产版本
npm run build
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Electron 开发模式（热更新） |
| `npm run build` | 构建生产版本 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run format` | 运行 Prettier 格式化 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm run preview` | 预览构建结果 |
| `npm run package` | 使用 electron-builder 打包 |

---

## 项目结构说明

```
OpenBox/
│
├── electron/              # Electron 主进程（后台）
│   ├── main.ts           # 应用入口
│   ├── preload.ts        # 安全传话层（contextBridge）
│   ├── menu.ts           # 顶部菜单栏
│   └── ipc/              # IPC 通信处理
│       ├── index.ts
│       ├── plugin.ipc.ts
│       └── settings.ipc.ts
│
├── src/                   # 渲染进程（前台界面）
│   ├── App.tsx           # 页面路由
│   ├── pages/            # 页面组件
│   ├── components/       # 通用组件
│   ├── store/            # Zustand 状态管理
│   ├── api/              # 后台 API 封装
│   └── hooks/            # React Hooks
│
├── plugin-system/         # 插件系统核心
│   ├── PluginManager.ts  # 插件大管家
│   ├── PluginSandbox.ts  # 插件安全运行环境
│   ├── PluginProtocol.ts # plugin:// 协议
│   ├── PermissionGuard.ts# 权限检查
│   ├── EventBus.ts       # 事件总线
│   └── PluginProcessEntry.ts  # 子进程入口
│
├── database/              # 数据库
│   ├── index.ts          # 数据库初始化与通用操作
│   └── repositories/     # 数据操作层
│
├── shared/                # 公共类型定义
│   └── types/
│       ├── plugin.types.ts
│       ├── ipc.types.ts
│       └── permissions.ts
│
├── templates/             # 插件模板
├── cli/                   # 命令行工具
├── Diary/                 # 日记插件
├── DiceRoller/            # 骰子插件
├── Turntable/             # 转盘插件
└── UniEnv/                # 环境管理插件
```

---

## 代码规范

### 语言和框架

- **TypeScript**：所有源代码必须使用 TypeScript，禁止使用 `any` 类型（除非有充分理由）
- **React**：前台界面使用 React 函数组件 + Hooks
- **ESLint**：遵循项目中的 ESLint 配置，提交前确保 `npm run lint` 通过
- **Prettier**：使用 Prettier 统一代码格式，提交前运行 `npm run format`

### 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `plugin-manager.ts` |
| React 组件 | PascalCase | `PluginCard.tsx` |
| 函数/变量 | camelCase | `getPluginList()` |
| 类型/接口 | PascalCase | `PluginMeta` |
| 枚举 | PascalCase，成员 UPPER_CASE | `PluginLifecycleStatus.Active` |
| 常量 | UPPER_CASE | `REQUEST_TIMEOUT` |

### 文件组织

- 每个文件只导出一个主要功能（默认导出）
- 相关的类型定义放在 `shared/types/` 目录下
- 组件文件放在对应的 `pages/` 或 `components/` 目录下

---

## 插件开发指南

OpenBox 的插件由两部分组成：

1. **后台代码（main.js）**：运行在 Node.js 环境，负责插件核心逻辑
2. **前台界面（renderer.js）**：用 React 编写的 UI，显示在 OpenBox 窗口中

### 快速开始

```bash
# 使用 CLI 工具创建插件项目
npx openbox create-plugin my-plugin
```

### 插件结构

```
my-plugin/
├── plugin.json          # 插件清单文件
├── dist/
│   ├── main.js         # 编译后的后台代码
│   └── renderer.js     # 编译后的界面代码
├── src/
│   ├── main.ts         # 后台源码
│   └── renderer.tsx    # 界面源码
├── package.json
└── tsconfig.json
```

### plugin.json 配置

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "displayName": "我的插件",
  "description": "插件功能描述",
  "author": "你的名字",
  "main": "dist/main.js",
  "renderer": "dist/renderer.js",
  "permissions": ["notification"],
  "config": {
    "apiKey": {
      "type": "string",
      "label": "API 密钥",
      "description": "输入你的 API 密钥"
    }
  }
}
```

### 后台 API（main.ts）

插件后台可以使用以下 API：

| API | 说明 | 所需权限 |
|-----|------|---------|
| `ctx.logger.info/warn/error/debug` | 记录日志 | 无 |
| `ctx.api.notify(title, body)` | 发送系统通知 | `notification` |
| `ctx.api.fetch(url, opts)` | 发起网络请求 | `network:fetch` |
| `ctx.api.readFile(path)` | 读取文件 | 无 |
| `ctx.api.writeFile(path, data)` | 写入文件 | 无 |
| `ctx.api.registerShortcut(keys, handler)` | 注册快捷键 | `shortcut` |
| `ctx.api.emitEvent(event, data)` | 发送事件 | 无 |
| `ctx.api.onEvent(event, handler)` | 监听事件 | 无 |
| `ctx.database.query(sql, params)` | 查询数据库 | `database:read` |
| `ctx.database.execute(sql, params)` | 写入数据库 | `database:write` |

### 前台 API（renderer.tsx）

插件界面可以使用以下 API：

| API | 说明 |
|-----|------|
| `api.sendToBackend(message)` | 发送消息给后台 |
| `api.notify(title, body)` | 发送系统通知 |
| `api.onBackendMessage(handler)` | 监听后台消息 |

### 权限列表

| 权限 | 说明 | 危险程度 |
|------|------|---------|
| `database:read` | 读取数据库 | 低 |
| `database:write` | 写入数据库 | 中 |
| `shell:exec` | 执行系统命令 | **高** |
| `network:fetch` | 发起网络请求 | 中 |
| `notification` | 发送系统通知 | 低 |
| `clipboard` | 读写剪贴板 | 中 |
| `dialog` | 打开系统对话框 | 低 |
| `shortcut` | 注册全局快捷键 | 中 |

---

## 社区交流

- **Issues**：通过 [GitHub Issues](https://github.com/Bistu-OSSDT-2026/OpenBox/issues) 报告问题和功能请求
- **Pull Requests**：欢迎提交 PR，我们会在第一时间 review
- **讨论**：如有疑问，可在 Discussion 区发起讨论

---

再次感谢你为 OpenBox 做出的贡献！🌟
