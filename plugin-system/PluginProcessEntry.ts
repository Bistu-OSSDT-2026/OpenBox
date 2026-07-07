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

      pluginModule = require(entryPath)
      if (pluginModule && typeof pluginModule.default === 'object') {
        pluginModule = pluginModule.default
      }

      if (pluginModule?.activate) {
        await pluginModule.activate(message.payload)
      }
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
      process.send({ type: 'error', error: (err as Error).message })
    }
  }
})
