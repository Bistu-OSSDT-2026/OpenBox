import { resolve } from 'path'

let pluginModule: {
  activate: (ctx: unknown) => void | Promise<void>
  deactivate: () => void | Promise<void>
  onMessage?: (msg: unknown) => unknown | Promise<unknown>
  default?: {
    activate: (ctx: unknown) => void | Promise<void>
    deactivate: () => void | Promise<void>
    onMessage?: (msg: unknown) => unknown | Promise<unknown>
  }
} | null = null

function resolvePluginMain(loaded: unknown): typeof pluginModule {
  let candidate = loaded
  const visited = new Set<unknown>()

  while (
    candidate !== null &&
    (typeof candidate === 'object' || typeof candidate === 'function') &&
    !visited.has(candidate)
  ) {
    visited.add(candidate)
    const plugin = candidate as {
      activate?: unknown
      deactivate?: unknown
      onMessage?: unknown
      default?: unknown
    }
    if (typeof plugin.activate === 'function') {
      return plugin as NonNullable<typeof pluginModule>
    }
    candidate = plugin.default
  }

  return null
}

process.on('message', async (msg: unknown) => {
  const message = msg as {
    type: string
    payload?: unknown
    requestId?: string
  }

  try {
    if (message.type === 'init') {
      const pluginDir = process.env.PLUGIN_DIR || ''
      const entryName = process.env.PLUGIN_ENTRY || ''
      const entryPath = resolve(pluginDir, entryName)

      const mod = await import(entryPath)
      pluginModule = resolvePluginMain(mod)
      if (!pluginModule) {
        throw new Error('插件主模块未导出 activate 方法')
      }
      await pluginModule.activate(message.payload)
      if (process.send) {
        process.send({ type: 'started' })
      }
    } else if (message.type === 'message') {
      let result: unknown = null
      if (pluginModule?.onMessage) {
        result = await pluginModule.onMessage(message.payload)
      }
      if (message.requestId && process.send) {
        process.send({ type: 'response', requestId: message.requestId, payload: result })
      }
    } else if (message.type === 'deactivate') {
      if (pluginModule?.deactivate) {
        await pluginModule.deactivate()
      }
      process.exit(0)
    }
  } catch (err) {
    if (process.send) {
      process.send({
        type: 'error',
        requestId: message.requestId,
        error: (err as Error).message
      })
    }
  }
})
