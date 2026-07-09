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

function getPythonUrls(version: string, mirror?: string): Array<{ url: string; label: string }> {
  const installerName = `python-${version}-amd64.exe`
  const urls: Array<{ url: string; label: string }> = []

  if (mirror === 'huawei') {
    urls.push({ url: `https://mirrors.huaweicloud.com/python/${version}/${installerName}`, label: 'Python (华为云)' })
  }
  if (mirror === 'tuna') {
    urls.push({ url: `https://mirrors.tuna.tsinghua.edu.cn/python/${version}/${installerName}`, label: 'Python (TUNA)' })
  }
  // 官方源兜底
  urls.push({ url: `https://www.python.org/ftp/python/${version}/${installerName}`, label: 'Python (官方)' })

  return urls
}

function extractVersion(raw: string): string | null {
  const m = raw.match(/Python\s+(\d+\.\d+\.\d+)/)
  return m ? m[1] : null
}

export const pythonTool: ToolDef = {
  id: 'python',
  displayName: 'Python',
  icon: '\uD83D\uDC0D',
  description: 'Python 编程语言运行时',

  async detect(installRoot: string): Promise<ToolInfo> {
    for (const cmd of ['python', 'python3']) {
      try {
        const { stdout } = await asyncExec(`${cmd} --version`, { timeout: 10000 })
        const v = extractVersion(stdout)
        if (v) return { installed: true, version: v, path: '' }
      } catch {
        // try next
      }
    }

    const td = toolDir(installRoot, 'python')
    const link = join(td, 'current')
    if (existsSync(link)) {
      try {
        const { stdout } = await asyncExec(`"${link}\\python.exe" --version`, { timeout: 10000 })
        const v = extractVersion(stdout)
        if (v) return { installed: true, version: v, path: link }
      } catch {
        // ignore
      }
    }

    return { installed: false }
  },

  async listVersions(): Promise<string[]> {
    return ['3.8.10', '3.9.13', '3.10.11', '3.11.9', '3.12.5']
  },

  async install(version: string, installRoot: string, onProgress: ProgressCallback, opts?: InstallOptions): Promise<void> {
    const dir = versionDir(installRoot, 'python', version)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const installerName = `python-${version}-amd64.exe`
    const installerPath = join(dir, installerName)

    onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Python ${version}...` })
    await downloadWithFallback(getPythonUrls(version, opts?.downloadMirror), installerPath, onProgress)

    onProgress({ stage: 'installing', percent: 95, message: `正在安装 Python ${version}...` })
    await asyncExec(
      `"${installerPath}" /quiet InstallAllUsers=0 TargetDir="${dir}" PrependPath=0 Include_test=0`,
      { timeout: 600000 }
    )

    cleanupFile(installerPath)

    onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' })
    const td = toolDir(installRoot, 'python')
    if (!existsSync(td)) {
      mkdirSync(td, { recursive: true })
    }
    const link = join(td, 'current')
    await createJunction(link, dir)

    onProgress({ stage: 'done', percent: 100, message: `Python ${version} 安装完成` })
  },

  async uninstall(installRoot: string, onProgress: ProgressCallback): Promise<void> {
    onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' })
    const td = toolDir(installRoot, 'python')
    const link = join(td, 'current')
    await removeJunction(link)
    onProgress({ stage: 'done', percent: 100, message: 'Python 已卸载' })
  },

  async switchVersion(version: string, installRoot: string): Promise<void> {
    const dir = versionDir(installRoot, 'python', version)
    if (!existsSync(dir)) {
      throw new Error(`Python ${version} 未安装`)
    }
    const td = toolDir(installRoot, 'python')
    const link = join(td, 'current')
    await createJunction(link, dir)
  }
}
