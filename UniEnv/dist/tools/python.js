"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonTool = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const base_1 = require("./base");
function getPythonUrls(version, mirror) {
    const installerName = `python-${version}-amd64.exe`;
    const urls = [];
    if (mirror === 'huawei') {
        urls.push({ url: `https://mirrors.huaweicloud.com/python/${version}/${installerName}`, label: 'Python (华为云)' });
    }
    if (mirror === 'tuna') {
        urls.push({ url: `https://mirrors.tuna.tsinghua.edu.cn/python/${version}/${installerName}`, label: 'Python (TUNA)' });
    }
    // 官方源兜底
    urls.push({ url: `https://www.python.org/ftp/python/${version}/${installerName}`, label: 'Python (官方)' });
    return urls;
}
function extractVersion(raw) {
    const m = raw.match(/Python\s+(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
}
exports.pythonTool = {
    id: 'python',
    displayName: 'Python',
    icon: '\uD83D\uDC0D',
    description: 'Python 编程语言运行时',
    async detect(installRoot) {
        for (const cmd of ['python', 'python3']) {
            try {
                const { stdout } = await (0, base_1.asyncExec)(`${cmd} --version`, { timeout: 10000 });
                const v = extractVersion(stdout);
                if (v)
                    return { installed: true, version: v, path: '' };
            }
            catch {
                // try next
            }
        }
        const td = (0, base_1.toolDir)(installRoot, 'python');
        const link = (0, path_1.join)(td, 'current');
        if ((0, fs_1.existsSync)(link)) {
            try {
                const { stdout } = await (0, base_1.asyncExec)(`"${link}\\python.exe" --version`, { timeout: 10000 });
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
        return ['3.8.10', '3.9.13', '3.10.11', '3.11.9', '3.12.5'];
    },
    async install(version, installRoot, onProgress, opts) {
        const dir = (0, base_1.versionDir)(installRoot, 'python', version);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        const installerName = `python-${version}-amd64.exe`;
        const installerPath = (0, path_1.join)(dir, installerName);
        onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Python ${version}...` });
        await (0, base_1.downloadWithFallback)(getPythonUrls(version, opts?.downloadMirror), installerPath, onProgress);
        onProgress({ stage: 'installing', percent: 95, message: `正在安装 Python ${version}...` });
        await (0, base_1.asyncExec)(`"${installerPath}" /quiet InstallAllUsers=0 TargetDir="${dir}" PrependPath=0 Include_test=0`, { timeout: 600000 });
        (0, base_1.cleanupFile)(installerPath);
        onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' });
        const td = (0, base_1.toolDir)(installRoot, 'python');
        if (!(0, fs_1.existsSync)(td)) {
            (0, fs_1.mkdirSync)(td, { recursive: true });
        }
        const link = (0, path_1.join)(td, 'current');
        await (0, base_1.createJunction)(link, dir);
        onProgress({ stage: 'done', percent: 100, message: `Python ${version} 安装完成` });
    },
    async uninstall(installRoot, onProgress) {
        onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' });
        const td = (0, base_1.toolDir)(installRoot, 'python');
        const link = (0, path_1.join)(td, 'current');
        await (0, base_1.removeJunction)(link);
        onProgress({ stage: 'done', percent: 100, message: 'Python 已卸载' });
    },
    async switchVersion(version, installRoot) {
        const dir = (0, base_1.versionDir)(installRoot, 'python', version);
        if (!(0, fs_1.existsSync)(dir)) {
            throw new Error(`Python ${version} 未安装`);
        }
        const td = (0, base_1.toolDir)(installRoot, 'python');
        const link = (0, path_1.join)(td, 'current');
        await (0, base_1.createJunction)(link, dir);
    }
};
//# sourceMappingURL=python.js.map