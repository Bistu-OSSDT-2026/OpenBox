import { ipcMain, dialog } from 'electron'
import { IpcChannel } from '@shared/types/ipc.types'
import type { PluginManager } from '../../plugin-system/PluginManager'

export function registerPluginIpc(pluginManager: PluginManager): void {
  ipcMain.handle(IpcChannel.PluginList, () => {
    try {
      return pluginManager.getInstalledPlugins()
    } catch (err) {
      console.error('[IPC] PluginList error:', err)
      return []
    }
  })

  ipcMain.handle(IpcChannel.PluginGet, (_event, id: string) => {
    try {
      return pluginManager.getPlugin(id)
    } catch (err) {
      console.error('[IPC] PluginGet error:', err)
      return null
    }
  })

  ipcMain.handle(IpcChannel.PluginInstall, async (_event, source: { type: 'zip' | 'directory'; path: string }) => {
    let installedId: string | null = null
    try {
      let result
      if (source.type === 'zip') {
        result = await pluginManager.installFromZip(source.path)
      } else {
        result = pluginManager.installFromDirectory(source.path)
      }
      installedId = result.id
      await pluginManager.activatePlugin(result.id)
      return { success: true, data: result }
    } catch (err) {
      if (installedId) {
        try {
          await pluginManager.uninstall(installedId)
        } catch (rollbackError) {
          console.error('[IPC] Failed to roll back plugin installation:', rollbackError)
        }
      }
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IpcChannel.PluginUninstall, async (_event, id: string) => {
    try {
      await pluginManager.uninstall(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IpcChannel.PluginEnable, async (_event, id: string) => {
    try {
      await pluginManager.activatePlugin(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IpcChannel.PluginDisable, async (_event, id: string) => {
    try {
      await pluginManager.deactivatePlugin(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IpcChannel.PluginUpdateConfig, async (_event, id: string, config: Record<string, unknown>) => {
    try {
      await pluginManager.updateConfig(id, config)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IpcChannel.PluginSendMessage, async (_event, id: string, message: unknown) => {
    try {
      const result = await pluginManager.sendMessage(id, message)
      return result ?? { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IpcChannel.DialogOpenFile, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: '插件包', extensions: ['zip'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })
      return result.canceled ? null : result.filePaths[0]
    } catch (err) {
      console.error('[IPC] DialogOpenFile error:', err)
      return null
    }
  })

  ipcMain.handle(IpcChannel.DialogOpenDirectory, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      return result.canceled ? null : result.filePaths[0]
    } catch (err) {
      console.error('[IPC] DialogOpenDirectory error:', err)
      return null
    }
  })
}
