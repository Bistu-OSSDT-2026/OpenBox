import { Button, Typography, Alert } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { PluginHost } from './PluginHost'
import { usePluginStore } from '../store/plugin.store'
import { useAppStore } from '../store/app.store'

const { Title } = Typography

export default function PluginView() {
  const { activePluginId, setActivePluginId, setCurrentPage } = useAppStore()
  const plugins = usePluginStore((s) => s.plugins)
  const updatePluginConfig = usePluginStore((s) => s.updatePluginConfig)

  const plugin = plugins.find((p) => p.id === activePluginId)

  const handleBack = () => {
    setActivePluginId(null)
    setCurrentPage('home')
  }

  if (!plugin) {
    return (
      <Alert
        type="warning"
        message="插件未找到"
        description="该插件可能已被删除"
        showIcon
        action={<Button onClick={handleBack}>返回</Button>}
      />
    )
  }

  if (!plugin.enabled) {
    return (
      <div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginBottom: 16, color: '#666' }}
        >
          返回
        </Button>
        <Alert
          type="info"
          message={`"${plugin.displayName}" 未启用`}
          description="请先在插件列表中启用该插件"
          showIcon
        />
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ color: '#666', marginRight: 12 }}
        >
          返回
        </Button>
        <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#333' }}>
          {plugin.displayName}
        </Title>
      </div>

      <PluginHost
        pluginName={plugin.name}
        rendererEntry={plugin.entryRenderer}
        config={plugin.configData || {}}
        onConfigChange={(config) => updatePluginConfig(plugin.id, config)}
      />
    </div>
  )
}
