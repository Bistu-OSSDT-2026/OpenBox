import type { PluginMeta, PluginConfig } from './plugin.types'

export enum IpcChannel {
  // Plugin CRUD
  PluginInstall = 'plugin:install',
  PluginUninstall = 'plugin:uninstall',
  PluginList = 'plugin:list',
  PluginGet = 'plugin:get',
  PluginEnable = 'plugin:enable',
  PluginDisable = 'plugin:disable',
  PluginUpdateConfig = 'plugin:update-config',
  PluginSendMessage = 'plugin:send-message',

  // Plugin lifecycle events (main -> renderer)
  PluginMessage = 'plugin:message',
  PluginLog = 'plugin:log',
  PluginStatusChange = 'plugin:status-change',

  // Settings
  SettingsGet = 'settings:get',
  SettingsSet = 'settings:set',
  SettingsGetAll = 'settings:get-all',

  // Dialog
  DialogOpenFile = 'dialog:open-file',
  DialogOpenDirectory = 'dialog:open-directory',

  // App
  AppGetVersion = 'app:get-version',
  AppGetPlatform = 'app:get-platform'
}

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface InstallPluginRequest {
  source: 'zip' | 'directory'
  path: string
}

export interface InstallPluginResponse {
  plugin: PluginMeta
}

export interface UninstallPluginRequest {
  id: string
}

export interface EnablePluginRequest {
  id: string
}

export interface DisablePluginRequest {
  id: string
}

export interface UpdatePluginConfigRequest {
  id: string
  config: PluginConfig
}

export interface PluginSendMessageRequest {
  id: string
  message: unknown
}

export interface PluginMessageEvent {
  pluginId: string
  message: unknown
}

export interface PluginStatusChangeEvent {
  pluginId: string
  status: string
}

export interface PluginLogEvent {
  pluginId: string
  level: string
  message: string
}
