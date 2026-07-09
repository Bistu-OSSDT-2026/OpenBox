import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

export const asyncExec = promisify(exec)

export interface ToolInfo {
  installed: boolean
  version?: string
  path?: string
  error?: string
}

export interface InstallProgress {
  stage: 'downloading' | 'installing' | 'configuring' | 'done'
  percent: number
  message: string
}

export type ProgressCallback = (p: InstallProgress) => void

export interface ToolDef {
  id: string
  displayName: string
  icon: string
  description: string
  detect(installRoot: string): Promise<ToolInfo>
  listVersions(): Promise<string[]>
  install(
    version: string,
    installRoot: string,
    onProgress: ProgressCallback,
    opts?: InstallOptions
  ): Promise<void>
  uninstall(installRoot: string, onProgress: ProgressCallback): Promise<void>
  switchVersion(version: string, installRoot: string): Promise<void>
}

export interface InstallOptions {
  downloadMirror?: string
}

export async function fetchWithTimeout(
  url: string,
  timeoutMs = 120000,
  retries = 2
): Promise<globalThis.Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000)
      await new Promise((r) => setTimeout(r, delay))
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status} ${response.statusText}`)
      }
      return response
    } catch (err) {
      if (controller.signal.aborted) {
        const filename = url.split('/').pop() || url
        lastError = new Error(`下载超时(>${timeoutMs / 1000}s): ${filename}`)
      } else {
        const e = err as Error
        lastError = new Error(`下载失败: ${e.message}`)
      }
      if (attempt === retries) throw lastError
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError ?? new Error('下载失败')
}

export async function downloadWithProgress(
  url: string,
  destPath: string,
  onProgress: ProgressCallback,
  stageLabel: string
): Promise<void> {
  const response = await fetchWithTimeout(url)
  const contentLength = Number(response.headers.get('content-length') || 0)
  const reader = response.body?.getReader()
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(destPath, buffer)
    return
  }

  const chunks: Buffer[] = []
  let downloaded = 0
  let lastReport = 0

  let reading = true
  while (reading) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(Buffer.from(value as Uint8Array))
    downloaded += (value as Uint8Array).length
    if (contentLength > 0 && Date.now() - lastReport > 300) {
      const pct = Math.min(95, Math.round((downloaded / contentLength) * 100))
      onProgress({ stage: 'downloading', percent: pct, message: `${stageLabel} (${formatBytes(downloaded)}/${formatBytes(contentLength)})` })
      lastReport = Date.now()
    }
  }

  const buffer = Buffer.concat(chunks)
  writeFileSync(destPath, buffer)
}

export async function downloadWithFallback(
  urls: Array<{ url: string; label: string }>,
  destPath: string,
  onProgress: ProgressCallback
): Promise<void> {
  let lastError: Error | null = null
  for (const { url, label } of urls) {
    try {
      await downloadWithProgress(url, destPath, onProgress, label)
      return
    } catch (err) {
      lastError = err as Error
    }
  }
  throw lastError ?? new Error('所有下载源均失败')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function toolDir(installRoot: string, toolId: string): string {
  return `${installRoot}\\${toolId}`
}

export function versionDir(installRoot: string, toolId: string, version: string): string {
  return `${toolDir(installRoot, toolId)}\\${version}`
}

export function currentLink(installRoot: string, toolId: string): string {
  return `${toolDir(installRoot, toolId)}\\current`
}

export async function extractZip(zipPath: string, destDir: string): Promise<void> {
  const psCmd = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force"`
  await asyncExec(psCmd, { timeout: 300000 })
}

export async function createJunction(link: string, target: string): Promise<void> {
  try {
    await asyncExec(`cmd /c rmdir "${link}" 2>nul & mklink /J "${link}" "${target}"`, { timeout: 15000 })
  } catch {
    const psCmd = `powershell -NoProfile -NonInteractive -Command "New-Item -ItemType Junction -Path '${link}' -Target '${target}' -Force -ErrorAction Stop"`
    await asyncExec(psCmd, { timeout: 15000 })
  }
}

export async function removeJunction(link: string): Promise<void> {
  try {
    await asyncExec(`cmd /c rmdir "${link}" 2>nul`, { timeout: 10000 })
  } catch {
    // ignore
  }
}

export function cleanupFile(filePath: string): void {
  try {
    if (existsSync(filePath)) unlinkSync(filePath)
  } catch {
    // ignore
  }
}

export function findTopDir(extractDir: string): string {
  const entries: string[] = readdirSync(extractDir)
  const singleDir = entries.find((e: string) => {
    try {
      return statSync(`${extractDir}\\${e}`).isDirectory()
    } catch { return false }
  })
  return singleDir ? `${extractDir}\\${singleDir}` : extractDir
}
