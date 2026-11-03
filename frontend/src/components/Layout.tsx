import { useState } from 'react'
import { Button, Drawer, Grid, Layout as AntLayout, Menu, Segmented, Space, Tag } from 'antd'
import {
  DashboardOutlined, ProjectOutlined, FunnelPlotOutlined,
  FileProtectOutlined, PartitionOutlined, ApartmentOutlined, BookOutlined, MenuOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AiChat from './AiChat'
import { useRole } from '../App'

const { Header, Content } = AntLayout

const NAV_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Портфель' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Проекты' },
  { key: '/presales', icon: <FunnelPlotOutlined />, label: 'Пресейлы' },
  { key: '/changes', icon: <FileProtectOutlined />, label: 'Запросы на изменение' },
  { key: '/bpmn', icon: <PartitionOutlined />, label: 'BPMN' },
  { key: '/c4', icon: <ApartmentOutlined />, label: 'Архитектура C4' },
  { key: '/directories', icon: <BookOutlined />, label: 'Справочники' },
]

const ROLE_TAG = {
  director: { color: 'geekblue', text: 'Директор департамента · Иванов И.И.' },
  pm: { color: 'green', text: 'РП' },
} as const

// Шапка с переключателем ролей и навигацией. С планшета и телефона (<lg)
// меню открывается бургером в боковую панель, роль — компактным сегментом.
export default function Layout() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.lg

  const selected = '/' + (location.pathname.split('/')[1] || '')

  const roleSwitch = (
    <Segmented
      size={isDesktop ? 'middle' : 'small'}
      value={role}
      onChange={(v) => setRole(v as any)}
      options={[
        { label: 'Директор', value: 'director' },
        { label: 'РП', value: 'pm' },
      ]}
    />
  )

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex', alignItems: 'center', gap: isDesktop ? 24 : 12,
          background: '#001529', paddingInline: isDesktop ? 50 : 16,
        }}
      >
        {!isDesktop && (
          <Button
            type="text"
            aria-label="Меню"
            icon={<MenuOutlined style={{ color: '#fff', fontSize: 18 }} />}
            onClick={() => setNavOpen(true)}
          />
        )}
        <div style={{ color: '#fff', fontSize: isDesktop ? 18 : 16, fontWeight: 600, whiteSpace: 'nowrap' }}>
          ИСУП{isDesktop && (
            <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}> Цифровизация B2B</span>
          )}
        </div>
        {isDesktop ? (
          <>
            <Menu
              theme="dark"
              mode="horizontal"
              selectedKeys={[selected]}
              onClick={(e) => navigate(e.key)}
              style={{ flex: 1, minWidth: 0 }}
              items={NAV_ITEMS}
            />
            <Space>
              <Tag color={ROLE_TAG[role].color} style={{ marginInlineEnd: 0 }}>{ROLE_TAG[role].text}</Tag>
              {roleSwitch}
            </Space>
          </>
        ) : (
          <div style={{ marginLeft: 'auto' }}>{roleSwitch}</div>
        )}
      </Header>
      <Content style={{ padding: screens.xs ? 12 : 20 }}>
        <Outlet />
      </Content>
      {/* ИИ-панель закреплена в правом нижнем углу (Ф38). */}
      <AiChat />
      <Drawer
        title="ИСУП · навигация"
        placement="left"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        width="min(320px, 86vw)"
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="vertical"
          selectedKeys={[selected]}
          onClick={(e) => {
            navigate(e.key)
            setNavOpen(false)
          }}
          style={{ borderInlineEnd: 'none' }}
          items={NAV_ITEMS}
        />
        <div style={{ padding: 16 }}>
          <Tag color={ROLE_TAG[role].color}>{ROLE_TAG[role].text}</Tag>
        </div>
      </Drawer>
    </AntLayout>
  )
}
