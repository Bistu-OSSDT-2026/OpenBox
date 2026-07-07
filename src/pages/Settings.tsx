import { Typography, Descriptions, Tag } from 'antd'

const { Title, Text } = Typography

export default function Settings() {
  const platform = navigator.platform
  const userAgent = navigator.userAgent

  return (
    <div>
      <Title level={4} style={{ margin: 0, marginBottom: 24, fontWeight: 600 }}>
        设置
      </Title>

      <Descriptions
        column={1}
        bordered
        size="small"
        labelStyle={{
          background: '#fafafa',
          width: 140,
          color: '#666',
          fontWeight: 500
        }}
        contentStyle={{ background: '#fff', color: '#333' }}
      >
        <Descriptions.Item label="应用名称">
          <Text strong>OpenBox</Text>
        </Descriptions.Item>
        <Descriptions.Item label="版本">
          <Tag>0.5.0</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="运行平台">
          <Tag>{platform}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="运行环境">
          <Text style={{ fontSize: 12, wordBreak: 'break-all' }}>{userAgent}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="插件目录">
          <Text type="secondary" style={{ fontSize: 12 }}>
            %APPDATA%/OpenBox/plugins/
          </Text>
        </Descriptions.Item>
      </Descriptions>
    </div>
  )
}
