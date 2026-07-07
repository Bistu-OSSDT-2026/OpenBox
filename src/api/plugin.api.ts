import type { PluginMeta, PluginConfig } from '@shared/types/plugin.types'

declare global {
  interface Window {
    electronAPI: {
      plugin: {
        install(source: { type: 'zip' | 'directory'; path: string }): Promise<{ success: boolean; data?: PluginMeta; error?: string }>
        uninstall(id: string): Promise<{ success: boolean; error?: string }>
        list(): Promise<PluginMeta[]>
        get(id: string): Promise<PluginMeta | null>
        enable(id: string): Promise<{ success: boolean; error?: string }>
        disable(id: string): Promise<{ success: boolean; error?: string }>
        updateConfig(id: string, config: PluginConfig): Promise<{ success: boolean; error?: string }>
        sendMessage(id: string, message: unknown): Promise<{ success: boolean; error?: string }>
        onMessage(callback: (data: { pluginId: string; message: unknown }) => void): () => void
        onLog(callback: (data: { pluginId: string; level: string; message: string }) => void): () => void
        onStatusChange(callback: (data: { pluginId: string; status: string }) => void): () => void
      }
      dialog: {
        openFile(): Promise<string | null>
        openDirectory(): Promise<string | null>
      }
      settings: {
        get(key: string): Promise<string | null>
        set(key: string, value: string): Promise<boolean>
        getAll(): Promise<Record<string, string>>
      }
      app: {
        getVersion(): Promise<string>
        getPlatform(): Promise<string>
      }
    }
  }
}

function getAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available. Ensure preload script is loaded.')
  }
  return window.electronAPI
}

export const pluginApi = {
  installFromZip: async (path: string) => {
    return getAPI().plugin.install({ type: 'zip', path })
  },

  installFromDirectory: async (path: string) => {
    return getAPI().plugin.install({ type: 'directory', path })
  },

  uninstall: async (id: string) => {
    return getAPI().plugin.uninstall(id)
  },

  list: async () => {
    return getAPI().plugin.list()
  },

  get: async (id: string) => {
    return getAPI().plugin.get(id)
  },

  enable: async (id: string) => {
    return getAPI().plugin.enable(id)
  },

  disable: async (id: string) => {
    return getAPI().plugin.disable(id)
  },

  updateConfig: async (id: string, config: PluginConfig) => {
    return getAPI().plugin.updateConfig(id, config)
  },

  sendMessage: async (id: string, message: unknown) => {
    return getAPI().plugin.sendMessage(id, message)
  },

  openFileDialog: async () => {
    return getAPI().dialog.openFile()
  },

  openDirectoryDialog: async () => {
    return getAPI().dialog.openDirectory()
  }
}
