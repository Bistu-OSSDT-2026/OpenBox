import React, { useState, useEffect, useCallback, useRef } from 'react'

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
}

const FONT = {
  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  sizeXs: '11px',
  sizeSm: '12px',
  sizeMd: '13px',
  sizeLg: '14px',
  sizeXl: '16px',
  sizeTitle: '20px',
}

// ============================================================
// 基础组件
// ============================================================

function Spinner({ size = 32, tip }: { size?: number; tip?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          border: `3px solid ${COLORS.borderLight}`,
          borderTopColor: COLORS.primary,
          borderRadius: '50%',
          animation: 'unienv-spin 0.8s linear infinite',
        }}
      />
      {tip && <p style={{ color: COLORS.textSecondary, fontSize: FONT.sizeMd, marginTop: 12 }}>{tip}</p>}
      <style>{`@keyframes unienv-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Toast({ items, onRemove }: { items: { id: number; type: string; content: string }[]; onRemove: (id: number) => void }) {
  if (items.length === 0) return null
  const typeStyles: Record<string, React.CSSProperties> = {
    success: { background: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d' },
    error: { background: '#fff2f0', border: '1px solid #ffccc7', color: '#cf1322' },
    warning: { background: '#fffbe6', border: '1px solid #ffe58f', color: '#d48806' },
    info: { background: COLORS.primaryLight, border: '1px solid #91caff', color: '#0958d9' },
  }
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((t) => (
        <div
          key={t.id}
          style={{
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
          }}
          onClick={() => onRemove(t.id)}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}</span>
          <span>{t.content}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: FONT.sizeSm }}>✕</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 类型定义
// ============================================================

interface ToolInfo {
  installed: boolean
  version?: string
  path?: string
  error?: string
}

interface ToolItem {
  id: string
  displayName: string
  icon: string
  description: string
}

interface ComboPack {
  id: string
  name: string
  description: string
  items: { toolId: string; version: string }[]
}

interface ProgressData {
  stage: string
  percent: number
  message: string
}

// ============================================================
// 插件渲染入口
// ============================================================

export default function UniEnvUI({
  config,
  onConfigChange,
  api,
}: {
  config: Record<string, unknown>
  onConfigChange: (config: Record<string, unknown>) => void
  api: {
    sendToBackend(message: unknown): Promise<unknown>
    notify(title: string, body?: string): void
    onBackendMessage(handler: (msg: unknown) => void): () => void
  }
}) {
  const [tools, setTools] = useState<ToolItem[]>([])
  const [combos, setCombos] = useState<ComboPack[]>([])
  const [activeKey, setActiveKey] = useState<string>('python')
  const [toolStatus, setToolStatus] = useState<Record<string, ToolInfo>>({})
  const [versions, setVersions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<Record<string, ProgressData>>({})
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string | undefined>>({})
  const [toasts, setToasts] = useState<{ id: number; type: string; content: string }[]>([])
  const initialized = useRef(false)
  let toastId = useRef(0)

  const toast = useCallback(
    (type: string, content: string) => {
      const id = ++toastId.current
      setToasts((prev) => [...prev, { id, type, content }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
    },
    []
  )

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const send = useCallback(
    async (msg: Record<string, unknown>) => {
      const result = await api.sendToBackend(msg)
      return result as Record<string, unknown>
    },
    [api]
  )

  const detectTool = useCallback(
    async (toolId: string, silent = false) => {
      if (!silent) setOperationLoading((prev) => ({ ...prev, [toolId]: true }))
      try {
        const result = await send({ type: 'detect', tool: toolId }) as Record<string, unknown>
        const info = result as unknown as ToolInfo
        setToolStatus((prev) => ({ ...prev, [toolId]: info }))
        return info
      } finally {
        if (!silent) setOperationLoading((prev) => ({ ...prev, [toolId]: false }))
      }
    },
    [send]
  )

  const loadVersions = useCallback(
    async (toolId: string) => {
      try {
        const result = (await send({ type: 'listVersions', tool: toolId })) as unknown as string[]
        setVersions((prev) => ({ ...prev, [toolId]: result }))
        if (result.length > 0 && !selectedVersions[toolId]) {
          setSelectedVersions((prev) => ({ ...prev, [toolId]: result[0] }))
        }
      } catch {
        // ignore
      }
    },
    [send, selectedVersions]
  )

  const installTool = useCallback(
    async (toolId: string) => {
      const version = selectedVersions[toolId]
      if (!version) {
        toast('warning', '请先选择要安装的版本')
        return
      }
      setOperationLoading((prev) => ({ ...prev, [toolId]: true }))
      try {
        const result = await send({ type: 'install', tool: toolId, version }) as Record<string, unknown>
        if (result.error) {
          toast('error', result.error as string)
          return
        }
        toast('info', '安装已开始，请稍候...')
        let pollCount = 0
        let installing = true
        while (installing) {
          pollCount++
          const res = await send({ type: 'getProgress', tool: toolId }) as Record<string, unknown>
          if (res.progress) {
            setProgress((prev) => ({ ...prev, [toolId]: res.progress as ProgressData }))
          }
          if (res.done) {
            if (res.error) {
              toast('error', res.error as string)
            } else {
              toast('success', `${toolId} ${version} 安装完成`)
            }
            await detectTool(toolId, true)
            break
          }
          await new Promise((r) => setTimeout(r, 500))
        }
      } catch (err) {
        toast('error', `安装失败: ${(err as Error).message}`)
      } finally {
        setOperationLoading((prev) => ({ ...prev, [toolId]: false }))
        setProgress((prev) => { const next = { ...prev }; delete next[toolId]; return next })
      }
    },
    [selectedVersions, send, detectTool, toast]
  )

  const uninstallTool = useCallback(
    async (toolId: string) => {
      const name = tools.find((t) => t.id === toolId)?.displayName || toolId
      if (!window.confirm(`确认要卸载 ${name} 吗？`)) return
      setOperationLoading((prev) => ({ ...prev, [toolId]: true }))
      try {
        const result = await send({ type: 'uninstall', tool: toolId }) as Record<string, unknown>
        if (result.error) {
          toast('error', result.error as string)
        } else {
          toast('success', `${name} 已卸载`)
          await detectTool(toolId, true)
        }
      } catch (err) {
        toast('error', `卸载失败: ${(err as Error).message}`)
      } finally {
        setOperationLoading((prev) => ({ ...prev, [toolId]: false }))
      }
    },
    [tools, send, detectTool, toast]
  )

  const switchTool = useCallback(
    async (toolId: string) => {
      const version = selectedVersions[toolId]
      if (!version) {
        toast('warning', '请先选择目标版本')
        return
      }
      setOperationLoading((prev) => ({ ...prev, [toolId]: true }))
      try {
        const result = await send({ type: 'switchVersion', tool: toolId, version }) as Record<string, unknown>
        if (result.error) {
          toast('error', result.error as string)
        } else {
          toast('success', (result.message as string) || `已切换到 ${version}`)
          await detectTool(toolId, true)
        }
      } catch (err) {
        toast('error', `切换失败: ${(err as Error).message}`)
      } finally {
        setOperationLoading((prev) => ({ ...prev, [toolId]: false }))
      }
    },
    [selectedVersions, send, detectTool, toast]
  )

  const installCombo = useCallback(
    async (comboId: string) => {
      const name = combos.find((c) => c.id === comboId)?.name || comboId
      if (!window.confirm(`确认一键安装组合包 "${name}" 吗？`)) return
      setLoading(true)
      try {
        const result = await send({ type: 'installCombo', comboId }) as Record<string, unknown>
        if (result.error) {
          toast('error', result.error as string)
        } else {
          const data = result as { success: boolean; results?: { tool: string; success: boolean; message: string }[]; message?: string }
          if (data.results) {
            for (const r of data.results) {
              toast(r.success ? 'success' : 'error', r.message)
            }
          }
          if (data.message) toast('info', data.message)
          await detectAll()
        }
      } catch (err) {
        toast('error', `安装失败: ${(err as Error).message}`)
      } finally {
        setLoading(false)
      }
    },
    [combos, send, toast]
  )

  const detectAll = useCallback(async () => {
    for (const tool of tools) {
      await detectTool(tool.id, true)
    }
  }, [tools, detectTool])

  // ---- 初始化 ----
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const init = async () => {
      setLoading(true)
      try {
        const toolList = (await send({ type: 'listTools' })) as unknown as ToolItem[]
        setTools(toolList)
        const comboList = (await send({ type: 'listCombos' })) as unknown as ComboPack[]
        setCombos(comboList || [])
        await Promise.all(toolList.map((t) => detectTool(t.id, true)))
        await Promise.all(toolList.map((t) => loadVersions(t.id)))
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [send, detectTool, loadVersions, api])

  // ---- 派生数据 ----
  const isComboActive = activeKey.startsWith('combo:')
  const activeComboId = isComboActive ? activeKey.replace('combo:', '') : ''
  const activeTool = tools.find((t) => t.id === activeKey)
  const activeCombo = combos.find((c) => c.id === activeComboId)
  const activeStatus = toolStatus[activeKey]
  const activeProgress = progress[activeKey]
  const isToolLoading = operationLoading[activeKey] || false
  const activeVersions = versions[activeKey] || []

  // ============================================================
  // 渲染
  // ============================================================

  const menuItemStyle = (key: string): React.CSSProperties => ({
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
  })

  const btnPrimary: React.CSSProperties = {
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
  }

  const btnDefault: React.CSSProperties = {
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
  }

  const btnDanger: React.CSSProperties = {
    ...btnDefault,
    border: '1px solid #ffccc7',
    color: COLORS.danger,
  }

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: FONT.sizeSm,
    fontWeight: 500,
  }

  const cardStyle: React.CSSProperties = {
    background: COLORS.bgWhite,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  }

  return (
    <div style={{ fontFamily: FONT.family, color: COLORS.text, height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }}>
      {/* ========== Toast ========== */}
      <Toast items={toasts} onRemove={removeToast} />

      {/* ========== 主体三栏 ========== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ====== 左侧：工具列表 ====== */}
        <div
          style={{
            width: 200,
            minWidth: 200,
            background: COLORS.bgWhite,
            borderRight: `1px solid ${COLORS.border}`,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${COLORS.border}`,
              fontSize: FONT.sizeXl,
              fontWeight: 600,
              color: COLORS.text,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>&#9776;</span>
            工具与组合包
          </div>

          {/* 工具菜单 */}
          <div style={{ paddingBottom: 4 }}>
            <div style={{ padding: '8px 16px 4px', fontSize: FONT.sizeSm, color: COLORS.textSecondary, fontWeight: 500 }}>
              开发工具
            </div>
            {tools.map((tool) => {
              const s = toolStatus[tool.id]
              return (
                <div
                  key={tool.id}
                  style={menuItemStyle(tool.id)}
                  onClick={() => setActiveKey(tool.id)}
                >
                  <span style={{ fontSize: 16 }}>{tool.icon}</span>
                  <span style={{ flex: 1 }}>{tool.displayName}</span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: s?.installed ? COLORS.success : COLORS.textTertiary,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* 组合包菜单 */}
          {combos.length > 0 && (
            <div style={{ paddingBottom: 4 }}>
              <div style={{ padding: '12px 16px 4px', fontSize: FONT.sizeSm, color: COLORS.textSecondary, fontWeight: 500 }}>
                组合包
              </div>
              {combos.map((combo) => {
                const key = `combo:${combo.id}`
                return (
                  <div
                    key={key}
                    style={menuItemStyle(key)}
                    onClick={() => setActiveKey(key)}
                  >
                    <span style={{ fontSize: 16 }}>&#9889;</span>
                    <span style={{ flex: 1 }}>{combo.name}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ====== 中间：状态看板 ====== */}
        <div
          style={{
            flex: 1,
            padding: 20,
            overflowY: 'auto',
            background: COLORS.bgGray,
          }}
        >
          {loading && Object.keys(toolStatus).length === 0 ? (
            <Spinner tip="初始化中..." />
          ) : isComboActive && activeCombo ? (
            /* ---- 组合包详情 ---- */
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: FONT.sizeTitle, fontWeight: 600, color: COLORS.text }}>
                  {activeCombo.name}
                </h2>
                <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: FONT.sizeLg }}>
                  {activeCombo.description}
                </p>
              </div>

              <div style={{ ...cardStyle, borderTop: `3px solid ${COLORS.warning}` }}>
                <div style={{ fontWeight: 600, fontSize: FONT.sizeLg, marginBottom: 12 }}>包含以下工具：</div>
                {activeCombo.items.map((item) => {
                  const t = tools.find((tt) => tt.id === item.toolId)
                  const s = toolStatus[item.toolId]
                  return (
                    <div
                      key={item.toolId}
                      style={{
                        padding: '10px 12px',
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 6,
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{t?.icon || '📦'}</span>
                      <span style={{ fontWeight: 500 }}>{t?.displayName || item.toolId}</span>
                      <span style={{ ...tagStyle, background: COLORS.primaryLight, color: COLORS.primary }}>{item.version}</span>
                      {s?.installed ? (
                        <span style={{ ...tagStyle, background: COLORS.successBg, color: COLORS.success }}>
                          ✓ 已安装 {s.version}
                        </span>
                      ) : (
                        <span style={{ ...tagStyle, background: COLORS.bgGrayDark, color: COLORS.textSecondary }}>
                          ✕ 未安装
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                style={{
                  ...btnPrimary,
                  width: '100%',
                  height: 44,
                  fontSize: FONT.sizeXl,
                  marginTop: 16,
                  opacity: loading ? 0.7 : 1,
                }}
                disabled={loading}
                onClick={() => installCombo(activeComboId)}
              >
                {loading ? <Spinner size={16} /> : <span>&#9889;</span>}
                一键安装全部
              </button>
              <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: FONT.sizeSm, marginTop: 8 }}>
                点击后将依次下载并安装组合包中的所有工具
              </p>
            </div>
          ) : activeTool ? (
            /* ---- 工具详情 ---- */
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 32 }}>{activeTool.icon}</span>
                  <h2 style={{ margin: 0, fontSize: FONT.sizeTitle, fontWeight: 600, color: COLORS.text }}>
                    {activeTool.displayName}
                  </h2>
                  {activeStatus?.installed ? (
                    <span style={{ ...tagStyle, background: COLORS.successBg, color: COLORS.success, fontSize: FONT.sizeMd }}>
                      ✓ 已安装
                    </span>
                  ) : (
                    <span style={{ ...tagStyle, background: COLORS.bgGrayDark, color: COLORS.textSecondary, fontSize: FONT.sizeMd }}>
                      ✕ 未安装
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: FONT.sizeLg }}>
                  {activeTool.description}
                </p>
              </div>

              {/* 状态详情 */}
              {activeStatus?.installed ? (
                <div style={{ ...cardStyle, background: COLORS.successBg, border: `1px solid ${COLORS.successBorder}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>当前版本：</span>
                      <span style={{ ...tagStyle, background: COLORS.success, color: '#fff' }}>{activeStatus.version}</span>
                    </div>
                    {activeStatus.path ? (
                      <div>
                        <span style={{ fontWeight: 600 }}>安装路径：</span>
                        <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: FONT.sizeSm }}>
                          {activeStatus.path}
                        </code>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div style={{ ...cardStyle, background: COLORS.warningBg, border: `1px solid ${COLORS.warningBorder}` }}>
                  <span style={{ color: COLORS.warning, marginRight: 8 }}>&#9888;</span>
                  尚未安装 {activeTool.displayName}，请选择版本并点击安装
                </div>
              )}

              {/* 进度条 */}
              {activeProgress && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ height: 8, background: COLORS.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${activeProgress.percent}%`,
                        background: COLORS.primary,
                        borderRadius: 4,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: FONT.sizeSm, color: COLORS.textSecondary }}>{activeProgress.message}</span>
                </div>
              )}

              {/* 已安装版本 */}
              {activeStatus?.installed && (
                <div style={{ ...cardStyle }}>
                  <div style={{ fontWeight: 600, fontSize: FONT.sizeLg, marginBottom: 8 }}>已安装版本</div>
                  <span style={{ ...tagStyle, background: COLORS.success, color: '#fff' }}>
                    {activeStatus.version} (当前)
                  </span>
                  <p style={{ fontSize: FONT.sizeSm, color: COLORS.textSecondary, marginTop: 8 }}>
                    切换版本需先安装其他版本
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: COLORS.textSecondary }}>
              选择左侧工具或组合包查看详情
            </div>
          )}
        </div>

        {/* ====== 右侧：操作区 ====== */}
        {!isComboActive && activeTool && (
          <div
            style={{
              width: 240,
              minWidth: 240,
              background: COLORS.bgWhite,
              borderLeft: `1px solid ${COLORS.border}`,
              padding: 20,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: FONT.sizeXl, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{'</>'}</span>
              操作
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 检测 */}
              <button
                style={{ ...btnDefault, justifyContent: 'center' }}
                disabled={isToolLoading}
                onClick={() => detectTool(activeKey)}
              >
                {isToolLoading ? <Spinner size={14} /> : <span>&#128269; 检测安装状态</span>}
              </button>

              <hr style={{ border: 'none', borderTop: `1px solid ${COLORS.border}`, margin: '4px 0' }} />

              {/* 版本选择 */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: FONT.sizeMd }}>选择版本：</label>
                <select
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 10px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    fontSize: FONT.sizeLg,
                    background: COLORS.bgWhite,
                    color: COLORS.text,
                    cursor: 'pointer',
                  }}
                  value={selectedVersions[activeKey] || ''}
                  onChange={(e) =>
                    setSelectedVersions((prev) => ({ ...prev, [activeKey]: e.target.value || undefined }))
                  }
                >
                  <option value="" disabled>请选择版本</option>
                  {activeVersions.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* 安装 */}
              <button
                style={{ ...btnPrimary, justifyContent: 'center', height: 42, opacity: isToolLoading ? 0.7 : 1 }}
                disabled={isToolLoading}
                onClick={() => installTool(activeKey)}
              >
                {isToolLoading ? <Spinner size={14} /> : <span>&#128229; 安装</span>}
              </button>

              {/* 切换版本 */}
              <button
                style={{
                  ...btnDefault,
                  justifyContent: 'center',
                  opacity: !activeStatus?.installed || isToolLoading ? 0.5 : 1,
                  cursor: !activeStatus?.installed || isToolLoading ? 'not-allowed' : 'pointer',
                }}
                disabled={!activeStatus?.installed || isToolLoading}
                onClick={() => switchTool(activeKey)}
              >
                &#128260; 切换版本
              </button>

              {/* 卸载 */}
              <button
                style={{
                  ...btnDanger,
                  justifyContent: 'center',
                  opacity: !activeStatus?.installed || isToolLoading ? 0.5 : 1,
                  cursor: !activeStatus?.installed || isToolLoading ? 'not-allowed' : 'pointer',
                }}
                disabled={!activeStatus?.installed || isToolLoading}
                onClick={() => uninstallTool(activeKey)}
              >
                &#128465; 卸载
              </button>
            </div>

            {/* 操作提示 */}
            <div
              style={{
                marginTop: 24,
                padding: 12,
                background: COLORS.bgGray,
                borderRadius: 8,
                fontSize: FONT.sizeXs,
                color: COLORS.textSecondary,
                lineHeight: 1.6,
              }}
            >
              提示：安装过程可能需要几分钟，请耐心等待。安装目录位于配置中指定的根目录下。
            </div>
          </div>
        )}
      </div>

      {/* ========== 底部：组合包快捷操作 ========== */}
      {combos.length > 0 && (
        <div
          style={{
            background: COLORS.bgWhite,
            borderTop: `1px solid ${COLORS.border}`,
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ color: COLORS.warning, fontSize: 16 }}>&#9889;</span>
          <span style={{ fontWeight: 600, fontSize: FONT.sizeSm, marginRight: 8, whiteSpace: 'nowrap' }}>
            一键安装组合包：
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {combos.slice(0, 5).map((combo) => (
              <button
                key={combo.id}
                style={{
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
                }}
                disabled={loading}
                onClick={() => installCombo(combo.id)}
              >
                <span style={{ fontSize: 13 }}>&#9889;</span>
                {combo.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
