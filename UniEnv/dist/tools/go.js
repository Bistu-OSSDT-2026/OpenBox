"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.goTool = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const base_1 = require("./base");
function getGoUrls(version, mirror) {
    const archiveName = `go${version}.windows-amd64.zip`;
    const urls = [];
    if (mirror === 'aliyun') {
        urls.push({ url: `https://mirrors.aliyun.com/golang/${archiveName}`, label: 'Go (阿里云)' });
    }
    // Google中国镜像
    urls.push({ url: `https://golang.google.cn/dl/${archiveName}`, label: 'Go (Google中国)' });
    // 官方源兜底
    urls.push({ url: `https://go.dev/dl/${archiveName}`, label: 'Go (官方)' });
    return urls;
}
function extractVersion(raw) {
    const m = raw.match(/go(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
}
exports.goTool = {
    id: 'go',
    displayName: 'Go',
    icon: '\uD83D\uDD35',
    description: 'Go 编程语言运行时',
    async detect(installRoot) {
        try {
            const { stdout } = await (0, base_1.asyncExec)('go version', { timeout: 10000 });
            const v = extractVersion(stdout);
            if (v)
                return { installed: true, version: v, path: '' };
        }
        catch {
            // not on PATH
        }
        const link = (0, path_1.join)((0, base_1.toolDir)(installRoot, 'go'), 'current');
        const goExe = (0, path_1.join)(link, 'bin', 'go.exe');
        if ((0, fs_1.existsSync)(goExe)) {
            try {
                const { stdout } = await (0, base_1.asyncExec)(`"${goExe}" version`, { timeout: 10000 });
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
        return ['1.21.6', '1.22.4', '1.23.0'];
    },
    async install(version, installRoot, onProgress, opts) {
        const dir = (0, base_1.versionDir)(installRoot, 'go', version);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        const archiveName = `go${version}.windows-amd64.zip`;
        const zipPath = (0, path_1.join)(dir, archiveName);
        onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Go ${version}...` });
        await (0, base_1.downloadWithFallback)(getGoUrls(version, opts?.downloadMirror), zipPath, onProgress);
        onProgress({ stage: 'installing', percent: 95, message: `正在解压 Go ${version}...` });
        const extractDir = (0, path_1.join)(dir, 'extracted');
        await (0, base_1.extractZip)(zipPath, extractDir);
        const goSrcDir = (0, base_1.findTopDir)(extractDir);
        const finalDir = (0, path_1.join)(dir, 'go');
        const { renameSync } = await Promise.resolve().then(() => __importStar(require('fs')));
        renameSync(goSrcDir, finalDir);
        (0, base_1.cleanupFile)(zipPath);
        onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' });
        const td = (0, base_1.toolDir)(installRoot, 'go');
        if (!(0, fs_1.existsSync)(td)) {
            (0, fs_1.mkdirSync)(td, { recursive: true });
        }
        const link = (0, base_1.currentLink)(installRoot, 'go');
        await (0, base_1.createJunction)(link, finalDir);
        onProgress({ stage: 'done', percent: 100, message: `Go ${version} 安装完成` });
    },
    async uninstall(installRoot, onProgress) {
        onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' });
        const link = (0, base_1.currentLink)(installRoot, 'go');
        await (0, base_1.removeJunction)(link);
        onProgress({ stage: 'done', percent: 100, message: 'Go 已卸载' });
    },
    async switchVersion(version, installRoot) {
        const dir = (0, path_1.join)((0, base_1.versionDir)(installRoot, 'go', version), 'go');
        if (!(0, fs_1.existsSync)(dir)) {
            throw new Error(`Go ${version} 未安装`);
        }
        const td = (0, base_1.toolDir)(installRoot, 'go');
        const link = (0, path_1.join)(td, 'current');
        await (0, base_1.createJunction)(link, dir);
    }
};
//# sourceMappingURL=go.js.map