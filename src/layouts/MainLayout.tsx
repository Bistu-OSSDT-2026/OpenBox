import { Layout, Menu, ConfigProvider, theme } from 'antd'
import {
  AppstoreOutlined,
  ApiOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/app.store'

const { Header, Sider, Content } = Layout

const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#555',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgElevated: '#ffffff',
    borderRadius: 8,
    colorText: '#333',
    colorTextSecondary: '#888'
  }
}

const menuItems = [
  {
    key: 'home',
    icon: <AppstoreOutlined />,
    label: '已安装插件'
  },
  {
    key: 'market',
    icon: <ApiOutlined />,
    label: '插件管理'
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '设置'
  }
]

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const currentPage = useAppStore((s) => s.currentPage)

  return (
    <ConfigProvider theme={lightTheme}>
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={sidebarCollapsed}
          collapsedWidth={60}
          width={220}
          style={{
            background: '#ffffff',
            borderRight: '1px solid #e8e8e8',
            transition: 'all 0.2s ease'
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #eee',
              fontSize: sidebarCollapsed ? 16 : 20,
              fontWeight: 600,
              color: '#444',
              letterSpacing: 2
            }}
          >
            {sidebarCollapsed ? 'OB' : 'OpenBox'}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            items={menuItems}
            onClick={({ key }) => setCurrentPage(key)}
            style={{ borderRight: 0, marginTop: 8 }}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              background: '#ffffff',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #e8e8e8',
              height: 56
            }}
          >
            <span
              onClick={toggleSidebar}
              style={{
                fontSize: 18,
                cursor: 'pointer',
                color: '#666',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
          </Header>
          <Content
            style={{
              margin: 20,
              padding: 20,
              background: '#ffffff',
              borderRadius: 8,
              minHeight: 'calc(100vh - 96px)',
              overflow: 'auto'
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
