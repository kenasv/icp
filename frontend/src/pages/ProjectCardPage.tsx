import { useEffect, useState } from 'react'
import { Tabs, Typography, Card, Tag, Descriptions, Spin, message } from 'antd'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import type { ProjectCard as CardData } from '../types'
import { fmtMoney, fmtPct, fmtDate, zoneEmoji } from '../format'
import OverviewTab from './project/OverviewTab'
import GanttTab from './project/GanttTab'
import FinanceTab from './project/FinanceTab'
import PurchasesTab from './project/PurchasesTab'
import RisksTab from './project/RisksTab'
import SandboxTab from './project/SandboxTab'
import CascadeTab from './project/CascadeTab'
import ChangesTab from './project/ChangesTab'

// Карточка проекта (Ф9): вкладки — обзор, СДР/Гант, финансы, закупки, риски,
// песочница what-if, каскад последствий, запросы на изменение.
export default function ProjectCardPage() {
  const { id } = useParams()
  const [data, setData] = useState<CardData | null>(null)
  const [err, setErr] = useState('')

  const load = () => api.project(id!).then(setData).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [id])

  if (err) return <Card>Ошибка: {err}</Card>
  if (!data) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  const { project, summary, computed, client, presale } = data
  const lastMile = [...computed.schedule].filter((r) => r.type === 'milestone').sort((a, b) => +new Date(b.end) - +new Date(a.end))[0]

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {project.id} · {project.name}
        <Tag style={{ marginLeft: 12 }}>{project.status}</Tag>
        <span style={{ fontSize: 22, marginLeft: 8 }} title={computed.health.overallReason}>
          {zoneEmoji(computed.health.overall)}
        </span>
      </Typography.Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
          <Descriptions.Item label="Клиент">{client?.name ?? project.clientId}</Descriptions.Item>
          <Descriptions.Item label="Сумма контракта">{fmtMoney(project.contractAmount, 1)}</Descriptions.Item>
          <Descriptions.Item label="Завершение (план / прогноз)">
            {fmtDate(lastMile?.baseStart)} / {fmtDate(lastMile?.start)}
            {lastMile && lastMile.devDays !== 0 && (
              <span style={{ color: '#cf1322', marginLeft: 6 }}>+{lastMile.devDays} дн.</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="GM (план / прогноз)">
            {fmtPct(computed.finance.gm.plan, 0)} / {fmtPct(computed.finance.gm.forecast, 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Базовый план">
            {(project.baselines || []).length
              ? `v${project.baselines[project.baselines.length - 1].version} от ${fmtDate(project.baselines[project.baselines.length - 1].approvedAt)}`
              : 'не утверждён'}
          </Descriptions.Item>
          <Descriptions.Item label="Пресейл (связь)">
            {presale ? `${presale.number} «${presale.name}»` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Команда" span={2}>
            {(data.team || []).map((t) => `${t.name} (${t.role})`).join(', ') || '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey="overview"
        destroyInactiveTabPane
        items={[
          { key: 'overview', label: 'Обзор и лента', children: <OverviewTab data={data} reload={load} /> },
          { key: 'gantt', label: 'СДР и диаграмма Ганта', children: <GanttTab data={data} reload={load} /> },
          { key: 'cascade', label: 'Каскад последствий', children: <CascadeTab data={data} /> },
          { key: 'finance', label: 'Финансы и ДДС', children: <FinanceTab data={data} /> },
          { key: 'purchases', label: 'Закупки', children: <PurchasesTab data={data} reload={load} /> },
          { key: 'risks', label: 'Риски', children: <RisksTab data={data} /> },
          { key: 'sandbox', label: 'What-if песочница', children: <SandboxTab data={data} reload={load} /> },
          { key: 'changes', label: 'Запросы на изменение', children: <ChangesTab data={data} reload={load} /> },
        ]}
      />
    </div>
  )
}

export const notify = (txt: string) => message.success(txt)
