import React, { useState } from 'react'
import { Modal, Button, Upload, Space, message, Typography, Divider } from 'antd'
import { UploadOutlined, FolderOpenOutlined, InboxOutlined } from '@ant-design/icons'
import { usePluginStore } from '../store/plugin.store'

const { Dragger } = Upload
const { Text } = Typography

interface PluginImportProps {
  open: boolean
  onClose: () => void
}

export default function PluginImport({ open, onClose }: PluginImportProps) {
  const installPlugin = usePluginStore((s) => s.installPlugin)
  const [importing, setImporting] = useState(false)

  const handleSelectZip = async () => {
    try {
      const path = await window.electronAPI?.dialog.openFile()
      if (path) {
        setImporting(true)
        const success = await installPlugin('zip', path)
        if (success) {
          message.success('插件安装成功')
          onClose()
        } else {
          message.error('插件安装失败')
        }
        setImporting(false)
      }
    } catch (err) {
      message.error(`导入失败: ${(err as Error).message}`)
      setImporting(false)
    }
  }

  const handleSelectDirectory = async () => {
    try {
      const path = await window.electronAPI?.dialog.openDirectory()
      if (path) {
        setImporting(true)
        const success = await installPlugin('directory', path)
        if (success) {
          message.success('插件安装成功')
          onClose()
        } else {
          message.error('插件安装失败')
        }
        setImporting(false)
      }
    } catch (err) {
      message.error(`导入失败: ${(err as Error).message}`)
      setImporting(false)
    }
  }

  return (
    <Modal
      title="导入插件"
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
    >
      <div style={{ padding: '12px 0' }}>
        <Dragger
          disabled={importing}
          style={{ background: '#fafafa', border: '2px dashed #d9d9d9', borderRadius: 8 }}
          beforeUpload={() => false}
          onDrop={(e) => {
            const files = e.dataTransfer.files
            if (files.length > 0) {
              const file = files[0]
              if (file.name.endsWith('.zip')) {
                handleSelectZip()
              }
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <Text style={{ color: '#666' }}>拖拽 .zip 插件包到此处</Text>
        </Dragger>

        <Divider plain>
          <Text type="secondary">或者</Text>
        </Divider>

        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Button
            block
            size="large"
            icon={<UploadOutlined />}
            onClick={handleSelectZip}
            loading={importing}
            style={{ height: 48, borderRadius: 8 }}
          >
            选择 .zip 插件包
          </Button>
          <Button
            block
            size="large"
            icon={<FolderOpenOutlined />}
            onClick={handleSelectDirectory}
            loading={importing}
            style={{ height: 48, borderRadius: 8 }}
          >
            选择插件目录
          </Button>
        </Space>
      </div>
    </Modal>
  )
}
