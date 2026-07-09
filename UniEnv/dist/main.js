"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const python_1 = require("./tools/python");
const node_1 = require("./tools/node");
const git_1 = require("./tools/git");
const go_1 = require("./tools/go");
const java_1 = require("./tools/java");
const combo_1 = require("./combo");
let tools;
let ctx;
const progressMap = new Map();
function getInstallRoot() {
    return ctx.config.installRoot || 'C:\\UniEnv';
}
function getDownloadMirror() {
    return ctx.config.downloadMirror || 'direct';
}
function getCustomCombos() {
    try {
        const raw = ctx.config.customCombos;
        if (raw && raw !== '[]') {
            return JSON.parse(raw);
        }
    }
    catch {
        // ignore
    }
    return [];
}
function startBackgroundInstall(toolId, version, installRoot, mirror) {
    const taskKey = toolId;
    progressMap.set(taskKey, {
        progress: { stage: 'downloading', percent: 0, message: '准备开始...' },
        done: false
    });
    (async () => {
        try {
            const tool = tools.get(toolId);
            if (!tool)
                throw new Error(`未知工具: ${toolId}`);
            await tool.install(version, installRoot, (p) => {
                const existing = progressMap.get(taskKey);
                if (existing)
                    existing.progress = p;
            }, { downloadMirror: mirror });
            const existing = progressMap.get(taskKey);
            if (existing) {
                existing.done = true;
                existing.progress = { stage: 'done', percent: 100, message: `${tool.displayName} ${version} 安装完成` };
            }
        }
        catch (err) {
            const existing = progressMap.get(taskKey);
            if (existing) {
                existing.done = true;
                existing.error = err.message;
                existing.progress = { stage: 'done', percent: 0, message: err.message };
            }
        }
    })();
}
const plugin = {
    activate(context) {
        ctx = context;
        tools = new Map();
        tools.set('python', python_1.pythonTool);
        tools.set('node', node_1.nodeTool);
        tools.set('git', git_1.gitTool);
        tools.set('go', go_1.goTool);
        tools.set('java', java_1.javaTool);
        ctx.logger.info('[UniEnv] 插件已激活');
        ctx.logger.info(`[UniEnv] 安装根目录: ${getInstallRoot()}`);
    },
    deactivate() {
        ctx.logger.info('[UniEnv] 插件已停用');
    },
    async onMessage(msg) {
        const message = msg;
        const installRoot = getInstallRoot();
        try {
            switch (message.type) {
                case 'listTools': {
                    const result = [];
                    for (const t of tools.values()) {
                        result.push({
                            id: t.id,
                            displayName: t.displayName,
                            icon: t.icon,
                            description: t.description
                        });
                    }
                    return result;
                }
                case 'detect': {
                    const tool = tools.get(message.tool || '');
                    if (!tool)
                        return { error: `未知工具: ${message.tool}` };
                    return await tool.detect(installRoot);
                }
                case 'listVersions': {
                    const tool = tools.get(message.tool || '');
                    if (!tool)
                        return { error: `未知工具: ${message.tool}` };
                    return await tool.listVersions();
                }
                case 'install': {
                    const tool = tools.get(message.tool || '');
                    if (!tool)
                        return { error: `未知工具: ${message.tool}` };
                    if (!message.version)
                        return { error: '未指定版本' };
                    startBackgroundInstall(message.tool, message.version, installRoot, getDownloadMirror());
                    ctx.logger.info(`[UniEnv] 开始后台安装 ${message.tool} ${message.version}`);
                    return { success: true, message: `正在安装 ${tool.displayName} ${message.version}...` };
                }
                case 'getProgress': {
                    const taskKey = message.tool || '';
                    const task = progressMap.get(taskKey);
                    if (!task)
                        return { progress: null, done: false };
                    return {
                        progress: task.progress,
                        done: task.done,
                        error: task.error
                    };
                }
                case 'uninstall': {
                    const tool = tools.get(message.tool || '');
                    if (!tool)
                        return { error: `未知工具: ${message.tool}` };
                    await tool.uninstall(installRoot, () => { });
                    return { success: true, message: `${tool.displayName} 已卸载` };
                }
                case 'switchVersion': {
                    const tool = tools.get(message.tool || '');
                    if (!tool)
                        return { error: `未知工具: ${message.tool}` };
                    if (!message.version)
                        return { error: '未指定版本' };
                    await tool.switchVersion(message.version, installRoot);
                    return { success: true, message: `已切换到 ${tool.displayName} ${message.version}` };
                }
                case 'listCombos': {
                    const builtins = (0, combo_1.getBuiltinCombos)();
                    const customs = getCustomCombos();
                    return [...builtins, ...customs];
                }
                case 'installCombo': {
                    const allCombos = [...(0, combo_1.getBuiltinCombos)(), ...getCustomCombos()];
                    const combo = allCombos.find((c) => c.id === message.comboId);
                    if (!combo)
                        return { error: `未知组合包: ${message.comboId}` };
                    const results = [];
                    for (const item of combo.items) {
                        const tool = (0, combo_1.resolveTool)(tools, item.toolId);
                        try {
                            await tool.install(item.version, installRoot, () => { }, { downloadMirror: getDownloadMirror() });
                            results.push({ tool: tool.displayName, success: true, message: `${item.version} 安装成功` });
                        }
                        catch (err) {
                            results.push({
                                tool: tool.displayName,
                                success: false,
                                message: err.message
                            });
                        }
                    }
                    return {
                        success: results.every((r) => r.success),
                        results,
                        message: results.every((r) => r.success)
                            ? `组合包 "${combo.name}" 全部安装完成`
                            : `组合包 "${combo.name}" 部分安装失败`
                    };
                }
                default:
                    return { error: `未知消息类型: ${message.type}` };
            }
        }
        catch (err) {
            const e = err;
            ctx.logger.error(`[UniEnv] 错误: ${e.message}`);
            return { error: e.message };
        }
    }
};
exports.default = plugin;
//# sourceMappingURL=main.js.map