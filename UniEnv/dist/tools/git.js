"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitTool = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const base_1 = require("./base");
const GIT_VERSIONS = {
    '2.43.0': { subver: '1' },
    '2.44.0': { subver: '1' },
    '2.45.2': { subver: '1' },
    '2.46.0': { subver: '1' }
};
function getGitUrls(version, subver, mirror) {
    const installerName = `Git-${version}-64-bit.exe`;
    const tag = `v${version}.windows.${subver}`;
    const urls = [];
    if (mirror === 'tuna') {
        urls.push({
            url: `https://mirrors.tuna.tsinghua.edu.cn/github-release/git-for-windows/git/${tag}/${installerName}`,
            label: 'Git (TUNA)'
        });
    }
    // 官方源兜底
    urls.push({
        url: `https://github.com/git-for-windows/git/releases/download/${tag}/${installerName}`,
        label: 'Git (官方)'
    });
    return urls;
}
function extractVersion(raw) {
    const m = raw.match(/git\s+version\s+(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
}
exports.gitTool = {
    id: 'git',
    displayName: 'Git',
    icon: '\uD83D\uDD27',
    description: 'Git 分布式版本控制系统',
    async detect(installRoot) {
        try {
            const { stdout } = await (0, base_1.asyncExec)('git --version', { timeout: 10000 });
            const v = extractVersion(stdout);
            if (v)
                return { installed: true, version: v, path: '' };
        }
        catch {
            // not on PATH
        }
        const link = (0, path_1.join)((0, base_1.toolDir)(installRoot, 'git'), 'current');
        const gitExe = (0, path_1.join)(link, 'bin', 'git.exe');
        if ((0, fs_1.existsSync)(gitExe)) {
            try {
                const { stdout } = await (0, base_1.asyncExec)(`"${gitExe}" --version`, { timeout: 10000 });
                const v = extractVersion(stdout);
                if (v)
                    return { installed: true, version: v, path: link };
            }
            catch {
                // ignore
            }
        }
        return { installed: false };
    },
    async listVersions() {
        return Object.keys(GIT_VERSIONS);
    },
    async install(version, installRoot, onProgress, opts) {
        const info = GIT_VERSIONS[version];
        if (!info)
            throw new Error(`Git ${version} 的版本信息未维护，请更新插件`);
        const dir = (0, base_1.versionDir)(installRoot, 'git', version);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        const installerName = `Git-${version}-64-bit.exe`;
        const installerPath = (0, path_1.join)(dir, installerName);
        onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Git ${version}...` });
        await (0, base_1.downloadWithFallback)(getGitUrls(version, info.subver, opts?.downloadMirror), installerPath, onProgress);
        onProgress({ stage: 'installing', percent: 95, message: `正在安装 Git ${version}...` });
        await (0, base_1.asyncExec)(`"${installerPath}" /VERYSILENT /DIR="${dir}" /NORESTART /NOCANCEL /SP- /NOICONS`, { timeout: 600000 });
        (0, base_1.cleanupFile)(installerPath);
        onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' });
        const td = (0, base_1.toolDir)(installRoot, 'git');
        if (!(0, fs_1.existsSync)(td)) {
            (0, fs_1.mkdirSync)(td, { recursive: true });
        }
        const link = (0, base_1.currentLink)(installRoot, 'git');
        await (0, base_1.createJunction)(link, dir);
        onProgress({ stage: 'done', percent: 100, message: `Git ${version} 安装完成` });
    },
    async uninstall(installRoot, onProgress) {
        onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' });
        const link = (0, base_1.currentLink)(installRoot, 'git');
        await (0, base_1.removeJunction)(link);
        onProgress({ stage: 'done', percent: 100, message: 'Git 已卸载' });
    },
    async switchVersion(version, installRoot) {
        const dir = (0, base_1.versionDir)(installRoot, 'git', version);
        if (!(0, fs_1.existsSync)(dir)) {
            throw new Error(`Git ${version} 未安装`);
        }
        const td = (0, base_1.toolDir)(installRoot, 'git');
        const link = (0, path_1.join)(td, 'current');
        await (0, base_1.createJunction)(link, dir);
    }
};
//# sourceMappingURL=git.js.map