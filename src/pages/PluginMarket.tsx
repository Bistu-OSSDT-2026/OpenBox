import React, { useState } from 'react'
import { Button, Space, Typography, message, Empty, Row, Col, Spin, Alert } from 'antd'
import { ImportOutlined, ReloadOutlined } from '@ant-design/icons'
import PluginCard from '../components/PluginCard'
import PluginConfig from '../components/PluginConfig'
import PluginImport from '../components/PluginImport'
import { usePlugins } from '../hooks/usePlugins'
import { useAppStore } from '../store/app.store'
import type { PluginMeta } from '@shared/types/plugin.types'

const { Title, Text } = Typography

export default function PluginMarket() {
  const { plugins, loading, error, fetchPlugins, enablePlugin, disablePlugin, uninstallPlugin } =
    usePlugins()
  const { setCurrentPage, setActivePluginId } = useAppStore()
  const [importOpen, setImportOpen] = useState(false)
  const [configPlugin, setConfigPlugin] = useState<PluginMeta | null>(null)

  const handleRefresh = async () => {
    await fetchPlugins()
    message.success('已刷新')
  }

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

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
            插件管理
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            导入、管理和卸载您的工具插件
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<ImportOutlined />}
            onClick={() => setImportOpen(true)}
            style={{
              background: '#555',
              borderColor: '#555'
            }}
          >
            导入插件
          </Button>
        </Space>
      </div>

      {loading && plugins.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message={error} showIcon style={{ margin: '20px 0' }} />
      ) : plugins.length === 0 ? (
        <div
          style={{
            background: '#fafafa',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            padding: 40,
            textAlign: 'center',
            marginTop: 24
          }}
        >
          <Empty description="通过上方「导入插件」按钮添加工具插件">
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              支持 .zip 插件包或插件目录两种格式
            </Text>
          </Empty>
        </div>
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
      <PluginImport open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
