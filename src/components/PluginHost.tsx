import React from 'react'
import { Suspense, useEffect, useState, useCallback } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { Spin, Alert } from 'antd'
import type { PluginConfig, PluginRendererComponent } from '@shared/types/plugin.types'

interface PluginHostProps {
  pluginName: string
  rendererEntry: string
  config: PluginConfig
  onConfigChange: (config: PluginConfig) => void
}

function loadCjsModule(code: string): PluginRendererComponent {
  const mod: { exports: Record<string, unknown> } = { exports: {} }
  const require = (id: string) => {
    if (id === 'react') {
      return React
    }
    if (id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime') {
      return jsxRuntime
    }
    throw new Error(`插件模块 "${id}" 不可用`)
  }
  const factory = new Function('module', 'exports', 'require', code)
  factory(mod, mod.exports, require)
  const Component = (mod.exports.default || mod.exports) as PluginRendererComponent
  if (typeof Component !== 'function') {
    throw new Error('插件渲染器未导出有效的 React 组件')
  }
  return Component
}

export function PluginHost({ pluginName, rendererEntry, config, onConfigChange }: PluginHostProps) {
  const [Component, setComponent] = useState<PluginRendererComponent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadComponent() {
      try {
        setError(null)
        const url = `plugin://${pluginName}/${rendererEntry}`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const code = await response.text()
        if (!cancelled) {
          const comp = loadCjsModule(code)
          setComponent(() => comp)
        }
      } catch (err) {
        if (!cancelled) {
          setError(`加载插件组件失败: ${(err as Error).message}`)
        }
      }
    }

    loadComponent()

    return () => {
      cancelled = true
    }
  }, [pluginName, rendererEntry])

  const sendToBackend = useCallback(async (message: unknown) => {
    try {
      const result = await window.electronAPI?.plugin.sendMessage(pluginName, message)
      return result
    } catch {
      return null
    }
  }, [pluginName])

  const notify = useCallback((title: string, body?: string) => {
    new Notification(title, { body })
  }, [])

  const onBackendMessage = useCallback(
    (handler: (msg: unknown) => void) => {
      return (
        window.electronAPI?.plugin.onMessage((data) => {
          if (data.pluginId === pluginName) {
            handler(data.message)
          }
        }) ?? (() => {})
      )
    },
    [pluginName]
  )

  if (error) {
    return <Alert type="error" message={error} showIcon />
  }

  if (!Component) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin tip="加载插件中..." />
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      }
    >
      <Component
        config={config}
        onConfigChange={onConfigChange}
        api={{
          sendToBackend,
          notify,
          onBackendMessage
        }}
      />
    </Suspense>
  )
}
