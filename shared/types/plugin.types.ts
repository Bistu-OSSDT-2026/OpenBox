import type { Permission } from './permissions'

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect'
  label: string
  description?: string
  default?: unknown
  required?: boolean
  options?: { label: string; value: string }[]
}

export interface PluginManifest {
  name: string
  version: string
  displayName: string
  description: string
  author: string
  icon?: string
  main: string
  renderer: string
  permissions: Permission[]
  config?: Record<string, ConfigField>
}

export interface PluginMeta {
  id: string
  name: string
  version: string
  displayName: string
  description: string
  author: string
  icon?: string
  entryMain: string
  entryRenderer: string
  permissions: Permission[]
  configSchema: Record<string, ConfigField>
  configData: PluginConfig
  enabled: boolean
  installedAt: string
  updatedAt: string
}

export interface PluginConfig {
  [key: string]: unknown
}

export interface PluginRecord {
  id: string
  name: string
  version: string
  display_name: string
  description: string
  author: string
  icon?: string
  entry_main: string
  entry_renderer: string
  permissions: string
  config_schema: string
  config_data: string
  enabled: number
  installed_path: string
  installed_at: string
  updated_at: string
}

export enum PluginLifecycleStatus {
  Inactive = 'inactive',
  Activating = 'activating',
  Active = 'active',
  Deactivating = 'deactivating',
  Error = 'error'
}

export interface PluginLogger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
}

export interface PluginDatabaseAPI {
  query(sql: string, params?: unknown[]): unknown[]
  execute(sql: string, params?: unknown[]): void
}

export interface PluginHostAPI {
  notify(title: string, body?: string): void
  openDialog(type: 'file' | 'folder'): Promise<string | null>
  fetch(url: string, opts?: RequestInit): Promise<Response>
  readFile(path: string): Promise<Buffer>
  writeFile(path: string, data: string | Buffer): Promise<void>
  registerShortcut(keys: string, handler: () => void): () => void
  emitEvent(event: string, data?: unknown): void
  onEvent(event: string, handler: (data: unknown) => void): () => void
}

export interface PluginContext {
  id: string
  config: PluginConfig
  logger: PluginLogger
  database: PluginDatabaseAPI
  api: PluginHostAPI
}

export interface PluginMain {
  activate(ctx: PluginContext): void | Promise<void>
  deactivate(): void | Promise<void>
  onMessage?(message: unknown): unknown | Promise<unknown>
}

export interface PluginRenderProps {
  config: PluginConfig
  onConfigChange: (config: PluginConfig) => void
  api: {
    sendToBackend(message: unknown): Promise<unknown>
    notify(title: string, body?: string): void
    onBackendMessage(handler: (msg: unknown) => void): () => void
  }
}

export interface PluginMessage {
  type: string
  payload?: unknown
  id?: string
}

export type PluginRendererComponent = React.ComponentType<PluginRenderProps>
