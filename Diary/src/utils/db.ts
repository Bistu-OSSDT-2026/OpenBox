import type { PluginRenderProps } from 'openbox-plugin-api'

let _api: PluginRenderProps['api'] | null = null

export function setApi(api: PluginRenderProps['api']) {
  _api = api
}

function api() {
  if (!_api) throw new Error('API 未初始化')
  return _api
}

export interface DiaryEntry {
  entry_date: string
  title: string
  content: string
}

export interface DiaryMonthEntry {
  entry_date: string
  title: string
}

export async function getMonthEntries(year: number, month: number): Promise<DiaryMonthEntry[]> {
  const res = await api().sendToBackend({ type: 'getMonthEntries', year, month }) as { entries: DiaryMonthEntry[] }
  return res.entries ?? []
}

export async function getEntry(date: string): Promise<DiaryEntry | null> {
  const res = await api().sendToBackend({ type: 'getEntry', date }) as { entry: DiaryEntry | null }
  return res.entry ?? null
}

export async function saveEntry(date: string, title: string, content: string): Promise<boolean> {
  const res = await api().sendToBackend({ type: 'saveEntry', date, title, content }) as { success: boolean }
  return res.success === true
}

export async function deleteEntry(date: string): Promise<boolean> {
  const res = await api().sendToBackend({ type: 'deleteEntry', date }) as { success: boolean }
  return res.success === true
}

export async function exportSingle(date: string): Promise<string> {
  const res = await api().sendToBackend({ type: 'exportSingle', date }) as { content?: string; error?: string }
  if (res.error) throw new Error(res.error)
  return res.content ?? ''
}

export async function exportMonth(year: number, month: number): Promise<string> {
  const res = await api().sendToBackend({ type: 'exportMonth', year, month }) as { content?: string; error?: string }
  if (res.error) throw new Error(res.error)
  return res.content ?? ''
}
