"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TurntablePlugin;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const CANVAS_SIZE = 340;
const CENTER = CANVAS_SIZE / 2;
const RADIUS = CENTER - 10;
function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}
function drawSector(ctx, cx, cy, radius, startAngle, endAngle, color) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}
function drawText(ctx, cx, cy, radius, text, startAngle, endAngle) {
    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const textRadius = radius * 0.6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    const safeText = typeof text === 'string' ? text : String(text ?? '');
    const displayText = safeText.length > 6 ? safeText.slice(0, 6) + '..' : safeText;
    ctx.fillText(displayText, textRadius, 0);
    ctx.restore();
}
function drawPointer(ctx, cx, cy, radius) {
    const pointerY = cy - radius - 5;
    ctx.beginPath();
    ctx.moveTo(cx - 14, pointerY + 10);
    ctx.lineTo(cx, pointerY - 8);
    ctx.lineTo(cx + 14, pointerY + 10);
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, pointerY - 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4d4f';
    ctx.fill();
}
function normalizeItem(item, index) {
    if (!item || typeof item !== 'object')
        return null;
    const raw = item;
    const fallbackLabel = typeof raw.name === 'string'
        ? raw.name
        : typeof raw.title === 'string'
            ? raw.title
            : '';
    const label = typeof raw.label === 'string' ? raw.label : fallbackLabel;
    const weight = Number(raw.weight);
    return {
        id: Number.isFinite(Number(raw.id)) ? Number(raw.id) : Date.now() + index,
        label: label.trim() || `选项 ${index + 1}`,
        weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
        color: typeof raw.color === 'string' && raw.color.trim() ? raw.color : '#1677ff',
        sort_order: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : index,
        created_at: typeof raw.created_at === 'string' ? raw.created_at : ''
    };
}
function normalizeItems(value) {
    return Array.isArray(value)
        ? value.map(normalizeItem).filter((item) => item !== null)
        : [];
}
function isErrorResult(value) {
    return !!value && typeof value === 'object' && typeof value.error === 'string';
}
function TurntablePlugin({ config, api }) {
    const [items, setItems] = (0, react_1.useState)([]);
    const [spinning, setSpinning] = (0, react_1.useState)(false);
    const [rotation, setRotation] = (0, react_1.useState)(0);
    const [winner, setWinner] = (0, react_1.useState)(null);
    const [modalOpen, setModalOpen] = (0, react_1.useState)(false);
    const [editingItem, setEditingItem] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)({ label: '', weight: 1 });
    const [resultVisible, setResultVisible] = (0, react_1.useState)(false);
    const canvasRef = (0, react_1.useRef)(null);
    const rotationRef = (0, react_1.useRef)(0);
    const animFrameRef = (0, react_1.useRef)(0);
    const spinDuration = config.spinDuration || 4;
    const loadItems = (0, react_1.useCallback)(async () => {
        const result = await api.sendToBackend({ type: 'getItems' });
        setItems(normalizeItems(result));
    }, [api]);
    (0, react_1.useEffect)(() => {
        loadItems();
    }, [loadItems]);
    const drawCanvas = (0, react_1.useCallback)((rotAngle) => {
        const canvas = canvasRef.current;
        if (!canvas || items.length === 0)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_SIZE * dpr;
        canvas.height = CANVAS_SIZE * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(rotAngle);
        ctx.translate(-CENTER, -CENTER);
        const totalWeight = items.reduce((s, i) => s + i.weight, 0);
        if (totalWeight <= 0)
            return;
        let currentAngle = -Math.PI / 2;
        for (const item of items) {
            const sectorAngle = (item.weight / totalWeight) * Math.PI * 2;
            const endAngle = currentAngle + sectorAngle;
            drawSector(ctx, CENTER, CENTER, RADIUS, currentAngle, endAngle, item.color || '#1677ff');
            drawText(ctx, CENTER, CENTER, RADIUS, item.label, currentAngle, endAngle);
            currentAngle = endAngle;
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 3;
        ctx.stroke();
        drawPointer(ctx, CENTER, CENTER, RADIUS);
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 4;
        ctx.stroke();
    }, [items]);
    (0, react_1.useEffect)(() => {
        drawCanvas(rotation);
    }, [rotation, drawCanvas]);
    const spin = async () => {
        if (spinning || items.length < 2)
            return;
        setSpinning(true);
        setWinner(null);
        setResultVisible(false);
        const result = await api.sendToBackend({ type: 'spin' });
        if (isErrorResult(result)) {
            api.notify('转盘抽奖', result.error);
            setSpinning(false);
            return;
        }
        if (!result || typeof result !== 'object' || !('winner' in result)) {
            api.notify('转盘抽奖', '抽奖失败：插件后端没有返回有效结果');
            setSpinning(false);
            return;
        }
        const spinResult = result;
        const totalWeight = items.reduce((s, i) => s + i.weight, 0);
        let angleToWinner = 0;
        for (const item of items) {
            const sectorAngle = (item.weight / totalWeight) * Math.PI * 2;
            if (item.id === spinResult.winner.id) {
                angleToWinner += sectorAngle / 2;
                break;
            }
            angleToWinner += sectorAngle;
        }
        const winnerAngle = angleToWinner - Math.PI / 2;
        const fullSpins = 5 + Math.floor(Math.random() * 3);
        const targetRotation = rotationRef.current + fullSpins * Math.PI * 2 + (Math.PI * 2 - winnerAngle);
        const startRotation = rotationRef.current;
        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(elapsed / spinDuration, 1);
            const eased = easeOutQuart(progress);
            const currentRotation = startRotation + (targetRotation - startRotation) * eased;
            rotationRef.current = currentRotation;
            setRotation(currentRotation);
            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
            }
            else {
                rotationRef.current = targetRotation;
                setRotation(targetRotation);
                setSpinning(false);
                setWinner(spinResult.winner);
                setResultVisible(true);
            }
        };
        animFrameRef.current = requestAnimationFrame(animate);
    };
    (0, react_1.useEffect)(() => {
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, []);
    const openAddModal = () => {
        setEditingItem(null);
        setForm({ label: '', weight: 1 });
        setModalOpen(true);
    };
    const openEditModal = (item) => {
        setEditingItem(item);
        setForm({ label: item.label, weight: item.weight });
        setModalOpen(true);
    };
    const handleSave = async () => {
        if (!form.label.trim())
            return;
        if (editingItem) {
            const updated = await api.sendToBackend({
                type: 'updateItem',
                payload: { id: editingItem.id, label: form.label.trim(), weight: form.weight }
            });
            if (isErrorResult(updated)) {
                api.notify('转盘抽奖', updated.error);
                return;
            }
            const normalized = normalizeItem(updated, items.length);
            if (normalized) {
                setItems(prev => prev.map(i => i.id === editingItem.id ? normalized : i));
            }
            else {
                await loadItems();
            }
        }
        else {
            const added = await api.sendToBackend({
                type: 'addItem',
                payload: { label: form.label.trim(), weight: form.weight, color: '' }
            });
            if (isErrorResult(added)) {
                api.notify('转盘抽奖', added.error);
                return;
            }
            const normalized = normalizeItem(added, items.length);
            if (normalized) {
                setItems(prev => [...prev, normalized]);
            }
            else {
                await loadItems();
            }
        }
        setModalOpen(false);
        setEditingItem(null);
    };
    const handleDelete = async (id) => {
        await api.sendToBackend({ type: 'deleteItem', payload: { id } });
        setItems(prev => prev.filter(i => i.id !== id));
    };
    const mainBg = { background: '#f5f5f5', borderRadius: 12, padding: 20 };
    const sectionBg = { background: '#fff', borderRadius: 8, padding: 16 };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { ...mainBg, minHeight: '100%' }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { margin: '0 0 16px', fontSize: 20, color: '#333' }, children: "\u8F6C\u76D8\u62BD\u5956" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 20, flexWrap: 'wrap' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { flex: '0 0 auto' }, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionBg, children: [(0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, style: { width: CANVAS_SIZE, height: CANVAS_SIZE, display: 'block' } }), (0, jsx_runtime_1.jsx)("button", { onClick: spin, disabled: spinning || items.length < 2, style: {
                                        marginTop: 16,
                                        width: '100%',
                                        padding: '12px 0',
                                        fontSize: 18,
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 8,
                                        cursor: spinning || items.length < 2 ? 'not-allowed' : 'pointer',
                                        background: spinning ? '#ccc' : '#ff4d4f',
                                        color: '#fff',
                                        transition: 'background 0.3s'
                                    }, children: spinning ? '旋转中...' : '开始抽奖' }), resultVisible && winner && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                        marginTop: 12,
                                        padding: '12px 16px',
                                        background: '#fff7e6',
                                        border: '1px solid #ffd591',
                                        borderRadius: 8,
                                        textAlign: 'center'
                                    }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: '#666', marginBottom: 4 }, children: "\u606D\u559C\u4E2D\u5956" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                fontSize: 22,
                                                fontWeight: 700,
                                                color: winner.color
                                            }, children: winner.label })] }))] }) }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, minWidth: 320 }, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionBg, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 16
                                    }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: 0, fontSize: 16, color: '#333' }, children: "\u9009\u9879\u5217\u8868" }), (0, jsx_runtime_1.jsx)("button", { onClick: openAddModal, style: {
                                                padding: '6px 16px',
                                                fontSize: 14,
                                                border: 'none',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                background: '#1677ff',
                                                color: '#fff'
                                            }, children: "\u6DFB\u52A0\u9009\u9879" })] }), items.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '40px 0', textAlign: 'center', color: '#999', fontSize: 14 }, children: "\u6682\u65E0\u9009\u9879\uFF0C\u70B9\u51FB\"\u6DFB\u52A0\u9009\u9879\"\u5F00\u59CB\u6DFB\u52A0" })) : ((0, jsx_runtime_1.jsx)("div", { style: { overflowX: 'auto' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '2px solid #f0f0f0' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: '8px 12px', textAlign: 'left', color: '#666', fontWeight: 600, width: 40 } }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '8px 12px', textAlign: 'left', color: '#666', fontWeight: 600 }, children: "\u9009\u9879\u540D\u79F0" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '8px 12px', textAlign: 'center', color: '#666', fontWeight: 600, width: 80 }, children: "\u6743\u91CD" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '8px 12px', textAlign: 'center', color: '#666', fontWeight: 600, width: 80 }, children: "\u6982\u7387" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '8px 12px', textAlign: 'center', color: '#666', fontWeight: 600, width: 100 }, children: "\u64CD\u4F5C" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: items.map(item => {
                                                    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
                                                    const pct = totalWeight > 0 ? ((item.weight / totalWeight) * 100).toFixed(1) : '0.0';
                                                    return ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #f0f0f0' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', textAlign: 'center' }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                                        display: 'inline-block',
                                                                        width: 16,
                                                                        height: 16,
                                                                        borderRadius: 4,
                                                                        background: item.color,
                                                                        verticalAlign: 'middle'
                                                                    } }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', color: '#333' }, children: item.label }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '10px 12px', textAlign: 'center', color: '#333' }, children: item.weight }), (0, jsx_runtime_1.jsxs)("td", { style: { padding: '10px 12px', textAlign: 'center', color: '#666' }, children: [pct, "%"] }), (0, jsx_runtime_1.jsxs)("td", { style: { padding: '10px 12px', textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => openEditModal(item), style: {
                                                                            padding: '4px 10px',
                                                                            marginRight: 6,
                                                                            fontSize: 12,
                                                                            border: '1px solid #d9d9d9',
                                                                            borderRadius: 4,
                                                                            cursor: 'pointer',
                                                                            background: '#fff',
                                                                            color: '#333'
                                                                        }, children: "\u7F16\u8F91" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleDelete(item.id), style: {
                                                                            padding: '4px 10px',
                                                                            fontSize: 12,
                                                                            border: '1px solid #ff4d4f',
                                                                            borderRadius: 4,
                                                                            cursor: 'pointer',
                                                                            background: '#fff',
                                                                            color: '#ff4d4f'
                                                                        }, children: "\u5220\u9664" })] })] }, item.id));
                                                }) })] }) })), items.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 12, padding: '8px 12px', background: '#f6ffed', borderRadius: 6, fontSize: 13, color: '#52c41a' }, children: ["\u5171 ", items.length, " \u4E2A\u9009\u9879\uFF0C\u5408\u8BA1\u6743\u91CD ", items.reduce((s, i) => s + i.weight, 0)] }))] }) })] }), modalOpen && ((0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.45)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }, onClick: () => setModalOpen(false), children: (0, jsx_runtime_1.jsxs)("div", { style: {
                        background: '#fff',
                        borderRadius: 12,
                        padding: 24,
                        width: 400,
                        maxWidth: '90vw',
                        boxShadow: '0 6px 30px rgba(0,0,0,0.15)'
                    }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: '0 0 20px', fontSize: 18, color: '#333' }, children: editingItem ? '编辑选项' : '添加选项' }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 6, fontSize: 14, color: '#333', fontWeight: 500 }, children: "\u9009\u9879\u540D\u79F0" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: form.label, onChange: e => setForm(f => ({ ...f, label: e.target.value })), placeholder: "\u8BF7\u8F93\u5165\u9009\u9879\u540D\u79F0", style: {
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: 14,
                                        border: '1px solid #d9d9d9',
                                        borderRadius: 6,
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', marginBottom: 6, fontSize: 14, color: '#333', fontWeight: 500 }, children: "\u6743\u91CD\uFF08\u6570\u503C\u8D8A\u5927\uFF0C\u6982\u7387\u8D8A\u9AD8\uFF09" }), (0, jsx_runtime_1.jsx)("input", { type: "number", value: form.weight, min: 0.1, step: 0.1, onChange: e => setForm(f => ({ ...f, weight: Math.max(0.1, parseFloat(e.target.value) || 1) })), style: {
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: 14,
                                        border: '1px solid #d9d9d9',
                                        borderRadius: 6,
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setModalOpen(false), style: {
                                        padding: '8px 20px',
                                        fontSize: 14,
                                        border: '1px solid #d9d9d9',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        background: '#fff',
                                        color: '#333'
                                    }, children: "\u53D6\u6D88" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSave, disabled: !form.label.trim(), style: {
                                        padding: '8px 20px',
                                        fontSize: 14,
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: form.label.trim() ? 'pointer' : 'not-allowed',
                                        background: form.label.trim() ? '#1677ff' : '#ccc',
                                        color: '#fff'
                                    }, children: editingItem ? '保存' : '添加' })] })] }) }))] }));
}
//# sourceMappingURL=renderer.js.map