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
exports.javaTool = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const base_1 = require("./base");
const JAVA_VERSIONS = {
    '17.0.11': { build: 9 },
    '17.0.12': { build: 12 },
    '21.0.3': { build: 9 },
    '21.0.5': { build: 5 },
    '22.0.1': { build: 8 }
};
function getJavaUrls(major, version, build, mirror) {
    const archiveName = `OpenJDK${major}U-jdk_x64_windows_hotspot_${version}_${build}.zip`;
    const tag = `jdk-${version}+${build}`;
    const urls = [];
    if (mirror === 'tuna') {
        urls.push({
            url: `https://mirrors.tuna.tsinghua.edu.cn/github-release/adoptium/temurin${major}-binaries/${encodeURIComponent(tag)}/${archiveName}`,
            label: 'JDK (TUNA)'
        });
    }
    // 官方 GitHub 发布源 (总是作为兜底)
    urls.push({
        url: `https://github.com/adoptium/temurin${major}-binaries/releases/download/${encodeURIComponent(tag)}/${archiveName}`,
        label: 'JDK (官方)'
    });
    return urls;
}
function extractVersion(raw) {
    const m = raw.match(/(\d+\.\d+\.\d+)[._]?(\d+)?/);
    return m ? m[1] : null;
}
exports.javaTool = {
    id: 'java',
    displayName: 'Java JDK',
    icon: '\u2615',
    description: 'Java 开发工具包 (Eclipse Adoptium)',
    async detect(installRoot) {
        try {
            const { stdout, stderr } = await (0, base_1.asyncExec)('java -version', { timeout: 10000 });
            const v = extractVersion(stderr || stdout);
            if (v)
                return { installed: true, version: v, path: '' };
        }
        catch {
            // not on PATH
        }
        const link = (0, path_1.join)((0, base_1.toolDir)(installRoot, 'java'), 'current');
        const javaExe = (0, path_1.join)(link, 'bin', 'java.exe');
        if ((0, fs_1.existsSync)(javaExe)) {
            try {
                const { stdout, stderr } = await (0, base_1.asyncExec)(`"${javaExe}" -version`, { timeout: 10000 });
                const v = extractVersion(stderr || stdout);
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
        return Object.keys(JAVA_VERSIONS);
    },
    async install(version, installRoot, onProgress, opts) {
        const info = JAVA_VERSIONS[version];
        if (!info)
            throw new Error(`JDK ${version} 的版本信息未维护，请更新插件`);
        const dir = (0, base_1.versionDir)(installRoot, 'java', version);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        const major = version.split('.')[0];
        const archiveName = `OpenJDK${major}U-jdk_x64_windows_hotspot_${version}_${info.build}.zip`;
        const zipPath = (0, path_1.join)(dir, archiveName);
        onProgress({ stage: 'downloading', percent: 0, message: `正在下载 JDK ${version}...` });
        await (0, base_1.downloadWithFallback)(getJavaUrls(major, version, info.build, opts?.downloadMirror), zipPath, onProgress);
        onProgress({ stage: 'installing', percent: 95, message: `正在解压 JDK ${version}...` });
        const extractDir = (0, path_1.join)(dir, 'extracted');
        await (0, base_1.extractZip)(zipPath, extractDir);
        const jdkSrcDir = (0, base_1.findTopDir)(extractDir);
        const finalDir = (0, path_1.join)(dir, 'jdk');
        const { renameSync } = await Promise.resolve().then(() => __importStar(require('fs')));
        renameSync(jdkSrcDir, finalDir);
        (0, base_1.cleanupFile)(zipPath);
        onProgress({ stage: 'configuring', percent: 98, message: '正在创建目录链接...' });
        const td = (0, base_1.toolDir)(installRoot, 'java');
        if (!(0, fs_1.existsSync)(td)) {
            (0, fs_1.mkdirSync)(td, { recursive: true });
        }
        const link = (0, base_1.currentLink)(installRoot, 'java');
        await (0, base_1.createJunction)(link, finalDir);
        onProgress({ stage: 'done', percent: 100, message: `JDK ${version} 安装完成` });
    },
    async uninstall(installRoot, onProgress) {
        onProgress({ stage: 'configuring', percent: 0, message: '正在卸载...' });
        const link = (0, base_1.currentLink)(installRoot, 'java');
        await (0, base_1.removeJunction)(link);
        onProgress({ stage: 'done', percent: 100, message: 'JDK 已卸载' });
    },
    async switchVersion(version, installRoot) {
        const dir = (0, path_1.join)((0, base_1.versionDir)(installRoot, 'java', version), 'jdk');
        if (!(0, fs_1.existsSync)(dir)) {
            throw new Error(`JDK ${version} 未安装`);
        }
        const td = (0, base_1.toolDir)(installRoot, 'java');
        const link = (0, path_1.join)(td, 'current');
        await (0, base_1.createJunction)(link, dir);
    }
};
//# sourceMappingURL=java.js.map