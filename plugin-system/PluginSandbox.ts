import { fork, ChildProcess } from 'child_process'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { PluginMessage, PluginContext, PluginMain } from '@shared/types/plugin.types'
import { Permission } from '@shared/types/permissions'
import { PermissionGuard } from './PermissionGuard'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

interface SandboxOptions {
  pluginId: string
  mainEntry: string
  permissions: Permission[]
  pluginDir: string
  context: PluginContext
}

const REQUEST_TIMEOUT = 30000

function resolvePluginMain(loaded: unknown): PluginMain | null {
  let candidate = loaded
  const visited = new Set<unknown>()

  while (
    candidate !== null &&
    (typeof candidate === 'object' || typeof candidate === 'function') &&
    !visited.has(candidate)
  ) {
    visited.add(candidate)
    const plugin = candidate as Partial<PluginMain> & { default?: unknown }
    if (typeof plugin.activate === 'function') {
      return plugin as PluginMain
    }
    candidate = plugin.default
  }

  return null
}

export class PluginSandbox extends EventEmitter {
  private pluginId: string
  private mainEntry: string
  private permissions: Permission[]
  private pluginDir: string
  private context: PluginContext
  private child: ChildProcess | null = null
  private pluginModule: PluginMain | null = null
  private useProcess: boolean
  private pendingRequests: Map<string, PendingRequest> = new Map()

  constructor(options: SandboxOptions) {
    super()
    this.pluginId = options.pluginId
    this.mainEntry = options.mainEntry
    this.permissions = options.permissions
    this.pluginDir = options.pluginDir
    this.context = options.context
    // PluginContext exposes synchronous database functions, which cannot be
    // serialized over child-process IPC. Run plugins in-process so the API
    // contract remains intact; permission checks still live in PluginManager.
    this.useProcess = false
  }

  async start(): Promise<void> {
    if (this.useProcess) {
      await this.startProcess()
    } else {
      await this.startInProcess()
    }
  }

  private async startProcess(): Promise<void> {
    const processEntry = join(__dirname, 'plugin-process.js')
    this.child = fork(processEntry, [], {
      cwd: this.pluginDir,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        PLUGIN_ID: this.pluginId,
        PLUGIN_DIR: this.pluginDir,
        PLUGIN_ENTRY: this.mainEntry
      }
    })

    this.child.on('message', (msg: PluginMessage) => {
      const message = msg as { type: string; requestId?: string; payload?: unknown; error?: string }
      if (message.type === 'response' && message.requestId) {
        const pending = this.pendingRequests.get(message.requestId)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingRequests.delete(message.requestId)
          pending.resolve(message.payload)
        }
      } else if (message.type === 'error' && message.requestId) {
        const pending = this.pendingRequests.get(message.requestId)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingRequests.delete(message.requestId)
          pending.reject(new Error(message.error || '插件运行错误'))
        }
      } else if (message.type !== 'started') {
        this.emit('message', msg)
      }
    })

    this.child.on('exit', (code) => {
      this.emit('exit', code)
      this.child = null
      for (const [, pending] of this.pendingRequests) {
        clearTimeout(pending.timer)
        pending.reject(new Error('插件进程已退出'))
      }
      this.pendingRequests.clear()
    })

    this.child.on('error', (err) => {
      this.emit('error', err)
      for (const [, pending] of this.pendingRequests) {
        clearTimeout(pending.timer)
        pending.reject(err)
      }
      this.pendingRequests.clear()
    })

    const guard = new PermissionGuard(this.permissions)

    const context: PluginContext & { __apiProxies?: Record<string, unknown> } = {
      id: this.pluginId,
      config: this.context.config,
      logger: this.context.logger,
      database: {
        query: (sql, params) => {
          guard.assert(Permission.DatabaseRead)
          return this.context.database.query(sql, params)
        },
        execute: (sql, params) => {
          guard.assert(Permission.DatabaseWrite)
          return this.context.database.execute(sql, params)
        }
      },
      api: {
        notify: (title, body) => {
          guard.assert(Permission.Notification)
          this.child?.send({ type: 'api:notify', payload: { title, body } })
        },
        openDialog: async (type) => {
          guard.assert(Permission.Dialog)
          return this.context.api.openDialog(type)
        },
        fetch: async (url, opts) => {
          guard.assert(Permission.NetworkFetch)
          return this.context.api.fetch(url, opts)
        },
        readFile: async (path) => {
          return this.context.api.readFile(path)
        },
        writeFile: async (path, data) => {
          return this.context.api.writeFile(path, data)
        },
        registerShortcut: (keys, handler) => {
          guard.assert(Permission.Shortcut)
          return this.context.api.registerShortcut(keys, handler)
        },
        emitEvent: (event, data) => {
          return this.context.api.emitEvent(event, data)
        },
        onEvent: (event, handler) => {
          return this.context.api.onEvent(event, handler)
        }
      }
    }

    this.child.send({ type: 'init', payload: context })
  }

  private async startInProcess(): Promise<void> {
    try {
      const entryPath = join(this.pluginDir, this.mainEntry)
      const loaded = await import(pathToFileURL(entryPath).href) as unknown
      this.pluginModule = resolvePluginMain(loaded)
      if (!this.pluginModule) {
        throw new Error('插件主模块未导出 activate 方法')
      }
      await this.pluginModule.activate(this.context)
      this.emit('started')
    } catch (err) {
      this.emit('error', err)
      throw err
    }
  }

  async stop(): Promise<void> {
    if (this.child) {
      this.child.send({ type: 'deactivate' })
      setTimeout(() => {
        if (this.child) {
          this.child.kill()
          this.child = null
        }
        for (const [, pending] of this.pendingRequests) {
          clearTimeout(pending.timer)
          pending.reject(new Error('插件已停止'))
        }
        this.pendingRequests.clear()
      }, 3000)
    } else if (this.pluginModule) {
      if (typeof this.pluginModule.deactivate === 'function') {
        await this.pluginModule.deactivate()
      }
      this.pluginModule = null
    }
  }

  async sendMessage(message: PluginMessage): Promise<unknown> {
    if (this.child) {
      return new Promise<unknown>((resolve, reject) => {
        const requestId = randomUUID()
        const timer = setTimeout(() => {
          this.pendingRequests.delete(requestId)
          reject(new Error('插件请求超时'))
        }, REQUEST_TIMEOUT)
        this.pendingRequests.set(requestId, { resolve, reject, timer })
        this.child?.send({ ...message, requestId })
      })
    }
    if (this.pluginModule?.onMessage) {
      return await this.pluginModule.onMessage(message.payload)
    }
    return null
  }

  get isRunning(): boolean {
    return this.child !== null || this.pluginModule !== null
  }
}
