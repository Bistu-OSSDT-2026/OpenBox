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

const JAVA_VERSIONS: Record<string, { build: number }> = {
  '17.0.11': { build: 9 },
  '17.0.12': { build: 12 },
  '21.0.3': { build: 9 },
  '21.0.5': { build: 5 },
  '22.0.1': { build: 8 }
}

function getJavaUrls(major: string, version: string, build: number, mirror?: string): Array<{ url: string; label: string }> {
  const archiveName = `OpenJDK${major}U-jdk_x64_windows_hotspot_${version}_${build}.zip`
  const tag = `jdk-${version}+${build}`
  const urls: Array<{ url: string; label: string }> = []

  if (mirror === 'tuna') {
    urls.push({
      url: `https://mirrors.tuna.tsinghua.edu.cn/github-release/adoptium/temurin${major}-binaries/${encodeURIComponent(tag)}/${archiveName}`,
      label: 'JDK (TUNA)'
    })
  }

  // 官方 GitHub 发布源 (总是作为兜底)
  urls.push({
    url: `https://github.com/adoptium/temurin${major}-binaries/releases/download/${encodeURIComponent(tag)}/${archiveName}`,
    label: 'JDK (官方)'
  })

  return urls
}

function extractVersion(raw: string): string | null {
  const m = raw.match(/(\d+\.\d+\.\d+)[._]?(\d+)?/)
  return m ? m[1] : null
}

export const javaTool: ToolDef = {
  id: 'java',
  displayName: 'Java JDK',
  icon: '\u2615',
  description: 'Java 开发工具包 (Eclipse Adoptium)',

  async detect(installRoot: string): Promise<ToolInfo> {
    try {
      const { stdout, stderr } = await asyncExec('java -version', { timeout: 10000 })
      const v = extractVersion(stderr || stdout)
      if (v) return { installed: true, version: v, path: '' }
    } catch {
      // not on PATH
    }

    const link = join(toolDir(installRoot, 'java'), 'current')
    const javaExe = join(link, 'bin', 'java.exe')
    if (existsSync(javaExe)) {
      try {
        const { stdout, stderr } = await asyncExec(`"${javaExe}" -version`, { timeout: 10000 })
        const v = extractVersion(stderr || stdout)
        if (v) return { installed: true, version: v, path: link }
      } catch {
        // ignore
      }
    }

    return { installed: false }
  },

  async listVersions(): Promise<string[]> {
    return Object.keys(JAVA_VERSIONS)
  },

  async install(version: string, installRoot: string, onProgress: ProgressCallback, opts?: InstallOptions): Promise<void> {
    const info = JAVA_VERSIONS[version]
    if (!info) throw new Error(`JDK ${version} 的版本信息未维护，请更新插件`)

    const dir = versionDir(installRoot, 'java', version)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const major = version.split('.')[0]
    const archiveName = `OpenJDK${major}U-jdk_x64_windows_hotspot_${version}_${info.build}.zip`
    const zipPath = join(dir, archiveName)

    onProgress({ stage: 'downloading', percent: 0, message: `正在下载 JDK ${version}...` })
    await downloadWithFallback(getJavaUrls(major, version, info.build, opts?.downloadMirror), zipPath, onProgress)

    onProgress({ stage: 'installing', percent: 95, message: `正在解压 JDK ${version}...` })
    const extractDir = join(dir, 'extracted')
    await extractZip(zipPath, extractDir)

    const jdkSrcDir = findTopDir(extractDir)
    const finalDir = join(dir, 'jdk')
    const { renameSync } = await import('fs')
    renameSync(jdkSrcDir, finalDir)

    cleanupFile(zipPath)

    onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' })
    const td = toolDir(installRoot, 'java')
    if (!existsSync(td)) {
      mkdirSync(td, { recursive: true })
    }
    const link = currentLink(installRoot, 'java')
    await createJunction(link, finalDir)

    onProgress({ stage: 'done', percent: 100, message: `JDK ${version} 安装完成` })
  },

  async uninstall(installRoot: string, onProgress: ProgressCallback): Promise<void> {
    onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' })
    const link = currentLink(installRoot, 'java')
    await removeJunction(link)
    onProgress({ stage: 'done', percent: 100, message: 'JDK 已卸载' })
  },

  async switchVersion(version: string, installRoot: string): Promise<void> {
    const dir = join(versionDir(installRoot, 'java', version), 'jdk')
    if (!existsSync(dir)) {
      throw new Error(`JDK ${version} 未安装`)
    }
    const td = toolDir(installRoot, 'java')
    const link = join(td, 'current')
    await createJunction(link, dir)
  }
}
