import { queryAll, queryOne, execute } from '../index'
import type { PluginMeta, PluginConfig, ConfigField } from '@shared/types/plugin.types'

interface PluginRow {
  id: string
  name: string
  version: string
  display_name: string
  description: string
  author: string
  icon: string
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

function parseJsonSafe<T>(json: string | null | undefined, fallback: T): T {
  if (json === null || json === undefined) return fallback
  try {
    const result = JSON.parse(json)
    return (result !== null ? result : fallback) as T
  } catch {
    return fallback
  }
}

function rowToMeta(row: PluginRow): PluginMeta {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    displayName: row.display_name,
    description: row.description,
    author: row.author,
    icon: row.icon || undefined,
    entryMain: row.entry_main,
    entryRenderer: row.entry_renderer,
    permissions: parseJsonSafe(row.permissions, []),
    configSchema: parseJsonSafe(row.config_schema, {}),
    configData: parseJsonSafe(row.config_data, {}),
    enabled: row.enabled === 1,
    installedAt: row.installed_at,
    updatedAt: row.updated_at
  }
}

export const PluginRepository = {
  findAll(): PluginMeta[] {
    const rows = queryAll<PluginRow>('SELECT * FROM plugins ORDER BY installed_at DESC')
    return rows.map(rowToMeta)
  },

  findById(id: string): PluginMeta | null {
    const row = queryOne<PluginRow>('SELECT * FROM plugins WHERE id = ?', [id])
    return row ? rowToMeta(row) : null
  },

  findByName(name: string): PluginMeta | null {
    const row = queryOne<PluginRow>('SELECT * FROM plugins WHERE name = ?', [name])
    return row ? rowToMeta(row) : null
  },

  create(record: {
    id: string
    name: string
    version: string
    display_name: string
    description: string
    author: string
    icon: string
    entry_main: string
    entry_renderer: string
    permissions: string
    config_schema: string
    config_data: string
    enabled: number
    installed_path: string
  }): void {
    execute(
      `INSERT INTO plugins (id, name, version, display_name, description, author, icon,
        entry_main, entry_renderer, permissions, config_schema, config_data, enabled, installed_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id, record.name, record.version, record.display_name,
        record.description, record.author, record.icon, record.entry_main,
        record.entry_renderer, record.permissions, record.config_schema,
        record.config_data, record.enabled, record.installed_path
      ]
    )
  },

  delete(id: string): void {
    execute('DELETE FROM plugins WHERE id = ?', [id])
  },

  updateEnabled(id: string, enabled: boolean): void {
    execute(
      "UPDATE plugins SET enabled = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [enabled ? 1 : 0, id]
    )
  },

  updateConfig(id: string, config: PluginConfig): void {
    execute(
      "UPDATE plugins SET config_data = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
      [JSON.stringify(config), id]
    )
  },

  getConfig(id: string): PluginConfig {
    const row = queryOne<{ config_data: string }>(
      'SELECT config_data FROM plugins WHERE id = ?',
      [id]
    )
    if (!row) return {}
    try {
      return JSON.parse(row.config_data)
    } catch {
      return {}
    }
  },

  getEnabledPlugins(): PluginMeta[] {
    const rows = queryAll<PluginRow>('SELECT * FROM plugins WHERE enabled = 1')
    return rows.map(rowToMeta)
  }
}
