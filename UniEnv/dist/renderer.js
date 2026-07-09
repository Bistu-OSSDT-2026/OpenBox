"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UniEnvUI;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
// ============================================================
// 内联样式常量 — 复刻 Ant Design 5.x 视觉风格
// ============================================================
const COLORS = {
    primary: '#1677ff',
    primaryHover: '#4096ff',
    primaryLight: '#e6f4ff',
    success: '#52c41a',
    successBg: '#f6ffed',
    successBorder: '#b7eb8f',
    warning: '#faad14',
    warningBg: '#fffbe6',
    warningBorder: '#ffe58f',
    danger: '#ff4d4f',
    dangerHover: '#ff7875',
    dangerBg: '#fff2f0',
    text: '#1f1f1f',
    textSecondary: '#8c8c8c',
    textTertiary: '#bfbfbf',
    border: '#f0f0f0',
    borderLight: '#f5f5f5',
    bgWhite: '#ffffff',
    bgGray: '#fafafa',
    bgGrayDark: '#f5f5f5',
    shadow: '0 2px 8px rgba(0,0,0,0.06)',
};
const FONT = {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    sizeXs: '11px',
    sizeSm: '12px',
    sizeMd: '13px',
    sizeLg: '14px',
    sizeXl: '16px',
    sizeTitle: '20px',
};
// ============================================================
// 基础组件
// ============================================================
function Spinner({ size = 32, tip }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center', padding: '40px 0' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    display: 'inline-block',
                    width: size,
                    height: size,
                    border: `3px solid ${COLORS.borderLight}`,
                    borderTopColor: COLORS.primary,
                    borderRadius: '50%',
                    animation: 'unienv-spin 0.8s linear infinite',
                } }), tip && (0, jsx_runtime_1.jsx)("p", { style: { color: COLORS.textSecondary, fontSize: FONT.sizeMd, marginTop: 12 }, children: tip }), (0, jsx_runtime_1.jsx)("style", { children: `@keyframes unienv-spin { to { transform: rotate(360deg); } }` })] }));
}
function Toast({ items, onRemove }) {
    if (items.length === 0)
        return null;
    const typeStyles = {
        success: { background: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d' },
        error: { background: '#fff2f0', border: '1px solid #ffccc7', color: '#cf1322' },
        warning: { background: '#fffbe6', border: '1px solid #ffe58f', color: '#d48806' },
        info: { background: COLORS.primaryLight, border: '1px solid #91caff', color: '#0958d9' },
    };
    return ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }, children: items.map((t) => ((0, jsx_runtime_1.jsxs)("div", { style: {
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: FONT.sizeLg,
                boxShadow: COLORS.shadow,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 240,
                cursor: 'pointer',
                ...typeStyles[t.type] || typeStyles.info,
            }, onClick: () => onRemove(t.id), children: [(0, jsx_runtime_1.jsx)("span", { children: t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ' }), (0, jsx_runtime_1.jsx)("span", { children: t.content }), (0, jsx_runtime_1.jsx)("span", { style: { marginLeft: 'auto', opacity: 0.5, fontSize: FONT.sizeSm }, children: "\u2715" })] }, t.id))) }));
}
// ============================================================
// 插件渲染入口
// ============================================================
function UniEnvUI({ config, onConfigChange, api, }) {
    const [tools, setTools] = (0, react_1.useState)([]);
    const [combos, setCombos] = (0, react_1.useState)([]);
    const [activeKey, setActiveKey] = (0, react_1.useState)('python');
    const [toolStatus, setToolStatus] = (0, react_1.useState)({});
    const [versions, setVersions] = (0, react_1.useState)({});
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [operationLoading, setOperationLoading] = (0, react_1.useState)({});
    const [progress, setProgress] = (0, react_1.useState)({});
    const [selectedVersions, setSelectedVersions] = (0, react_1.useState)({});
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const initialized = (0, react_1.useRef)(false);
    let toastId = (0, react_1.useRef)(0);
    const toast = (0, react_1.useCallback)((type, content) => {
        const id = ++toastId.current;
        setToasts((prev) => [...prev, { id, type, content }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    }, []);
    const removeToast = (0, react_1.useCallback)((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    const send = (0, react_1.useCallback)(async (msg) => {
        const result = await api.sendToBackend(msg);
        return result;
    }, [api]);
    const detectTool = (0, react_1.useCallback)(async (toolId, silent = false) => {
        if (!silent)
            setOperationLoading((prev) => ({ ...prev, [toolId]: true }));
        try {
            const result = await send({ type: 'detect', tool: toolId });
            const info = result;
            setToolStatus((prev) => ({ ...prev, [toolId]: info }));
            return info;
        }
        finally {
            if (!silent)
                setOperationLoading((prev) => ({ ...prev, [toolId]: false }));
        }
    }, [send]);
    const loadVersions = (0, react_1.useCallback)(async (toolId) => {
        try {
            const result = (await send({ type: 'listVersions', tool: toolId }));
            setVersions((prev) => ({ ...prev, [toolId]: result }));
            if (result.length > 0 && !selectedVersions[toolId]) {
                setSelectedVersions((prev) => ({ ...prev, [toolId]: result[0] }));
            }
        }
        catch {
            // ignore
        }
    }, [send, selectedVersions]);
    const installTool = (0, react_1.useCallback)(async (toolId) => {
        const version = selectedVersions[toolId];
        if (!version) {
            toast('warning', '请先选择要安装的版本');
            return;
        }
        setOperationLoading((prev) => ({ ...prev, [toolId]: true }));
        try {
            const result = await send({ type: 'install', tool: toolId, version });
            if (result.error) {
                toast('error', result.error);
                return;
            }
            toast('info', '安装已开始，请稍候...');
            let pollCount = 0;
            while (true) {
                pollCount++;
                const res = await send({ type: 'getProgress', tool: toolId });
                if (res.progress) {
                    setProgress((prev) => ({ ...prev, [toolId]: res.progress }));
                }
                if (res.done) {
                    if (res.error) {
                        toast('error', res.error);
                    }
                    else {
                        toast('success', `${toolId} ${version} 安装完成`);
                    }
                    await detectTool(toolId, true);
                    break;
                }
                await new Promise((r) => setTimeout(r, 500));
            }
        }
        catch (err) {
            toast('error', `安装失败: ${err.message}`);
        }
        finally {
            setOperationLoading((prev) => ({ ...prev, [toolId]: false }));
            setProgress((prev) => { const next = { ...prev }; delete next[toolId]; return next; });
        }
    }, [selectedVersions, send, detectTool, toast]);
    const uninstallTool = (0, react_1.useCallback)(async (toolId) => {
        const name = tools.find((t) => t.id === toolId)?.displayName || toolId;
        if (!window.confirm(`确认要卸载 ${name} 吗？`))
            return;
        setOperationLoading((prev) => ({ ...prev, [toolId]: true }));
        try {
            const result = await send({ type: 'uninstall', tool: toolId });
            if (result.error) {
                toast('error', result.error);
            }
            else {
                toast('success', `${name} 已卸载`);
                await detectTool(toolId, true);
            }
        }
        catch (err) {
            toast('error', `卸载失败: ${err.message}`);
        }
        finally {
            setOperationLoading((prev) => ({ ...prev, [toolId]: false }));
        }
    }, [tools, send, detectTool, toast]);
    const switchTool = (0, react_1.useCallback)(async (toolId) => {
        const version = selectedVersions[toolId];
        if (!version) {
            toast('warning', '请先选择目标版本');
            return;
        }
        setOperationLoading((prev) => ({ ...prev, [toolId]: true }));
        try {
            const result = await send({ type: 'switchVersion', tool: toolId, version });
            if (result.error) {
                toast('error', result.error);
            }
            else {
                toast('success', result.message || `已切换到 ${version}`);
                await detectTool(toolId, true);
            }
        }
        catch (err) {
            toast('error', `切换失败: ${err.message}`);
        }
        finally {
            setOperationLoading((prev) => ({ ...prev, [toolId]: false }));
        }
    }, [selectedVersions, send, detectTool, toast]);
    const installCombo = (0, react_1.useCallback)(async (comboId) => {
        const name = combos.find((c) => c.id === comboId)?.name || comboId;
        if (!window.confirm(`确认一键安装组合包 "${name}" 吗？`))
            return;
        setLoading(true);
        try {
            const result = await send({ type: 'installCombo', comboId });
            if (result.error) {
                toast('error', result.error);
            }
            else {
                const data = result;
                if (data.results) {
                    for (const r of data.results) {
                        toast(r.success ? 'success' : 'error', r.message);
                    }
                }
                if (data.message)
                    toast('info', data.message);
                await detectAll();
            }
        }
        catch (err) {
            toast('error', `安装失败: ${err.message}`);
        }
        finally {
            setLoading(false);
        }
    }, [combos, send, toast]);
    const detectAll = (0, react_1.useCallback)(async () => {
        for (const tool of tools) {
            await detectTool(tool.id, true);
        }
    }, [tools, detectTool]);
    // ---- 初始化 ----
    (0, react_1.useEffect)(() => {
        if (initialized.current)
            return;
        initialized.current = true;
        const init = async () => {
            setLoading(true);
            try {
                const toolList = (await send({ type: 'listTools' }));
                setTools(toolList);
                const comboList = (await send({ type: 'listCombos' }));
                setCombos(comboList || []);
                await Promise.all(toolList.map((t) => detectTool(t.id, true)));
                await Promise.all(toolList.map((t) => loadVersions(t.id)));
            }
            catch {
                // ignore
            }
            finally {
                setLoading(false);
            }
        };
        init();
    }, [send, detectTool, loadVersions, api]);
    // ---- 派生数据 ----
    const isComboActive = activeKey.startsWith('combo:');
    const activeComboId = isComboActive ? activeKey.replace('combo:', '') : '';
    const activeTool = tools.find((t) => t.id === activeKey);
    const activeCombo = combos.find((c) => c.id === activeComboId);
    const activeStatus = toolStatus[activeKey];
    const activeProgress = progress[activeKey];
    const isToolLoading = operationLoading[activeKey] || false;
    const activeVersions = versions[activeKey] || [];
    // ============================================================
    // 渲染
    // ============================================================
    const menuItemStyle = (key) => ({
        padding: '10px 16px',
        cursor: 'pointer',
        borderRadius: 6,
        margin: '2px 8px',
        fontSize: FONT.sizeLg,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: activeKey === key ? COLORS.primaryLight : 'transparent',
        color: activeKey === key ? COLORS.primary : COLORS.text,
        fontWeight: activeKey === key ? 600 : 400,
    });
    const btnPrimary = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 20px',
        background: COLORS.primary,
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: FONT.sizeLg,
        fontWeight: 500,
        width: '100%',
        height: 38,
        boxShadow: '0 2px 0 rgba(5,145,255,0.06)',
    };
    const btnDefault = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 20px',
        background: COLORS.bgWhite,
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: FONT.sizeLg,
        width: '100%',
        height: 38,
    };
    const btnDanger = {
        ...btnDefault,
        border: '1px solid #ffccc7',
        color: COLORS.danger,
    };
    const tagStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: FONT.sizeSm,
        fontWeight: 500,
    };
    const cardStyle = {
        background: COLORS.bgWhite,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { fontFamily: FONT.family, color: COLORS.text, height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsx)(Toast, { items: toasts, onRemove: removeToast }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, display: 'flex', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                            width: 200,
                            minWidth: 200,
                            background: COLORS.bgWhite,
                            borderRight: `1px solid ${COLORS.border}`,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            flexShrink: 0,
                        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                    padding: '14px 16px',
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    fontSize: FONT.sizeXl,
                                    fontWeight: 600,
                                    color: COLORS.text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 18 }, children: "\u2630" }), "\u5DE5\u5177\u4E0E\u7EC4\u5408\u5305"] }), (0, jsx_runtime_1.jsxs)("div", { style: { paddingBottom: 4 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { padding: '8px 16px 4px', fontSize: FONT.sizeSm, color: COLORS.textSecondary, fontWeight: 500 }, children: "\u5F00\u53D1\u5DE5\u5177" }), tools.map((tool) => {
                                        const s = toolStatus[tool.id];
                                        return ((0, jsx_runtime_1.jsxs)("div", { style: menuItemStyle(tool.id), onClick: () => setActiveKey(tool.id), children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 16 }, children: tool.icon }), (0, jsx_runtime_1.jsx)("span", { style: { flex: 1 }, children: tool.displayName }), (0, jsx_runtime_1.jsx)("span", { style: {
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        background: s?.installed ? COLORS.success : COLORS.textTertiary,
                                                        display: 'inline-block',
                                                        flexShrink: 0,
                                                    } })] }, tool.id));
                                    })] }), combos.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { paddingBottom: 4 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { padding: '12px 16px 4px', fontSize: FONT.sizeSm, color: COLORS.textSecondary, fontWeight: 500 }, children: "\u7EC4\u5408\u5305" }), combos.map((combo) => {
                                        const key = `combo:${combo.id}`;
                                        return ((0, jsx_runtime_1.jsxs)("div", { style: menuItemStyle(key), onClick: () => setActiveKey(key), children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 16 }, children: "\u26A1" }), (0, jsx_runtime_1.jsx)("span", { style: { flex: 1 }, children: combo.name })] }, key));
                                    })] }))] }), (0, jsx_runtime_1.jsx)("div", { style: {
                            flex: 1,
                            padding: 20,
                            overflowY: 'auto',
                            background: COLORS.bgGray,
                        }, children: loading && Object.keys(toolStatus).length === 0 ? ((0, jsx_runtime_1.jsx)(Spinner, { tip: "\u521D\u59CB\u5316\u4E2D..." })) : isComboActive && activeCombo ? (
                        /* ---- 组合包详情 ---- */
                        (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { margin: '0 0 4px', fontSize: FONT.sizeTitle, fontWeight: 600, color: COLORS.text }, children: activeCombo.name }), (0, jsx_runtime_1.jsx)("p", { style: { margin: 0, color: COLORS.textSecondary, fontSize: FONT.sizeLg }, children: activeCombo.description })] }), (0, jsx_runtime_1.jsxs)("div", { style: { ...cardStyle, borderTop: `3px solid ${COLORS.warning}` }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, fontSize: FONT.sizeLg, marginBottom: 12 }, children: "\u5305\u542B\u4EE5\u4E0B\u5DE5\u5177\uFF1A" }), activeCombo.items.map((item) => {
                                            const t = tools.find((tt) => tt.id === item.toolId);
                                            const s = toolStatus[item.toolId];
                                            return ((0, jsx_runtime_1.jsxs)("div", { style: {
                                                    padding: '10px 12px',
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: 6,
                                                    marginBottom: 6,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 18 }, children: t?.icon || '📦' }), (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 500 }, children: t?.displayName || item.toolId }), (0, jsx_runtime_1.jsx)("span", { style: { ...tagStyle, background: COLORS.primaryLight, color: COLORS.primary }, children: item.version }), s?.installed ? ((0, jsx_runtime_1.jsxs)("span", { style: { ...tagStyle, background: COLORS.successBg, color: COLORS.success }, children: ["\u2713 \u5DF2\u5B89\u88C5 ", s.version] })) : ((0, jsx_runtime_1.jsx)("span", { style: { ...tagStyle, background: COLORS.bgGrayDark, color: COLORS.textSecondary }, children: "\u2715 \u672A\u5B89\u88C5" }))] }, item.toolId));
                                        })] }), (0, jsx_runtime_1.jsxs)("button", { style: {
                                        ...btnPrimary,
                                        width: '100%',
                                        height: 44,
                                        fontSize: FONT.sizeXl,
                                        marginTop: 16,
                                        opacity: loading ? 0.7 : 1,
                                    }, disabled: loading, onClick: () => installCombo(activeComboId), children: [loading ? (0, jsx_runtime_1.jsx)(Spinner, { size: 16 }) : (0, jsx_runtime_1.jsx)("span", { children: "\u26A1" }), "\u4E00\u952E\u5B89\u88C5\u5168\u90E8"] }), (0, jsx_runtime_1.jsx)("p", { style: { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONT.sizeSm, marginTop: 8 }, children: "\u70B9\u51FB\u540E\u5C06\u4F9D\u6B21\u4E0B\u8F7D\u5E76\u5B89\u88C5\u7EC4\u5408\u5305\u4E2D\u7684\u6240\u6709\u5DE5\u5177" })] })) : activeTool ? (
                        /* ---- 工具详情 ---- */
                        (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 20 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 32 }, children: activeTool.icon }), (0, jsx_runtime_1.jsx)("h2", { style: { margin: 0, fontSize: FONT.sizeTitle, fontWeight: 600, color: COLORS.text }, children: activeTool.displayName }), activeStatus?.installed ? ((0, jsx_runtime_1.jsx)("span", { style: { ...tagStyle, background: COLORS.successBg, color: COLORS.success, fontSize: FONT.sizeMd }, children: "\u2713 \u5DF2\u5B89\u88C5" })) : ((0, jsx_runtime_1.jsx)("span", { style: { ...tagStyle, background: COLORS.bgGrayDark, color: COLORS.textSecondary, fontSize: FONT.sizeMd }, children: "\u2715 \u672A\u5B89\u88C5" }))] }), (0, jsx_runtime_1.jsx)("p", { style: { margin: 0, color: COLORS.textSecondary, fontSize: FONT.sizeLg }, children: activeTool.description })] }), activeStatus?.installed ? ((0, jsx_runtime_1.jsx)("div", { style: { ...cardStyle, background: COLORS.successBg, border: `1px solid ${COLORS.successBorder}` }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600 }, children: "\u5F53\u524D\u7248\u672C\uFF1A" }), (0, jsx_runtime_1.jsx)("span", { style: { ...tagStyle, background: COLORS.success, color: '#fff' }, children: activeStatus.version })] }), activeStatus.path ? ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600 }, children: "\u5B89\u88C5\u8DEF\u5F84\uFF1A" }), (0, jsx_runtime_1.jsx)("code", { style: { background: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: FONT.sizeSm }, children: activeStatus.path })] })) : null] }) })) : ((0, jsx_runtime_1.jsxs)("div", { style: { ...cardStyle, background: COLORS.warningBg, border: `1px solid ${COLORS.warningBorder}` }, children: [(0, jsx_runtime_1.jsx)("span", { style: { color: COLORS.warning, marginRight: 8 }, children: "\u26A0" }), "\u5C1A\u672A\u5B89\u88C5 ", activeTool.displayName, "\uFF0C\u8BF7\u9009\u62E9\u7248\u672C\u5E76\u70B9\u51FB\u5B89\u88C5"] })), activeProgress && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { height: 8, background: COLORS.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                                    height: '100%',
                                                    width: `${activeProgress.percent}%`,
                                                    background: COLORS.primary,
                                                    borderRadius: 4,
                                                    transition: 'width 0.3s',
                                                } }) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: FONT.sizeSm, color: COLORS.textSecondary }, children: activeProgress.message })] })), activeStatus?.installed && ((0, jsx_runtime_1.jsxs)("div", { style: { ...cardStyle }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, fontSize: FONT.sizeLg, marginBottom: 8 }, children: "\u5DF2\u5B89\u88C5\u7248\u672C" }), (0, jsx_runtime_1.jsxs)("span", { style: { ...tagStyle, background: COLORS.success, color: '#fff' }, children: [activeStatus.version, " (\u5F53\u524D)"] }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: FONT.sizeSm, color: COLORS.textSecondary, marginTop: 8 }, children: "\u5207\u6362\u7248\u672C\u9700\u5148\u5B89\u88C5\u5176\u4ED6\u7248\u672C" })] }))] })) : ((0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'center', padding: 60, color: COLORS.textSecondary }, children: "\u9009\u62E9\u5DE6\u4FA7\u5DE5\u5177\u6216\u7EC4\u5408\u5305\u67E5\u770B\u8BE6\u60C5" })) }), !isComboActive && activeTool && ((0, jsx_runtime_1.jsxs)("div", { style: {
                            width: 240,
                            minWidth: 240,
                            background: COLORS.bgWhite,
                            borderLeft: `1px solid ${COLORS.border}`,
                            padding: 20,
                            overflowY: 'auto',
                            flexShrink: 0,
                        }, children: [(0, jsx_runtime_1.jsxs)("h3", { style: { margin: '0 0 16px', fontSize: FONT.sizeXl, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 16 }, children: '</>' }), "\u64CD\u4F5C"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [(0, jsx_runtime_1.jsx)("button", { style: { ...btnDefault, justifyContent: 'center' }, disabled: isToolLoading, onClick: () => detectTool(activeKey), children: isToolLoading ? (0, jsx_runtime_1.jsx)(Spinner, { size: 14 }) : (0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDD0D \u68C0\u6D4B\u5B89\u88C5\u72B6\u6001" }) }), (0, jsx_runtime_1.jsx)("hr", { style: { border: 'none', borderTop: `1px solid ${COLORS.border}`, margin: '4px 0' } }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', fontWeight: 600, marginBottom: 6, fontSize: FONT.sizeMd }, children: "\u9009\u62E9\u7248\u672C\uFF1A" }), (0, jsx_runtime_1.jsxs)("select", { style: {
                                                    width: '100%',
                                                    height: 36,
                                                    padding: '0 10px',
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: 6,
                                                    fontSize: FONT.sizeLg,
                                                    background: COLORS.bgWhite,
                                                    color: COLORS.text,
                                                    cursor: 'pointer',
                                                }, value: selectedVersions[activeKey] || '', onChange: (e) => setSelectedVersions((prev) => ({ ...prev, [activeKey]: e.target.value || undefined })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", disabled: true, children: "\u8BF7\u9009\u62E9\u7248\u672C" }), activeVersions.map((v) => ((0, jsx_runtime_1.jsx)("option", { value: v, children: v }, v)))] })] }), (0, jsx_runtime_1.jsx)("button", { style: { ...btnPrimary, justifyContent: 'center', height: 42, opacity: isToolLoading ? 0.7 : 1 }, disabled: isToolLoading, onClick: () => installTool(activeKey), children: isToolLoading ? (0, jsx_runtime_1.jsx)(Spinner, { size: 14 }) : (0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDCE5 \u5B89\u88C5" }) }), (0, jsx_runtime_1.jsx)("button", { style: {
                                            ...btnDefault,
                                            justifyContent: 'center',
                                            opacity: !activeStatus?.installed || isToolLoading ? 0.5 : 1,
                                            cursor: !activeStatus?.installed || isToolLoading ? 'not-allowed' : 'pointer',
                                        }, disabled: !activeStatus?.installed || isToolLoading, onClick: () => switchTool(activeKey), children: "\uD83D\uDD04 \u5207\u6362\u7248\u672C" }), (0, jsx_runtime_1.jsx)("button", { style: {
                                            ...btnDanger,
                                            justifyContent: 'center',
                                            opacity: !activeStatus?.installed || isToolLoading ? 0.5 : 1,
                                            cursor: !activeStatus?.installed || isToolLoading ? 'not-allowed' : 'pointer',
                                        }, disabled: !activeStatus?.installed || isToolLoading, onClick: () => uninstallTool(activeKey), children: "\uD83D\uDDD1 \u5378\u8F7D" })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    marginTop: 24,
                                    padding: 12,
                                    background: COLORS.bgGray,
                                    borderRadius: 8,
                                    fontSize: FONT.sizeXs,
                                    color: COLORS.textSecondary,
                                    lineHeight: 1.6,
                                }, children: "\u63D0\u793A\uFF1A\u5B89\u88C5\u8FC7\u7A0B\u53EF\u80FD\u9700\u8981\u51E0\u5206\u949F\uFF0C\u8BF7\u8010\u5FC3\u7B49\u5F85\u3002\u5B89\u88C5\u76EE\u5F55\u4F4D\u4E8E\u914D\u7F6E\u4E2D\u6307\u5B9A\u7684\u6839\u76EE\u5F55\u4E0B\u3002" })] }))] }), combos.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    background: COLORS.bgWhite,
                    borderTop: `1px solid ${COLORS.border}`,
                    padding: '8px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                }, children: [(0, jsx_runtime_1.jsx)("span", { style: { color: COLORS.warning, fontSize: 16 }, children: "\u26A1" }), (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 600, fontSize: FONT.sizeSm, marginRight: 8, whiteSpace: 'nowrap' }, children: "\u4E00\u952E\u5B89\u88C5\u7EC4\u5408\u5305\uFF1A" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: combos.slice(0, 5).map((combo) => ((0, jsx_runtime_1.jsxs)("button", { style: {
                                padding: '4px 10px',
                                border: `1px dashed ${COLORS.border}`,
                                borderRadius: 4,
                                background: COLORS.bgWhite,
                                cursor: 'pointer',
                                fontSize: FONT.sizeSm,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                opacity: loading ? 0.6 : 1,
                            }, disabled: loading, onClick: () => installCombo(combo.id), children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13 }, children: "\u26A1" }), combo.name] }, combo.id))) })] }))] }));
}
//# sourceMappingURL=renderer.js.map