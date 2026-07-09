import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'fs'
import { randomUUID } from 'crypto'
import { app, globalShortcut } from 'electron'

import AdmZip from 'adm-zip'
import { PluginRepository } from '@database/repositories/plugin.repository'
import type { PluginManifest, PluginMeta, PluginConfig, PluginContext, PluginLogger, ConfigField } from '@shared/types/plugin.types'

function copyRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const s = join(src, entry)
    const d = join(dest, entry)
    if (statSync(s).isDirectory()) {
      copyRecursive(s, d)
    } else {
      writeFileSync(d, readFileSync(s))
    }
  }
}
import { execute as dbExecute, queryAll as dbQueryAll } from '@database/index'
import { PluginSandbox } from './PluginSandbox'
import { PluginProtocol } from './PluginProtocol'
import { Permission } from '@shared/types/permissions'
import { PermissionGuard } from './PermissionGuard'
import { EventBus } from './EventBus'


export class PluginManager {
  private sandboxes: Map<string, PluginSandbox> = new Map()
  private eventBus: EventBus = new EventBus()
  private pluginsDir: string

  constructor() {
    this.pluginsDir = join(app.getPath('userData'), 'plugins')
    if (!existsSync(this.pluginsDir)) {
      mkdirSync(this.pluginsDir, { recursive: true })
    }
    PluginProtocol.register(this.pluginsDir)
  }

  get pluginsPath(): string {
    return this.pluginsDir
  }

