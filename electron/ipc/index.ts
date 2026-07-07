import type { PluginManager } from '../../plugin-system/PluginManager'
import { registerPluginIpc } from './plugin.ipc'
import { registerSettingsIpc } from './settings.ipc'

export function registerAllIpc(pluginManager: PluginManager): void {
  registerPluginIpc(pluginManager)
  registerSettingsIpc()
}
