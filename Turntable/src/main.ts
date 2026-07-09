import type { PluginContext, PluginMain } from 'openbox-plugin-api'
import type {
  TurntableItem,
  AddItemPayload,
  UpdateItemPayload,
  DeleteItemPayload,
  ReorderPayload,
  SpinResult
} from './types'

const TABLE_NAME = 'turntable_items'

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA'
]

let database: PluginContext['database'] | null = null
let logger: PluginContext['logger'] | null = null

function ensureTable(): void {
  if (!database) return
  database.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1,
      color TEXT NOT NULL DEFAULT '#FF6B6B',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
}

function pickColor(_index: number): string {
  const existing = database?.query(
    `SELECT color FROM ${TABLE_NAME}`
  ) as TurntableItem[] | undefined
  const used = new Set(existing?.map(r => r.color) ?? [])

  for (const c of DEFAULT_COLORS) {
    if (!used.has(c)) return c
  }
  const hue = (_index * 137.508) % 360
  return `hsl(${hue}, 70%, 60%)`
}

function handleMessage(message: unknown): unknown {
  if (!database) return { error: '数据库未初始化' }

  const msg = message as { type: string; payload?: unknown }

  switch (msg.type) {
    case 'getItems': {
      const rows = database.query(
        `SELECT * FROM ${TABLE_NAME} ORDER BY sort_order ASC, id ASC`
      ) as TurntableItem[]
      return rows
    }

    case 'addItem': {
      const p = msg.payload as AddItemPayload
      if (!p || typeof p.label !== 'string' || !p.label.trim()) {
        return { error: '选项名称不能为空' }
      }
      const weight = Number(p.weight)
      if (!Number.isFinite(weight) || weight <= 0) {
        return { error: '权重必须是大于 0 的数字' }
      }
      const maxOrderRows = database.query(
        `SELECT COALESCE(MAX(sort_order), -1) as max_order FROM ${TABLE_NAME}`
      ) as { max_order: number }[]
      const maxOrder = maxOrderRows[0]?.max_order ?? -1
      const sortOrder = maxOrder + 1
      const color = p.color || pickColor(sortOrder)

      database.execute(
        `INSERT INTO ${TABLE_NAME} (label, weight, color, sort_order) VALUES (?, ?, ?, ?)`,
        [p.label.trim(), weight, color, sortOrder]
      )

      // OpenBox persists the database after every write. That export step can
      // reset SQLite's connection-scoped last_insert_rowid(), so identify the
      // row by the newly allocated sort order instead.
      const result = database.query(
        `SELECT * FROM ${TABLE_NAME} WHERE sort_order = ? ORDER BY id DESC LIMIT 1`,
        [sortOrder]
      ) as TurntableItem[]
      return result[0] || { error: '新增选项失败：未能读取新增记录' }
    }

    case 'updateItem': {
      const p = msg.payload as UpdateItemPayload
      if (!p || !Number.isFinite(Number(p.id))) {
        return { error: '选项 ID 无效' }
      }
      const sets: string[] = []
      const params: unknown[] = []
      if (p.label !== undefined) {
        if (typeof p.label !== 'string' || !p.label.trim()) {
          return { error: '选项名称不能为空' }
        }
        sets.push('label = ?')
        params.push(p.label.trim())
      }
      if (p.weight !== undefined) {
        const weight = Number(p.weight)
        if (!Number.isFinite(weight) || weight <= 0) {
          return { error: '权重必须是大于 0 的数字' }
        }
        sets.push('weight = ?')
        params.push(weight)
      }
      if (p.color !== undefined) {
        sets.push('color = ?')
        params.push(p.color)
      }
      if (sets.length === 0) return { error: '没有要更新的字段' }

      params.push(p.id)
      database.execute(
        `UPDATE ${TABLE_NAME} SET ${sets.join(', ')} WHERE id = ?`,
        params
      )

      const result = database.query(
        `SELECT * FROM ${TABLE_NAME} WHERE id = ?`,
        [p.id]
      ) as TurntableItem[]
      return result[0] || { error: '更新选项失败：未找到该选项' }
    }

    case 'deleteItem': {
      const p = msg.payload as DeleteItemPayload
      database.execute(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [p.id])
      return { success: true }
    }

    case 'reorderItems': {
      const p = msg.payload as ReorderPayload
      p.ids.forEach((id, index) => {
        database!.execute(
          `UPDATE ${TABLE_NAME} SET sort_order = ? WHERE id = ?`,
          [index, id]
        )
      })
      const result = database.query(
        `SELECT * FROM ${TABLE_NAME} ORDER BY sort_order ASC, id ASC`
      ) as TurntableItem[]
      return result
    }

    case 'spin': {
      const items = database.query(
        `SELECT * FROM ${TABLE_NAME} ORDER BY sort_order ASC, id ASC`
      ) as TurntableItem[]

      if (items.length === 0) return { error: '没有可抽奖的选项' }

      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
      let random = Math.random() * totalWeight

      for (const item of items) {
        random -= item.weight
        if (random <= 0) {
          return { winner: item } as SpinResult
        }
      }

      return { winner: items[items.length - 1] } as SpinResult
    }

    default:
      return { error: `未知消息类型: ${msg.type}` }
  }
}

const plugin: PluginMain = {
  activate(ctx: PluginContext) {
    database = ctx.database
    logger = ctx.logger
    ensureTable()
    logger.info('转盘抽奖插件已激活')
  },

  deactivate() {
    database = null
    logger = null
  },

  onMessage(message: unknown): unknown {
    return handleMessage(message)
  }
}

export default plugin
