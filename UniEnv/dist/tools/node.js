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
exports.nodeTool = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const base_1 = require("./base");
function extractVersion(raw) {
    const m = raw.match(/v?(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
}
function getNodeUrls(version, mirror) {
    const zipName = `node-v${version}-win-x64.zip`;
    const urls = [];
    if (mirror === 'huawei') {
        urls.push({ url: `https://mirrors.huaweicloud.com/nodejs/v${version}/${zipName}`, label: 'Node.js (华为云)' });
    }
    if (mirror === 'tuna') {
        urls.push({ url: `https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v${version}/${zipName}`, label: 'Node.js (TUNA)' });
    }
    // 淘宝 NPM 镜像（已验证可用）
    urls.push({ url: `https://npmmirror.com/mirrors/node/v${version}/${zipName}`, label: 'Node.js (淘宝NPM)' });
    // 官方源兜底
    urls.push({ url: `https://nodejs.org/dist/v${version}/${zipName}`, label: 'Node.js (官方)' });
    return urls;
}
exports.nodeTool = {
    id: 'node',
    displayName: 'Node.js',
    icon: '\uD83D\uDFE2',
    description: 'Node.js 运行时与 npm 包管理器',
    async detect(installRoot) {
        try {
            const { stdout } = await (0, base_1.asyncExec)('node --version', { timeout: 10000 });
            const v = extractVersion(stdout);
            if (v)
                return { installed: true, version: v, path: '' };
        }
        catch {
            // not on PATH
        }
        const link = (0, path_1.join)((0, base_1.toolDir)(installRoot, 'node'), 'current');
        if ((0, fs_1.existsSync)((0, path_1.join)(link, 'node.exe'))) {
            try {
                const { stdout } = await (0, base_1.asyncExec)(`"${link}\\node.exe" --version`, { timeout: 10000 });
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
        return ['16.20.2', '18.20.4', '20.15.1', '22.5.1'];
    },
    async install(version, installRoot, onProgress, opts) {
        const dir = (0, base_1.versionDir)(installRoot, 'node', version);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        const zipName = `node-v${version}-win-x64.zip`;
        const zipPath = (0, path_1.join)(dir, zipName);
        onProgress({ stage: 'downloading', percent: 0, message: `正在下载 Node.js ${version}...` });
        await (0, base_1.downloadWithFallback)(getNodeUrls(version, opts?.downloadMirror), zipPath, onProgress);
        onProgress({ stage: 'installing', percent: 95, message: `正在解压 Node.js ${version}...` });
        await (0, base_1.extractZip)(zipPath, dir);
        const srcDir = (0, base_1.findTopDir)(dir);
        const finalDir = (0, path_1.join)(dir, 'runtime');
        if (srcDir !== finalDir) {
            const { renameSync } = await Promise.resolve().then(() => __importStar(require('fs')));
            renameSync(srcDir, finalDir);
        }
        (0, base_1.cleanupFile)(zipPath);
        onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' });
        const td = (0, base_1.toolDir)(installRoot, 'node');
        if (!(0, fs_1.existsSync)(td)) {
            (0, fs_1.mkdirSync)(td, { recursive: true });
        }
        const link = (0, base_1.currentLink)(installRoot, 'node');
        await (0, base_1.createJunction)(link, finalDir);
        onProgress({ stage: 'done', percent: 100, message: `Node.js ${version} 安装完成` });
    },
    async uninstall(installRoot, onProgress) {
        onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' });
        const link = (0, base_1.currentLink)(installRoot, 'node');
        await (0, base_1.removeJunction)(link);
        onProgress({ stage: 'done', percent: 100, message: 'Node.js 已卸载' });
    },
    async switchVersion(version, installRoot) {
        const dir = (0, path_1.join)((0, base_1.versionDir)(installRoot, 'node', version), 'runtime');
        if (!(0, fs_1.existsSync)(dir)) {
            throw new Error(`Node.js ${version} 未安装`);
        }
        const td = (0, base_1.toolDir)(installRoot, 'node');
        const link = (0, path_1.join)(td, 'current');
        await (0, base_1.createJunction)(link, dir);
    }
};
//# sourceMappingURL=node.js.map