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

function extractVersion(raw: string): string | null {
  const m = raw.match(/v?(\d+\.\d+\.\d+)/)
  return m ? m[1] : null
}

function getNodeUrls(version: string, mirror?: string): Array<{ url: string; label: string }> {
  const zipName = `node-v${version}-win-x64.zip`
  const urls: Array<{ url: string; label: string }> = []

  if (mirror === 'huawei') {
    urls.push({ url: `https://mirrors.huaweicloud.com/nodejs/v${version}/${zipName}`, label: 'Node.js (华为云)' })
  }
  if (mirror === 'tuna') {
    urls.push({ url: `https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v${version}/${zipName}`, label: 'Node.js (TUNA)' })
  }
  // 淘宝 NPM 镜像（已验证可用）
  urls.push({ url: `https://npmmirror.com/mirrors/node/v${version}/${zipName}`, label: 'Node.js (淘宝NPM)' })
  // 官方源兜底
  urls.push({ url: `https://nodejs.org/dist/v${version}/${zipName}`, label: 'Node.js (官方)' })

  return urls
}

export const nodeTool: ToolDef = {
  id: 'node',
  displayName: 'Node.js',
  icon: '\uD83D\uDFE2',
  description: 'Node.js 运行时与 npm 包管理器',

  async detect(installRoot: string): Promise<ToolInfo> {
    try {
      const { stdout } = await asyncExec('node --version', { timeout: 10000 })
      const v = extractVersion(stdout)
      if (v) return { installed: true, version: v, path: '' }
    } catch {
      // not on PATH
    }

    const link = join(toolDir(installRoot, 'node'), 'current')
    if (existsSync(join(link, 'node.exe'))) {
      try {
        const { stdout } = await asyncExec(`"${link}\\node.exe" --version`, { timeout: 10000 })
        const v = extractVersion(stdout)
        if (v) return { installed: true, version: v, path: link }
      } catch {
        // ignore
      }
    }

    return { installed: false }
  },

  async listVersions(): Promise<string[]> {
    return ['16.20.2', '18.20.4', '20.15.1', '22.5.1']
  },

  async install(version: string, installRoot: string, onProgress: ProgressCallback, opts?: InstallOptions): Promise<void> {
    const dir = versionDir(installRoot, 'node', version)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const zipName = `node-v${version}-win-x64.zip`
    const zipPath = join(dir, zipName)

    onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Node.js ${version}...` })
    await downloadWithFallback(getNodeUrls(version, opts?.downloadMirror), zipPath, onProgress)

    onProgress({ stage: 'installing', percent: 95, message: `正在解压 Node.js ${version}...` })
    await extractZip(zipPath, dir)

    const srcDir = findTopDir(dir)
    const finalDir = join(dir, 'runtime')
    if (srcDir !== finalDir) {
      const { renameSync } = await import('fs')
      renameSync(srcDir, finalDir)
    }

    cleanupFile(zipPath)

    onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' })
    const td = toolDir(installRoot, 'node')
    if (!existsSync(td)) {
      mkdirSync(td, { recursive: true })
    }
    const link = currentLink(installRoot, 'node')
    await createJunction(link, finalDir)

    onProgress({ stage: 'done', percent: 100, message: `Node.js ${version} 安装完成` })
  },

  async uninstall(installRoot: string, onProgress: ProgressCallback): Promise<void> {
    onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' })
    const link = currentLink(installRoot, 'node')
    await removeJunction(link)
    onProgress({ stage: 'done', percent: 100, message: 'Node.js 已卸载' })
  },

  async switchVersion(version: string, installRoot: string): Promise<void> {
    const dir = join(versionDir(installRoot, 'node', version), 'runtime')
    if (!existsSync(dir)) {
      throw new Error(`Node.js ${version} 未安装`)
    }
    const td = toolDir(installRoot, 'node')
    const link = join(td, 'current')
    await createJunction(link, dir)
  }
}
