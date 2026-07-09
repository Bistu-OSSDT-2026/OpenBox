import { ipcMain } from 'electron'
import { IpcChannel } from '@shared/types/ipc.types'
import { SettingsRepository } from '@database/repositories/settings.repository'

export function registerSettingsIpc(): void {
  ipcMain.handle(IpcChannel.SettingsGet, async (_event, key: string) => {
    try {
      return SettingsRepository.get(key)
    } catch (err) {
      console.error('[IPC] SettingsGet error:', err)
      return null
    }
  })

  ipcMain.handle(IpcChannel.SettingsSet, async (_event, key: string, value: string) => {
    try {
      SettingsRepository.set(key, value)
      return true
    } catch (err) {
      console.error('[IPC] SettingsSet error:', err)
      return false
    }
  })

  ipcMain.handle(IpcChannel.SettingsGetAll, async () => {
    try {
      return SettingsRepository.getAll()
    } catch (err) {
      console.error('[IPC] SettingsGetAll error:', err)
      return {}
    }
  })
}
