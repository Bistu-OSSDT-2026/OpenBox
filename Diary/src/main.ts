import type { PluginContext, PluginMain } from 'openbox-plugin-api'

interface DiaryMessage {
  type: string
  date?: string
  year?: number
  month?: number
  title?: string
  content?: string
}

interface DiaryEntry {
  entry_date: string
  title: string
  content: string
}

let ctx: PluginContext | null = null

function db() {
  if (!ctx) throw new Error('数据库未初始化')
  return ctx.database
}

function getEntryByDate(date: string): DiaryEntry | null {
  const rows = db().query(
    'SELECT entry_date, title, content FROM diary_entries WHERE entry_date = ?',
    [date]
  ) as DiaryEntry[]
  return rows.length > 0 ? rows[0] : null
}

function getEntriesInMonth(year: number, month: number): { entry_date: string; title: string }[] {
  const m = String(month).padStart(2, '0')
  const prefix = `${year}-${m}`
  return db().query(
    "SELECT entry_date, title FROM diary_entries WHERE entry_date LIKE ? ORDER BY entry_date",
    [`${prefix}%`]
  ) as { entry_date: string; title: string }[]
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const weekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekNames[date.getDay()]}`
}

function handleGetMonthEntries(msg: DiaryMessage) {
  const now = new Date()
  const year = msg.year ?? now.getFullYear()
  const month = msg.month ?? now.getMonth() + 1
  return { entries: getEntriesInMonth(year, month) }
}

function handleGetEntry(msg: DiaryMessage) {
  if (!msg.date) return { error: '缺少日期参数' }
  const entry = getEntryByDate(msg.date)
  return entry ? { entry } : { entry: null }
}

function handleSaveEntry(msg: DiaryMessage) {
  if (!msg.date) return { error: '缺少日期参数' }
  const title = msg.title ?? ''
  const content = msg.content ?? ''
  const existing = getEntryByDate(msg.date)
  if (existing) {
    if (title === '' && content === '') {
      db().execute('DELETE FROM diary_entries WHERE entry_date = ?', [msg.date])
    } else {
      db().execute(
        "UPDATE diary_entries SET title = ?, content = ?, updated_at = datetime('now','localtime') WHERE entry_date = ?",
        [title, content, msg.date]
      )
    }
  } else if (title !== '' || content !== '') {
    db().execute(
      'INSERT INTO diary_entries (entry_date, title, content) VALUES (?, ?, ?)',
      [msg.date, title, content]
    )
  }
  return { success: true }
}

function handleDeleteEntry(msg: DiaryMessage) {
  if (!msg.date) return { error: '缺少日期参数' }
  db().execute('DELETE FROM diary_entries WHERE entry_date = ?', [msg.date])
  return { success: true }
}

function handleExportSingle(msg: DiaryMessage) {
  if (!msg.date) return { error: '缺少日期参数' }
  const entry = getEntryByDate(msg.date)
  if (!entry) return { error: '该日期没有日记' }
  const header = formatDateHeader(msg.date)
  const md = `# ${header}\n\n## ${entry.title}\n\n${entry.content}`
  return { content: md }
}

function handleExportMonth(msg: DiaryMessage) {
  const now = new Date()
  const year = msg.year ?? now.getFullYear()
  const month = msg.month ?? now.getMonth() + 1

  const rows = getEntriesInMonth(year, month)
  if (rows.length === 0) return { error: '该月没有日记' }

  const parts: string[] = []
  const m = String(month).padStart(2, '0')

  for (const row of rows) {
    const entry = getEntryByDate(row.entry_date)
    if (!entry) continue
    const header = formatDateHeader(row.entry_date)
    parts.push(`# ${header}\n\n## ${entry.title}\n\n${entry.content}`)
  }

  const md = parts.join('\n\n---\n\n')
  return { content: md }
}

const plugin: PluginMain = {
  async activate(pluginCtx: PluginContext) {
    ctx = pluginCtx
    ctx.logger.info('日记插件已激活')

    ctx.database.execute(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `)
    ctx.logger.info('日记数据库初始化完成')
  },

  deactivate() {
    ctx = null
  },

  onMessage(message: unknown) {
    const msg = message as DiaryMessage
    switch (msg.type) {
      case 'getMonthEntries':
        return handleGetMonthEntries(msg)
      case 'getEntry':
        return handleGetEntry(msg)
      case 'saveEntry':
        return handleSaveEntry(msg)
      case 'deleteEntry':
        return handleDeleteEntry(msg)
      case 'exportSingle':
        return handleExportSingle(msg)
      case 'exportMonth':
        return handleExportMonth(msg)
      default:
        return { error: `未知消息类型: ${msg.type}` }
    }
  }
}

export default plugin
