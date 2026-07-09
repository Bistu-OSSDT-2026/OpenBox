import type { PluginContext } from 'openbox-plugin-api'
import type { ToolDef, InstallProgress, InstallOptions } from './tools/base'
import { pythonTool } from './tools/python'
import { nodeTool } from './tools/node'
import { gitTool } from './tools/git'
import { goTool } from './tools/go'
import { javaTool } from './tools/java'
import { getBuiltinCombos, resolveTool, type ComboPack } from './combo'

let tools: Map<string, ToolDef>
let ctx: PluginContext

interface InstallTask {
  progress: InstallProgress
  done: boolean
  error?: string
}

const progressMap = new Map<string, InstallTask>()

function getInstallRoot(): string {
  return (ctx.config.installRoot as string) || 'C:\\UniEnv'
}

function getDownloadMirror(): string {
  return (ctx.config.downloadMirror as string) || 'direct'
}

function getCustomCombos(): ComboPack[] {
  try {
    const raw = ctx.config.customCombos as string
    if (raw && raw !== '[]') {
      return JSON.parse(raw) as ComboPack[]
    }
  } catch {
    // ignore
  }
  return []
}

function startBackgroundInstall(toolId: string, version: string, installRoot: string, mirror: string): void {
  const taskKey = toolId
  progressMap.set(taskKey, {
    progress: { stage: 'downloading', percent: 0, message: '准备开始...' },
    done: false
  })
  ;(async () => {
    try {
      const tool = tools.get(toolId)
      if (!tool) throw new Error(`未知工具: ${toolId}`)
      await tool.install(version, installRoot, (p: InstallProgress) => {
        const existing = progressMap.get(taskKey)
        if (existing) existing.progress = p
      }, { downloadMirror: mirror })
      const existing = progressMap.get(taskKey)
      if (existing) {
        existing.done = true
        existing.progress = { stage: 'done', percent: 100, message: `${tool!.displayName} ${version} 安装完成` }
      }
    } catch (err) {
      const existing = progressMap.get(taskKey)
      if (existing) {
        existing.done = true
        existing.error = (err as Error).message
        existing.progress = { stage: 'done', percent: 0, message: (err as Error).message }
      }
    }
  })()
}

const plugin = {
  activate(context: PluginContext): void {
    ctx = context
    tools = new Map<string, ToolDef>()
    tools.set('python', pythonTool)
    tools.set('node', nodeTool)
    tools.set('git', gitTool)
    tools.set('go', goTool)
    tools.set('java', javaTool)

    ctx.logger.info('[UniEnv] 插件已激活')
    ctx.logger.info(`[UniEnv] 安装根目录: ${getInstallRoot()}`)
  },

  deactivate(): void {
    ctx.logger.info('[UniEnv] 插件已停用')
  },

  async onMessage(msg: unknown): Promise<unknown> {
    const message = msg as {
      type: string
      tool?: string
      version?: string
      comboId?: string
      requestId?: string
    }

    const installRoot = getInstallRoot()

    try {
      switch (message.type) {
        case 'listTools': {
          const result: {
            id: string
            displayName: string
            icon: string
            description: string
          }[] = []
          for (const t of tools.values()) {
            result.push({
              id: t.id,
              displayName: t.displayName,
              icon: t.icon,
              description: t.description
            })
          }
          return result
        }

        case 'detect': {
          const tool = tools.get(message.tool || '')
          if (!tool) return { error: `未知工具: ${message.tool}` }
          return await tool.detect(installRoot)
        }

        case 'listVersions': {
          const tool = tools.get(message.tool || '')
          if (!tool) return { error: `未知工具: ${message.tool}` }
          return await tool.listVersions()
        }

        case 'install': {
          const tool = tools.get(message.tool || '')
          if (!tool) return { error: `未知工具: ${message.tool}` }
          if (!message.version) return { error: '未指定版本' }

          startBackgroundInstall(message.tool!, message.version!, installRoot, getDownloadMirror())
          ctx.logger.info(`[UniEnv] 开始后台安装 ${message.tool} ${message.version}`)
          return { success: true, message: `正在安装 ${tool.displayName} ${message.version}...` }
        }

        case 'getProgress': {
          const taskKey = message.tool || ''
          const task = progressMap.get(taskKey)
          if (!task) return { progress: null, done: false }
          return {
            progress: task.progress,
            done: task.done,
            error: task.error
          }
        }

        case 'uninstall': {
          const tool = tools.get(message.tool || '')
          if (!tool) return { error: `未知工具: ${message.tool}` }
          await tool.uninstall(installRoot, () => {})
          return { success: true, message: `${tool.displayName} 已卸载` }
        }

        case 'switchVersion': {
          const tool = tools.get(message.tool || '')
          if (!tool) return { error: `未知工具: ${message.tool}` }
          if (!message.version) return { error: '未指定版本' }
          await tool.switchVersion(message.version, installRoot)
          return { success: true, message: `已切换到 ${tool.displayName} ${message.version}` }
        }

        case 'listCombos': {
          const builtins = getBuiltinCombos()
          const customs = getCustomCombos()
          return [...builtins, ...customs]
        }

        case 'installCombo': {
          const allCombos = [...getBuiltinCombos(), ...getCustomCombos()]
          const combo = allCombos.find((c: ComboPack) => c.id === message.comboId)
          if (!combo) return { error: `未知组合包: ${message.comboId}` }

          const results: { tool: string; success: boolean; message: string }[] = []
          for (const item of combo.items) {
            const tool = resolveTool(tools, item.toolId)
            try {
              await tool.install(item.version, installRoot, () => {}, { downloadMirror: getDownloadMirror() })
              results.push({ tool: tool.displayName, success: true, message: `${item.version} 安装成功` })
            } catch (err) {
              results.push({
                tool: tool.displayName,
                success: false,
                message: (err as Error).message
              })
            }
          }
          return {
            success: results.every((r) => r.success),
            results,
            message: results.every((r) => r.success)
              ? `组合包 "${combo.name}" 全部安装完成`
              : `组合包 "${combo.name}" 部分安装失败`
          }
        }

        default:
          return { error: `未知消息类型: ${message.type}` }
      }
    } catch (err) {
      const e = err as Error
      ctx.logger.error(`[UniEnv] 错误: ${e.message}`)
      return { error: e.message }
    }
  }
}

export default plugin
