declare module 'openbox-plugin-api' {
  import type { ComponentType } from 'react'

  export interface ConfigField {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect'
    label: string
    description?: string
    default?: unknown
    required?: boolean
    options?: { label: string; value: string }[]
  }

  export interface PluginConfig {
    [key: string]: unknown
  }

  export interface PluginLogger {
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
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
    database: {
      query(sql: string, params?: unknown[]): unknown[]
      execute(sql: string, params?: unknown[]): void
    }
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

  export type PluginRendererComponent = ComponentType<PluginRenderProps>
}
