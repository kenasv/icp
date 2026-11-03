import { useEffect, useState } from 'react'
import { Card, Table, Tag, Tooltip, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { ProjectSummary } from '../types'
import { fmtPct, fmtDate, zoneEmoji } from '../format'

// Реестр проектов (Ф10): здоровье 🟢🟡🔴, тултип с причиной у проблемных, клик → карточка.
export default function Projects() {
  const [rows, setRows] = useState<ProjectSummary[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.projects().then(setRows)
  }, [])

  if (!rows) return <Card>Загрузка…</Card>

  return (
    <Card size="small" title={<Typography.Text strong>Реестр проектов</Typography.Text>}>
      <Table<ProjectSummary>
        rowKey="id"
        size="small"
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1150 }}
        onRow={(r) => ({ onClick: () => navigate(`/projects/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Номер', dataIndex: 'id', width: 130 },
          { title: 'Название', dataIndex: 'name' },
          { title: 'Клиент', dataIndex: 'clientName', width: 180 },
          {
            title: 'Статус', dataIndex: 'status', width: 140,
            render: (s: string) => (
              <Tag color={s === 'В реализации' ? 'processing' : s === 'Планирование' ? 'default' : 'success'}>{s}</Tag>
            ),
          },
          { title: 'Сумма', dataIndex: 'amount', align: 'right' as const, width: 100,
            render: (v: number) => v.toFixed(1).replace('.', ',') },
          { title: 'GM план', dataIndex: 'gmPlan', align: 'right' as const, width: 90, render: (v: number) => fmtPct(v, 0) },
          { title: 'GM прогноз', dataIndex: 'gmForecast', align: 'right' as const, width: 100, render: (v: number) => fmtPct(v, 0) },
          { title: 'Завершение (прогноз)', dataIndex: 'endForecast', width: 140, render: (v: string) => fmtDate(v) },
          {
            title: 'Отклонение', dataIndex: 'devDays', align: 'right' as const, width: 100,
            render: (d: number) => (d > 0 ? <span style={{ color: '#ff4d4f' }}>+{d} дн.</span> : '—'),
          },
          {
            title: 'Здоровье', dataIndex: 'health', width: 90,
            render: (z: any, r) => <Tooltip title={r.healthReason}>{zoneEmoji(z)}</Tooltip>,
          },
        ]}
      />
    </Card>
  )
}
