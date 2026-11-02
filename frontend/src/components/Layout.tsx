import { Layout as AntLayout, Menu, Segmented, Space, Tag } from 'antd'
import {
  DashboardOutlined, ProjectOutlined, FunnelPlotOutlined,
  FileProtectOutlined, PartitionOutlined, ApartmentOutlined, BookOutlined, RobotOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AiChat from './AiChat'
import { useRole } from '../App'

const { Header, Content } = AntLayout

// Шапка с переключателем ролей и навигацией.
export default function Layout() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()
  const location = useLocation()

  const selected = '/' + (location.pathname.split('/')[1] || '')

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24, background: '#001529' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap' }}>
          ИСУП <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>Цифровизация B2B</span>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selected]}
          onClick={(e) => navigate(e.key)}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            { key: '/', icon: <DashboardOutlined />, label: 'Портфель' },
            { key: '/projects', icon: <ProjectOutlined />, label: 'Проекты' },
            { key: '/presales', icon: <FunnelPlotOutlined />, label: 'Пресейлы' },
            { key: '/changes', icon: <FileProtectOutlined />, label: 'Запросы на изменение' },
            { key: '/bpmn', icon: <PartitionOutlined />, label: 'BPMN' },
            { key: '/c4', icon: <ApartmentOutlined />, label: 'Архитектура C4' },
            { key: '/directories', icon: <BookOutlined />, label: 'Справочники' },
          ]}
        />
        <Space>
          <Tag color={role === 'director' ? 'geekblue' : 'green'} style={{ marginInlineEnd: 0 }}>
            {role === 'director' ? 'Директор департамента · Иванов И.И.' : 'РП'}
          </Tag>
          <Segmented
            value={role}
            onChange={(v) => setRole(v as any)}
            options={[
              { label: 'Директор', value: 'director' },
              { label: 'РП', value: 'pm' },
            ]}
          />
        </Space>
      </Header>
      <Content style={{ padding: 20 }}>
        <Outlet />
      </Content>
      {/* ИИ-панель закреплена в правом нижнем углу (Ф38). */}
      <AiChat />
    </AntLayout>
  )
}