  async installFromZip(zipPath: string): Promise<PluginMeta> {
    const tempDir = join(this.pluginsDir, `.tmp-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })

    try {
      this.extractZip(zipPath, tempDir)
      return this.installFromDirectory(tempDir)
    } finally {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true })
      }
    }
  }

  private extractZip(zipPath: string, dest: string): void {
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(dest, true)
  }

  installFromDirectory(dirPath: string): PluginMeta {
    const pluginRoot = this.resolvePluginRoot(dirPath)
    const manifestPath = join(pluginRoot, 'plugin.json')
    if (!existsSync(manifestPath)) {
      throw new Error('插件目录中未找到 plugin.json')
    }

    const manifestRaw = readFileSync(manifestPath, 'utf-8')
    const manifest: PluginManifest = JSON.parse(manifestRaw)

    this.validateManifest(manifest)

    const existing = PluginRepository.findByName(manifest.name)
    if (existing) {
      throw new Error(`插件 "${manifest.name}" 已安装`)
    }

    const pluginDir = join(this.pluginsDir, manifest.name)
    if (existsSync(pluginDir)) {
      rmSync(pluginDir, { recursive: true })
    }

    copyRecursive(pluginRoot, pluginDir)

    const id = randomUUID()

    const record = {
      id,
      name: manifest.name,
      version: manifest.version,
      display_name: manifest.displayName,
      description: manifest.description,
      author: manifest.author,
      icon: manifest.icon || '',
      entry_main: manifest.main,
      entry_renderer: manifest.renderer,
      permissions: JSON.stringify(manifest.permissions),
      config_schema: JSON.stringify(manifest.config || {}),
      config_data: JSON.stringify(this.getDefaultsFromSchema(manifest.config || {})),
      enabled: 0,
      installed_path: pluginDir
    }

    PluginRepository.create(record)

    return PluginRepository.findById(id)!
  }

  private resolvePluginRoot(dirPath: string): string {
    if (existsSync(join(dirPath, 'plugin.json'))) {
      return dirPath
    }

    const childDirs = readdirSync(dirPath)
      .map((entry) => join(dirPath, entry))
      .filter((entryPath) => statSync(entryPath).isDirectory())

    if (childDirs.length === 1 && existsSync(join(childDirs[0], 'plugin.json'))) {
      return childDirs[0]
    }

    return dirPath
  }

  async uninstall(id: string): Promise<void> {
    const plugin = PluginRepository.findById(id)
    if (!plugin) {
      throw new Error(`插件 ${id} 未找到`)
    }

    await this.stopPlugin(id)

    PluginRepository.delete(id)

    const pluginDir = join(this.pluginsDir, plugin.name)
    if (existsSync(pluginDir)) {
      rmSync(pluginDir, { recursive: true })
    }
  }

  async activatePlugin(id: string): Promise<void> {
    if (this.sandboxes.has(id)) {
      return
    }

    const plugin = PluginRepository.findById(id)
    if (!plugin) {
      throw new Error(`插件 ${id} 未找到`)
    }

    const pluginDir = join(this.pluginsDir, plugin.name)
    if (!existsSync(pluginDir)) {
      throw new Error(`插件目录不存在: ${pluginDir}`)
    }

    const config = PluginRepository.getConfig(id)
    const permissions = PermissionGuard.parsePermissions(
      plugin.permissions as unknown as string[]
    )

    const logger: PluginLogger = {
      info: (msg, ...args) => this.log(plugin.id, 'info', msg, args),
      warn: (msg, ...args) => this.log(plugin.id, 'warn', msg, args),
      error: (msg, ...args) => this.log(plugin.id, 'error', msg, args),
      debug: (msg, ...args) => this.log(plugin.id, 'debug', msg, args)
    }

    const context: PluginContext = {
      id: plugin.id,
      config,
      logger,
      database: {
        query: (_sql, _params) => {
          const guard = new PermissionGuard(permissions)
          guard.assert(Permission.DatabaseRead)
          return dbQueryAll(_sql, _params)
        },
        execute: (_sql, _params) => {
          const guard = new PermissionGuard(permissions)
          guard.assert(Permission.DatabaseWrite)
          dbExecute(_sql, _params)
        }
      },
      api: {
        notify: (title, body) => {
          this.eventBus.emit('api:notify', { pluginId: plugin.id, title, body })
        },
        openDialog: async () => null,
        fetch: async (url, opts) => fetch(url, opts),
        readFile: async (path) => {
          const { readFile } = await import('fs/promises')
          return readFile(path) as unknown as Buffer
        },
        writeFile: async (path, data) => {
          const { writeFile } = await import('fs/promises')
          await writeFile(path, data)
        },
        registerShortcut: (keys, handler) => {
          const guard = new PermissionGuard(permissions)
          guard.assert(Permission.Shortcut)
          globalShortcut.register(keys, handler)
          return () => {
            globalShortcut.unregister(keys)
          }
        },
        emitEvent: (event, data) => this.eventBus.emit(event, data),
        onEvent: (event, handler) => this.eventBus.on(event, handler)
      }
    }

    const sandbox = new PluginSandbox({
      pluginId: plugin.id,
      mainEntry: plugin.entryMain,
      permissions,
      pluginDir,
      context
    })

    sandbox.on('message', (msg) => {
      this.eventBus.emit(`plugin:message:${plugin.id}`, msg)
    })

    sandbox.on('error', (err) => {
      logger.error(`插件运行错误: ${err.message}`)
      this.eventBus.emit('plugin:error', { pluginId: plugin.id, error: err.message })
    })

    await sandbox.start()
    this.sandboxes.set(id, sandbox)
    PluginRepository.updateEnabled(id, true)
  }

  private async stopPlugin(id: string): Promise<void> {
    const sandbox = this.sandboxes.get(id)
    if (sandbox) {
      this.sandboxes.delete(id)
      await sandbox.stop()
    }
  }

  async deactivatePlugin(id: string): Promise<void> {
    await this.stopPlugin(id)
    PluginRepository.updateEnabled(id, false)
  }

  async activateAllEnabled(): Promise<void> {
    const plugins = PluginRepository.getEnabledPlugins()
    for (const plugin of plugins) {
      try {
        await this.activatePlugin(plugin.id)
      } catch (err) {
        console.error(`Failed to activate plugin ${plugin.name}:`, err)
      }
    }
  }

  async deactivateAll(): Promise<void> {
    // Application shutdown only stops plugin runtimes. It must not turn the
    // user's enabled plugins into disabled plugins in persistent storage.
    const activeIds = Array.from(this.sandboxes.keys())
    await Promise.all(activeIds.map((id) => this.stopPlugin(id)))
  }

  async sendMessage(id: string, message: unknown): Promise<unknown> {
    let sandbox = this.sandboxes.get(id)
    if (!sandbox) {
      const plugin = PluginRepository.findById(id)
      if (plugin?.enabled) {
        await this.activatePlugin(id)
        sandbox = this.sandboxes.get(id)
      }
    }
    if (!sandbox) {
      throw new Error(`插件 ${id} 未激活`)
    }
    return await sandbox.sendMessage({ type: 'message', payload: message })
  }

  async updateConfig(id: string, config: PluginConfig): Promise<void> {
    PluginRepository.updateConfig(id, config)
    if (this.sandboxes.has(id)) {
      await this.stopPlugin(id)
      await this.activatePlugin(id)
    }
  }

  getInstalledPlugins(): PluginMeta[] {
    return PluginRepository.findAll()
  }

  getPlugin(id: string): PluginMeta | null {
    return PluginRepository.findById(id)
  }

  getActivePlugins(): string[] {
    return Array.from(this.sandboxes.keys())
  }

  onEvent(event: string, handler: (data: unknown) => void): () => void {
    return this.eventBus.on(event, handler)
  }

  private log(pluginId: string, level: string, message: string, _args: unknown[]): void {
    dbExecute('INSERT INTO plugin_logs (plugin_id, level, message) VALUES (?, ?, ?)', [pluginId, level, message])
    this.eventBus.emit('plugin:log', { pluginId, level, message })
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.name || !/^[a-z0-9_-]+$/.test(manifest.name)) {
      throw new Error('插件名称只能包含小写字母、数字、下划线和连字符')
    }
    if (!manifest.version) {
      throw new Error('插件版本号不能为空')
    }
    if (!manifest.displayName) {
      throw new Error('插件显示名称不能为空')
    }
    if (!manifest.main) {
      throw new Error('插件主进程入口不能为空')
    }
    if (!manifest.renderer) {
      throw new Error('插件渲染进程入口不能为空')
    }
    if (!Array.isArray(manifest.permissions)) {
      throw new Error('插件权限声明无效')
    }
  }

  private getDefaultsFromSchema(schema: Record<string, ConfigField>): PluginConfig {
    const config: PluginConfig = {}
    for (const [key, field] of Object.entries(schema)) {
      if (field.default !== undefined) {
        config[key] = field.default
      }
    }
    return config
  }
}
