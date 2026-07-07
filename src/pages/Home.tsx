import React, { useState } from 'react'
import { Row, Col, Empty, Spin, Alert, message } from 'antd'
import PluginCard from '../components/PluginCard'
import PluginConfig from '../components/PluginConfig'
import { usePlugins } from '../hooks/usePlugins'
import { useAppStore } from '../store/app.store'
import type { PluginMeta } from '@shared/types/plugin.types'

export default function Home() {
  const { plugins, loading, error, enablePlugin, disablePlugin, uninstallPlugin } = usePlugins()
  const { setCurrentPage, setActivePluginId } = useAppStore()
  const [configPlugin, setConfigPlugin] = useState<PluginMeta | null>(null)

  const handleToggle = async (id: string, enabled: boolean) => {
    const success = enabled ? await enablePlugin(id) : await disablePlugin(id)
    if (success) {
      message.success(enabled ? '插件已启用' : '插件已禁用')
    } else {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    const success = await uninstallPlugin(id)
    if (success) {
      message.success('插件已删除')
    } else {
      message.error('删除失败')
    }
  }

  const handleOpen = (plugin: PluginMeta) => {
    setActivePluginId(plugin.id)
    setCurrentPage('pluginView')
  }

  if (loading && plugins.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message={error} showIcon style={{ margin: 20 }} />
  }

  return (
    <div>
      {plugins.length === 0 ? (
        <Empty
          description="暂无已安装的插件"
          style={{ padding: 80 }}
        >
          <span style={{ color: '#999', fontSize: 13 }}>
            前往「插件管理」页导入您的第一个插件
          </span>
        </Empty>
      ) : (
        <>
          <div style={{ marginBottom: 16, fontSize: 13, color: '#888' }}>
            共 {plugins.length} 个插件
          </div>
          <Row gutter={[16, 16]}>
            {plugins.map((plugin) => (
              <Col key={plugin.id} xs={24} sm={12} md={8} lg={6} xl={6}>
                <PluginCard
                  plugin={plugin}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onConfigure={setConfigPlugin}
                  onOpen={handleOpen}
                />
              </Col>
            ))}
          </Row>
        </>
      )}

      <PluginConfig
        plugin={configPlugin}
        open={configPlugin !== null}
        onClose={() => setConfigPlugin(null)}
      />
    </div>
  )
}
