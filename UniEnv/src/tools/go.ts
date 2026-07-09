import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  asyncExec,
  downloadWithFallback,
  fetchWithTimeout,
  extractZip,
  createJunction,
  removeJunction,
  cleanupFile,
  findTopDir,
  type ToolDef,
  type ToolInfo,
  type ProgressCallback,
  type InstallOptions,
  toolDir,
  versionDir,
  currentLink
} from './base'

function getGoUrls(version: string, mirror?: string): Array<{ url: string; label: string }> {
  const archiveName = `go${version}.windows-amd64.zip`
  const urls: Array<{ url: string; label: string }> = []

  if (mirror === 'aliyun') {
    urls.push({ url: `https://mirrors.aliyun.com/golang/${archiveName}`, label: 'Go (阿里云)' })
  }
  // Google中国镜像
  urls.push({ url: `https://golang.google.cn/dl/${archiveName}`, label: 'Go (Google中国)' })
  // 官方源兜底
  urls.push({ url: `https://go.dev/dl/${archiveName}`, label: 'Go (官方)' })

  return urls
}

function extractVersion(raw: string): string | null {
  const m = raw.match(/go(\d+\.\d+\.\d+)/)
  return m ? m[1] : null
}

export const goTool: ToolDef = {
  id: 'go',
  displayName: 'Go',
  icon: '\uD83D\uDD35',
  description: 'Go 编程语言运行时',

  async detect(installRoot: string): Promise<ToolInfo> {
    try {
      const { stdout } = await asyncExec('go version', { timeout: 10000 })
      const v = extractVersion(stdout)
      if (v) return { installed: true, version: v, path: '' }
    } catch {
      // not on PATH
    }

    const link = join(toolDir(installRoot, 'go'), 'current')
    const goExe = join(link, 'bin', 'go.exe')
    if (existsSync(goExe)) {
      try {
        const { stdout } = await asyncExec(`"${goExe}" version`, { timeout: 10000 })
        const v = extractVersion(stdout)
        if (v) return { installed: true, version: v, path: link }
      } catch {
        // ignore
      }
    }

    return { installed: false }
  },

  async listVersions(): Promise<string[]> {
    return ['1.21.6', '1.22.4', '1.23.0']
  },

  async install(version: string, installRoot: string, onProgress: ProgressCallback, opts?: InstallOptions): Promise<void> {
    const dir = versionDir(installRoot, 'go', version)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const archiveName = `go${version}.windows-amd64.zip`
    const zipPath = join(dir, archiveName)

    onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Go ${version}...` })
    await downloadWithFallback(getGoUrls(version, opts?.downloadMirror), zipPath, onProgress)

    onProgress({ stage: 'installing', percent: 95, message: `正在解压 Go ${version}...` })
    const extractDir = join(dir, 'extracted')
    await extractZip(zipPath, extractDir)

    const goSrcDir = findTopDir(extractDir)
    const finalDir = join(dir, 'go')
    const { renameSync } = await import('fs')
    renameSync(goSrcDir, finalDir)

    cleanupFile(zipPath)

    onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' })
    const td = toolDir(installRoot, 'go')
    if (!existsSync(td)) {
      mkdirSync(td, { recursive: true })
    }
    const link = currentLink(installRoot, 'go')
    await createJunction(link, finalDir)

    onProgress({ stage: 'done', percent: 100, message: `Go ${version} 安装完成` })
  },

  async uninstall(installRoot: string, onProgress: ProgressCallback): Promise<void> {
    onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' })
    const link = currentLink(installRoot, 'go')
    await removeJunction(link)
    onProgress({ stage: 'done', percent: 100, message: 'Go 已卸载' })
  },

  async switchVersion(version: string, installRoot: string): Promise<void> {
    const dir = join(versionDir(installRoot, 'go', version), 'go')
    if (!existsSync(dir)) {
      throw new Error(`Go ${version} 未安装`)
    }
    const td = toolDir(installRoot, 'go')
    const link = join(td, 'current')
    await createJunction(link, dir)
  }
}
