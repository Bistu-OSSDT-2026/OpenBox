import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  asyncExec,
  downloadWithFallback,
  fetchWithTimeout,
  createJunction,
  removeJunction,
  cleanupFile,
  type ToolDef,
  type ToolInfo,
  type ProgressCallback,
  type InstallOptions,
  toolDir,
  versionDir,
  currentLink
} from './base'

const GIT_VERSIONS: Record<string, { subver: string }> = {
  '2.43.0': { subver: '1' },
  '2.44.0': { subver: '1' },
  '2.45.2': { subver: '1' },
  '2.46.0': { subver: '1' }
}

function getGitUrls(version: string, subver: string, mirror?: string): Array<{ url: string; label: string }> {
  const installerName = `Git-${version}-64-bit.exe`
  const tag = `v${version}.windows.${subver}`
  const urls: Array<{ url: string; label: string }> = []

  if (mirror === 'tuna') {
    urls.push({
      url: `https://mirrors.tuna.tsinghua.edu.cn/github-release/git-for-windows/git/${tag}/${installerName}`,
      label: 'Git (TUNA)'
    })
  }
  // 官方源兜底
  urls.push({
    url: `https://github.com/git-for-windows/git/releases/download/${tag}/${installerName}`,
    label: 'Git (官方)'
  })

  return urls
}

function extractVersion(raw: string): string | null {
  const m = raw.match(/git\s+version\s+(\d+\.\d+\.\d+)/)
  return m ? m[1] : null
}

export const gitTool: ToolDef = {
  id: 'git',
  displayName: 'Git',
  icon: '\uD83D\uDD27',
  description: 'Git 分布式版本控制系统',

  async detect(installRoot: string): Promise<ToolInfo> {
    try {
      const { stdout } = await asyncExec('git --version', { timeout: 10000 })
      const v = extractVersion(stdout)
      if (v) return { installed: true, version: v, path: '' }
    } catch {
      // not on PATH
    }

    const link = join(toolDir(installRoot, 'git'), 'current')
    const gitExe = join(link, 'bin', 'git.exe')
    if (existsSync(gitExe)) {
      try {
        const { stdout } = await asyncExec(`"${gitExe}" --version`, { timeout: 10000 })
        const v = extractVersion(stdout)
        if (v) return { installed: true, version: v, path: link }
      } catch {
        // ignore
      }
    }

    return { installed: false }
  },

  async listVersions(): Promise<string[]> {
    return Object.keys(GIT_VERSIONS)
  },

  async install(version: string, installRoot: string, onProgress: ProgressCallback, opts?: InstallOptions): Promise<void> {
    const info = GIT_VERSIONS[version]
    if (!info) throw new Error(`Git ${version} 的版本信息未维护，请更新插件`)

    const dir = versionDir(installRoot, 'git', version)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const installerName = `Git-${version}-64-bit.exe`
    const installerPath = join(dir, installerName)

    onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Git ${version}...` })
    await downloadWithFallback(getGitUrls(version, info.subver, opts?.downloadMirror), installerPath, onProgress)

    onProgress({ stage: 'installing', percent: 95, message: `正在安装 Git ${version}...` })
    await asyncExec(
      `"${installerPath}" /VERYSILENT /DIR="${dir}" /NORESTART /NOCANCEL /SP- /NOICONS`,
      { timeout: 600000 }
    )

    cleanupFile(installerPath)

    onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' })
    const td = toolDir(installRoot, 'git')
    if (!existsSync(td)) {
      mkdirSync(td, { recursive: true })
    }
    const link = currentLink(installRoot, 'git')
    await createJunction(link, dir)

    onProgress({ stage: 'done', percent: 100, message: `Git ${version} 安装完成` })
  },

  async uninstall(installRoot: string, onProgress: ProgressCallback): Promise<void> {
    onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' })
    const link = currentLink(installRoot, 'git')
    await removeJunction(link)
    onProgress({ stage: 'done', percent: 100, message: 'Git 已卸载' })
  },

  async switchVersion(version: string, installRoot: string): Promise<void> {
    const dir = versionDir(installRoot, 'git', version)
    if (!existsSync(dir)) {
      throw new Error(`Git ${version} 未安装`)
    }
    const td = toolDir(installRoot, 'git')
    const link = join(td, 'current')
    await createJunction(link, dir)
  }
}
