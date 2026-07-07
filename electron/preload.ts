import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/types/ipc.types'

const api = {
  // Plugin management
  plugin: {
    install: (source: { type: 'zip' | 'directory'; path: string }) =>
      ipcRenderer.invoke(IpcChannel.PluginInstall, source),
    uninstall: (id: string) =>
      ipcRenderer.invoke(IpcChannel.PluginUninstall, id),
    list: () =>
      ipcRenderer.invoke(IpcChannel.PluginList),
    get: (id: string) =>
      ipcRenderer.invoke(IpcChannel.PluginGet, id),
    enable: (id: string) =>
      ipcRenderer.invoke(IpcChannel.PluginEnable, id),
    disable: (id: string) =>
      ipcRenderer.invoke(IpcChannel.PluginDisable, id),
    updateConfig: (id: string, config: Record<string, unknown>) =>
      ipcRenderer.invoke(IpcChannel.PluginUpdateConfig, id, config),
    sendMessage: (id: string, message: unknown) =>
      ipcRenderer.invoke(IpcChannel.PluginSendMessage, id, message),
    onMessage: (callback: (data: { pluginId: string; message: unknown }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { pluginId: string; message: unknown }) =>
        callback(data)
      ipcRenderer.on(IpcChannel.PluginMessage, handler)
      return () => ipcRenderer.removeListener(IpcChannel.PluginMessage, handler)
    },
    onLog: (callback: (data: { pluginId: string; level: string; message: string }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { pluginId: string; level: string; message: string }
      ) => callback(data)
      ipcRenderer.on(IpcChannel.PluginLog, handler)
      return () => ipcRenderer.removeListener(IpcChannel.PluginLog, handler)
    },
    onStatusChange: (callback: (data: { pluginId: string; status: string }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { pluginId: string; status: string }
      ) => callback(data)
      ipcRenderer.on(IpcChannel.PluginStatusChange, handler)
      return () => ipcRenderer.removeListener(IpcChannel.PluginStatusChange, handler)
    }
  },

  // Dialogs
  dialog: {
    openFile: () => ipcRenderer.invoke(IpcChannel.DialogOpenFile),
    openDirectory: () => ipcRenderer.invoke(IpcChannel.DialogOpenDirectory)
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke(IpcChannel.SettingsGet, key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke(IpcChannel.SettingsSet, key, value),
    getAll: () => ipcRenderer.invoke(IpcChannel.SettingsGetAll)
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke(IpcChannel.AppGetVersion),
    getPlatform: () => ipcRenderer.invoke(IpcChannel.AppGetPlatform)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
