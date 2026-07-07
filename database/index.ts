import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { app } from 'electron'

let db: SqlJsDatabase | null = null
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  return join(dbDir, 'openbox.db')
}

function getWasmPath(): string {
  try {
    const sqlJsPath = require.resolve('sql.js')
    const sqlJsDir = dirname(sqlJsPath)
    const wasmPath = join(sqlJsDir, 'sql-wasm.wasm')
    if (existsSync(wasmPath)) {
      return wasmPath
    }
  } catch {
    // fallback
  }
  try {
    const appRoot = app.getAppPath()
    const wasmPath = join(appRoot, 'node_modules/sql.js/dist/sql-wasm.wasm')
    if (existsSync(wasmPath)) {
      return wasmPath
    }
  } catch {
    // fallback
  }
  return ''
}

export async function initDatabase(dbPath?: string): Promise<SqlJsDatabase | null> {
  if (db) {
    return db
  }

  try {
    const wasmPath = getWasmPath()
    if (wasmPath && existsSync(wasmPath)) {
      const wasmBinary = readFileSync(wasmPath)
      SQL = await initSqlJs({ wasmBinary })
    } else {
      SQL = await initSqlJs()
    }
  } catch (err) {
    console.error('Failed to initialize sql.js:', err)
    return null
  }

  const path = dbPath || getDbPath()

  try {
    if (existsSync(path)) {
      const buffer = readFileSync(path)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    runMigrations(db)
    saveDatabase(path)
  } catch (err) {
    console.error('Failed to setup database file:', err)
    db = new SQL.Database()
    runMigrations(db)
  }

  return db
}

function runMigrations(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      author TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      entry_main TEXT NOT NULL,
      entry_renderer TEXT DEFAULT '',
      permissions TEXT DEFAULT '[]',
      config_schema TEXT DEFAULT '{}',
      config_data TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      installed_path TEXT NOT NULL,
      installed_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plugin_id TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_plugin_logs_plugin_id ON plugin_logs(plugin_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_plugin_logs_timestamp ON plugin_logs(timestamp)')
}

function saveDatabase(path: string): void {
  if (!db) return
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(path, buffer)
  } catch (err) {
    console.error('Failed to save database:', err)
  }
}

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  return db
}

export function persistDatabase(): void {
  if (!db) return
  try {
    saveDatabase(getDbPath())
  } catch {
    // ignore
  }
}

export function closeDatabase(): void {
  if (db) {
    persistDatabase()
    db.close()
    db = null
  }
}

export function queryAll<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): T[] {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  if (params) {
    if (!stmt.bind(params)) {
      stmt.free()
      console.error('[DB] queryAll bind failed:', sql, params)
      return []
    }
  }
  const results: T[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return results
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): T | null {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  if (params) {
    if (!stmt.bind(params)) {
      stmt.free()
      console.error('[DB] queryOne bind failed:', sql, params)
      return null
    }
  }
  let result: T | null = null
  if (stmt.step()) {
    result = stmt.getAsObject() as T
  }
  stmt.free()
  return result
}

export function execute(sql: string, params?: unknown[]): void {
  const database = getDatabase()
  if (params) {
    const stmt = database.prepare(sql)
    if (!stmt.bind(params)) {
      stmt.free()
      console.error('[DB] execute bind failed:', sql, params)
      return
    }
    stmt.step()
    stmt.free()
  } else {
    database.run(sql)
  }
  persistDatabase()
}
