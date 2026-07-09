"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncExec = void 0;
exports.fetchWithTimeout = fetchWithTimeout;
exports.downloadWithProgress = downloadWithProgress;
exports.downloadWithFallback = downloadWithFallback;
exports.toolDir = toolDir;
exports.versionDir = versionDir;
exports.currentLink = currentLink;
exports.extractZip = extractZip;
exports.createJunction = createJunction;
exports.removeJunction = removeJunction;
exports.cleanupFile = cleanupFile;
exports.findTopDir = findTopDir;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
exports.asyncExec = (0, util_1.promisify)(child_process_1.exec);
async function fetchWithTimeout(url, timeoutMs = 120000, retries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
            await new Promise((r) => setTimeout(r, delay));
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`下载失败: HTTP ${response.status} ${response.statusText}`);
            }
            return response;
        }
        catch (err) {
            if (controller.signal.aborted) {
                const filename = url.split('/').pop() || url;
                lastError = new Error(`下载超时(>${timeoutMs / 1000}s): ${filename}`);
            }
            else {
                const e = err;
                lastError = new Error(`下载失败: ${e.message}`);
            }
            if (attempt === retries)
                throw lastError;
        }
        finally {
            clearTimeout(timer);
        }
    }
    throw lastError ?? new Error('下载失败');
}
async function downloadWithProgress(url, destPath, onProgress, stageLabel) {
    const response = await fetchWithTimeout(url);
    const contentLength = Number(response.headers.get('content-length') || 0);
    const reader = response.body?.getReader();
    if (!reader) {
        const buffer = Buffer.from(await response.arrayBuffer());
        (0, fs_1.writeFileSync)(destPath, buffer);
        return;
    }
    const chunks = [];
    let downloaded = 0;
    let lastReport = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        chunks.push(Buffer.from(value));
        downloaded += value.length;
        if (contentLength > 0 && Date.now() - lastReport > 300) {
            const pct = Math.min(95, Math.round((downloaded / contentLength) * 100));
            onProgress({ stage: 'downloading', percent: pct, message: `${stageLabel} (${formatBytes(downloaded)}/${formatBytes(contentLength)})` });
            lastReport = Date.now();
        }
    }
    const buffer = Buffer.concat(chunks);
    (0, fs_1.writeFileSync)(destPath, buffer);
}
async function downloadWithFallback(urls, destPath, onProgress) {
    let lastError = null;
    for (const { url, label } of urls) {
        try {
            await downloadWithProgress(url, destPath, onProgress, label);
            return;
        }
        catch (err) {
            lastError = err;
        }
    }
    throw lastError ?? new Error('所有下载源均失败');
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
function toolDir(installRoot, toolId) {
    return `${installRoot}\\${toolId}`;
}
function versionDir(installRoot, toolId, version) {
    return `${toolDir(installRoot, toolId)}\\${version}`;
}
function currentLink(installRoot, toolId) {
    return `${toolDir(installRoot, toolId)}\\current`;
}
async function extractZip(zipPath, destDir) {
    const psCmd = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force"`;
    await (0, exports.asyncExec)(psCmd, { timeout: 300000 });
}
async function createJunction(link, target) {
    try {
        await (0, exports.asyncExec)(`cmd /c rmdir "${link}" 2>nul & mklink /J "${link}" "${target}"`, { timeout: 15000 });
    }
    catch {
        const psCmd = `powershell -NoProfile -NonInteractive -Command "New-Item -ItemType Junction -Path '${link}' -Target '${target}' -Force -ErrorAction Stop"`;
        await (0, exports.asyncExec)(psCmd, { timeout: 15000 });
    }
}
async function removeJunction(link) {
    try {
        await (0, exports.asyncExec)(`cmd /c rmdir "${link}" 2>nul`, { timeout: 10000 });
    }
    catch {
        // ignore
    }
}
function cleanupFile(filePath) {
    try {
        if ((0, fs_1.existsSync)(filePath))
            (0, fs_1.unlinkSync)(filePath);
    }
    catch {
        // ignore
    }
}
function findTopDir(extractDir) {
    const { readdirSync } = require('fs');
    const entries = readdirSync(extractDir);
    const singleDir = entries.find((e) => {
        try {
            const stat = require('fs').statSync(`${extractDir}\\${e}`);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    });
    return singleDir ? `${extractDir}\\${singleDir}` : extractDir;
}
//# sourceMappingURL=base.js.map