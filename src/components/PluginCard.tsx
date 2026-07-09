import { Card, Switch, Button, Tag, Tooltip, Popconfirm } from 'antd'
import {
  DeleteOutlined,
  SettingOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import type { PluginMeta } from '@shared/types/plugin.types'

interface PluginCardProps {
  plugin: PluginMeta
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  onConfigure: (plugin: PluginMeta) => void
  onOpen: (plugin: PluginMeta) => void
}

export default function PluginCard({ plugin, onToggle, onDelete, onConfigure, onOpen }: PluginCardProps) {
  return (
    <Card
      hoverable
      style={{
        borderRadius: 10,
        border: '1px solid #e8e8e8',
        height: '100%'
      }}
      styles={{ body: { padding: 20 } }}
      actions={[
        <Tooltip title={plugin.enabled ? '禁用' : '启用'} key="toggle">
          <Switch
            checked={plugin.enabled}
            size="small"
            onChange={(checked) => onToggle(plugin.id, checked)}
          />
        </Tooltip>,
        <Tooltip title="配置" key="config">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => onConfigure(plugin)}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="确认删除此插件？"
          onConfirm={() => onDelete(plugin.id)}
          okText="确认"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ]}
    >
      <div
        style={{ cursor: 'pointer' }}
        onClick={() => onOpen(plugin)}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              marginRight: 12,
              flexShrink: 0
            }}
          >
            {plugin.icon ? (
              <img src={plugin.icon} alt="" style={{ width: 24, height: 24 }} />
            ) : (
              <PlayCircleOutlined style={{ color: '#999' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {plugin.displayName}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>v{plugin.version}</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 13,
            color: '#666',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 8
          }}
        >
          {plugin.description || '暂无描述'}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Tag style={{ fontSize: 11, color: '#888', borderColor: '#e8e8e8' }}>
            {plugin.author || '匿名'}
          </Tag>
          {plugin.enabled ? (
            <Tag color="green" style={{ fontSize: 11 }}>
              已启用
            </Tag>
          ) : (
            <Tag style={{ fontSize: 11 }}>已禁用</Tag>
          )}
        </div>
      </div>
    </Card>
  )
}
